"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckSquare,
  CircleDot,
  Filter,
  History,
  LayoutGrid,
  Layers,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Scale,
  Search,
  Timer,
  Trash2,
  Users,
  X,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { DashboardOverview } from "@/lib/dashboard-data"
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  PRIORITIES,
  PriorityPill,
  SectionCard,
  STATUSES,
  STATUS_COLOR,
  STATUS_LABEL,
  StatusPill,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type ApiTask = {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  storyPoints: number
  assigneeId: number | null
  sprintId: number | null
  dueDate: string | null
  tags: unknown
  createdAt: string | null
  updatedAt: string | null
}

type SprintOption = { id: number; name: string; status: string }

type TaskDraft = {
  id?: number
  title: string
  description: string
  status: string
  priority: string
  storyPoints: number
  assigneeId: number | ""
  sprintId: number | ""
  dueDate: string
  tags: string
}

type SortKey = "updated" | "created" | "due" | "priority" | "title"

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const BACKLOG = "backlog"
const PAGE_SIZES = [10, 25, 50]

/* ---------------------------------------------------------------- helpers */

function isoDay(d: Date) {
  const copy = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return copy.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoDay(d)
}

function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function taskTags(tags: unknown): string[] {
  return Array.isArray(tags) ? tags.map((t) => String(t)) : []
}

function isOverdue(t: ApiTask, todayIso: string) {
  return Boolean(t.dueDate && t.dueDate < todayIso && t.status !== "done")
}

function isOpen(t: ApiTask) {
  return t.status !== "done"
}

function nextStatus(status: string) {
  const idx = STATUSES.indexOf(status)
  return STATUSES[(idx + 1) % STATUSES.length]
}

/* --------------------------------------------------------------- the page */

