// The work log and the task-instance grid are two records of one fact: on this day this task
// was worked on. Logging therefore marks that task+day done, and un-logging releases it — but
// only when no other row covers the same task and day, because a second person's log (or your
// own second entry) is just as much evidence.
//
// What it never does: write or clear `notes`/`checklist_responses`, which a human may have
// typed on the instance row, and revert an instance the member marked `skipped` themselves.
// Nor does it materialise rows for a one-off task: those have no grid, and their completion
// is the task's own status.

import { and, count, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import * as schema from "@/drizzle/schema"
import { taskInstances, tasks, workLogEntries } from "@/drizzle/schema"

/** Either the pool or an open transaction — the writes below must join the caller's atomic unit. */
export type WorklogClient = PostgresJsDatabase<typeof schema>

export type LoggedDay = { taskId: number | null; workedOn: string }

/** A log row that names a task — the only kind that can be evidence for an instance. */
export type TaskDay = { taskId: number; workedOn: string }

/** The task+day pairs in `rows` that still name a task; a log with no task materialises nothing. */
export function loggedDays(rows: readonly LoggedDay[]): TaskDay[] {
  return rows.filter((row): row is TaskDay => row.taskId !== null)
}

export async function markInstancesLogged(
  client: WorklogClient,
  userId: number,
  rows: readonly LoggedDay[],
  at = new Date(),
): Promise<number> {
  let marked = 0
  for (const row of loggedDays(rows)) {
    const [task] = await client
      .select({ cadence: tasks.cadence })
      .from(tasks)
      .where(eq(tasks.id, row.taskId))
      .limit(1)
    if (!task?.cadence || task.cadence === "one-off") continue

    const touched = await client
      .insert(taskInstances)
      .values({
        taskId: row.taskId,
        instanceDate: row.workedOn,
        status: "done",
        completedAt: at,
        completedBy: userId,
      })
      .onConflictDoUpdate({
        target: [taskInstances.taskId, taskInstances.instanceDate],
        set: { status: "done", completedAt: at, completedBy: userId },
      })
      .returning({ id: taskInstances.id })
    if (touched.length > 0) marked += 1
  }
  return marked
}

/**
 * Give the day's instance back to the grid when the last log covering it is gone. Returns the
 * pairs actually reverted, so a caller can report that it undid something on the member's behalf.
 */
export async function releaseInstancesUnlogged(
  client: WorklogClient,
  rows: readonly LoggedDay[],
): Promise<LoggedDay[]> {
  const released: LoggedDay[] = []
  for (const row of loggedDays(rows)) {
    const [still] = await client
      .select({ n: count() })
      .from(workLogEntries)
      .where(and(eq(workLogEntries.taskId, row.taskId), eq(workLogEntries.workedOn, row.workedOn)))
    if ((still?.n ?? 0) > 0) continue

    const reverted = await client
      .update(taskInstances)
      .set({ status: "todo", completedAt: null, completedBy: null })
      .where(
        and(
          eq(taskInstances.taskId, row.taskId),
          eq(taskInstances.instanceDate, row.workedOn),
          eq(taskInstances.status, "done"),
        ),
      )
      .returning({ id: taskInstances.id })
    if (reverted.length > 0) released.push(row)
  }
  return released
}
