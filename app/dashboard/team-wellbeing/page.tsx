"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Download,
  HeartHandshake,
  Lock,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
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
import { AXIS, AvatarCircle, EmptyNote, SectionCard, TOOLTIP_STYLE, relativeTime } from "@/components/dashboard-kit"

/* ------------------------------------------------------------------- types */

type CheckInRow = {
  id: number
  userId: number
  userName: string
  avatar: string | null
  role: string | null
  date: string
  wellbeingScore: number
  mood: string
  workload: string
  stressLevel: number
  overtimeHours: string | number
  createdAt: string | null
}

type WorkloadMember = { id: number; name: string; role: string | null; avatar: string | null; openPoints: number; openTasks: number }
type DoneTask = { id: number; assigneeId: number | null; status: string; updatedAt: string | null }

type CheckInDraft = {
  id?: number
  userId: number
  date: string
  wellbeingScore: number
  mood: string
  workload: string
  stressLevel: number
  overtimeHours: number
  note: string
}

const MOODS = ["Energized", "Focused", "Productive", "Neutral", "Stressed", "Strained", "Overwhelmed", "Low"]
const WORKLOADS = ["Light", "Balanced", "High"]
const STRESS_LABEL: Record<string, string> = {
  "1": "1 · Calm",
  "2": "2 · Easy",
  "3": "3 · Manageable",
  "4": "4 · Heavy",
  "5": "5 · Critical",
}

const MOOD_COLOR: Record<string, string> = {
  Energized: "hsl(var(--chart-moss))",
  Focused: "hsl(var(--chart-pine))",
  Productive: "hsl(var(--chart-pine))",
  Neutral: "hsl(var(--chart-stone))",
  Stressed: "hsl(var(--chart-clay))",
  Strained: "hsl(var(--chart-clay))",
  Overwhelmed: "hsl(var(--destructive))",
  Low: "hsl(var(--destructive))",
}

const LOW_THRESHOLD = 40
const HIGH_THRESHOLD = 85

/* -------------------------------------------------------------- date utils */

const DAY_MS = 86_400_000
const isoDay = (offsetDaysAgo: number) => new Date(Date.now() - offsetDaysAgo * DAY_MS).toISOString().slice(0, 10)
const daysOld = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)

function moodColor(mood: string) {
  return MOOD_COLOR[mood] ?? "hsl(var(--muted-foreground))"
}

function scoreTone(score: number) {
  if (score < LOW_THRESHOLD) return "text-red-500"
  if (score > HIGH_THRESHOLD) return "text-emerald-600"
  return undefined
}

/* ---------------------------------------------------------------- the page */

