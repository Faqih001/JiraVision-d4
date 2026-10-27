// /api/career/me — one member's placement and readiness (design §11).
// Readable by that member only: every query is scoped by the session id, never by an id
// in the query string. The percentage is computed here, never accepted from a caller.

import { NextResponse } from "next/server"
import { and, asc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { careerLevels, careerPlacement, careerSignoffs } from "@/drizzle/schema"
import { CAREER_WINDOW_DAYS, normaliseTargets } from "@/lib/career/signals"
import { computeReadiness, normaliseChecklist, type Signoff } from "@/lib/career/readiness"
import { countCareerSignals } from "@/lib/career/counts"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { localDay, shiftDays } from "@/lib/worklog/local-day"

export const dynamic = "force-dynamic"

const bandOf = (row: { bandMin: number | null; bandMax: number | null; bandCurrency: string | null }) => ({
  min: row.bandMin,
  max: row.bandMax,
  currency: row.bandCurrency,
  published: row.bandMin !== null && row.bandMax !== null,
})

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
    const placements = await db
      .select()
      .from(careerPlacement)
      .where(eq(careerPlacement.userId, session.id))
      .orderBy(asc(careerPlacement.discipline))

    const placement = requested
      ? (placements.find((row) => row.discipline === requested) ?? null)
      : (placements[0] ?? null)

    const today = localDay(new Date(), session.timezone)
    const windowStart = shiftDays(today, -(CAREER_WINDOW_DAYS - 1))

    if (!placement) {
      return NextResponse.json({
        success: true,
        data: {
          asOf: new Date().toISOString(),
          windowDays: CAREER_WINDOW_DAYS,
          windowStart,
          placements,
          discipline: requested,
          placement: null,
          current: null,
          next: null,
          signals: null,
          readiness: null,
          top: false,
        },
      })
    }

    const [currentRow] = await db
      .select()
      .from(careerLevels)
      .where(
        and(
          eq(careerLevels.discipline, placement.discipline),
          eq(careerLevels.level, placement.level),
        ),
      )
      .limit(1)

    const [nextRow] = await db
      .select()
      .from(careerLevels)
      .where(
        and(
          eq(careerLevels.discipline, placement.discipline),
          eq(careerLevels.level, placement.level + 1),
        ),
      )
      .limit(1)

    const levelIds = [currentRow?.id, nextRow?.id].filter(
      (id): id is number => typeof id === "number",
    )
    const signoffRows = levelIds.length
      ? await db
          .select({
            levelId: careerSignoffs.levelId,
            itemKey: careerSignoffs.itemKey,
            status: careerSignoffs.status,
          })
          .from(careerSignoffs)
          .where(
            and(
              eq(careerSignoffs.userId, session.id),
              inArray(careerSignoffs.levelId, levelIds),
            ),
          )
      : []

    const toSignoffs = (levelId: number | undefined): Signoff[] =>
      signoffRows
        .filter((row) => row.levelId === levelId)
        .map((row) => ({
          itemKey: row.itemKey,
          status: row.status === "ticked" ? "ticked" : "declined",
        }))

    const signals = await countCareerSignals({
      userId: session.id,
      startDay: windowStart,
      timeZone: session.timezone,
    })

    const readiness = nextRow
      ? computeReadiness({
          signals,
          targets: normaliseTargets(nextRow.signals),
          checklist: normaliseChecklist(nextRow.checklist),
          signoffs: toSignoffs(nextRow.id),
          currentLevel: currentRow
            ? {
                level: currentRow.level,
                checklist: normaliseChecklist(currentRow.checklist),
                signoffs: toSignoffs(currentRow.id),
              }
            : null,
        })
      : null

    return NextResponse.json({
      success: true,
      data: {
        asOf: new Date().toISOString(),
        windowDays: CAREER_WINDOW_DAYS,
        windowStart,
        placements,
        discipline: placement.discipline,
        placement: {
          level: placement.level,
          placedAt: placement.placedAt,
          placedBy: placement.placedBy,
          note: placement.note,
        },
        current: currentRow
          ? {
              level: currentRow.level,
              title: currentRow.title,
              summary: currentRow.summary,
              expectations: currentRow.expectations,
              checklist: normaliseChecklist(currentRow.checklist),
              band: bandOf(currentRow),
            }
          : null,
        next: nextRow
          ? {
              level: nextRow.level,
              title: nextRow.title,
              summary: nextRow.summary,
              expectations: nextRow.expectations,
              checklist: normaliseChecklist(nextRow.checklist),
              targets: normaliseTargets(nextRow.signals),
              band: bandOf(nextRow),
            }
          : null,
        signals,
        readiness,
        top: !nextRow,
      },
    })
  } catch (error) {
    console.error("Career readiness error:", error)
    return NextResponse.json({ error: "Failed to load career readiness" }, { status: 500 })
  }
}
