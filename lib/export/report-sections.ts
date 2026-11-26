// Shared section definitions for PDF and Excel report exports and their pre-download preview.

import { MODULE_LABEL, type ReportAggregate } from "@/lib/reports/aggregate"
import { MODULE_SECTIONS, moduleRowsFor, type ModuleSectionKey } from "@/lib/reports/module-sections"
import type { ReportDto } from "@/lib/reports/report-fields"
import { scopedModuleSections, scopedTimeline, type ModuleScope } from "@/lib/reports/scope"

export const CORE_EXPORT_SECTION_KEYS = [
  "summary",
  "completed",
  "deliverables",
  "inProgress",
  "blocked",
  "overdue",
  "nextPeriod",
  "notes",
  "breakdowns",
  "timeline",
] as const

export type CoreExportSectionKey = (typeof CORE_EXPORT_SECTION_KEYS)[number]
export type ExportSectionKey = CoreExportSectionKey | ModuleSectionKey
export type ExportSectionSelection = Record<ExportSectionKey, boolean>

export const CORE_EXPORT_SECTION_LABEL: Record<CoreExportSectionKey, string> = {
  summary: "Summary",
  completed: "Completed tasks",
  deliverables: "Deliverables",
  inProgress: "In progress",
  blocked: "Blocked / at risk",
  overdue: "Overdue carried forward",
  nextPeriod: "Next period",
  notes: "Notes and asks",
  breakdowns: "Metrics & breakdowns",
  timeline: "Activity timeline",
}

export function exportSectionLabel(key: ExportSectionKey): string {
  if (key in CORE_EXPORT_SECTION_LABEL) {
    return CORE_EXPORT_SECTION_LABEL[key as CoreExportSectionKey]
  }
  return MODULE_LABEL[key as ModuleSectionKey]
}

export function exportSectionKeysForScope(scope: ModuleScope): ExportSectionKey[] {
  const modules = scopedModuleSections(scope)
  return [
    "summary",
    "completed",
    "deliverables",
    "inProgress",
    "blocked",
    "overdue",
    "nextPeriod",
    ...modules,
    "timeline",
    "breakdowns",
    "notes",
  ]
}

export function defaultExportSections(): ExportSectionSelection {
  const entries: [ExportSectionKey, boolean][] = [
    ...CORE_EXPORT_SECTION_KEYS.map((key): [ExportSectionKey, boolean] => [key, true]),
    ...MODULE_SECTIONS.map((key): [ExportSectionKey, boolean] => [key, true]),
  ]
  return Object.fromEntries(entries) as ExportSectionSelection
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
    case "timeline":
      return scopedTimeline(metrics.timeline, scope).length
    default:
      return moduleRowsFor(key, metrics).length
  }
}
