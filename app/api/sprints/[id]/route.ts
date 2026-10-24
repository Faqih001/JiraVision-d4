import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { sprints, tasks, users } from "@/drizzle/schema"
import { and, desc, eq, isNotNull, sql } from "drizzle-orm"
import { createNotification, notifyMany } from "@/lib/notifications"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

type SprintRow = typeof sprints.$inferSelect
type TaskRow = typeof tasks.$inferSelect

const SPRINT_STATUSES = ["planned", "planning", "active", "completed"] as const

/* ------------------------------------------------------------- helpers ---- */

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

function serializeSprint(sprint: SprintRow) {
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
  }
}

async function getAggregates(sprint: SprintRow) {
  const rows = await db
    .select({
      totalPoints: sql<number>`coalesce(sum(${tasks.storyPoints}), 0)::int`,
      donePoints: sql<number>`coalesce(sum(case when ${tasks.status} = 'done' then ${tasks.storyPoints} else 0 end), 0)::int`,
      taskCount: sql<number>`count(*)::int`,
      doneCount: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
    })
    .from(tasks)
    .where(eq(tasks.sprintId, sprint.id))
  const agg = rows[0] ?? { totalPoints: 0, donePoints: 0, taskCount: 0, doneCount: 0 }
  const end = new Date(`${sprint.endDate}T23:59:59`)
  const now = new Date()
  const isCompleted = sprint.status === "completed"
  const endedOnTime = isCompleted && sprint.updatedAt ? new Date(sprint.updatedAt) <= end : isCompleted ? true : null
  return {
    ...agg,
    progressPct: agg.totalPoints > 0 ? Math.round((agg.donePoints / agg.totalPoints) * 100) : 0,
    daysLeft: isCompleted ? 0 : Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)),
    endedOnTime,
  }
}

type BurndownPoint = { date: string; label: string; ideal: number | null; actual: number | null }

// Ideal-vs-remaining curve from task completion timestamps — same computation
// style as lib/dashboard-data.ts, scoped to one sprint.
function buildBurndown(sprint: SprintRow, sprintTasks: TaskRow[]): BurndownPoint[] {
  const totalPoints = sprintTasks.reduce((s, t) => s + t.storyPoints, 0)
  const start = new Date(`${sprint.startDate}T00:00:00`)
  const end = new Date(`${sprint.endDate}T23:59:59`)
  const todayIso = isoDay(new Date())
  const days = Math.max(1, daysBetween(start, end))
  const idealStep = totalPoints / days

  const completedByDay = new Map<string, number>()
  for (const t of sprintTasks) {
    if (t.status !== "done" || !t.updatedAt) continue
    const key = isoDay(new Date(t.updatedAt))
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + t.storyPoints)
  }

  const points: BurndownPoint[] = []
  let remaining = totalPoints
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getTime() + i * 86_400_000)
    const key = isoDay(d)
    if (d <= end) remaining -= completedByDay.get(key) ?? 0
    points.push({
      date: key,
      label: dayLabel(key),
      ideal: Math.max(0, Math.round(totalPoints - idealStep * i)),
      actual: key <= todayIso ? Math.max(0, Math.round(remaining)) : null,
    })
  }
  return points
}

async function getTeamCapacity(sprintId: number) {
  return db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      taskCount: sql<number>`count(*)::int`,
      points: sql<number>`coalesce(sum(${tasks.storyPoints}), 0)::int`,
      donePoints: sql<number>`coalesce(sum(case when ${tasks.status} = 'done' then ${tasks.storyPoints} else 0 end), 0)::int`,
      openPoints: sql<number>`coalesce(sum(case when ${tasks.status} <> 'done' then ${tasks.storyPoints} else 0 end), 0)::int`,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assigneeId))
    .where(eq(tasks.sprintId, sprintId))
    .groupBy(users.id, users.name, users.avatar)
    .orderBy(desc(sql`coalesce(sum(${tasks.storyPoints}), 0)`))
}

