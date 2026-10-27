// POST /api/planner/[id]/items — add a new item to a draft plan.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { agentPlans, planItems } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: RouteContext) {
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
      { success: false, message: "Cannot add items to a promoted plan" },
      { status: 409 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ success: false, message: "title is required" }, { status: 400 })
  }

  // Find the current max sortOrder for this plan.
  const existing = await db.select().from(planItems).where(eq(planItems.planId, planId))
  const maxOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1)

  const [item] = await db
    .insert(planItems)
    .values({
      planId,
      title: body.title.trim().slice(0, 200),
      description: typeof body.description === "string" ? body.description.slice(0, 2000) : null,
      discipline: typeof body.discipline === "string" ? body.discipline.slice(0, 40) : null,
      estimatePoints: typeof body.estimatePoints === "number" ? Math.max(0, Math.min(100, body.estimatePoints)) : 0,
      startDate: typeof body.startDate === "string" ? body.startDate : null,
      dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
      status: "todo",
      dependsOn: Array.isArray(body.dependsOn) ? body.dependsOn : [],
      milestone: body.milestone === true,
      cadence: typeof body.cadence === "string" ? body.cadence : null,
      sortOrder: maxOrder + 1,
      deliverable: body.deliverable && typeof body.deliverable === "object" ? body.deliverable : null,
    })
    .returning()

  return NextResponse.json({ success: true, item }, { status: 201 })
}
