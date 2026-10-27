// POST /api/playbooks/[id]/publish — the one way a playbook becomes company knowledge.
// The gate is the pure publish rule, so the editor's disabled reason and this refusal are
// the same sentence.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { playbooks } from "@/drizzle/schema"
import { canEditPlaybook, publishProblem } from "@/lib/playbooks/rules"
import { loadPlaybook } from "@/lib/playbooks/read"
import { bad, parseId, playbookSession } from "../../_shared"

export const dynamic = "force-dynamic"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await playbookSession()
  if (!gate) return bad("Unauthorized", 401)

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return bad("Playbook id must be a positive integer")

  try {
    const row = await loadPlaybook(id, gate.viewer)
    if (!row || !canEditPlaybook(row, gate.viewer)) {
      return bad("Playbook not found", 404)
    }

    const problem = publishProblem(row)
    if (problem) return bad(problem, 409)

    await db
      .update(playbooks)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(playbooks.id, id))

    const updated = await loadPlaybook(id, gate.viewer)
    return NextResponse.json({ success: true, data: { playbook: updated } })
  } catch (error) {
    console.error("Playbook publish error:", error)
    return bad("Failed to publish the playbook", 500)
  }
}
