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
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bot,
  Eye,
  History,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Zap,
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
import { cn } from "@/lib/utils"
import {
  AXIS,
  EmptyNote,
  SectionCard,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"
import {
  ACTIONS,
  ACTION_KEYS,
  TRIGGERS,
  TEMPLATES,
  describeTrigger,
  type ActionKey,
  type RuleAction,
  type RuleConditions,
  type TriggerKey,
} from "@/app/api/automation/registry"

/* ------------------------------------------------------------------ types */

type Rule = {
  id: number
  userId: number
  name: string
  description: string | null
  trigger: TriggerKey
  triggerParams: Record<string, number>
  conditions: RuleConditions
  actions: RuleAction[]
  isActive: boolean
  runCount: number
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

type Run = {
  id: number
  ruleId: number
  ruleName?: string
  status: string
  matched: number
  acted: number
  detail: string | null
  createdAt: string
}

type MatchedTask = {
  id: number
  title: string
  status: string
  priority: string
  assigneeName: string | null
  dueDate: string | null
}

type Planned = { taskId: number; taskTitle: string; action: ActionKey; detail: string }

type Member = { id: number; name: string }
type Sprint = { id: number; name: string }

type RuleDraft = {
  id?: number
  name: string
  description: string
  trigger: TriggerKey
  triggerParams: Record<string, number>
  conditions: RuleConditions
  actions: RuleAction[]
  isActive: boolean
}

const TASK_STATUSES = ["todo", "in_progress", "review", "blocked", "done"]
const TASK_PRIORITIES = ["urgent", "high", "medium", "low"]

const CHART_COLORS = [
  "hsl(var(--chart-pine))",
  "hsl(var(--chart-clay))",
  "hsl(var(--chart-stone))",
  "hsl(var(--chart-moss))",
  "hsl(var(--destructive))",
]

const emptyDraft = (): RuleDraft => ({
  name: "",
  description: "",
  trigger: "overdue",
  triggerParams: {},
  conditions: {},
  actions: [{ type: "notify_creator" }],
  isActive: true,
})

/* ------------------------------------------------------------------- page */

export default function AutomationPage() {
  const { toast } = useToast()

  const [rules, setRules] = useState<Rule[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [fTrigger, setFTrigger] = useState("all")
  const [fState, setFState] = useState("all")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRuns, setSelectedRuns] = useState<Run[] | null>(null)

  const [dryRun, setDryRun] = useState<{ ruleName: string; matched: MatchedTask[]; planned: Planned[] } | null>(null)
  const [dryRunning, setDryRunning] = useState(false)

  const [draft, setDraft] = useState<RuleDraft | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  /* ------------------------------------------------------------- fetching */

  const load = useCallback(async () => {
    try {
      const [autoRes, memRes, sprintRes] = await Promise.all([
        fetch("/api/automation"),
        fetch("/api/team/members"),
        fetch("/api/sprints"),
      ])
      if (!autoRes.ok) throw new Error(`Automation API responded ${autoRes.status}`)
      const j = await autoRes.json()
      setRules(j.data.rules)
      setRuns(j.data.runs)
      if (memRes.ok) {
        const m = await memRes.json()
        setMembers((m.teamMembers ?? m.data ?? []).map((x: Member) => ({ id: x.id, name: x.name })))
      }
      if (sprintRes.ok) {
        const s = await sprintRes.json()
        setSprints((s.data?.sprints ?? s.data ?? s.sprints ?? []).map((x: Sprint) => ({ id: x.id, name: x.name })))
      }
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const loadRuleRuns = useCallback(async (ruleId: number) => {
    setSelectedRuns(null)
    try {
      const res = await fetch(`/api/automation/${ruleId}`)
      if (!res.ok) return
      const j = await res.json()
      setSelectedRuns(j.data.runs)
    } catch {
      /* best-effort */
    }
  }, [])

  useEffect(() => {
    if (selectedId === null) {
      setSelectedRuns(null)
      return
    }
    void loadRuleRuns(selectedId)
  }, [selectedId, loadRuleRuns])

  const selected = useMemo(() => rules.find((r) => r.id === selectedId) ?? null, [rules, selectedId])

  /* -------------------------------------------------------------- filters */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rules.filter((r) => {
      if (q && !`${r.name} ${r.description ?? ""}`.toLowerCase().includes(q)) return false
      if (fTrigger !== "all" && r.trigger !== fTrigger) return false
      if (fState === "active" && !r.isActive) return false
      if (fState === "paused" && r.isActive) return false
      return true
    })
  }, [rules, query, fTrigger, fState])

  /* ----------------------------------------------------------------- kpis */

  const kpis = useMemo(() => {
    const active = rules.filter((r) => r.isActive)
    const totalActions = runs.reduce((s, r) => s + r.acted, 0)
    const lastRun = runs.length
      ? runs.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b))
      : null
    return {
      rules: rules.length,
      active: active.length,
      runs: runs.length,
      actions: totalActions,
      lastRun: lastRun ? relativeTime(lastRun.createdAt) : "never",
    }
  }, [rules, runs])

  const runsPerDay = useMemo(() => {
    const days: { day: string; runs: number; acted: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        runs: 0,
        acted: 0,
      })
    }
    for (const r of runs) {
      const d = new Date(r.createdAt)
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      const bucket = days.find((x) => x.day === label)
      if (bucket) {
        bucket.runs += 1
        bucket.acted += r.acted
      }
    }
    return days
  }, [runs])

  const triggerMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rules) counts.set(r.trigger, (counts.get(r.trigger) ?? 0) + 1)
    return Array.from(counts.entries()).map(([key, value]) => ({
      name: TRIGGERS[key as TriggerKey]?.label ?? key,
      value,
    }))
  }, [rules])

  /* ------------------------------------------------------------ mutations */

  const openCreate = (from?: Rule) => {
    setDraft(
      from
        ? {
            id: from.id,
            name: from.name,
            description: from.description ?? "",
            trigger: from.trigger,
            triggerParams: { ...from.triggerParams },
            conditions: { ...from.conditions },
            actions: from.actions.map((a) => ({ ...a })),
            isActive: from.isActive,
          }
        : emptyDraft(),
    )
    setDraftOpen(true)
  }

  const saveDraft = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    const validActions = draft.actions.filter((a) => {
      if (a.type === "set_status") return Boolean(a.params?.status)
      if (a.type === "assign_to") return Boolean(a.params?.userId)
      return true
    })
    if (validActions.length === 0) {
      toast({ title: "At least one complete action required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        trigger: draft.trigger,
        triggerParams: draft.triggerParams,
        conditions: draft.conditions,
        actions: validActions,
        isActive: draft.isActive,
      }
      const res = draft.id
        ? await fetch(`/api/automation/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/automation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Save failed (${res.status})`)
      toast({ title: draft.id ? "Rule updated" : "Rule created", description: `"${draft.name.trim()}" saved.` })
      setDraftOpen(false)
      setDraft(null)
      await load()
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const instantiateTemplate = async (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key)
    if (!t) return
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: t.name,
          description: t.description,
          trigger: t.trigger,
          triggerParams: t.triggerParams,
          conditions: t.conditions,
          actions: t.actions,
          isActive: true,
        }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Create failed (${res.status})`)
      toast({ title: "Template instantiated", description: `"${t.name}" is live and editable.` })
      await load()
    } catch (e) {
      toast({ title: "Template failed", description: (e as Error).message, variant: "destructive" })
    }
  }

  const toggleActive = async (r: Rule) => {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/automation/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !r.isActive }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Toggle failed (${res.status})`)
      toast({ title: r.isActive ? "Rule paused" : "Rule enabled", description: r.name })
      await load()
    } catch (e) {
      toast({ title: "Toggle failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const runRule = async (r: Rule, dry: boolean) => {
    setBusyId(r.id)
    if (dry) setDryRunning(true)
    try {
      const res = await fetch(`/api/automation/${r.id}/run${dry ? "?dryRun=1" : ""}`, {
        method: "POST",
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Run failed (${res.status})`)
      if (dry) {
        setDryRun({
          ruleName: r.name,
          matched: j.data.matched.map((t: MatchedTask) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            assigneeName: t.assigneeName,
            dueDate: t.dueDate,
          })),
          planned: j.data.planned,
        })
        toast({
          title: "Dry run complete",
          description: `${j.data.matched.length} matched · ${j.data.planned.length} action(s) would run. Nothing was written.`,
        })
      } else {
        toast({
          title: "Rule ran",
          description: `${j.data.matched.length} matched · ${j.data.acted} action(s) applied.`,
        })
        await load()
        if (selectedId === r.id) await loadRuleRuns(r.id)
      }
    } catch (e) {
      toast({ title: dry ? "Dry run failed" : "Run failed", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusyId(null)
      setDryRunning(false)
    }
  }

  const removeRule = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      const res = await fetch(`/api/automation/${deleteTarget.id}`, { method: "DELETE" })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success) throw new Error(j?.message ?? `Delete failed (${res.status})`)
      toast({ title: "Rule deleted", description: `"${deleteTarget.name}" removed with its history.` })
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

  /* --------------------------------------------------------- draft helpers */

  const setDraftAction = (idx: number, patch: Partial<RuleAction>) => {
    if (!draft) return
    const actions = draft.actions.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    setDraft({ ...draft, actions })
  }

  const moveDraftAction = (idx: number, dir: -1 | 1) => {
    if (!draft) return
    const to = idx + dir
    if (to < 0 || to >= draft.actions.length) return
    const actions = [...draft.actions]
    const [item] = actions.splice(idx, 1)
    actions.splice(to, 0, item)
    setDraft({ ...draft, actions })
  }

  const draftTriggerParams = draft ? TRIGGERS[draft.trigger].params : []

  /* --------------------------------------------------------------- render */

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-5">
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
        <EmptyNote>Could not load automation: {error}</EmptyNote>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* 1 — header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bot className="h-6 w-6 text-emerald-600" /> Automation
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Deterministic rules evaluated against the current workspace state when you run them —
            triggers pick candidate tasks, conditions narrow them, actions update real rows and send
            real notifications. Use Dry run to preview before applying.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> New rule
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Rules", value: kpis.rules, icon: <Zap className="h-4 w-4" /> },
          { label: "Active", value: kpis.active, icon: <Activity className="h-4 w-4" /> },
          { label: "Runs logged", value: kpis.runs, icon: <History className="h-4 w-4" /> },
          { label: "Actions applied", value: kpis.actions, icon: <Play className="h-4 w-4" /> },
          { label: "Last run", value: kpis.lastRun, icon: <Sparkles className="h-4 w-4" /> },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {k.icon} {k.label}
            </div>
            <div className="mt-1 truncate text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* 3 — filters */}
      <SectionCard title="Filters" icon={<Search className="h-4 w-4" />}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Label className="text-xs">Search</Label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rule name or description…" />
          </div>
          <div className="w-[180px]">
            <Label className="text-xs">Trigger</Label>
            <Select value={fTrigger} onValueChange={setFTrigger}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All triggers</SelectItem>
                {(Object.keys(TRIGGERS) as TriggerKey[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRIGGERS[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[130px]">
            <Label className="text-xs">State</Label>
            <Select value={fState} onValueChange={setFState}>
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
              setFTrigger("all")
              setFState("all")
            }}
          >
            Clear
          </Button>
          <Badge variant="secondary">{filtered.length} shown</Badge>
        </div>
      </SectionCard>

      {/* 4 — rules list */}
      <SectionCard title="Rules" icon={<Zap className="h-4 w-4" />}>
        {filtered.length === 0 ? (
          <EmptyNote>
            No rules yet — instantiate a template below or build one with “New rule”.
          </EmptyNote>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  selectedId === r.id && "border-emerald-500 ring-1 ring-emerald-500",
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="min-w-[200px] flex-1 text-left"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <Badge variant={r.isActive ? "default" : "secondary"} className="text-[10px]">
                        {r.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      When <span className="font-medium text-foreground">{describeTrigger(r.trigger, r.triggerParams)}</span>
                      {r.conditions.statusIn?.length && <> · status in [{r.conditions.statusIn.join(", ")}]</>}
                      {r.conditions.priorityIn?.length && <> · priority in [{r.conditions.priorityIn.join(", ")}]</>}
                      {typeof r.conditions.minStoryPoints === "number" && <> · ≥ {r.conditions.minStoryPoints} pts</>}
                      <ArrowRight className="mx-1 inline h-3 w-3" />
                      {r.actions.map((a, i) => (
                        <span key={i}>
                          {ACTIONS[a.type].label}
                          {a.type === "set_status" && ` (${a.params?.status})`}
                          {a.type === "assign_to" &&
                            ` (${members.find((m) => m.id === Number(a.params?.userId))?.name ?? `user ${a.params?.userId}`})`}
                          {i < r.actions.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.runCount} run(s){r.lastRunAt ? ` · last ${relativeTime(r.lastRunAt)}` : " · never run"}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" disabled={busyId === r.id || dryRunning} onClick={() => void runRule(r, true)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Dry run
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === r.id || !r.isActive} onClick={() => void runRule(r, false)}>
                      <Play className="mr-1 h-3.5 w-3.5" /> Run now
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void toggleActive(r)}>
                      {r.isActive ? "Pause" : "Enable"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openCreate(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTarget(r)
                        setDeleteConfirm(false)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 5 — dry-run preview */}
      <SectionCard title="Dry-run preview" icon={<Eye className="h-4 w-4" />}>
        {!dryRun ? (
          <EmptyNote>
            Hit “Dry run” on any rule — matched tasks and the exact actions that WOULD run appear
            here. Nothing is written until you press “Run now”.
          </EmptyNote>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{dryRun.ruleName}</span> — {dryRun.matched.length} task(s)
              matched, {dryRun.planned.length} action(s) planned.
            </p>
            {dryRun.matched.length === 0 ? (
              <EmptyNote>No tasks currently match this rule.</EmptyNote>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pl-2 pr-2">Task</th>
                      <th className="py-1.5 pr-2">Status</th>
                      <th className="py-1.5 pr-2">Priority</th>
                      <th className="py-1.5 pr-2">Assignee</th>
                      <th className="py-1.5 pr-2">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dryRun.matched.map((t) => (
                      <tr key={t.id}>
                        <td className="max-w-[260px] truncate py-1.5 pl-2 pr-2 font-medium">
                          #{t.id} {t.title}
                        </td>
                        <td className="py-1.5 pr-2">{t.status}</td>
                        <td className="py-1.5 pr-2">{t.priority}</td>
                        <td className="py-1.5 pr-2">{t.assigneeName ?? "Unassigned"}</td>
                        <td className="py-1.5 pr-2">{t.dueDate ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {dryRun.planned.length > 0 && (
              <div className="space-y-1 text-xs">
                {dryRun.planned.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1">
                    <Badge variant="outline" className="text-[10px]">
                      {ACTIONS[p.action].label}
                    </Badge>
                    <span className="truncate">
                      #{p.taskId} {p.taskTitle}
                    </span>
                    <span className="ml-auto shrink-0 text-muted-foreground">{p.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* 6+7 — selected rule runs + trigger mix */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={selected ? `Runs — ${selected.name}` : "Runs — select a rule"}
          icon={<History className="h-4 w-4" />}
        >
          {!selected ? (
            <EmptyNote>Click a rule above to see its run history.</EmptyNote>
          ) : !selectedRuns ? (
            <Skeleton className="h-24" />
          ) : selectedRuns.length === 0 ? (
            <EmptyNote>This rule has not run yet.</EmptyNote>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto text-xs">
              {selectedRuns.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                  <Badge variant={r.status === "ok" ? "default" : "destructive"} className="text-[10px]">
                    {r.status}
                  </Badge>
                  <span>
                    {r.matched} matched · {r.acted} acted
                  </span>
                  <span className="ml-auto text-muted-foreground">{relativeTime(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Trigger mix" icon={<BarChart3 className="h-4 w-4" />}>
          {triggerMix.length === 0 ? (
            <EmptyNote>No rules yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={triggerMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {triggerMix.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* 8 — runs per day */}
      <SectionCard title="Runs & actions — last 14 days" icon={<BarChart3 className="h-4 w-4" />}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={runsPerDay}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" tick={AXIS} />
            <YAxis tick={AXIS} width={36} allowDecimals={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend />
            <Bar dataKey="runs" name="Runs" fill="hsl(var(--chart-pine))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="acted" name="Actions" fill="hsl(var(--chart-clay))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* 9 — run history (all) */}
      <SectionCard title="Run history — all rules" icon={<History className="h-4 w-4" />}>
        {runs.length === 0 ? (
          <EmptyNote>No runs yet.</EmptyNote>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2">When</th>
                  <th className="py-1.5 pr-2">Rule</th>
                  <th className="py-1.5 pr-2">Status</th>
                  <th className="py-1.5 pr-2 text-right">Matched</th>
                  <th className="py-1.5 pr-2 text-right">Acted</th>
                  <th className="py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap py-1.5 pr-2 text-muted-foreground">
                      {relativeTime(r.createdAt)}
                    </td>
                    <td className="py-1.5 pr-2 font-medium">{r.ruleName ?? `#${r.ruleId}`}</td>
                    <td className="py-1.5 pr-2">
                      <Badge variant={r.status === "ok" ? "default" : "destructive"} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-2 text-right">{r.matched}</td>
                    <td className="py-1.5 pr-2 text-right">{r.acted}</td>
                    <td className="max-w-[240px] truncate py-1.5 text-xs text-muted-foreground">
                      {r.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 10 — templates */}
      <SectionCard title="Template gallery" icon={<Sparkles className="h-4 w-4" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATES.map((t) => {
            const instantiated = rules.some(
              (r) => r.name === t.name && r.trigger === t.trigger,
            )
            return (
              <div key={t.key} className="flex flex-col rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.name}</span>
                  {instantiated && (
                    <Badge variant="secondary" className="text-[10px]">
                      Installed
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">{t.description}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {describeTrigger(t.trigger, t.triggerParams)}
                  <ArrowRight className="mx-1 inline h-3 w-3" />
                  {t.actions.map((a) => ACTIONS[a.type].label).join(", ")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 self-start"
                  onClick={() => void instantiateTemplate(t.key)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Use template
                </Button>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* 11 — cross links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/tasks", label: "Tasks" },
          { href: "/dashboard/reports", label: "Reports" },
          { href: "/dashboard/activity", label: "Activity" },
        ].map((l) => (
          <Link key={l.href} href={l.href}>
            <Badge variant="outline" className="cursor-pointer px-3 py-1 hover:bg-muted">
              {l.label} <ArrowRight className="ml-1 h-3 w-3" />
            </Badge>
          </Link>
        ))}
      </div>

      {/* builder dialog */}
      <Dialog open={draftOpen} onOpenChange={(o) => !saving && setDraftOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit rule" : "New rule"}</DialogTitle>
            <DialogDescription>
              When [trigger] → if [conditions] → then [actions, in order].
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Escalate overdue work"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Trigger</Label>
                  <Select
                    value={draft.trigger}
                    onValueChange={(v) => {
                      const trigger = v as TriggerKey
                      const defaults: Record<string, number> = {}
                      for (const p of TRIGGERS[trigger].params) defaults[p.key] = p.default
                      setDraft({ ...draft, trigger, triggerParams: defaults })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRIGGERS) as TriggerKey[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRIGGERS[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {TRIGGERS[draft.trigger].description}
                  </p>
                </div>
                <div className="space-y-2">
                  {draftTriggerParams.map((p) => (
                    <div key={p.key}>
                      <Label>{p.label}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft.triggerParams[p.key] ?? p.default}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            triggerParams: { ...draft.triggerParams, [p.key]: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  ))}
                  <label className="flex items-center gap-2 pt-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={draft.isActive}
                      onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              {/* conditions */}
              <div className="rounded-md border p-3">
                <Label className="text-xs font-semibold">Conditions (all must pass)</Label>
                <div className="mt-2 space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Status in</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {TASK_STATUSES.map((s) => {
                        const on = draft.conditions.statusIn?.includes(s) ?? false
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const list = draft.conditions.statusIn ?? []
                              setDraft({
                                ...draft,
                                conditions: {
                                  ...draft.conditions,
                                  statusIn: on ? list.filter((x) => x !== s) : [...list, s],
                                },
                              })
                            }}
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-xs",
                              on ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "text-muted-foreground",
                            )}
                          >
                            {s}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Priority in</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {TASK_PRIORITIES.map((p) => {
                        const on = draft.conditions.priorityIn?.includes(p) ?? false
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              const list = draft.conditions.priorityIn ?? []
                              setDraft({
                                ...draft,
                                conditions: {
                                  ...draft.conditions,
                                  priorityIn: on ? list.filter((x) => x !== p) : [...list, p],
                                },
                              })
                            }}
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-xs",
                              on ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "text-muted-foreground",
                            )}
                          >
                            {p}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Min story points</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="any"
                        value={draft.conditions.minStoryPoints ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            conditions: {
                              ...draft.conditions,
                              minStoryPoints: e.target.value === "" ? null : Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Sprint</span>
                      <Select
                        value={draft.conditions.sprintId ? String(draft.conditions.sprintId) : "any"}
                        onValueChange={(v) =>
                          setDraft({
                            ...draft,
                            conditions: { ...draft.conditions, sprintId: v === "any" ? null : Number(v) },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any sprint</SelectItem>
                          {sprints.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* actions */}
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Actions (applied in order)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDraft({ ...draft, actions: [...draft.actions, { type: "notify_creator" }] })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add action
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {draft.actions.map((a, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
                      <span className="text-xs text-muted-foreground">{i + 1}.</span>
                      <Select
                        value={a.type}
                        onValueChange={(v) => setDraftAction(i, { type: v as ActionKey, params: {} })}
                      >
                        <SelectTrigger className="h-8 w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_KEYS.map((k) => (
                            <SelectItem key={k} value={k}>
                              {ACTIONS[k].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {a.type === "set_status" && (
                        <Select
                          value={String(a.params?.status ?? "")}
                          onValueChange={(v) => setDraftAction(i, { params: { status: v } })}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue placeholder="Status…" />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {a.type === "assign_to" && (
                        <Select
                          value={a.params?.userId ? String(a.params.userId) : ""}
                          onValueChange={(v) => setDraftAction(i, { params: { userId: Number(v) } })}
                        >
                          <SelectTrigger className="h-8 w-[170px]">
                            <SelectValue placeholder="Member…" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <span className="hidden flex-1 text-[11px] text-muted-foreground lg:block">
                        {ACTIONS[a.type].description}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => moveDraftAction(i, -1)} aria-label="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => moveDraftAction(i, 1)} aria-label="Move down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            setDraft({ ...draft, actions: draft.actions.filter((_, j) => j !== i) })
                          }
                          aria-label="Remove action"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveDraft()} disabled={saving}>
              {saving ? "Saving…" : draft?.id ? "Save changes" : "Create rule"}
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
            <DialogTitle>Delete rule</DialogTitle>
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
              <Button variant="destructive" onClick={() => void removeRule()} disabled={busyId === deleteTarget?.id}>
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
