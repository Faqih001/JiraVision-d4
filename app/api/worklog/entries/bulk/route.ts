// /api/worklog/entries/bulk — act on a selection of your own rows in one round trip.
// The response separates what was asked for from what was touched, because a selection can
// contain rows this member no longer owns, and a log that reported them as edited would be
// a record nobody can trust.

import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks, workLogEntries } from "@/drizzle/schema"
import { WORK_LOG_KINDS } from "@/lib/worklog/entries"
import { readBulkRequest, type BulkRequest } from "@/lib/worklog/bulk"
import { localDay } from "@/lib/worklog/local-day"
import {
  badRequest,
  entryColumns,
  deliverableSelect,
  mapDeliverable,
  mapEntry,
  notFound,
  serverError,
  unauthorized,
  worklogSession,
} from "../../_shared"

export const dynamic = "force-dynamic"

// Every statement in this file goes through it, so a bulk write cannot reach a row that is
// not the session's — there is no path where the id list alone decides the target.
function ownedIds(ids: readonly number[], userId: number) {
  return and(inArray(workLogEntries.id, ids), eq(workLogEntries.userId, userId))
}

export async function POST(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const parsed = await readBody(request, localDay(new Date(), session.timezone))
  if ("error" in parsed) return badRequest(parsed.error)
  const body = parsed.value

  try {
    switch (body.action) {
      case "delete": {
        const affected = await db
          .delete(workLogEntries)
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, [])
      }

      case "set-task": {
        if (body.taskId !== null) {
          const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, body.taskId)).limit(1)
          if (!task) return badRequest("That task no longer exists.")
        }
        const affected = await db
          .update(workLogEntries)
          .set({ taskId: body.taskId, updatedAt: new Date() })
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, await reload(affected.map((r) => r.id), session.id))
      }

      case "re-date": {
        // The grammar already guarantees this; the column is NOT NULL and the request field
        // is nullable, so the route narrows rather than handing drizzle a null it would
        // reject at compile time.
        if (body.workedOn === null) return badRequest("re-date needs workedOn as YYYY-MM-DD")
        const affected = await db
          .update(workLogEntries)
          .set({ workedOn: body.workedOn, redatedAt: new Date(), updatedAt: new Date() })
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, await reload(affected.map((r) => r.id), session.id))
      }

      case "set-kind": {
        if (body.kind === null) return badRequest(`kind must be one of: ${WORK_LOG_KINDS.join(", ")}`)
        const affected = await db
          .update(workLogEntries)
          .set({ kind: body.kind, updatedAt: new Date() })
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, await reload(affected.map((r) => r.id), session.id))
      }

      case "convert-deliverable": {
        // One deliverable for the whole selection: the rows become the evidence that the
        // thing exists, so the name comes from the first row the member actually wrote.
        const [seed] = await db
          .select(entryColumns)
          .from(workLogEntries)
          .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
          .where(ownedIds(body.ids, session.id))
          .orderBy(workLogEntries.workedOn, workLogEntries.id)
          .limit(1)
        if (!seed) return notFound("No matching entries")

        const created = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(deliverables)
            .values({
              name: seed.title.slice(0, 120),
              type: "other",
              status: "draft",
              ownerId: session.id,
              createdBy: session.id,
              taskId: seed.taskId,
              discipline: seed.discipline,
              producedOn: seed.workedOn,
              evidence: seed.body ?? null,
            })
            .returning({ id: deliverables.id })

          const touched = await tx
            .update(workLogEntries)
            .set({ deliverableId: row.id, kind: "deliverable", updatedAt: new Date() })
            .where(ownedIds(body.ids, session.id))
            .returning({ id: workLogEntries.id })

          return { deliverableId: row.id, touched }
        })

        const [record] = await db
          .select(deliverableSelect)
          .from(deliverables)
          .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
          .where(eq(deliverables.id, created.deliverableId))
          .limit(1)
        return NextResponse.json({
          success: true,
          data: {
            action: body.action,
            requested: body.ids.length,
            affected: created.touched.length,
            skipped: body.ids.length - created.touched.length,
            entries: await reload(created.touched.map((r) => r.id), session.id),
            deliverable: mapDeliverable(record),
          },
        })
      }
    }
  } catch (error) {
    return serverError(error, "bulk update work log entries")
  }
}

async function readBody(request: NextRequest, today: string) {
  const json = await request.json().catch(() => null)
  return readBulkRequest(json, today)
}

async function reload(ids: readonly number[], userId: number) {
  if (ids.length === 0) return []
  const rows = await db
    .select(entryColumns)
    .from(workLogEntries)
    .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
    .where(ownedIds(ids, userId))
    .orderBy(workLogEntries.workedOn, workLogEntries.id)
  return rows.map(mapEntry)
}

function done(body: BulkRequest, affected: readonly { id: number }[], entries: Awaited<ReturnType<typeof reload>>) {
  return NextResponse.json({
    success: true,
    data: {
      action: body.action,
      requested: body.ids.length,
      affected: affected.length,
      skipped: body.ids.length - affected.length,
      entries,
    },
  })
}
