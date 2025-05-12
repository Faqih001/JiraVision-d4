import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

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
