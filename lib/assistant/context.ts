// Workspace assistant context assembly (design §7)
// Reads from an allow-list of 5 core tables, scoped by user_id.
// Returns a structured context pack for Gemini.

import { db } from "@/lib/db"
import { eq, and, desc, gte } from "drizzle-orm"
import {
  tasks,
  taskEvents,
  workLogEntries,
  deliverables,
  workReports,
} from "@/drizzle/schema"

export type AssistantContext = {
  tasks: Array<{
    id: number
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
    startDate: string | null
    discipline: string | null
    assigneeId: number | null
    createdAt: Date | null
  }>
  taskEvents: Array<{
    id: number
    taskId: number
    taskTitle: string
    actorId: number | null
    fromStatus: string
    toStatus: string
    at: Date
    source: string
  }>
  workLogEntries: Array<{
    id: number
    userId: number
    workedOn: string
    taskId: number | null
    taskTitle: string | null
    kind: string
    title: string
    body: string | null
    discipline: string | null
    minutes: number | null
    deliverableId: number | null
    deliverableName: string | null
    source: string
    createdAt: Date
  }>
  deliverables: Array<{
    id: number
    name: string
    type: string
    taskId: number | null
    taskTitle: string | null
    ownerId: number | null
    discipline: string | null
    status: string
    producedOn: string | null
    link: string | null
    createdAt: Date
  }>
  workReports: Array<{
    id: number
    userId: number
    periodType: string
    periodStart: string
    periodEnd: string
    title: string
    template: string
    status: string
    submittedAt: Date | null
    createdAt: Date
  }>
  dataAsOf: string
}

/**
 * Assemble context pack for the workspace assistant.
 * Reads from 5 core tables, scoped by user_id.
 * Returns empty arrays if no data exists.
 */
export async function assembleWorkspaceContext(
  userId: number,
  options?: {
    daysBack?: number
    limit?: number
  }
): Promise<AssistantContext> {
  const daysBack = options?.daysBack ?? 30
  const limit = options?.limit ?? 50

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffDate = cutoff.toISOString().split("T")[0]

  // Query tasks (user's own or unassigned)
  const tasksResult = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      startDate: tasks.startDate,
      discipline: tasks.discipline,
      assigneeId: tasks.assigneeId,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, userId),
        // Include tasks created in the last N days
        gte(tasks.createdAt, cutoff)
      )
    )
    .orderBy(desc(tasks.updatedAt))
    .limit(limit)

  // Query task events for user's tasks
  const taskIds = tasksResult.map((t) => t.id)
  let taskEventsResult: AssistantContext["taskEvents"] = []

  if (taskIds.length > 0) {
    taskEventsResult = await db
      .select({
        id: taskEvents.id,
        taskId: taskEvents.taskId,
        taskTitle: tasks.title,
        actorId: taskEvents.actorId,
        fromStatus: taskEvents.fromStatus,
        toStatus: taskEvents.toStatus,
        at: taskEvents.at,
        source: taskEvents.source,
      })
      .from(taskEvents)
      .innerJoin(tasks, eq(taskEvents.taskId, tasks.id))
      .where(and(gte(taskEvents.at, cutoff)))
      .orderBy(desc(taskEvents.at))
      .limit(limit)
  }

  // Query work log entries
  const workLogResult = await db
    .select({
      id: workLogEntries.id,
      userId: workLogEntries.userId,
      workedOn: workLogEntries.workedOn,
      taskId: workLogEntries.taskId,
      taskTitle: tasks.title,
      kind: workLogEntries.kind,
      title: workLogEntries.title,
      body: workLogEntries.body,
      discipline: workLogEntries.discipline,
      minutes: workLogEntries.minutes,
      deliverableId: workLogEntries.deliverableId,
      deliverableName: deliverables.name,
      source: workLogEntries.source,
      createdAt: workLogEntries.createdAt,
    })
    .from(workLogEntries)
    .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
    .leftJoin(deliverables, eq(workLogEntries.deliverableId, deliverables.id))
    .where(
      and(
        eq(workLogEntries.userId, userId),
        gte(workLogEntries.workedOn, cutoffDate)
      )
    )
    .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.createdAt))
    .limit(limit)

  // Query deliverables
  const deliverablesResult = await db
    .select({
      id: deliverables.id,
      name: deliverables.name,
      type: deliverables.type,
      taskId: deliverables.taskId,
      taskTitle: tasks.title,
      ownerId: deliverables.ownerId,
      discipline: deliverables.discipline,
      status: deliverables.status,
      producedOn: deliverables.producedOn,
      link: deliverables.link,
      createdAt: deliverables.createdAt,
    })
    .from(deliverables)
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(
      and(
        eq(deliverables.ownerId, userId),
        gte(deliverables.createdAt, cutoff)
      )
    )
    .orderBy(desc(deliverables.createdAt))
    .limit(limit)

  // Query work reports
  const workReportsResult = await db
    .select({
      id: workReports.id,
      userId: workReports.userId,
      periodType: workReports.periodType,
      periodStart: workReports.periodStart,
      periodEnd: workReports.periodEnd,
      title: workReports.title,
      template: workReports.template,
      status: workReports.status,
      submittedAt: workReports.submittedAt,
      createdAt: workReports.createdAt,
    })
    .from(workReports)
    .where(eq(workReports.userId, userId))
    .orderBy(desc(workReports.createdAt))
    .limit(limit)

  return {
    tasks: tasksResult,
    taskEvents: taskEventsResult,
    workLogEntries: workLogResult,
    deliverables: deliverablesResult,
    workReports: workReportsResult,
    dataAsOf: new Date().toISOString(),
  }
}

