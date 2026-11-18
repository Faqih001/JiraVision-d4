import { describe, expect, it } from "vitest"
import { aggregateReport, type ReportSource } from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import type { EntryDto } from "@/lib/worklog/entries"
import {
  MODULE_SECTIONS,
  hiddenModuleRowCount,
  isModuleSection,
  moduleCaption,
  moduleRowsFor,
  visibleModuleRows,
} from "@/lib/reports/module-sections"
import { ROW_PREVIEW_LIMIT } from "@/lib/reports/row-sections"

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

const source = (over: Partial<ReportSource> = {}): ReportSource => ({
  period,
  todayIso: TODAY,
  timezone: "Africa/Nairobi",
  entries: [],
  deliverables: [],
  transitions: [],
  tasks: [],
  planItems: [],
  opsEvents: [],
  registerItems: [],
  tickets: [],
  ticketEvents: [],
  goals: [],
  goalCheckins: [],
  meetings: [],
  retroNotes: [],
  retroActions: [],
  careerSignoffs: [],
  careerRequests: [],
  growthReviews: [],
  playbooks: [],
  ...over,
})

/** One aggregate with something in every module section, built by the real producer. */
const busy = aggregateReport(
  source({
    entries: [entry({ id: 2, title: "Ran the deploy runbook", playbookId: 221, playbookVersion: 2 })],
    opsEvents: [
      { id: 101, packKey: "developer", entityKey: "deploy-api", status: "ok", occurredAt: "2026-10-27T09:00:00.000Z" },
    ],
    registerItems: [
      { id: 111, packKey: "developer", kind: "runbook", title: "Ingest runbook", status: "active", lastVerifiedAt: "2026-10-28" },
    ],
    tickets: [
      { id: 121, subject: "Vendor outage", status: "open", priority: "high", resolvedAt: null },
      { id: 122, subject: "Printer queue", status: "resolved", priority: "low", resolvedAt: "2026-10-28T08:00:00.000Z" },
    ],
    ticketEvents: [
      { id: 131, ticketId: 121, ticketSubject: "Vendor outage", type: "comment", fromValue: null, toValue: null, at: "2026-10-27T10:00:00.000Z" },
    ],
    goals: [
      { id: 141, title: "Ship v2", status: "active", current: 3, target: 10, metricType: "count", dueDate: "2026-11-30" },
    ],
    goalCheckins: [
      { id: 151, goalId: 141, goalTitle: "Ship v2", value: 3, note: null, at: "2026-10-28T09:00:00.000Z" },
    ],
    meetings: [
      { id: 161, title: "Sprint review", eventType: "meeting", startTime: "2026-10-28T10:00:00.000Z", organized: true },
    ],
    retroNotes: [
      { id: 171, retroTitle: "Sprint 12 retro", category: "went-well", body: "Shipped early", at: "2026-10-29T09:00:00.000Z" },
    ],
    retroActions: [
      { id: 181, retroTitle: "Sprint 12 retro", body: "Rotate on-call", done: false, dueDate: "2026-11-05" },
    ],
    careerSignoffs: [{ id: 191, itemKey: "code-review", status: "signed", at: "2026-10-27T11:00:00.000Z" }],
    careerRequests: [
      { id: 201, discipline: "developer", fromLevel: 2, toLevel: 3, status: "pending", at: "2026-10-28T12:00:00.000Z" },
    ],
    growthReviews: [{ id: 211, kind: "quarterly", at: "2026-10-29T13:00:00.000Z" }],
    playbooks: [{ id: 221, title: "Deploy runbook", status: "published", version: 2, at: "2026-10-28T14:00:00.000Z" }],
  }),
)

const quiet = aggregateReport(source())

const crowded = aggregateReport(
  source({
    opsEvents: Array.from({ length: 8 }, (_, index) => ({
      id: 300 + index,
      packKey: "developer",
      entityKey: `check-${index}`,
      status: "ok",
      occurredAt: `2026-10-27T0${index}:00:00.000Z`,
    })),
  }),
)

