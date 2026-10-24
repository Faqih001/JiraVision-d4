import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import {
  INVOICE_KINDS,
  INVOICE_STATUSES,
  type BillingInvoice,
  computeDerived,
  mutateBilling,
  readBilling,
} from "../_store"

export const dynamic = "force-dynamic"

// GET /api/billing/transactions — list invoice ledger rows (newest first).
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const params = request.nextUrl.searchParams
    const status = params.get("status")
    const state = await readBilling(session.id)
    const items =
      status && INVOICE_STATUSES.includes(status as (typeof INVOICE_STATUSES)[number])
        ? state.invoices.filter((i) => i.status === status)
        : state.invoices
    return NextResponse.json({ success: true, data: { items, total: state.invoices.length } })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to load transactions" },
      { status: 500 },
    )
  }
}

// POST /api/billing/transactions — add an invoice row to the simulated ledger.
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "JSON body required" }, { status: 400 })
    }
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : ""
    if (!description) {
      return NextResponse.json({ success: false, message: "description is required" }, { status: 400 })
    }
    if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount < 0 || body.amount > 1_000_000) {
      return NextResponse.json({ success: false, message: "amount must be a number between 0 and 1,000,000" }, { status: 400 })
    }
    if (body.kind !== undefined && !INVOICE_KINDS.includes(body.kind)) {
      return NextResponse.json({ success: false, message: `kind must be one of: ${INVOICE_KINDS.join(", ")}` }, { status: 400 })
    }
    if (body.status !== undefined && !INVOICE_STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, message: `status must be one of: ${INVOICE_STATUSES.join(", ")}` }, { status: 400 })
    }

    const now = new Date()
    const invoice: BillingInvoice = {
      id: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      date: typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : now.toISOString().slice(0, 10),
      description,
      amount: Math.round(body.amount * 100) / 100,
      kind: INVOICE_KINDS.includes(body.kind) ? body.kind : "one_time",
      status: INVOICE_STATUSES.includes(body.status) ? body.status : "pending",
      paidAt: body.status === "paid" ? now.toISOString() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    const state = await mutateBilling(session.id, (s) => ({ ...s, invoices: [invoice, ...s.invoices] }))

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Invoice added: ${invoice.description}`,
      body: `${state.settings.currency} ${invoice.amount.toFixed(2)} — ${invoice.status} (simulated billing ledger, no real charge)`,
      link: "/dashboard/billing",
      metadata: {
        billingEvent: "invoice_added",
        invoiceId: invoice.id,
        amount: invoice.amount,
        kind: invoice.kind,
        status: invoice.status,
        currency: state.settings.currency,
        plan: state.plan,
      },
    })

    return NextResponse.json({ success: true, data: { invoice, derived: computeDerived(state) } }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to add invoice" },
      { status: 500 },
    )
  }
}
