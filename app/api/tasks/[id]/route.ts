import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getTaskById, updateTask, deleteTask } from "@/lib/data-access"
import { pickTaskUpdates } from "@/lib/task-updates"
import { createNotification } from "@/lib/notifications"
import { captureStatusChanges } from "@/lib/worklog/capture"

type Context = { params: Promise<{ id: string }> }

// GET handler for /api/tasks/[id] - Returns a specific task by ID
export async function GET(
  request: Request,
  { params }: Context
) {
  const { id: idParam } = await params
  try {
    // Check if user is authenticated
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid task ID" },
        { status: 400 }
      )
    }

    // Get the task
    const task = await getTaskById(id)

    if (!task) {
      return NextResponse.json(
        { success: false, message: `Task with ID ${id} not found` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error(`Error fetching task with ID ${idParam}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch task",
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

// PUT handler for /api/tasks/[id] - Updates a specific task
export async function PUT(
  request: Request,
  { params }: Context
) {
  const { id: idParam } = await params
  try {
    // Check if user is authenticated
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }
    const actorId = session.id

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid task ID" },
        { status: 400 }
      )
    }

    // Get the existing task to check if it exists
    const existingTask = await getTaskById(id)
    if (!existingTask) {
      return NextResponse.json(
        { success: false, message: `Task with ID ${id} not found` },
        { status: 404 }
      )
    }

    // Get update data from request
    const data = await request.json()

    const updates = pickTaskUpdates(data)
    if ("error" in updates) {
      return NextResponse.json(
        { success: false, message: updates.error },
        { status: 400 }
      )
    }
    const updateData = updates.patch

    // Update the task
    const updatedTask = await updateTask(id, updateData)

    // The status history is the report's evidence, so it is written for every transition,
    // including the ones that are not worth notifying anyone about.
    await captureStatusChanges([existingTask], [updatedTask], {
      actorId,
      source: "route",
    })

    // User-visible events push to the assignee's live bell feed.
    const notifyId = updatedTask.assigneeId ?? existingTask.assigneeId
    const actorName = session.name || "A teammate"
    const link = "/dashboard/tasks"
    if (
      updateData.status !== undefined &&
      updateData.status !== existingTask.status &&
      notifyId &&
      notifyId !== actorId
    ) {
      await createNotification({
        userId: notifyId,
        type: "task",
        title: `Task status: ${updatedTask.title}`,
        body: `${actorName} moved "${updatedTask.title}" from ${existingTask.status} to ${updatedTask.status}.`,
        link,
        metadata: { taskId: id, action: "status_changed", from: existingTask.status, to: updatedTask.status },
      })
    } else if (
      updateData.assigneeId !== undefined &&
      updateData.assigneeId !== existingTask.assigneeId &&
      notifyId &&
      notifyId !== actorId
    ) {
      await createNotification({
        userId: notifyId,
        type: "task",
        title: `Task assigned: ${updatedTask.title}`,
        body: `${actorName} assigned "${updatedTask.title}" to you.`,
        link,
        metadata: { taskId: id, action: "assigned" },
      })
    } else if (
      data.dueDate !== undefined &&
      String(data.dueDate) !== String(existingTask.dueDate ?? "") &&
      notifyId &&
      notifyId !== actorId
    ) {
      await createNotification({
        userId: notifyId,
        type: "task",
        title: `Deadline updated: ${updatedTask.title}`,
        body: `${actorName} set the due date to ${updatedTask.dueDate ?? "none"}.`,
        link,
        metadata: { taskId: id, action: "due_date_changed" },
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
    })
  } catch (error) {
    console.error(`Error updating task with ID ${idParam}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update task",
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

// DELETE handler for /api/tasks/[id] - Deletes a specific task
export async function DELETE(
  request: Request,
  { params }: Context
) {
  const { id: idParam } = await params
  try {
    // Check if user is authenticated
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }
    const actorId = session.id

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid task ID" },
        { status: 400 }
      )
    }

    // Get the existing task to check if it exists
    const existingTask = await getTaskById(id)
    if (!existingTask) {
      return NextResponse.json(
        { success: false, message: `Task with ID ${id} not found` },
        { status: 404 }
      )
    }

    // Delete the task
    await deleteTask(id)

    if (existingTask.assigneeId && existingTask.assigneeId !== actorId) {
      await createNotification({
        userId: existingTask.assigneeId,
        type: "task",
        title: `Task deleted: ${existingTask.title}`,
        body: `${session.name || "A teammate"} deleted "${existingTask.title}".`,
        link: "/dashboard/tasks",
        metadata: { taskId: id, action: "deleted" },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Task with ID ${id} deleted successfully`
    })
  } catch (error) {
    console.error(`Error deleting task with ID ${idParam}:`, error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete task",
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
