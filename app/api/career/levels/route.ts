// /api/career/levels — the published ladder (design §11). Bands are config about a rung,
// so any signed-in member may read them; nothing here is personal data. An admin may ask
// for inactive rungs with ?all=1 to edit them.

import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { careerLevels } from "@/drizzle/schema"
import { isSuperAdmin } from "@/lib/roles"
import { normaliseTargets } from "@/lib/career/signals"
import { normaliseChecklist } from "@/lib/career/readiness"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ?all=1 only widens the read for a super-admin; everyone else keeps the active ladder.
  const wantsAll = new URL(request.url).searchParams.get("all") === "1"
  const includeAll = wantsAll && isSuperAdmin(session)

  try {
    const rows = includeAll
      ? await db
          .select()
          .from(careerLevels)
          .orderBy(asc(careerLevels.discipline), asc(careerLevels.level))
      : await db
          .select()
          .from(careerLevels)
          .where(eq(careerLevels.isActive, true))
          .orderBy(asc(careerLevels.discipline), asc(careerLevels.level))

    const levels = rows.map((row) => ({
      ...row,
      signals: normaliseTargets(row.signals),
      checklist: normaliseChecklist(row.checklist),
    }))

    return NextResponse.json({ success: true, data: { levels } })
  } catch (error) {
    console.error("Career levels error:", error)
    return NextResponse.json({ error: "Failed to load the career ladder" }, { status: 500 })
  }
}
