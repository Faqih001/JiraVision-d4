// /api/reports/work — the member's own period reports.
// GET  → the saved drafts, newest first, optionally narrowed by ?q=.
// POST → one draft. The period is re-resolved from the declared type, the metrics are computed
//        here rather than in the browser, and no lifecycle column is ever written: a draft is the
//        only thing phase 3 can create.

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { localDay } from "@/lib/worklog/local-day"
import { resolvePeriod, type PeriodType } from "@/lib/reports/period"
import { isFail, readReportCreate } from "@/lib/reports/report-fields"
import { parseReportView } from "@/lib/reports/view-state"
import {
  REPORT_LIST_LIMIT,
  assembleReport,
  badRequest,
  listReports,
  mapReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
} from "./_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await reportSession()
  if (!session) return unauthorized()

  try {
    const today = localDay(new Date(), session.timezone)
    const state = parseReportView(request.nextUrl.searchParams, today)
    const reports = await listReports(session.id, state.q)
    return NextResponse.json({
      success: true,
      data: { reports, today, timezone: session.timezone, limit: REPORT_LIST_LIMIT },
    })
  } catch (error) {
    return serverError(error, "fetch work reports")
  }
}

/**
 * The client sends the period it rendered; the server resolves it again from the type and
 * requires the same span back. A `?p=weekly` pair that is not a whole week would otherwise be
 * stored happily and reported as a week.
 */
function declaredPeriod(periodType: PeriodType, start: string, end: string) {
  const period = resolvePeriod(periodType, start, { from: start, to: end })
  return period.start === start && period.end === end ? period : null
}

export async function POST(request: NextRequest) {
  const session = await reportSession()
  if (!session) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = readReportCreate(body)
    if (isFail(parsed)) return badRequest(parsed.error)
    const value = parsed.value

    const declared = declaredPeriod(value.periodType, value.periodStart, value.periodEnd)
    if (!declared) return badRequest("periodStart and periodEnd must be the period implied by periodType")

    const metrics = await assembleReport(session.id, session.timezone, declared)

    const [inserted] = await db
      .insert(workReports)
      .values({
        userId: session.id,
        title: value.title,
        template: value.template,
        periodType: value.periodType,
        periodStart: value.periodStart,
        periodEnd: value.periodEnd,
        content: value.content,
        metrics,
      })
      .returning(reportColumns)

    return NextResponse.json({ success: true, data: { report: mapReport(inserted) } }, { status: 201 })
  } catch (error) {
    return serverError(error, "create work report")
  }
}
