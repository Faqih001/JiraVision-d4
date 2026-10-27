// One member's career profile (design §11): placement, current and next rung,
// readiness, sign-off detail, latest request and approved history. Every read is
// scoped by the member id passed in by the route, never by a request body.
//
// The percentage is computed here from counted rows; it is never read from a caller.

import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  careerLevels,
  careerPlacement,
  careerRequests,
  careerSignoffs,
  users,
} from "@/drizzle/schema"
import { CAREER_WINDOW_DAYS, normaliseTargets } from "@/lib/career/signals"
import { computeReadiness, normaliseChecklist, type Signoff } from "@/lib/career/readiness"
import { countCareerSignals } from "@/lib/career/counts"
import { localDay, shiftDays } from "@/lib/worklog/local-day"

export type CareerSignoffDetail = {
  levelId: number
  itemKey: string
  status: "ticked" | "declined"
  tickedBy: number
  tickedByName: string
  tickedAt: Date
  note: string | null
}

export type CareerRequestSummary = {
  id: number
  status: string
  toLevel: number
  requestedAt: Date
  returnNote: string | null
  reviewedAt: Date | null
}

export type CareerHistoryEntry = {
  id: number
  fromLevel: number
  toLevel: number
  requestedAt: Date
  reviewedAt: Date | null
  effectiveDate: string | null
  reviewerName: string
}

export type CareerProfileInput = {
  userId: number
  /** Null means "the first placement by discipline". */
  discipline: string | null
  timeZone?: string | null
}

const bandOf = (row: {
  bandMin: number | null
  bandMax: number | null
  bandCurrency: string | null
}) => ({
  min: row.bandMin,
  max: row.bandMax,
  currency: row.bandCurrency,
  published: row.bandMin !== null && row.bandMax !== null,
})

export async function loadCareerProfile({
  userId,
  discipline,
  timeZone,
}: CareerProfileInput) {
  const placements = await db
    .select()
    .from(careerPlacement)
    .where(eq(careerPlacement.userId, userId))
    .orderBy(asc(careerPlacement.discipline))

  const placement = discipline
    ? (placements.find((row) => row.discipline === discipline) ?? null)
    : (placements[0] ?? null)

  const today = localDay(new Date(), timeZone)
  const windowStart = shiftDays(today, -(CAREER_WINDOW_DAYS - 1))

  if (!placement) {
    return {
      asOf: new Date(),
      windowDays: CAREER_WINDOW_DAYS,
      windowStart,
      placements,
      discipline,
      placement: null,
      current: null,
      next: null,
      signals: null,
      readiness: null,
      top: false,
      latestRequest: null,
      history: [] as CareerHistoryEntry[],
    }
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

  const details: CareerSignoffDetail[] = signoffRows.map((row) => ({
    levelId: row.levelId,
    itemKey: row.itemKey,
    status: row.status === "ticked" ? "ticked" : "declined",
    tickedBy: row.tickedBy,
    tickedByName: row.tickedByName ?? "Unknown",
    tickedAt: row.tickedAt,
    note: row.note,
  }))

  const signoffsFor = (levelId: number | undefined): Signoff[] =>
    levelId === undefined
      ? []
      : details
          .filter((row) => row.levelId === levelId)
          .map((row) => ({ itemKey: row.itemKey, status: row.status }))

  const detailsFor = (levelId: number | undefined): CareerSignoffDetail[] =>
    levelId === undefined ? [] : details.filter((row) => row.levelId === levelId)

  const [latest] = await db
    .select({
      id: careerRequests.id,
      status: careerRequests.status,
      toLevel: careerRequests.toLevel,
      requestedAt: careerRequests.requestedAt,
      returnNote: careerRequests.returnNote,
      reviewedAt: careerRequests.reviewedAt,
    })
    .from(careerRequests)
    .where(
      and(
        eq(careerRequests.userId, userId),
        eq(careerRequests.discipline, placement.discipline),
      ),
    )
    .orderBy(desc(careerRequests.requestedAt), desc(careerRequests.id))
    .limit(1)

  const historyRows = await db
    .select({
      id: careerRequests.id,
      fromLevel: careerRequests.fromLevel,
      toLevel: careerRequests.toLevel,
      requestedAt: careerRequests.requestedAt,
      reviewedAt: careerRequests.reviewedAt,
      effectiveDate: careerRequests.effectiveDate,
      reviewerName: users.name,
    })
    .from(careerRequests)
    .leftJoin(users, eq(users.id, careerRequests.reviewedBy))
    .where(
      and(
        eq(careerRequests.userId, userId),
        eq(careerRequests.discipline, placement.discipline),
        eq(careerRequests.status, "approved"),
      ),
    )
    .orderBy(desc(careerRequests.reviewedAt), desc(careerRequests.id))
    .limit(50)

  const history: CareerHistoryEntry[] = historyRows.map((row) => ({
    id: row.id,
    fromLevel: row.fromLevel,
    toLevel: row.toLevel,
    requestedAt: row.requestedAt,
    reviewedAt: row.reviewedAt,
    effectiveDate: row.effectiveDate,
    reviewerName: row.reviewerName ?? "Unknown",
  }))

  const signals = await countCareerSignals({
    userId,
    startDay: windowStart,
    timeZone,
  })

  const readiness = nextRow
    ? computeReadiness({
        signals,
        targets: normaliseTargets(nextRow.signals),
        checklist: normaliseChecklist(nextRow.checklist),
        signoffs: signoffsFor(nextRow.id),
        currentLevel: currentRow
          ? {
              level: currentRow.level,
              checklist: normaliseChecklist(currentRow.checklist),
              signoffs: signoffsFor(currentRow.id),
            }
          : null,
      })
    : null

  const latestRequest: CareerRequestSummary | null = latest
    ? {
        id: latest.id,
        status: latest.status,
        toLevel: latest.toLevel,
        requestedAt: latest.requestedAt,
        returnNote: latest.returnNote,
        reviewedAt: latest.reviewedAt,
      }
    : null

  return {
    asOf: new Date(),
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
          signoffs: detailsFor(currentRow.id),
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
          signoffs: detailsFor(nextRow.id),
          band: bandOf(nextRow),
        }
      : null,
    signals,
    readiness,
    top: !nextRow,
    latestRequest,
    history,
  }
}
