import { describe, expect, it } from "vitest"
import {
  METRIC_KEYS,
  SUM_METRIC_KEYS,
  aggregateReport,
  isSumMetric,
  statusBucket,
  type ReportAggregate,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import { KIND_LABEL, type DeliverableDto, type EntryDto } from "@/lib/worklog/entries"
import type { TransitionDto } from "@/lib/worklog/summary"

const period = resolvePeriod("weekly", "2026-10-28") // Mon 2026-10-26 to Sun 2026-11-01
const TODAY = "2026-11-03"

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

const deliverable = (over: Partial<DeliverableDto> = {}): DeliverableDto => ({
  id: 11,
  name: "Runbook",
  type: "document",
  status: "draft",
  producedOn: "2026-10-27",
  link: null,
  evidence: null,
  taskId: null,
  taskTitle: null,
  discipline: "developer",
  entryCount: 0,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const transition = (over: Partial<TransitionDto> = {}): TransitionDto => ({
  id: 21,
  taskId: 5,
  taskTitle: "Ship the export",
  fromStatus: "review",
  toStatus: "done",
  at: "2026-10-27T10:00:00.000Z",
  source: "route",
  ...over,
})

const task = (over: Partial<ReportSource["tasks"][number]> = {}) => ({
  id: 5,
  title: "Ship the export",
  status: "done",
  priority: "high",
  dueDate: "2026-10-30",
  storyPoints: 3,
  sprintTitle: "Sprint 12",
  ...over,
})

const planItem = (over: Partial<ReportSource["planItems"][number]> = {}) => ({
  id: 31,
  title: "Rewire the dashboard",
  status: "todo",
  dueDate: "2026-11-10",
  startDate: "2026-11-04",
  planTitle: "Q4 plan",
  ...over,
})

const source = (over: Partial<ReportSource> = {}): ReportSource => ({
  period,
  todayIso: TODAY,
  timezone: "Africa/Nairobi",
  entries: [],
  deliverables: [],
  transitions: [],
  tasks: [],
  planItems: [],
  ...over,
})

const metricKeys = METRIC_KEYS

describe("task status bucketing", () => {
  it("maps the app's loose status strings onto four buckets", () => {
    expect(statusBucket("Done")).toBe("completed")
    expect(statusBucket(" completed ")).toBe("completed")
    expect(statusBucket("closed")).toBe("completed")
    expect(statusBucket("in_progress")).toBe("in_progress")
    expect(statusBucket("review")).toBe("in_progress")
    expect(statusBucket("blocked")).toBe("blocked")
    expect(statusBucket("waiting-on-vendor")).toBe("other")
    expect(statusBucket("")).toBe("other")
  })
})

describe("the no-number-without-rows invariant", () => {
  it("makes every count metric equal its own ref list", () => {
    const aggregate = aggregateReport(
      source({
        entries: [entry(), entry({ id: 2, minutes: 30 }), entry({ id: 3, minutes: null })],
        deliverables: [deliverable({ status: "delivered" })],
        transitions: [transition(), transition({ id: 22, taskId: 6 })],
        tasks: [task(), task({ id: 6, status: "in_progress" })],
        planItems: [planItem()],
      }),
    )
    for (const key of metricKeys) {
      const metric = aggregate.metrics[key]
      expect(metric.refs).not.toBeNull()
      if (isSumMetric(key)) {
        // A sum may legitimately be zero with rows behind it (three entries, none with minutes).
        if (metric.value > 0) expect(metric.refs.length).toBeGreaterThan(0)
        continue
      }
      expect(metric.value).toBe(metric.refs.length)
    }
  })

  it("prefixes every ref with the table it points at", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry()], transitions: [transition()], deliverables: [deliverable()], planItems: [planItem()] }),
    )
    const refs = [
      ...Object.values(aggregate.metrics).flatMap((m) => m.refs),
      ...aggregate.completed.map((r) => r.ref),
      ...aggregate.inProgress.map((r) => r.ref),
      ...aggregate.nextPeriod.map((r) => r.ref),
      ...aggregate.series.flatMap((b) => [...b.entries.refs, ...b.minutes.refs]),
    ]
    expect(refs.length).toBeGreaterThan(0)
    for (const value of refs) expect(value).toMatch(/^(entry|task|deliverable|event|plan|day):\S+$/u)
  })
})

