import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { kanbanTasks } from "@/drizzle/schema"
import { eq, and, gte, lt, desc, asc } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    const body = await request.json()
    const { taskId, sourceColumnId, destinationColumnId, sourceIndex, destinationIndex } = body
    
    // Parse IDs to integers
    const taskIdInt = parseInt(taskId)
    const sourceColumnIdInt = parseInt(sourceColumnId)
    const destinationColumnIdInt = parseInt(destinationColumnId)
    
    // Start a transaction to ensure data consistency
    // Note: Some SQL clients might require different transaction handling
    const tx = db;
    
    // Get the current task to update
    const currentTaskResult = await tx
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.id, taskIdInt))
      .limit(1)
    
    if (!currentTaskResult || currentTaskResult.length === 0) {
      throw new Error(`Task with ID ${taskId} not found`)
    }
    
    // Get tasks in the source column
    const sourceColumnTasks = await tx
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.columnId, sourceColumnIdInt))
      .orderBy(asc(kanbanTasks.order))
    
    // Get tasks in the destination column
    const destinationColumnTasks = sourceColumnIdInt === destinationColumnIdInt
      ? sourceColumnTasks // Same column, reuse the data
      : await tx
          .select()
          .from(kanbanTasks)
          .where(eq(kanbanTasks.columnId, destinationColumnIdInt))
          .orderBy(asc(kanbanTasks.order))
    
    // Calculate new order values
    let newOrder: number;
    
    if (destinationIndex === 0) {
      // Moving to the beginning of the column
      newOrder = destinationColumnTasks.length > 0
        ? destinationColumnTasks[0].order - 10 // Place before the first task
        : 10 // First task in the column
    } else if (destinationIndex >= destinationColumnTasks.length) {
      // Moving to the end of the column
      newOrder = destinationColumnTasks.length > 0
        ? destinationColumnTasks[destinationColumnTasks.length - 1].order + 10 // Place after the last task
        : 10 // First task in the column
    } else {
      // Moving between tasks
      if (sourceColumnIdInt === destinationColumnIdInt && sourceIndex < destinationIndex) {
        // Moving down in the same column
        newOrder = Math.floor(
          (destinationColumnTasks[destinationIndex].order + 
           destinationColumnTasks[destinationIndex - 1].order) / 2
        )
      } else {
        // Moving up or to a different column
        newOrder = Math.floor(
          (destinationColumnTasks[destinationIndex].order + 
           (destinationIndex > 0 ? destinationColumnTasks[destinationIndex - 1].order : 0)) / 2
        )
      }
    }
    
    // Update the task position and column
    const updateResult = await tx
      .update(kanbanTasks)
      .set({
        columnId: destinationColumnIdInt,
        order: newOrder,
      })
      .where(eq(kanbanTasks.id, taskIdInt))
      .returning()
    
    return NextResponse.json({ 
      success: true, 
      message: "Task reordered successfully",
      data: {
        taskId,
        sourceColumnId, 
        destinationColumnId, 
        sourceIndex, 
        destinationIndex,
        newOrder,
        updatedTask: updateResult[0]
      }
    })
  } catch (error) {
    console.error("Error reordering Kanban task:", error)
    return NextResponse.json(
      { success: false, error: "Failed to reorder Kanban task" },
      { status: 500 }
    )
  }
}
