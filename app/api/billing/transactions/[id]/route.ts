import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { INVOICE_STATUSES, type InvoiceStatus, computeDerived, mutateBilling } from "../../_store"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/billing/transactions/:id — update status (record a payment) or
// description/amount of an invoice row.
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "JSON body required" }, { status: 400 })
    }
    if (body.status !== undefined && !INVOICE_STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, message: `status must be one of: ${INVOICE_STATUSES.join(", ")}` }, { status: 400 })
    }

    let found = false
    let flippedToPaid = false
    let becameRefunded = false

    const state = await mutateBilling(session.id, (s) => {
      const idx = s.invoices.findIndex((i) => i.id === id)
      if (idx === -1) return s
      found = true
      const prev = s.invoices[idx]
      const now = new Date().toISOString()
      const nextStatus = (body.status as InvoiceStatus | undefined) ?? prev.status
      if (prev.status !== "paid" && nextStatus === "paid") flippedToPaid = true
      if (prev.status !== "refunded" && nextStatus === "refunded") becameRefunded = true
      const updated = {
        ...prev,
        status: nextStatus,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim().slice(0, 200)
            : prev.description,
        amount:
          typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount >= 0 && body.amount <= 1_000_000
            ? Math.round(body.amount * 100) / 100
            : prev.amount,
        paidAt: nextStatus === "paid" ? (prev.paidAt ?? now) : nextStatus === "pending" ? null : prev.paidAt,
        updatedAt: now,
      }
      const invoices = [...s.invoices]
      invoices[idx] = updated
      return { ...s, invoices }
    })

    if (!found) return NextResponse.json({ success: false, message: `Invoice ${id} not found` }, { status: 404 })

    if (flippedToPaid || becameRefunded) {
      const invoice = state.invoices.find((i) => i.id === id)
      if (invoice) {
        await createNotification({
          userId: session.id,
          type: "system",
          title: becameRefunded ? `Refund recorded: ${invoice.description}` : `Payment recorded: ${invoice.description}`,
          body: `${state.settings.currency} ${invoice.amount.toFixed(2)} marked ${becameRefunded ? "refunded" : "paid"} in the simulated billing ledger — no real transaction occurred.`,
          link: "/dashboard/billing",
          metadata: {
            billingEvent: becameRefunded ? "refund_recorded" : "payment_recorded",
            invoiceId: invoice.id,
            amount: invoice.amount,
            currency: state.settings.currency,
            plan: state.plan,
          },
        })
      }
    }

    return NextResponse.json({ success: true, data: { invoice: state.invoices.find((i) => i.id === id) ?? null, derived: computeDerived(state) } })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to update invoice" },
      { status: 500 },
    )
  }
}

// DELETE /api/billing/transactions/:id — remove a ledger row (client confirms).
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    let removed: string | null = null
    const state = await mutateBilling(session.id, (s) => {
      const target = s.invoices.find((i) => i.id === id)
      if (!target) return s
      removed = target.description
      return { ...s, invoices: s.invoices.filter((i) => i.id !== id) }
    })
    if (removed === null) return NextResponse.json({ success: false, message: `Invoice ${id} not found` }, { status: 404 })

    return NextResponse.json({ success: true, data: { deletedId: id, derived: computeDerived(state) } })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to delete invoice" },
      { status: 500 },
    )
  }
}
