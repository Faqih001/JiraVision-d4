// Client-side XLSX export for work reports and work logs.
// Generated in the browser from data already on screen — no server runtime, works on a bad connection.
// Uses exceljs. Multi-sheet workbooks with real date/number formats, frozen header row, autofilter.

import ExcelJS from "exceljs"
import type { ReportDto } from "@/lib/reports/report-fields"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import type { EntryDto, DeliverableDto } from "@/lib/worklog/entries"

export type ReportExportData = {
  report: ReportDto
  metrics: ReportAggregate
  authorName: string
  recipientNames: string[]
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

export async function exportReportXlsx(data: ReportExportData): Promise<void> {
  const { report, metrics, authorName, recipientNames } = data
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
  reportSheet.addRow({ field: "Template", value: report.template })
  reportSheet.addRow({ field: "Status", value: report.status })
  if (report.revisionOf) {
    reportSheet.addRow({ field: "Revision of", value: `#${report.revisionOf}` })
  }
  reportSheet.addRow({ field: "Recipients", value: recipientNames.join(", ") || "None" })
  reportSheet.addRow({ field: "Generated at", value: metrics.generatedAt })
  reportSheet.getRow(1).font = { bold: true }
  reportSheet.views = [{ state: "frozen", ySplit: 1 }]

  // Completed tasks sheet
  if (metrics.completed.length > 0) {
    const completedSheet = workbook.addWorksheet("Completed")
    completedSheet.columns = [
      { header: "Title", key: "title", width: 40 },
      { header: "Detail", key: "detail", width: 50 },
      { header: "Date", key: "date", width: 12 },
    ]
    for (const r of metrics.completed) {
      completedSheet.addRow({ title: r.title, detail: r.detail, date: r.date ?? "" })
    }
    completedSheet.getRow(1).font = { bold: true }
    completedSheet.views = [{ state: "frozen", ySplit: 1 }]
    addDateNumberFormats(completedSheet)
  }

  // Deliverables sheet
  if (metrics.deliverableRows.length > 0) {
    const dlvSheet = workbook.addWorksheet("Deliverables")
    dlvSheet.columns = [
      { header: "Title", key: "title", width: 40 },
      { header: "Detail", key: "detail", width: 50 },
      { header: "Date", key: "date", width: 12 },
    ]
    for (const r of metrics.deliverableRows) {
      dlvSheet.addRow({ title: r.title, detail: r.detail, date: r.date ?? "" })
    }
    dlvSheet.getRow(1).font = { bold: true }
    dlvSheet.views = [{ state: "frozen", ySplit: 1 }]
    addDateNumberFormats(dlvSheet)
  }

  // By discipline sheet
  if (metrics.byDiscipline.length > 0) {
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
  if (metrics.byTaskStatus.length > 0) {
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
