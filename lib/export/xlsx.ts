// Client-side XLSX export for work reports and work logs.
// Generated in the browser from data already on screen — no server runtime, works on a bad connection.
// Uses exceljs. Multi-sheet workbooks with real date/number formats, frozen header row, autofilter.

import ExcelJS from "exceljs"
import { MODULE_LABEL } from "@/lib/reports/aggregate"
import { moduleRowsFor } from "@/lib/reports/module-sections"
import { scopedModuleSections, scopedTimeline, scopedByModule, type ModuleScope } from "@/lib/reports/scope"
import type { ReportDto } from "@/lib/reports/report-fields"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import type { EntryDto, DeliverableDto } from "@/lib/worklog/entries"
import {
  isSectionIncluded,
  type ExportSectionSelection,
} from "@/lib/export/report-sections"

export type ReportExportData = {
  report: ReportDto
  metrics: ReportAggregate
  authorName: string
  recipientNames: string[]
  scope?: ModuleScope
  sections?: Partial<ExportSectionSelection>
}

export type PreviewXlsxSheet = {
  name: string
  columns: { header: string; key: string }[]
  rows: Record<string, string | number>[]
}

export type LogExportData = {
  entries: EntryDto[]
  deliverables: DeliverableDto[]
  from: string
  to: string
  authorName: string
}

function filename(scope: string, stamp: string): string {
  return `jiravision-${scope}-${stamp}.xlsx`
}

