// /api/ops/config — the signed-in member's pack operations config, in full.
// GET → { packKey, discipline, config } where config is the whole validated OpsConfig: log entities
//       and their fields, KPI definitions (including the ones with no target), report templates,
//       playbook seeds, automation templates, recommendation rules and the AI policy.
//
// This is the only route that hands out the config itself. /api/ops/pack gives the nav and forms
// just the slices they render; this one exists so a member can see what the engine actually knows
// about their discipline instead of inferring it from which tabs appear. Read-only: it writes
// nothing and never exposes another pack's config — the discipline comes from the caller's session.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { serverError, unauthorized } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const discipline = defaultDisciplineOf(session)
    if (!discipline) {
      return NextResponse.json({ success: true, data: { packKey: null, discipline: null, config: null } })
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) {
      return NextResponse.json({
        success: true,
        data: {
          packKey: null,
          discipline,
          config: null,
          message: `No operations pack is configured for ${discipline} yet.`,
        },
      })
    }

    return NextResponse.json({ success: true, data: { packKey: ctx.packKey, discipline, config: ctx.config } })
  } catch (error) {
    return serverError(error, "load ops config")
  }
}
