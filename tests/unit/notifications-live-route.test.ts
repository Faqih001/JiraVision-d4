import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const routeFile = () => readFileSync(path.join(repo, "app/api/notifications/live/route.ts"), "utf8")

/** Comment-stripped: a guard about the route cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the realtime seal route answers a cold database as 503, never 401", () => {
  it("catches SessionUnreachableError around the session read", () => {
    const body = codeOnly(routeFile())
    expect(body).toMatch(/import \{ SessionUnreachableError \} from "@\/lib\/auth\/session-state"/u)
    expect(body).toMatch(/error instanceof SessionUnreachableError/u)
  })

  it("returns 503 when the database did not answer, so the client keeps the cookie", () => {
    const body = codeOnly(routeFile())
    // The unreachable branch runs from the instanceof guard up to the re-throw, so it must
    // carry 503 and must not be the 401 branch that follows.
    const unreachableBranch = body.match(
      /if \(error instanceof SessionUnreachableError\)[\s\S]*?(?=throw error)/u,
    )?.[0]
    expect(unreachableBranch, "no SessionUnreachableError branch").toBeTruthy()
    expect(unreachableBranch).toMatch(/status: 503/u)
    expect(unreachableBranch).not.toMatch(/status: 401/u)
  })

  it("reserves 401 for a read that succeeded and found no row", () => {
    const body = codeOnly(routeFile())
    expect(body).toMatch(/if \(!user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/u)
  })

  it("re-throws anything that is not the unreachable signal", () => {
    const body = codeOnly(routeFile())
    expect(body).toMatch(/throw error/u)
  })
})
