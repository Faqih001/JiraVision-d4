"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  Github,
  History,
  Plug,
  PlugZap,
  Puzzle,
  RefreshCw,
  ScrollText,
  Settings2,
  Shield,
  Slack,
  Trash2,
  Upload,
  Webhook,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
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
  PRIORITIES,
  SectionCard,
  STATUSES,
  STATUS_LABEL,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type ConfigValue = string | boolean | string[]

type StoredEntry = {
  connected: boolean
  config: Record<string, unknown>
  connectedAt: string | null
  lastSyncAt: string | null
  pendingConfig: Record<string, unknown> | null
  updatedAt?: string
}

type FieldDef = {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "multi" | "boolean"
  placeholder?: string
  options?: string[]
  help?: string
  required?: boolean
  defaultValue?: ConfigValue
}

type CatalogDef = {
  key: string
  name: string
  description: string
  icon: React.ElementType
  /** honesty class: what the integration actually does in this product */
  effect: "real" | "hybrid" | "config-only"
  webhookCapable?: boolean
  fields: FieldDef[]
  behaviorNote: string
  storesData: string
}

type NotificationRow = {
  id: number
  title: string
  body: string | null
  isRead: boolean | null
  metadata: Record<string, unknown> | null
  createdAt: string | null
}

type TaskRow = {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  storyPoints: number | null
  sprintId: number | null
  dueDate: string | null
}

type SprintOption = { id: number; name: string }

type CsvRow = {
  line: number
  raw: Record<string, string>
  errors: string[]
}

/* ---------------------------------------------------------------- catalog */

const SLACK_EVENTS = ["Task created", "Task completed", "Sprint started", "Sprint completed", "Comment added"]

const CATALOG: CatalogDef[] = [
  {
    key: "slack",
    name: "Slack",
    description: "Channel notifications for task and sprint events.",
    icon: Slack,
    effect: "hybrid",
    webhookCapable: true,
    fields: [
      { key: "webhookUrl", label: "Incoming webhook URL", type: "text", placeholder: "https://hooks.slack.com/services/…", required: true },
      { key: "channelName", label: "Channel name", type: "text", placeholder: "#project-updates", required: true },
      { key: "events", label: "Subscribed events", type: "multi", options: SLACK_EVENTS },
    ],
    behaviorNote:
      "Configuration is stored in your account preferences; no external call is made to Slack by this demo product. Test events from the console below are delivered as real in-app notifications.",
    storesData: "webhookUrl, channelName, events",
  },
  {
    key: "github",
    name: "GitHub",
    description: "Link repositories and auto-associate PRs with tasks.",
    icon: Github,
    effect: "config-only",
    fields: [
      { key: "repoUrl", label: "Repository URL", type: "text", placeholder: "https://github.com/acme/app", required: true },
      { key: "branch", label: "Default branch", type: "text", placeholder: "main", defaultValue: "main" },
      { key: "autoLink", label: "Auto-link PRs mentioning task IDs", type: "boolean", defaultValue: true },
    ],
    behaviorNote: "Configuration stored; no external call is made by this demo product — no live repository sync happens.",
    storesData: "repoUrl, branch, autoLink flag",
  },
  {
    key: "jira",
    name: "Jira import",
    description: "Import issues from a Jira site (or fall back to CSV).",
    icon: Puzzle,
    effect: "hybrid",
    fields: [
      { key: "siteUrl", label: "Site URL", type: "text", placeholder: "https://acme.atlassian.net", required: true },
      { key: "projectKey", label: "Project key", type: "text", placeholder: "ACME", required: true },
    ],
    behaviorNote:
      "Direct site import is configuration-only in this demo product (no call to Atlassian APIs). The CSV fallback importer below is real — exported Jira CSVs are imported through /api/tasks.",
    storesData: "siteUrl, projectKey",
  },
  {
    key: "gcal",
    name: "Google Calendar",
    description: "Surface sprints and due dates in your calendar.",
    icon: CalendarDays,
    effect: "real",
    fields: [
      { key: "showDueDates", label: "Include task due dates", type: "boolean", defaultValue: true },
      { key: "showSprints", label: "Include sprint boundaries", type: "boolean", defaultValue: true },
    ],
    behaviorNote:
      "No Google account connection is attempted by this demo product. The feed button copies the app's own internal calendar route — the only real feed this integration can honestly offer.",
    storesData: "showDueDates, showSprints flags",
  },
  {
    key: "webhooks",
    name: "Webhooks",
    description: "Event endpoint tester — deliveries land in the in-app pipeline.",
    icon: Webhook,
    effect: "real",
    webhookCapable: true,
    fields: [
      { key: "endpointUrl", label: "Endpoint URL", type: "text", placeholder: "https://your-server.example/hook", required: true },
      { key: "secret", label: "Signing secret", type: "text", placeholder: "optional" },
      { key: "events", label: "Subscribed events", type: "multi", options: SLACK_EVENTS },
    ],
    behaviorNote:
      "Sending a test event writes a real notification row through the app's delivery pipeline (Neon Realtime bell). The stored endpoint URL is recorded but this demo product does not issue HTTP requests to it.",
    storesData: "endpointUrl, secret, events",
  },
  {
    key: "csv",
    name: "CSV bulk tasks",
    description: "Real bulk import and filtered export of task lists.",
    icon: FileSpreadsheet,
    effect: "real",
    fields: [
      { key: "delimiter", label: "Column delimiter", type: "select", options: [",", ";", "|"], defaultValue: "," },
      { key: "skipInvalid", label: "Skip invalid rows on import", type: "boolean", defaultValue: true },
    ],
    behaviorNote:
      "Fully functional in-app: the importer parses your CSV, creates each valid row via POST /api/tasks and records the run as a notification; the exporter downloads real task data as CSV.",
    storesData: "delimiter, skipInvalid flag",
  },
  {
    key: "zapier",
    name: "Zapier",
    description: "Store a Zapier catch hook — configuration only, Zaps do not fire.",
    icon: Zap,
    effect: "config-only",
    fields: [
      { key: "webhookUrl", label: "Zap catch hook URL", type: "text", placeholder: "https://hooks.zapier.com/hooks/catch/…", required: true },
      { key: "triggerEvent", label: "Trigger event", type: "select", options: SLACK_EVENTS, required: true },
    ],
    behaviorNote: "Configuration stored; no external call is made by this demo product. Zaps will not fire.",
    storesData: "webhookUrl, triggerEvent",
  },
]

