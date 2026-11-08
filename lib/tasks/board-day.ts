// Which day a board draws, and whether anybody may write on it.
//
// A board that only draws today cannot answer "did the backup run last Friday" or "what lands
// next week". Browsing a day is a read: it selects which occurrence row is drawn and nothing
// else. The grid top-up stays anchored on the member's real today, so paging into December
// cannot fabricate a month of occurrences.
//
// A day ahead of today is a preview. Marking next Friday's backup done is not something anybody
// should be able to do by paging forward, so those days carry `readOnly` and the page refuses to
// drag or write on them. A day behind today stays actionable: a missed occurrence is owed work.

import { isIsoDate, shiftDays } from "@/lib/worklog/local-day"

export type BoardDayRelation = "past" | "today" | "future"

export type BoardDay = {
  /** The day actually drawn. Always a real calendar day, never the raw URL value. */
  iso: string
  relation: BoardDayRelation
  isToday: boolean
  /** Future days may be looked at, not written to. */
  readOnly: boolean
  /** Signed distance from the member's today: negative behind, positive ahead. */
  daysFromToday: number
}

function utcMillis(dayIso: string): number {
  const [y, m, d] = dayIso.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

/**
 * The day to draw for a requested `?date=`. Anything that is not a real calendar day — junk, a
 * timestamp, 29 February in a common year — falls back to the member's today rather than
 * querying a day nobody asked for.
 */
export function resolveBoardDay(requested: unknown, todayIso: string): BoardDay {
  const iso = isIsoDate(requested) ? requested : todayIso
  const daysFromToday = Math.round((utcMillis(iso) - utcMillis(todayIso)) / 86_400_000)
  const relation: BoardDayRelation = daysFromToday === 0 ? "today" : daysFromToday < 0 ? "past" : "future"
  return { iso, relation, isToday: relation === "today", readOnly: relation === "future", daysFromToday }
}

/** The `?date=` value, or null on today so the board's default address stays clean. */
export function boardDayParam(dayIso: string, todayIso: string): string | null {
  return dayIso === todayIso ? null : dayIso
}

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** "Today · Sun 8 Nov", "Tomorrow · Mon 9 Nov", "Fri 13 Nov", "Mon 4 Jan 2027". */
export function boardDayTitle(dayIso: string, todayIso: string): string {
  // Assembled from parts so a locale's punctuation cannot leak into the header.
  const p: Record<string, string> = {}
  for (const part of PARTS.formatToParts(new Date(utcMillis(dayIso)))) {
    if (part.type !== "literal") p[part.type] = part.value
  }
  const sameYear = dayIso.slice(0, 4) === todayIso.slice(0, 4)
  const date = `${p.weekday} ${p.day} ${p.month}${sameYear ? "" : ` ${p.year}`}`
  if (dayIso === todayIso) return `Today · ${date}`
  if (dayIso === shiftDays(todayIso, 1)) return `Tomorrow · ${date}`
  if (dayIso === shiftDays(todayIso, -1)) return `Yesterday · ${date}`
  return date
}