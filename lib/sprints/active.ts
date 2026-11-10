// One sprint is running. Four can be. Surfaces that used to ask "which sprint is active?" and get
// a single answer ask here, so the board header, the capacity meter and the dashboard strip all
// describe the same workspace.

/** The fields an active-sprint view needs; /api/sprints returns all of them on every row. */
export type SprintActivity = {
  id: number
  name: string
  status: string
  capacity: number
  totalPoints: number
  donePoints: number
  startDate: string
  endDate: string
}

/** Every sprint currently running, in the order the API sent it (newest window first). */
export function activeSprints<T extends { status: string }>(sprints: readonly T[]): T[] {
  return sprints.filter((s) => s.status === "active")
}

/** Committed points as a share of the capacity set. Reports overcommit rather than capping at 100. */
export function capacityPct(sprint: Pick<SprintActivity, "capacity" | "totalPoints">): number | null {
  // Null, not 0: an empty capacity reads as spare room the sprint never promised.
  return sprint.capacity > 0 ? Math.round((sprint.totalPoints / sprint.capacity) * 100) : null
}

/** Points done as a share of points committed. */
export function progressPct(sprint: Pick<SprintActivity, "totalPoints" | "donePoints">): number {
  return sprint.totalPoints > 0 ? Math.round((sprint.donePoints / sprint.totalPoints) * 100) : 0
}

export type ActiveSprintSummary = {
  count: number
  committed: number
  done: number
  capacity: number
  capacityPct: number | null
  overCapacity: boolean
  progressPct: number
  nextEnds: string | null
}

/** The workspace's running load, added across every active sprint. */
export function summarizeActiveSprints(sprints: readonly SprintActivity[]): ActiveSprintSummary {
  const running = activeSprints(sprints)
  const committed = running.reduce((sum, s) => sum + s.totalPoints, 0)
  const done = running.reduce((sum, s) => sum + s.donePoints, 0)
  // A sprint with no capacity contributes 0 to the denominator, so the share goes null rather
  // than inventing a promise nobody made.
  const capacity = running.reduce((sum, s) => sum + s.capacity, 0)
  const ends = running.map((s) => s.endDate).sort()

  return {
    count: running.length,
    committed,
    done,
    capacity,
    capacityPct: capacity > 0 ? Math.round((committed / capacity) * 100) : null,
    overCapacity: capacity > 0 && committed > capacity,
    progressPct: progressPct({ totalPoints: committed, donePoints: done }),
    // The binding deadline is the one that closes first, not the last.
    nextEnds: ends[0] ?? null,
  }
}

/**
 * The sprint a newly drafted card should default into. Several running is a guess that files work
 * in the wrong place, so the dialog leaves the choice open.
 */
export function defaultSprintId<T extends { id: number; status: string }>(sprints: readonly T[]): number | null {
  const running = activeSprints(sprints)
  return running.length === 1 ? running[0].id : null
}
