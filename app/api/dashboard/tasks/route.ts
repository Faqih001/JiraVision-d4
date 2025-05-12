import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { tasks, sprints } from "@/drizzle/schema"
import { eq, and, desc, gte, lte } from "drizzle-orm"

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
    
    // Build query
    let query = db.select().from(tasks)

    // Add filters
    if (sprintId) {
      query = query.where(eq(tasks.sprintId, parseInt(sprintId)))
    }
    
    if (status) {
      query = query.where(eq(tasks.status, status))
    }
    
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
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        tags: data.tags || [],
        updatedAt: new Date()
      })
      .where(eq(tasks.id, data.id))
      .returning()

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
