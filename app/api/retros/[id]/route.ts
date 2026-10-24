// GET/PATCH/DELETE /api/retros/[id] — one retro's full board.
// GET returns persisted notes (with per-user vote state) and action items.
// PATCH merges title/date/status/sprint changes. Entering 'completed' is
// gated: every category must hold at least one note, and on success every
// note author + every action owner is notified. DELETE cascades notes and
// actions and is restricted to the retro's creator.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification, notifyMany } from "@/lib/notifications"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

const RETRO_STATUSES = ["draft", "scheduled", "completed", "archived"] as const
type RetroStatus = (typeof RETRO_STATUSES)[number]

const NOTE_CATEGORIES = ["went_well", "went_bad", "try_next"] as const

export type RetroDetail = {
  id: number
  title: string
  date: string
  status: string
  sprint_id: number | null
  sprint_name: string | null
  created_by: number
  creator_name: string
  created_at: string | Date
}

export type NoteRow = {
  id: number
  retro_id: number
  category: string
  body: string
  author_id: number
  author_name: string
  author_avatar: string | null
  votes: number
  my_vote: boolean
  created_at: string | Date
}

export type ActionRow = {
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

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function loadRetro(id: number): Promise<RetroDetail | null> {
  const rows = (await db.execute(sql`
    SELECT
      r.id, r.title,
      to_char(r.date, 'YYYY-MM-DD') AS date,
      r.status, r.sprint_id,
      s.name AS sprint_name,
      r.created_by,
      COALESCE(u.name, 'Unknown user') AS creator_name,
      r.created_at
    FROM retros r
    LEFT JOIN users u ON u.id = r.created_by
    LEFT JOIN sprints s ON s.id = r.sprint_id
    WHERE r.id = ${id}
  `)) as unknown as RetroDetail[]
  return rows[0] ?? null
}

/* ------------------------------------------------------------------- GET */

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params
  const retroId = parseId(id)
  if (retroId === null) {
    return NextResponse.json({ success: false, message: "Invalid retro id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const retro = await loadRetro(retroId)
    if (!retro) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

    const notes = (await db.execute(sql`
      SELECT
        n.id, n.retro_id, n.category, n.body,
        n.author_id,
        COALESCE(u.name, 'Unknown user') AS author_name,
        u.avatar AS author_avatar,
        n.votes,
        (n.voters @> jsonb_build_array(${session.id})) AS my_vote,
        n.created_at
      FROM retro_notes n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE n.retro_id = ${retroId}
      ORDER BY n.votes DESC, n.id ASC
    `)) as unknown as NoteRow[]

    const actions = (await db.execute(sql`
      SELECT
        a.id, a.retro_id, a.body,
        a.owner_id,
        COALESCE(u.name, NULL) AS owner_name,
        u.avatar AS owner_avatar,
        to_char(a.due_date, 'YYYY-MM-DD') AS due_date,
        a.done,
        (NOT a.done AND a.due_date IS NOT NULL AND a.due_date < CURRENT_DATE) AS overdue,
        a.created_at
      FROM retro_actions a
      LEFT JOIN users u ON u.id = a.owner_id
      WHERE a.retro_id = ${retroId}
      ORDER BY a.done ASC, a.due_date NULLS LAST, a.id ASC
    `)) as unknown as ActionRow[]

    return NextResponse.json({ success: true, data: { retro, notes, actions } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to load retro: ${message}` }, { status: 500 })
  }
}

/* ----------------------------------------------------------------- PATCH */

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params
  const retroId = parseId(id)
  if (retroId === null) {
    return NextResponse.json({ success: false, message: "Invalid retro id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const payload = (await request.json().catch(() => null)) as {
      title?: unknown
      date?: unknown
      status?: unknown
      sprintId?: unknown
    } | null

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const existing = await loadRetro(retroId)
    if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

    const title =
      typeof payload.title === "string" && payload.title.trim() ? payload.title.trim().slice(0, 255) : existing.title
    const date = payload.date === undefined ? existing.date : isIsoDate(payload.date) ? payload.date : null
    if (!date) {
      return NextResponse.json({ success: false, message: "date must be YYYY-MM-DD" }, { status: 400 })
    }

    let sprintId = existing.sprint_id
    if (payload.sprintId !== undefined) {
      if (payload.sprintId === null || payload.sprintId === "") {
        sprintId = null
      } else {
        const parsed = Number(payload.sprintId)
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return NextResponse.json({ success: false, message: "sprintId must be a positive integer or null" }, { status: 400 })
        }
        const [sprint] = (await db.execute(sql`SELECT id FROM sprints WHERE id = ${parsed}`)) as unknown as { id: number }[]
        if (!sprint) {
          return NextResponse.json({ success: false, message: `Sprint ${parsed} does not exist` }, { status: 400 })
        }
        sprintId = parsed
      }
    }

    const status =
      typeof payload.status === "string" && (RETRO_STATUSES as readonly string[]).includes(payload.status)
        ? (payload.status as RetroStatus)
        : (existing.status as RetroStatus)

    // Honest gating: a retro only completes when every column holds ≥1 note.
    if (status === "completed" && existing.status !== "completed") {
      const counts = (await db.execute(sql`
        SELECT category, count(*)::int AS count
        FROM retro_notes
        WHERE retro_id = ${retroId}
        GROUP BY category
      `)) as unknown as { category: string; count: number }[]
      const byCategory = new Map(counts.map((c) => [c.category, c.count]))
      const missing = NOTE_CATEGORIES.filter((c) => (byCategory.get(c) ?? 0) < 1)
      if (missing.length > 0) {
        const labels: Record<string, string> = { went_well: "Went well", went_bad: "Went bad", try_next: "Try next" }
        return NextResponse.json(
          {
            success: false,
            message: `Cannot complete: ${missing.map((c) => `"${labels[c]}"`).join(", ")} ${missing.length === 1 ? "column has no notes" : "columns have no notes"}. Add at least one note per column first.`,
          },
          { status: 400 },
        )
      }
    }

    const [row] = (await db.execute(sql`
      UPDATE retros
      SET title = ${title},
          date = ${date},
          status = ${status},
          sprint_id = ${sprintId}
      WHERE id = ${retroId}
      RETURNING id, sprint_id, title, to_char(date, 'YYYY-MM-DD') AS date, status, created_by, created_at
    `)) as unknown as {
      id: number
      sprint_id: number | null
      title: string
      date: string
      status: string
      created_by: number
      created_at: string | Date
    }[]

    const sprintName = sprintId ? (existing.sprint_id === sprintId ? existing.sprint_name : `sprint #${sprintId}`) : null

    // Notification events — only on real transitions.
    if (status === "completed" && existing.status !== "completed") {
      const recipientRows = (await db.execute(sql`
        SELECT DISTINCT author_id AS uid FROM retro_notes WHERE retro_id = ${retroId}
        UNION
        SELECT DISTINCT owner_id AS uid FROM retro_actions WHERE retro_id = ${retroId} AND owner_id IS NOT NULL
      `)) as unknown as { uid: number }[]
      const [noteCountRow] = (await db.execute(sql`SELECT count(*)::int AS c FROM retro_notes WHERE retro_id = ${retroId}`)) as unknown as { c: number }[]
      const [actionCountRow] = (await db.execute(sql`SELECT count(*)::int AS c FROM retro_actions WHERE retro_id = ${retroId}`)) as unknown as { c: number }[]
      await notifyMany(recipientRows.map((r) => r.uid), {
        type: "sprint",
        title: `Retro completed: ${title}`,
        body: `${session.name} completed the retro with ${noteCountRow?.c ?? 0} notes and ${actionCountRow?.c ?? 0} action items${sprintName ? ` (${sprintName})` : ""}.`,
        link: "/dashboard/retros",
        metadata: { retroId, action: "completed" },
      })
    } else if (status === "scheduled" && existing.status !== "scheduled") {
      await createNotification({
        userId: existing.created_by,
        type: "sprint",
        title: `Retro scheduled: ${title}`,
        body: `${date}${sprintName ? ` · ${sprintName}` : ""}. The board is open for notes.`,
        link: "/dashboard/retros",
        metadata: { retroId, action: "scheduled" },
      })
    }

    const fresh = await loadRetro(retroId)
    return NextResponse.json({ success: true, data: { item: fresh ?? row } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to update retro: ${message}` }, { status: 500 })
  }
}

/* ---------------------------------------------------------------- DELETE */

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params
  const retroId = parseId(id)
  if (retroId === null) {
    return NextResponse.json({ success: false, message: "Invalid retro id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const existing = await loadRetro(retroId)
    if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    if (existing.created_by !== session.id) {
      return NextResponse.json(
        { success: false, message: "Only the retro's creator can delete it — archive instead?" },
        { status: 403 },
      )
    }

    // ON DELETE CASCADE removes retro_notes + retro_actions rows.
    const [row] = (await db.execute(sql`
      DELETE FROM retros WHERE id = ${retroId} RETURNING id
    `)) as unknown as { id: number }[]

    if (!row) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: row.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to delete retro: ${message}` }, { status: 500 })
  }
}
