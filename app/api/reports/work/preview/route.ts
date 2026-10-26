// /api/reports/work/preview — the live numbers for the period named by the query string.
// GET only, and from the same parameters the page renders, so a link to a preview reproduces the
// figures it shows. Nothing is written: this is the half of the builder that must work before a
// draft exists.

import { NextRequest, NextResponse } from "next/server"
import { localDay } from "@/lib/worklog/local-day"
import { effectiveTemplate, parseReportView, resolveReportPeriod } from "@/lib/reports/view-state"
import { assembleReport, reportSession, serverError, unauthorized } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await reportSession()
  if (!session) return unauthorized()

  try {
    const today = localDay(new Date(), session.timezone)
    const state = parseReportView(request.nextUrl.searchParams, today)
    const period = resolveReportPeriod(state)
    const aggregate = await assembleReport(session.id, session.timezone, period)
    const template = effectiveTemplate(state, aggregate)
    return NextResponse.json({
      success: true,
      data: { period, aggregate, template, today, timezone: session.timezone },
    })
  } catch (error) {
    return serverError(error, "preview work report")
  }
}
