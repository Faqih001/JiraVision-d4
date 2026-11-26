// The arithmetic of one report. Pure: it takes rows already read through the author's own
// scope and returns each number WITH the rows that made it, so a supervisor's "where does 14
// come from?" opens 14 rows instead of re-deriving a query nobody can re-run. A metric whose
// refs cannot back it is a bug in this file, and tests/unit/report-aggregate.test.ts says so.

import { DISCIPLINE_LABEL, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import { isCompletedTaskStatus } from "@/lib/tasks/statuses"
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
// "other" and shown as itself. The finished words live in lib/tasks/statuses.ts so a report
// and a career meter cannot disagree about what "done" meant.
export const IN_PROGRESS_STATUSES = ["in_progress", "doing", "active", "review", "testing"]
export const BLOCKED_STATUSES = ["blocked"]
// The terminal ticket words from lib/tickets.ts; anything else is still open work.
export const TICKET_FINISHED_STATUSES = ["resolved", "closed"]

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
  if (isCompletedTaskStatus(value)) return "completed"
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
  "opsEvents",
  "registerItemsHeld",
  "registerVerifications",
  "ticketsResolved",
  "ticketsOpen",
  "ticketActions",
  "goalCheckins",
  "goalsAchieved",
  "meetings",
  "retroNotes",
  "retroActionsOpen",
  "careerSignoffs",
  "careerRequests",
  "growthReviews",
  "playbooksPublished",
  "playbookRuns",
  "automationRuns",
  "automationRulesActive",
  "aiMessages",
  "aiTokens",
  "chatMessages",
  "gamificationXp",
  "wellbeingCheckins",
  "ethicsSnapshots",
  "emailsDelivered",
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]
export type Metrics = Record<MetricKey, Count>
export const SUM_METRIC_KEYS = ["minutes", "storyPointsCompleted", "aiTokens", "gamificationXp"] as const
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
  cadence?: string | null
}

export type ReportTaskInstanceRow = {
  id: number
  taskId: number
  taskTitle: string | null
  cadence: string | null
  instanceDate: string
  status: string
}

export type ReportPlanRow = {
  id: number
  title: string
  status: string
  dueDate: string | null
  startDate: string | null
  planTitle: string
}

// The eight activity modules beyond tasks/worklog/deliverables/planner. Instants arrive as ISO
// strings and are resolved to the member's day here, exactly like task events; `date` columns
// (lastVerifiedAt, dueDate) arrive as plain ISO days.
export type ReportOpsRow = {
  id: number
  packKey: string
  entityKey: string
  status: string | null
  occurredAt: string
}

export type ReportRegisterRow = {
  id: number
  packKey: string
  kind: string
  title: string
  status: string
  lastVerifiedAt: string | null
}

export type ReportTicketRow = {
  id: number
  subject: string
  status: string
  priority: string
  resolvedAt: string | null
}

export type ReportTicketEventRow = {
  id: number
  ticketId: number
  ticketSubject: string | null
  type: string
  fromValue: string | null
  toValue: string | null
  at: string
}

export type ReportGoalRow = {
  id: number
  title: string
  status: string
  current: number
  target: number
  metricType: string
  dueDate: string | null
}

export type ReportCheckinRow = {
  id: number
  goalId: number
  goalTitle: string | null
  value: number
  note: string | null
  at: string
}

export type ReportMeetingRow = {
  id: number
  title: string
  eventType: string
  startTime: string
  organized: boolean
}

export type ReportRetroNoteRow = {
  id: number
  retroTitle: string | null
  category: string
  body: string
  at: string
}

export type ReportRetroActionRow = {
  id: number
  retroTitle: string | null
  body: string
  done: boolean
  dueDate: string | null
}

export type ReportSignoffRow = { id: number; itemKey: string; status: string; at: string }

export type ReportRequestRow = {
  id: number
  discipline: string
  fromLevel: number
  toLevel: number
  status: string
  at: string
}

export type ReportGrowthRow = { id: number; kind: string; at: string }

export type ReportPlaybookRow = {
  id: number
  title: string
  status: string
  version: number
  /** The playbook's last publish/edit instant, named `at` because a report never reports edits as work dates. */
  at: string
}

