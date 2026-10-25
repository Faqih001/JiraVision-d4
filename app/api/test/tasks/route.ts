import { NextResponse } from "next/server"
import { createTask, getPaginatedTasks } from "@/lib/data-access"
import { getSession } from "@/lib/auth-actions"

// Development helpers for exercising the task endpoints from a script. They
// read and mutate real rows, so they require the same session cookie as the
// production routes instead of being open to anonymous requests.

// GET handler for test tasks endpoint with pagination and filtering
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10)
    
    // Parse filter parameters
    const filters = {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      assigneeId: searchParams.get("assigneeId") 
        ? parseInt(searchParams.get("assigneeId") as string, 10) 
        : undefined,
      sprintId: searchParams.get("sprintId") 
        ? parseInt(searchParams.get("sprintId") as string, 10) 
        : undefined,
      search: searchParams.get("search") || undefined
    }
    
    // Get paginated tasks
    const result = await getPaginatedTasks(page, pageSize, filters)
    
    return NextResponse.json({
      success: true,
      data: result.tasks,
      pagination: result.pagination
    })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch tasks",
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

// POST handler for test tasks endpoint
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get task data from request
    const data = await request.json()
    
    // Validate required fields
    if (!data.title) {
      return NextResponse.json(
        { success: false, message: "Task title is required" },
        { status: 400 }
      )
    }
    
    // Prepare task data, ensuring proper date formatting for PostgreSQL
    const taskData = {
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      storyPoints: data.storyPoints || 0,
      assigneeId: data.assigneeId || session.id,
      sprintId: data.sprintId || null,
      dueDate: data.dueDate || null, // date() column is string-mode
      tags: data.tags || []
    }
    
    // Create the task
    const newTask = await createTask(taskData)
    
    return NextResponse.json({
      success: true,
      data: newTask
    })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create task",
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
