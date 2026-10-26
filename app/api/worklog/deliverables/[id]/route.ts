// /api/worklog/deliverables/[id] — edit one deliverable, walk its lifecycle, or delete it.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks } from "@/drizzle/schema"
import { pickDeliverableUpdates } from "@/lib/worklog/entry-fields"
import type { DeliverableStatus } from "@/lib/worklog/entries"
import { localDay } from "@/lib/worklog/local-day"
import {
  badRequest,
  deliverableSelect,
  isForeignKeyViolation,
  mapDeliverable,
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
    .select(deliverableSelect)
    .from(deliverables)
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(and(eq(deliverables.id, id), eq(deliverables.ownerId, userId)))
    .limit(1)
  return row ?? null
}

export async function PUT(request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Deliverable id must be a positive integer")

  try {
    const existing = await loadOwned(numericId, session.id)
    if (!existing) return notFound("Deliverable not found")

    const body = await request.json().catch(() => null)
    const result = pickDeliverableUpdates(body, existing.status as DeliverableStatus)
    if ("error" in result) return badRequest(result.error)

    const produced = result.patch.producedOn
    if (typeof produced === "string") {
      // The create route refuses this, so the edit route has to as well — otherwise a
      // deliverable could be walked forward into tomorrow by saving it instead of creating it.
      const today = localDay(new Date(), session.timezone)
      if (produced > today) return badRequest("A deliverable cannot be produced in the future.")
    }

    const set = { ...result.patch, updatedAt: new Date() }
    const updated = await db
      .update(deliverables)
      .set(set)
      .where(and(eq(deliverables.id, numericId), eq(deliverables.ownerId, session.id)))
      .returning({ id: deliverables.id })

    if (updated.length === 0) return notFound("Deliverable not found")
    // Re-read for the joined task title and the row count: .returning() only sees this table.
    const row = await loadOwned(numericId, session.id)
    return NextResponse.json({ success: true, data: { deliverable: mapDeliverable(row ?? existing) } })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task no longer exists.")
    return serverError(error, "update deliverable")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Deliverable id must be a positive integer")

  try {
    // The rows survive: work_log_entries.deliverable_id is ON DELETE SET NULL, so
    // deleting the noun never deletes the evidence.
    const deleted = await db
      .delete(deliverables)
      .where(and(eq(deliverables.id, numericId), eq(deliverables.ownerId, session.id)))
      .returning({ id: deliverables.id })

    if (deleted.length === 0) return notFound("Deliverable not found")
    return NextResponse.json({ success: true, data: { id: numericId } })
  } catch (error) {
    return serverError(error, "delete deliverable")
  }
}
