"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  LayoutGrid,
  Pencil,
  PieChart as PieChartIcon,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"
import { cn } from "@/lib/utils"
import { CADENCE_LABEL, CADENCES, type Cadence } from "@/lib/cadence"
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  SectionCard,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type DatasetKey = "tasks" | "sprints" | "team" | "wellbeing"

type DatasetRegistry = Record<
  DatasetKey,
  {
    label: string
    groupBys: { key: string; label: string }[]
    valueLabel: string
  }
>

type Schedule = {
  id: number
  userId: number
  name: string
  description: string | null
  dataset: DatasetKey
  config: { rangeDays?: number; groupBy?: string }
  cadence: Cadence
  recipients: number[]
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
  runCount?: number
}

type Run = {
  id: number
  scheduleId: number
  scheduleName?: string
  status: string
  rows: number
  detail: string | null
  createdAt: string
}

type DatasetResult = {
  rows: { name: string; value: number }[]
  total: number
  valueLabel: string
  generatedAt: string
}

type Member = { id: number; name: string; avatar?: string | null }

const RANGE_OPTIONS = [7, 14, 30, 90, 180]

const CHART_COLORS = [
  "hsl(var(--chart-pine))",
  "hsl(var(--chart-clay))",
  "hsl(var(--chart-stone))",
  "hsl(var(--chart-moss))",
  "hsl(var(--destructive))",
]

type ScheduleDraft = {
  id?: number
  name: string
  description: string
  dataset: DatasetKey
  cadence: Cadence
  rangeDays: number
  groupBy: string
  recipients: number[]
  isActive: boolean
}

/* ------------------------------------------------------------------- page */

