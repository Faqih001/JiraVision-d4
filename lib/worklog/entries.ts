// The entry/deliverable vocabulary and every number the work log page renders.
// Pure on purpose: lib/db.js shadows lib/db.ts under Vitest, so a module that
// imported a connection could not be tested, and each of these numbers has to be.
// The phase-1 DDL carries no CHECK constraints, so this file — not the database —
// is what keeps `kind` and `status` inside a known set.

import { WORK_DISCIPLINES, type WorkDiscipline } from "@/lib/roles"
import { shiftDays } from "./local-day"

export const WORK_LOG_KINDS = ["action", "time", "blocker", "note", "review", "deliverable"] as const
export type WorkLogKind = (typeof WORK_LOG_KINDS)[number]

export const KIND_LABEL: Record<WorkLogKind, string> = {
  action: "Action",
  time: "Time",
  blocker: "Blocker",
  note: "Note",
  review: "Review",
  deliverable: "Deliverable",
}

export const KIND_COLOUR: Record<WorkLogKind, string> = {
  action: "hsl(var(--chart-pine))",
  time: "hsl(var(--chart-moss))",
  blocker: "hsl(var(--destructive))",
  note: "hsl(var(--chart-stone))",
  review: "hsl(var(--chart-clay))",
  deliverable: "hsl(var(--accent))",
}

export function isWorkLogKind(value: unknown): value is WorkLogKind {
  return typeof value === "string" && (WORK_LOG_KINDS as readonly string[]).includes(value)
}

// `auto` and `gemini` belong to later phases (promotes and the provider). Phase 2's
// routes only ever write `manual`; the values exist so the column is not re-typed
// when a phase that needs them lands.
export const ENTRY_SOURCES = ["manual", "auto", "gemini"] as const
export type EntrySource = (typeof ENTRY_SOURCES)[number]

export function isEntrySource(value: unknown): value is EntrySource {
  return typeof value === "string" && (ENTRY_SOURCES as readonly string[]).includes(value)
}

export const DELIVERABLE_TYPES = [
  "document",
  "code",
  "design",
  "inspection",
  "audit_finding",
  "training",
  "report",
  "other",
] as const
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number]

export const DELIVERABLE_LABEL: Record<DeliverableType, string> = {
  document: "Document",
  code: "Code",
  design: "Design",
  inspection: "Inspection",
  audit_finding: "Audit finding",
  training: "Training",
  report: "Report",
  other: "Other",
}

export function isDeliverableType(value: unknown): value is DeliverableType {
  return typeof value === "string" && (DELIVERABLE_TYPES as readonly string[]).includes(value)
}

export const DELIVERABLE_STATUSES = ["draft", "in_review", "approved", "delivered"] as const
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

export const DELIVERABLE_LABEL_STATUS: Record<DeliverableStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  delivered: "Delivered",
}

export const DELIVERABLE_COLOUR: Record<DeliverableStatus, string> = {
  draft: "hsl(var(--chart-stone))",
  in_review: "hsl(var(--chart-clay))",
  approved: "hsl(var(--chart-moss))",
  delivered: "hsl(var(--chart-pine))",
}

export function isDeliverableStatus(value: unknown): value is DeliverableStatus {
  return typeof value === "string" && (DELIVERABLE_STATUSES as readonly string[]).includes(value)
}

// draft → in_review → approved | delivered, with one step back for rework. Delivered is
// terminal: re-opening accepted evidence is a new deliverable, not an edit of history.
export const DELIVERABLE_NEXT: Record<DeliverableStatus, DeliverableStatus[]> = {
  draft: ["in_review", "delivered"],
  in_review: ["approved", "draft"],
  approved: ["delivered"],
  delivered: [],
}

export function canMoveDeliverable(from: DeliverableStatus, to: DeliverableStatus): boolean {
  return DELIVERABLE_NEXT[from].includes(to)
}

export type EntryDto = {
  id: number
  workedOn: string
  taskId: number | null
  taskTitle: string | null
  kind: WorkLogKind
  title: string
  body: string | null
  discipline: WorkDiscipline | null
  minutes: number | null
  deliverableId: number | null
  playbookId: number | null
  playbookVersion: number | null
  links: string[]
  source: EntrySource
  redatedAt: string | null
  createdAt: string
}

export type DeliverableDto = {
  id: number
  name: string
  type: DeliverableType
  status: DeliverableStatus
  producedOn: string | null
  link: string | null
  evidence: string | null
  taskId: number | null
  taskTitle: string | null
  discipline: WorkDiscipline | null
  entryCount: number
  createdAt: string
}

