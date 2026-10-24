"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BellRing,
  CheckCheck,
  Database,
  Download,
  Eye,
  FileText,
  Inbox,
  Info,
  LayoutList,
  MailWarning,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  Trash2,
  Truck,
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
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
  EmptyNote,
  SectionCard,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"
import type { DashboardOverview } from "@/lib/dashboard-data"

/* ------------------------------------------------------------------ types */

// Mirrors NOTIFICATION_TYPES from lib/notifications (that module touches the
// DB and cannot be imported into a client component; the API routes validate
// against the server copy).
const EVENT_TYPES = [
  "info",
  "task",
  "sprint",
  "mention",
  "wellbeing",
  "gamification",
  "ai",
  "system",
  "cms",
] as const
type EventType = (typeof EVENT_TYPES)[number]

type DigestItem = {
  id: number
  to_email: string | null
  subject: string | null
  body: string | null
  event_type: string | null
  status: string
  created_at: string
}

type DigestSummary = { total: number; queued: number; delivered: number; failed: number }
type ActivityPoint = { day: string; queued: number }

type TemplateItem = {
  id: number
  name: string
  subject: string | null
  body: string | null
  event_type: string | null
  enabled: boolean
  created_at: string
}

type ChannelPrefs = { digest: boolean; inApp: boolean }
type PreferenceMap = Partial<Record<EventType, ChannelPrefs>>

type NotifItem = {
  id: number
  type: string
  title: string
  body: string | null
  isRead: boolean
  createdAt: string
}

type ProfileInfo = { name: string; email: string; jobTitle: string | null; department: string | null }

type TemplateDraft = {
  id?: number
  name: string
  subject: string
  body: string
  eventType: EventType
  enabled: boolean
}

type ConfirmTarget =
  | { kind: "digest"; id: number; label: string }
  | { kind: "template"; id: number; label: string }

/* -------------------------------------------------------------- constants */

const STATUS_TONE: Record<string, string> = {
  queued: "hsl(var(--chart-clay))",
  delivered: "hsl(var(--chart-moss))",
  failed: "hsl(var(--destructive))",
}

const DEFAULT_PREFS: PreferenceMap = EVENT_TYPES.reduce((acc, t) => {
  acc[t] = { digest: ["task", "sprint", "mention"].includes(t), inApp: true }
  return acc
}, {} as PreferenceMap)

function DigestStatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "hsl(var(--muted-foreground))"
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
      style={{
        backgroundColor: `color-mix(in srgb, ${tone} 15%, transparent)`,
        color: tone,
      }}
    >
      {status}
    </span>
  )
}

