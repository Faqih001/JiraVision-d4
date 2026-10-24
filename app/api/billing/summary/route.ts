import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { computeDerived, readBilling } from "../_store"

export const dynamic = "force-dynamic"

// GET /api/billing/summary — full persisted billing state + derived KPIs.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const state = await readBilling(session.id)
    const derived = computeDerived(state)
    return NextResponse.json({
      success: true,
      data: {
        state,
        derived,
        source: "users.preferences.billing (Neon) — simulated ledger, no real charges",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to load billing summary" },
      { status: 500 },
    )
  }
}
