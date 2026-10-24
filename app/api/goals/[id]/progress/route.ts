// /api/goals/[id]/progress — the check-in ledger for one goal.
// GET  → every check-in for the goal (chart data, ascending).
// POST → append a goal_checkins row AND update goals.current in the same
//        flow. Auto-transitions: not_started → on_track once progress > 0,
//        anything → achieved once computed progress hits 100 (each fires the
//        matching notification). Check-ins logged by someone other than the
//        owner always notify the owner.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification, notifyMany } from "@/lib/notifications"
import { computeProgress } from "../shared"
import {
  badRequest,
  fetchCheckinsForGoal,
  fetchGoalById,
  parseIdParam,
  serverError,
  unauthorized,
} from "../queries"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid goal id")

  try {
    const goal = await fetchGoalById(id)
    if (!goal) return NextResponse.json({ success: false, message: "Goal not found" }, { status: 404 })
    const checkins = await fetchCheckinsForGoal(id)
    return NextResponse.json({ success: true, data: { goalId: id, checkins } })
  } catch (error) {
    console.error("Error fetching goal progress:", error)
    return serverError(error, "fetch goal progress")
  }
}

export async function POST(request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid goal id")

  try {
    const goal = await fetchGoalById(id)
    if (!goal) return NextResponse.json({ success: false, message: "Goal not found" }, { status: 404 })

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    const value = Number(body.value)
    if (!Number.isFinite(value)) return badRequest("value must be a number")
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null

    // 1) Append the ledger row.
    const [row] = (await db.execute(sql`
      INSERT INTO goal_checkins (goal_id, value, note, author_id)
      VALUES (${id}, ${value}, ${note}, ${session.id})
      RETURNING id
    `)) as unknown as { id: number }[]

    // 2) Move goals.current to the new value and auto-adjust status.
    const nextMetric = { ...goal, current: value }
    const { progressPct } = computeProgress(nextMetric)
    let nextStatus = goal.status
    if (progressPct >= 100 && goal.status !== "achieved" && goal.status !== "archived") {
      nextStatus = "achieved"
    } else if (goal.status === "not_started" && progressPct > 0) {
      nextStatus = "on_track"
    }
    await db.execute(sql`
      UPDATE goals SET current = ${value}, status = ${nextStatus}, updated_at = now()
      WHERE id = ${id}
    `)

    const updated = await fetchGoalById(id)
    if (!updated) return serverError(new Error("goal vanished after check-in"), "reload goal after check-in")

    // 3) Notifications: teammate check-in → owner; auto-achieve → creator+owner.
    if (session.id !== goal.ownerId) {
      await createNotification({
        userId: goal.ownerId,
        type: "sprint",
        title: `New check-in on "${goal.title}"`,
        body: `${session.name} logged a check-in of ${value} — now at ${updated.progressPct}% of target.`,
        link: "/dashboard/goals",
        metadata: { goalId: id, action: "checkin", checkinId: row?.id ?? null, authorId: session.id },
      })
    }
    if (nextStatus === "achieved" && goal.status !== "achieved") {
      await notifyMany([updated.ownerId, updated.createdBy], {
        type: "sprint",
        title: `Goal achieved: ${updated.title}`,
        body: `Check-in brought "${updated.title}" to ${updated.progressPct}% — auto-marked achieved.`,
        link: "/dashboard/goals",
        metadata: { goalId: id, action: "achieved", via: "checkin" },
      })
    }

    const checkins = await fetchCheckinsForGoal(id)
    return NextResponse.json({ success: true, data: { goal: updated, checkins } }, { status: 201 })
  } catch (error) {
    console.error("Error logging goal check-in:", error)
    return serverError(error, "log check-in")
  }
}
