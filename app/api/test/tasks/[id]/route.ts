import { NextResponse } from "next/server"
import { getTaskById, updateTask, deleteTask } from "@/lib/data-access"
import { pickTaskUpdates } from "@/lib/task-updates"
import { captureStatusChanges } from "@/lib/worklog/capture"
import { getSession } from "@/lib/auth-actions"

// Development helpers for exercising the task endpoints from a script. They
// read and mutate real rows, so they require the same session cookie as the
// production routes instead of being open to anonymous requests.

// GET handler for /api/test/tasks/[id] - Returns a specific task by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)

  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
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
    console.error(`Error fetching task with ID ${rawId}:`, error)
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

// PUT handler for /api/test/tasks/[id] - Updates a specific task
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)

  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
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

    // Only whitelisted task columns reach the update, and dueDate is normalised
    // because tasks.dueDate is a drizzle date() column — string mode, so it binds
    // "YYYY-MM-DD" rather than a Date.
    const updates = pickTaskUpdates(data)
    if ("error" in updates) {
      return NextResponse.json({ success: false, message: updates.error }, { status: 400 })
    }

    // Update the task
    const updatedTask = await updateTask(id, updates.patch)

    // Same capture as the production route — the log must not depend on which door was used.
    await captureStatusChanges([existingTask], [updatedTask], {
      actorId: session.id,
      source: "route",
    })
    
    return NextResponse.json({
      success: true,
      data: updatedTask
    })
  } catch (error) {
    console.error(`Error updating task with ID ${rawId}:`, error)
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

// DELETE handler for /api/test/tasks/[id] - Deletes a specific task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)

  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
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
    
    return NextResponse.json({
      success: true,
      message: `Task with ID ${id} deleted successfully`
    })
  } catch (error) {
    console.error(`Error deleting task with ID ${rawId}:`, error)
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
