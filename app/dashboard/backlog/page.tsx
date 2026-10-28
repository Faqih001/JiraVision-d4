"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
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
  ArrowDownToLine,
  ArrowUp,
  ArrowUpRight,
  Award,
  CheckCheck,
  ClipboardList,
  Filter,
  Flag,
  GitBranch,
  ListChecks,
  PieChart as PieChartIcon,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Timer,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  PRIORITIES,
  PriorityPill,
  PRIORITY_COLOR,
  SectionCard,
  StatusPill,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type TaskRow = {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  storyPoints: number
  assigneeId: number | null
  sprintId: number | null
  dueDate: string | null
  createdAt: string | null
  updatedAt: string | null
}

type SprintOption = { id: number; name: string; status: string }
type Member = { id: number; name: string; avatar: string | null }

type GroomDraft = { points: number; description: string }

/* --------------------------------------------------------------- scoring */

// Backlog readiness score (documented, computed client-side, 0–100):
//   detail   (0–45): min(description length, 140) / 140 * 45
//   estimate (0–35): storyPoints > 0 ? min(points, 13) / 13 * 35 : 0
//   priority (0–20): urgent 20 · high 14 · medium 8 · low 3
// An item is "ready to sprint" when description >= 30 chars AND storyPoints > 0.
// Ranking ties break on priority weight, then age (older first).

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 20, high: 14, medium: 8, low: 3 }

function readinessScore(t: TaskRow) {
  const detail = (Math.min((t.description ?? "").trim().length, 140) / 140) * 45
  const estimate = t.storyPoints > 0 ? (Math.min(t.storyPoints, 13) / 13) * 35 : 0
  const priority = PRIORITY_WEIGHT[t.priority] ?? 5
  return Math.round(detail + estimate + priority)
}

const isReady = (t: TaskRow) => (t.description ?? "").trim().length >= 30 && t.storyPoints > 0

const daysOld = (t: TaskRow) =>
  t.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86_400_000)) : 0

const PRIORITIES_ASC = ["low", "medium", "high", "urgent"]

type ItemDraftState = {
  title: string
  description: string
  priority: string
  storyPoints: number
  assigneeId: number | ""
}

const nullDraft = (): ItemDraftState => ({ title: "", description: "", priority: "medium", storyPoints: 1, assigneeId: "" })

/* --------------------------------------------------------------- the page */

