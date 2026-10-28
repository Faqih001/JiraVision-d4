"use client"

import { useCallback, useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCheck,
  Eye,
  Flag,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  STATUSES,
  STATUS_COLOR,
  STATUS_LABEL,
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
  tags: unknown
  createdAt: string | null
  updatedAt: string | null
}

type SprintRow = {
  id: number
  name: string
  status: string
  capacity: number
  totalPoints: number
  donePoints: number
  startDate: string
  endDate: string
}

type TeamMember = { id: number; name: string; avatar: string | null }

type ActivityItem = {
  id: number
  title: string
  body: string | null
  createdAt: string
  metadata: unknown
}

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

/* ---------------------------------------------------------------- helpers */

// Legacy board-card type, kept exported for the historical
// components/kanban/kanban-column.tsx and kanban-task.tsx consumers.
// The V3 board itself renders TaskRow objects from /api/tasks instead.
export type KanbanTask = {
  id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high"
  dueDate?: string
  assignee?: {
    id: string | number
    name: string
    avatar?: string
  }
  tags: string[]
  attachments?: number
  comments?: number
  subtasks?: {
    total: number
    completed: number
  }
}

const tagList = (t: TaskRow) => (Array.isArray(t.tags) ? t.tags.map(String) : [])

const isOverdue = (t: TaskRow) =>
  Boolean(t.dueDate) && t.status !== "done" && new Date(t.dueDate as string) < new Date()

/* ---------------------------------------------------------------- the page */

