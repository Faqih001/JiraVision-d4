// The only place career signals are counted (design §11). Counts are derived from rows
// the member already authored; nothing here is typed in by hand and nothing is cached.
// Kept apart from lib/career/signals.ts and lib/career/readiness.ts so those stay
// DB-free and unit-testable.

import { and, eq, exists, gte, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  deliverables,
  taskEvents,
  tasks,
  workLogEntries,
  workReports,
} from "@/drizzle/schema"
import { dayStartUtc } from "@/lib/worklog/local-day"
import { normaliseSignals, type CareerSignals } from "./signals"

export type CareerSignalWindow = {
  userId: number
  /** First day of the window, inclusive, resolved in the member's timezone. */
  startDay: string
  timeZone?: string | null
}

/**
 * Nine windowed counts, all scoped by the member id. A missing row set yields 0, never
 * null: a signal nobody has recorded is missing evidence, which is what the meter shows.
 */
export async function countCareerSignals({
  userId,
  startDay,
  timeZone,
}: CareerSignalWindow): Promise<CareerSignals> {
  const windowStart = dayStartUtc(startDay, timeZone)

  const [log] = await db
    .select({
      days: sql<number>`count(distinct ${workLogEntries.workedOn})::int`,
      actions: sql<number>`count(*)::int`,
      reviews: sql<number>`(count(*) filter (where ${workLogEntries.kind} in ('review', 'deliverable')))::int`,
    })
    .from(workLogEntries)
    .where(and(eq(workLogEntries.userId, userId), gte(workLogEntries.workedOn, startDay)))

  // Distinct tasks, not rows: a task reopened and finished twice is one completion.
  const [completed] = await db
    .select({
      tasks: sql<number>`count(*)::int`,
      points: sql<number>`coalesce(sum(${tasks.storyPoints}), 0)::int`,
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

  const [disciplines] = await db
    .select({ touched: sql<number>`count(distinct ${tasks.discipline})::int` })
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

  const [delivered] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(deliverables)
    .where(
      and(
        eq(deliverables.ownerId, userId),
        eq(deliverables.status, "delivered"),
        isNotNull(deliverables.producedOn),
        gte(deliverables.producedOn, startDay),
      ),
    )

  const [reports] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(workReports)
    .where(
      and(
        eq(workReports.userId, userId),
        inArray(workReports.status, ["submitted", "acknowledged"]),
        isNotNull(workReports.submittedAt),
        gte(workReports.submittedAt, windowStart),
      ),
    )

  // The promote route writes task_events(source='promote', actor_id=<member>), which is
  // the only record of who promoted a plan item — tasks carry no creator column.
  const [promoted] = await db
    .select({ n: sql<number>`count(distinct ${tasks.id})::int` })
    .from(taskEvents)
    .innerJoin(tasks, eq(tasks.id, taskEvents.taskId))
    .where(
      and(
        eq(taskEvents.actorId, userId),
        eq(taskEvents.source, "promote"),
        isNotNull(tasks.sourcePlanId),
        gte(taskEvents.at, windowStart),
      ),
    )

  return normaliseSignals({
    days_logged_90: log?.days,
    actions_logged_90: log?.actions,
    reviews_logged_90: log?.reviews,
    tasks_completed_90: completed?.tasks,
    points_completed_90: completed?.points,
    deliverables_delivered: delivered?.n,
    reports_submitted: reports?.n,
    disciplines_touched: disciplines?.touched,
    plan_items_promoted: promoted?.n,
  })
}
