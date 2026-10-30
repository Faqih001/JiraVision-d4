// /api/ops/pack — resolve the signed-in member's ops pack.
// GET → returns { packKey, hasOpsConfig, discipline, logs } so the sidebar and operations pages
//       know whether to show the Operations nav group, which pack to query, and — from `logs` —
//       the entity tabs and per-field schema the activity logs form renders against.

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
      return NextResponse.json({
        success: true,
        data: { packKey: null, hasOpsConfig: false, discipline: null, logs: null },
      })
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    return NextResponse.json({
      success: true,
      data: {
        packKey: ctx?.packKey ?? null,
        hasOpsConfig: ctx !== null,
        discipline,
        logs: ctx?.config.logs ?? null,
      },
    })
  } catch (error) {
    return serverError(error, "resolve ops pack")
  }
}
