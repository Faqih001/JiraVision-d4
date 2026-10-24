// PATCH/DELETE /api/retros/[id]/actions/[actionId] — update or remove an action.
// PATCH accepts partial merges of body/ownerId/dueDate/done.
// Notification events (type "sprint", link /dashboard/retros):
//   * owner assigned / reassigned to someone other than the actor → the new owner
//   * action checked (done false → true) → the current owner (per workspace spec,
//     fired even when the owner is the actor so the ledger stays verifiable)

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string; actionId: string }> }

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

async function loadAction(actionId: number): Promise<ActionRow | null> {
  const rows = (await db.execute(sql`
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
    WHERE a.id = ${actionId}
  `)) as unknown as ActionRow[]
  return rows[0] ?? null
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id, actionId } = await context.params
  const retroId = Number(id)
  const actionIdNum = Number(actionId)
  if (!Number.isInteger(retroId) || retroId <= 0 || !Number.isInteger(actionIdNum) || actionIdNum <= 0) {
    return NextResponse.json({ success: false, message: "Invalid retro or action id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const payload = (await request.json().catch(() => null)) as {
      body?: unknown
      ownerId?: unknown
      dueDate?: unknown
      done?: unknown
    } | null

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const existing = await loadAction(actionIdNum)
    if (!existing || existing.retro_id !== retroId) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    }

    const body =
      typeof payload.body === "string" && payload.body.trim() ? payload.body.trim().slice(0, 4000) : existing.body

    let ownerId = existing.owner_id
    if (payload.ownerId !== undefined) {
      if (payload.ownerId === null || payload.ownerId === "") {
        ownerId = null
      } else {
        const parsed = Number(payload.ownerId)
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return NextResponse.json({ success: false, message: "ownerId must be a positive integer or null" }, { status: 400 })
        }
        const [user] = (await db.execute(sql`SELECT id FROM users WHERE id = ${parsed}`)) as unknown as { id: number }[]
        if (!user) {
          return NextResponse.json({ success: false, message: `User ${parsed} does not exist` }, { status: 400 })
        }
        ownerId = parsed
      }
    }

    let dueDate = existing.due_date
    if (payload.dueDate !== undefined) {
      if (payload.dueDate === null || payload.dueDate === "") {
        dueDate = null
      } else if (isIsoDate(payload.dueDate)) {
        dueDate = payload.dueDate
      } else {
        return NextResponse.json({ success: false, message: "dueDate must be YYYY-MM-DD or null" }, { status: 400 })
      }
    }

    const done = typeof payload.done === "boolean" ? payload.done : existing.done

    const [updated] = (await db.execute(sql`
      UPDATE retro_actions
      SET body = ${body}, owner_id = ${ownerId}, due_date = ${dueDate}, done = ${done}
      WHERE id = ${actionIdNum}
      RETURNING id
    `)) as unknown as { id: number }[]
    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

    const [retro] = (await db.execute(sql`SELECT title FROM retros WHERE id = ${retroId}`)) as unknown as { title: string }[]
    const retroTitle = retro?.title ?? `retro #${retroId}`

    // Reassignment event — new owner differs from both the actor and the old owner.
    if (ownerId !== null && ownerId !== session.id && ownerId !== existing.owner_id) {
      await createNotification({
        userId: ownerId,
        type: "sprint",
        title: `Action assigned: ${body.slice(0, 80)}`,
        body: `${session.name} made you responsible for an action from retro "${retroTitle}"${dueDate ? ` (due ${dueDate})` : ""}.`,
        link: "/dashboard/retros",
        metadata: { retroId, actionId: actionIdNum, event: "reassigned" },
      })
    }

    // Check-off event — fires on the false → true transition.
    if (done && !existing.done && ownerId !== null) {
      await createNotification({
        userId: ownerId,
        type: "sprint",
        title: `Action completed: ${body.slice(0, 80)}`,
        body: `${session.name} marked this action done in retro "${retroTitle}".`,
        link: "/dashboard/retros",
        metadata: { retroId, actionId: actionIdNum, event: "checked" },
      })
    }

    const fresh = await loadAction(actionIdNum)
    return NextResponse.json({ success: true, data: { item: fresh } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to update action: ${message}` }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id, actionId } = await context.params
  const retroId = Number(id)
  const actionIdNum = Number(actionId)
  if (!Number.isInteger(retroId) || retroId <= 0 || !Number.isInteger(actionIdNum) || actionIdNum <= 0) {
    return NextResponse.json({ success: false, message: "Invalid retro or action id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const existing = await loadAction(actionIdNum)
    if (!existing || existing.retro_id !== retroId) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    }

    await db.execute(sql`DELETE FROM retro_actions WHERE id = ${actionIdNum}`)
    return NextResponse.json({ success: true, data: { deleted: actionIdNum } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to delete action: ${message}` }, { status: 500 })
  }
}
