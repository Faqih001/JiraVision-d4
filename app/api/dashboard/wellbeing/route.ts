import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { wellbeingMetrics, users } from "@/drizzle/schema"
import { and, desc, eq, gte } from "drizzle-orm"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ helpers */

const MOODS = ["Energized", "Focused", "Productive", "Neutral", "Stressed", "Strained", "Overwhelmed", "Low"]
const WORKLOADS = ["Light", "Balanced", "High"]

/** Wellbeing score thresholds that trigger a threshold-transition notification. */
export const LOW_THRESHOLD = 40
export const HIGH_THRESHOLD = 85

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

type MemberRow = typeof wellbeingMetrics.$inferSelect

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/**
 * Fire a wellbeing notification without ever failing the API request when the
 * notification itself errors (e.g. realtime/table issue).
 */
async function safeNotify(input: {
  userId: number
  title: string
  body?: string
  metadata?: Record<string, unknown>
}) {
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

/**
 * Threshold transitions between a member's previous row and their new score:
 * crossing below 40 (at risk) or above 85 (thriving) notifies the member.
 */
async function notifyThresholdTransition(member: MemberRow, previousScore: number | null) {
  if (previousScore === null) return
  if (previousScore >= LOW_THRESHOLD && member.wellbeingScore < LOW_THRESHOLD) {
    await safeNotify({
      userId: member.userId,
      title: "Wellbeing dipped below 40",
      body: `Your latest check-in scored ${member.wellbeingScore} (previous ${previousScore}). Consider flagging load in your next stand-up.`,
      metadata: { transition: "low", metricId: member.id, score: member.wellbeingScore },
    })
  } else if (previousScore <= HIGH_THRESHOLD && member.wellbeingScore > HIGH_THRESHOLD) {
    await safeNotify({
      userId: member.userId,
      title: "Thriving — above 85",
      body: `Your latest check-in scored ${member.wellbeingScore} (previous ${previousScore}). Nice streak, keep it up!`,
      metadata: { transition: "thriving", metricId: member.id, score: member.wellbeingScore },
    })
  }
}

/* ------------------------------------------------------------------------ GET */

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const params = new URL(request.url).searchParams
    const userIdRaw = params.get("userId")
    const daysRaw = params.get("days")
    const limitRaw = params.get("limit")

    const days = clampNumber(daysRaw, 1, 90, 30)
    const limit = clampNumber(limitRaw, 1, 1000, 500)

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const conditions = [gte(wellbeingMetrics.date, since)]
    if (userIdRaw) {
      const userId = Number(userIdRaw)
      if (!Number.isInteger(userId) || userId <= 0) {
        return NextResponse.json({ success: false, message: "userId must be a positive integer" }, { status: 400 })
      }
      conditions.push(eq(wellbeingMetrics.userId, userId))
    }

    // Team-wide rows (this is a team wellbeing workspace): every signed-in
    // user may see members' latest check-ins so they can act on at-risk signals.
    const rows = await db
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
      .where(and(...conditions))
      // never order by a select alias — repeat the full column expressions
      .orderBy(desc(wellbeingMetrics.date), desc(wellbeingMetrics.id))
      .limit(limit)

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("Wellbeing metrics error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch wellbeing metrics" },
      { status: 500 },
    )
  }
}

/* ----------------------------------------------------------------------- POST */

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const data = await request.json().catch(() => null)
    if (!data || typeof data !== "object") {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
    }

    const targetUserId = data.userId === undefined || data.userId === null ? session.id : Number(data.userId)
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ success: false, message: "userId must be a positive integer" }, { status: 400 })
    }
    const [targetUser] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, targetUserId)).limit(1)
    if (!targetUser) {
      return NextResponse.json({ success: false, message: "Unknown member" }, { status: 404 })
    }

    const score = clampNumber(data.wellbeingScore, 0, 100, NaN as unknown as number)
    if (!Number.isFinite(score)) {
      return NextResponse.json({ success: false, message: "wellbeingScore (0-100) is required" }, { status: 400 })
    }

    const mood = MOODS.includes(String(data.mood)) ? String(data.mood) : "Neutral"
    const workload = WORKLOADS.includes(String(data.workload)) ? String(data.workload) : "Balanced"
    const stressLevel = clampNumber(data.stressLevel, 1, 5, 3)
    const overtimeHours = String(clampNumber(data.overtimeHours, 0, 80, 0))
    const date = isIsoDate(data.date) ? data.date : todayIso()
    const note = typeof data.note === "string" && data.note.trim() ? data.note.trim().slice(0, 2000) : null

    // Previous row powers the threshold-transition detection (before inserting).
    const [previous] = await db
      .select({ wellbeingScore: wellbeingMetrics.wellbeingScore })
      .from(wellbeingMetrics)
      .where(eq(wellbeingMetrics.userId, targetUserId))
      .orderBy(desc(wellbeingMetrics.date), desc(wellbeingMetrics.id))
      .limit(1)

    const [newRecord] = await db
      .insert(wellbeingMetrics)
      .values({
        userId: targetUserId,
        date,
        wellbeingScore: score,
        mood,
        workload,
        stressLevel,
        overtimeHours,
      })
      .returning()

    // 1) Someone else logged a check-in for the member → tell the member.
    if (session.id !== targetUserId) {
      await safeNotify({
        userId: targetUserId,
        title: `${session.name} logged a wellbeing check-in for you`,
        body: note
          ? `Score ${score} · ${mood}. Note from ${session.name}: ${note}`
          : `Score ${score} · ${mood} recorded by ${session.name}.`,
        metadata: { metricId: newRecord.id, loggedBy: session.id, note: note ?? undefined },
      })
    }

    // 2) Threshold transitions (<40 low, >85 thriving) vs. the previous row.
    await notifyThresholdTransition(newRecord, previous?.wellbeingScore ?? null)

    const [withUser] = await db
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
      .where(eq(wellbeingMetrics.id, newRecord.id))

    return NextResponse.json({ success: true, data: withUser ?? newRecord }, { status: 201 })
  } catch (error) {
    console.error("Wellbeing metrics creation error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create wellbeing record" },
      { status: 500 },
    )
  }
}
