// Pure helpers for the shadcn date pickers, kept free of React so they unit-test
// in the node environment like the rest of lib/. Two concerns live here: the
// weekend-disabling rule shared by DateField/DateRangePicker, and the date+time
// round-trip used by DateTimeField. Values stay plain "YYYY-MM-DD" /
// "YYYY-MM-DDTHH:mm" strings so existing URL state and API filters keep working.

import { type Matcher } from "react-day-picker"
import { formatDay, fromIsoDate } from "@/lib/working-days"

export const WEEKEND: Matcher = { dayOfWeek: [0, 6] }

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const HH_MM = /^\d{2}:\d{2}$/

export interface DayMatcherOptions {
  // Prop: permanently allow every day (general date forms). When set, the
  // per-open toggle is irrelevant and weekends stay selectable.
  allowWeekends?: boolean
  // The per-open "I am needed this weekend" toggle in working-day pickers.
  weekendOverride?: boolean
  min?: string | null
  max?: string | null
}

export function disabledDayMatchers({ allowWeekends, weekendOverride, min, max }: DayMatcherOptions): Matcher[] {
  const weekendsMuted = !allowWeekends && !weekendOverride
  return [
    ...(weekendsMuted ? [WEEKEND] : []),
    ...(min ? [{ before: fromIsoDate(min) ?? new Date(min) }] : []),
    ...(max ? [{ after: fromIsoDate(max) ?? new Date(max) }] : []),
  ]
}

function isValidTime(time: string): boolean {
  if (!HH_MM.test(time)) return false
  const [h, m] = time.split(":").map(Number)
  return h <= 23 && m <= 59
}

/** Joins a "YYYY-MM-DD" day and a "HH:mm" time into "YYYY-MM-DDTHH:mm"; null unless both are valid. */
export function combineDateTime(dateIso: string | null, time: string | null): string | null {
  if (!dateIso || !time) return null
  if (!ISO_DAY.test(dateIso) || !fromIsoDate(dateIso)) return null
  if (!isValidTime(time)) return null
  return `${dateIso}T${time}`
}

/** Splits a stored datetime into its day and time, dropping any seconds. Either part may be null. */
export function splitDateTime(value: string | null): { date: string | null; time: string | null } {
  if (!value) return { date: null, time: null }
  const [rawDate, rawTime] = value.split("T")
  const date = ISO_DAY.test(rawDate) && fromIsoDate(rawDate) ? rawDate : null
  const time = rawTime ? rawTime.slice(0, 5) : null
  return { date, time: time && isValidTime(time) ? time : null }
}

/** A short label for a stored datetime, e.g. "Nov 3, 2026 · 14:30"; empty when unusable. */
export function formatDateTime(value: string | null): string {
  const { date, time } = splitDateTime(value)
  if (!date) return ""
  const day = formatDay(date)
  return time ? `${day} · ${time}` : day
}