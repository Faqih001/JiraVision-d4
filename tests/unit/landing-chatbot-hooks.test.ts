import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

/** Comment-stripped: a guard about hook order cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

/** LandingChatbot is the last export, so its body runs from the declaration to end of file. */
function chatbotBody(): string {
  const source = codeOnly(src("components/landing-chatbot.tsx"))
  const start = source.indexOf("export default function LandingChatbot()")
  if (start === -1) throw new Error("components/landing-chatbot.tsx must declare LandingChatbot")
  return source.slice(start)
}

describe("landing chatbot hook order", () => {
  // Mounted in the root layout, so it survives the login → dashboard client navigation.
  // An early return above a hook drops the hook count on that navigation and React throws
  // "Rendered fewer hooks than expected"; a fresh load mounts at the lower count and looks fine.
  it("hides on dashboard routes only after every hook has run", () => {
    const body = chatbotBody()
    const guardAt = body.indexOf('if (pathname.startsWith("/dashboard"))')
    expect(guardAt, "the dashboard early-return guard is missing").toBeGreaterThan(-1)

    const hookCalls = [...body.matchAll(/\buse[A-Z]\w*\(/gu)]
    expect(hookCalls.length, "no hooks found in LandingChatbot").toBeGreaterThan(0)
    const lastHookAt = Math.max(...hookCalls.map((match) => match.index ?? -1))

    expect(
      guardAt,
      "the dashboard early-return must come after the last hook, or navigating into /dashboard renders fewer hooks",
    ).toBeGreaterThan(lastHookAt)
  })
})