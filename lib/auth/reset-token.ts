// The token in a password-reset link, and the digest that is stored for it.
//
// Same rule as a session: the raw value exists only in the mail and in the browser, so a dump of
// password_reset_tokens is a list of digests rather than a set of working links.

import { createHash, randomBytes } from "node:crypto"

/** 32 random bytes, base64url — 43 URL-safe characters for the link. */
export function createResetToken(): string {
  return randomBytes(32).toString("base64url")
}

/** What password_reset_tokens.token holds. One-way, so the table cannot be replayed. */
export function resetTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
