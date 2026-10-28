// The database side of a session. The meaning of a row lives in ./session-state.ts and the
// lifetime math in ./expiry.ts, so every function here is a query plus one decision call.
//
// A failed query is reported as `unreachable`, never as "no session" — that distinction is
// what stops a waking Neon compute from signing people out.

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { authSessions } from "@/drizzle/schema"
import { expiryForNewSession } from "./expiry"
import { sessionTokenHash } from "./session-token"
import { classifySession, isExpiredRow, type InvalidReason, type SessionRow } from "./session-state"

export type SessionLookup =
  | {
      kind: "active"
      userId: number
      /** The row's live idle deadline. The cookie carries the 30-day backstop instead, so it
       * does not need rewriting here. */
      expiresAtMs: number
      /** True when this read slid the window, so the caller knows the row was rewritten. */
      renewed: boolean
    }
  | { kind: "invalid"; reason: InvalidReason }
  | { kind: "unreachable" }

const columns = {
  id: authSessions.id,
  userId: authSessions.userId,
  createdAt: authSessions.createdAt,
  lastSeenAt: authSessions.lastSeenAt,
  expiresAt: authSessions.expiresAt,
  revokedAt: authSessions.revokedAt,
}

/** Records a login. Throws if the row cannot be written — a cookie with no row behind it is a fake session. */
export async function createSession(userId: number, token: string, nowMs = Date.now()): Promise<void> {
  await db.insert(authSessions).values({
    tokenHash: sessionTokenHash(token),
    userId,
    expiresAt: new Date(expiryForNewSession(nowMs)),
  })
}

/**
 * One retry, 500ms later: a cold Neon compute answers on the second attempt once the wake
 * that stalled the first handshake has finished (measured back-to-back connects of 6189ms
 * then 3644ms in lib/db.ts). lib/db.ts already does this for the two user reads; the session
 * read is the third query that decides who is signed in, so it needs the same tolerance.
 */
async function lookupRow(tokenHash: string): Promise<SessionRow[]> {
  try {
    return await db
      .select(columns)
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
  } catch (error) {
    console.warn("Session read failed, retrying once:", message(error))
    await new Promise((resolve) => setTimeout(resolve, 500))
    return await db
      .select(columns)
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
  }
}

export async function readSession(token: string, nowMs = Date.now()): Promise<SessionLookup> {
  const tokenHash = sessionTokenHash(token)
  let row: SessionRow | undefined
  try {
    row = (await lookupRow(tokenHash))[0] as SessionRow | undefined
  } catch (error) {
    console.warn("Session read failed, treating as unreachable:", message(error))
    return { kind: "unreachable" }
  }

  if (!row) return { kind: "invalid", reason: "not_found" }

  const verdict = classifySession(row, nowMs)
  if (verdict.kind === "invalid") {
    // An expired row is dead weight; a revoked one is kept as the sign-out record.
    if (verdict.reason === "expired" && isExpiredRow(row, nowMs)) await drop(row.id)
    return verdict
  }

  const changes: { expiresAt?: Date; lastSeenAt?: Date } = {}
  if (verdict.renewedExpiresAtMs) changes.expiresAt = new Date(verdict.renewedExpiresAtMs)
  if (verdict.touchedLastSeenAtMs) changes.lastSeenAt = new Date(verdict.touchedLastSeenAtMs)

  if (Object.keys(changes).length) {
    try {
      await db.update(authSessions).set(changes).where(eq(authSessions.id, row.id))
    } catch (error) {
      // The session is still valid for the window it already has; a renewal that could not
      // be written shortens it, which is not a reason to end it.
      console.warn("Session renewal not written:", message(error))
    }
  }

  return {
    kind: "active",
    userId: verdict.userId,
    expiresAtMs: verdict.renewedExpiresAtMs ?? verdict.expiresAtMs,
    renewed: Boolean(verdict.renewedExpiresAtMs),
  }
}

/** Signs one device out and keeps the row as the record that it happened. */
export async function revokeSession(token: string, nowMs = Date.now()): Promise<void> {
  try {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date(nowMs) })
      .where(eq(authSessions.tokenHash, sessionTokenHash(token)))
  } catch (error) {
    // Logging out must not fail because the database is slow: the caller removes the cookie,
    // so the session is gone from that browser either way.
    console.warn("Session revoke not written:", message(error))
  }
}

async function drop(id: number): Promise<void> {
  try {
    await db.delete(authSessions).where(eq(authSessions.id, id))
  } catch (error) {
    console.warn("Expired session row not removed:", message(error))
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
