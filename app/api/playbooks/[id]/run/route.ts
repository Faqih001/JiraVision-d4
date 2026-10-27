// POST /api/playbooks/[id]/run — following a published SOP once (design §12 item 5).
// The run leaves one action row per method phase in the work log, each naming the playbook
// and the version that was followed, so the day's record can be checked against the sheet.

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workLogEntries } from "@/drizzle/schema"
import { readRunNotes, runEntryDrafts } from "@/lib/playbooks/method"
import { loadPlaybook } from "@/lib/playbooks/read"
import { bad, parseId, playbookSession } from "../../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await playbookSession()
  if (!gate) return bad("Unauthorized", 401)

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return bad("Playbook id must be a positive integer")

  try {
    const row = await loadPlaybook(id, gate.viewer)
    if (!row) return bad("Playbook not found", 404)
    if (row.status !== "published") {
      return bad("Publish the playbook before running it.", 409)
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const workedOn = typeof body.workedOn === "string" ? body.workedOn : gate.today
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workedOn) || workedOn > gate.today) {
      return bad("workedOn must be a date that is not in the future.")
    }

    const notes = readRunNotes(body.notes, row.method)
    if (!notes.ok) return bad(notes.error)

    const drafts = runEntryDrafts(row, notes.value)
    await db.transaction(async (tx) => {
      await tx.insert(workLogEntries).values(
        drafts.map((draft) => ({
          kind: draft.kind,
          title: draft.title,
          body: draft.body,
          discipline: draft.discipline,
          playbookId: draft.playbookId,
          playbookVersion: draft.playbookVersion,
          userId: gate.session.id,
          workedOn,
          source: "manual",
        })),
      )
    })

    return NextResponse.json(
      { success: true, data: { count: drafts.length, workedOn } },
      { status: 201 },
    )
  } catch (error) {
    console.error("Playbook run error:", error)
    return bad("Failed to record the run", 500)
  }
}
