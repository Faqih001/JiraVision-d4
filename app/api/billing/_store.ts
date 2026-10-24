// Billing persistence store (V3-3 billing workspace).
//
// STORAGE DESIGN (documented choice):
// drizzle/schema.ts has no transactions/subscriptions/payments tables and we
// may not edit the schema this session. The users table DOES expose a
// `preferences` jsonb column that is only read (never rewritten wholesale) by
// existing routes. We therefore persist the whole billing workspace under
// `users.preferences.billing` as a per-user document:
//   { plan, billingCycle, planChangedAt, settings, invoices: [...], updatedAt }
// The invoice list is an append/update ledger edited through the
// /api/billing/* routes; writes use jsonb_set on the `{billing}` path so other
// top-level preference keys can never be clobbered. This avoids raw CREATE
// TABLE migrations that a concurrent drizzle-kit push (schema owned by another
// agent) could delete.
//
// Honesty: this is a SIMULATED ledger — no real charges, no card data. Labels
// are validated server-side to reject strings that look like real card numbers.

import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"

export const BILLING_PLANS = ["free", "pro", "enterprise"] as const
export type BillingPlan = (typeof BILLING_PLANS)[number]

export const INVOICE_KINDS = ["subscription", "usage", "one_time"] as const
export type InvoiceKind = (typeof INVOICE_KINDS)[number]

export const INVOICE_STATUSES = ["pending", "paid", "refunded"] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const CURRENCIES = ["USD", "EUR", "GBP", "KES"] as const

export interface BillingInvoice {
  id: string
  /** YYYY-MM-DD (invoice issue date as recorded by the user) */
  date: string
  description: string
  amount: number
  kind: InvoiceKind
  status: InvoiceStatus
  /** ISO timestamp set when status flips to "paid" */
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BillingSettings {
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
  /** display string ONLY — never a real PAN, enforced below */
  paymentMethodLabel: string
}

export interface BillingState {
  plan: BillingPlan
  billingCycle: "monthly" | "yearly"
  planChangedAt: string | null
  settings: BillingSettings
  invoices: BillingInvoice[]
  updatedAt: string
}

export const DEFAULT_SETTINGS: BillingSettings = {
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

export function defaultBillingState(): BillingState {
  return {
    plan: "free",
    billingCycle: "monthly",
    planChangedAt: null,
    settings: { ...DEFAULT_SETTINGS },
    invoices: [],
    updatedAt: new Date().toISOString(),
  }
}

/* ------------------------------------------------------------ validation */

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function str(v: unknown, max: number, fallback = ""): string {
  return typeof v === "string" ? v.trim().slice(0, max) : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback
}

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100))
}

/** Reject anything carrying 13+ consecutive digits (Luhn-pan-shaped input). */
export function looksLikeCardNumber(input: string): boolean {
  const digits = input.replace(/[^0-9]/g, "")
  return digits.length >= 13
}

function validDate(v: unknown, fallback: string): string {
  const s = str(v, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback
  const t = Date.parse(`${s}T00:00:00Z`)
  if (Number.isNaN(t)) return fallback
  const now = Date.now()
  // sanity window: five years back, one year forward — keeps charts honest
  if (t < now - 5 * 365 * 86_400_000 || t > now + 366 * 86_400_000) return fallback
  return s
}

function safeEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback
}

export function normalizeInvoice(raw: unknown): BillingInvoice | null {
  if (!isObj(raw)) return null
  const id = str(raw.id, 40)
  if (!id) return null
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()
  return {
    id,
    date: validDate(raw.date, createdAt.slice(0, 10)),
    description: str(raw.description, 200) || "Untitled line item",
    amount: num(raw.amount, 0, 1_000_000, 0),
    kind: safeEnum(raw.kind, INVOICE_KINDS, "one_time"),
    status: safeEnum(raw.status, INVOICE_STATUSES, "pending"),
    paidAt: typeof raw.paidAt === "string" ? raw.paidAt : null,
    createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt,
  }
}

export function normalizeSettings(raw: unknown): BillingSettings {
  const s = isObj(raw) ? raw : {}
  const label = str(s.paymentMethodLabel, 80, DEFAULT_SETTINGS.paymentMethodLabel)
  return {
    emailReceipts: bool(s.emailReceipts, DEFAULT_SETTINGS.emailReceipts),
    currency: safeEnum(s.currency, CURRENCIES, DEFAULT_SETTINGS.currency),
    contactName: str(s.contactName, 120),
    contactEmail: str(s.contactEmail, 160),
    companyName: str(s.companyName, 160),
    companyAddress: str(s.companyAddress, 240),
    vatNumber: str(s.vatNumber, 40),
    taxRatePct: num(s.taxRatePct, 0, 99, 0),
    reminderDays: Math.round(num(s.reminderDays, 0, 30, 3)),
    notifyOnInvoice: bool(s.notifyOnInvoice, true),
    notifyOnPlanChange: bool(s.notifyOnPlanChange, true),
    paymentMethodLabel: looksLikeCardNumber(label) ? DEFAULT_SETTINGS.paymentMethodLabel : label,
  }
}

export function normalizeState(raw: unknown): BillingState {
  const base = defaultBillingState()
  if (!isObj(raw)) return base
  const invoices = Array.isArray(raw.invoices)
    ? raw.invoices
        .map(normalizeInvoice)
        .filter((i): i is BillingInvoice => i !== null)
        .slice(0, 500)
    : []
  return {
    plan: safeEnum(raw.plan, BILLING_PLANS, base.plan),
    billingCycle: raw.billingCycle === "yearly" ? "yearly" : "monthly",
    planChangedAt: typeof raw.planChangedAt === "string" && !Number.isNaN(Date.parse(raw.planChangedAt)) ? raw.planChangedAt : null,
    settings: normalizeSettings(raw.settings),
    invoices,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
  }
}

