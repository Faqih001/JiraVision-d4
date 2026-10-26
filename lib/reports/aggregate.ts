// The arithmetic of one report. Pure: it takes rows already read through the author's own
// scope and returns each number WITH the rows that made it, so a supervisor's "where does 14
// come from?" opens 14 rows instead of re-deriving a query nobody can re-run. A metric whose
// refs cannot back it is a bug in this file, and tests/unit/report-aggregate.test.ts says so.

import { DISCIPLINE_LABEL, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import {
  DELIVERABLE_LABEL_STATUS,
  KIND_LABEL,
  WORK_LOG_KINDS,
  type DeliverableDto,
  type EntryDto,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import { localDay } from "@/lib/worklog/local-day"
import type { TransitionDto } from "@/lib/worklog/summary"
import type { Period, PeriodBucket, PeriodType } from "./period"

// `tasks.status` is a free varchar(50): no whitelist exists today, and a report must not
// invent one that would silently reclassify somebody's board. Everything unrecognised is
// "other" and shown as itself.
export const COMPLETED_STATUSES = ["done", "completed", "closed"]
export const IN_PROGRESS_STATUSES = ["in_progress", "doing", "active", "review", "testing"]
export const BLOCKED_STATUSES = ["blocked"]

export type TaskBucketName = "completed" | "in_progress" | "blocked" | "other"

/** Exported: Task 15's colour map is tested against these four bucket names. */
export const TASK_BUCKET_LABEL: Record<TaskBucketName, string> = {
  completed: "Completed",
  in_progress: "In progress",
  blocked: "Blocked",
  other: "Other",
}

export function statusBucket(status: string | null | undefined): TaskBucketName {
  const value = (status ?? "").trim().toLowerCase()
  if (COMPLETED_STATUSES.includes(value)) return "completed"
  if (BLOCKED_STATUSES.includes(value)) return "blocked"
  if (IN_PROGRESS_STATUSES.includes(value)) return "in_progress"
  return "other"
}

export type Count = { value: number; refs: string[] }

/**
 * Everything here is computed from rows that exist. `minutes` and `storyPointsCompleted` are
 * sums, so their value is not the ref count — the guard test uses this list, not a guess.
 */
export const METRIC_KEYS = [
  "entries",
  "minutes",
  "activeDays",
  "quietDays",
  "taskEvents",
  "completedTasks",
  "inProgressTasks",
  "blockedTasks",
  "deliverablesProduced",
  "deliverablesDelivered",
  "reviewRounds",
  "overdueCarried",
  "nextPeriodItems",
  "storyPointsCompleted",
  "sprintItems",
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]
export type Metrics = Record<MetricKey, Count>
export const SUM_METRIC_KEYS = ["minutes", "storyPointsCompleted"] as const
export function isSumMetric(key: MetricKey): boolean {
  return (SUM_METRIC_KEYS as readonly string[]).includes(key)
}

const countOf = (refs: string[]): Count => ({ value: refs.length, refs })
const zero = (): Count => ({ value: 0, refs: [] })

export type ReportRow = { ref: string; title: string; detail: string; date: string | null }

export type ReportTaskRow = {
  id: number
  title: string
  status: string
  priority: string
  dueDate: string | null
  storyPoints: number
  sprintTitle: string | null
}

export type ReportPlanRow = {
  id: number
  title: string
  status: string
  dueDate: string | null
  startDate: string | null
  planTitle: string
}

export type ReportSource = {
  period: Period
  /** The member's own day, so a period that has not finished is not reported as full of gaps. */
  todayIso: string
  timezone: string | null
  entries: EntryDto[]
  deliverables: DeliverableDto[]
  transitions: TransitionDto[]
  tasks: ReportTaskRow[]
  planItems: ReportPlanRow[]
}

export type SeriesBucket = {
  key: string
  label: string
  start: string
  end: string
  entries: Count
  minutes: Count
}

export type SplitBucket = { key: string; label: string; count: Count; minutes: Count }

export type ReportAggregate = {
  generatedAt: string
  isEmpty: boolean
  period: {
    type: PeriodType
    start: string
    end: string
    label: string
    dayCount: number
    /** True when the series is months rather than days — what makes a yearly report readable. */
    monthSeries: boolean
  }
  metrics: Metrics
  series: SeriesBucket[]
  byDiscipline: SplitBucket[]
  byKind: SplitBucket[]
  byTaskStatus: SplitBucket[]
  byPriority: SplitBucket[]
  completed: ReportRow[]
  inProgress: ReportRow[]
  blocked: ReportRow[]
  deliverableRows: ReportRow[]
  overdue: ReportRow[]
  nextPeriod: ReportRow[]
}

function inPeriod(dayIso: string | null, period: Period): boolean {
  return !!dayIso && dayIso >= period.start && dayIso <= period.end
}

function reasonFor(taskId: number, entries: EntryDto[]): string {
  const blocker = entries
    .filter((e) => e.kind === "blocker" && e.taskId === taskId)
    .sort((a, b) => (b.body ? 1 : 0) - (a.body ? 1 : 0) || b.workedOn.localeCompare(a.workedOn))[0]
  const text = (blocker?.body ?? blocker?.title ?? "").trim()
  return text ? `Reason: ${text}` : "No reason recorded in the log"
}

function seriesBuckets(period: Period, entries: EntryDto[]): SeriesBucket[] {
  return period.buckets.map((bucket: PeriodBucket) => {
    const rows = entries.filter((e) => e.workedOn >= bucket.start && e.workedOn <= bucket.end)
    const minutes = rows.reduce((total, e) => total + (e.minutes ?? 0), 0)
    return {
      key: bucket.key,
      label: bucket.label,
      start: bucket.start,
      end: bucket.end,
      entries: countOf(rows.map((e) => `entry:${e.id}`)),
      minutes: { value: minutes, refs: rows.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`) },
    }
  })
}

function splitByDiscipline(entries: EntryDto[]): SplitBucket[] {
  const groups = new Map<string, EntryDto[]>()
  for (const entry of entries) {
    const key = isWorkDiscipline(entry.discipline) ? entry.discipline : "unassigned"
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.entries()]
    .map(([key, rows]) => ({
      key,
      label: key === "unassigned" ? "Not set" : DISCIPLINE_LABEL[key as WorkDiscipline] ?? key,
      count: countOf(rows.map((e) => `entry:${e.id}`)),
      minutes: {
        value: rows.reduce((total, e) => total + (e.minutes ?? 0), 0),
        refs: rows.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`),
      },
    }))
    .sort(
      (a, b) => b.minutes.value - a.minutes.value || b.count.value - a.count.value || a.label.localeCompare(b.label),
    )
}

function splitByKind(entries: EntryDto[]): SplitBucket[] {
  return WORK_LOG_KINDS.map((kind: WorkLogKind) => {
    const rows = entries.filter((e) => e.kind === kind)
    return {
      key: kind,
      label: KIND_LABEL[kind],
      count: countOf(rows.map((e) => `entry:${e.id}`)),
      minutes: {
        value: rows.reduce((total, e) => total + (e.minutes ?? 0), 0),
        refs: rows.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`),
      },
    }
  }).filter((bucket) => bucket.count.value > 0)
}

function splitTasks(
  tasks: ReportTaskRow[],
  keyOf: (task: ReportTaskRow) => string,
  labelOf: (key: string) => string,
): SplitBucket[] {
  const groups = new Map<string, ReportTaskRow[]>()
  for (const task of tasks) {
    const key = keyOf(task)
    groups.set(key, [...(groups.get(key) ?? []), task])
  }
  return [...groups.entries()].map(([key, rows]) => ({
    key,
    label: labelOf(key),
    count: countOf(rows.map((t) => `task:${t.id}`)),
    minutes: zero(),
  }))
}

export function aggregateReport(source: ReportSource): ReportAggregate {
  const { period, entries, deliverables, transitions, tasks, planItems, todayIso, timezone } = source
  const generatedAt = new Date().toISOString()

  const logged = entries.filter((e) => inPeriod(e.workedOn, period))
  const entryRefs = logged.map((e) => `entry:${e.id}`)
  const minutesOfLogged = logged.reduce((total, e) => total + (e.minutes ?? 0), 0)

  const loggedDaySet = new Set(logged.map((e) => e.workedOn))
  const activeDayRefs = period.days.filter((day) => loggedDaySet.has(day)).map((day) => `day:${day}`)
  // A day that has not arrived yet is not a gap. Reporting one would turn a week in progress
  // into a report that reads like a fortnight of idleness.
  const quietDayRefs = period.days
    .filter((day) => day <= todayIso && !loggedDaySet.has(day))
    .map((day) => `day:${day}`)

  const completionEvents = transitions.filter((t) => statusBucket(t.toStatus) === "completed")
  const completedTaskIds = [...new Set(completionEvents.map((t) => t.taskId))]
  const completedRows: ReportRow[] = completionEvents
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((event) => ({
      ref: `event:${event.id}`,
      title: event.taskTitle ?? `Task #${event.taskId}`,
      detail: `${event.fromStatus} to ${event.toStatus}`,
      date: localDay(new Date(event.at), timezone),
    }))
  const pointsTasks = tasks.filter((t) => completedTaskIds.includes(t.id))

  const inProgressTasks = tasks.filter((t) => statusBucket(t.status) === "in_progress")
  const blockedTasks = tasks.filter((t) => statusBucket(t.status) === "blocked")
  const overdueTasks = tasks.filter(
    (t) => statusBucket(t.status) !== "completed" && t.dueDate !== null && t.dueDate < period.start,
  )
  const openTaskIds = tasks.filter((t) => statusBucket(t.status) !== "completed").map((t) => t.id)
  const sprintLogged = logged.filter((e) => e.taskId !== null)
  const sprintTaskIds = [...new Set(sprintLogged.map((e) => e.taskId as number))]
    .filter((id) => tasks.some((t) => t.id === id && t.sprintTitle))
    .filter((id) => openTaskIds.includes(id) || completedTaskIds.includes(id))

  const produced = deliverables.filter((d) => inPeriod(d.producedOn, period))
  const delivered = produced.filter((d) => d.status === "delivered")
  const awaitingReview = deliverables.filter((d) => d.status === "in_review")

  const forward = planItems
    .filter((p) => statusBucket(p.status) !== "completed" && p.dueDate !== null && p.dueDate > period.end)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))

  const metrics: Metrics = {
    entries: countOf(entryRefs),
    minutes: {
      value: minutesOfLogged,
      refs: logged.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`),
    },
    activeDays: countOf(activeDayRefs),
    quietDays: countOf(quietDayRefs),
    taskEvents: countOf(transitions.map((t) => `event:${t.id}`)),
    completedTasks: countOf(completedTaskIds.map((id) => `task:${id}`)),
    inProgressTasks: countOf(inProgressTasks.map((t) => `task:${t.id}`)),
    blockedTasks: countOf(blockedTasks.map((t) => `task:${t.id}`)),
    deliverablesProduced: countOf(produced.map((d) => `deliverable:${d.id}`)),
    deliverablesDelivered: countOf(delivered.map((d) => `deliverable:${d.id}`)),
    reviewRounds: countOf(awaitingReview.map((d) => `deliverable:${d.id}`)),
    overdueCarried: countOf(overdueTasks.map((t) => `task:${t.id}`)),
    nextPeriodItems: countOf(forward.map((p) => `plan:${p.id}`)),
    storyPointsCompleted: {
      value: pointsTasks.reduce((total, t) => total + t.storyPoints, 0),
      refs: pointsTasks.filter((t) => t.storyPoints > 0).map((t) => `task:${t.id}`),
    },
    sprintItems: countOf(sprintTaskIds.map((id) => `task:${id}`)),
  }

  const isEmpty =
    entryRefs.length === 0 &&
    transitions.length === 0 &&
    produced.length === 0 &&
    inProgressTasks.length === 0 &&
    blockedTasks.length === 0 &&
    overdueTasks.length === 0 &&
    forward.length === 0

  return {
    generatedAt,
    isEmpty,
    period: {
      type: period.type,
      start: period.start,
      end: period.end,
      label: period.label,
      dayCount: period.days.length,
      monthSeries: period.buckets.length !== period.days.length,
    },
    metrics,
    series: seriesBuckets(period, logged),
    byDiscipline: splitByDiscipline(logged),
    byKind: splitByKind(logged),
    byTaskStatus: splitTasks(tasks, (t) => statusBucket(t.status), (key) => TASK_BUCKET_LABEL[key as TaskBucketName]).sort(
      (a, b) => b.count.value - a.count.value,
    ),
    byPriority: splitTasks(tasks, (t) => t.priority || "none", (key) => key).sort((a, b) => b.count.value - a.count.value),
    completed: completedRows,
    inProgress: inProgressTasks.map((t) => ({
      ref: `task:${t.id}`,
      title: t.title,
      detail: `${t.status}${t.sprintTitle ? ` · ${t.sprintTitle}` : " · no sprint"}`,
      date: t.dueDate,
    })),
    blocked: blockedTasks.map((t) => ({
      ref: `task:${t.id}`,
      title: t.title,
      detail: reasonFor(t.id, logged),
      date: t.dueDate,
    })),
    deliverableRows: produced.map((d) => ({
      ref: `deliverable:${d.id}`,
      title: d.name,
      detail: `${d.type} · ${DELIVERABLE_LABEL_STATUS[d.status] ?? d.status}${d.link ? ` · ${d.link}` : ""}`,
      date: d.producedOn,
    })),
    overdue: overdueTasks.map((t) => ({
      ref: `task:${t.id}`,
      title: t.title,
      detail: reasonFor(t.id, logged),
      date: t.dueDate,
    })),
    nextPeriod: forward.map((p) => ({
      ref: `plan:${p.id}`,
      title: p.title,
      detail: `${p.planTitle}${p.startDate ? ` · starts ${p.startDate}` : ""}`,
      date: p.dueDate,
    })),
  }
}
