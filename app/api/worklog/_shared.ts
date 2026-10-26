// Server-only helpers for /api/worklog/*. Envelope shapes match app/api/reports/_shared.ts
// so the page's fetch layer is one function, not two.

import { NextResponse } from "next/server"
import { eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { deliverables, tasks, workLogEntries } from "@/drizzle/schema"
import type { DeliverableDto, EntryDto } from "@/lib/worklog/entries"
import type { ViewState } from "@/lib/worklog/view-state"

export function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, message }, { status: 400 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ success: false, message }, { status: 404 })
}

export function serverError(error: unknown, action: string) {
  console.error(`Error during ${action}:`, error)
  const message = error instanceof Error ? error.message : String(error)
  return NextResponse.json(
    { success: false, message: `Failed to ${action}`, error: message },
    { status: 500 },
  )
}

export async function worklogSession() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return null
  return { id: session.id, timezone: session.timezone ?? null }
}

export type EntryRow = {
  id: number
  workedOn: string
  taskId: number | null
  taskTitle: string | null
  kind: string
  title: string
  body: string | null
  discipline: string | null
  minutes: number | null
  deliverableId: number | null
  playbookId: number | null
  playbookVersion: number | null
  links: unknown
  source: string
  redatedAt: Date | null
  createdAt: Date
}

// One column list, so the list route, the row route and the bulk route hand back identical
// shapes and a section never has to guess which fields came with its rows.
export const entryColumns = {
  id: workLogEntries.id,
  workedOn: workLogEntries.workedOn,
  taskId: workLogEntries.taskId,
  taskTitle: tasks.title,
  kind: workLogEntries.kind,
  title: workLogEntries.title,
  body: workLogEntries.body,
  discipline: workLogEntries.discipline,
  minutes: workLogEntries.minutes,
  deliverableId: workLogEntries.deliverableId,
  playbookId: workLogEntries.playbookId,
  playbookVersion: workLogEntries.playbookVersion,
  links: workLogEntries.links,
  source: workLogEntries.source,
  redatedAt: workLogEntries.redatedAt,
  createdAt: workLogEntries.createdAt,
} as const

// A `date` column comes back as "YYYY-MM-DD" already; only the timestamptz columns need
// ISO conversion. `kind` is already whitelisted by the vocabulary module on the way in.
export function mapEntry(row: EntryRow): EntryDto {
  return {
    id: row.id,
    workedOn: row.workedOn,
    taskId: row.taskId,
    taskTitle: row.taskTitle ?? null,
    kind: row.kind as EntryDto["kind"],
    title: row.title,
    body: row.body ?? null,
    discipline: row.discipline as EntryDto["discipline"],
    minutes: row.minutes,
    deliverableId: row.deliverableId,
    playbookId: row.playbookId,
    playbookVersion: row.playbookVersion,
    links: Array.isArray(row.links) ? (row.links as string[]) : [],
    source: row.source as EntryDto["source"],
    redatedAt: row.redatedAt ? row.redatedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

export type DeliverableRow = {
  id: number
  name: string
  type: string
  status: string
  producedOn: string | null
  link: string | null
  evidence: string | null
  taskId: number | null
  taskTitle: string | null
  discipline: string | null
  entryCount: number | null
  createdAt: Date
}

export const deliverableColumns = {
  id: deliverables.id,
  name: deliverables.name,
  type: deliverables.type,
  status: deliverables.status,
  producedOn: deliverables.producedOn,
  link: deliverables.link,
  evidence: deliverables.evidence,
  taskId: deliverables.taskId,
  taskTitle: tasks.title,
  discipline: deliverables.discipline,
  createdAt: deliverables.createdAt,
} as const

export function mapDeliverable(row: DeliverableRow): DeliverableDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type as DeliverableDto["type"],
    status: row.status as DeliverableDto["status"],
    producedOn: row.producedOn ?? null,
    link: row.link ?? null,
    evidence: row.evidence ?? null,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    discipline: row.discipline as DeliverableDto["discipline"],
    entryCount: row.entryCount ?? 0,
    createdAt: row.createdAt.toISOString(),
  }
}

// The full read shape for a deliverable. `entryCount` is a correlated subquery rather than
// a join because a join would multiply the rows the board counts. It lives here, not in a
// route file: a route.ts may export handlers and config, and a shared SQL fragment exported
// from one route into another is exactly the shape that breaks Next's route type check.
export const deliverableSelect = {
  ...deliverableColumns,
  entryCount: sql<number>`(
    select count(*) from work_log_entries w
    where w.deliverable_id = ${deliverables.id} and w.user_id = ${deliverables.ownerId}
  )::int`,
}

/** `postgres` error codes, surfaced as a 400 instead of a 500 with a stack in the body. */
export function isForeignKeyViolation(error: unknown): boolean {
  return (error as { code?: string }).code === "23503"
}

/** `%` and `_` are wildcards; a search for "100_" must not match "1001". */
export function likePattern(raw: string): string {
  return `%${raw.replace(/[\\%_]/gu, (c) => `\\${c}`)}%`
}

/**
 * The single filter vocabulary for the work log. The page, `GET /api/worklog/entries` and
 * `GET /api/worklog/summary` all call this, so the number a shared URL shows can never be
 * produced by a different predicate than the list under it. `userId` is not optional.
 */
export function entryFilters(state: ViewState, userId: number, from: string, to: string): SQL[] {
  const conditions: SQL[] = [
    eq(workLogEntries.userId, userId),
    gte(workLogEntries.workedOn, from),
    lte(workLogEntries.workedOn, to),
  ]
  if (state.kind !== "all") conditions.push(eq(workLogEntries.kind, state.kind))
  if (state.discipline !== "all") conditions.push(eq(workLogEntries.discipline, state.discipline))
  if (state.taskId !== null) conditions.push(eq(workLogEntries.taskId, state.taskId))
  if (state.hasDeliverable) conditions.push(isNotNull(workLogEntries.deliverableId))
  if (state.q.trim()) {
    const pattern = likePattern(state.q.trim())
    conditions.push(sql`(${workLogEntries.title} ilike ${pattern} or ${workLogEntries.body} ilike ${pattern})`)
  }
  if (state.deliverableStatus !== "all") {
    // A subquery, not a join, so a status filter cannot multiply the rows.
    conditions.push(
      sql`exists (select 1 from ${deliverables} d where d.id = ${workLogEntries.deliverableId} and d.status = ${state.deliverableStatus} and d.owner_id = ${userId})`,
    )
  }
  return conditions
}
