import { describe, expect, it } from "vitest"
import {
  DEFAULT_TEAM_SETTINGS,
  MEMBER_ROLES,
  TEAM_NAME_MAX,
  TEAM_NOTIFICATION_KEYS,
  isMemberRole,
  isPrivilegedRole,
  normalizeRole,
  normalizeTeamSettingsInput,
  teamNotifyEnabled,
  type TeamSettings,
} from "@/lib/team-settings-model"

function settings(overrides: Partial<TeamSettings> = {}): TeamSettings {
  return {
    ...DEFAULT_TEAM_SETTINGS,
    notifications: { ...DEFAULT_TEAM_SETTINGS.notifications },
    ...overrides,
  }
}

describe("role model", () => {
  it("exposes exactly the three system roles", () => {
    expect(MEMBER_ROLES).toEqual(["user", "admin", "superadmin"])
  })

  it("isMemberRole only accepts declared roles", () => {
    expect(isMemberRole("user")).toBe(true)
    expect(isMemberRole("superadmin")).toBe(true)
    expect(isMemberRole("owner")).toBe(false)
    expect(isMemberRole("")).toBe(false)
    expect(isMemberRole(null)).toBe(false)
    expect(isMemberRole(7)).toBe(false)
  })

  it("normalizeRole trims and lower-cases before matching", () => {
    expect(normalizeRole("  Admin ")).toBe("admin")
    expect(normalizeRole("USER")).toBe("user")
    expect(normalizeRole("SuperAdmin")).toBe("superadmin")
  })

  it("normalizeRole returns null for anything undeclared", () => {
    expect(normalizeRole("admin2")).toBeNull()
    expect(normalizeRole(undefined)).toBeNull()
    expect(normalizeRole(["user"])).toBeNull()
  })

  it("isPrivilegedRole covers admin and superadmin only", () => {
    expect(isPrivilegedRole("admin")).toBe(true)
    expect(isPrivilegedRole("superadmin")).toBe(true)
    expect(isPrivilegedRole(" Admin ")).toBe(true)
    expect(isPrivilegedRole("user")).toBe(false)
    expect(isPrivilegedRole(null)).toBe(false)
    expect(isPrivilegedRole(undefined)).toBe(false)
    expect(isPrivilegedRole("root")).toBe(false)
  })
})

describe("normalizeTeamSettingsInput", () => {
  it("returns an empty patch for non-object payloads", () => {
    expect(normalizeTeamSettingsInput(null)).toEqual({})
    expect(normalizeTeamSettingsInput(undefined)).toEqual({})
    expect(normalizeTeamSettingsInput("teamName")).toEqual({})
    expect(normalizeTeamSettingsInput(42)).toEqual({})
    expect(normalizeTeamSettingsInput([{ teamName: "x" }])).toEqual({})
  })

  it("drops unknown keys", () => {
    const out = normalizeTeamSettingsInput({ teamName: "Acme", isAdmin: true, role: "superadmin" })
    expect(out).toEqual({ teamName: "Acme" })
    expect(Object.keys(out)).toEqual(["teamName"])
  })

  it("trims the team name and ignores blank or non-string values", () => {
    expect(normalizeTeamSettingsInput({ teamName: "  Divai Field Team  " })).toEqual({
      teamName: "Divai Field Team",
    })
    expect(normalizeTeamSettingsInput({ teamName: "   " })).toEqual({})
    expect(normalizeTeamSettingsInput({ teamName: "" })).toEqual({})
    expect(normalizeTeamSettingsInput({ teamName: 12 })).toEqual({})
  })

  it("caps the team name at TEAM_NAME_MAX characters", () => {
    const long = "a".repeat(TEAM_NAME_MAX + 80)
    const out = normalizeTeamSettingsInput({ teamName: long })
    expect(out.teamName).toHaveLength(TEAM_NAME_MAX)
  })

  it("rejects an undeclared default role", () => {
    expect(normalizeTeamSettingsInput({ defaultMemberRole: "owner" })).toEqual({})
    expect(normalizeTeamSettingsInput({ defaultMemberRole: "admin" })).toEqual({
      defaultMemberRole: "admin",
    })
  })

  it("accepts only boolean notification values, filling the rest from defaults", () => {
    const out = normalizeTeamSettingsInput({
      notifications: { roleChanged: false, memberJoined: "no", injected: true },
    })
    expect(out.notifications).toEqual({
      memberJoined: true,
      memberRemoved: true,
      profileUpdated: true,
      roleChanged: false,
      wellbeingAlert: true,
    })
  })

  it("omits notifications when nothing valid was supplied", () => {
    expect(normalizeTeamSettingsInput({ notifications: {} })).toEqual({})
    expect(normalizeTeamSettingsInput({ notifications: { roleChanged: "false" } })).toEqual({})
    expect(normalizeTeamSettingsInput({ notifications: ["a"] })).toEqual({})
    expect(normalizeTeamSettingsInput({ notifications: null })).toEqual({})
  })

  it("does not mutate the shared defaults object", () => {
    normalizeTeamSettingsInput({ notifications: { roleChanged: false } })
    expect(DEFAULT_TEAM_SETTINGS.notifications.roleChanged).toBe(true)
  })

  it("keeps every declared notification key normalizable", () => {
    for (const key of TEAM_NOTIFICATION_KEYS) {
      const out = normalizeTeamSettingsInput({ notifications: { [key]: false } })
      expect(out.notifications?.[key]).toBe(false)
    }
    expect(TEAM_NOTIFICATION_KEYS).toHaveLength(5)
  })
})

describe("teamNotifyEnabled", () => {
  it("reads the stored preference for a key", () => {
    const off = settings({ notifications: { ...DEFAULT_TEAM_SETTINGS.notifications, wellbeingAlert: false } })
    expect(teamNotifyEnabled(off, "wellbeingAlert")).toBe(false)
    expect(teamNotifyEnabled(off, "memberJoined")).toBe(true)
  })

  it("defaults every channel to on", () => {
    for (const key of TEAM_NOTIFICATION_KEYS) {
      expect(teamNotifyEnabled(DEFAULT_TEAM_SETTINGS, key)).toBe(true)
    }
  })
})

describe("defaults", () => {
  it("ships a neutral singleton configuration", () => {
    expect(DEFAULT_TEAM_SETTINGS.teamName).toBe("Team")
    expect(DEFAULT_TEAM_SETTINGS.defaultMemberRole).toBe("user")
    expect(DEFAULT_TEAM_SETTINGS.updatedBy).toBeNull()
    expect(DEFAULT_TEAM_SETTINGS.updatedAt).toBeNull()
    expect(Object.keys(DEFAULT_TEAM_SETTINGS.notifications)).toEqual([...TEAM_NOTIFICATION_KEYS])
  })
})
