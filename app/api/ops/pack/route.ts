// /api/ops/pack — resolve the signed-in member's ops pack.
// GET → returns { packKey, hasOpsConfig, discipline } so the sidebar and overview page
//       know whether to show the Operations nav group and which pack to query.

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
        data: { packKey: null, hasOpsConfig: false, discipline: null },
      })
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    return NextResponse.json({
      success: true,
      data: {
        packKey: ctx?.packKey ?? null,
        hasOpsConfig: ctx !== null,
        discipline,
      },
    })
  } catch (error) {
    return serverError(error, "resolve ops pack")
  }
}