function fillPlaceholders(text: string, values: { name: string; task: string; email: string }) {
  return text
    .replace(/\{\{\s*name\s*\}\}/g, values.name)
    .replace(/\{\{\s*task\s*\}\}/g, values.task)
    .replace(/\{\{\s*email\s*\}\}/g, values.email)
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`)
  }
  return json as T
}

/* --------------------------------------------------------------- the page */

export default function EmailWorkspace() {
  const { toast } = useToast()

  // remote data
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [digestItems, setDigestItems] = useState<DigestItem[]>([])
  const [digestSummary, setDigestSummary] = useState<DigestSummary>({ total: 0, queued: 0, delivered: 0, failed: 0 })
  const [activity, setActivity] = useState<ActivityPoint[]>([])
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [prefs, setPrefs] = useState<PreferenceMap>(DEFAULT_PREFS)
  const [prefsStored, setPrefsStored] = useState(false)
  const [prefsDirty, setPrefsDirty] = useState(false)
  const [notifications, setNotifications] = useState<NotifItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [sampleTask, setSampleTask] = useState("(no open task)")
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)

  // digest queue view state
  const [digestStatusFilter, setDigestStatusFilter] = useState("all")
  const [busyDigestId, setBusyDigestId] = useState<number | null>(null)

  // template state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  // preferences save state
  const [savingPrefs, setSavingPrefs] = useState(false)

  // weekly composer state
  const [recipient, setRecipient] = useState("")
  const [recipientTouched, setRecipientTouched] = useState(false)
  const [subjectPrefix, setSubjectPrefix] = useState("JiraVision")
  const [weeklyIncludes, setWeeklyIncludes] = useState<EventType[]>(["task", "sprint", "mention"])
  const [queueingWeekly, setQueueingWeekly] = useState(false)

  const load = useCallback(async (initial: boolean) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    try {
      const [digestRes, tplRes, prefRes, notifRes, profileRes, overviewRes] = await Promise.all([
        fetch("/api/email/digest?limit=200"),
        fetch("/api/email/templates"),
        fetch("/api/email/preferences"),
        fetch("/api/notifications?limit=30"),
        fetch("/api/user/profile"),
        fetch("/api/dashboard/overview"),
      ])

      const digestJson = await jsonOrThrow<{ success: boolean; data: { items: DigestItem[]; summary: DigestSummary; activity: ActivityPoint[] } }>(digestRes)
      setDigestItems(digestJson.data.items)
      setDigestSummary(digestJson.data.summary)
      setActivity(digestJson.data.activity)

      const tplJson = await jsonOrThrow<{ success: boolean; data: { items: TemplateItem[] } }>(tplRes)
      setTemplates(tplJson.data.items)
      setSelectedTemplateId((prev) => prev ?? tplJson.data.items[0]?.id ?? null)

      const prefJson = await jsonOrThrow<{ success: boolean; data: { data: PreferenceMap; stored: boolean } }>(prefRes)
      setPrefs({ ...DEFAULT_PREFS, ...prefJson.data.data })
      setPrefsStored(Boolean(prefJson.data.stored))
      setPrefsDirty(false)

      const notifJson = await notifRes.json()
      setNotifications(notifJson.items ?? [])
      setUnreadCount(notifJson.unreadCount ?? 0)

      const profileJson = await profileRes.json().catch(() => null)
      if (profileJson?.success && profileJson.profile) {
        setProfile({
          name: profileJson.profile.name ?? "",
          email: profileJson.profile.email ?? "",
          jobTitle: profileJson.profile.jobTitle ?? null,
          department: profileJson.profile.department ?? null,
        })
      }

      const ovJson = await overviewRes.json().catch(() => null)
      if (ovJson?.success) {
        const data = ovJson.data as DashboardOverview
        setRealtimeEnabled(Boolean(data.realtimeEnabled))
        const openTask = data.myTasks?.find((t) => t.status !== "done" && t.status !== "completed")
        if (openTask) setSampleTask(openTask.title)
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Email workspace", description: (err as Error).message })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    void load(true)
  }, [load])

  // default weekly recipient = own email once the profile lands
  useEffect(() => {
    if (profile?.email && !recipientTouched) setRecipient(profile.email)
  }, [profile, recipientTouched])

  /* ------------------------------------------------------------ actions */

  const updateDigestStatus = async (id: number, status: "queued" | "delivered") => {
    setBusyDigestId(id)
    try {
      const res = await fetch(`/api/email/digest/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = await jsonOrThrow<{ success: boolean; data: { item: DigestItem } }>(res)
      setDigestItems((prev) => prev.map((d) => (d.id === id ? json.data.item : d)))
      toast({
        title: "Digest row updated",
        description:
          status === "queued"
            ? `Row #${id} re-queued for the next digest run — stored locally, not sent.`
            : `Row #${id} recorded as delivered by an operator — no email was sent by this app.`,
      })
      void loadSummaryQuietly()
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: (err as Error).message })
    } finally {
      setBusyDigestId(null)
    }
  }

  // refresh just the summary counters after a mutation, without a full reload
  const loadSummaryQuietly = async () => {
    try {
      const res = await fetch("/api/email/digest?limit=200")
      const json = await jsonOrThrow<{ success: boolean; data: { items: DigestItem[]; summary: DigestSummary; activity: ActivityPoint[] } }>(res)
      setDigestItems(json.data.items)
      setDigestSummary(json.data.summary)
      setActivity(json.data.activity)
    } catch {
      // non-fatal: the next manual refresh will re-sync
    }
  }

  const deleteTarget = async () => {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      const path = confirm.kind === "digest" ? `/api/email/digest/${confirm.id}` : `/api/email/templates/${confirm.id}`
      const res = await fetch(path, { method: "DELETE" })
      await jsonOrThrow(res)
      if (confirm.kind === "digest") {
        setDigestItems((prev) => prev.filter((d) => d.id !== confirm.id))
        toast({ title: "Digest row deleted", description: `Row #${confirm.id} removed from the stored queue.` })
        void loadSummaryQuietly()
      } else {
        setTemplates((prev) => prev.filter((t) => t.id !== confirm.id))
        setSelectedTemplateId((prev) => (prev === confirm.id ? null : prev))
        toast({ title: "Template deleted", description: `"${confirm.label}" removed from email_templates.` })
      }
      setConfirm(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed", description: (err as Error).message })
    } finally {
      setConfirmBusy(false)
    }
  }

  const openTemplateDialog = (tpl?: TemplateItem) => {
    setTemplateDraft(
      tpl
        ? { id: tpl.id, name: tpl.name, subject: tpl.subject ?? "", body: tpl.body ?? "", eventType: (tpl.event_type as EventType) ?? "info", enabled: tpl.enabled }
        : { name: "", subject: "", body: "", eventType: "info", enabled: true },
    )
    setTemplateDialogOpen(true)
  }

  const saveTemplate = async () => {
    if (!templateDraft || !templateDraft.name.trim()) {
      toast({ variant: "destructive", title: "Template not saved", description: "A template name is required." })
      return
    }
    setSavingTemplate(true)
    try {
      const payload = {
        name: templateDraft.name,
        subject: templateDraft.subject,
        body: templateDraft.body,
        eventType: templateDraft.eventType,
        enabled: templateDraft.enabled,
      }
      const res =
        templateDraft.id !== undefined
          ? await fetch(`/api/email/templates/${templateDraft.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/email/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
      const json = await jsonOrThrow<{
        success: boolean
        data: { item: TemplateItem; previewDigestId: number | null }
      }>(res)

      setTemplates((prev) => {
        const rest = prev.filter((t) => t.id !== json.data.item.id)
        return [json.data.item, ...rest]
      })
      setSelectedTemplateId(json.data.item.id)
      setTemplateDialogOpen(false)
      setTemplateDraft(null)

      // honest toast: describe the persisted linkage, never claim delivery
      toast({
        title: templateDraft.id !== undefined ? "Template updated" : "Template saved",
        description:
          json.data.previewDigestId !== null
            ? `Persisted in email_templates; a preview row (#${json.data.previewDigestId}) was queued in the digest table and a system notification references it. Nothing was emailed.`
            : "Persisted in email_templates. A body with content queues a preview digest row on save.",
      })
      void loadSummaryQuietly()
      void refreshNotifications()
    } catch (err) {
      toast({ variant: "destructive", title: "Template save failed", description: (err as Error).message })
    } finally {
      setSavingTemplate(false)
    }
  }

  const toggleTemplateEnabled = async (tpl: TemplateItem, enabled: boolean) => {
    try {
      const res = await fetch(`/api/email/templates/${tpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const json = await jsonOrThrow<{ success: boolean; data: { item: TemplateItem } }>(res)
      setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? json.data.item : t)))
      toast({
        title: enabled ? "Template enabled" : "Template disabled",
        description: `"${tpl.name}" toggled in email_templates — stored state only, no messages were sent.`,
      })
    } catch (err) {
      toast({ variant: "destructive", title: "Toggle failed", description: (err as Error).message })
    }
  }

  const savePreferences = async () => {
    setSavingPrefs(true)
    try {
      const res = await fetch("/api/email/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: prefs }),
      })
      await jsonOrThrow(res)
      setPrefsStored(true)
      setPrefsDirty(false)
      toast({
        title: "Subscription matrix saved",
        description: "Written as one JSONB row in email_preferences. These are stored routing hints — no email is sent.",
      })
    } catch (err) {
      toast({ variant: "destructive", title: "Could not save preferences", description: (err as Error).message })
    } finally {
      setSavingPrefs(false)
    }
  }

  const setChannel = (type: EventType, channel: keyof ChannelPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [type]: { ...(prev[type] ?? { digest: false, inApp: true }), [channel]: value } }))
    setPrefsDirty(true)
  }

  const refreshNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=30")
      const json = await res.json()
      setNotifications(json.items ?? [])
      setUnreadCount(json.unreadCount ?? 0)
    } catch {
      // non-fatal
    }
  }

  const markNotificationRead = async (item: NotifItem) => {
    try {
      const res = await fetch(`/api/notifications/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      if (!res.ok) throw new Error(`Mark-read failed (${res.status})`)
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
      setUnreadCount((c) => Math.max(0, c - (item.isRead ? 0 : 1)))
    } catch (err) {
      toast({ variant: "destructive", title: "Mark-read failed", description: (err as Error).message })
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) throw new Error(`Mark-all failed (${res.status})`)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast({ title: "Notifications marked read", description: "The shared bell feed was updated for every unread row." })
    } catch (err) {
      toast({ variant: "destructive", title: "Mark-all failed", description: (err as Error).message })
    }
  }

  const queueWeeklyDigest = async () => {
    if (!recipient.trim() || !recipient.includes("@")) {
      toast({ variant: "destructive", title: "Nothing queued", description: "Enter a valid recipient address first." })
      return
    }
    if (weeklyIncludes.length === 0) {
      toast({ variant: "destructive", title: "Nothing queued", description: "Tick at least one event section to include." })
      return
    }
    setQueueingWeekly(true)
    try {
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)
      const subject = `${subjectPrefix ? `${subjectPrefix.trim()} — ` : ""}Weekly digest (${weekAgo} → ${today})`
      const body = [
        `Weekly digest draft for ${recipient}, covering ${weekAgo} to ${today}.`,
        `Included sections: ${weeklyIncludes.join(", ")}.`,
        `Unread notifications at queue time: ${unreadCount}.`,
        "",
        "Stored in email_digest only — this application does not send email.",
      ].join("\n")
      const res = await fetch("/api/email/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: recipient.trim(), subject, body, eventType: "system" }),
      })
      const json = await jsonOrThrow<{ success: boolean; data: { item: DigestItem } }>(res)
      setDigestItems((prev) => [json.data.item, ...prev])
      void loadSummaryQuietly()
      toast({
        title: "Weekly digest queued",
        description: `Row #${json.data.item.id} stored in email_digest with status "queued" — it is a draft log entry, not a sent message.`,
      })
    } catch (err) {
      toast({ variant: "destructive", title: "Could not queue weekly digest", description: (err as Error).message })
    } finally {
      setQueueingWeekly(false)
    }
  }

  const exportCsv = () => {
    if (digestItems.length === 0) {
      toast({ title: "Nothing to export", description: "The digest table has no rows for this account yet." })
      return
    }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const header = ["id", "to_email", "subject", "event_type", "status", "created_at"]
    const lines = [
      header.join(","),
      ...digestItems.map((d) => [d.id, d.to_email, d.subject, d.event_type, d.status, d.created_at].map(esc).join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-digest-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${digestItems.length} stored digest rows written to a client-side CSV file.` })
  }

  /* ------------------------------------------------------------ derived */

  const filteredDigest = useMemo(
    () => (digestStatusFilter === "all" ? digestItems : digestItems.filter((d) => d.status === digestStatusFilter)),
    [digestItems, digestStatusFilter],
  )

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  )

  const activeTemplateCount = templates.filter((t) => t.enabled).length

  const chartData = useMemo(
    () => activity.map((a) => ({ ...a, label: a.day.slice(5).replace("-", "/") })),
    [activity],
  )

  const placeholderValues = {
    name: profile?.name ?? "there",
    task: sampleTask,
    email: profile?.email ?? "you@example.com",
  }

  /* --------------------------------------------------------------- render */

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 1 — header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Archive className="h-6 w-6 text-muted-foreground" />
            Email &amp; Digest Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A message and notification digest workspace. Everything you see here is stored in your own database
            tables — nothing is delivered.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load(false)} disabled={refreshing || loading}>
            <RefreshCw className={refreshing ? "mr-1.5 h-4 w-4 animate-spin" : "mr-1.5 h-4 w-4"} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => openTemplateDialog()}>
            <Plus className="mr-1.5 h-4 w-4" />
            New template
          </Button>
        </div>
      </div>

      {/* 2 — honest status banner */}
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 py-4">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium">Digest center — messages are stored, not delivered</p>
            <p className="mt-1 text-muted-foreground">
              JiraVision does not send real email from this page. Rows you create here land in the{" "}
              <code className="rounded bg-muted px-1">email_digest</code> table with a lifecycle status you manage
              by hand. Marking a row &quot;delivered&quot; records an operator&apos;s claim — it never sends anything.
              In-app alerts are handled by the shared notification bell feed
              {realtimeEnabled ? " (realtime updates active)" : " (polling mode)"}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3 — KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          loading={loading}
          icon={<LayoutList className="h-4 w-4" />}
          label="Digest rows stored"
          value={digestSummary.total}
          hint="all statuses in email_digest"
        />
        <KpiCard
          loading={loading}
          icon={<Inbox className="h-4 w-4" />}
          label="Queued"
          value={digestSummary.queued}
          hint="waiting in the local queue"
        />
        <KpiCard
          loading={loading}
          icon={<Truck className="h-4 w-4" />}
          label="Delivered (recorded by ops)"
          value={digestSummary.delivered}
          hint="manual status, not verified sends"
        />
        <KpiCard
          loading={loading}
          icon={<FileText className="h-4 w-4" />}
          label="Active templates"
          value={`${activeTemplateCount}/${templates.length}`}
          hint="enabled / total"
        />
        <KpiCard
          loading={loading}
          icon={<BellRing className="h-4 w-4" />}
          label="Unread notifications"
          value={unreadCount}
          hint="shared with the bell feed"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* 4 — digest timeline */}
        <SectionCard
          className="xl:col-span-2"
          title="Digest queue — stored message timeline"
          icon={<Archive className="h-4 w-4 text-muted-foreground" />}
          action={
            <Select value={digestStatusFilter} onValueChange={setDigestStatusFilter}>
              <SelectTrigger className="h-8 w-[150px]" aria-label="Filter digest rows by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="queued">Queued only</SelectItem>
                <SelectItem value="delivered">Delivered only</SelectItem>
                <SelectItem value="failed">Failed only</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredDigest.length === 0 ? (
            <EmptyNote>
              {digestStatusFilter === "all"
                ? "No digest rows yet. Queue one from the weekly composer below or save a template with a body."
                : `No digest rows with status “${digestStatusFilter}” yet.`}
            </EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">To</th>
                    <th className="px-2 py-2 font-medium">Subject</th>
                    <th className="px-2 py-2 font-medium">Event</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Created</th>
                    <th className="px-2 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDigest.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-2 py-2 text-xs text-muted-foreground">{d.id}</td>
                      <td className="max-w-[160px] truncate px-2 py-2 text-xs" title={d.to_email ?? "—"}>
                        {d.to_email ?? "—"}
                      </td>
                      <td className="max-w-[260px] truncate px-2 py-2" title={d.subject ?? "—"}>
                        {d.subject ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {d.event_type ?? "info"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <DigestStatusPill status={d.status} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">
                        {relativeTime(d.created_at)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {d.status !== "queued" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={busyDigestId === d.id}
                              onClick={() => void updateDigestStatus(d.id, "queued")}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Re-queue
                            </Button>
                          )}
                          {d.status !== "delivered" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={busyDigestId === d.id}
                              onClick={() => void updateDigestStatus(d.id, "delivered")}
                            >
                              <CheckCheck className="mr-1 h-3 w-3" />
                              Mark delivered
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete digest row ${d.id}`}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            disabled={busyDigestId === d.id}
                            onClick={() =>
                              setConfirm({ kind: "digest", id: d.id, label: `row #${d.id} — ${d.subject ?? "no subject"}` })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Showing {filteredDigest.length} of {digestItems.length} loaded rows (most recent 200 kept in view).
                Actions update the stored status in email_digest — nothing network-sends.
              </p>
            </div>
          )}
        </SectionCard>

        {/* 5 — subscription matrix */}
        <SectionCard
          title="Event subscription matrix"
          icon={<Settings2 className="h-4 w-4 text-muted-foreground" />}
          action={
            <Button size="sm" variant={prefsDirty ? "default" : "outline"} disabled={!prefsDirty || savingPrefs} onClick={() => void savePreferences()}>
              {savingPrefs ? "Saving…" : "Save matrix"}
            </Button>
          }
        >
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Event type</th>
                    <th className="px-2 py-2 font-medium">Digest queue</th>
                    <th className="px-2 py-2 font-medium">In-app bell</th>
                  </tr>
                </thead>
                <tbody>
                  {EVENT_TYPES.map((t) => {
                    const v = prefs[t] ?? { digest: false, inApp: true }
                    return (
                      <tr key={t} className="border-b last:border-0">
                        <td className="px-2 py-2 capitalize">{t}</td>
                        <td className="px-2 py-2">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={v.digest}
                              onCheckedChange={(c) => setChannel(t, "digest", c === true)}
                              aria-label={`Route ${t} events into the digest queue`}
                            />
                            <span className="text-xs text-muted-foreground">include in digests</span>
                          </label>
                        </td>
                        <td className="px-2 py-2">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={v.inApp}
                              onCheckedChange={(c) => setChannel(t, "inApp", c === true)}
                              aria-label={`Route ${t} events to the in-app bell`}
                            />
                            <span className="text-xs text-muted-foreground">show in bell feed</span>
                          </label>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {prefsStored ? "Saved copy loaded from email_preferences (JSONB)." : "Defaults shown — not saved yet; press Save matrix to persist."}{" "}
                These flags are stored routing hints; delivery channels beyond the in-app bell are not wired.
              </p>
            </>
          )}
        </SectionCard>

        {/* 6 — weekly digest composer */}
        <SectionCard title="Weekly digest composer" icon={<Send className="h-4 w-4 text-muted-foreground" />}>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="weekly-recipient">Recipient (defaults to your account email)</Label>
                <Input
                  id="weekly-recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value)
                    setRecipientTouched(true)
                  }}
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weekly-prefix">Subject prefix</Label>
                <Input
                  id="weekly-prefix"
                  value={subjectPrefix}
                  onChange={(e) => setSubjectPrefix(e.target.value)}
                  placeholder="JiraVision"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sections to include</Label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {EVENT_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-xs capitalize">
                      <Checkbox
                        checked={weeklyIncludes.includes(t)}
                        onCheckedChange={(c) =>
                          setWeeklyIncludes((prev) => (c === true ? [...prev, t] : prev.filter((x) => x !== t)))
                        }
                        aria-label={`Include ${t} events in weekly digest`}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <Separator />
              <p className="text-[11px] text-muted-foreground">
                Will queue: <span className="font-medium">{subjectPrefix ? `${subjectPrefix} — ` : ""}Weekly digest</span>{" "}
                to {recipient || "(recipient)"} with {weeklyIncludes.length} section
                {weeklyIncludes.length === 1 ? "" : "s"}.
              </p>
              <Button size="sm" disabled={queueingWeekly} onClick={() => void queueWeeklyDigest()}>
                {queueingWeekly ? "Queueing…" : "Queue weekly digest"}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Queuing writes a real row into email_digest with status &quot;queued&quot; and refreshes the counters —
                it does not email anyone.
              </p>
            </div>
          )}
        </SectionCard>

        {/* 7 — digest activity chart */}
        <SectionCard title="Digest activity — rows queued per day (14d)" icon={<BarChartIcon />}>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : activity.every((a) => a.queued === 0) ? (
            <EmptyNote>No digest rows were queued in the last 14 days. Queue one from the composer to see bars.</EmptyNote>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={30} />
                  <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="queued" name="rows queued" fill="hsl(var(--chart-clay))" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* 8 — notification inbox cross-feed */}
        <SectionCard
          title="Notification inbox (bell feed cross-view)"
          icon={<BellRing className="h-4 w-4 text-muted-foreground" />}
          action={
            <Button size="sm" variant="outline" disabled={unreadCount === 0 || loading} onClick={() => void markAllNotificationsRead()}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Mark all read
            </Button>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyNote>The notification table has no rows for this account yet.</EmptyNote>
          ) : (
            <ul className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-2 rounded-md border px-2.5 py-2">
                  <Badge variant={n.isRead ? "outline" : "secondary"} className="mt-0.5 shrink-0 text-[10px] capitalize">
                    {n.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className={n.isRead ? "truncate text-xs text-muted-foreground" : "truncate text-xs font-medium"}>
                      {n.title}
                    </p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" className="h-6 shrink-0 px-2 text-[11px]" onClick={() => void markNotificationRead(n)}>
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* 9 — template preview pane */}
        <SectionCard
          title="Template preview (placeholders resolved)"
          icon={<Eye className="h-4 w-4 text-muted-foreground" />}
          action={
            templates.length > 0 && (
              <Select value={String(selectedTemplateId ?? "")} onValueChange={(v) => setSelectedTemplateId(Number(v))}>
                <SelectTrigger className="h-8 w-[180px]" aria-label="Choose template to preview">
                  <SelectValue placeholder="Pick a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        >
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : !selectedTemplate ? (
            <EmptyNote>Create a template below, then pick it here to preview subject and body with your profile values.</EmptyNote>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</p>
                <p className="mt-0.5 font-medium">
                  {fillPlaceholders(selectedTemplate.subject || "(no subject)", placeholderValues)}
                </p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Body</p>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {fillPlaceholders(selectedTemplate.body || "(empty body)", placeholderValues)}
                </pre>
              </div>
              <p className="text-[11px] text-muted-foreground">
                <code className="rounded bg-muted px-1">{"{{name}}"}</code> → {placeholderValues.name} ·{" "}
                <code className="rounded bg-muted px-1">{"{{task}}"}</code> → {placeholderValues.task} ·{" "}
                <code className="rounded bg-muted px-1">{"{{email}}"}</code> → {placeholderValues.email}. Rendered from
                your live profile and first open task — preview only, nothing is emailed.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* 10 — templates CRUD */}
      <SectionCard
        title="Message templates"
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        action={
          <Button size="sm" onClick={() => openTemplateDialog()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add template
          </Button>
        }
      >
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <EmptyNote>No templates stored yet. Add one — saving with a body also queues a preview digest row.</EmptyNote>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <button className="min-w-0 text-left" onClick={() => setSelectedTemplateId(t.id)}>
                      <p className="truncate text-sm font-medium" title={t.name}>
                        {t.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.subject || "(no subject)"}</p>
                    </button>
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                      {t.event_type ?? "info"}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">{t.body || "(empty body)"}</p>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={t.enabled}
                        onCheckedChange={(c) => void toggleTemplateEnabled(t, c)}
                        aria-label={`Enable template ${t.name}`}
                      />
                      {t.enabled ? "Enabled" : "Disabled"}
                    </label>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2" aria-label={`Edit ${t.name}`} onClick={() => openTemplateDialog(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        aria-label={`Delete ${t.name}`}
                        onClick={() => setConfirm({ kind: "template", id: t.id, label: t.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Saved {relativeTime(t.created_at)} · id {t.id}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 11 — storage map */}
      <SectionCard title="Where everything on this page is stored" icon={<Database className="h-4 w-4 text-muted-foreground" />}>
        <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="rounded-md border px-3 py-2">
            <span className="font-medium text-foreground">email_digest</span> — queue rows with lifecycle status
            (queued / delivered / failed). The timeline, weekly composer and CSV export all read this table.
          </li>
          <li className="rounded-md border px-3 py-2">
            <span className="font-medium text-foreground">email_templates</span> — template name, subject, body, event
            type and enabled flag per user.
          </li>
          <li className="rounded-md border px-3 py-2">
            <span className="font-medium text-foreground">email_preferences</span> — the subscription matrix as one
            JSONB blob per user, kept separate from settings storage.
          </li>
          <li className="rounded-md border px-3 py-2">
            <span className="font-medium text-foreground">notifications</span> — the shared bell feed. Saving a template
            with a body writes a system notification that references its preview digest row by id.
          </li>
        </ul>
      </SectionCard>

      {/* 12 — footer links */}
      <div className="flex flex-wrap items-center gap-3 border-t pt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Info className="h-4 w-4" />
          Related workspaces:
        </span>
        <Button variant="link" className="h-auto p-0 text-sm" asChild>
          <Link href="/dashboard/settings">
            Notification settings <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button variant="link" className="h-auto p-0 text-sm" asChild>
          <Link href="/dashboard/team">
            Team directory <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <span className="ml-auto flex items-center gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5" />
          {profile ? profile.email : "signed-in account"}
        </span>
      </div>

      {/* template dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={(o) => !o && (setTemplateDialogOpen(false), setTemplateDraft(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{templateDraft?.id !== undefined ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>
              Stored in email_templates. If the body is non-empty on save, a preview digest row is queued and a system
              notification references it — no email leaves this app.
            </DialogDescription>
          </DialogHeader>
          {templateDraft && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Name</Label>
                <Input
                  id="tpl-name"
                  value={templateDraft.name}
                  maxLength={255}
                  onChange={(e) => setTemplateDraft({ ...templateDraft, name: e.target.value })}
                  placeholder="Sprint wrap-up summary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-subject">Subject</Label>
                <Input
                  id="tpl-subject"
                  value={templateDraft.subject}
                  maxLength={500}
                  onChange={(e) => setTemplateDraft({ ...templateDraft, subject: e.target.value })}
                  placeholder="Weekly digest for {{name}}"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-body">Body</Label>
                <Textarea
                  id="tpl-body"
                  rows={6}
                  value={templateDraft.body}
                  onChange={(e) => setTemplateDraft({ ...templateDraft, body: e.target.value })}
                  placeholder={"Hi {{name}},\n\nThis week the team closed tasks around {{task}}."}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Event type</Label>
                  <Select value={templateDraft.eventType} onValueChange={(v) => setTemplateDraft({ ...templateDraft, eventType: v as EventType })}>
                    <SelectTrigger aria-label="Template event type">
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
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    checked={templateDraft.enabled}
                    onCheckedChange={(c) => setTemplateDraft({ ...templateDraft, enabled: c })}
                    aria-label="Template enabled"
                  />
                  <Label className="text-xs font-normal">Enabled</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => (setTemplateDialogOpen(false), setTemplateDraft(null))}>
              Cancel
            </Button>
            <Button disabled={savingTemplate || !templateDraft?.name.trim()} onClick={() => void saveTemplate()}>
              {savingTemplate ? "Saving…" : templateDraft?.id !== undefined ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* destructive confirm dialog */}
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Delete {confirm?.kind === "template" ? "template" : "digest row"}?
            </DialogTitle>
            <DialogDescription>
              {confirm
                ? `"${confirm.label}" will be permanently removed from the stored ${confirm.kind === "template" ? "email_templates" : "email_digest"} table.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={confirmBusy} onClick={() => void deleteTarget()}>
              {confirmBusy ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------ sub-pieces */

function BarChartIcon() {
  return <LayoutList className="h-4 w-4 text-muted-foreground" />
}

function KpiCard({
  loading,
  icon,
  label,
  value,
  hint,
}: {
  loading: boolean
  icon: React.ReactNode
  label: string
  value: number | string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="py-4">
        {loading ? (
          <>
            <Skeleton className="h-4 w-4" />
            <Skeleton className="mt-2 h-6 w-16" />
            <Skeleton className="mt-1 h-3 w-24" />
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {icon}
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground">{hint}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
