import { describe, expect, it } from "vitest"
import {
  METRIC_KEYS,
  aggregateReport,
  type MetricKey,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import { isProseSection, SECTION_TITLE } from "@/lib/reports/templates"
import type { DeliverableDto, EntryDto } from "@/lib/worklog/entries"
import type { TransitionDto } from "@/lib/worklog/summary"
import {
  ROW_PREVIEW_LIMIT,
  ROW_SECTION_HINT,
  ROW_SECTION_METRIC,
  ROW_SECTIONS,
  hiddenRowCount,
  isRowSection,
  refHref,
  rowsCaption,
  rowsFor,
  visibleRows,
  worklogHref,
} from "@/lib/reports/row-sections"

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

/**
 * One aggregate with something in every section, built by the real producer rather than by a
 * hand-written object: the invariants below are only worth testing against what
 * `aggregateReport()` actually returns.
 */
const busy = aggregateReport(
  source({
    entries: [
      entry({ id: 1, taskId: 7, taskTitle: "Rewrite the ingest", minutes: 90 }),
      entry({
        id: 2,
        workedOn: "2026-10-28",
        kind: "blocker",
        taskId: 8,
        taskTitle: "Chase the vendor ticket",
        title: "Waiting on the vendor",
        body: "No response to ticket #4482",
        minutes: null,
      }),
    ],
    // Task 5 completed twice: the section counts changes, the metric counts tasks.
    transitions: [
      transition({ id: 21, taskId: 5, fromStatus: "review", toStatus: "done" }),
      transition({
        id: 22,
        taskId: 5,
        fromStatus: "done",
        toStatus: "completed",
        at: "2026-10-28T10:00:00.000Z",
      }),
      transition({
        id: 23,
        taskId: 6,
        taskTitle: "Close the finding",
        fromStatus: "review",
        toStatus: "closed",
        at: "2026-10-29T08:00:00.000Z",
      }),
    ],
    tasks: [
      {
        id: 5,
        title: "Ship the export",
        status: "done",
        priority: "high",
        dueDate: "2026-10-30",
        storyPoints: 3,
        sprintTitle: "Sprint 12",
      },
      {
        id: 6,
        title: "Close the finding",
        status: "closed",
        priority: "urgent",
        dueDate: "2026-10-29",
        storyPoints: 0,
        sprintTitle: null,
      },
      {
        id: 7,
        title: "Rewrite the ingest",
        status: "in_progress",
        priority: "medium",
        dueDate: "2026-11-05",
        storyPoints: 5,
        sprintTitle: "Sprint 13",
      },
      {
        id: 8,
        title: "Chase the vendor ticket",
        status: "blocked",
        priority: "high",
        dueDate: "2026-10-10",
        storyPoints: 0,
        sprintTitle: null,
      },
      {
        id: 9,
        title: "Draft the runbook",
        status: "todo",
        priority: "low",
        dueDate: "2026-10-20",
        storyPoints: 0,
        sprintTitle: null,
      },
    ],
    deliverables: [
      deliverable({ id: 11, name: "Ingest runbook", status: "delivered", link: "https://example.test/runbook" }),
      deliverable({ id: 12, name: "Findings list", status: "in_review", producedOn: "2026-10-30" }),
      // Produced in an earlier period but still in review: it belongs to the current-state number,
      // not to the rows this section shows.
      deliverable({ id: 13, name: "Old scope", status: "in_review", producedOn: "2026-09-01" }),
    ],
    planItems: [
      {
        id: 31,
        title: "Rewire the dashboard",
        status: "todo",
        dueDate: "2026-11-10",
        startDate: "2026-11-04",
        planTitle: "Q4 plan",
      },
      {
        id: 32,
        title: "Retire the legacy exporter",
        status: "done",
        dueDate: "2026-11-20",
        startDate: null,
        planTitle: "Q4 plan",
      },
    ],
  }),
)

const quiet = aggregateReport(source())

const crowded = aggregateReport(
  source({
    transitions: Array.from({ length: 8 }, (_, index) =>
      transition({ id: 100 + index, taskId: 40 + index, at: `2026-10-27T0${index}:00:00.000Z` }),
    ),
  }),
)

describe("the six computed sections", () => {
  it("names the six sections the spec lists, in the spec's order", () => {
    expect([...ROW_SECTIONS]).toEqual([
      "completed",
      "deliverables",
      "inProgress",
      "blocked",
      "overdue",
      "nextPeriod",
    ])
    expect(isRowSection("completed")).toBe(true)
    expect(isRowSection("summary")).toBe(false)
    expect(isRowSection("metrics")).toBe(false)
    expect(isRowSection(null)).toBe(false)
  })

  it("keeps every one of them editable, so a card can carry the author's commentary", () => {
    for (const section of ROW_SECTIONS) {
      expect(isProseSection(section)).toBe(true)
      expect(SECTION_TITLE[section]).toBeTruthy()
      expect(ROW_SECTION_HINT[section]).toBeTruthy()
    }
  })

  it("pairs each section with the metric the KPI strip shows for it", () => {
    expect(Object.keys(ROW_SECTION_METRIC).sort()).toEqual([...ROW_SECTIONS].sort())
    for (const metric of Object.values(ROW_SECTION_METRIC)) {
      expect(METRIC_KEYS).toContain(metric as MetricKey)
    }
  })
})

describe("the rows behind the number", () => {
  it("gives every row a ref, a title and a date the card can print", () => {
    for (const section of ROW_SECTIONS) {
      const rows = rowsFor(section, busy)
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(row.ref).toMatch(/^(event|task|deliverable|plan):\d+$/u)
        expect(row.title.trim()).not.toBe("")
        expect(row.date === null || row.date.match(/^\d{4}-\d{2}-\d{2}$/u)).toBeTruthy()
      }
    }
  })

  it("shows the same number of rows as the card claims for the five single-subject sections", () => {
    for (const section of ROW_SECTIONS) {
      if (section === "completed") continue
      const metric = busy.metrics[ROW_SECTION_METRIC[section]]
      expect(rowsFor(section, busy)).toHaveLength(metric.value)
      expect([...new Set(metric.refs)].sort()).toEqual(
        rowsFor(section, busy)
          .map((row) => row.ref)
          .sort(),
      )
    }
  })

  it("counts status changes in Actions completed, which is why its caption says so", () => {
    const rows = rowsFor("completed", busy)
    expect(rows).toHaveLength(3)
    expect(busy.metrics.completedTasks.value).toBe(2)
    for (const row of rows) expect(row.ref.startsWith("event:")).toBe(true)
  })

  it("brings the blocker's own words into the blocked row", () => {
    expect(rowsFor("blocked", busy)[0].detail).toBe("Reason: No response to ticket #4482")
  })

  it("lists the ids behind the number, prefixed and without duplicates", () => {
    expect(rowsFor("deliverables", busy).map((row) => row.ref)).toEqual([
      "deliverable:11",
      "deliverable:12",
    ])
    const refs = rowsFor("completed", busy).map((row) => row.ref)
    expect(new Set(refs).size).toBe(refs.length)
  })
})

