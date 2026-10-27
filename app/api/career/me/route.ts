// /api/career/me — one member's placement and readiness (design §11).
// Readable by that member only: every query is scoped by the session id, never by an id
// in the query string. The percentage is computed server-side, never accepted from a caller.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { loadCareerProfile } from "@/lib/career/profile"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { isSuperAdmin } from "@/lib/roles"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requested = new URL(request.url).searchParams.get("discipline")
  if (requested !== null && !isLadderDiscipline(requested)) {
    return NextResponse.json({ error: "Unknown career discipline" }, { status: 400 })
  }

  try {
    const profile = await loadCareerProfile({
      userId: session.id,
      discipline: requested,
      timeZone: session.timezone,
    })

    return NextResponse.json({
      success: true,
      data: { ...profile, admin: isSuperAdmin(session) },
    })
  } catch (error) {
    console.error("Career readiness error:", error)
    return NextResponse.json({ error: "Failed to load career readiness" }, { status: 500 })
  }
}
