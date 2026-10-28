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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Check,
  Copy,
  Heart,
  Link2,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Smile,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  AXIS,
  AvatarCircle,
  EmptyNote,
  PriorityPill,
  SectionCard,
  StatusPill,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type TeamRow = {
  id: number
  name: string
  email: string
  role: string
  department: string
  status: string
  avatar: string | null
  skills: string[]
  utilization: number
  jobTitle?: string | null
  location?: string | null
  joinedAt?: string | null
  openTasks: number
  doneTasks: number
  blockedTasks: number
  openPoints: number
  mood: string | null
  wellbeingScore: number | null
  xp: number
  level: number
}

type MemberDetail = {
  profile: {
    id: number
    name: string
    email: string
    role: string
    jobTitle: string | null
    department: string | null
    location: string | null
    bio: string | null
    status: string | null
    timezone: string | null
    joinedAt: string | null
  }
  aggregates: {
    openTasks: number
    doneTasks: number
    blockedTasks: number
    openPoints: number
    utilization: number
    mood: string | null
    wellbeingScore: number | null
    xp: number
    level: number
  }
  openTasks: {
    id: number
    title: string
    status: string
    priority: string
    storyPoints: number
    dueDate: string | null
  }[]
}

type NotificationItem = {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
}

type MemberDraft = {
  id: number | null
  name: string
  email: string
  role: string
  department: string
  location: string
  status: string
  avatar: string
}

type SortKey = "name" | "role" | "workload" | "happiness" | "xp" | "joinedAt"

/* -------------------------------------------------------------- constants */

const PALETTE = [
  "hsl(var(--chart-pine))",
  "hsl(var(--chart-stone))",
  "hsl(var(--chart-clay))",
  "hsl(var(--chart-moss))",
  "hsl(var(--destructive))",
]

const MOOD_META: Record<string, { emoji: string; label: string }> = {
  great: { emoji: "😄", label: "Great" },
  good: { emoji: "🙂", label: "Good" },
  happy: { emoji: "🙂", label: "Happy" },
  ok: { emoji: "😐", label: "Okay" },
  neutral: { emoji: "😐", label: "Neutral" },
  stressed: { emoji: "😓", label: "Stressed" },
  overwhelmed: { emoji: "😰", label: "Overwhelmed" },
  burned_out: { emoji: "🔥", label: "Burned out" },
}

function moodMeta(mood: string | null) {
  if (!mood) return { emoji: "❔", label: "No check-in" }
  return MOOD_META[mood.toLowerCase()] ?? { emoji: "❔", label: mood }
}

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "online", label: "Online" },
  { value: "away", label: "Away" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
]

const STATUS_TONE: Record<string, string> = {
  online: "text-[hsl(var(--chart-moss))]",
  away: "text-[hsl(var(--chart-clay))]",
  busy: "text-[hsl(var(--destructive))]",
  offline: "text-muted-foreground",
}

function emptyDraft(): MemberDraft {
  return { id: null, name: "", email: "", role: "", department: "", location: "", status: "offline", avatar: "" }
}

/* --------------------------------------------------------------- the page */