export default function DashboardBacklog() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [sprints, setSprints] = useState<SprintOption[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [me, setMe] = useState<{ id: number; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)

  // filters (client-side over the fetched list)
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")

  // grooming queue drafts
  const [groomDrafts, setGroomDrafts] = useState<Record<number, GroomDraft>>({})
  const [groomSaving, setGroomSaving] = useState<number | null>(null)
  const [expandedGroom, setExpandedGroom] = useState<Record<number, boolean>>({})

  // ranking row actions
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [raising, setRaising] = useState<number | null>(null)

  // sprint assignment panel
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [targetSprint, setTargetSprint] = useState("none")
  const [bulkBusy, setBulkBusy] = useState(false)

  // pull-back panel
  const [pullSprint, setPullSprint] = useState("none")
  const [pulling, setPulling] = useState<number | null>(null)

  // new item dialog
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<ItemDraftState>(nullDraft)
  const [saving, setSaving] = useState(false)

  /* ---- data loading ---- */

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const collected: TaskRow[] = []
      let page = 1
      // pageSize 200, walk pages until exhausted (capped at 10 pages)
      for (;;) {
        const res = await fetch(`/api/tasks?pageSize=200&page=${page}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.message ?? "Failed to load tasks")
        collected.push(...(json.data as TaskRow[]))
        const totalPages: number = json.pagination?.totalPages ?? 1
        if (page >= totalPages || page >= 10) break
        page += 1
      }
      setTasks(collected)

      const [spRes, ovRes] = await Promise.all([fetch("/api/sprints"), fetch("/api/dashboard/overview")])
      const spJson = await spRes.json()
      if (spJson.success)
        setSprints(
          (spJson.data as { id: number; name: string; status: string }[]).map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
          })),
        )
      const ovJson = await ovRes.json()
      if (ovJson.success) {
        setMembers(
          (ovJson.data.workload as { id: number; name: string; avatar: string | null }[]).map((w) => ({
            id: w.id,
            name: w.name,
            avatar: w.avatar,
          })),
        )
        setMe({ id: ovJson.data.user.id, name: ovJson.data.user.name })
      }
    } catch (err) {
      setFailed(true)
      toast({ variant: "destructive", title: "Backlog", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const reloadQuiet = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?pageSize=200")
      const json = await res.json()
      if (json.success) setTasks(json.data as TaskRow[])
    } catch {
      /* the rows already on screen stay; the manual refresh button reports failures */
    }
  }, [])

  useLiveRefresh(reloadQuiet, { intervalMs: LIVE_REFRESH_MS })

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast({ title: "Backlog refreshed" })
  }, [load, toast])

  useEffect(() => {
    load()
  }, [load])

  /* ---- derived: the backlog ---- */

  // Backlog = tasks not assigned to any sprint (sprintId null/0), excluding done work.
  const backlog = useMemo(
    () => tasks.filter((t) => (t.sprintId ?? 0) === 0 && t.status !== "done"),
    [tasks],
  )

  const filteredBacklog = useMemo(() => {
    const q = search.trim().toLowerCase()
    return backlog.filter((t) => {
      if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" ? t.assigneeId != null : t.assigneeId !== Number(assigneeFilter)) return false
      }
      if (ageFilter !== "all") {
        const age = daysOld(t)
        if (ageFilter === "fresh" && age > 7) return false
        if (ageFilter === "month" && !(age > 7 && age <= 30)) return false
        if (ageFilter === "stale" && !(age > 30 && age <= 90)) return false
        if (ageFilter === "ancient" && age <= 90) return false
      }
      return true
    })
  }, [backlog, search, priorityFilter, assigneeFilter, ageFilter])

  const ranked = useMemo(
    () =>
      [...filteredBacklog]
        .map((t) => ({ t, score: readinessScore(t) }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            (PRIORITY_WEIGHT[b.t.priority] ?? 0) - (PRIORITY_WEIGHT[a.t.priority] ?? 0) ||
            daysOld(b.t) - daysOld(a.t),
        ),
    [filteredBacklog],
  )

  const groomingQueue = useMemo(() => filteredBacklog.filter((t) => !isReady(t)), [filteredBacklog])

  const kpis = useMemo(() => {
    const unestimated = backlog.filter((t) => t.storyPoints <= 0).length
    const poorlyDescribed = backlog.filter((t) => (t.description ?? "").trim().length < 30).length
    const ready = backlog.filter(isReady).length
    const totalPoints = backlog.reduce((s, t) => s + t.storyPoints, 0)
    const avgPoints = backlog.length ? Math.round((totalPoints / backlog.length) * 10) / 10 : 0
    const oldest = backlog.reduce((m, t) => Math.max(m, daysOld(t)), 0)
    return { count: backlog.length, totalPoints, unestimated, poorlyDescribed, ready, avgPoints, oldest }
  }, [backlog])

  const ageBuckets = useMemo(() => {
    const defs = [
      { label: "<1w", test: (d: number) => d <= 7 },
      { label: "1–2w", test: (d: number) => d > 7 && d <= 14 },
      { label: "2–4w", test: (d: number) => d > 14 && d <= 30 },
      { label: "1–2m", test: (d: number) => d > 30 && d <= 60 },
      { label: "2–3m", test: (d: number) => d > 60 && d <= 90 },
      { label: "3m+", test: (d: number) => d > 90 },
    ]
    return defs.map((b) => ({ label: b.label, count: backlog.filter((t) => b.test(daysOld(t))).length }))
  }, [backlog])

  const priorityMix = useMemo(
    () => PRIORITIES.map((p) => ({ name: p, value: backlog.filter((t) => t.priority === p).length })).filter((x) => x.value > 0),
    [backlog],
  )

  const coverage = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null; count: number; points: number }>()
    for (const t of backlog) {
      const key = t.assigneeId == null ? "unassigned" : String(t.assigneeId)
      const member = members.find((m) => m.id === t.assigneeId)
      const entry = map.get(key) ?? { name: member?.name ?? "Unassigned", avatar: member?.avatar ?? null, count: 0, points: 0 }
      entry.count += 1
      entry.points += t.storyPoints
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8)
  }, [backlog, members])
  const coverageMax = Math.max(1, ...coverage.map((c) => c.count))

  const recentGrooming = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000
    return backlog
      .filter((t) => t.updatedAt && new Date(t.updatedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime())
      .slice(0, 8)
  }, [backlog])

  const sprintName = useCallback((id: number | null) => sprints.find((s) => s.id === id)?.name ?? `Sprint #${id}`, [sprints])

  const inSprintTasks = useMemo(() => {
    const id = Number(pullSprint)
    if (pullSprint === "none" || Number.isNaN(id)) return []
    return tasks.filter((t) => t.sprintId === id && t.status !== "done")
  }, [tasks, pullSprint])

  const memberName = useCallback(
    (id: number | null) => (id == null ? "Unassigned" : members.find((m) => m.id === id)?.name ?? `User #${id}`),
    [members],
  )
  const memberAvatar = useCallback(
    (id: number | null) => (id == null ? null : members.find((m) => m.id === id)?.avatar ?? null),
    [members],
  )

  /* ---- mutations (all persist through the real task APIs) ---- */

  const raisePriority = async (t: TaskRow) => {
    const idx = PRIORITIES_ASC.indexOf(t.priority)
    if (idx === -1 || idx === PRIORITIES_ASC.length - 1) return
    const next = PRIORITIES_ASC[idx + 1]
    setRaising(t.id)
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: next }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Update failed")
      toast({ title: "Priority raised", description: `${t.title} → ${next}` })
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Backlog", description: (err as Error).message })
    } finally {
      setRaising(null)
    }
  }

  const saveGrooming = async (t: TaskRow) => {
    const g = groomDrafts[t.id] ?? { points: t.storyPoints, description: t.description ?? "" }
    setGroomSaving(t.id)
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyPoints: Math.max(0, Math.round(g.points)), description: g.description }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Save failed")
      toast({ title: "Groomed", description: `${t.title} · ${Math.round(g.points)} pts` })
      setGroomDrafts((d) => ({ ...d, [t.id]: { ...g } }))
      setExpandedGroom((e) => ({ ...e, [t.id]: false }))
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Grooming", description: (err as Error).message })
    } finally {
      setGroomSaving(null)
    }
  }

  const deleteTask = async (t: TaskRow) => {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Delete failed")
      toast({ title: "Item deleted", description: t.title })
      setConfirmDeleteId(null)
      setSelectedIds((s) => {
        const n = new Set(s)
        n.delete(t.id)
        return n
      })
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Backlog", description: (err as Error).message })
    }
  }

  // Bulk sprint assignment: /api/tasks/bulk updateData is spread straight into
  // drizzle .set(), so both sprintId: <number> and sprintId: null persist.
  const bulkSetSprint = async (taskIds: number[], sprintId: number | null) => {
    if (taskIds.length === 0) return
    setBulkBusy(true)
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", taskIds, updateData: { sprintId } }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Bulk update failed")
      toast({
        title: sprintId == null ? "Moved to backlog" : "Sprint assigned",
        description: `${json.affectedCount} item${json.affectedCount === 1 ? "" : "s"} ${
          sprintId == null ? "returned to the backlog" : `queued into ${sprintName(sprintId)}`
        }`,
      })
      setSelectedIds(new Set())
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Sprint assign", description: (err as Error).message })
    } finally {
      setBulkBusy(false)
    }
  }

  const moveOneToBacklog = async (t: TaskRow) => {
    setPulling(t.id)
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: null }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Update failed")
      toast({ title: "Back in backlog", description: t.title })
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Backlog", description: (err as Error).message })
    } finally {
      setPulling(null)
    }
  }

  const openCreate = () => {
    setDraft({ ...nullDraft(), assigneeId: me?.id ?? "" })
    setFormOpen(true)
  }

  const createItem = async () => {
    if (!draft.title.trim()) {
      toast({ variant: "destructive", title: "Backlog", description: "A title is required." })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description,
        status: "todo",
        priority: draft.priority,
        storyPoints: draft.storyPoints,
        assigneeId: draft.assigneeId === "" ? undefined : Number(draft.assigneeId),
        sprintId: null, // explicitly unassigned → lands in the backlog
      }
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Create failed")
      toast({ title: "Added to backlog", description: payload.title })
      setFormOpen(false)
      setDraft(nullDraft())
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Backlog", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  /* ---- render ---- */

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (failed && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">We couldn’t reach the task API. Your session may have expired.</p>
        <Link href="/login">
          <Button>Sign in again</Button>
        </Link>
        <Button variant="outline" onClick={() => load()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ClipboardList className="h-5 w-5 text-[hsl(var(--chart-pine))]" /> Product backlog
          </h1>
          <p className="text-sm text-muted-foreground">
            {kpis.count} un-sprinted item{kpis.count === 1 ? "" : "s"} · {kpis.totalPoints} points waiting ·{" "}
            {kpis.ready} ready to pull
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openCreate}>
            <Flag className="mr-1 h-4 w-4" /> New item
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Backlog items", value: kpis.count, hint: "no sprint assigned" },
          { label: "Unestimated", value: kpis.unestimated, hint: "0 story points", tone: kpis.unestimated > 0 },
          { label: "Poorly described", value: kpis.poorlyDescribed, hint: "under 30 chars", tone: kpis.poorlyDescribed > 0 },
          { label: "Ready to sprint", value: kpis.ready, hint: "described + estimated" },
          { label: "Avg points", value: kpis.avgPoints, hint: "per backlog item" },
          { label: "Oldest item", value: `${kpis.oldest}d`, hint: "days since created", tone: kpis.oldest > 90 },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("mt-1 text-2xl font-semibold tabular-nums", k.tone && "text-red-500")}>{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3 — Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="relative min-w-40 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search backlog"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search backlog…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-32 text-sm" aria-label="Filter by priority">
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
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 w-40 text-sm" aria-label="Filter by assignee">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="h-9 w-36 text-sm" aria-label="Filter by age">
              <SelectValue placeholder="Age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any age</SelectItem>
              <SelectItem value="fresh">Fresh (&lt;1w)</SelectItem>
              <SelectItem value="month">1–4 weeks</SelectItem>
              <SelectItem value="stale">1–3 months</SelectItem>
              <SelectItem value="ancient">3 months +</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="ml-auto shrink-0 text-[11px] tabular-nums">
            {filteredBacklog.length} / {backlog.length} shown
          </Badge>
        </CardContent>
      </Card>

      {/* 4 — Ranking board */}
      <SectionCard
        title="Prioritized backlog ranking"
        icon={<Award className="h-4 w-4" />}
        action={
          <span className="text-[10px] text-muted-foreground">
            score = description 45 · estimate 35 · priority 20 — re-ranking recomputes live; “raise priority” persists via PUT
          </span>
        }
      >
        {ranked.length === 0 ? (
          <EmptyNote>Nothing in the backlog matches these filters. Clear a filter or add an item.</EmptyNote>
        ) : (
          <ul className="divide-y">
            {ranked.map(({ t, score }, idx) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-muted-foreground">{idx + 1}</span>
                <div className="min-w-48 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium leading-snug">{t.title}</span>
                    <StatusPill status={t.status} />
                    {isReady(t) && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600">
                        ready
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <PriorityPill priority={t.priority} />
                    <span>{t.storyPoints} pts</span>
                    <span>· {daysOld(t)}d old</span>
                    <span className="inline-flex items-center gap-1">
                      <AvatarCircle name={memberName(t.assigneeId)} avatar={memberAvatar(t.assigneeId)} size={16} />
                      {memberName(t.assigneeId)}
                    </span>
                  </div>
                </div>
                <div className="w-36 shrink-0">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>score</span>
                    <span className="tabular-nums">{score}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[hsl(var(--chart-pine))]" style={{ width: `${score}%` }} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => raisePriority(t)}
                    disabled={t.priority === "urgent" || raising === t.id}
                    aria-label={`Raise priority of ${t.title}`}
                    title={t.priority === "urgent" ? "Already urgent" : "Raise priority one level"}
                  >
                    <ArrowUp className="mr-1 h-3.5 w-3.5" />
                    {raising === t.id ? "…" : "Raise"}
                  </Button>
                  {confirmDeleteId === t.id ? (
                    <span className="flex items-center gap-1">
                      <span className="text-[11px] text-red-500">Delete?</span>
                      <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => deleteTask(t)}>
                        Yes
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>
                        Keep
                      </Button>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500"
                      onClick={() => setConfirmDeleteId(t.id)}
                      aria-label={`Delete ${t.title}`}
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

      {/* 5 — Grooming queue */}
      <SectionCard
        title={`Grooming queue · ${groomingQueue.length} item${groomingQueue.length === 1 ? "" : "s"}`}
        icon={<ListChecks className="h-4 w-4" />}
        action={<span className="text-[10px] text-muted-foreground">un-groomed = short description or no estimate · Save persists via PUT</span>}
      >
        {groomingQueue.length === 0 ? (
          <EmptyNote>The backlog is fully groomed under these filters. Nice work.</EmptyNote>
        ) : (
          <ul className="divide-y">
            {groomingQueue.slice(0, 12).map((t) => {
              const g = groomDrafts[t.id] ?? { points: t.storyPoints, description: t.description ?? "" }
              const open = expandedGroom[t.id] ?? false
              const missing = [
                t.storyPoints <= 0 ? "estimate" : null,
                (t.description ?? "").trim().length < 30 ? "description" : null,
              ].filter(Boolean)
              return (
                <li key={t.id} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
                      onClick={() => setExpandedGroom((e) => ({ ...e, [t.id]: !open }))}
                      aria-expanded={open}
                    >
                      {t.title}
                    </button>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      needs {missing.join(" + ")}
                    </Badge>
                    <PriorityPill priority={t.priority} />
                    <Button
                      size="sm"
                      variant={open ? "secondary" : "outline"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setExpandedGroom((e) => ({ ...e, [t.id]: !open }))}
                    >
                      {open ? "Close" : "Groom"}
                    </Button>
                  </div>
                  {open && (
                    <div className="mt-3 grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[auto_1fr]">
                      <div className="space-y-1">
                        <Label className="text-xs">Story points</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            aria-label="Decrease points"
                            onClick={() => setGroomDrafts((d) => ({ ...d, [t.id]: { ...g, points: Math.max(0, g.points - 1) } }))}
                          >
                            −
                          </Button>
                          <span className="w-10 text-center text-lg font-semibold tabular-nums">{g.points}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            aria-label="Increase points"
                            onClick={() => setGroomDrafts((d) => ({ ...d, [t.id]: { ...g, points: Math.min(99, g.points + 1) } }))}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`groom-desc-${t.id}`} className="text-xs">
                          Description ({g.description.trim().length}/30 chars needed)
                        </Label>
                        <Textarea
                          id={`groom-desc-${t.id}`}
                          rows={open ? 4 : 2}
                          value={g.description}
                          placeholder="As a … I want … so that …"
                          onChange={(e) => setGroomDrafts((d) => ({ ...d, [t.id]: { ...g, description: e.target.value } }))}
                        />
                      </div>
                      <div className="flex items-end gap-2 sm:col-span-2">
                        <Button size="sm" onClick={() => saveGrooming(t)} disabled={groomSaving === t.id}>
                          {groomSaving === t.id ? "Saving…" : "Save grooming"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setGroomDrafts((d) => ({ ...d, [t.id]: { points: t.storyPoints, description: t.description ?? "" } }))
                            setExpandedGroom((e) => ({ ...e, [t.id]: false }))
                          }}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
            {groomingQueue.length > 12 && (
              <li className="pt-2 text-center text-[11px] text-muted-foreground">
                {groomingQueue.length - 12} more waiting — tighten the filters to see them.
              </li>
            )}
          </ul>
        )}
      </SectionCard>

      {/* 6 + 7 — Sprint assignment / pull-back */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Assign to sprint"
          icon={<Rocket className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/sprints">Sprint board</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-44 flex-1 space-y-1">
                <Label className="text-xs">Target sprint</Label>
                <Select value={targetSprint} onValueChange={setTargetSprint}>
                  <SelectTrigger className="h-9 text-sm" aria-label="Target sprint">
                    <SelectValue placeholder="Pick a sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.status})
                      </SelectItem>
                    ))}
                    {sprints.length === 0 && <SelectItem value="none">No sprints yet</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={() => bulkSetSprint([...selectedIds], Number(targetSprint))}
                disabled={
                  bulkBusy ||
                  selectedIds.size === 0 ||
                  targetSprint === "none" ||
                  sprints.length === 0
                }
              >
                {bulkBusy ? "Working…" : `Move ${selectedIds.size || ""} item${selectedIds.size === 1 ? "" : "s"}`}
              </Button>
            </div>
            {backlog.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <button
                    className="underline-offset-2 hover:underline"
                    onClick={() =>
                      setSelectedIds((filteredBacklog.length === selectedIds.size && filteredBacklog.length > 0
                        ? new Set<number>()
                        : new Set(filteredBacklog.map((t) => t.id))))
                    }
                  >
                    {filteredBacklog.length === selectedIds.size && filteredBacklog.length > 0 ? "Clear selection" : "Select all shown"}
                  </button>
                  <span>filters above apply to this list</span>
                </div>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                  {filteredBacklog.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`pick-${t.id}`}
                        checked={selectedIds.has(t.id)}
                        onCheckedChange={() => toggleSelect(t.id)}
                      />
                      <label htmlFor={`pick-${t.id}`} className="min-w-0 flex-1 cursor-pointer truncate text-sm">
                        {t.title}
                      </label>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{t.storyPoints} pts</span>
                      <PriorityPill priority={t.priority} />
                    </li>
                  ))}
                  {filteredBacklog.length === 0 && <EmptyNote>No backlog items match the filters.</EmptyNote>}
                </ul>
              </>
            ) : (
              <EmptyNote>The backlog is empty — everything is sprinted or not created yet.</EmptyNote>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Pull work back to backlog"
          icon={<ArrowDownToLine className="h-4 w-4" />}
          action={<span className="text-[10px] text-muted-foreground">sets sprintId to null via bulk/PUT</span>}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-44 flex-1 space-y-1">
                <Label className="text-xs">Sprint to drain</Label>
                <Select
                  value={pullSprint}
                  onValueChange={(v) => {
                    setPullSprint(v)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm" aria-label="Sprint to drain">
                    <SelectValue placeholder="Pick a sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose a sprint…</SelectItem>
                    {sprints
                      .filter((s) => s.status !== "completed")
                      .map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} ({s.status})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy || inSprintTasks.length === 0}
                onClick={() => bulkSetSprint(inSprintTasks.map((t) => t.id), null)}
              >
                {bulkBusy ? "Working…" : `Return all ${inSprintTasks.length || ""}`}
              </Button>
            </div>
            {pullSprint === "none" ? (
              <EmptyNote>Pick a sprint to see the items you could un-schedule.</EmptyNote>
            ) : inSprintTasks.length === 0 ? (
              <EmptyNote>Nothing open in this sprint.</EmptyNote>
            ) : (
              <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
                {inSprintTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-2 py-1.5">
                    <StatusPill status={t.status} />
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{t.storyPoints} pts</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={pulling === t.id}
                      onClick={() => moveOneToBacklog(t)}
                      aria-label={`Move ${t.title} back to backlog`}
                    >
                      {pulling === t.id ? "…" : "Back"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 8 + 9 — Age analysis + priority mix */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Backlog age" icon={<Timer className="h-4 w-4" />}>
          {backlog.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageBuckets}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} />
                <YAxis allowDecimals={false} tick={AXIS} width={26} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" name="Items" fill="hsl(var(--chart-clay))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNoBacklog />
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Items older than 3 months are candidates for a ruthless cut or a grooming pass.
          </p>
        </SectionCard>

        <SectionCard title="Priority mix" icon={<PieChartIcon className="h-4 w-4" />}>
          {priorityMix.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={priorityMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {priorityMix.map((p) => (
                    <Cell key={p.name} fill={PRIORITY_COLOR[p.name] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => String(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNoBacklog />
          )}
        </SectionCard>
      </div>

      {/* 10 — Assignee coverage */}
      <SectionCard
        title="Owner coverage"
        icon={<UserCheck className="h-4 w-4" />}
        action={
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link href="/dashboard/team">
              Team <Users className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      >
        {coverage.length > 0 ? (
          <div className="space-y-2.5">
            {coverage.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <AvatarCircle name={c.name} avatar={c.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {c.count} item{c.count === 1 ? "" : "s"} · {c.points} pts
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--chart-moss))]"
                      style={{ width: `${Math.round((c.count / coverageMax) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyNote>No backlog items to attribute yet.</EmptyNote>
        )}
      </SectionCard>

      {/* 11 — Recent grooming activity */}
      <SectionCard
        title="Groomed in the last 7 days"
        icon={<Sparkles className="h-4 w-4" />}
        action={
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link href="/dashboard/tasks">
              All tasks <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      >
        {recentGrooming.length > 0 ? (
          <ul className="divide-y">
            {recentGrooming.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <CheckCheck className="h-4 w-4 shrink-0 text-[hsl(var(--chart-pine))]" />
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                {isReady(t) ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] text-emerald-600">
                    ready
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    in progress
                  </Badge>
                )}
                <StatusPill status={t.status} />
                <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                  {t.updatedAt ? relativeTime(t.updatedAt) : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>No backlog items touched in the last week. Grooming updates land here.</EmptyNote>
        )}
      </SectionCard>

      {/* 12 — Cross links */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <GitBranch className="h-4 w-4" /> Keep the flywheel turning:
          </span>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/tasks">Task workspace</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/sprints">Sprint planning</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/kanban">Kanban board</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- new item dialog ---- */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New backlog item</DialogTitle>
            <DialogDescription>Created without a sprint so it lands straight in this backlog.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="bl-title">Title</Label>
              <Input id="bl-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What needs doing?" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="bl-desc">Description (30+ chars makes it groomed)</Label>
              <Textarea id="bl-desc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bl-points">Story points</Label>
              <Input
                id="bl-points"
                type="number"
                min={0}
                value={draft.storyPoints}
                onChange={(e) => setDraft({ ...draft, storyPoints: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Assignee</Label>
              <Select
                value={draft.assigneeId === "" ? "unassigned" : String(draft.assigneeId)}
                onValueChange={(v) => setDraft({ ...draft, assigneeId: v === "unassigned" ? "" : Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign to…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={createItem} disabled={saving}>
              {saving ? "Creating…" : "Add to backlog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyNoBacklog() {
  return <EmptyNote>Nothing in the backlog yet — add an item to light up this chart.</EmptyNote>
}
