import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { wellbeingMetrics, users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

const MOODS = ["Energized", "Focused", "Productive", "Neutral", "Stressed", "Strained", "Overwhelmed", "Low"]
const WORKLOADS = ["Light", "Balanced", "High"]
const LOW_THRESHOLD = 40
const HIGH_THRESHOLD = 85

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.min(max, Math.max(min, Math.round(n)))
}

async function safeNotify(input: { userId: number; title: string; body?: string; metadata?: Record<string, unknown> }) {
  try {
    await createNotification({
      userId: input.userId,
      type: "wellbeing",
      title: input.title,
      body: input.body,
      link: "/dashboard/team-wellbeing",
      metadata: input.metadata,
    })
  } catch (err) {
    console.error("Wellbeing notification failed:", err)
  }
}

function selectWithUser(id: number) {
  return db
    .select({
      id: wellbeingMetrics.id,
      userId: wellbeingMetrics.userId,
      userName: users.name,
      avatar: users.avatar,
      role: users.jobTitle,
      date: wellbeingMetrics.date,
      wellbeingScore: wellbeingMetrics.wellbeingScore,
      mood: wellbeingMetrics.mood,
      workload: wellbeingMetrics.workload,
      stressLevel: wellbeingMetrics.stressLevel,
      overtimeHours: wellbeingMetrics.overtimeHours,
      createdAt: wellbeingMetrics.createdAt,
    })
    .from(wellbeingMetrics)
    .innerJoin(users, eq(wellbeingMetrics.userId, users.id))
    .where(eq(wellbeingMetrics.id, id))
    .limit(1)
}

/* ----------------------------------------------------------------------- PUT */

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const metricId = Number(id)
    if (!Number.isInteger(metricId) || metricId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
    }

    const [existing] = await db.select().from(wellbeingMetrics).where(eq(wellbeingMetrics.id, metricId)).limit(1)
    if (!existing) {
      return NextResponse.json({ success: false, message: "Check-in not found" }, { status: 404 })
    }

    const data = await request.json().catch(() => null)
    if (!data || typeof data !== "object") {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
    }

    const patch: Partial<typeof wellbeingMetrics.$inferInsert> = {}
    const score = clampInt(data.wellbeingScore, 0, 100)
    if (score !== undefined) patch.wellbeingScore = score
    if (data.mood !== undefined) {
      if (!MOODS.includes(String(data.mood))) {
        return NextResponse.json({ success: false, message: `mood must be one of: ${MOODS.join(", ")}` }, { status: 400 })
      }
      patch.mood = String(data.mood)
    }
    if (data.workload !== undefined) {
      if (!WORKLOADS.includes(String(data.workload))) {
        return NextResponse.json({ success: false, message: `workload must be one of: ${WORKLOADS.join(", ")}` }, { status: 400 })
      }
      patch.workload = String(data.workload)
    }
    const stress = clampInt(data.stressLevel, 1, 5)
    if (stress !== undefined) patch.stressLevel = stress
    if (data.overtimeHours !== undefined) {
      const ot = Number(data.overtimeHours)
      patch.overtimeHours = String(Number.isFinite(ot) ? Math.min(80, Math.max(0, ot)) : 0)
    }
    if (data.date !== undefined) {
      if (!isIsoDate(data.date)) {
        return NextResponse.json({ success: false, message: "date must be YYYY-MM-DD" }, { status: 400 })
      }
      patch.date = data.date
    }
    // In this demo product any signed-in user may correct a member's row.
    if (data.userId !== undefined) {
      const owner = clampInt(data.userId, 1, Number.MAX_SAFE_INTEGER)
      if (owner === undefined) {
        return NextResponse.json({ success: false, message: "userId must be a positive integer" }, { status: 400 })
      }
      patch.userId = owner
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, message: "Nothing to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(wellbeingMetrics)
      .set(patch)
      .where(eq(wellbeingMetrics.id, metricId))
      .returning()

    // Threshold-transition notifications when the score itself changed.
    if (patch.wellbeingScore !== undefined && patch.wellbeingScore !== existing.wellbeingScore) {
      const newScore = updated.wellbeingScore
      const oldScore = existing.wellbeingScore
      if (oldScore >= LOW_THRESHOLD && newScore < LOW_THRESHOLD) {
        await safeNotify({
          userId: updated.userId,
          title: "Wellbeing dipped below 40",
          body: `Your check-in for ${updated.date} was updated to ${newScore} (was ${oldScore}).`,
          metadata: { transition: "low", metricId: updated.id, score: newScore },
        })
      } else if (oldScore <= HIGH_THRESHOLD && newScore > HIGH_THRESHOLD) {
        await safeNotify({
          userId: updated.userId,
          title: "Thriving — above 85",
          body: `Your check-in for ${updated.date} was updated to ${newScore} (was ${oldScore}). Nice!`,
          metadata: { transition: "thriving", metricId: updated.id, score: newScore },
        })
      }
    }

    const [withUser] = await selectWithUser(metricId)
    return NextResponse.json({ success: true, data: withUser ?? updated })
  } catch (error) {
    console.error("Wellbeing metrics update error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update wellbeing record" },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------- DELETE */

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const metricId = Number(id)
    if (!Number.isInteger(metricId) || metricId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
    }

    const [removed] = await db
      .delete(wellbeingMetrics)
      .where(eq(wellbeingMetrics.id, metricId))
      .returning()

    if (!removed) {
      return NextResponse.json({ success: false, message: "Check-in not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { id: removed.id } })
  } catch (error) {
    console.error("Wellbeing metrics delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete wellbeing record" },
      { status: 500 },
    )
  }
}

/* ----------------------------------------------------------------------- GET */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const metricId = Number(id)
    if (!Number.isInteger(metricId) || metricId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
    }

    const rows = await selectWithUser(metricId)
    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "Check-in not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error("Wellbeing metric fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch wellbeing record" },
      { status: 500 },
    )
  }
}
