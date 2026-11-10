// Which day a finished task was actually finished, and what a Done column shows for a window of
// those days.
//
// `tasks.status` says a card is done; it does not say when. `tasks.updated_at` is mutable, so a
// card edited last Tuesday is not a card finished last Tuesday. `task_events` is the honest record
// — one row per status change — so the completion day is the latest finished event, read in the
// member's own timezone so it agrees with the day the board is drawing. Rows whose history was
// imported have no event; they fall back to `updated_at`, and `completedOnFrom` is the one place
// that concession is written down.
//
// The window is a page preference, not a server one: the board wants the last week, the task list
// wants everything. Junk therefore resolves to the answer that hides nothing.

import { dayStartUtc, localDay, shiftDays } from "@/lib/worklog/local-day"

export const DONE_WINDOWS = ["day", "week", "all"] as const
export type DoneWindow = (typeof DONE_WINDOWS)[number]

/**
 * A window as the database sees it: an inclusive lower instant, an exclusive upper one, and a
 * null lower bound for the window that opens the past.
 *
 * Shared by `doneWindowInstants` here and the SQL predicate in lib/tasks/completed-on-read.ts, so
 * the day a card is grouped on and the window that hid or kept it are cut from the same two dates.
 */
export type DoneWindowBounds = {
  from: Date | null
  to: Date
}

/** What an unreadable preference resolves to on the server: a window nobody chose hides nothing. */
export const SERVER_DONE_WINDOW: DoneWindow = "all"

/** A `week` is the seven days ending on the day being drawn, not the calendar week around it. */
export const WEEK_WINDOW_DAYS = 7

/** The words a caller may put in `?doneWindow=`. Strict: the value is written by these pages. */
export function isDoneWindow(value: unknown): value is DoneWindow {
  return typeof value === "string" && (DONE_WINDOWS as readonly string[]).includes(value)
}

export function resolveDoneWindow(
  requested: unknown,
  fallback: DoneWindow = SERVER_DONE_WINDOW,
): DoneWindow {
  return isDoneWindow(requested) ? requested : fallback
}

/**
 * The `?doneWindow=` value, or null when the page is already showing its own default.
 *
 * Same rule as `boardDayParam`: a URL is an address, and an address that repeats what the page
 * does anyway cannot be told apart from one a member chose on purpose.
 */
export function doneWindowParam(window: DoneWindow, fallback: DoneWindow): string | null {
  return window === fallback ? null : window
}

/**
 * The closed range of days a window covers, ending on the day being drawn.
 *
 * The upper bound always exists: a board turned to last Friday is a view as of that day, and a
 * card finished since then is not something that Friday's Done column ever held. On today's board
 * the bound sits at tomorrow's midnight in the member's zone, so nothing is lost.
 */
export function doneWindowBounds(
  window: DoneWindow,
  dayIso: string,
): { fromIso: string | null; toIso: string } {
  if (window === "all") return { fromIso: null, toIso: dayIso }
  if (window === "week") return { fromIso: shiftDays(dayIso, -(WEEK_WINDOW_DAYS - 1)), toIso: dayIso }
  return { fromIso: dayIso, toIso: dayIso }
}

/**
 * The same range as the pair of instants the database compares timestamps against.
 *
 * A window is a range of the member's days, so its bounds are their midnights in their own zone:
 * cutting them at UTC would move a card between columns for anybody west of Greenwich. The upper
 * bound is always the midnight *after* the day being drawn, which is what makes `< to` include a
 * finish at any hour of that day.
 */
export function doneWindowInstants(
  window: DoneWindow,
  dayIso: string,
  timeZone: string | null | undefined,
): DoneWindowBounds {
  const { fromIso, toIso } = doneWindowBounds(window, dayIso)
  return {
    from: fromIso ? dayStartUtc(fromIso, timeZone) : null,
    to: dayStartUtc(shiftDays(toIso, 1), timeZone),
  }
}

/**
 * The day this card was finished, in the member's own calendar day.
 *
 * `finishedAt` is the latest finished `task_events` row and `updatedAt` the row behind it; the
 * caller passes whichever it has. `finished` is false for a card that is not actually done, which
 * answers null rather than inventing a completion day out of an edit timestamp.
 */
export function completedOnFrom(
  finishedAt: string | Date | null | undefined,
  updatedAt: string | Date | null | undefined,
  timeZone: string | null | undefined,
  finished = true,
): string | null {
  if (!finished) return null
  const raw = finishedAt ?? updatedAt
  if (!raw) return null
  const instant = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(instant.getTime())) return null
  return localDay(instant, timeZone)
}

export type CompletionGroup<T> = { dayIso: string; label: string; rows: T[] }

/**
 * Cards bucketed per completion day, newest day first — the order a Done column reads in.
 *
 * `dayOf` is a function rather than a field because the two kinds of done card keep their day in
 * different places: a one-off has `completedOn`, and a schedule's card was finished when its
 * occurrence closed, which is the day the page is already drawing.
 */
export function groupByCompletionDay<T>(
  rows: readonly T[],
  dayOf: (row: T) => string | null,
  todayIso: string,
): CompletionGroup<T>[] {
  const buckets = new Map<string, T[]>()
  for (const row of rows) {
    const day = dayOf(row)
    if (!day) continue
    buckets.set(day, [...(buckets.get(day) ?? []), row])
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayIso, group]) => ({ dayIso, label: completionDayLabel(dayIso, todayIso), rows: group }))
}

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** "Today", "Yesterday", "Fri 6 Nov", "Wed 31 Dec 2025". */
export function completionDayLabel(dayIso: string, todayIso: string): string {
  if (dayIso === todayIso) return "Today"
  if (dayIso === shiftDays(todayIso, -1)) return "Yesterday"
  // Assembled from parts so a locale's punctuation cannot leak into a column header.
  const [y, m, d] = dayIso.split("-").map(Number)
  const p: Record<string, string> = {}
  for (const part of PARTS.formatToParts(new Date(Date.UTC(y, m - 1, d)))) {
    if (part.type !== "literal") p[part.type] = part.value
  }
  const sameYear = dayIso.slice(0, 4) === todayIso.slice(0, 4)
  return `${p.weekday} ${p.day} ${p.month}${sameYear ? "" : ` ${p.year}`}`
}

/** The suffix on a done count, so "9 done" says which nine it means. */
export function doneWindowPhrase(window: DoneWindow, isToday: boolean): string {
  if (window === "day") return isToday ? "today" : "on this day"
  if (window === "week") return isToday ? "this week" : "in these 7 days"
  return isToday ? "total" : "by this day"
}

/** What the window left out, in the one line that offers to bring it back. */
export function earlierDoneLabel(count: number): string | null {
  return count > 0 ? `${count} done earlier` : null
}