describe("entries and days", () => {
  it("counts entries and sums minutes across the period", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ minutes: 90 }), entry({ id: 2, minutes: 45 }), entry({ id: 3, minutes: null })] }),
    )
    expect(aggregate.metrics.entries.value).toBe(3)
    expect(aggregate.metrics.minutes.value).toBe(135)
  })

  it("counts the days that have rows and names them", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ workedOn: "2026-10-26" }), entry({ id: 2, workedOn: "2026-10-28" })] }),
    )
    expect(aggregate.metrics.activeDays.value).toBe(2)
    expect(aggregate.metrics.activeDays.refs.sort()).toEqual(["day:2026-10-26", "day:2026-10-28"])
  })

  it("never calls a future day quiet", () => {
    // The period ends 2026-11-01 and today is 2026-10-29, so only Oct 26-29 have had a chance.
    const aggregate = aggregateReport(source({ todayIso: "2026-10-29", entries: [entry({ workedOn: "2026-10-26" })] }))
    expect(aggregate.metrics.quietDays.refs).toEqual([
      "day:2026-10-27",
      "day:2026-10-28",
      "day:2026-10-29",
    ])
  })

  it("drops an entry dated outside the period rather than quietly widening it", () => {
    // The route already filters by date. If a stray row still arrives, the aggregate must not
    // re-widen a period the member set by hand just because one entry sits outside it.
    const aggregate = aggregateReport(source({ entries: [entry({ workedOn: "2026-10-01" })] }))
    expect(aggregate.metrics.entries.value).toBe(0)
    expect(aggregate.series.reduce((n, b) => n + b.entries.value, 0)).toBe(0)
  })
})

describe("completion comes from the event log", () => {
  it("lists a completed task by the day its status changed", () => {
    const aggregate = aggregateReport(
      source({ transitions: [transition({ at: "2026-10-27T10:00:00.000Z" })], tasks: [task()] }),
    )
    expect(aggregate.metrics.completedTasks.value).toBe(1)
    expect(aggregate.completed[0]).toMatchObject({
      ref: "event:21",
      title: "Ship the export",
      date: "2026-10-27",
    })
  })

  it("ignores a done task with no recorded transition instead of guessing a date", () => {
    const aggregate = aggregateReport(source({ tasks: [task({ status: "done" })] }))
    expect(aggregate.metrics.completedTasks.value).toBe(0)
    expect(aggregate.completed).toEqual([])
  })

  it("ignores a transition that is not a completion", () => {
    const aggregate = aggregateReport(source({ transitions: [transition({ toStatus: "review" })] }))
    expect(aggregate.metrics.completedTasks.value).toBe(0)
    expect(aggregate.metrics.taskEvents.value).toBe(1)
  })

  it("counts a task completed twice in one period once, and cites both events", () => {
    const aggregate = aggregateReport(
      source({ transitions: [transition({ id: 21 }), transition({ id: 22, toStatus: "completed" })] }),
    )
    expect(aggregate.metrics.completedTasks.value).toBe(1)
    expect(aggregate.completed.map((r) => r.ref)).toEqual(["event:21", "event:22"])
  })

  it("sums story points only for what the log says finished in this period", () => {
    const aggregate = aggregateReport(
      source({
        transitions: [transition({ taskId: 5 })],
        tasks: [task({ id: 5, storyPoints: 5 }), task({ id: 6, status: "done", storyPoints: 8 })],
      }),
    )
    expect(aggregate.metrics.storyPointsCompleted.value).toBe(5)
    expect(aggregate.metrics.storyPointsCompleted.refs).toEqual(["task:5"])
  })

  it("resolves the event's day in the member's timezone, not UTC", () => {
    // 00:20 in Nairobi is 21:20 of the previous day in UTC; a report that showed 2026-10-26
    // would move a Tuesday's merge into Monday's week.
    const aggregate = aggregateReport(
      source({ transitions: [transition({ at: "2026-10-26T21:20:00.000Z" })], timezone: "Africa/Nairobi" }),
    )
    expect(aggregate.completed[0]!.date).toBe("2026-10-27")
  })
})

