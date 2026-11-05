// The one home for "this task is finished". `tasks.status` is a free varchar(50) with no
// whitelist, so a finished task can arrive as `done` from the board, `completed` from a seed
// or an import, or `closed` from a migration. Anything that has to agree about completion
// reads this list: the report bucket in lib/reports/aggregate.ts and both career readers.
// A reader that hardcodes one literal silently drops the work of every member whose rows
// arrived under another word.

import { isCadence } from "@/lib/cadence"

export const COMPLETED_TASK_STATUSES = ["done", "completed", "closed"] as const

export type CompletedTaskStatus = (typeof COMPLETED_TASK_STATUSES)[number]

/** Case- and whitespace-tolerant, because the column is free text. */
export function isCompletedTaskStatus(
  value: string | null | undefined,
): value is CompletedTaskStatus {
  const normalised = (value ?? "").trim().toLowerCase()
  return (COMPLETED_TASK_STATUSES as readonly string[]).includes(normalised)
}

/**
 * The statuses a create-or-edit form may offer for a given cadence.
 *
 * A cadence other than one-off makes the row a template, and `recurringStatusError` refuses a
 * finished status on one — so a form that offers "Done" alongside "Daily" is offering a choice
 * its own writer will reject. Both create dialogs read this instead of deciding separately,
 * because the two have to agree: a card made on the board and the same card edited on the tasks
 * page are the same row.
 *
 * `vocabulary` is passed in rather than imported: the five board words live in a client
 * component, and this module stays free of UI.
 */
export function creatableStatusesFor(
  cadence: string | null | undefined,
  vocabulary: readonly string[],
): string[] {
  if (!isCadence(cadence) || cadence === "one-off") return [...vocabulary]
  return vocabulary.filter((status) => !isCompletedTaskStatus(status))
}

/**
 * The status a create form holds when the member changes the cadence.
 *
 * Flipping a card to a schedule can strand its status: "Daily + Done" is a template the writer
 * refuses, so the form moves the pick to the first state a template can actually hold rather
 * than letting the member discover the 409 after they press save.
 */
export function statusAfterCadenceChange(
  cadence: string | null | undefined,
  current: string,
  vocabulary: readonly string[],
): string {
  return creatableStatusesFor(cadence, vocabulary).includes(current) ? current : "todo"
}
