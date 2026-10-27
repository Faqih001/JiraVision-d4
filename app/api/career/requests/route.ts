// /api/career/requests — the promotion request queue (design §11). A member submits one
// request per open discipline; the snapshot is built server-side from counted rows and
// frozen into `evidence`, so the reviewer reads an artefact that cannot move under them.

import { NextResponse } from "next/server"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { careerRequests, users } from "@/drizzle/schema"
import { isSuperAdmin } from "@/lib/roles"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { CAREER_REQUEST_STATUSES, isCareerRequestStatus } from "@/lib/career/review"
import { loadCareerProfile } from "@/lib/career/profile"
import { collectCareerEvidence } from "@/lib/career/evidence"
import { bad, careerSession, notifyCareerAdmins } from "../_shared"

export const dynamic = "force-dynamic"

export const REQUEST_LIST_LIMIT = 100

export async function GET(request: Request) {
  const member = await careerSession()
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requestedStatus = new URL(request.url).searchParams.get("status")
  if (requestedStatus !== null && !isCareerRequestStatus(requestedStatus)) {
    return bad(`status must be one of: ${CAREER_REQUEST_STATUSES.join(", ")}`)
  }

  try {
    const memberId = member.id
    const conditions = []
    if (!isSuperAdmin(member)) conditions.push(eq(careerRequests.userId, memberId))
    if (requestedStatus) conditions.push(eq(careerRequests.status, requestedStatus))

    const rows = await db
      .select()
      .from(careerRequests)
      .where(and(...conditions))
      .orderBy(desc(careerRequests.requestedAt), desc(careerRequests.id))
      .limit(REQUEST_LIST_LIMIT)

    const userIds = [...new Set(rows.flatMap((row) => (row.reviewedBy ? [row.userId, row.reviewedBy] : [row.userId])))]
    const people = userIds.length
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, userIds))
      : []
    const nameOf = new Map(people.map((person) => [person.id, person.name]))

    return NextResponse.json({
      success: true,
      data: {
        requests: rows.map((row) => ({
          id: row.id,
          userId: row.userId,
          memberName: nameOf.get(row.userId) ?? "Unknown",
          discipline: row.discipline,
          fromLevel: row.fromLevel,
          toLevel: row.toLevel,
          status: row.status,
          note: row.note,
          evidence: row.evidence,
          requestedAt: row.requestedAt,
          reviewedBy: row.reviewedBy,
          reviewerName: row.reviewedBy ? (nameOf.get(row.reviewedBy) ?? "Unknown") : null,
          reviewedAt: row.reviewedAt,
          returnNote: row.returnNote,
          effectiveDate: row.effectiveDate,
        })),
      },
    })
  } catch (error) {
    console.error("Career requests read error:", error)
    return NextResponse.json({ error: "Failed to load career requests" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const member = await careerSession()
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { discipline?: unknown } | null
  const discipline = body?.discipline
  if (!isLadderDiscipline(discipline)) return bad("Unknown career discipline")

  try {
    const profile = await loadCareerProfile({
      userId: member.id,
      discipline,
      timeZone: member.timezone,
    })

    if (!profile.placement) return bad("You are not placed in this discipline yet")
    const next = profile.next
    const readiness = profile.readiness
    const signals = profile.signals
    if (!next || !readiness || !signals) {
      return bad("You are at the top of this ladder", 409)
    }

    const [open] = await db
      .select({ id: careerRequests.id })
      .from(careerRequests)
      .where(
        and(
          eq(careerRequests.userId, member.id),
          eq(careerRequests.discipline, discipline),
          inArray(careerRequests.status, ["draft", "submitted"]),
        ),
      )
      .limit(1)
    if (open) return bad("You already have a request open for this discipline", 409)

    // The snapshot: the same counted rows the meter read, frozen before the reviewer sees it.
    const refs = await collectCareerEvidence({
      userId: member.id,
      startDay: profile.windowStart,
      timeZone: member.timezone,
    })
    const evidence = {
      asOf: new Date().toISOString(),
      windowStart: profile.windowStart,
      windowDays: profile.windowDays,
      discipline: profile.discipline,
      fromLevel: profile.placement.level,
      toLevel: next.level,
      signals,
      readiness,
      signoffs: {
        current: profile.current?.signoffs ?? [],
        next: next.signoffs,
      },
      checklist: {
        current: profile.current?.checklist ?? [],
        next: next.checklist,
      },
      targets: next.targets,
      refs,
    }

    const [row] = await db
      .insert(careerRequests)
      .values({
        userId: member.id,
        discipline,
        fromLevel: profile.placement.level,
        toLevel: next.level,
        status: "submitted",
        evidence,
        requestedAt: new Date(),
      })
      .returning({ id: careerRequests.id, status: careerRequests.status })

    await notifyCareerAdmins(member, {
      title: "Career request awaiting review",
      body: `${member.name} requested ${discipline}: level ${profile.placement.level} → ${next.level}.`,
      link: "/admin/career",
    })

    return NextResponse.json({ success: true, data: { id: row.id, status: row.status } })
  } catch (error) {
    console.error("Career request submit error:", error)
    return NextResponse.json({ error: "Failed to submit the career request" }, { status: 500 })
  }
}