describe("the caption on the card", () => {
  it("spells the completed section as changes over tasks", () => {
    expect(rowsCaption("completed", busy)).toBe("3 status changes to done · 2 tasks")
  })

  it("counts what the recipient asks about in each of the other five", () => {
    expect(rowsCaption("deliverables", busy)).toBe(
      "2 deliverables produced · 1 delivered · 2 awaiting review",
    )
    expect(rowsCaption("inProgress", busy)).toBe("1 open task right now · 1 with a sprint")
    expect(rowsCaption("blocked", busy)).toBe("1 task blocked right now")
    expect(rowsCaption("overdue", busy)).toBe("2 tasks due before 2026-10-26")
    expect(rowsCaption("nextPeriod", busy)).toBe("1 plan item due after 2026-11-01")
  })

  it("says so when a section is empty, instead of printing a bare zero", () => {
    for (const section of ROW_SECTIONS) {
      const caption = rowsCaption(section, quiet)
      expect(caption.length).toBeGreaterThan(0)
      expect(caption).not.toMatch(/^0/u)
      expect(caption.at(-1)).toBe(".")
    }
  })

  it("names the period edge the two forward-looking sections are measured against", () => {
    expect(rowsCaption("overdue", busy)).toContain(period.start)
    expect(rowsCaption("nextPeriod", busy)).toContain(period.end)
  })
})

describe("collapse and expand", () => {
  it("collapses a crowded section to six rows and says how many are hidden", () => {
    expect(ROW_PREVIEW_LIMIT).toBe(6)
    expect(rowsFor("completed", crowded)).toHaveLength(8)
    expect(visibleRows("completed", crowded, false)).toHaveLength(6)
    expect(hiddenRowCount("completed", crowded)).toBe(2)
  })

  it("shows every row once the section is open, and hides nothing that is not there", () => {
    expect(visibleRows("completed", crowded, true)).toHaveLength(8)
    expect(hiddenRowCount("completed", busy)).toBe(0)
    expect(visibleRows("completed", quiet, false)).toEqual([])
  })

  it("keeps the collapsed rows a prefix of the expanded ones, so a row never jumps", () => {
    const all = visibleRows("completed", crowded, true)
    const shown = visibleRows("completed", crowded, false)
    expect(all.slice(0, shown.length)).toEqual(shown)
  })
})

describe("the work log link", () => {
  it("opens the same period the report is about, in the grammar the work log parses", () => {
    expect(worklogHref(period)).toBe(
      "/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01",
    )
  })

  it("filters the two sections the work log can actually filter", () => {
    expect(worklogHref(period, "blocked")).toBe(
      "/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01&kind=blocker",
    )
    expect(worklogHref(period, "deliverables")).toBe(
      "/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01&dlv=1",
    )
    expect(worklogHref(period, "completed")).toBe(worklogHref(period))
  })

  it("sends Next period nowhere, because the planner page does not exist yet", () => {
    expect(worklogHref(period, "nextPeriod")).toBeNull()
  })

  it("links a task row to its own log and refuses a row the work log cannot show", () => {
    expect(refHref("task:7", period)).toBe(
      "/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01&task=7",
    )
    expect(refHref("event:21", period)).toBeNull()
    expect(refHref("deliverable:11", period)).toBeNull()
    expect(refHref("plan:31", period)).toBeNull()
    expect(refHref("nonsense", period)).toBeNull()
  })
})
