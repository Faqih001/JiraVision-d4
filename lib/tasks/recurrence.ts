import { type Cadence, computeNextRun } from "@/lib/cadence"

export const INSTANCE_COUNTS: Record<Cadence, number> = {
  "one-off": 0,
  daily: 30,
  weekly: 12,
  monthly: 12,
  quarterly: 8,
  yearly: 4,
}

/** How many scheduled dates a grid keeps ahead of today when a reader tops it up. */
export const HORIZON_OCCURRENCES = 7

export function computeInstanceDates(cadence: Cadence, from: Date): string[] {
  const count = INSTANCE_COUNTS[cadence]
  if (count === 0) return []
  const dates: string[] = []
  let cursor = new Date(from)
  for (let i = 0; i < count; i++) {
    dates.push(toIsoDate(cursor))
    const nextIso = computeNextRun(cadence, cursor)
    if (!nextIso) break
    cursor = new Date(nextIso)
  }
  return dates
}

export function nextInstanceDate(cadence: Cadence, after: Date): string | null {
  if (cadence === "one-off") return null
  const next = computeNextRun(cadence, after)
  return next ? next.slice(0, 10) : null
}

/**
 * The dates a grid must hold from today forward, stepping by cadence. `latestIso` is the
 * furthest date already materialised, or null when the grid is empty.
 *
 * A stale grid walks forward to the first occurrence that is today or later rather than
 * continuing where it stopped, so days nobody worked stay missing instead of arriving as rows
 * dated in the past. A missed day is a fact the member can still see; a row invented for it is
 * not.
 */
export function horizonDates(
  cadence: Cadence,
  latestIso: string | null,
  todayIso: string,
  occurrences: number = HORIZON_OCCURRENCES,
): string[] {
  if (cadence === "one-off" || occurrences <= 0) return []

  let cursor = latestIso ?? todayIso
  const step = (from: string) => {
    const onward = nextInstanceDate(cadence, new Date(from))
    return onward && onward > from ? onward : null
  }

  // The grid already holds `latestIso`, so the first date worth asking for is the one after it.
  if (latestIso) {
    const onward = step(latestIso)
    if (!onward) return []
    cursor = onward
  }

  for (let guard = 0; guard < 5000 && cursor < todayIso; guard++) {
    const onward = step(cursor)
    if (!onward) return []
    cursor = onward
  }
  if (cursor < todayIso) return []

  const dates: string[] = []
  for (let i = 0; i < occurrences; i++) {
    dates.push(cursor)
    const onward = step(cursor)
    if (!onward) break
    cursor = onward
  }
  return dates
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
