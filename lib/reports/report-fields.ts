// Field whitelists for work_reports writes. Same reason as lib/worklog/entry-fields.ts and
// lib/task-updates.ts: `.set()` interpolates every key it is handed, so a spread body would let
// a caller repoint user_id. Identity, lifecycle and the computed metrics are server-owned, and a
// forbidden key is refused OUT LOUD — silently dropping status:"submitted" would leave a member
// believing they had filed a report that was never sent.

import { isIsoDate, rangeDays } from "@/lib/worklog/local-day"
import { MAX_PERIOD_DAYS, isPeriodType, type PeriodType } from "./period"
import type { ReportAggregate } from "./aggregate"
import {
  MAX_SECTION_TEXT,
  REPORT_TEMPLATES,
  emptyContent,
  isProseSection,
  isReportSectionKey,
  isReportTemplate,
  type ReportContent,
  type ReportTemplate,
} from "./templates"

export { MAX_SECTION_TEXT }
export type { ReportContent }

export type Fail = { error: string }
export type Read<T> = T | Fail
export function isFail(value: unknown): value is Fail {
  return typeof value === "object" && value !== null && "error" in value
}

export const REPORT_STATUSES = ["draft", "submitted", "acknowledged", "returned"] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && (REPORT_STATUSES as readonly string[]).includes(value)
}

/** Only a draft is editable. The other three are phase 4's lifecycle. */
export function isDraft(status: unknown): boolean {
  return status === "draft"
}

export const REPORT_MUTABLE_FIELDS = [
  "title",
  "template",
  "periodType",
  "periodStart",
  "periodEnd",
  "content",
] as const

export const FORBIDDEN_REPORT_KEYS = [
  "id",
  "userId",
  "ownerId",
  "authorId",
  "createdBy",
  "status",
  "metrics",
  "revisionOf",
  "submittedAt",
  "acknowledgedAt",
  "returnedNote",
  "recipients",
  "discipline",
  "templateSections",
  "createdAt",
  "updatedAt",
] as const

export const MAX_REPORT_TITLE = 200
export const MAX_CONTENT_KEYS = 12

export type ReportDto = {
  id: number
  userId: number
  title: string
  template: ReportTemplate
  periodType: PeriodType
  periodStart: string
  periodEnd: string
  status: ReportStatus
  content: ReportContent
  /** Null when the stored blob predates or does not match this shape — the page asks for a recompute. */
  metrics: ReportAggregate | null
  revisionOf: number | null
  submittedAt: string | null
  acknowledgedAt: string | null
  returnedNote: string | null
  createdAt: string
  updatedAt: string
}

export type ReportCreateInput = {
  title: string
  template: ReportTemplate
  periodType: PeriodType
  periodStart: string
  periodEnd: string
  content: ReportContent
}

