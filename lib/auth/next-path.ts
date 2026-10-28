// Where a sign-in sends you next, and why it asked.
//
// `?next=` is attacker-controlled: it arrives by link, so it is validated here rather than trusted
// at the router. Only a same-origin path is allowed through.

export const DEFAULT_AFTER_LOGIN = "/dashboard"

/** Paths that would bounce straight back to the form and start a loop. */
const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"]

/**
 * A target this app will navigate to after sign-in.
 *
 * Rejected: anything that is not a single-slash-rooted path. `//evil.example` and `/\evil.example`
 * are both read as protocol-relative URLs by browsers, and `https://evil.example` leaves the app
 * entirely. Control characters are rejected because they can be used to split a header or hide the
 * real target from a reader.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_AFTER_LOGIN
  if (!value.startsWith("/")) return DEFAULT_AFTER_LOGIN
  if (value.startsWith("//")) return DEFAULT_AFTER_LOGIN
  if (value.includes("\\")) return DEFAULT_AFTER_LOGIN
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AFTER_LOGIN
  if (AUTH_PATHS.some((path) => value === path || value.startsWith(`${path}?`) || value.startsWith(`${path}/`))) {
    return DEFAULT_AFTER_LOGIN
  }
  return value
}
