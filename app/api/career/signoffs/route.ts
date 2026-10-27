// /api/career/signoffs — an admin certifies one checklist item on a member's rung
// (design §11). A member cannot tick their own checklist: `ticked_by` is always the
// admin's id, and the write is gated in the route.

import { NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { careerLevels, careerPlacement, careerSignoffs, users } from "@/drizzle/schema"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { normaliseChecklist } from "@/lib/career/readiness"
import { bad, careerAdmin, MAX_NOTE } from "../_shared"

export const dynamic = "force-dynamic"

const SIGN_OFF_STATUSES = ["ticked", "declined"] as const
type SignOffStatus = (typeof SIGN_OFF_STATUSES)[number]

const isSignOffStatus = (value: unknown): value is SignOffStatus =>
  typeof value === "string" && (SIGN_OFF_STATUSES as readonly string[]).includes(value)

const positiveId = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

type Rung = {
  levelId: number
  level: number
  title: string
  checklist: Array<{
    key: string
    label: string
    hint: string
    status: SignOffStatus | null
    tickedBy: number | null
    tickedByName: string | null
    tickedAt: Date | null
    note: string | null
  }>
}

export async function GET(request: Request) {
  const gate = await careerAdmin()
  if ("error" in gate) return gate.error

  const params = new URL(request.url).searchParams
  const userId = positiveId(params.get("userId"))
  const discipline = params.get("discipline")

  if (userId === null) return bad("userId must be a positive integer")
  if (!isLadderDiscipline(discipline)) return bad("Unknown career discipline")

  try {
    const [member] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!member) return bad("Team member not found", 404)

    const [placement] = await db
      .select()
      .from(careerPlacement)
      .where(
        and(
          eq(careerPlacement.userId, userId),
          eq(careerPlacement.discipline, discipline),
        ),
      )
      .limit(1)
    if (!placement) return bad("That member is not placed in this discipline", 404)

    const rungs = await db
      .select()
      .from(careerLevels)
      .where(
        and(
          eq(careerLevels.discipline, discipline),
          inArray(careerLevels.level, [placement.level, placement.level + 1]),
        ),
      )
      .orderBy(careerLevels.level)

    const levelIds = rungs.map((row) => row.id)
    const signoffRows = levelIds.length
      ? await db
          .select({
            levelId: careerSignoffs.levelId,
            itemKey: careerSignoffs.itemKey,
            status: careerSignoffs.status,
            tickedBy: careerSignoffs.tickedBy,
            tickedByName: users.name,
            tickedAt: careerSignoffs.tickedAt,
            note: careerSignoffs.note,
          })
          .from(careerSignoffs)
          .innerJoin(users, eq(users.id, careerSignoffs.tickedBy))
          .where(
            and(
              eq(careerSignoffs.userId, userId),
              inArray(careerSignoffs.levelId, levelIds),
            ),
          )
      : []

    const toRung = (row: (typeof rungs)[number] | undefined): Rung | null => {
      if (!row) return null
      return {
        levelId: row.id,
        level: row.level,
        title: row.title,
        checklist: normaliseChecklist(row.checklist).map((item) => {
          const signed = signoffRows.find(
            (entry) => entry.levelId === row.id && entry.itemKey === item.key,
          )
          return {
            key: item.key,
            label: item.label,
            hint: item.hint,
            status: signed ? (signed.status === "ticked" ? "ticked" : "declined") : null,
            tickedBy: signed?.tickedBy ?? null,
            tickedByName: signed?.tickedByName ?? null,
            tickedAt: signed?.tickedAt ?? null,
            note: signed?.note ?? null,
          }
        }),
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        member,
        placement: {
          discipline: placement.discipline,
          level: placement.level,
          placedAt: placement.placedAt,
          note: placement.note,
        },
        current: toRung(rungs.find((row) => row.level === placement.level)),
        next: toRung(rungs.find((row) => row.level === placement.level + 1)),
      },
    })
  } catch (error) {
    console.error("Career sign-off read error:", error)
    return NextResponse.json({ success: false, error: "Failed to load sign-offs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const gate = await careerAdmin()
  if ("error" in gate) return gate.error
  const admin = gate.member

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const userId = positiveId(body?.userId)
  const levelId = positiveId(body?.levelId)
  const itemKey = typeof body?.itemKey === "string" ? body.itemKey.trim() : ""
  const status = body?.status
  const rawNote = body?.note

  if (userId === null) return bad("userId must be a positive integer")
  if (levelId === null) return bad("levelId must be a positive integer")
  if (!itemKey) return bad("itemKey is required")
  if (!isSignOffStatus(status)) return bad("status must be ticked or declined")
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== "string") {
    return bad("note must be text")
  }
  const note = typeof rawNote === "string" ? rawNote.trim() : ""
  if (note.length > MAX_NOTE) return bad(`note must be ${MAX_NOTE} characters or fewer`)

  try {
    const [level] = await db
      .select()
      .from(careerLevels)
      .where(eq(careerLevels.id, levelId))
      .limit(1)
    if (!level) return bad("Career level not found", 404)

    const [placement] = await db
      .select({ level: careerPlacement.level })
      .from(careerPlacement)
      .where(
        and(
          eq(careerPlacement.userId, userId),
          eq(careerPlacement.discipline, level.discipline),
        ),
      )
      .limit(1)
    if (!placement) return bad("That member is not placed in this discipline")

    const item = normaliseChecklist(level.checklist).find((entry) => entry.key === itemKey)
    if (!item) return bad("That checklist item is not on this rung")

    const now = new Date()
    const [row] = await db
      .insert(careerSignoffs)
      .values({
        userId,
        levelId,
        itemKey,
        status,
        tickedBy: admin.id,
        tickedAt: now,
        note: note || null,
      })
      .onConflictDoUpdate({
        target: [careerSignoffs.userId, careerSignoffs.levelId, careerSignoffs.itemKey],
        set: { status, tickedBy: admin.id, tickedAt: now, note: note || null },
      })
      .returning()

    return NextResponse.json({ success: true, data: { signoff: row } })
  } catch (error) {
    console.error("Career sign-off write error:", error)
    return NextResponse.json({ success: false, error: "Failed to record the sign-off" }, { status: 500 })
  }
}
