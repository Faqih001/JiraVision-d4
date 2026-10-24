// Cookie-session helpers usable from route handlers and server components.
// (lib/auth-actions.ts is "use server" and action-only; this is the read side.)

import { cookies } from "next/headers"
import { getUserById, type User } from "@/lib/db"

export type SessionUser = Omit<User, "passwordHash">

const ADMIN_ROLES = ["admin", "superadmin"]

/** Env bootstrap list: comma-separated emails treated as super-admins. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const userIdCookie = cookieStore.get("user_id")?.value
    const sessionId = cookieStore.get("session_id")?.value
    if (!userIdCookie || !sessionId) return null
    const userId = Number.parseInt(userIdCookie, 10)
    if (!Number.isFinite(userId) || userId <= 0) return null
    const user = await getUserById(userId)
    if (!user) return null
    const { passwordHash: _ph, ...sessionUser } = user
    return sessionUser as SessionUser
  } catch {
    return null
  }
}

export function isSuperAdmin(
  user: Pick<SessionUser, "email" | "role"> | null | undefined,
  adminEmailsRaw?: string,
): user is Pick<SessionUser, "email" | "role"> {
  if (!user) return false
  if (ADMIN_ROLES.includes((user.role ?? "").toLowerCase())) return true
  return parseAdminEmails(adminEmailsRaw ?? process.env.ADMIN_EMAILS).includes(
    user.email.toLowerCase(),
  )
}
