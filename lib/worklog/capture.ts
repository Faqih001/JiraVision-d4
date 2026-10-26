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

// Routes that mutate `tasks` but are NOT captured, and why:
//   POST /api/tasks, POST /api/dashboard/tasks, POST /api/dashboard/kanban/tasks —
//     they create rows; creation is `tasks.created_at`, already a real column.
//   DELETE /api/tasks/[id], DELETE /api/dashboard/tasks — task_id cascades, so a
//     deletion event deletes itself.
//   PATCH-ish status writers on kanban: /api/dashboard/kanban/update-status and /reorder
//     write the separate `kanban_tasks` table, not `tasks`. A board drag is therefore not
//     in this log. See design §4's scope correction; unifying the two boards is a decision
//     for later, not something capture can quietly paper over.
//   /api/sprints/[id] (clears sprint_id) and /api/ethical-metrics/apply-recommendation
//     (reassigns) — neither moves `status`.
//   lib/seed-data.ts — demo rows; a seeded task's creation is its created_at like any other.