const CATALOG_BY_KEY: Record<string, CatalogDef> = Object.fromEntries(CATALOG.map((d) => [d.key, d]))

const CSV_HEADERS = ["title", "description", "status", "priority", "storyPoints", "sprintId", "dueDate", "tags"] as const

const INTEGRATION_LINK = "/dashboard/integrations"

/* ---------------------------------------------------------------- helpers */

function defaultForm(def: CatalogDef, config?: Record<string, unknown> | null): Record<string, ConfigValue> {
  const form: Record<string, ConfigValue> = {}
  for (const field of def.fields) {
    const stored = config?.[field.key]
    if (typeof stored === "string") form[field.key] = stored
    else if (typeof stored === "boolean") form[field.key] = stored
    else if (Array.isArray(stored)) form[field.key] = stored.map(String)
    else if (field.type === "multi") form[field.key] = []
    else if (field.type === "boolean") form[field.key] = field.defaultValue === true
    else if (field.type === "select") form[field.key] = typeof field.defaultValue === "string" ? field.defaultValue : field.options?.[0] ?? ""
    else form[field.key] = typeof field.defaultValue === "string" ? field.defaultValue : ""
  }
  return form
}

function validateRequired(def: CatalogDef, form: Record<string, ConfigValue>): string[] {
  const missing: string[] = []
  for (const field of def.fields) {
    if (!field.required) continue
    const value = form[field.key]
    if (field.type === "multi") {
      if (!Array.isArray(value) || value.length === 0) missing.push(field.label)
    } else if (field.type === "boolean") {
      // booleans always have a value
    } else if (typeof value !== "string" || value.trim().length === 0) {
      missing.push(field.label)
    }
  }
  return missing
}

/** Minimal CSV splitter handling quoted fields with embedded delimiters. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cur)
      cur = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(cur)
      cur = ""
      if (row.some((c) => c.trim() !== "")) rows.push(row)
      row = []
    } else cur += ch
  }
  row.push(cur)
  if (row.some((c) => c.trim() !== "")) rows.push(row)
  return rows
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function maskUrl(url: unknown): string {
  if (typeof url !== "string" || url.length === 0) return "—"
  return url.length > 46 ? `${url.slice(0, 40)}…` : url
}

/* ------------------------------------------------------------------- page */

