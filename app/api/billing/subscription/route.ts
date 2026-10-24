import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import {
  BILLING_PLANS,
  type BillingInvoice,
  type BillingPlan,
  computeDerived,
  mutateBilling,
  readBilling,
} from "../_store"

export const dynamic = "force-dynamic"

const PLAN_LABEL: Record<BillingPlan, string> = { free: "Free", pro: "Pro", enterprise: "Enterprise" }

// GET /api/billing/subscription — current plan state (persisted).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const state = await readBilling(session.id)
    return NextResponse.json({
      success: true,
      data: { plan: state.plan, billingCycle: state.billingCycle, planChangedAt: state.planChangedAt },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to load subscription" },
      { status: 500 },
    )
  }
}

// PUT /api/billing/subscription — switch plan. Persists plan + planChangedAt,
// fires a notification, and (for paid plans) appends a simulated pending
// checkout invoice. No real payment is ever processed.
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || !BILLING_PLANS.includes(body.plan)) {
      return NextResponse.json(
        { success: false, message: `plan must be one of: ${BILLING_PLANS.join(", ")}` },
        { status: 400 },
      )
    }
    const cycle = body.billingCycle === "yearly" ? "yearly" : "monthly"
    const plan: BillingPlan = body.plan
    // client-supplied catalogue price; clamped server-side so the ledger can
    // never be spammed with absurd amounts. 0 => no checkout invoice (Free).
    const price =
      typeof body.price === "number" && Number.isFinite(body.price)
        ? Math.min(Math.max(Math.round(body.price * 100) / 100, 0), 10_000)
        : 0

    const now = new Date()
    const checkoutInvoice: BillingInvoice | null =
      plan !== "free" && price > 0
        ? {
            id: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            date: now.toISOString().slice(0, 10),
            description: `${PLAN_LABEL[plan]} plan (${cycle}) — simulated checkout, no real charge`,
            amount: price,
            kind: "subscription",
            status: "pending",
            paidAt: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          }
        : null

    let previousPlan: BillingPlan = plan
    const state = await mutateBilling(session.id, (s) => {
      previousPlan = s.plan
      return {
        ...s,
        plan,
        billingCycle: cycle,
        planChangedAt: now.toISOString(),
        invoices: checkoutInvoice ? [checkoutInvoice, ...s.invoices] : s.invoices,
      }
    })

    if (previousPlan !== plan) {
      await createNotification({
        userId: session.id,
        type: "system",
        title: `Plan changed: ${PLAN_LABEL[previousPlan]} → ${PLAN_LABEL[plan]}`,
        body: checkoutInvoice
          ? `A simulated ${state.settings.currency} ${checkoutInvoice.amount.toFixed(2)} pending invoice was added. Nothing was charged — this ledger is illustrative.`
          : "Subscription plan updated in the simulated billing ledger.",
        link: "/dashboard/billing",
        metadata: {
          billingEvent: "plan_changed",
          from: previousPlan,
          to: plan,
          billingCycle: cycle,
          invoiceId: checkoutInvoice?.id ?? null,
          currency: state.settings.currency,
        },
      })
    }

    return NextResponse.json({ success: true, data: { state, derived: computeDerived(state) } })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to change plan" },
      { status: 500 },
    )
  }
}