// Scope change approximation: tasks created after the sprint window opened,
// or touched (updatedAt) inside the window after the sprint started.
function getScopeChanges(sprint: SprintRow, sprintTasks: TaskRow[]) {
  const start = new Date(`${sprint.startDate}T00:00:00`)
  const end = new Date(`${sprint.endDate}T23:59:59`)
  return sprintTasks
    .filter((t) => {
      const created = t.createdAt ? new Date(t.createdAt) : null
      const updated = t.updatedAt ? new Date(t.updatedAt) : null
      const addedAfterStart = created !== null && created > start
      const touchedInWindow = updated !== null && updated >= start && updated <= end && created !== null && created >= start
      return addedAfterStart || touchedInWindow
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      storyPoints: t.storyPoints,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
    }))
}

async function getSprint(id: number): Promise<SprintRow | null> {
  const [row] = await db.select().from(sprints).where(eq(sprints.id, id))
  return row ?? null
}

async function sprintAssigneeIds(sprintId: number, excludeUserId: number): Promise<number[]> {
  const rows = await db
    .select({ assigneeId: tasks.assigneeId })
    .from(tasks)
    .where(and(eq(tasks.sprintId, sprintId), isNotNull(tasks.assigneeId)))
    .groupBy(tasks.assigneeId)
  return rows.map((r) => r.assigneeId as number).filter((uid) => uid !== excludeUserId)
}

/* ------------------------------------------------------------------- GET */

// GET /api/sprints/[id] — sprint + aggregates + computed chart payloads.
export async function GET(_request: Request, context: RouteContext) {
  const { id: idParam } = await context.params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid sprint ID" }, { status: 400 })
    }

    const sprint = await getSprint(id)
    if (!sprint) {
      return NextResponse.json({ success: false, message: "Sprint not found" }, { status: 404 })
    }

    const sprintTasks = await db.select().from(tasks).where(eq(tasks.sprintId, id))
    const [aggregates, teamCapacity] = await Promise.all([getAggregates(sprint), getTeamCapacity(id)])

    return NextResponse.json({
      success: true,
      data: {
        ...serializeSprint(sprint),
        ...aggregates,
        burndown: buildBurndown(sprint, sprintTasks),
        teamCapacity,
        scopeChanges: getScopeChanges(sprint, sprintTasks),
        taskCount: sprintTasks.length,
      },
    })
  } catch (error) {
    console.error(`Error fetching sprint ${idParam}:`, error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch sprint", error: (error as Error).message },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------- PUT */

// PUT /api/sprints/[id] — partial update, progress recalculation and
// planned→active→completed transitions with notifications.
export async function PUT(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid sprint ID" }, { status: 400 })
    }

    const existing = await getSprint(id)
    if (!existing) {
      return NextResponse.json({ success: false, message: "Sprint not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Request body is required" }, { status: 400 })
    }

    const patch: Partial<SprintRow> = { updatedAt: new Date() }

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name) return NextResponse.json({ success: false, message: "Sprint name cannot be empty" }, { status: 400 })
      patch.name = name
    }
    if (body.description !== undefined) {
      patch.description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null
    }
    if (body.startDate !== undefined) {
      if (!isIsoDate(body.startDate)) {
        return NextResponse.json({ success: false, message: "startDate must be YYYY-MM-DD" }, { status: 400 })
      }
      patch.startDate = body.startDate
    }
    if (body.endDate !== undefined) {
      if (!isIsoDate(body.endDate)) {
        return NextResponse.json({ success: false, message: "endDate must be YYYY-MM-DD" }, { status: 400 })
      }
      patch.endDate = body.endDate
    }
    if (
      (patch.startDate ?? existing.startDate) &&
      (patch.endDate ?? existing.endDate) &&
      new Date(patch.endDate ?? existing.endDate) <= new Date(patch.startDate ?? existing.startDate)
    ) {
      return NextResponse.json({ success: false, message: "endDate must be after startDate" }, { status: 400 })
    }
    if (body.capacity !== undefined) {
      if (!Number.isFinite(Number(body.capacity)) || Number(body.capacity) < 0) {
        return NextResponse.json({ success: false, message: "capacity must be a non-negative number" }, { status: 400 })
      }
      patch.capacity = Math.round(Number(body.capacity))
    }

    const normalize = (s: string) => (s === "planning" ? "planned" : s)
    let statusTransition: "started" | "completed" | null = null
    if (body.status !== undefined) {
      if (!SPRINT_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { success: false, message: `status must be one of: ${SPRINT_STATUSES.join(", ")}` },
          { status: 400 },
        )
      }
      const from = normalize(existing.status)
      const to = normalize(body.status as string)
      if (from !== to) {
        const allowed = (from === "planned" && to === "active") || (from === "active" && to === "completed")
        if (!allowed) {
          return NextResponse.json(
            { success: false, message: `Invalid status transition: ${existing.status} → ${body.status}` },
            { status: 400 },
          )
        }
        statusTransition = to === "active" ? "started" : "completed"
      }
      patch.status = body.status as string
    }

    await db.update(sprints).set(patch).where(eq(sprints.id, id))

    // Recalculate progress from live task data on every write.
    const fresh = await getSprint(id)
    if (!fresh) {
      return NextResponse.json({ success: false, message: "Sprint not found" }, { status: 404 })
    }
    const aggregates = await getAggregates(fresh)
    if (aggregates.donePoints !== fresh.completed) {
      await db.update(sprints).set({ completed: aggregates.donePoints }).where(eq(sprints.id, id))
      fresh.completed = aggregates.donePoints
    }

    if (statusTransition) {
      const teammates = await sprintAssigneeIds(id, session.id)
      const baseMeta = { sprintId: id, action: statusTransition }
      const title =
        statusTransition === "started"
          ? `Sprint started: ${fresh.name}`
          : `Sprint completed: ${fresh.name}`
      const bodyText =
        statusTransition === "started"
          ? `${session.name} kicked off "${fresh.name}" (${fresh.startDate} → ${fresh.endDate}) with ${aggregates.taskCount} tasks.`
          : `"${fresh.name}" closed at ${aggregates.progressPct}% (${aggregates.donePoints}/${aggregates.totalPoints} points).`
      await createNotification({
        userId: session.id,
        type: "sprint",
        title,
        body: bodyText,
        link: "/dashboard/sprints",
        metadata: baseMeta,
      })
      if (teammates.length > 0) {
        await notifyMany(teammates, {
          type: "sprint",
          title,
          body: bodyText,
          link: "/dashboard/sprints",
          metadata: baseMeta,
        })
      }
    }

    return NextResponse.json({ success: true, data: { ...serializeSprint(fresh), ...aggregates } })
  } catch (error) {
    console.error(`Error updating sprint ${idParam}:`, error)
    return NextResponse.json(
      { success: false, message: "Failed to update sprint", error: (error as Error).message },
      { status: 500 },
    )
  }
}

