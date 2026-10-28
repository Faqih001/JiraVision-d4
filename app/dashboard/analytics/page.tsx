"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  CalendarClock,
  Download,
  Flag,
  Gauge,
  Heart,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  Save,
  Sparkles,
  Swords,
  Timer,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
import { useToast } from "@/hooks/use-toast"
import type { DashboardOverview } from "@/lib/dashboard-data"
import {
  AXIS,
  EmptyNote,
  PRIORITIES,
  PRIORITY_COLOR,
  SectionCard,
  STATUSES,
  STATUS_COLOR,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type SavedReport = {
  id: number
  name: string
  description: string | null
  config: Record<string, unknown>
  createdAt: string | null
}

type FilterState = { rangeDays: string; sprintId: string; priority: string }

type AnalyticsKpis = {
  totalTasks: number
  openTasks: number
  avgVelocity: number
  cycleTimeDays: number | null
  throughputPerWeek: number
  sprintCompletionPct: number | null
  onTimePct: number | null
  blockedRatioPct: number
}

type AnalyticsSeries = {
  velocity: { name: string; committed: number; completed: number; endDate: string }[]
  throughput: { label: string; week: string; doneTasks: number; donePoints: number }[]
  scopeCreep: { name: string; total: number; addedAfterStart: number }[]
  priorityMix: { name: string; value: number }[]
  dueBuckets: { overdue: number; thisWeek: number; nextWeek: number; later: number }
  assigneeWorkload: { id: number; name: string; openTasks: number; openPoints: number }[]
  blockedByMember: { name: string; count: number }[]
  wellbeingVsVelocity: { sprint: string; velocity: number; wellbeing: number | null }[]
}

type AnalyticsData = {
  generatedAt: string
  filters: { rangeDays: number | null; sprintId: number | null; priority: string | null }
  sprintOptions: { id: number; name: string; status: string }[]
  activeSprint: { id: number; name: string; startDate: string; endDate: string } | null
  kpis: AnalyticsKpis
  series: AnalyticsSeries
}

/** Row shape coming back from GET /api/tasks (defensively normalised). */
type TaskRow = {
  id: number
  title: string
  status: string
  priority: string
  storyPoints: number
  dueDate: string | null
  assigneeId: number | null
  sprintId: number | null
  createdAt: string | null
  updatedAt: string | null
}

/* ---------------------------------------------------------------- helpers */

const DAY_MS = 86_400_000
const DEFAULT_FILTERS: FilterState = { rangeDays: "90", sprintId: "all", priority: "all" }

/** Monday-anchored ISO week start for a date. */
function isoWeekStart(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (t.getUTCDay() + 6) % 7
  t.setUTCDate(t.getUTCDate() - dow)
  return t.toISOString().slice(0, 10)
}

function weekLabel(isoMonday: string): string {
  const d = new Date(`${isoMonday}T00:00:00`)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Normalise any server date representation to a YYYY-MM-DD key. */
function toDayIso(value: unknown): string | null {
  if (!value) return null
  const s = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parsed = new Date(s)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function toIso(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value)
  return `"${s.replaceAll('"', '""')}"`
}

/* ------------------------------------------------------------ sub-blocks */

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-pine))]" />
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

/** Cumulative flow: for each week end, the per-status task count using
 * createdAt as entry and updatedAt (for done tasks) as the done exit. */
function buildCumulativeFlow(rows: TaskRow[], weeks: number) {
  const now = new Date()
  const thisMonday = new Date(`${isoWeekStart(now)}T00:00:00`)
  const bounds: Date[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    // Sunday end of each of the last `weeks` calendar weeks
    bounds.push(new Date(thisMonday.getTime() + (i + 1) * 7 * DAY_MS - DAY_MS))
  }
  return bounds.map((end) => {
    const endTs = end.getTime()
    const point: Record<string, number | string> = { label: weekLabel(isoWeekStart(end)) }
    for (const s of STATUSES) point[s] = 0
    for (const t of rows) {
      const created = t.createdAt ? new Date(t.createdAt).getTime() : null
      if (created === null || created > endTs) continue
      let status = t.status
      if (status === "done") {
        const exited = t.updatedAt ? new Date(t.updatedAt).getTime() : null
        status = exited !== null && exited <= endTs ? "done" : "in_progress"
      }
      if (point[status] !== undefined) point[status] = (point[status] as number) + 1
    }
    return point
  })
}

/* ------------------------------------------------------------------- page */