export default function TasksWorkspacePage() {
  const { toast } = useToast()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [sprints, setSprints] = useState<SprintOption[]>([])

  // raw list (no API filters) — source for KPI strip and every derived section
  const [allTasks, setAllTasks] = useState<ApiTask[]>([])
  // visible list — fetched with API-side filters (status/priority/assignee/sprint/search)
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, pageCount: 1 })

  const [pageLoading, setPageLoading] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [sprintFilter, setSprintFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("updated")
  const [view, setView] = useState<"grid" | "table" | "compact">("table")

  const [selected, setSelected] = useState<number[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailTask, setDetailTask] = useState<ApiTask | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const todayIso = useMemo(() => isoDay(new Date()), [])
  const weekEndIso = useMemo(() => addDays(todayIso, 7), [todayIso])

  const userById = useMemo(() => {
    const map = new Map<number, { name: string; avatar: string | null }>()
    overview?.workload.forEach((w) => map.set(w.id, { name: w.name, avatar: w.avatar }))
    if (overview) map.set(overview.user.id, { name: overview.user.name, avatar: overview.user.avatar })
    return map
  }, [overview])

  const sprintName = useCallback(
    (id: number | null) => (id === null ? "Backlog" : sprints.find((s) => s.id === id)?.name ?? `Sprint #${id}`),
    [sprints],
  )

  /* ---- data loading ---- */

  const loadRawTasks = useCallback(async () => {
    const collected: ApiTask[] = []
    let page = 1
    let pageCount = 1
    while (page <= pageCount && page <= 10) {
      const res = await fetch(`/api/tasks?page=${page}&pageSize=100`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Failed to load tasks")
      collected.push(...(json.data as ApiTask[]))
      pageCount = json.pagination.pageCount || 1
      page += 1
    }
    setAllTasks(collected)
  }, [])

  const loadBase = useCallback(async () => {
    setPageLoading(true)
    try {
      const [ovRes, spRes] = await Promise.all([fetch("/api/dashboard/overview"), fetch("/api/sprints")])
      const ovJson = await ovRes.json()
      if (!ovJson.success) throw new Error(ovJson.message ?? "Failed to load dashboard")
      setOverview(ovJson.data)
      const spJson = await spRes.json()
      if (spJson.success)
        setSprints(
          spJson.data.map((s: { id: number; name: string; status: string }) => ({
            id: s.id,
            name: s.name,
            status: s.status,
          })),
        )
      await loadRawTasks()
    } catch (err) {
      toast({ variant: "destructive", title: "Tasks", description: (err as Error).message })
    } finally {
      setPageLoading(false)
    }
  }, [loadRawTasks, toast])

  const loadVisible = useCallback(async () => {
    setListLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(pagination.page))
      params.set("pageSize", String(pagination.pageSize))
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (priorityFilter !== "all") params.set("priority", priorityFilter)
      if (assigneeFilter !== "all" && assigneeFilter !== "none") params.set("assigneeId", assigneeFilter)
      if (sprintFilter !== "all" && sprintFilter !== BACKLOG) params.set("sprintId", sprintFilter)
      if (search.trim()) params.set("search", search.trim())

      // Backlog (sprintId IS NULL) and Unassigned (assigneeId IS NULL) cannot be
      // expressed as API filters, so widen the query and drop rows client-side.
      if (sprintFilter === BACKLOG || assigneeFilter === "none") params.set("pageSize", "500")

      const res = await fetch(`/api/tasks?${params.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Failed to load tasks")
      let rows = json.data as ApiTask[]
      let total = json.pagination.total as number
      if (sprintFilter === BACKLOG) rows = rows.filter((t) => t.sprintId === null)
      if (assigneeFilter === "none") rows = rows.filter((t) => t.assigneeId === null)
      if (sprintFilter === BACKLOG || assigneeFilter === "none") total = rows.length
      setTasks(rows)
      setPagination((p) => ({ ...p, total, pageCount: Math.max(1, Math.ceil(total / p.pageSize)) }))
    } catch (err) {
      toast({ variant: "destructive", title: "Tasks", description: (err as Error).message })
    } finally {
      setListLoading(false)
    }
  }, [pagination.page, pagination.pageSize, statusFilter, priorityFilter, assigneeFilter, sprintFilter, search, toast])

  useEffect(() => {
    loadBase()
  }, [loadBase])

  useEffect(() => {
    if (!pageLoading) loadVisible()
  }, [pageLoading, loadVisible])

  const reloadAll = useCallback(async () => {
    await Promise.all([loadRawTasks(), loadVisible()])
  }, [loadRawTasks, loadVisible])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadBase(), loadVisible()])
      toast({ title: "Tasks refreshed" })
    } finally {
      setRefreshing(false)
    }
  }, [loadBase, loadVisible, toast])

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    setSelected([])
    setConfirmBulkDelete(false)
  }, [statusFilter, priorityFilter, assigneeFilter, sprintFilter, search, sortKey, view, pagination.page])

  /* ---- mutations ---- */

  const openCreate = () => {
    setDraft({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      storyPoints: 1,
      assigneeId: overview?.user.id ?? "",
      sprintId: overview?.activeSprint?.id ?? "",
      dueDate: "",
      tags: "",
    })
    setConfirmDelete(false)
    setFormOpen(true)
  }

  const openEdit = (t: ApiTask) => {
    setDraft({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      storyPoints: t.storyPoints,
      assigneeId: t.assigneeId ?? "",
      sprintId: t.sprintId ?? "",
      dueDate: t.dueDate ?? "",
      tags: taskTags(t.tags).join(", "),
    })
    setConfirmDelete(false)
    setDetailTask(null)
    setFormOpen(true)
  }

  const saveTask = async () => {
    if (!draft || !draft.title.trim()) {
      toast({ variant: "destructive", title: "Task", description: "A title is required." })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        storyPoints: draft.storyPoints,
        assigneeId: draft.assigneeId === "" ? undefined : Number(draft.assigneeId),
        sprintId: draft.sprintId === "" ? null : Number(draft.sprintId),
        dueDate: draft.dueDate || null,
        tags: draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }
      const res = draft.id
        ? await fetch(`/api/tasks/${draft.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Save failed")
      toast({ title: draft.id ? "Task updated" : "Task created", description: payload.title })
      setFormOpen(false)
      setDraft(null)
      await reloadAll()
    } catch (err) {
      toast({ variant: "destructive", title: "Task", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const patchTask = async (t: ApiTask, patch: Record<string, unknown>, successTitle: string, successBody?: string) => {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Update failed")
      toast({ title: successTitle, description: successBody ?? t.title })
      await reloadAll()
      return true
    } catch (err) {
      toast({ variant: "destructive", title: "Task", description: (err as Error).message })
      return false
    }
  }

  const setTaskStatus = (t: ApiTask, status: string) =>
    patchTask(t, { status }, "Status updated", `${t.title} → ${STATUS_LABEL[status] ?? status}`)

  const cycleTaskStatus = (t: ApiTask) => {
    const to = nextStatus(t.status)
    return setTaskStatus(t, to)
  }

  const deleteTask = async (t: ApiTask) => {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Delete failed")
      toast({ title: "Task deleted", description: t.title })
      setDetailTask(null)
      setConfirmDelete(false)
      setSelected((ids) => ids.filter((id) => id !== t.id))
      await reloadAll()
    } catch (err) {
      toast({ variant: "destructive", title: "Task", description: (err as Error).message })
    }
  }

  const runBulk = async (action: "update" | "delete", updateData?: Record<string, unknown>) => {
    if (selected.length === 0) return
    setBulkBusy(true)
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, taskIds: selected, updateData }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Bulk action failed")
      toast({
        title: action === "delete" ? "Tasks deleted" : "Tasks updated",
        description: `${json.affectedCount} task${json.affectedCount === 1 ? "" : "s"} affected`,
      })
      setSelected([])
      setConfirmBulkDelete(false)
      await reloadAll()
    } catch (err) {
      toast({ variant: "destructive", title: "Bulk action", description: (err as Error).message })
    } finally {
      setBulkBusy(false)
    }
  }

  /* ---- derived selections / sections ---- */

  const filteredByAssignee = useMemo(() => {
    if (assigneeFilter === "none") return tasks.filter((t) => t.assigneeId === null)
    return tasks
  }, [tasks, assigneeFilter])

  const sortedTasks = useMemo(() => {
    const rows = [...filteredByAssignee]
    rows.sort((a, b) => {
      switch (sortKey) {
        case "created":
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
        case "due":
          return (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99")
        case "priority":
          return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
        case "title":
          return a.title.localeCompare(b.title)
        case "updated":
        default:
          return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      }
    })
    return rows
  }, [filteredByAssignee, sortKey])

  const pageIds = useMemo(() => sortedTasks.map((t) => t.id), [sortedTasks])
  const visibleSelected = useMemo(() => selected.filter((id) => pageIds.includes(id)), [selected, pageIds])
  const allSelected = visibleSelected.length > 0 && visibleSelected.length === sortedTasks.length

  const toggleTaskSelected = (id: number) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const toggleAll = () =>
    setSelected((ids) => {
      const others = ids.filter((id) => !pageIds.includes(id))
      return allSelected ? others : [...others, ...pageIds]
    })

  const kpis = useMemo(() => {
    const total = allTasks.length
    const myId = overview?.user.id
    return {
      total,
      myOpen: allTasks.filter((t) => t.assigneeId === myId && isOpen(t)).length,
      inProgress: allTasks.filter((t) => t.status === "in_progress").length,
      blocked: allTasks.filter((t) => t.status === "blocked").length,
      doneThisSprint: overview?.activeSprint
        ? allTasks.filter((t) => t.sprintId === overview.activeSprint?.id && t.status === "done").length
        : allTasks.filter((t) => t.status === "done" && t.sprintId !== null).length,
      overdue: allTasks.filter((t) => isOverdue(t, todayIso)).length,
    }
  }, [allTasks, overview, todayIso])

  const needsAttention = useMemo(
    () =>
      allTasks
        .filter((t) => isOpen(t) && (t.status === "blocked" || isOverdue(t, todayIso)))
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
        .slice(0, 8),
    [allTasks, todayIso],
  )

  const dueThisWeek = useMemo(() => {
    const buckets = new Map<string, ApiTask[]>()
    allTasks
      .filter((t) => isOpen(t) && t.dueDate && t.dueDate >= todayIso && t.dueDate <= weekEndIso)
      .forEach((t) => {
        const key = t.dueDate as string
        buckets.set(key, [...(buckets.get(key) ?? []), t])
      })
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [allTasks, todayIso, weekEndIso])

  const assigneeChart = useMemo(() => {
    const map = new Map<number | null, { open: number; done: number; points: number }>()
    allTasks.forEach((t) => {
      const cur = map.get(t.assigneeId) ?? { open: 0, done: 0, points: 0 }
      if (t.status === "done") cur.done += 1
      else cur.open += 1
      cur.points += t.storyPoints
      map.set(t.assigneeId, cur)
    })
    return [...map.entries()]
      .map(([id, v]) => ({
        name: id === null ? "Unassigned" : (userById.get(id)?.name.split(" ")[0] ?? `User ${id}`),
        open: v.open,
        done: v.done,
      }))
      .sort((a, b) => b.open + b.done - (a.open + a.done))
      .slice(0, 8)
  }, [allTasks, userById])

  const sprintChart = useMemo(() => {
    const keys = [...sprints.map((s) => String(s.id)), BACKLOG]
    return keys
      .map((key) => {
        const rows = allTasks.filter((t) => (key === BACKLOG ? t.sprintId === null : String(t.sprintId) === key))
        const name = key === BACKLOG ? "Backlog" : sprintName(Number(key))
        const short = name.replace(/^Sprint\s+\d+/, (m) => m.replace("Sprint ", "S"))
        return {
          key,
          name: short.length > 14 ? `${short.slice(0, 13)}…` : short,
          open: rows.filter(isOpen).length,
          done: rows.filter((t) => t.status === "done").length,
          blocked: rows.filter((t) => t.status === "blocked").length,
        }
      })
      .filter((s) => s.open + s.done + s.blocked > 0)
  }, [allTasks, sprints, sprintName])

  const statusDonut = useMemo(() => {
    const counts = new Map<string, number>()
    allTasks.forEach((t) => counts.set(t.status, (counts.get(t.status) ?? 0) + 1))
    return [...counts.entries()].map(([name, value]) => ({ name, value }))
  }, [allTasks])

  const recentlyUpdated = useMemo(
    () =>
      [...allTasks]
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
        .slice(0, 8),
    [allTasks],
  )

  const myWorkload = useMemo(() => {
    const me = overview?.workload.find((w) => w.id === overview.user.id) ?? null
    const teamMax = overview && overview.workload.length > 0
      ? Math.max(...overview.workload.map((w) => w.openPoints), 1)
      : 1
    const teamAvg =
      overview && overview.workload.length > 0
        ? Math.round(overview.workload.reduce((sum, w) => sum + w.openPoints, 0) / overview.workload.length)
        : 0
    const myOpen = kpis.myOpen
    const myPoints = allTasks
      .filter((t) => t.assigneeId === overview?.user.id && isOpen(t))
      .reduce((sum, t) => sum + t.storyPoints, 0)
    return {
      me,
      teamMax,
      teamAvg,
      myOpen,
      myPoints: myPoints || (me?.openPoints ?? 0),
      myTasks: myOpen || (me?.openTasks ?? 0),
    }
  }, [overview, allTasks, kpis.myOpen])

  const activeFilters = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = []
    if (search) chips.push({ label: `Search “${search}”`, clear: () => { setSearchInput(""); setSearch("") } })
    if (statusFilter !== "all") chips.push({ label: STATUS_LABEL[statusFilter], clear: () => setStatusFilter("all") })
    if (priorityFilter !== "all")
      chips.push({ label: `Priority: ${priorityFilter}`, clear: () => setPriorityFilter("all") })
    if (assigneeFilter !== "all") {
      const name =
        assigneeFilter === "none" ? "Unassigned" : (userById.get(Number(assigneeFilter))?.name ?? `User ${assigneeFilter}`)
      chips.push({ label: `Assignee: ${name}`, clear: () => setAssigneeFilter("all") })
    }
    if (sprintFilter !== "all") {
      const name = sprintFilter === BACKLOG ? "Backlog" : sprintName(Number(sprintFilter))
      chips.push({ label: `Sprint: ${name}`, clear: () => setSprintFilter("all") })
    }
    return chips
  }, [search, statusFilter, priorityFilter, assigneeFilter, sprintFilter, userById, sprintName])

  const clearFilters = () => {
    setSearchInput("")
    setSearch("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setAssigneeFilter("all")
    setSprintFilter("all")
  }

  /* ---- render ---- */

  if (pageLoading && !overview) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-14" />
        <Skeleton className="h-96" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">We couldn’t reach the tasks API. Your session may have expired.</p>
        <Link href="/login">
          <Button>Sign in again</Button>
        </Link>
        <Button variant="outline" onClick={() => loadBase()}>
          Retry
        </Button>
      </div>
    )
  }

  const myId = overview.user.id

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks workspace</h1>
          <p className="text-sm text-muted-foreground">
            {pagination.total} matching · {allTasks.length} total · {kpis.myOpen} assigned to you
            {overview.activeSprint ? ` · ${overview.activeSprint.name}` : " · no active sprint"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New task
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/kanban">
              <LayoutGrid className="mr-1 h-4 w-4" /> Kanban
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total tasks", value: kpis.total, hint: "across all sprints", tone: undefined },
          { label: "My open", value: kpis.myOpen, hint: `of ${allTasks.filter((t) => t.assigneeId === myId).length} assigned to you`, tone: undefined },
          { label: "In progress", value: kpis.inProgress, hint: "team-wide", tone: undefined },
          { label: "Blocked", value: kpis.blocked, hint: "need unblocking", tone: kpis.blocked > 0 ? "text-red-500" : undefined },
          { label: "Done this sprint", value: kpis.doneThisSprint, hint: overview.activeSprint ? overview.activeSprint.name : "current sprint", tone: undefined },
          { label: "Overdue", value: kpis.overdue, hint: "past due date", tone: kpis.overdue > 0 ? "text-red-500" : undefined },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("mt-1 text-2xl font-semibold tabular-nums", k.tone)}>{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3 — search + multi-filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search tasks"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or description…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 text-sm" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {overview.workload.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sprintFilter} onValueChange={setSprintFilter}>
            <SelectTrigger className="h-9 w-40 text-sm" aria-label="Filter by sprint">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sprints</SelectItem>
              <SelectItem value={BACKLOG}>Backlog</SelectItem>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 w-36 text-sm" aria-label="Sort tasks">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="created">Recently created</SelectItem>
              <SelectItem value="due">Due date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
            </SelectContent>
          </Select>
          {activeFilters.length > 0 && (
            <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={clearFilters}>
              <Filter className="mr-1 h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((chip) => (
            <Badge key={chip.label} variant="secondary" className="gap-1 pr-1 text-xs">
              {chip.label}
              <button
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={chip.clear}
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 4 — view toggle + bulk bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Showing {sortedTasks.length} of {pagination.total} · page {pagination.page} of {pagination.pageCount}
        </p>
        <div className="flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="View mode">
          {(
            [
              { key: "grid", icon: <LayoutGrid className="h-4 w-4" />, label: "Card grid" },
              { key: "table", icon: <Rows3 className="h-4 w-4" />, label: "Table" },
              { key: "compact", icon: <List className="h-4 w-4" />, label: "Compact list" },
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
      </div>

      {visibleSelected.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-2 py-2.5">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{visibleSelected.length} selected</span>
            <Separator orientation="vertical" className="h-5" />
            <Select onValueChange={(v) => runBulk("update", { status: v })}>
              <SelectTrigger className="h-8 w-36 text-xs" aria-label="Bulk set status">
                <SelectValue placeholder="Set status…" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => runBulk("update", { priority: v })}>
              <SelectTrigger className="h-8 w-36 text-xs" aria-label="Bulk set priority">
                <SelectValue placeholder="Set priority…" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {confirmBulkDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">Delete {visibleSelected.length} tasks?</span>
                <Button size="sm" variant="destructive" onClick={() => runBulk("delete")} disabled={bulkBusy}>
                  {bulkBusy ? "Deleting…" : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmBulkDelete(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="h-8 text-red-500" onClick={() => setConfirmBulkDelete(true)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <Button size="sm" variant="ghost" className="ml-auto h-8 text-xs" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 5 — main task list (grid / table / compact) */}
      {listLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : sortedTasks.length === 0 ? (
        <Card>
          <EmptyNote>
            No tasks match these filters.{" "}
            {activeFilters.length > 0 ? (
              <button className="underline underline-offset-2" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button className="underline underline-offset-2" onClick={openCreate}>
                Create the first one
              </button>
            )}
          </EmptyNote>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedTasks.map((t) => {
            const assignee = t.assigneeId !== null ? userById.get(t.assigneeId) : undefined
            return (
              <Card key={t.id} className={cn("transition-colors hover:border-primary/40", selected.includes(t.id) && "border-primary")}>
                <CardContent className="flex flex-col gap-2 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <Checkbox
                        checked={selected.includes(t.id)}
                        onCheckedChange={() => toggleTaskSelected(t.id)}
                        aria-label={`Select ${t.title}`}
                        className="mt-0.5"
                      />
                      <button className="text-left text-sm font-medium leading-snug hover:underline" onClick={() => setDetailTask(t)}>
                        {t.title}
                      </button>
                    </div>
                    <StatusPill status={t.status} />
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{t.description || "No description"}</p>
                  <div className="flex flex-wrap gap-1">
                    {taskTags(t.tags).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <PriorityPill priority={t.priority} />
                      <span className="tabular-nums">{t.storyPoints} pts</span>
                      {assignee && (
                        <span className="flex items-center gap-1">
                          <AvatarCircle name={assignee.name} avatar={assignee.avatar} size={18} />
                          {assignee.name.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    {t.dueDate && (
                      <span className={cn(isOverdue(t, todayIso) && "font-semibold text-red-500")}>{t.dueDate}</span>
                    )}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetailTask(t)}>
                      Details <ArrowRight className="ml-0.5 h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(t)}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs" onClick={() => cycleTaskStatus(t)}>
                      {STATUS_LABEL[nextStatus(t.status)] ?? "Advance"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : view === "table" ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-4 py-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all tasks on this page"
                    />
                  </th>
                  <th className="px-2 py-2 font-medium">Task</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Priority</th>
                  <th className="px-2 py-2 font-medium">Assignee</th>
                  <th className="px-2 py-2 font-medium">Due</th>
                  <th className="px-2 py-2 font-medium">Pts</th>
                  <th className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((t) => {
                  const assignee = t.assigneeId !== null ? userById.get(t.assigneeId) : undefined
                  return (
                    <tr key={t.id} className={cn("border-b last:border-0 hover:bg-muted/40", selected.includes(t.id) && "bg-primary/5")}>
                      <td className="px-4 py-2">
                        <Checkbox
                          checked={selected.includes(t.id)}
                          onCheckedChange={() => toggleTaskSelected(t.id)}
                          aria-label={`Select ${t.title}`}
                        />
                      </td>
                      <td className="max-w-72 px-2 py-2">
                        <button className="block truncate text-left font-medium hover:underline" onClick={() => setDetailTask(t)}>
                          {t.title}
                        </button>
                        {taskTags(t.tags).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {taskTags(t.tags).slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <StatusPill status={t.status} />
                      </td>
                      <td className="px-2 py-2">
                        <PriorityPill priority={t.priority} />
                      </td>
                      <td className="px-2 py-2">
                        {assignee ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <AvatarCircle name={assignee.name} avatar={assignee.avatar} size={20} />
                            <span className="truncate">{assignee.name}</span>
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEdit(t)}>
                            Assign
                          </Button>
                        )}
                      </td>
                      <td className={cn("px-2 py-2 text-xs tabular-nums", isOverdue(t, todayIso) && "font-semibold text-red-500")}>
                        {t.dueDate ?? "—"}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{t.storyPoints}</td>
                      <td className="px-2 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => cycleTaskStatus(t)}>
                            → {STATUS_LABEL[nextStatus(t.status)]}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={`Actions for ${t.title}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailTask(t)}>View details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(t)}>Edit task</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-500" onClick={() => { setDetailTask(t); setConfirmDelete(true) }}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {sortedTasks.map((t) => {
              const assignee = t.assigneeId !== null ? userById.get(t.assigneeId) : undefined
              return (
                <div key={t.id} className={cn("flex items-center gap-3 px-4 py-2 hover:bg-muted/40", selected.includes(t.id) && "bg-primary/5")}>
                  <Checkbox
                    checked={selected.includes(t.id)}
                    onCheckedChange={() => toggleTaskSelected(t.id)}
                    aria-label={`Select ${t.title}`}
                  />
                  <button className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline" onClick={() => setDetailTask(t)}>
                    {t.title}
                  </button>
                  <span className="hidden w-36 shrink-0 truncate text-xs text-muted-foreground sm:block">{sprintName(t.sprintId)}</span>
                  {assignee ? (
                    <AvatarCircle name={assignee.name} avatar={assignee.avatar} size={20} />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                  <PriorityPill priority={t.priority} />
                  <StatusPill status={t.status} />
                  <span className={cn("w-20 shrink-0 text-right text-xs tabular-nums", isOverdue(t, todayIso) && "font-semibold text-red-500")}>
                    {t.dueDate ?? "—"}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => cycleTaskStatus(t)}>
                    → {STATUS_LABEL[nextStatus(t.status)]}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* pagination controls */}
      {sortedTasks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Label htmlFor="page-size" className="text-xs">
              Per page
            </Label>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => {
                setPagination((p) => ({ ...p, pageSize: Number(v), page: 1 }))
              }}
            >
              <SelectTrigger id="page-size" className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || listLoading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pagination.page} / {pagination.pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.pageCount || listLoading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* 6+7 — needs attention + due this week */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Needs attention"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          action={<Badge variant={needsAttention.length > 0 ? "destructive" : "outline"} className="text-[10px]">{needsAttention.length}</Badge>}
        >
          {needsAttention.length > 0 ? (
            <ul className="divide-y">
              {needsAttention.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <button className="block max-w-full truncate text-left text-sm font-medium hover:underline" onClick={() => setDetailTask(t)}>
                      {t.title}
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      {t.status === "blocked" ? "Blocked" : ""}
                      {t.status === "blocked" && isOverdue(t, todayIso) ? " · " : ""}
                      {isOverdue(t, todayIso) ? `Overdue since ${t.dueDate}` : `Due ${t.dueDate ?? "—"}`}
                    </p>
                  </div>
                  <PriorityPill priority={t.priority} />
                  {t.status === "blocked" ? (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setTaskStatus(t, "todo")}>
                      Unblock
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setTaskStatus(t, "done")}>
                      Complete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>Nothing blocked or overdue. Nice.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Due this week" icon={<CalendarDays className="h-4 w-4" />}>
          {dueThisWeek.length > 0 ? (
            <div className="space-y-3">
              {dueThisWeek.map(([date, rows]) => (
                <div key={date}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {dayLabel(date)} {date === todayIso && "· today"}
                  </p>
                  <ul className="space-y-1">
                    {rows.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                        <button
                          className="min-w-0 flex-1 truncate text-left text-xs font-medium hover:underline"
                          onClick={() => setDetailTask(t)}
                        >
                          {t.title}
                        </button>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{sprintName(t.sprintId)}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[11px] text-emerald-600"
                          onClick={() => setTaskStatus(t, "done")}
                        >
                          Complete
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>Nothing due in the next 7 days.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 8+9+10 — assignee, sprint and status distribution */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Tasks per assignee" icon={<Users className="h-4 w-4" />}>
          {assigneeChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assigneeChart} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={AXIS} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS} width={70} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name="Open" stackId="a" fill="hsl(var(--chart-stone))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="done" name="Done" stackId="a" fill="hsl(var(--chart-pine))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No tasks yet.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Tasks per sprint" icon={<Layers className="h-4 w-4" />}>
          {sprintChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sprintChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={46} />
                <YAxis tick={AXIS} width={26} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name="Open" stackId="s" fill="hsl(var(--chart-stone))" />
                <Bar dataKey="blocked" name="Blocked" stackId="s" fill="hsl(var(--destructive))" />
                <Bar dataKey="done" name="Done" stackId="s" fill="hsl(var(--chart-moss))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Create a sprint to spread tasks across it.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Status mix" icon={<CircleDot className="h-4 w-4" />}>
          {statusDonut.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>
                  {statusDonut.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLOR[s.name] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => STATUS_LABEL[String(v)] ?? String(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No tasks to chart.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 11+12 — recently updated + my workload gauge */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Recently updated" icon={<History className="h-4 w-4" />}>
          {recentlyUpdated.length > 0 ? (
            <ul className="divide-y">
              {recentlyUpdated.map((t) => {
                const assignee = t.assigneeId !== null ? userById.get(t.assigneeId) : undefined
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    {assignee && <AvatarCircle name={assignee.name} avatar={assignee.avatar} size={20} />}
                    <button className="min-w-0 flex-1 truncate text-left text-sm hover:underline" onClick={() => setDetailTask(t)}>
                      {t.title}
                    </button>
                    <StatusPill status={t.status} />
                    <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(t.updatedAt ?? new Date().toISOString())}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyNote>Nothing updated yet.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="My workload vs team" icon={<Scale className="h-4 w-4" />}>
          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs">
                <span className="font-medium">My open story points</span>
                <span className="tabular-nums text-muted-foreground">
                  {myWorkload.myPoints} / team max {myWorkload.teamMax}
                </span>
              </div>
              <Progress value={Math.min(100, Math.round((myWorkload.myPoints / myWorkload.teamMax) * 100))} className="mt-1.5 h-2" />
              <div className="mt-2 flex justify-between text-xs">
                <span className="font-medium">Team average</span>
                <span className="tabular-nums text-muted-foreground">{myWorkload.teamAvg} pts</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[hsl(var(--chart-stone))]"
                  style={{ width: `${Math.min(100, Math.round((myWorkload.teamAvg / myWorkload.teamMax) * 100))}%` }}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {myWorkload.myTasks} open task{myWorkload.myTasks === 1 ? "" : "s"} assigned to you
              </span>
              <span
                className={cn(
                  "font-medium",
                  myWorkload.myPoints > myWorkload.teamAvg ? "text-red-500" : "text-emerald-600",
                )}
              >
                {myWorkload.myPoints > myWorkload.teamAvg
                  ? `${myWorkload.myPoints - myWorkload.teamAvg} pts above team avg`
                  : `${myWorkload.teamAvg - myWorkload.myPoints} pts below team avg`}
              </span>
            </div>
            <div className="space-y-1.5">
              {[...overview.workload]
                .sort((a, b) => b.openPoints - a.openPoints)
                .slice(0, 5)
                .map((w) => (
                  <div key={w.id} className="flex items-center gap-2">
                    <AvatarCircle name={w.name} avatar={w.avatar} size={18} />
                    <span className={cn("min-w-0 flex-1 truncate text-xs", w.id === myId && "font-semibold")}>{w.name}</span>
                    <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{w.openPoints} pts</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", w.openPoints === myWorkload.teamMax ? "bg-[hsl(var(--chart-clay))]" : "bg-[hsl(var(--chart-pine))]")}
                        style={{ width: `${Math.round((w.openPoints / myWorkload.teamMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 13 — footer navigation */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-xs text-muted-foreground">
            {overview.activeSprint
              ? `${overview.activeSprint.name}: ${overview.activeSprint.donePoints}/${overview.activeSprint.totalPoints} points done · ${overview.activeSprint.daysLeft} day${overview.activeSprint.daysLeft === 1 ? "" : "s"} left`
              : "No active sprint — plan one to keep work flowing."}
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/kanban">
                <Timer className="mr-1 h-4 w-4" /> Open Kanban
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/sprints">
                <Layers className="mr-1 h-4 w-4" /> Sprint board
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- task detail modal ---- */}
      <Dialog
        open={detailTask !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailTask(null)
            setConfirmDelete(false)
          }
        }}
      >
        {detailTask && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="pr-8 text-base">{detailTask.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Task #{detailTask.id} · {sprintName(detailTask.sprintId)}
                {detailTask.dueDate ? ` · due ${detailTask.dueDate}` : ""}
                {detailTask.updatedAt ? ` · updated ${relativeTime(detailTask.updatedAt)}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={detailTask.status} />
                <PriorityPill priority={detailTask.priority} />
                <Badge variant="outline">{detailTask.storyPoints} pts</Badge>
                {detailTask.assigneeId !== null && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AvatarCircle
                      name={userById.get(detailTask.assigneeId)?.name ?? `User ${detailTask.assigneeId}`}
                      avatar={userById.get(detailTask.assigneeId)?.avatar}
                      size={18}
                    />
                    {userById.get(detailTask.assigneeId)?.name ?? `User ${detailTask.assigneeId}`}
                  </span>
                )}
                {isOverdue(detailTask, todayIso) && (
                  <Badge variant="destructive" className="text-[10px]">
                    Overdue since {detailTask.dueDate}
                  </Badge>
                )}
              </div>
              {taskTags(detailTask.tags).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {taskTags(detailTask.tags).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {detailTask.description || "No description."}
              </p>
              <div>
                <Label className="text-xs">Status</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={detailTask.status === s ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => {
                        setTaskStatus(detailTask, s)
                        setDetailTask(null)
                      }}
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {PRIORITIES.map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={detailTask.priority === p ? "default" : "outline"}
                      className="h-7 text-xs capitalize"
                      onClick={() => {
                        patchTask(detailTask, { priority: p }, "Priority updated", `${detailTask.title} → ${p}`)
                        setDetailTask(null)
                      }}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Delete permanently?</span>
                  <Button size="sm" variant="destructive" onClick={() => deleteTask(detailTask)}>
                    Confirm delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              )}
              <Button size="sm" onClick={() => openEdit(detailTask)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit task
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ---- create/edit task modal ---- */}
      <Dialog open={formOpen && draft !== null} onOpenChange={(o) => !o && setFormOpen(false)}>
        {draft && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{draft.id ? `Edit task #${draft.id}` : "New task"}</DialogTitle>
              <DialogDescription>Assignees get a live notification in their bell feed.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="tf-title">Title</Label>
                <Input id="tf-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What needs doing?" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="tf-desc">Description</Label>
                <Textarea id="tf-desc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tf-status">Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger id="tf-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tf-priority">Priority</Label>
                <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                  <SelectTrigger id="tf-priority">
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
                <Label htmlFor="tf-assignee">Assignee</Label>
                <Select value={String(draft.assigneeId)} onValueChange={(v) => setDraft({ ...draft, assigneeId: v === "" ? "" : Number(v) })}>
                  <SelectTrigger id="tf-assignee">
                    <SelectValue placeholder="Assign to…" />
                  </SelectTrigger>
                  <SelectContent>
                    {overview.workload.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tf-sprint">Sprint</Label>
                <Select
                  value={draft.sprintId === "" ? BACKLOG : String(draft.sprintId)}
                  onValueChange={(v) => setDraft({ ...draft, sprintId: v === BACKLOG ? "" : Number(v) })}
                >
                  <SelectTrigger id="tf-sprint">
                    <SelectValue placeholder="Backlog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BACKLOG}>Backlog</SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tf-due">Due date</Label>
                <Input id="tf-due" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tf-points">Story points</Label>
                <Input
                  id="tf-points"
                  type="number"
                  min={0}
                  value={draft.storyPoints}
                  onChange={(e) => setDraft({ ...draft, storyPoints: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="tf-tags">Tags (comma separated)</Label>
                <Input id="tf-tags" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="frontend, bug" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveTask} disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Create task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
