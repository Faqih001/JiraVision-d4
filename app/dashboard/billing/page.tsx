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
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CreditCard,
  Database,
  Info,
  Receipt,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Trash2,
  CalendarClock,
  Download,
  Plus,
  ScrollText,
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
import {
  AXIS,
  EmptyNote,
  SectionCard,
  STATUS_COLOR,
  TOOLTIP_STYLE,
  relativeTime,
} from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type InvoiceStatus = "pending" | "paid" | "refunded"
type InvoiceKind = "subscription" | "usage" | "one_time"

interface BillingInvoice {
  id: string
  date: string
  description: string
  amount: number
  kind: InvoiceKind
  status: InvoiceStatus
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

interface BillingSettings {
  emailReceipts: boolean
  currency: string
  contactName: string
  contactEmail: string
  companyName: string
  companyAddress: string
  vatNumber: string
  taxRatePct: number
  reminderDays: number
  notifyOnInvoice: boolean
  notifyOnPlanChange: boolean
  paymentMethodLabel: string
}

interface BillingState {
  plan: "free" | "pro" | "enterprise"
  billingCycle: "monthly" | "yearly"
  planChangedAt: string | null
  settings: BillingSettings
  invoices: BillingInvoice[]
  updatedAt: string
}

interface BillingDerived {
  thisMonthTotal: number
  lastMonthTotal: number
  avgTicket: number
  openInvoiceCount: number
  openInvoiceTotal: number
  byMonth: { key: string; label: string; total: number; paid: number; pending: number }[]
  kindMix: { name: string; value: number; count: number }[]
  totals: { paid: number; pending: number; refunded: number; net: number; invoiceCount: number }
  tax: { ratePct: number; estimatedOnPaid: number; note: string }
  renewal: { date: string | null; daysAway: number | null; note: string }
}

interface SummaryData {
  state: BillingState
  derived: BillingDerived
  source: string
}

interface ActivityItem {
  id: number
  title: string
  body: string | null
  isRead: boolean
  metadata?: Record<string, unknown> | null
  createdAt: string
}

interface InvoiceDraft {
  description: string
  amount: string
  date: string
  kind: InvoiceKind
  status: InvoiceStatus
}

/* ---------------------------------------------------------------- catalog */

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    priceMonthly: 0,
    blurb: "Up to 5 members, kanban boards, basic analytics.",
  },
  {
    id: "pro" as const,
    name: "Pro",
    priceMonthly: 49.99,
    blurb: "Unlimited members, AI insights, advanced analytics, API access.",
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    priceMonthly: 99.99,
    blurb: "SSO, dedicated support, custom integrations, enterprise analytics.",
  },
]

const INVOICE_KIND_LABEL: Record<InvoiceKind, string> = {
  subscription: "Subscription",
  usage: "Usage",
  one_time: "One-time",
}

const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  paid: STATUS_COLOR.done,
  pending: STATUS_COLOR.review,
  refunded: STATUS_COLOR.todo,
}

const KIND_PIE_COLOR: Record<string, string> = {
  Subscription: STATUS_COLOR.done,
  Usage: STATUS_COLOR.in_progress,
  "One-time": STATUS_COLOR.review,
}

const emptyDraft = (): InvoiceDraft => ({
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  kind: "one_time",
  status: "pending",
})

/* ---------------------------------------------------------------- the page */

