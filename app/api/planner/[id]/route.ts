// /api/planner/[id] — read, update, or discard one plan.
// GET: plan metadata + all items. PATCH: title/summary. DELETE: only drafts.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { agentPlans, planItems } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const planId = Number.parseInt(id)
  if (Number.isNaN(planId)) {
    return NextResponse.json({ success: false, message: "Invalid plan id" }, { status: 400 })
  }

  const [plan] = await db
    .select()
    .from(agentPlans)
    .where(and(eq(agentPlans.id, planId), eq(agentPlans.createdBy, session.id)))

  if (!plan) {
    return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 })
  }

  const items = await db
    .select()
    .from(planItems)
    .where(eq(planItems.planId, planId))
    .orderBy(planItems.sortOrder)

  return NextResponse.json({ success: true, plan, items })
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const planId = Number.parseInt(id)
  if (Number.isNaN(planId)) {
    return NextResponse.json({ success: false, message: "Invalid plan id" }, { status: 400 })
  }

  const [plan] = await db
    .select()
    .from(agentPlans)
    .where(and(eq(agentPlans.id, planId), eq(agentPlans.createdBy, session.id)))

  if (!plan) {
    return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 })
  }

  if (plan.status === "promoted") {
    return NextResponse.json(
      { success: false, message: "Cannot edit a promoted plan" },
      { status: 409 },
    )
  }

  let body: { title?: string; summary?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.title === "string" && body.title.trim().length > 0) {
    updates.title = body.title.trim().slice(0, 200)
  }
  if (typeof body.summary === "string") {
    updates.summary = body.summary.slice(0, 2000) || null
  }

  const [updated] = await db
    .update(agentPlans)
    .set(updates)
    .where(eq(agentPlans.id, planId))
    .returning()

  return NextResponse.json({ success: true, plan: updated })
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const planId = Number.parseInt(id)
  if (Number.isNaN(planId)) {
    return NextResponse.json({ success: false, message: "Invalid plan id" }, { status: 400 })
  }

  const [plan] = await db
    .select()
    .from(agentPlans)
    .where(and(eq(agentPlans.id, planId), eq(agentPlans.createdBy, session.id)))

  if (!plan) {
    return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 })
  }

  if (plan.status === "promoted") {
    return NextResponse.json(
      { success: false, message: "Cannot discard a promoted plan" },
      { status: 409 },
    )
  }

  // plan_items has ON DELETE CASCADE, so deleting the plan removes its items.
  await db.delete(agentPlans).where(eq(agentPlans.id, planId))

  return NextResponse.json({ success: true })
}
