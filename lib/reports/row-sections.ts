// The six computed sections of a period report: which rows belong to each one, the one line the
// card prints as its number, how many rows are on screen, and the ids behind the count.
//
// Pure and DB-free, like the rest of lib/reports/. Task 14's card reads everything from here so a
// section cannot show a total that disagrees with the list under it — the failure §6 names.

import { type MetricKey, type ReportAggregate, type ReportRow } from "@/lib/reports/aggregate"
import type { Period } from "@/lib/reports/period"
import type { ReportSectionKey } from "@/lib/reports/templates"

export const ROW_SECTIONS = [
  "completed",
  "deliverables",
  "inProgress",
  "blocked",
  "overdue",
  "nextPeriod",
] as const satisfies readonly ReportSectionKey[]

export type RowSectionKey = (typeof ROW_SECTIONS)[number]

export function isRowSection(value: unknown): value is RowSectionKey {
  return typeof value === "string" && (ROW_SECTIONS as readonly string[]).includes(value)
}

/** The KPI-strip metric each section is the row list for. */
export const ROW_SECTION_METRIC = {
  completed: "completedTasks",
  deliverables: "deliverablesProduced",
  inProgress: "inProgressTasks",
  blocked: "blockedTasks",
  overdue: "overdueCarried",
  nextPeriod: "nextPeriodItems",
} as const satisfies Record<RowSectionKey, MetricKey>

/** The placeholder in each card's commentary field — the section explained in the author's terms. */
export const ROW_SECTION_HINT: Record<RowSectionKey, string> = {
  completed: "Say what the period was for. The rows above are the changes the board recorded.",
  deliverables: "Name where each one lives now, and what still needs a decision.",
  inProgress: "Say what each open task is waiting on, so nobody has to ask.",
  blocked: "Say what you need from someone else to get moving again.",
  overdue: "Say why these are still open, not just that they are late.",
  nextPeriod: "Say what you intend to do next, and what you would rather not carry again.",
}

/**
 * What a section reads when it has no rows. A bare `0` invites the wrong question; these lines
 * say which way the number is empty.
 */
const EMPTY_CAPTION: Record<RowSectionKey, string> = {
  completed: "No task reached a done status in this period.",
  deliverables: "No deliverable was produced in this period.",
  inProgress: "Nothing is open on the board right now.",
  blocked: "Nothing is blocked — the section a recipient reads first is the quiet one.",
  overdue: "Nothing was past due when this period opened.",
  nextPeriod: "No plan item is scheduled after this period.",
}

/** The most the card shows before the recipient has to ask for the rest. */
export const ROW_PREVIEW_LIMIT = 6

function plural(value: number, noun: string): string {
  return `${value} ${value === 1 ? noun : `${noun}s`}`
}

/** No `default`: a new row section fails to compile until it is given rows here. */
export function rowsFor(section: RowSectionKey, aggregate: ReportAggregate): ReportRow[] {
  switch (section) {
    case "completed":
      return aggregate.completed
    case "deliverables":
      return aggregate.deliverableRows
    case "inProgress":
      return aggregate.inProgress
    case "blocked":
      return aggregate.blocked
    case "overdue":
      return aggregate.overdue
    case "nextPeriod":
      return aggregate.nextPeriod
  }
}

export function rowsCaption(section: RowSectionKey, aggregate: ReportAggregate): string {
  const rows = rowsFor(section, aggregate)
  if (rows.length === 0) return EMPTY_CAPTION[section]

  const { metrics, period } = aggregate
  switch (section) {
    // The only section whose rows are not the thing its metric counts: the rows are the changes,
    // the metric is the distinct tasks, because a reopened task was completed twice.
    case "completed":
      return `${plural(rows.length, "status change")} to done · ${plural(metrics.completedTasks.value, "task")}`
    case "deliverables":
      return `${plural(rows.length, "deliverable")} produced · ${metrics.deliverablesDelivered.value} delivered · ${metrics.reviewRounds.value} awaiting review`
    case "inProgress":
      return `${plural(rows.length, "open task")} right now · ${metrics.sprintItems.value} with a sprint`
    case "blocked":
      return `${plural(rows.length, "task")} blocked right now`
    case "overdue":
      return `${plural(rows.length, "task")} due before ${period.start}`
    case "nextPeriod":
      return `${plural(rows.length, "plan item")} due after ${period.end}`
  }
}

export function visibleRows(
  section: RowSectionKey,
  aggregate: ReportAggregate,
  expanded: boolean,
): ReportRow[] {
  const rows = rowsFor(section, aggregate)
  return expanded ? rows : rows.slice(0, ROW_PREVIEW_LIMIT)
}

export function hiddenRowCount(section: RowSectionKey, aggregate: ReportAggregate): number {
  return Math.max(0, rowsFor(section, aggregate).length - ROW_PREVIEW_LIMIT)
}

export function refsFor(section: RowSectionKey, aggregate: ReportAggregate): string[] {
  return [...new Set(rowsFor(section, aggregate).map((row) => row.ref))]
}

function periodHref(period: Period): string {
  return `/dashboard/worklog?v=list&p=custom&from=${period.start}&to=${period.end}`
}

/**
 * The work log's own URL grammar (`lib/worklog/view-state.ts:82-130`), so the link opens the same
 * rows the report counted. `nextPeriod` has no target: plan items have no page until the planner
 * phase ships, and a link to a route that does not exist is worse than no link.
 */
export function worklogHref(period: Period, section?: RowSectionKey): string | null {
  if (section === "nextPeriod") return null
  const base = periodHref(period)
  if (section === "blocked") return `${base}&kind=blocker`
  if (section === "deliverables") return `${base}&dlv=1`
  return base
}

/** Only a task ref has a page that can show it on its own; everything else stays plain text. */
export function refHref(ref: string, period: Period): string | null {
  const match = /^task:(\d+)$/u.exec(ref)
  return match === null ? null : `${periodHref(period)}&task=${match[1]}`
}
