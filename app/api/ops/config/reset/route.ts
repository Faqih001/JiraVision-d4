// /api/ops/config/reset — put a pack back on the config its code declares.
//
// POST → { confirm: true }. This is the undo for a bad apply: it writes the registry's authored or derived
// config (lib/packs/ops/registry.ts), which is exactly what the seed script put there, so it removes every
// item a document added. It cannot restore a partially edited state — the previous config is returned by
// the apply call that made it.

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { rolePacks } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { opsConfigForPackKey } from "@/lib/packs/ops/registry"
import { safeValidateOpsConfig } from "@/lib/packs/ops/validator"
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
    const confirm = body && typeof body === "object" ? (body as Record<string, unknown>).confirm : null
    if (confirm !== true) return badRequest("Pass { confirm: true } to replace the live config with the one this pack's code declares.")

    const discipline = defaultDisciplineOf(session)
    if (!discipline) return badRequest("No discipline configured for your account. Set a work discipline in Settings first.")

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) return badRequest("Your discipline does not have an operations pack yet.")

    const authored = opsConfigForPackKey(ctx.packKey)
    if (!authored) {
      return NextResponse.json(
        { success: false, message: `No code-authored config exists for pack "${ctx.packKey}", so there is nothing to reset to.` },
        { status: 409 },
      )
    }

    const checked = safeValidateOpsConfig(authored)
    if (!checked.success) {
      return NextResponse.json(
        {
          success: false,
          message: "The code-authored config for this pack no longer validates.",
          errors: checked.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
        },
        { status: 500 },
      )
    }

    await db
      .update(rolePacks)
      .set({ opsConfig: checked.data, updatedAt: new Date() })
      .where(eq(rolePacks.packKey, ctx.packKey))

    console.log(`opsConfig reset: user=${session.id} pack=${ctx.packKey}`)

    return NextResponse.json({
      success: true,
      data: { packKey: ctx.packKey, discipline, config: checked.data, previous: ctx.config },
    })
  } catch (error) {
    return serverError(error, "reset ops config")
  }
}
