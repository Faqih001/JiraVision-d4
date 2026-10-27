// /api/career/levels — the published ladder (design §11). Bands are config about a rung,
// so any signed-in member may read them; nothing here is personal data.

import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { careerLevels } from "@/drizzle/schema"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const levels = await db
      .select()
      .from(careerLevels)
      .where(eq(careerLevels.isActive, true))
      .orderBy(asc(careerLevels.discipline), asc(careerLevels.level))

    return NextResponse.json({ success: true, data: { levels } })
  } catch (error) {
    console.error("Career levels error:", error)
    return NextResponse.json({ error: "Failed to load the career ladder" }, { status: 500 })
  }
}
