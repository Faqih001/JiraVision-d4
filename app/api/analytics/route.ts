import { NextResponse } from "next/server"
import { and, asc, eq, gte, isNotNull } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { sprints, sprintAnalytics, tasks, users, wellbeingMetrics } from "@/drizzle/schema"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ types */

export interface AnalyticsFilters {
  rangeDays: number | null
  sprintId: number | null
  priority: string | null
}

interface TaskRow {
  id: number
  status: string
  priority: string
  storyPoints: number
  createdAt: Date | null
  updatedAt: Date | null
  dueDate: string | null
  assigneeId: number | null
  sprintId: number | null
}

/* ---------------------------------------------------------------- helpers */

const DAY_MS = 86_400_000

function isoWeekStart(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (t.getUTCDay() + 6) % 7 // Monday = 0
  t.setUTCDate(t.getUTCDate() - dow)
  return t.toISOString().slice(0, 10)
}

function weekLabel(isoMonday: string): string {
  const d = new Date(`${isoMonday}T00:00:00`)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function parseFilters(searchParams: URLSearchParams): AnalyticsFilters {
  const rangeRaw = searchParams.get("rangeDays")
  let rangeDays: number | null = null
  if (rangeRaw && rangeRaw !== "all") {
    const n = parseInt(rangeRaw, 10)
    if (Number.isFinite(n) && n > 0) rangeDays = Math.min(n, 730)
  }
  const sprintRaw = searchParams.get("sprintId")
  let sprintId: number | null = null
  if (sprintRaw && sprintRaw !== "all") {
    const n = parseInt(sprintRaw, 10)
    if (Number.isFinite(n) && n > 0) sprintId = n
  }
  const priorityRaw = searchParams.get("priority")
  const priority =
    priorityRaw && priorityRaw !== "all" && ["urgent", "high", "medium", "low"].includes(priorityRaw)
      ? priorityRaw
      : null
  return { rangeDays, sprintId, priority }
}

/* -------------------------------------------------------------------- GET */

// GET /api/analytics?rangeDays=90&sprintId=all&priority=all
// Server-side aggregation over tasks / sprints / sprint_analytics /
// wellbeing_metrics. Every number comes from real rows; empty tables produce
// empty series and null metrics, never placeholders.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = parseFilters(searchParams)
    const now = new Date()
    const todayIso = now.toISOString().slice(0, 10)
    const since = filters.rangeDays ? new Date(now.getTime() - filters.rangeDays * DAY_MS) : null

    const conditions = []
    if (since) conditions.push(gte(tasks.createdAt, since))
    if (filters.sprintId !== null) conditions.push(eq(tasks.sprintId, filters.sprintId))
    if (filters.priority) conditions.push(eq(tasks.priority, filters.priority))
    const taskWhere = conditions.length > 0 ? and(...conditions) : undefined

    const [taskRows, sprintRows, analyticsRows, memberRows, wellbeingRows, sprintTaskRows] =
      await Promise.all([
        db
          .select({
            id: tasks.id,
            status: tasks.status,
            priority: tasks.priority,
            storyPoints: tasks.storyPoints,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
            dueDate: tasks.dueDate,
            assigneeId: tasks.assigneeId,
            sprintId: tasks.sprintId,
          })
          .from(tasks)
          .where(taskWhere),

        db.select().from(sprints).orderBy(asc(sprints.startDate), asc(sprints.id)),

        db
          .select({
            sprintId: sprintAnalytics.sprintId,
            velocity: sprintAnalytics.velocity,
            completionRate: sprintAnalytics.completionRate,
          })
          .from(sprintAnalytics),

        db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users),

        db
          .select({ date: wellbeingMetrics.date, score: wellbeingMetrics.wellbeingScore })
          .from(wellbeingMetrics)
          .where(isNotNull(wellbeingMetrics.date))
          .orderBy(asc(wellbeingMetrics.date)),

        db
          .select({ sprintId: tasks.sprintId, createdAt: tasks.createdAt })
          .from(tasks)
          .where(isNotNull(tasks.sprintId)),
      ])

    const memberName = new Map(memberRows.map((m) => [m.id, m.name]))
    const sprintById = new Map(sprintRows.map((s) => [s.id, s]))

    // ---- sprint-derived metrics -------------------------------------------
    const completedSprints = sprintRows.filter((s) => s.status === "completed")
    const analyticsBySprint = new Map<number, { velocity: number; completionRate: number }>()
    for (const a of analyticsRows) {
      const prev = analyticsBySprint.get(a.sprintId)
      if (!prev || a.velocity > prev.velocity) {
        analyticsBySprint.set(a.sprintId, { velocity: a.velocity, completionRate: a.completionRate })
      }
    }
    const sprintVelocity = (s: (typeof sprintRows)[number]) =>
      analyticsBySprint.get(s.id)?.velocity ?? (s.completed > 0 ? s.completed : 0)

    const avgVelocity =
      completedSprints.length > 0
        ? Math.round(completedSprints.reduce((sum, s) => sum + sprintVelocity(s), 0) / completedSprints.length)
        : 0

    const completionRates = completedSprints
      .map((s) => {
        const explicit = analyticsBySprint.get(s.id)
        if (explicit && explicit.completionRate > 0) return explicit.completionRate
        return s.capacity > 0 ? Math.round((s.completed / s.capacity) * 100) : null
      })
      .filter((v): v is number => v !== null)
    const sprintCompletionPct =
      completionRates.length > 0
        ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
        : null

    const velocity = completedSprints.slice(-8).map((s) => ({
      name: s.name,
      committed: s.capacity,
      completed: sprintVelocity(s),
      endDate: s.endDate,
    }))

    // ---- task-derived metrics ---------------------------------------------
    const doneTasks = taskRows.filter((t: TaskRow) => t.status === "done")
    const openTasks = taskRows.filter((t: TaskRow) => t.status !== "done")

    // Cycle-time proxy: median(updatedAt - createdAt) over done tasks.
    const cycleDays = doneTasks
      .filter((t) => t.createdAt && t.updatedAt)
      .map((t) => Math.max(0, (t.updatedAt!.getTime() - t.createdAt!.getTime()) / DAY_MS))
    const cycleTimeDays = median(cycleDays)

    // Weekly throughput from done tasks' updatedAt week.
    const weeksIn = since ? Math.max(1, Math.ceil((now.getTime() - since.getTime()) / (7 * DAY_MS))) : null
    const weeklyDone = new Map<string, { doneTasks: number; donePoints: number }>()
    for (const t of doneTasks) {
      if (!t.updatedAt) continue
      const key = isoWeekStart(t.updatedAt)
      const agg = weeklyDone.get(key) ?? { doneTasks: 0, donePoints: 0 }
      agg.doneTasks += 1
      agg.donePoints += t.storyPoints
      weeklyDone.set(key, agg)
    }
    let throughput = [...weeklyDone.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, agg]) => ({ label: weekLabel(week), week, ...agg }))
    if (weeksIn !== null) throughput = throughput.slice(-weeksIn)
    else throughput = throughput.slice(-12)
    const throughputPerWeek =
      weeklyDone.size > 0
        ? round1(
            [...weeklyDone.values()].reduce((s, w) => s + w.doneTasks, 0) /
              Math.max(1, weeksIn ?? Math.min(12, weeklyDone.size)),
          )
        : 0

    // On-time %: done tasks with a due date, closed on/before that date.
    const doneWithDue = doneTasks.filter((t) => t.dueDate && t.updatedAt)
    const onTimePct =
      doneWithDue.length > 0
        ? Math.round(
            (doneWithDue.filter((t) => new Date(`${t.dueDate}T23:59:59`) >= t.updatedAt!).length /
              doneWithDue.length) *
              100,
          )
        : null

    const blockedTasks = taskRows.filter((t: TaskRow) => t.status === "blocked")
    const blockedRatioPct = taskRows.length > 0 ? Math.round((blockedTasks.length / taskRows.length) * 100) : 0

    // Scope creep: tasks attached to a sprint whose createdAt lands after the
    // sprint start date, per sprint (last 6 chronologically).
    const recentSprints = sprintRows.slice(-6)
    const scopeCreep = recentSprints.map((s) => {
      const members = sprintTaskRows.filter((r) => r.sprintId === s.id)
      const startTs = new Date(`${s.startDate}T00:00:00`).getTime()
      const addedAfterStart = members.filter((r) => r.createdAt && r.createdAt.getTime() > startTs).length
      return { name: s.name, total: members.length, addedAfterStart }
    })

    const priorityOrder = ["urgent", "high", "medium", "low"]
    const priorityMix = priorityOrder
      .map((p) => ({ name: p, value: taskRows.filter((t: TaskRow) => t.priority === p).length }))
      .filter((d) => d.value > 0)

    // Due-date histogram over open tasks.
    const buckets = { overdue: 0, thisWeek: 0, nextWeek: 0, later: 0 }
    const weekAhead = new Date(now.getTime() + 7 * DAY_MS).toISOString().slice(0, 10)
    const twoWeeksAhead = new Date(now.getTime() + 14 * DAY_MS).toISOString().slice(0, 10)
    for (const t of openTasks) {
      if (!t.dueDate) continue
      if (t.dueDate < todayIso) buckets.overdue += 1
      else if (t.dueDate <= weekAhead) buckets.thisWeek += 1
      else if (t.dueDate <= twoWeeksAhead) buckets.nextWeek += 1
      else buckets.later += 1
    }

    const workloadMap = new Map<number, { openTasks: number; openPoints: number }>()
    for (const t of openTasks) {
      if (t.assigneeId === null) continue
      const agg = workloadMap.get(t.assigneeId) ?? { openTasks: 0, openPoints: 0 }
      agg.openTasks += 1
      agg.openPoints += t.storyPoints
      workloadMap.set(t.assigneeId, agg)
    }
    const assigneeWorkload = [...workloadMap.entries()]
      .map(([id, agg]) => ({
        id,
        name: memberName.get(id) ?? `User ${id}`,
        openTasks: agg.openTasks,
        openPoints: agg.openPoints,
      }))
      .sort((a, b) => b.openPoints - a.openPoints || a.name.localeCompare(b.name))
      .slice(0, 8)

    const blockedMap = new Map<number, number>()
    for (const t of blockedTasks) {
      const key = t.assigneeId ?? 0
      blockedMap.set(key, (blockedMap.get(key) ?? 0) + 1)
    }
    const blockedByMember = [...blockedMap.entries()]
      .map(([id, count]) => ({
        name: id === 0 ? "Unassigned" : (memberName.get(id) ?? `User ${id}`),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Wellbeing vs velocity: for each of the last 6 completed sprints, the
    // team-average wellbeing score logged inside the sprint window.
    const wellbeingVsVelocity = completedSprints.slice(-6).map((s) => {
      const startTs = new Date(`${s.startDate}T00:00:00`).getTime()
      const endTs = new Date(`${s.endDate}T23:59:59`).getTime()
      const inWindow = wellbeingRows.filter((w) => {
        const ts = new Date(`${w.date}T12:00:00`).getTime()
        return ts >= startTs && ts <= endTs
      })
      return {
        sprint: s.name,
        velocity: sprintVelocity(s),
        wellbeing:
          inWindow.length > 0
            ? Math.round(inWindow.reduce((sum, w) => sum + w.score, 0) / inWindow.length)
            : null,
      }
    })

    const activeSprintRow = sprintRows.find((s) => s.status === "active") ?? null

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        filters,
        sprintOptions: sprintRows.map((s) => ({ id: s.id, name: s.name, status: s.status })),
        activeSprint: activeSprintRow
          ? {
              id: activeSprintRow.id,
              name: activeSprintRow.name,
              startDate: activeSprintRow.startDate,
              endDate: activeSprintRow.endDate,
            }
          : null,
        kpis: {
          totalTasks: taskRows.length,
          openTasks: openTasks.length,
          avgVelocity,
          cycleTimeDays: cycleTimeDays === null ? null : round1(cycleTimeDays),
          throughputPerWeek,
          sprintCompletionPct,
          onTimePct,
          blockedRatioPct,
        },
        series: {
          velocity,
          throughput,
          scopeCreep,
          priorityMix,
          dueBuckets: buckets,
          assigneeWorkload,
          blockedByMember,
          wellbeingVsVelocity,
        },
        // Raw rows so the client can build the cumulative-flow series and CSV
        // export without a second round-trip set of approximations.
        taskRows: taskRows.map((t: TaskRow) => ({
          id: t.id,
          status: t.status,
          priority: t.priority,
          storyPoints: t.storyPoints,
          createdAt: t.createdAt ? t.createdAt.toISOString() : null,
          updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
          dueDate: t.dueDate,
          assigneeId: t.assigneeId,
          sprintId: t.sprintId,
          assigneeName: t.assigneeId === null ? null : (memberName.get(t.assigneeId) ?? null),
          sprintName: t.sprintId === null ? null : (sprintById.get(t.sprintId)?.name ?? null),
        })),
      },
    })
  } catch (error) {
    console.error("Analytics aggregation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to build analytics snapshot",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