export type DayBucket = { day: string; count: number; minutes: number; entries: EntryDto[] }
export type KindBucket = { kind: WorkLogKind; label: string; count: number; minutes: number }
export type DisciplineBucket = { discipline: WorkDiscipline; minutes: number; count: number }
export type TaskBucket = { taskId: number | null; taskTitle: string | null; entries: EntryDto[]; minutes: number }

export function minutesTotal(entries: readonly Pick<EntryDto, "minutes">[]): number {
  return entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0)
}

// Every kind is present even with zero rows, so the board and the mix chart cannot
// imply that an unlogged kind did not happen.
export function countByKind(entries: readonly EntryDto[]): KindBucket[] {
  return WORK_LOG_KINDS.map((kind) => {
    const rows = entries.filter((e) => e.kind === kind)
    return { kind, label: KIND_LABEL[kind], count: rows.length, minutes: minutesTotal(rows) }
  })
}

export function minutesByDiscipline(entries: readonly EntryDto[]): DisciplineBucket[] {
  const present = WORK_DISCIPLINES.filter((discipline) => entries.some((e) => e.discipline === discipline))
  return present
    .map((discipline) => {
      const rows = entries.filter((e) => e.discipline === discipline)
      return { discipline, minutes: minutesTotal(rows), count: rows.length }
    })
    .sort((a, b) => b.minutes - a.minutes || a.discipline.localeCompare(b.discipline))
}

export function groupByTask(entries: readonly EntryDto[]): TaskBucket[] {
  const buckets = new Map<string, TaskBucket>()
  for (const e of entries) {
    const key = e.taskId === null ? "unlinked" : `task:${e.taskId}`
    const existing = buckets.get(key)
    if (existing) {
      existing.entries.push(e)
      existing.minutes += e.minutes ?? 0
    } else {
      buckets.set(key, {
        taskId: e.taskId,
        taskTitle: e.taskTitle,
        entries: [e],
        minutes: e.minutes ?? 0,
      })
    }
  }
  const rows = [...buckets.values()]
  // The unlinked bucket sorts by its own label position, and always lands last.
  return rows.sort((a, b) => {
    if (a.taskId === null) return 1
    if (b.taskId === null) return -1
    return b.minutes - a.minutes || (a.taskTitle ?? "").localeCompare(b.taskTitle ?? "")
  })
}

export function groupByDay(entries: readonly EntryDto[], days: readonly string[]): DayBucket[] {
  return days.map((day) => {
    const rows = entries.filter((e) => e.workedOn === day)
    return { day, count: rows.length, minutes: minutesTotal(rows), entries: rows }
  })
}

export function unlinkedCount(entries: readonly EntryDto[]): number {
  return entries.filter((e) => e.taskId === null && e.kind !== "deliverable").length
}

export function openBlockerCount(entries: readonly EntryDto[]): number {
  return entries.filter((e) => e.kind === "blocker" && e.deliverableId === null).length
}

export function gapDays(days: readonly string[], activeDays: readonly string[]): string[] {
  const active = new Set(activeDays)
  return days.filter((day) => !active.has(day))
}

/**
 * `current` counts back from today, but an empty today does not break a streak —
 * the day is still in progress. `longest` walks the sorted set, so an out-of-order
 * array from the API cannot under-report it.
 */
export function streakOf(activeDays: readonly string[], todayIso: string): { current: number; longest: number } {
  const set = new Set(activeDays.filter((d) => typeof d === "string" && d.length === 10))
  if (set.size === 0) return { current: 0, longest: 0 }

  const sorted = [...set].sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i += 1) {
    run = shiftDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1
    if (run > longest) longest = run
  }

  let cursor = set.has(todayIso) ? todayIso : shiftDays(todayIso, -1)
  let current = 0
  while (set.has(cursor)) {
    current += 1
    cursor = shiftDays(cursor, -1)
  }
  return { current, longest }
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—"
  if (minutes < 60) return `${minutes}m`
  const hrs = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hrs}h` : `${hrs}h ${rest}m`
}

const CSV_HEADER = [
  "worked_on",
  "kind",
  "title",
  "body",
  "task",
  "discipline",
  "minutes",
  "deliverable",
  "source",
] as const

/**
 * One quoted field per column, exactly as the activity export does it. A body keeps its
 * newlines inside the quotes, so a row never splits into two records.
 */
function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function entriesToCsv(entries: readonly EntryDto[]): string {
  const rows = entries.map((e) =>
    [
      e.workedOn,
      e.kind,
      e.title,
      e.body ?? "",
      e.taskTitle ?? "",
      e.discipline ?? "",
      e.minutes ?? "",
      e.deliverableId ?? "",
      e.source,
    ]
      .map(csvCell)
      .join(","),
  )
  return [CSV_HEADER.map(csvCell).join(","), ...rows].join("\n")
}
