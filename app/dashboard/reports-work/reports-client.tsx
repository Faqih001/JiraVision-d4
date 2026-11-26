"use client"

// The period report builder. The URL is the state's serialised form, the numbers come from the
// API and are never recomputed in the browser, and every report renders its sections in one
// fixed order — so every member's document reads the same way top to bottom.

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Bot, Calculator, Copy, Download, Filter, Plus, RefreshCw, Save, Send, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { localDay } from "@/lib/worklog/local-day"
import { assistantLink, periodQuestion } from "@/lib/assistant/ask"
import { exportReportPdf } from "@/lib/export/pdf"
import { exportReportXlsx } from "@/lib/export/xlsx"
import type { ExportSectionSelection } from "@/lib/export/report-sections"
import { DASHBOARD_SECTION_GRID } from "@/components/dashboard-kit"
import { MODULE_LABEL, type ReportAggregate } from "@/lib/reports/aggregate"
import { resolvePeriod, type Period } from "@/lib/reports/period"
import type { ReportDto } from "@/lib/reports/report-fields"
import { classifyRowRead } from "@/lib/reports/read-outcome"
import {
  PROSE_SECTIONS,
  SECTION_ORDER,
  type ReportContent,
  type ReportSectionKey,
} from "@/lib/reports/templates"
import type { RowSectionKey } from "@/lib/reports/row-sections"
import { MODULE_SECTIONS, moduleRowsFor, type ModuleSectionKey } from "@/lib/reports/module-sections"
import { inScope, scopeSummary, scopedTimeline, toggleModuleScope } from "@/lib/reports/scope"
import {
  adoptServerAnchor,
  defaultReportState,
  metricsSource,
  parseReportView,
  REPORT_VIEW_LABEL,
  REPORT_VIEWS,
  resolveReportPeriod,
  serializeReportView,
  SOURCE_LABEL,
  type ReportState,
} from "@/lib/reports/view-state"
import {
  ConfirmReportDelete,
  ExportPreviewDialog,
  NewReportDialog,
  SubmitReportDialog,
  type ExportFormat,
  type NewReportDraft,
} from "./dialogs"
import {
  CadenceSection,
  OpenDraftsSection,
  PipelineSection,
  ReportingSpanSection,
  ReportsKpiStrip,
  TurnaroundSection,
  WorkspaceMixSection,
} from "./overview"
import { ModuleSectionCard, TimelineSection } from "./module-sections"
import {
  HeaderSection,
  MetricsSection,
  MyReportsSection,
  PeriodSection,
  ProseSection,
  ReportsSkeleton,
  RowSection,
} from "./sections"
/** The three work-report endpoints share the `{ success, data | message }` envelope. */
async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null)
}

/** The prose the member owns, keyed by section. An untouched section is an empty string. */
type ProseDraft = Partial<Record<ReportSectionKey, string>>

function proseFromContent(content: ReportContent): ProseDraft {
  const out: ProseDraft = {}
  for (const key of PROSE_SECTIONS) out[key] = content[key]?.text ?? ""
  return out
}

/** A NUL cannot occur in report text, so joining on it cannot alias two different drafts. */
const PROSE_JOINER = String.fromCharCode(0)

/** One stable string for "is the form dirty", so eight textareas cannot disagree about it. */
function serializeProse(prose: ProseDraft): string {
  return PROSE_SECTIONS.map((key) => prose[key] ?? "").join(PROSE_JOINER)
}

