"use client"

// Sprint retrospectives workspace (/dashboard/retros).
// Everything on this page is persisted through /api/retros/**: retros with a
// draft → scheduled → completed → archived lifecycle, three-column note boards
// with database-enforced one-vote-per-user, action items with owners/due
// dates/overdue state, analytics derived from real rows, a scheduling agenda,
// the notification-driven activity feed and a CSV export of the open retro.

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
import {
  Archive,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Download,
  ListChecks,
  MessageSquareQuote,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  ThumbsUp,
  Trash2,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  SectionCard,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"
import type { DashboardOverview } from "@/lib/dashboard-data"

/* ------------------------------------------------------------------ types */

type RetroStatus = "draft" | "scheduled" | "completed" | "archived"
type NoteCategory = "went_well" | "went_bad" | "try_next"

type SprintOption = { id: number; name: string; status: string }

type RetroItem = {
  id: number
  title: string
  date: string
  status: RetroStatus
  sprint_id: number | null
  sprint_name: string | null
  created_by: number
  creator_name: string
  creator_avatar: string | null
  created_at: string
  note_count: number
  went_well_count: number
  went_bad_count: number
  try_next_count: number
  action_count: number
  actions_done: number
  actions_open: number
  actions_overdue: number
  top_note: { body: string; votes: number; category: string } | null
}

type Stats = {
  retrosTotal: number
  retrosHeld: number
  actionsOpen: number
  actionsOverdue: number
  avgNotesPerRetro: number
  actionCompletionPct: number
}

type NoteItem = {
  id: number
  retro_id: number
  category: NoteCategory
  body: string
  author_id: number
  author_name: string
  author_avatar: string | null
  votes: number
  my_vote: boolean
  created_at: string
}

type ActionItem = {
  id: number
  retro_id: number
  body: string
  owner_id: number | null
  owner_name: string | null
  owner_avatar: string | null
  due_date: string | null
  done: boolean
  overdue: boolean
  created_at: string
}

type RetroDetail = {
  id: number
  title: string
  date: string
  status: RetroStatus
  sprint_id: number | null
  sprint_name: string | null
  created_by: number
  creator_name: string
  created_at: string
}

type MemberOption = { id: number; name: string; avatar: string | null }

type NotifItem = {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  createdAt: string
  metadata?: Record<string, unknown> | null
}

type ConfirmTarget =
  | { kind: "deleteRetro"; id: number; label: string }
  | { kind: "deleteNote"; retroId: number; id: number; label: string }
  | { kind: "deleteAction"; retroId: number; id: number; label: string }
  | { kind: "completeRetro"; id: number; label: string }

/* -------------------------------------------------------------- constants */

const CATEGORY_META: Record<NoteCategory, { label: string; blurb: string; color: string }> = {
  went_well: { label: "Went well", blurb: "What worked and should stay", color: "hsl(var(--chart-moss))" },
  went_bad: { label: "Went bad", blurb: "What hurt delivery this sprint", color: "hsl(var(--destructive))" },
  try_next: { label: "Try next", blurb: "Experiments to run next sprint", color: "hsl(var(--chart-pine))" },
}
const CATEGORY_ORDER: NoteCategory[] = ["went_well", "went_bad", "try_next"]

const RETRO_STATUS_TONE: Record<RetroStatus, string> = {
  draft: "hsl(var(--chart-stone))",
  scheduled: "hsl(var(--chart-clay))",
  completed: "hsl(var(--chart-moss))",
  archived: "hsl(var(--muted-foreground))",
}

function RetroStatusPill({ status }: { status: string }) {
  const tone = RETRO_STATUS_TONE[status as RetroStatus] ?? "hsl(var(--muted-foreground))"
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
      style={{ backgroundColor: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}
    >
      {status}
    </span>
  )
}

function shortLabel(retro: Pick<RetroItem, "id" | "title">): string {
  const trimmed = retro.title.length > 14 ? `${retro.title.slice(0, 13)}…` : retro.title
  return `#${retro.id} ${trimmed}`
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`)
  }
  return json as T
}

/* ---------------------------------------------------------------- the page */

export default function RetrospectivesWorkspace() {
  const { toast } = useToast()

  // remote data
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [me, setMe] = useState<number | null>(null)
  const [items, setItems] = useState<RetroItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categoryMix, setCategoryMix] = useState<{ category: string; count: number }[]>([])
  const [sprints, setSprints] = useState<SprintOption[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [notifications, setNotifications] = useState<NotifItem[]>([])

  // selection + detail
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ retro: RetroDetail; notes: NoteItem[]; actions: ActionItem[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // composer state (one draft buffer per column)
  const [noteDrafts, setNoteDrafts] = useState<Record<NoteCategory, string>>({
    went_well: "",
    went_bad: "",
    try_next: "",
  })
  const [addingNote, setAddingNote] = useState<NoteCategory | null>(null)
  const [votingNoteId, setVotingNoteId] = useState<number | null>(null)

  // action composer
  const [actionDraft, setActionDraft] = useState<{ body: string; ownerId: string; dueDate: string }>({
    body: "",
    ownerId: "",
    dueDate: "",
  })
  const [addingAction, setAddingAction] = useState(false)
  const [busyActionId, setBusyActionId] = useState<number | null>(null)
  const [converting, setConverting] = useState(false)

  // dialogs
  const [newOpen, setNewOpen] = useState(false)
  const [newDraft, setNewDraft] = useState<{ title: string; sprintId: string; date: string; status: "draft" | "scheduled" }>(
    { title: "", sprintId: "none", date: new Date().toISOString().slice(0, 10), status: "draft" },
  )
  const [creating, setCreating] = useState(false)
  const [editTarget, setEditTarget] = useState<RetroItem | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; date: string; status: RetroStatus; sprintId: string }>({
    title: "",
    date: "",
    status: "draft",
    sprintId: "none",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  /* --------------------------------------------------------------- loading */

  const loadDetail = useCallback(async (retroId: number) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/retros/${retroId}`)
      const json = await jsonOrThrow<{ success: boolean; data: { retro: RetroDetail; notes: NoteItem[]; actions: ActionItem[] } }>(res)
      setDetail(json.data)
    } catch (err) {
      toast({ variant: "destructive", title: "Retro board", description: (err as Error).message })
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [toast])

  const load = useCallback(
    async (initial: boolean, preferId?: number | null) => {
      if (initial) setLoading(true)
      else setRefreshing(true)
      try {
        const [retrosRes, sprintsRes, overviewRes, notifRes] = await Promise.all([
          fetch("/api/retros"),
          fetch("/api/sprints"),
          fetch("/api/dashboard/overview"),
          fetch("/api/notifications?limit=60"),
        ])

        const retrosJson = await jsonOrThrow<{
          success: boolean
          data: { me: number; items: RetroItem[]; stats: Stats; categoryMix: { category: string; count: number }[] }
        }>(retrosRes)
        setMe(retrosJson.data.me)
        setItems(retrosJson.data.items)
        setStats(retrosJson.data.stats)
        setCategoryMix(retrosJson.data.categoryMix)

        const sprintsJson = await jsonOrThrow<{ success: boolean; data: { id: number; name: string; status: string }[] }>(sprintsRes)
        setSprints(
          (sprintsJson.data ?? [])
            .map((s) => ({ id: s.id, name: s.name, status: s.status }))
            .slice(0, 40),
        )

        const overviewJson = await overviewRes.json().catch(() => null)
        if (overviewJson?.success) {
          const workload = (overviewJson.data as DashboardOverview).workload ?? []
          setMembers(workload.map((w) => ({ id: w.id, name: w.name, avatar: w.avatar })))
        }

        const notifJson = await notifRes.json().catch(() => null)
        setNotifications(notifJson?.items ?? [])

        // keep a sensible selection
        setSelectedId((prev) => {
          const wanted = preferId ?? prev ?? null
          if (wanted !== null && retrosJson.data.items.some((r) => r.id === wanted)) return wanted
          return retrosJson.data.items[0]?.id ?? null
        })
      } catch (err) {
        toast({ variant: "destructive", title: "Retros workspace", description: (err as Error).message })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    void load(true)
  }, [load])

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null)
      return
    }
    void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  /* ------------------------------------------------------------- selectors */

  const agenda = useMemo(() => items.filter((r) => r.status === "scheduled"), [items])
  const retroFeed = useMemo(
    () => notifications.filter((n) => (n.metadata as { link?: string } | null | undefined)?.link === "/dashboard/retros"),
    [notifications],
  )
  const topTryNext = useMemo(() => {
    if (!detail) return null
    const tries = detail.notes.filter((n) => n.category === "try_next")
    return tries.length > 0 ? tries.reduce((a, b) => (b.votes > a.votes ? b : a)) : null
  }, [detail])

  const notesPerRetro = useMemo(
    () => items.slice(0, 10).map((r) => ({ name: shortLabel(r), went_well: r.went_well_count, went_bad: r.went_bad_count, try_next: r.try_next_count })),
    [items],
  )
  const actionSeries = useMemo(
    () =>
      items
        .slice(0, 10)
        .map((r) => ({
          name: shortLabel(r),
          done: r.actions_done,
          open: Math.max(0, r.actions_open - r.actions_overdue),
          overdue: r.actions_overdue,
        })),
    [items],
  )

  /* --------------------------------------------------------------- actions */

  const createRetro = async () => {
    if (!newDraft.title.trim()) {
      toast({ variant: "destructive", title: "New retro", description: "A title is required." })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/retros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDraft.title.trim(),
          date: newDraft.date,
          status: newDraft.status,
          sprintId: newDraft.sprintId === "none" ? null : Number(newDraft.sprintId),
        }),
      })
      const json = await jsonOrThrow<{ success: boolean; data: { item: { id: number } } }>(res)
      setNewOpen(false)
      setNewDraft({ title: "", sprintId: "none", date: new Date().toISOString().slice(0, 10), status: "draft" })
      toast({
        title: "Retro created",
        description: newDraft.status === "scheduled" ? "Scheduled — the board is open for notes." : "Draft created.",
      })
      await load(false, json.data.item.id)
    } catch (err) {
      toast({ variant: "destructive", title: "Could not create retro", description: (err as Error).message })
    } finally {
      setCreating(false)
    }
  }

  const openEditDialog = (retro: RetroItem) => {
    setEditTarget(retro)
    setEditDraft({ title: retro.title, date: retro.date, status: retro.status, sprintId: retro.sprint_id === null ? "none" : String(retro.sprint_id) })
  }

  const saveEdit = async () => {
    if (!editTarget) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/retros/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title,
          date: editDraft.date,
          status: editDraft.status,
          sprintId: editDraft.sprintId === "none" ? null : Number(editDraft.sprintId),
        }),
      })
      await jsonOrThrow(res)
      setEditTarget(null)
      toast({ title: "Retro updated", description: `"${editDraft.title}" saved.` })
      await load(false, editTarget.id)
      if (selectedId === editTarget.id) await loadDetail(editTarget.id)
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: (err as Error).message })
    } finally {
      setSavingEdit(false)
    }
  }

  const setRetroStatus = async (retroId: number, status: RetroStatus) => {
    try {
      const res = await fetch(`/api/retros/${retroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      await jsonOrThrow(res)
      toast({
        title: status === "completed" ? "Retro completed" : status === "archived" ? "Retro archived" : "Retro updated",
        description:
          status === "completed"
            ? "Note authors and action owners were notified."
            : status === "scheduled"
              ? "Scheduled — the creator was notified."
              : `Status is now "${status}".`,
      })
      await load(false, retroId)
      if (selectedId === retroId) await loadDetail(retroId)
    } catch (err) {
      toast({ variant: "destructive", title: "Status change failed", description: (err as Error).message })
    }
  }

  // Honest client-side mirror of the server gate (≥1 note per column) so the
  // toast explains exactly which columns are still empty; the server enforces.
  const attemptComplete = () => {
    if (!detail) return
    const missing = CATEGORY_ORDER.filter((c) => !detail.notes.some((n) => n.category === c))
    if (missing.length > 0) {
      toast({
        variant: "destructive",
        title: "Cannot complete this retro",
        description: `Still empty: ${missing.map((c) => `"${CATEGORY_META[c].label}"`).join(", ")}. Add at least one note per column.`,
      })
      return
    }
    setConfirm({ kind: "completeRetro", id: detail.retro.id, label: detail.retro.title })
  }

  const addNote = async (category: NoteCategory) => {
    if (!selectedId) return
    const body = noteDrafts[category].trim()
    if (!body) {
      toast({ variant: "destructive", title: "Empty note", description: "Write the note before adding it." })
      return
    }
    setAddingNote(category)
    try {
      const res = await fetch(`/api/retros/${selectedId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, body }),
      })
      const json = await jsonOrThrow<{ success: boolean; data: { item: NoteItem } }>(res)
      setDetail((prev) => (prev ? { ...prev, notes: [...prev.notes, json.data.item] } : prev))
      setNoteDrafts((prev) => ({ ...prev, [category]: "" }))
      void load(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Could not add note", description: (err as Error).message })
    } finally {
      setAddingNote(null)
    }
  }

  const voteNote = async (note: NoteItem) => {
    if (!selectedId) return
    setVotingNoteId(note.id)
    try {
      if (note.my_vote) {
        const res = await fetch(`/api/retros/${selectedId}/notes/${note.id}/vote`, { method: "DELETE" })
        const json = await jsonOrThrow<{ success: boolean; data: { votes: number } }>(res)
        setDetail((prev) =>
          prev ? { ...prev, notes: prev.notes.map((n) => (n.id === note.id ? { ...n, my_vote: false, votes: json.data.votes } : n)) } : prev,
        )
      } else {
        const res = await fetch(`/api/retros/${selectedId}/notes/${note.id}/vote`, { method: "POST" })
        const json = await jsonOrThrow<{ success: boolean; data: { votes: number; myVote: boolean } }>(res)
        setDetail((prev) =>
          prev ? { ...prev, notes: prev.notes.map((n) => (n.id === note.id ? { ...n, my_vote: json.data.myVote, votes: json.data.votes } : n)) } : prev,
        )
      }
      void load(false)
    } catch (err) {
      // 409 from the server-side one-vote-per-user guard surfaces its message here.
      toast({ variant: "destructive", title: "Vote not recorded", description: (err as Error).message })
    } finally {
      setVotingNoteId(null)
    }
  }

  const addAction = async () => {
    if (!selectedId) return
    const body = actionDraft.body.trim()
    if (!body) {
      toast({ variant: "destructive", title: "Empty action", description: "Describe the action item first." })
      return
    }
    setAddingAction(true)
    try {
      const res = await fetch(`/api/retros/${selectedId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          ownerId: actionDraft.ownerId === "" ? null : Number(actionDraft.ownerId),
          dueDate: actionDraft.dueDate === "" ? null : actionDraft.dueDate,
        }),
      })
      await jsonOrThrow(res)
      setActionDraft({ body: "", ownerId: "", dueDate: "" })
      await loadDetail(selectedId)
      void load(false)
      toast({ title: "Action added", description: actionDraft.ownerId ? "The assignee was notified." : "Add an owner when someone should chase it." })
    } catch (err) {
      toast({ variant: "destructive", title: "Could not add action", description: (err as Error).message })
    } finally {
      setAddingAction(false)
    }
  }

  const patchAction = async (action: ActionItem, patch: Record<string, unknown>) => {
    if (!selectedId) return
    setBusyActionId(action.id)
    try {
      const res = await fetch(`/api/retros/${selectedId}/actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const json = await jsonOrThrow<{ success: boolean; data: { item: ActionItem } }>(res)
      setDetail((prev) => (prev ? { ...prev, actions: prev.actions.map((a) => (a.id === action.id ? json.data.item : a)) } : prev))
      void load(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Action update failed", description: (err as Error).message })
      if (selectedId) await loadDetail(selectedId)
    } finally {
      setBusyActionId(null)
    }
  }

  const convertTopTryNext = async () => {
    if (!selectedId || !topTryNext) return
    setConverting(true)
    try {
      const res = await fetch(`/api/retros/${selectedId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: topTryNext.body, sourceNoteId: topTryNext.id }),
      })
      await jsonOrThrow(res)
      await loadDetail(selectedId)
      void load(false)
      toast({ title: "Converted to action", description: `Top "try next" note (${topTryNext.votes} votes) became an action item.` })
    } catch (err) {
      toast({ variant: "destructive", title: "Conversion failed", description: (err as Error).message })
    } finally {
      setConverting(false)
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      if (confirm.kind === "deleteRetro") {
        await jsonOrThrow(await fetch(`/api/retros/${confirm.id}`, { method: "DELETE" }))
        if (selectedId === confirm.id) setSelectedId(null)
        toast({ title: "Retro deleted", description: "Its notes and actions were removed by the database cascade." })
      } else if (confirm.kind === "completeRetro") {
        await setRetroStatus(confirm.id, "completed")
      } else if (confirm.kind === "deleteNote") {
        await jsonOrThrow(await fetch(`/api/retros/${confirm.retroId}/notes/${confirm.id}`, { method: "DELETE" }))
        setDetail((prev) => (prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== confirm.id) } : prev))
        toast({ title: "Note removed" })
      } else {
        await jsonOrThrow(await fetch(`/api/retros/${confirm.retroId}/actions/${confirm.id}`, { method: "DELETE" }))
        setDetail((prev) => (prev ? { ...prev, actions: prev.actions.filter((a) => a.id !== confirm.id) } : prev))
        toast({ title: "Action removed" })
      }
      void load(false)
      setConfirm(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Request failed", description: (err as Error).message })
    } finally {
      setConfirmBusy(false)
    }
  }

  const exportCsv = () => {
    if (!detail) return
    const lines: string[] = ["kind,ref,category_or_owner,column_value,due_date,done,votes,body"]
    for (const n of [...detail.notes].sort((a, b) => a.category.localeCompare(b.category) || b.votes - a.votes)) {
      lines.push(["note", n.id, n.category, n.author_name, "", "", n.votes, csvEscape(n.body)].join(","))
    }
    for (const a of detail.actions) {
      lines.push(["action", a.id, a.owner_name ?? "unassigned", "", a.due_date ?? "", a.done ? "yes" : "no", "", csvEscape(a.body)].join(","))
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `retro-${detail.retro.id}-${detail.retro.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${detail.notes.length} notes + ${detail.actions.length} actions for "${detail.retro.title}".` })
  }

  /* ------------------------------------------------------------ rendering */

  const kpis = stats
    ? [
        { label: "Retros held", value: stats.retrosHeld, hint: `of ${stats.retrosTotal} total` },
        { label: "Open actions", value: stats.actionsOpen, hint: "across every retro" },
        { label: "Overdue actions", value: stats.actionsOverdue, hint: "past due, not done" },
        { label: "Avg notes / retro", value: stats.avgNotesPerRetro, hint: "participation depth" },
        { label: "Action completion", value: `${stats.actionCompletionPct}%`, hint: "done ÷ all actions" },
      ]
    : []

  return (
    <div className="space-y-6 p-6">
      {/* 1 · Header + New retro + Refresh */}
      <section aria-label="Retrospectives header" className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sprint retrospectives</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Run the three-column retro board, vote on notes (one vote per person, enforced server-side), convert the
            winning experiment into an action item and close the loop — everything here is persisted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load(false)} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New retro
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* 2 · KPI strip */}
          <section aria-label="Retro KPIs" className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{k.value}</p>
                  <p className="text-[11px] text-muted-foreground">{k.hint}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* 3 · Retro list */}
          <SectionCard title={`Retros (${items.length})`} icon={<MessageSquareQuote className="h-4 w-4 text-muted-foreground" />}>
            {items.length === 0 ? (
              <EmptyNote>No retros yet — create one to open the board.</EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Retro</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Sprint</th>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Notes</th>
                      <th className="py-2 pr-3 font-medium">Actions</th>
                      <th className="py-2 pr-3 font-medium">Top note</th>
                      <th className="py-2 font-medium">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-b last:border-0 ${selectedId === r.id ? "bg-accent/50" : ""} hover:bg-accent/30`}
                      >
                        <td className="py-2 pr-3">
                          <button
                            className="text-left font-medium underline-offset-2 hover:underline"
                            onClick={() => setSelectedId(r.id)}
                            aria-label={`Open retro ${r.title}`}
                          >
                            {r.title}
                          </button>
                          <p className="text-[11px] text-muted-foreground">by {r.creator_name}</p>
                        </td>
                        <td className="py-2 pr-3"><RetroStatusPill status={r.status} /></td>
                        <td className="py-2 pr-3 text-xs">{r.sprint_name ?? "—"}</td>
                        <td className="py-2 pr-3 text-xs tabular-nums">{r.date}</td>
                        <td className="py-2 pr-3 tabular-nums">{r.note_count}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {r.actions_done}/{r.action_count}
                          {r.actions_overdue > 0 && (
                            <span className="ml-1 text-[11px] font-medium text-destructive">({r.actions_overdue} late)</span>
                          )}
                        </td>
                        <td className="max-w-[240px] py-2 pr-3">
                          {r.top_note ? (
                            <span className="line-clamp-2 text-xs text-muted-foreground" title={r.top_note.body}>
                              “{r.top_note.body}” · {r.top_note.votes}▲
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setSelectedId(r.id)}>
                              Open <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${r.title}`} onClick={() => openEditDialog(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={`Archive ${r.title}`}
                              disabled={r.status === "archived"}
                              onClick={() => void setRetroStatus(r.id, "archived")}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label={`Delete ${r.title}`}
                              onClick={() => setConfirm({ kind: "deleteRetro", id: r.id, label: r.title })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* 4 · Selected retro toolbar */}
          <SectionCard title="Retro board" icon={<Trophy className="h-4 w-4 text-muted-foreground" />}>
            {selectedId === null ? (
              <EmptyNote>Select a retro above (or create one) to open its board.</EmptyNote>
            ) : detailLoading || !detail ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{detail.retro.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {detail.retro.date} · created by {detail.retro.creator_name} {relativeTime(String(detail.retro.created_at))}
                    {detail.retro.sprint_name ? <> · sprint <span className="font-medium text-foreground">{detail.retro.sprint_name}</span></> : null}
                  </p>
                </div>
                <RetroStatusPill status={detail.retro.status} />
                <Badge variant="outline">{detail.notes.length} notes</Badge>
                <Badge variant="outline">{detail.actions.length} actions</Badge>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {detail.retro.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => void setRetroStatus(detail.retro.id, "scheduled")}>
                      <CalendarClock className="mr-1.5 h-4 w-4" /> Schedule
                    </Button>
                  )}
                  {(detail.retro.status === "draft" || detail.retro.status === "scheduled") && (
                    <Button size="sm" onClick={attemptComplete}>
                      <ListChecks className="mr-1.5 h-4 w-4" /> Complete retro
                    </Button>
                  )}
                  {detail.retro.status === "archived" && (
                    <Button size="sm" variant="outline" onClick={() => void setRetroStatus(detail.retro.id, "draft")}>
                      <Play className="mr-1.5 h-4 w-4" /> Reopen as draft
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={exportCsv}>
                    <Download className="mr-1.5 h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          {/* 5–7 · Three-column note board */}
          {detail && !detailLoading && (
            <div className="grid gap-4 lg:grid-cols-3">
              {CATEGORY_ORDER.map((category) => {
                const meta = CATEGORY_META[category]
                const notes = detail.notes.filter((n) => n.category === category)
                const locked = detail.retro.status === "archived" || detail.retro.status === "completed"
                return (
                  <SectionCard
                    key={category}
                    title={`${meta.label} (${notes.length})`}
                    icon={<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />}
                  >
                    <p className="mb-3 text-[11px] text-muted-foreground">{meta.blurb}</p>
                    {notes.length === 0 ? (
                      <EmptyNote>No {meta.label.toLowerCase()} notes yet.</EmptyNote>
                    ) : (
                      <ul className="space-y-2">
                        {notes.map((note) => (
                          <li key={note.id} className="rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2">
                              <AvatarCircle name={note.author_name} avatar={note.author_avatar} size={24} />
                              <span className="text-xs font-medium">{note.author_name}</span>
                              <span className="text-[11px] text-muted-foreground">{relativeTime(String(note.created_at))}</span>
                              <div className="ml-auto flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant={note.my_vote ? "default" : "outline"}
                                  className={`h-6 gap-1 px-2 text-[11px] ${note.my_vote ? "" : "text-muted-foreground"}`}
                                  disabled={votingNoteId === note.id}
                                  onClick={() => void voteNote(note)}
                                  aria-label={note.my_vote ? `Remove your vote from this note (${note.votes})` : `Vote for this note (${note.votes})`}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  {note.votes}
                                </Button>
                                {(note.author_id === me || detail.retro.created_by === me) && !locked && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    aria-label="Delete note"
                                    onClick={() =>
                                      setConfirm({ kind: "deleteNote", retroId: detail.retro.id, id: note.id, label: note.body.slice(0, 60) })
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed">{note.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!locked && (
                      <>
                        <Separator className="my-3" />
                        <Label htmlFor={`note-${category}`} className="text-[11px] text-muted-foreground">
                          Add a note · posted as {members.find((m) => m.id === me)?.name ?? "you"}
                        </Label>
                        <Textarea
                          id={`note-${category}`}
                          rows={2}
                          maxLength={4000}
                          placeholder={`${meta.label.toLowerCase()}…`}
                          className="mt-1 text-sm"
                          value={noteDrafts[category]}
                          onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          variant="secondary"
                          disabled={addingNote === category}
                          onClick={() => void addNote(category)}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          {addingNote === category ? "Adding…" : `Add to ${meta.label}`}
                        </Button>
                      </>
                    )}
                    {locked && <p className="mt-3 text-[11px] italic text-muted-foreground">This retro is {detail.retro.status} — the board is read-only.</p>}
                  </SectionCard>
                )
              })}
            </div>
          )}

          {/* 8 · Action items */}
          {detail && !detailLoading && (
            <SectionCard
              title={`Action items (${detail.actions.filter((a) => !a.done).length} open)`}
              icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
              action={
                <Button size="sm" variant="outline" disabled={!topTryNext || converting} onClick={() => void convertTopTryNext()}>
                  <Trophy className="mr-1.5 h-4 w-4" />
                  {converting ? "Converting…" : topTryNext ? `Convert top "try next" (${topTryNext.votes}▲)` : "No “try next” notes yet"}
                </Button>
              }
            >
              {detail.actions.length === 0 ? (
                <EmptyNote>No action items yet — add one below or convert the top "try next" note.</EmptyNote>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="w-8 py-2 font-medium">Done</th>
                        <th className="py-2 pr-3 font-medium">Action</th>
                        <th className="py-2 pr-3 font-medium">Owner</th>
                        <th className="py-2 pr-3 font-medium">Due</th>
                        <th className="w-10 py-2 font-medium" aria-label="Remove" />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.actions.map((a) => (
                        <tr key={a.id} className={`border-b last:border-0 ${a.overdue ? "bg-destructive/10" : ""}`}>
                          <td className="py-2">
                            <Checkbox
                              checked={a.done}
                              disabled={busyActionId === a.id || detail.retro.status === "archived"}
                              onCheckedChange={(checked) => void patchAction(a, { done: checked === true })}
                              aria-label={`Mark "${a.body}" done`}
                            />
                          </td>
                          <td className={`py-2 pr-3 ${a.done ? "text-muted-foreground line-through" : ""}`}>{a.body}</td>
                          <td className="py-2 pr-3">
                            <Select
                              value={a.owner_id === null ? "none" : String(a.owner_id)}
                              disabled={busyActionId === a.id || detail.retro.status === "archived"}
                              onValueChange={(v) => void patchAction(a, { ownerId: v === "none" ? null : Number(v) })}
                            >
                              <SelectTrigger className="h-8 w-[170px] text-xs" aria-label={`Owner for action ${a.id}`}>
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Unassigned</SelectItem>
                                {members.map((m) => (
                                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 pr-3">
                            <Input
                              type="date"
                              className="h-8 w-[150px] text-xs"
                              aria-label={`Due date for action ${a.id}`}
                              value={a.due_date ?? ""}
                              disabled={busyActionId === a.id || detail.retro.status === "archived"}
                              onBlur={(e) => {
                                const next = e.target.value === "" ? null : e.target.value
                                if (String(a.due_date ?? "") !== String(next ?? "")) void patchAction(a, { dueDate: next })
                              }}
                            />
                            {a.overdue && <span className="ml-2 text-[11px] font-medium text-destructive">overdue</span>}
                          </td>
                          <td className="py-2">
                            {detail.retro.status !== "archived" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                aria-label={`Delete action ${a.body.slice(0, 40)}`}
                                onClick={() => setConfirm({ kind: "deleteAction", retroId: detail.retro.id, id: a.id, label: a.body.slice(0, 60) })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {detail.retro.status !== "archived" && detail.retro.status !== "completed" && (
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_160px_auto]">
                  <Input
                    aria-label="New action description"
                    placeholder="What should happen before the next retro?"
                    value={actionDraft.body}
                    maxLength={4000}
                    onChange={(e) => setActionDraft((p) => ({ ...p, body: e.target.value }))}
                  />
                  <Select
                    value={actionDraft.ownerId === "" ? "none" : actionDraft.ownerId}
                    onValueChange={(v) => setActionDraft((p) => ({ ...p, ownerId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger aria-label="New action owner"><SelectValue placeholder="Owner…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    aria-label="New action due date"
                    value={actionDraft.dueDate}
                    onChange={(e) => setActionDraft((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                  <Button size="sm" disabled={addingAction} onClick={() => void addAction()}>
                    <Plus className="mr-1 h-4 w-4" /> {addingAction ? "Adding…" : "Add action"}
                  </Button>
                </div>
              )}
            </SectionCard>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 9 · Category mix donut */}
            <SectionCard title="Note mix (all retros)" icon={<MessageSquareQuote className="h-4 w-4 text-muted-foreground" />}>
              {categoryMix.reduce((s, c) => s + c.count, 0) === 0 ? (
                <EmptyNote>Add notes across retros and the mix appears here.</EmptyNote>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={CATEGORY_ORDER.map((c) => ({
                        name: CATEGORY_META[c].label,
                        value: categoryMix.find((m) => m.category === c)?.count ?? 0,
                      })).filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <Cell key={c} fill={CATEGORY_META[c].color} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* 10 · Notes per retro */}
            <SectionCard title="Notes per retro" icon={<MessageSquareQuote className="h-4 w-4 text-muted-foreground" />}>
              {notesPerRetro.length === 0 ? (
                <EmptyNote>No retros to chart yet.</EmptyNote>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={notesPerRetro}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ ...AXIS }} interval={0} angle={-12} textAnchor="end" height={48} />
                    <YAxis allowDecimals={false} tick={{ ...AXIS }} width={30} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                    <Bar dataKey="went_well" name="Went well" stackId="n" fill="hsl(var(--chart-moss))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="went_bad" name="Went bad" stackId="n" fill="hsl(var(--destructive))" />
                    <Bar dataKey="try_next" name="Try next" stackId="n" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* 11 · Action status */}
            <SectionCard title="Action outcomes per retro" icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}>
              {actionSeries.length === 0 ? (
                <EmptyNote>No retros to chart yet.</EmptyNote>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={actionSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ ...AXIS }} interval={0} angle={-12} textAnchor="end" height={48} />
                    <YAxis allowDecimals={false} tick={{ ...AXIS }} width={30} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="done" name="Done" stackId="a" fill="hsl(var(--chart-pine))" />
                    <Bar dataKey="open" name="Open" stackId="a" fill="hsl(var(--chart-stone))" />
                    <Bar dataKey="overdue" name="Overdue" stackId="a" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* 12 · Scheduled agenda */}
            <SectionCard title={`Upcoming retros (${agenda.length})`} icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}>
              {agenda.length === 0 ? (
                <EmptyNote>Nothing scheduled — flip a draft retro to “scheduled” to put it on the agenda.</EmptyNote>
              ) : (
                <ul className="space-y-2">
                  {agenda.map((r) => {
                    const days = Math.ceil((new Date(`${r.date}T23:59:59`).getTime() - Date.now()) / 86_400_000)
                    return (
                      <li key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                          {days >= 0 ? `${days}d` : "now"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {r.date}{r.sprint_name ? ` · ${r.sprint_name}` : ""} · {r.note_count} notes so far
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setSelectedId(r.id)}>
                          Open <ArrowRight className="h-3 w-3" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* 13 · Activity feed */}
          <SectionCard title="Retro activity" icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}>
            {retroFeed.length === 0 ? (
              <EmptyNote>No retro events yet — schedule or complete a retro, or assign an action, and it lands here.</EmptyNote>
            ) : (
              <ul className="space-y-2">
                {retroFeed.slice(0, 12).map((n) => (
                  <li key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-chart-clay" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.isRead ? "text-muted-foreground" : "font-medium"}`}>{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {/* New retro dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New retrospective</DialogTitle>
            <DialogDescription>Creates a real retro row — draft boards accept notes immediately, scheduled ones notify you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="retro-title">Title</Label>
              <Input
                id="retro-title"
                maxLength={255}
                placeholder="Sprint 13 retro — what did we learn?"
                value={newDraft.title}
                onChange={(e) => setNewDraft((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="retro-sprint">Linked sprint (optional)</Label>
              <Select value={newDraft.sprintId} onValueChange={(v) => setNewDraft((p) => ({ ...p, sprintId: v }))}>
                <SelectTrigger id="retro-sprint"><SelectValue placeholder="No sprint" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sprint</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="retro-date">Date</Label>
                <Input id="retro-date" type="date" value={newDraft.date} onChange={(e) => setNewDraft((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="retro-status">Initial status</Label>
                <Select value={newDraft.status} onValueChange={(v) => setNewDraft((p) => ({ ...p, status: v as "draft" | "scheduled" }))}>
                  <SelectTrigger id="retro-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={() => void createRetro()} disabled={creating}>{creating ? "Creating…" : "Create retro"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit retro dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit retro</DialogTitle>
            <DialogDescription>Changes persist through PATCH /api/retros/[id]. Setting “completed” here runs the same validation as the board button.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" maxLength={255} value={editDraft.title} onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input id="edit-date" type="date" value={editDraft.date} onChange={(e) => setEditDraft((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editDraft.status} onValueChange={(v) => setEditDraft((p) => ({ ...p, status: v as RetroStatus }))}>
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-sprint">Linked sprint</Label>
              <Select value={editDraft.sprintId} onValueChange={(v) => setEditDraft((p) => ({ ...p, sprintId: v }))}>
                <SelectTrigger id="edit-sprint"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sprint</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={() => void saveEdit()} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm destructive / gated actions */}
      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === "completeRetro" ? "Complete this retro?" : confirm?.kind === "deleteRetro" ? "Delete this retro?" : "Remove this entry?"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === "deleteRetro"
                ? `"${confirm.label}" and ALL of its notes and action items are deleted for everyone (database cascade). This cannot be undone.`
                : confirm?.kind === "completeRetro"
                  ? `Closing "${confirm.label}" notifies every note author and action owner that the retro is done.`
                  : `"${confirm?.label ?? ""}" will be removed from the board.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant={confirm?.kind === "completeRetro" ? "default" : "destructive"}
              disabled={confirmBusy}
              onClick={() => void runConfirm()}
            >
              {confirmBusy ? "Working…" : confirm?.kind === "completeRetro" ? "Complete retro" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
