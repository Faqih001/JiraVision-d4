"use client"

// The report dialogs: a report is created with a period, sent to chosen recipients, and destroyed
// with a confirmed click. All are controlled forms over a draft object rather than uncontrolled
// refs: the values shown are the values sent, and the route's whitelist checks them again anyway.

import { useEffect, useMemo, useState } from "react"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { previewReportPdfUrl } from "@/lib/export/pdf"
import { previewReportXlsxSheets } from "@/lib/export/xlsx"
import {
  defaultExportSections,
  EXPORT_SECTION_KEYS,
  EXPORT_SECTION_LABEL,
  exportSectionCount,
  type ExportSectionKey,
  type ExportSectionSelection,
} from "@/lib/export/report-sections"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MAX_REPORT_TITLE, type ReportDto } from "@/lib/reports/report-fields"
import { PERIOD_LABEL, PERIOD_TYPES, type PeriodType } from "@/lib/reports/period"
import {
  type ModuleSectionKey,
} from "@/lib/reports/module-sections"
import { type ModuleScope } from "@/lib/reports/scope"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import { moduleRowsFor } from "@/lib/reports/module-sections"
import {
  CORE_REPORT_SOURCES,
  REPORT_SOURCE_GROUPS,
  reportSourceLabel,
} from "@/lib/reports/source-catalog"

export type NewReportDraft = {
  title: string
  periodType: PeriodType
  scope: ModuleScope
}