function addDateNumberFormats(worksheet: ExcelJS.Worksheet) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.eachCell((cell, colNumber) => {
      const value = cell.value
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        cell.value = new Date(value)
        cell.numFmt = "yyyy-mm-dd"
      } else if (typeof value === "number" && colNumber > 1) {
        const headerCell = worksheet.getRow(1).getCell(colNumber)
        if (headerCell.value && /minutes|hours/i.test(String(headerCell.value))) {
          cell.numFmt = "#,##0"
        }
      }
    })
  })
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function previewReportXlsxSheets(data: ReportExportData): PreviewXlsxSheet[] {
  const { report, metrics, authorName, recipientNames, scope = null, sections } = data
  const sheets: PreviewXlsxSheet[] = []

  const reportRows: Record<string, string | number>[] = [
    { field: "Title", value: report.title },
    { field: "Author", value: authorName },
    { field: "Period", value: metrics.period.label },
    { field: "Status", value: report.status },
  ]
  if (report.revisionOf) {
    reportRows.push({ field: "Revision of", value: `#${report.revisionOf}` })
  }
  reportRows.push(
    { field: "Recipients", value: recipientNames.join(", ") || "None" },
    { field: "Generated at", value: metrics.generatedAt },
  )
  if (isSectionIncluded(sections, "summary") && report.content.summary?.text?.trim()) {
    reportRows.push({ field: "Summary", value: report.content.summary.text.trim() })
  }
  if (isSectionIncluded(sections, "notes") && report.content.notes?.text?.trim()) {
    reportRows.push({ field: "Notes and asks", value: report.content.notes.text.trim() })
  }
  sheets.push({
    name: "Report",
    columns: [
      { header: "Field", key: "field" },
      { header: "Value", key: "value" },
    ],
    rows: reportRows,
  })

  const rowSheet = (name: string, items: { title: string; detail: string; date: string | null }[]) => {
    sheets.push({
      name,
      columns: [
        { header: "Title", key: "title" },
        { header: "Detail", key: "detail" },
        { header: "Date", key: "date" },
      ],
      rows: items.map((r) => ({ title: r.title, detail: r.detail, date: r.date ?? "" })),
    })
  }

  if (isSectionIncluded(sections, "completed") && metrics.completed.length > 0) {
    rowSheet("Completed", metrics.completed)
  }
  if (isSectionIncluded(sections, "deliverables") && metrics.deliverableRows.length > 0) {
    rowSheet("Deliverables", metrics.deliverableRows)
  }
  if (isSectionIncluded(sections, "inProgress") && metrics.inProgress.length > 0) {
    rowSheet("In progress", metrics.inProgress)
  }
  if (isSectionIncluded(sections, "blocked") && metrics.blocked.length > 0) {
    rowSheet("Blocked", metrics.blocked)
  }
  if (isSectionIncluded(sections, "overdue") && metrics.overdue.length > 0) {
    rowSheet("Overdue", metrics.overdue)
  }
  if (isSectionIncluded(sections, "nextPeriod") && metrics.nextPeriod.length > 0) {
    rowSheet("Next period", metrics.nextPeriod)
  }

  if (isSectionIncluded(sections, "breakdowns")) {
    if (metrics.byDiscipline.length > 0) {
      sheets.push({
        name: "By discipline",
        columns: [
          { header: "Discipline", key: "discipline" },
          { header: "Count", key: "count" },
          { header: "Minutes", key: "minutes" },
        ],
        rows: metrics.byDiscipline.map((b) => ({
          discipline: b.label,
          count: b.count.value,
          minutes: b.minutes.value,
        })),
      })
    }
    if (metrics.byTaskStatus.length > 0) {
      sheets.push({
        name: "By status",
        columns: [
          { header: "Status", key: "status" },
          { header: "Count", key: "count" },
        ],
        rows: metrics.byTaskStatus.map((b) => ({ status: b.label, count: b.count.value })),
      })
    }
  }

  for (const section of scopedModuleSections(scope)) {
    if (!isSectionIncluded(sections, section)) continue
    const rows = moduleRowsFor(section, metrics)
    if (rows.length > 0) rowSheet(MODULE_LABEL[section], rows)
  }

  if (isSectionIncluded(sections, "timeline")) {
    const timeline = scopedTimeline(metrics.timeline, scope)
    if (timeline.length > 0) {
      sheets.push({
        name: "Timeline",
        columns: [
          { header: "Date", key: "date" },
          { header: "Source", key: "source" },
          { header: "Title", key: "title" },
          { header: "Detail", key: "detail" },
        ],
        rows: timeline.map((r) => ({
          date: r.date ?? "",
          source: MODULE_LABEL[r.source],
          title: r.title,
          detail: r.detail,
        })),
      })
    }
  }

  if (isSectionIncluded(sections, "breakdowns")) {
    const byModule = scopedByModule(metrics.byModule, scope)
    if (byModule.length > 0) {
      sheets.push({
        name: "Workspace mix",
        columns: [
          { header: "Module", key: "module" },
          { header: "Count", key: "count" },
          { header: "Minutes", key: "minutes" },
        ],
        rows: byModule.map((m) => ({
          module: m.label,
          count: m.count.value,
          minutes: m.minutes.value,
        })),
      })
    }
    if (metrics.period.monthSeries && metrics.series.length > 0) {
      sheets.push({
        name: "Monthly series",
        columns: [
          { header: "Month", key: "month" },
          { header: "Entries", key: "entries" },
          { header: "Minutes", key: "minutes" },
        ],
        rows: metrics.series.map((s) => ({
          month: s.label,
          entries: s.entries.value,
          minutes: s.minutes.value,
        })),
      })
    }
  }

  return sheets
}

