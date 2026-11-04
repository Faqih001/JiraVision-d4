// Which rows of a task's instance grid a member should see, and in what order.
//
// Kept free of the database so the ordering rule is unit-testable: the panel is the only place
// a daily schedule is worked, and it has to answer "what do I do today" before it answers
// "what comes next". Sorting the grid by date descending does the opposite — for a 30-row daily
// grid it shows the tail end of next month and buries today.

import { isCompletedTaskStatus } from "@/lib/tasks/statuses"
import { HORIZON_OCCURRENCES } from "@/lib/tasks/recurrence"

export type InstanceWindowRow = {
  instanceDate: string | null
  status: string
}

export type InstanceWindow<T extends InstanceWindowRow = InstanceWindowRow> = {
  /** Today's occurrence, when the grid holds one. This is the row the member can act on. */
  today: T | null
  /** Today first, then the coming occurrences, ascending and capped. */
  upcoming: T[]
  /** Dates before today still open. A day is owed, not redone here — the work log records it. */
  missedDates: string[]
  missedCount: number
}

/** The instance words that end a day: finished, or deliberately not worked. */
const SETTLED_STATUSES = ["skipped"]

export function isSettledInstanceStatus(status: string): boolean {
  return isCompletedTaskStatus(status) || SETTLED_STATUSES.includes(status)
}

export function planInstanceWindow<T extends InstanceWindowRow>(
  rows: readonly T[],
  todayIso: string,
  occurrences: number = HORIZON_OCCURRENCES,
): InstanceWindow<T> {
  const dated = rows.filter((row): row is T & { instanceDate: string } => typeof row.instanceDate === "string")

  const upcoming = dated
    .filter((row) => row.instanceDate >= todayIso)
    .sort((a, b) => a.instanceDate.localeCompare(b.instanceDate))
    .slice(0, Math.max(0, occurrences))

  const missedDates = dated
    .filter((row) => row.instanceDate < todayIso && !isSettledInstanceStatus(row.status))
    .map((row) => row.instanceDate)
    .sort((a, b) => a.localeCompare(b))

  return {
    today: upcoming.find((row) => row.instanceDate === todayIso) ?? null,
    upcoming,
    missedDates,
    missedCount: missedDates.length,
  }
}
