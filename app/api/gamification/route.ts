import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { gamification } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import {
  clampInt,
  ensureRow,
  gamifyNotify,
  getRow,
  levelForXp,
  normalizeAchievements,
  normalizeRewards,
  normalizeSkillTrees,
  rosterWithRank,
  xpPerLevelFor,
  canManage,
} from "./_helpers"

export const dynamic = "force-dynamic"

// GET /api/gamification — every gamification row joined with its user,
// rank computed by XP (desc, ties by userId), jsonb fields normalised.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const roster = await rosterWithRank()
    const me = roster.find((r) => r.userId === session.id) ?? null
    return NextResponse.json({
      success: true,
      data: roster.map((r) => ({
        userId: r.userId,
        name: r.name,
        avatar: r.avatar,
        role: r.role,
        jobTitle: r.jobTitle,
        level: r.level,
        xp: r.xp,
        tasksCompleted: r.tasksCompleted,
        rank: r.rank,
        achievements: normalizeAchievements(r.achievements),
        skillTrees: normalizeSkillTrees(r.skillTrees),
        xpPerLevel: xpPerLevelFor(normalizeRewards(r.rewards).settings),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      })),
      me: me
        ? {
            userId: me.userId,
            name: me.name,
            avatar: me.avatar,
            level: me.level,
            xp: me.xp,
            rank: me.rank,
            tasksCompleted: me.tasksCompleted,
            xpPerLevel: xpPerLevelFor(normalizeRewards(me.rewards).settings),
          }
        : null,
    })
  } catch (error) {
    console.error("Gamification roster fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load gamification roster", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// POST /api/gamification — upsert a player row.
// Body: { userId?, level?, xp?, tasksCompleted? }. Editing another member requires manager/admin.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const userId = clampInt(body.userId, 1, 100_000, session.id)
    if (!canManage(session, userId)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const before = await getRow(userId)
    const row = before ?? (await ensureRow(userId))

    const patch: Record<string, unknown> = {}
    if (body.xp !== undefined) patch.xp = Math.max(0, clampInt(body.xp, 0, 1_000_000, row.xp))
    if (body.tasksCompleted !== undefined)
      patch.tasksCompleted = Math.max(0, clampInt(body.tasksCompleted, 0, 1_000_000, row.tasksCompleted))
    if (body.level !== undefined) patch.level = clampInt(body.level, 1, 99, row.level)
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: true, data: row, created: !before })
    }

    const per = xpPerLevelFor(normalizeRewards(row.rewards).settings)
    if (typeof patch.xp === "number") {
      patch.level = levelForXp(patch.xp, per, row.level)
    }
    const [updated] = await db
      .update(gamification)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(gamification.id, row.id))
      .returning()

    // Level-up detection: crossing an XP threshold after this update unlocks the next level.
    if (typeof patch.xp === "number" && patch.xp > row.xp && updated.level > row.level) {
      await gamifyNotify(
        updated,
        "notifyAchievement",
        session.id === userId ? null : session,
        `Achievement unlocked: Level ${updated.level}`,
        `You crossed ${(updated.level - 1) * per} XP and reached level ${updated.level}.`,
      )
    }

    return NextResponse.json({ success: true, data: updated, created: !before })
  } catch (error) {
    console.error("Gamification upsert error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to upsert gamification row", error: (error as Error).message },
      { status: 500 },
    )
  }
}
