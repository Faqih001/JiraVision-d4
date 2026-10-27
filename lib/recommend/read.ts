// The rows the rules read, loaded once per request and always scoped to the member. The
// client never sends facts: the route re-reads them so a suggestion cannot be steered by a
// tampered body.

import { and, count, eq, gte, lte, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, workLogEntries, workReports } from "@/drizzle/schema"
import { defaultDisciplineOf, loadVisibleRegisters, withState } from "@/lib/registers/read"
import type { SessionUser } from "@/lib/registers/session"
import { loadCareerProfile } from "@/lib/career/profile"
import { localDay, monthBoundsIso, shiftDays, weekStartIso } from "@/lib/worklog/local-day"
import type { RecommendInput, RecommendPeriod } from "./next"

export type RecommendGate = {
  session: SessionUser
  today: string
}

async function entriesIn(userId: number, from: string, to: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(workLogEntries)
    .where(
      and(
        eq(workLogEntries.userId, userId),
        gte(workLogEntries.workedOn, from),
        lte(workLogEntries.workedOn, to),
      ),
    )
  return Number(row?.total ?? 0)
}

async function hasReport(userId: number, periodType: "weekly" | "monthly", periodStart: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workReports.id })
    .from(workReports)
    .where(
      and(
        eq(workReports.userId, userId),
        eq(workReports.periodType, periodType),
        eq(workReports.periodStart, periodStart),
      ),
    )
    .limit(1)
  return Boolean(row)
}

export async function loadRecommendInput(gate: RecommendGate): Promise<RecommendInput> {
  const { session, today } = gate
  const viewer = { id: session.id, admin: false }

  const registers = withState(await loadVisibleRegisters(viewer), today).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    lastVerifiedAt: row.lastVerifiedAt,
    verifyIntervalDays: row.verifyIntervalDays,
    fields: row.fields,
    staleness: row.staleness,
  }))

  const [todayCount] = await db
    .select({ total: count() })
    .from(workLogEntries)
    .where(and(eq(workLogEntries.userId, session.id), eq(workLogEntries.workedOn, today)))

  const deliverableRows = await db
    .select({
      id: deliverables.id,
      name: deliverables.name,
      status: deliverables.status,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .where(or(eq(deliverables.ownerId, session.id), eq(deliverables.createdBy, session.id)))
    .limit(200)

  const periods: RecommendPeriod[] = []

  const weekStart = shiftDays(weekStartIso(today), -7)
  const weekEnd = shiftDays(weekStart, 6)
  periods.push({
    periodType: "weekly",
    periodStart: weekStart,
    periodEnd: weekEnd,
    hasEntries: (await entriesIn(session.id, weekStart, weekEnd)) > 0,
    hasReport: await hasReport(session.id, "weekly", weekStart),
  })

  if (Number(today.slice(8, 10)) <= 7) {
    const monthStart = shiftDays(`${today.slice(0, 7)}-01`, -1)
    const bounds = monthBoundsIso(monthStart)
    periods.push({
      periodType: "monthly",
      periodStart: bounds.from,
      periodEnd: bounds.to,
      hasEntries: (await entriesIn(session.id, bounds.from, bounds.to)) > 0,
      hasReport: await hasReport(session.id, "monthly", bounds.from),
    })
  }

  const profile = await loadCareerProfile({
    userId: session.id,
    discipline: defaultDisciplineOf(session),
    timeZone: session.timezone,
  })

  const career = profile.next
    ? {
        levelId: profile.next.id,
        nextTitle: profile.next.title,
        gaps: (profile.readiness?.gaps ?? []).map((gap) => ({
          key: gap.key,
          label: gap.label,
          actual: gap.actual,
          target: gap.target,
        })),
      }
    : null

  return {
    today,
    registers,
    entriesToday: Number(todayCount?.total ?? 0),
    deliverables: deliverableRows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      updatedOn: localDay(row.updatedAt, session.timezone),
    })),
    periods,
    career,
  }
}
