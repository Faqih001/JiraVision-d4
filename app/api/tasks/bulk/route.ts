import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { eq, and, inArray } from "drizzle-orm"

// POST handler for /api/tasks/bulk - Performs bulk actions on multiple tasks
export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get bulk action data from request
    const data = await request.json()
    
    // Validate required fields
    if (!data.action || !data.taskIds || !Array.isArray(data.taskIds) || data.taskIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Action and task IDs are required. Task IDs must be a non-empty array." 
        },
        { status: 400 }
      )
    }
    
    const { action, taskIds, updateData } = data
    
    // Convert taskIds to numbers
    const numericTaskIds = taskIds.map((id: string | number) => Number(id)).filter((id: number) => !isNaN(id))
    
    if (numericTaskIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid task IDs provided" },
        { status: 400 }
      )
    }
    
    let result
    
    switch (action) {
      case 'update':
        // Validate update data
        if (!updateData || Object.keys(updateData).length === 0) {
          return NextResponse.json(
            { success: false, message: "Update data is required for 'update' action" },
            { status: 400 }
          )
        }
        
        // Add updated timestamp
        const dataWithTimestamp = {
          ...updateData,
          updatedAt: new Date()
        }
        
        // Update all specified tasks
        result = await db
          .update(tasks)
          .set(dataWithTimestamp)
          .where(inArray(tasks.id, numericTaskIds))
          .returning()
        
        break
      
      case 'delete':
        // Delete all specified tasks
        result = await db
          .delete(tasks)
          .where(inArray(tasks.id, numericTaskIds))
          .returning({ id: tasks.id })
        
        break
      
      default:
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid action: ${action}. Supported actions: 'update', 'delete'` 
          },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      action: action,
      affectedCount: result.length,
      data: result
    })
  } catch (error) {
    console.error("Error performing bulk task action:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to perform bulk task action",
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
