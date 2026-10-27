"use client"

// The period report builder. The URL is the state's serialised form, the numbers come from the
// API and are never recomputed in the browser, and the report's own sections render in the
// template's order — so a different discipline reads a differently-ordered document, not a
// differently-stone page.

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calculator, Copy, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { localDay } from "@/lib/worklog/local-day"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import { resolvePeriod, type Period } from "@/lib/reports/period"
import type { ReportDto } from "@/lib/reports/report-fields"
import {
  PROSE_SECTIONS,
  sectionsFor,
  type ReportContent,
  type ReportSectionKey,
} from "@/lib/reports/templates"
import type { RowSectionKey } from "@/lib/reports/row-sections"
import {
  defaultReportState,
  effectiveTemplate,
  metricsSource,
  parseReportView,
  resolveReportPeriod,
  serializeReportView,
  SOURCE_LABEL,
  type ReportState,
} from "@/lib/reports/view-state"
import { ConfirmReportDelete, NewReportDialog, type NewReportDraft } from "./dialogs"
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
  const [reports, setReports] = useState<ReportDto[]>([])
  const [report, setReport] = useState<ReportDto | null>(null)
  const [preview, setPreview] = useState<ReportAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [missingId, setMissingId] = useState<number | null>(null)
  const [period, setPeriod] = useState<Period | null>(null)

  // The form is separate from the loaded row: `saved*` holds what the server has, and the pair of
  // them is the only honest way to say "unsaved changes" across eight textareas.
  const [title, setTitle] = useState("")
  const [prose, setProse] = useState<ProseDraft>({})
  const [savedProse, setSavedProse] = useState<ProseDraft>({})
  const [savedTitle, setSavedTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ReportDto | null>(null)

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
  }, [search, todayIso])

  useEffect(() => {
    const next = serializeReportView(state, todayIso)
    const target = next ? `/dashboard/reports-work?${next}` : "/dashboard/reports-work"
    // location.search keeps its leading `?` and serializeReportView does not, so the two are
    // compared after the strip — otherwise every render rewrites the URL and re-runs this effect.
    const current = window.location.search.replace(/^\?/u, "")
    if (next !== current) router.replace(target, { scroll: false })
  }, [state, todayIso, router])

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
      // A day nobody chose follows the server's clock. Left alone, a stale browser guess would be
      // pinned into the URL as `?d=` the moment todayIso moves.
      setState((prev) => (prev.anchor === todayIso ? { ...prev, anchor: serverToday } : prev))

      if (state.view === "build") {
        const previewJson = await readJson(await fetch(`/api/reports/work/preview?${qs}`))
        if (previewJson?.success) {
          setPreview(previewJson.data.aggregate as ReportAggregate)
          setPeriod(previewJson.data.period as Period)
        }
        if (state.reportId === null) {
          setReport(null)
          setMissingId(null)
          setTitle("")
          setProse({})
          setSavedProse({})
          setSavedTitle("")
        } else {
          const rowJson = await readJson(await fetch(`/api/reports/work/${state.reportId}`))
          if (rowJson?.success) {
            const loaded = rowJson.data.report as ReportDto
            setReport(loaded)
            setMissingId(null)
            setTitle(loaded.title)
            setProse(proseFromContent(loaded.content))
            setSavedProse(proseFromContent(loaded.content))
            setSavedTitle(loaded.title)
          } else {
            setReport(null)
            setMissingId(state.reportId)
          }
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Work reports", description: (error as Error).message })
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
  const dirty = serializeProse(prose) !== serializeProse(savedProse) || title !== savedTitle
  // `?tpl=auto` is a UI choice; a draft always stores a real template. Resolving it here, above
  // the actions, is what lets both the save body and the new-report dialog use the same answer.
  const templateChoice = effectiveTemplate(state, aggregate)

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
        template: templateChoice,
        content: Object.fromEntries(PROSE_SECTIONS.map((key) => [key, { text: prose[key] ?? "" }])),
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
  }, [mutate, prose, refresh, report, templateChoice, title, toast])

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
            template: draft.template,
            periodType: draft.periodType,
            periodStart: span.start,
            periodEnd: span.end,
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
    patchState({ reportId: null, view: "list" })
    await refresh()
    toast({ title: "Draft deleted" })
  }, [mutate, patchState, pendingDelete, refresh, toast])

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

  // The template decides the order; the map decides that a section the template does not lead
  // with is still present. A report missing its blockers section is the failure mode §6 warns
  // about, and it is prevented by structure rather than by a reviewer noticing.
  const sectionNodes: Partial<Record<ReportSectionKey, React.ReactNode>> = {
    header: (
      <HeaderSection
        report={report}
        title={title}
        period={shownPeriod}
        template={templateChoice}
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
        template={templateChoice}
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
          <h1 className="text-xl font-semibold">Work reports</h1>
          <p className="text-sm text-muted-foreground">
            A period, read back from the work log: what moved, what shipped, what is stuck.
            {source === "snapshot" && report?.metrics
              ? ` Figures as of ${report.metrics.generatedAt.slice(0, 10)}.`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New report
          </Button>
          <Button type="button" size="sm" onClick={() => void saveDraft()} disabled={busy} title={dirty ? "Unsaved changes" : "No changes to save"}>
            <Save className="mr-1 h-4 w-4" />
            Save draft
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void recompute()} disabled={busy || report === null}>
            <Calculator className="mr-1 h-4 w-4" />
            Recompute
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPendingDelete(report)} disabled={busy || report === null}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PeriodSection state={state} period={shownPeriod} patch={patchState} />
        <MyReportsSection
          reports={reports}
          loading={loading}
          openId={state.reportId}
          missingId={missingId}
          query={state.q}
          timezone={timezone}
          onQuery={(value) => patchState({ q: value })}
          onOpen={(id) => patchState({ view: "build", reportId: id })}
        />
        {/* The template's order is the document's order, so every member's report reads the same
            way top to bottom; the `contents` wrapper keeps the grid while giving each row a key. */}
        {state.view === "build"
          ? sectionsFor(templateChoice).map((key) => (
              <div key={key} className="contents">
                {sectionNodes[key]}
              </div>
            ))
          : null}
        {state.view === "build" && !aggregate ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : null}
      </div>

      {/* Mounted only while open, so the draft's defaults are always the period and template the
          builder is showing. Kept mounted, its first-render defaults would go stale and the
          create route would refuse the mismatch between periodType and the period sent. */}
      {newOpen ? (
        <NewReportDialog
          open
          busy={busy}
          defaultTitle={shownPeriod.label}
          defaultTemplate={templateChoice}
          defaultPeriodType={state.periodType}
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
    </div>
  )
}
