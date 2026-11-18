// The "vs prev" comparison on the KPI tiles. Pure: the client fetches the previous window's
// summary and these two functions turn the pair of readings into a chip, so a wrong sign or a
// drifted window is a test failure rather than a number nobody re-checks.

import { formatMinutes } from "./entries"
import { rangeDays, shiftDays } from "./local-day"

export function previousRange(range: { from: string; to: string }): { from: string; to: string } {
  const length = rangeDays(range.from, range.to).length
  const to = shiftDays(range.from, -1)
  return { from: shiftDays(to, -(length - 1)), to }
}

export type PeriodDelta = { diff: number; direction: "up" | "down" | "flat"; label: string }

// `previous === null` means the comparison was never read (fetch failed, first paint) — not that
// the previous period was zero. A chip must not claim "same as prev" on data nobody fetched.
export function periodDelta(
  current: number,
  previous: number | null,
  unit: "minutes" | "count",
): PeriodDelta | null {
  if (previous === null) return null
  const diff = current - previous
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat"
  if (diff === 0) return { diff, direction, label: "same as prev" }
  const magnitude = unit === "minutes" ? formatMinutes(Math.abs(diff)) : String(Math.abs(diff))
  return { diff, direction, label: `${diff > 0 ? "+" : "-"}${magnitude} vs prev` }
}