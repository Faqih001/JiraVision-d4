// /api/reports/work/[id] — read, edit or delete one of your own drafts.
// Ownership is a condition of every statement, so a stranger's id is a 404 and not a 403.
// A submitted report is read-only here: phase 3 has no lifecycle writes, and the whitelist in
// lib/reports/report-fields.ts is what enforces that rather than a comment.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { resolvePeriod } from "@/lib/reports/period"
import { emptyContent, type ReportContent } from "@/lib/reports/templates"
import { isDraft, isFail, pickReportUpdates } from "@/lib/reports/report-fields"
import type { ReportAggregate } from "@/lib/reports/aggregate"
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
} from "../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const report = await readOwnReport(session.id, id)
    if (!report) return notFound("Report not found")
    return NextResponse.json({ success: true, data: { report } })
  } catch (error) {
    return serverError(error, "fetch work report")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")

    const body = await request.json().catch(() => null)
    const parsed = pickReportUpdates(body, existing.status)
    if (isFail(parsed)) return badRequest(parsed.error)
    const patch = parsed.value

    const title = patch.title ?? existing.title
    const template = patch.template ?? existing.template
    const periodType = patch.periodType ?? existing.periodType
    const periodStart = patch.periodStart ?? existing.periodStart
    const periodEnd = patch.periodEnd ?? existing.periodEnd
    const periodChanged =
      periodType !== existing.periodType ||
      periodStart !== existing.periodStart ||
      periodEnd !== existing.periodEnd

    const set: {
      title: string
      template: string
      periodType: string
      periodStart: string
      periodEnd: string
      content: ReportContent
      metrics?: ReportAggregate
      updatedAt: Date
    } = {
      // `content` replaces the blob — the page always sends the full prose set it holds, and
      // emptyContent keeps every prose key present so a later reader never meets a missing section.
      title,
      template,
      periodType,
      periodStart,
      periodEnd,
      content: patch.content ? { ...emptyContent(template), ...patch.content } : existing.content,
      updatedAt: new Date(),
    }

    if (periodChanged) {
      // Same rule as the create route: the stored pair must be the period the type implies.
      const declared = resolvePeriod(periodType, periodStart, { from: periodStart, to: periodEnd })
      if (declared.start !== periodStart || declared.end !== periodEnd) {
        return badRequest("periodStart and periodEnd must be the period implied by periodType")
      }
      // And the numbers move with the dates. A draft that keeps old metrics under new dates is
      // how a report ends up stating 14 actions for a week with none.
      set.metrics = await assembleReport(session.id, session.timezone, declared)
    }

    const [updated] = await db
      .update(workReports)
      .set(set)
      .where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
      .returning(reportColumns)

    if (!updated) return notFound("Report not found")
    return NextResponse.json({ success: true, data: { report: mapReport(updated) } })
  } catch (error) {
    return serverError(error, "update work report")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")
    if (!isDraft(existing.status)) {
      return badRequest(
        "a filed report cannot be deleted here — corrections are a new revision (phase 4)",
      )
    }

    await db.delete(workReports).where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    return serverError(error, "delete work report")
  }
}
