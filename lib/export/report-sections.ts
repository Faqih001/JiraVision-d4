// Shared section definitions for PDF and Excel report exports and their pre-download preview.

import type { ReportAggregate } from "@/lib/reports/aggregate"
import { moduleRowsFor } from "@/lib/reports/module-sections"
import type { ReportDto } from "@/lib/reports/report-fields"
import { scopedModuleSections, scopedTimeline, type ModuleScope } from "@/lib/reports/scope"

export const EXPORT_SECTION_KEYS = [
  "summary",
  "completed",
  "deliverables",
  "inProgress",
  "blocked",
  "overdue",
  "nextPeriod",
  "notes",
  "breakdowns",
  "modules",
  "timeline",
] as const

export type ExportSectionKey = (typeof EXPORT_SECTION_KEYS)[number]

export type ExportSectionSelection = Record<ExportSectionKey, boolean>

export const EXPORT_SECTION_LABEL: Record<ExportSectionKey, string> = {
  summary: "Summary",
  completed: "Completed tasks",
  deliverables: "Deliverables",
  inProgress: "In progress",
  blocked: "Blocked / at risk",
  overdue: "Overdue carried forward",
  nextPeriod: "Next period",
  notes: "Notes and asks",
  breakdowns: "Metrics & breakdowns",
  modules: "Activity modules",
  timeline: "Activity timeline",
}

export function defaultExportSections(): ExportSectionSelection {
  return {
    summary: true,
    completed: true,
    deliverables: true,
    inProgress: true,
    blocked: true,
    overdue: true,
    nextPeriod: true,
    notes: true,
    breakdowns: true,
    modules: true,
    timeline: true,
  }
}

export function isSectionIncluded(
  sections: Partial<ExportSectionSelection> | undefined,
  key: ExportSectionKey,
): boolean {
  return sections?.[key] ?? true
}

export function exportSectionCount(
  key: ExportSectionKey,
  report: ReportDto,
  metrics: ReportAggregate,
  scope: ModuleScope,
): number | null {
  switch (key) {
    case "summary":
      return report.content.summary?.text?.trim() ? 1 : 0
    case "completed":
      return metrics.completed.length
    case "deliverables":
      return metrics.deliverableRows.length
    case "inProgress":
      return metrics.inProgress.length
    case "blocked":
      return metrics.blocked.length
    case "overdue":
      return metrics.overdue.length
    case "nextPeriod":
      return metrics.nextPeriod.length
    case "notes":
      return report.content.notes?.text?.trim() ? 1 : 0
    case "breakdowns":
      return null
    case "modules":
      return scopedModuleSections(scope).reduce(
        (sum, mod) => sum + moduleRowsFor(mod, metrics).length,
        0,
      )
    case "timeline":
      return scopedTimeline(metrics.timeline, scope).length
  }
}
