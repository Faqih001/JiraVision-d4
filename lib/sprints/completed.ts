/** The live task totals for one sprint, as the sprint reads already compute them. */
export type SprintTally = { donePoints: number; taskCount: number }

/**
 * `sprints.completed` is a stored column whose only writer is the sprint's own PUT — moving a card
 * to Done never touches it, so a sprint worked in without being edited still reports the points it
 * was created with. The column does earn its keep for imported history: a spreadsheet sprint
 * arrives with a closed total and no task rows, so there is nothing to measure. The difference is
 * whether task rows exist: measure them if they do, quote the record if they do not.
 */
export function reportedCompleted(stored: number, tally: SprintTally): number {
  return tally.taskCount > 0 ? tally.donePoints : stored
}