export default function BillingPage() {
  const { toast } = useToast()

  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)

  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly")
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<InvoiceDraft>(emptyDraft())
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [pmLabel, setPmLabel] = useState("")
  const [pmSaving, setPmSaving] = useState(false)

  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  const state = data?.state ?? null

  const money = useCallback(
    (n: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: state?.settings.currency ?? "USD" }).format(n),
    [state?.settings.currency],
  )

  /* ---- data loading ---- */

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await fetch("/api/billing/summary")
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Failed to load billing data")
      setData(json.data)
      setPmLabel(json.data.state.settings.paymentMethodLabel)
      setCycle(json.data.state.billingCycle)
      setFailed(false)
    } catch (err) {
      if (!quiet) setFailed(true)
      toast({ variant: "destructive", title: "Billing", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=60")
      const json = await res.json()
      const items: ActivityItem[] = Array.isArray(json.items) ? json.items : []
      setActivity(items.filter((n) => String(n.metadata?.link ?? "").includes("billing")))
    } catch {
      // the feed is supplementary; a failure here should not block billing
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    loadActivity()
  }, [load, loadActivity])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([load(true), loadActivity()])
    setRefreshing(false)
    toast({ title: "Billing refreshed" })
  }, [load, loadActivity, toast])

  /* ---- plan switching ---- */

  const priceFor = (tier: (typeof PLANS)[number], c: "monthly" | "yearly") =>
    tier.priceMonthly === 0 ? 0 : c === "monthly" ? tier.priceMonthly : Math.round(tier.priceMonthly * 0.8 * 12 * 100) / 100

  const switchPlan = async (planId: "free" | "pro" | "enterprise") => {
    if (!state) return
    const tier = PLANS.find((p) => p.id === planId)
    if (!tier || tier.id === state.plan) return
    setSwitchingPlan(planId)
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billingCycle: cycle, price: priceFor(tier, cycle) }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Plan change failed")
      setData(json.data)
      toast({
        title: `Switched to ${tier.name}`,
        description:
          planId === "free"
            ? "Plan updated in the simulated ledger — no charges."
            : `A simulated ${money(priceFor(tier, cycle))} pending invoice was recorded. No real charge was made.`,
      })
      loadActivity()
    } catch (err) {
      toast({ variant: "destructive", title: "Plan change", description: (err as Error).message })
    } finally {
      setSwitchingPlan(null)
    }
  }

  /* ---- invoice mutations ---- */

  const addInvoice = async () => {
    const amount = Number(draft.amount)
    if (!draft.description.trim()) {
      toast({ variant: "destructive", title: "Invoice", description: "A description is required." })
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ variant: "destructive", title: "Invoice", description: "Enter a valid amount (≥ 0)." })
      return
    }
    setSavingInvoice(true)
    try {
      const res = await fetch("/api/billing/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: draft.description.trim(),
          amount,
          date: draft.date,
          kind: draft.kind,
          status: draft.status,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Failed to add invoice")
      toast({ title: "Invoice added", description: `${draft.description.trim()} — simulated ledger, no real charge.` })
      setAddOpen(false)
      setDraft(emptyDraft())
      await load(true)
      loadActivity()
    } catch (err) {
      toast({ variant: "destructive", title: "Invoice", description: (err as Error).message })
    } finally {
      setSavingInvoice(false)
    }
  }

  const setInvoiceStatus = async (inv: BillingInvoice, status: InvoiceStatus) => {
    if (inv.status === status) return
    try {
      const res = await fetch(`/api/billing/transactions/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Update failed")
      toast({
        title: status === "paid" ? "Payment recorded" : `Invoice marked ${status}`,
        description: "Simulated ledger update — no real transaction occurred.",
      })
      await load(true)
      loadActivity()
    } catch (err) {
      toast({ variant: "destructive", title: "Invoice", description: (err as Error).message })
    }
  }

  const deleteInvoice = async (inv: BillingInvoice) => {
    setDeletingId(inv.id)
    try {
      const res = await fetch(`/api/billing/transactions/${inv.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Delete failed")
      toast({ title: "Invoice deleted", description: inv.description })
      setConfirmDeleteId(null)
      await load(true)
    } catch (err) {
      toast({ variant: "destructive", title: "Invoice", description: (err as Error).message })
    } finally {
      setDeletingId(null)
    }
  }

  /* ---- payment method label ---- */

  const savePaymentLabel = async () => {
    const trimmed = pmLabel.trim()
    if (!trimmed) {
      toast({ variant: "destructive", title: "Payment method", description: "Label cannot be empty." })
      return
    }
    if (trimmed.replace(/[^0-9]/g, "").length >= 13) {
      toast({
        variant: "destructive",
        title: "Payment method",
        description: "Real card numbers are never stored — use a display label like “Visa ending •••• demo”.",
      })
      return
    }
    setPmSaving(true)
    try {
      const res = await fetch("/api/billing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodLabel: trimmed }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Save failed")
      toast({ title: "Payment method updated", description: "Labels only — no card data is ever stored." })
      await load(true)
      loadActivity()
    } catch (err) {
      toast({ variant: "destructive", title: "Payment method", description: (err as Error).message })
    } finally {
      setPmSaving(false)
    }
  }

  /* ---- CSV export ---- */

  const exportCsv = () => {
    if (!state || state.invoices.length === 0) {
      toast({ title: "Nothing to export", description: "Add invoices to the ledger first." })
      return
    }
    const header = "id,date,description,kind,amount,currency,status,paidAt"
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = state.invoices.map((i) =>
      [i.id, i.date, esc(i.description), i.kind, i.amount.toFixed(2), state.settings.currency, i.status, i.paidAt ?? ""].join(","),
    )
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-invoices-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${rows.length} invoice rows.` })
  }

  const markActivityRead = async (n: ActivityItem) => {
    if (n.isRead) return
    try {
      await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      setActivity((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
    } catch {
      // non-critical
    }
  }

  const chartMonths = useMemo(
    () => (data ? data.derived.byMonth.map((m) => ({ ...m, label: m.total > 0 ? m.label : "" })) : []),
    [data],
  )

  /* ---- render ---- */

  if (loading && !data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-16" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (failed && !data) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          We couldn’t reach the billing API. Your session may have expired.
        </p>
        <div className="flex gap-2">
          <Link href="/login">
            <Button>Sign in again</Button>
          </Link>
          <Button variant="outline" onClick={() => load()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data || !state) return null

  const { derived } = data
  const planBadge = {
    free: "Free",
    pro: "Pro",
    enterprise: "Enterprise",
  }[state.plan]

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header: title, plan badge, refresh, settings */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            Billing & subscription
            <Badge variant="secondary" className="text-[11px]">
              Current plan: {planBadge}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Invoices, plan and preferences for your workspace — backed by your persisted ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/billing/settings">
              <Settings2 className="mr-1 h-4 w-4" /> Billing settings
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2 — Simulated-ledger honesty strip */}
      <Card>
        <CardContent className="flex items-start gap-3 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="font-medium text-foreground">Simulated billing ledger.</span> Plan switches, invoices and
            payments recorded here are persisted to your account for demo and analysis purposes — JiraVision never
            processes real charges and no payment provider is connected.
          </p>
        </CardContent>
      </Card>

      {/* 3 — Spend KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Spend this month", value: money(derived.thisMonthTotal), hint: "current calendar month, excl. refunds" },
          { label: "Spend last month", value: money(derived.lastMonthTotal), hint: "previous calendar month" },
          { label: "Average invoice", value: money(derived.avgTicket), hint: `${derived.totals.invoiceCount} ledger rows` },
          {
            label: "Open invoices",
            value: money(derived.openInvoiceTotal),
            hint: `${derived.openInvoiceCount} pending · mark paid below`,
            tone: derived.openInvoiceCount > 0 ? "text-[hsl(var(--chart-clay))]" : undefined,
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("mt-1 text-2xl font-semibold tabular-nums", k.tone)}>{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4 — Plan picker */}
      <SectionCard
        title="Choose a plan"
        icon={<ShoppingBag className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {(["monthly", "yearly"] as const).map((c) => (
              <Button
                key={c}
                size="sm"
                variant={cycle === c ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs capitalize"
                onClick={() => setCycle(c)}
              >
                {c}
                {c === "yearly" && <span className="ml-1 text-[10px] text-emerald-600">-20%</span>}
              </Button>
            ))}
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {PLANS.map((tier) => {
            const price = priceFor(tier, cycle)
            const current = state.plan === tier.id
            return (
              <div
                key={tier.id}
                className={cn(
                  "flex flex-col rounded-lg border p-3",
                  tier.id === "pro" && "border-primary/50",
                  current && "bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{tier.name}</p>
                  {current && <Badge className="text-[10px]">Current</Badge>}
                </div>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {price === 0 ? "Free" : money(price)}
                  {price > 0 && <span className="text-xs font-normal text-muted-foreground">/{cycle === "monthly" ? "mo" : "yr"}</span>}
                </p>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">{tier.blurb}</p>
                <Button
                  size="sm"
                  variant={current ? "outline" : tier.id === "pro" ? "default" : "outline"}
                  className="mt-3"
                  disabled={current || switchingPlan !== null}
                  onClick={() => switchPlan(tier.id)}
                >
                  {switchingPlan === tier.id
                    ? "Switching…"
                    : current
                      ? "Active plan"
                      : price === 0
                        ? "Downgrade to Free"
                        : `Switch to ${tier.name}`}
                </Button>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Switching persists your plan and (for paid plans) adds a simulated pending checkout invoice to the ledger.
          No real payment is taken.
        </p>
      </SectionCard>

      {/* 5 + 6 — Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard title="Spend by month" icon={<BarChart3 className="h-4 w-4" />} className="lg:col-span-3">
          {derived.byMonth.some((m) => m.total > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartMonths}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} minTickGap={12} />
                <YAxis tick={AXIS} width={44} tickFormatter={(v) => `${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="paid" name="Paid" stackId="a" fill={STATUS_COLOR.done} radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" name="Pending" stackId="a" fill={STATUS_COLOR.review} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>No spend recorded yet — add an invoice or switch a plan to populate this chart.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Ledger mix by type" icon={<Receipt className="h-4 w-4" />} className="lg:col-span-2">
          {derived.kindMix.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={derived.kindMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {derived.kindMix.map((k) => (
                    <Cell key={k.name} fill={KIND_PIE_COLOR[k.name] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyNote>Nothing invoiced yet.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 7 — Invoice ledger table */}
      <SectionCard
        title={`Invoices (${state.invoices.length})`}
        icon={<ScrollText className="h-4 w-4" />}
        action={
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={exportCsv}>
              <Download className="mr-1 h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add invoice
            </Button>
          </div>
        }
      >
        {state.invoices.length === 0 ? (
          <EmptyNote>The ledger is empty. Add your first simulated invoice above.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-2 py-2 text-xs tabular-nums text-muted-foreground">{inv.date}</td>
                    <td className="max-w-64 px-2 py-2">
                      <p className="truncate font-medium" title={inv.description}>
                        {inv.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {inv.id}
                        {inv.paidAt ? ` · paid ${new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {INVOICE_KIND_LABEL[inv.kind]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{money(inv.amount)}</td>
                    <td className="px-2 py-2">
                      <Select value={inv.status} onValueChange={(v) => setInvoiceStatus(inv, v as InvoiceStatus)}>
                        <SelectTrigger className="h-7 w-28 text-xs" aria-label={`Status for ${inv.description}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["pending", "paid", "refunded"] as const).map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        {inv.status !== "paid" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-700" onClick={() => setInvoiceStatus(inv, "paid")}>
                            Record payment
                          </Button>
                        )}
                        {confirmDeleteId === inv.id ? (
                          <>
                            <span className="text-[11px] text-red-500">Delete?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              disabled={deletingId === inv.id}
                              onClick={() => deleteInvoice(inv)}
                            >
                              {deletingId === inv.id ? "Deleting…" : "Confirm"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>
                              Keep
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-500"
                            aria-label={`Delete invoice ${inv.id}`}
                            onClick={() => setConfirmDeleteId(inv.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 8 + 9 — Renewal + payment method */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Upcoming renewal" icon={<CalendarClock className="h-4 w-4" />}>
          {derived.renewal.date ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">
                  Estimated next charge date: {new Date(derived.renewal.date).toLocaleDateString("en-US", { dateStyle: "long" })}
                </p>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {derived.renewal.daysAway !== null && derived.renewal.daysAway >= 0 ? `in ${derived.renewal.daysAway}d` : "overdue"}
                </span>
              </div>
              {derived.renewal.daysAway !== null && derived.renewal.daysAway >= 0 && (
                <Progress value={Math.max(0, Math.min(100, (derived.renewal.daysAway / (state.billingCycle === "yearly" ? 365 : 30)) * 100))} className="h-1.5" />
              )}
              <p className="text-xs text-muted-foreground">
                Your {planBadge} plan renews on the derived date above. Your settings ask for reminders{" "}
                {state.settings.reminderDays} day(s) before renewal.
              </p>
              <p className="text-[11px] italic text-muted-foreground">{derived.renewal.note}</p>
            </div>
          ) : (
            <EmptyNote>{derived.renewal.note} Switch a plan above to start the renewal clock.</EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Payment method" icon={<CreditCard className="h-4 w-4" />}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{state.settings.paymentMethodLabel}</p>
                <p className="text-[11px] text-muted-foreground">Display label only — no card data is stored, ever.</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pm-label">Payment method label</Label>
              <div className="flex gap-2">
                <Input
                  id="pm-label"
                  value={pmLabel}
                  onChange={(e) => setPmLabel(e.target.value)}
                  placeholder="Visa ending •••• demo"
                  maxLength={80}
                />
                <Button size="sm" variant="outline" className="shrink-0" disabled={pmSaving} onClick={savePaymentLabel}>
                  {pmSaving ? "Saving…" : "Save"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Labels containing 13+ digits are rejected by the API so real card numbers can never be saved.
              </p>
            </div>
            <Link href="/dashboard/billing/settings">
              <Button size="sm" variant="ghost" className="h-7 px-0 text-xs">
                Manage billing contact & reminders →
              </Button>
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* 10 + 11 — Tax summary + activity feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Tax / VAT summary" icon={<Receipt className="h-4 w-4" />}>
          <div className="space-y-2 text-sm">
            {[
              { label: "Paid (gross)", value: derived.totals.paid, tone: "text-[hsl(var(--chart-pine))]" },
              { label: "Pending", value: derived.totals.pending, tone: "text-[hsl(var(--chart-clay))]" },
              { label: "Refunded", value: -derived.totals.refunded, tone: "text-muted-foreground" },
              { label: "Net paid", value: derived.totals.net, tone: "font-semibold", strong: true },
            ].map((r) => (
              <div key={r.label} className="flex justify-between">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={cn("tabular-nums", r.tone)}>{money(r.value)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Est. tax @ {derived.tax.ratePct}% on net paid
              </span>
              <span className="tabular-nums">{money(derived.tax.estimatedOnPaid)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>VAT registration</span>
              <span>{state.settings.vatNumber || <em>not set</em>}</span>
            </div>
            <p className="text-[11px] italic text-muted-foreground">{derived.tax.note}</p>
            <p className="text-[11px] text-muted-foreground">
              Totals computed from your ledger rows — simulated figures, not a tax filing.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Billing activity"
          icon={<Info className="h-4 w-4" />}
          action={
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={loadActivity} disabled={activityLoading}>
              <RefreshCw className={cn("mr-1 h-3 w-3", activityLoading && "animate-spin")} /> Reload
            </Button>
          }
        >
          {activityLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : activity.length > 0 ? (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {activity.map((n) => (
                <li key={n.id}>
                  <button
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60",
                      !n.isRead && "bg-muted/40",
                    )}
                    onClick={() => markActivityRead(n)}
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      {n.body && <span className="block truncate text-xs text-muted-foreground">{n.body}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No billing events yet — invoices, payments and plan changes land here.</EmptyNote>
          )}
        </SectionCard>
      </div>

      {/* 12 — Provenance / data source */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Database className="h-3.5 w-3.5" /> Source: {data.source}
          </span>
          <span>·</span>
          <span>{derived.totals.invoiceCount} ledger rows</span>
          <span>·</span>
          <span>Last saved {new Date(state.updatedAt).toLocaleString("en-US")}</span>
          <span>·</span>
          <span>Plan changed {state.planChangedAt ? relativeTime(state.planChangedAt) : "never"}</span>
        </CardContent>
      </Card>

      {/* add-invoice dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add invoice</DialogTitle>
            <DialogDescription>
              Records a line in your simulated billing ledger. No real charge is made.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="inv-desc">Description</Label>
              <Input
                id="inv-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="e.g. Workspace add-ons, consulting hours…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-amount">Amount ({state.settings.currency})</Label>
              <Input
                id="inv-amount"
                type="number"
                min={0}
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-date">Date</Label>
              <Input id="inv-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as InvoiceKind })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["one_time", "subscription", "usage"] as const).map((k) => (
                    <SelectItem key={k} value={k}>
                      {INVOICE_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as InvoiceStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["pending", "paid", "refunded"] as const).map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]"
            style={{ backgroundColor: `color-mix(in srgb, ${INVOICE_STATUS_COLOR[draft.status]} 12%, transparent)`, color: INVOICE_STATUS_COLOR[draft.status] }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: INVOICE_STATUS_COLOR[draft.status] }} />
            Will be recorded as “{draft.status}” in the simulated ledger
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={savingInvoice}>
              Cancel
            </Button>
            <Button onClick={addInvoice} disabled={savingInvoice}>
              {savingInvoice ? "Saving…" : "Add invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
