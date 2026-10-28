// Session lifetime math, with no database and no clock of its own — every function takes
// `nowMs` so a test can move time by hours without waiting.
//
// The rule the product asked for is "log people out after 24 hours", but a plain absolute
// 24h expiry logs someone out mid-task at an awkward moment. This is a sliding idle window
// instead: a session lives 24h from the last real activity, with a hard 30-day backstop so
// a token kept alive by constant use still eventually has to re-authenticate.

export const HOUR_MS = 60 * 60 * 1000
/** How long a session survives with no activity — the "past 24hrs" the login page names. */
export const IDLE_TIMEOUT_MS = 24 * HOUR_MS
/** Only renew once less than this is left, so browsing writes the row at most every 4h. */
export const REFRESH_BELOW_MS = 20 * HOUR_MS
/** Backstop: activity alone cannot keep a token alive forever. */
export const MAX_SESSION_AGE_MS = 30 * 24 * HOUR_MS
/** last_seen_at is cosmetic; do not hit the database more than once a minute for it. */
export const LAST_SEEN_THROTTLE_MS = 60 * 1000

export function isExpired(expiresAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAtMs
}

export function isPastAbsoluteCap(createdAtMs: number, nowMs: number): boolean {
  return nowMs - createdAtMs >= MAX_SESSION_AGE_MS
}

export function expiryForNewSession(nowMs: number): number {
  return nowMs + IDLE_TIMEOUT_MS
}

/**
 * The browser cookie carries the 30-day backstop, never the 24-hour window — only the row
 * knows when activity stopped. A cookie that slid with the row would have to be rewritten on
 * every request, which a Server Component read is not allowed to do, and a cookie that expired
 * before its row did would sign someone out at a moment the database never decided.
 */
export function cookieExpiryForNewSession(nowMs: number): number {
  return nowMs + MAX_SESSION_AGE_MS
}

export type Renewal = {
  /** The session is dead — expired, or it has run past the 30-day backstop. */
  expired: boolean
  /** The value to store (and put in the cookie) after this decision. */
  expiresAtMs: number
  /** True only when expiresAtMs differs from what was passed in, so callers can skip the write. */
  changed: boolean
}

export function renewSession(
  input: { createdAtMs: number; expiresAtMs: number; nowMs: number },
): Renewal {
  const { createdAtMs, expiresAtMs, nowMs } = input

  if (isPastAbsoluteCap(createdAtMs, nowMs) || isExpired(expiresAtMs, nowMs)) {
    return { expired: true, expiresAtMs, changed: false }
  }

  const remaining = expiresAtMs - nowMs
  if (remaining >= REFRESH_BELOW_MS) {
    return { expired: false, expiresAtMs, changed: false }
  }

  // Never slide the deadline past the backstop; a renewal that lands exactly on the cap
  // still reads as expired on the next request rather than living one second longer.
  const sliding = nowMs + IDLE_TIMEOUT_MS
  const capped = Math.min(sliding, createdAtMs + MAX_SESSION_AGE_MS)
  return { expired: false, expiresAtMs: capped, changed: capped !== expiresAtMs }
}

export function shouldTouchLastSeen(lastSeenAtMs: number, nowMs: number): boolean {
  return nowMs - lastSeenAtMs >= LAST_SEEN_THROTTLE_MS
}
