// Pure team-settings model — types, defaults and normalizers with no database
// or Next.js imports, so the API routes and unit tests share one definition.

/** System roles a member can hold. `admin`/`superadmin` unlock /admin/cms. */
export const MEMBER_ROLES = ["user", "admin", "superadmin"] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const TEAM_NOTIFICATION_KEYS = [
  "memberJoined",
  "memberRemoved",
  "profileUpdated",
  "roleChanged",
  "wellbeingAlert",
] as const

export type TeamNotificationKey = (typeof TEAM_NOTIFICATION_KEYS)[number]

export type TeamSettings = {
  teamName: string
  defaultMemberRole: MemberRole
  notifications: Record<TeamNotificationKey, boolean>
  updatedBy: number | null
  updatedByName: string | null
  updatedAt: string | null
}

export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  teamName: "Team",
  defaultMemberRole: "user",
  notifications: {
    memberJoined: true,
    memberRemoved: true,
    profileUpdated: true,
    roleChanged: true,
    wellbeingAlert: true,
  },
  updatedBy: null,
  updatedByName: null,
  updatedAt: null,
}

export const TEAM_NAME_MAX = 120

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (MEMBER_ROLES as readonly string[]).includes(value)
}

/** Coerce a raw role string; null when it is not one of the allowed roles. */
export function normalizeRole(value: unknown): MemberRole | null {
  const trimmed = typeof value === "string" ? value.trim().toLowerCase() : ""
  return isMemberRole(trimmed) ? trimmed : null
}

/** Clamp a settings payload to known keys and types — unknown keys are dropped. */
export function normalizeTeamSettingsInput(raw: unknown): Partial<TeamSettings> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const input = raw as Record<string, unknown>
  const out: Partial<TeamSettings> = {}

  if (typeof input.teamName === "string") {
    const name = input.teamName.trim().slice(0, TEAM_NAME_MAX)
    if (name) out.teamName = name
  }
  const role = normalizeRole(input.defaultMemberRole)
  if (role) out.defaultMemberRole = role

  if (input.notifications && typeof input.notifications === "object" && !Array.isArray(input.notifications)) {
    const n = input.notifications as Record<string, unknown>
    const notifications = { ...DEFAULT_TEAM_SETTINGS.notifications }
    let touched = false
    for (const key of TEAM_NOTIFICATION_KEYS) {
      if (typeof n[key] === "boolean") {
        notifications[key] = n[key] as boolean
        touched = true
      }
    }
    if (touched) out.notifications = notifications
  }
  return out
}

/** Gate every team-workspace notification on the stored preference. */
export function teamNotifyEnabled(settings: TeamSettings, key: TeamNotificationKey): boolean {
  return settings.notifications[key]
}

/** True when a role can reach the governance endpoints. */
export function isPrivilegedRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role)
  return normalized === "admin" || normalized === "superadmin"
}
