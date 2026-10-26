// /api/worklog/entries — the member's own day rows.
// GET  → the range named by the query string, filtered by the page's own view state.
// POST → one manual row. `source` is never taken from the body: a browser write is
//        manual, and only the phases that earn provenance (promotes, the provider) set it.

import { NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks, workLogEntries } from "@/drizzle/schema"
import { readEntryCreate } from "@/lib/worklog/entry-fields"
import { localDay } from "@/lib/worklog/local-day"
import { parseViewState, resolveRange } from "@/lib/worklog/view-state"
import {
  badRequest,
  entryColumns,
  entryFilters,
  isForeignKeyViolation,
  mapEntry,
  serverError,
  unauthorized,
  worklogSession,
} from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const today = localDay(new Date(), session.timezone)
    const state = parseViewState(request.nextUrl.searchParams, today)
    const { from, to } = resolveRange(state, today)

    const rows = await db
      .select(entryColumns)
      .from(workLogEntries)
      .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
      .where(and(...entryFilters(state, session.id, from, to)))
      .orderBy(sql`${workLogEntries.workedOn} desc`, sql`${workLogEntries.createdAt} desc`)
      .limit(1000)

    return NextResponse.json({
      success: true,
      data: { entries: rows.map(mapEntry), range: { from, to }, today, timezone: session.timezone },
    })
  } catch (error) {
    return serverError(error, "fetch work log entries")
  }
}

export async function POST(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const today = localDay(new Date(), session.timezone)
    const parsed = readCreateBody(body, today)
    if ("error" in parsed) return badRequest(parsed.error)
    const value = parsed.value

    if (value.deliverableId !== null) {
      // Checked, not just FK-enforced: a deliverable owned by someone else would insert
      // cleanly and hand their work to this member's log.
      const [mine] = await db
        .select({ id: deliverables.id })
        .from(deliverables)
        .where(and(eq(deliverables.id, value.deliverableId), eq(deliverables.ownerId, session.id)))
        .limit(1)
      if (!mine) return badRequest("deliverableId does not refer to one of your deliverables")
    }

    const [inserted] = await db
      .insert(workLogEntries)
      .values({ ...value, userId: session.id, source: "manual" })
      .returning({ id: workLogEntries.id })

    const [row] = await db
      .select(entryColumns)
      .from(workLogEntries)
      .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
      .where(eq(workLogEntries.id, inserted.id))
      .limit(1)

    return NextResponse.json({ success: true, data: { entry: mapEntry(row) } }, { status: 201 })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task or deliverable no longer exists.")
    return serverError(error, "create work log entry")
  }
}

/**
 * An omitted `workedOn` is stamped with the day in the member's own timezone — the only
 * honest default at 23:40. A future day is a plan, not a log, so it is refused rather than
 * silently pulled back to today.
 */
function readCreateBody(body: unknown, today: string) {
  const source =
    body && typeof body === "object" && !Array.isArray(body) && (body as Record<string, unknown>).workedOn === undefined
      ? { ...(body as Record<string, unknown>), workedOn: today }
      : body
  const result = readEntryCreate(source)
  if ("error" in result) return result
  if (result.value.workedOn > today) return { error: "A work log entry cannot be dated in the future." }
  return result
}
