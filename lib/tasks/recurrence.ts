import { CADENCE_DAYS, type Cadence, computeNextRun } from "@/lib/cadence"
import { shiftDays } from "@/lib/worklog/local-day"
import { fromIsoDate, isWeekend } from "@/lib/working-days"

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

/** True when a `YYYY-MM-DD` day falls on a Saturday or a Sunday. */
export function isWeekendDay(dayIso: string): boolean {
  const day = fromIsoDate(dayIso)
  return day !== null && isWeekend(day)
}

/**
 * The working day an occurrence is actually done on: the date itself when it is Monday–Friday,
 * otherwise the following Monday. An occurrence is never dropped and never pulled earlier — the
 * office simply does not open at the weekend, so `daily` steps Friday → Monday and a weekly
 * schedule dated a Saturday is worked on the Monday instead.
 *
 * The rolled day becomes the grid's next anchor, because a grid stores only the day it wrote and
 * the original date is not recoverable from it. A weekly anchor therefore settles on the Monday
 * it moved to, and a monthly one can shift a day when its date lands on a weekend. That is the
 * same one-way behaviour `computeNextRun` already has for a 31st (Jan 31 → Mar 3); holding the
 * true anchor would need a column the schema does not have.
 *
 * Deliberately not in `computeNextRun`: that function also drives `report_schedules.next_run_at`,
 * whose existing rows were produced without a weekend rule, and its own comment warns that a
 * change there would shift live schedules.
 */
export function workingDayOnOrAfter(dayIso: string): string {
  let cursor = dayIso
  // Saturday needs one step and Sunday two; the third iteration is a guard, not a case.
  for (let i = 0; i < 3 && isWeekendDay(cursor); i++) cursor = shiftDays(cursor, 1)
  return cursor
}

/**
 * How many scheduled dates a grid needs to reach the end of the window a reader is about to
 * draw, so a month view shows a month of occurrences instead of the seven rows the standing
 * horizon keeps.
 *
 * The window is measured in whole days between two calendar dates, never between two `Date`
 * instants: both operands are plain dates, so a viewer in Auckland and a viewer in Lagos get
 * the count their own grid has to cover, not an hour of drift.
 *
 * The count is deliberately generous for a `daily` grid, which now skips weekends and so needs
 * about five rows per seven days rather than seven. Asking for more than the window holds costs
 * nothing — `ensureInstanceHorizon` only writes the shortfall it is given, and a longer grid
 * simply reaches further ahead.
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

/**
 * The day a `YYYY-MM-DD` value names, also accepting the timestamp form a client form sends.
 * Null when it names no real day, so a malformed date can never act as a rule.
 */
function capDay(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const iso = value.slice(0, 10)
  return dayMs(iso) === null ? null : iso
}

/**
 * The last day a series is allowed to occupy, or null when nothing caps it.
 *
 * A due date means "the series runs until here" — but only when it is not already behind the day
 * the series starts from. Honoring a date behind that day would either birth a schedule with no
 * occurrences at all, or switch off a running one because someone left an old due date on it.
 * Either way the member sees a schedule that quietly stopped existing, so the stale date is
 * ignored and the standing horizon applies.
 */
function seriesCap(endDateIso: string | null | undefined, fromIso: string): string | null {
  const cap = capDay(endDateIso)
  return cap !== null && cap >= fromIso ? cap : null
}

export function computeInstanceDates(
  cadence: Cadence,
  from: Date,
  endDateIso: string | null = null,
): string[] {
  const count = INSTANCE_COUNTS[cadence]
  if (count === 0) return []
  const dates: string[] = []
  // The first day of a grid is worked too, so a schedule created on a Saturday starts on Monday.
  let cursor = workingDayOnOrAfter(toIsoDate(from))
  const cap = seriesCap(endDateIso, cursor)
  for (let i = 0; i < count; i++) {
    if (cap !== null && cursor > cap) break
    dates.push(cursor)
    const onward = nextInstanceDate(cadence, new Date(`${cursor}T00:00:00Z`))
    if (!onward) break
    cursor = onward
  }
  return dates
}

export function nextInstanceDate(cadence: Cadence, after: Date): string | null {
  if (cadence === "one-off") return null
  const next = computeNextRun(cadence, after)
  return next ? workingDayOnOrAfter(next.slice(0, 10)) : null
}

/**
 * The dates a grid must hold from today forward, stepping by cadence. `latestIso` is the
 * furthest date already materialised, or null when the grid is empty.
 *
 * A stale grid walks forward to the first occurrence that is today or later rather than
 * continuing where it stopped, so days nobody worked stay missing instead of arriving as rows
 * dated in the past. A missed day is a fact the member can still see; a row invented for it is
 * not.
 *
 * Every date returned is a working day — see `workingDayOnOrAfter`.
 *
 * `endDateIso` is the schedule's due date: the last day the series may occupy. A grid that has
 * already run past it is left uncapped, so a stale date cannot retroactively switch a running
 * schedule off.
 */
export function horizonDates(
  cadence: Cadence,
  latestIso: string | null,
  todayIso: string,
  occurrences: number = HORIZON_OCCURRENCES,
  endDateIso: string | null = null,
): string[] {
  if (cadence === "one-off" || occurrences <= 0) return []

  // A grid that stopped on a weekend day, or a reader asking on one, starts from the working day
  // instead: the walk below compares against `todayIso`, and a Saturday cursor would read as
  // "already behind today" and step clean over the Monday it should have landed on.
  let cursor = workingDayOnOrAfter(latestIso ?? todayIso)
  const cap = seriesCap(endDateIso, latestIso ?? todayIso)
  const step = (from: string) => {
    const onward = nextInstanceDate(cadence, new Date(from))
    return onward && onward > from ? onward : null
  }

  // The grid already holds `latestIso`, so the first date worth asking for is the one after it.
  if (latestIso) {
    const onward = step(cursor)
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
    if (cap !== null && cursor > cap) break
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