export async function exportReportXlsx(data: ReportExportData): Promise<void> {
  const { report, metrics, authorName, recipientNames, scope = null, sections } = data
  const workbook = new ExcelJS.Workbook()
  const stamp = report.submittedAt?.slice(0, 10) ?? report.createdAt.slice(0, 10)

  // Report sheet
  const reportSheet = workbook.addWorksheet("Report")
  reportSheet.columns = [
    { header: "Field", key: "field", width: 20 },
    { header: "Value", key: "value", width: 40 },
  ]
  reportSheet.addRow({ field: "Title", value: report.title })
  reportSheet.addRow({ field: "Author", value: authorName })
  reportSheet.addRow({ field: "Period", value: metrics.period.label })
  reportSheet.addRow({ field: "Status", value: report.status })
  if (report.revisionOf) {
    reportSheet.addRow({ field: "Revision of", value: `#${report.revisionOf}` })
  }
  reportSheet.addRow({ field: "Recipients", value: recipientNames.join(", ") || "None" })
  reportSheet.addRow({ field: "Generated at", value: metrics.generatedAt })
  if (isSectionIncluded(sections, "summary") && report.content.summary?.text?.trim()) {
    reportSheet.addRow({ field: "Summary", value: report.content.summary.text.trim() })
  }
  if (isSectionIncluded(sections, "notes") && report.content.notes?.text?.trim()) {
    reportSheet.addRow({ field: "Notes and asks", value: report.content.notes.text.trim() })
  }
  reportSheet.getRow(1).font = { bold: true }
  reportSheet.views = [{ state: "frozen", ySplit: 1 }]

  const populateRowSheet = (sheet: ExcelJS.Worksheet, rows: { title: string; detail: string; date: string | null }[]) => {
    sheet.columns = [
      { header: "Title", key: "title", width: 40 },
      { header: "Detail", key: "detail", width: 50 },
      { header: "Date", key: "date", width: 12 },
    ]
    for (const r of rows) {
      sheet.addRow({ title: r.title, detail: r.detail, date: r.date ?? "" })
    }
    sheet.getRow(1).font = { bold: true }
    sheet.views = [{ state: "frozen", ySplit: 1 }]
    addDateNumberFormats(sheet)
  }

  // Completed tasks sheet
  if (isSectionIncluded(sections, "completed") && metrics.completed.length > 0) {
    populateRowSheet(workbook.addWorksheet("Completed"), metrics.completed)
  }

  // Deliverables sheet
  if (isSectionIncluded(sections, "deliverables") && metrics.deliverableRows.length > 0) {
    populateRowSheet(workbook.addWorksheet("Deliverables"), metrics.deliverableRows)
  }

  if (isSectionIncluded(sections, "inProgress") && metrics.inProgress.length > 0) {
    populateRowSheet(workbook.addWorksheet("In progress"), metrics.inProgress)
  }

  if (isSectionIncluded(sections, "blocked") && metrics.blocked.length > 0) {
    populateRowSheet(workbook.addWorksheet("Blocked"), metrics.blocked)
  }

  if (isSectionIncluded(sections, "overdue") && metrics.overdue.length > 0) {
    populateRowSheet(workbook.addWorksheet("Overdue"), metrics.overdue)
  }

  if (isSectionIncluded(sections, "nextPeriod") && metrics.nextPeriod.length > 0) {
    populateRowSheet(workbook.addWorksheet("Next period"), metrics.nextPeriod)
  }

  // By discipline sheet
  if (isSectionIncluded(sections, "breakdowns") && metrics.byDiscipline.length > 0) {
    const discSheet = workbook.addWorksheet("By discipline")
    discSheet.columns = [
      { header: "Discipline", key: "discipline", width: 20 },
      { header: "Count", key: "count", width: 10 },
      { header: "Minutes", key: "minutes", width: 10 },
    ]
    for (const b of metrics.byDiscipline) {
      discSheet.addRow({ discipline: b.label, count: b.count.value, minutes: b.minutes.value })
    }
    discSheet.getRow(1).font = { bold: true }
    discSheet.views = [{ state: "frozen", ySplit: 1 }]
  }

  // By status sheet
  if (isSectionIncluded(sections, "breakdowns") && metrics.byTaskStatus.length > 0) {
    const statusSheet = workbook.addWorksheet("By status")
    statusSheet.columns = [
      { header: "Status", key: "status", width: 15 },
      { header: "Count", key: "count", width: 10 },
    ]
    for (const b of metrics.byTaskStatus) {
      statusSheet.addRow({ status: b.label, count: b.count.value })
    }
    statusSheet.getRow(1).font = { bold: true }
    statusSheet.views = [{ state: "frozen", ySplit: 1 }]
  }

  // One sheet per activity module that has rows
  for (const section of scopedModuleSections(scope)) {
    if (!isSectionIncluded(sections, section)) continue
    const rows = moduleRowsFor(section, metrics)
    if (rows.length === 0) continue
    populateRowSheet(workbook.addWorksheet(MODULE_LABEL[section]), rows)
  }

  // Merged activity timeline
  if (isSectionIncluded(sections, "timeline")) {
    const timeline = scopedTimeline(metrics.timeline, scope)
    if (timeline.length > 0) {
      const timelineSheet = workbook.addWorksheet("Timeline")
      timelineSheet.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Source", key: "source", width: 15 },
        { header: "Title", key: "title", width: 40 },
        { header: "Detail", key: "detail", width: 50 },
      ]
      for (const r of timeline) {
        timelineSheet.addRow({ date: r.date ?? "", source: MODULE_LABEL[r.source], title: r.title, detail: r.detail })
      }
      timelineSheet.getRow(1).font = { bold: true }
      timelineSheet.views = [{ state: "frozen", ySplit: 1 }]
      timelineSheet.autoFilter = { from: "A1", to: `D${timeline.length + 1}` }
      addDateNumberFormats(timelineSheet)
    }
  }

  // Workspace mix: per-module counts
  if (isSectionIncluded(sections, "breakdowns")) {
    const byModule = scopedByModule(metrics.byModule, scope)
    if (byModule.length > 0) {
      const mixSheet = workbook.addWorksheet("Workspace mix")
      mixSheet.columns = [
        { header: "Module", key: "module", width: 20 },
        { header: "Count", key: "count", width: 10 },
        { header: "Minutes", key: "minutes", width: 10 },
      ]
      for (const m of byModule) {
        mixSheet.addRow({ module: m.label, count: m.count.value, minutes: m.minutes.value })
      }
      mixSheet.getRow(1).font = { bold: true }
      mixSheet.views = [{ state: "frozen", ySplit: 1 }]
    }

    // Monthly series sheet (yearly only)
    if (metrics.period.monthSeries && metrics.series.length > 0) {
      const seriesSheet = workbook.addWorksheet("Monthly series")
      seriesSheet.columns = [
        { header: "Month", key: "month", width: 15 },
        { header: "Entries", key: "entries", width: 10 },
        { header: "Minutes", key: "minutes", width: 10 },
      ]
      for (const s of metrics.series) {
        seriesSheet.addRow({ month: s.label, entries: s.entries.value, minutes: s.minutes.value })
      }
      seriesSheet.getRow(1).font = { bold: true }
      seriesSheet.views = [{ state: "frozen", ySplit: 1 }]
    }
  }

  await downloadWorkbook(workbook, filename("report", stamp))
}

