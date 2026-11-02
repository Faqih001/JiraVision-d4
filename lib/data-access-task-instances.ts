import { db } from "@/lib/db"
import { taskInstances, tasks } from "@/drizzle/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"
import { computeNextRun, type Cadence } from "@/lib/cadence"
import { computeInstanceDates } from "@/lib/tasks/recurrence"

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

export async function generateNextInstance(taskId: number): Promise<TaskInstance | null> {
  try {
    const templateResults = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
    const template = templateResults[0]
    if (!template || !template.cadence || template.cadence === "one-off") return null

    const latestResults = await db
      .select()
      .from(taskInstances)
      .where(eq(taskInstances.taskId, taskId))
      .orderBy(sql`${taskInstances.instanceDate} DESC`)
      .limit(1)

    const latest = latestResults[0]
    if (!latest) return null

    const nextDateIso = computeNextRun(template.cadence as Cadence, new Date(latest.instanceDate!))
    if (!nextDateIso) return null

    const nextDate = nextDateIso.slice(0, 10)

    const existing = await db
      .select()
      .from(taskInstances)
      .where(and(eq(taskInstances.taskId, taskId), eq(taskInstances.instanceDate, nextDate)))
      .limit(1)

    if (existing.length > 0) return existing[0]

    return await createTaskInstance({ taskId, instanceDate: nextDate, status: "todo" })
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
    let inserted = 0
    for (const date of dates) {
      try {
        await db
          .insert(taskInstances)
          .values({ taskId, instanceDate: date, status: "todo" })
          .onConflictDoNothing()
        inserted++
      } catch {
        // Unique constraint violation — skip
      }
    }
    return inserted
  } catch (error) {
    console.error("Error generating initial instances:", error)
    return 0
  }
}
