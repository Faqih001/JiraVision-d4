// Server-only reads for /api/reports/work/*. One report is five scoped reads plus a pure
// aggregation, and the aggregation is where the arithmetic lives. This file's whole job is to
// hand that module rows the caller is allowed to see: every condition list starts with the
// session user id, and every read is capped, so a yearly report over a noisy account still
// returns in one round trip instead of timing out into a blank page.

import { and, desc, eq, gt, gte, lte, sql, type SQL } from "drizzle-orm"
import {
  agentPlans,
  deliverables,
  planItems,
  sprints,
  taskEvents,
  tasks,
  workLogEntries,
  workReports,
} from "@/drizzle/schema"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { localDay, rangeBoundsUtc } from "@/lib/worklog/local-day"
import { deliverableColumns, mapEntry, mapDeliverable } from "@/app/api/worklog/_shared"
import { badRequest, notFound, serverError, unauthorized } from "@/app/api/reports/_shared"
import type { DeliverableDto, EntryDto } from "@/lib/worklog/entries"
import type { TransitionDto } from "@/lib/worklog/summary"
import {
  aggregateReport,
  type ReportAggregate,
  type ReportPlanRow,
  type ReportSource,
  type ReportTaskRow,
} from "@/lib/reports/aggregate"
import { parseStoredContent, parseStoredMetrics, type ReportDto } from "@/lib/reports/report-fields"
import type { Period } from "@/lib/reports/period"

export { badRequest, notFound, serverError, unauthorized }

export const REPORT_LIST_LIMIT = 100
const ENTRY_CAP = 3000
const DELIVERABLE_CAP = 500
const EVENT_CAP = 1000
const TASK_CAP = 1000
const PLAN_ITEM_CAP = 200

export async function reportSession() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return null
  return { id: session.id, timezone: session.timezone ?? null }
}

export const reportColumns = {
  id: workReports.id,
  userId: workReports.userId,
  title: workReports.title,
  template: workReports.template,
  periodType: workReports.periodType,
  periodStart: workReports.periodStart,
  periodEnd: workReports.periodEnd,
  status: workReports.status,
  content: workReports.content,
  metrics: workReports.metrics,
  revisionOf: workReports.revisionOf,
  submittedAt: workReports.submittedAt,
  acknowledgedAt: workReports.acknowledgedAt,
  returnedNote: workReports.returnedNote,
  createdAt: workReports.createdAt,
  updatedAt: workReports.updatedAt,
} as const

type ReportDbRow = {
  id: number
  userId: number
  title: string
  template: string
  periodType: string
  periodStart: string
  periodEnd: string
  status: string
  content: unknown
  metrics: unknown
  revisionOf: number | null
  submittedAt: Date | null
  acknowledgedAt: Date | null
  returnedNote: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * Stored jsonb is parsed, not cast: a row written by a hand-run script or an older shape reads as
 * empty prose and null metrics rather than crashing the builder or inventing a section.
 */
export function mapReport(row: ReportDbRow): ReportDto {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    template: row.template as ReportDto["template"],
    periodType: row.periodType as ReportDto["periodType"],
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    status: row.status as ReportDto["status"],
    content: parseStoredContent(row.content),
    metrics: parseStoredMetrics(row.metrics),
    revisionOf: row.revisionOf,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    acknowledgedAt: row.acknowledgedAt ? row.acknowledgedAt.toISOString() : null,
    returnedNote: row.returnedNote,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    updatedAt: (row.updatedAt ?? new Date()).toISOString(),
  }
}

export async function listReports(userId: number, q: string): Promise<ReportDto[]> {
  const conditions: SQL[] = [eq(workReports.userId, userId)]
  if (q.trim()) {
    // `%` and `_` are LIKE wildcards, so a search for "100_" must not match "1001".
    const pattern = `%${q.trim().replace(/[\\%_]/gu, (c) => `\\${c}`)}%`
    conditions.push(sql`${workReports.title} ilike ${pattern}`)
  }
  const rows = await db
    .select(reportColumns)
    .from(workReports)
    .where(and(...conditions))
    .orderBy(desc(workReports.updatedAt))
    .limit(REPORT_LIST_LIMIT)
  return rows.map(mapReport)
}

/**
 * Not-found and not-mine answer the same way: a report the caller may not see is absent, and a
 * 403 would confirm that the id exists. Recipients widen this read in phase 4, not before.
 */
export async function readOwnReport(userId: number, id: number): Promise<ReportDto | null> {
  const rows = await db
    .select(reportColumns)
    .from(workReports)
    .where(and(eq(workReports.id, id), eq(workReports.userId, userId)))
    .limit(1)
  return rows.length ? mapReport(rows[0]) : null
}

export async function reportEntryRead(userId: number, period: Period): Promise<EntryDto[]> {
  const rows = await db
    .select({
      id: workLogEntries.id,
      workedOn: workLogEntries.workedOn,
      taskId: workLogEntries.taskId,
      taskTitle: tasks.title,
      kind: workLogEntries.kind,
      title: workLogEntries.title,
      body: workLogEntries.body,
      discipline: workLogEntries.discipline,
      minutes: workLogEntries.minutes,
      deliverableId: workLogEntries.deliverableId,
      playbookId: workLogEntries.playbookId,
      playbookVersion: workLogEntries.playbookVersion,
      links: workLogEntries.links,
      source: workLogEntries.source,
      redatedAt: workLogEntries.redatedAt,
      createdAt: workLogEntries.createdAt,
    })
    .from(workLogEntries)
    .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
    .where(
      and(
        eq(workLogEntries.userId, userId),
        gte(workLogEntries.workedOn, period.start),
        lte(workLogEntries.workedOn, period.end),
      ),
    )
    .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.id))
    .limit(ENTRY_CAP)
  return rows.map(mapEntry)
}