describe("standing work", () => {
  it("lists in-progress tasks by current status without claiming a date", () => {
    const aggregate = aggregateReport(
      source({ tasks: [task({ id: 7, status: "in_progress", dueDate: "2026-11-04", sprintTitle: "Sprint 13" })] }),
    )
    expect(aggregate.metrics.inProgressTasks.value).toBe(1)
    expect(aggregate.inProgress[0]).toMatchObject({ ref: "task:7", date: "2026-11-04" })
    expect(aggregate.inProgress[0]!.detail).toContain("Sprint 13")
  })

  it("quotes the blocker entry as the reason, and says so when there is none", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [task({ id: 8, status: "blocked" }), task({ id: 9, status: "blocked" })],
        entries: [entry({ id: 4, kind: "blocker", taskId: 8, body: "Vendor has not replied", title: "Waiting" })],
      }),
    )
    expect(aggregate.metrics.blockedTasks.value).toBe(2)
    expect(aggregate.blocked.find((r) => r.ref === "task:8")!.detail).toContain("Vendor has not replied")
    expect(aggregate.blocked.find((r) => r.ref === "task:9")!.detail).toMatch(/no reason recorded/iu)
  })

  it("carries an overdue item forward only when its due date precedes the period", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [
          task({ id: 10, status: "in_progress", dueDate: "2026-10-20" }),
          task({ id: 11, status: "in_progress", dueDate: "2026-10-29" }),
          task({ id: 12, status: "done", dueDate: "2026-10-20" }),
          task({ id: 13, status: "in_progress", dueDate: null }),
        ],
      }),
    )
    expect(aggregate.metrics.overdueCarried.value).toBe(1)
    expect(aggregate.overdue[0]!.ref).toBe("task:10")
  })
})

describe("deliverables", () => {
  it("counts what was produced in the period by status", () => {
    const aggregate = aggregateReport(
      source({
        deliverables: [
          deliverable({ id: 20, status: "delivered" }),
          deliverable({ id: 21, status: "approved" }),
          deliverable({ id: 22, status: "delivered", producedOn: "2026-10-05" }),
          deliverable({ id: 23, status: "delivered", producedOn: null }),
        ],
      }),
    )
    expect(aggregate.metrics.deliverablesProduced.value).toBe(2)
    expect(aggregate.metrics.deliverablesDelivered.value).toBe(1)
    expect(aggregate.deliverableRows.map((r) => r.ref)).toEqual(["deliverable:20", "deliverable:21"])
  })

  it("counts what is sitting in review now, whenever it was produced", () => {
    const aggregate = aggregateReport(
      source({ deliverables: [deliverable({ id: 24, status: "in_review", producedOn: "2026-09-01" })] }),
    )
    expect(aggregate.metrics.reviewRounds.value).toBe(1)
    expect(aggregate.metrics.reviewRounds.refs).toEqual(["deliverable:24"])
  })
})

describe("the forward view", () => {
  it("lists plan items due after the period and nothing that is already done", () => {
    const aggregate = aggregateReport(
      source({
        planItems: [
          planItem({ id: 31, dueDate: "2026-11-10" }),
          planItem({ id: 32, dueDate: "2026-10-29" }),
          planItem({ id: 33, dueDate: "2026-12-01", status: "done" }),
          planItem({ id: 34, dueDate: null }),
        ],
      }),
    )
    expect(aggregate.metrics.nextPeriodItems.value).toBe(1)
    expect(aggregate.nextPeriod[0]).toMatchObject({ ref: "plan:31", date: "2026-11-10" })
    expect(aggregate.nextPeriod[0]!.detail).toContain("Q4 plan")
  })
})

