// The rows behind each career signal (design §11). A request freezes these refs, and
// the member's drill-down reads them, so the number on the meter can always be opened
// and checked. Every query is scoped by the member id and the same 90-day window as
// lib/career/counts.ts; the two modules must agree on what a signal means.

import { and, desc, eq, exists, gte, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, taskEvents, tasks, workLogEntries, workReports } from "@/drizzle/schema"
import { dayStartUtc } from "@/lib/worklog/local-day"
import { CAREER_SIGNAL_KEYS, type CareerSignalKey } from "./signals"

export const MAX_EVIDENCE_ROWS = 200

export type CareerEvidenceRow = { id: number; label: string; date: string | null }

export type SignalEvidence = { rows: CareerEvidenceRow[]; truncated: boolean }

export type CareerEvidence = Record<CareerSignalKey, SignalEvidence>

export type EvidenceWindow = {
  userId: number
  /** First day of the window, inclusive, resolved in the member's timezone. */
  startDay: string
  timeZone?: string | null
  /** Default: every signal. The drill-down asks for one. */
  keys?: readonly CareerSignalKey[]
}

const emptyEvidence = (): CareerEvidence =>
  Object.fromEntries(
    CAREER_SIGNAL_KEYS.map((key) => [key, { rows: [], truncated: false }]),
  ) as unknown as CareerEvidence

const limit = MAX_EVIDENCE_ROWS + 1

const clip = (rows: CareerEvidenceRow[]): SignalEvidence => ({
  rows: rows.slice(0, MAX_EVIDENCE_ROWS),
  truncated: rows.length > MAX_EVIDENCE_ROWS,
})

export async function collectCareerEvidence({
  userId,
  startDay,
  timeZone,
  keys = CAREER_SIGNAL_KEYS,
}: EvidenceWindow): Promise<CareerEvidence> {
  const windowStart = dayStartUtc(startDay, timeZone)
  const zone = timeZone || "UTC"
  const wanted = new Set<CareerSignalKey>(keys)
  const out = emptyEvidence()

  if (wanted.has("days_logged_90")) {
    // One representative row per logged day: the day is the evidence, not every entry.
    const rows = (await db.execute(sql`
      SELECT DISTINCT ON (worked_on)
        id,
        coalesce(nullif(title, ''), 'Work log entry') AS label,
        worked_on::text AS date
      FROM work_log_entries
      WHERE user_id = ${userId} AND worked_on >= ${startDay}
      ORDER BY worked_on DESC, id DESC
      LIMIT ${limit}
    `)) as unknown as CareerEvidenceRow[]
    out.days_logged_90 = clip(Array.from(rows))
  }

  const entryRow = {
    id: workLogEntries.id,
    label: sql<string>`coalesce(nullif(${workLogEntries.title}, ''), 'Work log entry')`,
    date: workLogEntries.workedOn,
  }

  if (wanted.has("actions_logged_90")) {
    const rows = await db
      .select(entryRow)
      .from(workLogEntries)
      .where(
        and(eq(workLogEntries.userId, userId), gte(workLogEntries.workedOn, startDay)),
      )
      .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.id))
      .limit(limit)
    out.actions_logged_90 = clip(rows)
  }

  if (wanted.has("reviews_logged_90")) {
    const rows = await db
      .select(entryRow)
      .from(workLogEntries)
      .where(
        and(
          eq(workLogEntries.userId, userId),
          gte(workLogEntries.workedOn, startDay),
          inArray(workLogEntries.kind, ["review", "deliverable"]),
        ),
      )
      .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.id))
      .limit(limit)
    out.reviews_logged_90 = clip(rows)
  }

  if (wanted.has("tasks_completed_90") || wanted.has("points_completed_90")) {
    const completionAt = sql`(select min(e.at) from task_events e
      where e.task_id = ${tasks.id} and e.to_status = 'done' and e.at >= ${windowStart})`
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        points: tasks.storyPoints,
        date: sql<string | null>`to_char(${completionAt} at time zone ${zone}, 'YYYY-MM-DD')`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          exists(
            db
              .select({ one: sql`1` })
              .from(taskEvents)
              .where(
                and(
                  eq(taskEvents.taskId, tasks.id),
                  eq(taskEvents.toStatus, "done"),
                  gte(taskEvents.at, windowStart),
                ),
              ),
          ),
        ),
      )
      .orderBy(desc(tasks.id))
      .limit(limit)

    out.tasks_completed_90 = clip(
      rows.map((row) => ({ id: row.id, label: row.title, date: row.date })),
    )
    out.points_completed_90 = clip(
      rows.map((row) => ({
        id: row.id,
        label: `${row.title} (${row.points ?? 0} pts)`,
        date: row.date,
      })),
    )
  }

  if (wanted.has("disciplines_touched")) {
    const rows = await db
      .select({
        id: sql<number>`min(${tasks.id})::int`,
        label: tasks.discipline,
        date: sql<string | null>`null::text`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          isNotNull(tasks.discipline),
          exists(
            db
              .select({ one: sql`1` })
              .from(taskEvents)
              .where(and(eq(taskEvents.taskId, tasks.id), gte(taskEvents.at, windowStart))),
          ),
        ),
      )
      .groupBy(tasks.discipline)
      .orderBy(tasks.discipline)
      .limit(limit)
    out.disciplines_touched = clip(
      rows.map((row) => ({
        id: row.id,
        label: String(row.label ?? "Unclassified"),
        date: row.date,
      })),
    )
  }

  if (wanted.has("deliverables_delivered")) {
    const rows = await db
      .select({ id: deliverables.id, label: deliverables.name, date: deliverables.producedOn })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.ownerId, userId),
          eq(deliverables.status, "delivered"),
          isNotNull(deliverables.producedOn),
          gte(deliverables.producedOn, startDay),
        ),
      )
      .orderBy(desc(deliverables.producedOn), desc(deliverables.id))
      .limit(limit)
    out.deliverables_delivered = clip(rows)
  }

  if (wanted.has("reports_submitted")) {
    const rows = await db
      .select({
        id: workReports.id,
        label: workReports.title,
        date: sql<string | null>`to_char(${workReports.submittedAt} at time zone ${zone}, 'YYYY-MM-DD')`,
      })
      .from(workReports)
      .where(
        and(
          eq(workReports.userId, userId),
          inArray(workReports.status, ["submitted", "acknowledged"]),
          isNotNull(workReports.submittedAt),
          gte(workReports.submittedAt, windowStart),
        ),
      )
      .orderBy(desc(workReports.submittedAt), desc(workReports.id))
      .limit(limit)
    out.reports_submitted = clip(rows)
  }

  if (wanted.has("plan_items_promoted")) {
    // One row per promoted task: task_events is the only record of who promoted it.
    const rows = (await db.execute(sql`
      SELECT t.id,
             t.title AS label,
             to_char(min(e.at) AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS date
      FROM task_events e
      JOIN tasks t ON t.id = e.task_id
      WHERE e.actor_id = ${userId}
        AND e.source = 'promote'
        AND t.source_plan_id IS NOT NULL
        AND e.at >= ${windowStart}
      GROUP BY t.id, t.title
      ORDER BY t.id DESC
      LIMIT ${limit}
    `)) as unknown as CareerEvidenceRow[]
    out.plan_items_promoted = clip(Array.from(rows))
  }

  return out
}
