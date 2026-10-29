"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  BarChart3,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCheck,
  CircleDot,
  Copy,
  Layers,
  LayoutGrid,
  List,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Swords,
  Target,
  Timer,
  Trash2,
  Trophy,
  Users,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  STATUS_LABEL,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type Sprint = {
  id: number
  name: string
  description: string | null
  startDate: string
  endDate: string
  status: string
  capacity: number
  completed: number
  createdAt: string | null
  updatedAt: string | null
  totalPoints: number
  donePoints: number
  taskCount: number
  doneCount: number
  progressPct: number
  daysLeft: number
  endedOnTime: boolean | null
}

type SprintStats = {
  activeSprintId: number | null
  activeSprintName: string | null
  sprintsCompleted: number
  sprintsTotal: number
  onTimeRatePct: number
  avgVelocity: number
  myTasksInSprints: number
}

type BurndownPoint = { date: string; label: string; ideal: number | null; actual: number | null }
type CapacityRow = {
  id: number
  name: string
  avatar: string | null
  taskCount: number
  points: number
  donePoints: number
  openPoints: number
}
type ScopeChange = {
  id: number
  title: string
  status: string
  storyPoints: number
  createdAt: string | null
  updatedAt: string | null
}
type SprintDetail = Sprint & {
  burndown: BurndownPoint[]
  teamCapacity: CapacityRow[]
  scopeChanges: ScopeChange[]
}

type SprintDraft = {
  id?: number
  name: string
  description: string
  startDate: string
  endDate: string
  capacity: number
  status: string
}

/* -------------------------------------------------------------- helpers --- */

const SPRINT_STATUS_META: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "hsl(var(--chart-stone))" },
  planning: { label: "Planned", color: "hsl(var(--chart-stone))" },
  active: { label: "Active", color: "hsl(var(--chart-moss))" },
  completed: { label: "Completed", color: "hsl(var(--chart-pine))" },
}

function sprintMeta(status: string) {
  return SPRINT_STATUS_META[status] ?? { label: status, color: "hsl(var(--muted-foreground))" }
}

