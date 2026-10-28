import { describe, expect, it } from "vitest"
import {
  CLEAR_SESSION_COOKIE,
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  sessionTokenHash,
} from "@/lib/auth/session-token"

describe("the session token", () => {
  it("is one cookie name, so there is no second value to disagree with", () => {
    expect(SESSION_COOKIE).toBe("jv_session")
    expect(CLEAR_SESSION_COOKIE).toEqual({ path: "/" })
  })

  it("is 32 random bytes in a URL-safe alphabet", () => {
    const token = createSessionToken()
    expect(token).toHaveLength(43)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(createSessionToken()).not.toBe(token)
  })

  it("stores only a digest, and the same token always digests the same way", () => {
    const token = createSessionToken()
    const hash = sessionTokenHash(token)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(sessionTokenHash(token))
    expect(hash).not.toBe(sessionTokenHash(createSessionToken()))
    expect(hash).not.toContain(token)
  })

  it("is HttpOnly, path-scoped and SameSite=Lax", () => {
    const expires = new Date(Date.parse("2026-10-29T09:00:00.000Z"))
    expect(sessionCookieOptions(expires, false)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires,
    })
    expect(sessionCookieOptions(expires, true).secure).toBe(true)
  })
})
