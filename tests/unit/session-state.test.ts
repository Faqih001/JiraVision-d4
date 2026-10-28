import { describe, expect, it } from "vitest"
import { classifySession, isExpiredRow, type SessionRow } from "@/lib/auth/session-state"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const T0 = Date.parse("2026-10-28T09:00:00.000Z")
const at = (ms: number) => new Date(ms)

function row(over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 1,
    userId: 42,
    createdAt: at(T0),
    lastSeenAt: at(T0),
    expiresAt: at(T0 + DAY),
    revokedAt: null,
    ...over,
  }
}

describe("classifying a session row", () => {
  it("accepts a row seen moments ago and writes nothing at all", () => {
    const verdict = classifySession(row(), T0 + 30_000)
    expect(verdict).toEqual({
      kind: "active",
      userId: 42,
      expiresAtMs: T0 + DAY,
      renewedExpiresAtMs: null,
      touchedLastSeenAtMs: null,
    })
  })

  it("reads a missing row as not_found", () => {
    expect(classifySession(null, T0)).toEqual({ kind: "invalid", reason: "not_found" })
  })

  it("reads a revoked row as revoked, not expired", () => {
    expect(classifySession(row({ revokedAt: at(T0 + HOUR) }), T0 + 2 * HOUR)).toEqual({
      kind: "invalid",
      reason: "revoked",
    })
  })

  it("reads a deadline that has passed as expired", () => {
    expect(classifySession(row(), T0 + DAY)).toEqual({ kind: "invalid", reason: "expired" })
  })

  it("reads a session past the 30-day backstop as expired, even while active", () => {
    const now = T0 + 31 * DAY - HOUR
    const alive = row({ expiresAt: at(now + 12 * HOUR) })
    expect(classifySession(alive, now)).toEqual({ kind: "invalid", reason: "expired" })
  })

  it("slides the window when activity falls inside the refresh band", () => {
    const now = T0 + 5 * HOUR
    const verdict = classifySession(row(), now)
    expect(verdict.kind).toBe("active")
    if (verdict.kind !== "active") return
    expect(verdict.renewedExpiresAtMs).toBe(now + DAY)
  })

  it("refreshes last_seen_at without sliding a deadline that still has slack", () => {
    const verdict = classifySession(row({ lastSeenAt: at(T0) }), T0 + 3 * HOUR)
    if (verdict.kind !== "active") throw new Error("expected active")
    expect(verdict.renewedExpiresAtMs).toBeNull()
    expect(verdict.touchedLastSeenAtMs).toBe(T0 + 3 * HOUR)
  })

  it("survives a timestamp that arrives as a string", () => {
    const raw = { ...row(), expiresAt: new Date(T0 + 25 * HOUR).toISOString() }
    const verdict = classifySession(raw as unknown as SessionRow, T0 + 24 * HOUR)
    if (verdict.kind !== "active") throw new Error("a string timestamp must parse like a Date")
    expect(verdict.expiresAtMs).toBe(T0 + 25 * HOUR)
  })

  it("ends a session it cannot read a deadline from", () => {
    expect(classifySession(row({ expiresAt: "not a date" }), T0)).toEqual({
      kind: "invalid",
      reason: "expired",
    })
  })

  it("ends a session with an unreadable start, because the backstop cannot be measured", () => {
    expect(classifySession(row({ createdAt: "not a date" }), T0)).toEqual({
      kind: "invalid",
      reason: "expired",
    })
  })

  it("leaves last_seen_at alone when it cannot be read", () => {
    const verdict = classifySession(row({ lastSeenAt: "not a date", expiresAt: at(T0 + 19 * HOUR) }), T0)
    if (verdict.kind !== "active") throw new Error("expected active")
    expect(verdict.touchedLastSeenAtMs).toBeNull()
  })

  it("only calls an expired row garbage once the deadline has passed", () => {
    expect(isExpiredRow({ expiresAt: at(T0 + DAY) }, T0 + DAY + 1)).toBe(true)
    expect(isExpiredRow({ expiresAt: at(T0 + DAY) }, T0)).toBe(false)
  })
})
