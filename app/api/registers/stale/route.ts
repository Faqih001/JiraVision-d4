// /api/registers/stale — the queue of checks that are overdue (design §12 item 3).
// GET  → the visible stale rows, with staleness computed at read time.
// POST → turn them into a draft plan, or return the draft already made today. Nothing here
//        writes a task; the promote route remains the only path from plans to work.

import { NextResponse } from "next/server"
import { isStale } from "@/lib/registers/staleness"
import { loadVisibleRegisters, withState } from "@/lib/registers/read"
import { createStaleCheckPlan, findDraftStalePlan } from "@/lib/registers/plan"
import { bad, registerSession } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  try {
    const rows = withState(await loadVisibleRegisters(gate.viewer), gate.today)
    const stale = rows.filter((row) => isStale(row, gate.today))
    return NextResponse.json({ success: true, data: { stale, today: gate.today } })
  } catch (error) {
    console.error("Stale registers read error:", error)
    return bad("Failed to load the stale queue", 500)
  }
}

export async function POST() {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  try {
    const existing = await findDraftStalePlan(gate.session.id, gate.today)
    if (existing !== null) {
      return NextResponse.json({ success: true, data: { planId: existing, created: false } })
    }

    const rows = withState(await loadVisibleRegisters(gate.viewer), gate.today)
    const stale = rows.filter((row) => row.staleness === "stale")
    const plan = await createStaleCheckPlan({ userId: gate.session.id, today: gate.today, rows: stale })
    if (!plan) return bad("Nothing is stale today.", 409)

    return NextResponse.json(
      { success: true, data: { planId: plan.planId, count: plan.count, created: true } },
      { status: 201 },
    )
  } catch (error) {
    console.error("Stale plan error:", error)
    return bad("Failed to schedule the stale checks", 500)
  }
}
