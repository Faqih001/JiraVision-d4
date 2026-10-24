// POST /api/retros/[id]/actions — add an action item to a retro.
// Used both by the inline add row and by "convert top 'try next' note".
// When an owner is assigned that differs from the actor, the owner gets a
// notification linking back to the retros workspace.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

type ActionRow = {
  id: number
  retro_id: number
  body: string
  owner_id: number | null
  owner_name: string | null
  owner_avatar: string | null
  due_date: string | null
  done: boolean
  overdue: boolean
  created_at: string | Date
}

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params
  const retroId = Number(id)
  if (!Number.isInteger(retroId) || retroId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid retro id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const payload = (await request.json().catch(() => null)) as {
      body?: unknown
      ownerId?: unknown
      dueDate?: unknown
      sourceNoteId?: unknown
    } | null

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const body = typeof payload.body === "string" ? payload.body.trim().slice(0, 4000) : ""
    if (!body) {
      return NextResponse.json({ success: false, message: "body is required" }, { status: 400 })
    }

    let ownerId: number | null = null
    if (payload.ownerId !== null && payload.ownerId !== undefined && payload.ownerId !== "") {
      ownerId = Number(payload.ownerId)
      if (!Number.isInteger(ownerId) || ownerId <= 0) {
        return NextResponse.json({ success: false, message: "ownerId must be a positive integer" }, { status: 400 })
      }
      const [user] = (await db.execute(sql`SELECT id FROM users WHERE id = ${ownerId}`)) as unknown as { id: number }[]
      if (!user) {
        return NextResponse.json({ success: false, message: `User ${ownerId} does not exist` }, { status: 400 })
      }
    }

    let dueDate: string | null = null
    if (payload.dueDate !== null && payload.dueDate !== undefined && payload.dueDate !== "") {
      if (!isIsoDate(payload.dueDate)) {
        return NextResponse.json({ success: false, message: "dueDate must be YYYY-MM-DD" }, { status: 400 })
      }
      dueDate = payload.dueDate
    }

    const [retro] = (await db.execute(sql`SELECT id, title, status FROM retros WHERE id = ${retroId}`)) as unknown as { id: number; title: string; status: string }[]
    if (!retro) {
      return NextResponse.json({ success: false, message: "Retro not found" }, { status: 404 })
    }
    if (retro.status === "archived") {
      return NextResponse.json({ success: false, message: "Archived retros are read-only" }, { status: 400 })
    }

    const [inserted] = (await db.execute(sql`
      INSERT INTO retro_actions (retro_id, body, owner_id, due_date)
      VALUES (${retroId}, ${body}, ${ownerId}, ${dueDate})
      RETURNING id
    `)) as unknown as { id: number }[]

    // Re-read through the join so the client gets the same shape as GET detail.
    const [action] = (await db.execute(sql`
      SELECT
        a.id, a.retro_id, a.body, a.owner_id,
        u.name AS owner_name,
        u.avatar AS owner_avatar,
        to_char(a.due_date, 'YYYY-MM-DD') AS due_date,
        a.done,
        (NOT a.done AND a.due_date IS NOT NULL AND a.due_date < CURRENT_DATE) AS overdue,
        a.created_at
      FROM retro_actions a
      LEFT JOIN users u ON u.id = a.owner_id
      WHERE a.id = ${inserted.id}
    `)) as unknown as ActionRow[]

    if (ownerId !== null && ownerId !== session.id) {
      await createNotification({
        userId: ownerId,
        type: "sprint",
        title: `Action assigned: ${body.slice(0, 80)}`,
        body: `${session.name} assigned you an action from retro "${retro.title}"${dueDate ? ` (due ${dueDate})` : ""}.`,
        link: "/dashboard/retros",
        metadata: { retroId, actionId: action.id, event: "assigned", sourceNoteId: payload.sourceNoteId ?? null },
      })
    }

    return NextResponse.json({ success: true, data: { item: action } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to add action: ${message}` }, { status: 500 })
  }
}
