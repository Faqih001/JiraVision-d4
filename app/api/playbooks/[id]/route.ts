// GET/PATCH /api/playbooks/[id] — read one playbook and edit it in place. Only the author
// or an admin may change it; publishing has its own route. A content edit of a model draft
// is the human review that clears `aiMarked`, and an edit of a published book bumps the
// version so every log row that named the old one stays honest.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { playbooks } from "@/drizzle/schema"
import { readPlaybookInput } from "@/lib/playbooks/fields"
import { canEditPlaybook } from "@/lib/playbooks/rules"
import { loadPlaybook } from "@/lib/playbooks/read"
import { loadPacks } from "@/lib/registers/read"
import { bad, parseId, playbookSession } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await playbookSession()
  if (!gate) return bad("Unauthorized", 401)

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return bad("Playbook id must be a positive integer")

  try {
    const playbook = await loadPlaybook(id, gate.viewer)
    if (!playbook) return bad("Playbook not found", 404)

    const packs = await loadPacks(false)
    return NextResponse.json({
      success: true,
      data: { playbook, packs, admin: gate.viewer.admin, today: gate.today },
    })
  } catch (error) {
    console.error("Playbook read error:", error)
    return bad("Failed to load the playbook", 500)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await playbookSession()
  if (!gate) return bad("Unauthorized", 401)

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return bad("Playbook id must be a positive integer")

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  try {
    const row = await loadPlaybook(id, gate.viewer)
    if (!row || !canEditPlaybook(row, gate.viewer)) {
      return bad("Playbook not found", 404)
    }

    const contentEdited = [
      "title",
      "summary",
      "method",
      "steps",
      "precautions",
      "recommendations",
      "tags",
    ].some((key) => body[key] !== undefined)

    const merged = {
      packKey: row.packKey,
      discipline: body.discipline !== undefined ? body.discipline : row.discipline,
      title: body.title !== undefined ? body.title : row.title,
      summary: body.summary !== undefined ? body.summary : row.summary,
      scopeKind: body.scopeKind !== undefined ? body.scopeKind : row.scopeKind,
      method: body.method !== undefined ? body.method : row.method,
      steps: body.steps !== undefined ? body.steps : row.steps,
      precautions: body.precautions !== undefined ? body.precautions : row.precautions,
      recommendations: body.recommendations !== undefined ? body.recommendations : row.recommendations,
      tags: body.tags !== undefined ? body.tags : row.tags,
      verifyIntervalDays:
        body.verifyIntervalDays !== undefined ? body.verifyIntervalDays : row.verifyIntervalDays,
    }

    const parsed = readPlaybookInput(merged, row.method)
    if (!parsed.ok) return bad(parsed.error)

    if (body.status !== undefined && body.status !== "draft" && body.status !== "archived") {
      return bad("status may only be draft or archived here; publish through its own route.")
    }

    const update = {
      ...parsed.value,
      status: body.status !== undefined ? body.status : row.status,
      aiMarked: contentEdited && row.source === "gemini" ? false : row.aiMarked,
      version: contentEdited && row.status === "published" ? row.version + 1 : row.version,
      updatedAt: new Date(),
    }

    await db.update(playbooks).set(update).where(eq(playbooks.id, id))

    const updated = await loadPlaybook(id, gate.viewer)
    return NextResponse.json({ success: true, data: { playbook: updated } })
  } catch (error) {
    console.error("Playbook update error:", error)
    return bad("Failed to update the playbook", 500)
  }
}
