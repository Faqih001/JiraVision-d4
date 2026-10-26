// The builder's URL grammar. One mapping, used by the page, the preview route and the recompute
// route, so the period a member shares in a link is the period the numbers were computed over.
// Defaults are omitted from the query string; unknown values are ignored, never adopted.

import { isIsoDate } from "@/lib/worklog/local-day"
import { PERIOD_TYPES, resolvePeriod, type Period, type PeriodType } from "./period"
import {
  isReportSectionKey,
  isReportTemplate,
  templateForDiscipline,
  type ReportSectionKey,
  type ReportTemplate,
} from "./templates"
import type { ReportAggregate } from "./aggregate"
import type { ReportDto } from "./report-fields"

export const REPORT_VIEWS = ["list", "build"] as const
export type ReportView = (typeof REPORT_VIEWS)[number]

export const REPORT_VIEW_LABEL: Record<ReportView, string> = {
  list: "My reports",
  build: "Builder",
}

/** "Follow the work I actually logged" — the sentinel is a word, never an empty value. */
export const AUTO_TEMPLATE = "auto"
export type TemplateChoice = ReportTemplate | typeof AUTO_TEMPLATE

export type ReportState = {
  view: ReportView
  periodType: PeriodType
  /** Any day inside the period; the type decides the span around it. */
  anchor: string
  customFrom: string
  customTo: string
  template: TemplateChoice
  reportId: number | null
  /** Which drill-down row list is open, so a shared link can land on an expanded section. */
  open: ReportSectionKey | null
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
    template: AUTO_TEMPLATE,
    reportId: null,
    open: null,
    q: "",
  }
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
  const rawTemplate = search.get("tpl")

  return {
    view: readEnum<ReportView>(search.get("v"), REPORT_VIEWS, base.view),
    periodType,
    anchor,
    customFrom,
    customTo,
    template: rawTemplate !== null && isReportTemplate(rawTemplate) ? rawTemplate : AUTO_TEMPLATE,
    reportId: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
    open: rawOpen !== null && isReportSectionKey(rawOpen) ? rawOpen : null,
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
  if (state.template !== AUTO_TEMPLATE) params.set("tpl", state.template)
  if (state.reportId !== null) params.set("r", String(state.reportId))
  if (state.open !== null) params.set("open", state.open)
  if (state.q.trim()) params.set("q", state.q.trim())
  return params.toString()
}

export function resolveReportPeriod(state: ReportState): Period {
  return resolvePeriod(state.periodType, state.anchor, { from: state.customFrom, to: state.customTo })
}

/**
 * The template is auto by default because §6 wants it to follow the author's discipline, and the
 * only discipline evidence a report has is the work in the period. `unassigned` is the aggregate's
 * own bucket for rows with no discipline, so it is not a discipline and must not pick a template.
 */
export function effectiveTemplate(state: ReportState, aggregate: ReportAggregate | null): ReportTemplate {
  if (state.template !== AUTO_TEMPLATE) return state.template
  const leading = aggregate?.byDiscipline[0]?.key
  return templateForDiscipline(leading && leading !== "unassigned" ? leading : null)
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
