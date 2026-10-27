// An invitation is a bearer token with a short life: 32 random bytes handed to the
// inviter once, stored only as a SHA-256 digest, single use, one email, never superadmin.

import { createHash, randomBytes } from "node:crypto"

export const INVITATION_TTL_DAYS = 7
export const INVITATION_ROLES = ["user", "admin"] as const
export type InvitationRole = (typeof INVITATION_ROLES)[number]

export function isInvitationRole(value: unknown): value is InvitationRole {
  return typeof value === "string" && (INVITATION_ROLES as readonly string[]).includes(value)
}

export function invitationTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function createInvitation(now: Date): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, tokenHash: invitationTokenHash(token), expiresAt }
}

export type InvitationInput = { ok: true; value: { email: string; role: InvitationRole } } | { ok: false; error: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function readInvitationInput(value: unknown): InvitationInput {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const email = typeof source.email === "string" ? source.email.trim().toLowerCase() : ""
  if (!EMAIL.test(email)) return { ok: false, error: "A valid email is required" }
  if (!isInvitationRole(source.role)) return { ok: false, error: "role must be user or admin" }
  return { ok: true, value: { email, role: source.role } }
}

export type InvitationRow = { email: string; acceptedAt: string | null; expiresAt: string }

/**
 * Why this token cannot be used right now, or null. Messages never repeat the invited
 * address, so a wrong-account attempt learns nothing about who the invitation was for.
 */
export function invitationProblem(row: InvitationRow, nowIso: string, sessionEmail: string): string | null {
  if (row.acceptedAt) return "That invitation has already been used."
  if (Date.parse(row.expiresAt) <= Date.parse(nowIso)) return "That invitation has expired."
  if (row.email.trim().toLowerCase() !== sessionEmail.trim().toLowerCase()) {
    return "That invitation was issued to a different email address."
  }
  return null
}