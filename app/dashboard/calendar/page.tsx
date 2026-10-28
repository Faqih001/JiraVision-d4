"use client"

/*
 * Calendar workspace (V3 rewrite).
 *
 * Sections:
 *  1. Header — period navigation (prev / today / next), Month·Week·Day toggle, refresh, New event
 *  2. Filter bar — full-text search + event-type filter
 *  3. KPI strip — events this week / this month / meeting hours / task-linked / busiest weekday
 *  4. Calendar grid — real date math, event chips, keyboard-navigable, click a day → day view
 *  5. Today panel — today's events bucketed by hour
 *  6. Upcoming events — next 14 days with live countdowns
 *  7. Events by type — donut chart (recharts)
 *  8. Weekly load — events per day for the next 14 days (bar chart)
 *  9. Sprint milestones — read-only join against GET /api/sprints
 * 10. Task deadlines — read-only cross-link from GET /api/tasks?pageSize=100
 * 11. Recent activity — GET /api/notifications filtered client-side to calendar links
 * 12. Create/edit dialog — full CRUD with attendees multi-select, task link search, delete + confirm
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  addDays,
  differenceInMinutes,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import {
  Bell,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Link2,
  Milestone,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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

type AttendeeRef = { id: number; name: string; avatar: string | null }

type CalendarEvent = {
  id: number
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
  eventType: string
  organizer: AttendeeRef
  isAllDay: boolean
  isRecurring: boolean
  recurringPattern: Record<string, unknown>
  attendees: AttendeeRef[]
  color: string
  createdAt: string
  updatedAt: string
}

type TeamMember = { id: number; name: string; role: string | null; avatar: string | null }

type SprintRow = {
  id: number
  name: string
  startDate: string | null
  endDate: string | null
  status: string
}

type TaskRow = {
  id: number
  title: string
  status: string
  priority: string
  dueDate: string | null
}

type ActivityRow = {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  metadata: { link?: string } | null
  createdAt: string
}

type EventDraft = {
  id?: number
  title: string
  description: string
  eventType: string
  location: string
  allDay: boolean
  date: string // yyyy-MM-dd
  startTime: string // HH:mm
  endTime: string // HH:mm
  attendees: number[]
  linkedTask: { id: number; title: string } | null
}

/* --------------------------------------------------------------- constants */

const EVENT_TYPES = [
  "meeting",
  "standup",
  "planning",
  "review",
  "retrospective",
  "demo",
  "sprint",
  "deadline",
  "other",
] as const

// Event type → palette token (recharts fills + chip colours).
const TYPE_COLOR: Record<string, string> = {
  meeting: "hsl(var(--chart-pine))",
  standup: "hsl(var(--chart-moss))",
  planning: "hsl(var(--chart-clay))",
  review: "hsl(var(--chart-stone))",
  retrospective: "hsl(var(--chart-moss))",
  demo: "hsl(var(--chart-clay))",
  sprint: "hsl(var(--chart-pine))",
  deadline: "hsl(var(--destructive))",
  other: "hsl(var(--chart-pine))",
}

const TYPE_COLOR_NAME: Record<string, string> = {
  meeting: "blue",
  standup: "green",
  planning: "amber",
  review: "purple",
  retrospective: "green",
  demo: "purple",
  sprint: "violet",
  deadline: "red",
  other: "gray",
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/* ------------------------------------------------------------------ helpers */

function countdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return "now"
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`
  const days = Math.floor(hrs / 24)
  return `in ${days}d ${hrs % 24}h`
}

function durationLabel(e: CalendarEvent): string {
  if (e.isAllDay) return "All day"
  const mins = Math.max(0, differenceInMinutes(new Date(e.endTime), new Date(e.startTime)))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`
}

function timeRange(e: CalendarEvent): string {
  if (e.isAllDay) return "All day"
  return `${format(parseISO(e.startTime), "HH:mm")} – ${format(parseISO(e.endTime), "HH:mm")}`
}