export default function ReportsPage() {
  const { toast } = useToast()

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [datasets, setDatasets] = useState<DatasetRegistry | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* builder state */
  const [bDataset, setBDataset] = useState<DatasetKey>("tasks")
  const [bGroupBy, setBGroupBy] = useState("status")
  const [bRange, setBRange] = useState(30)
  const [bChart, setBChart] = useState<"bar" | "pie" | "area">("bar")
  const [preview, setPreview] = useState<DatasetResult | null>(null)
  const [previewing, setPreviewing] = useState(false)

  /* filters */
  const [query, setQuery] = useState("")
  const [fDataset, setFDataset] = useState("all")
  const [fCadence, setFCadence] = useState("all")
  const [fActive, setFActive] = useState("all")

  /* dialogs */
  const [draft, setDraft] = useState<ScheduleDraft | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  /* ------------------------------------------------------------- fetching */

  const load = useCallback(async (quiet = false) => {
    try {
      const [repRes, memRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/team/members"),
      ])
      if (!repRes.ok) throw new Error(`Reports API responded ${repRes.status}`)
      const j = await repRes.json()
      setSchedules(j.data.schedules)
      setRuns(j.data.runs)
      setDatasets(j.data.datasets)
      if (memRes.ok) {
        const m = await memRes.json()
        setMembers(
          (m.teamMembers ?? m.data ?? []).map((x: Member) => ({
            id: x.id,
            name: x.name,
            avatar: x.avatar ?? null,
          })),
        )
      }
      setError(null)
    } catch (e) {
      if (!quiet) setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useLiveRefresh(() => load(true), { intervalMs: LIVE_REFRESH_MS })

  /* -------------------------------------------------------------- builder */

  const groupBys = datasets?.[bDataset]?.groupBys ?? [{ key: "status", label: "Status" }]

  useEffect(() => {
    if (!datasets) return
    const valid = datasets[bDataset].groupBys.some((g) => g.key === bGroupBy)
    if (!valid) setBGroupBy(datasets[bDataset].groupBys[0].key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bDataset, datasets])

  const runPreview = async () => {
    setPreviewing(true)
    try {
      const res = await fetch("/api/reports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: bDataset, rangeDays: bRange, groupBy: bGroupBy }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Preview failed (${res.status})`)
      setPreview(j.data as DatasetResult)
    } catch (e) {
      toast({ title: "Preview failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setPreviewing(false)
    }
  }

  const exportDataset = async (format: "csv" | "json") => {
    try {
      const params = new URLSearchParams({
        dataset: bDataset,
        rangeDays: String(bRange),
        groupBy: bGroupBy,
        format,
      })
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) throw new Error(`Export failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jiravision-${bDataset}-${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: `Export ready`, description: `${format.toUpperCase()} downloaded.` })
    } catch (e) {
      toast({ title: "Export failed", description: (e as Error).message, variant: "destructive" })
    }
  }

  /* ------------------------------------------------------------- schedules */

  const filteredSchedules = useMemo(() => {
    const q = query.trim().toLowerCase()
    return schedules.filter((s) => {
      if (q && !`${s.name} ${s.description ?? ""}`.toLowerCase().includes(q)) return false
      if (fDataset !== "all" && s.dataset !== fDataset) return false
      if (fCadence !== "all" && s.cadence !== fCadence) return false
      if (fActive === "active" && !s.isActive) return false
      if (fActive === "paused" && s.isActive) return false
      return true
    })
  }, [schedules, query, fDataset, fCadence, fActive])

  const kpis = useMemo(() => {
    const active = schedules.filter((s) => s.isActive)
    const lastRun = runs.length
      ? runs.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b))
      : null
    const nextRun = schedules
      .filter((s) => s.isActive && s.nextRunAt)
      .map((s) => s.nextRunAt as string)
      .sort()[0]
    return {
      total: schedules.length,
      active: active.length,
      runs: runs.length,
      lastRun: lastRun ? relativeTime(lastRun.createdAt) : "never",
      nextRun: nextRun ? relativeTime(nextRun).replace("ago", "from now") : "—",
    }
  }, [schedules, runs])

  const cadenceMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of schedules) counts.set(s.cadence, (counts.get(s.cadence) ?? 0) + 1)
    return Array.from(counts.entries()).map(([name, value]) => ({
      name: CADENCE_LABEL[name as Cadence] ?? name,
      value,
    }))
  }, [schedules])

  const datasetUsage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of schedules) {
      const label = datasets?.[s.dataset]?.label ?? s.dataset
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [schedules, datasets])

  /* ------------------------------------------------------------ mutations */

  const openCreate = (from?: Schedule) => {
    setDraft({
      id: from?.id,
      name: from ? `${from.name} (copy)` : "",
      description: from?.description ?? "",
      dataset: from?.dataset ?? bDataset,
      cadence: from?.cadence ?? "weekly",
      rangeDays: from?.config.rangeDays ?? bRange,
      groupBy: from?.config.groupBy ?? bGroupBy,
      recipients: from?.recipients ?? [],
      isActive: from?.isActive ?? true,
    })
    setDraftOpen(true)
  }

  const openCreateFromPreview = () => {
    setDraft({
      name: "",
      description: "",
      dataset: bDataset,
      cadence: "weekly",
      rangeDays: bRange,
      groupBy: bGroupBy,
      recipients: [],
      isActive: true,
    })
    setDraftOpen(true)
  }

  const saveDraft = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        dataset: draft.dataset,
        cadence: draft.cadence,
        config: { rangeDays: draft.rangeDays, groupBy: draft.groupBy },
        recipients: draft.recipients,
        isActive: draft.isActive,
      }
      const res = draft.id
        ? await fetch(`/api/reports/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Save failed (${res.status})`)
      toast({ title: draft.id ? "Schedule updated" : "Schedule created", description: `"${draft.name.trim()}" saved.` })
      setDraftOpen(false)
      setDraft(null)
      await load()
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const duplicateSchedule = async (s: Schedule) => {
    setBusyId(s.id)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${s.name} (copy)`,
          description: s.description,
          dataset: s.dataset,
          cadence: s.cadence,
          config: s.config,
          recipients: s.recipients,
        }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Duplicate failed (${res.status})`)
      toast({ title: "Schedule duplicated", description: `"${s.name} (copy)" created.` })
      await load()
    } catch (e) {
      toast({ title: "Duplicate failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (s: Schedule) => {
    setBusyId(s.id)
    try {
      const res = await fetch(`/api/reports/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Toggle failed (${res.status})`)
      toast({ title: s.isActive ? "Schedule paused" : "Schedule resumed", description: s.name })
      await load()
    } catch (e) {
      toast({ title: "Toggle failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const runNow = async (s: Schedule) => {
    setBusyId(s.id)
    try {
      const res = await fetch(`/api/reports/${s.id}/run`, { method: "POST" })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Run failed (${res.status})`)
      const result = j.data.result as DatasetResult
      setPreview(result)
      setBDataset(s.dataset)
      setBGroupBy(s.config.groupBy ?? "status")
      setBRange(s.config.rangeDays ?? 30)
      toast({
        title: "Report ran",
        description: `${result.rows.length} groups · ${result.total} ${result.valueLabel}.`,
      })
      await load()
    } catch (e) {
      toast({ title: "Run failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const removeSchedule = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      const res = await fetch(`/api/reports/${deleteTarget.id}`, { method: "DELETE" })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Delete failed (${res.status})`)
      toast({ title: "Schedule deleted", description: `"${deleteTarget.name}" removed with its history.` })
      setDeleteTarget(null)
      setDeleteConfirm(false)
      await load()
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  /* --------------------------------------------------------------- render */

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <EmptyNote>Could not load reports: {error}</EmptyNote>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  const draftGroupBys = draft ? datasets?.[draft.dataset]?.groupBys ?? [] : []

  return (
    <div className="space-y-6 p-6">
      {/* 1 — header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Build datasets from live workspace data, schedule recurring reports and export real CSV/JSON files.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> New schedule
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Schedules", value: kpis.total, icon: <FileSpreadsheet className="h-4 w-4" /> },
          { label: "Active", value: kpis.active, icon: <Activity className="h-4 w-4" /> },
          { label: "Runs logged", value: kpis.runs, icon: <History className="h-4 w-4" /> },
          { label: "Last run", value: kpis.lastRun, icon: <Play className="h-4 w-4" /> },
          { label: "Next run", value: kpis.nextRun, icon: <CalendarClock className="h-4 w-4" /> },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {k.icon} {k.label}
            </div>
            <div className="mt-1 truncate text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* 3 — report builder */}
      <SectionCard
        title="Report builder"
        icon={<BarChart3 className="h-4 w-4" />}
        action={
          <div className="flex gap-1">
            <Button size="sm" variant={bChart === "bar" ? "default" : "ghost"} onClick={() => setBChart("bar")} aria-label="Bar chart">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={bChart === "pie" ? "default" : "ghost"} onClick={() => setBChart("pie")} aria-label="Pie chart">
              <PieChartIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={bChart === "area" ? "default" : "ghost"} onClick={() => setBChart("area")} aria-label="Area chart">
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-[170px]">
              <Label className="text-xs">Dataset</Label>
              <Select value={bDataset} onValueChange={(v) => setBDataset(v as DatasetKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(datasets ?? {}) as DatasetKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {datasets?.[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Label className="text-xs">Group by</Label>
              <Select value={bGroupBy} onValueChange={setBGroupBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupBys.map((g) => (
                    <SelectItem key={g.key} value={g.key}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs">Range</Label>
              <Select value={String(bRange)} onValueChange={(v) => setBRange(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      Last {r} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void runPreview()} disabled={previewing}>
              <Eye className="mr-2 h-4 w-4" /> {previewing ? "Running…" : "Preview"}
            </Button>
            <Button variant="outline" onClick={() => void exportDataset("csv")} disabled={!preview}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => void exportDataset("json")} disabled={!preview}>
              <Download className="mr-2 h-4 w-4" /> JSON
            </Button>
            <Button variant="outline" onClick={openCreateFromPreview}>
              <Plus className="mr-2 h-4 w-4" /> Save as schedule
            </Button>
          </div>

          {!preview ? (
            <EmptyNote>
              Pick a dataset and hit Preview — the chart renders live aggregated data, and exports
              download the same rows.
            </EmptyNote>
          ) : (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                {preview.total} {preview.valueLabel} across {preview.rows.length} groups · generated{" "}
                {relativeTime(preview.generatedAt)}
              </p>
              {preview.rows.length === 0 ? (
                <EmptyNote>No rows in this range.</EmptyNote>
              ) : bChart === "pie" ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={preview.rows} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {preview.rows.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : bChart === "area" ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={preview.rows}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={AXIS} />
                    <YAxis tick={AXIS} width={44} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={preview.valueLabel}
                      stroke="hsl(var(--chart-pine))"
                      fill="hsl(var(--chart-pine))"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={preview.rows}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={AXIS} />
                    <YAxis tick={AXIS} width={44} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="value" name={preview.valueLabel} radius={[4, 4, 0, 0]}>
                      {preview.rows.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* 4 — schedule filters */}
      <SectionCard title="Schedule filters" icon={<Search className="h-4 w-4" />}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Label className="text-xs">Search</Label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or description…" />
          </div>
          <div className="w-[150px]">
            <Label className="text-xs">Dataset</Label>
            <Select value={fDataset} onValueChange={setFDataset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All datasets</SelectItem>
                {(Object.keys(datasets ?? {}) as DatasetKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {datasets?.[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[140px]">
            <Label className="text-xs">Cadence</Label>
            <Select value={fCadence} onValueChange={setFCadence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cadences</SelectItem>
                {CADENCES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CADENCE_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[130px]">
            <Label className="text-xs">State</Label>
            <Select value={fActive} onValueChange={setFActive}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("")
              setFDataset("all")
              setFCadence("all")
              setFActive("all")
            }}
          >
            Clear
          </Button>
          <Badge variant="secondary">{filteredSchedules.length} shown</Badge>
        </div>
      </SectionCard>

      {/* 5 — schedule list */}
      <SectionCard title="Saved schedules" icon={<LayoutGrid className="h-4 w-4" />}>
        {filteredSchedules.length === 0 ? (
          <EmptyNote>
            No schedules yet — build a preview above and hit “Save as schedule”, or create one directly.
          </EmptyNote>
        ) : (
          <div className="space-y-2">
            {filteredSchedules.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-[200px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant={s.isActive ? "default" : "secondary"} className="text-[10px]">
                      {s.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {datasets?.[s.dataset]?.label ?? s.dataset} · grouped by {s.config.groupBy} · last{" "}
                    {s.config.rangeDays ?? 30}d · {CADENCE_LABEL[s.cadence]}
                    {s.recipients.length > 0 && ` · ${s.recipients.length} recipient(s)`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.lastRunAt ? `Last run ${relativeTime(s.lastRunAt)}` : "Never run"} ·{" "}
                    {s.runCount ?? 0} run(s) total
                    {s.isActive && s.nextRunAt && ` · next ${s.nextRunAt.slice(0, 10)}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => void runNow(s)}>
                    <Play className="mr-1 h-3.5 w-3.5" /> Run now
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => void toggleActive(s)}>
                    {s.isActive ? "Pause" : "Resume"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openCreate(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => void duplicateSchedule(s)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      setDeleteTarget(s)
                      setDeleteConfirm(false)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 6+7 — cadence mix + dataset usage */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Cadence mix" icon={<CalendarClock className="h-4 w-4" />}>
          {cadenceMix.length === 0 ? (
            <EmptyNote>No schedules yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={cadenceMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {cadenceMix.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Dataset usage" icon={<BarChart3 className="h-4 w-4" />}>
          {datasetUsage.length === 0 ? (
            <EmptyNote>No schedules yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datasetUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={AXIS} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS} width={90} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Schedules" fill="hsl(var(--chart-stone))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* 8 — run history */}
      <SectionCard title="Run history" icon={<History className="h-4 w-4" />}>
        {runs.length === 0 ? (
          <EmptyNote>No runs yet — hit “Run now” on a schedule.</EmptyNote>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2">When</th>
                  <th className="py-1.5 pr-2">Schedule</th>
                  <th className="py-1.5 pr-2">Status</th>
                  <th className="py-1.5 pr-2 text-right">Groups</th>
                  <th className="py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-muted-foreground">
                      {relativeTime(r.createdAt)}
                    </td>
                    <td className="py-1.5 pr-2 font-medium">{r.scheduleName ?? `#${r.scheduleId}`}</td>
                    <td className="py-1.5 pr-2">
                      <Badge variant={r.status === "ok" ? "default" : "destructive"} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-2 text-right">{r.rows}</td>
                    <td className="max-w-[280px] truncate py-1.5 text-xs text-muted-foreground">
                      {r.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 9 — cross links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/analytics", label: "Analytics" },
          { href: "/dashboard/activity", label: "Activity" },
          { href: "/dashboard/automation", label: "Automation" },
        ].map((l) => (
          <Link key={l.href} href={l.href}>
            <Badge variant="outline" className="cursor-pointer px-3 py-1 hover:bg-muted">
              {l.label} <ArrowRight className="ml-1 h-3 w-3" />
            </Badge>
          </Link>
        ))}
      </div>

      {/* create/edit dialog */}
      <Dialog open={draftOpen} onOpenChange={(o) => !saving && setDraftOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit schedule" : "New schedule"}</DialogTitle>
            <DialogDescription>
              Schedules snapshot a dataset query; “Run now” executes it on demand and logs the run.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Weekly task digest"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dataset</Label>
                  <Select value={draft.dataset} onValueChange={(v) => setDraft({ ...draft, dataset: v as DatasetKey })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(datasets ?? {}) as DatasetKey[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {datasets?.[k].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Group by</Label>
                  <Select value={draft.groupBy} onValueChange={(v) => setDraft({ ...draft, groupBy: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {draftGroupBys.map((g) => (
                        <SelectItem key={g.key} value={g.key}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cadence</Label>
                  <Select value={draft.cadence} onValueChange={(v) => setDraft({ ...draft, cadence: v as Cadence })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CADENCES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CADENCE_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Range</Label>
                  <Select value={String(draft.rangeDays)} onValueChange={(v) => setDraft({ ...draft, rangeDays: Number(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RANGE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={String(r)}>
                          Last {r} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Recipients (get notified on every run)</Label>
                <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                  {members.map((m) => {
                    const on = draft.recipients.includes(m.id)
                    return (
                      <label
                        key={m.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60",
                          on && "bg-muted",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={on}
                          onChange={() =>
                            setDraft({
                              ...draft,
                              recipients: on
                                ? draft.recipients.filter((r) => r !== m.id)
                                : [...draft.recipients, m.id],
                            })
                          }
                        />
                        <AvatarCircle name={m.name} avatar={m.avatar} size={20} />
                        {m.name}
                      </label>
                    )
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveDraft()} disabled={saving}>
              {saving ? "Saving…" : draft?.id ? "Save changes" : "Create schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null)
            setDeleteConfirm(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete schedule</DialogTitle>
            <DialogDescription>
              {deleteConfirm
                ? `This permanently deletes “${deleteTarget?.name}” and its ${deleteTarget?.runCount ?? 0} logged run(s). This cannot be undone.`
                : `Delete “${deleteTarget?.name}”?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null)
                setDeleteConfirm(false)
              }}
              disabled={busyId === deleteTarget?.id}
            >
              Cancel
            </Button>
            {deleteConfirm ? (
              <Button variant="destructive" onClick={() => void removeSchedule()} disabled={busyId === deleteTarget?.id}>
                {busyId === deleteTarget?.id ? "Deleting…" : "Yes, delete permanently"}
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
