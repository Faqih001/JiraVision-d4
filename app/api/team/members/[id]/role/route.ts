// PATCH /api/team/members/[id]/role — change a member's *system* role
// (user / admin / superadmin). The roster's "role" column elsewhere is the job
// title; this is the access level that gates /admin/cms and team settings.
//
// Super-admins only, never self-service (no accidental lockouts), and the last
// privileged account cannot be demoted.

import { NextResponse } from "next/server"
import { and, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { getCurrentUser, isSuperAdmin } from "@/lib/session"
import { createNotification } from "@/lib/notifications"
import {
  listRoleChanges,
  normalizeRole,
  readTeamSettings,
  recordRoleChange,
  teamNotifyEnabled,
} from "@/lib/team-settings"

export const dynamic = "force-dynamic"

const TEAM_LINK = "/dashboard/team/settings"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser()
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    if (!isSuperAdmin(actor)) {
      return NextResponse.json({ success: false, error: "Only an admin can change access roles" }, { status: 403 })
    }

    const { id } = await params
    const memberId = Number.parseInt(id, 10)
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return NextResponse.json({ success: false, error: "Member id must be a positive integer" }, { status: 400 })
    }

    const body = (await request.json().catch(() => null)) as { role?: unknown } | null
    const role = normalizeRole(body?.role)
    if (!role) {
      return NextResponse.json({ success: false, error: "Role must be one of: user, admin, superadmin" }, { status: 400 })
    }
    if (memberId === actor.id) {
      return NextResponse.json(
        { success: false, error: "You cannot change your own access role — ask another admin." },
        { status: 400 },
      )
    }

    const [member] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, memberId))
      .limit(1)
    if (!member) {
      return NextResponse.json({ success: false, error: "Team member not found" }, { status: 404 })
    }

    const fromRole = (member.role ?? "user").toLowerCase()
    if (fromRole === role) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        member: { id: member.id, name: member.name, email: member.email, role },
      })
    }

    const isPrivileged = (r: string) => r === "admin" || r === "superadmin"
    if (isPrivileged(fromRole) && !isPrivileged(role)) {
      const [remaining] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .where(and(ne(users.id, memberId), sql`lower(${users.role}) IN ('admin', 'superadmin')`))
      if (Number(remaining?.n ?? 0) === 0) {
        return NextResponse.json(
          { success: false, error: `${member.name} is the last admin. Promote someone else before demoting them.` },
          { status: 409 },
        )
      }
    }

    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, memberId))
    await recordRoleChange({
      memberId,
      memberName: member.name,
      fromRole,
      toRole: role,
      changedBy: actor.id,
    })

    const settings = await readTeamSettings()
    if (teamNotifyEnabled(settings, "roleChanged")) {
      await createNotification({
        userId: memberId,
        type: "system",
        title: "Your access role changed",
        body: `${actor.name || "An admin"} changed your access role from ${fromRole} to ${role}.`,
        link: TEAM_LINK,
        metadata: { action: "team_role_changed", memberId, fromRole, toRole: role, changedBy: actor.id },
      }).catch(() => undefined)

      await createNotification({
        userId: actor.id,
        type: "system",
        title: `Access role updated: ${member.name}`,
        body: `${fromRole} → ${role}. Recorded in the team settings audit trail.`,
        link: TEAM_LINK,
        metadata: { action: "team_role_changed", memberId, fromRole, toRole: role },
      }).catch(() => undefined)
    }

    const roleChanges = await listRoleChanges(12)
    return NextResponse.json({
      success: true,
      member: { id: member.id, name: member.name, email: member.email, role },
      fromRole,
      roleChanges,
    })
  } catch (error) {
    console.error("Team member role update error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update access role" },
      { status: 500 },
    )
  }
}