// F2 coverage: the seven further reportable surfaces. Automation rules are standing work (like
// registers) and their runs are the dated activity; assistant/chat/email instants arrive as ISO
// strings (chat/email naive wall-time already normalised to UTC by the read); wellbeing and ethics
// carry a plain `date` day column; gamification is a standing progress snapshot with no date.
export type ReportAutomationRuleRow = {
  id: number
  name: string
  trigger: string
  isActive: boolean
  runCount: number
  lastRunAt: string | null
}

export type ReportAutomationRunRow = {
  id: number
  ruleId: number
  ruleName: string
  status: string
  matched: number
  acted: number
  createdAt: string
}

export type ReportAssistantMessageRow = {
  id: number
  threadTitle: string | null
  role: string
  tokens: number
  createdAt: string
}

export type ReportChatMessageRow = {
  /** messages.id is a uuid, so a chat ref is a string, not a number. */
  id: string
  chatName: string
  content: string
  timestamp: string
}

export type ReportGamificationRow = {
  id: number
  level: number
  xp: number
  tasksCompleted: number
}

export type ReportWellbeingRow = {
  id: number
  date: string
  wellbeingScore: number | null
  mood: string | null
  workload: string | null
  stressLevel: number | null
  overtimeHours: number
}

export type ReportEthicsRow = {
  id: number
  date: string
  payEquityScore: number | null
  workloadBalanceScore: number | null
  deiTaskDistributionScore: number | null
  overtimeCompliance: number | null
}

export type ReportEmailRow = {
  id: number
  subject: string | null
  eventType: string | null
  status: string
  createdAt: string
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
  taskInstances?: ReportTaskInstanceRow[]
  planItems: ReportPlanRow[]
  opsEvents: ReportOpsRow[]
  registerItems: ReportRegisterRow[]
  tickets: ReportTicketRow[]
  ticketEvents: ReportTicketEventRow[]
  goals: ReportGoalRow[]
  goalCheckins: ReportCheckinRow[]
  meetings: ReportMeetingRow[]
  retroNotes: ReportRetroNoteRow[]
  retroActions: ReportRetroActionRow[]
  careerSignoffs: ReportSignoffRow[]
  careerRequests: ReportRequestRow[]
  growthReviews: ReportGrowthRow[]
  playbooks: ReportPlaybookRow[]
  automationRules: ReportAutomationRuleRow[]
  automationRuns: ReportAutomationRunRow[]
  assistantMessages: ReportAssistantMessageRow[]
  chatMessages: ReportChatMessageRow[]
  gamification: ReportGamificationRow[]
  wellbeing: ReportWellbeingRow[]
  ethics: ReportEthicsRow[]
  email: ReportEmailRow[]
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

/** The modules a report can draw activity from — the badge vocabulary of the merged timeline. */
export const MODULE_KEYS = [
  "worklog",
  "tasks",
  "deliverables",
  "planner",
  "operations",
  "registers",
  "serviceDesk",
  "goals",
  "meetings",
  "retros",
  "career",
  "playbooks",
  "automation",
  "assistant",
  "chat",
  "gamification",
  "wellbeing",
  "ethics",
  "email",
] as const
export type ModuleKey = (typeof MODULE_KEYS)[number]
export const MODULE_LABEL: Record<ModuleKey, string> = {
  worklog: "Work log",
  tasks: "Tasks",
  deliverables: "Deliverables",
  planner: "Planner",
  operations: "Operations",
  registers: "Registers",
  serviceDesk: "Service desk",
  goals: "Goals",
  meetings: "Meetings",
  retros: "Retros",
  career: "Career",
  playbooks: "Playbooks",
  automation: "Automation",
  assistant: "AI assistant",
  chat: "Chat",
  gamification: "Gamification",
  wellbeing: "Wellbeing",
  ethics: "Ethical metrics",
  email: "Email",
}

export type TimelineRow = ReportRow & { source: ModuleKey }

/** Every array-valued field of the aggregate — what an older stored snapshot must backfill with []. */
export const AGGREGATE_ARRAY_KEYS = [
  "series",
  "byDiscipline",
  "byKind",
  "byTaskStatus",
  "byPriority",
  "completed",
  "inProgress",
  "blocked",
  "deliverableRows",
  "overdue",
  "nextPeriod",
  "opsRows",
  "registerRows",
  "ticketRows",
  "goalRows",
  "meetingRows",
  "retroRows",
  "careerRows",
  "playbookRows",
  "automationRows",
  "assistantRows",
  "chatRows",
  "gamificationRows",
  "wellbeingRows",
  "ethicsRows",
  "emailRows",
  "timeline",
  "byModule",
] as const

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
  opsRows: ReportRow[]
  registerRows: ReportRow[]
  ticketRows: ReportRow[]
  goalRows: ReportRow[]
  meetingRows: ReportRow[]
  retroRows: ReportRow[]
  careerRows: ReportRow[]
  playbookRows: ReportRow[]
  automationRows: ReportRow[]
  assistantRows: ReportRow[]
  chatRows: ReportRow[]
  gamificationRows: ReportRow[]
  wellbeingRows: ReportRow[]
  ethicsRows: ReportRow[]
  emailRows: ReportRow[]
  /** Dated activity from every module, newest first — the builder's merged timeline. */
  timeline: TimelineRow[]
  /** Per-module row counts for the workspace mix; only modules with rows appear. */
  byModule: SplitBucket[]
}

