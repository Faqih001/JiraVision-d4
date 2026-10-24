// POST /api/retros/[id]/notes — add a note to one of the three columns.
// The author is always the session user (no anonymous notes). Draft retros
// accept notes so the team can pre-fill before the session.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

const NOTE_CATEGORIES = ["went_well", "went_bad", "try_next"] as const

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
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
      category?: unknown
      body?: unknown
    } | null

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const category = typeof payload.category === "string" ? payload.category : ""
    if (!(NOTE_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json(
        { success: false, message: `category must be one of: ${NOTE_CATEGORIES.join(", ")}` },
        { status: 400 },
      )
    }

    const body = typeof payload.body === "string" ? payload.body.trim() : ""
    if (!body || body.length > 4000) {
      return NextResponse.json({ success: false, message: "body is required (max 4000 chars)" }, { status: 400 })
    }

    const [retro] = (await db.execute(sql`
      SELECT id, status FROM retros WHERE id = ${retroId}
    `)) as unknown as { id: number; status: string }[]
    if (!retro) {
      return NextResponse.json({ success: false, message: "Retro not found" }, { status: 404 })
    }
    if (retro.status === "archived") {
      return NextResponse.json({ success: false, message: "Archived retros are read-only" }, { status: 400 })
    }

    const [note] = (await db.execute(sql`
      INSERT INTO retro_notes (retro_id, category, body, author_id)
      VALUES (${retroId}, ${category}, ${body}, ${session.id})
      RETURNING id, retro_id, category, body, author_id, votes, false AS my_vote, created_at
    `)) as unknown as {
      id: number
      retro_id: number
      category: string
      body: string
      author_id: number
      votes: number
      my_vote: boolean
      created_at: string | Date
    }[]

    return NextResponse.json({ success: true, data: { item: { ...note, author_name: session.name, author_avatar: session.avatar ?? null } } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to add note: ${message}` }, { status: 500 })
  }
}
