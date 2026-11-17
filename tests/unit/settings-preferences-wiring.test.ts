// Source guards for the preference-wiring wave: every stored setting that the settings
// page promises must have a real consumer, and the honest labels must match. The pure
// vocabulary lives in settings-preferences.test.ts; this file keeps the surfaces attached.
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const read = (relative: string) =>
  readFileSync(path.join(repo, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

describe("single source of defaults", () => {
  it("the settings API imports DEFAULT_SETTINGS from the pure module instead of defining it", () => {
    const route = read("app/api/settings/route.ts")
    expect(route).toContain('from "@/lib/settings/preferences"')
    expect(route).not.toContain("export const DEFAULT_SETTINGS")
    expect(route).toContain("DEFAULT_SETTINGS")
  })

  it("a client hook fetches the merged settings once per mount", () => {
    const hook = read("hooks/use-settings.ts")
    expect(hook).toContain('fetch("/api/settings")')
    expect(hook).toContain("DEFAULT_SETTINGS")
    expect(hook).toContain("ready")
  })
})

describe("calendar consumes weekStart and timeFormat", () => {
  const calendar = read("app/dashboard/calendar/page.tsx")

  it("derives the week start from settings, with no hardcoded Monday left", () => {
    expect(calendar).toContain("useSettings")
    expect(calendar).toContain("weekStartsOn(settings.weekStart)")
    expect(calendar).not.toContain("weekStartsOn: 1")
  })

  it("rotates the month-grid header instead of the fixed Mon-first array", () => {
    expect(calendar).toContain("weekdayShortLabels(weekStart)")
  })

  it("indexes the busiest weekday relative to the chosen start", () => {
    expect(calendar).toContain("(getDay() - weekStart + 7) % 7")
    expect(calendar).toContain("(busiestIdx + weekStart) % 7")
  })

  it("renders clock times through the stored format", () => {
    expect(calendar).toContain("timePattern(settings.timeFormat)")
    expect(calendar).toContain("function timeRange(e: CalendarEvent, pattern: string)")
  })
})

describe("other clock-time surfaces consume timeFormat", () => {
  it("the dashboard event list formats with hour12 from settings", () => {
    const home = read("app/dashboard/page.tsx")
    expect(home).toContain("hour12(settings.timeFormat)")
  })

  it("chat message stamps take the format as an argument", () => {
    const chat = read("app/dashboard/chat/page.tsx")
    expect(chat).toContain("function clockTime(iso: string, use12h: boolean)")
    expect(chat).toContain("clockTime(msg.timestamp, hour12(settings.timeFormat))")
  })
})

describe("sprints page opens on the stored default view", () => {
  const sprints = read("app/dashboard/sprints/page.tsx")

  it("maps the preference through the shared helper", () => {
    expect(sprints).toContain("sprintViewDefault(settings.sprintView)")
  })

  it("a manual view choice is never overridden by the arriving settings", () => {
    expect(sprints).toContain("viewTouched")
  })
})

describe("task create forms consume the stored defaults", () => {
  it("the tasks page quick-create reads taskCreateDefaults", () => {
    expect(read("app/dashboard/tasks/page.tsx")).toContain("taskCreateDefaults(settings)")
  })

  it("the kanban add-card draft reads taskCreateDefaults", () => {
    expect(read("app/dashboard/kanban/page.tsx")).toContain("taskCreateDefaults(settings)")
  })
})

describe("worklog week math honours the stored week start", () => {
  it("resolveRange and viewDays accept an optional week start", () => {
    const viewState = read("lib/worklog/view-state.ts")
    expect(viewState).toContain(
      "resolveRange(state: ViewState, todayIso: string, weekStartsOn: 0 | 1 | 6 = 1)",
    )
    expect(viewState).toContain(
      "viewDays(state: ViewState, todayIso: string, weekStartsOn: 0 | 1 | 6 = 1)",
    )
  })

  it("both worklog reads take the start from the member's stored preferences", () => {
    expect(read("app/api/worklog/entries/route.ts")).toContain(
      "storedWeekStart(session.user.preferences)",
    )
    expect(read("app/api/worklog/summary/route.ts")).toContain(
      "storedWeekStart(session.user.preferences)",
    )
  })

  it("the client's own range label uses the same start", () => {
    expect(read("app/dashboard/worklog/worklog-client.tsx")).toContain(
      "resolveRange(state, todayIso, weekStartsOn(settings.weekStart))",
    )
  })
})

describe("density reaches the dashboard chrome", () => {
  it("cards expose stable slots for the density rules", () => {
    const card = read("components/ui/card.tsx")
    expect(card).toContain('data-slot="card"')
    expect(card).toContain('data-slot="card-header"')
    expect(card).toContain('data-slot="card-content"')
    expect(card).toContain('data-slot="card-footer"')
  })

  it("the layout stamps the stored density on the scrolling content", () => {
    const layout = read("components/dashboard-layout.tsx")
    expect(layout).toContain("useSettings")
    expect(layout).toContain("data-density")
  })

  it("globals.css carries the compact rules", () => {
    expect(read("app/globals.css")).toContain('[data-density="compact"]')
  })
})

describe("settings page labels tell the new truth", () => {
  const settings = read("app/dashboard/settings/page.tsx")

  it("no surface is still labelled as consuming nothing", () => {
    expect(settings).not.toContain("Consumed by: nothing yet")
    expect(settings).not.toContain("Stored preference for calendar/sprint views")
  })

  it("the quiet-hours time inputs carry form names alongside their labels", () => {
    expect(settings).toContain('name="quietHoursStart"')
    expect(settings).toContain('name="quietHoursEnd"')
    expect(settings).toContain('htmlFor="qh-start"')
    expect(settings).toContain('htmlFor="qh-end"')
  })
})

describe("hygiene", () => {
  it("the stale settings page backup is gone", () => {
    expect(existsSync(path.join(repo, "app/dashboard/settings/page.tsx.temp"))).toBe(false)
  })

  it("the removed aitopia relay left no directory skeleton", () => {
    expect(existsSync(path.join(repo, "app/api/aitopia"))).toBe(false)
  })
})