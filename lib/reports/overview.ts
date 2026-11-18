// The overview's arithmetic: how many reports sit in each lifecycle phase, how often they are
// created, and how long a recipient takes to acknowledge one. Kept out of the cards for the same
// reason the aggregate lives in lib/reports/aggregate.ts — a card that totals its own rows is a
// second opinion, and the overview must agree with the list it summarises.

import { localDay, shiftDays, weekStartIso } from "@/lib/worklog/local-day"
import type { ReportDto, ReportStatus } from "./report-fields"

export type StatusCounts = Record<ReportStatus, number>

export function statusCounts(reports: ReportDto[]): StatusCounts {
  const counts: StatusCounts = { draft: 0, submitted: 0, acknowledged: 0, returned: 0 }
  for (const report of reports) counts[report.status] += 1
  return counts
}

export type CadenceWeek = { weekStart: string; label: string; count: number }

export function cadenceTotal(weeks: CadenceWeek[]): number {
  return weeks.reduce((sum, week) => sum + week.count, 0)
}

const weekLabel = (mondayIso: string): string =>
  new Date(`${mondayIso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

/**
 * Creation cadence, oldest week first, ending on the week that contains `todayIso`. A report
 * belongs to the week it was *created* in — the period it covers is a different question, and
 * answering it here would put a late-filed October report in a November bar.
 */
export function cadenceWeeks(
  reports: ReportDto[],
  todayIso: string,
  timezone?: string | null,
  weeks = 8,
): CadenceWeek[] {
  const currentMonday = weekStartIso(todayIso)
  const buckets: CadenceWeek[] = []
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = shiftDays(currentMonday, -7 * i)
    buckets.push({ weekStart, label: weekLabel(weekStart), count: 0 })
  }
  const byMonday = new Map(buckets.map((bucket) => [bucket.weekStart, bucket]))
  for (const report of reports) {
    const createdDay = localDay(new Date(report.createdAt), timezone)
    const bucket = byMonday.get(weekStartIso(createdDay))
    if (bucket) bucket.count += 1
  }
  return buckets
}

export type Turnaround = {
  awaiting: number
  acknowledged: number
  returned: number
  avgDays: number | null
  fastestDays: number | null
  slowestDays: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const tenth = (days: number): number => Math.round(days * 10) / 10

/**
 * Submit-to-acknowledge, in days. Only a report carrying both stamps is a sample; an
 * acknowledgement stamped before its submission is clock skew, not a negative wait, so it is
 * counted as acknowledged but never averaged.
 */
export function turnaroundStats(reports: ReportDto[]): Turnaround {
  const counts = statusCounts(reports)
  const samples: number[] = []
  for (const report of reports) {
    if (!report.submittedAt || !report.acknowledgedAt) continue
    const days = (Date.parse(report.acknowledgedAt) - Date.parse(report.submittedAt)) / DAY_MS
    if (days >= 0) samples.push(days)
  }
  if (samples.length === 0) {
    return {
      awaiting: counts.submitted,
      acknowledged: counts.acknowledged,
      returned: counts.returned,
      avgDays: null,
      fastestDays: null,
      slowestDays: null,
    }
  }
  const total = samples.reduce((sum, days) => sum + days, 0)
  return {
    awaiting: counts.submitted,
    acknowledged: counts.acknowledged,
    returned: counts.returned,
    avgDays: tenth(total / samples.length),
    fastestDays: tenth(Math.min(...samples)),
    slowestDays: tenth(Math.max(...samples)),
  }
}