import type { DayBucket } from "./entries"

export function weekdayMinutes(days: DayBucket[]): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0]
  for (const bucket of days) {
    const weekday = (new Date(`${bucket.day}T00:00:00Z`).getUTCDay() + 6) % 7
    totals[weekday] += bucket.minutes
  }
  return totals
}