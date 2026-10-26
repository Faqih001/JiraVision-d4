import { db } from "@/lib/db"
import { taskEvents } from "@/drizzle/schema"
import { statusChanges, type StatusSnapshot, type TaskEventSource } from "./task-events"

/**
 * The write half of task capture. Call it immediately after a task mutation and before any
 * notification, so an event exists even when no one is notified (the notify branches in
 * the task routes all require a different assignee, and the log must not depend on that).
 *
 * A capture failure never fails the user's save: losing one event is better than losing
 * their edit. It is logged loudly rather than swallowed, because a silently empty
 * task_events table would make every report in this product quietly wrong.
 *
 * This module imports the database, so no unit test may import it — the rule it applies is
 * tested pure in tests/unit/worklog-capture.test.ts.
 */
export async function captureStatusChanges(
  before: readonly StatusSnapshot[],
  after: readonly StatusSnapshot[],
  options: { actorId: number | null; source: TaskEventSource; at?: Date },
): Promise<number> {
  const rows = statusChanges(before, after, options)
  if (rows.length === 0) return 0
  try {
    await db.insert(taskEvents).values(rows)
    return rows.length
  } catch (error) {
    console.error("[task_events] capture failed", {
      count: rows.length,
      source: options.source,
      message: (error as Error).message,
    })
    return 0
  }
}
