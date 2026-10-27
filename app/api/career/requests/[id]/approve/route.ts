// POST /api/career/requests/[id]/approve — an admin approves a submitted request.
// The request and the placement move together, and the placement is only written if it
// still reads the rung the request was submitted from. The member is notified after commit.

import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { careerPlacement, careerRequests, users } from "@/drizzle/schema"
import { createNotification } from "@/lib/notifications"
import { localDay } from "@/lib/worklog/local-day"
import { bad, careerAdmin } from "../../../_shared"

export const dynamic = "force-dynamic"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await careerAdmin()
  if ("error" in gate) return gate.error
  const admin = gate.member

  const { id: rawId } = await params
  const id = Number.parseInt(rawId, 10)
  if (!Number.isFinite(id) || id <= 0) return bad("Request id must be a positive integer")

  try {
    const [row] = await db
      .select()
      .from(careerRequests)
      .where(eq(careerRequests.id, id))
      .limit(1)
    if (!row) return bad("Career request not found", 404)
    if (row.status !== "submitted") return bad("This request is not awaiting review", 409)

    const [placement] = await db
      .select({ level: careerPlacement.level })
      .from(careerPlacement)
      .where(
        and(
          eq(careerPlacement.userId, row.userId),
          eq(careerPlacement.discipline, row.discipline),
        ),
      )
      .limit(1)

    if (
      !placement ||
      placement.level !== row.fromLevel ||
      row.toLevel !== row.fromLevel + 1
    ) {
      return bad("The member's placement changed since this request was submitted", 409)
    }

    const [memberRow] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1)

    const now = new Date()
    const effectiveDate = localDay(now, memberRow?.timezone ?? null)
    const note = `Approved request #${id}`

    const updated = await db.transaction(async (tx) => {
      const [request] = await tx
        .update(careerRequests)
        .set({
          status: "approved",
          reviewedBy: admin.id,
          reviewedAt: now,
          effectiveDate,
          updatedAt: now,
        })
        .where(eq(careerRequests.id, id))
        .returning()

      await tx
        .insert(careerPlacement)
        .values({
          userId: row.userId,
          discipline: row.discipline,
          level: row.toLevel,
          placedBy: admin.id,
          placedAt: now,
          note,
        })
        .onConflictDoUpdate({
          target: [careerPlacement.userId, careerPlacement.discipline],
          set: { level: row.toLevel, placedBy: admin.id, placedAt: now, note },
        })

      return request
    })

    await createNotification({
      userId: row.userId,
      type: "career",
      title: "Your career request was approved",
      body: `${row.discipline}: level ${row.fromLevel} → ${row.toLevel}, effective ${effectiveDate}.`,
      link: "/dashboard/career",
      metadata: { requestId: id, reviewedBy: admin.id },
    }).catch(() => undefined)

    return NextResponse.json({
      success: true,
      data: {
        request: updated,
        placement: {
          discipline: row.discipline,
          level: row.toLevel,
          placedAt: now,
          note,
        },
      },
    })
  } catch (error) {
    console.error("Career request approval error:", error)
    return NextResponse.json({ error: "Failed to approve the career request" }, { status: 500 })
  }
}
