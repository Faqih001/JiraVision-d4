import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { ensureInstanceHorizon, getTaskInstances } from "@/lib/data-access-task-instances"
import { isCadence, type Cadence } from "@/lib/cadence"
import { localDay } from "@/lib/worklog/local-day"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      taskId: searchParams.get("taskId") ? parseInt(searchParams.get("taskId")!, 10) : undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: searchParams.get("status") || undefined,
    }

    // Reading one task's grid is what keeps it alive. The member who owns it gets the
    // top-up — a viewer must not write rows into someone else's schedule — and the anchor
    // is today, so a template nobody opened for a month catches up instead of filling in
    // days that already passed.
    if (filters.taskId && session) {
      const parent = await db
        .select({ cadence: tasks.cadence, assigneeId: tasks.assigneeId })
        .from(tasks)
        .where(eq(tasks.id, filters.taskId))
        .limit(1)
      const cadence = parent[0]?.cadence
      if (parent[0]?.assigneeId === session.id && isCadence(cadence)) {
        await ensureInstanceHorizon(filters.taskId, cadence as Cadence, localDay(new Date(), session.timezone))
      }
    }

    const instances = await getTaskInstances(filters)
    return NextResponse.json({ success: true, data: instances })
  } catch (error) {
    console.error("Error fetching task instances:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch task instances", error: (error as Error).message },
      { status: 500 }
    )
  }
}
