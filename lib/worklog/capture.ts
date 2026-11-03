import { db } from "@/lib/db"
import { taskEvents } from "@/drizzle/schema"
import {
  bornFinishedChanges,
  statusChanges,
  type CreatedTask,
  type StatusSnapshot,
  type TaskEventRow,
  type TaskEventSource,
} from "./task-events"

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
  return insertEvents(statusChanges(before, after, options), options.source, "transition")
}

/**
 * The birth half: call it right after a task INSERT that could have landed finished — a card
 * created in the Done column, a task POSTed with its status, a document import that carried a
 * resolved ticket. `created` is what the insert returned, so the ids are real and the status is
 * the one the row actually holds. A task that arrives as `todo` writes nothing here.
 */
export async function captureTaskBirths(
  created: readonly CreatedTask[],
  options: { actorId: number | null; source: TaskEventSource; at?: Date },
): Promise<number> {
  return insertEvents(bornFinishedChanges(created, options), options.source, "birth")
}

async function insertEvents(
  rows: TaskEventRow[],
  source: TaskEventSource,
  kind: "transition" | "birth",
): Promise<number> {
  if (rows.length === 0) return 0
  try {
    await db.insert(taskEvents).values(rows)
    return rows.length
  } catch (error) {
    console.error("[task_events] capture failed", {
      kind,
      count: rows.length,
      source,
      message: (error as Error).message,
    })
    return 0
  }
}

// Routes that mutate `tasks` but are NOT captured, and why:
//   DELETE /api/tasks/[id], DELETE /api/dashboard/tasks — task_id cascades, so a
//     deletion event deletes itself.
//   PATCH-ish status writers on kanban: /api/dashboard/kanban/update-status and /reorder
//     write the separate `kanban_tasks` table, not `tasks`. A board drag is therefore not
//     in this log. See design §4's scope correction; unifying the two boards is a decision
//     for later, not something capture can quietly paper over.
//   /api/sprints/[id] (clears sprint_id) and /api/ethical-metrics/apply-recommendation
//     (reassigns) — neither moves `status`.
//   The create routes (POST /api/tasks, /api/test/tasks, /api/dashboard/tasks,
//     /api/dashboard/kanban/tasks) and the import commit call captureTaskBirths, not
//     captureStatusChanges: a new row has no before-state, and a task that arrives finished
//     never moves again, so its birth is the only record its completion will ever have. A
//     task born as `todo` still writes no row — creation stays `tasks.created_at`.
//   lib/seed-data.ts, lib/seed/*, scripts/seed-tasks.mjs and the onboarding sample seed —
//     demo and sample rows. Their titles are invented ("MCS Server offline"), so a birth row
//     for a finished one would put fictional work on a real person's career ladder. Counted
//     nowhere, on purpose.
//   scripts/import-it-technician-*.mjs — one-off owner migrations that insert their own rows
//     in a transaction; they carry an explicit status (todo) and are restorable by id, so a
//     birth row would be a second, less faithful copy of what the script already recorded.
