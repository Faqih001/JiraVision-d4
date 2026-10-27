// /api/career/placements — the admin placement editor (design §11). A placement is the
// rung a member holds in a discipline; it is written by an admin, never self-service,
// and no notification is sent for a placement change (the spec names submit/approve/return).

import { NextResponse } from "next/server"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { careerLevels, careerPlacement, users } from "@/drizzle/schema"
import { CAREER_RUNGS } from "@/lib/roles"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { bad, careerAdmin, MAX_NOTE } from "../_shared"

export const dynamic = "force-dynamic"

const positiveId = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

export async function GET() {
  const gate = await careerAdmin()
  if ("error" in gate) return gate.error

  try {
    const [members, placements] = await Promise.all([
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .orderBy(asc(users.name))
        .limit(500),
      db
        .select({
          userId: careerPlacement.userId,
          memberName: users.name,
          discipline: careerPlacement.discipline,
          level: careerPlacement.level,
          title: careerLevels.title,
          placedAt: careerPlacement.placedAt,
          note: careerPlacement.note,
        })
        .from(careerPlacement)
        .innerJoin(users, eq(users.id, careerPlacement.userId))
        .leftJoin(
          careerLevels,
          and(
            eq(careerLevels.discipline, careerPlacement.discipline),
            eq(careerLevels.level, careerPlacement.level),
          ),
        )
        .orderBy(asc(users.name), asc(careerPlacement.discipline)),
    ])

    return NextResponse.json({ success: true, data: { members, placements } })
  } catch (error) {
    console.error("Career placements read error:", error)
    return NextResponse.json({ success: false, error: "Failed to load placements" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const gate = await careerAdmin()
  if ("error" in gate) return gate.error
  const admin = gate.member

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const userId = positiveId(body?.userId)
  const discipline = body?.discipline
  const level = positiveId(body?.level)
  const rawNote = body?.note

  if (userId === null) return bad("userId must be a positive integer")
  if (!isLadderDiscipline(discipline)) return bad("Unknown career discipline")
  if (level === null || !CAREER_RUNGS.some((rung) => rung.level === level)) {
    return bad("level must be one of 1, 2, 3, 4")
  }
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== "string") {
    return bad("note must be text")
  }
  const note = typeof rawNote === "string" ? rawNote.trim() : ""
  if (note.length > MAX_NOTE) return bad(`note must be ${MAX_NOTE} characters or fewer`)

  try {
    const [member] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!member) return bad("Team member not found", 404)

    const [rung] = await db
      .select({ id: careerLevels.id, title: careerLevels.title })
      .from(careerLevels)
      .where(
        and(
          eq(careerLevels.discipline, discipline),
          eq(careerLevels.level, level),
        ),
      )
      .limit(1)
    if (!rung) return bad("That rung does not exist in the ladder", 404)

    const now = new Date()
    const [row] = await db
      .insert(careerPlacement)
      .values({
        userId,
        discipline,
        level,
        placedBy: admin.id,
        placedAt: now,
        note: note || null,
      })
      .onConflictDoUpdate({
        target: [careerPlacement.userId, careerPlacement.discipline],
        set: { level, placedBy: admin.id, placedAt: now, note: note || null },
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: {
        placement: {
          userId,
          memberName: member.name,
          discipline,
          level,
          title: rung.title,
          placedAt: row.placedAt,
          note: row.note,
        },
      },
    })
  } catch (error) {
    console.error("Career placement write error:", error)
    return NextResponse.json({ success: false, error: "Failed to save the placement" }, { status: 500 })
  }
}
