// POST/DELETE /api/retros/[id]/notes/[noteId]/vote — the voting endpoint.
//
// VOTE MODEL (documented choice): retro_notes.voters is a JSONB array of the
// user ids who voted, and retro_notes.votes is kept equal to
// jsonb_array_length(voters) in the same UPDATE. One vote per user per note
// is therefore enforced by the database row itself — a second POST matches
// zero rows (the WHERE clause excludes voters that already contain the id)
// and is answered with 409 "You already voted on this note". DELETE removes
// the caller's id from the array (un-vote) and is idempotent.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string; noteId: string }> }

type NoteStatusRow = { id: number; retro_id: number; voters: unknown; votes: number } | null

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

async function parseNote(context: Context) {
  const { id, noteId } = await context.params
  const retroId = Number(id)
  const noteIdNum = Number(noteId)
  if (!Number.isInteger(retroId) || retroId <= 0 || !Number.isInteger(noteIdNum) || noteIdNum <= 0) {
    return { retroId: null, noteId: null }
  }
  return { retroId, noteId: noteIdNum }
}

async function loadNoteStatus(noteId: number): Promise<NoteStatusRow> {
  const rows = (await db.execute(sql`
    SELECT id, retro_id, voters, votes FROM retro_notes WHERE id = ${noteId}
  `)) as unknown as NoteStatusRow[]
  return rows[0] ?? null
}

type NoteStatusRow_ = { id: number; retro_id: number; voters: unknown; votes: number }

export async function POST(_request: NextRequest, context: Context) {
  const { retroId, noteId } = await parseNote(context)
  if (retroId === null || noteId === null) {
    return NextResponse.json({ success: false, message: "Invalid retro or note id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const [updated] = (await db.execute(sql`
      UPDATE retro_notes
      SET voters = coalesce(voters, '[]'::jsonb) || jsonb_build_array(${session.id}),
          votes = jsonb_array_length(coalesce(voters, '[]'::jsonb) || jsonb_build_array(${session.id}))
      WHERE id = ${noteId}
        AND retro_id = ${retroId}
        AND NOT coalesce(voters, '[]'::jsonb) @> jsonb_build_array(${session.id})
      RETURNING id, votes
    `)) as unknown as { id: number; votes: number }[]

    if (!updated) {
      const existing = await loadNoteStatus(noteId)
      if (!existing || (existing as NoteStatusRow_).retro_id !== retroId) {
        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
      }
      return NextResponse.json(
        { success: false, message: "You already voted on this note — one vote per person.", data: { votes: existing.votes, alreadyVoted: true } },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, data: { noteId: updated.id, votes: updated.votes, myVote: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to record vote: ${message}` }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { retroId, noteId } = await parseNote(context)
  if (retroId === null || noteId === null) {
    return NextResponse.json({ success: false, message: "Invalid retro or note id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const [updated] = (await db.execute(sql`
      UPDATE retro_notes
      SET voters = (
            SELECT coalesce(jsonb_agg(v), '[]'::jsonb)
            FROM jsonb_array_elements(coalesce(voters, '[]'::jsonb)) AS v
            WHERE v <> to_jsonb(${session.id}::int)
          ),
          votes = votes - CASE WHEN coalesce(voters, '[]'::jsonb) @> jsonb_build_array(${session.id}) THEN 1 ELSE 0 END
      WHERE id = ${noteId}
        AND retro_id = ${retroId}
      RETURNING id, votes
    `)) as unknown as { id: number; votes: number }[]

    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { noteId: updated.id, votes: updated.votes, myVote: false } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to remove vote: ${message}` }, { status: 500 })
  }
}