export default function TeamWorkspace() {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamRow[]>([])
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // toolbar state
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [view, setView] = useState<"grid" | "list">("grid")

  // table sort
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<MemberDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailRow, setDetailRow] = useState<TeamRow | null>(null)
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirmRow, setConfirmRow] = useState<TeamRow | null>(null)
  const [removing, setRemoving] = useState(false)

  // Invite-by-link: the token is shown once, here, and only its digest is stored.
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user")
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteResult, setInviteResult] = useState<{ email: string; role: string; inviteUrl: string; expiresAt: string } | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  /* ---- load ---- */

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const [membersRes, overviewRes, notifRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/dashboard/overview"),
        fetch("/api/notifications?limit=50"),
      ])
      const membersJson = await membersRes.json()
      if (!membersJson.success || !Array.isArray(membersJson.teamMembers)) {
        throw new Error(membersJson.error ?? "Failed to load team members")
      }
      setMembers(membersJson.teamMembers as TeamRow[])

      if (overviewRes.ok) {
        const overviewJson = await overviewRes.json()
        if (overviewJson.success) setOverview(overviewJson.data as DashboardOverview)
      }

      if (notifRes.ok) {
        const notifJson = await notifRes.json()
        if (Array.isArray(notifJson.items)) setNotifications(notifJson.items as NotificationItem[])
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Team workspace",
        description: (err as Error).message,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  /* ---- derived data ---- */

  const roles = useMemo(
    () => Array.from(new Set(members.map((m) => m.role).filter(Boolean))).sort(),
    [members],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false
      if (statusFilter !== "all" && m.status !== statusFilter) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        (m.department ?? "").toLowerCase().includes(q) ||
        (m.skills ?? []).some((s) => s.toLowerCase().includes(q))
      )
    })
  }, [members, search, roleFilter, statusFilter])

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    const value = (m: TeamRow): string | number => {
      switch (sortKey) {
        case "name":
          return m.name.toLowerCase()
        case "role":
          return m.role.toLowerCase()
        case "workload":
          return m.openTasks
        case "happiness":
          return m.wellbeingScore ?? -1
        case "xp":
          return m.xp
        case "joinedAt":
          return m.joinedAt ? new Date(m.joinedAt).getTime() : 0
      }
    }
    return [...filtered].sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const kpis = useMemo(() => {
    const scores = members.map((m) => m.wellbeingScore).filter((s): s is number => s != null)
    const avgHappiness = scores.length
      ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      : (overview?.kpis.teamHappiness ?? 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    return {
      members: members.length,
      avgHappiness,
      openTasks: members.reduce((s, m) => s + m.openTasks, 0),
      blocked: members.reduce((s, m) => s + m.blockedTasks, 0),
      newThisMonth: members.filter((m) => m.joinedAt && new Date(m.joinedAt) >= monthStart).length,
    }
  }, [members, overview])

  const workloadData = useMemo(
    () =>
      [...members]
        .sort((a, b) => b.openPoints - a.openPoints)
        .slice(0, 8)
        .map((m) => ({
          name: m.name.split(" ")[0],
          open: m.openPoints,
          done: m.doneTasks,
        })),
    [members],
  )

  const roleDonut = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of members) counts.set(m.role || "Unassigned", (counts.get(m.role || "Unassigned") ?? 0) + 1)
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [members])

  const teamActivity = useMemo(
    () =>
      notifications.filter((n) => {
        const link = typeof n.metadata?.link === "string" ? n.metadata.link : ""
        return link.includes("/dashboard/team") || n.metadata?.teamMemberId != null
      }),
    [notifications],
  )

  /* ---- mutations ---- */

  const openAdd = () => {
    setDraft(emptyDraft())
    setFormOpen(true)
  }

  const openInvite = () => {
    setInviteEmail("")
    setInviteRole("user")
    setInviteError("")
    setInviteResult(null)
    setInviteCopied(false)
    setInviteOpen(true)
  }

  const sendInvite = async () => {
    setInviteBusy(true)
    setInviteError("")
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error ?? "Could not create the invitation.")
      setInviteResult({
        email: json.data.email,
        role: json.data.role,
        inviteUrl: json.data.inviteUrl,
        expiresAt: json.data.expiresAt,
      })
    } catch (err) {
      setInviteError((err as Error).message)
    } finally {
      setInviteBusy(false)
    }
  }

  const copyInvite = async () => {
    if (!inviteResult) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${inviteResult.inviteUrl}`)
      setInviteCopied(true)
      window.setTimeout(() => setInviteCopied(false), 2000)
    } catch {
      setInviteError("Copy failed — select the link and copy it manually.")
    }
  }

  const openEdit = (m: TeamRow) => {
    setDetailRow(null)
    setDraft({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      department: m.department ?? "",
      location: m.location ?? "",
      status: m.status || "offline",
      avatar: m.avatar ?? "",
    })
    setFormOpen(true)
  }

  const saveMember = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast({ variant: "destructive", title: "Member", description: "A name is required." })
      return
    }
    if (draft.id === null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      toast({ variant: "destructive", title: "Member", description: "A valid email is required for new members." })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: draft.name.trim(),
        role: draft.role.trim() || "Team Member",
        department: draft.department.trim(),
        location: draft.location.trim(),
        status: draft.status,
        avatar: draft.avatar.trim(),
      }
      let res: Response
      if (draft.id === null) {
        payload.email = draft.email.trim()
        res = await fetch("/api/team/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/team/members/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Save failed")
      toast({
        title: draft.id === null ? "Member added" : "Member updated",
        description: payload.name as string,
      })
      setFormOpen(false)
      setDraft(null)
      await load(true)
    } catch (err) {
      toast({ variant: "destructive", title: "Member", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async () => {
    if (!confirmRow) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/team/members/${confirmRow.id}`, { method: "DELETE" })
      const json = await res.json()
      if (res.status === 409) {
        const counts = json.counts ?? {}
        toast({
          variant: "destructive",
          title: "Cannot remove member",
          description: `${confirmRow.name} still has ${counts.totalTasks ?? 0} task(s) (${counts.openTasks ?? 0} open). Reassign their work first.`,
        })
        setConfirmRow(null)
        return
      }
      if (!json.success) throw new Error(json.error ?? "Removal failed")
      toast({ title: "Member removed", description: `${confirmRow.name} no longer has team access.` })
      setConfirmRow(null)
      setDetailRow(null)
      await load(true)
    } catch (err) {
      toast({ variant: "destructive", title: "Remove member", description: (err as Error).message })
    } finally {
      setRemoving(false)
    }
  }

  const openDetail = async (m: TeamRow) => {
    setDetailRow(m)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/team/members/${m.id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Failed to load profile")
      setDetail({ profile: json.profile, aggregates: json.aggregates, openTasks: json.openTasks ?? [] })
    } catch (err) {
      toast({ variant: "destructive", title: "Member profile", description: (err as Error).message })
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  /* ---- render helpers ---- */

  const renderMoodChip = (m: TeamRow) => {
    const meta = moodMeta(m.mood)
    return (
      <Badge variant="secondary" className="gap-1 text-xs font-normal">
        <span aria-hidden>{meta.emoji}</span>
        {meta.label}
        {m.wellbeingScore != null && <span className="text-muted-foreground">· {m.wellbeingScore}</span>}
      </Badge>
    )
  }

  const sortHeader = (key: SortKey, label: string, className?: string) => (
    <th className={cn("px-3 py-2 text-left font-medium", className)}>
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1 hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {sortKey === key ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  )

  /* ------------------------------------------------------------- sections */

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 1 · header + add member */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Workspace</h1>
          <p className="text-muted-foreground">
            Roster, workload, wellbeing and gamification for everyone in your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/dashboard/team/settings">
              <Settings className="h-4 w-4" />
              <span>Workspace settings</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => load(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>
          {["admin", "superadmin"].includes((overview?.user.role ?? "").toLowerCase()) ? (
            <Button variant="outline" size="sm" className="gap-1" onClick={openInvite}>
              <Link2 className="h-4 w-4" />
              <span>Invite by link</span>
            </Button>
          ) : null}
          <Button size="sm" className="gap-1" onClick={openAdd}>
            <UserPlus className="h-4 w-4" />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* 2 · KPI strip */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Members
              </div>
              <p className="mt-1 text-2xl font-bold">{kpis.members}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Heart className="h-3.5 w-3.5" /> Avg happiness
              </div>
              <p className="mt-1 text-2xl font-bold">{kpis.avgHappiness}</p>
              <Progress value={kpis.avgHappiness} className="mt-1.5 h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" /> Open tasks
              </div>
              <p className="mt-1 text-2xl font-bold">{kpis.openTasks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bell className="h-3.5 w-3.5" /> Blocked
              </div>
              <p className={cn("mt-1 text-2xl font-bold", kpis.blocked > 0 && "text-destructive")}>
                {kpis.blocked}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Plus className="h-3.5 w-3.5" /> New this month
              </div>
              <p className="mt-1 text-2xl font-bold">{kpis.newThisMonth}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3 · search + filters + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search team members"
            placeholder="Search by name, role, skill…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Label className="sr-only" htmlFor="role-filter">
          Filter by role
        </Label>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger id="role-filter" className="h-9 w-40 text-sm">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="sr-only" htmlFor="status-filter">
          Filter by status
        </Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter" className="h-9 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 sm:ml-auto">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            aria-label="Grid view"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon"
            aria-label="List view"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyNote>No team members match this search. Adjust the filters or add a member.</EmptyNote>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        /* 4 · roster cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((m) => (
            <Card key={m.id} className="transition-colors hover:border-primary/40">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="flex items-center gap-3 text-left" onClick={() => openDetail(m)}>
                    <AvatarCircle name={m.name} avatar={m.avatar} size={44} />
                    <div>
                      <p className="text-sm font-semibold leading-tight">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.role}</p>
                      <p className="text-[11px] text-muted-foreground">{m.department}</p>
                    </div>
                  </button>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-[11px] capitalize",
                      STATUS_TONE[m.status] ?? "text-muted-foreground",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                    {m.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {renderMoodChip(m)}
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {m.openTasks} open
                  </Badge>
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {m.doneTasks} done
                  </Badge>
                  {m.blockedTasks > 0 && (
                    <Badge className="text-[11px] font-normal bg-destructive/10 text-destructive border border-destructive/30">
                      {m.blockedTasks} blocked
                    </Badge>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Workload</span>
                    <span>{m.utilization}%</span>
                  </div>
                  <Progress value={m.utilization} className="h-1.5" />
                </div>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openEdit(m)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => setConfirmRow(m)}
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* 5 · sortable member table */
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  {sortHeader("name", "Name")}
                  {sortHeader("role", "Role")}
                  <th className="px-3 py-2 text-left font-medium">Mood</th>
                  {sortHeader("workload", "Workload")}
                  {sortHeader("happiness", "Happiness")}
                  {sortHeader("xp", "XP")}
                  {sortHeader("joinedAt", "Joined")}
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <button type="button" className="flex items-center gap-2 text-left" onClick={() => openDetail(m)}>
                        <AvatarCircle name={m.name} avatar={m.avatar} size={26} />
                        <div>
                          <p className="font-medium leading-tight">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{m.role}</td>
                    <td className="px-3 py-2">{renderMoodChip(m)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {m.openTasks} open<span className="text-muted-foreground"> · {m.doneTasks} done</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{m.wellbeingScore ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {m.xp} <span className="text-muted-foreground">· Lv {m.level}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${m.name}`} onClick={() => openEdit(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label={`Remove ${m.name}`}
                          onClick={() => setConfirmRow(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 6 · workload distribution */}
      <SectionCard title="Workload distribution" icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}>
        {loading ? (
          <Skeleton className="h-56" />
        ) : workloadData.length === 0 ? (
          <EmptyNote>No workload data yet — add team members to see their distribution.</EmptyNote>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workloadData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} />
              <YAxis tickLine={false} axisLine={false} tick={AXIS} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="open" name="Open points" stackId="w" fill="hsl(var(--chart-clay))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="done" name="Done tasks" stackId="w" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7 · happiness trend */}
        <SectionCard title="Team happiness trend" icon={<Smile className="h-4 w-4 text-muted-foreground" />}>
          {!overview ? (
            loading ? (
              <Skeleton className="h-52" />
            ) : (
              <EmptyNote>Wellbeing trend unavailable.</EmptyNote>
            )
          ) : overview.wellbeingTrend.length === 0 ? (
            <EmptyNote>No wellbeing check-ins yet.</EmptyNote>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={overview.wellbeingTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="happinessFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-moss))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--chart-moss))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tickLine={false} axisLine={false} tick={AXIS} />
                <YAxis tickLine={false} axisLine={false} tick={AXIS} domain={[0, 100]} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Happiness score"
                  stroke="hsl(var(--chart-moss))"
                  fill="url(#happinessFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* 8 · role distribution donut */}
        <SectionCard title="Role distribution" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
          {loading ? (
            <Skeleton className="h-52" />
          ) : roleDonut.length === 0 ? (
            <EmptyNoRole />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleDonut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {roleDonut.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* 9 · mood chips row */}
      <SectionCard title="Team mood" icon={<Smile className="h-4 w-4 text-muted-foreground" />}>
        {!overview ? (
          loading ? (
            <Skeleton className="h-14" />
          ) : (
            <EmptyNote>Team mood unavailable.</EmptyNote>
          )
        ) : overview.teamMood.length === 0 ? (
          <EmptyNote>No one has checked in on their wellbeing yet.</EmptyNote>
        ) : (
          <div className="flex flex-wrap gap-2">
            {overview.teamMood.map((t) => {
              const meta = moodMeta(t.mood)
              return (
                <Badge key={t.id} variant="outline" className="gap-1.5 py-1 pr-2 font-normal">
                  <AvatarCircle name={t.name} avatar={t.avatar} size={20} />
                  <span className="text-xs">{t.name.split(" ")[0]}</span>
                  <span aria-hidden>{meta.emoji}</span>
                  <span className="text-[11px] text-muted-foreground">{t.score}</span>
                </Badge>
              )
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 10 · XP leaderboard */}
        <SectionCard title="XP leaderboard" icon={<Trophy className="h-4 w-4 text-muted-foreground" />}>
          {!overview ? (
            loading ? (
              <Skeleton className="h-48" />
            ) : (
              <EmptyNote>Leaderboard unavailable.</EmptyNote>
            )
          ) : overview.leaderboard.length === 0 ? (
            <EmptyNote>No XP has been earned yet.</EmptyNote>
          ) : (
            <ol className="space-y-2">
              {overview.leaderboard.slice(0, 8).map((row, i) => (
                <li key={row.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-right text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <AvatarCircle name={row.name} avatar={row.avatar} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">Level {row.level}</p>
                  </div>
                  <span className="tabular-nums text-xs font-semibold">{row.xp} XP</span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        {/* 11 · team activity feed */}
        <SectionCard title="Team activity" icon={<Bell className="h-4 w-4 text-muted-foreground" />}>
          {teamActivity.length === 0 ? (
            loading ? (
              <Skeleton className="h-48" />
            ) : (
              <EmptyNote>No team activity yet. Member changes will show up here.</EmptyNote>
            )
          ) : (
            <ul className="space-y-3">
              {teamActivity.slice(0, 8).map((n) => (
                <li key={n.id} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--chart-pine))]" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* 12 · member detail dialog */}
      <Dialog open={detailRow !== null} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detailRow && <AvatarCircle name={detailRow.name} avatar={detailRow.avatar} size={36} />}
              {detailRow?.name}
            </DialogTitle>
            <DialogDescription>{detailRow?.role} · {detailRow?.department}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-40" />
            </div>
          ) : detail && detailRow ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Open tasks" value={detail.aggregates.openTasks} />
                <Stat label="Done" value={detail.aggregates.doneTasks} />
                <Stat label="XP" value={`${detail.aggregates.xp} · Lv ${detail.aggregates.level}`} />
                <Stat
                  label="Mood"
                  value={`${moodMeta(detail.aggregates.mood).emoji} ${detail.aggregates.wellbeingScore ?? "—"}`}
                />
              </div>
              <Separator />
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Field label="Email">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {detail.profile.email}
                  </span>
                </Field>
                <Field label="Location">{detail.profile.location || "—"}</Field>
                <Field label="Status">
                  <span className="capitalize">{detail.profile.status ?? "offline"}</span>
                </Field>
                <Field label="Joined">
                  {detail.profile.joinedAt ? new Date(detail.profile.joinedAt).toLocaleDateString() : "—"}
                </Field>
                {detail.profile.bio && <Field label="Bio">{detail.profile.bio}</Field>}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Open tasks
                </p>
                {detail.openTasks.length === 0 ? (
                  <EmptyNote>No open tasks assigned.</EmptyNote>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {detail.openTasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{t.title}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <PriorityPill priority={t.priority} />
                          <StatusPill status={t.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {(() => {
                const related = teamActivity.filter(
                  (n) => n.metadata?.teamMemberId === detailRow.id,
                )
                if (related.length === 0) return null
                return (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent notifications
                    </p>
                    <ul className="space-y-1.5">
                      {related.slice(0, 5).map((n) => (
                        <li key={n.id} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{n.title}</span> · {relativeTime(n.createdAt)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (detailRow) openEdit(detailRow)
                  }}
                >
                  <Pencil className="mr-1 h-4 w-4" /> Edit profile
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (detailRow) setConfirmRow(detailRow)
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Remove from team
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <EmptyNote>Profile could not be loaded.</EmptyNote>
          )}
        </DialogContent>
      </Dialog>

      {/* 13 · add / edit member dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id == null ? "Add team member" : "Edit team member"}</DialogTitle>
            <DialogDescription>
              {draft?.id == null
                ? "Creates a roster row the member can finish claiming via password reset."
                : "Changes are visible to the whole team and the member is notified."}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="member-name">Name</Label>
                <Input
                  id="member-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ada Lovelace"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={draft.email}
                  disabled={draft.id !== null}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  placeholder="ada@example.com"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="member-role">Role</Label>
                  <Input
                    id="member-role"
                    value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                    placeholder="Frontend Developer"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="member-department">Department</Label>
                  <Input
                    id="member-department"
                    value={draft.department}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                    placeholder="Engineering"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="member-location">Location</Label>
                  <Input
                    id="member-location"
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    placeholder="Nairobi"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="member-status">Presence</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger id="member-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.filter((s) => s.value !== "all").map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="member-avatar">Avatar (path or URL)</Label>
                <Input
                  id="member-avatar"
                  value={draft.avatar}
                  onChange={(e) => setDraft({ ...draft, avatar: e.target.value })}
                  placeholder="avatars/… or https://…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Upload first via storage, then paste the returned avatar path here.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveMember} disabled={saving}>
              {saving ? "Saving…" : draft?.id == null ? "Add member" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 14 · remove confirmation dialog */}
      <Dialog open={confirmRow !== null} onOpenChange={(open) => !open && setConfirmRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {confirmRow?.name}?</DialogTitle>
            <DialogDescription>
              This deletes their roster row, wellbeing history and gamification progress. Members with assigned
              tasks cannot be removed until their work is reassigned.
            </DialogDescription>
          </DialogHeader>
          {confirmRow && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                <span className="font-medium">{confirmRow.openTasks}</span> open ·{" "}
                <span className="font-medium">{confirmRow.doneTasks}</span> done ·{" "}
                <span className="font-medium">{confirmRow.blockedTasks}</span> blocked task(s)
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRow(null)} disabled={removing}>
              Keep member
            </Button>
            <Button variant="destructive" onClick={removeMember} disabled={removing}>
              {removing ? "Removing…" : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite by link — the token exists in this dialog once and is stored only as a digest. */}
      <Dialog open={inviteOpen} onOpenChange={(open) => !open && setInviteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite by link</DialogTitle>
            <DialogDescription>
              Creates a single-use invitation bound to one email address. It expires in seven days, and the link is
              shown once — copy it now.
            </DialogDescription>
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="invite-url">Invitation link</Label>
                <Input id="invite-url" value={`${typeof window === "undefined" ? "" : window.location.origin}${inviteResult.inviteUrl}`} readOnly onFocus={(e) => e.currentTarget.select()} />
              </div>
              <p className="text-xs text-muted-foreground">
                For {inviteResult.email} · role {inviteResult.role} · expires{" "}
                {new Date(inviteResult.expiresAt).toLocaleDateString()}
              </p>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => void copyInvite()}>
                {inviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {inviteCopied ? "Copied" : "Copy link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ada@example.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v === "admin" ? "admin" : "user")}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Super-admin access is never granted by invitation.</p>
              </div>
            </div>
          )}

          {inviteError ? (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {inviteError}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {inviteResult ? "Done" : "Cancel"}
            </Button>
            {inviteResult ? null : (
              <Button onClick={() => void sendInvite()} disabled={inviteBusy || !inviteEmail.trim()}>
                {inviteBusy ? "Creating…" : "Create invitation"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------------------------------------------------------- small pieces */

function EmptyNoRole() {
  return <EmptyNote>No roles to chart yet.</EmptyNote>
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-semibold leading-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words">{children}</p>
    </div>
  )
}
