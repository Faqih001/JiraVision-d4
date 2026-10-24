import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { DEFAULT_SETTINGS, looksLikeCardNumber, mutateBilling, normalizeSettings, readBilling } from "../_store"

export const dynamic = "force-dynamic"

// GET /api/billing/settings — current billing settings (persisted state).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const state = await readBilling(session.id)
    return NextResponse.json({
      success: true,
      data: {
        settings: state.settings,
        plan: state.plan,
        billingCycle: state.billingCycle,
        planChangedAt: state.planChangedAt,
        invoiceCount: state.invoices.length,
        updatedAt: state.updatedAt,
        source: "users.preferences.billing (Neon)",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to load billing settings" },
      { status: 500 },
    )
  }
}

// PUT /api/billing/settings — merge + persist settings, fire a notification.
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "JSON object body required" }, { status: 400 })
    }
    if (typeof body.paymentMethodLabel === "string" && looksLikeCardNumber(body.paymentMethodLabel)) {
      return NextResponse.json(
        { success: false, message: "Payment method must be a display label only — card numbers are never stored." },
        { status: 400 },
      )
    }

    // merge into the persisted settings so partial updates (e.g. only the
    // payment-method label from the main page) never reset unrelated fields
    const state = await mutateBilling(session.id, (s) => ({ ...s, settings: normalizeSettings({ ...s.settings, ...body }) }))

    await createNotification({
      userId: session.id,
      type: "system",
      title: "Billing settings saved",
      body: `Billing preferences updated for the ${state.plan} plan (currency ${state.settings.currency}). Stored in your account preferences — simulated workspace.`,
      link: "/dashboard/billing",
      metadata: { billingEvent: "settings_saved", currency: state.settings.currency, plan: state.plan },
    })

    return NextResponse.json({ success: true, data: { settings: state.settings, updatedAt: state.updatedAt } })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to save billing settings" },
      { status: 500 },
    )
  }
}

// DELETE /api/billing/settings — reset settings to product defaults (kept
// separate from the invoice ledger and plan, which are not touched).
export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const state = await mutateBilling(session.id, (s) => ({ ...s, settings: normalizeSettings(DEFAULT_SETTINGS) }))

    await createNotification({
      userId: session.id,
      type: "system",
      title: "Billing settings reset",
      body: "Billing preferences were restored to the product defaults.",
      link: "/dashboard/billing",
      metadata: { billingEvent: "settings_reset", plan: state.plan },
    })

    return NextResponse.json({ success: true, data: { settings: state.settings, defaults: DEFAULT_SETTINGS } })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to reset billing settings" },
      { status: 500 },
    )
  }
}
