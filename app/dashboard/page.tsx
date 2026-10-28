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
  Line,
  LineChart,
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
  CheckCheck,
  ChevronRight,
  CircleDot,
  Flag,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Swords,
  Timer,
  Trash2,
  Trophy,
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
import { cn } from "@/lib/utils"
import type { DashboardOverview } from "@/lib/dashboard-data"
import type { OnboardingView } from "@/lib/onboarding/read"
import { ONBOARDING_STEP_COUNT } from "@/lib/onboarding/state"
import { DASHBOARD_SECTIONS, sectionLabel } from "@/lib/packs/types"
import { DISCIPLINE_COLOUR } from "@/lib/roles"
import { KIND_LABEL, formatMinutes } from "@/lib/worklog/entries"
import { localDay } from "@/lib/worklog/local-day"
import type { WorklogSummary } from "@/lib/worklog/summary"
import {
  AXIS,
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

type SprintOption = { id: number; name: string; status: string }

// The home dashboard is this member's own work, not the workspace's. The team,
// analytics and copilot pages read the same endpoint without the scope, keeping
// their workspace-wide numbers.
const OVERVIEW_URL = "/api/dashboard/overview?scope=member"

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

type OverviewTask = DashboardOverview["myTasks"][number]

// A task with no sprint. Radix forbids `<Select.Item value="" />` — the empty
// string belongs to the Root, where it means "show the placeholder" — so the
// backlog gets its own sentinel and is mapped to null at the API boundary.
const BACKLOG = "backlog"

const PACK_SECTION_HREF: Record<string, string> = {
  today: "/dashboard",
  registers: "/dashboard/registers",
  tasks: "/dashboard",
  worklog: "/dashboard/worklog",
  reports: "/dashboard/reports-work",
  career: "/dashboard/career",
}

/* ------------------------------------------------------------- today strip */

// A preview with three jobs: what is logged today, what moved today, and one keystroke to the log
// itself. It deliberately has no input — quick add lives on the work log page, because a strip that
// also writes rows is two places to learn.
function TodayStrip({
  summary,
  loading,
  todayIso,
  staleCount,
}: {
  summary: WorklogSummary | null
  loading: boolean
  todayIso: string
  staleCount: number | null
}) {
  const logHref = `/dashboard/worklog?${new URLSearchParams({ v: "day", day: todayIso })}`
  const staleHref = "/dashboard/registers?stale=1"
  // `?v=day` resolves to exactly one bucket, so days[0] is the day the heading names.
  const day = summary?.days[0]
  const dayRows = day?.entries.length ?? 0
  const shown = (day?.entries ?? []).slice(0, 5)
  const moved = summary?.transitions.length ?? 0
  return (
    <SectionCard
      title={`Today — ${todayIso}`}
      icon={<CalendarClock className="h-4 w-4" />}
      action={
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={logHref}>
            Open work log
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      }
    >
      {staleCount !== null && staleCount > 0 ? (
        <p className="mb-3 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <Link href={staleHref} className="underline underline-offset-2">
            {staleCount} register {staleCount === 1 ? "item is" : "items are"} waiting for a check
          </Link>
        </p>
      ) : null}
      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : summary === null ? (
        <EmptyNote>
          Could not read your log right now.{" "}
          <Link href={logHref} className="underline underline-offset-2">
            Open the work log
          </Link>{" "}
          to try again.
        </EmptyNote>
      ) : summary.totals.entries === 0 ? (
        <EmptyNote>
          Nothing logged today yet. The work log takes one line — what you did, roughly how long, and
          which kind of work it was.
        </EmptyNote>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
              {summary.totals.entries} {summary.totals.entries === 1 ? "entry" : "entries"}
            </span>
            <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
              {formatMinutes(summary.totals.minutes)} recorded
            </span>
            <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
              {summary.streak.current} {summary.streak.current === 1 ? "day" : "days"} in a row
            </span>
            {summary.openBlockers > 0 && (
              <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive tabular-nums">
                {summary.openBlockers} open {summary.openBlockers === 1 ? "blocker" : "blockers"}
              </span>
            )}
          </div>
          <ul className="divide-y divide-border">
            {shown.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2 py-1.5 text-xs first:pt-0 last:pb-0">
                <span
                  className="h-2 w-2 shrink-0 translate-y-0.5 rounded-full"
                  style={{
                    background: e.discipline ? DISCIPLINE_COLOUR[e.discipline] : "hsl(var(--muted-foreground))",
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="shrink-0 text-muted-foreground">
                  {KIND_LABEL[e.kind]}
                  {e.minutes ? ` · ${formatMinutes(e.minutes)}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {moved > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {moved} {moved === 1 ? "task" : "tasks"} changed status today —{" "}
              {summary.transitions.slice(0, 4).map((t) => t.toStatus).join(", ")}
              {moved > 4 ? ` (+${moved - 4} more)` : ""}
            </p>
          )}
          {/* The cap is said out loud: five rows shown of nine must not read as the whole day. */}
          {dayRows > shown.length && (
            <p className="text-[11px] text-muted-foreground">
              {dayRows - shown.length} more in the work log.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  )
}

/* --------------------------------------------------------------- the page */

export default function DashboardHome() {
  const { toast } = useToast()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [sprints, setSprints] = useState<SprintOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Today's work log, read from the same summary endpoint the work log page renders. A null here
  // means "could not read", which is not the same claim as "nothing logged".
  const [today, setToday] = useState<WorklogSummary | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)
  // Overdue register checks are a count, not a list: the strip links to the queue and never
  // pretends "could not read" is zero.
  const [staleCount, setStaleCount] = useState<number | null>(null)
  // Setup state only ever shows a door. A null here (failed read) renders nothing, and an
  // in-progress setup renders a banner — never a redirect, so an existing member is never
  // blocked by a route they cannot see.
  const [onboarding, setOnboarding] = useState<OnboardingView | null>(null)

  // task view state
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sprintFilter, setSprintFilter] = useState("all")

  // modals
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailTask, setDetailTask] = useState<OverviewTask | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setTodayLoading(true)
    try {
      // Four in parallel, and the log and the register queue are fetches rather than follow-ups:
      // a slow summary route must not push the sprint data — or the stale count — behind it.
      const [ovRes, spRes, todayRes, staleRes, onboardingRes] = await Promise.all([
        fetch(OVERVIEW_URL),
        fetch("/api/sprints"),
        fetch("/api/worklog/summary?v=day"),
        fetch("/api/registers/stale"),
        fetch("/api/onboarding").catch(() => null),
      ])
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
      // A failed read stays a failure: the strip falls back to a link instead of reporting a
      // day of zeros the member never checked.
      const todayJson = await todayRes.json().catch(() => null)
      setToday(todayRes.ok && todayJson?.success ? (todayJson.data as WorklogSummary) : null)
      const staleJson = await staleRes.json().catch(() => null)
      setStaleCount(
        staleRes.ok && staleJson?.success ? (staleJson.data.stale as unknown[]).length : null,
      )
      // A failed read leaves the banner out. Setup state never blocks the page it sits on.
      const onboardingJson = onboardingRes ? await onboardingRes.json().catch(() => null) : null
      setOnboarding(onboardingRes?.ok && onboardingJson?.success ? (onboardingJson.data as OnboardingView) : null)
    } catch (err) {
      toast({ variant: "destructive", title: "Dashboard", description: (err as Error).message })
      setToday(null)
      setStaleCount(null)
    } finally {
      setLoading(false)
      setTodayLoading(false)
    }
  }, [toast])

  const reloadQuiet = useCallback(async () => {
    try {
      const ovRes = await fetch(OVERVIEW_URL)
      const ovJson = await ovRes.json()
      if (ovJson.success) setOverview(ovJson.data)
    } catch {
      toast({ variant: "destructive", title: "Dashboard", description: "Refresh failed." })
    }
  }, [toast])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast({ title: "Dashboard refreshed" })
  }, [load, toast])

  useEffect(() => {
    load()
  }, [load])

  // Coming back to the tab re-reads this member's rows, so work created elsewhere is
  // not left behind an old render. Failures stay silent: a background revalidation
  // must not interrupt with a toast.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState !== "visible") return
      fetch(OVERVIEW_URL, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setOverview(json.data)
        })
        .catch(() => undefined)
    }
    document.addEventListener("visibilitychange", revalidate)
    window.addEventListener("focus", revalidate)
    return () => {
      document.removeEventListener("visibilitychange", revalidate)
      window.removeEventListener("focus", revalidate)
    }
  }, [])

  /* ---- task mutations ---- */

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

  const openEdit = (t: OverviewTask) => {
    setDraft({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      storyPoints: t.storyPoints,
      assigneeId: overview?.user.id ?? "",
      sprintId: t.sprintId ?? "",
      dueDate: t.dueDate ?? "",
      tags: Array.isArray(t.tags) ? (t.tags as string[]).join(", ") : "",
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
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Task", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const setTaskStatus = async (t: OverviewTask, status: string) => {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Update failed")
      toast({ title: "Status updated", description: `${t.title} → ${STATUS_LABEL[status] ?? status}` })
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Task", description: (err as Error).message })
    }
  }

  const deleteTask = async (t: OverviewTask) => {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Delete failed")
      toast({ title: "Task deleted", description: t.title })
      setDetailTask(null)
      setConfirmDelete(false)
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Task", description: (err as Error).message })
    }
  }

  /* ---- activity actions ---- */

  const markActivityRead = async (id: number, isRead: boolean) => {
    if (isRead) return
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      setOverview((ov) =>
        ov ? { ...ov, activity: ov.activity.map((act) => (act.id === id ? { ...act, isRead: true } : act)) } : ov,
      )
    } catch {
      toast({ variant: "destructive", title: "Activity", description: "Could not mark as read." })
    }
  }

  const openActivity = (a: DashboardOverview["activity"][number]) => {
    void markActivityRead(a.id, a.isRead)
    if (a.link) window.location.href = a.link
  }

  const markAllActivityRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      setOverview((ov) => (ov ? { ...ov, activity: ov.activity.map((a) => ({ ...a, isRead: true })) } : ov))
      toast({ title: "All activity marked read" })
    } catch {
      toast({ variant: "destructive", title: "Activity", description: "Could not update notifications." })
    }
  }

  /* ---- filtered task list ---- */

  const filteredTasks = useMemo(() => {
    if (!overview) return []
    const q = search.trim().toLowerCase()
    return overview.myTasks.filter((t) => {
      if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (sprintFilter !== "all" && (t.sprintId == null ? BACKLOG : String(t.sprintId)) !== sprintFilter) return false
      return true
    })
  }, [overview, search, statusFilter, priorityFilter, sprintFilter])

  /* ---- render ---- */

  if (loading && !overview) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn’t reach the dashboard API. Your session may have expired.
        </p>
        <Link href="/login">
          <Button>Sign in again</Button>
        </Link>
        <Button variant="outline" onClick={() => load()}>
          Retry
        </Button>
      </div>
    )
  }

  const { kpis, activeSprint } = overview
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const priorityMax = Math.max(1, ...overview.priorityBreakdown.map((x) => x.value))

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Greeting + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {greeting}, {overview.user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeSprint
              ? `${activeSprint.name} · ${activeSprint.daysLeft} day${activeSprint.daysLeft === 1 ? "" : "s"} left`
              : "No active sprint right now"}
            {overview.realtimeEnabled && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> live
              </span>
            )}
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
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/calendar">
              <CalendarClock className="mr-1 h-4 w-4" /> Calendar
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* Setup resume door. Only an interrupted setup shows it; a completed or unimplemented
          one renders nothing, and this is a link, never a redirect. */}
      {onboarding && onboarding.status === "in_progress" ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Finish setting up your workspace</p>
              <p className="text-xs text-muted-foreground">
                You are on step {Math.min(onboarding.step + 1, ONBOARDING_STEP_COUNT)} of {ONBOARDING_STEP_COUNT}. Your
                saved answers are waiting.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/onboarding">
                Resume setup <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 2 — KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { label: "My open tasks", value: kpis.myOpenTasks, icon: <CircleDot className="h-4 w-4" />, hint: `${kpis.myDueThisWeek} due this week`, tone: undefined },
          { label: "Completed this week", value: kpis.myCompletedThisWeek, icon: <CheckCheck className="h-4 w-4" />, hint: "last 7 days", tone: undefined },
          { label: "Sprint progress", value: `${kpis.sprintProgressPct}%`, icon: <Zap className="h-4 w-4" />, hint: activeSprint ? `${activeSprint.donePoints}/${activeSprint.totalPoints} pts` : "no sprint", tone: undefined },
          { label: "Blocked tasks", value: kpis.blockedTasks, icon: <Timer className="h-4 w-4" />, hint: "yours", tone: kpis.blockedTasks > 0 ? "text-red-500" : undefined },
          { label: "My wellbeing", value: kpis.myWellbeing, icon: <Sparkles className="h-4 w-4" />, hint: "latest check-in /100", tone: undefined },
          { label: "Level", value: overview.gamification?.level ?? 1, icon: <Trophy className="h-4 w-4" />, hint: `${overview.gamification?.xp ?? 0} XP`, tone: undefined },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {k.label}
                <span className={k.tone}>{k.icon}</span>
              </div>
              <p className={cn("mt-1 text-2xl font-semibold tabular-nums", k.tone)}>{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3 — Active sprint strip */}
      {activeSprint && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{activeSprint.name}</p>
                <Badge variant="secondary" className="shrink-0 capitalize">
                  {activeSprint.status}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeSprint.taskCount} tasks · {activeSprint.donePoints}/{activeSprint.totalPoints} points · ends{" "}
                {activeSprint.endDate}
              </p>
              <Progress value={activeSprint.progressPct} className="mt-2 h-2" />
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-lg font-semibold tabular-nums">{activeSprint.progressPct}%</p>
                <p className="text-[11px] text-muted-foreground">complete</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums">{activeSprint.daysLeft}</p>
                <p className="text-[11px] text-muted-foreground">days left</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/sprints">
                  Sprint board <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4 — Filter bar + grid/list toggle */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my tasks…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 text-sm">
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
            <SelectTrigger className="h-9 w-32 text-sm">
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
          <Select value={sprintFilter} onValueChange={setSprintFilter}>
            <SelectTrigger className="h-9 w-40 text-sm">
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
          <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
            <Button
              size="sm"
              variant={view === "grid" ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              className="h-7 px-2"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5 — My tasks grid/list */}
      {view === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((t) => (
            <Card key={t.id} className="transition-colors hover:border-primary/40">
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left text-sm font-medium leading-snug hover:underline" onClick={() => setDetailTask(t)}>
                    {t.title}
                  </button>
                  <StatusPill status={t.status} />
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{t.description || "No description"}</p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <PriorityPill priority={t.priority} />
                    <span>{t.storyPoints} pts</span>
                  </div>
                  {t.dueDate && (
                    <span className={cn(new Date(t.dueDate) < new Date() && t.status !== "done" && "font-semibold text-red-500")}>
                      {t.dueDate}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetailTask(t)}>
                    Details <ChevronRight className="ml-0.5 h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(t)}>
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  {t.status !== "done" ? (
                    <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs text-emerald-600" onClick={() => setTaskStatus(t, "done")}>
                      Complete
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs" onClick={() => setTaskStatus(t, "todo")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTasks.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <EmptyNote>No tasks match these filters.</EmptyNote>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Task</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                  <th className="px-4 py-2 font-medium">Points</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="max-w-64 px-4 py-2">
                      <button className="truncate font-medium hover:underline" onClick={() => setDetailTask(t)}>
                        {t.title}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-4 py-2">
                      <PriorityPill priority={t.priority} />
                    </td>
                    <td className="px-4 py-2 tabular-nums">{t.storyPoints}</td>
                    <td
                      className={cn(
                        "px-4 py-2 text-xs",
                        new Date(t.dueDate ?? "9999") < new Date() && t.status !== "done" && "font-semibold text-red-500",
                      )}
                    >
                      {t.dueDate ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(t)} aria-label={`Edit ${t.title}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetailTask(t)} aria-label={`Open ${t.title}`}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        {t.status !== "done" ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => setTaskStatus(t, "done")}>
                            Done
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setTaskStatus(t, "todo")}>
                            Reopen
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyNote>No tasks match these filters.</EmptyNote>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* The resolved role pack orders the sections it names. Unknown keys render their raw
          label rather than disappearing, and this is a strip of links — it does not move the
          page around underneath anyone. */}
      {onboarding?.pack ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> {onboarding.pack.title} order
            </p>
            <div className="flex flex-wrap gap-1.5">
              {onboarding.pack.sections
                .filter((key) => DASHBOARD_SECTIONS.some((section) => section.key === key))
                .map((key) => (
                  <Button key={key} asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                    <Link href={PACK_SECTION_HREF[key] ?? "/dashboard"}>{sectionLabel(key)}</Link>
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 20 — Today in the work log. It heads the analytics stack rather than the page: "what did
          I do today" outranks "how is the sprint trending", and the task table above it is the
          member's own backlog, not a chart. */}
      <TodayStrip
        summary={today}
        loading={todayLoading}
        todayIso={today?.range.from ?? localDay(new Date())}
        staleCount={staleCount}
      />

      {/* 6+7 — Burndown & velocity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Sprint burndown" icon={<BarChart3 className="h-4 w-4" />}>
          {overview.burndown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={overview.burndown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} minTickGap={24} />
                <YAxis tick={AXIS} width={30} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="hsl(var(--chart-stone))" strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="actual" name="Remaining" stroke="hsl(var(--chart-pine))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Start a sprint to see burndown.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Velocity" icon={<Swords className="h-4 w-4" />}>
          {overview.velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overview.velocity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={AXIS} />
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

      {/* 8+9+10 — Status donut, priority bars, throughput */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Task status mix" icon={<CircleDot className="h-4 w-4" />}>
          {overview.statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={overview.statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {overview.statusBreakdown.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLOR[s.name] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => STATUS_LABEL[String(v)] ?? String(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No tasks yet.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="My open priorities" icon={<Flag className="h-4 w-4" />}>
          {overview.priorityBreakdown.length > 0 ? (
            <div className="space-y-3 pt-2">
              {overview.priorityBreakdown.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-xs">
                    <span className="capitalize">{p.name}</span>
                    <span className="tabular-nums text-muted-foreground">{p.value}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round((p.value / priorityMax) * 100)}%`, background: PRIORITY_COLOR[p.name] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>Nothing open — nice.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Weekly throughput" icon={<Activity className="h-4 w-4" />}>
          {overview.throughput.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overview.throughput}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} />
                <YAxis tick={AXIS} width={26} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="donePoints" name="Points done" fill="hsl(var(--chart-moss))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Nothing completed in the last 7 days.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 11+12 — Deadlines and events, both this member's own. The workspace's roster
          and schedule live on /dashboard/team and /dashboard/calendar; a home page that
          borrowed them would look populated to an account that has done nothing yet. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Upcoming deadlines"
          icon={<Timer className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/tasks">All tasks</Link>
            </Button>
          }
        >
          {overview.deadlines.length > 0 ? (
            <ul className="divide-y">
              {overview.deadlines.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <button
                    className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                    onClick={() => {
                      const t = overview.myTasks.find((x) => x.id === d.id)
                      if (t) setDetailTask(t)
                    }}
                  >
                    {d.title}
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityPill priority={d.priority} />
                    <Badge
                      variant={
                        d.daysRemaining !== null && d.daysRemaining < 0
                          ? "destructive"
                          : d.daysRemaining !== null && d.daysRemaining <= 2
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[11px]"
                    >
                      {d.daysRemaining === null
                        ? "—"
                        : d.daysRemaining < 0
                          ? `${-d.daysRemaining}d overdue`
                          : d.daysRemaining === 0
                            ? "today"
                            : `${d.daysRemaining}d`}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No deadlines on your plate.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming events"
          icon={<CalendarClock className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/calendar">Calendar</Link>
            </Button>
          }
        >
          {overview.events.length > 0 ? (
            <ul className="divide-y">
              {overview.events.map((e) => {
                const dt = new Date(e.startTime)
                return (
                  <li key={e.id} className="flex items-center gap-3 py-2">
                    <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-muted py-1 text-center">
                      <span className="text-[10px] uppercase">{dt.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span className="text-sm font-semibold tabular-nums">{dt.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">
                        {e.eventType} · {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyNote>Nothing scheduled ahead.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 13+14 — Activity feed and this member's wellbeing */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Activity"
          icon={<Activity className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2">
              {overview.realtimeEnabled && (
                <Badge variant="outline" className="text-[10px] text-emerald-600">
                  realtime
                </Badge>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllActivityRead}>
                Mark all read
              </Button>
            </div>
          }
        >
          {overview.activity.length > 0 ? (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {overview.activity.map((a) => (
                <li key={a.id}>
                  <button
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60",
                      !a.isRead && "bg-muted/40",
                    )}
                    onClick={() => openActivity(a)}
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", a.isRead ? "bg-transparent" : "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      {a.body && <span className="block truncate text-xs text-muted-foreground">{a.body}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(a.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No activity yet. Task changes land here live.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard
          title="My wellbeing"
          icon={<Sparkles className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/team-wellbeing">Log mood</Link>
            </Button>
          }
        >
          {overview.wellbeingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={overview.wellbeingTrend}>
                <defs>
                  <linearGradient id="wbFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-moss))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--chart-moss))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ ...AXIS, fontSize: 10 }} minTickGap={20} />
                <YAxis domain={[0, 100]} tick={AXIS} width={26} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="score" name="Wellbeing" stroke="hsl(var(--chart-moss))" fill="url(#wbFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="stress" name="Stress" stroke="hsl(var(--chart-clay))" fill="transparent" strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Log a check-in to start your trend.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 15 — Personal progress. The leaderboard and ethical scores are workspace
          aggregates; their pages own them, the home does not borrow them. */}
      <SectionCard
        title="Progress & rewards"
        icon={<Trophy className="h-4 w-4" />}
        action={
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link href="/dashboard/gamification">Skill trees</Link>
          </Button>
        }
      >
        {overview.gamification ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--chart-pine))] text-sm font-bold text-white">
                {overview.gamification.level}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{overview.gamification.xp} XP</span>
                  <span className="text-muted-foreground">next level {overview.gamification.nextLevelXp} XP</span>
                </div>
                <Progress value={Math.min(100, Math.round(((overview.gamification.xp % 500) / 500) * 100))} className="mt-1 h-1.5" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {overview.gamification.tasksCompleted} tasks completed · {overview.gamification.achievements} achievements
                </p>
              </div>
            </div>
            <Separator />
            {overview.gamification.skillTrees.length > 0 ? (
              overview.gamification.skillTrees.slice(0, 3).map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">
                      Lv {s.level} · {s.progress}%
                    </span>
                  </div>
                  <Progress value={s.progress} className="mt-1 h-1.5" />
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Complete tasks to grow skill trees.</p>
            )}
          </div>
        ) : (
          <EmptyNote>Start closing tasks to earn XP.</EmptyNote>
        )}
      </SectionCard>

      {/* ---- task detail modal ---- */}
      <Dialog open={detailTask !== null} onOpenChange={(o) => !o && setDetailTask(null)}>
        {detailTask && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="pr-8 text-base">{detailTask.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Task #{detailTask.id}
                {detailTask.dueDate ? ` · due ${detailTask.dueDate}` : ""}
                {detailTask.sprintId ? ` · sprint #${detailTask.sprintId}` : " · backlog"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={detailTask.status} />
                <PriorityPill priority={detailTask.priority} />
                <Badge variant="outline">{detailTask.storyPoints} pts</Badge>
              </div>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {detailTask.description || "No description."}
              </p>
              <div>
                <Label className="text-xs">Change status</Label>
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
                    {overview.workload.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sprint</Label>
                <Select
                  value={draft.sprintId === "" ? BACKLOG : String(draft.sprintId)}
                  onValueChange={(v) => setDraft({ ...draft, sprintId: v === BACKLOG ? "" : Number(v) })}
                >
                  <SelectTrigger>
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
