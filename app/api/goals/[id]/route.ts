// /api/goals/[id] — read, update, delete a single goal.
// PATCH fires workspace notifications:
//   • status moved to at_risk/behind        → owner
//   • status moved to achieved (manual)     → creator + owner (deduped)
// DELETE is confirmed client-side; children survive with parent_id set to
// NULL via the FK's ON DELETE SET NULL.

import { NextRequest, NextResponse } from "next/server"
import { sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification, notifyMany } from "@/lib/notifications"
import { GOAL_STATUS_LABEL, type GoalStatus } from "../shared"
import {
  badRequest,
  fetchCheckinsForGoal,
  fetchGoalById,
  isGoalStatus,
  isIsoDate,
  isMetricType,
  parseIdParam,
  serverError,
  unauthorized,
  wouldCycle,
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
    return NextResponse.json({ success: true, data: { goal, checkins } })
  } catch (error) {
    console.error("Error fetching goal:", error)
    return serverError(error, "fetch goal")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid goal id")

  try {
    const existing = await fetchGoalById(id)
    if (!existing) return NextResponse.json({ success: false, message: "Goal not found" }, { status: 404 })

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    // Whitelisted, validated SET fragments — every value stays parameterized.
    const sets: SQL[] = []

    if (typeof body.title === "string") {
      const v = body.title.trim()
      if (!v || v.length > 255) return badRequest("title must be 1–255 chars")
      sets.push(sql`title = ${v}`)
    }
    if ("description" in body) {
      if (body.description !== null && typeof body.description !== "string") {
        return badRequest("description must be a string or null")
      }
      sets.push(sql`description = ${body.description === null ? null : body.description.trim() || null}`)
    }
    if (body.ownerId !== undefined) {
      const v = Number(body.ownerId)
      if (!Number.isInteger(v) || v <= 0) return badRequest("ownerId must be a positive integer")
      const [u] = (await db.execute(sql`SELECT id FROM users WHERE id = ${v} LIMIT 1`)) as unknown as { id: number }[]
      if (!u) return badRequest("ownerId does not exist")
      sets.push(sql`owner_id = ${v}`)
    }
    if (body.quarter !== undefined) {
      if (body.quarter !== null && typeof body.quarter !== "string") {
        return badRequest("quarter must be a string or null")
      }
      sets.push(sql`quarter = ${body.quarter === null ? null : body.quarter.trim().slice(0, 20) || null}`)
    }
    if (body.status !== undefined) {
      if (!isGoalStatus(body.status)) return badRequest("status must be one of the allowed goal statuses")
      sets.push(sql`status = ${body.status as GoalStatus}`)
    }
    if (body.startDate !== undefined) {
      if (!isIsoDate(body.startDate)) return badRequest("startDate must be YYYY-MM-DD")
      sets.push(sql`start_date = ${body.startDate}::date`)
    }
    if (body.dueDate !== undefined) {
      if (body.dueDate !== null && !isIsoDate(body.dueDate)) return badRequest("dueDate must be YYYY-MM-DD or null")
      if (body.dueDate === null) {
        sets.push(sql`due_date = NULL`)
      } else {
        sets.push(sql`due_date = ${body.dueDate}::date`)
      }
    }
    if (body.metricType !== undefined) {
      if (!isMetricType(body.metricType)) return badRequest("metricType must be percent, number, currency or boolean")
      sets.push(sql`metric_type = ${body.metricType}`)
    }
    if (body.baseline !== undefined) {
      if (body.baseline !== null && !Number.isFinite(Number(body.baseline))) {
        return badRequest("baseline must be a number or null")
      }
      sets.push(sql`baseline = ${body.baseline === null ? null : Number(body.baseline)}`)
    }
    if (body.target !== undefined) {
      const v = Number(body.target)
      if (!Number.isFinite(v)) return badRequest("target must be a number")
      sets.push(sql`target = ${v}`)
    }
    if (body.current !== undefined) {
      const v = Number(body.current)
      if (!Number.isFinite(v)) return badRequest("current must be a number")
      sets.push(sql`current = ${v}`)
    }
    if (body.parentId !== undefined) {
      if (body.parentId === null || body.parentId === "") {
        sets.push(sql`parent_id = NULL`)
      } else {
        const v = Number(body.parentId)
        if (!Number.isInteger(v) || v <= 0) return badRequest("parentId must be a positive integer or null")
        const parent = await fetchGoalById(v)
        if (!parent) return badRequest("parent goal does not exist")
        if (await wouldCycle(id, v)) return badRequest("parentId would create a cycle in the alignment tree")
        sets.push(sql`parent_id = ${v}`)
      }
    }

    if (sets.length === 0) return badRequest("No updatable fields provided")

    await db.execute(sql`
      UPDATE goals
      SET ${sql.join(sets, sql`, `)}, updated_at = now()
      WHERE id = ${id}
    `)

    const updated = await fetchGoalById(id)
    if (!updated) return serverError(new Error("goal vanished after update"), "update goal")

    // ---------------------------------------------------------- notifs -----
    const statusChanged = existing.status !== updated.status
    if (statusChanged && (updated.status === "at_risk" || updated.status === "behind")) {
      await createNotification({
        userId: updated.ownerId,
        type: "sprint",
        title: `Goal is now ${GOAL_STATUS_LABEL[updated.status].toLowerCase()}: ${updated.title}`,
        body: `${session.name} moved "${updated.title}" from ${GOAL_STATUS_LABEL[existing.status].toLowerCase()} to ${GOAL_STATUS_LABEL[updated.status].toLowerCase()} (${updated.progressPct}% of target).`,
        link: "/dashboard/goals",
        metadata: { goalId: updated.id, action: "status_changed", from: existing.status, to: updated.status },
      })
    }
    if (statusChanged && updated.status === "achieved") {
      // notifyMany dedupes by user id, so owner === creator gets exactly one.
      await notifyMany([updated.ownerId, updated.createdBy], {
        type: "sprint",
        title: `Goal achieved: ${updated.title}`,
        body: `${session.name} marked "${updated.title}" as achieved (${updated.progressPct}% progress).`,
        link: "/dashboard/goals",
        metadata: { goalId: updated.id, action: "achieved" },
      })
    }

    const checkins = await fetchCheckinsForGoal(id)
    return NextResponse.json({ success: true, data: { goal: updated, checkins } })
  } catch (error) {
    console.error("Error updating goal:", error)
    return serverError(error, "update goal")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid goal id")

  try {
    const existing = await fetchGoalById(id)
    if (!existing) return NextResponse.json({ success: false, message: "Goal not found" }, { status: 404 })
    await db.execute(sql`DELETE FROM goals WHERE id = ${id}`)
    return NextResponse.json({ success: true, data: { deletedId: id } })
  } catch (error) {
    console.error("Error deleting goal:", error)
    return serverError(error, "delete goal")
  }
}
