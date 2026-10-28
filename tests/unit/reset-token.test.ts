import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { createResetToken, resetTokenHash } from "@/lib/auth/reset-token"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

// A reset link is a capability: whoever holds it can set the password. So the raw value exists in
// the mail and in the browser only; the table keeps a digest, and a stalled database is never
// allowed to answer "invalid or expired token" to a link that is perfectly good.

describe("the reset token itself", () => {
  it("is 43 URL-safe characters of randomness", () => {
    const token = createResetToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it("does not repeat", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createResetToken()))
    expect(tokens.size).toBe(200)
  })
})

describe("what the table stores", () => {
  it("is a 64-hex digest, not the token", () => {
    const token = createResetToken()
    const hash = resetTokenHash(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain(token)
  })

  it("is stable for one token and different for another", () => {
    const a = createResetToken()
    const b = createResetToken()
    expect(resetTokenHash(a)).toBe(resetTokenHash(a))
    expect(resetTokenHash(a)).not.toBe(resetTokenHash(b))
  })
})

describe("the store is wired to the digest", () => {
  const db = codeOnly(src("lib/db.ts"))

  it("hashes on insert, lookup and delete", () => {
    expect(db).toMatch(/token: resetTokenHash\(token\)/)
    expect(db).toMatch(/eq\(passwordResetTokens\.token, resetTokenHash\(token\)\)/g)
    expect(db.match(/resetTokenHash\(token\)/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it("does not compare the raw token anywhere", () => {
    expect(db).not.toMatch(/token: token\b/)
    expect(db).not.toMatch(/passwordResetTokens\.token, token\)/)
  })

  it("reports a stalled database instead of a missing token", () => {
    for (const fn of ["createPasswordResetToken", "getPasswordResetToken"]) {
      const body = db.slice(db.indexOf(`export async function ${fn}`))
      const head = body.slice(0, body.indexOf("\n}\n"))
      expect(head).toMatch(/isConnectionFailure\(error\)/)
      expect(head).toMatch(/throw new DatabaseUnreachableError\(\)/)
    }
  })
})

describe("the reset path never calls a good link dead", () => {
  const actions = codeOnly(src("lib/auth-actions.ts"))

  it("mints tokens from lib/auth/reset-token, not uuid", () => {
    expect(actions).toMatch(/import \{ createResetToken \} from "\.\/auth\/reset-token"/)
    expect(actions).toMatch(/const token = createResetToken\(\)/)
    expect(actions).not.toMatch(/uuidv4/)
  })

  it("turns DatabaseUnreachableError into unavailable on both reads", () => {
    const verify = actions.slice(actions.indexOf("export async function verifyResetToken"))
    expect(verify.slice(0, verify.indexOf("\n}\n"))).toMatch(/unreachable\(error\)/)
    const reset = actions.slice(actions.indexOf("export async function resetPassword"))
    expect(reset.slice(0, reset.indexOf("\n}\n"))).toMatch(/if \(unreachable\(error\)\) return UNAVAILABLE/)
  })

  it("answers the two routes through authResult, which maps unavailable to 503", () => {
    expect(codeOnly(src("app/api/auth/verify-token/route.ts"))).toMatch(/authResult\(await verifyResetToken\(token\)\)/)
    expect(codeOnly(src("app/api/auth/reset-password/route.ts"))).toMatch(/authResult\(await resetPassword\(formData\)\)/)
  })
})
