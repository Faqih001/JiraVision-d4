// The rule half of task capture: given the before and after rows of a task write, which
// status transitions are worth a permanent event? Pure on purpose — see the note in
// tests/unit/worklog-capture.test.ts for why the writer lives elsewhere.

export const TASK_EVENT_SOURCES = ["route", "bulk", "promote", "agent"] as const
export type TaskEventSource = (typeof TASK_EVENT_SOURCES)[number]

export function isTaskEventSource(value: unknown): value is TaskEventSource {
  return typeof value === "string" && (TASK_EVENT_SOURCES as readonly string[]).includes(value)
}

/** The narrowest thing a task row can be read as for this rule. */
export type StatusSnapshot = { id: number; status: string | null | undefined }

export type TaskEventRow = {
  taskId: number
  actorId: number | null
  fromStatus: string
  toStatus: string
  at: Date
  source: TaskEventSource
}

/**
 * One row per task whose status actually moved. A task with no before row is a creation,
 * and creation is already recorded honestly by `tasks.created_at`; a task with no after
 * row means the write matched nothing, so inventing a transition would be worse than
 * writing no row. `at` is taken once so a bulk write lands on one instant.
 */
export function statusChanges(
  before: readonly StatusSnapshot[],
  after: readonly StatusSnapshot[],
  options: { actorId: number | null; source: TaskEventSource; at?: Date },
): TaskEventRow[] {
  if (before.length === 0 || after.length === 0) return []

  const at = options.at ?? new Date()
  const beforeById = new Map<number, string>()
  for (const row of before) beforeById.set(row.id, row.status ?? "")

  const rows: TaskEventRow[] = []
  for (const row of after) {
    const fromStatus = beforeById.get(row.id)
    if (fromStatus === undefined) continue
    const toStatus = row.status ?? ""
    if (fromStatus === toStatus) continue
    rows.push({
      taskId: row.id,
      actorId: options.actorId,
      fromStatus,
      toStatus,
      at,
      source: options.source,
    })
  }
  return rows
}
