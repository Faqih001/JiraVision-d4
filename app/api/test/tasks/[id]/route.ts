import { NextResponse } from "next/server"
import { getTaskById, updateTask, deleteTask } from "@/lib/data-access"

// These are TEST endpoints for development purposes only 
// They do not require authentication and should NOT be used in production

// GET handler for /api/test/tasks/[id] - Returns a specific task by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
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
    console.error(`Error fetching task with ID ${params.id}:`, error)
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
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
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

    // Prepare update data, ensuring proper date formatting for dueDate
    const updateData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : existingTask.dueDate
    }

    // Update the task
    const updatedTask = await updateTask(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: updatedTask
    })
  } catch (error) {
    console.error(`Error updating task with ID ${params.id}:`, error)
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
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
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
    console.error(`Error deleting task with ID ${params.id}:`, error)
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
