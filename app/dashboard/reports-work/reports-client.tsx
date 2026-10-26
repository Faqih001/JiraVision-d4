"use client"

// The period report builder. The URL is the state's serialised form, the numbers come from the
// API and are never recomputed in the browser, and the report's own sections render in the
// template's order — so a different discipline reads a differently-ordered document, not a
// differently-stone page.

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Copy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { localDay } from "@/lib/worklog/local-day"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import type { Period } from "@/lib/reports/period"
import type { ReportDto } from "@/lib/reports/report-fields"
import {
  defaultReportState,
  metricsSource,
  parseReportView,
  resolveReportPeriod,
  serializeReportView,
  type ReportState,
} from "@/lib/reports/view-state"
import { MyReportsSection, PeriodSection, ReportsSkeleton } from "./sections"

/** The three work-report endpoints share the `{ success, data | message }` envelope. */
async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null)
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

  // refresh() is read-only here; the write helper arrives with the buttons in Task 12.
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
        } else {
          const rowJson = await readJson(await fetch(`/api/reports/work/${state.reportId}`))
          if (rowJson?.success) setReport(rowJson.data.report as ReportDto)
          // The route answers 404 for a stranger's id; the page says the same thing the route does.
          else {
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

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: "Link copied", description: "It opens this page with the same period and filters." })
    } catch (error) {
      toast({ variant: "destructive", title: "Copy failed", description: (error as Error).message })
    }
  }, [toast])

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
        {/* Task 12 replaces this comment with the template-ordered report sections. */}
        {state.view === "build" && !aggregate ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
