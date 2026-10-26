import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { pickTaskUpdates } from "@/lib/task-updates"
import { captureStatusChanges } from "@/lib/worklog/capture"
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
      case 'update': {
        // Only whitelisted task columns reach `.set()` — drizzle interpolates every
        // key it is handed as a column identifier, so the old `{...updateData}`
        // spread let a caller write to `id` or craft an identifier.
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

        // Read the pre-write statuses first: after the UPDATE they are gone, and drizzle's
        // .returning() gives only the new values. One query, then one event insert.
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
        // No task_events row here on purpose: task_events.task_id cascades, so an event
        // about a deleted task is deleted with it. Creation is tasks.created_at; deletion
        // is the notifications feed (see the DELETE /api/tasks/[id] handler).
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
