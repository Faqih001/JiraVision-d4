// /api/worklog/entries/[id] — edit or delete one of your own rows.
// Ownership is a condition of the statement, not a check that happens before it, so a
// missing id and someone else's id produce the same 404 and leak nothing.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks, workLogEntries } from "@/drizzle/schema"
import { pickEntryUpdates, type EntryCurrent, type EntryPatch } from "@/lib/worklog/entry-fields"
import { markInstancesLogged, releaseInstancesUnlogged } from "@/lib/worklog/instance-capture"
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

    // Retargeting the row changes which day's instance the log is evidence for. The old pair
    // is released only if no other row covers it, and both moves happen in the transaction
    // writing the row, so the grid and the log cannot be seen disagreeing.
    const before = { taskId: existing.taskId, workedOn: existing.workedOn }
    const after = {
      taskId: result.patch.taskId !== undefined ? result.patch.taskId : existing.taskId,
      workedOn: result.patch.workedOn !== undefined ? result.patch.workedOn : existing.workedOn,
    }
    const moved = after.taskId !== before.taskId || after.workedOn !== before.workedOn

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(workLogEntries)
        .set(set)
        .where(and(eq(workLogEntries.id, numericId), eq(workLogEntries.userId, session.id)))
        .returning({ id: workLogEntries.id })
      if (rows.length === 0 || !moved) return rows
      await releaseInstancesUnlogged(tx, [before])
      await markInstancesLogged(tx, session.id, [after])
      return rows
    })

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
    // Which instance to hand back is read before the row goes: afterwards nothing in the
    // database says what this log was evidence for.
    const [row] = await db
      .select({ taskId: workLogEntries.taskId, workedOn: workLogEntries.workedOn })
      .from(workLogEntries)
      .where(and(eq(workLogEntries.id, numericId), eq(workLogEntries.userId, session.id)))
      .limit(1)
    if (!row) return notFound("Entry not found")

    const deleted = await db.transaction(async (tx) => {
      const rows = await tx
        .delete(workLogEntries)
        .where(and(eq(workLogEntries.id, numericId), eq(workLogEntries.userId, session.id)))
        .returning({ id: workLogEntries.id })
      if (rows.length === 0) return rows
      await releaseInstancesUnlogged(tx, [row])
      return rows
    })

    if (deleted.length === 0) return notFound("Entry not found")
    return NextResponse.json({ success: true, data: { id: numericId } })
  } catch (error) {
    return serverError(error, "delete work log entry")
  }
}
