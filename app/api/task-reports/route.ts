import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { taskReports, taskReportTemplates } from "@/drizzle/schema"
import { eq, and, sql } from "drizzle-orm"
import { buildReportSections, type ReportSection } from "@/lib/reports/task-report-generator"
import { getTaskInstances } from "@/lib/data-access-task-instances"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("templateId") ? parseInt(searchParams.get("templateId")!, 10) : undefined
    const status = searchParams.get("status") || undefined
    const authorId = searchParams.get("authorId") ? parseInt(searchParams.get("authorId")!, 10) : session?.id

    const conditions = []
    if (templateId) conditions.push(eq(taskReports.templateId, templateId))
    if (status) conditions.push(eq(taskReports.status, status))
    if (authorId) conditions.push(eq(taskReports.authorId, authorId))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const reports = await db
      .select()
      .from(taskReports)
      .where(where)
      .orderBy(sql`${taskReports.createdAt} DESC`)

    return NextResponse.json({ success: true, data: reports })
  } catch (error) {
    console.error("Error fetching task reports:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch reports", error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, title, periodStart, periodEnd } = body

    if (!templateId || !title || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: templateId, title, periodStart, periodEnd" },
        { status: 400 }
      )
    }

    const templates = await db
      .select()
      .from(taskReportTemplates)
      .where(eq(taskReportTemplates.id, templateId))
      .limit(1)

    const template = templates[0]
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 })
    }

    const instances = await getTaskInstances({ startDate: periodStart, endDate: periodEnd })
    const sections = (template.sections as ReportSection[]) || []
    const reportContent = buildReportSections(sections, instances, [])

    const reports = await db
      .insert(taskReports)
      .values({
        templateId,
        title,
        periodStart,
        periodEnd,
        content: reportContent,
        status: "draft",
        authorId: session?.id ?? 1,
      })
      .returning()

    return NextResponse.json({ success: true, data: reports[0] })
  } catch (error) {
    console.error("Error creating task report:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create report", error: (error as Error).message },
      { status: 500 }
    )
  }
}
