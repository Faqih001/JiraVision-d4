// Cookie-session helpers usable from route handlers and server components.
// (lib/auth-actions.ts is "use server" and action-only; this is the read side.)
// The role policy itself lives in lib/roles.ts so it can be tested without a
// database connection.

import { cookies } from "next/headers"
import { getUserById, type User } from "@/lib/db"

export type SessionUser = Omit<User, "passwordHash">

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
