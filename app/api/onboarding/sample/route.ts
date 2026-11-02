// /api/onboarding/sample — returns the seed preview for a discipline.
//
// GET ?discipline=technician → the register rows, playbook seeds, task templates and KPIs
// from public/files/disciplines/technician.json. The onboarding wizard fetches this when the
// member selects "Use the sample project" so the preview shows what their first-week draft
// will actually contain.
//
// No auth gate: the files are static seed data shipped with the build, not personal information.
// The wizard already requires a signed-in session to reach the project step, and the route
// never writes anything.

import { NextRequest, NextResponse } from "next/server"
import { normaliseDiscipline } from "@/lib/roles"
import { loadDisciplineSeed } from "@/lib/onboarding/sample-seed-reader"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("discipline")
  const discipline = normaliseDiscipline(raw)

  const seed = loadDisciplineSeed(discipline)
  if (!seed) {
    return NextResponse.json({
      success: true,
      data: null,
      message: raw
        ? `No seed file found for "${raw}".`
        : "No discipline selected — showing the generic sample.",
    })
  }

  return NextResponse.json({ success: true, data: seed })
}
