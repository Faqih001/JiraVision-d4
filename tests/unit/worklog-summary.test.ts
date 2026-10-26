import { describe, expect, it } from "vitest"
import { buildSummary, type EntryDto, type TransitionDto } from "@/lib/worklog/summary"
import { rangeDays } from "@/lib/worklog/local-day"

const DAYS = rangeDays("2026-10-19", "2026-10-25")

function entry(over: Partial<EntryDto>): EntryDto {
  return {
    id: 1,
    workedOn: "2026-10-19",
    taskId: null,
    taskTitle: null,
    kind: "action",
    title: "Racked a switch",
    body: null,
    discipline: "technician",
    minutes: 30,
    deliverableId: null,
    playbookId: null,
    playbookVersion: null,
    links: [],
    source: "manual",
    redatedAt: null,
    createdAt: "2026-10-19T06:00:00.000Z",
    ...over,
  }
}

const transition = (over: Partial<TransitionDto>): TransitionDto => ({
  id: 1,
  taskId: 7,
  taskTitle: "Replace the patch panel",
  fromStatus: "in_progress",
  toStatus: "review",
  at: "2026-10-20T08:00:00.000Z",
  source: "route",
  ...over,
})

describe("buildSummary", () => {
  it("keeps every day of the range, empty ones included", () => {
    const out = buildSummary({
      entries: [],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.days).toHaveLength(7)
    expect(out.days[0]).toEqual({ day: "2026-10-19", count: 0, minutes: 0, entries: [] })
    expect(out.totals).toEqual({ entries: 0, minutes: 0, activeDays: 0 })
  })

  it("counts all six kinds even when a kind has no rows", () => {
    const out = buildSummary({
      entries: [entry({})],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.kinds).toHaveLength(6)
    expect(out.kinds.find((k) => k.kind === "review")?.count).toBe(0)
  })

  it("totals minutes across the whole range", () => {
    const out = buildSummary({
      entries: [entry({ minutes: 45 }), entry({ minutes: 90, workedOn: "2026-10-21" })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.totals.minutes).toBe(135)
    expect(out.totals.entries).toBe(2)
    expect(out.totals.activeDays).toBe(2)
  })

  it("lists the empty days inside the range as gaps", () => {
    const out = buildSummary({
      entries: [entry({ workedOn: "2026-10-19" }), entry({ workedOn: "2026-10-22" })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.gaps).toEqual(["2026-10-20", "2026-10-21", "2026-10-23", "2026-10-24", "2026-10-25"])
  })

  it("does not let a future day extend the streak", () => {
    const out = buildSummary({
      entries: [
        entry({ workedOn: "2026-10-24" }),
        entry({ workedOn: "2026-10-25" }),
        entry({ workedOn: "2026-10-26" }),
      ],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.streak.current).toBe(2)
  })

  it("keeps an unlinked bucket last in the task rollup", () => {
    const out = buildSummary({
      entries: [entry({ taskId: 3, taskTitle: "Audit", minutes: 60 }), entry({ taskId: null, minutes: 15 })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.tasks.map((t) => t.taskTitle)).toEqual(["Audit", null])
    expect(out.tasks[1].minutes).toBe(15)
    expect(out.unlinked).toBe(1)
  })

  it("counts a blocker as open only while it has no deliverable attached", () => {
    const out = buildSummary({
      entries: [entry({ kind: "blocker" }), entry({ kind: "blocker", deliverableId: 4 })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.openBlockers).toBe(1)
  })

  it("returns newest transition first", () => {
    const out = buildSummary({
      entries: [],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
      transitions: [
        transition({ at: "2026-10-20T08:00:00.000Z" }),
        transition({ id: 2, at: "2026-10-23T08:00:00.000Z" }),
      ],
    })
    expect(out.transitions.map((t) => t.id)).toEqual([2, 1])
  })

  it("carries the requested range back to the page", () => {
    const out = buildSummary({
      entries: [],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.range).toEqual({ from: "2026-10-19", to: "2026-10-25" })
  })
})
