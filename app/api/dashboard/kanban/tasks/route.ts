import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { kanbanTasks, kanbanColumns, users } from "@/drizzle/schema"
import { eq, max } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    const body = await request.json()
    
    if (!body.columnId) {
      return NextResponse.json({ 
        success: false, 
        error: "Column ID is required" 
      }, { status: 400 })
    }
    
    // Verify that the column exists
    const columnCheck = await db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.id, parseInt(body.columnId)))
      .limit(1)
    
    if (!columnCheck || columnCheck.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Column not found" 
      }, { status: 404 })
    }
    
    // Get the maximum order value in this column to place the new task at the end
    const maxOrderResult = await db
      .select({
        maxOrder: max(kanbanTasks.order)
      })
      .from(kanbanTasks)
      .where(eq(kanbanTasks.columnId, parseInt(body.columnId)))
    
    const newOrder = (maxOrderResult[0]?.maxOrder || 0) + 10
    
    // Process assignee
    let assigneeId = null
    if (body.assignee && body.assignee.id) {
      // Verify the assignee exists
      const assigneeCheck = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(body.assignee.id)))
        .limit(1)
      
      if (assigneeCheck && assigneeCheck.length > 0) {
        assigneeId = parseInt(body.assignee.id)
      }
    }
    
    // Process subtasks if present
    let subtasks = null
    if (body.subtasks) {
      subtasks = {
        total: body.subtasks.total || 0,
        completed: body.subtasks.completed || 0
      }
    }
    
    // Insert the new task
    const [newTask] = await db
      .insert(kanbanTasks)
      .values({
        title: body.title,
        description: body.description || "",
        priority: body.priority || "medium",
        status: body.status || "todo",
        columnId: parseInt(body.columnId),
        assigneeId: assigneeId,
        sprintId: body.sprintId ? parseInt(body.sprintId) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        order: newOrder,
        tags: body.tags || [],
        subtasks: subtasks,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()
    
    // Format the response 
    let assignee = null
    if (assigneeId) {
      const assigneeResult = await db
        .select({
          id: users.id,
          name: users.name,
          avatar: users.avatar
        })
        .from(users)
        .where(eq(users.id, assigneeId))
        .limit(1)
      
      if (assigneeResult.length > 0) {
        assignee = {
          id: assigneeResult[0].id.toString(),
          name: assigneeResult[0].name,
          avatar: assigneeResult[0].avatar || ""
        }
      }
    }
    
    // Format the response
    const formattedTask = {
      id: newTask.id.toString(),
      title: newTask.title,
      description: newTask.description || "",
      priority: newTask.priority,
      dueDate: newTask.dueDate ? newTask.dueDate.toISOString().split('T')[0] : undefined,
      assignee: assignee,
      tags: newTask.tags || [],
      attachments: newTask.attachments || 0,
      comments: newTask.comments || 0,
      subtasks: newTask.subtasks ? {
        total: newTask.subtasks.total || 0,
        completed: newTask.subtasks.completed || 0
      } : undefined
    }
    
    return NextResponse.json({ success: true, task: formattedTask })
  } catch (error) {
    console.error("Error creating Kanban task:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create Kanban task" },
      { status: 500 }
    )
  }
}