export default function AnalyticsWorkspace() {
  const { toast } = useToast()

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [taskRows, setTaskRows] = useState<TaskRow[]>([])
  const [reports, setReports] = useState<SavedReport[]>([])
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [reloadTick, setReloadTick] = useState(0)

  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [baseLoading, setBaseLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saveDescription, setSaveDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const refreshing = analyticsLoading || baseLoading

  /* ---- analytics aggregation (refetches when filters change) ---- */

  useEffect(() => {
    let cancelled = false
    setAnalyticsLoading(true)
    setDataError(null)
    const qs = new URLSearchParams({
      rangeDays: filters.rangeDays,
      sprintId: filters.sprintId,
      priority: filters.priority,
    })
    fetch(`/api/analytics?${qs}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) setAnalytics(json.data)
        else setDataError(json.message ?? "Analytics request failed")
      })
      .catch((err: Error) => {
        if (!cancelled) setDataError(err.message)
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters, reloadTick])

  /* ---- base data: overview + raw tasks + saved reports ---- */

  const loadBase = useCallback(async () => {
    setBaseLoading(true)
    try {
      const [ovRes, tkRes, rpRes] = await Promise.all([
        fetch("/api/dashboard/overview"),
        fetch("/api/tasks?pageSize=200"),
        fetch("/api/analytics/reports"),
      ])
      const [ovJson, tkJson, rpJson] = await Promise.all([ovRes.json(), tkRes.json(), rpRes.json()])
      if (ovJson.success) setOverview(ovJson.data)
      if (tkJson.success && Array.isArray(tkJson.data)) {
        setTaskRows(
          tkJson.data.map((t: Record<string, unknown>): TaskRow => ({
            id: Number(t.id),
            title: String(t.title ?? ""),
            status: String(t.status ?? "todo"),
            priority: String(t.priority ?? "medium"),
            storyPoints: Number(t.storyPoints ?? 0),
            dueDate: toDayIso(t.dueDate),
            assigneeId: t.assigneeId === null || t.assigneeId === undefined ? null : Number(t.assigneeId),
            sprintId: t.sprintId === null || t.sprintId === undefined ? null : Number(t.sprintId),
            createdAt: toIso(t.createdAt),
            updatedAt: toIso(t.updatedAt),
          })),
        )
      }
      if (rpJson.success && Array.isArray(rpJson.data)) setReports(rpJson.data)
    } catch (err) {
      toast({ variant: "destructive", title: "Analytics", description: (err as Error).message })
    } finally {
      setBaseLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadBase()
  }, [loadBase, reloadTick])

  /* ---- client-side derived series ---- */

  const visibleTasks = useMemo(() => {
    return taskRows.filter((t) => {
      if (filters.sprintId !== "all" && String(t.sprintId ?? "") !== filters.sprintId) return false
      if (filters.priority !== "all" && t.priority !== filters.priority) return false
      if (filters.rangeDays !== "all") {
        const since = Date.now() - Number(filters.rangeDays) * DAY_MS
        const created = t.createdAt ? new Date(t.createdAt).getTime() : 0
        if (created < since) return false
      }
      return true
    })
  }, [taskRows, filters])

  const cumulativeFlow = useMemo(() => buildCumulativeFlow(visibleTasks, 8), [visibleTasks])
  const hasFlowMovement = useMemo(
    () => cumulativeFlow.some((p) => STATUSES.some((s) => (p[s] as number) > 0)),
    [cumulativeFlow],
  )

  const dueBucketData = useMemo(
    () =>
      analytics
        ? [
            { label: "Overdue", value: analytics.series.dueBuckets.overdue, color: "hsl(var(--destructive))" },
            { label: "This week", value: analytics.series.dueBuckets.thisWeek, color: "hsl(var(--chart-clay))" },
            { label: "Next week", value: analytics.series.dueBuckets.nextWeek, color: "hsl(var(--chart-moss))" },
            { label: "Later", value: analytics.series.dueBuckets.later, color: "hsl(var(--chart-stone))" },
          ]
        : [],
    [analytics],
  )

  /* ---- actions ---- */

  const refreshAll = async () => {
    setReloadTick((t) => t + 1)
    toast({ title: "Analytics refreshed" })
  }

  const exportCsv = () => {
    if (visibleTasks.length === 0) {
      toast({ variant: "destructive", title: "Export", description: "No task rows match the current filters." })
      return
    }
    const header = [
      "id",
      "title",
      "status",
      "priority",
      "storyPoints",
      "dueDate",
      "assigneeId",
      "sprintId",
      "createdAt",
      "updatedAt",
    ]
    const lines = [
      header.join(","),
      ...visibleTasks.map((t) => header.map((k) => csvCell((t as unknown as Record<string, unknown>)[k])).join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${visibleTasks.length} task rows downloaded.` })
  }

  const saveReport = async () => {
    const name = saveName.trim()
    if (!name) {
      toast({ variant: "destructive", title: "Save report", description: "A report name is required." })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: saveDescription.trim() || undefined,
          config: {
            rangeDays: filters.rangeDays === "all" ? null : Number(filters.rangeDays),
            sprintId: filters.sprintId === "all" ? null : Number(filters.sprintId),
            priority: filters.priority === "all" ? null : filters.priority,
            savedAt: new Date().toISOString(),
          },
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Save failed")
      toast({ title: "Report saved", description: json.data.name })
      setSaveOpen(false)
      setSaveName("")
      setSaveDescription("")
      const rpRes = await fetch("/api/analytics/reports")
      const rpJson = await rpRes.json()
      if (rpJson.success) setReports(rpJson.data)
    } catch (err) {
      toast({ variant: "destructive", title: "Save report", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const loadReport = (r: SavedReport) => {
    const c = r.config ?? {}
    const next: FilterState = {
      rangeDays: typeof c.rangeDays === "number" ? String(c.rangeDays) : "all",
      sprintId: typeof c.sprintId === "number" ? String(c.sprintId) : "all",
      priority: typeof c.priority === "string" ? c.priority : "all",
    }
    setFilters(next)
    toast({ title: "Report loaded", description: `${r.name} filters applied.` })
  }

  const deleteReport = async (r: SavedReport) => {
    setDeletingId(r.id)
    try {
      const res = await fetch(`/api/analytics/reports/${r.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Delete failed")
      setReports((prev) => prev.filter((x) => x.id !== r.id))
      toast({ title: "Report deleted", description: r.name })
    } catch (err) {
      toast({ variant: "destructive", title: "Delete report", description: (err as Error).message })
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  /* ---- first-load skeleton ---- */

  if (!analytics && analyticsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-16" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const kpis = analytics?.kpis ?? null
  const series = analytics?.series ?? null

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header: title, actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics workspace</h1>
          <p className="text-sm text-muted-foreground">
            {analytics
              ? `${kpis?.totalTasks ?? 0} tasks in scope · computed ${relativeTime(analytics.generatedAt)}`
              : "Live aggregation over tasks, sprints, velocity and wellbeing"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={refreshAll} disabled={refreshing}>
            <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setSaveOpen(true)}>
            <Save className="mr-1 h-4 w-4" /> Save report
          </Button>
        </div>
      </div>

      {dataError && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {dataError}
            </span>
            <Button size="sm" variant="outline" onClick={() => setReloadTick((t) => t + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 2 — Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <span className="text-xs font-medium text-muted-foreground">Filters</span>
          <Select value={filters.rangeDays} onValueChange={(v) => setFilters((f) => ({ ...f, rangeDays: v }))}>
            <SelectTrigger className="h-9 w-36 text-sm" aria-label="Date range">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sprintId} onValueChange={(v) => setFilters((f) => ({ ...f, sprintId: v }))}>
            <SelectTrigger className="h-9 w-44 text-sm" aria-label="Sprint">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sprints</SelectItem>
              {(analytics?.sprintOptions ?? []).map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v }))}>
            <SelectTrigger className="h-9 w-36 text-sm" aria-label="Priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            disabled={
              filters.rangeDays === DEFAULT_FILTERS.rangeDays &&
              filters.sprintId === DEFAULT_FILTERS.sprintId &&
              filters.priority === DEFAULT_FILTERS.priority
            }
          >
            Reset
          </Button>
          <Badge variant="outline" className="ml-auto text-[11px]">
            {visibleTasks.length} of {taskRows.length} task rows
          </Badge>
        </CardContent>
      </Card>

      {/* 3 — Saved reports */}
      <SectionCard
        title="Saved reports"
        icon={<Bookmark className="h-4 w-4" />}
        action={
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaveOpen(true)}>
            <Save className="mr-1 h-3 w-3" /> New snapshot
          </Button>
        }
      >
        {baseLoading && reports.length === 0 ? (
          <Skeleton className="h-16" />
        ) : reports.length === 0 ? (
          <EmptyNote>No saved reports yet. Snapshot the current filters to share a state later.</EmptyNote>
        ) : (
          <ul className="divide-y">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {typeof r.config.savedAt === "string" ? relativeTime(r.config.savedAt) : "no timestamp"}
                    {r.description ? ` · ${r.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => loadReport(r)}>
                    Load filters
                  </Button>
                  {confirmDeleteId === r.id ? (
                    <>
                      <span className="text-xs text-red-500">Delete permanently?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        disabled={deletingId === r.id}
                        onClick={() => deleteReport(r)}
                      >
                        {deletingId === r.id ? "Deleting…" : "Confirm"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500"
                      aria-label={`Delete ${r.name}`}
                      onClick={() => setConfirmDeleteId(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 4 — KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Avg velocity"
          value={kpis ? `${kpis.avgVelocity}` : "—"}
          hint="pts per completed sprint"
        />
        <KpiCard
          label="Cycle time (proxy)"
          value={kpis ? (kpis.cycleTimeDays === null ? "—" : `${kpis.cycleTimeDays}d`) : "—"}
          hint="median created → closed"
        />
        <KpiCard
          label="Throughput"
          value={kpis ? `${kpis.throughputPerWeek}` : "—"}
          hint="tasks done per week"
        />
        <KpiCard
          label="Sprint completion"
          value={kpis ? (kpis.sprintCompletionPct === null ? "—" : `${kpis.sprintCompletionPct}%`) : "—"}
          hint="avg over completed sprints"
        />
        <KpiCard
          label="On-time delivery"
          value={kpis ? (kpis.onTimePct === null ? "—" : `${kpis.onTimePct}%`) : "—"}
          hint="closed on/before due date"
        />
      </div>

      {/* 5+6 — Velocity trend + cumulative flow */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Velocity trend" icon={<Swords className="h-4 w-4" />}>
          {overview && overview.velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={overview.velocity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={AXIS} minTickGap={16} />
                <YAxis tick={AXIS} width={30} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="committed" name="Committed" stroke="hsl(var(--chart-stone))" strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="hsl(var(--chart-pine))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : series && series.velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series.velocity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={AXIS} minTickGap={16} />
                <YAxis tick={AXIS} width={30} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="hsl(var(--chart-pine))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Complete a sprint to build velocity history.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Cumulative flow" icon={<AreaGlyph />}>
          {hasFlowMovement ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cumulativeFlow}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} minTickGap={20} />
                <YAxis tick={AXIS} width={30} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {STATUSES.map((s) => (
                  <Area
                    key={s}
                    type="monotone"
                    dataKey={s}
                    name={s.replace("_", " ")}
                    stackId="flow"
                    stroke={STATUS_COLOR[s]}
                    fill={STATUS_COLOR[s]}
                    fillOpacity={0.45}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No task history in range yet.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 7+8 — Throughput bars + scope creep */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Weekly throughput" icon={<BarChart3 className="h-4 w-4" />}>
          {series && series.throughput.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series.throughput}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} minTickGap={16} />
                <YAxis tick={AXIS} width={26} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="doneTasks" name="Tasks" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="donePoints" name="Points" fill="hsl(var(--chart-moss))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Nothing completed in the selected range.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard
          title="Scope creep"
          icon={<LineChartIcon className="h-4 w-4" />}
          action={
            analytics?.activeSprint ? (
              <Badge variant="outline" className="text-[10px]">
                active: {analytics.activeSprint.name}
              </Badge>
            ) : undefined
          }
        >
          {series && series.scopeCreep.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series.scopeCreep}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={AXIS} minTickGap={16} />
                <YAxis tick={AXIS} width={26} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="In sprint" fill="hsl(var(--chart-stone))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="addedAfterStart" name="Added after start" fill="hsl(var(--chart-clay))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No sprint-linked tasks to measure yet.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 9+10+11 — Assignee workload, priority mix, due-date histogram */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Assignee workload" icon={<Users className="h-4 w-4" />}>
          {series && series.assigneeWorkload.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series.assigneeWorkload} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={AXIS} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS} width={80} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="openPoints" name="Open pts" fill="hsl(var(--chart-pine))" radius={[0, 3, 3, 0]} />
                <Bar dataKey="openTasks" name="Open tasks" fill="hsl(var(--chart-stone))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Nothing open in scope.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Priority mix" icon={<PieChartIcon className="h-4 w-4" />}>
          {series && series.priorityMix.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={series.priorityMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {series.priorityMix.map((p) => (
                    <Cell key={p.name} fill={PRIORITY_COLOR[p.name] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No tasks in scope.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Due-date pressure" icon={<CalendarClock className="h-4 w-4" />}>
          {dueBucketData.some((b) => b.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dueBucketData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ ...AXIS, fontSize: 10 }} interval={0} />
                <YAxis tick={AXIS} width={26} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" name="Open tasks" radius={[3, 3, 0, 0]}>
                  {dueBucketData.map((b) => (
                    <Cell key={b.label} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No open task has a due date.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 12+13 — Quality signals + wellbeing vs velocity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Quality signals" icon={<Gauge className="h-4 w-4" />}>
          {kpis ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Blocked ratio</span>
                  <span className={`tabular-nums ${kpis.blockedRatioPct > 15 ? "font-semibold text-red-500" : "text-muted-foreground"}`}>
                    {kpis.blockedRatioPct}% ({kpis.openTasks} open)
                  </span>
                </div>
                <Progress value={Math.min(100, kpis.blockedRatioPct)} className="mt-1 h-2" />
              </div>
              {series && series.blockedByMember.length > 0 ? (
                <ul className="divide-y text-sm">
                  {series.blockedByMember.map((b) => (
                    <li key={b.name} className="flex items-center justify-between py-1.5">
                      <span className="truncate">{b.name}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                        {b.count} blocked
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote>Nothing is blocked right now.</EmptyNote>
              )}
            </div>
          ) : (
            <EmptyNote>Loading quality signals…</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Wellbeing vs velocity" icon={<Heart className="h-4 w-4" />}>
          {series && series.wellbeingVsVelocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={series.wellbeingVsVelocity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="sprint" tick={AXIS} minTickGap={16} />
                <YAxis yAxisId="velocity" tick={AXIS} width={26} />
                <YAxis yAxisId="wellbeing" orientation="right" domain={[0, 100]} tick={AXIS} width={26} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="velocity" dataKey="velocity" name="Velocity" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]} />
                <Line
                  yAxisId="wellbeing"
                  type="monotone"
                  dataKey="wellbeing"
                  name="Team wellbeing"
                  stroke="hsl(var(--chart-clay))"
                  strokeWidth={2}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Needs completed sprints with wellbeing check-ins.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 14 — Cross-check strip: wellbeing trend vs sprint completion */}
      <SectionCard title="Delivery health" icon={<Sparkles className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Team happiness now",
              value: overview ? `${overview.kpis.teamHappiness}/100` : "—",
              hint: "latest wellbeing check-ins",
            },
            {
              label: "Ethics · workload balance",
              value: overview?.ethics.latest ? `${overview.ethics.latest.workloadBalance}` : "—",
              hint: overview?.ethics.latest ? `measured ${overview.ethics.latest.date}` : "no ethical metrics yet",
            },
            {
              label: "Blocked tasks",
              value: kpis ? `${kpis.blockedRatioPct}%` : "—",
              hint: "of tasks in scope",
            },
            {
              label: "Cycle time",
              value: kpis ? (kpis.cycleTimeDays === null ? "—" : `${kpis.cycleTimeDays}d`) : "—",
              hint: "median created → closed",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-3">
              <p className="text-lg font-semibold tabular-nums">{s.value}</p>
              <p className="text-[11px] font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Timer className="h-3.5 w-3.5" />
          Cycle time uses updatedAt as the completion stamp — it is a proxy, not logged work time.
          <Flag className="ml-2 h-3.5 w-3.5" /> Scope creep counts sprint tasks created after the sprint start date.
        </p>
      </SectionCard>

      {/* ---- save-report dialog ---- */}
      <Dialog open={saveOpen} onOpenChange={(o) => !o && setSaveOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save analytics snapshot</DialogTitle>
            <DialogDescription>
              Stores the current filter config (range {filters.rangeDays === "all" ? "all time" : `${filters.rangeDays}d`},
              sprint {filters.sprintId === "all" ? "all" : `#${filters.sprintId}`}, priority {filters.priority}) so it can
              be reloaded later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sr-name">Report name</Label>
              <Input
                id="sr-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Sprint retro delivery pack"
                maxLength={255}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sr-desc">Description (optional)</Label>
              <Textarea
                id="sr-desc"
                rows={2}
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="What this snapshot is for"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveReport} disabled={saving}>
              {saving ? "Saving…" : "Save report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* Inline glyph keeps the cumulative-flow header icon without a new dep. */
function AreaGlyph() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 20 9 8l4 6 5-10 3 16Z" />
    </svg>
  )
}
