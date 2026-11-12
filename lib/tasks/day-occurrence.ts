// The occurrence a board draws for one day. A schedule is not work anybody can finish — its
// occurrences are — so a board that buckets by the day reads the row dated that day and leaves
// the row in `tasks` alone.
//
// Two days are in play, and keeping them apart is the whole point of this file:
//   `dayIso`   — the day being looked at. It only ever appears in a SELECT.
//   `topUpIso` — the member's real today. It is the only anchor a grid may grow from.
// If the browsed day became the anchor, paging forward to December would fabricate weeks of
// occurrences. Looking behind today writes nothing at all: a forward-walking horizon cannot
// birth a past row, so the top-up would be pure write traffic on a look back.
//
// The top-up is a write inside a read, so three bounds hold it down: only schedules whose
// assignee the caller may write for, at most DAY_TOP_UP_LIMIT of them per request, and at most
// HORIZON_OCCURRENCES rows each. Awaited serially, because the per-task coverage check is what
// keeps the common path to one cheap SELECT. Swallowed on failure: a board that cannot grow a
// grid still shows the rows already there.

import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { taskInstances } from "@/drizzle/schema"
import { isCadence } from "@/lib/cadence"
import { ensureInstanceHorizon } from "@/lib/data-access-task-instances"

/** How many schedules one read may top up. Mirrors the calendar route's HORIZON_TASK_LIMIT. */
export const DAY_TOP_UP_LIMIT = 25

export type DayOccurrence = { id: number; status: string }

type ScheduleRow = { id: number; cadence: string | null; assigneeId: number | null }

/** True for a task row that describes a schedule rather than a single piece of work. */
export function isScheduleRow(row: { cadence?: string | null }): boolean {
  return isCadence(row.cadence) && row.cadence !== "one-off"
}

async function readRowsFor(taskIds: number[], dayIso: string): Promise<Map<number, DayOccurrence>> {
  if (taskIds.length === 0) return new Map()
  const rows = await db
    .select({ taskId: taskInstances.taskId, id: taskInstances.id, status: taskInstances.status })
    .from(taskInstances)
    .where(and(eq(taskInstances.instanceDate, dayIso), inArray(taskInstances.taskId, taskIds)))
  const out = new Map<number, DayOccurrence>()
  for (const row of rows) {
    // One row per (task, date) is enforced by idx_task_instances_task_date, so the first wins
    // only if that index is ever absent.
    if (!out.has(row.taskId)) out.set(row.taskId, { id: row.id, status: row.status })
  }
  return out
}

/**
 * The occurrence dated `dayIso` for each schedule in `rows`, keyed by task id. A schedule with
 * no row for that day is absent from the map — that is the answer, not a failure: a weekly
 * schedule read on the wrong day simply is not due, and the caller decides whether to hide it
 * or say so.
 *
 * `writableAssigneeIds` is the set of members whose grids this caller may grow. A schedule
 * assigned outside it is still read, never written. `topUpIso` is the member's real today and
 * must never be the browsed day.
 */
export async function occurrencesForDay(
  rows: ScheduleRow[],
  dayIso: string,
  writableAssigneeIds: number[],
  topUpIso: string,
): Promise<Map<number, DayOccurrence>> {
  const schedules = rows.filter(isScheduleRow)
  if (schedules.length === 0) return new Map()

  // This read may not fail quietly. An empty Map draws every schedule card with no day state, so a
  // daily finished this morning reappears as To do and nothing on screen says the query never ran.
  // It sits outside the top-up's try because only the top-up is best-effort: losing the grid growth
  // costs one day's card, losing this read costs the whole board.
  const found = await readRowsFor(
    schedules.map((s) => s.id),
    dayIso,
  )

  if (dayIso < topUpIso) return found

  try {
    const writable = new Set(writableAssigneeIds)
    const missing = schedules
      .filter((s) => !found.has(s.id) && s.assigneeId !== null && writable.has(s.assigneeId))
      .sort((a, b) => a.id - b.id)

    const batch = missing.slice(0, DAY_TOP_UP_LIMIT)
    if (missing.length > batch.length) {
      console.log(`[task_instances] board horizon deferred: ${missing.length - batch.length} schedules`)
    }
    if (batch.length === 0) return found

    for (const schedule of batch) {
      if (!isCadence(schedule.cadence)) continue
      await ensureInstanceHorizon(schedule.id, schedule.cadence, topUpIso)
    }

    const grown = await readRowsFor(
      batch.map((s) => s.id),
      dayIso,
    )
    for (const [taskId, occurrence] of grown) found.set(taskId, occurrence)
    return found
  } catch (error) {
    console.error("[task_instances] board horizon top-up failed:", error)
    return found
  }
}