export default function KanbanBoardPage() {
  const { toast } = useToast()

  // data
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [sprints, setSprints] = useState<SprintRow[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [me, setMe] = useState<{ id: number; name: string; avatar: string | null } | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // filters + view
  const [boardScope, setBoardScope] = useState<"mine" | "workspace">("mine")
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [sprintFilter, setSprintFilter] = useState("all")
  const [view, setView] = useState<"board" | "lanes">("board")
  const scopeParam = boardScope === "mine" ? "scope=mine" : "scope=all"

  // drag state
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  // dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailTask, setDetailTask] = useState<TaskRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  /* ------------------------------------------------------------- loading */

  const load = useCallback(async () => {
    const [tasksRes, sprintsRes, overviewRes, notifRes] = await Promise.all([
      fetch(`/api/tasks?pageSize=200&${scopeParam}`),
      fetch(`/api/sprints?${scopeParam}`),
      fetch("/api/dashboard/overview?scope=member"),
      fetch("/api/notifications?limit=30"),
    ])
    const tasksJson = await tasksRes.json()
    if (!tasksJson.success) throw new Error(tasksJson.message ?? "Failed to load tasks")
    setTasks((tasksJson.data ?? []) as TaskRow[])
    setLoadError(null)

    const sprintsJson = await sprintsRes.json().catch(() => null)
    if (sprintsJson?.success)
      setSprints(
        (sprintsJson.data as SprintRow[]).map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          capacity: s.capacity ?? 0,
          totalPoints: s.totalPoints ?? 0,
          donePoints: s.donePoints ?? 0,
          startDate: s.startDate,
          endDate: s.endDate,
        })),
      )

    const overviewJson = await overviewRes.json().catch(() => null)
    if (overviewJson?.success) {
      setMe(overviewJson.data.user)
      setMembers(
        (overviewJson.data.workload as TeamMember[]).map((w) => ({ id: w.id, name: w.name, avatar: w.avatar })),
      )
    }

    const notifJson = await notifRes.json().catch(() => null)
    if (notifJson && Array.isArray(notifJson.items)) setActivity(notifJson.items as ActivityItem[])
  }, [scopeParam])

  const reloadTasks = useCallback(async () => {
    try {
      const [tasksRes, notifRes] = await Promise.all([
        fetch(`/api/tasks?pageSize=200&${scopeParam}`),
        fetch("/api/notifications?limit=30"),
      ])
      const tasksJson = await tasksRes.json()
      if (tasksJson.success) setTasks((tasksJson.data ?? []) as TaskRow[])
      const notifJson = await notifRes.json().catch(() => null)
      if (notifJson && Array.isArray(notifJson.items)) setActivity(notifJson.items as ActivityItem[])
    } catch {
      /* the board on screen stays; the refresh button reports failures */
    }
  }, [scopeParam])

  useLiveRefresh(reloadTasks, { intervalMs: LIVE_REFRESH_MS })

  useEffect(() => {
    let cancelled = false
    load().catch((err: Error) => {
      if (!cancelled) setLoadError(err.message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
      toast({ title: "Board refreshed" })
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setRefreshing(false)
    }
  }, [load, toast])

  /* ----------------------------------------------------------- mutations */

  const moveTask = useCallback(
    async (task: TaskRow, status: string) => {
      if (task.status === status) return
      const before = task.status
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status, updatedAt: new Date().toISOString() } : t)))
      setDetailTask((d) => (d && d.id === task.id ? { ...d, status } : d))
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.message ?? "Update failed")
        toast({
          title: "Card moved",
          description: `${task.title} · ${STATUS_LABEL[before] ?? before} → ${STATUS_LABEL[status] ?? status}`,
        })
        await reloadTasks()
      } catch (err) {
        toast({ variant: "destructive", title: "Move failed", description: (err as Error).message })
        await reloadTasks()
      }
    },
    [reloadTasks, toast],
  )

  const openCreate = (status = "todo") => {
    setDraft({
      title: "",
      description: "",
      status,
      priority: "medium",
      storyPoints: 1,
      assigneeId: me?.id ?? "",
      sprintId: sprintFilter !== "all" && sprintFilter !== "backlog" ? Number(sprintFilter) : 0,
      dueDate: "",
      tags: "",
    })
    setConfirmDelete(false)
    setFormOpen(true)
  }

  const openEdit = (t: TaskRow) => {
    setDraft({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      storyPoints: t.storyPoints,
      assigneeId: t.assigneeId ?? "",
      sprintId: t.sprintId ?? 0,
      dueDate: t.dueDate ?? "",
      tags: tagList(t).join(", "),
    })
    setConfirmDelete(false)
    setDetailTask(null)
    setFormOpen(true)
  }

  const saveTask = async () => {
    if (!draft || !draft.title.trim()) {
      toast({ variant: "destructive", title: "Card", description: "A title is required." })
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
        // sprintId 0 (or "") is the "Backlog (none)" sentinel → null in the DB
        sprintId: !draft.sprintId ? null : Number(draft.sprintId),
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
      toast({ title: draft.id ? "Card updated" : "Card created", description: payload.title })
      setFormOpen(false)
      setDraft(null)
      await reloadTasks()
    } catch (err) {
      toast({ variant: "destructive", title: "Card", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const deleteTask = async (t: TaskRow) => {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Delete failed")
      toast({ title: "Card deleted", description: t.title })
      setDetailTask(null)
      setConfirmDelete(false)
      await reloadTasks()
    } catch (err) {
      toast({ variant: "destructive", title: "Card", description: (err as Error).message })
    }
  }

  /* ------------------------------------------------------------ derived */

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const sprintById = useMemo(() => new Map(sprints.map((s) => [s.id, s])), [sprints])
  const activeSprint = useMemo(() => sprints.find((s) => s.status === "active") ?? null, [sprints])

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) => {
      if (sprintFilter === "backlog") {
        if (t.sprintId !== null) return false
      } else if (sprintFilter !== "all" && String(t.sprintId ?? "") !== sprintFilter) {
        return false
      }
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (assigneeFilter === "none") {
        if (t.assigneeId !== null) return false
      } else if (assigneeFilter !== "all" && String(t.assigneeId ?? "") !== assigneeFilter) {
        return false
      }
      if (q && !`${t.title} ${t.description ?? ""} ${tagList(t).join(" ")}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [tasks, search, sprintFilter, priorityFilter, assigneeFilter])

  const columns = useMemo(
    () =>
      STATUSES.map((status) => {
        const colTasks = visibleTasks.filter((t) => t.status === status)
        return {
          status,
          tasks: colTasks,
          points: colTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
        }
      }),
    [visibleTasks],
  )

  const capacitySprint = useMemo(
    () => (sprintFilter !== "all" && sprintFilter !== "backlog" ? sprintById.get(Number(sprintFilter)) ?? null : activeSprint),
    [sprintFilter, sprintById, activeSprint],
  )

  const atRisk = useMemo(
    () => visibleTasks.filter((t) => t.status === "blocked" || isOverdue(t)),
    [visibleTasks],
  )

  const myCards = useMemo(() => (me ? tasks.filter((t) => t.assigneeId === me.id && t.status !== "done") : []), [tasks, me])

  const recentlyMoved = useMemo(() => {
    const cutoff = Date.now() - 48 * 3_600_000
    return tasks
      .filter((t) => t.updatedAt && new Date(t.updatedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime())
      .slice(0, 8)
  }, [tasks])

  const taskFeed = useMemo(() => {
    const boardTaskIds = new Set(tasks.map((t) => t.id))
    return activity
      .filter((a) => {
        const meta = a.metadata as Record<string, unknown> | null
        const taskId = Number(meta?.taskId)
        return Number.isFinite(taskId) && boardTaskIds.has(taskId)
      })
      .slice(0, 8)
  }, [activity, tasks])

  const throughput = useMemo(() => {
    const days: { label: string; done: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const done = tasks.filter(
        (t) =>
          t.status === "done" &&
          t.updatedAt &&
          new Date(t.updatedAt).toLocaleDateString("en-CA").slice(0, 10) === key,
      ).length
      days.push({ label: d.toLocaleDateString("en-US", { weekday: "short" }), done })
    }
    return days
  }, [tasks])

  const lanes = useMemo(() => {
    const byAssignee = new Map<string, TaskRow[]>()
    for (const t of visibleTasks) {
      const key = t.assigneeId === null ? "__unassigned__" : String(t.assigneeId)
      const list = byAssignee.get(key)
      if (list) list.push(t)
      else byAssignee.set(key, [t])
    }
    return [...byAssignee.entries()]
      .map(([key, list]) => {
        const member = key === "__unassigned__" ? null : memberById.get(Number(key))
        return {
          key,
          name: member?.name ?? "Unassigned",
          avatar: member?.avatar ?? null,
          points: list.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
          tasks: [...list].sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)),
        }
      })
      .sort((a, b) => (a.key === "__unassigned__" ? 1 : b.key === "__unassigned__" ? -1 : a.name.localeCompare(b.name)))
  }, [visibleTasks, memberById])

  /* ------------------------------------------------------- drag and drop */

  const handleColumnDrop = (status: string) => (e: ReactDragEvent) => {
    e.preventDefault()
    setDragOverStatus(null)
    const id = Number(e.dataTransfer.getData("text/plain"))
    if (!Number.isFinite(id)) return
    const task = tasks.find((t) => t.id === id)
    if (task) void moveTask(task, status)
  }

  /* ------------------------------------------------------------- render */

  if (loading) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-16" />
        <Skeleton className="h-12" />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <p className="text-sm text-muted-foreground">Your session may have expired.</p>
        <Link href="/login">
          <Button>Sign in again</Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true)
            load().catch((err: Error) => setLoadError(err.message)).finally(() => setLoading(false))
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  const renderCard = (t: TaskRow, draggable: boolean) => (
    <article
      key={t.id}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.setData("text/plain", String(t.id))
              e.dataTransfer.effectAllowed = "move"
            }
          : undefined
      }
      className="group cursor-grab rounded-lg border bg-card p-2.5 shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <button className="min-w-0 text-left text-sm font-medium leading-snug hover:underline" onClick={() => setDetailTask(t)}>
          {t.title}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0 opacity-60 group-hover:opacity-100"
              aria-label={`Actions for ${t.title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setDetailTask(t)}>
              <Eye className="mr-2 h-4 w-4" /> View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(t)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit card
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">Move to</DropdownMenuLabel>
            {STATUSES.filter((s) => s !== t.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => void moveTask(t, s)}>
                <span className="mr-2 h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                {STATUS_LABEL[s]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => {
                setDetailTask(t)
                setConfirmDelete(true)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <PriorityPill priority={t.priority} />
          <span className="tabular-nums">{t.storyPoints} pts</span>
        </div>
        <div className="flex items-center gap-2">
          {t.dueDate && (
            <span className={cn("tabular-nums", isOverdue(t) && "font-semibold text-red-500")}>{t.dueDate}</span>
          )}
          {t.assigneeId !== null && (
            <AvatarCircle name={memberById.get(t.assigneeId)?.name ?? `User ${t.assigneeId}`} avatar={memberById.get(t.assigneeId)?.avatar} size={20} />
          )}
        </div>
      </div>
      {tagList(t).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tagList(t)
            .slice(0, 4)
            .map((tag) => (
              <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
        </div>
      )}
    </article>
  )

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Board header: sprint selector + new card + refresh */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Kanban board</h1>
          <p className="text-sm text-muted-foreground">
            {visibleTasks.length} of {tasks.length} cards
            {activeSprint ? ` · ${activeSprint.name} · ends ${activeSprint.endDate}` : " · no active sprint"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sprintFilter} onValueChange={setSprintFilter}>
            <SelectTrigger className="h-9 w-44 text-sm" aria-label="Filter by sprint">
              <CalendarClock className="mr-1 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sprints</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                  {s.status === "active" ? " · active" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="mr-1 h-4 w-4" /> New card
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2 — WIP / capacity bar */}
      <Card>
        <CardContent className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:gap-6">
          {capacitySprint ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{capacitySprint.name}</p>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {capacitySprint.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {capacitySprint.totalPoints} pts committed · {capacitySprint.donePoints} pts done ·{" "}
                  {capacitySprint.capacity > 0 ? `${capacitySprint.capacity} pts capacity` : "no capacity set"} ·{" "}
                  {capacitySprint.startDate} → {capacitySprint.endDate}
                </p>
                <Progress
                  value={
                    capacitySprint.capacity > 0
                      ? Math.min(100, Math.round((capacitySprint.totalPoints / capacitySprint.capacity) * 100))
                      : capacitySprint.totalPoints > 0
                        ? 100
                        : 0
                  }
                  className={cn(
                    "mt-2 h-2",
                    capacitySprint.capacity > 0 && capacitySprint.totalPoints > capacitySprint.capacity && "[&>div]:bg-red-500",
                  )}
                />
              </div>
              <div className="flex items-center gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {capacitySprint.capacity > 0 ? `${Math.round((capacitySprint.totalPoints / capacitySprint.capacity) * 100)}%` : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">of capacity</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{visibleTasks.filter((t) => t.status !== "done").length}</p>
                  <p className="text-[11px] text-muted-foreground">open here</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/sprints">
                    Sprints <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <EmptyNote>No active sprint — pick one above or plan one in the sprint board.</EmptyNote>
          )}
        </CardContent>
      </Card>

      {/* 3 — Filter bar (search, priority, assignee) + view toggle */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <div className="flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="Board scope">
            <Button
              size="sm"
              variant={boardScope === "mine" ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setBoardScope("mine")}
            >
              My board
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
              placeholder="Search cards…"
              aria-label="Search cards"
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
          {boardScope === "workspace" ? (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-9 w-40 text-sm" aria-label="Filter by assignee">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="View mode">
            <Button
              size="sm"
              variant={view === "board" ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setView("board")}
              aria-label="Board view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "lanes" ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setView("lanes")}
              aria-label="Swimlane view, grouped by assignee"
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4 — Five-column board by status, HTML5 drag and drop */}
      {view === "board" ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {columns.map((col) => (
            <section
              key={col.status}
              aria-labelledby={`kanban-col-${col.status}`}
              className={cn(
                "flex min-h-40 flex-col rounded-xl border bg-muted/30 p-2 transition-colors",
                dragOverStatus === col.status && "border-primary/60 bg-muted/60",
              )}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (dragOverStatus !== col.status) setDragOverStatus(col.status)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null)
              }}
              onDrop={handleColumnDrop(col.status)}
            >
              <header className="flex items-center justify-between gap-2 px-1 pb-2">
                <h2 id={`kanban-col-${col.status}`} className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[col.status] }} />
                  {STATUS_LABEL[col.status]}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{col.tasks.length} cards</span>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] tabular-nums">
                    {col.points} pts
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => openCreate(col.status)}
                    aria-label={`New card in ${STATUS_LABEL[col.status]}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {col.tasks.map((t) => renderCard(t, true))}
                {col.tasks.length === 0 && (
                  <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Drop cards here
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* 5 — Swimlane view grouped by assignee */
        <div className="space-y-4">
          {lanes.map((lane) => (
            <Card key={lane.key}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <AvatarCircle name={lane.name} avatar={lane.avatar} size={24} />
                  <p className="text-sm font-semibold">{lane.name}</p>
                  <Badge variant="outline" className="ml-auto text-[10px] tabular-nums">
                    {lane.tasks.length} cards · {lane.points} pts
                  </Badge>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {lane.tasks.map((t) => (
                    <div key={t.id}>
                      {renderCard(t, false)}
                      <div className="mt-1">
                        <StatusPill status={t.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {lanes.length === 0 && (
            <Card>
              <EmptyNote>No cards match these filters.</EmptyNote>
            </Card>
          )}
        </div>
      )}

      {/* 6 — At-risk strip (overdue or blocked) */}
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold">At risk</h2>
            <Badge variant="destructive" className="text-[10px]">
              {atRisk.length}
            </Badge>
          </div>
          {atRisk.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {atRisk.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  className="flex items-center gap-2 rounded-md border border-red-200 bg-red-500/5 px-2 py-1 text-xs hover:border-red-400"
                  onClick={() => setDetailTask(t)}
                >
                  <span className="max-w-40 truncate font-medium">{t.title}</span>
                  {t.status === "blocked" ? (
                    <Badge variant="destructive" className="px-1 py-0 text-[10px]">
                      blocked
                    </Badge>
                  ) : (
                    <span className="font-semibold text-red-500">due {t.dueDate}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyNote>Nothing overdue or blocked — the board is healthy.</EmptyNote>
          )}
        </CardContent>
      </Card>

      {/* 7 — Cycle snapshot: priority donut per column */}
      <SectionCard title="Cycle snapshot" icon={<Flag className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {columns.map((col) => {
            const data = PRIORITIES.map((p) => ({ name: p, value: col.tasks.filter((t) => t.priority === p).length })).filter(
              (d) => d.value > 0,
            )
            return (
              <div key={col.status} className="rounded-lg border p-2 text-center">
                <p className="text-xs font-semibold">{STATUS_LABEL[col.status]}</p>
                {data.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={90}>
                      <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" innerRadius={20} outerRadius={36} paddingAngle={2}>
                          {data.map((d) => (
                            <Cell key={d.name} fill={PRIORITY_COLOR[d.name]} />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground">
                      {data.map((d) => `${d.name}:${d.value}`).join(" · ")}
                    </p>
                  </>
                ) : (
                  <p className="py-8 text-[11px] text-muted-foreground">Empty</p>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* 8 — My cards rail */}
      <SectionCard
        title={me ? `My cards (${myCards.length})` : "My cards"}
        icon={<Timer className="h-4 w-4" />}
        action={
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link href="/dashboard/tasks">All tasks</Link>
          </Button>
        }
      >
        {myCards.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {myCards.slice(0, 14).map((t) => (
              <button
                key={t.id}
                className="flex w-48 shrink-0 flex-col gap-1 rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-primary/40"
                onClick={() => setDetailTask(t)}
              >
                <span className="truncate text-sm font-medium">{t.title}</span>
                <span className="flex items-center justify-between">
                  <StatusPill status={t.status} />
                  <span className="text-[11px] tabular-nums text-muted-foreground">{t.storyPoints} pts</span>
                </span>
                {t.dueDate && (
                  <span className={cn("text-[11px] text-muted-foreground", isOverdue(t) && "font-semibold text-red-500")}>
                    due {t.dueDate}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <EmptyNote>Nothing assigned to you right now.</EmptyNote>
        )}
      </SectionCard>

      {/* 9+10 — Activity mini-feed + recently moved */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Activity" icon={<Activity className="h-4 w-4" />}>
          {taskFeed.length > 0 ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {taskFeed.map((a) => (
                <li key={a.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    {a.body && <span className="block truncate text-xs text-muted-foreground">{a.body}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No board activity yet. Status changes and assignments land here.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Recently moved (48h)" icon={<ArrowRight className="h-4 w-4" />}>
          {recentlyMoved.length > 0 ? (
            <ul className="divide-y">
              {recentlyMoved.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <button className="min-w-0 flex-1 truncate text-left text-sm hover:underline" onClick={() => setDetailTask(t)}>
                    {t.title}
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill status={t.status} />
                    <span className="text-[10px] text-muted-foreground">{relativeTime(t.updatedAt as string)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>Nothing moved in the last 48 hours.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 11 — Board insights: throughput of completed cards per day */}
      <SectionCard title="Board insights · completions (7 days)" icon={<BarChart3 className="h-4 w-4" />}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={throughput}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={AXIS} />
            <YAxis tick={AXIS} width={26} allowDecimals={false} />
            <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="done" name="Cards done" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCheck className="h-3.5 w-3.5" /> {tasks.filter((t) => t.status === "done").length} done total
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> {tasks.filter((t) => t.status === "blocked").length} blocked
          </span>
          <span className="flex items-center gap-1">
            <LayoutGrid className="h-3.5 w-3.5" /> {visibleTasks.filter((t) => t.status === "in_progress").length} in progress
          </span>
        </div>
      </SectionCard>

      {/* 12 — Footer links */}
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 text-sm">
        <div className="flex gap-4">
          <Link href="/dashboard/tasks" className="text-muted-foreground underline-offset-4 hover:underline">
            Task list
          </Link>
          <Link href="/dashboard/sprints" className="text-muted-foreground underline-offset-4 hover:underline">
            Sprint board
          </Link>
          <Link href="/dashboard" className="text-muted-foreground underline-offset-4 hover:underline">
            Home dashboard
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Drag cards between columns, or use the ⋯ menu → “Move to” with the keyboard.</p>
      </div>

      {/* ---- card detail dialog ---- */}
      <Dialog open={detailTask !== null} onOpenChange={(o) => !o && setDetailTask(null)}>
        {detailTask && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="pr-8 text-base">{detailTask.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Task #{detailTask.id}
                {detailTask.dueDate ? ` · due ${detailTask.dueDate}` : ""}
                {` · ${detailTask.sprintId ? sprintById.get(detailTask.sprintId)?.name ?? `sprint #${detailTask.sprintId}` : "backlog"}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={detailTask.status} />
                <PriorityPill priority={detailTask.priority} />
                <Badge variant="outline">{detailTask.storyPoints} pts</Badge>
                {detailTask.assigneeId !== null && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AvatarCircle name={memberById.get(detailTask.assigneeId)?.name ?? `User ${detailTask.assigneeId}`} avatar={memberById.get(detailTask.assigneeId)?.avatar} size={20} />
                    {memberById.get(detailTask.assigneeId)?.name ?? `User ${detailTask.assigneeId}`}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">{detailTask.description || "No description."}</p>
              {tagList(detailTask).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tagList(detailTask).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {detailTask.updatedAt && (
                <p className="text-[11px] text-muted-foreground">Updated {relativeTime(detailTask.updatedAt)}</p>
              )}
              <div>
                <Label className="text-xs">Change status</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={detailTask.status === s ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => void moveTask(detailTask, s)}
                    >
                      {STATUS_LABEL[s]}
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
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit card
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ---- create/edit card dialog ---- */}
      <Dialog open={formOpen && draft !== null} onOpenChange={(o) => !o && setFormOpen(false)}>
        {draft && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{draft.id ? `Edit card #${draft.id}` : "New card"}</DialogTitle>
              <DialogDescription>Assignees get a live notification in their bell feed.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="kf-title">Title</Label>
                <Input id="kf-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What needs doing?" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="kf-desc">Description</Label>
                <Textarea id="kf-desc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger>
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
                <Label>Assignee</Label>
                <Select value={String(draft.assigneeId)} onValueChange={(v) => setDraft({ ...draft, assigneeId: v === "" ? "" : Number(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to…" />
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
              <div className="space-y-1">
                <Label>Sprint</Label>
                <Select value={String(draft.sprintId)} onValueChange={(v) => setDraft({ ...draft, sprintId: v === "" ? "" : Number(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Backlog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Backlog (none)</SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="kf-due">Due date</Label>
                <Input id="kf-due" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="kf-points">Story points</Label>
                <Input
                  id="kf-points"
                  type="number"
                  min={0}
                  value={draft.storyPoints}
                  onChange={(e) => setDraft({ ...draft, storyPoints: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="kf-tags">Tags (comma separated)</Label>
                <Input id="kf-tags" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="frontend, bug" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveTask} disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Create card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