export default function TeamWellbeingPage() {
  const { toast } = useToast()

  const [rows, setRows] = useState<CheckInRow[]>([])
  const [workload, setWorkload] = useState<WorkloadMember[]>([])
  const [self, setSelf] = useState<{ id: number; name: string } | null>(null)
  const [doneTasks, setDoneTasks] = useState<DoneTask[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)

  const [historyScope, setHistoryScope] = useState<"all" | "mine">("all")
  const [sentSupport, setSentSupport] = useState<number[]>([])
  const [supportBusy, setSupportBusy] = useState<number | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<CheckInDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* ------------------------------- data loading ------------------------------- */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wbRes, ovRes, tkRes] = await Promise.all([
        fetch("/api/dashboard/wellbeing?days=30"),
        fetch("/api/dashboard/overview"),
        fetch("/api/tasks?pageSize=200&status=done"),
      ])
      const wbJson = await wbRes.json()
      if (!wbJson.success) throw new Error(wbJson.message ?? "Failed to load wellbeing data")
      setRows(wbJson.data as CheckInRow[])

      const ovJson = await ovRes.json()
      if (ovJson.success) {
        setWorkload(ovJson.data.workload as WorkloadMember[])
        setSelf({ id: ovJson.data.user.id as number, name: ovJson.data.user.name as string })
      }

      const tkJson = await tkRes.json()
      if (tkJson.success) setDoneTasks((tkJson.data as DoneTask[]).filter((t) => t.status === "done"))

      setFailed(false)
    } catch (err) {
      setFailed(true)
      toast({ variant: "destructive", title: "Wellbeing", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const reloadQuiet = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/wellbeing?days=30")
      const json = await res.json()
      if (json.success) setRows(json.data as CheckInRow[])
    } catch {
      /* the check-ins already on screen stay */
    }
  }, [])

  useLiveRefresh(reloadQuiet, { intervalMs: LIVE_REFRESH_MS })

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast({ title: "Wellbeing data refreshed" })
  }, [load, toast])

  /* --------------------------------- derived ---------------------------------- */

  const latestByUser = useMemo(() => {
    const map = new Map<number, CheckInRow>()
    for (const r of rows) if (!map.has(r.userId)) map.set(r.userId, r)
    return map
  }, [rows])

  const memberNames = useMemo(() => {
    const map = new Map<number, { name: string; avatar: string | null; role: string | null }>()
    for (const w of workload) map.set(w.id, { name: w.name, avatar: w.avatar, role: w.role })
    if (self) map.set(self.id, { name: self.name, avatar: null, role: null })
    for (const r of rows) if (!map.has(r.userId)) map.set(r.userId, { name: r.userName, avatar: r.avatar, role: r.role })
    return map
  }, [workload, self, rows])

  const memberIds = useMemo(
    () => [...new Set([...memberNames.keys(), ...latestByUser.keys()])].sort((a, b) => a - b),
    [memberNames, latestByUser],
  )

  const rowsByUserAsc = useMemo(() => {
    const map = new Map<number, CheckInRow[]>()
    for (const r of rows) {
      const list = map.get(r.userId) ?? []
      list.push(r)
      map.set(r.userId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    return map
  }, [rows])

  const kpis = useMemo(() => {
    const latestScores = [...latestByUser.values()].map((r) => r.wellbeingScore)
    const teamAvg = latestScores.length ? Math.round(latestScores.reduce((s, v) => s + v, 0) / latestScores.length) : null
    const recentUsers = new Set(rows.filter((r) => daysOld(r.date) <= 7).map((r) => r.userId))
    const atRisk = [...latestByUser.values()].filter((r) => r.wellbeingScore < LOW_THRESHOLD)
    const thisWeek = rows.filter((r) => daysOld(r.date) <= 7).map((r) => r.wellbeingScore)
    const lastWeek = rows.filter((r) => daysOld(r.date) > 7 && daysOld(r.date) <= 14).map((r) => r.wellbeingScore)
    const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null)
    const a1 = avg(thisWeek)
    const a0 = avg(lastWeek)
    const weekDelta = a1 !== null && a0 !== null ? Math.round(a1 - a0) : null
    return { teamAvg, checkedIn7d: recentUsers.size, atRisk, weekDelta }
  }, [rows, latestByUser])

  const happinessTrend = useMemo(() => {
    const byDay = new Map<string, number[]>()
    for (const r of rows) {
      if (daysOld(r.date) > 13) continue
      const list = byDay.get(r.date) ?? []
      list.push(r.wellbeingScore)
      byDay.set(r.date, list)
    }
    const out: { date: string; score: number | null }[] = []
    for (let i = 13; i >= 0; i--) {
      const day = isoDay(i)
      const vals = byDay.get(day)
      out.push({
        date: day.slice(5),
        score: vals && vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null,
      })
    }
    return out
  }, [rows])

  const memberTable = useMemo(() => {
    return memberIds.map((id) => {
      const info = memberNames.get(id) ?? { name: `Member #${id}`, avatar: null, role: null }
      const history = rowsByUserAsc.get(id) ?? []
      const latest = latestByUser.get(id) ?? null
      let delta: number | null = null
      if (latest && history.length > 1) {
        const ref = [...history].reverse().find((r) => daysOld(r.date) >= 7) ?? history[0]
        delta = latest.wellbeingScore - ref.wellbeingScore
      }
      return { id, ...info, latest, delta, spark: history.slice(-10).map((r, i) => ({ i, score: r.wellbeingScore })) }
    })
  }, [memberIds, memberNames, rowsByUserAsc, latestByUser])

  const workloadVsWellbeing = useMemo(() => {
    const ids = [...new Set([...workload.map((w) => w.id), ...latestByUser.keys()])]
    return ids
      .map((id) => ({
        name: (memberNames.get(id)?.name ?? `#${id}`).split(" ")[0],
        openPoints: workload.find((w) => w.id === id)?.openPoints ?? 0,
        wellbeing: latestByUser.get(id)?.wellbeingScore ?? null,
      }))
      .slice(0, 10)
  }, [workload, latestByUser, memberNames])

  const overtimeSignals = useMemo(() => {
    const counts = new Map<number, number>()
    for (const t of doneTasks) {
      if (!t.assigneeId || !t.updatedAt || daysOld(t.updatedAt) > 7) continue
      counts.set(t.assigneeId, (counts.get(t.assigneeId) ?? 0) + 1)
    }
    const list = [...counts.entries()]
      .map(([id, count]) => ({ id, count, name: memberNames.get(id)?.name ?? `Member #${id}` }))
      .sort((a, b) => b.count - a.count)
    return { list, max: Math.max(1, ...list.map((x) => x.count)) }
  }, [doneTasks, memberNames])

  const moodDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      if (daysOld(r.date) > 13) continue
      counts.set(r.mood, (counts.get(r.mood) ?? 0) + 1)
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [rows])

  const historyRows = useMemo(
    () => (historyScope === "mine" && self ? rows.filter((r) => r.userId === self.id) : rows),
    [rows, historyScope, self],
  )

  /* ---------------------------------- actions --------------------------------- */

  const openLog = () => {
    const me = self?.id ?? rows[0]?.userId
    if (me === undefined) {
      toast({ variant: "destructive", title: "Check-in", description: "Session user unknown — reload the page." })
      return
    }
    setDraft({
      userId: me,
      date: isoDay(0),
      wellbeingScore: 50,
      mood: "Neutral",
      workload: "Balanced",
      stressLevel: 3,
      overtimeHours: 0,
      note: "",
    })
    setConfirmDelete(null)
    setFormOpen(true)
  }

  const openEdit = (r: CheckInRow) => {
    setDraft({
      id: r.id,
      userId: r.userId,
      date: r.date,
      wellbeingScore: r.wellbeingScore,
      mood: MOODS.includes(r.mood) ? r.mood : "Neutral",
      workload: WORKLOADS.includes(r.workload) ? r.workload : "Balanced",
      stressLevel: Math.min(5, Math.max(1, r.stressLevel)),
      overtimeHours: Number(r.overtimeHours) || 0,
      note: "",
    })
    setConfirmDelete(null)
    setFormOpen(true)
  }

  const saveCheckIn = async () => {
    if (!draft) return
    if (draft.wellbeingScore < 0 || draft.wellbeingScore > 100) {
      toast({ variant: "destructive", title: "Check-in", description: "Score must be between 0 and 100." })
      return
    }
    setSaving(true)
    try {
      const payload = {
        userId: draft.userId,
        date: draft.date,
        wellbeingScore: draft.wellbeingScore,
        mood: draft.mood,
        workload: draft.workload,
        stressLevel: draft.stressLevel,
        overtimeHours: draft.overtimeHours,
        ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
      }
      const res = draft.id
        ? await fetch(`/api/dashboard/wellbeing/${draft.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/dashboard/wellbeing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Save failed")
      const targetName = memberNames.get(draft.userId)?.name ?? "member"
      toast({
        title: draft.id ? "Check-in updated" : "Check-in logged",
        description: draft.id
          ? `Score ${draft.wellbeingScore} · ${draft.mood} saved.`
          : `${draft.wellbeingScore} · ${draft.mood} for ${targetName}${draft.userId !== self?.id ? " — they were notified." : "."}`,
      })
      setFormOpen(false)
      setDraft(null)
      await reloadQuiet()
    } catch (err) {
      toast({ variant: "destructive", title: "Check-in", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const deleteCheckIn = async (id: number) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/wellbeing/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Delete failed")
      setRows((rs) => rs.filter((r) => r.id !== id))
      toast({ title: "Check-in deleted" })
      setConfirmDelete(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Check-in", description: (err as Error).message })
    } finally {
      setDeleting(false)
    }
  }

  const sendSupportNote = async (userId: number, name: string, score: number) => {
    setSupportBusy(userId)
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "wellbeing",
          title: `Support check-in: ${name}`,
          body: `${name}'s latest wellbeing score is ${score}. Reach out, offer to rebalance their load.`,
          link: "/dashboard/team-wellbeing",
        }),
      })
      if (!res.ok) throw new Error("Could not queue the notification.")
      setSentSupport((s) => [...s, userId])
      toast({ title: "Support note queued", description: `A wellbeing reminder for ${name} landed in your activity feed.` })
    } catch (err) {
      toast({ variant: "destructive", title: "Support note", description: (err as Error).message })
    } finally {
      setSupportBusy(null)
    }
  }

  const exportCsv = () => {
    if (latestByUser.size === 0) {
      toast({ variant: "destructive", title: "Export", description: "No check-ins to export yet." })
      return
    }
    const header = "Date,Member,WellbeingScore,Mood,Workload,Stress,OvertimeHours"
    const lines = [...latestByUser.values()].map((r) =>
      [r.date, memberNames.get(r.userId)?.name ?? r.userName, r.wellbeingScore, r.mood, r.workload, r.stressLevel, r.overtimeHours]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    const blob = new Blob([`${header}\n${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `wellbeing-latest-${isoDay(0)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${latestByUser.size} latest check-ins downloaded.` })
  }

  /* ----------------------------------- render ---------------------------------- */

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (failed && rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">We couldn’t reach the wellbeing API. Your session may have expired.</p>
        <Link href="/login">
          <Button>Sign in again</Button>
        </Link>
        <Button variant="outline" onClick={() => load()}>
          Retry
        </Button>
      </div>
    )
  }

  const lastUpdate = rows[0]?.date ? `Data through ${rows[0].date}` : "No check-ins yet"

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5" style={{ color: "hsl(var(--chart-moss))" }} />
            Team Wellbeing Workspace
          </h1>
          <p className="text-sm text-muted-foreground">Check-ins, mood signals, and at-risk nudges for the whole team · {lastUpdate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openLog}>
            <Plus className="mr-1 h-4 w-4" /> Log check-in
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Team avg happiness",
            value: kpis.teamAvg ?? "—",
            hint: "avg of each member’s latest check-in /100",
            icon: <Sparkles className="h-4 w-4" />,
            tone: kpis.teamAvg !== null ? scoreTone(kpis.teamAvg) : undefined,
          },
          { label: "Members checked in · 7d", value: kpis.checkedIn7d, hint: `of ${memberIds.length} members`, icon: <Users className="h-4 w-4" />, tone: undefined },
          {
            label: "At risk (< 40)",
            value: kpis.atRisk.length,
            hint: kpis.atRisk.length ? "act this week" : "nobody below the line",
            icon: <AlertTriangle className="h-4 w-4" />,
            tone: kpis.atRisk.length > 0 ? "text-red-500" : undefined,
          },
          {
            label: "Trend vs previous week",
            value: kpis.weekDelta === null ? "—" : `${kpis.weekDelta > 0 ? "+" : ""}${kpis.weekDelta}`,
            hint: "team avg of check-ins, last 7d vs prior 7d",
            icon: <Activity className="h-4 w-4" />,
            tone: kpis.weekDelta !== null && kpis.weekDelta < 0 ? "text-red-500" : kpis.weekDelta !== null && kpis.weekDelta > 0 ? "text-emerald-600" : undefined,
          },
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

      {/* 3 — Team mood board */}
      <SectionCard
        title="Team mood board"
        icon={<HeartHandshake className="h-4 w-4" />}
        action={
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            latest per member
          </Badge>
        }
      >
        {latestByUser.size > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {[...latestByUser.values()].map((r) => (
              <div key={r.userId} className="flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs">
                <AvatarCircle name={memberNames.get(r.userId)?.name ?? r.userName} avatar={r.avatar} size={20} />
                <span className="font-medium">{(memberNames.get(r.userId)?.name ?? r.userName).split(" ")[0]}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ color: moodColor(r.mood), backgroundColor: `color-mix(in srgb, ${moodColor(r.mood)} 14%, transparent)` }}>
                  {r.mood}
                </span>
                <span className={cn("tabular-nums", scoreTone(r.wellbeingScore))}>{r.wellbeingScore}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyNote>No check-ins logged yet — use “Log check-in” to start the board.</EmptyNote>
        )}
      </SectionCard>

      {/* 4 + 9 — Happiness trend + mood distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Happiness trend · 14 days" icon={<Activity className="h-4 w-4" />} className="lg:col-span-2">
          {rows.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={happinessTrend}>
                <defs>
                  <linearGradient id="wbTeamFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-moss))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--chart-moss))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ ...AXIS, fontSize: 10 }} minTickGap={16} />
                <YAxis domain={[0, 100]} tick={AXIS} width={28} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="score" name="Team avg wellbeing" stroke="hsl(var(--chart-moss))" fill="url(#wbTeamFill)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Log a check-in to build the trend.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Mood distribution · 14 days" icon={<BarChart3 className="h-4 w-4" />}>
          {moodDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={moodDistribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                  {moodDistribution.map((m) => (
                    <Cell key={m.name} fill={moodColor(m.name)} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No moods recorded in the window.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 5 — Per-member table with sparklines */}
      <SectionCard title="Member wellbeing" icon={<Users className="h-4 w-4" />}>
        {memberTable.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Member</th>
                  <th className="px-3 py-2 font-medium">Latest</th>
                  <th className="px-3 py-2 font-medium">7d trend</th>
                  <th className="px-3 py-2 font-medium">History</th>
                  <th className="px-3 py-2 font-medium">Mood</th>
                  <th className="px-3 py-2 font-medium">Last check-in</th>
                </tr>
              </thead>
              <tbody>
                {memberTable.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <AvatarCircle name={m.name} avatar={m.avatar} size={22} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{m.name}</p>
                          {m.role && <p className="truncate text-[10px] text-muted-foreground">{m.role}</p>}
                        </div>
                      </div>
                    </td>
                    <td className={cn("px-3 py-2 tabular-nums font-semibold", m.latest && scoreTone(m.latest.wellbeingScore))}>
                      {m.latest?.wellbeingScore ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {m.delta === null ? (
                        <span className="text-xs text-muted-foreground">{m.latest ? "first check-in" : "no data"}</span>
                      ) : m.delta > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                          <ArrowUpRight className="h-3.5 w-3.5" /> +{m.delta}
                        </span>
                      ) : m.delta < 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500">
                          <ArrowDownRight className="h-3.5 w-3.5" /> {m.delta}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Minus className="h-3.5 w-3.5" /> flat
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {m.spark.length > 1 ? (
                        <LineChart width={110} height={32} data={m.spark}>
                          <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-pine))" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {m.latest ? (
                        <span className="text-xs font-medium" style={{ color: moodColor(m.latest.mood) }}>
                          {m.latest.mood}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {m.latest ? (
                        <>
                          <Clock className="mr-1 inline h-3 w-3" />
                          {relativeTime(m.latest.date)}
                        </>
                      ) : (
                        "never"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>No team members found. Add workload members to track their wellbeing.</EmptyNote>
        )}
      </SectionCard>

      {/* 6 — Workload vs wellbeing */}
      <SectionCard title="Workload vs wellbeing" icon={<BarChart3 className="h-4 w-4" />}>
        {workloadVsWellbeing.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workloadVsWellbeing}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={AXIS} />
              <YAxis yAxisId="left" tick={AXIS} width={26} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={AXIS} width={26} />
              <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="openPoints" name="Open points" fill="hsl(var(--chart-stone))" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="wellbeing" name="Wellbeing /100" fill="hsl(var(--chart-moss))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyNote>Workload pairs appear once members have tasks and check-ins.</EmptyNote>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Watch for inverse pairs: high open points with a low wellbeing bar is where you rebalance first.
        </p>
      </SectionCard>

      {/* 7 — At-risk panel */}
      <SectionCard
        title="At-risk members"
        icon={<AlertTriangle className="h-4 w-4" />}
        action={
          <Badge variant={kpis.atRisk.length > 0 ? "destructive" : "outline"} className="text-[10px]">
            {kpis.atRisk.length} below {LOW_THRESHOLD}
          </Badge>
        }
      >
        {kpis.atRisk.length > 0 ? (
          <ul className="divide-y">
            {kpis.atRisk.map((r) => {
              const name = memberNames.get(r.userId)?.name ?? r.userName
              return (
                <li key={r.userId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarCircle name={name} avatar={r.avatar} size={28} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-red-500">{r.wellbeingScore}</span> · {r.mood} · workload {r.workload} · logged {relativeTime(r.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={`/dashboard/kanban?assignee=${r.userId}`}>View tasks</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant={sentSupport.includes(r.userId) ? "ghost" : "secondary"}
                      className="h-7 text-xs"
                      disabled={sentSupport.includes(r.userId) || supportBusy === r.userId}
                      onClick={() => sendSupportNote(r.userId, name, r.wellbeingScore)}
                    >
                      {sentSupport.includes(r.userId) ? "Support queued" : supportBusy === r.userId ? "Sending…" : "Send support note"}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyNote>Nobody under {LOW_THRESHOLD}. If that surprises you, ask the team to log check-ins.</EmptyNote>
        )}
      </SectionCard>

      {/* 8 — Overtime signals */}
      <SectionCard
        title="Overtime signals"
        icon={<Clock className="h-4 w-4" />}
        action={
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            proxy · tasks closed this week
          </Badge>
        }
      >
        {overtimeSignals.list.length > 0 ? (
          <div className="space-y-2.5">
            {overtimeSignals.list.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center gap-3">
                <AvatarCircle name={o.name} avatar={memberNames.get(o.id)?.avatar ?? null} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate font-medium">{o.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{o.count} done · 7d</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", o.count / overtimeSignals.max > 0.8 ? "bg-[hsl(var(--chart-clay))]" : "bg-[hsl(var(--chart-pine))]")}
                      style={{ width: `${Math.round((o.count / overtimeSignals.max) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Closing an unusually high number of tasks in a week often signals compensating hours — pair this with low mood scores.
            </p>
          </div>
        ) : (
          <EmptyNote>No tasks completed in the last 7 days — no overtime signal.</EmptyNote>
        )}
      </SectionCard>

      {/* 10 — Check-in history with edit/delete */}
      <SectionCard
        title="Check-in history · 30 days"
        icon={<Activity className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button size="sm" variant={historyScope === "all" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setHistoryScope("all")}>
              All team
            </Button>
            <Button size="sm" variant={historyScope === "mine" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setHistoryScope("mine")}>
              Mine
            </Button>
          </div>
        }
      >
        {historyRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Member</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">Mood</th>
                  <th className="px-3 py-2 font-medium">Workload</th>
                  <th className="px-3 py-2 font-medium">Stress</th>
                  <th className="px-3 py-2 font-medium">OT hrs</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <AvatarCircle name={memberNames.get(r.userId)?.name ?? r.userName} avatar={r.avatar} size={20} />
                        <span className="truncate text-xs font-medium">{memberNames.get(r.userId)?.name ?? r.userName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums">{r.date}</td>
                    <td className={cn("px-3 py-2 text-xs font-semibold tabular-nums", scoreTone(r.wellbeingScore))}>{r.wellbeingScore}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: moodColor(r.mood) }}>{r.mood}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.workload}</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">{r.stressLevel}/5</td>
                    <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">{r.overtimeHours}</td>
                    <td className="px-3 py-2 text-right">
                      {confirmDelete === r.id ? (
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[11px] text-red-500">Delete?</span>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={deleting} onClick={() => deleteCheckIn(r.id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(null)}>
                            Keep
                          </Button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" aria-label={`Edit check-in for ${r.userName} on ${r.date}`} onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" aria-label={`Delete check-in for ${r.userName} on ${r.date}`} onClick={() => setConfirmDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>{historyScope === "mine" ? "You haven’t logged any check-ins in the last 30 days." : "No check-ins in the last 30 days."}</EmptyNote>
        )}
      </SectionCard>

      {/* 11 — Anonymous survey note */}
      <SectionCard title="About anonymity" icon={<Lock className="h-4 w-4" />}>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Check-ins in this workspace are <span className="font-medium text-foreground">tied to member accounts</span>, not anonymous — they
            power the trend charts, at-risk alerts and support notifications on this page.
          </p>
          <p>
            Before surfacing individual scores to managers, agree as a team on who can see raw numbers versus aggregates only. If you
            later need truly anonymous pulse surveys, that requires a separate survey tool — this page does not hide identities.
          </p>
          <Separator className="my-2" />
          <p className="text-[11px]">Thresholds in use: at-risk below {LOW_THRESHOLD}, thriving above {HIGH_THRESHOLD}. Crossing either line sends the member a wellbeing notification.</p>
        </div>
      </SectionCard>

      {/* ---------------------------- log / edit dialog ---------------------------- */}

      <Dialog open={formOpen && draft !== null} onOpenChange={(o) => !o && setFormOpen(false)}>
        {draft && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{draft.id ? `Edit check-in #${draft.id}` : "Log wellbeing check-in"}</DialogTitle>
              <DialogDescription>Scores run 0–100. Crossing the 40 or 85 line notifies the member.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Check-in for</Label>
                <Select value={String(draft.userId)} onValueChange={(v) => setDraft({ ...draft, userId: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberIds.map((id) => (
                      <SelectItem key={id} value={String(id)}>
                        {memberNames.get(id)?.name ?? `Member #${id}`}
                        {self?.id === id ? " (you)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.userId !== self?.id && (
                  <p className="text-[11px] text-muted-foreground">Logging for someone else sends them a wellbeing notification.</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="ci-date">Date</Label>
                <Input id="ci-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ci-score">Happiness score · {draft.wellbeingScore}/100</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ci-score"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={draft.wellbeingScore}
                    onChange={(e) => setDraft({ ...draft, wellbeingScore: Number(e.target.value) })}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted"
                    aria-label="Happiness score slider"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.wellbeingScore}
                    onChange={(e) => setDraft({ ...draft, wellbeingScore: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                    className="w-20"
                    aria-label="Happiness score number"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Mood</Label>
                <Select value={draft.mood} onValueChange={(v) => setDraft({ ...draft, mood: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Perceived workload</Label>
                <Select value={draft.workload} onValueChange={(v) => setDraft({ ...draft, workload: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKLOADS.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Stress level</Label>
                <Select value={String(draft.stressLevel)} onValueChange={(v) => setDraft({ ...draft, stressLevel: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {STRESS_LABEL[String(s)]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ci-ot">Overtime hours</Label>
                <Input
                  id="ci-ot"
                  type="number"
                  min={0}
                  max={80}
                  value={draft.overtimeHours}
                  onChange={(e) => setDraft({ ...draft, overtimeHours: Math.min(80, Math.max(0, Number(e.target.value) || 0)) })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="ci-note">Note (optional)</Label>
                <Textarea
                  id="ci-note"
                  rows={2}
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder={draft.userId !== self?.id ? "Context for the member — travels with their check-in notification." : "Notes are stored with the member’s notification, not the metric row."}
                  disabled={!!draft.id}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveCheckIn} disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Log check-in"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