describe("the eight module sections", () => {
  it("names the eight activity modules beyond the six computed sections, in reading order", () => {
    expect([...MODULE_SECTIONS]).toEqual([
      "operations",
      "registers",
      "serviceDesk",
      "goals",
      "meetings",
      "retros",
      "career",
      "playbooks",
    ])
    expect(isModuleSection("operations")).toBe(true)
    expect(isModuleSection("completed")).toBe(false)
    expect(isModuleSection(null)).toBe(false)
  })

  it("hands each card the aggregate's own array, so the card cannot disagree with the producer", () => {
    expect(moduleRowsFor("operations", busy)).toBe(busy.opsRows)
    expect(moduleRowsFor("registers", busy)).toBe(busy.registerRows)
    expect(moduleRowsFor("serviceDesk", busy)).toBe(busy.ticketRows)
    expect(moduleRowsFor("goals", busy)).toBe(busy.goalRows)
    expect(moduleRowsFor("meetings", busy)).toBe(busy.meetingRows)
    expect(moduleRowsFor("retros", busy)).toBe(busy.retroRows)
    expect(moduleRowsFor("career", busy)).toBe(busy.careerRows)
    expect(moduleRowsFor("playbooks", busy)).toBe(busy.playbookRows)
  })

  it("gives every row a ref, a title and a date the card can print", () => {
    for (const section of MODULE_SECTIONS) {
      const rows = moduleRowsFor(section, busy)
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(row.ref).toMatch(
          /^(ops|register|ticket|goal|meeting|retro-note|retro-action|signoff|request|review|playbook):\d+$/u,
        )
        expect(row.title.trim()).not.toBe("")
        expect(row.date === null || row.date.match(/^\d{4}-\d{2}-\d{2}$/u)).toBeTruthy()
      }
    }
  })
})

describe("the caption on the module card", () => {
  it("counts what the recipient asks about in each module", () => {
    expect(moduleCaption("operations", busy)).toBe("1 ops event in this period")
    expect(moduleCaption("registers", busy)).toBe("1 item held · 1 verified this period")
    expect(moduleCaption("serviceDesk", busy)).toBe("1 open · 1 resolved · 1 action this period")
    expect(moduleCaption("goals", busy)).toBe("1 goal held · 1 check-in · 0 achieved")
    expect(moduleCaption("meetings", busy)).toBe("1 meeting in this period")
    expect(moduleCaption("retros", busy)).toBe("1 note this period · 1 open action")
    expect(moduleCaption("career", busy)).toBe("1 sign-off · 1 request · 1 review")
    expect(moduleCaption("playbooks", busy)).toBe("1 playbook published this period · 1 run logged")
  })

  it("says so when a module is empty, instead of printing a bare zero", () => {
    for (const section of MODULE_SECTIONS) {
      const caption = moduleCaption(section, quiet)
      expect(caption.length).toBeGreaterThan(0)
      expect(caption).not.toMatch(/^0/u)
      expect(caption.at(-1)).toBe(".")
    }
  })
})

describe("collapse and expand", () => {
  it("collapses a crowded module to the same six rows the computed sections use", () => {
    expect(ROW_PREVIEW_LIMIT).toBe(6)
    expect(moduleRowsFor("operations", crowded)).toHaveLength(8)
    expect(visibleModuleRows("operations", crowded, false)).toHaveLength(6)
    expect(hiddenModuleRowCount("operations", crowded)).toBe(2)
  })

  it("shows every row once the card is open, and hides nothing that is not there", () => {
    expect(visibleModuleRows("operations", crowded, true)).toHaveLength(8)
    expect(hiddenModuleRowCount("operations", busy)).toBe(0)
    expect(visibleModuleRows("operations", quiet, false)).toEqual([])
  })

  it("keeps the collapsed rows a prefix of the expanded ones, so a row never jumps", () => {
    const all = visibleModuleRows("operations", crowded, true)
    const shown = visibleModuleRows("operations", crowded, false)
    expect(all.slice(0, shown.length)).toEqual(shown)
  })
})