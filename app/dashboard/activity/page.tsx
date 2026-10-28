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
  Bell,
  CircleDot,
  Download,
  ExternalLink,
  CheckCheck,
  Settings,
  Brain,
  Sparkles,
  Trophy,
  Zap,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  AvatarCircle,
  EmptyNote,
  SectionCard,
  StatusPill,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type ActivityKind = "task" | "sprint" | "wellbeing" | "gamification" | "ai" | "notification" | "system"

type ActivityItem = {
  id: string
  kind: ActivityKind
  type: string
  title: string
  body: string | null
  link?: string
  actorName?: string
  entityKind: string
  occurredAt: string
  read?: boolean
}

type DigestNotification = {
  id: number
  type: string
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  createdAt: string | null
}

type ActivityFeed = {
  items: ActivityItem[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
  windowDays: number
  unreadCount: number
  kpis: {
    eventsToday: number
    events7d: number
    mostActiveMember: { name: string; count: number } | null
    busiestDay: { date: string; count: number } | null
  }
  kindCounts: Record<string, number>
  byDay: Array<{ date: string } & Record<ActivityKind, number>>
  actors: Array<{ name: string; count: number }>
  spotlightTasks: Array<{
    id: number
    title: string
    status: string
    priority: string
    storyPoints: number
    assigneeName: string | null
    updatedAt: string | null
  }>
  sprintPulse: Array<{ id: number; name: string; status: string; updatedAt: string | null }>
  checkins: Array<{
    id: number
    userName: string
    date: string
    mood: string
    wellbeingScore: number
    stressLevel: number
    createdAt: string | null
  }>
  recentNotifications: DigestNotification[]
}

/* ------------------------------------------------------------ kind styling */

const KINDS: ActivityKind[] = ["task", "sprint", "wellbeing", "gamification", "ai", "notification", "system"]

const KIND_META: Record<ActivityKind, { label: string; color: string; icon: React.ReactNode }> = {
  task: { label: "Tasks", color: "hsl(var(--chart-pine))", icon: <CircleDot className="h-3.5 w-3.5" /> },
  sprint: { label: "Sprints", color: "hsl(var(--chart-moss))", icon: <Zap className="h-3.5 w-3.5" /> },
  wellbeing: { label: "Wellbeing", color: "hsl(var(--chart-clay))", icon: <Sparkles className="h-3.5 w-3.5" /> },
  gamification: { label: "XP & levels", color: "hsl(var(--chart-stone))", icon: <Trophy className="h-3.5 w-3.5" /> },
  ai: { label: "AI insights", color: "hsl(var(--primary))", icon: <Brain className="h-3.5 w-3.5" /> },
  notification: { label: "Notifications", color: "hsl(var(--muted-foreground))", icon: <Bell className="h-3.5 w-3.5" /> },
  system: { label: "System", color: "hsl(var(--muted-foreground) / 0.55)", icon: <Settings className="h-3.5 w-3.5" /> },
}

const KINDS_FOR_BAR: ActivityKind[] = ["task", "sprint", "wellbeing", "gamification", "ai", "notification"]

const DONUT_COLORS = [
  "hsl(var(--chart-pine))",
  "hsl(var(--chart-clay))",
  "hsl(var(--chart-moss))",
  "hsl(var(--chart-stone))",
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
]

/* ------------------------------------------------------------ date helpers */

function localDayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function dayHeading(key: string): string {
  const today = localDayKey(new Date().toISOString())
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = localDayKey(y.toISOString())
  if (key === today) return "Today"
  if (key === yesterday) return "Yesterday"
  const [yy, mm, dd] = key.split("-").map(Number)
  return new Date(yy, mm - 1, dd).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function shortDate(ymd: string): string {
  const [, mm, dd] = ymd.split("-")
  return `${mm}/${dd}`
}

/* ----------------------------------------------------------------- the page */

export default function ActivityCenter() {
  const { toast } = useToast()
  const [feed, setFeed] = useState<ActivityFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)

  // filters: actor is applied client-side; kind, days and q are server params
  const [days, setDays] = useState("14")
  const [kind, setKind] = useState("all")
  const [actor, setActor] = useState("all")
  const [qDraft, setQDraft] = useState("")
  const [q, setQ] = useState("")

  const [items, setItems] = useState<ActivityItem[]>([])
  const [hasMore, setHasMore] = useState(false)

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams()
      params.set("days", days)
      if (kind !== "all") params.set("kind", kind)
      if (q) params.set("q", q)
      if (offset > 0) params.set("offset", String(offset))
      return `/api/activity?${params.toString()}`
    },
    [days, kind, q],
  )

  const loadRealtimeFlag = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview")
      const json = await res.json()
      if (json.success) setRealtimeEnabled(Boolean(json.data?.realtimeEnabled))
    } catch {
      // overview failure is non-fatal here — the badge simply stays off
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl(0))
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Activity request failed (${res.status})`)
      }
      const json = (await res.json()) as ActivityFeed
      setFeed(json)
      setItems(json.items)
      setHasMore(json.hasMore)
    } catch (err) {
      toast({ variant: "destructive", title: "Activity", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [buildUrl, toast])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([load(), loadRealtimeFlag()])
    setRefreshing(false)
    toast({ title: "Activity refreshed" })
  }, [load, loadRealtimeFlag, toast])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(items.length))
      if (!res.ok) throw new Error("Could not load more activity.")
      const json = (await res.json()) as ActivityFeed
      setItems((prev) => [...prev, ...json.items])
      setHasMore(json.hasMore)
    } catch (err) {
      toast({ variant: "destructive", title: "Activity", description: (err as Error).message })
    } finally {
      setLoadingMore(false)
    }
  }, [buildUrl, items.length, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadRealtimeFlag()
  }, [loadRealtimeFlag])

  /* ---- mutations (notifications via the existing API) ---- */

  const markOneRead = useCallback(
    async (itemId: string) => {
      if (!itemId.startsWith("n-")) return
      const notifId = itemId.slice(2)
      try {
        const res = await fetch(`/api/notifications/${notifId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        })
        if (!res.ok) throw new Error("Could not mark as read.")
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, read: true } : i)))
        setFeed((f) =>
          f
            ? {
                ...f,
                unreadCount: Math.max(0, f.unreadCount - 1),
                recentNotifications: f.recentNotifications.map((n) =>
                  String(n.id) === notifId ? { ...n, isRead: true } : n,
                ),
              }
            : f,
        )
      } catch (err) {
        toast({ variant: "destructive", title: "Activity", description: (err as Error).message })
      }
    },
    [toast],
  )

  const markAllRead = useCallback(async () => {
    setMarkingAll(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Could not update notifications.")
      await load()
      toast({ title: "All notifications marked read", description: `${json.updated ?? 0} updated` })
    } catch (err) {
      toast({ variant: "destructive", title: "Activity", description: (err as Error).message })
    } finally {
      setMarkingAll(false)
    }
  }, [load, toast])

  /* ---- derived views ---- */

  const shownItems = useMemo(
    () =>
      items.filter((i) => {
        if (kind !== "all" && i.kind !== kind) return false
        if (actor !== "all" && i.actorName !== actor) return false
        return true
      }),
    [items, kind, actor],
  )

  const grouped = useMemo(() => {
    const out: { key: string; items: ActivityItem[] }[] = []
    for (const item of shownItems) {
      const key = localDayKey(item.occurredAt)
      const last = out[out.length - 1]
      if (last && last.key === key) last.items.push(item)
      else out.push({ key, items: [item] })
    }
    return out
  }, [shownItems])

  const actorOptions = useMemo(() => {
    const names = new Set<string>()
    for (const i of items) if (i.actorName) names.add(i.actorName)
    return [...names].sort()
  }, [items])

  const digestTypes = useMemo(() => {
    if (!feed) return []
    const counts = new Map<string, number>()
    for (const n of feed.recentNotifications) counts.set(n.type, (counts.get(n.type) ?? 0) + 1)
    return [...counts.entries()].map(([name, value]) => ({ name, value }))
  }, [feed])

  const unreadDigest = useMemo(
    () => (feed ? feed.recentNotifications.filter((n) => !n.isRead) : []),
    [feed],
  )

  const gamificationFlashes = useMemo(
    () => (feed ? feed.recentNotifications.filter((n) => n.type === "gamification").slice(0, 6) : []),
    [feed],
  )

  const chartData = useMemo(
    () =>
      (feed?.byDay ?? []).map((d) => ({
        label: shortDate(d.date),
        ...KINDS_FOR_BAR.reduce<Record<string, number>>((acc, k) => {
          acc[k] = d[k] ?? 0
          return acc
        }, {}),
      })),
    [feed],
  )

  const exportCsv = useCallback(() => {
    if (shownItems.length === 0) {
      toast({ variant: "destructive", title: "Export", description: "Nothing to export with these filters." })
      return
    }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const header = ["occurredAt", "kind", "type", "title", "body", "actor", "link", "read"]
    const rows = shownItems.map((i) =>
      [i.occurredAt, i.kind, i.type, i.title, i.body ?? "", i.actorName ?? "", i.link ?? "", i.read === undefined ? "" : String(i.read)]
        .map(esc)
        .join(","),
    )
    const blob = new Blob([[header.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-activity-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${shownItems.length} events` })
  }, [shownItems, toast])

  const clearFilters = useCallback(() => {
    setKind("all")
    setActor("all")
    setQDraft("")
    setQ("")
  }, [])

  const filtersActive = kind !== "all" || actor !== "all" || q !== ""

  /* ---- render ---- */

  if (loading && !feed) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (!feed) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn’t reach the activity API. Your session may have expired.
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

  const { kpis } = feed

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header: live badge, refresh, mark-all-read */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Activity center</h1>
          <p className="text-sm text-muted-foreground">
            Notifications plus entity changes across tasks, sprints, wellbeing and XP — aggregated on demand.
            {realtimeEnabled && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> bell live
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={markAllRead} disabled={markingAll}>
            <CheckCheck className="mr-1 h-4 w-4" />
            {markingAll ? "Marking…" : "Mark all read"}
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {([
          { label: "Events today", value: String(kpis.eventsToday), hint: "since midnight UTC", tone: undefined, small: false },
          { label: "Events last 7 days", value: String(kpis.events7d), hint: `stream window: ${feed.windowDays}d`, tone: undefined, small: false },
          { label: "Unread notifications", value: String(feed.unreadCount), hint: "bell feed", tone: feed.unreadCount > 0 ? "text-red-500" : undefined, small: false },
          { label: "Most active member", value: kpis.mostActiveMember?.name ?? "—", hint: kpis.mostActiveMember ? `${kpis.mostActiveMember.count} events in window` : "nobody yet", tone: undefined, small: true },
          { label: "Busiest day", value: kpis.busiestDay ? shortDate(kpis.busiestDay.date) : "—", hint: kpis.busiestDay ? `${kpis.busiestDay.count} events` : "quiet stretch", tone: undefined, small: true },
        ] as Array<{ label: string; value: string; hint: string; tone?: string; small: boolean }>).map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("mt-1 font-semibold tabular-nums", k.small ? "truncate text-base" : "text-2xl", k.tone)}>
                {k.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3 — Filter bar (kind/days/q are server params; actor narrows the loaded stream) */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <form
            className="relative min-w-44 flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              setQ(qDraft.trim())
            }}
          >
            <Label htmlFor="act-q" className="sr-only">
              Search activity
            </Label>
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="act-q"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Search titles… (Enter to apply)"
              className="h-9 pl-8 text-sm"
            />
          </form>
          <div>
            <Label htmlFor="act-kind" className="sr-only">
              Kind
            </Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="act-kind" className="h-9 w-40 text-sm">
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="act-actor" className="sr-only">
              Actor
            </Label>
            <Select value={actor} onValueChange={setActor}>
              <SelectTrigger id="act-actor" className="h-9 w-40 text-sm">
                <SelectValue placeholder="Actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                {actorOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="act-days" className="sr-only">
              Time window
            </Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger id="act-days" className="h-9 w-28 text-sm">
                <SelectValue placeholder="Window" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={clearFilters} disabled={!filtersActive}>
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={exportCsv}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* 4 — Unified timeline grouped by day */}
      <SectionCard
        title={`Timeline — ${shownItems.length} shown of ${feed.total} in window`}
        icon={<Bell className="h-4 w-4" />}
        action={
          filtersActive ? (
            <Badge variant="secondary" className="text-[10px]">
              filtered{q ? ` · “${q}”` : ""}
            </Badge>
          ) : undefined
        }
      >
        {grouped.length > 0 ? (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.key}>
                <p className="sticky top-0 z-[1] mb-1 bg-card/95 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                  {dayHeading(g.key)}
                </p>
                <ul className="space-y-1">
                  {g.items.map((i) => (
                    <li key={i.id}>
                      <div className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50">
                        <span className="mt-0.5 shrink-0" style={{ color: KIND_META[i.kind].color }}>
                          {KIND_META[i.kind].icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{i.title}</span>
                            {i.read === false && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" title="unread" />}
                          </span>
                          {i.body && <span className="block truncate text-xs text-muted-foreground">{i.body}</span>}
                        </span>
                        {i.actorName && (
                          <span className="hidden shrink-0 items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                            <AvatarCircle name={i.actorName} size={18} />
                            {i.actorName.split(" ")[0]}
                          </span>
                        )}
                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{relativeTime(i.occurredAt)}</span>
                        {i.read === false && i.id.startsWith("n-") && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => markOneRead(i.id)}>
                            Read
                          </Button>
                        )}
                        {i.link && (
                          <Button asChild size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]">
                            <Link href={i.link}>
                              Open <ExternalLink className="ml-0.5 h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button size="sm" variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load earlier events"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyNote>
            {filtersActive
              ? "No events match these filters in the current window."
              : `Nothing happened in the last ${feed.windowDays} days. Widen the window or check back after the team moves things.`}
          </EmptyNote>
        )}
      </SectionCard>

      {/* 5+6 — Stacked by-kind chart + notifications digest */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Activity by kind (daily)" icon={<Zap className="h-4 w-4" />}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} minTickGap={12} />
                <YAxis tick={AXIS} width={26} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => KIND_META[v as ActivityKind]?.label ?? String(v)} />
                {KINDS_FOR_BAR.map((k) => (
                  <Bar key={k} dataKey={k} name={k} stackId="a" fill={KIND_META[k].color} radius={k === "notification" ? [3, 3, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No events to plot in this window.</EmptyNote>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Chart always covers 14 days of the fetched window; the stream above respects your filters.
          </p>
        </SectionCard>

        <SectionCard
          title="My notifications digest"
          icon={<Bell className="h-4 w-4" />}
          action={
            <Badge variant={feed.unreadCount > 0 ? "destructive" : "outline"} className="text-[10px]">
              {feed.unreadCount} unread
            </Badge>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              {digestTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={digestTypes} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2}>
                      {digestTypes.map((t, idx) => (
                        <Cell key={t.name} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyNote>No notifications in this window.</EmptyNote>
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unread</p>
              {unreadDigest.length > 0 ? (
                <ul className="max-h-44 space-y-1 overflow-y-auto">
                  {unreadDigest.map((n) => (
                    <li key={n.id}>
                      <div className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/60">
                        <span className="min-w-0 flex-1">
                          <button
                            className="block w-full truncate text-left text-xs font-medium hover:underline"
                            onClick={() => markOneRead(`n-${n.id}`)}
                            title="Mark read"
                          >
                            {n.title}
                          </button>
                          <span className="text-[10px] capitalize text-muted-foreground">
                            {n.type}
                            {n.createdAt ? ` · ${relativeTime(n.createdAt)}` : ""}
                          </span>
                        </span>
                        {n.link && (
                          <Button asChild size="sm" variant="ghost" className="h-6 shrink-0 px-1.5 text-[10px]">
                            <Link href={n.link}>Jump</Link>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">All caught up.</p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 7 — Entity spotlight: recently changed tasks */}
      <SectionCard
        title="Entity spotlight · recently changed tasks"
        icon={<CircleDot className="h-4 w-4" />}
        action={
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link href="/dashboard/tasks">Task board</Link>
          </Button>
        }
      >
        {feed.spotlightTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Points</th>
                  <th className="px-3 py-2 font-medium">Assignee</th>
                  <th className="px-3 py-2 font-medium">Touched</th>
                </tr>
              </thead>
              <tbody>
                {feed.spotlightTasks.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="max-w-64 px-3 py-2">
                      <Link href="/dashboard/tasks" className="block truncate font-medium hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{t.storyPoints}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.assigneeName ?? "Unassigned"}</td>
                    <td className="px-3 py-2 text-[11px] tabular-nums text-muted-foreground">
                      {t.updatedAt ? relativeTime(t.updatedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>No task changes in this window.</EmptyNote>
        )}
      </SectionCard>

      {/* 8+9+10 — Sprint pulse · wellbeing pings · gamification flashes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Sprint pulse"
          icon={<Zap className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/sprints">Sprints</Link>
            </Button>
          }
        >
          {feed.sprintPulse.length > 0 ? (
            <ul className="divide-y">
              {feed.sprintPulse.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.updatedAt ? `updated ${relativeTime(s.updatedAt)}` : "no update timestamp"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 capitalize text-[10px]">
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No sprint status changes in this window.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard
          title="Wellbeing pings"
          icon={<Sparkles className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/team-wellbeing">Check-ins</Link>
            </Button>
          }
        >
          {feed.checkins.length > 0 ? (
            <ul className="divide-y">
              {feed.checkins.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2">
                  <AvatarCircle name={c.userName} size={22} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{c.userName}</span>
                    <span className="text-[10px] capitalize text-muted-foreground">
                      {c.mood} · {c.date}
                    </span>
                  </span>
                  <Badge
                    variant={c.wellbeingScore >= 70 ? "secondary" : c.wellbeingScore >= 40 ? "outline" : "destructive"}
                    className="shrink-0 tabular-nums text-[10px]"
                  >
                    {c.wellbeingScore}/100
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No check-ins logged recently.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard
          title="Gamification flashes"
          icon={<Trophy className="h-4 w-4" />}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/dashboard/gamification">Skill trees</Link>
            </Button>
          }
        >
          {gamificationFlashes.length > 0 ? (
            <ul className="divide-y">
              {gamificationFlashes.map((n) => (
                <li key={n.id} className="py-2">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {n.body ?? "level update"}
                    {n.createdAt ? ` · ${relativeTime(n.createdAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No level-ups announced via notifications yet.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 11 — Actor leaderboard */}
      <SectionCard title="Actor leaderboard · events per member" icon={<Settings className="h-4 w-4" />}>
        {feed.actors.length > 0 ? (
          <div className="space-y-2.5 pt-1">
            {feed.actors.map((a, idx) => {
              const max = feed.actors[0].count || 1
              return (
                <div key={a.name} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">#{idx + 1}</span>
                  <AvatarCircle name={a.name} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="truncate font-medium">{a.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{a.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--chart-pine))]"
                        style={{ width: `${Math.max(6, Math.round((a.count / max) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyNote>No attributable actors in this window (sprint/AI events carry no actor).</EmptyNote>
        )}
      </SectionCard>

      {/* 12 — Footer nav chips */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
        <span className="mr-1">Jump to:</span>
        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
          <Link href="/dashboard/kanban">Kanban board</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
          <Link href="/dashboard/sprints">Sprints</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
          <Link href="/dashboard/analytics">Analytics</Link>
        </Button>
        <span className="ml-auto text-[10px]">
          Stream capped at {feed.limit}/page · source: server aggregation (bell pushes arrive via Neon Realtime)
        </span>
      </div>
    </div>
  )
}
