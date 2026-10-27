// /api/playbooks — the SOP library (design §12 item 5). GET lists what the reader may see,
// filtered by the page's URL state. POST opens a draft against a role pack; the author,
// status, version and source are decided here, never taken from the body.

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { playbooks } from "@/drizzle/schema"
import { readPlaybookInput } from "@/lib/playbooks/fields"
import { defaultMethod } from "@/lib/playbooks/method"
import { loadPlaybook, loadVisiblePlaybooks } from "@/lib/playbooks/read"
import { loadPacks } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { bad, playbookSession } from "./_shared"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const gate = await playbookSession()
  if (!gate) return bad("Unauthorized", 401)

  try {
    const search = new URL(request.url).searchParams
    const rows = await loadVisiblePlaybooks(gate.viewer, {
      q: search.get("q"),
      status: search.get("status"),
      packKey: search.get("pack"),
      discipline: search.get("discipline"),
    })
    const packs = await loadPacks(false)

    return NextResponse.json({
      success: true,
      data: { playbooks: rows, packs, admin: gate.viewer.admin, today: gate.today },
    })
  } catch (error) {
    console.error("Playbook read error:", error)
    return bad("Failed to load the playbooks", 500)
  }
}

export async function POST(request: Request) {
  const gate = await playbookSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  try {
    const packs = await loadPacks(false)
    const packKey = typeof body.packKey === "string" ? body.packKey.trim() : ""
    const pack = packKey ? packByKey(packs, packKey) : null
    if (!pack) return bad("That role pack does not exist or is inactive.", 404)

    const parsed = readPlaybookInput(body, defaultMethod(pack.method))
    if (!parsed.ok) return bad(parsed.error)

    const [inserted] = await db
      .insert(playbooks)
      .values({
        ...parsed.value,
        status: "draft",
        version: 1,
        authorId: gate.session.id,
        source: "manual",
        aiMarked: false,
      })
      .returning({ id: playbooks.id })

    const row = await loadPlaybook(inserted.id, gate.viewer)
    return NextResponse.json({ success: true, data: { playbook: row } }, { status: 201 })
  } catch (error) {
    console.error("Playbook create error:", error)
    return bad("Failed to create the playbook", 500)
  }
}
