import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { captureStatusChanges } from "@/lib/worklog/capture"
import { eq, and } from "drizzle-orm"

// tasks.dueDate is a drizzle date() column, which is string-mode: it binds
// "YYYY-MM-DD" and rejects a Date. Clients may send either a bare date or a
// full ISO timestamp, so normalise instead of trusting the shape.
function toDueDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = new Date(value as string | number)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const sprintId = searchParams.get("sprintId")
    const status = searchParams.get("status")

    // Build query. Chaining .where() twice replaces the previous predicate
    // instead of ANDing it, so collect the filters and apply one .where().
    const filters = []
    if (sprintId) {
      const parsed = parseInt(sprintId)
      if (!Number.isNaN(parsed)) filters.push(eq(tasks.sprintId, parsed))
    }
    if (status) {
      filters.push(eq(tasks.status, status))
    }

    const query = filters.length
      ? db.select().from(tasks).where(and(...filters))
      : db.select().from(tasks)

    const results = await query
    
    return NextResponse.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error("Tasks fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch tasks"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const data = await request.json()

    if (typeof data.title !== "string" || data.title.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Task title is required" },
        { status: 400 }
      )
    }

    // Insert new task
    const [newTask] = await db
      .insert(tasks)
      .values({
        title: data.title,
        description: data.description || "",
        status: data.status || "todo",
        priority: data.priority || "medium",
        storyPoints: data.storyPoints || 0,
        assigneeId: session.id,
        sprintId: data.sprintId,
        dueDate: toDueDate(data.dueDate),
        tags: data.tags || []
      })
      .returning()

    return NextResponse.json({
      success: true,
      task: newTask,
    })
  } catch (error) {
    console.error("Task creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create task",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }
    
    // Read the current status before the write; `data.status` may be undefined, in which
    // case drizzle leaves the column alone and there is nothing to record.
    const [beforeRow] = await db
      .select({ id: tasks.id, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, Number(data.id)))

    // Update task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        storyPoints: data.storyPoints,
        assigneeId: data.assigneeId || session.id,
        sprintId: data.sprintId,
        dueDate: data.dueDate === undefined ? undefined : toDueDate(data.dueDate),
        tags: data.tags || [],
        updatedAt: new Date()
      })
      .where(eq(tasks.id, data.id))
      .returning()

    await captureStatusChanges(beforeRow ? [beforeRow] : [], updatedTask ? [updatedTask] : [], {
      actorId: session.id,
      source: "route",
    })

    return NextResponse.json({
      success: true,
      task: updatedTask,
    })
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update task",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get task ID
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("id")
    
    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        message: "Task ID is required" 
      }, { status: 400 })
    }
    
    // Delete the task
    await db
      .delete(tasks)
      .where(eq(tasks.id, parseInt(taskId)))
    
    return NextResponse.json({
      success: true,
      message: "Task deleted successfully"
    })
  } catch (error) {
    console.error("Task deletion error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete task",
      },
      { status: 500 }
    )
  }
}
