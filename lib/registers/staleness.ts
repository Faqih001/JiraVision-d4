// Currency, not a filing cabinet (design §12 item 3). Staleness is computed from the two
// stored facts every time it is read; there is no stale column to fall out of date, and a
// row nobody has ever verified is "unknown", never "fresh".

import type { Cadence } from "@/lib/cadence"
import { isIsoDate, shiftDays } from "@/lib/worklog/local-day"

export const STALENESS = ["fresh", "stale", "unknown"] as const
export type Staleness = (typeof STALENESS)[number]

export const STALENESS_LABEL: Record<Staleness, string> = {
  fresh: "Current",
  stale: "Stale",
  unknown: "Never verified",
}

export type VerificationState = {
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function utcDay(dayIso: string): number {
  const [year, month, day] = dayIso.split("-").map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Whole calendar days from `fromIso` to `toIso`; negative when `toIso` is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utcDay(toIso) - utcDay(fromIso)) / DAY_MS)
}

function usableInterval(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= 0
}

/**
 * `elapsed > interval` is stale. An interval of 0 means "verify every day": today's
 * verification is current, tomorrow's is not. A future verification date is fresh, never
 * stale — a clock skew must not accuse someone of neglect.
 */
export function stalenessOf(row: VerificationState, todayIso: string): Staleness {
  if (!row.lastVerifiedAt || !isIsoDate(row.lastVerifiedAt) || !isIsoDate(todayIso)) return "unknown"
  if (!usableInterval(row.verifyIntervalDays)) return "unknown"
  const elapsed = daysBetween(row.lastVerifiedAt, todayIso)
  if (elapsed < 0) return "fresh"
  return elapsed > row.verifyIntervalDays ? "stale" : "fresh"
}

export function isStale(row: VerificationState, todayIso: string): boolean {
  return stalenessOf(row, todayIso) === "stale"
}

/**
 * The cadence a stale row's check should recur at, so the plan item it becomes is dated work
 * rather than a line in a queue nobody opens. Unset intervals become one-off checks.
 */
export function cadenceForInterval(days: number | null): Cadence {
  if (!usableInterval(days)) return "one-off"
  if (days <= 1) return "daily"
  if (days <= 7) return "weekly"
  if (days <= 31) return "monthly"
  return "yearly"
}

/** When the next check is due, pulled back to today once it is overdue. */
export function nextCheckDay(row: VerificationState, todayIso: string): string {
  if (!row.lastVerifiedAt || !isIsoDate(row.lastVerifiedAt) || !usableInterval(row.verifyIntervalDays)) {
    return todayIso
  }
  const due = shiftDays(row.lastVerifiedAt, row.verifyIntervalDays)
  return due < todayIso ? todayIso : due
}