/**
 * Format context pack into a text prompt for Gemini.
 */
export function formatContextForPrompt(context: AssistantContext): string {
  const sections: string[] = []

  sections.push(`Context assembled at ${context.dataAsOf}`)

  // Tasks
  if (context.tasks.length > 0) {
    sections.push(`\n## Tasks (${context.tasks.length})`)
    context.tasks.forEach((task) => {
      const dates = []
      if (task.startDate) dates.push(`start: ${task.startDate}`)
      if (task.dueDate) dates.push(`due: ${task.dueDate}`)
      const dateStr = dates.length > 0 ? ` [${dates.join(", ")}]` : ""
      const discipline = task.discipline ? ` (${task.discipline})` : ""
      sections.push(`- #${task.id}: ${task.title}${discipline} — ${task.status}${dateStr}`)
      if (task.description) {
        sections.push(`  ${task.description.slice(0, 200)}`)
      }
    })
  }

  // Task events
  if (context.taskEvents.length > 0) {
    sections.push(`\n## Recent Task Events (${context.taskEvents.length})`)
    context.taskEvents.forEach((event) => {
      const date = event.at.toISOString().split("T")[0]
      sections.push(
        `- ${date}: "${event.taskTitle}" ${event.fromStatus} → ${event.toStatus}`
      )
    })
  }

  // Work log entries
  if (context.workLogEntries.length > 0) {
    sections.push(`\n## Work Log Entries (${context.workLogEntries.length})`)
    context.workLogEntries.forEach((entry) => {
      const taskRef = entry.taskTitle ? ` [${entry.taskTitle}]` : ""
      const timeStr = entry.minutes ? ` (${entry.minutes}min)` : ""
      const deliverableStr = entry.deliverableName ? ` → ${entry.deliverableName}` : ""
      sections.push(
        `- ${entry.workedOn}: ${entry.title}${taskRef}${timeStr}${deliverableStr}`
      )
      if (entry.body) {
        sections.push(`  ${entry.body.slice(0, 200)}`)
      }
    })
  }

  // Deliverables
  if (context.deliverables.length > 0) {
    sections.push(`\n## Deliverables (${context.deliverables.length})`)
    context.deliverables.forEach((del) => {
      const taskRef = del.taskTitle ? ` [${del.taskTitle}]` : ""
      const dateStr = del.producedOn ? ` (${del.producedOn})` : ""
      sections.push(`- ${del.name} (${del.type})${taskRef} — ${del.status}${dateStr}`)
    })
  }

  // Work reports
  if (context.workReports.length > 0) {
    sections.push(`\n## Work Reports (${context.workReports.length})`)
    context.workReports.forEach((report) => {
      const submitted = report.submittedAt ? "submitted" : "draft"
      sections.push(
        `- ${report.title} (${report.periodType}, ${report.periodStart} to ${report.periodEnd}) — ${submitted}`
      )
    })
  }

  if (sections.length === 1) {
    // Only the timestamp, no data
    return "No work data found for this user in the last 30 days."
  }

  return sections.join("\n")
}
