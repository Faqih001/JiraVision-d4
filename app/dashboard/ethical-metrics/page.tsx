"use client"

/* --------------------------------------------------------------------------
 * Ethical AI metrics workspace.
 *
 * Every number on this page comes from one of two places:
 *   1. live rows  — tasks / users / wellbeing_metrics, recomputed on the server
 *                    by GET /api/ethical-metrics (deterministic formulas, no LLM)
 *   2. stored snapshots — the ethical_metrics table, created by "Record snapshot"
 *
 * The priority-fairness matrix is built here in the client from
 * GET /api/tasks because it re-ranks the same rows by member for a different
 * question (who owns urgent/high work).
 * -------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Link from "next/link"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  History,
  Minus,
  Pencil,
  RefreshCw,
  Scale,
  Settings2,
  ShieldAlert,
  Sliders,
  Sparkles,
  Swords,
  Trash2,
  Users2,
  XCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
import { useToast } from "@/hooks/use-toast"
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  PRIORITIES,
  PRIORITY_COLOR,
  SectionCard,
  STATUS_COLOR,
  StatusPill,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------- types */

type TaskRef = { id: number; title: string; status: string; priority: string; storyPoints: number; dueDate: string | null }

type MemberLoad = {
  userId: number
  name: string
  avatar: string | null
  role: string
  jobTitle: string | null
  department: string | null
  seniorityTier: 1 | 2 | 3
  seniorityLabel: string
  openTasks: number
  openPoints: number
  urgentPoints: number
  highPriorityPoints: number
  doneTasks: number
  donePoints: number
  sharePct: number
  expectedSharePct: number
  highPrioritySharePct: number
  workloadRatio: number | null
  overloaded: boolean
  underloaded: boolean
  latestOvertimeHours: number | null
  latestWellbeing: number | null
  latestStress: number | null
  latestMood: string | null
  latestWorkloadLabel: string | null
  lastWellbeingDate: string | null
  openTaskRefs: TaskRef[]
}

type EthicsScores = {
  workloadBalance: number | null
  deiTaskDistribution: number | null
  payEquity: number | null
  overtimeCompliance: number | null
  composite: number | null
}

type EthicsAlert = { key: string; label: string; score: number | null; threshold: number; breached: boolean; detail: string }

type ChecklistItem = { id: string; label: string; requirement: string; passed: boolean | null; detail: string }

type LiveMetrics = {
  computedAt: string
  memberCount: number
  openTaskCount: number
  totalOpenPoints: number
  totalHighPriorityPoints: number
  meanOpenPoints: number
  medianOpenPoints: number
  scores: EthicsScores
  members: MemberLoad[]
  alerts: EthicsAlert[]
  checklist: ChecklistItem[]
  wellbeingCoveragePct: number
  lastSnapshotDate: string | null
  snapshotStale: boolean
  unmeasurable: string[]
}

type Recommendation = {
  id: string
  title: string
  description: string
  kind: "rebalance" | "priority_fairness" | "overtime" | "load_equity" | "stale_snapshot"
  severity: "critical" | "warning" | "suggestion"
  status: "pending" | "applied" | "dismissed"
  appliedAt: string | null
  summary: string | null
  subjectUserId: number | null
  subjectName: string | null
  impact: string
  action: { type: "reassign_tasks" | "advisory" | "record_snapshot"; taskIds: number[]; fromUserId: number | null; toUserId: number | null; pointsToMove: number }
}

type SnapshotRow = {
  id: number
  date: string
  payEquityScore: number
  workloadBalanceScore: number
  deiTaskDistributionScore: number
  overtimeCompliance: number
  compositeScore: number
  label: string | null
  note: string | null
  source: "recorded" | "edited" | "seed"
  createdAt: string | null
}

type EthicsConfig = {
  maxOvertimeHours: number
  overloadRatio: number
  dispersionCeiling: number
  priorityConcentrationAlertPct: number
  snapshotStaleDays: number
  enablePayEquityTracking: boolean
  enableWorkloadBalanceTracking: boolean
  enableDeiTaskDistributionTracking: boolean
  enableOvertimeMonitoring: boolean
  alertThresholds: {
    payEquityAlertThreshold: number
    workloadBalanceAlertThreshold: number
    deiTaskDistributionAlertThreshold: number
    overtimeAlertThreshold: number
  }
}

type EthicsResponse = {
  live: LiveMetrics
  snapshots: SnapshotRow[]
  recommendations: Recommendation[]
  config: EthicsConfig
  formulas: Record<string, string>
  latest: SnapshotRow | null
  session: { userId: number; name: string }
}

type OverviewEthics = {
  latest: { date: string; payEquity: number; workloadBalance: number; deiDistribution: number; overtimeCompliance: number } | null
  deltas: { payEquity: number; workloadBalance: number; deiDistribution: number; overtimeCompliance: number } | null
  trend: { date: string; workloadBalance: number; overtimeCompliance: number }[]
}

type NotificationRow = {
  id: number
  type: string
  title: string
  body: string | null
  createdAt: string | null
  metadata: Record<string, unknown> | null
}

type TaskLite = {
  id: number
  title: string
  status: string
  priority: string
  storyPoints: number
  assigneeId: number | null
}

/* ----------------------------------------------------------------- helpers */

const DAY = "day"
const COLORS = {
  pine: "hsl(var(--chart-pine))",
  stone: "hsl(var(--chart-stone))",
  clay: "hsl(var(--chart-clay))",
  moss: "hsl(var(--chart-moss))",
  destructive: "hsl(var(--destructive))",
}

const SEVERITY_COLOR: Record<Recommendation["severity"], string> = {
  critical: COLORS.destructive,
  warning: COLORS.clay,
  suggestion: COLORS.moss,
}

const KIND_LABEL: Record<Recommendation["kind"], string> = {
  rebalance: "Workload rebalance",
  priority_fairness: "Opportunity fairness",
  overtime: "Overtime limit",
  load_equity: "Band-load equity",
  stale_snapshot: "Snapshot cadence",
}

