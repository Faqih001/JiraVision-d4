// /api/planner/[id]/items/[itemId] — update or remove one plan item.
// PATCH: whitelist of fields. DELETE: remove the item.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { agentPlans, planItems } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"

type RouteContext = { params: Promise<{ id: string; itemId: string }> }

async function verifyPlanOwnership(planId: number, userId: number) {
  const [plan] = await db
    .select()
    .from(agentPlans)
    .where(and(eq(agentPlans.id, planId), eq(agentPlans.createdBy, userId)))
  return plan
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id, itemId } = await ctx.params
  const planId = Number.parseInt(id)
  const itemNumericId = Number.parseInt(itemId)
  if (Number.isNaN(planId) || Number.isNaN(itemNumericId)) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
  }

  const plan = await verifyPlanOwnership(planId, session.id)
  if (!plan) {
    return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 })
  }

  if (plan.status === "promoted") {
    return NextResponse.json(
      { success: false, message: "Cannot edit items in a promoted plan" },
      { status: 409 },
    )
  }

  const [existing] = await db
    .select()
    .from(planItems)
    .where(and(eq(planItems.id, itemNumericId), eq(planItems.planId, planId)))

  if (!existing) {
    return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.title === "string" && body.title.trim().length > 0) {
    updates.title = body.title.trim().slice(0, 200)
  }
  if (typeof body.description === "string") {
    updates.description = body.description.slice(0, 2000) || null
  }
  if (typeof body.discipline === "string") {
    updates.discipline = body.discipline.slice(0, 40) || null
  }
  if (typeof body.estimatePoints === "number") {
    updates.estimatePoints = Math.max(0, Math.min(100, body.estimatePoints))
  }
  if (typeof body.startDate === "string") {
    updates.startDate = body.startDate || null
  }
  if (typeof body.dueDate === "string") {
    updates.dueDate = body.dueDate || null
  }
  if (Array.isArray(body.dependsOn)) {
    updates.dependsOn = body.dependsOn
  }
  if (typeof body.milestone === "boolean") {
    updates.milestone = body.milestone
  }
  if (typeof body.cadence === "string") {
    updates.cadence = body.cadence || null
  }
  if (typeof body.status === "string") {
    updates.status = body.status.slice(0, 50)
  }
  if (body.deliverable !== undefined) {
    updates.deliverable =
      body.deliverable && typeof body.deliverable === "object" ? body.deliverable : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 })
  }

  const [updated] = await db
    .update(planItems)
    .set(updates)
    .where(eq(planItems.id, itemNumericId))
    .returning()

  return NextResponse.json({ success: true, item: updated })
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id, itemId } = await ctx.params
  const planId = Number.parseInt(id)
  const itemNumericId = Number.parseInt(itemId)
  if (Number.isNaN(planId) || Number.isNaN(itemNumericId)) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
  }

  const plan = await verifyPlanOwnership(planId, session.id)
  if (!plan) {
    return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 })
  }

  if (plan.status === "promoted") {
    return NextResponse.json(
      { success: false, message: "Cannot delete items from a promoted plan" },
      { status: 409 },
    )
  }

  const [existing] = await db
    .select()
    .from(planItems)
    .where(and(eq(planItems.id, itemNumericId), eq(planItems.planId, planId)))

  if (!existing) {
    return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 })
  }

  await db.delete(planItems).where(eq(planItems.id, itemNumericId))

  return NextResponse.json({ success: true })
}
