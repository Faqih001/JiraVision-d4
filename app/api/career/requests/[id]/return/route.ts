// POST /api/career/requests/[id]/return — an admin returns a submitted request with a
// required note. The placement does not move; the member reads the note and can submit
// a fresh request once the gap is closed.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { careerRequests } from "@/drizzle/schema"
import { createNotification } from "@/lib/notifications"
import { bad, careerAdmin, MAX_NOTE } from "../../../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await careerAdmin()
  if ("error" in gate) return gate.error
  const admin = gate.member

  const { id: rawId } = await params
  const id = Number.parseInt(rawId, 10)
  if (!Number.isFinite(id) || id <= 0) return bad("Request id must be a positive integer")

  const body = (await request.json().catch(() => null)) as { note?: unknown } | null
  if (typeof body?.note !== "string") return bad("A note is required to return a request")
  const note = body.note.trim()
  if (!note) return bad("A note is required to return a request")
  if (note.length > MAX_NOTE) return bad(`note must be ${MAX_NOTE} characters or fewer`)

  try {
    const [row] = await db
      .select()
      .from(careerRequests)
      .where(eq(careerRequests.id, id))
      .limit(1)
    if (!row) return bad("Career request not found", 404)
    if (row.status !== "submitted") return bad("This request is not awaiting review", 409)

    const now = new Date()
    const [updated] = await db
      .update(careerRequests)
      .set({
        status: "returned",
        returnNote: note,
        reviewedBy: admin.id,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(careerRequests.id, id))
      .returning()

    await createNotification({
      userId: row.userId,
      type: "career",
      title: "Your career request was returned",
      body: note.slice(0, 200),
      link: "/dashboard/career",
      metadata: { requestId: id, reviewedBy: admin.id },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, data: { request: updated } })
  } catch (error) {
    console.error("Career request return error:", error)
    return NextResponse.json({ error: "Failed to return the career request" }, { status: 500 })
  }
}
