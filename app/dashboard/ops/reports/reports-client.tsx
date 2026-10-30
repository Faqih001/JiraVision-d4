"use client"

// The report preview page (operations engine, D4b). The pack's opsConfig declares reportTemplates —
// a label, a period and an ordered list of KPI sections. This page renders each template read-only:
// its sections joined to the month's computed KPI values (via /api/ops/kpis — nothing estimated), and
// hands the member off to the normal work-report builder with that period selected. It writes nothing.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileBarChart2,
  Minus,
  TrendingDown,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type ReportSectionDef = { kpiId: string; label: string }

type ReportTemplateDef = {
  id: string
  label: string
  period: "daily" | "weekly" | "monthly" | "quarterly"
  sections: ReportSectionDef[]
}

type PackInfo = {
  packKey: string | null
  hasOpsConfig: boolean
  discipline: string | null
  reportTemplates: ReportTemplateDef[] | null
}

type KpiResult = {
  id: string
  label: string
  value: number
  target: number | null
  unit: string
  aggregation: string
  met: boolean | null
}

const PERIOD_LABEL: Record<ReportTemplateDef["period"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function monthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, mon - 1, 1))
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })
}

function isoUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`
}

// Deep-link into the normal work-report builder, prefilling the template's period. The builder's URL
// grammar is `v=build` (the authoring view), `p` (period type) and `d` (a day inside the period); it
// has no quarterly unit, so a quarterly template hands off to a custom span covering that quarter.
function builderHref(period: ReportTemplateDef["period"], month: string): string {
  const [year, mon] = month.split("-").map(Number)
  if (period === "quarterly") {
    const qStartMon = Math.floor((mon - 1) / 3) * 3 + 1 // 1-based first month of the quarter
    const from = `${year}-${String(qStartMon).padStart(2, "0")}-01`
    const to = isoUtc(new Date(Date.UTC(year, qStartMon + 2, 0))) // last day of the third month
    return `/dashboard/reports-work?${new URLSearchParams({ v: "build", p: "custom", from, to })}`
  }
  return `/dashboard/reports-work?${new URLSearchParams({
    v: "build",
    p: period,
    d: `${month}-01`,
  })}`
}

function formatValue(kpi: KpiResult): string {
  const value = kpi.aggregation === "ratio" ? kpi.value * 100 : kpi.value
  return (Math.round(value * 100) / 100).toLocaleString()
}

function formatTarget(kpi: KpiResult): string {
  if (kpi.target === null) return "no target"
  const target = kpi.aggregation === "ratio" ? kpi.target * 100 : kpi.target
  return `${Math.round(target * 100) / 100}${kpi.unit ? ` ${kpi.unit}` : ""}`
}

function MetGlyph({ met }: { met: boolean | null }) {
  if (met === true) return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-label="On target" />
  if (met === false) return <TrendingDown className="h-4 w-4 shrink-0 text-red-500" aria-label="Below target" />
  return <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="No target set" />
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function TemplateCard({
  template,
  kpiById,
  month,
}: {
  template: ReportTemplateDef
  kpiById: Map<string, KpiResult>
  month: string
}) {
  return (
    <SectionCard
      title={template.label}
      icon={<FileBarChart2 className="h-4 w-4" />}
      action={<Badge variant="outline">{PERIOD_LABEL[template.period]}</Badge>}
    >
      <div className="divide-y">
        {template.sections.map((section) => {
          const kpi = kpiById.get(section.kpiId)
          return (
            <div key={section.kpiId} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">{section.label}</span>
              {kpi ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatValue(kpi)}
                    {kpi.aggregation === "ratio" ? "%" : kpi.unit ? ` ${kpi.unit}` : ""}
                  </span>
                  <MetGlyph met={kpi.met} />
                  <span className="text-[11px] text-muted-foreground">{formatTarget(kpi)}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">no data for {monthLabel(month)}</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" asChild>
          <Link href={builderHref(template.period, month)}>
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Open in report builder
          </Link>
        </Button>
      </div>
    </SectionCard>
  )
}

export default function ReportsClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  const initialMonth = useMemo(() => {
    const fromUrl = search.get("month")
    return fromUrl && /^\d{4}-\d{2}$/.test(fromUrl) ? fromUrl : currentMonth()
  }, [search])

  const [pack, setPack] = useState<PackInfo | null>(null)
  const [month, setMonth] = useState(initialMonth)
  const [kpis, setKpis] = useState<KpiResult[]>([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPack = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/ops/pack")
      if (!res.ok) throw new Error("Could not load your operations pack.")
      const json = await res.json()
      setPack(json.data as PackInfo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPack()
  }, [loadPack])

  const loadKpis = useCallback(async () => {
    const packKey = pack?.packKey
    if (!packKey || !(pack?.reportTemplates?.length ?? false)) return
    setListLoading(true)
    try {
      const res = await fetch(`/api/ops/kpis?pack=${encodeURIComponent(packKey)}&month=${month}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`)
      }
      setKpis((json.data?.kpis ?? []) as KpiResult[])
    } catch (err) {
      toast({ variant: "destructive", title: "Report preview", description: (err as Error).message })
    } finally {
      setListLoading(false)
    }
  }, [pack?.packKey, pack?.reportTemplates, month, toast])

  useEffect(() => {
    void loadKpis()
  }, [loadKpis])

  useEffect(() => {
    const current = search.get("month") ?? ""
    if (current === month) return
    const params = new URLSearchParams(search.toString())
    params.set("month", month)
    router.replace(`/dashboard/ops/reports?${params.toString()}`, { scroll: false })
  }, [month, search, router])

  const kpiById = useMemo(() => new Map(kpis.map((kpi) => [kpi.id, kpi])), [kpis])

  if (loading) return <ReportsSkeleton />

  if (error && !pack) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void loadPack()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!pack?.hasOpsConfig || !pack?.packKey) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Report previews</h1>
        <SectionCard title="No operations configured" icon={<FileBarChart2 className="h-4 w-4" />}>
          <EmptyNote>
            Your role pack has no operations configuration yet, so there are no report templates to
            preview.{" "}
            <Link href="/dashboard/ops" className="underline underline-offset-2">
              Back to operations overview
            </Link>
            .
          </EmptyNote>
        </SectionCard>
      </div>
    )
  }

  const templates = pack.reportTemplates ?? []

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileBarChart2 className="h-5 w-5" aria-hidden />
            Report previews
          </h1>
          <p className="text-sm text-muted-foreground">
            {pack.discipline ? pack.discipline : "Your"} operations &middot; {monthLabel(month)} &middot;
            read-only previews of your pack&rsquo;s report templates, with every figure computed from
            rows you logged. Open one to write the report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-medium">{monthLabel(month)}</span>
          <Button size="sm" variant="outline" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </header>

      {templates.length === 0 ? (
        <SectionCard title="No report templates" icon={<FileBarChart2 className="h-4 w-4" />}>
          <EmptyNote>This pack declares no report templates yet.</EmptyNote>
        </SectionCard>
      ) : listLoading && kpis.length === 0 ? (
        <div className="space-y-4">
          {templates.map((template) => (
            <Skeleton key={template.id} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} kpiById={kpiById} month={month} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops">Operations overview</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/kpis">KPIs</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/reports-work">All work reports</Link>
        </Button>
      </div>
    </div>
  )
}
