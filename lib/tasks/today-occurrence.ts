// Today's occurrence of a schedule, for boards that bucket by the day rather than by the
// template. A schedule is not work anybody can finish — its occurrences are — so a board that
// has to show "the daily task, in To do, every morning, done once" reads the row dated today
// and leaves the row in `tasks` alone.
//
// The read tops a grid up when today's row is missing, because a grid that ran out would
// otherwise hide a schedule that is still running. That is a write inside a read, so the same
// three bounds the calendar uses hold it down: only schedules whose assignee the caller may
// write for, at most TODAY_TOP_UP_LIMIT of them per request, and at most HORIZON_OCCURRENCES
// rows each. Awaited serially, because the per-task coverage check is what keeps the common
// path to one cheap SELECT. Swallowed on failure: a board that cannot grow a grid still shows
// the rows already there.

import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { taskInstances } from "@/drizzle/schema"
import { isCadence } from "@/lib/cadence"
import { ensureInstanceHorizon } from "@/lib/data-access-task-instances"

/** How many schedules one read may top up. Mirrors the calendar route's HORIZON_TASK_LIMIT. */
export const TODAY_TOP_UP_LIMIT = 25

export type TodayOccurrence = { id: number; status: string }

type ScheduleRow = { id: number; cadence: string | null; assigneeId: number | null }

/** True for a task row that describes a schedule rather than a single piece of work. */
export function isScheduleRow(row: { cadence?: string | null }): boolean {
  return isCadence(row.cadence) && row.cadence !== "one-off"
}

async function readRowsFor(taskIds: number[], todayIso: string): Promise<Map<number, TodayOccurrence>> {
  if (taskIds.length === 0) return new Map()
  const rows = await db
    .select({ taskId: taskInstances.taskId, id: taskInstances.id, status: taskInstances.status })
    .from(taskInstances)
    .where(and(eq(taskInstances.instanceDate, todayIso), inArray(taskInstances.taskId, taskIds)))
  const out = new Map<number, TodayOccurrence>()
  for (const row of rows) {
    // One row per (task, date) is enforced by idx_task_instances_task_date, so the first wins
    // only if that index is ever absent.
    if (!out.has(row.taskId)) out.set(row.taskId, { id: row.id, status: row.status })
  }
  return out
}

/**
 * Today's occurrence for each schedule in `rows`, keyed by task id. A schedule with no row for
 * today is absent from the map — that is the answer, not a failure: a weekly schedule read on
 * the wrong day simply is not due, and the caller decides whether to hide it or say so.
 *
 * `writableAssigneeIds` is the set of members whose grids this caller may grow. A schedule
 * assigned outside it is still read, never written.
 */
export async function todayOccurrencesFor(
  rows: ScheduleRow[],
  todayIso: string,
  writableAssigneeIds: number[],
): Promise<Map<number, TodayOccurrence>> {
  const schedules = rows.filter(isScheduleRow)
  if (schedules.length === 0) return new Map()

  try {
    const found = await readRowsFor(
      schedules.map((s) => s.id),
      todayIso,
    )

    const writable = new Set(writableAssigneeIds)
    const missing = schedules
      .filter((s) => !found.has(s.id) && s.assigneeId !== null && writable.has(s.assigneeId))
      .sort((a, b) => a.id - b.id)

    const batch = missing.slice(0, TODAY_TOP_UP_LIMIT)
    if (missing.length > batch.length) {
      console.log(`[task_instances] board horizon deferred: ${missing.length - batch.length} schedules`)
    }

    for (const schedule of batch) {
      if (!isCadence(schedule.cadence)) continue
      await ensureInstanceHorizon(schedule.id, schedule.cadence, todayIso)
    }

    if (batch.length === 0) return found
    const grown = await readRowsFor(
      batch.map((s) => s.id),
      todayIso,
    )
    for (const [taskId, occurrence] of grown) found.set(taskId, occurrence)
    return found
  } catch (error) {
    console.error("[task_instances] board occurrence read failed:", error)
    return new Map()
  }
}
