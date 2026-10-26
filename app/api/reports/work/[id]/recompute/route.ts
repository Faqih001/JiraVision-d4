// /api/reports/work/[id]/recompute — re-run the aggregation over the stored period and replace
// the metrics snapshot. The only way a draft's numbers change after creation, which is what makes
// "the figures are as of 14:32" a statement the member can point at.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { resolvePeriod, type Period } from "@/lib/reports/period"
import { isDraft, type ReportDto } from "@/lib/reports/report-fields"
import {
  assembleReport,
  badRequest,
  mapReport,
  notFound,
  readOwnReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

/** The stored pair, read as its own type when that matches and as a plain span when it does not. */
function storedPeriod(existing: ReportDto): Period {
  const declared = resolvePeriod(existing.periodType, existing.periodStart, {
    from: existing.periodStart,
    to: existing.periodEnd,
  })
  if (declared.start === existing.periodStart && declared.end === existing.periodEnd) return declared
  return resolvePeriod("custom", existing.periodStart, {
    from: existing.periodStart,
    to: existing.periodEnd,
  })
}

export async function POST(_request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")
    if (!isDraft(existing.status)) {
      return badRequest("this report is locked — only a draft can be recomputed (phase 4 files revisions)")
    }

    const aggregate = await assembleReport(session.id, session.timezone, storedPeriod(existing))
    // Recomputing edits the report: the numbers a member reads are part of what they last changed.
    const [updated] = await db
      .update(workReports)
      .set({ metrics: aggregate, updatedAt: new Date() })
      .where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
      .returning(reportColumns)

    if (!updated) return notFound("Report not found")
    return NextResponse.json({ success: true, data: { report: mapReport(updated) } })
  } catch (error) {
    return serverError(error, "recompute work report")
  }
}