describe("splits", () => {
  it("groups minutes by discipline and files an unset discipline rather than dropping it", () => {
    const aggregate = aggregateReport(
      source({
        entries: [
          entry({ id: 1, discipline: "developer", minutes: 120 }),
          entry({ id: 2, discipline: "auditor", minutes: 30 }),
          entry({ id: 3, discipline: null, minutes: 15 }),
        ],
      }),
    )
    const keys = aggregate.byDiscipline.map((b) => b.key)
    expect(keys).toContain("developer")
    expect(keys).toContain("unassigned")
    expect(aggregate.byDiscipline.find((b) => b.key === "developer")!.minutes.value).toBe(120)
    expect(aggregate.byDiscipline.find((b) => b.key === "unassigned")!.minutes.refs).toEqual(["entry:3"])
  })

  it("lists every logged kind with its label, ordered by the vocabulary not the counts", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ id: 1, kind: "time" }), entry({ id: 2, kind: "action" })] }),
    )
    expect(aggregate.byKind.map((b) => b.key)).toEqual(["action", "time"])
    // Asserted against the shipped vocabulary, not a literal: the label belongs to entries.ts.
    expect(aggregate.byKind[0]!.label).toBe(KIND_LABEL.action)
  })

  it("splits tasks by bucket and by priority", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [
          task({ id: 1, status: "done", priority: "high" }),
          task({ id: 2, status: "in_progress", priority: "high" }),
          task({ id: 3, status: "blocked", priority: "low" }),
          task({ id: 4, status: "waiting-on-vendor", priority: "medium" }),
        ],
      }),
    )
    expect(aggregate.byTaskStatus.map((b) => b.key)).toEqual(["completed", "in_progress", "blocked", "other"])
    expect(aggregate.byTaskStatus[0]!.count.value).toBe(1)
    expect(aggregate.byPriority.map((b) => b.count.value).reduce((a, b) => a + b, 0)).toBe(4)
  })
})

describe("series", () => {
  it("sums the daily buckets of a weekly period", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ workedOn: "2026-10-26", minutes: 50 }), entry({ id: 2, workedOn: "2026-10-26", minutes: 25 })] }),
    )
    expect(aggregate.series).toHaveLength(7)
    expect(aggregate.series[0]!.entries.value).toBe(2)
    expect(aggregate.series[0]!.minutes.value).toBe(75)
  })

  it("gives a yearly period twelve buckets, not three hundred and sixty-five rows", () => {
    const yearly = resolvePeriod("yearly", "2026-06-01")
    const aggregate = aggregateReport(
      source({ period: yearly, entries: [entry({ workedOn: "2026-03-14", minutes: 60 })] }),
    )
    expect(aggregate.series).toHaveLength(12)
    expect(aggregate.period.monthSeries).toBe(true)
    expect(aggregate.series[2]!.minutes.value).toBe(60)
    expect(aggregate.series[2]!.minutes.refs).toEqual(["entry:1"])
  })
})

describe("a period with no activity", () => {
  // `todayIso` sits before the period so no day has elapsed: a finished, empty week
  // legitimately reports seven quiet days, and that is a number with rows behind it, not a null.
  const empty = (): ReportAggregate => aggregateReport(source({ todayIso: "2026-10-25" }))

  it("yields zeros, not nulls, for every metric", () => {
    const aggregate = empty()
    for (const key of metricKeys) {
      expect(aggregate.metrics[key]).toBeDefined()
      expect(aggregate.metrics[key].value).toBe(0)
      expect(Array.isArray(aggregate.metrics[key].refs)).toBe(true)
    }
  })

  it("yields empty arrays for every section", () => {
    const aggregate = empty()
    for (const rows of [aggregate.completed, aggregate.inProgress, aggregate.blocked, aggregate.deliverableRows, aggregate.overdue, aggregate.nextPeriod]) {
      expect(rows).toEqual([])
    }
    expect(aggregate.byDiscipline).toEqual([])
    expect(aggregate.byKind).toEqual([])
  })

  it("still labels the period and states how long it was", () => {
    const aggregate = empty()
    expect(aggregate.period.label).toBe(period.label)
    expect(aggregate.period.dayCount).toBe(7)
  })

  it("marks itself empty so the page can say so instead of showing a blank grid", () => {
    expect(aggregateReport(source()).isEmpty).toBe(true)
    expect(aggregateReport(source({ entries: [entry()] })).isEmpty).toBe(false)
  })
})

describe("the metric registry", () => {
  it("has no duplicate key and declares its sums", () => {
    expect(new Set(metricKeys).size).toBe(metricKeys.length)
    expect(SUM_METRIC_KEYS).toEqual(["minutes", "storyPointsCompleted"])
    expect(metricKeys).toContain("deliverablesProduced")
  })
})
