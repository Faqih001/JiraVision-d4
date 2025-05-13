import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { kanbanTasks } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    const body = await request.json()
    const { taskId, newStatus, sourceColumnId, destinationColumnId, sourceIndex, destinationIndex } = body
    
    // Update the task status and column ID in the database
    const updateResult = await db
      .update(kanbanTasks)
      .set({
        status: newStatus,
        columnId: destinationColumnId,
        // Optionally update order if you're tracking it
      })
      .where(eq(kanbanTasks.id, parseInt(taskId)))
      .returning()
    
    if (!updateResult || updateResult.length === 0) {
      throw new Error(`Failed to update task with ID ${taskId}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Task status updated successfully",
      data: {
        taskId,
        newStatus,
        sourceColumnId, 
        destinationColumnId, 
        sourceIndex, 
        destinationIndex,
        task: updateResult[0]
      }
    })
  } catch (error) {
    console.error("Error updating Kanban task status:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update Kanban task status" },
      { status: 500 }
    )
  }
}