export function NewReportDialog({
  open,
  busy,
  defaultTitle,
  defaultPeriodType,
  defaultScope,
  preview,
  onClose,
  onCreate,
}: {
  open: boolean
  busy: boolean
  defaultTitle: string
  defaultPeriodType: PeriodType
  defaultScope: ModuleScope
  preview: ReportAggregate | null
  onClose: () => void
  onCreate: (draft: NewReportDraft) => void
}) {
  const allModules = REPORT_SOURCE_GROUPS.flatMap((group) => group.sections)
  const [draft, setDraft] = useState<NewReportDraft>({
    title: defaultTitle,
    periodType: defaultPeriodType,
    scope: defaultScope,
  })
  const selectedModules = draft.scope ?? allModules

  const toggleModule = (module: ModuleSectionKey) => {
    const selected = new Set(selectedModules)
    if (selected.has(module)) {
      if (selected.size === 1) return
      selected.delete(module)
    } else {
      selected.add(module)
    }
    const ordered = allModules.filter((key) => selected.has(key))
    setDraft((prev) => ({
      ...prev,
      scope: ordered.length === allModules.length ? null : ordered,
    }))
  }

  const submit = () => {
    const title = draft.title.trim()
    if (!title) return
    onCreate({ ...draft, title })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New report</DialogTitle>
          <DialogDescription>
            Create a supervisor-ready report from the work your team recorded during the selected
            period. Core delivery data is always included; choose any additional sources below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-report-title">Title</Label>
            <Input
              id="new-report-title"
              value={draft.title}
              maxLength={MAX_REPORT_TITLE}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-report-type">Period type</Label>
            <Select
              value={draft.periodType}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, periodType: value as PeriodType }))
              }
            >
              <SelectTrigger id="new-report-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PERIOD_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Report coverage</Label>
            <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-xs font-medium">Always included</p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {CORE_REPORT_SOURCES.map((source) => (
                    <li key={source.label}>
                      <span className="font-medium text-foreground">{source.label}</span>
                      {" — "}
                      {source.description}
                    </li>
                  ))}
                </ul>
              </div>
              {REPORT_SOURCE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium">{group.label}</p>
                  <p className="mb-1 text-[11px] text-muted-foreground">{group.description}</p>
                  <div className="space-y-2">
                    {group.sections.map((module) => (
                      <label key={module} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedModules.includes(module)}
                          onCheckedChange={() => toggleModule(module)}
                        />
                        <span>{reportSourceLabel(module)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select at least one optional source, or keep all selected. Billing, integrations,
              settings and configuration pages are intentionally excluded from supervisor reports.
            </p>
            {preview ? (
              <div className="rounded-lg bg-muted/40 p-3 text-xs">
                <p className="font-medium">Preview for {preview.period.label}</p>
                <p className="mt-1 text-muted-foreground">
                  {preview.metrics.taskEvents.value} work-log events · {preview.metrics.completedTasks.value} completed tasks ·{" "}
                  {preview.deliverableRows.length} deliverables · {preview.metrics.blockedTasks.value} blockers
                </p>
                <p className="mt-1 text-muted-foreground">
                  {allModules
                    .filter((module) => selectedModules.includes(module))
                    .map((module) => `${moduleRowsFor(module, preview).length} ${reportSourceLabel(module).toLowerCase()}`)
                    .join(" · ")}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || draft.title.trim() === ""}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SubmitReportDialog({
  report,
  busy,
  onSubmit,
  onClose,
}: {
  report: ReportDto
  busy: boolean
  onSubmit: (recipientIds: number[]) => void
  onClose: () => void
}) {
  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const [recipientIds, setRecipientIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [membersRes, settingsRes] = await Promise.all([
          fetch("/api/team/members"),
          fetch("/api/settings"),
        ])
        const membersJson = await membersRes.json().catch(() => null)
        const settingsJson = await settingsRes.json().catch(() => null)
        if (cancelled) return
        if (membersJson?.success) {
          setMembers(
            (membersJson.teamMembers as { id: number; name: string }[]).map((m) => ({
              id: m.id,
              name: m.name,
            })),
          )
        } else {
          setLoadError(membersJson?.message ?? "Could not load your team")
        }
        if (settingsJson?.success && Array.isArray(settingsJson.settings.defaultReportRecipients)) {
          setRecipientIds(settingsJson.settings.defaultReportRecipients)
        }
      } catch (error) {
        if (!cancelled) setLoadError((error as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit report</DialogTitle>
          <DialogDescription>
            Choose who receives &quot;{report.title}&quot;. Once submitted, the report is locked —
            changes go through a revision.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members to send this to yet. Invite someone from the Team page, then submit.
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={recipientIds.includes(member.id)}
                  onCheckedChange={(checked) =>
                    setRecipientIds((prev) =>
                      checked === true ? [...prev, member.id] : prev.filter((id) => id !== member.id),
                    )
                  }
                />
                <span className="text-sm">{member.name}</span>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(recipientIds)}
            disabled={busy || loading || recipientIds.length === 0}
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmReportDelete({
  report,
  busy,
  onCancel,
  onConfirm,
}: {
  report: ReportDto | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={report !== null} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this draft?</DialogTitle>
          <DialogDescription>
            {report
              ? `"${report.title}" covers ${report.periodStart} to ${report.periodEnd}. Deleting it does not touch the work log entries behind it.`
              : "This report is gone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Keep it
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Delete draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type ExportFormat = "pdf" | "xlsx"

export function ExportPreviewDialog({
  open,
  initialFormat,
  report,
  metrics,
  scope,
  onClose,
  onDownload,
}: {
  open: boolean
  initialFormat: ExportFormat
  report: ReportDto
  metrics: ReportAggregate
  scope: ModuleScope
  onClose: () => void
  onDownload: (format: ExportFormat, sections: ExportSectionSelection) => void | Promise<void>
}) {
  const [format, setFormat] = useState<ExportFormat>(initialFormat)
  const [sections, setSections] = useState<ExportSectionSelection>(() => defaultExportSections())
  const [activeSheet, setActiveSheet] = useState(0)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setFormat(initialFormat)
  }, [initialFormat, open])

  const toggleSection = (key: ExportSectionKey) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const setAllSections = (value: boolean) => {
    setSections(
      Object.fromEntries(EXPORT_SECTION_KEYS.map((key) => [key, value])) as ExportSectionSelection,
    )
  }

  const pdfUrl = useMemo(() => {
    if (!open || format !== "pdf") return null
    return previewReportPdfUrl({
      report,
      metrics,
      authorName: "You",
      recipientNames: [],
      scope,
      sections,
    })
  }, [open, format, report, metrics, scope, sections])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const sheets = useMemo(() => {
    if (!open || format !== "xlsx") return []
    return previewReportXlsxSheets({
      report,
      metrics,
      authorName: "You",
      recipientNames: [],
      scope,
      sections,
    })
  }, [open, format, report, metrics, scope, sections])

  const safeSheetIndex = sheets.length > 0 ? Math.min(activeSheet, sheets.length - 1) : 0
  const currentSheet = sheets[safeSheetIndex] ?? null

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await onDownload(format, sections)
      onClose()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle>Export preview</DialogTitle>
              <DialogDescription>
                Choose which sections appear in your {format === "pdf" ? "PDF" : "Excel workbook"} before downloading.
              </DialogDescription>
            </div>
            <div className="flex rounded-lg border border-border/60 p-0.5" role="group" aria-label="Export format">
              <Button
                type="button"
                size="sm"
                variant={format === "pdf" ? "default" : "ghost"}
                className="h-7 px-3 text-[12px]"
                onClick={() => setFormat("pdf")}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant={format === "xlsx" ? "default" : "ghost"}
                className="h-7 px-3 text-[12px]"
                onClick={() => setFormat("xlsx")}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Excel
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Sections to include</p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => setAllSections(true)}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => setAllSections(false)}
                >
                  None
                </Button>
              </div>
            </div>
            <div className="max-h-[54vh] space-y-2 overflow-y-auto pr-1">
              {EXPORT_SECTION_KEYS.map((key) => {
                const count = exportSectionCount(key, report, metrics, scope)
                const id = `export-section-${key}`
                return (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        id={id}
                        checked={sections[key]}
                        onCheckedChange={() => toggleSection(key)}
                      />
                      <Label htmlFor={id} className="cursor-pointer truncate text-xs font-normal">
                        {EXPORT_SECTION_LABEL[key]}
                      </Label>
                    </div>
                    {count !== null ? (
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-border/60 bg-muted/20 p-2">
            {format === "pdf" ? (
              pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF export preview"
                  className="h-[58vh] w-full rounded border border-border/40 bg-white"
                />
              ) : (
                <div className="flex h-[58vh] items-center justify-center text-sm text-muted-foreground">
                  Generating PDF preview…
                </div>
              )
            ) : (
              <div className="flex h-[58vh] flex-col gap-2">
                <div className="flex flex-wrap gap-1 border-b border-border/60 pb-2">
                  {sheets.map((sheet, idx) => (
                    <Button
                      key={sheet.name}
                      type="button"
                      size="sm"
                      variant={idx === safeSheetIndex ? "default" : "outline"}
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => setActiveSheet(idx)}
                    >
                      {sheet.name}
                      <span className="ml-1.5 opacity-70 tabular-nums">{sheet.rows.length}</span>
                    </Button>
                  ))}
                </div>
                {currentSheet ? (
                  <div className="flex-1 overflow-auto rounded border border-border/40 bg-background">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                        <tr>
                          {currentSheet.columns.map((col) => (
                            <th
                              key={col.key}
                              className="border-b border-border/60 px-3 py-2 font-semibold whitespace-nowrap"
                            >
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {currentSheet.rows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-muted/30">
                            {currentSheet.columns.map((col) => (
                              <td
                                key={col.key}
                                className="max-w-[280px] truncate px-3 py-1.5 align-top"
                                title={String(row[col.key] ?? "")}
                              >
                                {String(row[col.key] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    No sheets selected.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={downloading}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleDownload()} disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            Download {format === "pdf" ? "PDF" : "Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
