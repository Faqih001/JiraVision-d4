// /api/ops/pack — resolve the signed-in member's ops pack.
// GET → returns { packKey, hasOpsConfig, discipline, logs, reportTemplates, playbookSeeds } so the
//       sidebar and operations pages know whether to show the Operations nav group, which pack to
//       query, and — from `logs`, `reportTemplates` and `playbookSeeds` — the entity tabs the activity
//       form renders against, the report previews the reports page renders, and the recurring runbooks
//       the playbooks page shows.

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
        data: {
          packKey: null,
          hasOpsConfig: false,
          discipline: null,
          logs: null,
          reportTemplates: null,
          playbookSeeds: null,
        },
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
        reportTemplates: ctx?.config.reportTemplates ?? null,
        playbookSeeds: ctx?.config.playbookSeeds ?? null,
      },
    })
  } catch (error) {
    return serverError(error, "resolve ops pack")
  }
}
