import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { aiInsights } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

const STATUSES = ["active", "dismissed", "resolved"]

// PATCH /api/ai-insights/[id] { status }
export async function PATCH(request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid insight ID" }, { status: 400 })
    }

    const body = await request.json()
    if (body.status !== undefined && !STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, message: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 })
    }

    const [updated] = await db
      .update(aiInsights)
      .set({ status: body.status ?? "dismissed" })
      .where(eq(aiInsights.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ success: false, message: "Insight not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error(`Error updating AI insight ${idParam}:`, error)
    return NextResponse.json(
      { success: false, message: "Failed to update insight", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE /api/ai-insights/[id]
export async function DELETE(_request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid insight ID" }, { status: 400 })
    }

    const [deleted] = await db.delete(aiInsights).where(eq(aiInsights.id, id)).returning()
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Insight not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Insight deleted" })
  } catch (error) {
    console.error(`Error deleting AI insight ${idParam}:`, error)
    return NextResponse.json(
      { success: false, message: "Failed to delete insight", error: (error as Error).message },
      { status: 500 },
    )
  }
}