/* ---------------------------------------------------------------- DELETE */

// DELETE /api/sprints/[id] — unlinks sprint tasks (back to backlog),
// deletes the sprint and notifies everyone affected.
export async function DELETE(_request: Request, context: RouteContext) {
  const { id: idParam } = await context.params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid sprint ID" }, { status: 400 })
    }

    const sprint = await getSprint(id)
    if (!sprint) {
      return NextResponse.json({ success: false, message: "Sprint not found" }, { status: 404 })
    }

    const teammates = await sprintAssigneeIds(id, session.id)
    const openTaskCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.sprintId, id), sql`${tasks.status} <> 'done'`))
      .then((r) => r[0]?.count ?? 0)

    await db.update(tasks).set({ sprintId: null, updatedAt: new Date() }).where(eq(tasks.sprintId, id))
    const [deleted] = await db.delete(sprints).where(eq(sprints.id, id)).returning()

    const bodyText = `${sprint.name} (${sprint.startDate} → ${sprint.endDate}) was removed; its ${openTaskCount || "linked"} tasks moved to the backlog.`
    await createNotification({
      userId: session.id,
      type: "sprint",
      title: `Sprint deleted: ${sprint.name}`,
      body: bodyText,
      link: "/dashboard/sprints",
      metadata: { sprintId: id, action: "deleted" },
    })
    if (teammates.length > 0) {
      await notifyMany(teammates, {
        type: "sprint",
        title: `Sprint deleted: ${sprint.name}`,
        body: bodyText,
        link: "/dashboard/sprints",
        metadata: { sprintId: id, action: "deleted" },
      })
    }

    return NextResponse.json({ success: true, data: serializeSprint(deleted) })
  } catch (error) {
    console.error(`Error deleting sprint ${idParam}:`, error)
    return NextResponse.json(
      { success: false, message: "Failed to delete sprint", error: (error as Error).message },
      { status: 500 },
    )
  }
}
