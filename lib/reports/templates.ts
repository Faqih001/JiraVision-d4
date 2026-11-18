// What a report is made of. One universal report: the section inventory is spec §6's ten, in
// the order a supervisor reads them, and every report carries all of them — dropping a section
// is how a report ends up with a hole a recipient reads as concealment. Empty row sections hide
// on screen, but the shape never varies between members, so reports stay comparable line for line.

import { formatMinutes } from "@/lib/worklog/entries"
import type { Count, MetricKey } from "./aggregate"

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

/**
 * The stored `template` column's vocabulary. New drafts all write "general"; the other ids only
 * exist on rows saved before templates were retired, and must still parse when read back.
 */
export const REPORT_TEMPLATES = ["general", "engineering", "technical", "assurance", "creative"] as const
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number]

export function isReportTemplate(value: unknown): value is ReportTemplate {
  return typeof value === "string" && (REPORT_TEMPLATES as readonly string[]).includes(value)
}

/** The one canonical section order — the inventory's own order, header first, notes last. */
export const SECTION_ORDER: ReportSectionKey[] = REPORT_SECTIONS.map((s) => s.key)

/** The KPI strip: six tiles, the same six for every report. */
export const LEADING_METRICS: MetricKey[] = [
  "entries",
  "minutes",
  "completedTasks",
  "deliverablesProduced",
  "blockedTasks",
  "overdueCarried",
]

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
  opsEvents: "Ops events",
  registerItemsHeld: "Register items held",
  registerVerifications: "Register verifications",
  ticketsResolved: "Tickets resolved",
  ticketsOpen: "Open tickets",
  ticketActions: "Ticket actions",
  goalCheckins: "Goal check-ins",
  goalsAchieved: "Goals achieved",
  meetings: "Meetings",
  retroNotes: "Retro notes",
  retroActionsOpen: "Open retro actions",
  careerSignoffs: "Career sign-offs",
  careerRequests: "Career requests",
  growthReviews: "Growth reviews",
  playbooksPublished: "Playbooks published",
  playbookRuns: "Playbook runs",
  automationRulesActive: "Active automation rules",
  automationRuns: "Automation runs",
  aiMessages: "AI replies",
  aiTokens: "AI tokens",
  chatMessages: "Chat messages",
  gamificationXp: "XP earned",
  wellbeingCheckins: "Wellbeing check-ins",
  ethicsSnapshots: "Team ethics snapshots",
  emailsDelivered: "Digests delivered",
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

/** Every declared chart, in reading order: the period's shape first, then the splits. */
export const REPORT_CHARTS: ChartKey[] = ["series", "discipline", "kind", "taskStatus", "priority"]

export const MAX_SECTION_TEXT = 20_000

export type ReportSectionContent = { text: string }
export type ReportContent = Partial<Record<ReportSectionKey, ReportSectionContent>>

/** A new draft: every prose section present and empty, no server section writable. */
export function emptyContent(): ReportContent {
  const content: ReportContent = {}
  for (const key of PROSE_SECTIONS) content[key] = { text: "" }
  return content
}

/**
 * One tile per leading metric. Time is the only metric that is not a count, and a quiet period
 * says so in words: "0m" reads like a rounding error rather than like a week that had no time in it.
 */
export function formatMetricValue(key: MetricKey, count: Count): string {
  if (key === "minutes") return count.value === 0 ? "None logged" : formatMinutes(count.value)
  return String(count.value)
}
