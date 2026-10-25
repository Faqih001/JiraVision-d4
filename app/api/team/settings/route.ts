// /api/team/settings — team workspace governance settings.
//
// GET is available to any signed-in member (the page renders read-only for
// non-admins); PUT requires a super-admin because the default member role and
// the notification switches change what every other team API does.

import { NextResponse } from "next/server"
import { asc, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { getCurrentUser } from "@/lib/session"
import { isSuperAdmin } from "@/lib/roles"
import { createNotification } from "@/lib/notifications"
import {
  DEFAULT_TEAM_SETTINGS,
  MEMBER_ROLES,
  listRoleChanges,
  normalizeTeamSettingsInput,
  readTeamSettings,
  writeTeamSettings,
} from "@/lib/team-settings"

export const dynamic = "force-dynamic"

const TEAM_LINK = "/dashboard/team/settings"

async function loadAccessRoster() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      jobTitle: users.jobTitle,
      avatar: users.avatar,
      createdAt: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
    })
    .from(users)
    .orderBy(asc(users.name))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: (r.role ?? "user").toLowerCase(),
    jobTitle: r.jobTitle,
    avatar: r.avatar,
    joinedOn: r.createdAt ?? null,
  }))
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const [settings, members, roleChanges] = await Promise.all([
      readTeamSettings(),
      loadAccessRoster(),
      listRoleChanges(12),
    ])

    return NextResponse.json({
      success: true,
      settings,
      defaults: DEFAULT_TEAM_SETTINGS,
      roles: MEMBER_ROLES,
      canManage: isSuperAdmin(user),
      viewer: { id: user.id, name: user.name, role: (user.role ?? "user").toLowerCase() },
      members,
      roleChanges,
      adminEmailsConfigured: Boolean(process.env.ADMIN_EMAILS?.trim()),
    })
  } catch (error) {
    console.error("Team settings fetch error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load team settings" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    if (!isSuperAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "Only an admin can change team settings" },
        { status: 403 },
      )
    }

    const body = (await request.json().catch(() => null)) as unknown
    const patch = normalizeTeamSettingsInput(body)
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 })
    }

    const before = await readTeamSettings()
    const settings = await writeTeamSettings(patch, user.id)

    const changes: string[] = []
    if (patch.teamName !== undefined && patch.teamName !== before.teamName) {
      changes.push(`team name → ${settings.teamName}`)
    }
    if (patch.defaultMemberRole !== undefined && patch.defaultMemberRole !== before.defaultMemberRole) {
      changes.push(`default member role → ${settings.defaultMemberRole}`)
    }
    if (patch.notifications) {
      for (const key of Object.keys(patch.notifications) as (keyof typeof patch.notifications)[]) {
        if (patch.notifications[key] !== before.notifications[key]) {
          changes.push(`${key} notifications ${patch.notifications[key] ? "on" : "off"}`)
        }
      }
    }

    await createNotification({
      userId: user.id,
      type: "system",
      title: "Team settings updated",
      body: changes.length > 0 ? changes.join(" · ") : "Saved without changes.",
      link: TEAM_LINK,
      metadata: { action: "team_settings_updated", changes, settings },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, settings, changes })
  } catch (error) {
    console.error("Team settings update error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update team settings" },
      { status: 500 },
    )
  }
}
