// GET/POST /api/retros — the retrospectives workspace feed.
// GET returns every retro with persisted note/action counters, the top-voted
// note preview, plus workspace-wide stats (KPI strip + analytics series).
// POST creates a retro (draft or scheduled). A scheduled retro notifies its
// creator through the shared notification pipeline.
//
// Vote model: retro_notes.voters is a JSONB array of user ids and retro_notes
// .votes is kept in lockstep with jsonb_array_length(voters) by the vote
// route, so one vote per user per note is enforced in the database itself.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export type RetroListItem = {
  id: number
  title: string
  date: string
  status: string
  sprint_id: number | null
  sprint_name: string | null
  created_by: number
  creator_name: string
  creator_avatar: string | null
  created_at: string | Date
  note_count: number
  went_well_count: number
  went_bad_count: number
  try_next_count: number
  action_count: number
  actions_done: number
  actions_open: number
  actions_overdue: number
  top_note: { body: string; votes: number; category: string } | null
}

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

/* ------------------------------------------------------------------- GET */

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const items = (await db.execute(sql`
      SELECT
        r.id,
        r.title,
        to_char(r.date, 'YYYY-MM-DD') AS date,
        r.status,
        r.sprint_id,
        s.name AS sprint_name,
        r.created_by,
        u.name AS creator_name,
        u.avatar AS creator_avatar,
        r.created_at,
        (SELECT count(*)::int FROM retro_notes n WHERE n.retro_id = r.id) AS note_count,
        (SELECT count(*)::int FROM retro_notes n WHERE n.retro_id = r.id AND n.category = 'went_well') AS went_well_count,
        (SELECT count(*)::int FROM retro_notes n WHERE n.retro_id = r.id AND n.category = 'went_bad') AS went_bad_count,
        (SELECT count(*)::int FROM retro_notes n WHERE n.retro_id = r.id AND n.category = 'try_next') AS try_next_count,
        (SELECT count(*)::int FROM retro_actions a WHERE a.retro_id = r.id) AS action_count,
        (SELECT count(*)::int FROM retro_actions a WHERE a.retro_id = r.id AND a.done) AS actions_done,
        (SELECT count(*)::int FROM retro_actions a WHERE a.retro_id = r.id AND NOT a.done) AS actions_open,
        (SELECT count(*)::int FROM retro_actions a WHERE a.retro_id = r.id AND NOT a.done AND a.due_date < CURRENT_DATE) AS actions_overdue,
        (
          SELECT json_build_object('body', tn.body, 'votes', tn.votes, 'category', tn.category)
          FROM retro_notes tn
          WHERE tn.retro_id = r.id
          ORDER BY tn.votes DESC, tn.id ASC
          LIMIT 1
        ) AS top_note
      FROM retros r
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN sprints s ON s.id = r.sprint_id
      ORDER BY r.date DESC, r.id DESC
    `)) as unknown as RetroListItem[]

    // One grouped query for the category-mix donut across ALL retros.
    const categoryMix = (await db.execute(sql`
      SELECT category, count(*)::int AS count
      FROM retro_notes
      GROUP BY category
    `)) as unknown as { category: string; count: number }[]

    const retrosHeld = items.filter((r) => r.status === "completed").length
    const totalNotes = items.reduce((sum, r) => sum + r.note_count, 0)
    const totalActions = items.reduce((sum, r) => sum + r.action_count, 0)
    const doneActions = items.reduce((sum, r) => sum + r.actions_done, 0)

    return NextResponse.json({
      success: true,
      data: {
        items,
        stats: {
          retrosTotal: items.length,
          retrosHeld,
          actionsOpen: items.reduce((sum, r) => sum + r.actions_open, 0),
          actionsOverdue: items.reduce((sum, r) => sum + r.actions_overdue, 0),
          avgNotesPerRetro: items.length > 0 ? Math.round((totalNotes / items.length) * 10) / 10 : 0,
          actionCompletionPct: totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0,
        },
        categoryMix,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to load retros: ${message}` }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ POST */

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const payload = (await request.json().catch(() => null)) as {
      title?: unknown
      sprintId?: unknown
      date?: unknown
      status?: unknown
    } | null

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const title = typeof payload.title === "string" ? payload.title.trim() : ""
    if (!title || title.length > 255) {
      return NextResponse.json({ success: false, message: "title is required (max 255 chars)" }, { status: 400 })
    }
    const date = isIsoDate(payload.date) ? payload.date : null
    if (!date) {
      return NextResponse.json({ success: false, message: "date is required (YYYY-MM-DD)" }, { status: 400 })
    }
    // Creation only enters the workspace as draft or scheduled; completion is
    // a gated transition handled by PATCH /api/retros/[id].
    const status = payload.status === "scheduled" ? "scheduled" : "draft"

    let sprintId: number | null = null
    if (payload.sprintId !== null && payload.sprintId !== undefined && payload.sprintId !== "") {
      sprintId = Number(payload.sprintId)
      if (!Number.isInteger(sprintId) || sprintId <= 0) {
        return NextResponse.json({ success: false, message: "sprintId must be a positive integer" }, { status: 400 })
      }
      const [sprint] = (await db.execute(sql`SELECT id FROM sprints WHERE id = ${sprintId}`)) as unknown as { id: number }[]
      if (!sprint) {
        return NextResponse.json({ success: false, message: `Sprint ${sprintId} does not exist` }, { status: 400 })
      }
    }

    const [created] = (await db.execute(sql`
      INSERT INTO retros (sprint_id, title, date, status, created_by)
      VALUES (${sprintId}, ${title}, ${date}, ${status}, ${session.id})
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

    if (status === "scheduled") {
      await createNotification({
        userId: session.id,
        type: "sprint",
        title: `Retro scheduled: ${title}`,
        body: `${date}${sprintId ? ` · linked to sprint #${sprintId}` : ""}. The board is open for notes.`,
        link: "/dashboard/retros",
        metadata: { retroId: created.id, action: "scheduled" },
      })
    }

    return NextResponse.json({ success: true, data: { item: created } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to create retro: ${message}` }, { status: 500 })
  }
}
