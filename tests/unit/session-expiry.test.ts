import { describe, expect, it } from "vitest"
import {
  IDLE_TIMEOUT_MS,
  MAX_SESSION_AGE_MS,
  REFRESH_BELOW_MS,
  cookieExpiryForNewSession,
  expiryForNewSession,
  isExpired,
  isPastAbsoluteCap,
  renewSession,
  shouldTouchLastSeen,
} from "@/lib/auth/expiry"

const HOUR = 60 * 60 * 1000
const T0 = Date.parse("2026-10-28T09:00:00.000Z")

describe("session expiry", () => {
  it("gives a new session the full idle window", () => {
    expect(expiryForNewSession(T0)).toBe(T0 + 24 * HOUR)
    expect(IDLE_TIMEOUT_MS).toBe(24 * HOUR)
    expect(MAX_SESSION_AGE_MS).toBe(30 * 24 * HOUR)
  })

  it("expires at the deadline, not a moment before", () => {
    expect(isExpired(T0 + 24 * HOUR, T0 + 24 * HOUR - 1)).toBe(false)
    expect(isExpired(T0 + 24 * HOUR, T0 + 24 * HOUR)).toBe(true)
  })

  it("renews once activity falls inside the refresh window", () => {
    // 5h of browsing leaves 19h, which is under the 20h threshold.
    const now = T0 + 5 * HOUR
    const result = renewSession({ createdAtMs: T0, expiresAtMs: T0 + 24 * HOUR, nowMs: now })
    expect(result).toEqual({ expired: false, expiresAtMs: now + 24 * HOUR, changed: true })
  })

  it("skips the database write while there is still slack", () => {
    const now = T0 + 3 * HOUR
    expect(REFRESH_BELOW_MS).toBe(20 * HOUR)
    const result = renewSession({ createdAtMs: T0, expiresAtMs: T0 + 24 * HOUR, nowMs: now })
    expect(result).toEqual({ expired: false, expiresAtMs: T0 + 24 * HOUR, changed: false })
  })

  it("treats an already-expired session as dead and changes nothing", () => {
    const expiresAt = T0 + 24 * HOUR
    const result = renewSession({ createdAtMs: T0, expiresAtMs: expiresAt, nowMs: expiresAt + HOUR })
    expect(result).toEqual({ expired: true, expiresAtMs: expiresAt, changed: false })
  })

  it("reads a session at the backstop as dead", () => {
    expect(isPastAbsoluteCap(T0, T0 + 30 * 24 * HOUR - 1)).toBe(false)
    expect(isPastAbsoluteCap(T0, T0 + 30 * 24 * HOUR)).toBe(true)
    const result = renewSession({
      createdAtMs: T0,
      expiresAtMs: T0 + 30 * 24 * HOUR,
      nowMs: T0 + 30 * 24 * HOUR,
    })
    expect(result.expired).toBe(true)
  })

  it("never slides the deadline past the backstop", () => {
    const createdAt = T0
    // Day 29 at noon: the idle window wants another 24h, the cap allows 12h.
    const now = T0 + 29 * 24 * HOUR + 12 * HOUR
    const result = renewSession({ createdAtMs: createdAt, expiresAtMs: now + 19 * HOUR, nowMs: now })
    expect(result.expired).toBe(false)
    expect(result.expiresAtMs).toBe(createdAt + MAX_SESSION_AGE_MS)
    expect(result.expiresAtMs).toBe(now + 12 * HOUR)
    expect(result.expiresAtMs).toBeLessThan(now + IDLE_TIMEOUT_MS)
  })

  it("touches last_seen_at at most once a minute", () => {
    expect(shouldTouchLastSeen(T0, T0 + 59_000)).toBe(false)
    expect(shouldTouchLastSeen(T0, T0 + 60_000)).toBe(true)
  })

  it("gives the browser the backstop instead of the idle window", () => {
    // Only the row knows when activity stopped. A cookie that expired with its row would have to
    // be rewritten on every request, which a Server Component read cannot do.
    expect(cookieExpiryForNewSession(T0)).toBe(T0 + MAX_SESSION_AGE_MS)
    expect(cookieExpiryForNewSession(T0)).toBeGreaterThan(expiryForNewSession(T0))
  })
})
