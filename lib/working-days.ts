// Pure working-day math for the date pickers. The office works Monday–Friday;
// weekends count only when the member explicitly says "I am needed".

export const DAY_MS = 86_400_000

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Parses "YYYY-MM-DD" into a local Date; anything else returns null. */
export function fromIsoDate(iso: string | null | undefined): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  // Reject impossible days the Date constructor would silently roll over.
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

/**
 * Days from..to inclusive that are Mon–Fri. Null for either endpoint yields null;
 * a reversed range is measured between the swapped pair.
 */
export function workingDaysBetween(fromIso: string | null, toIso: string | null): number | null {
  const from = fromIsoDate(fromIso)
  const to = fromIsoDate(toIso)
  if (!from || !to) return null
  const start = from <= to ? from : to
  const end = from <= to ? to : from
  let count = 0
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    if (!isWeekend(cursor)) count++
  }
  return count
}

/** A short label for a stored ISO day, e.g. "Nov 3, 2026". */
export function formatDay(iso: string | null): string {
  const d = fromIsoDate(iso)
  if (!d) return ""
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