/* -------------------------------------------------------------- read/write */

export async function readBilling(userId: number): Promise<BillingState> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
  if (rows.length === 0) return defaultBillingState()
  const prefs = rows[0].preferences
  const billing = isObj(prefs) ? (prefs as Record<string, unknown>).billing : undefined
  return normalizeState(billing)
}

/**
 * Replace the `billing` subtree inside users.preferences atomically via
 * jsonb_set; unrelated preference keys are preserved even under races.
 */
export async function writeBilling(userId: number, state: BillingState): Promise<BillingState> {
  const next: BillingState = { ...state, updatedAt: new Date().toISOString() }
  await db
    .update(users)
    .set({
      preferences: sql`jsonb_set(coalesce(preferences, '{}'::jsonb), '{billing}', ${JSON.stringify(next)}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
  return next
}

/**
 * Functional update helper — read, mutate, write. Demo-scale concurrency is
 * single-user, so last-write-wins inside one user is acceptable; every route
 * re-reads before writing to minimise lost updates.
 */
export async function mutateBilling(
  userId: number,
  fn: (state: BillingState) => BillingState,
): Promise<BillingState> {
  const current = await readBilling(userId)
  return writeBilling(userId, fn(current))
}

/* ---------------------------------------------------------------- derived */

export interface BillingDerived {
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

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString("en-US", { month: "short" })
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function computeDerived(state: BillingState): BillingDerived {
  const now = new Date()
  const thisKey = monthKey(now)
  const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  let thisMonthTotal = 0
  let lastMonthTotal = 0
  let openInvoiceCount = 0
  let openInvoiceTotal = 0
  let paid = 0
  let pending = 0
  let refunded = 0

  const monthMap = new Map<string, { total: number; paid: number; pending: number }>()
  const kindMap: Record<InvoiceKind, { value: number; count: number }> = {
    subscription: { value: 0, count: 0 },
    usage: { value: 0, count: 0 },
    one_time: { value: 0, count: 0 },
  }

  for (const inv of state.invoices) {
    if (inv.status === "refunded") refunded += inv.amount
    else if (inv.status === "paid") paid += inv.amount
    else {
      pending += inv.amount
      openInvoiceCount += 1
      openInvoiceTotal += inv.amount
    }
    const mk = inv.date.slice(0, 7)
    if (mk === thisKey) thisMonthTotal += inv.amount
    if (mk === lastKey) lastMonthTotal += inv.amount
    if (inv.status !== "refunded") {
      const slot = monthMap.get(mk) ?? { total: 0, paid: 0, pending: 0 }
      slot.total += inv.amount
      if (inv.status === "paid") slot.paid += inv.amount
      else slot.pending += inv.amount
      monthMap.set(mk, slot)
      kindMap[inv.kind].value += inv.amount
      kindMap[inv.kind].count += 1
    }
  }

  // last 12 calendar months, oldest first (missing months render as zero)
  const byMonth: BillingDerived["byMonth"] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = monthKey(d)
    const slot = monthMap.get(key) ?? { total: 0, paid: 0, pending: 0 }
    byMonth.push({ key, label: monthLabel(key), total: r2(slot.total), paid: r2(slot.paid), pending: r2(slot.pending) })
  }

  const nonRefunded = state.invoices.filter((x) => x.status !== "refunded")
  const avgTicket = nonRefunded.length > 0 ? r2(nonRefunded.reduce((s, x) => s + x.amount, 0) / nonRefunded.length) : 0

  const kindMix = INVOICE_KINDS.map((k) => ({
    name: k === "one_time" ? "One-time" : k === "subscription" ? "Subscription" : "Usage",
    value: r2(kindMap[k].value),
    count: kindMap[k].count,
  })).filter((x) => x.count > 0)

  const net = paid - refunded
  const ratePct = state.settings.taxRatePct
  const renewalDays = state.billingCycle === "yearly" ? 365 : 30
  let renewal: BillingDerived["renewal"] = {
    date: null,
    daysAway: null,
    note: "No plan change recorded yet — renewals appear here after you switch a plan.",
  }
  if (state.planChangedAt) {
    const next = new Date(Date.parse(state.planChangedAt) + renewalDays * 86_400_000)
    const daysAway = Math.ceil((next.getTime() - now.getTime()) / 86_400_000)
    renewal = {
      date: next.toISOString(),
      daysAway,
      note: `Derived from the last plan change (${renewalDays}-day ${state.billingCycle} window). This is a simulated ledger — there is no real renewal contract.`,
    }
  }

  return {
    thisMonthTotal: r2(thisMonthTotal),
    lastMonthTotal: r2(lastMonthTotal),
    avgTicket,
    openInvoiceCount,
    openInvoiceTotal: r2(openInvoiceTotal),
    byMonth,
    kindMix,
    totals: { paid: r2(paid), pending: r2(pending), refunded: r2(refunded), net: r2(net), invoiceCount: state.invoices.length },
    tax: {
      ratePct,
      estimatedOnPaid: r2((net * ratePct) / 100),
      note:
        ratePct === 0
          ? "No tax rate configured — totals are shown as recorded, exclusive of tax. Set a rate in Billing settings."
          : `Estimated tax at the configured ${ratePct}% rate applied to net paid amounts. Simulated figures only.`,
    },
    renewal,
  }
}
