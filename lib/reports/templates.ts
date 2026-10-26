// What a report is made of. The section inventory is spec §6's ten, in the order a supervisor
// reads them; the templates decide order, the leading KPI strip and which charts render — never
// which facts exist, because two members' reports must be comparable line for line.
//
// Deliberate narrowing of §6's "the section list and leading metrics differ": every template
// carries all ten sections. Dropping a section is how a report ends up with a hole a recipient
// reads as concealment. The difference is what leads and what is charted.

import { DISCIPLINE_TEMPLATE, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import type { MetricKey } from "./aggregate"

export const REPORT_SECTIONS = [
  { key: "header", source: "server" },
  { key: "summary", source: "author" },
  { key: "completed", source: "both" },
  { key: "deliverables", source: "both" },
  { key: "inProgress", source: "both" },
  { key: "blocked", source: "both" },
  { key: "overdue", source: "both" },
  { key: "nextPeriod", source: "both" },
  { key: "metrics", source: "server" },
  { key: "notes", source: "author" },
] as const satisfies readonly { key: string; source: "server" | "author" | "both" }[]

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]["key"]
export type SectionSource = (typeof REPORT_SECTIONS)[number]["source"]

export const SECTION_TITLE = {
  header: "Header",
  summary: "Summary",
  completed: "Actions completed",
  deliverables: "Deliverables",
  inProgress: "In progress",
  blocked: "Blocked / at risk",
  overdue: "Overdue carried forward",
  nextPeriod: "Next period",
  metrics: "Metrics",
  notes: "Notes and asks",
} as const satisfies Record<ReportSectionKey, string>

export const SECTION_SOURCE = Object.fromEntries(
  REPORT_SECTIONS.map((section) => [section.key, section.source]),
) as Record<ReportSectionKey, SectionSource>

/**
 * The sections a member may type into: the two author-only ones plus the six row sections, whose
 * computed rows the member cannot edit but whose one-line commentary they can. The server-owned
 * pair (`header`, `metrics`) is not in this list, which is what makes `readContent` refuse them.
 */
export const PROSE_SECTIONS = REPORT_SECTIONS.filter((s) => s.source !== "server").map((s) => s.key)
export const SERVER_SECTIONS = REPORT_SECTIONS.filter((s) => s.source === "server").map((s) => s.key)

export function isReportSectionKey(value: unknown): value is ReportSectionKey {
  return typeof value === "string" && (Object.keys(SECTION_TITLE) as readonly string[]).includes(value)
}

/** A client may type into this section and nothing else. */
export function isProseSection(value: unknown): value is ReportSectionKey {
  return isReportSectionKey(value) && SECTION_SOURCE[value] !== "server"
}

export const REPORT_TEMPLATES = ["general", "engineering", "technical", "assurance", "creative"] as const
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number]

export const TEMPLATE_LABEL: Record<ReportTemplate, string> = {
  general: "General",
  engineering: "Engineering & delivery",
  technical: "Technical & service",
  assurance: "Assurance & audit",
  creative: "Creative & design",
}

export function isReportTemplate(value: unknown): value is ReportTemplate {
  return typeof value === "string" && (REPORT_TEMPLATES as readonly string[]).includes(value)
}

const ALL: ReportSectionKey[] = REPORT_SECTIONS.map((s) => s.key)

/**
 * Every template holds all ten; the order is what a reader sees first. `engineering` puts the
 * sprint-shaped work before the paperwork, `technical` the opposite, `assurance` opens with what
 * was produced and evidenced, `creative` with the deliverables and their review rounds.
 */
