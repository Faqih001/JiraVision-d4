import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createTask, getPaginatedTasks } from "@/lib/data-access"
import { createNotification } from "@/lib/notifications"

// For local development and testing - set to false in production
const ENABLE_TEST_MODE = process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_MODE === 'true';

// GET handler for /api/tasks - Returns all tasks with pagination and filtering
export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getSession()
    
    // In test mode, we allow requests without authentication
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
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

// POST handler for /api/tasks - Creates a new task
export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getSession()
    
    // In test mode, we allow requests without authentication
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Use default test user ID for operations if in test mode
    const userId = session ? session.id : (ENABLE_TEST_MODE ? 1 : null)

    // Get task data from request
    const data = await request.json()
    
    // Validate required fields
    if (!data.title) {
      return NextResponse.json(
        { success: false, message: "Task title is required" },
        { status: 400 }
      )
    }
    
    // Prepare task data, ensuring proper date formatting for dueDate
    const taskData = {
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      storyPoints: data.storyPoints || 0,
      assigneeId: data.assigneeId || (session ? session.id : 1), // Default to test user ID 1 if session is null
      sprintId: data.sprintId || null,
      dueDate: data.dueDate ? data.dueDate : null, // Save as string, not Date object
      tags: data.tags || []
    }
    
    // Create the task
    const newTask = await createTask(taskData)

    if (newTask.assigneeId && newTask.assigneeId !== userId) {
      await createNotification({
        userId: newTask.assigneeId,
        type: "task",
        title: `New task assigned: ${newTask.title}`,
        body: `${session?.name || "A teammate"} assigned "${newTask.title}" to you.`,
        link: "/dashboard/tasks",
        metadata: { taskId: newTask.id, action: "assigned" },
      })
    }

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
