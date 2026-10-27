import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { resolvePeriod } from "@/lib/reports/period"
import { isDraft, type ReportContent } from "@/lib/reports/report-fields"
import { emptyContent } from "@/lib/reports/templates"
import { parseIdParam } from "@/app/api/reports/_shared"
import {
  assembleReport,
  badRequest,
  notFound,
  readOwnReport,
  reportSession,
  serverError,
  unauthorized,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")

    if (isDraft(existing.status)) {
      return badRequest("a draft is already editable — revise is for filed reports")
    }

    const period = resolvePeriod(existing.periodType, existing.periodStart, {
      from: existing.periodStart,
      to: existing.periodEnd,
    })
    const metrics = await assembleReport(session.id, session.timezone, period)
    const content: ReportContent = emptyContent(existing.template)

    const [inserted] = await db
      .insert(workReports)
      .values({
        userId: session.id,
        title: existing.title,
        template: existing.template,
        periodType: existing.periodType,
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
        content,
        metrics,
        revisionOf: id,
        status: "draft",
      })
      .returning()

    return NextResponse.json({ success: true, data: { report: inserted } }, { status: 201 })
  } catch (error) {
    return serverError(error, "revise work report")
  }
}
