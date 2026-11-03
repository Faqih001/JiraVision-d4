// The one home for "this task is finished". `tasks.status` is a free varchar(50) with no
// whitelist, so a finished task can arrive as `done` from the board, `completed` from a seed
// or an import, or `closed` from a migration. Anything that has to agree about completion
// reads this list: the report bucket in lib/reports/aggregate.ts and both career readers.
// A reader that hardcodes one literal silently drops the work of every member whose rows
// arrived under another word.

export const COMPLETED_TASK_STATUSES = ["done", "completed", "closed"] as const

export type CompletedTaskStatus = (typeof COMPLETED_TASK_STATUSES)[number]

/** Case- and whitespace-tolerant, because the column is free text. */
export function isCompletedTaskStatus(
  value: string | null | undefined,
): value is CompletedTaskStatus {
  const normalised = (value ?? "").trim().toLowerCase()
  return (COMPLETED_TASK_STATUSES as readonly string[]).includes(normalised)
}
