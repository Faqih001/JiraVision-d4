"use client"

// The monthly KPI detail page (operations engine, D4). /api/ops/kpis computes every KPI the pack's
// opsConfig declares, straight from the member's logged entries and register rows — no estimation.
// This page just presents them for one month at a time, with a target-vs-actual read.

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type PackInfo = {
  packKey: string | null
  hasOpsConfig: boolean
  discipline: string | null
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

type KpisPayload = {
  pack: string
  month: string
  kpis: KpiResult[]
  entryCount: number
  registerCount: number
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

function formatValue(kpi: KpiResult): string {
  const value = kpi.aggregation === "ratio" ? kpi.value * 100 : kpi.value
  const rounded = Math.round(value * 100) / 100
  return rounded.toLocaleString()
}

function formatTarget(kpi: KpiResult): string {
  if (kpi.target === null) return "no target"
  const target = kpi.aggregation === "ratio" ? kpi.target * 100 : kpi.target
  return `target ${Math.round(target * 100) / 100}${kpi.unit ? ` ${kpi.unit}` : ""}`
}

function MetIndicator({ met }: { met: boolean | null }) {
  if (met === true) return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-label="On target" />
  if (met === false) return <TrendingDown className="h-4 w-4 shrink-0 text-red-500" aria-label="Below target" />
  return <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="No target set" />
}

export function KpisSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}

function KpiCard({ kpi }: { kpi: KpiResult }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{kpi.label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{formatValue(kpi)}</span>
        {kpi.unit && kpi.aggregation !== "ratio" ? (
          <span className="text-xs text-muted-foreground">{kpi.unit}</span>
        ) : kpi.aggregation === "ratio" ? (
          <span className="text-xs text-muted-foreground">%</span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <MetIndicator met={kpi.met} />
        <span className="text-[11px] text-muted-foreground">{formatTarget(kpi)}</span>
      </div>
    </div>
  )
}

export default function KpisClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  const initialMonth = useMemo(() => {
    const fromUrl = search.get("month")
    return fromUrl && /^\d{4}-\d{2}$/.test(fromUrl) ? fromUrl : currentMonth()
  }, [search])

  const [pack, setPack] = useState<PackInfo | null>(null)
  const [month, setMonth] = useState(initialMonth)
  const [payload, setPayload] = useState<KpisPayload | null>(null)
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
    if (!packKey) return
    setListLoading(true)
    try {
      const res = await fetch(`/api/ops/kpis?pack=${encodeURIComponent(packKey)}&month=${month}`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`)
      }
      setPayload(json.data as KpisPayload)
    } catch (err) {
      toast({ variant: "destructive", title: "KPIs", description: (err as Error).message })
    } finally {
      setListLoading(false)
    }
  }, [pack?.packKey, month, toast])

  useEffect(() => {
    void loadKpis()
  }, [loadKpis])

  useEffect(() => {
    const current = search.get("month") ?? ""
    if (current === month) return
    const params = new URLSearchParams(search.toString())
    params.set("month", month)
    router.replace(`/dashboard/ops/kpis?${params.toString()}`, { scroll: false })
  }, [month, search, router])

  const metCount = useMemo(() => (payload?.kpis ?? []).filter((kpi) => kpi.met === true).length, [payload])
  const belowCount = useMemo(() => (payload?.kpis ?? []).filter((kpi) => kpi.met === false).length, [payload])

  if (loading) return <KpisSkeleton />

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
        <h1 className="text-2xl font-bold">KPIs</h1>
        <SectionCard title="No operations configured" icon={<TrendingUp className="h-4 w-4" />}>
          <EmptyNote>
            Your role pack has no operations configuration yet, so there are no KPIs to show.{" "}
            <Link href="/dashboard/ops" className="underline underline-offset-2">
              Back to operations overview
            </Link>
            .
          </EmptyNote>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <TrendingUp className="h-5 w-5" aria-hidden />
            KPIs
          </h1>
          <p className="text-sm text-muted-foreground">
            {pack.discipline ? pack.discipline : "Your"} operations &middot; {monthLabel(month)} &middot;
            every number is computed from rows you logged.
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

      {payload ? (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-muted px-2 py-1 tabular-nums">{payload.kpis.length} KPIs</span>
          <span className="rounded-md bg-muted px-2 py-1 tabular-nums">{payload.entryCount} entries logged</span>
          <span
            className={cn(
              "rounded-md px-2 py-1 tabular-nums",
              belowCount > 0 ? "bg-destructive/10 font-medium text-destructive" : "bg-muted",
            )}
          >
            {metCount} on target{belowCount > 0 ? ` · ${belowCount} below` : ""}
          </span>
        </div>
      ) : null}

      <SectionCard
        title={`${monthLabel(month)} metrics`}
        icon={<TrendingUp className="h-4 w-4" />}
        action={
          payload ? (
            <Badge variant="outline">
              {payload.registerCount} register {payload.registerCount === 1 ? "row" : "rows"}
            </Badge>
          ) : null
        }
      >
        {listLoading && !payload ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </div>
        ) : (payload?.kpis.length ?? 0) === 0 ? (
          <EmptyNote>No KPI data for {monthLabel(month)} yet. Log some activity to see metrics here.</EmptyNote>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(payload?.kpis ?? []).map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops">Operations overview</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/ops/logs">Activity logs</Link>
        </Button>
      </div>
    </div>
  )
}
