import { describe, expect, it } from "vitest"
import { WORK_DISCIPLINES } from "@/lib/roles"
import {
  DELIVERABLE_NEXT,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  ENTRY_SOURCES,
  KIND_COLOUR,
  WORK_LOG_KINDS,
  canMoveDeliverable,
  countByKind,
  formatMinutes,
  gapDays,
  groupByDay,
  groupByTask,
  isDeliverableStatus,
  isWorkLogKind,
  minutesByDiscipline,
  minutesTotal,
  openBlockerCount,
  streakOf,
  unlinkedCount,
  type EntryDto,
} from "@/lib/worklog/entries"

function entry(overrides: Partial<EntryDto> = {}): EntryDto {
  return {
    id: 1,
    workedOn: "2026-10-26",
    taskId: null,
    taskTitle: null,
    kind: "action",
    title: "Replaced the pump seal",
    body: null,
    discipline: "technician",
    minutes: 45,
    deliverableId: null,
    playbookId: null,
    playbookVersion: null,
    links: [],
    source: "manual",
    redatedAt: null,
    createdAt: "2026-10-26T10:00:00.000Z",
    ...overrides,
  }
}

describe("vocabulary", () => {
  it("matches the columns the migration created", () => {
    expect(WORK_LOG_KINDS).toEqual(["action", "time", "blocker", "note", "review", "deliverable"])
    expect(ENTRY_SOURCES).toEqual(["manual", "auto", "gemini"])
    expect(DELIVERABLE_TYPES).toContain("audit_finding")
    expect(DELIVERABLE_STATUSES).toEqual(["draft", "in_review", "approved", "delivered"])
  })

  it("gives every kind a label and a token colour, not a literal hex", () => {
    for (const kind of WORK_LOG_KINDS) {
      expect(KIND_COLOUR[kind]).toMatch(/^hsl\(var\(--/u)
    }
  })

  it("refuses a value outside the list", () => {
    expect(isWorkLogKind("action")).toBe(true)
    expect(isWorkLogKind("Action")).toBe(false)
    expect(isWorkLogKind("")).toBe(false)
    expect(isDeliverableStatus("shipped")).toBe(false)
  })

  it("has no dead end and no backward leak in the lifecycle", () => {
    for (const status of DELIVERABLE_STATUSES) {
      for (const next of DELIVERABLE_NEXT[status]) {
        expect(DELIVERABLE_STATUSES).toContain(next)
      }
    }
    expect(canMoveDeliverable("draft", "in_review")).toBe(true)
    expect(canMoveDeliverable("draft", "approved")).toBe(false)
    expect(canMoveDeliverable("delivered", "draft")).toBe(false)
    expect(DELIVERABLE_NEXT.delivered).toEqual([])
  })
})

describe("aggregation", () => {
  const rows = [
    entry({ id: 1, minutes: 45, kind: "action", taskId: 7, taskTitle: "Pump" }),
    entry({ id: 2, minutes: 30, kind: "blocker", taskId: 7, taskTitle: "Pump", discipline: "developer" }),
    entry({ id: 3, minutes: null, kind: "note", taskId: null, taskTitle: null, discipline: null }),
    entry({ id: 4, minutes: 15, kind: "review", taskId: 9, taskTitle: "Audit" }),
  ]

  it("totals minutes without treating null as zero noise", () => {
    expect(minutesTotal(rows)).toBe(90)
    expect(minutesTotal([])).toBe(0)
  })

  it("lists every kind, including the kinds with no rows", () => {
    const byKind = countByKind(rows)
    expect(byKind).toHaveLength(WORK_LOG_KINDS.length)
    expect(byKind.find((b) => b.kind === "blocker")).toMatchObject({ count: 1, minutes: 30 })
    expect(byKind.find((b) => b.kind === "time")).toMatchObject({ count: 0, minutes: 0 })
  })

  it("splits minutes by discipline and never invents one", () => {
    const split = minutesByDiscipline(rows)
    expect(split.map((s) => s.discipline)).toEqual(["technician", "developer"])
    expect(split[0]).toEqual({ discipline: "technician", minutes: 60, count: 2 })
    for (const s of split) expect(WORK_DISCIPLINES).toContain(s.discipline)
  })

  it("keeps unlinked work in one honest bucket at the end", () => {
    const groups = groupByTask(rows)
    expect(groups.map((g) => g.taskTitle)).toEqual(["Pump", "Audit", null])
    expect(groups[2].entries.map((e) => e.id)).toEqual([3])
  })

  it("emits a bucket for every day in the window, empty days included", () => {
    const days = ["2026-10-25", "2026-10-26", "2026-10-27"]
    const buckets = groupByDay(rows, days)
    expect(buckets).toHaveLength(3)
    expect(buckets[0]).toMatchObject({ day: "2026-10-25", count: 0, minutes: 0 })
    expect(buckets[1]).toMatchObject({ day: "2026-10-26", count: 4, minutes: 90 })
  })

  it("counts what the log cannot prove", () => {
    expect(unlinkedCount(rows)).toBe(1)
    expect(openBlockerCount(rows)).toBe(1)
  })
})

describe("streaks and gaps", () => {
  it("does not break a streak just because today is still empty", () => {
    expect(streakOf(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26")).toEqual({ current: 3, longest: 3 })
    expect(streakOf(["2026-10-24", "2026-10-25"], "2026-10-26")).toEqual({ current: 2, longest: 2 })
    expect(streakOf(["2026-10-24"], "2026-10-26")).toEqual({ current: 0, longest: 1 })
    expect(streakOf([], "2026-10-26")).toEqual({ current: 0, longest: 0 })
  })

  it("finds the longest run across a gap", () => {
    const active = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-23", "2026-10-24"]
    expect(streakOf(active, "2026-10-24")).toEqual({ current: 2, longest: 3 })
  })

  it("names the quiet days inside the window", () => {
    const days = ["2026-10-24", "2026-10-25", "2026-10-26"]
    expect(gapDays(days, ["2026-10-25"])).toEqual(["2026-10-24", "2026-10-26"])
  })

  it("formats minutes for a reader, not a database", () => {
    expect(formatMinutes(null)).toBe("—")
    expect(formatMinutes(0)).toBe("0m")
    expect(formatMinutes(45)).toBe("45m")
    expect(formatMinutes(90)).toBe("1h 30m")
    expect(formatMinutes(480)).toBe("8h")
  })
})
