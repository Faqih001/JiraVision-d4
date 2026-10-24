// Team workspace settings — a single row in `team_settings`, read by the team
// APIs so member defaults and notification preferences round-trip instead of
// being hard-coded. Types and normalizers live in ./team-settings-model (pure,
// unit-tested); this module owns the Postgres readers and writers.

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { teamRoleAudit, users } from "@/drizzle/schema"
import {
  DEFAULT_TEAM_SETTINGS,
  normalizeRole,
  type MemberRole,
  type TeamSettings,
} from "@/lib/team-settings-model"

export {
  DEFAULT_TEAM_SETTINGS,
  MEMBER_ROLES,
  TEAM_NAME_MAX,
  TEAM_NOTIFICATION_KEYS,
  isMemberRole,
  isPrivilegedRole,
  normalizeRole,
  normalizeTeamSettingsInput,
  teamNotifyEnabled,
} from "@/lib/team-settings-model"
export type { MemberRole, TeamNotificationKey, TeamSettings } from "@/lib/team-settings-model"

type SettingsRow = {
  team_name: string
  default_member_role: string
  notify_member_joined: boolean
  notify_member_removed: boolean
  notify_profile_updated: boolean
  notify_role_changed: boolean
  notify_wellbeing_alert: boolean
  updated_by: number | null
  updated_by_name: string | null
  updated_at_iso: string | null
}

const SETTINGS_PROJECTION = sql`
  s.team_name,
  s.default_member_role,
  s.notify_member_joined,
  s.notify_member_removed,
  s.notify_profile_updated,
  s.notify_role_changed,
  s.notify_wellbeing_alert,
  s.updated_by,
  (SELECT u.name FROM users u WHERE u.id = s.updated_by) AS updated_by_name,
  to_char(s.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at_iso
`

function toSettings(row: SettingsRow | undefined): TeamSettings {
  if (!row) return { ...DEFAULT_TEAM_SETTINGS, notifications: { ...DEFAULT_TEAM_SETTINGS.notifications } }
  return {
    teamName: row.team_name || DEFAULT_TEAM_SETTINGS.teamName,
    defaultMemberRole: normalizeRole(row.default_member_role) ?? DEFAULT_TEAM_SETTINGS.defaultMemberRole,
    notifications: {
      memberJoined: row.notify_member_joined !== false,
      memberRemoved: row.notify_member_removed !== false,
      profileUpdated: row.notify_profile_updated !== false,
      roleChanged: row.notify_role_changed !== false,
      wellbeingAlert: row.notify_wellbeing_alert !== false,
    },
    updatedBy: row.updated_by ?? null,
    updatedByName: row.updated_by_name ?? null,
    updatedAt: row.updated_at_iso ?? null,
  }
}

/** Current settings, creating the singleton row on first use. */
export async function readTeamSettings(): Promise<TeamSettings> {
  const existing = (await db.execute(
    sql`SELECT ${SETTINGS_PROJECTION} FROM team_settings s ORDER BY s.id LIMIT 1`,
  )) as unknown as SettingsRow[]
  if (existing.length > 0) return toSettings(existing[0])

  await db.execute(sql`INSERT INTO team_settings (team_name) VALUES (${DEFAULT_TEAM_SETTINGS.teamName})`)
  const created = (await db.execute(
    sql`SELECT ${SETTINGS_PROJECTION} FROM team_settings s ORDER BY s.id LIMIT 1`,
  )) as unknown as SettingsRow[]
  return toSettings(created[0])
}

/** Persist a partial patch; returns the merged settings. */
export async function writeTeamSettings(
  patch: Partial<TeamSettings>,
  actorId: number | null,
): Promise<TeamSettings> {
  const current = await readTeamSettings()
  const next: TeamSettings = {
    ...current,
    ...patch,
    notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
  }

  await db.execute(sql`
    UPDATE team_settings SET
      team_name = ${next.teamName},
      default_member_role = ${next.defaultMemberRole},
      notify_member_joined = ${next.notifications.memberJoined},
      notify_member_removed = ${next.notifications.memberRemoved},
      notify_profile_updated = ${next.notifications.profileUpdated},
      notify_role_changed = ${next.notifications.roleChanged},
      notify_wellbeing_alert = ${next.notifications.wellbeingAlert},
      updated_by = ${actorId},
      updated_at = now()
    WHERE id = (SELECT id FROM team_settings ORDER BY id LIMIT 1)
  `)

  const rows = (await db.execute(
    sql`SELECT ${SETTINGS_PROJECTION} FROM team_settings s ORDER BY s.id LIMIT 1`,
  )) as unknown as SettingsRow[]
  return toSettings(rows[0])
}

export async function recordRoleChange(entry: {
  memberId: number
  memberName: string | null
  fromRole: string | null
  toRole: MemberRole
  changedBy: number | null
}): Promise<void> {
  await db.insert(teamRoleAudit).values({
    memberId: entry.memberId,
    memberName: entry.memberName,
    fromRole: entry.fromRole,
    toRole: entry.toRole,
    changedBy: entry.changedBy,
  })
}

export type RoleChangeEntry = {
  id: number
  memberId: number
  memberName: string | null
  fromRole: string | null
  toRole: string
  changedBy: number | null
  changedByName: string | null
  createdAt: string
}

export async function listRoleChanges(limit = 12): Promise<RoleChangeEntry[]> {
  const rows = (await db.execute(sql`
    SELECT
      a.id,
      a.member_id,
      a.member_name,
      a.from_role,
      a.to_role,
      a.changed_by,
      (SELECT u.name FROM ${users} u WHERE u.id = a.changed_by) AS changed_by_name,
      to_char(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM team_role_audit a
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ${limit}
  `)) as unknown as {
    id: number
    member_id: number
    member_name: string | null
    from_role: string | null
    to_role: string
    changed_by: number | null
    changed_by_name: string | null
    created_at: string
  }[]

  return rows.map((r) => ({
    id: Number(r.id),
    memberId: Number(r.member_id),
    memberName: r.member_name,
    fromRole: r.from_role,
    toRole: r.to_role,
    changedBy: r.changed_by === null ? null : Number(r.changed_by),
    changedByName: r.changed_by_name,
    createdAt: r.created_at,
  }))
}
