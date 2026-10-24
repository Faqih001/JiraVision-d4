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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Brain,
  CalendarClock,
  Check,
  Gauge,
  History,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  TrendingDown,
  TrendingUp,
  Undo2,
  Users,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { DashboardOverview } from "@/lib/dashboard-data"
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  PriorityPill,
  SectionCard,
  STATUS_LABEL,
  StatusPill,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type InsightRow = {
  id: number
  type: string
  title: string
  description: string
  status: string
  createdAt: string | null
}

type TeamTask = {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  storyPoints: number
  assigneeId: number | null
  sprintId: number | null
  dueDate: string | null
}

type SprintRow = {
  id: number
  name: string
  startDate: string
  endDate: string
  status: string
  capacity: number
  completed: number
  totalPoints: number
  donePoints: number
  progressPct: number
  daysLeft: number
  taskCount: number
}

type NotifRow = {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  link: string | null
  createdAt: string | null
}

type Severity = "critical" | "warning" | "info" | "opportunity"

type ImpactPreview = {
  tasks: { id: number; title: string; status: string; priority: string; storyPoints: number; assigneeName: string }[]
  members: string[]
  extra?: string
}

type Recommendation = {
  key: string
  type: string
  title: string
  description: string
  confidence: number
  severity: Severity
  impact: ImpactPreview
  taskIds: number[]
}

type GridItem =
  | { kind: "db"; id: string; insight: InsightRow; confidence: number; severity: Severity }
  | { kind: "rec"; id: string; rec: Recommendation; confidence: number; severity: Severity }

type ReassignMove = {
  taskId: number
  taskTitle: string
  points: number
  fromId: number
  fromName: string
  toId: number
  toName: string
}

type ProjPoint = { label: string; ideal: number | null; actual: number | null; projected: number | null }

type StatusFilter = "active" | "dismissed" | "all"

/* ------------------------------------------------------- pure heuristics */

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDaysIso(iso: string, days: number) {
  const base = new Date(`${iso}T00:00:00`)
  base.setDate(base.getDate() + days)
  return base.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const SEVERITY_TONE: Record<Severity, string> = {
  critical: "text-red-500 border-red-500/40",
  warning: "text-amber-600 border-amber-500/40",
  info: "text-muted-foreground",
  opportunity: "text-emerald-600 border-emerald-500/40",
}

/** Heuristic severity for a stored DB insight, derived from its type/title. */
function insightSeverity(i: InsightRow): Severity {
  const s = `${i.type} ${i.title}`.toLowerCase()
  if (/risk|overrun|block|critical|late|overdue/.test(s)) return "critical"
  if (/imbalance|workload|velocity|meeting|pto|debt/.test(s)) return "warning"
  if (/opportunit|increase|win|suggest/.test(s)) return "opportunity"
  return "info"
}

/** Derived confidence for a stored insight: severity weight + recency decay. */
function insightConfidence(i: InsightRow): number {
  const sevWeight = { critical: 25, warning: 15, opportunity: 10, info: 5 }[insightSeverity(i)]
  const ageDays = i.createdAt ? (Date.now() - new Date(i.createdAt).getTime()) / 86_400_000 : 30
  const recency = clamp(Math.round(15 - ageDays), 0, 15)
  return clamp(55 + sevWeight + recency, 40, 95)
}

type BurndownAnalysis = {
  lastActual: number
  lastIdeal: number
  actualSlope: number
  idealSlope: number
  projectedRemaining: number
  shortfall: number
  atRisk: boolean
}

function analyzeBurndown(
  points: DashboardOverview["burndown"],
  daysLeft: number,
  totalPoints: number,
): BurndownAnalysis | null {
  const pts = points
    .filter((p) => p.actual !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (pts.length < 2) return null
  const first = pts[0]
  const last = pts[pts.length - 1]
  const span = Math.max(1, Math.round((new Date(`${last.date}T00:00:00`).getTime() - new Date(`${first.date}T00:00:00`).getTime()) / 86_400_000))
  const actualSlope = (Number(last.actual) - Number(first.actual)) / span
  const idealPts = points.filter((p) => p.ideal !== null).sort((a, b) => a.date.localeCompare(b.date))
  let idealSlope: number
  if (idealPts.length >= 2) {
    const ifirst = idealPts[0]
    const ilast = idealPts[idealPts.length - 1]
    const isp = Math.max(1, Math.round((new Date(`${ilast.date}T00:00:00`).getTime() - new Date(`${ifirst.date}T00:00:00`).getTime()) / 86_400_000))
    idealSlope = (Number(ilast.ideal) - Number(ifirst.ideal)) / isp
  } else {
    idealSlope = totalPoints > 0 ? -totalPoints / Math.max(1, span + daysLeft) : -1
  }
  const lastActual = Number(last.actual)
  const lastIdeal = idealPts.length > 0 ? Number(idealPts[idealPts.length - 1].ideal) : Math.max(0, lastActual + idealSlope * span)
  const projectedRemaining = Math.max(0, lastActual + actualSlope * daysLeft)
  const burning = actualSlope < 0 ? Math.abs(actualSlope) : 0
  const needed = Math.abs(idealSlope)
  const atRisk = burning < needed * 0.9 && projectedRemaining > 0.5
  return {
    lastActual,
    lastIdeal,
    actualSlope,
    idealSlope,
    projectedRemaining,
    shortfall: projectedRemaining,
    atRisk,
  }
}

/** Linear interpolation helper is intentionally avoided — projection uses the
 * measured ideal series directly (see buildProjection). */

function buildProjection(
  points: DashboardOverview["burndown"],
  analysis: BurndownAnalysis | null,
  daysLeft: number,
): ProjPoint[] {
  const past: ProjPoint[] = points
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ label: p.label, ideal: p.ideal, actual: p.actual, projected: null }))
  if (!analysis || past.length === 0) return past
  // Anchor the projection on the last measured point.
  const anchorIdx = past.reduce((best, p, i) => (p.actual !== null ? i : best), -1)
  if (anchorIdx >= 0) past[anchorIdx].projected = past[anchorIdx].actual
  const lastDate = points.filter((p) => p.actual !== null).sort((a, b) => a.date.localeCompare(b.date)).pop()?.date
  if (!lastDate) return past
  for (let i = 1; i <= Math.max(0, daysLeft); i++) {
    past.push({
      label: addDaysIso(lastDate, i),
      ideal: null,
      actual: null,
      projected: Math.max(0, Math.round((analysis.lastActual + analysis.actualSlope * i) * 10) / 10),
    })
  }
  return past
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
}

function isPtoEvent(eventType: string) {
  return /pto|leave|vacation|holiday|absence/i.test(eventType)
}

function taskAgeDays(t: TeamTask): number | null {
  // The paginated API may omit updatedAt; fall back to null (unknown age).
  const raw = (t as TeamTask & { updatedAt?: string | null }).updatedAt
  if (!raw) return null
  return (Date.now() - new Date(raw).getTime()) / 86_400_000
}

/* ------------------------------------------------------------------ page */

