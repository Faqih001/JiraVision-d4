// /api/ops/config/apply — the only door that writes an operations config.
//
// POST → { proposal, selectedRefs } from the approval screen. The proposal is re-normalised here rather
// than trusted: whatever arrives goes through the same refusals the model's output went through, so a
// hand-edited payload cannot smuggle a credential-shaped field or a KPI that counts nothing. The merge is
// additive-only and the result is validated by the seed script's own schema before it reaches the database.
//
// Scope: an admin applies to the pack their own discipline resolves to, the same pack /api/ops/config
// reads. There is no packKey parameter — a body field naming someone else's pack would be a way to
// reconfigure a discipline the caller does not work in.

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { rolePacks, opsConfigAudit } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { diffConfig, mergeAndValidate } from "@/lib/ops/config/diff"
import { normaliseProposal } from "@/lib/ops/config/proposal"
import { badRequest, forbidden, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()
  if (session.role !== "admin" && session.role !== "super_admin") {
    return forbidden("Only an admin can change a pack's operations rules.")
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return badRequest("A JSON body is required.")

    const { proposal, selectedRefs } = body as Record<string, unknown>
    if (!Array.isArray(selectedRefs) || !selectedRefs.every((ref) => typeof ref === "string")) {
      return badRequest("selectedRefs must be an array of refs.")
    }
    if (selectedRefs.length === 0) return badRequest("Select at least one proposed item to apply.")
    if (selectedRefs.length > 200) return badRequest("Too many items selected at once.")

    const discipline = defaultDisciplineOf(session)
    if (!discipline) {
      return badRequest("No discipline configured for your account. Set a work discipline in Settings first.")
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) return badRequest("Your discipline does not have an operations pack yet.")

    const outcome = normaliseProposal(ctx.config, proposal)
    const diff = diffConfig(ctx.config, outcome.proposal)
    const merged = mergeAndValidate(ctx.config, { ...diff, rejected: outcome.rejected }, outcome.proposal, selectedRefs as string[])

    if (!merged.ok) {
      return NextResponse.json(
        { success: false, message: "The selected items do not form a valid config.", errors: merged.errors },
        { status: 400 },
      )
    }

    const previous = ctx.config
    await db
      .update(rolePacks)
      .set({ opsConfig: merged.config, updatedAt: new Date() })
      .where(eq(rolePacks.packKey, ctx.packKey))

    // An audit line without document content: who changed which pack, and how much of it moved.
    const conflicts = merged.applied.filter((item) => item.status === "conflict").length
    console.log(`opsConfig apply: user=${session.id} pack=${ctx.packKey} applied=${merged.applied.length} replaced=${conflicts}`)

    await db.insert(opsConfigAudit).values({
      packKey: ctx.packKey,
      discipline,
      userId: session.id,
      operation: "apply",
      summary: { applied: merged.applied.length, replaced: conflicts, new: merged.applied.filter((item) => item.status === "new").length },
    })

    return NextResponse.json({
      success: true,
      data: {
        packKey: ctx.packKey,
        discipline,
        applied: merged.applied,
        counts: diff.counts,
        rejected: outcome.rejected,
        config: merged.config,
        previous,
      },
    })
  } catch (error) {
    return serverError(error, "apply ops config")
  }
}
