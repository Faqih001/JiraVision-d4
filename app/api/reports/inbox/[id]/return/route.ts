import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workReports, workReportRecipients } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"
import { reportSession } from "@/app/api/reports/work/_shared"
import { createNotification } from "@/lib/notifications"
import { parseIdParam } from "@/app/api/reports/_shared"

export const dynamic = "force-dynamic"

const MAX_RETURN_NOTE = 2000

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  const session = await reportSession()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const id = await parseIdParam(context.params)
  if (id === null) return NextResponse.json({ success: false, error: "Report id must be a positive integer" }, { status: 400 })

  const body = await request.json().catch(() => null)
  const note = body && typeof body === "object" && "note" in body ? String((body as Record<string, unknown>).note ?? "").trim() : ""

  if (!note) {
    return NextResponse.json({ success: false, error: "A return note is required" }, { status: 400 })
  }

  if (note.length > MAX_RETURN_NOTE) {
    return NextResponse.json({ success: false, error: `Return note must be ${MAX_RETURN_NOTE} characters or fewer` }, { status: 400 })
  }

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
    return NextResponse.json({ success: false, error: "Only a submitted report can be returned" }, { status: 400 })
  }

  await db
    .update(workReportRecipients)
    .set({ note })
    .where(and(eq(workReportRecipients.reportId, id), eq(workReportRecipients.userId, session.id)))

  await db
    .update(workReports)
    .set({ status: "returned", returnedNote: note, updatedAt: new Date() })
    .where(eq(workReports.id, id))

  await createNotification({
    userId: report.userId,
    type: "report",
    title: "Your report was returned for correction",
    body: `Your report "${report.title}" was returned with a note: ${note.slice(0, 200)}${note.length > 200 ? "…" : ""}`,
    link: `/dashboard/reports-work?r=${id}`,
    metadata: { reportId: id },
  }).catch(() => undefined)

  return NextResponse.json({ success: true, data: { id, status: "returned" } })
}
