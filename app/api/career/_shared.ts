// Shared helpers for /api/career — the member session shape, the super-admin gate and
// the admin fan-out. The gate lives here so that every write route calls the same
// 401-then-403 check rather than trusting a button.

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { isSuperAdmin, parseAdminEmails } from "@/lib/roles"
import { notifyMany } from "@/lib/notifications"

export type CareerMember = {
  id: number
  name: string
  email: string
  role: string | null
  timezone: string | null
}

export type CareerAdminGate = { member: CareerMember } | { error: NextResponse }

export const MAX_NOTE = 2000

export function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json(
    { success: false, error: "Super-admin access required" },
    { status: 403 },
  )
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function careerSession(): Promise<CareerMember | null> {
  const session = await getSession()
  if (!session?.id) return null
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role ?? null,
    timezone: session.timezone ?? null,
  }
}

export async function careerAdmin(): Promise<CareerAdminGate> {
  const member = await careerSession()
  if (!member) return { error: unauthorized() }
  if (!isSuperAdmin(member)) return { error: forbidden() }
  return { member }
}

/** Notify every OTHER super-admin (role-based or ADMIN_EMAILS) about a career request. */
export async function notifyCareerAdmins(
  actor: { id: number; name: string },
  input: { title: string; body: string; link?: string },
): Promise<void> {
  try {
    const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS)
    const emailClause = adminEmails.length
      ? sql.join(
          adminEmails.map((email) => sql`lower(u.email) = ${email}`),
          sql` OR `,
        )
      : sql`FALSE`
    const rows = (await db.execute(sql`
      SELECT u.id FROM users u
      WHERE u.id <> ${actor.id}
        AND (lower(u.role) IN ('admin', 'superadmin') OR ${emailClause})
    `)) as unknown as { id: number }[]
    const ids = (rows ?? []).map((row) => row.id)
    if (ids.length === 0) return
    await notifyMany(ids, {
      type: "career",
      title: input.title,
      body: input.body,
      link: input.link ?? "/admin/career",
      metadata: { actorId: actor.id, actorName: actor.name },
    })
  } catch (error) {
    console.error("Career admin notification fan-out failed:", error)
  }
}
