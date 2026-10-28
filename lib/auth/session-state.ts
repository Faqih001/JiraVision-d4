// What one auth_sessions row means right now, with no database and no clock of its own.
//
// The rule this encodes is the one the old code got wrong: a session read that FAILS is not
// the same thing as a session that is gone. While the Neon compute wakes, a query can reject
// after a stalled handshake, and treating that as "no session" sends a signed-in user to the
// login page — the fake 401. Only a row we actually managed to read can end a session.

import { isExpired, isPastAbsoluteCap, renewSession, shouldTouchLastSeen } from "./expiry"

export type SessionRow = {
  id: number
  userId: number
  createdAt: Date | string
  lastSeenAt: Date | string
  expiresAt: Date | string
  revokedAt: Date | string | null
}

export type InvalidReason = "not_found" | "expired" | "revoked"

export type SessionVerdict = {
  kind: "active"
  userId: number
  /** The deadline the row carries today. */
  expiresAtMs: number
  /** Set when activity just slid the window — write it back to the row. The cookie keeps its
   * own 30-day horizon and does not need to follow: see cookieExpiryForNewSession. */
  renewedExpiresAtMs: number | null
  /** Set when last_seen_at is stale enough to be worth updating. */
  touchedLastSeenAtMs: number | null
}

export function toMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}

export function classifySession(row: SessionRow | null, nowMs: number): SessionVerdict | { kind: "invalid"; reason: InvalidReason } {
  if (!row) return { kind: "invalid", reason: "not_found" }
  if (row.revokedAt) return { kind: "invalid", reason: "revoked" }

  const createdAtMs = toMs(row.createdAt)
  const expiresAtMs = toMs(row.expiresAt)
  // A row we cannot read a deadline from cannot be validated either, so it ends the session
  // rather than silently living forever.
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(expiresAtMs)) {
    return { kind: "invalid", reason: "expired" }
  }

  if (isExpired(expiresAtMs, nowMs) || isPastAbsoluteCap(createdAtMs, nowMs)) {
    return { kind: "invalid", reason: "expired" }
  }

  const renewal = renewSession({ createdAtMs, expiresAtMs, nowMs })
  const renewedExpiresAtMs = renewal.changed ? renewal.expiresAtMs : null
  const lastSeenAtMs = toMs(row.lastSeenAt)
  const touchedLastSeenAtMs =
    Number.isFinite(lastSeenAtMs) && shouldTouchLastSeen(lastSeenAtMs, nowMs) ? nowMs : null
  return { kind: "active", userId: row.userId, expiresAtMs, renewedExpiresAtMs, touchedLastSeenAtMs }
}

/**
 * An expired row is worthless and piles up, so a read deletes it. A revoked row is kept: it is
 * the record that someone signed a device out.
 */
export function isExpiredRow(row: { expiresAt: Date | string }, nowMs: number): boolean {
  return isExpired(toMs(row.expiresAt), nowMs)
}

/** What the login page says, per reason. None of them blame the person or leak the account. */
export const SESSION_NOTICE: Record<InvalidReason, string> = {
  not_found: "That session is no longer valid. Please sign in again.",
  expired: "You were signed out after 24 hours without activity. Please sign in again.",
  revoked: "This device was signed out. Please sign in again.",
}

/**
 * Thrown when a session could not be looked up because the database did not answer. Routes let
 * this escape as a 500 rather than reaching their own `if (!session) return 401`, because a 401
 * is a statement that the person is signed out — and nothing of the sort happened.
 */
export class SessionUnreachableError extends Error {
  constructor() {
    super("Session lookup unavailable: the database could not be reached")
    this.name = "SessionUnreachableError"
  }
}
