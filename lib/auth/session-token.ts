// The bearer token a logged-in browser holds, and the cookie flags that carry it.
// A session's real record lives in auth_sessions; the cookie only ever holds the raw
// token, and the database only ever holds its digest — so neither side on its own is
// enough to impersonate someone.

import { createHash, randomBytes } from "node:crypto"

export const SESSION_COOKIE = "jv_session"

/** 32 random bytes, base64url — 43 URL-safe characters, no padding to trip over. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

/** The value stored in auth_sessions.token_hash. One-way, so a dump is not a login. */
export function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export type CookieOptions = {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: "/"
  expires: Date
}

/**
 * `isProduction` is passed in rather than read from NODE_ENV so the callers' tests can
 * pin both branches; Vercel sets it, and a local http:// origin silently drops a Secure
 * cookie, which would look like login being broken.
 */
export function sessionCookieOptions(expiresAt: Date, isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  }
}

/**
 * The path a session cookie was set with. Next matches a cookie by name *and* path when
 * deleting, so every removal spreads this in with the name.
 */
export const CLEAR_SESSION_COOKIE = { path: "/" } as const
