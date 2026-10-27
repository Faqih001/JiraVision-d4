import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workLogEntries, workReports, users } from "@/drizzle/schema"
import { eq, and, sql } from "drizzle-orm"
import { reportSession } from "@/app/api/reports/work/_shared"
import { isAdmin } from "@/lib/reports/visibility"
import { isIsoDate } from "@/lib/worklog/local-day"

export const dynamic = "force-dynamic"

type MemberDay = {
  userId: number
  name: string
  entryCount: number
  totalMinutes: number
  submittedReportId: number | null
  submittedReportTitle: string | null
}

export async function GET(request: NextRequest) {
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
  if (!actor || !isAdmin({ role: actor.role, email: actor.email })) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
  }

  const date = request.nextUrl.searchParams.get("date")
  if (!date || !isIsoDate(date)) {
    return NextResponse.json({ success: false, error: "Date must be a YYYY-MM-DD string" }, { status: 400 })
  }

  const entries = await db
    .select({
      userId: workLogEntries.userId,
      entryCount: sql<number>`count(*)::int`,
      totalMinutes: sql<number>`coalesce(sum(${workLogEntries.minutes}), 0)::int`,
    })
    .from(workLogEntries)
    .where(eq(workLogEntries.workedOn, date))
    .groupBy(workLogEntries.userId)

  const reports = await db
    .select({
      userId: workReports.userId,
      id: workReports.id,
      title: workReports.title,
    })
    .from(workReports)
    .where(
      and(
        eq(workReports.status, "submitted"),
        sql`${workReports.submittedAt}::date = ${date}::date`
      )
    )

  const allMembers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(sql`${users.role} != 'admin'`)

  const entryMap = new Map(entries.map((e) => [e.userId, e]))
  const reportMap = new Map(reports.map((r) => [r.userId, r]))

  const data: MemberDay[] = allMembers.map((m) => {
    const entry = entryMap.get(m.id)
    const report = reportMap.get(m.id)
    return {
      userId: m.id,
      name: m.name,
      entryCount: entry?.entryCount ?? 0,
      totalMinutes: entry?.totalMinutes ?? 0,
      submittedReportId: report?.id ?? null,
      submittedReportTitle: report?.title ?? null,
    }
  })

  return NextResponse.json({ success: true, data: { date, members: data } })
}
