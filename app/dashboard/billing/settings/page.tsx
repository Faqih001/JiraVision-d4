"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  Download,
  MailCheck,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { EmptyNote, SectionCard, relativeTime } from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

const CURRENCIES = ["USD", "EUR", "GBP", "KES"]

interface BillingSettingsForm {
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

const DEFAULTS: BillingSettingsForm = {
  emailReceipts: true,
  currency: "USD",
  contactName: "",
  contactEmail: "",
  companyName: "",
  companyAddress: "",
  vatNumber: "",
  taxRatePct: 0,
  reminderDays: 3,
  notifyOnInvoice: true,
  notifyOnPlanChange: true,
  paymentMethodLabel: "Demo Visa •••• 0042 (simulated — no real card stored)",
}

interface PlanSummary {
  plan: string
  billingCycle: string
  planChangedAt: string | null
  invoiceCount: number
  updatedAt: string
  source: string
}

/* ---------------------------------------------------------------- the page */

export default function BillingSettingsPage() {
  const { toast } = useToast()

  const [form, setForm] = useState<BillingSettingsForm>(DEFAULTS)
  const [saved, setSaved] = useState<BillingSettingsForm>(DEFAULTS)
  const [plan, setPlan] = useState<PlanSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(saved)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/settings")
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Failed to load billing settings")
      const settings = json.data.settings as BillingSettingsForm
      setForm(settings)
      setSaved(settings)
      setPlan({
        plan: json.data.plan,
        billingCycle: json.data.billingCycle,
        planChangedAt: json.data.planChangedAt,
        invoiceCount: json.data.invoiceCount,
        updatedAt: json.data.updatedAt,
        source: json.data.source,
      })
    } catch (err) {
      toast({ variant: "destructive", title: "Billing settings", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const patch = <K extends keyof BillingSettingsForm>(key: K, value: BillingSettingsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const validate = (): string | null => {
    if (form.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail)) return "Contact email looks invalid."
    if (!Number.isFinite(form.reminderDays) || form.reminderDays < 0 || form.reminderDays > 30) return "Reminder days must be 0–30."
    if (!Number.isFinite(form.taxRatePct) || form.taxRatePct < 0 || form.taxRatePct > 99) return "Tax rate must be 0–99%."
    if (!form.paymentMethodLabel.trim()) return "Payment method label cannot be empty."
    if (form.paymentMethodLabel.replace(/[^0-9]/g, "").length >= 13)
      return "Payment method is a label only — never enter a real card number."
    return null
  }

  const saveAll = async () => {
    const problem = validate()
    if (problem) {
      toast({ variant: "destructive", title: "Billing settings", description: problem })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/billing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Save failed")
      setSaved(json.data.settings)
      setForm(json.data.settings)
      setPlan((p) => (p ? { ...p, updatedAt: json.data.updatedAt } : p))
      toast({
        title: "Billing settings saved",
        description: "Persisted to your account preferences — a system notification was sent.",
      })
    } catch (err) {
      toast({ variant: "destructive", title: "Billing settings", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const resetDefaults = async () => {
    setResetting(true)
    try {
      const res = await fetch("/api/billing/settings", { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.message ?? "Reset failed")
      setSaved(json.data.settings)
      setForm(json.data.settings)
      setConfirmReset(false)
      toast({ title: "Settings reset", description: "Product defaults restored and recorded in your activity feed." })
    } catch (err) {
      toast({ variant: "destructive", title: "Billing settings", description: (err as Error).message })
    } finally {
      setResetting(false)
    }
  }

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      storedUnder: plan?.source ?? "users.preferences.billing",
      plan: plan?.plan ?? null,
      settings: form,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-billing-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Settings exported", description: "JSON snapshot downloaded." })
  }

  /* ---- render ---- */

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  const planLabel = plan ? { free: "Free", pro: "Pro", enterprise: "Enterprise" }[plan.plan] ?? plan.plan : "—"

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* 1 — Header + back link + save-all */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Back to billing">
              <Link href="/dashboard/billing">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">Billing settings</h1>
            {dirty && <Badge variant="secondary" className="text-[10px]">Unsaved changes</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Receipts, reminders, contact details and tax info for your workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportJson}>
            <Download className="mr-1 h-4 w-4" /> Export JSON
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving || !dirty}>
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save all"}
          </Button>
        </div>
      </div>

      {/* 2 — Plan status summary */}
      <SectionCard title="Plan status" icon={<CalendarClock className="h-4 w-4" />}>
        {plan ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Current plan</p>
              <p className="font-medium">
                {planLabel} <span className="text-xs text-muted-foreground">({plan.billingCycle})</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last plan change</p>
              <p className="font-medium">{plan.planChangedAt ? relativeTime(plan.planChangedAt) : "never"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ledger rows</p>
              <p className="font-medium tabular-nums">{plan.invoiceCount} invoices</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Settings last saved</p>
              <p className="font-medium">{new Date(plan.updatedAt).toLocaleString("en-US")}</p>
            </div>
          </div>
        ) : (
          <EmptyNote>Plan information unavailable.</EmptyNote>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 3 — Receipts & notifications */}
        <SectionCard title="Receipts & notifications" icon={<MailCheck className="h-4 w-4" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="set-email-receipts" className="text-sm">Email receipts</Label>
                <p className="text-xs text-muted-foreground">Send receipt emails for recorded payments (simulated until a provider is connected).</p>
              </div>
              <Switch id="set-email-receipts" checked={form.emailReceipts} onCheckedChange={(v) => patch("emailReceipts", v)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="set-notify-invoice" className="text-sm">Notify on new invoice</Label>
                <p className="text-xs text-muted-foreground">In-app notification whenever an invoice is added to the ledger.</p>
              </div>
              <Switch id="set-notify-invoice" checked={form.notifyOnInvoice} onCheckedChange={(v) => patch("notifyOnInvoice", v)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="set-notify-plan" className="text-sm">Notify on plan change</Label>
                <p className="text-xs text-muted-foreground">In-app notification when the workspace plan switches.</p>
              </div>
              <Switch id="set-notify-plan" checked={form.notifyOnPlanChange} onCheckedChange={(v) => patch("notifyOnPlanChange", v)} />
            </div>
            <Separator />
            {/* 4 — Reminder days */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="set-reminder-days" className="text-sm">Renewal reminder (days before)</Label>
                <Input
                  id="set-reminder-days"
                  type="number"
                  min={0}
                  max={30}
                  className="w-28"
                  value={String(form.reminderDays)}
                  onChange={(e) => patch("reminderDays", Math.round(Number(e.target.value)) || 0)}
                />
              </div>
              <p className="pb-2 text-xs text-muted-foreground">Shown on the billing page renewal card. 0–30.</p>
            </div>
          </div>
        </SectionCard>

        {/* 5 — Currency */}
        <SectionCard title="Currency & formatting" icon={<BadgeDollarSign className="h-4 w-4" />}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Ledger currency</Label>
              <Select value={form.currency} onValueChange={(v) => patch("currency", v)}>
                <SelectTrigger aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used to display every amount on the billing page. Amounts themselves are simulated.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="set-pm-label" className="text-sm">Payment method label</Label>
              <Input
                id="set-pm-label"
                value={form.paymentMethodLabel}
                maxLength={80}
                onChange={(e) => patch("paymentMethodLabel", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Display text only. Labels with 13+ digits are rejected — no card numbers are ever stored.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* 6 — Billing contact */}
        <SectionCard title="Billing contact" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="set-contact-name">Contact name</Label>
              <Input
                id="set-contact-name"
                value={form.contactName}
                maxLength={120}
                placeholder="Jane Doe"
                onChange={(e) => patch("contactName", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="set-contact-email">Contact email</Label>
              <Input
                id="set-contact-email"
                type="email"
                value={form.contactEmail}
                maxLength={160}
                placeholder="finance@yourteam.dev"
                onChange={(e) => patch("contactEmail", e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        {/* 7 — Company details */}
        <SectionCard title="Company details" icon={<Building2 className="h-4 w-4" />}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="set-company">Company name</Label>
                <Input
                  id="set-company"
                  value={form.companyName}
                  maxLength={160}
                  onChange={(e) => patch("companyName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="set-vat">VAT / tax registration number</Label>
                <Input
                  id="set-vat"
                  value={form.vatNumber}
                  maxLength={40}
                  placeholder="EU123456789"
                  onChange={(e) => patch("vatNumber", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="set-address">Billing address</Label>
              <Textarea
                id="set-address"
                rows={2}
                value={form.companyAddress}
                maxLength={240}
                onChange={(e) => patch("companyAddress", e.target.value)}
              />
            </div>
            {/* 8 — Tax rate */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="set-tax-rate" className="text-sm">Tax / VAT rate (%)</Label>
                <Input
                  id="set-tax-rate"
                  type="number"
                  min={0}
                  max={99}
                  step={0.5}
                  className="w-28"
                  value={String(form.taxRatePct)}
                  onChange={(e) => patch("taxRatePct", Math.min(99, Math.max(0, Number(e.target.value) || 0)))}
                />
              </div>
              <p className="pb-2 text-xs text-muted-foreground">
                Drives the “Est. tax” line on the billing page. 0 means totals are shown tax-exclusive.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 9 — Provenance + danger zone */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Where these values live" icon={<Download className="h-4 w-4" />}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every field above is read from and written to{" "}
            <span className="font-medium text-foreground">{plan?.source ?? "users.preferences.billing"}</span> in the
            JiraVision Neon database through <code className="rounded bg-muted px-1">/api/billing/settings</code>. There
            are no local mocks: what you see is the persisted state, and “Export JSON” snapshots exactly that. This is a
            simulated billing workspace — no payment provider, invoice mailer or tax authority is connected.
          </p>
        </SectionCard>

        <SectionCard title="Reset settings" icon={<RotateCcw className="h-4 w-4" />}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Restores all billing preferences to product defaults. Your invoice ledger and current plan are not
              affected. A system notification records the reset.
            </p>
            {confirmReset ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-red-500">Reset all settings to defaults?</span>
                <Button size="sm" variant="destructive" disabled={resetting} onClick={resetDefaults}>
                  {resetting ? "Resetting…" : "Confirm reset"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Keep my settings
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reset to defaults
              </Button>
            )}
            {dirty && (
              <p className="text-[11px] text-amber-600">
                You have unsaved changes — save first, or they will be lost if you reset.
              </p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
