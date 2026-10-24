import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { savedReports } from "@/drizzle/schema"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

type SavedReportRow = typeof savedReports.$inferSelect

function serialize(r: SavedReportRow) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    config: (r.config ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
  }
}

// GET /api/analytics/reports — the current user's saved report snapshots.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const rows = await db
      .select()
      .from(savedReports)
      .where(eq(savedReports.userId, session.id))
      .orderBy(desc(savedReports.createdAt), desc(savedReports.id))

    return NextResponse.json({ success: true, data: rows.map(serialize) })
  } catch (error) {
    console.error("Saved reports list error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch saved reports", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// POST /api/analytics/reports — snapshot the current analytics filters.
// Body: { name: string, description?: string, config?: object }
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Request body is required" }, { status: 400 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ success: false, message: "Report name is required" }, { status: 400 })
    }
    if (name.length > 255) {
      return NextResponse.json({ success: false, message: "Report name is too long (max 255 chars)" }, { status: 400 })
    }
    const description =
      typeof body.description === "string" && body.description.trim() ? body.description.trim() : null
    const config =
      body.config && typeof body.config === "object" && !Array.isArray(body.config)
        ? (body.config as Record<string, unknown>)
        : {}

    const [created] = await db
      .insert(savedReports)
      .values({ userId: session.id, name, description, config })
      .returning()

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Report saved: ${created.name}`,
      body: "Your analytics snapshot is available in the Saved reports panel.",
      link: "/dashboard/analytics",
      metadata: { savedReportId: created.id, action: "report_saved" },
    })

    return NextResponse.json({ success: true, data: serialize(created) }, { status: 201 })
  } catch (error) {
    console.error("Saved report create error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to save report", error: (error as Error).message },
      { status: 500 },
    )
  }
}
