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
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  Flag,
  GitBranch,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"
import { cn } from "@/lib/utils"
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  SectionCard,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"
import {
  GOAL_STATUS_LABEL,
  METRIC_TYPES,
  computeProgress,
  type CheckinDto,
  type GoalDto,
  type GoalStatus,
  type MetricType,
} from "@/app/api/goals/shared"

/* ------------------------------------------------------------------ types */

type Member = { id: number; name: string; avatar?: string | null }

const STATUS_TONE: Record<GoalStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  on_track: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  at_risk: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  behind: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  achieved: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  archived: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

const STATUS_CHART_COLOR: Record<GoalStatus, string> = {
  not_started: "hsl(var(--chart-stone))",
  on_track: "hsl(var(--chart-pine))",
  at_risk: "hsl(var(--chart-clay))",
  behind: "hsl(var(--destructive))",
  achieved: "hsl(var(--chart-moss))",
  archived: "hsl(var(--muted-foreground))",
}

const METRIC_LABEL: Record<MetricType, string> = {
  percent: "Percent",
  number: "Number",
  currency: "Currency",
  boolean: "Yes / No",
}

function metricUnit(m: MetricType) {
  if (m === "percent") return "%"
  if (m === "currency") return "$"
  return ""
}

function formatMetricValue(m: MetricType, v: number) {
  if (m === "currency") return `$${v.toLocaleString()}`
  if (m === "percent") return `${v}%`
  return String(v)
}

type GoalDraft = {
  id?: number
  title: string
  description: string
  ownerId: number | ""
  quarter: string
  status: GoalStatus
  metricType: MetricType
  baseline: string
  target: string
  current: string
  startDate: string
  dueDate: string
  parentId: number | ""
}

const emptyDraft = (defaultQuarter: string, meId: number): GoalDraft => ({
  title: "",
  description: "",
  ownerId: meId || "",
  quarter: defaultQuarter,
  status: "not_started",
  metricType: "percent",
  baseline: "0",
  target: "100",
  current: "0",
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  parentId: "",
})

/* ------------------------------------------------------------------- page */