export const TEMPLATE_SECTIONS: Record<ReportTemplate, ReportSectionKey[]> = {
  general: ALL,
  engineering: [
    "header",
    "summary",
    "completed",
    "inProgress",
    "blocked",
    "deliverables",
    "overdue",
    "nextPeriod",
    "metrics",
    "notes",
  ],
  technical: [
    "header",
    "summary",
    "deliverables",
    "blocked",
    "inProgress",
    "completed",
    "overdue",
    "nextPeriod",
    "metrics",
    "notes",
  ],
  assurance: [
    "header",
    "summary",
    "deliverables",
    "completed",
    "overdue",
    "blocked",
    "inProgress",
    "nextPeriod",
    "metrics",
    "notes",
  ],
  creative: [
    "header",
    "summary",
    "deliverables",
    "inProgress",
    "completed",
    "blocked",
    "overdue",
    "nextPeriod",
    "metrics",
    "notes",
  ],
}

export const TEMPLATE_METRICS: Record<ReportTemplate, MetricKey[]> = {
  general: ["entries", "minutes", "completedTasks", "deliverablesProduced", "blockedTasks"],
  engineering: ["storyPointsCompleted", "completedTasks", "sprintItems", "inProgressTasks", "minutes", "blockedTasks"],
  technical: ["deliverablesProduced", "completedTasks", "reviewRounds", "overdueCarried", "blockedTasks", "minutes"],
  assurance: ["deliverablesProduced", "activeDays", "quietDays", "overdueCarried", "blockedTasks", "entries"],
  creative: ["deliverablesProduced", "reviewRounds", "inProgressTasks", "minutes", "completedTasks"],
}

/**
 * The KPI strip's copy. `Record<MetricKey, string>` means a new metric in
 * lib/reports/aggregate.ts is a compile error here rather than an undefined label on screen —
 * which is the difference between a report that reads "undefined" and one that reads like a
 * person wrote it.
 */
export const METRIC_LABEL: Record<MetricKey, string> = {
  entries: "Log entries",
  minutes: "Time logged",
  activeDays: "Active days",
  quietDays: "Quiet days",
  taskEvents: "Status changes",
  completedTasks: "Completed",
  inProgressTasks: "In progress",
  blockedTasks: "Blocked",
  deliverablesProduced: "Deliverables produced",
  deliverablesDelivered: "Deliverables delivered",
  reviewRounds: "Awaiting review",
  overdueCarried: "Overdue carried",
  nextPeriodItems: "Planned next",
  storyPointsCompleted: "Story points done",
  sprintItems: "In a sprint",
}

export const CHART_KEYS = ["discipline", "kind", "taskStatus", "priority", "series"] as const
export type ChartKey = (typeof CHART_KEYS)[number]

export const CHART_LABEL: Record<ChartKey, string> = {
  discipline: "Time by discipline",
  kind: "Mix of work",
  taskStatus: "Tasks by status",
  priority: "Tasks by priority",
  series: "Per day across the period",
}

export const TEMPLATE_CHARTS: Record<ReportTemplate, ChartKey[]> = {
  general: ["discipline", "kind"],
  engineering: ["series", "taskStatus", "priority"],
  technical: ["series", "discipline", "kind"],
  assurance: ["series", "discipline", "taskStatus"],
  creative: ["discipline", "kind", "taskStatus"],
}

/** The author's own vocabulary for "what kind of work is this" is the only input to this. */
export function templateForDiscipline(discipline: string | null | undefined): ReportTemplate {
  if (isWorkDiscipline(discipline)) {
    const template = DISCIPLINE_TEMPLATE[discipline as WorkDiscipline]
    if (isReportTemplate(template)) return template
  }
  return "general"
}

export function sectionsFor(template: ReportTemplate): ReportSectionKey[] {
  return TEMPLATE_SECTIONS[template] ?? TEMPLATE_SECTIONS.general
}

export const MAX_SECTION_TEXT = 20_000

export type ReportSectionContent = { text: string }
export type ReportContent = Partial<Record<ReportSectionKey, ReportSectionContent>>

/** A new draft: every prose section present and empty, no server section writable. */
export function emptyContent(template: ReportTemplate): ReportContent {
  const order = sectionsFor(template)
  const content: ReportContent = {}
  for (const key of order) {
    if (isProseSection(key)) content[key] = { text: "" }
  }
  return content
}