export default function ReportsClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  // Until the first response arrives the browser zone is the best guess; the server answers with
  // users.timezone and every label is recomputed from it.
  const [timezone, setTimezone] = useState<string | null>(null)
  const [todayIso, setTodayIso] = useState(() => localDay(new Date(), null))
  const [state, setState] = useState<ReportState>(() => defaultReportState(localDay(new Date(), null)))
  // The URL is the source of truth until the first parse adopts it; rewriting before that would
  // strip a deep link on a fresh load.
  const [adopted, setAdopted] = useState(false)
  const [reports, setReports] = useState<ReportDto[]>([])
  const [report, setReport] = useState<ReportDto | null>(null)
  const [preview, setPreview] = useState<ReportAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [missingId, setMissingId] = useState<number | null>(null)
  const [period, setPeriod] = useState<Period | null>(null)
  // A transient row-read failure (a waking database, a dropped connection) is not "this report is
  // not yours": it gets its own message and a retry, never the absent-report notice.
  const [rowError, setRowError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // The form is separate from the loaded row: `saved*` holds what the server has, and the pair of
  // them is the only honest way to say "unsaved changes" across eight textareas.
  const [title, setTitle] = useState("")
  const [prose, setProse] = useState<ProseDraft>({})
  const [savedProse, setSavedProse] = useState<ProseDraft>({})
  const [savedTitle, setSavedTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ReportDto | null>(null)
  // The row the member chose to submit, which need not be the one the builder holds open.
  const [submitTarget, setSubmitTarget] = useState<ReportDto | null>(null)
  // Module-card drill-down is display state; the six computed sections keep their URL deep-links.
  const [moduleOpen, setModuleOpen] = useState<ModuleSectionKey | null>(null)
  const [exportPreviewTarget, setExportPreviewTarget] = useState<{
    report: ReportDto
    metrics: ReportAggregate
    format: ExportFormat
  } | null>(null)

  useEffect(() => {
    setTodayIso(localDay(new Date(), timezone))
  }, [timezone])

  useEffect(() => {
    const parsed = parseReportView(new URLSearchParams(search.toString()), todayIso)
    // Two views of the same thing are equal only when they serialise the same way, so the
    // comparison is against this client's own state rather than the raw query string.
    setState((prev) =>
      serializeReportView(parsed, todayIso) !== serializeReportView(prev, todayIso) ? parsed : prev,
    )
    setAdopted(true)
  }, [search, todayIso])

  useEffect(() => {
    if (!adopted) return
    const next = serializeReportView(state, todayIso)
    const target = next ? `/dashboard/reports-work?${next}` : "/dashboard/reports-work"
    // location.search keeps its leading `?` and serializeReportView does not, so the two are
    // compared after the strip — otherwise every render rewrites the URL and re-runs this effect.
    const current = window.location.search.replace(/^\?/u, "")
    if (next !== current) router.replace(target, { scroll: false })
  }, [adopted, state, todayIso, router])

  // One write path for the four actions, so a 400 from the route's whitelist is reported the
  // same way as a dropped connection: the message the server sent, in a toast.
  const mutate = useCallback(async (path: string, init?: RequestInit): Promise<string | null> => {
    try {
      const res = await fetch(path, init)
      const json = await readJson(res)
      if (!res.ok || !json?.success) return json?.message ?? `Request failed (${res.status})`
      return null
    } catch (error) {
      return (error as Error).message
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const qs = serializeReportView(state, todayIso)
    try {
      const listJson = await readJson(await fetch(`/api/reports/work?${qs}`))
      if (!listJson?.success) throw new Error(listJson?.message ?? "Could not load your reports")
      const serverToday = listJson.data.today as string
      setReports(listJson.data.reports as ReportDto[])
      setTimezone(listJson.data.timezone as string | null)
      setTodayIso(serverToday)
      // The list has its own loading state; don't keep its card spinning on slower preview/row reads.
      setLoading(false)
      // A day nobody chose follows the server's clock. Left alone, a stale browser guess would be
      // pinned into the URL as `?d=` the moment todayIso moves. Once the anchor matches, the same
      // object comes back: a new one with the same values rebuilds this loader and re-runs it.
      setState((prev) => adoptServerAnchor(prev, todayIso, serverToday))

      // The preview feeds both views: the builder's live figures and the list view's workspace
      // mix, so neither has to fall back on a stale stored snapshot. A failure is surfaced, not
      // swallowed — empty figures with no explanation read as a quiet period rather than an error.
      const previewRes = await fetch(`/api/reports/work/preview?${qs}`)
      const previewJson = await readJson(previewRes)
      if (previewJson?.success) {
        setPreview(previewJson.data.aggregate as ReportAggregate)
        setPeriod(previewJson.data.period as Period)
        setPreviewError(null)
      } else {
        setPreviewError(
          previewJson?.message ?? `Could not load the period figures (${previewRes.status || "network error"}).`,
        )
      }

      if (state.view === "build") {
        if (state.reportId === null) {
          setReport(null)
          setMissingId(null)
          setRowError(null)
          setTitle("")
          setProse({})
          setSavedProse({})
          setSavedTitle("")
        } else {
          const rowRes = await fetch(`/api/reports/work/${state.reportId}`)
          const rowJson = await readJson(rowRes)
          const outcome = classifyRowRead(rowRes.status, rowJson?.success === true)
          if (outcome === "ok") {
            const loaded = rowJson.data.report as ReportDto
            setReport(loaded)
            setMissingId(null)
            setRowError(null)
            setTitle(loaded.title)
            setProse(proseFromContent(loaded.content))
            setSavedProse(proseFromContent(loaded.content))
            setSavedTitle(loaded.title)
            const loadedScope = loaded.moduleScope
            if (state.scope === null && loadedScope && loadedScope.length > 0) {
              setState((prev) => (prev.scope !== null ? prev : { ...prev, scope: loadedScope }))
            }
          } else if (outcome === "absent") {
            setReport(null)
            setMissingId(state.reportId)
            setRowError(null)
          } else {
            // A transient failure is retryable, not a privacy violation: keep the absent notice
            // off and offer a retry instead of disabling the editor against a waking database.
            setReport(null)
            setMissingId(null)
            setRowError(
              rowJson?.message ?? `Could not load report ${state.reportId} (${rowRes.status || "network error"}).`,
            )
          }
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Period reports", description: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }, [state, todayIso, toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const patchState = useCallback(
    (patch: Partial<ReportState>) => setState((prev) => ({ ...prev, ...patch })),
    [],
  )

  const resolved = resolveReportPeriod(state)
  // The preview route is the only place the period is resolved for a payload, so the label above
  // the numbers and the numbers themselves come from one call.
  const shownPeriod = period ?? resolved
  const source = metricsSource(report)
  const aggregate = report?.metrics ?? preview
  const scopeKey = (scope: ReportState["scope"]) => scope?.join(",") ?? "all"
  const scopeDirty = report !== null && scopeKey(state.scope) !== scopeKey(report.moduleScope ?? null)
  const dirty = serializeProse(prose) !== serializeProse(savedProse) || title !== savedTitle || scopeDirty
  const askHref = assistantLink(periodQuestion(shownPeriod.label, shownPeriod.start, shownPeriod.end))

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: "Link copied", description: "It opens this page with the same period and filters." })
    } catch (error) {
      toast({ variant: "destructive", title: "Copy failed", description: (error as Error).message })
    }
  }, [toast])

  const saveDraft = useCallback(async () => {
    if (!report) {
      toast({
        title: "Nothing to save",
        description: "Create a draft first — a report needs a stored period before it can hold text.",
      })
      return
    }
    setBusy(true)
    const error = await mutate(`/api/reports/work/${report.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        content: Object.fromEntries(PROSE_SECTIONS.map((key) => [key, { text: prose[key] ?? "" }])),
        moduleScope: state.scope,
      }),
    })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error })
      return
    }
    setSavedProse(prose)
    setSavedTitle(title)
    await refresh()
    toast({ title: "Draft saved", description: title })
  }, [mutate, prose, refresh, report, state.scope, title, toast])

  const createDraft = useCallback(
    async (draft: NewReportDraft) => {
      // The dialog may name a different period type than the builder is showing; the create route
      // requires the span to be the one that type implies, so the span is re-resolved here rather
      // than sent stale and refused.
      const span =
        draft.periodType === state.periodType
          ? shownPeriod
          : resolvePeriod(draft.periodType, state.anchor, { from: state.customFrom, to: state.customTo })
      setBusy(true)
      const json = await readJson(
        await fetch("/api/reports/work", {
          method: "POST",
          body: JSON.stringify({
            title: draft.title,
            periodType: draft.periodType,
            periodStart: span.start,
            periodEnd: span.end,
            moduleScope: draft.scope,
          }),
        }),
      )
      setBusy(false)
      if (!json?.success) {
        toast({
          variant: "destructive",
          title: "Could not create the report",
          description: json?.message ?? "Request failed",
        })
        return
      }
      setNewOpen(false)
      patchState({
        view: "build",
        periodType: draft.periodType,
        reportId: (json.data.report as ReportDto).id,
        scope: draft.scope,
      })
      await refresh()
      toast({ title: "Draft created", description: draft.title })
    },
    [
      patchState,
      refresh,
      shownPeriod,
      state.anchor,
      state.customFrom,
      state.customTo,
      state.periodType,
      toast,
    ],
  )

  const recompute = useCallback(async () => {
    if (!report) return
    setBusy(true)
    const error = await mutate(`/api/reports/work/${report.id}/recompute`, { method: "POST" })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Recompute failed", description: error })
      return
    }
    await refresh()
    toast({ title: "Figures refreshed", description: `${shownPeriod.label} counted again from the work log.` })
  }, [mutate, refresh, report, shownPeriod.label, toast])

  const deleteDraft = useCallback(async () => {
    if (!pendingDelete) return
    setBusy(true)
    const error = await mutate(`/api/reports/work/${pendingDelete.id}`, { method: "DELETE" })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error })
      return
    }
    setPendingDelete(null)
    // Deleting a row from the list must not close a different report the builder holds open.
    if (pendingDelete.id === state.reportId) patchState({ reportId: null, view: "list" })
    await refresh()
    toast({ title: "Draft deleted" })
  }, [mutate, patchState, pendingDelete, refresh, state.reportId, toast])

  const submitReport = useCallback(
    async (recipientIds: number[]) => {
      if (!submitTarget) return
      setBusy(true)
      const json = await readJson(
        await fetch(`/api/reports/work/${submitTarget.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientIds }),
        }),
      )
      setBusy(false)
      if (!json?.success) {
        toast({
          variant: "destructive",
          title: "Submit failed",
          description: json?.message ?? json?.error ?? "Request failed",
        })
        return
      }
      setSubmitTarget(null)
      await refresh()
      toast({ title: "Report submitted", description: "Recipients have been notified." })
    },
    [submitTarget, toast, refresh],
  )

  const reviseReport = useCallback(async (id: number) => {
    setBusy(true)
    const json = await readJson(
      await fetch(`/api/reports/work/${id}/revise`, {
        method: "POST",
      }),
    )
    setBusy(false)
    if (!json?.success) {
      toast({
        variant: "destructive",
        title: "Revise failed",
        description: json?.message ?? json?.error ?? "Request failed",
      })
      return
    }
    const newReport = json.data.report as ReportDto
    patchState({ view: "build", reportId: newReport.id })
    await refresh()
    toast({ title: "Revision created", description: `New draft #${newReport.id} based on report #${id}` })
  }, [toast, refresh, patchState])

  const exportPdf = useCallback(
      (sections?: ExportSectionSelection, target?: { report: ReportDto; metrics: ReportAggregate }) => {
        const r = target?.report ?? report
        const m = target?.metrics ?? aggregate
        if (!r || !m) return
        exportReportPdf({
          report: r,
          metrics: m,
          authorName: r.authorName?.trim() || "You",
          recipientNames: r.recipientNames ?? [],
          scope: state.scope,
          sections,
        })
        toast({ title: "PDF exported" })
      },
        [report, aggregate, state.scope, toast],
  )

  const exportXlsx = useCallback(
      async (sections?: ExportSectionSelection, target?: { report: ReportDto; metrics: ReportAggregate }) => {
        const r = target?.report ?? report
        const m = target?.metrics ?? aggregate
        if (!r || !m) return
        await exportReportXlsx({
          report: r,
          metrics: m,
          authorName: r.authorName?.trim() || "You",
          recipientNames: r.recipientNames ?? [],
          scope: state.scope,
          sections,
        })
        toast({ title: "Excel exported" })
      },
        [report, aggregate, state.scope, toast],
  )

  const openReportPreview = useCallback(
    async (targetReport: ReportDto, format: ExportFormat = "pdf") => {
      if (targetReport.metrics) {
        setExportPreviewTarget({ report: targetReport, metrics: targetReport.metrics, format })
        return
      }
      setBusy(true)
      try {
        const params = new URLSearchParams({
          p: targetReport.periodType,
          d: targetReport.periodStart,
          from: targetReport.periodStart,
          to: targetReport.periodEnd,
        })
        const json = await readJson(await fetch(`/api/reports/work/preview?${params.toString()}`))
        if (!json?.success) {
          toast({
            variant: "destructive",
            title: "Preview failed",
            description: json?.message ?? "Could not load report figures for preview.",
          })
          return
        }
        setExportPreviewTarget({
          report: targetReport,
          metrics: json.data.aggregate as ReportAggregate,
          format,
        })
      } finally {
        setBusy(false)
      }
    },
    [toast],
  )

  // A plain function, not a callback: its closure over the current aggregate, URL state and prose
  // is the point, and the map below is rebuilt every render by design.
  const row = (section: RowSectionKey) => (
    <RowSection
      key={section}
      section={section}
      aggregate={aggregate}
      period={shownPeriod}
      expanded={state.open === section}
      comment={prose[section] ?? ""}
      onToggle={() => patchState({ open: state.open === section ? null : section })}
      onComment={(value) => setProse((prev) => ({ ...prev, [section]: value }))}
    />
  )

  const moduleCard = (section: ModuleSectionKey) =>
    inScope(section, state.scope) && aggregate && moduleRowsFor(section, aggregate).length > 0 ? (
      <ModuleSectionCard
        key={section}
        section={section}
        aggregate={aggregate}
        expanded={moduleOpen === section}
        onToggle={() => setModuleOpen(moduleOpen === section ? null : section)}
      />
    ) : null

  // SECTION_ORDER decides the order; the map decides that every declared section is present.
  // A report missing its blockers section is the failure mode §6 warns about, and it is
  // prevented by structure rather than by a reviewer noticing.
  const sectionNodes: Partial<Record<ReportSectionKey, React.ReactNode>> = {
    header: (
      <HeaderSection
        report={report}
        title={title}
        period={shownPeriod}
        sourceLabel={SOURCE_LABEL[source]}
        onTitle={setTitle}
      />
    ),
    summary: (
      <ProseSection
        key="summary"
        section="summary"
        value={prose.summary ?? ""}
        hint="Two or three sentences: what the period was, and what it cost."
        onChange={(value) => setProse((prev) => ({ ...prev, summary: value }))}
      />
    ),
    completed: row("completed"),
    deliverables: row("deliverables"),
    inProgress: row("inProgress"),
    blocked: row("blocked"),
    overdue: row("overdue"),
    nextPeriod: row("nextPeriod"),
    metrics: (
      <MetricsSection
        key="metrics"
        aggregate={aggregate}
        sourceLabel={SOURCE_LABEL[source]}
      />
    ),
    notes: (
      <ProseSection
        key="notes"
        section="notes"
        value={prose.notes ?? ""}
        rows={8}
        hint="Capacity, tooling, a decision you need from the reader — anything you would say if they asked."
        onChange={(value) => setProse((prev) => ({ ...prev, notes: value }))}
      />
    ),
  }

  if (loading && !aggregate && reports.length === 0) return <ReportsSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Period reports</h1>
          <p className="text-sm text-muted-foreground">
            A period, read back from the work log: what moved, what shipped, what is stuck.
            {source === "snapshot" && report?.metrics
              ? ` Figures as of ${report.metrics.generatedAt.slice(0, 10)}.`
              : ""}
          </p>
          <Link
            href={askHref}
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <Bot className="h-3.5 w-3.5" />
            Ask the assistant about {shownPeriod.label}
          </Link>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="flex rounded-lg border border-border/60 p-0.5" role="group" aria-label="Report view">
            {REPORT_VIEWS.map((view) => (
              <Button
                key={view}
                type="button"
                size="sm"
                variant={state.view === view ? "default" : "ghost"}
                className="h-7 px-3 text-[12px]"
                aria-pressed={state.view === view}
                onClick={() => patchState({ view })}
              >
                {REPORT_VIEW_LABEL[view]}
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New report
          </Button>
          {state.view === "build" ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Choose which activity modules this report covers"
                  >
                    <Filter className="mr-1 h-4 w-4" />
                    {scopeSummary(state.scope)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold">Modules in this report</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => patchState({ scope: null })}
                      disabled={state.scope === null}
                    >
                      All modules
                    </Button>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-auto pr-1">
                    {MODULE_SECTIONS.map((section) => {
                      const id = `scope-${section}`
                      return (
                        <div key={section} className="flex items-center gap-2">
                          <Checkbox
                            id={id}
                            checked={inScope(section, state.scope)}
                            onCheckedChange={() =>
                              patchState({ scope: toggleModuleScope(state.scope, section) })
                            }
                          />
                          <Label htmlFor={id} className="cursor-pointer text-[12px] font-normal">
                            {MODULE_LABEL[section]}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Work log, tasks, deliverables and planner always stay. The choice rides in the link.
                  </p>
                </PopoverContent>
              </Popover>
              {report?.status === "draft" && (
                <Button type="button" size="sm" onClick={() => setSubmitTarget(report)} disabled={busy}>
                  <Send className="mr-1 h-4 w-4" />
                  Submit
                </Button>
              )}
              {report && report.status !== "draft" && (
                <Button type="button" variant="outline" size="sm" onClick={() => void reviseReport(report.id)} disabled={busy}>
                  <Undo2 className="mr-1 h-4 w-4" />
                  Revise
                </Button>
              )}
              <Button type="button" size="sm" onClick={() => void saveDraft()} disabled={busy || report?.status !== "draft"} title={dirty ? "Unsaved changes" : "No changes to save"}>
                <Save className="mr-1 h-4 w-4" />
                Save draft
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void recompute()} disabled={busy || report === null}>
                <Calculator className="mr-1 h-4 w-4" />
                Recompute
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPendingDelete(report)} disabled={busy || report === null || report?.status !== "draft"}>
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => report && aggregate && setExportPreviewTarget({ report, metrics: aggregate, format: "pdf" })} disabled={!report || !aggregate}>
                  <Download className="mr-1 h-4 w-4" />
                  PDF
                </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => report && aggregate && setExportPreviewTarget({ report, metrics: aggregate, format: "xlsx" })} disabled={!report || !aggregate}>
                    <Download className="mr-1 h-4 w-4" />
                    Excel
                  </Button>
                </>
          ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Reload
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>

          <ReportsKpiStrip reports={reports} filtered={state.q.trim() !== ""} />

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <PeriodSection state={state} period={shownPeriod} patch={patchState} />
              <MyReportsSection
                reports={reports}
                loading={loading && reports.length === 0}
                openId={state.reportId}
                missingId={state.view === "build" ? missingId : null}
                query={state.q}
                timezone={timezone}
                onQuery={(value) => patchState({ q: value })}
                onOpen={(id) => patchState({ view: "build", reportId: id })}
                onPreview={(target) => void openReportPreview(target, "pdf")}
                onSubmit={(id) => setSubmitTarget(reports.find((item) => item.id === id) ?? null)}
                onRevise={(id) => void reviseReport(id)}
                onDelete={setPendingDelete}
                onCreate={() => setNewOpen(true)}
              />
            </div>
            {previewError !== null ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {previewError} The figures stay empty until this loads.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : null}
            {state.view === "build" && rowError !== null ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <p className="text-sm text-destructive">{rowError}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : null}
            {state.view === "build" ? (
              <div className={`${DASHBOARD_SECTION_GRID} md:grid-cols-2 xl:grid-cols-3`}>
                {/* The fixed section order is the document's order, so every member's report reads
                the same way top to bottom; the `contents` wrapper keeps the grid while giving
                each row a key. */}
                {SECTION_ORDER.map((key) => (
                  <div key={key} className="contents">
                    {sectionNodes[key]}
                    {key === "nextPeriod" ? (
                      <>
                        {MODULE_SECTIONS.map((section) => moduleCard(section))}
                        {aggregate && scopedTimeline(aggregate.timeline, state.scope).length > 0 ? (
                          <div className="md:col-span-2 xl:col-span-3">
                            <TimelineSection aggregate={aggregate} scope={state.scope} />
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ))}
                {!aggregate ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={`${DASHBOARD_SECTION_GRID} [&>*]:min-h-[320px]`}>
                <PipelineSection reports={reports} />
                <CadenceSection reports={reports} todayIso={todayIso} timezone={timezone} />
                <TurnaroundSection reports={reports} />
                <OpenDraftsSection reports={reports} todayIso={todayIso} timezone={timezone} />
                <ReportingSpanSection reports={reports} />
                <WorkspaceMixSection aggregate={preview} />
              </div>
            )}
          </div>

          {/* Mounted only while open, so the draft's defaults are always the period the builder is
          showing. Kept mounted, its first-render defaults would go stale and the create route
          would refuse the mismatch between periodType and the period sent. */}
          {newOpen ? (
            <NewReportDialog
              open
              busy={busy}
              defaultTitle={shownPeriod.label}
              defaultPeriodType={state.periodType}
              defaultScope={state.scope}
              preview={preview}
              onClose={() => setNewOpen(false)}
              onCreate={(draft) => void createDraft(draft)}
            />
          ) : null}
          <ConfirmReportDelete
            report={pendingDelete}
            busy={busy}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => void deleteDraft()}
          />
          {submitTarget ? (
            <SubmitReportDialog
              report={submitTarget}
              busy={busy}
              onSubmit={(recipientIds) => void submitReport(recipientIds)}
              onClose={() => setSubmitTarget(null)}
            />
          ) : null}
            {
              exportPreviewTarget?(
        <ExportPreviewDialog
          open
          initialFormat={exportPreviewTarget.format}
          report={exportPreviewTarget.report}
          metrics={exportPreviewTarget.metrics}
          scope={exportPreviewTarget.report.moduleScope ?? state.scope}
          onClose={() => setExportPreviewTarget(null)}
          onDownload={async (format, sections) => {
            const target = {
              report: exportPreviewTarget.report,
              metrics: exportPreviewTarget.metrics,
            }
            if (format === "pdf") exportPdf(sections, target)
            else await exportXlsx(sections, target)
          }}
        />
      ) : null}
        </div>
        )
}
