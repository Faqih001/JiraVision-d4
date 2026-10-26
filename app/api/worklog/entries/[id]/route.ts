// /api/worklog/entries/[id] — edit or delete one of your own rows.
// Ownership is a condition of the statement, not a check that happens before it, so a
// missing id and someone else's id produce the same 404 and leak nothing.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks, workLogEntries } from "@/drizzle/schema"
import { pickEntryUpdates, type EntryCurrent, type EntryPatch } from "@/lib/worklog/entry-fields"
import {
  badRequest,
  entryColumns,
  isForeignKeyViolation,
  mapEntry,
  notFound,
  serverError,
  unauthorized,
  worklogSession,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function loadOwned(id: number, userId: number) {
  const [row] = await db
    .select(entryColumns)
    .from(workLogEntries)
    .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
    .where(and(eq(workLogEntries.id, id), eq(workLogEntries.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function PUT(request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Entry id must be a positive integer")

  try {
    const existing = await loadOwned(numericId, session.id)
    if (!existing) return notFound("Entry not found")

    const body = await request.json().catch(() => null)
    const current: EntryCurrent = {
      workedOn: existing.workedOn,
      minutes: existing.minutes,
      kind: existing.kind as EntryCurrent["kind"],
      deliverableId: existing.deliverableId,
    }
    const result = pickEntryUpdates(body, current)
    if ("error" in result) return badRequest(result.error)

    const set: EntryPatch & { updatedAt: Date; redatedAt?: Date } = { ...result.patch, updatedAt: new Date() }
    if (result.redated) set.redatedAt = new Date()

    const updated = await db
      .update(workLogEntries)
      .set(set)
      .where(and(eq(workLogEntries.id, numericId), eq(workLogEntries.userId, session.id)))
      .returning({ id: workLogEntries.id })

    if (updated.length === 0) return notFound("Entry not found")

    // Re-read for the joined task title: .returning() can only see this table.
    const refreshed = await loadOwned(numericId, session.id)
    return NextResponse.json({ success: true, data: { entry: mapEntry(refreshed ?? existing) } })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task or deliverable no longer exists.")
    return serverError(error, "update work log entry")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Entry id must be a positive integer")

  try {
    const deleted = await db
      .delete(workLogEntries)
      .where(and(eq(workLogEntries.id, numericId), eq(workLogEntries.userId, session.id)))
      .returning({ id: workLogEntries.id })

    if (deleted.length === 0) return notFound("Entry not found")
    return NextResponse.json({ success: true, data: { id: numericId } })
  } catch (error) {
    return serverError(error, "delete work log entry")
  }
}
