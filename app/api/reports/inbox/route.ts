import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workReports, workReportRecipients, users } from "@/drizzle/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { reportSession } from "@/app/api/reports/work/_shared"
import { isAdmin } from "@/lib/reports/visibility"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await reportSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const userRows = await db
    .select({ role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1)

  const actor = userRows[0]
  if (!actor) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const admin = isAdmin({ role: actor.role, email: actor.email })

  const baseCondition = admin
    ? eq(workReports.status, "submitted")
    : and(
        eq(workReports.status, "submitted"),
        sql`${workReports.id} IN (
          SELECT ${workReportRecipients.reportId}
          FROM ${workReportRecipients}
          WHERE ${workReportRecipients.userId} = ${session.id}
        )`
      )

  const rows = await db
    .select({
      id: workReports.id,
      userId: workReports.userId,
      title: workReports.title,
      template: workReports.template,
      periodType: workReports.periodType,
      periodStart: workReports.periodStart,
      periodEnd: workReports.periodEnd,
      status: workReports.status,
      submittedAt: workReports.submittedAt,
      revisionOf: workReports.revisionOf,
      createdAt: workReports.createdAt,
      authorName: users.name,
      notifiedAt: workReportRecipients.notifiedAt,
      readAt: workReportRecipients.readAt,
      ackAt: workReportRecipients.ackAt,
      note: workReportRecipients.note,
    })
    .from(workReports)
    .innerJoin(users, eq(workReports.userId, users.id))
    .leftJoin(
      workReportRecipients,
      admin
        ? sql`false`
        : and(
            eq(workReportRecipients.reportId, workReports.id),
            eq(workReportRecipients.userId, session.id)
          )
    )
    .where(baseCondition)
    .orderBy(desc(workReports.submittedAt))
    .limit(100)

  const data = rows.map((row) => ({
    report: {
      id: row.id,
      userId: row.userId,
      title: row.title,
      template: row.template,
      periodType: row.periodType,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      status: row.status,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      revisionOf: row.revisionOf,
      createdAt: (row.createdAt ?? new Date()).toISOString(),
      authorName: row.authorName,
    },
    myRecipientState: {
      notifiedAt: (row.notifiedAt ?? new Date()).toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null,
      ackAt: row.ackAt ? row.ackAt.toISOString() : null,
      note: row.note,
    },
  }))

  return NextResponse.json({ success: true, data: { reports: data, admin } })
}
