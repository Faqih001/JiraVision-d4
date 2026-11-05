import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createTask, getPaginatedTasks } from "@/lib/data-access"
import { createNotification } from "@/lib/notifications"
import { isCadence } from "@/lib/cadence"
import { recurringStatusError } from "@/lib/task-updates"
import { readDisciplineField } from "@/lib/roles"
import { memberDisciplineDefault } from "@/lib/worklog/member-discipline"
import { captureTaskBirths } from "@/lib/worklog/capture"
import { generateInitialInstances } from "@/lib/data-access-task-instances"
import { loadVisibleMemberIds } from "@/lib/organizations"
import { localDay } from "@/lib/worklog/local-day"
import { isScheduleRow, todayOccurrencesFor } from "@/lib/tasks/today-occurrence"

// Anonymous access is a convenience for local development and scripted runs only.
// The previous expression ORed in ENABLE_TEST_MODE unconditionally, so a stray
// ENABLE_TEST_MODE=true in a production deploy opened these endpoints to
// unauthenticated reads and writes attributed to user 1.
const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

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
      search: searchParams.get("search") || undefined,
      // `scope=mine` is the member's own board: the session id, never the query string.
      memberUserId: searchParams.get("scope") === "mine" ? session?.id : undefined,
    }
    
    // Get paginated tasks
    const result = await getPaginatedTasks(page, pageSize, filters)

    // A board buckets by the day, and a schedule's day lives in `task_instances`, not in
    // `tasks`. Attaching today's occurrence is what lets the kanban put a daily in To do every
    // morning and let it be marked done once for that day. `null` means "not due today", which
    // is a real answer for a weekly schedule read on the wrong day, not a missing row.
    const hasSchedule = result.tasks.some(isScheduleRow)
    const todayIso = localDay(new Date(), session?.timezone)
    const writableIds = hasSchedule && session ? await loadVisibleMemberIds(session.id) : []
    const occurrences = await todayOccurrencesFor(result.tasks, todayIso, writableIds)

    return NextResponse.json({
      success: true,
      data: result.tasks.map((task) => ({
        ...task,
        todayInstance: occurrences.get(task.id) ?? null,
      })),
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

    // Validate cadence if provided
    const cadence = data.cadence || "one-off"
    const checklistItems = data.checklistItems || []

    if (!isCadence(cadence)) {
      return NextResponse.json(
        { success: false, message: "Invalid cadence value" },
        { status: 400 }
      )
    }

    // A cadence makes this row a template, and a template is never finished: PUT refuses that
    // patch, and POST has to refuse it too. Without this, a "Daily + Done" create would store a
    // template the board draws in To do (the board reads today's occurrence, and every occurrence
    // is born `todo`) while the tasks page draws it in Done — one card, two columns.
    const recurringBlock = recurringStatusError({ cadence }, { status: data.status })
    if (recurringBlock) {
      return NextResponse.json({ success: false, message: recurringBlock }, { status: 409 })
    }

    // A task the member creates for themselves is classified by the discipline they work in, so
    // a task made from any screen lands visible to the discipline reports. A task assigned to a
    // teammate stays unclassified — stamping the creator's discipline onto someone else's work
    // would put a label on it nobody chose.
    const assigneeId = data.assigneeId || (session ? session.id : 1) // test mode has no session
    const defaultDiscipline = session && assigneeId === session.id ? await memberDisciplineDefault(session) : null
    const discipline = readDisciplineField(data.discipline, defaultDiscipline)
    if ("error" in discipline) {
      return NextResponse.json({ success: false, message: discipline.error }, { status: 400 })
    }

    // Prepare task data, ensuring proper date formatting for dueDate
    const taskData = {
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      storyPoints: data.storyPoints || 0,
      assigneeId,
      sprintId: data.sprintId || null,
      dueDate: data.dueDate ? data.dueDate : null, // Save as string, not Date object
      tags: data.tags || [],
      discipline: discipline.value,
      cadence,
      checklistItems,
      isTemplate: cadence !== "one-off",
    }
    
    // Create the task
    const newTask = await createTask(taskData)

    // A task created already finished never moves, so this birth row is the only record its
    // completion will ever have. A task created as todo writes nothing here.
    await captureTaskBirths([newTask], { actorId: userId, source: "route" })

    // Generate initial instances for recurring tasks
    let instanceCount = 0
    if (cadence !== "one-off") {
      instanceCount = await generateInitialInstances(newTask.id, cadence as any, data.dueDate || undefined)
    }

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
      data: newTask,
      instanceCount,
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