function inPeriod(dayIso: string | null, period: Period): boolean {
  return !!dayIso && dayIso >= period.start && dayIso <= period.end
}

function instantInPeriod(at: string, period: Period, timezone: string | null): boolean {
  return inPeriod(localDay(new Date(at), timezone), period)
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
  const {
    period,
    entries,
    deliverables,
    transitions,
    tasks,
    planItems,
    todayIso,
    timezone,
    opsEvents,
    registerItems,
    tickets,
    ticketEvents,
    goals,
    goalCheckins,
    meetings,
    retroNotes,
    retroActions,
    careerSignoffs,
    careerRequests,
    growthReviews,
    playbooks,
    automationRules,
    automationRuns,
    assistantMessages,
    chatMessages,
    gamification,
    wellbeing,
    ethics,
    email,
  } = source
  const generatedAt = new Date().toISOString()
  const dayOf = (at: string): string => localDay(new Date(at), timezone)

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

  const instances = source.taskInstances ?? []
  const completedInstances = instances.filter(
    (inst) => statusBucket(inst.status) === "completed" && inPeriod(inst.instanceDate, period),
  )
  const completedInstanceTaskIds = new Set(completedInstances.map((inst) => inst.taskId))
  const openTodayInstanceTaskIds = new Set(
    instances
      .filter((inst) => inst.instanceDate === todayIso && statusBucket(inst.status) !== "completed")
      .map((inst) => inst.taskId),
  )

  const completionEvents = transitions.filter((t) => statusBucket(t.toStatus) === "completed")
  const completedTaskIds = [
    ...new Set([
      ...completionEvents.map((t) => t.taskId),
      ...completedInstances.map((inst) => inst.taskId),
    ]),
  ]
  const completedRows: ReportRow[] = [
    ...completionEvents.map((event) => ({
      ref: `event:${event.id}`,
      title: event.taskTitle ?? `Task #${event.taskId}`,
      detail: `${event.fromStatus} to ${event.toStatus}`,
      date: localDay(new Date(event.at), timezone),
      sortKey: event.at,
    })),
    ...completedInstances.map((inst) => ({
      ref: `instance:${inst.id}`,
      title: inst.taskTitle ?? `Task #${inst.taskId}`,
      detail: `${inst.cadence && inst.cadence !== "one-off" ? `${inst.cadence} · ` : ""}done for ${inst.instanceDate}`,
      date: inst.instanceDate,
      sortKey: inst.instanceDate,
    })),
  ]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ sortKey: _sortKey, ...row }) => row)
  const pointsTasks = tasks.filter((t) => completedTaskIds.includes(t.id))

  const inProgressTasks = tasks.filter((t) => {
    if (statusBucket(t.status) !== "in_progress") return false
    const isRecurring = Boolean(t.cadence && t.cadence !== "one-off")
    if (isRecurring && completedInstanceTaskIds.has(t.id) && !openTodayInstanceTaskIds.has(t.id)) {
      return false
    }
    return true
  })
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

  const deliverableRows: ReportRow[] = produced.map((d) => ({
    ref: `deliverable:${d.id}`,
    title: d.name,
    detail: `${d.type} · ${DELIVERABLE_LABEL_STATUS[d.status] ?? d.status}${d.link ? ` · ${d.link}` : ""}`,
    date: d.producedOn,
  }))

  // Operations: dated activity, resolved to the member's day like task events.
  const opsInPeriod = opsEvents.filter((e) => instantInPeriod(e.occurredAt, period, timezone))
  const opsRows: ReportRow[] = opsInPeriod.map((e) => ({
    ref: `ops:${e.id}`,
    title: e.entityKey,
    detail: `${e.packKey}${e.status ? ` · ${e.status}` : ""}`,
    date: dayOf(e.occurredAt),
  }))

  // Registers: held items are standing work; only a verification dated in the period is activity.
  const registerRows: ReportRow[] = registerItems.map((item) => ({
    ref: `register:${item.id}`,
    title: item.title,
    detail: `${item.packKey} · ${item.kind} · ${item.status}`,
    date: item.lastVerifiedAt,
  }))
  const verifiedInPeriod = registerItems.filter((item) => inPeriod(item.lastVerifiedAt, period))

  // Service desk: resolved-in-period and still-open are different sets; a ticket in both is listed once.
  const ticketsResolved = tickets.filter((t) => t.resolvedAt !== null && instantInPeriod(t.resolvedAt, period, timezone))
  const ticketsOpen = tickets.filter((t) => !TICKET_FINISHED_STATUSES.includes(t.status))
  const ticketById = new Map<number, ReportTicketRow>()
  for (const t of [...ticketsResolved, ...ticketsOpen]) ticketById.set(t.id, t)
  const ticketRows: ReportRow[] = [...ticketById.values()].map((t) => ({
    ref: `ticket:${t.id}`,
    title: t.subject,
    detail: `${t.status} · ${t.priority}`,
    date: t.resolvedAt ? dayOf(t.resolvedAt) : null,
  }))
  const ticketActionsInPeriod = ticketEvents.filter((e) => instantInPeriod(e.at, period, timezone))

  // Goals: the goal itself is standing work; a check-in is the dated activity.
  const goalRows: ReportRow[] = goals.map((g) => ({
    ref: `goal:${g.id}`,
    title: g.title,
    detail: `${g.current}/${g.target} ${g.metricType} · ${g.status}`,
    date: g.dueDate,
  }))
  const goalsAchieved = goals.filter((g) => g.status === "achieved")
  const checkinsInPeriod = goalCheckins.filter((c) => instantInPeriod(c.at, period, timezone))

  const meetingsInPeriod = meetings.filter((m) => instantInPeriod(m.startTime, period, timezone))
  const meetingRows: ReportRow[] = meetingsInPeriod.map((m) => ({
    ref: `meeting:${m.id}`,
    title: m.title,
    detail: `${m.eventType} · ${m.organized ? "organised" : "attended"}`,
    date: dayOf(m.startTime),
  }))

  const retroNotesInPeriod = retroNotes.filter((n) => instantInPeriod(n.at, period, timezone))
  const openRetroActions = retroActions.filter((a) => !a.done)
  const retroNoteRows: ReportRow[] = retroNotesInPeriod.map((n) => ({
    ref: `retro-note:${n.id}`,
    title: n.retroTitle ?? "Retro",
    detail: `${n.category} · ${n.body}`,
    date: dayOf(n.at),
  }))
  const retroRows: ReportRow[] = [
    ...retroNoteRows,
    ...openRetroActions.map((a) => ({
      ref: `retro-action:${a.id}`,
      title: a.retroTitle ?? "Retro",
      detail: `Action: ${a.body}`,
      date: a.dueDate,
    })),
  ]

  const signoffsInPeriod = careerSignoffs.filter((s) => instantInPeriod(s.at, period, timezone))
  const requestsInPeriod = careerRequests.filter((r) => instantInPeriod(r.at, period, timezone))
  const reviewsInPeriod = growthReviews.filter((g) => instantInPeriod(g.at, period, timezone))
  const careerRows: ReportRow[] = [
    ...signoffsInPeriod.map((s) => ({ ref: `signoff:${s.id}`, title: s.itemKey, detail: s.status, date: dayOf(s.at) })),
    ...requestsInPeriod.map((r) => ({
      ref: `request:${r.id}`,
      title: `${r.discipline} L${r.fromLevel} to L${r.toLevel}`,
      detail: r.status,
      date: dayOf(r.at),
    })),
    ...reviewsInPeriod.map((g) => ({ ref: `review:${g.id}`, title: g.kind, detail: "Growth review", date: dayOf(g.at) })),
  ]

  // Playbooks: a run is a worklog entry that cites one; publishing is dated by the playbook's own instant.
  const playbookRunEntries = logged.filter((e) => e.playbookId !== null)
  const runsByPlaybook = new Map<number, number>()
  for (const e of playbookRunEntries) {
    const id = e.playbookId as number
    runsByPlaybook.set(id, (runsByPlaybook.get(id) ?? 0) + 1)
  }
  const publishedInPeriod = playbooks.filter((p) => p.status === "published" && instantInPeriod(p.at, period, timezone))
  const playbookRows: ReportRow[] = playbooks.map((p) => ({
    ref: `playbook:${p.id}`,
    title: p.title,
    detail: `${p.status} · v${p.version} · ${runsByPlaybook.get(p.id) ?? 0} runs this period`,
    date: dayOf(p.at),
  }))

  // Automation mirrors registers: an active rule is standing work, a run dated in the period is activity.
  const activeRules = automationRules.filter((r) => r.isActive)
  const automationRows: ReportRow[] = activeRules.map((r) => ({
    ref: `automation-rule:${r.id}`,
    title: r.name,
    detail: `${r.trigger} · ${r.runCount} runs total`,
    date: r.lastRunAt ? dayOf(r.lastRunAt) : null,
  }))
  const automationRunsInPeriod = automationRuns.filter((r) => instantInPeriod(r.createdAt, period, timezone))

  // AI usage: only the assistant's replies are the member's generated output; the prompt is not activity.
  const assistantInPeriod = assistantMessages.filter(
    (m) => m.role === "assistant" && instantInPeriod(m.createdAt, period, timezone),
  )
  const assistantRows: ReportRow[] = assistantInPeriod.map((m) => ({
    ref: `ai-message:${m.id}`,
    title: m.threadTitle ?? "Assistant",
    detail: `${m.tokens} tokens`,
    date: dayOf(m.createdAt),
  }))

  // Chat: the member's own messages, named by the chat they landed in.
  const chatInPeriod = chatMessages.filter((m) => instantInPeriod(m.timestamp, period, timezone))
  const chatRows: ReportRow[] = chatInPeriod.map((m) => ({
    ref: `chat-message:${m.id}`,
    title: m.chatName,
    detail: m.content.trim().slice(0, 80),
    date: dayOf(m.timestamp),
  }))

  // Gamification is a standing snapshot, not a dated event; a default level-1 profile is not progress.
  const progressed = gamification.filter((g) => g.xp > 0 || g.tasksCompleted > 0 || g.level > 1)
  const gamificationRows: ReportRow[] = progressed.map((g) => ({
    ref: `gamification:${g.id}`,
    title: `Level ${g.level}`,
    detail: `${g.xp} XP · ${g.tasksCompleted} tasks completed`,
    date: null,
  }))

  // Wellbeing check-ins carry a plain day column, like a worklog entry.
  const wellbeingInPeriod = wellbeing.filter((w) => inPeriod(w.date, period))
  const wellbeingRows: ReportRow[] = wellbeingInPeriod.map((w) => ({
    ref: `wellbeing:${w.id}`,
    title: `Wellbeing ${w.date}`,
    detail: `score ${w.wellbeingScore ?? "—"} · ${w.mood ?? "no mood"} · stress ${w.stressLevel ?? "—"}`,
    date: w.date,
  }))

  // Ethical metrics are team-wide (no owner): counted in the mix, never on a personal timeline.
  const ethicsInPeriod = ethics.filter((e) => inPeriod(e.date, period))
  const ethicsRows: ReportRow[] = ethicsInPeriod.map((e) => ({
    ref: `ethics:${e.id}`,
    title: `Team ethics ${e.date}`,
    detail: `pay equity ${e.payEquityScore ?? "—"} · workload ${e.workloadBalanceScore ?? "—"} · DEI ${e.deiTaskDistributionScore ?? "—"}`,
    date: e.date,
  }))

  // Email: a digest that actually went out, not one still queued.
  const emailInPeriod = email.filter((e) => e.status === "delivered" && instantInPeriod(e.createdAt, period, timezone))
  const emailRows: ReportRow[] = emailInPeriod.map((e) => ({
    ref: `email:${e.id}`,
    title: e.subject ?? "Digest",
    detail: `${e.eventType ?? "system"} · delivered`,
    date: dayOf(e.createdAt),
  }))

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
    opsEvents: countOf(opsInPeriod.map((e) => `ops:${e.id}`)),
    registerItemsHeld: countOf(registerItems.map((item) => `register:${item.id}`)),
    registerVerifications: countOf(verifiedInPeriod.map((item) => `register:${item.id}`)),
    ticketsResolved: countOf(ticketsResolved.map((t) => `ticket:${t.id}`)),
    ticketsOpen: countOf(ticketsOpen.map((t) => `ticket:${t.id}`)),
    ticketActions: countOf(ticketActionsInPeriod.map((e) => `ticket-event:${e.id}`)),
    goalCheckins: countOf(checkinsInPeriod.map((c) => `checkin:${c.id}`)),
    goalsAchieved: countOf(goalsAchieved.map((g) => `goal:${g.id}`)),
    meetings: countOf(meetingsInPeriod.map((m) => `meeting:${m.id}`)),
    retroNotes: countOf(retroNotesInPeriod.map((n) => `retro-note:${n.id}`)),
    retroActionsOpen: countOf(openRetroActions.map((a) => `retro-action:${a.id}`)),
    careerSignoffs: countOf(signoffsInPeriod.map((s) => `signoff:${s.id}`)),
    careerRequests: countOf(requestsInPeriod.map((r) => `request:${r.id}`)),
    growthReviews: countOf(reviewsInPeriod.map((g) => `review:${g.id}`)),
    playbooksPublished: countOf(publishedInPeriod.map((p) => `playbook:${p.id}`)),
    playbookRuns: countOf(playbookRunEntries.map((e) => `entry:${e.id}`)),
    automationRulesActive: countOf(activeRules.map((r) => `automation-rule:${r.id}`)),
    automationRuns: countOf(automationRunsInPeriod.map((r) => `automation-run:${r.id}`)),
    aiMessages: countOf(assistantInPeriod.map((m) => `ai-message:${m.id}`)),
    aiTokens: {
      value: assistantInPeriod.reduce((total, m) => total + (m.tokens ?? 0), 0),
      refs: assistantInPeriod.filter((m) => (m.tokens ?? 0) > 0).map((m) => `ai-message:${m.id}`),
    },
    chatMessages: countOf(chatInPeriod.map((m) => `chat-message:${m.id}`)),
    gamificationXp: {
      value: progressed.reduce((total, g) => total + (g.xp ?? 0), 0),
      refs: progressed.filter((g) => (g.xp ?? 0) > 0).map((g) => `gamification:${g.id}`),
    },
    wellbeingCheckins: countOf(wellbeingInPeriod.map((w) => `wellbeing:${w.id}`)),
    ethicsSnapshots: countOf(ethicsInPeriod.map((e) => `ethics:${e.id}`)),
    emailsDelivered: countOf(emailInPeriod.map((e) => `email:${e.id}`)),
  }

  const isEmpty =
    entryRefs.length === 0 &&
    transitions.length === 0 &&
    produced.length === 0 &&
    inProgressTasks.length === 0 &&
    blockedTasks.length === 0 &&
    overdueTasks.length === 0 &&
    forward.length === 0 &&
    opsRows.length === 0 &&
    registerRows.length === 0 &&
    ticketRows.length === 0 &&
    goalRows.length === 0 &&
    meetingRows.length === 0 &&
    retroRows.length === 0 &&
    careerRows.length === 0 &&
    playbookRows.length === 0 &&
    ticketActionsInPeriod.length === 0 &&
    checkinsInPeriod.length === 0 &&
    automationRows.length === 0 &&
    automationRunsInPeriod.length === 0 &&
    assistantRows.length === 0 &&
    chatRows.length === 0 &&
    gamificationRows.length === 0 &&
    wellbeingRows.length === 0 &&
    ethicsRows.length === 0 &&
    emailRows.length === 0

  // The merged timeline carries only dated activity inside the period — a due date on standing
  // work is a deadline, not something that happened, so it never appears here.
  const timeline: TimelineRow[] = [
    ...logged.map((e) => ({
      source: "worklog" as ModuleKey,
      ref: `entry:${e.id}`,
      title: e.title,
      detail: KIND_LABEL[e.kind],
      date: e.workedOn,
    })),
    ...completedRows.map((r) => ({ ...r, source: "tasks" as ModuleKey })),
    ...deliverableRows.map((r) => ({ ...r, source: "deliverables" as ModuleKey })),
    ...opsRows.map((r) => ({ ...r, source: "operations" as ModuleKey })),
    ...ticketActionsInPeriod.map((e) => ({
      source: "serviceDesk" as ModuleKey,
      ref: `ticket-event:${e.id}`,
      title: e.ticketSubject ?? `Ticket #${e.ticketId}`,
      detail: `${e.type}${e.fromValue || e.toValue ? `: ${e.fromValue ?? "?"} to ${e.toValue ?? "?"}` : ""}`,
      date: dayOf(e.at),
    })),
    ...checkinsInPeriod.map((c) => ({
      source: "goals" as ModuleKey,
      ref: `checkin:${c.id}`,
      title: c.goalTitle ?? `Goal #${c.goalId}`,
      detail: c.note ? `Check-in: ${c.note}` : "Check-in",
      date: dayOf(c.at),
    })),
    ...meetingRows.map((r) => ({ ...r, source: "meetings" as ModuleKey })),
    ...retroNoteRows.map((r) => ({ ...r, source: "retros" as ModuleKey })),
    ...careerRows.map((r) => ({ ...r, source: "career" as ModuleKey })),
    ...publishedInPeriod.map((p) => ({
      source: "playbooks" as ModuleKey,
      ref: `playbook:${p.id}`,
      title: p.title,
      detail: `Published v${p.version}`,
      date: dayOf(p.at),
    })),
    ...automationRunsInPeriod.map((r) => ({
      source: "automation" as ModuleKey,
      ref: `automation-run:${r.id}`,
      title: r.ruleName,
      detail: `${r.status} · ${r.matched} matched · ${r.acted} acted`,
      date: dayOf(r.createdAt),
    })),
    ...assistantRows.map((r) => ({ ...r, source: "assistant" as ModuleKey })),
    ...chatRows.map((r) => ({ ...r, source: "chat" as ModuleKey })),
    ...wellbeingRows.map((r) => ({ ...r, source: "wellbeing" as ModuleKey })),
    ...emailRows.map((r) => ({ ...r, source: "email" as ModuleKey })),
  ]
    .filter((r) => inPeriod(r.date, period))
    .sort((a, b) => (b.date as string).localeCompare(a.date as string) || a.ref.localeCompare(b.ref))

  const moduleRows: Array<{ key: ModuleKey; refs: string[]; minutes?: Count }> = [
    { key: "worklog", refs: entryRefs, minutes: metrics.minutes },
    { key: "tasks", refs: tasks.map((t) => `task:${t.id}`) },
    { key: "deliverables", refs: produced.map((d) => `deliverable:${d.id}`) },
    { key: "planner", refs: forward.map((p) => `plan:${p.id}`) },
    { key: "operations", refs: opsRows.map((r) => r.ref) },
    { key: "registers", refs: registerRows.map((r) => r.ref) },
    { key: "serviceDesk", refs: ticketRows.map((r) => r.ref) },
    { key: "goals", refs: goalRows.map((r) => r.ref) },
    { key: "meetings", refs: meetingRows.map((r) => r.ref) },
    { key: "retros", refs: retroRows.map((r) => r.ref) },
    { key: "career", refs: careerRows.map((r) => r.ref) },
    { key: "playbooks", refs: playbookRows.map((r) => r.ref) },
    { key: "automation", refs: automationRows.map((r) => r.ref) },
    { key: "assistant", refs: assistantRows.map((r) => r.ref) },
    { key: "chat", refs: chatRows.map((r) => r.ref) },
    { key: "gamification", refs: gamificationRows.map((r) => r.ref) },
    { key: "wellbeing", refs: wellbeingRows.map((r) => r.ref) },
    { key: "ethics", refs: ethicsRows.map((r) => r.ref) },
    { key: "email", refs: emailRows.map((r) => r.ref) },
  ]
  const byModule: SplitBucket[] = moduleRows
    .filter((m) => m.refs.length > 0)
    .map((m) => ({ key: m.key, label: MODULE_LABEL[m.key], count: countOf(m.refs), minutes: m.minutes ?? zero() }))
    .sort((a, b) => b.count.value - a.count.value || a.label.localeCompare(b.label))

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
    deliverableRows,
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
    opsRows,
    registerRows,
    ticketRows,
    goalRows,
    meetingRows,
    retroRows,
    careerRows,
    playbookRows,
    automationRows,
    assistantRows,
    chatRows,
    gamificationRows,
    wellbeingRows,
    ethicsRows,
    emailRows,
    timeline,
    byModule,
  }
}