export default function GoalsPage() {
  const { toast } = useToast()

  const [goals, setGoals] = useState<GoalDto[]>([])
  const [checkins, setCheckins] = useState<CheckinDto[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<{ id: number; name: string } | null>(null)
  const [defaultQuarter, setDefaultQuarter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [quarterFilter, setQuarterFilter] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [metricFilter, setMetricFilter] = useState("all")
  const [view, setView] = useState<"grid" | "list">("grid")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedCheckins, setSelectedCheckins] = useState<CheckinDto[] | null>(null)
  const [checkinValue, setCheckinValue] = useState("")
  const [checkinNote, setCheckinNote] = useState("")
  const [checkinBusy, setCheckinBusy] = useState(false)

  const [draft, setDraft] = useState<GoalDraft | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GoalDto | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  /* ------------------------------------------------------------- fetching */

  const load = useCallback(async (quiet = false) => {
    try {
      const [goalsRes, membersRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/team/members"),
      ])
      if (!goalsRes.ok) throw new Error(`Goals API responded ${goalsRes.status}`)
      const g = await goalsRes.json()
      setGoals(g.data.goals)
      setCheckins(g.data.checkins)
      setMe(g.data.me)
      setDefaultQuarter(g.data.defaultQuarter)
      if (membersRes.ok) {
        const m = await membersRes.json()
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

  const loadProgress = useCallback(async (goalId: number) => {
    setSelectedCheckins(null)
    try {
      const res = await fetch(`/api/goals/${goalId}/progress`)
      if (!res.ok) return
      const j = await res.json()
      setSelectedCheckins(j.data.checkins)
    } catch {
      /* progress chart is best-effort */
    }
  }, [])

  useEffect(() => {
    if (selectedId === null) {
      setSelectedCheckins(null)
      return
    }
    void loadProgress(selectedId)
  }, [selectedId, loadProgress])

  const selected = useMemo(
    () => goals.find((g) => g.id === selectedId) ?? null,
    [goals, selectedId],
  )

  /* -------------------------------------------------------------- filters */

  const quarters = useMemo(
    () =>
      Array.from(new Set(goals.map((g) => g.quarter).filter((q): q is string => Boolean(q)))).sort(),
    [goals],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return goals.filter((g) => {
      if (q && !`${g.title} ${g.description ?? ""}`.toLowerCase().includes(q)) return false
      if (statusFilter !== "all" && g.status !== statusFilter) return false
      if (quarterFilter !== "all" && g.quarter !== quarterFilter) return false
      if (ownerFilter !== "all" && g.ownerId !== Number(ownerFilter)) return false
      if (metricFilter !== "all" && g.metricType !== metricFilter) return false
      return true
    })
  }, [goals, query, statusFilter, quarterFilter, ownerFilter, metricFilter])

  /* ----------------------------------------------------------------- kpis */

  const kpis = useMemo(() => {
    const active = goals.filter((g) => g.status !== "archived")
    const avg = active.length
      ? Math.round(active.reduce((s, g) => s + g.progressPct, 0) / active.length)
      : 0
    const monthAgo = Date.now() - 30 * 86400_000
    return {
      total: goals.length,
      avg,
      achieved: goals.filter((g) => g.status === "achieved").length,
      troubled: goals.filter((g) => g.status === "at_risk" || g.status === "behind").length,
      overdue: goals.filter((g) => g.overdue).length,
      recentCheckins: checkins.filter((c) => new Date(c.createdAt).getTime() >= monthAgo).length,
    }
  }, [goals, checkins])

  /* --------------------------------------------------------------- charts */

  const statusMix = useMemo(() => {
    const counts = new Map<GoalStatus, number>()
    for (const g of goals) counts.set(g.status, (counts.get(g.status) ?? 0) + 1)
    return Array.from(counts.entries()).map(([status, count]) => ({
      name: GOAL_STATUS_LABEL[status],
      status,
      value: count,
    }))
  }, [goals])

  const quarterBars = useMemo(() => {
    const map = new Map<string, { sum: number; n: number; achieved: number }>()
    for (const g of goals) {
      const key = g.quarter || "Unset"
      const cur = map.get(key) ?? { sum: 0, n: 0, achieved: 0 }
      cur.sum += g.progressPct
      cur.n += 1
      if (g.status === "achieved") cur.achieved += 1
      map.set(key, cur)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, v]) => ({
        quarter,
        avgProgress: Math.round(v.sum / v.n),
        goals: v.n,
        achieved: v.achieved,
      }))
  }, [goals])

  const ownerBars = useMemo(() => {
    const map = new Map<number, { name: string; goals: number; sum: number }>()
    for (const g of goals) {
      const cur = map.get(g.ownerId) ?? { name: g.ownerName, goals: 0, sum: 0 }
      cur.goals += 1
      cur.sum += g.progressPct
      map.set(g.ownerId, cur)
    }
    return Array.from(map.values())
      .map((v) => ({ name: v.name, goals: v.goals, avgProgress: Math.round(v.sum / v.goals) }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 6)
  }, [goals])

  const tree = useMemo(() => {
    const roots = goals.filter((g) => g.parentId === null)
    const childrenOf = (id: number) => goals.filter((g) => g.parentId === id)
    return { roots, childrenOf }
  }, [goals])

  const suggestions = useMemo(
    () => goals.filter((g) => g.suggestedStatus !== g.status && g.status !== "archived"),
    [goals],
  )

  const recentCheckins = useMemo(
    () =>
      [...checkins]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [checkins],
  )

  /* ------------------------------------------------------------ mutations */

  const openCreate = () => {
    setDraft(emptyDraft(defaultQuarter, me?.id ?? 0))
    setDraftOpen(true)
  }

  const openEdit = (g: GoalDto) => {
    setDraft({
      id: g.id,
      title: g.title,
      description: g.description ?? "",
      ownerId: g.ownerId,
      quarter: g.quarter ?? defaultQuarter,
      status: g.status,
      metricType: g.metricType,
      baseline: String(g.baseline ?? 0),
      target: String(g.target),
      current: String(g.current),
      startDate: g.startDate,
      dueDate: g.dueDate ?? "",
      parentId: g.parentId ?? "",
    })
    setDraftOpen(true)
  }

  const saveDraft = async () => {
    if (!draft) return
    if (!draft.title.trim()) {
      toast({ title: "Title required", description: "Give the goal a name.", variant: "destructive" })
      return
    }
    if (draft.ownerId === "") {
      toast({ title: "Owner required", variant: "destructive" })
      return
    }
    const target = Number(draft.target)
    if (!Number.isFinite(target)) {
      toast({ title: "Target must be a number", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        ownerId: Number(draft.ownerId),
        quarter: draft.quarter,
        status: draft.status,
        metricType: draft.metricType,
        baseline: draft.baseline.trim() === "" ? null : Number(draft.baseline),
        target,
        current: draft.current.trim() === "" ? 0 : Number(draft.current),
        startDate: draft.startDate,
        dueDate: draft.dueDate || null,
        parentId: draft.parentId === "" ? null : Number(draft.parentId),
      }
      const res = draft.id
        ? await fetch(`/api/goals/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Request failed (${res.status})`)
      toast({
        title: draft.id ? "Goal updated" : "Goal created",
        description: `"${draft.title.trim()}" saved.`,
      })
      setDraftOpen(false)
      setDraft(null)
      await load()
      if (draft.id) setSelectedId(draft.id)
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const removeGoal = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      const res = await fetch(`/api/goals/${deleteTarget.id}`, { method: "DELETE" })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Delete failed (${res.status})`)
      toast({ title: "Goal deleted", description: `"${deleteTarget.title}" removed.` })
      if (selectedId === deleteTarget.id) setSelectedId(null)
      setDeleteTarget(null)
      setDeleteConfirm(false)
      await load()
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const logCheckin = async () => {
    if (!selected) return
    const value = Number(checkinValue)
    if (checkinValue.trim() === "" || !Number.isFinite(value)) {
      toast({ title: "Value must be a number", variant: "destructive" })
      return
    }
    setCheckinBusy(true)
    try {
      const res = await fetch(`/api/goals/${selected.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, note: checkinNote.trim() || undefined }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Check-in failed (${res.status})`)
      const goal = j.data.goal as GoalDto
      toast({
        title: "Check-in logged",
        description: `"${goal.title}" is now at ${goal.progressPct}%.`,
      })
      setCheckinValue("")
      setCheckinNote("")
      await load()
      await loadProgress(goal.id)
    } catch (e) {
      toast({ title: "Check-in failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setCheckinBusy(false)
    }
  }

  const applySuggestion = async (g: GoalDto) => {
    setBusyId(g.id)
    try {
      const res = await fetch(`/api/goals/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: g.suggestedStatus }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Update failed (${res.status})`)
      toast({
        title: "Status updated",
        description: `"${g.title}" → ${GOAL_STATUS_LABEL[g.suggestedStatus]}.`,
      })
      await load()
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  /* --------------------------------------------------------------- render */

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <EmptyNote>Could not load goals: {error}</EmptyNote>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  const trendData = (selectedCheckins ?? [])
    .filter((c) => c.goalId === selectedId)
    .map((c) => ({
      date: new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: c.value,
    }))

  return (
    <div className="space-y-6 p-6">
      {/* 1 — header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Target className="h-6 w-6 text-emerald-600" /> Goals &amp; OKRs
          </h1>
          <p className="text-sm text-muted-foreground">
            Track quarterly objectives, log check-ins and watch progress compound — {defaultQuarter} is
            the current quarter.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New goal
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Goals", value: kpis.total, icon: <Target className="h-4 w-4" /> },
          { label: "Avg progress", value: `${kpis.avg}%`, icon: <TrendingUp className="h-4 w-4" /> },
          { label: "Achieved", value: kpis.achieved, icon: <Trophy className="h-4 w-4" /> },
          { label: "At risk / behind", value: kpis.troubled, icon: <Flag className="h-4 w-4" /> },
          { label: "Overdue", value: kpis.overdue, icon: <CalendarClock className="h-4 w-4" /> },
          { label: "Check-ins (30d)", value: kpis.recentCheckins, icon: <CheckCheck className="h-4 w-4" /> },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {k.icon} {k.label}
            </div>
            <div className="mt-1 text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* 3 — filters */}
      <SectionCard title="Filters" icon={<Search className="h-4 w-4" />}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Label className="text-xs">Search</Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title or description…"
            />
          </div>
          <div className="w-[150px]">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(GOAL_STATUS_LABEL) as GoalStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {GOAL_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[130px]">
            <Label className="text-xs">Quarter</Label>
            <Select value={quarterFilter} onValueChange={setQuarterFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All quarters</SelectItem>
                {quarters.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[160px]">
            <Label className="text-xs">Owner</Label>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[140px]">
            <Label className="text-xs">Metric</Label>
            <Select value={metricFilter} onValueChange={setMetricFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All metrics</SelectItem>
                {METRIC_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("")
              setStatusFilter("all")
              setQuarterFilter("all")
              setOwnerFilter("all")
              setMetricFilter("all")
            }}
          >
            Clear
          </Button>
          <Badge variant="secondary">{filtered.length} shown</Badge>
        </div>
      </SectionCard>

      {/* 4 — goal board */}
      <SectionCard
        title="Goal board"
        icon={<LayoutGrid className="h-4 w-4" />}
        action={
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={view === "grid" ? "default" : "ghost"}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyNote>No goals match these filters.</EmptyNote>
        ) : view === "grid" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedId(g.id)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
                  selectedId === g.id && "border-emerald-500 ring-1 ring-emerald-500",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium leading-tight">{g.title}</div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      STATUS_TONE[g.status],
                    )}
                  >
                    {GOAL_STATUS_LABEL[g.status]}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <AvatarCircle name={g.ownerName} avatar={g.ownerAvatar} size={18} />
                  {g.ownerName} · {g.quarter || "No quarter"}
                  {g.childCount > 0 && (
                    <Badge variant="outline" className="px-1 py-0 text-[10px]">
                      <GitBranch className="mr-1 h-3 w-3" />
                      {g.childCount}
                    </Badge>
                  )}
                </div>
                <Progress value={g.progressPct} className="mt-3 h-2" />
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatMetricValue(g.metricType, g.current)} /{" "}
                    {formatMetricValue(g.metricType, g.target)}
                  </span>
                  <span className="font-semibold text-foreground">{g.progressPct}%</span>
                </div>
                {g.overdue && (
                  <Badge variant="destructive" className="mt-2 text-[10px]">
                    Overdue
                  </Badge>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedId(g.id)}
                className={cn(
                  "flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/50",
                  selectedId === g.id && "bg-muted/60",
                )}
              >
                <span className="w-10 text-right text-sm font-semibold">{g.progressPct}%</span>
                <Progress value={g.progressPct} className="h-1.5 w-32" />
                <span className="flex-1 truncate text-sm font-medium">{g.title}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    STATUS_TONE[g.status],
                  )}
                >
                  {GOAL_STATUS_LABEL[g.status]}
                </span>
                <AvatarCircle name={g.ownerName} avatar={g.ownerAvatar} size={22} />
                <span className="w-20 text-right text-xs text-muted-foreground">
                  {g.quarter || "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 5+6 — selected goal detail + trend */}
      {selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title={`“${selected.title}”`}
            icon={<Target className="h-4 w-4" />}
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(selected)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    setDeleteTarget(selected)
                    setDeleteConfirm(false)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <div className="space-y-3 text-sm">
              {selected.description && (
                <p className="text-muted-foreground">{selected.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <AvatarCircle name={selected.ownerName} avatar={selected.ownerAvatar} size={22} />
                Owner: {selected.ownerName} · Created by {selected.creatorName}
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span>
                    Baseline {formatMetricValue(selected.metricType, selected.baseline ?? 0)}
                  </span>
                  <span className="font-semibold">
                    {formatMetricValue(selected.metricType, selected.current)}
                  </span>
                  <span>Target {formatMetricValue(selected.metricType, selected.target)}</span>
                </div>
                <Progress value={selected.progressPct} className="mt-2 h-2" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {selected.progressFormula} → {selected.progressPct}%
                  {selected.daysLeft !== null && (
                    <>
                      {" · "}
                      {selected.daysLeft >= 0
                        ? `${selected.daysLeft} days left`
                        : `${Math.abs(selected.daysLeft)} days overdue`}
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <Label className="text-xs">Log a check-in</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    step="any"
                    placeholder={`New ${METRIC_LABEL[selected.metricType].toLowerCase()} value${metricUnit(selected.metricType) ? ` (${metricUnit(selected.metricType)})` : ""}`}
                    value={checkinValue}
                    onChange={(e) => setCheckinValue(e.target.value)}
                  />
                  <Button onClick={() => void logCheckin()} disabled={checkinBusy}>
                    {checkinBusy ? "Logging…" : "Log"}
                  </Button>
                </div>
                <Textarea
                  className="mt-2"
                  rows={2}
                  placeholder="Optional note — what moved?"
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                />
              </div>
              {selectedCheckins && selectedCheckins.length > 0 && (
                <div className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
                  {[...selectedCheckins]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )
                    .map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                        <AvatarCircle name={c.authorName} avatar={c.authorAvatar} size={18} />
                        <span className="font-semibold">
                          {formatMetricValue(selected.metricType, c.value)}
                        </span>
                        <span className="flex-1 truncate text-muted-foreground">{c.note}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {relativeTime(c.createdAt)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Check-in trend" icon={<BarChart3 className="h-4 w-4" />}>
            {trendData.length === 0 ? (
              <EmptyNote>No check-ins logged yet for this goal.</EmptyNote>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={AXIS} />
                  <YAxis tick={AXIS} width={44} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Value"
                    stroke="hsl(var(--chart-pine))"
                    fill="hsl(var(--chart-pine))"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>
      )}

      {/* 7+8 — status mix + quarter comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Status mix" icon={<Scale className="h-4 w-4" />}>
          {statusMix.length === 0 ? (
            <EmptyNote>No goals yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {statusMix.map((s) => (
                    <Cell key={s.status} fill={STATUS_CHART_COLOR[s.status]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Quarter comparison" icon={<CalendarClock className="h-4 w-4" />}>
          {quarterBars.length === 0 ? (
            <EmptyNote>No quarterly data.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={quarterBars}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="quarter" tick={AXIS} />
                <YAxis tick={AXIS} width={40} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="avgProgress" name="Avg progress %" fill="hsl(var(--chart-pine))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="achieved" name="Achieved" fill="hsl(var(--chart-moss))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* 9 — owner leaderboard */}
      <SectionCard title="Owner leaderboard" icon={<Users className="h-4 w-4" />}>
        {ownerBars.length === 0 ? (
          <EmptyNote>No owners yet.</EmptyNote>
        ) : (
          <div className="space-y-2">
            {ownerBars.map((o) => (
              <div key={o.name} className="flex items-center gap-3">
                <span className="w-36 truncate text-sm">{o.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${o.avgProgress}%` }}
                  />
                </div>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {o.goals} goal{o.goals === 1 ? "" : "s"} · {o.avgProgress}%
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 10 — goal tree */}
      <SectionCard title="Goal tree" icon={<GitBranch className="h-4 w-4" />}>
        {tree.roots.length === 0 ? (
          <EmptyNote>No parent goals yet — create one and attach children via the parent field.</EmptyNote>
        ) : (
          <div className="space-y-1 text-sm">
            {tree.roots.map((root) => (
              <div key={root.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(root.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{root.title}</span>
                  <span className="text-xs text-muted-foreground">{root.progressPct}%</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[root.status])}>
                    {GOAL_STATUS_LABEL[root.status]}
                  </span>
                </button>
                {tree.childrenOf(root.id).map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedId(child.id)}
                    className="flex w-full items-center gap-2 rounded-md py-1.5 pl-9 pr-2 text-left hover:bg-muted/60"
                  >
                    <span className="flex-1 truncate text-muted-foreground">{child.title}</span>
                    <span className="text-xs text-muted-foreground">{child.progressPct}%</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 11 — suggestion spotlight */}
      <SectionCard title="Suggested status changes" icon={<Sparkles className="h-4 w-4" />}>
        {suggestions.length === 0 ? (
          <EmptyNote>Every goal&apos;s status matches its measured progress. Nothing to nudge.</EmptyNote>
        ) : (
          <div className="space-y-2">
            {suggestions.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate font-medium">{g.title}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[g.status])}>
                  {GOAL_STATUS_LABEL[g.status]}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[g.suggestedStatus])}>
                  {GOAL_STATUS_LABEL[g.suggestedStatus]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {g.progressPct}% · {g.daysLeft !== null ? `${g.daysLeft}d left` : "no due date"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === g.id}
                  onClick={() => void applySuggestion(g)}
                >
                  {busyId === g.id ? "Applying…" : "Apply"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 12 — recent check-ins feed */}
      <SectionCard title="Recent check-ins" icon={<CheckCheck className="h-4 w-4" />}>
        {recentCheckins.length === 0 ? (
          <EmptyNote>No check-ins yet — select a goal above and log the first one.</EmptyNote>
        ) : (
          <div className="space-y-1.5 text-sm">
            {recentCheckins.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                <AvatarCircle name={c.authorName} avatar={c.authorAvatar} size={20} />
                <span className="font-medium">{c.authorName}</span>
                <span className="text-muted-foreground">logged</span>
                <span className="font-semibold">{c.value}</span>
                <span className="text-muted-foreground">on</span>
                <button
                  type="button"
                  className="truncate font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  onClick={() => setSelectedId(c.goalId)}
                >
                  {c.goalTitle}
                </button>
                {c.note && <span className="hidden flex-1 truncate text-xs text-muted-foreground md:block">{c.note}</span>}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {relativeTime(c.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 13 — cross links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/sprints", label: "Sprints" },
          { href: "/dashboard/analytics", label: "Analytics" },
          { href: "/dashboard/retros", label: "Retrospectives" },
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
            <DialogTitle>{draft?.id ? "Edit goal" : "New goal"}</DialogTitle>
            <DialogDescription>
              Goals measure progress from baseline to target; check-ins update the current value.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Grow MRR to $20k"
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
                  <Label>Owner</Label>
                  <Select
                    value={draft.ownerId === "" ? undefined : String(draft.ownerId)}
                    onValueChange={(v) => setDraft({ ...draft, ownerId: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quarter</Label>
                  <Input
                    value={draft.quarter}
                    onChange={(e) => setDraft({ ...draft, quarter: e.target.value })}
                    placeholder="2026-Q4"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => setDraft({ ...draft, status: v as GoalStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GOAL_STATUS_LABEL) as GoalStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {GOAL_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Metric type</Label>
                  <Select
                    value={draft.metricType}
                    onValueChange={(v) => setDraft({ ...draft, metricType: v as MetricType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_TYPES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {METRIC_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Baseline</Label>
                  <Input
                    type="number"
                    step="any"
                    value={draft.baseline}
                    onChange={(e) => setDraft({ ...draft, baseline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Target</Label>
                  <Input
                    type="number"
                    step="any"
                    value={draft.target}
                    onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Current</Label>
                  <Input
                    type="number"
                    step="any"
                    value={draft.current}
                    onChange={(e) => setDraft({ ...draft, current: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Parent goal</Label>
                  <Select
                    value={draft.parentId === "" ? "none" : String(draft.parentId)}
                    onValueChange={(v) =>
                      setDraft({ ...draft, parentId: v === "none" ? "" : Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (top-level)</SelectItem>
                      {goals
                        .filter((g) => g.id !== draft.id)
                        .map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>
                            {g.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                  />
                </div>
              </div>
              {draft.metricType !== "boolean" && (
                <p className="text-xs text-muted-foreground">
                  Preview:{" "}
                  {computeProgress({
                    metricType: draft.metricType,
                    baseline: draft.baseline.trim() === "" ? null : Number(draft.baseline),
                    target: Number(draft.target) || 0,
                    current: Number(draft.current) || 0,
                  }).progressPct}
                  % progress with these numbers.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveDraft()} disabled={saving}>
              {saving ? "Saving…" : draft?.id ? "Save changes" : "Create goal"}
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
            <DialogTitle>Delete goal</DialogTitle>
            <DialogDescription>
              {deleteConfirm
                ? `This permanently deletes “${deleteTarget?.title}” and all of its check-ins. This cannot be undone.`
                : `Delete “${deleteTarget?.title}”? Its ${deleteTarget?.checkinCount ?? 0} check-in(s) will be removed too.`}
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
              <Button
                variant="destructive"
                onClick={() => void removeGoal()}
                disabled={busyId === deleteTarget?.id}
              >
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
