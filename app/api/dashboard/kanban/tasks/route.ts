import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks, users } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

// Legacy Kanban "new card" endpoint.
//
// The board's source of truth is the `tasks` table, so this route now creates
// a task there instead of the historical kanban_tasks table. It keeps the old
// request/response contract (columnId may be a status slug, the response is
// under `task`) while gaining proper auth, type-clean date handling
// (`tasks.dueDate` is a date-string column) and the same assignment
// notification fan-out used by POST /api/tasks.

const BOARD_STATUSES = ["todo", "in_progress", "review", "blocked", "done"]
const BOARD_PRIORITIES = ["urgent", "high", "medium", "low"]

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? null : parsed
}

// tasks.dueDate is a date-typed column: store a YYYY-MM-DD string, never a Date.
function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.columnId && !body.status) {
      return NextResponse.json(
        { success: false, error: "Column ID or status is required" },
        { status: 400 },
      )
    }

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 })
    }

    // Legacy clients pass a status slug ("todo", "in-progress"/"in_progress", …)
    // as columnId; newer clients pass status directly.
    const columnSlug = typeof body.columnId === "string" ? body.columnId.replace(/-/g, "_") : null
    const requestedStatus = typeof body.status === "string" ? body.status.replace(/-/g, "_") : null
    const status = BOARD_STATUSES.includes(requestedStatus ?? "")
      ? (requestedStatus as string)
      : BOARD_STATUSES.includes(columnSlug ?? "")
        ? (columnSlug as string)
        : "todo"

    const priority = BOARD_PRIORITIES.includes(String(body.priority)) ? String(body.priority) : "medium"

    // Verify the assignee exists before linking them to the task.
    const requestedAssigneeId = toInt(body.assignee?.id ?? body.assigneeId)
    let assignee: { id: string; name: string; avatar: string } | null = null
    if (requestedAssigneeId !== null) {
      const [assigneeRow] = await db
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, requestedAssigneeId))
        .limit(1)
      if (assigneeRow) {
        assignee = {
          id: String(assigneeRow.id),
          name: assigneeRow.name,
          avatar: assigneeRow.avatar ?? "",
        }
      }
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        title,
        description: typeof body.description === "string" ? body.description : "",
        status,
        priority,
        storyPoints: toInt(body.storyPoints) ?? 0,
        assigneeId: assignee ? Number(assignee.id) : null,
        sprintId: toInt(body.sprintId),
        dueDate: toIsoDate(body.dueDate),
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    if (!newTask) {
      throw new Error("Insert did not return a task")
    }

    // Fan out an assignment notification like POST /api/tasks does, so the
    // assignee sees it in their bell feed via Neon Realtime.
    if (assignee && Number(assignee.id) !== session.id) {
      await createNotification({
        userId: Number(assignee.id),
        type: "task",
        title: `New task assigned: ${newTask.title}`,
        body: `${session.name || "A teammate"} assigned "${newTask.title}" to you.`,
        link: "/dashboard/tasks",
        metadata: { taskId: newTask.id, action: "assigned" },
      })
    }

    // Legacy response shape kept for existing consumers.
    return NextResponse.json({
      success: true,
      task: {
        id: String(newTask.id),
        title: newTask.title,
        description: newTask.description ?? "",
        status: newTask.status,
        priority: newTask.priority,
        storyPoints: newTask.storyPoints,
        dueDate: newTask.dueDate ?? undefined,
        assignee,
        tags: Array.isArray(newTask.tags) ? newTask.tags.map(String) : [],
        attachments: 0,
        comments: 0,
      },
    })
  } catch (error) {
    console.error("Error creating Kanban task:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create Kanban task" },
      { status: 500 },
    )
  }
}