export default function AIScrumMasterPage() {
  const { toast } = useToast()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([])
  const [sprintRows, setSprintRows] = useState<SprintRow[]>([])
  const [notifs, setNotifs] = useState<NotifRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [appliedRecKeys, setAppliedRecKeys] = useState<Set<string>>(new Set())
  const [dismissedRecKeys, setDismissedRecKeys] = useState<Set<string>>(new Set())
  const [deletedRecKeys, setDeletedRecKeys] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<GridItem | null>(null)
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [appliedActions, setAppliedActions] = useState<Record<string, number[]>>({})

  /* ---- data loading ---- */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ovRes, inRes, tkRes, spRes, nfRes] = await Promise.all([
        fetch("/api/dashboard/overview"),
        fetch("/api/ai-insights"),
        fetch("/api/tasks?pageSize=200"),
        fetch("/api/sprints"),
        fetch("/api/notifications?limit=100"),
      ])
      const ovJson = await ovRes.json()
      if (!ovJson.success) throw new Error(ovJson.message ?? "Failed to load dashboard data")
      setOverview(ovJson.data)
      const inJson = await inRes.json()
      if (inJson.success) setInsights(inJson.data as InsightRow[])
      const tkJson = await tkRes.json()
      if (tkJson.success) setTeamTasks(tkJson.data as TeamTask[])
      const spJson = await spRes.json()
      if (spJson.success) setSprintRows(spJson.data as SprintRow[])
      const nfJson = await nfRes.json()
      if (Array.isArray(nfJson.items)) setNotifs(nfJson.items as NotifRow[])
    } catch (err) {
      toast({ variant: "destructive", title: "AI Scrum Master", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const reloadQuiet = useCallback(async () => {
    try {
      const [ovRes, tkRes] = await Promise.all([fetch("/api/dashboard/overview"), fetch("/api/tasks?pageSize=200")])
      const ovJson = await ovRes.json()
      if (ovJson.success) setOverview(ovJson.data)
      const tkJson = await tkRes.json()
      if (tkJson.success) setTeamTasks(tkJson.data as TeamTask[])
    } catch {
      /* keep stale data on silent refresh failure */
    }
  }, [])

  /* ---- URL-driven status filter tabs ---- */

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("status")
    if (q === "dismissed" || q === "all") setStatusFilter(q)
  }, [])

  const selectTab = useCallback((t: StatusFilter) => {
    setStatusFilter(t)
    const params = new URLSearchParams(window.location.search)
    params.set("status", t)
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast({ title: "Recomputed", description: "AI workspace refreshed from live data." })
  }, [load, toast])

  /* ---- derived live analytics (deterministic heuristics) ---- */

  const activeSprint = overview?.activeSprint ?? null

  const burndownAnalysis = useMemo(
    () => (overview ? analyzeBurndown(overview.burndown, activeSprint?.daysLeft ?? 0, activeSprint?.totalPoints ?? 0) : null),
    [overview, activeSprint],
  )

  const projection = useMemo(
    () => (overview ? buildProjection(overview.burndown, burndownAnalysis, activeSprint?.daysLeft ?? 0) : []),
    [overview, burndownAnalysis, activeSprint],
  )

  const velocityHistory = useMemo(() => {
    const completed = sprintRows
      .filter((s) => s.status === "completed")
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    return completed.slice(-6).map((s) => ({
      name: s.name.replace(/\s+/g, " ").slice(0, 14),
      completed: s.donePoints > 0 ? s.donePoints : s.completed,
    }))
  }, [sprintRows])

  const velocityForecast = useMemo(() => {
    const last3 = velocityHistory.slice(-3).map((v) => v.completed)
    if (last3.length === 0) return null
    const mean = last3.reduce((a, b) => a + b, 0) / last3.length
    const sd = stddev(last3)
    return { mean: Math.round(mean * 10) / 10, std: Math.round(sd * 10) / 10, low: Math.max(0, Math.round(mean - sd)), high: Math.round(mean + sd), samples: last3.length }
  }, [velocityHistory])

  const health = useMemo(() => {
    if (!overview) return null
    const progressScore = clamp(overview.kpis.sprintProgressPct, 0, 100)
    const blockedScore = clamp(100 - overview.kpis.blockedTasks * 15, 0, 100)
    const variance =
      burndownAnalysis && (overview.activeSprint?.totalPoints ?? 0) > 0
        ? Math.abs(burndownAnalysis.lastActual - burndownAnalysis.lastIdeal) / (overview.activeSprint?.totalPoints ?? 1)
        : 0
    const burndownScore = clamp(100 - variance * 250, 0, 100)
    const happinessScore = clamp(overview.kpis.teamHappiness, 0, 100)
    const parts = [
      { label: "Sprint progress", weight: 0.3, value: Math.round(progressScore) },
      { label: "Blocked-task penalty", weight: 0.25, value: Math.round(blockedScore) },
      { label: "Burndown vs ideal", weight: 0.25, value: Math.round(burndownScore) },
      { label: "Team happiness", weight: 0.2, value: Math.round(happinessScore) },
    ]
    const score = Math.round(parts.reduce((a, p) => a + p.weight * p.value, 0))
    return { score, parts }
  }, [overview, burndownAnalysis])

  const openTasks = useMemo(() => teamTasks.filter((t) => t.status !== "done"), [teamTasks])

  const reassignMoves = useMemo<ReassignMove[]>(() => {
    if (!overview) return []
    const rows = overview.workload.filter((w) => w.id != null)
    if (rows.length < 2) return []
    const loads = new Map<number, number>(rows.map((w) => [w.id, w.openPoints]))
    const names = new Map<number, string>(rows.map((w) => [w.id, w.name]))
    const moves: ReassignMove[] = []
    const moved = new Set<number>()
    for (let iter = 0; iter < 6; iter++) {
      let fromId = -1
      let maxLoad = -Infinity
      loads.forEach((v, id) => {
        if (v > maxLoad) {
          maxLoad = v
          fromId = id
        }
      })
      let toId = -1
      let minLoad = Infinity
      loads.forEach((v, id) => {
        if (id !== fromId && v < minLoad) {
          minLoad = v
          toId = id
        }
      })
      if (fromId < 0 || toId < 0 || maxLoad - minLoad < 8) break
      const candidates = openTasks
        .filter((t) => t.assigneeId === fromId && !moved.has(t.id))
        .sort(
          (a, b) =>
            (b.status === "todo" ? 1 : 0) - (a.status === "todo" ? 1 : 0) ||
            (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) ||
            a.storyPoints - b.storyPoints,
        )
      const targetDelta = (maxLoad - minLoad) / 2
      let sum = 0
      const picks: TeamTask[] = []
      for (const c of candidates.slice(0, 4)) {
        picks.push(c)
        sum += c.storyPoints
        if (sum >= targetDelta) break
      }
      if (picks.length === 0 || sum < 3) break
      for (const p of picks) {
        moved.add(p.id)
        moves.push({ taskId: p.id, taskTitle: p.title, points: p.storyPoints, fromId, fromName: names.get(fromId) ?? "?", toId, toName: names.get(toId) ?? "?" })
      }
      loads.set(fromId, maxLoad - sum)
      loads.set(toId, minLoad + sum)
      if ((loads.get(fromId) ?? 0) - (loads.get(toId) ?? 0) < 8) break
    }
    return moves.slice(0, 6)
  }, [overview, openTasks])

  const atRiskTasks = useMemo(() => {
    const today = dayStart(new Date())
    const flagged: { task: TeamTask; reasons: string[] }[] = []
    for (const t of openTasks) {
      const reasons: string[] = []
      if (t.status === "blocked") reasons.push("blocked")
      if (t.dueDate && new Date(`${String(t.dueDate).slice(0, 10)}T00:00:00`) < today) reasons.push("overdue")
      if (t.storyPoints >= 8 && (t.priority === "urgent" || t.priority === "high")) reasons.push("high effort + priority")
      const age = taskAgeDays(t)
      if (age !== null && age > 14 && t.status !== "done") reasons.push(`idle ${Math.round(age)}d`)
      if (reasons.length > 0) flagged.push({ task: t, reasons })
    }
    return flagged.sort((a, b) => b.reasons.length - a.reasons.length || b.task.storyPoints - a.task.storyPoints).slice(0, 15)
  }, [openTasks])

  const eventLoad = useMemo(() => {
    const weekAhead = new Date(Date.now() + 7 * 86_400_000)
    const upcoming = (overview?.events ?? []).filter((e) => new Date(e.startTime) <= weekAhead)
    const pto = upcoming.filter((e) => isPtoEvent(e.eventType))
    const meetings = upcoming.filter((e) => !isPtoEvent(e.eventType))
    return { upcoming, pto, meetings }
  }, [overview])

  /* ---- recommendation rules (all deterministic, from live data) ---- */

  const memberName = useCallback(
    (id: number | null) => (id == null ? "Unassigned" : overview?.workload.find((w) => w.id === id)?.name ?? `Member #${id}`),
    [overview],
  )

  const impactFor = useCallback(
    (taskIds: number[], extra?: string): ImpactPreview => {
      const byId = new Map(teamTasks.map((t) => [t.id, t]))
      const tasks = taskIds
        .map((id) => byId.get(id))
        .filter((t): t is TeamTask => Boolean(t))
        .map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, storyPoints: t.storyPoints, assigneeName: memberName(t.assigneeId) }))
      const members = [...new Set(tasks.map((t) => t.assigneeName))]
      return { tasks, members, extra }
    },
    [teamTasks, memberName],
  )

  const recommendations = useMemo<Recommendation[]>(() => {
    if (!overview) return []
    const recs: Recommendation[] = []
    const sprintTaskPool = activeSprint ? openTasks.filter((t) => t.sprintId === activeSprint.id) : openTasks

    // Rule 1 — burndown slope flatter than ideal ⇒ descope.
    if (activeSprint && burndownAnalysis) {
      const a = burndownAnalysis
      const burnRate = a.actualSlope < 0 ? Math.abs(a.actualSlope) : 0
      const needRate = Math.abs(a.idealSlope)
      if (a.atRisk && a.shortfall >= 1) {
        const shortfall = Math.ceil(a.shortfall)
        const descopables = sprintTaskPool
          .filter((t) => t.priority === "low" || t.priority === "medium")
          .sort((x, y) => (PRIORITY_RANK[x.priority] ?? 2) - (PRIORITY_RANK[y.priority] ?? 2) || y.storyPoints - x.storyPoints)
        const picks: TeamTask[] = []
        let sum = 0
        for (const t of descopables) {
          if (sum >= shortfall) break
          picks.push(t)
          sum += t.storyPoints
        }
        recs.push({
          key: `rec-overrun-${activeSprint.id}`,
          type: "risk_alert",
          severity: "critical",
          title: `${activeSprint.name} at risk of overrun`,
          description: `Current burn rate is ${burnRate.toFixed(1)} pts/day vs the ideal ${needRate.toFixed(1)} pts/day. At this pace ~${shortfall} point(s) remain unburnt at sprint end. Recommend descoping ${sum} pts (${picks.length} task${picks.length === 1 ? "" : "s"}) to protect the commitment.`,
          confidence: clamp(50 + shortfall * 4, 50, 95),
          impact: impactFor(
            picks.map((p) => p.id),
            `Descope target: ${sum} pts (shortfall ~${shortfall} pts). Ideal line says the team should be at ${a.lastIdeal} pts today; actual is ${a.lastActual} pts.`,
          ),
          taskIds: picks.map((p) => p.id),
        })
      }
    }

    // Rule 2 — workload imbalance ⇒ rebalance suggestion.
    if (overview.workload.length >= 2) {
      const rows = overview.workload.filter((w) => w.id != null)
      const loads = rows.map((w) => w.openPoints)
      const max = Math.max(...loads)
      const min = Math.min(...loads)
      const maxW = rows.find((w) => w.openPoints === max)
      const minW = rows.find((w) => w.openPoints === min)
      if (maxW && minW && maxW.id !== minW.id && max - min >= 8) {
        recs.push({
          key: "rec-workload",
          type: "team_insight",
          severity: "warning",
          title: "Workload is imbalanced across the team",
          description: `${maxW.name} carries ${max} open points while ${minW.name} has ${min} (gap ${max - min}). Rebalancing ${reassignMoves.reduce((a, m) => a + m.points, 0) || "a few"} pts via the moves below brings the sprint back within a safe band.`,
          confidence: clamp(55 + (max - min) * 2, 55, 95),
          impact: impactFor(
            reassignMoves.map((m) => m.taskId),
            `Suggested moves: ${reassignMoves.map((m) => `${m.taskTitle} (${m.points}pt) ${m.fromName} → ${m.toName}`).join("; ") || "open the rebalancer panel below"}.`,
          ),
          taskIds: reassignMoves.map((m) => m.taskId),
        })
      }
    }

    // Rule 3 — velocity drop vs 3-sprint average.
    if (velocityForecast && velocityForecast.samples >= 2) {
      const last = velocityHistory[velocityHistory.length - 1]?.completed ?? 0
      const priorAvg = velocityHistory.slice(-4, -1).map((v) => v.completed)
      if (priorAvg.length >= 2) {
        const prior = priorAvg.reduce((a, b) => a + b, 0) / priorAvg.length
        const delta = prior > 0 ? Math.round(((last - prior) / prior) * 100) : 0
        if (delta <= -15) {
          recs.push({
            key: "rec-velocity-drop",
            type: "risk_alert",
            severity: "warning",
            title: `Velocity dropped ${Math.abs(delta)}% below the 3-sprint average`,
            description: `Last completed sprint delivered ${last} pts vs a trailing average of ${prior.toFixed(1)} pts. Plan the next sprint around ${Math.round(prior * 0.9)}–${velocityForecast.high} pts and split remaining epics into smaller increments.`,
            confidence: clamp(50 + Math.abs(delta), 50, 92),
            impact: impactFor([], `Velocity series: ${velocityHistory.map((v) => `${v.name}=${v.completed}`).join(", ")}.`),
            taskIds: [],
          })
        }
      }
    }

    // Rule 4 — over-commitment vs proven velocity band.
    if (activeSprint && velocityForecast && velocityForecast.samples >= 2) {
      const headroom = activeSprint.totalPoints - activeSprint.donePoints
      if (activeSprint.totalPoints > velocityForecast.high + 2) {
        recs.push({
          key: `rec-overcommit-${activeSprint.id}`,
          type: "sprint_planning",
          severity: "warning",
          title: `${activeSprint.name} is committed above the velocity band`,
          description: `Commitment is ${activeSprint.totalPoints} pts but the team's proven velocity (last ${velocityForecast.samples} sprints) is ${velocityForecast.low}–${velocityForecast.high} pts (avg ${velocityForecast.mean}). Either descope ~${activeSprint.totalPoints - velocityForecast.high} pts or add capacity before day 3.`,
          confidence: clamp(55 + (activeSprint.totalPoints - velocityForecast.high) * 3, 55, 90),
          impact: impactFor(
            sprintTaskPool.sort((a, b) => b.storyPoints - a.storyPoints).slice(0, 3).map((t) => t.id),
            `Remaining scope is ${headroom} pts across ${activeSprint.taskCount} tasks.`,
          ),
          taskIds: sprintTaskPool.slice(0, 3).map((t) => t.id),
        })
      } else if (velocityForecast.high - activeSprint.totalPoints >= 5) {
        const backlog = teamTasks
          .filter((t) => t.sprintId == null && t.status !== "done")
          .sort((a, b) => a.storyPoints - b.storyPoints)
        const picks: TeamTask[] = []
        let sum = 0
        const head = velocityForecast.high - activeSprint.totalPoints
        for (const t of backlog) {
          if (sum + t.storyPoints > head) break
          picks.push(t)
          sum += t.storyPoints
          if (sum >= head * 0.6) break
        }
        recs.push({
          key: `rec-headroom-${activeSprint.id}`,
          type: "opportunity",
          severity: "opportunity",
          title: "Velocity headroom available",
          description: `Proven velocity tops out at ${velocityForecast.high} pts but ${activeSprint.name} only commits ${activeSprint.totalPoints} pts (~${head} pts of headroom). Pull ${sum} pts from the backlog: ${picks.map((p) => p.title).join(", ") || "no small backlog items found"}.`,
          confidence: clamp(50 + head * 2, 50, 85),
          impact: impactFor(picks.map((p) => p.id), `Backlog candidates listed above; each fits the ${head} pt gap.`),
          taskIds: picks.map((p) => p.id),
        })
      }
    }

    // Rule 5 — blocked-task owner pattern.
    const blocked = openTasks.filter((t) => t.status === "blocked")
    if (blocked.length > 0) {
      const byOwner = new Map<number | null, TeamTask[]>()
      blocked.forEach((t) => {
        const list = byOwner.get(t.assigneeId ?? null) ?? []
        list.push(t)
        byOwner.set(t.assigneeId ?? null, list)
      })
      const [topOwner, topList] = [...byOwner.entries()].sort((a, b) => b[1].length - a[1].length)[0]
      const cap = activeSprint?.totalPoints ?? Math.max(1, sumOf(openTasks))
      recs.push({
        key: "rec-blocked",
        type: "risk_alert",
        severity: "critical",
        title: `${blocked.length} blocked task${blocked.length === 1 ? "" : "s"} draining sprint capacity`,
        description: topList.length >= 2
          ? `${blocked.length} tasks (${sumOf(blocked)} pts ≈ ${Math.round((sumOf(blocked) / cap) * 100)}% of the sprint) are blocked; ${memberName(topOwner)} alone holds ${topList.length}. Book an unblock session on: ${topList.map((t) => t.title).join(", ")}.`
          : `${blocked.length} tasks (${sumOf(blocked)} pts ≈ ${Math.round((sumOf(blocked) / cap) * 100)}% of the sprint) are blocked: ${blocked.map((t) => t.title).join(", ")}. Route each to a daily unblock check.`,
        confidence: clamp(60 + sumOf(blocked), 60, 95),
        impact: impactFor(blocked.map((t) => t.id), `Blocked points: ${sumOf(blocked)} of ${cap} committed pts.`),
        taskIds: blocked.map((t) => t.id),
      })
    }

    // Rule 6 — meeting + PTO load this week.
    if (eventLoad.upcoming.length > 0 && (eventLoad.meetings.length >= 5 || eventLoad.pto.length > 0)) {
      const meetingDays = Math.min(5, eventLoad.meetings.length)
      recs.push({
        key: "rec-load",
        type: "team_insight",
        severity: "info",
        title: "Heavy meeting/PTO load this week",
        description: `${eventLoad.meetings.length} meeting${eventLoad.meetings.length === 1 ? "" : "s"} and ${eventLoad.pto.length} PTO/leave event${eventLoad.pto.length === 1 ? "" : "s"} land in the next 7 days. That is roughly ${meetingDays} day${meetingDays === 1 ? "" : "s"} of calendar load — protect focus time or shave scope by ~${meetingDays * 2} pts.`,
        confidence: clamp(50 + eventLoad.upcoming.length * 3, 50, 80),
        impact: impactFor(
          [],
          [
            ...eventLoad.meetings.slice(0, 4).map((e) => `📅 ${e.title} (${e.eventType})`),
            ...eventLoad.pto.slice(0, 4).map((e) => `🏖 ${e.title} (${e.eventType})`),
          ].join(" · "),
        ),
        taskIds: [],
      })
    }

    // Rule 7 — stale blocked items (aged > 10 days).
    const stale = blocked.filter((t) => {
      const age = taskAgeDays(t)
      return age !== null && age > 10
    })
    if (stale.length > 0) {
      recs.push({
        key: "rec-stale",
        type: "risk_alert",
        severity: "warning",
        title: "Blocked items are ageing out",
        description: `${stale.length} blocked task${stale.length === 1 ? "" : "s"} haven't moved in over 10 days (${stale.map((t) => `${t.title} — ${memberName(t.assigneeId)}`).join("; ")}). Escalate or cut them before they distort the forecast.`,
        confidence: 72,
        impact: impactFor(stale.map((t) => t.id)),
        taskIds: stale.map((t) => t.id),
      })
    }

    return recs
  }, [overview, activeSprint, burndownAnalysis, openTasks, teamTasks, reassignMoves, velocityForecast, velocityHistory, eventLoad, impactFor, memberName])

  /* ---- merged grid for the tabs ---- */

  const gridItems = useMemo<GridItem[]>(() => {
    const dbItems: GridItem[] = insights
      .filter((i) => (statusFilter === "active" ? i.status === "active" : statusFilter === "dismissed" ? i.status === "dismissed" : true))
      .map((i) => ({ kind: "db", id: `db-${i.id}`, insight: i, confidence: insightConfidence(i), severity: insightSeverity(i) }))
    const recItems: GridItem[] =
      statusFilter === "dismissed"
        ? []
        : recommendations
            .filter((r) => !appliedRecKeys.has(r.key) && !dismissedRecKeys.has(r.key) && !deletedRecKeys.has(r.key))
            .map((r) => ({ kind: "rec", id: r.key, rec: r, confidence: r.confidence, severity: r.severity }))
    return [...dbItems, ...recItems].sort((a, b) => b.confidence - a.confidence)
  }, [insights, recommendations, statusFilter, appliedRecKeys, dismissedRecKeys, deletedRecKeys])

  const dismissedInsights = useMemo(() => insights.filter((i) => i.status === "dismissed"), [insights])
  const aiNotifs = useMemo(() => notifs.filter((n) => n.type === "ai"), [notifs])

  /* ---- mutation handlers ---- */

  const logAutomation = useCallback(async (title: string, body: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "ai", title, body, link: "/dashboard/ai-scrum-master" }),
      })
      const json = await res.json().catch(() => null)
      if (json?.notification) setNotifs((prev) => [json.notification as NotifRow, ...prev])
    } catch {
      /* automation log is best-effort */
    }
  }, [])

  const patchInsight = useCallback(
    async (id: number, status: "active" | "dismissed" | "resolved", busyKey: string, verb: string) => {
      const prev = insights
      setInsights((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)))
      setBusy(busyKey)
      try {
        const res = await fetch(`/api/ai-insights/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        })
        const json = await res.json().catch(() => null)
        if (!json?.success) throw new Error(json?.message ?? `Failed to ${verb}`)
        setInsights((rows) => rows.map((r) => (r.id === id ? { ...(json.data as InsightRow) } : r)))
        toast({ title: `Insight ${verb}`, description: prev.find((p) => p.id === id)?.title ?? `#${id}` })
        void logAutomation(`Insight ${verb}`, prev.find((p) => p.id === id)?.title ?? `Insight #${id}`)
      } catch (err) {
        setInsights(prev)
        toast({ variant: "destructive", title: "Insight", description: (err as Error).message })
      } finally {
        setBusy(null)
      }
    },
    [insights, toast, logAutomation],
  )

  const deleteInsight = useCallback(
    async (id: number) => {
      const prev = insights
      setInsights((rows) => rows.filter((r) => r.id !== id))
      setConfirmDeleteKey(null)
      setBusy(`del-${id}`)
      try {
        const res = await fetch(`/api/ai-insights/${id}`, { method: "DELETE", credentials: "include" })
        const json = await res.json().catch(() => null)
        if (!json?.success) throw new Error(json?.message ?? "Delete failed")
        toast({ title: "Insight deleted" })
        void logAutomation("Insight deleted", prev.find((p) => p.id === id)?.title ?? `Insight #${id}`)
        setDetail(null)
      } catch (err) {
        setInsights(prev)
        toast({ variant: "destructive", title: "Insight", description: (err as Error).message })
      } finally {
        setBusy(null)
      }
    },
    [insights, toast, logAutomation],
  )

  const applyRec = useCallback(
    async (rec: Recommendation) => {
      const sprintId = activeSprint?.id ?? sprintRows[0]?.id ?? null
      if (sprintId == null) {
        toast({ variant: "destructive", title: "Apply", description: "No sprint found to attach the recommendation to." })
        return
      }
      setBusy(rec.key)
      try {
        const res = await fetch("/api/dashboard/ai-recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sprintId,
            type: rec.type,
            title: rec.title,
            description: rec.description,
            taskIds: rec.taskIds,
          }),
        })
        const json = await res.json().catch(() => null)
        if (!json?.success) throw new Error(json?.error ?? "Failed to record recommendation")
        setAppliedRecKeys((s) => new Set(s).add(rec.key))
        setDetail(null)
        const listRes = await fetch("/api/ai-insights")
        const listJson = await listRes.json().catch(() => null)
        if (listJson?.success) setInsights(listJson.data as InsightRow[])
        toast({ title: "Recommendation applied", description: "Stored as an AI insight on your dashboard." })
        void logAutomation("Recommendation applied", rec.title)
      } catch (err) {
        toast({ variant: "destructive", title: "Apply", description: (err as Error).message })
      } finally {
        setBusy(null)
      }
    },
    [activeSprint, sprintRows, toast, logAutomation],
  )

  const quickFixTask = useCallback(
    async (task: TeamTask, status: string, busyKey: string) => {
      const prev = teamTasks
      setTeamTasks((rows) => rows.map((r) => (r.id === task.id ? { ...r, status } : r)))
      setBusy(busyKey)
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        })
        const json = await res.json().catch(() => null)
        if (!json?.success) throw new Error(json?.message ?? "Update failed")
        toast({ title: "Quick fix applied", description: `${task.title} → ${STATUS_LABEL[status] ?? status}` })
        void reloadQuiet()
      } catch (err) {
        setTeamTasks(prev)
        toast({ variant: "destructive", title: "Task", description: (err as Error).message })
      } finally {
        setBusy(null)
      }
    },
    [teamTasks, toast, reloadQuiet],
  )

  const reassign = useCallback(
    async (move: ReassignMove) => {
      const prev = teamTasks
      setTeamTasks((rows) => rows.map((r) => (r.id === move.taskId ? { ...r, assigneeId: move.toId } : r)))
      setBusy(`move-${move.taskId}`)
      try {
        const res = await fetch(`/api/tasks/${move.taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ assigneeId: move.toId }),
        })
        const json = await res.json().catch(() => null)
        if (!json?.success) throw new Error(json?.message ?? "Reassign failed")
        setAppliedActions((s) => ({ ...s, "rec-workload": [...(s["rec-workload"] ?? []), move.taskId] }))
        toast({ title: "Reassigned", description: `${move.taskTitle} → ${move.toName}` })
        void reloadQuiet()
        void logAutomation("Task rebalanced", `${move.taskTitle}: ${move.fromName} → ${move.toName}`)
      } catch (err) {
        setTeamTasks(prev)
        toast({ variant: "destructive", title: "Rebalance", description: (err as Error).message })
      } finally {
        setBusy(null)
      }
    },
    [teamTasks, toast, reloadQuiet, logAutomation],
  )

  const markNotifRead = useCallback(
    async (n: NotifRow) => {
      if (n.isRead) return
      setNotifs((rows) => rows.map((r) => (r.id === n.id ? { ...r, isRead: true } : r)))
      try {
        await fetch(`/api/notifications/${n.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isRead: true }),
        })
      } catch {
        setNotifs((rows) => rows.map((r) => (r.id === n.id ? { ...r, isRead: false } : r)))
      }
    },
    [],
  )

  const markAllAiRead = useCallback(async () => {
    const unread = aiNotifs.filter((n) => !n.isRead)
    if (unread.length === 0) return
    setNotifs((rows) => rows.map((r) => (r.type === "ai" ? { ...r, isRead: true } : r)))
    await Promise.allSettled(
      unread.map((n) =>
        fetch(`/api/notifications/${n.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isRead: true }),
        }),
      ),
    )
    toast({ title: "Automation log marked read" })
  }, [aiNotifs, toast])

  /* ---- briefing callouts ---- */

  const briefing = useMemo(() => {
    if (!overview) return []
    const items: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }[] = []
    const a = burndownAnalysis
    if (a && activeSprint) {
      const burnRate = a.actualSlope < 0 ? Math.abs(a.actualSlope) : 0
      const needRate = Math.abs(a.idealSlope)
      const ratio = needRate > 0 ? Math.round((burnRate / needRate) * 100) : 100
      items.push({
        icon: <BarChart3 className="h-4 w-4" />,
        label: "Burndown pace",
        value: `${ratio}% of ideal`,
        detail: a.atRisk
          ? `Slower than ideal — ~${Math.ceil(a.shortfall)} pts projected to spill past ${activeSprint.endDate}.`
          : `On or above the ideal slope; projection lands inside the sprint.`,
        tone: a.atRisk ? "text-amber-600" : "text-emerald-600",
      })
    } else {
      items.push({ icon: <BarChart3 className="h-4 w-4" />, label: "Burndown pace", value: "n/a", detail: "Needs at least two measured burndown points.", tone: "text-muted-foreground" })
    }
    const v = velocityForecast
    const last = velocityHistory[velocityHistory.length - 1]?.completed ?? null
    if (v && last !== null) {
      const delta = v.mean > 0 ? Math.round(((last - v.mean) / v.mean) * 100) : 0
      items.push({
        icon: delta < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />,
        label: "Velocity delta",
        value: `${delta >= 0 ? "+" : ""}${delta}% vs 3-sprint avg`,
        detail: `Last sprint ${last} pts vs avg ${v.mean} ± ${v.std}. Next planning target: ${v.low}–${v.high} pts.`,
        tone: delta <= -15 ? "text-red-500" : delta >= 5 ? "text-emerald-600" : "text-muted-foreground",
      })
    } else {
      items.push({ icon: <TrendingUp className="h-4 w-4" />, label: "Velocity delta", value: "n/a", detail: "Complete a sprint to build the baseline.", tone: "text-muted-foreground" })
    }
    const rows = overview.workload.filter((w) => w.id != null)
    if (rows.length >= 2) {
      const loads = rows.map((w) => w.openPoints)
      const max = Math.max(...loads)
      const min = Math.min(...loads)
      const maxW = rows.find((w) => w.openPoints === max)
      const minW = rows.find((w) => w.openPoints === min)
      items.push({
        icon: <Scale className="h-4 w-4" />,
        label: "Load spread",
        value: `${max - min} pts gap`,
        detail: `${maxW?.name} at ${max} open pts vs ${minW?.name} at ${min} — ${reassignMoves.length} rebalance move${reassignMoves.length === 1 ? "" : "s"} suggested.`,
        tone: max - min >= 8 ? "text-amber-600" : "text-emerald-600",
      })
    } else {
      items.push({ icon: <Scale className="h-4 w-4" />, label: "Load spread", value: "n/a", detail: "Team workload unavailable.", tone: "text-muted-foreground" })
    }
    return items
  }, [overview, burndownAnalysis, activeSprint, velocityForecast, velocityHistory, reassignMoves])

  /* ---- render ---- */

  if (loading && !overview) {
    return (
      <div className="space-y-6 p-4 md:p-6" aria-busy="true" aria-label="Loading AI Scrum Master">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
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
        <p className="text-sm text-muted-foreground">Couldn&apos;t reach the dashboard APIs. Your session may have expired.</p>
        <Button onClick={load}>Retry</Button>
      </div>
    )
  }

  const workloadMax = Math.max(1, ...overview.workload.map((w) => w.openPoints))
  const velocityBands = velocityHistory.map((v) => ({
    ...v,
    belowBand: velocityForecast ? v.completed < velocityForecast.low : false,
  }))

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header + refresh + status tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Brain className="h-5 w-5 text-primary" /> AI Scrum Master
          </h1>
          <p className="text-sm text-muted-foreground">
            Deterministic heuristics over live sprint data — no LLM guessing.
            {activeSprint ? ` Watching ${activeSprint.name} · ${activeSprint.daysLeft}d left.` : " No active sprint."}
          </p>
        </div>
        <div role="tablist" aria-label="Insight status filter" className="flex items-center gap-1 rounded-md border p-0.5">
          {(["active", "dismissed", "all"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={statusFilter === t ? "secondary" : "ghost"}
              className={cn("h-7 px-3 text-xs capitalize", statusFilter === t && "font-semibold")}
              role="tab"
              aria-selected={statusFilter === t}
              onClick={() => selectTab(t)}
            >
              {t === "active"
                ? `Active (${gridItems.filter((g) => g.kind === "rec" || g.insight.status === "active").length})`
                : t === "dismissed"
                  ? `Dismissed (${dismissedInsights.length})`
                  : `All (${insights.length + recommendations.length})`}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing} aria-label="Refresh AI workspace data">
          <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* 2 — AI briefing: three computed risk callouts */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Bot className="h-4 w-4" /> Today&apos;s AI briefing
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {briefing.map((b) => (
              <div key={b.label} className="rounded-lg border bg-background/60 p-3">
                <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", b.tone)}>
                  {b.icon}
                  {b.label}
                </div>
                <p className={cn("mt-1 text-lg font-semibold", b.tone)}>{b.value}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{b.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3 — Sprint health score gauge with the formula shown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Sprint health score" icon={<Gauge className="h-4 w-4" />}>
          {health ? (
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-5">
              <svg width="150" height="92" viewBox="0 0 150 92" role="img" aria-label={`Sprint health ${health.score} out of 100`}>
                <path d="M15 85 A 60 60 0 0 1 135 85" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />
                <path
                  d="M15 85 A 60 60 0 0 1 135 85"
                  fill="none"
                  stroke={health.score >= 70 ? "hsl(var(--chart-pine))" : health.score >= 45 ? "hsl(var(--chart-clay))" : "hsl(var(--destructive))"}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(health.score / 100) * 188.5} 188.5`}
                />
                <text x="75" y="72" textAnchor="middle" className="fill-current text-2xl font-bold tabular-nums">
                  {health.score}
                </text>
              </svg>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  health = Σ (weight × subscore) over live sprint signals
                </p>
                {health.parts.map((p) => (
                  <div key={p.label}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {p.label} <span className="tabular-nums">×{p.weight}</span>
                      </span>
                      <span className="font-medium tabular-nums">{p.value}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.value}%`, background: p.value >= 70 ? "hsl(var(--chart-pine))" : p.value >= 45 ? "hsl(var(--chart-clay))" : "hsl(var(--destructive))" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyNote>Health needs sprint + workload data.</EmptyNote>
          )}
        </SectionCard>

        {/* 4 — Meeting / PTO load hint */}
        <SectionCard title="Meeting & PTO load (next 7 days)" icon={<CalendarClock className="h-4 w-4" />}>
          {eventLoad.upcoming.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-2">
                  <p className="text-xl font-semibold tabular-nums">{eventLoad.meetings.length}</p>
                  <p className="text-[11px] text-muted-foreground">meetings</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xl font-semibold tabular-nums text-[hsl(var(--chart-clay))]">{eventLoad.pto.length}</p>
                  <p className="text-[11px] text-muted-foreground">PTO / leave</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xl font-semibold tabular-nums">
                    {activeSprint ? Math.round((Math.min(5, eventLoad.meetings.length) / Math.max(1, activeSprint.daysLeft)) * 100) : 0}%
                  </p>
                  <p className="text-[11px] text-muted-foreground">of days booked</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {eventLoad.meetings.length >= 5
                  ? `Rule: ${eventLoad.meetings.length} meetings ≈ ${Math.min(5, eventLoad.meetings.length)} focus-day(s) lost — expect burn-rate drag; the descope recommendation above covers it.`
                  : `Rule: calendar load looks manageable (${eventLoad.meetings.length} meetings). ${eventLoad.pto.length > 0 ? `Watch reduced capacity from ${eventLoad.pto.length} absence event(s).` : "No absences booked."}`}
              </p>
              <ul className="divide-y text-xs">
                {eventLoad.upcoming.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                    <span className={cn("shrink-0 capitalize", isPtoEvent(e.eventType) ? "text-[hsl(var(--chart-clay))]" : "text-muted-foreground")}>{e.eventType}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyNote>Nothing scheduled in the next 7 days — clear runway.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 5 — Active insights + computed recommendations grid */}
      <section aria-label="AI insights and recommendations">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Insights & recommendations
            <span className="text-xs font-normal text-muted-foreground">
              ({statusFilter === "dismissed" ? "dismissed archive in section below" : `${recommendations.filter((r) => !appliedRecKeys.has(r.key) && !dismissedRecKeys.has(r.key) && !deletedRecKeys.has(r.key)).length} computed by rule engine`})
            </span>
          </h2>
        </div>
        {gridItems.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {gridItems.map((item) => {
              const title = item.kind === "db" ? item.insight.title : item.rec.title
              const description = item.kind === "db" ? item.insight.description : item.rec.description
              const type = item.kind === "db" ? item.insight.type : item.rec.type
              const created = item.kind === "db" ? item.insight.createdAt : null
              const isBusy = busy === item.id || busy === `del-${item.kind === "db" ? item.insight.id : 0}`
              return (
                <Card key={item.id} className={cn("flex flex-col transition-colors hover:border-primary/40", item.severity !== "info" && `border-l-2 ${SEVERITY_TONE[item.severity].split(" ")[0]}`)}>
                  <CardContent className={cn("flex flex-1 flex-col gap-2 py-3", isBusy && "opacity-60")}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="max-w-40 truncate capitalize text-[10px]">
                        {type.replace(/_/g, " ")}
                      </Badge>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {item.kind === "rec" && <Badge variant="outline" className="text-[9px]">rule</Badge>}
                        <span>conf {item.confidence}%</span>
                        {created && <span>· {relativeTime(created)}</span>}
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-snug">{title}</p>
                    <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">{description}</p>
                    <Progress value={item.confidence} className="h-1" aria-label={`Confidence ${item.confidence} percent`} />
                    <div className="flex flex-wrap justify-end gap-1 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDetail(item)} aria-label={`Open details for ${title}`}>
                        Details
                      </Button>
                      {item.kind === "db" && item.insight.status !== "resolved" ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy === `db-${item.insight.id}`} onClick={() => void patchInsight(item.insight.id, "resolved", `db-${item.insight.id}`, "applied")}>
                          Apply
                        </Button>
                      ) : item.kind === "rec" ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-600" disabled={busy === item.rec.key} onClick={() => void applyRec(item.rec)}>
                          Apply
                        </Button>
                      ) : null}
                      {item.kind === "db" && item.insight.status !== "dismissed" ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy === `db-${item.insight.id}`} onClick={() => void patchInsight(item.insight.id, "dismissed", `db-${item.insight.id}`, "dismissed")}>
                          Dismiss
                        </Button>
                      ) : item.kind === "rec" ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDismissedRecKeys((s) => new Set(s).add(item.rec.key))}>
                          Dismiss
                        </Button>
                      ) : null}
                      {item.kind === "db" && item.insight.status === "dismissed" ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void patchInsight(item.insight.id, "active", `db-${item.insight.id}`, "restored")}>
                          Restore
                        </Button>
                      ) : null}
                      {confirmDeleteKey === item.id ? (
                        <>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => (item.kind === "db" ? void deleteInsight(item.insight.id) : setDeletedRecKeys((s) => new Set(s).add(item.rec.key)))}>
                            Confirm delete
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDeleteKey(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-red-500"
                          onClick={() => setConfirmDeleteKey(item.id)}
                          aria-label={`Delete ${title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <EmptyNote>
              {statusFilter === "dismissed"
                ? "Nothing dismissed yet — dismissed insights and rules land here."
                : "No active insights. The rule engine watches burndown, velocity, workload, blockers and the calendar after each refresh."}
            </EmptyNote>
          </Card>
        )}
      </section>

      {/* 6 — Burndown projection chart */}
      <SectionCard
        title="Burndown projection (actual · ideal · AI-projected)"
        icon={<BarChart3 className="h-4 w-4" />}
        action={
          burndownAnalysis ? (
            <Badge variant={burndownAnalysis.atRisk ? "destructive" : "outline"} className="text-[10px]">
              {burndownAnalysis.atRisk ? `~${Math.ceil(burndownAnalysis.shortfall)} pts spill risk` : "on pace"}
            </Badge>
          ) : null
        }
      >
        {projection.length > 1 ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} minTickGap={24} />
                <YAxis tick={AXIS} width={30} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="hsl(var(--chart-stone))" strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="actual" name="Actual remaining" stroke="hsl(var(--chart-pine))" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="projected" name="AI projection" stroke="hsl(var(--chart-clay))" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Projection = last measured remaining ({burndownAnalysis?.lastActual ?? "–"} pts) + recent daily slope ({burndownAnalysis ? burndownAnalysis.actualSlope.toFixed(1) : "–"} pts/day) extended to sprint end.
            </p>
          </>
        ) : (
          <EmptyNote>Need at least two measured burndown days to project.</EmptyNote>
        )}
      </SectionCard>

      {/* 7 — Velocity forecast */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Velocity forecast" icon={<Swords className="h-4 w-4" />}>
          {velocityHistory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={velocityBands}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={AXIS} />
                  <YAxis tick={AXIS} width={26} />
                  <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="completed" name="Completed pts" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]}>
                    {velocityBands.map((v, i) => (
                      <Cell key={i} fill={v.belowBand ? "hsl(var(--destructive))" : "hsl(var(--chart-pine))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {velocityForecast && (
                <p className="mt-2 rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
                  μ of last {velocityForecast.samples} completed sprint{velocityForecast.samples === 1 ? "" : "s"} = {velocityForecast.mean} pts · σ = {velocityForecast.std} → planning band{" "}
                  <span className="font-semibold text-foreground">
                    {velocityForecast.low}–{velocityForecast.high} pts</span>
                  {activeSprint ? ` · current commitment ${activeSprint.totalPoints} pts` : ""}.
                </p>
              )}
            </>
          ) : (
            <EmptyNote>Complete your first sprint to build a velocity baseline.</EmptyNote>
          )}
        </SectionCard>

        {/* 8 — Workload rebalancer */}
        <SectionCard
          title="Workload rebalancer"
          icon={<Users className="h-4 w-4" />}
          action={reassignMoves.length > 0 ? <Badge variant="secondary" className="text-[10px]">{reassignMoves.length} move(s)</Badge> : null}
        >
          <div className="space-y-2">
            {overview.workload.slice(0, 6).map((w) => (
              <div key={w.id} className="flex items-center gap-2.5">
                <AvatarCircle name={w.name} avatar={w.avatar} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate font-medium">{w.name}</span>
                    <span className="tabular-nums text-muted-foreground">{w.openPoints} pts</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", w.openPoints / workloadMax > 0.8 ? "bg-[hsl(var(--destructive))]" : "bg-[hsl(var(--chart-pine))]")}
                      style={{ width: `${Math.round((w.openPoints / workloadMax) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Separator />
            {reassignMoves.length > 0 ? (
              <ul className="space-y-1.5">
                {reassignMoves.map((m) => {
                  const done = (appliedActions["rec-workload"] ?? []).includes(m.taskId)
                  return (
                    <li key={m.taskId} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{m.taskTitle}</span> ({m.points}pt) {m.fromName} → {m.toName}
                        {done && <span className="ml-1 text-emerald-600">· moved</span>}
                      </span>
                      <Button size="sm" variant={done ? "ghost" : "outline"} className="h-6 shrink-0 px-2 text-[11px]" disabled={done || busy === `move-${m.taskId}`} onClick={() => void reassign(m)} aria-label={`Reassign ${m.taskTitle} to ${m.toName}`}>
                        {done ? <><Check className="mr-1 h-3 w-3" /> Done</> : <><ArrowLeftRight className="mr-1 h-3 w-3" /> Reassign</>}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyNote>Load is balanced within the 8-pt band — no moves needed.</EmptyNote>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 9 — At-risk tasks with quick fixes */}
      <SectionCard
        title={`At-risk tasks (${atRiskTasks.length})`}
        icon={<ShieldAlert className="h-4 w-4" />}
        action={<span className="text-[11px] text-muted-foreground">blocked · overdue · high-effort · stale</span>}
      >
        {atRiskTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Task</th>
                  <th className="px-2 py-2 font-medium">Assignee</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Priority</th>
                  <th className="px-2 py-2 font-medium">Pts</th>
                  <th className="px-2 py-2 font-medium">Why flagged</th>
                  <th className="px-2 py-2 text-right font-medium">Quick fix</th>
                </tr>
              </thead>
              <tbody>
                {atRiskTasks.map(({ task, reasons }) => (
                  <tr key={task.id} className={cn("border-b last:border-0", busy === `fix-${task.id}` && "opacity-60")}>
                    <td className="max-w-52 px-2 py-2">
                      <span className="block truncate font-medium">{task.title}</span>
                      {task.dueDate && <span className="text-[10px] text-muted-foreground">due {String(task.dueDate).slice(0, 10)}</span>}
                    </td>
                    <td className="px-2 py-2 text-xs">{memberName(task.assigneeId)}</td>
                    <td className="px-2 py-2"><StatusPill status={task.status} /></td>
                    <td className="px-2 py-2"><PriorityPill priority={task.priority} /></td>
                    <td className="px-2 py-2 tabular-nums">{task.storyPoints}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {reasons.map((r) => (
                          <Badge key={r} variant={r === "blocked" ? "destructive" : "secondary"} className="text-[9px]">{r}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex gap-1">
                        {task.status === "blocked" && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy === `fix-${task.id}`} onClick={() => void quickFixTask(task, "todo", `fix-${task.id}`)}>
                            Unblock
                          </Button>
                        )}
                        {task.status === "todo" && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy === `fix-${task.id}`} onClick={() => void quickFixTask(task, "in_progress", `fix-${task.id}`)}>
                            Start
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-emerald-600" disabled={busy === `fix-${task.id}`} onClick={() => void quickFixTask(task, "done", `fix-${task.id}`)}>
                          Done
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>No blocked, overdue or stale-heavy tasks. The rules re-check on every refresh.</EmptyNote>
        )}
      </SectionCard>

      {/* 10 — Automation history (ai notifications) */}
      <SectionCard
        title="Automation log"
        icon={<History className="h-4 w-4" />}
        action={
          aiNotifs.some((n) => !n.isRead) ? (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllAiRead}>
              Mark all read
            </Button>
          ) : null
        }
      >
        {aiNotifs.length > 0 ? (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {aiNotifs.map((n) => (
              <li key={n.id}>
                <button
                  className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60", !n.isRead && "bg-muted/40")}
                  onClick={() => void markNotifRead(n)}
                  aria-label={`${n.isRead ? "Read" : "Unread"}: ${n.title}`}
                >
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-muted-foreground">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(n.createdAt ?? new Date().toISOString())}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>Applies, dismissals and rebalances get logged here as &quot;ai&quot; notifications.</EmptyNote>
        )}
      </SectionCard>

      {/* 11 — Dismissed archive with restore */}
      <SectionCard title={`Dismissed archive (${dismissedInsights.length})`} icon={<Archive className="h-4 w-4" />}>
        {dismissedInsights.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Insight</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Dismissed</th>
                  <th className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dismissedInsights.map((i) => (
                  <tr key={i.id} className={cn("border-b last:border-0", busy === `db-${i.id}` && "opacity-60")}>
                    <td className="max-w-64 px-2 py-2">
                      <span className="block truncate font-medium">{i.title}</span>
                      <span className="line-clamp-1 text-[11px] text-muted-foreground">{i.description}</span>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{i.type.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-2 py-2 text-[11px] text-muted-foreground">{i.createdAt ? relativeTime(i.createdAt) : "—"}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => void patchInsight(i.id, "active", `db-${i.id}`, "restored")} disabled={busy === `db-${i.id}`}>
                          <Undo2 className="mr-1 h-3 w-3" /> Restore
                        </Button>
                        {confirmDeleteKey === `db-${i.id}` ? (
                          <>
                            <Button size="sm" variant="destructive" className="h-6 px-2 text-[11px]" onClick={() => void deleteInsight(i.id)}>
                              Confirm delete
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setConfirmDeleteKey(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-red-500" onClick={() => setConfirmDeleteKey(`db-${i.id}`)} aria-label={`Delete ${i.title}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>Dismissed insights are archived here with one-click restore.</EmptyNote>
        )}
      </SectionCard>

      {/* 12 — Detail dialog with impact preview from live data */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="pr-8 text-base">
                {detail.kind === "db" ? detail.insight.title : detail.rec.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {detail.kind === "db" ? `Stored insight #${detail.insight.id} · ${detail.insight.status}` : "Computed rule recommendation"} · confidence {detail.confidence}% ·{" "}
                {detail.kind === "db" && detail.insight.createdAt ? relativeTime(detail.insight.createdAt) : "live data"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize text-[10px]">
                  {(detail.kind === "db" ? detail.insight.type : detail.rec.type).replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] capitalize", SEVERITY_TONE[detail.severity])}>{detail.severity}</Badge>
                {detail.kind === "rec" && appliedActions["rec-workload"] && <Badge variant="outline" className="text-[10px]">{appliedActions["rec-workload"].length} move(s) executed</Badge>}
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {detail.kind === "db" ? detail.insight.description : detail.rec.description}
              </p>
              <Separator />
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Impact preview
                </p>
                {detail.kind === "rec" ? (
                  <div className="space-y-2">
                    {detail.rec.impact.tasks.length > 0 ? (
                      <ul className="divide-y rounded-md border">
                        {detail.rec.impact.tasks.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                            <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              <StatusPill status={t.status} />
                              <PriorityPill priority={t.priority} />
                              <span className="tabular-nums text-muted-foreground">{t.storyPoints}pt</span>
                              <span className="text-muted-foreground">{t.assigneeName}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No individual tasks are pinned to this rule — it acts on sprint-level signals.</p>
                    )}
                    {detail.rec.impact.members.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Members touched: <span className="font-medium text-foreground">{detail.rec.impact.members.join(", ")}</span>
                      </p>
                    )}
                    {detail.rec.impact.extra && <p className="rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">{detail.rec.impact.extra}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Context from live data{activeSprint ? ` — ${activeSprint.name}: ${activeSprint.donePoints}/${activeSprint.totalPoints} pts, ${activeSprint.daysLeft}d left` : ""}.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Team members referenced:{" "}
                      <span className="font-medium text-foreground">
                        {overview.workload.filter((w) => detail.insight.description.includes(w.name) || detail.insight.title.includes(w.name)).map((w) => w.name).join(", ") || "none named"}
                      </span>
                    </p>
                    {(() => {
                      const mentioned = teamTasks.filter((t) => detail.insight.description.includes(t.title))
                      return mentioned.length > 0 ? (
                        <ul className="divide-y rounded-md border">
                          {mentioned.slice(0, 6).map((t) => (
                            <li key={t.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                              <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                              <StatusPill status={t.status} />
                            </li>
                          ))}
                        </ul>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="flex flex-wrap gap-2">
              {detail.kind === "db" ? (
                <>
                  {confirmDeleteKey === `db-${detail.insight.id}` ? (
                    <Button size="sm" variant="destructive" onClick={() => void deleteInsight(detail.insight.id)}>
                      Confirm delete
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setConfirmDeleteKey(`db-${detail.insight.id}`)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                  {detail.insight.status !== "dismissed" ? (
                    <Button size="sm" variant="outline" onClick={() => void patchInsight(detail.insight.id, "dismissed", `db-${detail.insight.id}`, "dismissed")}>
                      Dismiss
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void patchInsight(detail.insight.id, "active", `db-${detail.insight.id}`, "restored")}>
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Restore
                    </Button>
                  )}
                  {detail.insight.status === "active" && (
                    <Button size="sm" onClick={() => void patchInsight(detail.insight.id, "resolved", `db-${detail.insight.id}`, "applied")}>
                      Apply
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setDeletedRecKeys((s) => new Set(s).add(detail.rec.key)); setDetail(null) }}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDismissedRecKeys((s) => new Set(s).add(detail.rec.key)); setDetail(null) }}>
                    Dismiss
                  </Button>
                  <Button size="sm" onClick={() => void applyRec(detail.rec)} disabled={busy === detail.rec.key}>
                    <Zap className="mr-1 h-3.5 w-3.5" /> Apply recommendation
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Footer methodology note */}
      <p className="pb-4 text-center text-[10px] text-muted-foreground">
        Heuristics: burndown slope vs ideal · velocity μ±σ of last 3 completed sprints · workload max/min gap ≥ 8 pts · blocked-owner clustering · stale &gt; 10d · 7-day meeting/PTO calendar load.
      </p>
    </div>
  )
}

function sumOf(tasks: { storyPoints: number }[]): number {
  return tasks.reduce((a, t) => a + t.storyPoints, 0)
}
