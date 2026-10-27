// POST /api/planner/[id]/promote — one transaction:
//   insert tasks, resolve dependencies, create deliverables, write birth events,
//   flip plan to promoted.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { agentPlans, planItems, tasks, deliverables, taskEvents } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: RouteContext) {
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
      { success: false, message: "Plan already promoted" },
      { status: 409 },
    )
  }

  const items = await db
    .select()
    .from(planItems)
    .where(eq(planItems.planId, planId))
    .orderBy(planItems.sortOrder)

  if (items.length === 0) {
    return NextResponse.json(
      { success: false, message: "Plan has no items to promote" },
      { status: 400 },
    )
  }

  const result = await db.transaction(async (tx) => {
    const indexToTaskId = new Map<number, number>()
    const createdTaskIds: number[] = []

    // Insert tasks and build the index → id map.
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const dependsOnIndices = (item.dependsOn as number[]) || []

      // Resolve dependency indices to actual task IDs.
      const resolvedDeps = dependsOnIndices
        .map((idx) => indexToTaskId.get(idx))
        .filter((id): id is number => id !== undefined)

      // Store resolved dependencies in tags as a structured object.
      const tags = resolvedDeps.length > 0 ? [{ _dependsOn: resolvedDeps }] : []

      const [task] = await tx
        .insert(tasks)
        .values({
          title: item.title,
          description: item.description,
          status: "todo",
          priority: "medium",
          storyPoints: item.estimatePoints,
          startDate: item.startDate,
          dueDate: item.dueDate,
          discipline: item.discipline,
          sourcePlanId: planId,
          tags,
        })
        .returning()

      if (!task) throw new Error("Failed to create task")

      indexToTaskId.set(i, task.id)
      createdTaskIds.push(task.id)
    }

    // Create deliverables where specified.
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.deliverable && typeof item.deliverable === "object") {
        const del = item.deliverable as { name: string; type: string }
        const taskId = indexToTaskId.get(i)
        if (taskId) {
          await tx.insert(deliverables).values({
            name: del.name,
            type: del.type,
            taskId,
            planItemId: item.id,
            ownerId: session.id,
            discipline: item.discipline,
            status: "draft",
            createdBy: session.id,
          })
        }
      }
    }

    // Write task_events birth rows.
    for (const taskId of createdTaskIds) {
      await tx.insert(taskEvents).values({
        taskId,
        actorId: session.id,
        fromStatus: "none",
        toStatus: "todo",
        source: "promote",
      })
    }

    // Flip plan to promoted.
    await tx
      .update(agentPlans)
      .set({ status: "promoted", promotedAt: new Date(), updatedAt: new Date() })
      .where(eq(agentPlans.id, planId))

    return { taskIds: createdTaskIds, count: createdTaskIds.length }
  })

  return NextResponse.json(
    { success: true, promoted: true, taskIds: result.taskIds, count: result.count },
    { status: 201 },
  )
}