export type ReportPatch = {
  title?: string
  template?: ReportTemplate
  periodType?: PeriodType
  periodStart?: string
  periodEnd?: string
  content?: ReportContent
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Anything a client must never set, reported by name before anything else is looked at. */
function forbiddenKey(input: Record<string, unknown>): string | null {
  for (const key of FORBIDDEN_REPORT_KEYS) {
    if (key in input) return key
  }
  return null
}

function readTitle(input: Record<string, unknown>): Read<{ value: string }> {
  const raw = typeof input.title === "string" ? input.title.trim() : ""
  if (!raw) return { error: "title is required" }
  if (raw.length > MAX_REPORT_TITLE) return { error: `title must be ${MAX_REPORT_TITLE} characters or fewer` }
  return { value: raw }
}

function readPeriodRange(start: unknown, end: unknown): Read<{ start: string; end: string }> {
  if (!isIsoDate(start)) return { error: "periodStart must be a YYYY-MM-DD date" }
  if (!isIsoDate(end)) return { error: "periodEnd must be a YYYY-MM-DD date" }
  if (start > end) return { error: "periodStart must be on or before periodEnd" }
  if (rangeDays(start, end, MAX_PERIOD_DAYS + 1).length > MAX_PERIOD_DAYS) {
    return { error: `period is too long (${MAX_PERIOD_DAYS} days maximum)` }
  }
  return { start, end }
}

export function readReportCreate(input: unknown): Read<{ value: ReportCreateInput }> {
  if (!isRecord(input)) return { error: "a JSON object body is required" }
  const forbidden = forbiddenKey(input)
  if (forbidden) return { error: `${forbidden} is set by the server and cannot be sent by a client` }

  const title = readTitle(input)
  if (isFail(title)) return title
  if (!isReportTemplate(input.template)) {
    return { error: `template must be one of: ${REPORT_TEMPLATES.join(", ")}` }
  }
  if (!isPeriodType(input.periodType)) {
    return { error: "periodType must be daily, weekly, monthly, yearly or custom" }
  }
  const range = readPeriodRange(input.periodStart, input.periodEnd)
  if (isFail(range)) return range

  return {
    value: {
      title: title.value,
      template: input.template,
      periodType: input.periodType,
      periodStart: range.start,
      periodEnd: range.end,
      content: emptyContent(input.template),
    },
  }
}

/**
 * The content whitelist. Only prose sections are accepted, text is trimmed, and both a
 * server-owned key and an unknown key are refused by name — a stored section that renders
 * nowhere is invisible debt that later turns into a "the report says things I never wrote".
 */
export function readContent(input: unknown): Read<{ value: ReportContent }> {
  if (input === undefined || input === null) return { value: {} }
  if (!isRecord(input)) return { error: "content must be an object keyed by section" }
  if (Object.keys(input).length > MAX_CONTENT_KEYS) {
    return { error: `content has too many sections (at most ${MAX_CONTENT_KEYS})` }
  }
  const value: ReportContent = {}
  for (const [key, raw] of Object.entries(input)) {
    if (!isReportSectionKey(key)) return { error: `unknown report section: ${key}` }
    if (!isProseSection(key)) return { error: `the ${key} section is computed by the server and cannot be typed into` }
    const text = typeof raw === "string" ? raw : isRecord(raw) && typeof raw.text === "string" ? raw.text : null
    if (text === null) return { error: `content.${key}.text must be a string` }
    const trimmed = text.trim()
    if (trimmed.length > MAX_SECTION_TEXT) {
      return { error: `content.${key}.text must be ${MAX_SECTION_TEXT} characters or fewer` }
    }
    value[key] = { text: trimmed }
  }
  return { value }
}

export function pickReportUpdates(input: unknown, status: unknown): Read<{ value: ReportPatch }> {
  if (!isRecord(input)) return { error: "a JSON object body is required" }
  if (!isDraft(status)) {
    return { error: "this report is locked — a submitted report is corrected as a new revision (phase 4)" }
  }
  const forbidden = forbiddenKey(input)
  if (forbidden) return { error: `${forbidden} is set by the server and cannot be sent by a client` }

  const value: ReportPatch = {}
  if ("title" in input) {
    const title = readTitle(input)
    if (isFail(title)) return title
    value.title = title.value
  }
  if ("template" in input) {
    if (!isReportTemplate(input.template)) return { error: `template must be one of: ${REPORT_TEMPLATES.join(", ")}` }
    value.template = input.template
  }
  if ("periodType" in input) {
    if (!isPeriodType(input.periodType)) return { error: "periodType must be daily, weekly, monthly, yearly or custom" }
    value.periodType = input.periodType
  }
  if ("periodStart" in input || "periodEnd" in input) {
    const range = readPeriodRange(input.periodStart, input.periodEnd)
    if (isFail(range)) return range
    value.periodStart = range.start
    value.periodEnd = range.end
  }
  if ("content" in input) {
    const content = readContent(input.content)
    if (isFail(content)) return content
    value.content = content.value
  }
  if (Object.keys(value).length === 0) return { error: "nothing to update" }
  return { value }
}

/**
 * Stored jsonb is not trusted, and this read is deliberately more forgiving than `readContent`:
 * a draft saved before a section became server-computed must still show the member's prose. So a
 * non-prose key is dropped rather than refused by name, and only a value that is not an object at
 * all reads as empty. The cap is still enforced, so a hostile row cannot make the page render a
 * thousand textareas.
 */
export function parseStoredContent(value: unknown): ReportContent {
  if (!isRecord(value)) return {}
  const result: ReportContent = {}
  for (const [key, raw] of Object.entries(value)) {
    if (Object.keys(result).length >= MAX_CONTENT_KEYS) break
    if (!isProseSection(key)) continue
    const text = isRecord(raw) && typeof raw.text === "string" ? raw.text.trim() : ""
    if (text) result[key] = { text: text.slice(0, MAX_SECTION_TEXT) }
  }
  return result
}

/**
 * A metrics blob is only usable if it is recognisably this aggregate. Anything else reads as
 * null so the builder can say "this draft has no metrics yet — Recompute" instead of rendering
 * half a structure and calling it a report.
 */
export function parseStoredMetrics(value: unknown): ReportAggregate | null {
  if (!isRecord(value)) return null
  const candidate = value as unknown as ReportAggregate
  if (typeof candidate.generatedAt !== "string") return null
  if (!isRecord(candidate.metrics)) return null
  if (!isRecord(candidate.period) || !Array.isArray(candidate.series)) return null
  return candidate
}
