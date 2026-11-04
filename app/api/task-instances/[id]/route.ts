import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  getTaskInstanceById,
  updateTaskInstance,
  generateNextInstance,
} from "@/lib/data-access-task-instances"
import { validateChecklistResponses, parseChecklistItems } from "@/lib/tasks/checklist"
import { localDay } from "@/lib/worklog/local-day"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const instanceId = parseInt(id, 10)
    const instance = await getTaskInstanceById(instanceId)
    if (!instance) {
      return NextResponse.json({ success: false, message: "Instance not found" }, { status: 404 })
    }

    // Ownership check: user must be assignee of the parent task
    const taskResults = await db
      .select({ assigneeId: tasks.assigneeId })
      .from(tasks)
      .where(eq(tasks.id, instance.taskId))
      .limit(1)
    const taskAssigneeId = taskResults[0]?.assigneeId

    if (session && taskAssigneeId !== session.id) {
      return NextResponse.json(
        { success: false, message: "You can only modify instances assigned to you" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { status, notes, checklistResponses } = body

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      const validStatuses = ["todo", "in_progress", "done", "skipped"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 },
        )
      }
      updateData.status = status
      if (status === "done") {
        updateData.completedAt = new Date().toISOString()
        updateData.completedBy = session?.id ?? 1
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (checklistResponses !== undefined) {
      const templateResults = await db.select().from(tasks).where(eq(tasks.id, instance.taskId)).limit(1)
      const template = templateResults[0]
      if (template) {
        const items = parseChecklistItems(
          typeof template.checklistItems === "string"
            ? template.checklistItems
            : JSON.stringify(template.checklistItems ?? [])
        )
        if (items.length > 0 && !validateChecklistResponses(items, checklistResponses)) {
          return NextResponse.json(
            { success: false, message: "Invalid checklist responses" },
            { status: 400 }
          )
        }
      }
      updateData.checklistResponses = checklistResponses
    }

    const updated = await updateTaskInstance(instanceId, updateData)
    if (!updated) {
      return NextResponse.json({ success: false, message: "Failed to update instance" }, { status: 500 })
    }

    let nextInstance = null
    if (status === "done") {
      nextInstance = await generateNextInstance(instance.taskId, localDay(new Date(), session?.timezone))
    }

    return NextResponse.json({
      success: true,
      data: updated,
      nextInstance,
    })
  } catch (error) {
    console.error("Error updating task instance:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update instance", error: (error as Error).message },
      { status: 500 }
    )
  }
}
