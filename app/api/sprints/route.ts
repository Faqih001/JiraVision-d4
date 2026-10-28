import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { sprints, tasks } from "@/drizzle/schema"
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { createNotification, notifyMany } from "@/lib/notifications"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ types */

type SprintRow = typeof sprints.$inferSelect

const SPRINT_STATUSES = ["planned", "planning", "active", "completed"] as const

type SprintAggregates = {
  totalPoints: number
  donePoints: number
  taskCount: number
  doneCount: number
  progressPct: number
  daysLeft: number
  endedOnTime: boolean | null
}

interface SprintDto extends SprintAggregates {
  id: number
  name: string
  description: string | null
  startDate: string
  endDate: string
  status: string
  capacity: number
  completed: number
  createdAt: string | null
  updatedAt: string | null
}

/* ------------------------------------------------------------- helpers ---- */

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

/** Legacy behaviour: duplicate seed rows collapsed by name, lowest id wins. */
function dedupeByName(rows: SprintRow[]): SprintRow[] {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
  const seen = new Set<string>()
  const kept = sorted.filter((r) => {
    if (seen.has(r.name)) return false
    seen.add(r.name)
    return true
  })
  return kept.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
}

function computeAggregates(
  sprint: SprintRow,
  agg: { totalPoints: number; donePoints: number; taskCount: number; doneCount: number } | undefined,
  now: Date,
): SprintAggregates {
  const totalPoints = agg?.totalPoints ?? 0
  const donePoints = agg?.donePoints ?? 0
  const taskCount = agg?.taskCount ?? 0
  const doneCount = agg?.doneCount ?? 0
  const end = new Date(`${sprint.endDate}T23:59:59`)
  const isCompleted = sprint.status === "completed"
  const endedOnTime = isCompleted && sprint.updatedAt ? new Date(sprint.updatedAt) <= end : isCompleted ? true : null
  return {
    totalPoints,
    donePoints,
    taskCount,
    doneCount,
    progressPct: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
    daysLeft: isCompleted ? 0 : Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)),
    endedOnTime,
  }
}

function serializeSprint(sprint: SprintRow, agg: SprintAggregates): SprintDto {
  return {
    id: sprint.id,
    name: sprint.name,
    description: sprint.description,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: sprint.status,
    capacity: sprint.capacity,
    completed: sprint.completed,
    createdAt: sprint.createdAt ? new Date(sprint.createdAt).toISOString() : null,
    updatedAt: sprint.updatedAt ? new Date(sprint.updatedAt).toISOString() : null,
    ...agg,
  }
}

/** One grouped query for every sprint id — never a query per row. */
async function loadTaskAggregates(ids: number[]): Promise<
  Map<number, { totalPoints: number; donePoints: number; taskCount: number; doneCount: number }>
> {
  const map = new Map<number, { totalPoints: number; donePoints: number; taskCount: number; doneCount: number }>()
  if (ids.length === 0) return map
  const rows = await db
    .select({
      sprintId: tasks.sprintId,
      totalPoints: sql<number>`coalesce(sum(${tasks.storyPoints}), 0)::int`,
      donePoints: sql<number>`coalesce(sum(case when ${tasks.status} = 'done' then ${tasks.storyPoints} else 0 end), 0)::int`,
      taskCount: sql<number>`count(*)::int`,
      doneCount: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
    })
    .from(tasks)
    .where(inArray(tasks.sprintId, ids))
    .groupBy(tasks.sprintId)
  for (const r of rows) {
    if (r.sprintId === null) continue
    map.set(r.sprintId, { totalPoints: r.totalPoints, donePoints: r.donePoints, taskCount: r.taskCount, doneCount: r.doneCount })
  }
  return map
}

/* ------------------------------------------------------------------- GET */

