"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard, EmptyNote } from "@/components/dashboard-kit"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
} from "lucide-react"
import Link from "next/link"

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

type Recommendation = {
  id: string
  ruleId: string
  priority: "Critical" | "High" | "Medium" | "Low"
  observation: string
  risk: string
  action: string
  entityKey: string
  entryId: number | null
  href: string
}

type ChecklistEntry = {
  id: number
  entityKey: string
  occurredAt: string
  status: string | null
  fields: Record<string, unknown>
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

export default function OperationsOverviewPage() {
  const [pack, setPack] = useState<PackInfo | null>(null)
  const [kpis, setKpis] = useState<KpiResult[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [checklist, setChecklist] = useState<ChecklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const packRes = await fetch("/api/ops/pack")
      if (!packRes.ok) throw new Error("Could not load your operations pack.")
      const packJson = await packRes.json()
      const packData = packJson.data as PackInfo
      setPack(packData)

      if (!packData.hasOpsConfig || !packData.packKey) {
        setLoading(false)
        return
      }

      const month = currentMonth()
      const today = todayStr()

      const [kpisRes, recsRes, checklistRes] = await Promise.all([
        fetch(`/api/ops/kpis?pack=${encodeURIComponent(packData.packKey)}&month=${month}`),
        fetch(`/api/ops/recommendations?pack=${encodeURIComponent(packData.packKey)}`),
        fetch(
          `/api/ops/entries?pack=${encodeURIComponent(packData.packKey)}&entity=daily_checklist&from=${today}&to=${today}`,
        ),
      ])

      if (kpisRes.ok) {
        const kpisJson = await kpisRes.json()
        setKpis(kpisJson.data?.kpis ?? [])
      }
      if (recsRes.ok) {
        const recsJson = await recsRes.json()
        setRecommendations(recsJson.data?.recommendations ?? [])
      }
      if (checklistRes.ok) {
        const checklistJson = await checklistRes.json()
        setChecklist(checklistJson.data?.entries ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations data.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const criticalCount = useMemo(
    () => recommendations.filter((r) => r.priority === "Critical" || r.priority === "High").length,
    [recommendations],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Operations</h1>
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadData()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!pack?.hasOpsConfig || !pack?.packKey) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Operations</h1>
        <SectionCard title="No operations configured" icon={<Activity className="h-4 w-4" />}>
          <EmptyNote>
            Your role pack does not have an operations configuration yet. Contact your administrator if you
            expect to see operations data here.
          </EmptyNote>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operations overview</h1>
          <p className="text-sm text-muted-foreground">
            {pack.discipline ? `${pack.discipline}` : "Your"} operations &middot; {currentMonth()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/ops/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
        </div>
      </div>

      {criticalCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 pt-4">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {criticalCount} {criticalCount === 1 ? "item" : "items"} need your attention
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.slice(0, 8).map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
        {kpis.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <EmptyNote>No KPI data for this month yet. Log some activity to see metrics here.</EmptyNote>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Recommendations" icon={<AlertTriangle className="h-4 w-4" />}>
          {recommendations.length === 0 ? (
            <EmptyNote>No recommendations at this time. Everything looks on track.</EmptyNote>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec) => (
                <div key={rec.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.Low}>
                        {rec.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{rec.entityKey.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{rec.observation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{rec.risk}</p>
                  <Link
                    href={rec.href}
                    className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
                  >
                    {rec.action}
                  </Link>
                </div>
              ))}
              {recommendations.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{recommendations.length - 5} more recommendations
                </p>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Today&apos;s checklist" icon={<ClipboardCheck className="h-4 w-4" />}>
          {checklist.length === 0 ? (
            <EmptyNote>No checklist entries for today.</EmptyNote>
          ) : (
            <div className="space-y-2">
              {checklist.map((entry) => {
                const item = String(entry.fields.item ?? "Checklist item")
                const done = entry.status === "done" || entry.fields.done === "Yes"
                return (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={done ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                      {item}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function KpiCard({ kpi }: { kpi: KpiResult }) {
  const metIcon =
    kpi.met === true ? (
      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
    ) : kpi.met === false ? (
      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
    )

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{kpi.label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            {kpi.value.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">{kpi.unit}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {metIcon}
          {kpi.target !== null && (
            <span className="text-[11px] text-muted-foreground">
              Target: {kpi.target}
              {kpi.unit ? ` ${kpi.unit}` : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