function typeColor(type: string): string {
  return TYPE_COLOR[type] ?? "hsl(var(--primary))"
}

const emptyDraft = (day: Date): EventDraft => ({
  title: "",
  description: "",
  eventType: "meeting",
  location: "",
  allDay: false,
  date: format(day, "yyyy-MM-dd"),
  startTime: "09:00",
  endTime: "10:00",
  attendees: [],
  linkedTask: null,
})

/* --------------------------------------------------------------- the page */

export default function CalendarWorkspace() {
  const { toast } = useToast()

  // data
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [sprints, setSprints] = useState<SprintRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // navigation + filters
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [focusedDay, setFocusedDay] = useState<Date>(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // create/edit dialog
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // task-link search inside the dialog
  const [taskQuery, setTaskQuery] = useState("")
  const [taskResults, setTaskResults] = useState<{ id: number; title: string }[]>([])
  const taskTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // keyboard navigation of the month grid
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const pendingFocus = useRef(false)

  useEffect(() => {
    document.title = "Calendar · JiraVision"
  }, [])

  /* ---- loading ---- */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evRes, ovRes, spRes, tkRes, ntRes] = await Promise.all([
        fetch("/api/calendar/events"),
        fetch("/api/dashboard/overview"),
        fetch("/api/sprints"),
        fetch("/api/tasks?pageSize=100"),
        fetch("/api/notifications?limit=50"),
      ])
      const evJson = await evRes.json()
      if (!evJson.success) throw new Error(evJson.error ?? "Failed to load calendar events")
      setEvents(Array.isArray(evJson.events) ? evJson.events : [])

      const ovJson = await ovRes.json().catch(() => null)
      if (ovJson?.success && ovJson.data) {
        setTeam(
          (ovJson.data.workload as TeamMember[] | undefined)?.map((w) => ({
            id: w.id,
            name: w.name,
            role: w.role ?? null,
            avatar: w.avatar ?? null,
          })) ?? [],
        )
        setCurrentUserId(ovJson.data.user?.id ?? null)
      }

      const spJson = await spRes.json().catch(() => null)
      if (spJson?.success) setSprints(spJson.data ?? [])

      const tkJson = await tkRes.json().catch(() => null)
      if (tkJson?.success) setTasks(tkJson.data ?? [])

      const ntJson = await ntRes.json().catch(() => null)
      if (ntJson && Array.isArray(ntJson.items)) setActivities(ntJson.items)
    } catch (err) {
      toast({ variant: "destructive", title: "Calendar", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const reloadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/events")
      const json = await res.json()
      if (json.success) setEvents(json.events ?? [])
    } catch {
      toast({ variant: "destructive", title: "Calendar", description: "Could not refresh events." })
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast({ title: "Calendar refreshed" })
  }, [load, toast])

  /* ---- filtered events ---- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((e) => {
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false
      if (!q) return true
      const haystack = [
        e.title,
        e.description ?? "",
        e.location ?? "",
        e.organizer.name,
        ...e.attendees.map((a) => a.name),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [events, search, typeFilter])

  const eventsOn = useCallback(
    (day: Date): CalendarEvent[] => {
      const d0 = startOfDay(day).getTime()
      const d1 = d0 + 24 * 60 * 60 * 1000 - 1
      return filtered
        .filter((e) => {
          const s = new Date(e.startTime).getTime()
          const t = new Date(e.endTime).getTime()
          return s <= d1 && t >= d0
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    },
    [filtered],
  )

  /* ---- grid geometry ---- */

  const monthCells = useMemo(() => {
    const first = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, i) => addDays(first, i))
  }, [cursor])

  const weekCells = useMemo(() => {
    const first = startOfWeek(cursor, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(first, i))
  }, [cursor])

  useEffect(() => {
    if (pendingFocus.current) {
      pendingFocus.current = false
      dayRefs.current[format(focusedDay, "yyyy-MM-dd")]?.focus()
    }
  }, [focusedDay, cursor, view])

  const onGridKeyDown = (e: React.KeyboardEvent, day: Date) => {
    let next: Date | null = null
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(day, -1)
        break
      case "ArrowRight":
        next = addDays(day, 1)
        break
      case "ArrowUp":
        next = addDays(day, -7)
        break
      case "ArrowDown":
        next = addDays(day, 7)
        break
      case "Home":
        next = startOfWeek(day, { weekStartsOn: 1 })
        break
      case "End":
        next = addDays(startOfWeek(day, { weekStartsOn: 1 }), 6)
        break
      case "Enter":
      case " ":
        e.preventDefault()
        setSelectedDate(day)
        setView("day")
        return
      default:
        return
    }
    e.preventDefault()
    pendingFocus.current = true
    setFocusedDay(next)
    if (!isSameMonth(next, cursor)) setCursor(startOfMonth(next))
  }

  const periodLabel = useMemo(() => {
    if (view === "month") return format(cursor, "MMMM yyyy")
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 })
      return `Week of ${format(start, "d MMM")}`
    }
    const day = selectedDate ?? focusedDay
    return format(day, "EEEE, d MMMM yyyy")
  }, [view, cursor, selectedDate, focusedDay])

  const shiftPeriod = (dir: -1 | 1) => {
    if (view === "month") setCursor((c) => addDays(startOfMonth(c), dir * 31))
    else setCursor((c) => addDays(c, dir * (view === "week" ? 7 : 1)))
  }

  const goToday = () => {
    const now = new Date()
    setCursor(now)
    setFocusedDay(now)
    if (view === "day") setSelectedDate(now)
  }

  /* ---- KPI strip (client-side over real rows) ---- */

  const kpis = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 7)
    const monthStart = startOfMonth(cursor)
    const monthEnd = startOfMonth(addDays(monthStart, 32)) // first day of next month
    const inWindow = (e: CalendarEvent, from: number, to: number) => {
      const s = new Date(e.startTime).getTime()
      return s >= from && s < to
    }
    const monthEvents = filtered.filter((e) => inWindow(e, monthStart.getTime(), monthEnd.getTime()))
    const meetingsMs = monthEvents
      .filter((e) => !e.isAllDay)
      .reduce((sum, e) => sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()), 0)
    const weekdayCounts = new Array(7).fill(0) as number[]
    for (const e of monthEvents) {
      // JS getDay is Sun=0; index Monday-first columns instead
      weekdayCounts[(new Date(e.startTime).getDay() + 6) % 7]++
    }
    const busiestIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts))
    return {
      thisWeek: filtered.filter((e) => inWindow(e, weekStart.getTime(), weekEnd.getTime())).length,
      thisMonth: monthEvents.length,
      meetingHours: (meetingsMs / 3_600_000).toFixed(1),
      taskLinked: events.filter((e) => e.recurringPattern?.linkedTaskId != null).length,
      busiestWeekday: monthEvents.length > 0 ? WEEKDAY_FULL[(busiestIdx + 1) % 7] : "—",
    }
  }, [filtered, events, cursor])

  /* ---- today panel (events by hour) ---- */

  const todayByHour = useMemo(() => {
    const todayEvents = eventsOn(new Date())
    const buckets = new Map<number, CalendarEvent[]>()
    for (const e of todayEvents) {
      const hour = e.isAllDay ? -1 : new Date(e.startTime).getHours()
      const list = buckets.get(hour) ?? []
      list.push(e)
      buckets.set(hour, list)
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0])
  }, [eventsOn])

  /* ---- upcoming 14 days ---- */

  const upcoming = useMemo(() => {
    const now = Date.now()
    const horizon = now + 14 * 24 * 60 * 60 * 1000
    return filtered
      .filter((e) => {
        const s = new Date(e.startTime).getTime()
        return s >= now && s <= horizon
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 12)
  }, [filtered])

  /* ---- charts ---- */

  const donutData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of filtered) counts.set(e.eventType, (counts.get(e.eventType) ?? 0) + 1)
    return [...counts.entries()].map(([type, value]) => ({ type, value }))
  }, [filtered])

  const weeklyLoad = useMemo(() => {
    const today0 = startOfDay(new Date())
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(today0, i)
      return { label: format(day, "d/EE"), count: eventsOn(day).length }
    })
  }, [eventsOn])

  /* ---- sprint milestones / deadlines / activity ---- */

  const sprintMilestones = useMemo(() => {
    const now = Date.now()
    return [...sprints]
      .sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime())
      .filter((s) => !s.endDate || new Date(s.endDate).getTime() >= now - 7 * 86_400_000)
      .slice(0, 5)
  }, [sprints])

  const deadlineRows = useMemo(() => {
    const today0 = startOfDay(new Date())
    const horizon = addDays(today0, 14)
    return tasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done") return false
        const d = new Date(t.dueDate)
        return d.getTime() <= horizon.getTime()
      })
      .sort((a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime())
      .slice(0, 8)
  }, [tasks])

  const calendarActivity = useMemo(
    () =>
      activities
        .filter((a) => (a.metadata?.link ?? "").includes("calendar"))
        .slice(0, 8),
    [activities],
  )

  /* ---- mutations ---- */

  const openCreate = (day?: Date) => {
    setDraft(emptyDraft(day ?? new Date()))
    setConfirmDelete(false)
    setTaskQuery("")
    setTaskResults([])
    setFormOpen(true)
  }

  const openEdit = (e: CalendarEvent) => {
    const s = parseISO(e.startTime)
    const t = parseISO(e.endTime)
    setDraft({
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      eventType: e.eventType,
      location: e.location ?? "",
      allDay: e.isAllDay,
      date: format(s, "yyyy-MM-dd"),
      startTime: format(s, "HH:mm"),
      endTime: format(t, "HH:mm"),
      attendees: e.attendees.map((a) => a.id),
      linkedTask:
        e.recurringPattern?.linkedTaskId != null
          ? {
              id: Number(e.recurringPattern.linkedTaskId),
              title: String(e.recurringPattern.linkedTaskTitle ?? `Task #${e.recurringPattern.linkedTaskId}`),
            }
          : null,
    })
    setConfirmDelete(false)
    setTaskQuery("")
    setTaskResults([])
    setFormOpen(true)
  }

  const saveEvent = async () => {
    if (!draft || !draft.title.trim()) {
      toast({ variant: "destructive", title: "Event", description: "A title is required." })
      return
    }
    if (!draft.date) {
      toast({ variant: "destructive", title: "Event", description: "A date is required." })
      return
    }
    const startTime = draft.allDay ? `${draft.date}T09:00` : `${draft.date}T${draft.startTime || "09:00"}`
    const endTime = draft.allDay ? `${draft.date}T17:00` : `${draft.date}T${draft.endTime || "10:00"}`
    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      toast({ variant: "destructive", title: "Event", description: "End time must be after the start time." })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        startTime,
        endTime,
        location: draft.location.trim() || undefined,
        eventType: draft.eventType,
        isAllDay: draft.allDay,
        isRecurring: false,
        recurringPattern: draft.linkedTask
          ? { linkedTaskId: draft.linkedTask.id, linkedTaskTitle: draft.linkedTask.title }
          : {},
        attendees: draft.attendees,
        color: TYPE_COLOR_NAME[draft.eventType] ?? "blue",
      }
      const res = draft.id
        ? await fetch(`/api/calendar/events/${draft.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Save failed")
      const notified: number[] = json.notified ?? []
      toast({
        title: draft.id ? "Event updated" : "Event created",
        description: notified.length
          ? `${payload.title} · ${notified.length} attendee${notified.length === 1 ? "" : "s"} notified`
          : payload.title,
      })
      setFormOpen(false)
      setDraft(null)
      await Promise.all([reloadEvents(), reloadNotifications()])
    } catch (err) {
      toast({ variant: "destructive", title: "Event", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async () => {
    if (!draft?.id) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/calendar/events/${draft.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Delete failed")
      toast({ title: "Event deleted", description: draft.title })
      setFormOpen(false)
      setDraft(null)
      setConfirmDelete(false)
      await Promise.all([reloadEvents(), reloadNotifications()])
    } catch (err) {
      toast({ variant: "destructive", title: "Event", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const reloadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=50")
      const json = await res.json()
      if (Array.isArray(json.items)) setActivities(json.items)
    } catch {
      /* non-critical */
    }
  }, [])

  const markActivityRead = async (a: ActivityRow) => {
    if (a.isRead) return
    try {
      await fetch(`/api/notifications/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      setActivities((prev) => prev.map((x) => (x.id === a.id ? { ...x, isRead: true } : x)))
    } catch {
      toast({ variant: "destructive", title: "Activity", description: "Could not mark as read." })
    }
  }

  const onTaskQueryChange = (value: string) => {
    setTaskQuery(value)
    if (taskTimer.current) clearTimeout(taskTimer.current)
    if (!value.trim()) {
      setTaskResults([])
      return
    }
    taskTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tasks?search=${encodeURIComponent(value.trim())}&pageSize=8`)
        const json = await res.json()
        setTaskResults(
          json.success ? (json.data as TaskRow[]).map((t) => ({ id: t.id, title: t.title })) : [],
        )
      } catch {
        setTaskResults([])
      }
    }, 350)
  }

  const toggleAttendee = (id: number) => {
    setDraft((d) =>
      d ? { ...d, attendees: d.attendees.includes(id) ? d.attendees.filter((x) => x !== id) : [...d.attendees, id] } : d,
    )
  }

  /* ---- event chip ---- */

  const renderChip = (e: CalendarEvent, fullWidth = false) => (
    <button
      key={e.id}
      type="button"
      onClick={(ev) => {
        ev.stopPropagation()
        openEdit(e)
      }}
      aria-label={`${e.title}, ${timeRange(e)}`}
      className={cn(
        "block max-w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        fullWidth ? "w-full" : "",
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${typeColor(e.eventType)} 18%, transparent)`,
        color: typeColor(e.eventType),
      }}
    >
      {e.isAllDay ? "" : `${format(parseISO(e.startTime), "HH:mm")} `}
      {e.title}
    </button>
  )

  /* ---- loading skeleton ---- */

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-9 w-full max-w-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[480px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const dayViewTarget = selectedDate ?? focusedDay

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — header: title, period navigation, view toggle, actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <span className="text-sm text-muted-foreground" data-testid="period-label">
            {periodLabel}
          </span>
          <div className="ml-2 flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftPeriod(-1)} aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftPeriod(1)} aria-label="Next period">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Calendar view" className="flex items-center rounded-md border">
            {(["month", "week", "day"] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "secondary" : "ghost"}
                className="h-8 rounded-none capitalize"
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="mr-1 h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      {/* 2 — filter bar: search + event type */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, people, locations…"
              aria-label="Search events"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-40 text-sm" aria-label="Filter by event type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search.trim() !== "" || typeFilter !== "all") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch("")
                setTypeFilter("all")
              }}
            >
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{filtered.length} events match</span>
        </CardContent>
      </Card>

      {/* 3 — KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Events this week", value: kpis.thisWeek, hint: "Mon–Sun window" },
          { label: "Events this month", value: kpis.thisMonth, hint: format(cursor, "MMMM") },
          { label: "Meeting hours", value: `${kpis.meetingHours}h`, hint: "timed events this month" },
          { label: "Task-linked events", value: kpis.taskLinked, hint: "linked to a task" },
          { label: "Busiest weekday", value: kpis.busiestWeekday, hint: "within view" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4 — calendar grid (month / week / day) */}
      {view === "month" && (
        <Card>
          <CardContent className="py-4">
            <div
              role="grid"
              aria-label={`Month grid for ${format(cursor, "MMMM yyyy")}. Use arrow keys to move between days, Enter to open a day.`}
            >
              <div role="row" className="grid grid-cols-7 border-b pb-1">
                {WEEKDAY_SHORT.map((d) => (
                  <div key={d} role="columnheader" className="text-center text-xs font-semibold text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, wi) => (
                <div key={wi} role="row" className="grid grid-cols-7 gap-px pt-px">
                  {monthCells.slice(wi * 7, wi * 7 + 7).map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const dayEvents = eventsOn(day)
                    const inMonth = isSameMonth(day, cursor)
                    const isTodayCell = isSameDay(day, new Date())
                    const isFocused = isSameDay(day, focusedDay)
                    return (
                      <button
                        key={key}
                        ref={(el) => {
                          dayRefs.current[key] = el
                        }}
                        type="button"
                        role="gridcell"
                        tabIndex={isFocused ? 0 : -1}
                        aria-label={`${format(day, "EEEE d MMMM yyyy")}, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                        aria-current={isTodayCell ? "date" : undefined}
                        onClick={() => {
                          setSelectedDate(day)
                          setFocusedDay(day)
                          setView("day")
                        }}
                        onKeyDown={(e) => onGridKeyDown(e, day)}
                        className={cn(
                          "flex min-h-28 flex-col gap-1 rounded-md border-t-0 border-x-0 border-b-0 p-1.5 text-left align-top transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          inMonth ? "bg-background" : "bg-muted/30",
                          isTodayCell && "ring-1 ring-inset ring-primary/50",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                            isTodayCell && "bg-primary text-primary-foreground",
                            !inMonth && "text-muted-foreground",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        <span className="flex flex-col gap-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map((e) => renderChip(e))}
                          {dayEvents.length > 3 && (
                            <span className="text-[11px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "week" && (
        <Card>
          <CardContent className="py-4">
            <div className="grid gap-3 md:grid-cols-7">
              {weekCells.map((day) => {
                const dayEvents = eventsOn(day)
                return (
                  <div key={format(day, "yyyy-MM-dd")} className="rounded-md border p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(day)
                        setView("day")
                      }}
                      className={cn(
                        "mb-2 flex w-full items-center justify-between rounded px-1 py-0.5 text-xs font-semibold hover:bg-accent/40",
                        isSameDay(day, new Date()) && "bg-primary/10 text-primary",
                      )}
                      aria-label={`Open agenda for ${format(day, "EEEE d MMMM")}`}
                    >
                      {format(day, "EEE d")}
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {dayEvents.length}
                      </Badge>
                    </button>
                    <div className="flex flex-col gap-1">
                      {dayEvents.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No events</p>
                      ) : (
                        dayEvents.map((e) => renderChip(e, true))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "day" && (
        <SectionCard
          title={`Day agenda · ${format(dayViewTarget, "EEEE d MMMM")}`}
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          action={
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => { const d = addDays(dayViewTarget, -1); setSelectedDate(d); setFocusedDay(d); if (!isSameMonth(d, cursor)) setCursor(startOfMonth(d)) }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { const d = addDays(dayViewTarget, 1); setSelectedDate(d); setFocusedDay(d); if (!isSameMonth(d, cursor)) setCursor(startOfMonth(d)) }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => openCreate(dayViewTarget)}>
                <Plus className="mr-1 h-4 w-4" /> Event
              </Button>
            </div>
          }
        >
          {eventsOn(dayViewTarget).length === 0 ? (
            <EmptyNote>Nothing scheduled on {format(dayViewTarget, "d MMM")}. Create the first event.</EmptyNote>
          ) : (
            <ol className="space-y-2">
              {eventsOn(dayViewTarget).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="flex w-full items-start gap-3 rounded-md border p-2 text-left transition-colors hover:bg-accent/40"
                  >
                    <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: typeColor(e.eventType) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{e.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {timeRange(e)} · {durationLabel(e)}
                        {e.location ? ` · ${e.location}` : ""} · {e.eventType}
                      </span>
                    </span>
                    <span className="flex -space-x-1.5">
                      {e.attendees.slice(0, 3).map((a) => (
                        <AvatarCircle key={a.id} name={a.name} avatar={a.avatar} size={22} />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      )}

      {/* 5 + 6 — today panel and upcoming list */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Today by hour" icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
          {todayByHour.length === 0 ? (
            <EmptyNote>
              No events today.{" "}
              <button type="button" className="underline" onClick={() => openCreate(new Date())}>
                Add one
              </button>
            </EmptyNote>
          ) : (
            <ul className="space-y-2">
              {todayByHour.map(([hour, list]) => (
                <li key={hour} className="flex gap-3">
                  <span className="w-14 shrink-0 pt-1 text-xs font-semibold tabular-nums text-muted-foreground">
                    {hour === -1 ? "All day" : `${String(hour).padStart(2, "0")}:00`}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    {list.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => openEdit(e)}
                        className="block w-full rounded-md border px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/40"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{e.title}</span>
                          <Badge variant="outline" className="shrink-0 capitalize">
                            {e.eventType}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeRange(e)} · {e.attendees.length} attendee{e.attendees.length === 1 ? "" : "s"}
                        </span>
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming · next 14 days"
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          action={
            <Button size="sm" variant="ghost" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
            </Button>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyNote>No events in the next two weeks.</EmptyNote>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="flex w-full items-center gap-3 rounded-md border px-2 py-1.5 text-left transition-colors hover:bg-accent/40"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: typeColor(e.eventType) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{e.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(e.startTime), "EEE d MMM · HH:mm")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {countdown(e.startTime)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* 7 + 8 — charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Events by type" icon={<Target className="h-4 w-4 text-muted-foreground" />}>
          {donutData.length === 0 ? (
            <EmptyNote>No events to chart yet.</EmptyNote>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="type" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {donutData.map((d) => (
                      <Cell key={d.type} fill={typeColor(d.type)} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Weekly load · next 14 days" icon={<Rocket className="h-4 w-4 text-muted-foreground" />}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyLoad}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} {...AXIS} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} {...AXIS} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Bar dataKey="count" name="Events" fill="hsl(var(--chart-pine))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* 9 + 10 — sprint milestones and task deadlines */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Sprint milestones" icon={<Milestone className="h-4 w-4 text-muted-foreground" />}>
          {sprintMilestones.length === 0 ? (
            <EmptyNote>No upcoming or recent sprints found.</EmptyNote>
          ) : (
            <ul className="space-y-2">
              {sprintMilestones.map((s) => {
                const starts = s.startDate ? parseISO(String(s.startDate)) : null
                const ends = s.endDate ? parseISO(String(s.endDate)) : null
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-md border px-2 py-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.status === "in_progress" || s.status === "active" ? "hsl(var(--chart-moss))" : "hsl(var(--chart-stone))" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {starts ? format(starts, "d MMM") : "?"} → {ends ? format(ends, "d MMM") : "?"}
                      </span>
                    </span>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {s.status}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-3 text-right">
            <Link href="/dashboard/sprints" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              Open sprint board →
            </Link>
          </p>
        </SectionCard>

        <SectionCard
          title="Task deadlines · next 14 days"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        >
          {deadlineRows.length === 0 ? (
            <EmptyNote>No open task due dates in the next two weeks.</EmptyNote>
          ) : (
            <ul className="space-y-2">
              {deadlineRows.map((t) => {
                const due = t.dueDate ? new Date(t.dueDate) : null
                const overdue = due ? due.getTime() < startOfDay(new Date()).getTime() : false
                return (
                  <li key={t.id}>
                    <Link
                      href="/dashboard/tasks"
                      className="flex items-center gap-3 rounded-md border px-2 py-1.5 transition-colors hover:bg-accent/40"
                      aria-label={`Task ${t.title}, due ${t.dueDate}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{t.title}</span>
                        <span className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                          {due ? format(due, "EEE d MMM") : "no date"} · {t.priority} priority
                        </span>
                      </span>
                      <StatusPill status={t.status} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* 11 — recent calendar activity */}
      <SectionCard
        title="Calendar activity"
        icon={<Bell className="h-4 w-4 text-muted-foreground" />}
        className="lg:col-span-2"
      >
        {calendarActivity.length === 0 ? (
          <EmptyNote>No calendar notifications yet. Invites, updates and cancellations land here.</EmptyNote>
        ) : (
          <ul className="space-y-2">
            {calendarActivity.map((a) => (
              <li key={a.id} className={cn("flex items-start gap-3 rounded-md border px-2 py-1.5", !a.isRead && "bg-accent/30")}>
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => markActivityRead(a)}
                  className="min-w-0 flex-1 text-left"
                  aria-label={`${a.title}. ${relativeTime(a.createdAt)}`}
                >
                  <span className="block truncate text-sm font-medium">{a.title}</span>
                  {a.body && <span className="block truncate text-xs text-muted-foreground">{a.body}</span>}
                  <span className="text-[11px] text-muted-foreground">{relativeTime(a.createdAt)}</span>
                </button>
                {!a.isRead && (
                  <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs" onClick={() => markActivityRead(a)}>
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 12 — create/edit dialog with delete + confirm */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setDraft(null)
            setConfirmDelete(false)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>
              {draft?.id
                ? "Update the details below. Attendees other than you get a notification."
                : "Schedule a meeting, demo or deadline. Attendees are notified instantly."}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Sprint review with stakeholders"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Agenda, links, prep notes…"
                  rows={3}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={draft.eventType} onValueChange={(v) => setDraft({ ...draft, eventType: v })}>
                    <SelectTrigger aria-label="Event type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-location">Location</Label>
                  <Input
                    id="event-location"
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    placeholder="Room, link, place…"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.allDay}
                  onCheckedChange={(c) => setDraft({ ...draft, allDay: c === true })}
                  aria-label="All-day event"
                />
                All-day event
              </label>
              {!draft.allDay && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-start">Start time</Label>
                    <Input
                      id="event-start"
                      type="time"
                      value={draft.startTime}
                      onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-end">End time</Label>
                    <Input
                      id="event-end"
                      type="time"
                      value={draft.endTime}
                      onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" /> Attendees
                </Label>
                {team.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Team list unavailable — invite people later.</p>
                ) : (
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                    {team.map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent/40">
                        <Checkbox
                          checked={draft.attendees.includes(m.id)}
                          onCheckedChange={() => toggleAttendee(m.id)}
                          aria-label={`Invite ${m.name}`}
                        />
                        <AvatarCircle name={m.name} avatar={m.avatar} size={20} />
                        <span className="min-w-0 flex-1 truncate">{m.name}</span>
                        {m.id === currentUserId && (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            you
                          </Badge>
                        )}
                        {m.role && <span className="shrink-0 text-[11px] text-muted-foreground">{m.role}</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-link-search" className="flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-muted-foreground" /> Link a task (optional)
                </Label>
                {draft.linkedTask ? (
                  <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      #{draft.linkedTask.id} · {draft.linkedTask.title}
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDraft({ ...draft, linkedTask: null })} aria-label="Unlink task">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      id="task-link-search"
                      value={taskQuery}
                      onChange={(e) => onTaskQueryChange(e.target.value)}
                      placeholder="Search tasks by title…"
                    />
                    {taskResults.length > 0 && (
                      <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-1">
                        {taskResults.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => setDraft({ ...draft, linkedTask: t })}
                              className="block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-accent/40"
                            >
                              #{t.id} · {t.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            {draft?.id ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive">Delete this event?</span>
                  <Button size="sm" variant="destructive" onClick={deleteEvent} disabled={saving}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setFormOpen(false)}>
                Discard
              </Button>
              <Button size="sm" onClick={saveEvent} disabled={saving}>
                {saving ? "Saving…" : draft?.id ? "Save changes" : "Create event"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
