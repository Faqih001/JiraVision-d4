// /api/ops/config/revert — the undo door for a config change the admin just made.
//
// POST → { previous } where previous is the config before the last apply. The route re-validates the
// previous config against the schema before writing it, so a tampered or stale payload cannot corrupt the
// pack's rules. Returns the config that was replaced, so the admin can undo the undo if needed.
//
// Scope: an admin reverts the pack their own discipline resolves to. There is no packKey parameter — a body
// field naming someone else's pack would be a way to reconfigure a discipline the caller does not work in.

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { rolePacks, opsConfigAudit } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { safeValidateOpsConfig } from "@/lib/packs/ops/validator"
import { forbidden, badRequest, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()
  if (session.role !== "admin" && session.role !== "super_admin") {
    return forbidden("Only an admin can revert a pack's operations rules.")
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return badRequest("A JSON body is required.")

    const { previous } = body as Record<string, unknown>
    if (!previous || typeof previous !== "object") {
      return badRequest("The previous config is required.")
    }

    const discipline = defaultDisciplineOf(session)
    if (!discipline) {
      return badRequest("No discipline configured for your account. Set a work discipline in Settings first.")
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) return badRequest("Your discipline does not have an operations pack yet.")

    const checked = safeValidateOpsConfig(previous)
    if (!checked.success) {
      return badRequest("The previous config is not valid.")
    }

    const replaced = ctx.config
    await db
      .update(rolePacks)
      .set({ opsConfig: checked.data, updatedAt: new Date() })
      .where(eq(rolePacks.packKey, ctx.packKey))

    console.log(`opsConfig revert: user=${session.id} pack=${ctx.packKey}`)

    await db.insert(opsConfigAudit).values({
      packKey: ctx.packKey,
      discipline,
      userId: session.id,
      operation: "revert",
      summary: {},
    })

    return NextResponse.json({
      success: true,
      data: {
        packKey: ctx.packKey,
        discipline,
        config: checked.data,
        replaced,
      },
    })
  } catch (error) {
    return serverError(error, "revert ops config")
  }
}
