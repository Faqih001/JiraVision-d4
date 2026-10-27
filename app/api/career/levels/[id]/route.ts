// PATCH /api/career/levels/[id] — the admin ladder editor (design §11). Edits the wording,
// targets, checklist and band of one rung. It never touches a placement, a sign-off or any
// member row: changing what a rung asks for cannot silently move anyone up it.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { careerLevels } from "@/drizzle/schema"
import { readBand } from "@/lib/career/bands"
import { readChecklist, readTargets } from "@/lib/career/review"
import { normaliseChecklist } from "@/lib/career/readiness"
import { normaliseTargets } from "@/lib/career/signals"
import { bad, careerAdmin } from "../../_shared"

export const dynamic = "force-dynamic"

const MAX_TEXT = 2000

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await careerAdmin()
  if ("error" in gate) return gate.error

  const { id: rawId } = await params
  const id = Number.parseInt(rawId, 10)
  if (!Number.isFinite(id) || id <= 0) return bad("Career level id must be a positive integer")

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!title || title.length > 200) return bad("title must be 1–200 characters")

  const text = (value: unknown): string | null | undefined => {
    if (value === undefined) return undefined
    if (value === null) return null
    if (typeof value !== "string") return undefined
    const trimmed = value.trim()
    return trimmed || null
  }

  const summary = text(body.summary)
  const expectations = text(body.expectations)
  if (summary === undefined && body.summary !== undefined) return bad("summary must be text")
  if (expectations === undefined && body.expectations !== undefined) {
    return bad("expectations must be text")
  }
  if ((summary ?? "").length > MAX_TEXT) return bad(`summary must be ${MAX_TEXT} characters or fewer`)
  if ((expectations ?? "").length > MAX_TEXT) {
    return bad(`expectations must be ${MAX_TEXT} characters or fewer`)
  }

  const patch: Record<string, unknown> = { title, summary, expectations, updatedAt: new Date() }

  if (body.band !== undefined) {
    const band = readBand(body.band as { min?: unknown; max?: unknown; currency?: unknown })
    if (!band.ok) return bad(band.error)
    patch.bandMin = band.band.min
    patch.bandMax = band.band.max
    patch.bandCurrency = band.band.currency
  }

  if (body.signals !== undefined) {
    const targets = readTargets(body.signals)
    if (!targets.ok) return bad(targets.error)
    patch.signals = targets.targets
  }

  if (body.checklist !== undefined) {
    const checklist = readChecklist(body.checklist)
    if (!checklist.ok) return bad(checklist.error)
    patch.checklist = checklist.items
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return bad("isActive must be true or false")
    patch.isActive = body.isActive
  }

  try {
    const [row] = await db
      .update(careerLevels)
      .set(patch)
      .where(eq(careerLevels.id, id))
      .returning()
    if (!row) return bad("Career level not found", 404)

    return NextResponse.json({
      success: true,
      data: {
        level: {
          ...row,
          signals: normaliseTargets(row.signals),
          checklist: normaliseChecklist(row.checklist),
        },
      },
    })
  } catch (error) {
    console.error("Career level update error:", error)
    return NextResponse.json({ success: false, error: "Failed to save the rung" }, { status: 500 })
  }
}