// GET /api/sprints — dashboard-compatible { success, data } camelCased list.
// Shape is unchanged from the original route; aggregates are additive fields.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")

    const all = await db.select().from(sprints).orderBy(desc(sprints.startDate), asc(sprints.id))
    let rows = dedupeByName(all)
    if (statusFilter && statusFilter !== "all") {
      rows = rows.filter((r) =>
        statusFilter === "planned" ? r.status === "planned" || r.status === "planning" : r.status === statusFilter,
      )
    }

    // `scope=mine`: the member's own board only lists sprints they hold tasks in.
    if (searchParams.get("scope") === "mine") {
      const mySprintRows = await db
        .selectDistinct({ sprintId: tasks.sprintId })
        .from(tasks)
        .where(eq(tasks.assigneeId, session.id))
      const mine = new Set(mySprintRows.map((r) => r.sprintId).filter((id): id is number => id !== null))
      rows = rows.filter((r) => mine.has(r.id))
    }

    const now = new Date()
    const aggMap = await loadTaskAggregates(rows.map((r) => r.id))
    const data = rows.map((r) => serializeSprint(r, computeAggregates(r, aggMap.get(r.id), now)))

    const completed = data.filter((s) => s.status === "completed")
    const onTime = completed.filter((s) => s.endedOnTime === true).length
    const avgVelocity =
      completed.length > 0
        ? Math.round(completed.reduce((sum, s) => sum + (s.donePoints > 0 ? s.donePoints : s.completed), 0) / completed.length)
        : 0
    const active = data.find((s) => s.status === "active") ?? null

    const [myTasksRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, session.id), isNotNull(tasks.sprintId)))

    return NextResponse.json({
      success: true,
      data,
      stats: {
        activeSprintId: active?.id ?? null,
        activeSprintName: active?.name ?? null,
        sprintsCompleted: completed.length,
        sprintsTotal: data.length,
        onTimeRatePct: completed.length > 0 ? Math.round((onTime / completed.length) * 100) : 0,
        avgVelocity,
        myTasksInSprints: myTasksRow?.count ?? 0,
      },
    })
  } catch (error) {
    console.error("Error fetching sprints:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch sprints", error: (error as Error).message },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ POST */

// POST /api/sprints — create a sprint (validated) + notify creator/team.
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Request body is required" }, { status: 400 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ success: false, message: "Sprint name is required" }, { status: 400 })
    }
    if (!isIsoDate(body.startDate) || !isIsoDate(body.endDate)) {
      return NextResponse.json(
        { success: false, message: "startDate and endDate are required (YYYY-MM-DD)" },
        { status: 400 },
      )
    }
    if (new Date(body.endDate) <= new Date(body.startDate)) {
      return NextResponse.json({ success: false, message: "endDate must be after startDate" }, { status: 400 })
    }
    const status = SPRINT_STATUSES.includes(body.status) ? (body.status as string) : "planned"
    const capacity = Number.isFinite(Number(body.capacity)) ? Math.max(0, Math.round(Number(body.capacity))) : 0
    const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null

    const [created] = await db
      .insert(sprints)
      .values({ name, description, startDate: body.startDate, endDate: body.endDate, status, capacity, completed: 0, updatedAt: new Date() })
      .returning()

    // Members with tasks already linked to this sprint (e.g. duplicates) plus the creator.
    const assigneeRows = await db
      .select({ assigneeId: tasks.assigneeId })
      .from(tasks)
      .where(and(eq(tasks.sprintId, created.id), isNotNull(tasks.assigneeId)))
      .groupBy(tasks.assigneeId)
    const teammates = assigneeRows.map((r) => r.assigneeId as number).filter((id) => id !== session.id)

    await createNotification({
      userId: session.id,
      type: "sprint",
      title: `Sprint created: ${created.name}`,
      body: `${created.startDate} → ${created.endDate}${capacity ? ` · capacity ${capacity} pts` : ""}`,
      link: "/dashboard/sprints",
      metadata: { sprintId: created.id, action: "created" },
    })
    if (teammates.length > 0) {
      await notifyMany(teammates, {
        type: "sprint",
        title: `New sprint planned: ${created.name}`,
        body: `${session.name} created "${created.name}" (${created.startDate} → ${created.endDate}).`,
        link: "/dashboard/sprints",
        metadata: { sprintId: created.id, action: "created" },
      })
    }

    const agg = computeAggregates(created, undefined, new Date())
    return NextResponse.json({ success: true, data: serializeSprint(created, agg) }, { status: 201 })
  } catch (error) {
    console.error("Error creating sprint:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create sprint", error: (error as Error).message },
      { status: 500 },
    )
  }
}
