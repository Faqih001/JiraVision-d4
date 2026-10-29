// The one mapping between the work log page's controls and its query string. Unknown or
// hand-edited values fall back to the default rather than erroring: a shared link should
// open something sensible, and a stale param must not break a fetch.

import { isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import {
  isDeliverableStatus,
  isWorkLogKind,
  type DeliverableStatus,
  type WorkLogKind,
} from "./entries"
import { isIsoDate, monthBoundsIso, rangeDays, shiftDays, weekStartIso } from "./local-day"

export const WORKLOG_VIEWS = ["day", "week", "list", "board", "heat"] as const
export type WorklogView = (typeof WORKLOG_VIEWS)[number]

export function isWorklogView(value: unknown): value is WorklogView {
  return typeof value === "string" && (WORKLOG_VIEWS as readonly string[]).includes(value)
}

// The button text and the section title both come from here, so a renamed view is renamed
// in one place and can never disagree with itself.
export const VIEW_LABEL: Record<WorklogView, string> = {
  day: "Day",
  week: "Week",
  list: "All entries",
  board: "By kind",
  heat: "Calendar",
}

export const RANGE_PRESETS = ["today", "yesterday", "this-week", "last-7", "this-month", "custom"] as const
export type RangePreset = (typeof RANGE_PRESETS)[number]

export const PRESET_LABEL: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  "last-7": "Last 7 days",
  "this-month": "This month",
  custom: "Custom",
}

export function isRangePreset(value: unknown): value is RangePreset {
  return typeof value === "string" && (RANGE_PRESETS as readonly string[]).includes(value)
}

export type ViewState = {
  view: WorklogView
  day: string
  preset: RangePreset
  from: string | null
  to: string | null
  q: string
  kind: WorkLogKind | "all"
  discipline: WorkDiscipline | "all"
  taskId: number | null
  deliverableStatus: DeliverableStatus | "all"
  hasDeliverable: boolean
}

const MAX_QUERY_LENGTH = 120

export function defaultViewState(dayIso: string): ViewState {
  return {
    view: "day",
    day: dayIso,
    preset: "today",
    from: null,
    to: null,
    q: "",
    kind: "all",
    discipline: "all",
    taskId: null,
    deliverableStatus: "all",
    hasDeliverable: false,
  }
}

/**
 * Move the day onto the server's clock, but only while nobody has chosen one.
 *
 * The page opens on the browser's own zone, which is a guess: at midnight in the member's real
 * zone the guess is yesterday. The first response carries the account's day and this replaces
 * the guess — and a day the member navigated to is never replaced.
 *
 * Returning the same object when there is nothing to change is the point of the helper. The page
 * runs this on every read, background ones included; a fresh object holding the same values is a
 * state change, so the loader would rebuild, its effect would re-run, and the page would fetch
 * and re-paint its skeletons forever with no data moving.
 */
export function adoptServerDay(state: ViewState, todayIso: string, serverDay: string): ViewState {
  if (state.day !== todayIso || state.day === serverDay) return state
  return { ...state, day: serverDay }
}

export function parseViewState(search: URLSearchParams, todayIso: string): ViewState {
  const base = defaultViewState(todayIso)

  const view = search.get("v")
  if (isWorklogView(view)) base.view = view

  const day = search.get("day")
  if (day && isIsoDate(day)) base.day = day

  const preset = search.get("p")
  if (isRangePreset(preset)) base.preset = preset

  const from = search.get("from")
  const to = search.get("to")
  base.from = from && isIsoDate(from) ? from : null
  base.to = to && isIsoDate(to) ? to : null

  base.q = (search.get("q") ?? "").slice(0, MAX_QUERY_LENGTH)

  const kind = search.get("kind")
  base.kind = kind !== null && isWorkLogKind(kind) ? kind : "all"

  const discipline = search.get("discipline")
  base.discipline = discipline !== null && isWorkDiscipline(discipline) ? discipline : "all"

  const task = search.get("task")
  if (task && /^\d+$/u.test(task)) base.taskId = Number(task)

  const dstatus = search.get("dstatus")
  base.deliverableStatus = dstatus !== null && isDeliverableStatus(dstatus) ? dstatus : "all"

  base.hasDeliverable = search.get("dlv") === "1"

  return base
}

export function serializeViewState(state: ViewState, todayIso: string): string {
  const out = new URLSearchParams()
  const base = defaultViewState(todayIso)

  if (state.view !== base.view) out.set("v", state.view)
  if (state.day !== base.day) out.set("day", state.day)
  if (state.preset !== base.preset) out.set("p", state.preset)
  if (state.preset === "custom") {
    if (state.from) out.set("from", state.from)
    if (state.to) out.set("to", state.to)
  }
  if (state.q.trim()) out.set("q", state.q.trim())
  if (state.kind !== "all") out.set("kind", state.kind)
  if (state.discipline !== "all") out.set("discipline", state.discipline)
  if (state.taskId !== null) out.set("task", String(state.taskId))
  if (state.deliverableStatus !== "all") out.set("dstatus", state.deliverableStatus)
  if (state.hasDeliverable) out.set("dlv", "1")

  return out.toString()
}

/**
 * Day/week/heat windows follow `day` (what the person navigated to); list and board follow
 * the preset, which is the range they said they wanted to see. The day the person is
 * standing on is not a range they asked for, so a preset must not override it.
 */
export function resolveRange(state: ViewState, todayIso: string): { from: string; to: string } {
  if (state.view === "day") return { from: state.day, to: state.day }

  if (state.view === "week") {
    const monday = weekStartIso(state.day)
    return { from: monday, to: shiftDays(monday, 6) }
  }

  if (state.view === "heat") return monthBoundsIso(state.day)

  switch (state.preset) {
    case "today":
      return { from: todayIso, to: todayIso }
    case "yesterday": {
      const yesterday = shiftDays(todayIso, -1)
      return { from: yesterday, to: yesterday }
    }
    case "this-week": {
      const monday = weekStartIso(todayIso)
      return { from: monday, to: shiftDays(monday, 6) }
    }
    case "last-7":
      return { from: shiftDays(todayIso, -6), to: todayIso }
    case "this-month":
      return monthBoundsIso(todayIso)
    case "custom": {
      if (state.from && state.to) {
        return state.from <= state.to
          ? { from: state.from, to: state.to }
          : { from: state.to, to: state.from }
      }
      if (state.from) return { from: state.from, to: state.from }
      if (state.to) return { from: state.to, to: state.to }
      return { from: todayIso, to: todayIso }
    }
  }
}

const RANGE_DAY_CAP = 90
const HEAT_DAY_CAP = 370

export function viewDays(state: ViewState, todayIso: string): string[] {
  const { from, to } = resolveRange(state, todayIso)
  return rangeDays(from, to, state.view === "heat" ? HEAT_DAY_CAP : RANGE_DAY_CAP)
}
