// The cookie-session read/write helpers usable from route handlers, server components and
// server actions. lib/auth-actions.ts is "use server" and action-only, so the mechanics of
// turning a cookie into a person live here.
//
// A login is a row in auth_sessions, not a value the browser was given. The cookie carries an
// opaque token; the database carries its SHA-256 digest; the person is whichever user that row
// points to. Nothing a client can write — a user id, a session id, a role — decides who is
// signed in, which is what the two cookies this replaced did.

import { cookies } from "next/headers"
import { cache } from "react"
import { getUserById, type User } from "@/lib/db"
import { cookieExpiryForNewSession } from "@/lib/auth/expiry"
import { readSession, revokeSession, createSession as insertSessionRow } from "@/lib/auth/sessions"
import { CLEAR_SESSION_COOKIE, SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth/session-token"
import { SessionUnreachableError, type InvalidReason } from "@/lib/auth/session-state"

export type SessionUser = Omit<User, "passwordHash">

export type SessionResult =
  | { state: "active"; user: SessionUser; expiresAtMs: number }
  | { state: "anonymous" }
  | { state: "invalid"; reason: InvalidReason }
  | { state: "unreachable" }

// Set by sign-ins before this existed. They are still sitting in browsers, and a request that
// carries one must not be able to keep a session alive on its strength alone, so every write
// here removes them as a side effect.
const LEGACY_SESSION_COOKIES = ["session_id", "user_id"] as const

function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * The whole auth decision for one request. The four states are not interchangeable:
 * `anonymous` is a visitor, `invalid` is a dead session (and says why), `unreachable` is the
 * database not answering — which is neither of those things and never a sign-out.
 *
 * Wrapped in React `cache`, so a page that asks who is signed in half a dozen times — the layout,
 * each server component, every route handler through getSession — runs the two reads (session row,
 * user row) once per request instead of once per call, and renews the idle window once too.
 */
export const resolveSession = cache(async (): Promise<SessionResult> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return { state: "anonymous" }

  const lookup = await readSession(token)
  if (lookup.kind === "unreachable") return { state: "unreachable" }
  if (lookup.kind === "invalid") return { state: "invalid", reason: lookup.reason }

  const user = await getUserById(lookup.userId)
  // A session row cannot outlive its user — the foreign key cascades — so a null here is the
  // pool stalling between the two reads, not an account that is gone. Reporting it as
  // unreachable is the only answer that cannot sign someone out on a slow query. The row has
  // been deleted by the time this browser asks again, and that read says not_found.
  if (!user) return { state: "unreachable" }

  const { passwordHash: _passwordHash, ...sessionUser } = user
  return { state: "active", user: sessionUser, expiresAtMs: lookup.expiresAtMs }
})

/**
 * The signed-in person, or null when nobody is. Throws when the database did not answer, so a
 * stalled cold compute surfaces as a 500 the client can retry instead of the 401 that reads as
 * "you have been signed out".
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const result = await resolveSession()
  if (result.state === "unreachable") throw new SessionUnreachableError()
  return result.state === "active" ? result.user : null
}

/** Writes the row first: a cookie with no row behind it is a session that dies at the next request. */
export async function beginSession(userId: number, nowMs = Date.now()): Promise<void> {
  const token = createSessionToken()
  await insertSessionRow(userId, token, nowMs)

  const store = await cookies()
  store.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(new Date(cookieExpiryForNewSession(nowMs)), isProduction()),
  )
  for (const name of LEGACY_SESSION_COOKIES) store.delete({ ...CLEAR_SESSION_COOKIE, name })
}

/**
 * Ends the login in this browser. The row is revoked, not deleted: revoked_at is the record that
 * someone signed a device out, and it is what makes a stolen token useless after its owner has
 * already moved on.
 */
export async function endSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await revokeSession(token)
  await clearSessionCookies()
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies()
  store.delete({ ...CLEAR_SESSION_COOKIE, name: SESSION_COOKIE })
  for (const name of LEGACY_SESSION_COOKIES) store.delete({ ...CLEAR_SESSION_COOKIE, name })
}
