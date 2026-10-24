import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks, users } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"

export const dynamic = "force-dynamic"

// Legacy board fetch contract.
//
// The kanban board's source of truth is the `tasks` table (status
// todo/in_progress/review/blocked/done) — the historical kanban_columns /
// kanban_tasks tables are ignored. This route still serves the old
// `{ success, data: { columns: [{ id, title, color, tasks: [...] }] } }`
// shape so any remaining legacy consumers keep working, but the columns are
// now derived from task status instead of a direct postgres connection.

const BOARD_COLUMNS = [
  { id: "todo", title: "To Do", color: "bg-blue-500" },
  { id: "in_progress", title: "In Progress", color: "bg-amber-500" },
  { id: "review", title: "Review", color: "bg-purple-500" },
  { id: "blocked", title: "Blocked", color: "bg-red-500" },
  { id: "done", title: "Done", color: "bg-green-500" },
] as const

type KanbanAssignee = { id: string; name: string; avatar: string } | null

type KanbanCard = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  storyPoints: number
  dueDate?: string
  assignee: KanbanAssignee
  tags: string[]
  attachments: number
  comments: number
}

function toCard(row: {
  id: number
  title: string
  description: string | null
  status: string
  priority: string
  storyPoints: number
  dueDate: string | null
  tags: unknown
  assigneeId: number | null
  assigneeName: string | null
  assigneeAvatar: string | null
}): KanbanCard {
  const assignee: KanbanAssignee =
    row.assigneeId !== null
      ? {
          id: String(row.assigneeId),
          name: row.assigneeName ?? "Unknown User",
          avatar: row.assigneeAvatar ?? "",
        }
      : null
  return {
    id: String(row.id),
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    storyPoints: row.storyPoints,
    // `tasks.dueDate` is a date-typed column: drizzle already gives us the
    // YYYY-MM-DD string, so no Date/toISOString round-trip is needed.
    dueDate: row.dueDate ?? undefined,
    assignee,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    attachments: 0,
    comments: 0,
  }
}

// GET /api/dashboard/kanban — board columns derived from task status.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        storyPoints: tasks.storyPoints,
        dueDate: tasks.dueDate,
        tags: tasks.tags,
        assigneeId: users.id,
        assigneeName: users.name,
        assigneeAvatar: users.avatar,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(tasks.id)

    const columns = BOARD_COLUMNS.map((column) => ({
      id: column.id,
      title: column.title,
      color: column.color,
      tasks: rows.filter((row) => row.status === column.id).map(toCard),
    }))

    return NextResponse.json({
      success: true,
      data: { columns },
      message: "Kanban data loaded successfully",
    })
  } catch (error) {
    console.error("Error fetching Kanban data:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch Kanban data" },
      { status: 500 },
    )
  }
}
