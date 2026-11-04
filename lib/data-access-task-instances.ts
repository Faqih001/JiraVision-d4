import { db } from "@/lib/db"
import { taskInstances, tasks } from "@/drizzle/schema"
import { eq, and, gte, lte, sql, count } from "drizzle-orm"
import { isCadence, type Cadence } from "@/lib/cadence"
import { HORIZON_OCCURRENCES, computeInstanceDates, horizonDates } from "@/lib/tasks/recurrence"
import { isSettledInstanceStatus } from "@/lib/tasks/instance-window"

export type TaskInstance = typeof taskInstances.$inferSelect

export async function getTaskInstances(filters: {
  taskId?: number
  startDate?: string
  endDate?: string
  status?: string
}): Promise<TaskInstance[]> {
  try {
    const conditions = []
    if (filters.taskId) conditions.push(eq(taskInstances.taskId, filters.taskId))
    if (filters.startDate) conditions.push(gte(taskInstances.instanceDate, filters.startDate))
    if (filters.endDate) conditions.push(lte(taskInstances.instanceDate, filters.endDate))
    if (filters.status) conditions.push(eq(taskInstances.status, filters.status))

    const where = conditions.length > 0 ? and(...conditions) : undefined
    return await db.select().from(taskInstances).where(where)
  } catch (error) {
    console.error("Error fetching task instances:", error)
    return []
  }
}

export async function getTaskInstanceById(id: number): Promise<TaskInstance | null> {
  try {
    const results = await db.select().from(taskInstances).where(eq(taskInstances.id, id)).limit(1)
    return results[0] ?? null
  } catch (error) {
    console.error("Error fetching task instance:", error)
    return null
  }
}

export async function updateTaskInstance(
  id: number,
  data: Partial<Pick<TaskInstance, "status" | "notes" | "checklistResponses" | "completedAt" | "completedBy">>,
): Promise<TaskInstance | null> {
  try {
    const results = await db
      .update(taskInstances)
      .set(data)
      .where(eq(taskInstances.id, id))
      .returning()
    return results[0] ?? null
  } catch (error) {
    console.error("Error updating task instance:", error)
    return null
  }
}

export async function createTaskInstance(data: {
  taskId: number
  instanceDate: string
  status?: string
}): Promise<TaskInstance> {
  try {
    const results = await db.insert(taskInstances).values(data).returning()
    return results[0]
  } catch (error) {
    console.error("Error creating task instance:", error)
    throw error
  }
}

/**
 * Top a template's grid up so it always holds `occurrences` scheduled dates from today
 * onward. Returns the dates it wrote — empty when the grid already reached far enough.
 *
 * The anchor is the member's local day, never the end of the old grid: a template nobody
 * opened for a month would otherwise be handed dates in the past, and a row dated last
 * Tuesday that no one worked is a fabricated record. The days that lapsed stay absent,
 * which is what the tasks panel reports as "Missed N days".
 */
export async function ensureInstanceHorizon(
  taskId: number,
  cadence: Cadence,
  todayIso: string,
  occurrences: number = HORIZON_OCCURRENCES,
): Promise<string[]> {
  if (cadence === "one-off") return []

  try {
    const [coverage] = await db
      .select({ held: count() })
      .from(taskInstances)
      .where(and(eq(taskInstances.taskId, taskId), gte(taskInstances.instanceDate, todayIso)))

    const needed = occurrences - Number(coverage?.held ?? 0)
    if (needed <= 0) return []

    const latestResults = await db
      .select({ instanceDate: taskInstances.instanceDate })
      .from(taskInstances)
      .where(eq(taskInstances.taskId, taskId))
      .orderBy(sql`${taskInstances.instanceDate} DESC`)
      .limit(1)

    const dates = horizonDates(cadence, latestResults[0]?.instanceDate ?? null, todayIso, needed)
    if (dates.length === 0) return []

    await db
      .insert(taskInstances)
      .values(dates.map((date) => ({ taskId, instanceDate: date, status: "todo" as const })))
      .onConflictDoNothing()

    return dates
  } catch (error) {
    console.error("Error topping up instance horizon:", error)
    return []
  }
}

/**
 * A template that only became recurring on this request has no grid at all, so the cadence
 * PATCH is where the schedule has to be born. Returns the dates written; nothing happens when
 * the task was already recurring (its grid, and any work on it, must be left alone).
 */
export async function materialiseGridOnCadenceChange(
  taskId: number,
  previousCadence: string | null | undefined,
  nextCadence: string | null | undefined,
  todayIso: string,
): Promise<string[]> {
  if (!isCadence(nextCadence)) return []
  if (previousCadence && previousCadence !== "one-off") return []
  return ensureInstanceHorizon(taskId, nextCadence, todayIso)
}

/**
 * The next occurrence the assignee should act on: the earliest open row from today forward,
 * creating the grid first if it ran out. Null when the schedule has no open occurrence left.
 */
export async function generateNextInstance(taskId: number, todayIso: string): Promise<TaskInstance | null> {
  try {
    const templateResults = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
    const template = templateResults[0]
    if (!template || !template.cadence || template.cadence === "one-off") return null

    await ensureInstanceHorizon(taskId, template.cadence as Cadence, todayIso)

    const open = await db
      .select()
      .from(taskInstances)
      .where(and(eq(taskInstances.taskId, taskId), gte(taskInstances.instanceDate, todayIso)))
      .orderBy(sql`${taskInstances.instanceDate} ASC`)

    return open.find((row) => !isSettledInstanceStatus(row.status)) ?? null
  } catch (error) {
    console.error("Error generating next instance:", error)
    return null
  }
}

export async function generateInitialInstances(
  taskId: number,
  cadence: Cadence,
  startDate?: string,
): Promise<number> {
  if (cadence === "one-off") return 0

  const from = startDate ? new Date(startDate) : new Date()
  const dates = computeInstanceDates(cadence, from)
  if (dates.length === 0) return 0

  try {
    const rows = dates.map((date) => ({ taskId, instanceDate: date, status: "todo" as const }))
    const result = await db
      .insert(taskInstances)
      .values(rows)
      .onConflictDoNothing()
    return result.length > 0 ? result.length : rows.length
  } catch (error) {
    console.error("Error generating initial instances:", error)
    return 0
  }
}
