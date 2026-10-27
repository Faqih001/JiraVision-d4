// POST /api/reports/work/[id]/submit — file a draft.
// Submission locks the report, writes the recipient list, and notifies each
// recipient via the existing notification pipeline (type "report", link to inbox).
// A submitted report is never edited in place — corrections are a new revision.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, workReports } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { isDraft } from "@/lib/reports/report-fields"
import { isFail, readRecipientIds } from "@/lib/reports/recipients"
import { readDefaultRecipients } from "@/lib/reports/default-recipients"
import { notifyMany } from "@/lib/notifications"
import {
  badRequest,
  mapReport,
  notFound,
  readOwnReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
  writeRecipients,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")
    if (!isDraft(existing.status)) {
      return badRequest("only a draft can be submitted — a filed report is corrected as a new revision")
    }

    const body = await request.json().catch(() => null)
    const incoming = body && typeof body === "object" && !Array.isArray(body) ? body : {}
    const rawIds = "recipientIds" in incoming ? (incoming as Record<string, unknown>).recipientIds : undefined

    let recipientIds: number[]
    if (rawIds === undefined || rawIds === null) {
      const prefs = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, session.id))
        .limit(1)
      recipientIds = readDefaultRecipients(prefs[0]?.preferences)
      if (recipientIds.length === 0) {
        return badRequest("no recipients supplied and no default reporting line saved in settings")
      }
    } else {
      const parsed = readRecipientIds(rawIds)
      if (isFail(parsed)) return badRequest(parsed.error)
      recipientIds = parsed.value
    }

    const [updated] = await db
      .update(workReports)
      .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
      .returning(reportColumns)

    if (!updated) return notFound("Report not found")

    await writeRecipients(id, recipientIds)

    await notifyMany(recipientIds, {
      type: "report",
      title: "A report was submitted for your review",
      body: `${existing.title} — ${existing.periodType} report covering ${existing.periodStart} to ${existing.periodEnd}.`,
      link: "/dashboard/reports-work/inbox",
      metadata: { reportId: id, authorId: session.id },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, data: { report: mapReport(updated) } })
  } catch (error) {
    return serverError(error, "submit work report")
  }
}