function SprintPill({ status }: { status: string }) {
  const meta = sprintMeta(status)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
    >
      <CircleDot className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

function fmtDay(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function windowLabel(s: { startDate: string; endDate: string }) {
  return `${fmtDay(s.startDate)} → ${fmtDay(s.endDate)}`
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  const json = await res.json().catch(() => null)
  if (!json?.success) throw new Error(json?.message ?? `Request failed (${res.status})`)
  return json.data as T
}

/* --------------------------------------------------------------- the page */

export default function SprintsWorkspace() {
  const { toast } = useToast()

  const [sprints, setSprints] = useState<Sprint[]>([])
  const [stats, setStats] = useState<SprintStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const [view, setView] = useState<"cards" | "table" | "timeline">("cards")
  const [boardScope, setBoardScope] = useState<"mine" | "workspace">("mine")
  const scopeParam = boardScope === "mine" ? "scope=mine" : "scope=all"
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "name" | "progress">("recent")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<SprintDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTick, setDetailTick] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<SprintDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Sprint | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  /* ---- data loading ---- */

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sprints?${scopeParam}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Failed to load sprints")
      const list: Sprint[] = json.data
      setSprints(list)
      setStats(json.stats ?? null)
      setLoadFailed(false)
      setSelectedId((cur) => {
        if (cur !== null && list.some((s) => s.id === cur)) return cur
        const active = list.find((s) => s.status === "active")
        return active?.id ?? list[0]?.id ?? null
      })
      return list
    } catch (err) {
      setLoadFailed(true)
      toast({ variant: "destructive", title: "Sprints", description: (err as Error).message })
      return null
    }
  }, [toast, scopeParam])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await load()
      setLoading(false)
    })()
  }, [load])

  // The sprint list only — no detail skeleton, no toast. Picks up sprints someone
  // else started or closed without disturbing the panel the viewer is reading.
  const reloadQuiet = useCallback(async () => {
    try {
      const res = await fetch(`/api/sprints?${scopeParam}`)
      const json = await res.json()
      if (!json.success) return
      const list: Sprint[] = json.data
      setSprints(list)
      setStats(json.stats ?? null)
      setSelectedId((cur) => (cur !== null && list.some((s) => s.id === cur) ? cur : list[0]?.id ?? null))
    } catch {
      /* keep the list already on screen */
    }
  }, [scopeParam])

  useLiveRefresh(reloadQuiet, { intervalMs: LIVE_REFRESH_MS })

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    api<SprintDetail>(`/api/sprints/${selectedId}`)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((err) => {
        if (!cancelled) toast({ variant: "destructive", title: "Sprint detail", description: (err as Error).message })
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, detailTick, toast])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setDetailTick((t) => t + 1)
    setRefreshing(false)
    toast({ title: "Sprints refreshed" })
  }, [load, toast])

  /* ---- mutations ---- */

  const openCreate = () => {
    const today = new Date()
    const inTwoWeeks = new Date(today.getTime() + 14 * 86_400_000)
    setDraft({
      name: "",
      description: "",
      startDate: toIsoDate(today),
      endDate: toIsoDate(inTwoWeeks),
      capacity: 0,
      status: "planned",
    })
    setFormOpen(true)
  }

  const openEdit = (s: Sprint) => {
    setDraft({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      startDate: s.startDate,
      endDate: s.endDate,
      capacity: s.capacity,
      status: s.status,
    })
    setFormOpen(true)
  }

  const openDuplicate = (s: Sprint) => {
    const start = new Date()
    const end = new Date(start.getTime() + (new Date(`${s.endDate}T00:00:00`).getTime() - new Date(`${s.startDate}T00:00:00`).getTime()))
    setDraft({
      name: `${s.name} (copy)`,
      description: s.description ?? "",
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
      capacity: s.capacity,
      status: "planned",
    })
    setFormOpen(true)
  }

  const saveSprint = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast({ variant: "destructive", title: "Sprint", description: "A name is required." })
      return
    }
    if (!draft.startDate || !draft.endDate) {
      toast({ variant: "destructive", title: "Sprint", description: "Start and end dates are required." })
      return
    }
    if (new Date(draft.endDate) <= new Date(draft.startDate)) {
      toast({ variant: "destructive", title: "Sprint", description: "End date must be after the start date." })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description,
        startDate: draft.startDate,
        endDate: draft.endDate,
        capacity: draft.capacity,
        status: draft.status,
      }
      const data = draft.id
        ? await api<Sprint>(`/api/sprints/${draft.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api<Sprint>("/api/sprints", { method: "POST", body: JSON.stringify(payload) })
      toast({
        title: draft.id ? "Sprint updated" : "Sprint created",
        description: `${data.name} · notifications sent`,
      })
      setFormOpen(false)
      setDraft(null)
      setSelectedId(data.id)
      await load()
      setDetailTick((t) => t + 1)
    } catch (err) {
      toast({ variant: "destructive", title: "Sprint", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const transitionSprint = async (s: Sprint, status: string) => {
    setBusyId(s.id)
    try {
      await api<Sprint>(`/api/sprints/${s.id}`, { method: "PUT", body: JSON.stringify({ status }) })
      toast({
        title: status === "active" ? "Sprint started" : "Sprint completed",
        description: `${s.name} — team notified.`,
      })
      setSelectedId(s.id)
      await load()
      setDetailTick((t) => t + 1)
    } catch (err) {
      toast({ variant: "destructive", title: "Sprint", description: (err as Error).message })
    } finally {
      setBusyId(null)
    }
  }

  const deleteSprint = async (s: Sprint) => {
    setDeleting(true)
    try {
      await api(`/api/sprints/${s.id}`, { method: "DELETE" })
      toast({ title: "Sprint deleted", description: `${s.name} removed; tasks moved to backlog.` })
      setConfirmDelete(null)
      setSelectedId((cur) => (cur === s.id ? null : cur))
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Sprint", description: (err as Error).message })
    } finally {
      setDeleting(false)
    }
  }

  /* ---- derived collections ---- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = sprints.filter((s) => {
      if (statusFilter !== "all") {
        const norm = s.status === "planning" ? "planned" : s.status
        if (norm !== statusFilter) return false
      }
      if (q && !`${s.name} ${s.description ?? ""}`.toLowerCase().includes(q)) return false
      if (dateFrom && s.endDate < dateFrom) return false
      if (dateTo && s.startDate > dateTo) return false
      return true
    })
    switch (sortBy) {
      case "oldest":
        return [...list].sort((a, b) => a.startDate.localeCompare(b.startDate))
      case "name":
        return [...list].sort((a, b) => a.name.localeCompare(b.name))
      case "progress":
        return [...list].sort((a, b) => b.progressPct - a.progressPct)
      default:
        return [...list].sort((a, b) => b.startDate.localeCompare(a.startDate))
    }
  }, [sprints, search, statusFilter, dateFrom, dateTo, sortBy])

  const activeSprint = sprints.find((s) => s.status === "active") ?? null
  const completedSprints = useMemo(() => sprints.filter((s) => s.status === "completed"), [sprints])
  const upcoming = useMemo(
    () =>
      sprints
        .filter((s) => (s.status === "planned" || s.status === "planning") && s.endDate >= toIsoDate(new Date()))
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 6),
    [sprints],
  )
  const velocityData = useMemo(
    () =>
      [...completedSprints]
        .sort((a, b) => a.endDate.localeCompare(b.endDate))
        .slice(-8)
        .map((s) => ({ name: s.name, committed: s.totalPoints || s.capacity, completed: s.donePoints || s.completed })),
    [completedSprints],
  )
  const donutData = useMemo(() => {
    const done = sprints.reduce((sum, s) => sum + s.donePoints, 0)
    const remaining = sprints.reduce((sum, s) => sum + Math.max(0, s.totalPoints - s.donePoints), 0)
    return [
      { name: "Done points", value: done, color: "hsl(var(--chart-pine))" },
      { name: "Open points", value: remaining, color: "hsl(var(--chart-stone))" },
    ].filter((d) => d.value > 0)
  }, [sprints])
  const totalPointsAll = sprints.reduce((s, x) => s + x.totalPoints, 0)
  const donePointsAll = sprints.reduce((s, x) => s + x.donePoints, 0)
  const overallPct = totalPointsAll > 0 ? Math.round((donePointsAll / totalPointsAll) * 100) : 0
  const perfectSprints = sprints.filter((s) => s.status === "completed" && s.progressPct >= 100)

  /* ---- loading / failure states ---- */

  if (loading && sprints.length === 0) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (loadFailed && sprints.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn&rsquo;t reach the sprint API. Your session may have expired.
        </p>
        <Button variant="outline" onClick={() => load()}>
          Retry
        </Button>
      </div>
    )
  }

  /* ---- section renderers ---- */

  const kpiStrip = (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {[
        {
          label: "Active sprint",
          value: stats?.activeSprintName ?? (activeSprint ? activeSprint.name : "—"),
          icon: <Zap className="h-4 w-4" />,
          hint: activeSprint ? `${activeSprint.daysLeft} day${activeSprint.daysLeft === 1 ? "" : "s"} left` : "none running",
        },
        {
          label: "Sprints completed",
          value: stats?.sprintsCompleted ?? completedSprints.length,
          icon: <CheckCheck className="h-4 w-4" />,
          hint: `of ${stats?.sprintsTotal ?? sprints.length} total`,
        },
        {
          label: "On-time completion",
          value: `${stats?.onTimeRatePct ?? 0}%`,
          icon: <Timer className="h-4 w-4" />,
          hint: "closed before end date",
        },
        {
          label: "Avg velocity",
          value: `${stats?.avgVelocity ?? 0} pts`,
          icon: <Swords className="h-4 w-4" />,
          hint: "per completed sprint",
        },
        {
          label: "Your sprint tasks",
          value: stats?.myTasksInSprints ?? 0,
          icon: <CircleDot className="h-4 w-4" />,
          hint: "assigned in sprints",
        },
      ].map((k) => (
        <Card key={k.label}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {k.label}
              {k.icon}
            </div>
            <p className="mt-1 truncate text-xl font-semibold tabular-nums" title={String(k.value)}>
              {k.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{k.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const filterBar = (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-2 py-3">
        <div className="flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="Sprint scope">
          <Button
            size="sm"
            variant={boardScope === "mine" ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => setBoardScope("mine")}
          >
            My sprints
          </Button>
          <Button
            size="sm"
            variant={boardScope === "workspace" ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => setBoardScope("workspace")}
          >
            Workspace
          </Button>
        </div>
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sprints…"
            aria-label="Search sprints"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-32 text-sm" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-9 w-36 text-sm" aria-label="Sort sprints">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Newest start</SelectItem>
            <SelectItem value="oldest">Oldest start</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="progress">Most progress</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Label htmlFor="sf-from" className="text-[11px]">
            From
          </Label>
          <Input
            id="sf-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36 text-sm"
          />
          <Label htmlFor="sf-to" className="text-[11px]">
            To
          </Label>
          <Input id="sf-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        {(dateFrom || dateTo || search || statusFilter !== "all" || sortBy !== "recent") && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              setSearch("")
              setStatusFilter("all")
              setDateFrom("")
              setDateTo("")
              setSortBy("recent")
            }}
          >
            Clear
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="View mode">
          {(
            [
              { key: "cards", icon: <LayoutGrid className="h-4 w-4" />, label: "Cards view" },
              { key: "table", icon: <List className="h-4 w-4" />, label: "Table view" },
              { key: "timeline", icon: <CalendarDays className="h-4 w-4" />, label: "Timeline view" },
            ] as const
          ).map((v) => (
            <Button
              key={v.key}
              size="sm"
              variant={view === v.key ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setView(v.key)}
              aria-label={v.label}
              aria-pressed={view === v.key}
            >
              {v.icon}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const capacityPct = (s: Sprint) => (s.capacity > 0 ? Math.round((s.totalPoints / s.capacity) * 100) : null)

  const spotlight = activeSprint ? (
    <Card className="border-[hsl(var(--chart-moss))]/40 bg-[hsl(var(--chart-moss))]/[0.03]">
      <CardContent className="grid gap-4 py-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Active sprint spotlight</h2>
            <SprintPill status={activeSprint.status} />
            <Badge variant="outline" className="text-[11px]">
              {windowLabel(activeSprint)}
            </Badge>
          </div>
          <p className="text-sm font-medium">{activeSprint.name}</p>
          {activeSprint.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{activeSprint.description}</p>
          )}
          <div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Sprint progress · {activeSprint.donePoints}/{activeSprint.totalPoints} pts ·{" "}
                {activeSprint.doneCount}/{activeSprint.taskCount} tasks
              </span>
              <span className="font-semibold tabular-nums">{activeSprint.progressPct}%</span>
            </div>
            <Progress value={activeSprint.progressPct} className="mt-1 h-2" aria-label="Sprint progress" />
          </div>
          <div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Capacity load · {activeSprint.totalPoints}/{activeSprint.capacity || "—"} pts committed
              </span>
              <span className="font-semibold tabular-nums">
                {capacityPct(activeSprint) === null ? "no capacity set" : `${capacityPct(activeSprint)}%`}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  (capacityPct(activeSprint) ?? 0) > 100 ? "bg-[hsl(var(--destructive))]" : "bg-[hsl(var(--chart-clay))]",
                )}
                style={{ width: `${Math.min(100, capacityPct(activeSprint) ?? 0)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch justify-between gap-3 lg:w-44">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <div className="rounded-lg border bg-card p-2 text-center">
              <p className="text-xl font-semibold tabular-nums">{activeSprint.daysLeft}</p>
              <p className="text-[11px] text-muted-foreground">days left</p>
            </div>
            <div className="rounded-lg border bg-card p-2 text-center">
              <p className="text-xl font-semibold tabular-nums">{activeSprint.taskCount - activeSprint.doneCount}</p>
              <p className="text-[11px] text-muted-foreground">tasks open</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(activeSprint)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={busyId === activeSprint.id}
              onClick={() => transitionSprint(activeSprint, "completed")}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              {busyId === activeSprint.id ? "Saving…" : "Complete"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <h2 className="text-sm font-semibold">No sprint is running</h2>
          <p className="text-xs text-muted-foreground">Start a planned sprint or create a new one to light up the spotlight.</p>
        </div>
        {upcoming.length > 0 ? (
          <Button size="sm" disabled={busyId === upcoming[0].id} onClick={() => transitionSprint(upcoming[0], "active")}>
            <Play className="mr-1 h-3.5 w-3.5" /> Start {upcoming[0].name}
          </Button>
        ) : (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New sprint
          </Button>
        )}
      </CardContent>
    </Card>
  )

  const sprintActions = (s: Sprint) => (
    <div className="flex flex-wrap items-center gap-1">
      {s.status === "planned" || s.status === "planning" ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-[hsl(var(--chart-moss))]"
          disabled={busyId === s.id}
          onClick={() => transitionSprint(s, "active")}
          aria-label={`Start ${s.name}`}
        >
          <Play className="mr-1 h-3 w-3" /> Start
        </Button>
      ) : s.status === "active" ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-[hsl(var(--chart-pine))]"
          disabled={busyId === s.id}
          onClick={() => transitionSprint(s, "completed")}
          aria-label={`Complete ${s.name}`}
        >
          <Check className="mr-1 h-3 w-3" /> Complete
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openDuplicate(s)} aria-label={`Duplicate ${s.name}`}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-red-500"
        onClick={() => setConfirmDelete(s)}
        aria-label={`Delete ${s.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )

  const cardsView = (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((s) => (
        <Card
          key={s.id}
          className={cn(
            "cursor-pointer transition-colors hover:border-primary/40",
            selectedId === s.id && "border-primary/60 ring-1 ring-primary/30",
          )}
          onClick={() => setSelectedId(s.id)}
        >
          <CardContent className="flex flex-col gap-2 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug">{s.name}</p>
              <SprintPill status={s.status} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {windowLabel(s)} · {s.taskCount} tasks · {s.donePoints}/{s.totalPoints} pts
            </p>
            {s.description && <p className="line-clamp-1 text-xs text-muted-foreground">{s.description}</p>}
            <Progress value={s.progressPct} className="h-1.5" aria-label={`Progress of ${s.name}`} />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="tabular-nums">{s.progressPct}% done</span>
              <span>
                {s.status === "completed"
                  ? s.endedOnTime
                    ? "closed on time"
                    : "closed late"
                  : `${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left`}
              </span>
            </div>
            <div className="flex justify-end border-t pt-1" onClick={(e) => e.stopPropagation()}>
              {sprintActions(s)}
            </div>
          </CardContent>
        </Card>
      ))}
      {filtered.length === 0 && (
        <Card className="md:col-span-2 xl:col-span-3">
          <EmptyNote>No sprints match these filters.</EmptyNote>
        </Card>
      )}
    </div>
  )

  const tableView = (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Sprint</th>
              <th className="px-4 py-2 font-medium">Window</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Points</th>
              <th className="px-4 py-2 font-medium">Progress</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                className={cn("border-b last:border-0 hover:bg-muted/40", selectedId === s.id && "bg-muted/40")}
                onClick={() => setSelectedId(s.id)}
              >
                <td className="max-w-56 px-4 py-2">
                  <button className="truncate text-left font-medium hover:underline" aria-label={`Open ${s.name} details`}>
                    {s.name}
                  </button>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{windowLabel(s)}</td>
                <td className="px-4 py-2">
                  <SprintPill status={s.status} />
                </td>
                <td className="px-4 py-2 tabular-nums text-xs">
                  {s.donePoints}/{s.totalPoints}
                </td>
                <td className="w-40 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Progress value={s.progressPct} className="h-1.5 flex-1" aria-label={`Progress of ${s.name}`} />
                    <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{s.progressPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  {sprintActions(s)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyNote>No sprints match these filters.</EmptyNote>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )

  const timelineView = (() => {
    if (filtered.length === 0) {
      return (
        <Card>
          <EmptyNote>No sprints to plot on the timeline.</EmptyNote>
        </Card>
      )
    }
    const min = Math.min(...filtered.map((s) => new Date(`${s.startDate}T00:00:00`).getTime()))
    const max = Math.max(...filtered.map((s) => new Date(`${s.endDate}T23:59:59`).getTime()))
    const span = Math.max(1, max - min)
    const nowPct = ((Date.now() - min) / span) * 100
    return (
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{fmtDay(toIsoDate(new Date(min)))}</span>
            <span>{fmtDay(toIsoDate(new Date(max)))}</span>
          </div>
          <div className="relative space-y-2">
            {nowPct >= 0 && nowPct <= 100 && (
              <div
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[hsl(var(--destructive))]"
                style={{ left: `${nowPct}%` }}
                aria-hidden
              />
            )}
            {filtered.map((s) => {
              const left = ((new Date(`${s.startDate}T00:00:00`).getTime() - min) / span) * 100
              const width = Math.max(1.5, ((new Date(`${s.endDate}T23:59:59`).getTime() - new Date(`${s.startDate}T00:00:00`).getTime()) / span) * 100)
              return (
                <button
                  key={s.id}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left hover:bg-muted/40"
                  onClick={() => setSelectedId(s.id)}
                  aria-label={`Select ${s.name}`}
                >
                  <span className="w-40 shrink-0 truncate text-xs font-medium">{s.name}</span>
                  <span className="relative h-5 flex-1 rounded bg-muted/50">
                    <span
                      className="absolute top-0 flex h-5 items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white"
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: sprintMeta(s.status).color }}
                    >
                      <span className="truncate">{s.progressPct}%</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">Red line marks today. Bars are coloured by sprint status.</p>
        </CardContent>
      </Card>
    )
  })()

  const chartsRow = (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title={detail ? `Burndown — ${detail.name}` : "Burndown"}
        icon={<BarChart3 className="h-4 w-4" />}
        action={
          detail && (
            <Badge variant="outline" className="text-[10px]">
              {windowLabel(detail)}
            </Badge>
          )
        }
      >
        {detailLoading ? (
          <Skeleton className="h-56" />
        ) : detail && detail.burndown.length > 0 && detail.totalPoints > 0 ? (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={detail.burndown}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={AXIS} minTickGap={24} />
              <YAxis tick={AXIS} width={30} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ideal" name="Ideal" stroke="hsl(var(--chart-stone))" strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="actual" name="Remaining" stroke="hsl(var(--chart-pine))" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : detail ? (
          <EmptyNote>No story points in this sprint yet — burndown needs tasks with points.</EmptyNote>
        ) : (
          <EmptyNote>Select a sprint to see its burndown.</EmptyNote>
        )}
      </SectionCard>

      <SectionCard title="Velocity history" icon={<Swords className="h-4 w-4" />} action={<Badge variant="outline" className="text-[10px]">committed vs completed</Badge>}>
        {velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={AXIS} interval={0} angle={-12} textAnchor="end" height={48} />
              <YAxis tick={AXIS} width={30} />
              <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="committed" name="Committed" fill="hsl(var(--chart-stone))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyNote>Complete a sprint to build velocity history.</EmptyNote>
        )}
      </SectionCard>
    </div>
  )

  const scopeRow = (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Scope changes"
        icon={<Layers className="h-4 w-4" />}
        action={
          detail && (
            <Badge variant={detail.scopeChanges.length > 0 ? "secondary" : "outline"} className="text-[10px]">
              {detail.scopeChanges.length} mid-sprint
            </Badge>
          )
        }
      >
        {detailLoading ? (
          <Skeleton className="h-40" />
        ) : detail && detail.scopeChanges.length > 0 ? (
          <>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Tasks created or touched after {detail.name} started — scope creep is what breaks burndowns.
            </p>
            <ul className="max-h-48 divide-y overflow-y-auto">
              {detail.scopeChanges.slice(0, 12).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {STATUS_LABEL[t.status] ?? t.status} · {t.updatedAt ? relativeTime(t.updatedAt) : "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {t.storyPoints} pts
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        ) : detail ? (
          <EmptyNote>Scope is locked — nothing was added after the start date.</EmptyNote>
        ) : (
          <EmptyNote>Select a sprint to audit its scope changes.</EmptyNote>
        )}
      </SectionCard>

      <SectionCard
        title="Team capacity"
        icon={<Users className="h-4 w-4" />}
        action={detail && <Badge variant="outline" className="text-[10px]">{detail.teamCapacity.length} members</Badge>}
      >
        {detailLoading ? (
          <Skeleton className="h-40" />
        ) : detail && detail.teamCapacity.length > 0 ? (
          (() => {
            const maxPts = Math.max(1, ...detail.teamCapacity.map((c) => c.points))
            return (
              <div className="space-y-2.5">
                {detail.teamCapacity.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <AvatarCircle name={c.name} avatar={c.avatar} />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-xs">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {c.donePoints}/{c.points} pts · {c.taskCount} tasks
                        </span>
                      </div>
                      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-[hsl(var(--chart-pine))]" style={{ width: `${(c.donePoints / maxPts) * 100}%` }} />
                        <div className="h-full bg-[hsl(var(--chart-clay))]" style={{ width: `${(c.openPoints / maxPts) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[10px] text-muted-foreground">Green = done, amber = open story points per assignee.</p>
              </div>
            )
          })()
        ) : detail ? (
          <EmptyNote>No assigned tasks in this sprint yet.</EmptyNote>
        ) : (
          <EmptyNote>Select a sprint to see who carries the load.</EmptyNote>
        )}
      </SectionCard>
    </div>
  )

  const achievementRow = (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Completion rate" icon={<Target className="h-4 w-4" />}>
        {donutData.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="relative h-44 w-1/2 max-w-52">
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">{overallPct}%</span>
                <span className="text-[10px] text-muted-foreground">points done</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{d.value}</span>
                </div>
              ))}
              <Separator />
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[11px] font-semibold">
                  <Trophy className="h-3.5 w-3.5 text-[hsl(var(--chart-clay))]" /> Achievements
                </p>
                {perfectSprints.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    {perfectSprints.length} sprint{perfectSprints.length === 1 ? "" : "s"} closed at 100% —{" "}
                    {perfectSprints
                      .slice(0, 3)
                      .map((s) => s.name)
                      .join(", ")}
                    {perfectSprints.length > 3 ? "…" : ""}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No perfect sprint yet — first 100% closure earns the ring.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyNote>Add sprints with pointed tasks to light this up.</EmptyNote>
        )}
      </SectionCard>

      <SectionCard title="Upcoming agenda" icon={<CalendarClock className="h-4 w-4" />}>
        {upcoming.length > 0 ? (
          <ul className="divide-y">
            {upcoming.map((s) => {
              const daysAway = Math.round((new Date(`${s.startDate}T00:00:00`).getTime() - Date.now()) / 86_400_000)
              return (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-muted py-1 text-center">
                    <span className="text-[10px] uppercase">{fmtDay(s.startDate).split(" ")[0]}</span>
                    <span className="text-sm font-semibold tabular-nums">{fmtDay(s.startDate).split(" ")[1]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <button className="block max-w-full truncate text-left text-sm font-medium hover:underline" onClick={() => setSelectedId(s.id)}>
                      {s.name}
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      {windowLabel(s)} · {s.taskCount} tasks · {s.capacity > 0 ? `${s.capacity} pt capacity` : "no capacity set"}
                    </p>
                  </div>
                  <Badge variant={daysAway <= 0 ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                    {daysAway <= 0 ? "ready to start" : `in ${daysAway}d`}
                  </Badge>
                  {daysAway <= 0 && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busyId === s.id} onClick={() => transitionSprint(s, "active")}>
                      <Play className="mr-1 h-3 w-3" /> Start
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyNote>Nothing planned ahead. Create a sprint to fill the agenda.</EmptyNote>
        )}
      </SectionCard>
    </div>
  )

  /* ---- render ---- */

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header + New sprint */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sprints</h1>
          <p className="text-sm text-muted-foreground">
            Plan, run and review every sprint cycle — {sprints.length} sprint{sprints.length === 1 ? "" : "s"} tracked.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New sprint
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      {kpiStrip}

      {/* 3 — Filter / sort bar + view toggle */}
      {filterBar}

      {/* 4 — Active sprint spotlight */}
      {spotlight}

      {/* 5/6/7 — Sprint collection (cards / table / timeline) */}
      <section aria-label="Sprint collection">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            All sprints{" "}
            <span className="font-normal">
              ({filtered.length} shown)
            </span>
          </h2>
          {filtered.length > 0 && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {view} view
            </Badge>
          )}
        </div>
        {view === "cards" ? cardsView : view === "table" ? tableView : timelineView}
      </section>

      {/* 8/9 — Burndown + velocity */}
      {chartsRow}

      {/* 10/11 — Scope changes + team capacity */}
      {scopeRow}

      {/* 12/13 — Completion donut + upcoming agenda */}
      {achievementRow}

      {/* 14 — Create/edit + delete dialogs */}
      <Dialog open={formOpen && draft !== null} onOpenChange={(o) => !o && setFormOpen(false)}>
        {draft && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{draft.id ? `Edit sprint #${draft.id}` : "New sprint"}</DialogTitle>
              <DialogDescription>
                {draft.id ? "Changes recalculate progress and notify the team on status moves." : "The team gets a live notification when the sprint is created, started and completed."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sp-name">Name</Label>
                <Input id="sp-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Sprint 24 · Checkout fixes" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sp-desc">Description</Label>
                <Textarea id="sp-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What is this sprint about?" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-start">Start date</Label>
                <Input id="sp-start" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-end">End date</Label>
                <Input id="sp-end" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-cap">Capacity (story points)</Label>
                <Input
                  id="sp-cap"
                  type="number"
                  min={0}
                  value={draft.capacity}
                  onChange={(e) => setDraft({ ...draft, capacity: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={draft.status === "planning" ? "planned" : draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger aria-label="Sprint status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveSprint} disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Create sprint"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        {confirmDelete && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete {confirmDelete.name}?</DialogTitle>
              <DialogDescription>
                This removes the sprint for everyone. Its {confirmDelete.taskCount} task{confirmDelete.taskCount === 1 ? "" : "s"}{" "}
                will move back to the backlog and assignees get notified. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Window</span>
                <span>{windowLabel(confirmDelete)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span>
                  {confirmDelete.donePoints}/{confirmDelete.totalPoints} pts ({confirmDelete.progressPct}%)
                </span>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Keep sprint
              </Button>
              <Button variant="destructive" onClick={() => deleteSprint(confirmDelete)} disabled={deleting}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Delete sprint"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* footer strip — live stats kept honest with the kit palette */}
      <p className="pb-2 text-[10px] text-muted-foreground">
        Sprint data comes from /api/sprints · {stats ? `${stats.avgVelocity} pt avg velocity across ${stats.sprintsCompleted} completed sprint${stats.sprintsCompleted === 1 ? "" : "s"}` : "warming up"}
      </p>
    </div>
  )
}
