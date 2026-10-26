import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { pickTaskUpdates } from "@/lib/task-updates"
import { captureStatusChanges } from "@/lib/worklog/capture"
import { eq, and, inArray } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"

// Development helper for exercising bulk actions from a script. It mutates
// real rows, so it requires the same session cookie as the production routes.

// POST handler for /api/test/tasks/bulk - Performs bulk actions on multiple tasks
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
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
      case 'update': {
        // Whitelist + dueDate normalisation shared with the production routes.
        const updates = pickTaskUpdates(updateData)
        if ("error" in updates) {
          return NextResponse.json(
            { success: false, message: updates.error },
            { status: 400 }
          )
        }

        const dataWithTimestamp = {
          ...updates.patch,
          updatedAt: new Date()
        }

        // Read the pre-write statuses first, exactly as the production bulk route does:
        // after the UPDATE they are gone and .returning() shows only the new values.
        const beforeRows = await db
          .select({ id: tasks.id, status: tasks.status })
          .from(tasks)
          .where(inArray(tasks.id, numericTaskIds))

        // Update all specified tasks
        result = await db
          .update(tasks)
          .set(dataWithTimestamp)
          .where(inArray(tasks.id, numericTaskIds))
          .returning()

        await captureStatusChanges(beforeRows, result, {
          actorId: session.id,
          source: "bulk",
        })

        break
      }
      
      case 'delete':
        // No task_events row here on purpose — same cascade reason as the production route.
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
