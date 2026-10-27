import { describe, expect, it } from "vitest"
import {
  TASK_BUCKET_LABEL,
  aggregateReport,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import { CHART_KEYS, type ChartKey } from "@/lib/reports/templates"
import {
  CHART_UNIT,
  FALLBACK_FILL,
  PRIORITY_FILL,
  TASK_BUCKET_FILL,
  chartRows,
} from "@/lib/reports/charts"
import type { EntryDto } from "@/lib/worklog/entries"

const period = resolvePeriod("weekly", "2026-10-28") // Mon 2026-10-26 to Sun 2026-11-01

const entry = (over: Partial<EntryDto> = {}): EntryDto => ({
  id: 1,
  workedOn: "2026-10-27",
  taskId: null,
  taskTitle: null,
  kind: "action",
  title: "Did the thing",
  body: null,
  discipline: "developer",
  minutes: 60,
  deliverableId: null,
  playbookId: null,
  playbookVersion: null,
  links: [],
  source: "manual",
  redatedAt: null,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const source = (over: Partial<ReportSource> = {}): ReportSource => ({
  period,
  todayIso: "2026-11-03",
  timezone: "Africa/Nairobi",
  entries: [],
  deliverables: [],
  transitions: [],
  tasks: [],
  planItems: [],
  ...over,
})

const busy = aggregateReport(
  source({
    entries: [
      entry({ id: 1, discipline: "developer", kind: "action", minutes: 120 }),
      entry({ id: 2, discipline: "auditor", kind: "review", minutes: 30 }),
      entry({ id: 3, discipline: "developer", kind: "blocker", minutes: 45 }),
      entry({ id: 4, discipline: "developer", kind: "note", minutes: 15 }),
      // Work logged before a discipline was chosen: it must still be drawn, in a real colour.
      entry({ id: 5, discipline: null, kind: "time", minutes: 10 }),
    ],
    tasks: [
      { id: 6, title: "Ship the export", status: "done", priority: "high", dueDate: "2026-10-30", storyPoints: 3, sprintTitle: "Sprint 12" },
      { id: 7, title: "Rewire the ingest", status: "in_progress", priority: "urgent", dueDate: "2026-11-05", storyPoints: 5, sprintTitle: null },
      { id: 8, title: "Chase the vendor", status: "blocked", priority: "medium", dueDate: "2026-11-06", storyPoints: 0, sprintTitle: null },
      { id: 9, title: "Draft the runbook", status: "waiting-on-vendor", priority: "none", dueDate: null, storyPoints: 0, sprintTitle: null },
    ],
  }),
)

const quiet = aggregateReport(source())

const total = (values: number[]): number => values.reduce((sum, value) => sum + value, 0)

describe("the chart datum", () => {
  it("carries everything the bar, its tooltip and its drill-down need", () => {
    for (const chart of CHART_KEYS) {
      const data = chartRows(busy, chart)
      expect(data.length).toBeGreaterThan(0)
      for (const datum of data) {
        expect(datum.label.trim()).not.toBe("")
        expect(Number.isFinite(datum.value)).toBe(true)
        expect(datum.display).toBeTruthy()
        expect(datum.fill).toMatch(/^hsl\(var\(--[a-z-]+\)\)$/u)
      }
    }
  })

  it("draws the three time charts from minutes", () => {
    expect(total(chartRows(busy, "discipline").map((d) => d.value))).toBe(busy.metrics.minutes.value)
    expect(total(chartRows(busy, "kind").map((d) => d.value))).toBe(busy.metrics.minutes.value)
    expect(total(chartRows(busy, "series").map((d) => d.value))).toBe(busy.metrics.minutes.value)
    expect(chartRows(busy, "discipline")[0]).toMatchObject({
      key: "developer",
      value: 180,
      display: "3h",
      refs: ["entry:1", "entry:3", "entry:4"],
    })
  })

  it("draws the two task charts from counts, with the task ids behind them", () => {
    expect(total(chartRows(busy, "taskStatus").map((d) => d.value))).toBe(4)
    expect(total(chartRows(busy, "priority").map((d) => d.value))).toBe(4)
    for (const chart of ["taskStatus", "priority"] as const) {
      for (const datum of chartRows(busy, chart)) {
        expect(datum.display).toBe(String(datum.value))
        for (const ref of datum.refs) expect(ref.startsWith("task:")).toBe(true)
      }
    }
  })

  it("names the buckets with the aggregate's own words", () => {
    expect(chartRows(busy, "discipline").find((d) => d.key === "unassigned")?.label).toBe("Not set")
    expect(chartRows(busy, "taskStatus").map((d) => d.label)).toContain(TASK_BUCKET_LABEL.blocked)
  })
})

describe("an empty period", () => {
  it("keeps one point per bucket, gaps and all, so a quiet week still has a shape", () => {
    expect(chartRows(busy, "series")).toHaveLength(busy.series.length)
    expect(chartRows(quiet, "series")).toHaveLength(quiet.series.length)
    for (const datum of chartRows(quiet, "series")) {
      expect(datum.value).toBe(0)
      expect(datum.refs).toEqual([])
    }
  })

  it("returns nothing for a split with no rows, so the card can show its empty note", () => {
    expect(chartRows(quiet, "discipline")).toEqual([])
    expect(chartRows(quiet, "kind")).toEqual([])
    expect(chartRows(quiet, "taskStatus")).toEqual([])
    expect(chartRows(quiet, "priority")).toEqual([])
  })

  it("gives a bucket nobody mapped the muted token instead of no colour at all", () => {
    expect(chartRows(busy, "discipline").find((d) => d.key === "unassigned")?.fill).toBe(FALLBACK_FILL)
    expect(FALLBACK_FILL).toBe("hsl(var(--muted-foreground))")
  })
})

describe("the colour vocabulary", () => {
  it("covers all four task buckets and every priority the app can hold", () => {
    expect(Object.keys(TASK_BUCKET_FILL).sort()).toEqual(Object.keys(TASK_BUCKET_LABEL).sort())
    expect(Object.keys(PRIORITY_FILL).sort()).toEqual(["high", "low", "medium", "none", "urgent"])
  })

  it("pairs every chart key with the unit its bars are drawn in", () => {
    expect(CHART_KEYS.map((key) => CHART_UNIT[key])).toEqual(["time", "time", "count", "count", "time"])
  })

  it("answers for every chart the templates are allowed to ask for", () => {
    for (const chart of CHART_KEYS) expect(Array.isArray(chartRows(busy, chart))).toBe(true)
  })

  it("throws rather than drawing a blank for a chart key it does not know", () => {
    // The double cast is what the compiler refuses to do for a real key it has never seen; here it
    // is the test standing in for a `ChartKey` added to the vocabulary without any data behind it.
    expect(() => chartRows(busy, "sparkline" as unknown as ChartKey)).toThrow(/no chart data/u)
  })
})