function firstName(name: string) {
  return name.split(" ")[0] ?? name
}

function fmt(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  return value.toFixed(digits)
}

function scoreColor(value: number | null, threshold: number): string {
  if (value === null) return "hsl(var(--muted-foreground))"
  if (value < threshold) return COLORS.destructive
  if (value < threshold + 8) return COLORS.clay
  return COLORS.pine
}

function dayString(value: unknown): string {
  if (!value) return ""
  const s = String(value)
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s
}

/** Deterministic week-over-week delta for one stored score column. */
function snapshotDelta(snapshots: SnapshotRow[], pick: (s: SnapshotRow) => number): number | null {
  if (snapshots.length < 2) return null
  return pick(snapshots[0]) - pick(snapshots[1])
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

/* ------------------------------------------------------------- sub-blocks */

function DeltaArrow({ delta, suffix }: { delta: number | null; suffix?: string }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" />
        no prior snapshot
      </span>
    )
  }
  const positive = delta > 0
  const flat = delta === 0
  const color = flat ? "text-muted-foreground" : positive ? "text-emerald-600" : "text-red-500"
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium tabular-nums ${color}`}>
      {flat ? <Minus className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
      {flat ? "no change" : `${positive ? "+" : ""}${delta}`}
      {suffix}
    </span>
  )
}

function KpiCard({
  label,
  score,
  delta,
  threshold,
  hint,
  icon,
}: {
  label: string
  score: number | null
  delta: number | null
  threshold: number
  hint: string
  icon: React.ReactNode
}) {
  const color = scoreColor(score, threshold)
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span style={{ color }}>{icon}</span>
            {label}
          </span>
          <span className="text-[10px] tabular-nums">floor {threshold}</span>
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums" style={{ color }}>
            {score === null ? "—" : score}
          </span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </p>
        <div className="mt-0.5">
          <DeltaArrow delta={delta} />
        </div>
        <Progress
          value={score ?? 0}
          className="mt-2 h-1.5"
          indicatorStyle={{ backgroundColor: color }}
        />
        <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function MemberRow({ member, mean }: { member: MemberLoad; mean: number }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs">
      <AvatarCircle name={member.name} avatar={member.avatar} size={22} />
      <span className="w-28 truncate font-medium">{firstName(member.name)}</span>
      <span
        className="tabular-nums"
        style={{ color: member.overloaded ? COLORS.destructive : member.underloaded ? COLORS.stone : COLORS.pine }}
      >
        {member.openPoints} pts
      </span>
      <span className="text-muted-foreground">
        {member.workloadRatio === null ? "no load yet" : `${member.workloadRatio.toFixed(2)}x mean`}
      </span>
      {member.overloaded && (
        <Badge variant="outline" className="border-destructive/40 text-[10px] text-destructive">
          over {mean.toFixed(1)}
        </Badge>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- page */

export default function EthicalMetricsWorkspace() {
  const { toast } = useToast()

  const [ethics, setEthics] = useState<EthicsResponse | null>(null)
  const [overviewEthics, setOverviewEthics] = useState<OverviewEthics | null>(null)
  const [taskRows, setTaskRows] = useState<TaskLite[]>([])
  const [audit, setAudit] = useState<NotificationRow[]>([])

  const [loading, setLoading] = useState(true)
  const [auxLoading, setAuxLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const [recording, setRecording] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordLabel, setRecordLabel] = useState("")
  const [recordNote, setRecordNote] = useState("")

  const [busyRecId, setBusyRecId] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<SnapshotRow | null>(null)
  const [editForm, setEditForm] = useState({ date: "", label: "", note: "", payEquityScore: "", workloadBalanceScore: "", deiTaskDistributionScore: "", overtimeCompliance: "" })
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteRow, setDeleteRow] = useState<SnapshotRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [configDraft, setConfigDraft] = useState<EthicsConfig | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  const refreshing = loading || auxLoading

  /* ---- data ------------------------------------------------------------- */

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ethical-metrics?limit=12", { cache: "no-store" })
      const json = await readJson(res)
      if (!res.ok || json.success !== true) {
        throw new Error(String(json.message ?? json.error ?? `Request failed (${res.status})`))
      }
      setEthics(json.data as EthicsResponse)
    } catch (err) {
      setError((err as Error).message)
      toast({ variant: "destructive", title: "Ethical metrics", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadAux = useCallback(async () => {
    setAuxLoading(true)
    try {
      const [ovRes, tkRes, nfRes] = await Promise.all([
        fetch("/api/dashboard/overview", { cache: "no-store" }),
        fetch("/api/tasks?pageSize=200", { cache: "no-store" }),
        fetch("/api/notifications?limit=60", { cache: "no-store" }),
      ])
      const [ovJson, tkJson, nfJson] = await Promise.all([readJson(ovRes), readJson(tkRes), readJson(nfRes)])
      if (ovJson.success) {
        setOverviewEthics(((ovJson.data as { ethics?: OverviewEthics } | undefined)?.ethics) ?? null)
      }
      if (Array.isArray(tkJson.data)) {
        setTaskRows(
          (tkJson.data as Record<string, unknown>[]).map((t): TaskLite => ({
            id: Number(t.id),
            title: String(t.title ?? ""),
            status: String(t.status ?? "todo"),
            priority: String(t.priority ?? "medium"),
            storyPoints: Number(t.storyPoints ?? 0),
            assigneeId: t.assigneeId === null || t.assigneeId === undefined ? null : Number(t.assigneeId),
          })),
        )
      }
      if (Array.isArray(nfJson.items)) {
        setAudit(
          (nfJson.items as NotificationRow[]).filter((n) =>
            String(n.metadata?.link ?? "").includes("ethical-metrics"),
          ),
        )
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Ethical metrics", description: `Supporting data failed: ${(err as Error).message}` })
    } finally {
      setAuxLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadWorkspace()
    loadAux()
  }, [loadWorkspace, loadAux, reloadTick])

  useEffect(() => {
    if (ethics && !configDraft) setConfigDraft(ethics.config)
  }, [ethics, configDraft])

  /* ---- derived ---------------------------------------------------------- */

  const live = ethics?.live ?? null
  const snapshots = useMemo(() => ethics?.snapshots ?? [], [ethics])
  const recommendations = ethics?.recommendations ?? []
  const thresholds = ethics?.config.alertThresholds ?? null

  const deltas = useMemo(() => {
    const fromOverview =
      overviewEthics?.deltas && overviewEthics.latest?.date === dayString(snapshots[0]?.date) ? overviewEthics.deltas : null
    return {
      workloadBalance: fromOverview?.workloadBalance ?? snapshotDelta(snapshots, (s) => s.workloadBalanceScore),
      deiTaskDistribution: fromOverview?.deiDistribution ?? snapshotDelta(snapshots, (s) => s.deiTaskDistributionScore),
      payEquity: fromOverview?.payEquity ?? snapshotDelta(snapshots, (s) => s.payEquityScore),
      overtimeCompliance:
        fromOverview?.overtimeCompliance ?? snapshotDelta(snapshots, (s) => s.overtimeCompliance),
      composite: snapshotDelta(snapshots, (s) => s.compositeScore),
    }
  }, [overviewEthics, snapshots])

  const trendData = useMemo(
    () =>
      [...snapshots]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({
          date: s.date.slice(5),
          workloadBalance: s.workloadBalanceScore,
          deiTaskDistribution: s.deiTaskDistributionScore,
          payEquity: s.payEquityScore,
          overtimeCompliance: s.overtimeCompliance,
          composite: s.compositeScore,
        })),
    [snapshots],
  )

  const workloadData = useMemo(() => {
    if (!live) return []
    return [...live.members]
      .sort((a, b) => b.openPoints - a.openPoints)
      .map((m) => ({
        name: firstName(m.name),
        points: m.openPoints,
        mean: Number(live.meanOpenPoints.toFixed(1)),
        overloaded: m.overloaded,
        underloaded: m.underloaded,
      }))
  }, [live])

  /** Priority-fairness matrix, computed here from the raw task feed. */
  const matrix = useMemo(() => {
    if (!live) return []
    const open = taskRows.filter((t) => t.status !== "done")
    return live.members
      .map((m) => {
        const own = open.filter((t) => t.assigneeId === m.userId)
        const counts: Record<string, { n: number; pts: number }> = {}
        for (const p of PRIORITIES) counts[p] = { n: 0, pts: 0 }
        for (const t of own) {
          const bucket = counts[t.priority] ?? counts.medium
          bucket.n += 1
          bucket.pts += t.storyPoints
        }
        const highPts = counts.urgent.pts + counts.high.pts
        const totalPts = PRIORITIES.reduce((a, p) => a + counts[p].pts, 0)
        return {
          userId: m.userId,
          name: m.name,
          seniorityLabel: m.seniorityLabel,
          counts,
          highPts,
          totalPts,
          highSharePct: totalPts > 0 ? Math.round((highPts / totalPts) * 100) : 0,
        }
      })
      .sort((a, b) => b.highPts - a.highPts || b.totalPts - a.totalPts)
  }, [live, taskRows])

  const matrixHighTotal = useMemo(() => matrix.reduce((a, r) => a + r.highPts, 0), [matrix])

  const pendingRecs = recommendations.filter((r) => r.status === "pending")
  const resolvedRecs = recommendations.filter((r) => r.status !== "pending")
  const breached = live?.alerts.filter((a) => a.breached) ?? []

  /* ---- mutations -------------------------------------------------------- */

  async function handleRecordSnapshot() {
    setRecording(true)
    try {
      const res = await fetch("/api/ethical-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: recordLabel.trim() || undefined,
          note: recordNote.trim() || undefined,
        }),
      })
      const json = await readJson(res)
      if (!res.ok || json.success !== true) throw new Error(String(json.message ?? `Request failed (${res.status})`))
      const snapshot = (json.data as { snapshot: SnapshotRow }).snapshot
      toast({
        title: "Snapshot recorded",
        description: `${snapshot.date} · composite ${snapshot.compositeScore}/100. Dashboard headline scores now use this row.`,
      })
      setRecordOpen(false)
      setRecordLabel("")
      setRecordNote("")
      await Promise.all([loadWorkspace(), loadAux()])
    } catch (err) {
      toast({ variant: "destructive", title: "Could not record snapshot", description: (err as Error).message })
    } finally {
      setRecording(false)
    }
  }

  async function applyRecommendation(rec: Recommendation, action: "apply" | "dismiss") {
    setBusyRecId(rec.id)
    try {
      const res = await fetch("/api/ethical-metrics/apply-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: rec.id, ...(action === "dismiss" ? { action: "dismiss" } : {}) }),
      })
      const json = await readJson(res)
      if (!res.ok || json.success !== true) throw new Error(String(json.message ?? `Request failed (${res.status})`))
      const data = json.data as { movedTasks?: { taskId: number; title: string }[] } | undefined
      const moved = data?.movedTasks?.length ?? 0
      toast({
        title: action === "dismiss" ? "Recommendation dismissed" : "Recommendation applied",
        description:
          moved > 0
            ? `${moved} task(s) reassigned in the tasks table — the affected members were notified.`
            : String(json.message ?? "Done."),
      })
      await Promise.all([loadWorkspace(), loadAux()])
    } catch (err) {
      toast({ variant: "destructive", title: "Apply failed", description: (err as Error).message })
    } finally {
      setBusyRecId(null)
    }
  }

  function openEdit(row: SnapshotRow) {
    setEditRow(row)
    setEditForm({
      date: row.date,
      label: row.label ?? "",
      note: row.note ?? "",
      payEquityScore: String(row.payEquityScore),
      workloadBalanceScore: String(row.workloadBalanceScore),
      deiTaskDistributionScore: String(row.deiTaskDistributionScore),
      overtimeCompliance: String(row.overtimeCompliance),
    })
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!editRow) return
    const num = (v: string) => {
      const n = Number(v)
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null
    }
    const payload = {
      date: editForm.date,
      label: editForm.label,
      note: editForm.note,
      payEquityScore: num(editForm.payEquityScore),
      workloadBalanceScore: num(editForm.workloadBalanceScore),
      deiTaskDistributionScore: num(editForm.deiTaskDistributionScore),
      overtimeCompliance: num(editForm.overtimeCompliance),
    }
    if (Object.values(payload).some((v) => v === null)) {
      toast({ variant: "destructive", title: "Invalid score", description: "Each score must be a number between 0 and 100." })
      return
    }
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/ethical-metrics/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await readJson(res)
      if (!res.ok || json.success !== true) throw new Error(String(json.message ?? `Request failed (${res.status})`))
      toast({ title: "Snapshot updated", description: `History row #${editRow.id} now reflects the corrected scores.` })
      setEditOpen(false)
      await Promise.all([loadWorkspace(), loadAux()])
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: (err as Error).message })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteSnapshot() {
    if (!deleteRow) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/ethical-metrics/${deleteRow.id}`, { method: "DELETE" })
      const json = await readJson(res)
      if (!res.ok || json.success !== true) throw new Error(String(json.message ?? `Request failed (${res.status})`))
      toast({ title: "Snapshot deleted", description: `${deleteRow.label ?? deleteRow.date} removed from the history.` })
      setDeleteRow(null)
      await Promise.all([loadWorkspace(), loadAux()])
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed", description: (err as Error).message })
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveConfig() {
    if (!configDraft) return
    setSavingConfig(true)
    try {
      const res = await fetch("/api/ethical-metrics/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configDraft),
      })
      const json = await readJson(res)
      if (!res.ok || json.success !== true) throw new Error(String(json.message ?? json.error ?? `Request failed (${res.status})`))
      toast({ title: "Thresholds saved", description: "Alert floors and limits persisted; the workspace recomputed against them." })
      await Promise.all([loadWorkspace(), loadAux()])
    } catch (err) {
      toast({ variant: "destructive", title: "Could not save thresholds", description: (err as Error).message })
    } finally {
      setSavingConfig(false)
    }
  }

  /* ---- render ----------------------------------------------------------- */

  const memberById = useMemo(() => {
    const map = new Map<number, MemberLoad>()
    for (const m of live?.members ?? []) map.set(m.userId, m)
    return map
  }, [live])

  if (loading && !ethics) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error && !ethics) {
    return (
      <div className="p-4 md:p-6">
        <SectionCard title="Ethical metrics unavailable" icon={<ShieldAlert className="h-4 w-4 text-destructive" />}>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 1 — header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <Scale className="h-6 w-6" style={{ color: COLORS.pine }} />
            Ethical AI metrics
          </h1>
          <p className="text-sm text-muted-foreground">
            Workload balance, opportunity fairness and load-equity computed from live task rows — no model, no estimates.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {live ? `${live.memberCount} tracked members · ${live.openTaskCount} open tasks · ${live.totalOpenPoints} open points · recomputed ${relativeTime(live.computedAt)}` : "Loading computation…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Activity className="h-3 w-3" />
            composite {live?.scores.composite === null || live?.scores.composite === undefined ? "—" : live.scores.composite}/100
          </Badge>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setReloadTick((t) => t + 1)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="gap-1" onClick={() => setRecordOpen(true)}>
            <Bookmark className="h-4 w-4" />
            Record snapshot
          </Button>
        </div>
      </div>

      {/* 2 — threshold breach banner */}
      <section aria-label="Threshold breaches">
        {breached.length > 0 ? (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-col gap-2 pt-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium">{breached.length} ethical axis/band above alert threshold</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {breached.map((a) => (
                      <li key={a.key}>
                        {a.label}: {a.score === null ? "not measurable" : a.score} vs floor {a.threshold} — {a.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="#ethics-recommendations">See recommendations</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-2 pt-4 text-xs text-muted-foreground">
              <BadgeCheck className="h-4 w-4" style={{ color: COLORS.pine }} />
              {live
                ? "All measurable scores sit at or above their configured floors."
                : "Awaiting the first computation."}
            </CardContent>
          </Card>
        )}
      </section>

      {/* 3 — KPI strip */}
      <section aria-label="Key ethical indicators">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">This week&apos;s live scores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {live && thresholds ? (
            <>
              <KpiCard
                label="Workload balance"
                score={live.scores.workloadBalance}
                delta={deltas.workloadBalance}
                threshold={thresholds.workloadBalanceAlertThreshold}
                icon={<Users2 className="h-3.5 w-3.5" />}
                hint={`Open points spread across ${live.memberCount} members (mean ${live.meanOpenPoints.toFixed(1)} pts).`}
              />
              <KpiCard
                label="DEI distribution"
                score={live.scores.deiTaskDistribution}
                delta={deltas.deiTaskDistribution}
                threshold={thresholds.deiTaskDistributionAlertThreshold}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                hint={`Urgent/high points in flight: ${live.totalHighPriorityPoints}.`}
              />
              <KpiCard
                label="Pay-equity proxy"
                score={live.scores.payEquity}
                delta={deltas.payEquity}
                threshold={thresholds.payEquityAlertThreshold}
                icon={<Scale className="h-3.5 w-3.5" />}
                hint="Load vs seniority band. Schema stores no salary — proxy only."
              />
              <KpiCard
                label="Overtime compliance"
                score={live.scores.overtimeCompliance}
                delta={deltas.overtimeCompliance}
                threshold={ethics?.config.maxOvertimeHours ?? 0}
                icon={<Zap className="h-3.5 w-3.5" />}
                hint={`Members within the ${ethics?.config.maxOvertimeHours ?? 0}h weekly limit (${live.wellbeingCoveragePct}% check-in coverage).`}
              />
              <KpiCard
                label="Composite"
                score={live.scores.composite}
                delta={deltas.composite}
                threshold={snapshots[0]?.compositeScore ?? 0}
                icon={<Swords className="h-3.5 w-3.5" />}
                hint="Weighted mean of the measurable axes (.30/.25/.25/.20)."
              />
            </>
          ) : (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
          )}
        </div>
      </section>

      {/* 4 — live vs stored */}
      <SectionCard
        title="Live computation vs last recorded snapshot"
        icon={<History className="h-4 w-4" />}
        action={
          live?.snapshotStale ? (
            <Badge variant="outline" className="text-[10px]" style={{ color: COLORS.clay, borderColor: COLORS.clay }}>
              stale &gt; {ethics?.config.snapshotStaleDays ?? 7}d
            </Badge>
          ) : undefined
        }
      >
        {!live ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { key: "workloadBalance", label: "Workload", live: live.scores.workloadBalance, stored: snapshots[0]?.workloadBalanceScore ?? null, thr: thresholds?.workloadBalanceAlertThreshold ?? 0 },
                  { key: "dei", label: "DEI", live: live.scores.deiTaskDistribution, stored: snapshots[0]?.deiTaskDistributionScore ?? null, thr: thresholds?.deiTaskDistributionAlertThreshold ?? 0 },
                  { key: "pay", label: "Pay proxy", live: live.scores.payEquity, stored: snapshots[0]?.payEquityScore ?? null, thr: thresholds?.payEquityAlertThreshold ?? 0 },
                  { key: "ot", label: "Overtime", live: live.scores.overtimeCompliance, stored: snapshots[0]?.overtimeCompliance ?? null, thr: thresholds?.overtimeAlertThreshold ?? 0 },
                ] as const
              ).map((row) => (
                <div key={row.key} className="rounded-lg border p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
                  <p className="text-lg font-semibold tabular-nums" style={{ color: scoreColor(row.live, row.thr) }}>
                    {row.live === null ? "—" : row.live}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    stored {row.stored === null ? "—" : row.stored}
                    {row.stored !== null && row.live !== null && (row.live - row.stored !== 0 ? ` (${row.live - row.stored > 0 ? "+" : ""}${row.live - row.stored})` : "")}
                  </p>
                </div>
              ))}
            </div>
            {live.unmeasurable.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Not measurable right now: {live.unmeasurable.join(" · ")}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setRecordOpen(true)} disabled={recording}>
                <Bookmark className="h-4 w-4" />
                Record today&apos;s scores
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Last snapshot {live.lastSnapshotDate ?? "never"} · recording writes one <code className="rounded bg-muted px-1">ethical_metrics</code> row
                and notifies you.
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 5 — trend */}
      <SectionCard title={`Snapshot trend (${Math.min(snapshots.length, 12)} stored)`} icon={<Activity className="h-4 w-4" />}>
        {trendData.length < 2 ? (
          <EmptyNote>
            {trendData.length === 0
              ? "No snapshots stored yet — record one to start the trend line."
              : "One snapshot stored. Record a second to see the line move."}
          </EmptyNote>
        ) : (
          <ResponsiveContainer width="100%" height={240} aria-label="Ethical metrics snapshot trend">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} {...AXIS} />
              <YAxis domain={[0, 100]} width={32} tickLine={false} axisLine={false} {...AXIS} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="workloadBalance" name="Workload balance" stroke={COLORS.pine} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="deiTaskDistribution" name="DEI distribution" stroke={COLORS.moss} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="payEquity" name="Pay-equity proxy" stroke={COLORS.clay} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="overtimeCompliance" name="Overtime compliance" stroke={COLORS.stone} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">
          Stored rows from <code className="rounded bg-muted px-1">ethical_metrics</code>, oldest first. Dashed = overtime compliance.
        </p>
      </SectionCard>

      {/* 6 — workload balance bars */}
      <SectionCard title="Workload balance per member" icon={<Users2 className="h-4 w-4" />}>
        {!live ? (
          <Skeleton className="h-56 rounded-lg" />
        ) : workloadData.length === 0 ? (
          <EmptyNote>No members with assigned work to measure.</EmptyNote>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220} aria-label="Open story points per member">
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={54} {...AXIS} />
                <YAxis width={32} tickLine={false} axisLine={false} {...AXIS} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "color-mix(in srgb, hsl(var(--muted-foreground)) 8%, transparent)" }} />
                <ReferenceLine
                  y={Number(live.meanOpenPoints.toFixed(1))}
                  stroke={COLORS.stone}
                  strokeDasharray="4 4"
                  label={{ value: `mean ${live.meanOpenPoints.toFixed(1)}`, fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "insideTopRight" }}
                />
                <Bar dataKey="points" name="Open story points" radius={[4, 4, 0, 0]}>
                  {workloadData.map((d) => (
                    <Cell key={d.name} fill={d.overloaded ? COLORS.destructive : d.underloaded ? COLORS.stone : COLORS.pine} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Red = above {ethics?.config.overloadRatio ?? 1.5}x the mean ({live.meanOpenPoints.toFixed(1)} pts) · grey = below 0.7x · green = balanced.
              Median load {live.medianOpenPoints.toFixed(1)} pts.
            </p>
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border p-2">
              {live.members
                .slice()
                .sort((a, b) => b.openPoints - a.openPoints)
                .slice(0, 6)
                .map((m) => (
                  <MemberRow key={m.userId} member={m} mean={live.meanOpenPoints * (ethics?.config.overloadRatio ?? 1.5)} />
                ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* 7 — priority fairness matrix */}
      <SectionCard title="Priority-fairness matrix" icon={<Swords className="h-4 w-4" />} action={<Badge variant="outline" className="text-[10px]">from /api/tasks</Badge>}>
        {live === null ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : matrix.length === 0 ? (
          <EmptyNote>No members to line up against priorities.</EmptyNote>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <caption className="caption-bottom pt-0 text-[10px] text-muted-foreground">
                  Open tasks (count / story points) per member by priority. Top band shows who owns the high-visibility work.
                </caption>
                <thead>
                  <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-1.5 pr-2 font-medium">Member</th>
                    {PRIORITIES.map((p) => (
                      <th key={p} scope="col" className="px-1 py-1.5 text-center font-medium">
                        <span style={{ color: PRIORITY_COLOR[p] }}>{p}</span>
                      </th>
                    ))}
                    <th scope="col" className="px-1 py-1.5 text-center font-medium">High share</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.userId} className="border-b last:border-0">
                      <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                        <span className="flex items-center gap-1.5">
                          <AvatarCircle name={row.name} avatar={memberById.get(row.userId)?.avatar ?? null} size={18} />
                          <span className="truncate">{firstName(row.name)}</span>
                        </span>
                        <span className="block text-[10px] font-normal text-muted-foreground">{row.seniorityLabel}</span>
                      </th>
                      {PRIORITIES.map((p) => {
                        const cell = row.counts[p]
                        return (
                          <td key={p} className="px-1 py-1.5 text-center tabular-nums">
                            <span
                              className="inline-block min-w-12 rounded px-1.5 py-0.5"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${PRIORITY_COLOR[p]} ${Math.min(35, cell.pts * 2)}%, transparent)`,
                              }}
                            >
                              {cell.n}
                              <span className="text-muted-foreground">/{cell.pts}</span>
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-1 py-1.5 text-center tabular-nums">
                        <span style={{ color: row.highSharePct > (ethics?.config.priorityConcentrationAlertPct ?? 60) ? COLORS.destructive : COLORS.pine }}>
                          {matrixHighTotal > 0 ? `${Math.round((row.highPts / matrixHighTotal) * 100)}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Cells show <em>tasks/points</em>. Last column is each member&apos;s share of all open urgent+high points in this feed.
              Concentration above {ethics?.config.priorityConcentrationAlertPct ?? 60}% on one member feeds the DEI distribution score.
            </p>
          </>
        )}
      </SectionCard>

      {/* 8 — band / load equity */}
      <SectionCard title="Load vs seniority band" icon={<Scale className="h-4 w-4" />}>
        {!live || live.members.length === 0 ? (
          <EmptyNote>No members to band.</EmptyNote>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={190} aria-label="Actual versus band-expected load share">
              <BarChart
                data={[...live.members]
                  .sort((a, b) => b.sharePct - a.sharePct)
                  .map((m) => ({ name: firstName(m.name), actual: Math.round(m.sharePct), expected: Math.round(m.expectedSharePct), tier: m.seniorityTier }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={50} {...AXIS} />
                <YAxis width={32} unit="%" tickLine={false} axisLine={false} {...AXIS} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "color-mix(in srgb, hsl(var(--muted-foreground)) 8%, transparent)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="actual" name="Actual open-point share" fill={COLORS.moss} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expected" name="Band-expected share" fill={COLORS.stone} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Bands come from job title + role (junior 1.0x, mid 1.5x, senior/lead 2.0x expected load weight). The schema has no salary
              column, so this is the honest structural proxy that feeds the pay-equity score — read the methodology card below.
            </p>
          </>
        )}
      </SectionCard>

      {/* 9 — recommendations */}
      <section id="ethics-recommendations" aria-label="Recommendations">
        <SectionCard
          title="Recommendations"
          icon={<Sliders className="h-4 w-4" />}
          action={
            <Badge variant="outline" className="text-[10px]">
              {pendingRecs.length} open · computed from rows
            </Badge>
          }
        >
          {recommendations.length === 0 ? (
            <EmptyNote>No ethical imbalances detected in the current rows. Nothing to apply.</EmptyNote>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {[...pendingRecs, ...resolvedRecs].map((rec) => {
                const color = SEVERITY_COLOR[rec.severity]
                return (
                  <div key={rec.id} className="rounded-lg border p-3" style={{ borderLeft: `3px solid ${color}`, opacity: rec.status === "pending" ? 1 : 0.75 }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{KIND_LABEL[rec.kind]}</p>
                        <p className="text-sm font-medium">{rec.title}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                        {rec.severity}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{rec.description}</p>
                    <p className="mt-1.5 text-[11px] tabular-nums">
                      <span className="text-muted-foreground">Impact: </span>
                      {rec.impact}
                      {rec.action.type === "reassign_tasks" && ` · ${rec.action.taskIds.length} task id(s) queued`}
                    </p>
                    {rec.status !== "pending" && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {rec.status === "applied" ? "Applied" : "Dismissed"} {rec.appliedAt ? relativeTime(rec.appliedAt) : ""}
                        {rec.summary ? ` · ${rec.summary}` : ""}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rec.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={busyRecId === rec.id}
                            onClick={() => applyRecommendation(rec, "apply")}
                          >
                            {busyRecId === rec.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {rec.action.type === "reassign_tasks"
                              ? `Apply · reassign ${rec.action.taskIds.length}`
                              : rec.action.type === "record_snapshot"
                                ? "Apply · record snapshot"
                                : "Mark addressed"}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busyRecId === rec.id} onClick={() => applyRecommendation(rec, "dismiss")}>
                            Dismiss
                          </Button>
                          {rec.subjectUserId !== null && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/team?member=${rec.subjectUserId}`}>Open member</Link>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link href="/dashboard/tasks">Inspect tasks</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Applying a rebalance writes real changes: it updates <code className="rounded bg-muted px-1">tasks.assignee_id</code>, notifies the
            members who lose and gain work, and marks the recommendation done. Advisory items only record the decision.
          </p>
        </SectionCard>
      </section>

      {/* 10 — snapshot history */}
      <SectionCard
        title="Snapshot history"
        icon={<FileText className="h-4 w-4" />}
        action={<Badge variant="outline" className="text-[10px]">{snapshots.length} stored</Badge>}
      >
        {snapshots.length === 0 ? (
          <EmptyNote>No snapshots recorded yet.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <caption className="caption-bottom text-[10px] text-muted-foreground">
                One row per recorded snapshot. Editing the newest row also moves the dashboard headline scores.
              </caption>
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-1.5 pr-2 font-medium">Date</th>
                  <th scope="col" className="px-1 py-1.5 font-medium">Label</th>
                  <th scope="col" className="px-1 py-1.5 text-center font-medium">Workload</th>
                  <th scope="col" className="px-1 py-1.5 text-center font-medium">DEI</th>
                  <th scope="col" className="px-1 py-1.5 text-center font-medium">Pay proxy</th>
                  <th scope="col" className="px-1 py-1.5 text-center font-medium">Overtime</th>
                  <th scope="col" className="px-1 py-1.5 text-center font-medium">Composite</th>
                  <th scope="col" className="px-1 py-1.5 text-center font-medium">Source</th>
                  <th scope="col" className="w-20 py-1.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id} className="border-b align-top last:border-0">
                    <td className="py-1.5 pr-2 tabular-nums">{s.date}</td>
                    <td className="px-1 py-1.5">
                      <span className="font-medium">{s.label ?? <span className="text-muted-foreground">untitled</span>}</span>
                      {s.note && <span className="block text-[10px] text-muted-foreground">{s.note}</span>}
                    </td>
                    <td className="px-1 py-1.5 text-center tabular-nums">{s.workloadBalanceScore}</td>
                    <td className="px-1 py-1.5 text-center tabular-nums">{s.deiTaskDistributionScore}</td>
                    <td className="px-1 py-1.5 text-center tabular-nums">{s.payEquityScore}</td>
                    <td className="px-1 py-1.5 text-center tabular-nums">{s.overtimeCompliance}</td>
                    <td className="px-1 py-1.5 text-center font-semibold tabular-nums" style={{ color: scoreColor(s.compositeScore, thresholds?.payEquityAlertThreshold ?? 80) }}>
                      {s.compositeScore}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <span className="text-[10px] text-muted-foreground">{s.source}</span>
                    </td>
                    <td className="py-1.5 text-right">
                      <span className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)} aria-label={`Edit snapshot ${s.date}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteRow(s)} aria-label={`Delete snapshot ${s.date}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 11 — thresholds / config */}
      <SectionCard title="Alert thresholds & limits" icon={<Settings2 className="h-4 w-4" />} action={auxLoading && !configDraft ? <Skeleton className="h-4 w-16" /> : undefined}>
        {!configDraft ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveConfig()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  { key: "maxOvertimeHours", label: "Weekly overtime limit (h)", step: 0.5, hint: "hard compliance ceiling" },
                  { key: "overloadRatio", label: "Overload ratio (x mean pts)", step: 0.1, hint: "bars turn red past this" },
                  { key: "dispersionCeiling", label: "Dispersion ceiling (coefficient of variation)", step: 0.1, hint: "CV at which a score hits 0" },
                  { key: "priorityConcentrationAlertPct", label: "Priority concentration alert (%)", step: 1, hint: "one member's share of urgent/high" },
                  { key: "snapshotStaleDays", label: "Snapshot cadence (days)", step: 1, hint: "drives the staleness badge" },
                ] as const
              ).map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`cfg-${field.key}`} className="text-[11px]">
                    {field.label}
                  </Label>
                  <Input
                    id={`cfg-${field.key}`}
                    type="number"
                    step={field.step}
                    value={configDraft[field.key]}
                    onChange={(e) => setConfigDraft({ ...configDraft, [field.key]: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground">{field.hint}</p>
                </div>
              ))}
            </div>

            <fieldset>
              <legend className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Score floors (alert when below)
              </legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    { key: "workloadBalanceAlertThreshold", label: "Workload balance" },
                    { key: "deiTaskDistributionAlertThreshold", label: "DEI distribution" },
                    { key: "payEquityAlertThreshold", label: "Pay-equity proxy" },
                    { key: "overtimeAlertThreshold", label: "Overtime early warning (h)" },
                  ] as const
                ).map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label htmlFor={`thr-${field.key}`} className="text-[11px]">
                      {field.label}
                    </Label>
                    <Input
                      id={`thr-${field.key}`}
                      type="number"
                      step={1}
                      min={0}
                      max={100}
                      value={configDraft.alertThresholds[field.key]}
                      onChange={(e) =>
                        setConfigDraft({
                          ...configDraft,
                          alertThresholds: { ...configDraft.alertThresholds, [field.key]: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Tracked axes (disable to stop computing a score)
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    { key: "enableWorkloadBalanceTracking", label: "Workload balance" },
                    { key: "enableDeiTaskDistributionTracking", label: "DEI distribution" },
                    { key: "enablePayEquityTracking", label: "Pay-equity proxy" },
                    { key: "enableOvertimeMonitoring", label: "Overtime compliance" },
                  ] as const
                ).map((field) => (
                  <label key={field.key} htmlFor={`en-${field.key}`} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs">
                    <span>{field.label}</span>
                    <Switch
                      id={DAY + field.key}
                      checked={configDraft[field.key]}
                      onCheckedChange={(v) => setConfigDraft({ ...configDraft, [field.key]: v })}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" className="gap-1.5" disabled={savingConfig}>
                {savingConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                Save thresholds
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfigDraft(ethics.config)}>
                Reset to stored
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Persisted through <code className="rounded bg-muted px-1">/api/ethical-metrics/config</code> into your workspace
                preferences, so thresholds survive a reload.
              </p>
            </div>
          </form>
        )}
      </SectionCard>

      {/* 12 — compliance checklist */}
      <SectionCard
        title="Compliance checklist"
        icon={<ClipboardList className="h-4 w-4" />}
        action={
          live ? (
            <Badge variant="outline" className="text-[10px]" style={{ color: COLORS.pine }}>
              {live.checklist.filter((c) => c.passed === true).length}/{live.checklist.length} passing
            </Badge>
          ) : undefined
        }
      >
        {!live ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : (
          <ul className="space-y-2">
            {live.checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                <span className="mt-0.5 shrink-0">
                  {item.passed === true ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.pine }} />
                  ) : item.passed === false ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <span className="text-xs">
                  <span className="font-medium">{item.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{item.requirement}</span>
                  <span className="block text-[11px] text-muted-foreground">{item.detail}</span>
                </span>
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {item.passed === null ? "n/a" : item.passed ? "pass" : "fail"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 13 — audit feed */}
      <SectionCard
        title="Audit feed"
        icon={<History className="h-4 w-4" />}
        action={<Badge variant="outline" className="text-[10px]">{audit.length} event(s)</Badge>}
      >
        {audit.length === 0 ? (
          <EmptyNote>
            No ethical metrics events yet. Recording a snapshot, saving thresholds or applying a recommendation writes one here.
          </EmptyNote>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {audit.map((n) => {
              const action = String(n.metadata?.action ?? "event")
              return (
                <li key={n.id} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR.done }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{n.body}</span>}
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {n.createdAt ? relativeTime(n.createdAt) : "unknown"} · <code className="rounded bg-muted px-1">{action}</code>
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {/* 14 — methodology */}
      <SectionCard
        title="Methodology — how each score is computed"
        icon={<HelpCircle className="h-4 w-4" />}
        action={<Badge variant="outline" className="text-[10px]">deterministic · no LLM</Badge>}
      >
        <div className="space-y-2 text-[11px] leading-relaxed">
          {(
            [
              { label: "Workload balance", key: "workloadBalance", color: COLORS.pine },
              { label: "DEI task distribution", key: "deiTaskDistribution", color: COLORS.moss },
              { label: "Pay-equity proxy", key: "payEquity", color: COLORS.clay },
              { label: "Overtime compliance", key: "overtimeCompliance", color: COLORS.stone },
              { label: "Composite", key: "composite", color: COLORS.destructive },
            ] as const
          ).map((row) => (
            <p key={row.key} className="rounded-lg border p-2.5">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: row.color }} />
              <span className="font-medium">{row.label}: </span>
              <span className="text-muted-foreground">
                {ethics?.formulas?.[row.key] ?? "Formula served with the payload."}
              </span>
            </p>
          ))}
          <p className="rounded-lg bg-muted/50 p-2.5 text-muted-foreground">
            Honesty notes: (1) there is no salary column in this database, so the pay-equity figure is a structural load-vs-band proxy and
            must not be reported as a pay-ratio audit; (2) the DEI score measures opportunity distribution by priority mix only — the schema
            stores no protected-class attributes, so nothing about identity is inferred or scored; (3) scores read 0-100 relative to the
            thresholds you set above and are meaningless without the member counts shown next to them; (4) every value on this page is
            recomputed from <code className="rounded bg-background px-1">tasks</code>, <code className="rounded bg-background px-1">users</code>{" "}
            and <code className="rounded bg-background px-1">wellbeing_metrics</code> rows on each request — nothing is generated by a model.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/team-wellbeing">Team wellbeing</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/tasks">Task board</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* --- dialogs ------------------------------------------------------- */}

      <Dialog open={recordOpen} onOpenChange={(open) => !recording && setRecordOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record today&apos;s ethical scores</DialogTitle>
            <DialogDescription>
              Writes one <code className="rounded bg-muted px-1">ethical_metrics</code> row using the values computed just now
              {live ? ` (${live.members.length} members, ${live.totalOpenPoints} open points)` : ""} and drops a system notification
              into the audit feed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ethics-snapshot-label">Snapshot label</Label>
              <Input
                id="ethics-snapshot-label"
                placeholder={new Date().toISOString().slice(0, 10)}
                value={recordLabel}
                onChange={(e) => setRecordLabel(e.target.value)}
                maxLength={120}
              />
              <p className="text-[11px] text-muted-foreground">Optional. Defaults to the snapshot date. Stored in your workspace preferences.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ethics-snapshot-note">Note</Label>
              <Textarea
                id="ethics-snapshot-note"
                rows={3}
                placeholder="Why this snapshot matters (e.g. post-rebalance check)"
                value={recordNote}
                onChange={(e) => setRecordNote(e.target.value)}
                maxLength={500}
              />
            </div>
            {live && (
              <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                {[
                  { l: "Workload", v: live.scores.workloadBalance },
                  { l: "DEI", v: live.scores.deiTaskDistribution },
                  { l: "Pay proxy", v: live.scores.payEquity },
                  { l: "Overtime", v: live.scores.overtimeCompliance },
                ].map((c) => (
                  <div key={c.l} className="rounded border p-1.5 text-center">
                    <p className="text-muted-foreground">{c.l}</p>
                    <p className="font-semibold tabular-nums">{c.v === null ? "—" : c.v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRecordOpen(false)} disabled={recording}>
              Cancel
            </Button>
            <Button onClick={handleRecordSnapshot} disabled={recording}>
              {recording ? "Recording…" : "Record snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => !savingEdit && setEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit snapshot #{editRow?.id}</DialogTitle>
            <DialogDescription>
              Correct a stored row when the recorded numbers no longer match what you want on the record. The dashboard headline and
              week-over-week deltas read these values.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-date">Snapshot date</Label>
              <Input id="edit-date" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            {(
              [
                { key: "workloadBalanceScore", label: "Workload balance" },
                { key: "deiTaskDistributionScore", label: "DEI task distribution" },
                { key: "payEquityScore", label: "Pay-equity proxy" },
                { key: "overtimeCompliance", label: "Overtime compliance" },
              ] as const
            ).map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`edit-${f.key}`}>{f.label} (0-100)</Label>
                <Input
                  id={`edit-${f.key}`}
                  type="number"
                  min={0}
                  max={100}
                  value={editForm[f.key]}
                  onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input id="edit-label" maxLength={120} value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-note">Note</Label>
              <Textarea id="edit-note" rows={2} maxLength={500} value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRow !== null} onOpenChange={(open) => !deleting && !open && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete snapshot?</DialogTitle>
            <DialogDescription>
              {deleteRow ? `Row #${deleteRow.id} (${deleteRow.date} · ${deleteRow.label ?? "untitled"}) will be removed from ethical_metrics
              along with its label and note. The trend line and deltas lose this point — this cannot be undone.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteRow(null)} disabled={deleting}>
              Keep snapshot
            </Button>
            <Button variant="destructive" onClick={handleDeleteSnapshot} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