export async function reportDeliverableRead(
  userId: number,
  period: Period,
): Promise<DeliverableDto[]> {
  const rows = await db
    .select({ ...deliverableColumns, entryCount: sql<number | null>`null` })
    .from(deliverables)
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(
      and(
        eq(deliverables.ownerId, userId),
        sql`${deliverables.producedOn} is not null`,
        gte(deliverables.producedOn, period.start),
        lte(deliverables.producedOn, period.end),
      ),
    )
    .orderBy(deliverables.producedOn, deliverables.id)
    .limit(DELIVERABLE_CAP)
  return rows.map(mapDeliverable)
}

/** Everything currently awaiting review, whenever it was produced. */
export async function reportReviewRead(userId: number): Promise<DeliverableDto[]> {
  const rows = await db
    .select({ ...deliverableColumns, entryCount: sql<number | null>`null` })
    .from(deliverables)
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(and(eq(deliverables.ownerId, userId), eq(deliverables.status, "in_review")))
    .orderBy(deliverables.producedOn, deliverables.id)
    .limit(DELIVERABLE_CAP)
  return rows.map(mapDeliverable)
}

export async function reportTransitionRead(
  userId: number,
  period: Period,
  timezone: string | null,
): Promise<TransitionDto[]> {
  // The window is instants, not dates: `task_events.at` is a timestamptz and the member's
  // week has their midnight at both ends.
  const bounds = rangeBoundsUtc(period.start, period.end, timezone)
  const rows = await db
    .select({
      id: taskEvents.id,
      taskId: taskEvents.taskId,
      taskTitle: tasks.title,
      fromStatus: taskEvents.fromStatus,
      toStatus: taskEvents.toStatus,
      at: taskEvents.at,
      source: taskEvents.source,
    })
    .from(taskEvents)
    .leftJoin(tasks, eq(taskEvents.taskId, tasks.id))
    .where(
      and(
        // actor_id, not assignee: this is what the member did, and a supervisor flipping a
        // status on their task is not the member's history. Same rule as the work log summary.
        eq(taskEvents.actorId, userId),
        gte(taskEvents.at, bounds.start),
        lte(taskEvents.at, bounds.end),
      ),
    )
    .orderBy(desc(taskEvents.at))
    .limit(EVENT_CAP)
  return rows.map((row) => ({ ...row, at: row.at.toISOString() }))
}

export async function reportTaskRead(userId: number): Promise<ReportTaskRow[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      storyPoints: tasks.storyPoints,
      sprintTitle: sprints.name,
    })
    .from(tasks)
    .leftJoin(sprints, eq(tasks.sprintId, sprints.id))
    .where(eq(tasks.assigneeId, userId))
    .orderBy(desc(tasks.dueDate))
    .limit(TASK_CAP)
  return rows
}

/**
 * plan_items has no user_id. The only ownership link is the plan that created the row, so this
 * read goes through agentPlans.createdBy — and a promoted task is a `tasks` row, which is already
 * covered by reportTaskRead, so no item is counted twice.
 */
export async function reportPlanItemRead(userId: number, period: Period): Promise<ReportPlanRow[]> {
  const rows = await db
    .select({
      id: planItems.id,
      title: planItems.title,
      status: planItems.status,
      dueDate: planItems.dueDate,
      startDate: planItems.startDate,
      planTitle: agentPlans.title,
    })
    .from(planItems)
    .innerJoin(agentPlans, eq(planItems.planId, agentPlans.id))
    .where(and(eq(agentPlans.createdBy, userId), gt(planItems.dueDate, period.end)))
    .orderBy(planItems.dueDate)
    .limit(PLAN_ITEM_CAP)
  return rows
}

export async function readReportSource(
  userId: number,
  timezone: string | null,
  period: Period,
  todayIso: string,
): Promise<ReportSource> {
  const [entries, produced, awaitingReview, transitions, taskRows, planRows] = await Promise.all([
    reportEntryRead(userId, period),
    reportDeliverableRead(userId, period),
    reportReviewRead(userId),
    reportTransitionRead(userId, period, timezone),
    reportTaskRead(userId),
    reportPlanItemRead(userId, period),
  ])
  // The aggregate's deliverable list is the union of both reads: produced-in-period is the
  // section's subject, in-review-now is what `reviewRounds` counts, and they are different sets.
  const byId = new Map<number, DeliverableDto>()
  for (const row of [...produced, ...awaitingReview]) byId.set(row.id, row)
  return {
    period,
    todayIso,
    timezone,
    entries,
    deliverables: [...byId.values()],
    transitions,
    tasks: taskRows,
    planItems: planRows,
  }
}

export async function assembleReport(
  userId: number,
  timezone: string | null,
  period: Period,
): Promise<ReportAggregate> {
  const todayIso = localDay(new Date(), timezone)
  const source = await readReportSource(userId, timezone, period, todayIso)
  return aggregateReport(source)
}
