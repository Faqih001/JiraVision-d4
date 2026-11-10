// The SQL half of "which day was this finished". `lib/tasks/completed-on.ts` holds the same rule
// in plain functions; this file exists so a Done column can be narrowed where the rows are counted
// rather than after they are fetched.
//
// Filtering after the read cannot work: the board asks for one page of 200 rows newest-edited
// first, and an unbounded pile of all-time history eats that budget before today's work arrives.
// So the window is a WHERE clause, and the row budget goes to the cards the member asked to see.
//
// What the window may speak about is one kind of row: a finished one-off. A schedule's card on the
// board is the occurrence dated the day being drawn, which is already day-scoped, and an open card
// is outstanding work whatever day it has been sitting since. Neither is ever hidden by this rule.

import { and, inArray, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { taskEvents, tasks } from "@/drizzle/schema"
import { completedStatusListSql, completedStatusSql } from "@/lib/tasks/statuses-sql"

export type DoneWindowBounds = {
  /** Inclusive lower instant. Null opens the past — the `all` window. */
  from: Date | null
  /** Exclusive upper instant: the member's midnight after the day being drawn. */
  to: Date
}

/**
 * The last time this task was moved into a finished word.
 *
 * `task_events` is written by lib/worklog/capture.ts on every transition, so it is the only column
 * pair that answers "finished when" honestly. The aggregate form is shared with `finishEventsFor`
 * below so the filter and the value it filters on cannot drift apart.
 */
function latestFinishEventSql(): SQL {
  return sql`(select max(${taskEvents.at}) from ${taskEvents} where ${taskEvents.taskId} = ${tasks.id} and ${taskEvents.toStatus} in (${completedStatusListSql()}))`
}

/**
 * When this card finished: its last finish event, else the row's own clock.
 *
 * Imported history arrives already finished and never moves, so it has no event to read. Those rows
 * fall back to `updated_at` and then `created_at`, which means a later edit can move their day —
 * the one concession in this file, and the reason the UI labels a count rather than a fact.
 */
function completedInstantSql(): SQL {
  return sql`coalesce(${latestFinishEventSql()}, ${tasks.updatedAt}, ${tasks.createdAt})`
}

/** A card that is finished and is not a schedule — the only kind a window can hide. */
function finishedOneOffSql(): SQL {
  return sql`(${completedStatusSql(tasks.status)} and (${tasks.cadence} is null or ${tasks.cadence} = 'one-off'))`
}

/**
 * Keep everything the window has no opinion about, and the finished one-offs that finished inside
 * it. A finish nobody can date (no event, no timestamps) is kept: an undatable card is not a card
 * to hide.
 */
export function doneWindowSql(bounds: DoneWindowBounds): SQL {
  const instant = completedInstantSql()
  const inside = bounds.from
    ? sql`(${instant} >= ${bounds.from} and ${instant} < ${bounds.to})`
    : sql`${instant} < ${bounds.to}`
  return sql`(${finishedOneOffSql()} and ${instant} is not null and not ${inside} or true)`
}

/**
 * The finished one-offs that sit before the window — the count behind "31 done earlier".
 * Null for `all`, which is the window that hides nothing and so has nothing to name.
 */
export function doneEarlierSql(bounds: DoneWindowBounds): SQL | null {
  if (!bounds.from) return null
  return sql`(${finishedOneOffSql()} and ${completedInstantSql()} < ${bounds.from})`
}

/**
 * Each row's last finish event, for the rows on one page, in a single grouped read.
 *
 * A row absent from the map has no event — the caller falls back to the row's clock, which is the
 * same `coalesce` `completedInstantSql` applies in SQL.
 */
export async function finishEventsFor(taskIds: readonly number[]): Promise<Map<number, Date>> {
  if (taskIds.length === 0) return new Map()
  const rows = await db
    .select({ taskId: taskEvents.taskId, at: sql`max(${taskEvents.at})` })
    .from(taskEvents)
    .where(and(inArray(taskEvents.taskId, [...taskIds]), completedStatusSql(taskEvents.toStatus)))
    .groupBy(taskEvents.taskId)
  const out = new Map<number, Date>()
  for (const row of rows) {
    const at = row.at as unknown
    if (at instanceof Date) out.set(row.taskId, at)
    else if (typeof at === "string") {
      const parsed = new Date(at)
      if (!Number.isNaN(parsed.getTime())) out.set(row.taskId, parsed)
    }
  }
  return out
}
