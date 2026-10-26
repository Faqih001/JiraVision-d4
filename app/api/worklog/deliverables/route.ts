// /api/worklog/deliverables — the named outputs a log points at.
// GET  → the member's deliverables, newest produced first, each with its row count.
// POST → one deliverable. `owner_id` and `created_by` are always the session, never the body.

import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks } from "@/drizzle/schema"
import { readDeliverableCreate } from "@/lib/worklog/entry-fields"
import { DELIVERABLE_STATUSES, isDeliverableStatus } from "@/lib/worklog/entries"
import { isIsoDate, localDay } from "@/lib/worklog/local-day"
import {
  badRequest,
  deliverableSelect,
  isForeignKeyViolation,
  likePattern,
  mapDeliverable,
  serverError,
  unauthorized,
  worklogSession,
} from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const params = request.nextUrl.searchParams
    const conditions: SQL[] = [eq(deliverables.ownerId, session.id)]

    const status = params.get("status")
    if (status && status !== "all") {
      if (!isDeliverableStatus(status)) {
        return badRequest(`status must be one of: ${DELIVERABLE_STATUSES.join(", ")}, or all`)
      }
      conditions.push(eq(deliverables.status, status))
    }

    const q = params.get("q")?.trim()
    if (q) {
      const pattern = likePattern(q)
      conditions.push(sql`(${deliverables.name} ilike ${pattern} or ${deliverables.evidence} ilike ${pattern})`)
    }

    const from = params.get("from")
    const to = params.get("to")
    if (from && to) {
      if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
        return badRequest("from and to must be YYYY-MM-DD dates, from first")
      }
      conditions.push(sql`${deliverables.producedOn} between ${from} and ${to}`)
    }

    const rows = await db
      .select(deliverableSelect)
      .from(deliverables)
      .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
      .where(and(...conditions))
      .orderBy(sql`${deliverables.producedOn} desc nulls last`, desc(deliverables.id))
      .limit(500)

    return NextResponse.json({ success: true, data: { deliverables: rows.map(mapDeliverable) } })
  } catch (error) {
    return serverError(error, "fetch deliverables")
  }
}

export async function POST(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = readDeliverableCreate(body)
    if ("error" in parsed) return badRequest(parsed.error)
    const value = parsed.value

    if (value.producedOn) {
      // The member's own today, not UTC: a draft started at 23:40 must not be refused for
      // being "tomorrow" because the server clock had already crossed midnight.
      const today = localDay(new Date(), session.timezone)
      if (value.producedOn > today) return badRequest("A deliverable cannot be produced in the future.")
    }

    if (value.taskId !== null) {
      const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, value.taskId)).limit(1)
      if (!task) return badRequest("That task no longer exists.")
    }

    const [inserted] = await db
      .insert(deliverables)
      .values({ ...value, ownerId: session.id, createdBy: session.id })
      .returning({ id: deliverables.id })

    const [row] = await db
      .select(deliverableSelect)
      .from(deliverables)
      .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
      .where(eq(deliverables.id, inserted.id))
      .limit(1)

    return NextResponse.json({ success: true, data: { deliverable: mapDeliverable(row) } }, { status: 201 })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task no longer exists.")
    return serverError(error, "create deliverable")
  }
}
