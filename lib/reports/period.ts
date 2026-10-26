// The only place that turns "my week" into two dates. A period boundary is what a
// supervisor reads, so ISO semantics (Mon-Sun; week 1 holds this year's first Thursday)
// live here and nowhere else. Days are inclusive `YYYY-MM-DD` strings — the same grammar
// work_log_entries.worked_on uses — and rangeBoundsUtc() in lib/worklog/local-day.ts is
// what converts them into the half-open instant range a query needs.

import {
  isIsoDate,
  monthBoundsIso,
  rangeDays,
  shiftDays,
  weekStartIso,
} from "@/lib/worklog/local-day"

export const PERIOD_TYPES = ["daily", "weekly", "monthly", "yearly", "custom"] as const
export type PeriodType = (typeof PERIOD_TYPES)[number]

export const PERIOD_LABEL: Record<PeriodType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
}

/** Unknown values are refused, never defaulted: a silently widened period misstates a report. */
export function isPeriodType(value: unknown): value is PeriodType {
  return typeof value === "string" && (PERIOD_TYPES as readonly string[]).includes(value)
}

/** A period this long is a typo, not a report. `rangeDays` caps at the same number. */
export const MAX_PERIOD_DAYS = 370

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_MS = 86_400_000

export type PeriodBucket = { key: string; label: string; start: string; end: string }

export type Period = {
  type: PeriodType
  /** Inclusive calendar days in the member's own timezone. */
  start: string
  end: string
  label: string
  days: string[]
  /** Day buckets for a short period, month buckets for a long one. */
  buckets: PeriodBucket[]
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function triple(dayIso: string): [number, number, number] {
  const [y, m, d] = dayIso.split("-").map(Number)
  return [y ?? 1970, m ?? 1, d ?? 1]
}

/** Last day of a 1-based month, and month may overflow past 12 or below 1. */
function clampDay(year: number, month: number, day: number): string {
  const normalisedYear = year + Math.floor((month - 1) / 12)
  const normalisedMonth = ((month - 1 + 12) % 12) + 1
  const last = new Date(Date.UTC(normalisedYear, normalisedMonth, 0)).getUTCDate()
  return `${normalisedYear}-${pad(normalisedMonth)}-${pad(Math.min(day, last))}`
}

/**
 * ISO-8601: walk to the Thursday of this day's week, and that Thursday's calendar year is
 * the ISO year. A Monday in late December can therefore belong to week 1 of next year.
 */
export function isoWeek(dayIso: string): { isoYear: number; week: number } {
  const [y, m, d] = triple(dayIso)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekdayFromMonday = (date.getUTCDay() + 6) % 7
  // Canonical ISO walk: `+ 4 - (getUTCDay() || 7)`, and `getUTCDay() || 7` is exactly
  // weekdayFromMonday + 1, so the offset here is 3 - weekdayFromMonday.
  date.setUTCDate(date.getUTCDate() + 3 - weekdayFromMonday)
  const isoYear = date.getUTCFullYear()
  const jan1 = Date.UTC(isoYear, 0, 1)
  const week = Math.ceil(((date.getTime() - jan1) / DAY_MS + 1) / 7)
  return { isoYear, week }
}

export function periodLabel(type: PeriodType, start: string, end: string): string {
  if (type === "daily") return start
  if (type === "weekly") {
    const { isoYear, week } = isoWeek(start)
    return `${isoYear}-W${pad(week)} (${start} to ${end})`
  }
  if (type === "monthly") return start.slice(0, 7)
  if (type === "yearly") return start.slice(0, 4)
  return `${start} to ${end}`
}

/**
 * A period over two months reads as twelve numbers, not three hundred and sixty-five. The
 * 60-day cut is what keeps a two-month custom range on days and a year on months.
 */
export function periodBuckets(startIso: string, endIso: string): PeriodBucket[] {
  const days = rangeDays(startIso, endIso, MAX_PERIOD_DAYS)
  if (days.length <= 60) {
    return days.map((day) => ({ key: day, label: day, start: day, end: day }))
  }
  const out: PeriodBucket[] = []
  const [startYear, startMonth] = triple(startIso)
  const [endYear, endMonth] = triple(endIso)
  for (let index = 0; ; index += 1) {
    const year = startYear + Math.floor((startMonth - 1 + index) / 12)
    const month = ((startMonth - 1 + index) % 12) + 1
    if (year > endYear || (year === endYear && month > endMonth)) break
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const monthStart = `${year}-${pad(month)}-01`
    const monthEnd = `${year}-${pad(month)}-${pad(last)}`
    out.push({
      key: `${year}-${pad(month)}`,
      label: `${MONTH_NAMES[month - 1]?.slice(0, 3) ?? "Month"} ${year}`,
      start: monthStart < startIso ? startIso : monthStart,
      end: monthEnd > endIso ? endIso : monthEnd,
    })
  }
  return out
}

export function resolvePeriod(
  type: PeriodType,
  anchorIso: string,
  custom?: { from?: string; to?: string },
): Period {
  // A bad anchor is the epoch, not a throw: the route validates, and a page must still
  // render a labelled period if a hand-typed ?d= ever reaches it.
  const anchor = isIsoDate(anchorIso) ? anchorIso : "1970-01-01"
  let start = anchor
  let end = anchor
  switch (type) {
    case "daily":
      break
    case "weekly":
      start = weekStartIso(anchor)
      end = shiftDays(start, 6)
      break
    case "monthly": {
      const bounds = monthBoundsIso(anchor)
      start = bounds.from
      end = bounds.to
      break
    }
    case "yearly": {
      const [year] = triple(anchor)
      start = `${year}-01-01`
      end = `${year}-12-31`
      break
    }
    case "custom": {
      const rawFrom = isIsoDate(custom?.from) ? (custom?.from as string) : anchor
      const rawTo = isIsoDate(custom?.to) ? (custom?.to as string) : anchor
      start = rawFrom <= rawTo ? rawFrom : rawTo
      end = rawFrom <= rawTo ? rawTo : rawFrom
      // Clipped, not refused: a label stating the clipped end is honest, an error toast is not.
      const span = rangeDays(start, end, MAX_PERIOD_DAYS + 1)
      if (span.length > MAX_PERIOD_DAYS) end = shiftDays(start, MAX_PERIOD_DAYS - 1)
      break
    }
  }
  const days = rangeDays(start, end, MAX_PERIOD_DAYS)
  return {
    type,
    start,
    end,
    label: periodLabel(type, start, end),
    days,
    buckets: periodBuckets(start, end),
  }
}

/** Where the anchor lands one period back or forward. Stepping the anchor, not the range, keeps `?d=` stable. */
export function shiftPeriodAnchor(type: PeriodType, anchorIso: string, delta: number): string {
  const [y, m, d] = triple(anchorIso)
  switch (type) {
    case "daily":
    case "custom":
      return shiftDays(anchorIso, delta)
    case "weekly":
      return shiftDays(anchorIso, delta * 7)
    case "monthly":
      return clampDay(y, m + delta, d)
    case "yearly":
      return clampDay(y + delta, m, d)
  }
}