export async function exportLogXlsx(data: LogExportData): Promise<void> {
  const { entries, deliverables, from, to, authorName } = data
  const workbook = new ExcelJS.Workbook()
  const stamp = from

  // Entries sheet
  if (entries.length > 0) {
    const entriesSheet = workbook.addWorksheet("Entries")
    entriesSheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Title", key: "title", width: 40 },
      { header: "Kind", key: "kind", width: 15 },
      { header: "Minutes", key: "minutes", width: 10 },
      { header: "Task ID", key: "taskId", width: 10 },
    ]
    for (const e of entries) {
      entriesSheet.addRow({ date: e.workedOn, title: e.title, kind: e.kind, minutes: e.minutes ?? "", taskId: e.taskId ?? "" })
    }
    entriesSheet.addRow({ date: "Author", title: authorName })
    entriesSheet.addRow({ date: "Period", title: `${from} to ${to}` })
    entriesSheet.getRow(1).font = { bold: true }
    entriesSheet.views = [{ state: "frozen", ySplit: 1 }]
    entriesSheet.autoFilter = { from: "A1", to: `E${entries.length + 1}` }
    addDateNumberFormats(entriesSheet)
  }

  // Deliverables sheet
  if (deliverables.length > 0) {
    const dlvSheet = workbook.addWorksheet("Deliverables")
    dlvSheet.columns = [
      { header: "Name", key: "name", width: 40 },
      { header: "Type", key: "type", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Produced On", key: "producedOn", width: 12 },
    ]
    for (const d of deliverables) {
      dlvSheet.addRow({ name: d.name, type: d.type, status: d.status, producedOn: d.producedOn ?? "" })
    }
    dlvSheet.getRow(1).font = { bold: true }
    dlvSheet.views = [{ state: "frozen", ySplit: 1 }]
    dlvSheet.autoFilter = { from: "A1", to: `D${deliverables.length + 1}` }
    addDateNumberFormats(dlvSheet)
  }

  await downloadWorkbook(workbook, filename("log", stamp))
}
