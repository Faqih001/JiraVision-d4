// The builder's URL grammar. One mapping, used by the page, the preview route and the recompute
// route, so the period a member shares in a link is the period the numbers were computed over.
// Defaults are omitted from the query string; unknown values are ignored, never adopted.

import { isIsoDate } from "@/lib/worklog/local-day"
import { PERIOD_TYPES, resolvePeriod, type Period, type PeriodType } from "./period"
import { isReportSectionKey, type ReportSectionKey } from "./templates"
import { parseModuleScope, serializeModuleScope, type ModuleScope } from "./scope"
import type { ReportDto } from "./report-fields"

export const REPORT_VIEWS = ["list", "build"] as const
export type ReportView = (typeof REPORT_VIEWS)[number]

export const REPORT_VIEW_LABEL: Record<ReportView, string> = {
  list: "My reports",
  build: "Builder",
}

export type ReportState = {
  view: ReportView
  periodType: PeriodType
  /** Any day inside the period; the type decides the span around it. */
  anchor: string
  customFrom: string
  customTo: string
  reportId: number | null
  /** Which drill-down row list is open, so a shared link can land on an expanded section. */
  open: ReportSectionKey | null
  /** Which activity-module cards the report includes; null means all of them. */
  scope: ModuleScope
  q: string
}

function readEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function readDay(value: string | null, fallback: string): string {
  return value !== null && isIsoDate(value) ? value : fallback
}

export function defaultReportState(dayIso: string): ReportState {
  return {
    view: "list",
    periodType: "weekly",
    anchor: dayIso,
    customFrom: dayIso,
    customTo: dayIso,
    reportId: null,
    open: null,
    scope: null,
    q: "",
  }
}

/**
 * Move the period anchor onto the server's clock, but only while nobody has picked one — and
 * return the same state object when there is nothing to change.
 *
 * The page opens on the browser's zone, which is a guess; the first read carries the account's
 * day. The identity rule is not cosmetic: the page loads through a `refresh` that closes over
 * this state, so a fresh object with the same values is a state change, which rebuilds
 * `refresh`, which re-runs the load, which paints the skeletons again — a circle that never
 * needs any data to move.
 */
export function adoptServerAnchor(state: ReportState, todayIso: string, serverDay: string): ReportState {
  if (state.anchor !== todayIso || state.anchor === serverDay) return state
  return { ...state, anchor: serverDay }
}

export function parseReportView(search: URLSearchParams, todayIso: string): ReportState {
  const base = defaultReportState(todayIso)
  const periodType = readEnum<PeriodType>(search.get("p"), PERIOD_TYPES, base.periodType)
  const anchor = readDay(search.get("d"), base.anchor)
  // `from` falls back to today (not the anchor), and `to` falls back to `from`: a half-typed
  // custom range means "this one day", whatever the calendar anchor happens to be.
  let customFrom = readDay(search.get("from"), base.customFrom)
  let customTo = readDay(search.get("to"), customFrom)
  if (customFrom > customTo) [customFrom, customTo] = [customTo, customFrom]

  const rawId = Number(search.get("r"))
  const rawOpen = search.get("open")

  return {
    view: readEnum<ReportView>(search.get("v"), REPORT_VIEWS, base.view),
    periodType,
    anchor,
    customFrom,
    customTo,
    reportId: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
    open: rawOpen !== null && isReportSectionKey(rawOpen) ? rawOpen : null,
    scope: parseModuleScope(search.get("mods")),
    q: search.get("q") ?? "",
  }
}

export function serializeReportView(state: ReportState, todayIso: string): string {
  const params = new URLSearchParams()
  const base = defaultReportState(todayIso)
  if (state.view !== base.view) params.set("v", state.view)
  if (state.periodType !== base.periodType) params.set("p", state.periodType)
  if (state.anchor !== base.anchor || state.periodType !== base.periodType) params.set("d", state.anchor)
  if (state.periodType === "custom") {
    params.set("from", state.customFrom)
    params.set("to", state.customTo)
  }
  if (state.reportId !== null) params.set("r", String(state.reportId))
  if (state.open !== null) params.set("open", state.open)
  const mods = serializeModuleScope(state.scope)
  if (mods !== null) params.set("mods", mods)
  if (state.q.trim()) params.set("q", state.q.trim())
  return params.toString()
}

export function resolveReportPeriod(state: ReportState): Period {
  return resolvePeriod(state.periodType, state.anchor, { from: state.customFrom, to: state.customTo })
}

/**
 * Which numbers the builder renders. A saved draft shows the snapshot it was saved with, so the
 * figures always match the prose written beside them; anything else shows the live preview and
 * says so. This is one line of logic, but it is the line that decides what a report claims.
 */
export type MetricsSource = "snapshot" | "live"

export function metricsSource(report: ReportDto | null): MetricsSource {
  return report?.metrics ? "snapshot" : "live"
}

export const SOURCE_LABEL: Record<MetricsSource, string> = {
  snapshot: "Figures as saved",
  live: "Live preview — not saved yet",
}
