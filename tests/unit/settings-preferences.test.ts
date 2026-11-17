// Pure contracts for the stored workspace preferences: the vocabulary mapping every
// consumer surface uses, plus the worklog week math that now honours weekStart.
import { describe, expect, it } from "vitest"
import {
  DEFAULT_SETTINGS,
  hour12,
  sprintViewDefault,
  storedWeekStart,
  taskCreateDefaults,
  timePattern,
  weekStartsOn,
  weekdayShortLabels,
} from "@/lib/settings/preferences"
import { defaultViewState, resolveRange, viewDays } from "@/lib/worklog/view-state"

describe("DEFAULT_SETTINGS", () => {
  it("keeps the exact defaults the settings API has always served", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: "system",
      density: "comfortable",
      weekStart: "monday",
      timeFormat: "12h",
      sprintView: "board",
      notifyEmail: true,
      notifyRealtime: true,
      notifyPush: false,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      defaultPriority: "medium",
      defaultStoryPoints: 3,
      defaultSprintId: null,
    })
  })
})

describe("weekStartsOn", () => {
  it("maps the stored vocabulary to date-fns day numbers", () => {
    expect(weekStartsOn("sunday")).toBe(0)
    expect(weekStartsOn("monday")).toBe(1)
    expect(weekStartsOn("saturday")).toBe(6)
  })

  it("falls back to Monday for anything unknown", () => {
    expect(weekStartsOn("tuesday")).toBe(1)
    expect(weekStartsOn(undefined)).toBe(1)
    expect(weekStartsOn(42)).toBe(1)
    expect(weekStartsOn(null)).toBe(1)
  })
})

describe("storedWeekStart", () => {
  it("reads weekStart out of the users.preferences jsonb shape", () => {
    expect(storedWeekStart({ settings: { weekStart: "sunday" } })).toBe(0)
    expect(storedWeekStart({ settings: { weekStart: "saturday" } })).toBe(6)
  })

  it("defaults to Monday when preferences are missing or malformed", () => {
    expect(storedWeekStart(null)).toBe(1)
    expect(storedWeekStart({})).toBe(1)
    expect(storedWeekStart({ settings: null })).toBe(1)
    expect(storedWeekStart({ settings: [] })).toBe(1)
    expect(storedWeekStart("nonsense")).toBe(1)
  })
})

describe("weekdayShortLabels", () => {
  it("rotates the Mon-first header to the chosen week start", () => {
    expect(weekdayShortLabels(1)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    expect(weekdayShortLabels(0)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
    expect(weekdayShortLabels(6)).toEqual(["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"])
  })
})

describe("sprintViewDefault", () => {
  it("maps the settings vocabulary onto the sprints page views", () => {
    expect(sprintViewDefault("board")).toBe("cards")
    expect(sprintViewDefault("list")).toBe("table")
    expect(sprintViewDefault("timeline")).toBe("timeline")
  })

  it("falls back to cards for anything unknown", () => {
    expect(sprintViewDefault("grid")).toBe("cards")
    expect(sprintViewDefault(undefined)).toBe("cards")
  })
})

describe("hour12 / timePattern", () => {
  it("treats 24h as the only non-12-hour format", () => {
    expect(hour12("12h")).toBe(true)
    expect(hour12("24h")).toBe(false)
    expect(hour12(undefined)).toBe(true)
    expect(hour12("bogus")).toBe(true)
  })

  it("produces date-fns display patterns, never storage patterns", () => {
    expect(timePattern("12h")).toBe("h:mm a")
    expect(timePattern("24h")).toBe("HH:mm")
    expect(timePattern(undefined)).toBe("h:mm a")
  })
})

describe("taskCreateDefaults", () => {
  it("passes valid stored defaults through", () => {
    expect(
      taskCreateDefaults({ defaultPriority: "high", defaultStoryPoints: 5, defaultSprintId: 7 }),
    ).toEqual({ priority: "high", storyPoints: 5, sprintId: 7 })
  })

  it("rejects a priority outside the shared vocabulary", () => {
    expect(taskCreateDefaults({ defaultPriority: "banana" }).priority).toBe("medium")
    expect(taskCreateDefaults({}).priority).toBe("medium")
  })

  it("clamps story points into 0..100 and falls back to 3 for non-numbers", () => {
    expect(taskCreateDefaults({ defaultStoryPoints: -4 }).storyPoints).toBe(0)
    expect(taskCreateDefaults({ defaultStoryPoints: 250 }).storyPoints).toBe(100)
    expect(taskCreateDefaults({ defaultStoryPoints: "eight" }).storyPoints).toBe(3)
    expect(taskCreateDefaults({ defaultStoryPoints: null }).storyPoints).toBe(3)
    expect(taskCreateDefaults({}).storyPoints).toBe(3)
  })

  it("only accepts a positive integer sprint id, otherwise null", () => {
    expect(taskCreateDefaults({ defaultSprintId: null }).sprintId).toBeNull()
    expect(taskCreateDefaults({ defaultSprintId: "4" }).sprintId).toBeNull()
    expect(taskCreateDefaults({ defaultSprintId: -2 }).sprintId).toBeNull()
    expect(taskCreateDefaults({ defaultSprintId: 1.5 }).sprintId).toBeNull()
    expect(taskCreateDefaults({}).sprintId).toBeNull()
  })
})

describe("worklog week math honours weekStartsOn", () => {
  // 2026-10-28 is a Wednesday.
  const WED = "2026-10-28"
  const weekState = { ...defaultViewState(WED), view: "week" as const, day: WED }

  it("keeps Monday as the default so existing URLs and callers do not move", () => {
    expect(resolveRange(weekState, WED)).toEqual({ from: "2026-10-26", to: "2026-11-01" })
  })

  it("starts the week on Sunday when asked", () => {
    expect(resolveRange(weekState, WED, 0)).toEqual({ from: "2026-10-25", to: "2026-10-31" })
  })

  it("starts the week on Saturday when asked", () => {
    expect(resolveRange(weekState, WED, 6)).toEqual({ from: "2026-10-24", to: "2026-10-30" })
  })

  it("applies the same start to the this-week preset", () => {
    const preset = { ...defaultViewState(WED), view: "list" as const, preset: "this-week" as const }
    expect(resolveRange(preset, WED, 0)).toEqual({ from: "2026-10-25", to: "2026-10-31" })
    expect(resolveRange(preset, WED)).toEqual({ from: "2026-10-26", to: "2026-11-01" })
  })

  it("threads the start through viewDays so the day buckets agree with the range", () => {
    expect(viewDays(weekState, WED, 0)[0]).toBe("2026-10-25")
    expect(viewDays(weekState, WED, 6)[0]).toBe("2026-10-24")
    expect(viewDays(weekState, WED)[0]).toBe("2026-10-26")
  })
})