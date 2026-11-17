// The stored workspace preferences and the one vocabulary every consumer shares.
// Pure by design: the settings API re-exports DEFAULT_SETTINGS from here, client pages
// map stored values through these helpers, and the worklog server reads the week start
// out of users.preferences without a second query.

import { PRIORITIES } from "@/app/api/automation/registry"

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  // Preferences
  theme: "system",
  density: "comfortable",
  weekStart: "monday",
  timeFormat: "12h",
  sprintView: "board",
  // Notification preferences (stored preference; the realtime bell follows
  // server-side Neon Realtime availability, not these flags)
  notifyEmail: true,
  notifyRealtime: true,
  notifyPush: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  // Task creation defaults
  defaultPriority: "medium",
  defaultStoryPoints: 3,
  defaultSprintId: null as number | null,
}

export type WeekStartsOn = 0 | 1 | 6

/** date-fns weekStartsOn for the stored weekStart vocabulary; Monday is the fallback. */
export function weekStartsOn(value: unknown): WeekStartsOn {
  if (value === "sunday") return 0
  if (value === "saturday") return 6
  return 1
}

/** The week start from the users.preferences jsonb shape ({ settings: { weekStart } }). */
export function storedWeekStart(preferences: unknown): WeekStartsOn {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return 1
  const settings = (preferences as Record<string, unknown>).settings
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return 1
  return weekStartsOn((settings as Record<string, unknown>).weekStart)
}

const MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Month-grid header labels rotated so the chosen week start sits first. */
export function weekdayShortLabels(start: WeekStartsOn): string[] {
  // MON_FIRST is Monday-first; JS day numbers are Sunday-first, so shift by one.
  const offset = (start + 6) % 7
  return MON_FIRST.map((_, i) => MON_FIRST[(i + offset) % 7])
}

/** The sprints page opens on cards/table/timeline; settings stores board/list/timeline. */
export function sprintViewDefault(value: unknown): "cards" | "table" | "timeline" {
  if (value === "list") return "table"
  if (value === "timeline") return "timeline"
  return "cards"
}

export function hour12(value: unknown): boolean {
  return value !== "24h"
}

/** date-fns display pattern for clock times. Storage stays canonical HH:mm. */
export function timePattern(value: unknown): string {
  return hour12(value) ? "h:mm a" : "HH:mm"
}

/** Validated create-form defaults; a deleted sprint or stray value falls back, never throws. */
export function taskCreateDefaults(settings: Record<string, unknown>): {
  priority: string
  storyPoints: number
  sprintId: number | null
} {
  const priority =
    typeof settings.defaultPriority === "string" &&
    (PRIORITIES as readonly string[]).includes(settings.defaultPriority)
      ? settings.defaultPriority
      : "medium"
  const points = settings.defaultStoryPoints
  const storyPoints =
    typeof points === "number" && Number.isFinite(points)
      ? Math.min(100, Math.max(0, Math.round(points)))
      : 3
  const sprint = settings.defaultSprintId
  const sprintId =
    typeof sprint === "number" && Number.isInteger(sprint) && sprint > 0 ? sprint : null
  return { priority, storyPoints, sprintId }
}