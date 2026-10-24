// PATCH/DELETE /api/retros/[id]/notes/[noteId] — edit or remove a note.
// Only the note's author may change it (the workspace has no admin override);
// removing a note removes its voter list with it.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string; noteId: string }> }

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

async function loadNote(noteId: number) {
  const rows = (await db.execute(sql`
    SELECT n.id, n.retro_id, n.category, n.body, n.author_id, n.votes, n.created_at, r.status AS retro_status
    FROM retro_notes n
    JOIN retros r ON r.id = n.retro_id
    WHERE n.id = ${noteId}
  `)) as unknown as {
    id: number
    retro_id: number
    category: string
    body: string
    author_id: number
    votes: number
    created_at: string | Date
    retro_status: string
  }[]
  return rows[0] ?? null
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id, noteId } = await context.params
  const retroId = Number(id)
  const noteIdNum = Number(noteId)
  if (!Number.isInteger(retroId) || retroId <= 0 || !Number.isInteger(noteIdNum) || noteIdNum <= 0) {
    return NextResponse.json({ success: false, message: "Invalid retro or note id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const payload = (await request.json().catch(() => null)) as { body?: unknown } | null
    const body = typeof payload?.body === "string" ? payload.body.trim() : ""
    if (!body || body.length > 4000) {
      return NextResponse.json({ success: false, message: "body is required (max 4000 chars)" }, { status: 400 })
    }

    const existing = await loadNote(noteIdNum)
    if (!existing || existing.retro_id !== retroId) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    }
    if (existing.author_id !== session.id) {
      return NextResponse.json({ success: false, message: "Only the note's author can edit it" }, { status: 403 })
    }

    const [updated] = (await db.execute(sql`
      UPDATE retro_notes SET body = ${body}
      WHERE id = ${noteIdNum}
      RETURNING id, retro_id, category, body, author_id, votes, created_at
    `)) as unknown as {
      id: number
      retro_id: number
      category: string
      body: string
      author_id: number
      votes: number
      created_at: string | Date
    }[]

    return NextResponse.json({
      success: true,
      data: { item: { ...updated, author_name: session.name, author_avatar: session.avatar ?? null, my_vote: true } },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to update note: ${message}` }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id, noteId } = await context.params
  const retroId = Number(id)
  const noteIdNum = Number(noteId)
  if (!Number.isInteger(retroId) || retroId <= 0 || !Number.isInteger(noteIdNum) || noteIdNum <= 0) {
    return NextResponse.json({ success: false, message: "Invalid retro or note id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const existing = await loadNote(noteIdNum)
    if (!existing || existing.retro_id !== retroId) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    }
    if (existing.author_id !== session.id) {
      // The retro creator may clear their own board; others may only remove
      // their own notes.
      const [retro] = (await db.execute(sql`SELECT created_by FROM retros WHERE id = ${retroId}`)) as unknown as { created_by: number }[]
      if (!retro || retro.created_by !== session.id) {
        return NextResponse.json({ success: false, message: "Only the note's author (or the retro creator) can remove it" }, { status: 403 })
      }
    }

    await db.execute(sql`DELETE FROM retro_notes WHERE id = ${noteIdNum}`)
    return NextResponse.json({ success: true, data: { deleted: noteIdNum } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to delete note: ${message}` }, { status: 500 })
  }
}
