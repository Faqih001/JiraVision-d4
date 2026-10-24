import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { savedReports } from "@/drizzle/schema"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

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

async function findOwned(id: number, userId: number): Promise<SavedReportRow | null> {
  const rows = await db
    .select()
    .from(savedReports)
    .where(and(eq(savedReports.id, id), eq(savedReports.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

// GET /api/analytics/reports/[id] — one snapshot owned by the caller.
export async function GET(_request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseId(idParam)
    if (id === null) {
      return NextResponse.json({ success: false, message: "Invalid report ID" }, { status: 400 })
    }
    const row = await findOwned(id, session.id)
    if (!row) {
      return NextResponse.json({ success: false, message: "Saved report not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: serialize(row) })
  } catch (error) {
    console.error("Saved report fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch saved report", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// PATCH /api/analytics/reports/[id] — rename / re-caption / re-snapshot config.
// Body: { name?, description?, config? } — all optional, at least one required.
export async function PATCH(request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseId(idParam)
    if (id === null) {
      return NextResponse.json({ success: false, message: "Invalid report ID" }, { status: 400 })
    }
    const existing = await findOwned(id, session.id)
    if (!existing) {
      return NextResponse.json({ success: false, message: "Saved report not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Request body is required" }, { status: 400 })
    }

    const updates: Partial<Pick<SavedReportRow, "name" | "description" | "config">> = {}
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name || name.length > 255) {
        return NextResponse.json(
          { success: false, message: "name must be a non-empty string of at most 255 chars" },
          { status: 400 },
        )
      }
      updates.name = name
    }
    if (body.description !== undefined) {
      updates.description =
        typeof body.description === "string" && body.description.trim() ? body.description.trim() : null
    }
    if (body.config !== undefined) {
      if (!body.config || typeof body.config !== "object" || Array.isArray(body.config)) {
        return NextResponse.json({ success: false, message: "config must be an object" }, { status: 400 })
      }
      updates.config = body.config as Record<string, unknown>
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "Provide at least one of name, description, config" },
        { status: 400 },
      )
    }

    const [updated] = await db
      .update(savedReports)
      .set(updates)
      .where(and(eq(savedReports.id, id), eq(savedReports.userId, session.id)))
      .returning()

    return NextResponse.json({ success: true, data: serialize(updated) })
  } catch (error) {
    console.error("Saved report update error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update saved report", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE /api/analytics/reports/[id] — removes the snapshot, notifies the owner.
export async function DELETE(_request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseId(idParam)
    if (id === null) {
      return NextResponse.json({ success: false, message: "Invalid report ID" }, { status: 400 })
    }
    const existing = await findOwned(id, session.id)
    if (!existing) {
      return NextResponse.json({ success: false, message: "Saved report not found" }, { status: 404 })
    }

    await db
      .delete(savedReports)
      .where(and(eq(savedReports.id, id), eq(savedReports.userId, session.id)))

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Report deleted: ${existing.name}`,
      body: "The saved analytics snapshot was removed from your workspace.",
      link: "/dashboard/analytics",
      metadata: { savedReportId: existing.id, action: "report_deleted" },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error("Saved report delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete saved report", error: (error as Error).message },
      { status: 500 },
    )
  }
}
