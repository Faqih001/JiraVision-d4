import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { taskReports } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const reportId = parseInt(id, 10)

    const reports = await db
      .select()
      .from(taskReports)
      .where(eq(taskReports.id, reportId))
      .limit(1)

    if (reports.length === 0) {
      return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: reports[0] })
  } catch (error) {
    console.error("Error fetching task report:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch report", error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const reportId = parseInt(id, 10)

    // Ownership check: user must be the author of the report
    const existing = await db
      .select({ authorId: taskReports.authorId })
      .from(taskReports)
      .where(eq(taskReports.id, reportId))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 })
    }

    if (session && existing[0].authorId !== session.id) {
      return NextResponse.json(
        { success: false, message: "You can only edit reports you authored" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { content, status } = body

    const updateData: Record<string, unknown> = {}
    if (content !== undefined) updateData.content = content
    if (status !== undefined) {
      if (!["draft", "final"].includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid status. Must be 'draft' or 'final'" },
          { status: 400 }
        )
      }
      updateData.status = status
    }
    updateData.updatedAt = new Date().toISOString()

    const reports = await db
      .update(taskReports)
      .set(updateData)
      .where(eq(taskReports.id, reportId))
      .returning()

    if (reports.length === 0) {
      return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: reports[0] })
  } catch (error) {
    console.error("Error updating task report:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update report", error: (error as Error).message },
      { status: 500 }
    )
  }
}
