import { CADENCE_DAYS, type Cadence, computeNextRun } from "@/lib/cadence"

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

/** The most occurrences one read may ask one schedule to materialise in a single request. */
export const MAX_HORIZON_OCCURRENCES = 90

/** A `YYYY-MM-DD` string as UTC midnight, or null when it is not a real date. */
function dayMs(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const ms = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(ms) ? null : ms
}

/**
 * How many scheduled dates a grid needs to reach the end of the window a reader is about to
 * draw, so a month view shows a month of occurrences instead of the seven rows the standing
 * horizon keeps.
 *
 * The window is measured in whole days between two calendar dates, never between two `Date`
 * instants: both operands are plain dates, so a viewer in Auckland and a viewer in Lagos get
 * the count their own grid has to cover, not an hour of drift.
 */
export function horizonOccurrencesForWindow(
  cadence: Cadence,
  todayIso: string,
  endDateIso: string | null | undefined,
): number {
  const days = CADENCE_DAYS[cadence]
  if (days === null) return HORIZON_OCCURRENCES

  const today = dayMs(todayIso)
  const end = dayMs(endDateIso)
  if (today === null || end === null) return HORIZON_OCCURRENCES

  const span = Math.round((end - today) / 86_400_000)
  // A window that closed in the past still gets the row for its own day rather than zero,
  // which `horizonDates` would read as "ask for nothing".
  if (span < 0) return 1

  return Math.min(MAX_HORIZON_OCCURRENCES, Math.ceil(span / days) + 1)
}

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
