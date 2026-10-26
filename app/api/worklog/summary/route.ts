// /api/worklog/summary — one payload for the totals, streak, heat, splits, coverage and
// "what moved" sections. Filters come from the same query string the page renders, so a
// shared URL reproduces the numbers and the list underneath them.

import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { taskEvents, tasks, workLogEntries } from "@/drizzle/schema"
import { localDay, rangeBoundsUtc } from "@/lib/worklog/local-day"
import { buildSummary, type TransitionDto } from "@/lib/worklog/summary"
import { parseViewState, resolveRange, viewDays } from "@/lib/worklog/view-state"
import { entryColumns, entryFilters, mapEntry, serverError, unauthorized, worklogSession } from "../_shared"

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
      .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.id))
      .limit(1000)
    const entries = rows.map(mapEntry)

    // actor_id, not just the task: a member's "what moved" feed is what they did, and a
    // supervisor changing status on their task is not that member's history.
    const bounds = rangeBoundsUtc(from, to, session.timezone)
    const events = await db
      .select({
        id: taskEvents.id,
        taskId: taskEvents.taskId,
        taskTitle: tasks.title,
        fromStatus: taskEvents.fromStatus,
        toStatus: taskEvents.toStatus,
        at: taskEvents.at,
        source: taskEvents.source,
      })
      .from(taskEvents)
      .leftJoin(tasks, eq(taskEvents.taskId, tasks.id))
      .where(and(eq(taskEvents.actorId, session.id), gte(taskEvents.at, bounds.start), lte(taskEvents.at, bounds.end)))
      .orderBy(desc(taskEvents.at))
      .limit(200)

    const transitions: TransitionDto[] = events.map((e) => ({ ...e, at: e.at.toISOString() }))

    return NextResponse.json({
      success: true,
      data: buildSummary({ entries, days: viewDays(state, today), from, to, todayIso: today, transitions }),
    })
  } catch (error) {
    return serverError(error, "summarise work log")
  }
}
