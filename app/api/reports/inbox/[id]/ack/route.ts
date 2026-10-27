import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workReports, workReportRecipients } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"
import { reportSession } from "@/app/api/reports/work/_shared"
import { createNotification } from "@/lib/notifications"
import { parseIdParam } from "@/app/api/reports/_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context) {
  const session = await reportSession()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const id = await parseIdParam(context.params)
  if (id === null) return NextResponse.json({ success: false, error: "Report id must be a positive integer" }, { status: 400 })

  const [recipientRow] = await db
    .select()
    .from(workReportRecipients)
    .where(and(eq(workReportRecipients.reportId, id), eq(workReportRecipients.userId, session.id)))
    .limit(1)

  if (!recipientRow) {
    return NextResponse.json({ success: false, error: "You are not a recipient of this report" }, { status: 404 })
  }

  const [report] = await db
    .select()
    .from(workReports)
    .where(eq(workReports.id, id))
    .limit(1)

  if (!report) {
    return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 })
  }

  if (report.status !== "submitted") {
    return NextResponse.json({ success: false, error: "Only a submitted report can be acknowledged" }, { status: 400 })
  }

  await db
    .update(workReportRecipients)
    .set({ ackAt: new Date() })
    .where(and(eq(workReportRecipients.reportId, id), eq(workReportRecipients.userId, session.id)))

  await db
    .update(workReports)
    .set({ status: "acknowledged", acknowledgedAt: new Date(), updatedAt: new Date() })
    .where(eq(workReports.id, id))

  await createNotification({
    userId: report.userId,
    type: "report",
    title: "Your report was acknowledged",
    body: `Your report "${report.title}" has been acknowledged by a recipient.`,
    link: `/dashboard/reports-work?r=${id}`,
    metadata: { reportId: id },
  }).catch(() => undefined)

  return NextResponse.json({ success: true, data: { id, status: "acknowledged" } })
}