export default function IntegrationsWorkspace() {
  const { toast } = useToast()
  const catalogRef = useRef<HTMLDivElement | null>(null)

  const [entries, setEntries] = useState<Record<string, StoredEntry> | null>(null)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [sprints, setSprints] = useState<SprintOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // config / connect dialog
  const [editingDef, setEditingDef] = useState<CatalogDef | null>(null)
  const [form, setForm] = useState<Record<string, ConfigValue>>({})
  const [dialogBusy, setDialogBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])

  // confirmation dialog (disconnect / remove / discard draft)
  const [confirm, setConfirm] = useState<{ kind: "disconnect" | "remove" | "discardDraft"; key: string } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  // webhook test console
  const [testKey, setTestKey] = useState("")
  const [testPayload, setTestPayload] = useState(`{
  "event": "task.created",
  "task": { "title": "Ship integrations workspace" }
}`)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)

  // CSV importer
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvFileName, setCsvFileName] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null)

  // CSV exporter filters
  const [expStatus, setExpStatus] = useState("all")
  const [expPriority, setExpPriority] = useState("all")
  const [expSprint, setExpSprint] = useState("all")

  // per-integration event history
  const [historyKey, setHistoryKey] = useState("slack")

  /* --------------------------------------------------------------- loading */

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [intRes, notifRes, taskRes, sprintRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/notifications?limit=100"),
        fetch("/api/tasks?pageSize=200"),
        fetch("/api/sprints"),
      ])
      const intJson = await intRes.json()
      if (!intJson.success) throw new Error(intJson.message ?? "Failed to load integrations")
      setEntries(intJson.integrations ?? {})
      const notifJson = await notifRes.json()
      if (Array.isArray(notifJson.items)) setNotifications(notifJson.items as NotificationRow[])
      const taskJson = await taskRes.json()
      if (taskJson.success && Array.isArray(taskJson.data)) setTasks(taskJson.data as TaskRow[])
      const sprintJson = await sprintRes.json()
      if (sprintJson.success && Array.isArray(sprintJson.data))
        setSprints(sprintJson.data.map((s: { id: number; name: string }) => ({ id: s.id, name: s.name })))
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadQuiet = useCallback(async () => {
    try {
      const [intRes, notifRes] = await Promise.all([fetch("/api/integrations"), fetch("/api/notifications?limit=100")])
      const intJson = await intRes.json()
      if (intJson.success) setEntries(intJson.integrations ?? {})
      const notifJson = await notifRes.json()
      if (Array.isArray(notifJson.items)) setNotifications(notifJson.items as NotificationRow[])
    } catch {
      /* quiet background refresh — next explicit reload surfaces errors */
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast({ title: "Integrations", description: "Workspace refreshed from persisted state." })
  }, [load, toast])

  useEffect(() => {
    void load()
  }, [load])

  /* ------------------------------------------------------------ persistence */

  const saveIntegration = useCallback(
    async (key: string, body: Record<string, unknown>): Promise<StoredEntry | null> => {
      try {
        const res = await fetch(`/api/integrations/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.success) {
          toast({ variant: "destructive", title: "Integration", description: json.message ?? "Save failed" })
          return null
        }
        setEntries((prev) => ({ ...(prev ?? {}), [key]: json.integration as StoredEntry }))
        void reloadQuiet()
        return json.integration as StoredEntry
      } catch (err) {
        toast({ variant: "destructive", title: "Integration", description: (err as Error).message })
        return null
      }
    },
    [reloadQuiet, toast],
  )

  /* ---------------------------------------------------------------- derived */

  const integrationNotifications = useMemo(
    () => notifications.filter((n) => n.metadata && n.metadata.link === INTEGRATION_LINK),
    [notifications],
  )

  const kpis = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    const all = entries ?? {}
    return {
      connectedCount: Object.values(all).filter((e) => e.connected).length,
      eventsToday: integrationNotifications.filter((n) => n.createdAt && new Date(n.createdAt).getTime() >= dayAgo).length,
      importsRun: integrationNotifications.filter((n) => n.metadata?.source === "csv_import").length,
      drafts: Object.values(all).filter((e) => e.pendingConfig).length,
    }
  }, [entries, integrationNotifications])

  const connectedEntries = useMemo(
    () => CATALOG.filter((def) => entries?.[def.key]?.connected).map((def) => ({ def, entry: entries![def.key] })),
    [entries],
  )

  const webhookTestTargets = useMemo(
    () => connectedEntries.filter(({ def }) => def.webhookCapable).map(({ def }) => def),
    [connectedEntries],
  )

  const draftEntries = useMemo(
    () => CATALOG.filter((def) => entries?.[def.key]?.pendingConfig).map((def) => ({ def, entry: entries![def.key] })),
    [entries],
  )

  const chartData = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return { day: d.toLocaleDateString(undefined, { weekday: "short" }), events: 0 }
    })
    for (const n of integrationNotifications) {
      if (!n.createdAt) continue
      const t = new Date(n.createdAt).getTime()
      if (t < start.getTime()) continue
      const idx = Math.min(6, Math.floor((t - start.getTime()) / 86_400_000))
      days[idx].events += 1
    }
    return days
  }, [integrationNotifications])

  const historyEvents = useMemo(
    () => integrationNotifications.filter((n) => n.metadata?.integrationKey === historyKey),
    [integrationNotifications, historyKey],
  )

  const exportRows = useMemo(
    () =>
      tasks.filter((t) => {
        if (expStatus !== "all" && t.status !== expStatus) return false
        if (expPriority !== "all" && t.priority !== expPriority) return false
        if (expSprint !== "all" && String(t.sprintId ?? "") !== expSprint) return false
        return true
      }),
    [tasks, expStatus, expPriority, expSprint],
  )

  const validCsvRows = useMemo(() => csvRows.filter((r) => r.errors.length === 0), [csvRows])
  const invalidCsvCount = csvRows.length - validCsvRows.length

  const editingEntry = editingDef ? entries?.[editingDef.key] ?? null : null
  const dialogDirty =
    editingDef !== null &&
    JSON.stringify(form) !== JSON.stringify(defaultForm(editingDef, editingEntry?.config))

  /* ---------------------------------------------------------------- actions */

  const openConnect = (def: CatalogDef) => {
    setEditingDef(def)
    setForm(defaultForm(def))
    setFieldErrors([])
  }

  const openConfigure = (def: CatalogDef) => {
    const entry = entries?.[def.key]
    setEditingDef(def)
    setForm(defaultForm(def, entry?.pendingConfig ?? entry?.config))
    setFieldErrors([])
  }

  const setField = (key: string, value: ConfigValue) => {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors([])
  }

  const toggleMulti = (key: string, option: string) => {
    setForm((f) => {
      const current = Array.isArray(f[key]) ? (f[key] as string[]) : []
      return { ...f, [key]: current.includes(option) ? current.filter((v) => v !== option) : [...current, option] }
    })
  }

  const submitConnect = async () => {
    if (!editingDef) return
    const missing = validateRequired(editingDef, form)
    if (missing.length > 0) {
      setFieldErrors(missing)
      return
    }
    setDialogBusy(true)
    const saved = await saveIntegration(editingDef.key, { connected: true, config: form })
    setDialogBusy(false)
    if (saved) {
      toast({ title: `${editingDef.name} connected`, description: "Connection state persisted to your account preferences." })
      setEditingDef(null)
    }
  }

  const submitPublishChanges = async () => {
    if (!editingDef) return
    const missing = validateRequired(editingDef, form)
    if (missing.length > 0) {
      setFieldErrors(missing)
      return
    }
    setDialogBusy(true)
    const saved = await saveIntegration(editingDef.key, { config: form })
    setDialogBusy(false)
    if (saved) {
      toast({ title: `${editingDef.name} configuration saved`, description: "Live config updated in preferences." })
      setEditingDef(null)
    }
  }

  const submitSaveDraft = async () => {
    if (!editingDef) return
    setDialogBusy(true)
    const saved = await saveIntegration(editingDef.key, { pendingConfig: form })
    setDialogBusy(false)
    if (saved) {
      toast({ title: `${editingDef.name} draft stored`, description: "Draft saved — publish it from the drafts banner." })
      setEditingDef(null)
    }
  }

  const publishDraft = async (key: string, name: string) => {
    const saved = await saveIntegration(key, { publish: true })
    if (saved) toast({ title: `${name} draft published`, description: "Pending config is now live." })
  }

  const copyFeedUrl = async () => {
    const url = `${window.location.origin}/dashboard/calendar`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Feed URL copied", description: "Internal calendar route — no Google sync happens in this demo product." })
    } catch {
      toast({ variant: "destructive", title: "Clipboard blocked", description: url })
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmBusy(true)
    const def = CATALOG_BY_KEY[confirm.key]
    if (confirm.kind === "disconnect") {
      const saved = await saveIntegration(confirm.key, { connected: false })
      if (saved) toast({ title: `${def.name} disconnected`, description: "Configuration kept; connection state persisted." })
    } else if (confirm.kind === "remove") {
      try {
        const res = await fetch(`/api/integrations/${confirm.key}`, { method: "DELETE" })
        const json = await res.json()
        if (json.success) {
          const removedKey = confirm.key
          setEntries((prev) => {
            const next = { ...(prev ?? {}) }
            delete next[removedKey]
            return next
          })
          void reloadQuiet()
          toast({ title: `${def.name} removed`, description: "Stored configuration deleted." })
        } else {
          toast({ variant: "destructive", title: "Remove failed", description: json.message ?? "Unknown error" })
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Remove failed", description: (err as Error).message })
      }
    } else if (confirm.kind === "discardDraft") {
      const saved = await saveIntegration(confirm.key, { pendingConfig: null })
      if (saved) toast({ title: `${def.name} draft discarded` })
    }
    setConfirmBusy(false)
    setConfirm(null)
    setEditingDef(null)
  }

  const sendTestEvent = async () => {
    setTestError(null)
    setTestResult(null)
    if (!testKey) {
      setTestError("Pick a connected webhook-capable integration first.")
      return
    }
    let payload: unknown
    try {
      payload = JSON.parse(testPayload)
    } catch (err) {
      setTestError(`Payload is not valid JSON: ${(err as Error).message}`)
      return
    }
    setSendingTest(true)
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: testKey, payload }),
      })
      const json = await res.json()
      setTestResult(JSON.stringify(json, null, 2))
      if (!json.success) {
        setTestError(json.message ?? "Delivery failed")
      } else {
        toast({ title: "Test event delivered", description: "Check the bell — the notification row IS the delivery." })
        await saveIntegration(testKey, { markSynced: true })
      }
      await reloadQuiet()
    } catch (err) {
      setTestError((err as Error).message)
    } finally {
      setSendingTest(false)
    }
  }

  const onCsvFile = async (file: File | null) => {
    if (!file) return
    setCsvFileName(file.name)
    setImportResult(null)
    const text = await file.text()
    const delimiter = typeof entries?.csv?.config.delimiter === "string" ? entries.csv.config.delimiter : ","
    const grid = parseCsv(text, delimiter)
    if (grid.length < 2) {
      setCsvRows([])
      toast({ variant: "destructive", title: "CSV looks empty", description: "Need a header row plus at least one data row." })
      return
    }
    const headerRow = grid[0].map((h) => h.trim())
    const titleIdx = headerRow.findIndex((h) => h.toLowerCase() === "title")
    if (titleIdx === -1) {
      setCsvRows([])
      toast({ variant: "destructive", title: "Missing column", description: "The CSV header must contain a 'title' column." })
      return
    }
    const colIndex = (name: string) => headerRow.findIndex((h) => h.toLowerCase() === name.toLowerCase())
    const cols: Record<string, number> = {}
    for (const h of CSV_HEADERS) cols[h] = colIndex(h)
    const rows: CsvRow[] = grid.slice(1).map((cells, i) => {
      const values: Record<string, string> = {}
      for (const [name, idx] of Object.entries(cols)) {
        values[name] = idx >= 0 ? (cells[idx] ?? "").trim() : ""
      }
      const errors: string[] = []
      if (!values.title) errors.push("title is required")
      if (values.status && !STATUSES.includes(values.status)) errors.push(`unknown status "${values.status}"`)
      if (values.priority && !PRIORITIES.includes(values.priority)) errors.push(`unknown priority "${values.priority}"`)
      if (values.storyPoints && !/^\d+(\.\d+)?$/.test(values.storyPoints)) errors.push("storyPoints must be a number")
      if (values.dueDate && Number.isNaN(Date.parse(values.dueDate))) errors.push(`invalid dueDate "${values.dueDate}"`)
      return { line: i + 2, raw: values, errors }
    })
    setCsvRows(rows)
  }

  const runCsvImport = async () => {
    if (validCsvRows.length === 0 || importing) return
    setImporting(true)
    setImportResult(null)
    let created = 0
    let failed = 0
    for (const row of validCsvRows) {
      try {
        const body: Record<string, unknown> = {
          title: row.raw.title,
          description: row.raw.description || "",
          status: row.raw.status || "todo",
          priority: row.raw.priority || "medium",
          storyPoints: row.raw.storyPoints ? Number(row.raw.storyPoints) : 0,
          dueDate: row.raw.dueDate || null,
          tags: row.raw.tags ? row.raw.tags.split("|").map((t) => t.trim()).filter(Boolean) : [],
        }
        if (row.raw.sprintId && /^\d+$/.test(row.raw.sprintId)) body.sprintId = Number(row.raw.sprintId)
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (json.success) created += 1
        else failed += 1
      } catch {
        failed += 1
      }
    }
    await fetch("/api/integrations/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: csvFileName || "tasks.csv", total: validCsvRows.length, created, failed }),
    }).catch(() => undefined)
    setImporting(false)
    setImportResult({ created, failed })
    toast({
      title: "Import finished",
      description: `${created} task${created === 1 ? "" : "s"} created, ${failed} failed. Run recorded in the activity feed.`,
    })
    await Promise.all([reloadQuiet(), load()])
  }

  const runCsvExport = () => {
    if (!entries?.csv?.connected) {
      toast({ variant: "destructive", title: "CSV integration not connected", description: "Connect it in the catalog first." })
      return
    }
    const lines = [CSV_HEADERS.join(",")]
    for (const t of exportRows) {
      lines.push(
        [
          t.title,
          t.description ?? "",
          t.status,
          t.priority,
          String(t.storyPoints ?? 0),
          t.sprintId == null ? "" : String(t.sprintId),
          t.dueDate ? String(t.dueDate).slice(0, 10) : "",
          "",
        ]
          .map((v) => csvEscape(String(v)))
          .join(","),
      )
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-tasks-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export ready", description: `${exportRows.length} rows downloaded as CSV.` })
  }

  const markRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch {
      toast({ variant: "destructive", title: "Activity", description: "Could not mark as read." })
    }
  }

  /* ----------------------------------------------------------------- guards */

  if (loading && !entries) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (loadError && !entries) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <div className="flex gap-2">
          <Button onClick={() => void load()}>Retry</Button>
          <Link href="/login">
            <Button variant="outline">Sign in again</Button>
          </Link>
        </div>
      </div>
    )
  }

  /* ----------------------------------------------------------------- render */

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Puzzle className="h-5 w-5 text-muted-foreground" />
            Integrations workspace
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Connection state, configuration and drafts are really persisted per integration. Each card below labels
            whether an action performs real in-app behavior or is configuration-only.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}>
            Add from catalog
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2 — KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Connected", value: kpis.connectedCount, sub: `of ${CATALOG.length} catalog entries` },
          { label: "Events (24h)", value: kpis.eventsToday, sub: "integration notifications in the last day" },
          { label: "Imports run", value: kpis.importsRun, sub: "recorded CSV import digests" },
          { label: "Config drafts", value: kpis.drafts, sub: "stored, unpublished drafts" },
        ].map((kpi) => (
          <SectionCard key={kpi.label} title={kpi.label}>
            <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.sub}</p>
          </SectionCard>
        ))}
      </div>

      {/* 3 — config draft banner */}
      <SectionCard
        title="Configuration drafts"
        icon={<ScrollText className="h-4 w-4 text-muted-foreground" />}
        action={<Badge variant="outline">{draftEntries.length} stored</Badge>}
      >
        {draftEntries.length === 0 ? (
          <EmptyNote>
            No unpublished drafts. Use “Save as draft” inside a configuration dialog to park changes without going live —
            drafts persist in your account preferences.
          </EmptyNote>
        ) : (
          <div className="space-y-2">
            {draftEntries.map(({ def, entry }) => (
              <div key={def.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <div className="text-xs">
                  <span className="font-medium">{def.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — draft with {Object.keys(entry.pendingConfig ?? {}).length} field(s) pending publication
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void publishDraft(def.key, def.name)}>
                    Publish draft
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setConfirm({ kind: "discardDraft", key: def.key })}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 4 — connected integrations */}
      <SectionCard
        title="Connected integrations"
        icon={<Plug className="h-4 w-4 text-muted-foreground" />}
        action={<Badge variant="outline">{connectedEntries.length} active</Badge>}
      >
        {connectedEntries.length === 0 ? (
          <EmptyNote>Nothing connected yet. Pick an integration from the catalog below and connect it.</EmptyNote>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {connectedEntries.map(({ def, entry }) => (
              <div key={def.key} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <def.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{def.name}</p>
                      <EffectBadge effect={def.effect} />
                    </div>
                  </div>
                  <Switch
                    checked
                    onCheckedChange={() => setConfirm({ kind: "disconnect", key: def.key })}
                    aria-label={`Disconnect ${def.name}`}
                  />
                </div>
                <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Key config</dt>
                    <dd className="max-w-[60%] truncate text-right font-mono">
                      {maskUrl(entry.config.webhookUrl ?? entry.config.endpointUrl ?? entry.config.repoUrl ?? entry.config.siteUrl)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Connected</dt>
                    <dd>{entry.connectedAt ? relativeTime(entry.connectedAt) : "unknown"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last activity</dt>
                    <dd>{entry.lastSyncAt ? relativeTime(entry.lastSyncAt) : "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openConfigure(def)}>
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive"
                    onClick={() => setConfirm({ kind: "remove", key: def.key })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 5 — catalog market */}
      <div ref={catalogRef}>
        <SectionCard
          title="Integration catalog"
          icon={<Puzzle className="h-4 w-4 text-muted-foreground" />}
          action={<Badge variant="outline">{CATALOG.length} available</Badge>}
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {CATALOG.map((def) => {
              const entry = entries?.[def.key]
              const isConnected = entry?.connected === true
              return (
                <div
                  key={def.key}
                  className={cn("flex flex-col rounded-lg border p-3", isConnected && "border-primary/40 bg-primary/5")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <def.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{def.name}</p>
                        <p className="text-[11px] text-muted-foreground">{def.description}</p>
                      </div>
                    </div>
                    {isConnected ? (
                      <Badge className="gap-1">
                        <Check className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <EffectBadge effect={def.effect} />
                    )}
                  </div>
                  <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted-foreground">{def.behaviorNote}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isConnected ? (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openConfigure(def)}>
                        <Settings2 className="h-3.5 w-3.5" />
                        Configure
                      </Button>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={() => openConnect(def)}>
                        <PlugZap className="h-3.5 w-3.5" />
                        {entry ? "Reconnect" : "Connect"}
                      </Button>
                    )}
                    {def.key === "gcal" && (
                      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => void copyFeedUrl()}>
                        <Copy className="h-3.5 w-3.5" />
                        Copy feed URL
                      </Button>
                    )}
                    {def.key === "jira" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={() => document.getElementById("csv-file")?.click()}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        CSV fallback
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      {/* 6 — webhook test console */}
      <SectionCard
        title="Webhook test console"
        icon={<Webhook className="h-4 w-4 text-muted-foreground" />}
        action={<Badge variant="outline">real in-app delivery</Badge>}
      >
        {webhookTestTargets.length === 0 ? (
          <EmptyNote>
            Connect a webhook-capable integration (Slack or Webhooks) above, then fire a test event here. The event is
            written as a real notification row — that row is the delivery; no external HTTP call is made.
          </EmptyNote>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="webhook-target">Deliver event as integration</Label>
                <Select
                  value={testKey || undefined}
                  onValueChange={(v) => {
                    setTestKey(v)
                    setTestResult(null)
                    setTestError(null)
                  }}
                >
                  <SelectTrigger id="webhook-target">
                    <SelectValue placeholder="Pick a connected integration" />
                  </SelectTrigger>
                  <SelectContent>
                    {webhookTestTargets.map((def) => (
                      <SelectItem key={def.key} value={def.key}>
                        {def.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Stored endpoint (recorded only, never called):{" "}
                  <span className="font-mono">
                    {maskUrl(entries?.[testKey]?.config?.webhookUrl ?? entries?.[testKey]?.config?.endpointUrl)}
                  </span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="webhook-payload">Event payload (JSON)</Label>
                <Textarea
                  id="webhook-payload"
                  rows={5}
                  className="font-mono text-xs"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" className="gap-1.5" onClick={() => void sendTestEvent()} disabled={sendingTest}>
                <Zap className="h-3.5 w-3.5" />
                {sendingTest ? "Delivering…" : "Send test event"}
              </Button>
              <span className="text-[11px] text-muted-foreground">Creates a real notification via the app pipeline.</span>
            </div>
            {testError && <p className="text-xs text-destructive">{testError}</p>}
            {testResult && (
              <pre className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed">
                {testResult}
              </pre>
            )}
          </div>
        )}
      </SectionCard>

      {/* 7 — CSV importer */}
      <SectionCard
        title="CSV task importer"
        icon={<Upload className="h-4 w-4 text-muted-foreground" />}
        action={
          entries?.csv?.connected ? (
            <Badge className="gap-1">
              <Check className="h-3 w-3" />
              real import via /api/tasks
            </Badge>
          ) : (
            <Badge variant="outline">needs CSV integration</Badge>
          )
        }
      >
        {!entries?.csv?.connected ? (
          <div className="space-y-2">
            <EmptyNote>Bulk import unlocks once the “CSV bulk tasks” integration is connected.</EmptyNote>
            <div className="flex justify-center">
              <Button size="sm" onClick={() => openConnect(CATALOG_BY_KEY.csv)}>
                Connect CSV integration
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="text-xs"
                onChange={(e) => void onCsvFile(e.target.files?.[0] ?? null)}
                aria-label="CSV file to import"
              />
              <span className="text-[11px] text-muted-foreground">
                Header needs <span className="font-mono">title</span>; optional <span className="font-mono">
                  description, status, priority, storyPoints, sprintId, dueDate, tags
                </span>{" "}
                (tags joined with |).
              </span>
            </div>
            {csvRows.length > 0 && (
              <>
                <div className="max-h-60 overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 text-left">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Line</th>
                        <th className="px-2 py-1.5 font-medium">title</th>
                        <th className="px-2 py-1.5 font-medium">status</th>
                        <th className="px-2 py-1.5 font-medium">priority</th>
                        <th className="px-2 py-1.5 font-medium">validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 50).map((row) => (
                        <tr key={row.line} className={cn("border-t", row.errors.length > 0 && "bg-destructive/5")}>
                          <td className="px-2 py-1 tabular-nums text-muted-foreground">{row.line}</td>
                          <td className="px-2 py-1">
                            {row.raw.title || <span className="italic text-muted-foreground">empty</span>}
                          </td>
                          <td className="px-2 py-1">{row.raw.status || "todo"}</td>
                          <td className="px-2 py-1">{row.raw.priority || "medium"}</td>
                          <td className="px-2 py-1">
                            {row.errors.length === 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">ok</span>
                            ) : (
                              <span className="text-destructive">{row.errors.join("; ")}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" className="gap-1.5" onClick={() => void runCsvImport()} disabled={importing || validCsvRows.length === 0}>
                    <Upload className="h-3.5 w-3.5" />
                    {importing ? "Importing…" : `Import ${validCsvRows.length} valid row(s)`}
                  </Button>
                  {invalidCsvCount > 0 && (
                    <span className="text-[11px] text-destructive">{invalidCsvCount} row(s) blocked by validation errors.</span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCsvRows([])
                      setCsvFileName("")
                      setImportResult(null)
                    }}
                  >
                    Clear
                  </Button>
                </div>
                {importResult && (
                  <p className="text-xs">
                    <span className="font-medium">Last run:</span> {importResult.created} created via POST /api/tasks,{" "}
                    <span className={importResult.failed > 0 ? "text-destructive" : undefined}>
                      {importResult.failed} failed
                    </span>{" "}
                    — digest stored as a notification.
                  </p>
                )}
              </>
            )}
            {csvRows.length === 0 && (
              <EmptyNote>Choose a .csv file (including a Jira export) to preview and validate rows here first.</EmptyNote>
            )}
          </div>
        )}
      </SectionCard>

      {/* 8 — CSV exporter */}
      <SectionCard
        title="CSV task exporter"
        icon={<Download className="h-4 w-4 text-muted-foreground" />}
        action={<Badge variant="outline">{exportRows.length} matching rows</Badge>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={expStatus} onValueChange={setExpStatus}>
              <SelectTrigger aria-label="Export status filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={expPriority} onValueChange={setExpPriority}>
              <SelectTrigger aria-label="Export priority filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sprint</Label>
            <Select value={expSprint} onValueChange={setExpSprint}>
              <SelectTrigger aria-label="Export sprint filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sprints</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={runCsvExport}>
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Real Blob built from tasks loaded via GET /api/tasks — round-trips into the importer above.
          </span>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 9 — activity feed */}
        <SectionCard
          title="Integration activity feed"
          icon={<Bell className="h-4 w-4 text-muted-foreground" />}
          action={<Badge variant="outline">{integrationNotifications.length} events</Badge>}
        >
          {integrationNotifications.length === 0 ? (
            <EmptyNote>No connect/disconnect/test/import events yet — they appear here as real notifications.</EmptyNote>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-auto pr-1">
              {integrationNotifications.slice(0, 30).map((n) => (
                <li key={n.id} className={cn("rounded-md border p-2", !n.isRead && "bg-muted/40")}>
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left" onClick={() => void markRead(n.id)}>
                      <p className="text-xs font-medium leading-snug">
                        {!n.isRead && (
                          <span
                            className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"
                            aria-label="unread"
                          />
                        )}
                        {n.title}
                      </p>
                      {n.body && <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>}
                    </button>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                      {n.createdAt ? relativeTime(n.createdAt) : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* 10 — per-integration event history */}
        <SectionCard title="Event history per integration" icon={<History className="h-4 w-4 text-muted-foreground" />}>
          <Select value={historyKey} onValueChange={setHistoryKey}>
            <SelectTrigger aria-label="History integration filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATALOG.map((def) => (
                <SelectItem key={def.key} value={def.key}>
                  {def.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3">
            {historyEvents.length === 0 ? (
              <EmptyNote>
                No recorded events for {CATALOG_BY_KEY[historyKey].name} yet. Events reuse the notification rows of the
                activity feed, matched on their integration metadata.
              </EmptyNote>
            ) : (
              <ol className="space-y-2">
                {historyEvents.slice(0, 12).map((n) => (
                  <li key={n.id} className="flex items-start gap-2 text-xs">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {String(n.metadata?.source ?? "event")} · {n.createdAt ? relativeTime(n.createdAt) : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 11 — event volume chart */}
      <SectionCard title="Integration event volume — last 7 days" icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}>
        {chartData.every((d) => d.events === 0) ? (
          <EmptyNote>No integration events in the last 7 days yet. Fire a test event or run an import to populate this.</EmptyNote>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} {...AXIS} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} {...AXIS} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Bar dataKey="events" name="Events" fill="hsl(var(--chart-moss))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* 12 — security & data note */}
      <SectionCard title="Security & data note" icon={<Shield className="h-4 w-4 text-muted-foreground" />}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Every integration persists its configuration in your own account under{" "}
          <span className="font-mono">users.preferences.integrations</span> (Neon Postgres). Sibling preference
          namespaces (settings, billing) are merged at the database level and never overwritten from this page. No
          credentials beyond what you type into the config forms are stored, and this demo product issues no outbound
          HTTP calls — the only deliveries that really happen are in-app notifications.
        </p>
        <Separator className="my-3" />
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-2 py-1.5 font-medium">Integration</th>
                <th className="px-2 py-1.5 font-medium">Data stored in preferences</th>
                <th className="px-2 py-1.5 font-medium">Real behavior</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((def) => (
                <tr key={def.key} className="border-t">
                  <td className="px-2 py-1.5 font-medium">{def.name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{def.storesData}</td>
                  <td className="px-2 py-1.5">
                    <EffectBadge effect={def.effect} />{" "}
                    <span className="text-muted-foreground">
                      {def.effect === "config-only"
                        ? "configuration stored; no external call is made by this demo product"
                        : def.effect === "real"
                          ? "performs real in-app actions (see its section)"
                          : "config stored + real in-app events; no external call"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 13 — footer links */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="text-xs text-muted-foreground">
          Integrations interact with your workspace settings, notification bell and email digests.
        </p>
        <div className="flex gap-2">
          <Link href="/dashboard/settings">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Workspace settings
            </Button>
          </Link>
          <Link href="/dashboard/email">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Email center
            </Button>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------- config dialog */}
      <Dialog open={editingDef !== null} onOpenChange={(open) => { if (!open) setEditingDef(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {editingDef && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <editingDef.icon className="h-4 w-4" />
                  {editingEntry?.connected ? `Configure ${editingDef.name}` : `Connect ${editingDef.name}`}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {editingDef.behaviorNote}
                  {dialogDirty && " You have unsaved edits in this form."}
                </DialogDescription>
              </DialogHeader>
              {editingEntry?.pendingConfig && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                  A stored draft exists for this integration and is pre-filled below. Publish or discard it from the
                  drafts banner.
                </p>
              )}
              <div className="space-y-4">
                {editingDef.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label
                      htmlFor={`field-${editingDef.key}-${field.key}`}
                      className={field.required ? "after:content-['_*'] after:text-destructive" : undefined}
                    >
                      {field.label}
                    </Label>
                    {field.type === "text" && (
                      <Input
                        id={`field-${editingDef.key}-${field.key}`}
                        type="text"
                        placeholder={field.placeholder}
                        value={typeof form[field.key] === "string" ? (form[field.key] as string) : ""}
                        onChange={(e) => setField(field.key, e.target.value)}
                      />
                    )}
                    {field.type === "textarea" && (
                      <Textarea
                        id={`field-${editingDef.key}-${field.key}`}
                        placeholder={field.placeholder}
                        value={typeof form[field.key] === "string" ? (form[field.key] as string) : ""}
                        onChange={(e) => setField(field.key, e.target.value)}
                      />
                    )}
                    {field.type === "boolean" && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`field-${editingDef.key}-${field.key}`}
                          checked={form[field.key] === true}
                          onCheckedChange={(v) => setField(field.key, v)}
                        />
                        <span className="text-xs text-muted-foreground">{form[field.key] === true ? "Enabled" : "Disabled"}</span>
                      </div>
                    )}
                    {field.type === "select" && (
                      <Select value={(form[field.key] as string) || undefined} onValueChange={(v) => setField(field.key, v)}>
                        <SelectTrigger id={`field-${editingDef.key}-${field.key}`} aria-label={field.label}>
                          <SelectValue placeholder="Choose one" />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options ?? []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === "multi" && (
                      <div className="flex flex-wrap gap-1.5">
                        {(field.options ?? []).map((opt) => {
                          const active = Array.isArray(form[field.key]) && (form[field.key] as string[]).includes(opt)
                          return (
                            <Button
                              key={opt}
                              type="button"
                              size="sm"
                              variant={active ? "default" : "outline"}
                              className="h-7 text-[11px]"
                              aria-pressed={active}
                              onClick={() => toggleMulti(field.key, opt)}
                            >
                              {opt}
                            </Button>
                          )
                        })}
                      </div>
                    )}
                    {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
                  </div>
                ))}
                {fieldErrors.length > 0 && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                    Missing required configuration: {fieldErrors.join(", ")}
                  </p>
                )}
              </div>
              {editingDef.key === "gcal" && (
                <div className="rounded-md border bg-muted/30 p-2 text-[11px]">
                  <p className="font-medium">Internal calendar feed</p>
                  <p className="text-muted-foreground">
                    JiraVision exposes its own calendar view at <span className="font-mono">/dashboard/calendar</span> —
                    no Google sync happens in this demo product.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => void copyFeedUrl()}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy internal feed URL
                  </Button>
                </div>
              )}
              <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
                <div>
                  {editingEntry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setConfirm({ kind: "remove", key: editingDef.key })}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete stored config
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingEntry?.connected && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirm({ kind: "disconnect", key: editingDef.key })}
                    >
                      Disconnect
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => void submitSaveDraft()} disabled={dialogBusy}>
                    Save as draft
                  </Button>
                  {editingEntry?.connected ? (
                    <Button size="sm" onClick={() => void submitPublishChanges()} disabled={dialogBusy || !dialogDirty}>
                      {dialogBusy ? "Saving…" : "Publish changes"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void submitConnect()} disabled={dialogBusy}>
                      {dialogBusy ? "Connecting…" : `Connect ${editingDef.name}`}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------ confirm dialog */}
      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null) }}>
        <DialogContent className="sm:max-w-md">
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {confirm.kind === "disconnect"
                    ? `Disconnect ${CATALOG_BY_KEY[confirm.key].name}?`
                    : confirm.kind === "remove"
                      ? `Delete ${CATALOG_BY_KEY[confirm.key].name} configuration?`
                      : `Discard ${CATALOG_BY_KEY[confirm.key].name} draft?`}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {confirm.kind === "disconnect"
                    ? "The connection flag is persisted as disconnected, the stored configuration is kept, and a system notification is recorded."
                    : confirm.kind === "remove"
                      ? "The entire stored entry for this integration is deleted from your account preferences. This cannot be undone."
                      : "The stored unpublished draft will be deleted. The live configuration is not affected."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setConfirm(null)} disabled={confirmBusy}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => void runConfirm()} disabled={confirmBusy}>
                  {confirmBusy
                    ? "Working…"
                    : confirm.kind === "disconnect"
                      ? "Disconnect"
                      : confirm.kind === "remove"
                        ? "Delete permanently"
                        : "Discard draft"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------ small pieces */

function EffectBadge({ effect }: { effect: CatalogDef["effect"] }) {
  if (effect === "real")
    return <Badge className="bg-emerald-600/90 text-white hover:bg-emerald-600/90">real in-app action</Badge>
  if (effect === "hybrid") return <Badge variant="secondary">config + in-app events</Badge>
  return <Badge variant="outline">configuration only</Badge>
}
