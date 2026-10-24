import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { gamification, sprints, tasks, users, wellbeingMetrics } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

// GET /api/activity/[id] — resolves a stream item id ("t-12-u", "s-3", "w-8",
// "g-2", "a-4") to its underlying entity row. Notification ids ("n-…") are
// served by /api/notifications/[id] instead.
export async function GET(_request: NextRequest, context: Context) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const parts = id.split("-")
  const kind = parts[0]
  const numeric = Number.parseInt(parts[1] ?? "", 10)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return NextResponse.json({ error: "Invalid activity id" }, { status: 400 })
  }

  try {
    if (kind === "t") {
      const [row] = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          storyPoints: tasks.storyPoints,
          dueDate: tasks.dueDate,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          sprintId: tasks.sprintId,
          assigneeName: users.name,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(eq(tasks.id, numeric))
        .limit(1)
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({ activityId: id, entityKind: "task", entity: row })
    }

    if (kind === "s") {
      const [row] = await db.select().from(sprints).where(eq(sprints.id, numeric)).limit(1)
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({ activityId: id, entityKind: "sprint", entity: row })
    }

    if (kind === "w") {
      const [row] = await db
        .select({
          id: wellbeingMetrics.id,
          date: wellbeingMetrics.date,
          mood: wellbeingMetrics.mood,
          workload: wellbeingMetrics.workload,
          wellbeingScore: wellbeingMetrics.wellbeingScore,
          stressLevel: wellbeingMetrics.stressLevel,
          overtimeHours: wellbeingMetrics.overtimeHours,
          createdAt: wellbeingMetrics.createdAt,
          userName: users.name,
        })
        .from(wellbeingMetrics)
        .innerJoin(users, eq(wellbeingMetrics.userId, users.id))
        .where(eq(wellbeingMetrics.id, numeric))
        .limit(1)
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({ activityId: id, entityKind: "wellbeing", entity: row })
    }

    if (kind === "g") {
      const [row] = await db
        .select({
          id: gamification.id,
          level: gamification.level,
          xp: gamification.xp,
          tasksCompleted: gamification.tasksCompleted,
          updatedAt: gamification.updatedAt,
          userName: users.name,
        })
        .from(gamification)
        .innerJoin(users, eq(gamification.userId, users.id))
        .where(eq(gamification.id, numeric))
        .limit(1)
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({ activityId: id, entityKind: "gamification", entity: row })
    }

    return NextResponse.json({ error: `Unsupported activity id prefix: ${kind}` }, { status: 400 })
  } catch (error) {
    console.error("Activity detail error:", error)
    return NextResponse.json({ error: "Failed to load activity detail", detail: (error as Error).message }, { status: 500 })
  }
}
