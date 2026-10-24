// PATCH/DELETE /api/email/digest/[id] — update the lifecycle status of a
// persisted digest row (re-queue / mark delivered / mark failed) or remove it.
// "delivered" means an operator recorded delivery by hand; the app itself
// never sends email.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"

export const dynamic = "force-dynamic"

const ALLOWED_STATUSES = ["queued", "delivered", "failed"]

type DigestRow = {
  id: number
  to_email: string | null
  subject: string | null
  body: string | null
  event_type: string | null
  status: string
  created_at: string | Date
}

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params
  const digestId = Number(id)
  if (!Number.isInteger(digestId) || digestId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid digest id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null
    const status = body && typeof body.status === "string" ? body.status : ""
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      )
    }

    const [row] = (await db.execute(sql`
      UPDATE email_digest
      SET status = ${status}
      WHERE id = ${digestId} AND user_id = ${session.id}
      RETURNING id, to_email, subject, body, event_type, status, created_at
    `)) as unknown as DigestRow[]

    if (!row) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { item: row } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to update digest row: ${message}` }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params
  const digestId = Number(id)
  if (!Number.isInteger(digestId) || digestId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid digest id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const [row] = (await db.execute(sql`
      DELETE FROM email_digest
      WHERE id = ${digestId} AND user_id = ${session.id}
      RETURNING id
    `)) as unknown as { id: number }[]

    if (!row) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: row.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to delete digest row: ${message}` }, { status: 500 })
  }
}
