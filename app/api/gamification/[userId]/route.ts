import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { gamification } from "@/drizzle/schema"
import { and, eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import {
  canManage,
  clampInt,
  gamifyNotify,
  getRow,
  levelForXp,
  normalizeAchievements,
  normalizeRewards,
  normalizeSkillTrees,
  rosterWithRank,
  serializeSkillTrees,
  xpPerLevelFor,
} from "../_helpers"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ userId: string }> }

function parseUserId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

// GET /api/gamification/:userId — one player row joined with the user, with rank.
export async function GET(_request: NextRequest, { params }: Context) {
  const { userId: raw } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const userId = parseUserId(raw)
    if (!userId) return NextResponse.json({ success: false, message: "Invalid userId" }, { status: 400 })

    const roster = await rosterWithRank()
    const me = roster.find((r) => r.userId === userId)
    if (!me) return NextResponse.json({ success: false, message: "No gamification row" }, { status: 404 })
    return NextResponse.json({
      success: true,
      data: {
        ...me,
        achievements: normalizeAchievements(me.achievements),
        skillTrees: normalizeSkillTrees(me.skillTrees),
        rewards: normalizeRewards(me.rewards),
        xpPerLevel: xpPerLevelFor(normalizeRewards(me.rewards).settings),
      },
    })
  } catch (error) {
    console.error("Gamification row fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load gamification row", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// PUT /api/gamification/:userId — partial update of level/xp/tasksCompleted or
// the jsonb documents. Self edits allowed for anyone; other members need manager/admin.
export async function PUT(request: NextRequest, { params }: Context) {
  const { userId: raw } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const userId = parseUserId(raw)
    if (!userId) return NextResponse.json({ success: false, message: "Invalid userId" }, { status: 400 })
    if (!canManage(session, userId)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const row = await getRow(userId)
    if (!row) return NextResponse.json({ success: false, message: "No gamification row" }, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Record<string, unknown> = {}

    if (body.xp !== undefined) patch.xp = Math.max(0, clampInt(body.xp, 0, 1_000_000, row.xp))
    if (body.tasksCompleted !== undefined)
      patch.tasksCompleted = Math.max(0, clampInt(body.tasksCompleted, 0, 1_000_000, row.tasksCompleted))
    if (body.level !== undefined) patch.level = clampInt(body.level, 1, 99, row.level)

    if (Array.isArray(body.achievements)) {
      patch.achievements = normalizeAchievements(body.achievements)
    }
    if (Array.isArray(body.skillTrees) || (body.skillTrees && typeof body.skillTrees === "object")) {
      patch.skillTrees = serializeSkillTrees(normalizeSkillTrees(body.skillTrees))
    }
    if (body.rewards && typeof body.rewards === "object") {
      patch.rewards = normalizeRewards(body.rewards)
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: true, data: row, updated: 0 })
    }

    const per = xpPerLevelFor(normalizeRewards(row.rewards).settings)
    if (typeof patch.xp === "number" && patch.xp >= 0) {
      patch.level = levelForXp(patch.xp, per, row.level)
    }

    const [updated] = await db
      .update(gamification)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(gamification.id, row.id))
      .returning()

    if (typeof patch.xp === "number" && patch.xp > row.xp && updated.level > row.level) {
      await gamifyNotify(
        updated,
        "notifyAchievement",
        session.id === userId ? null : session,
        `Achievement unlocked: Level ${updated.level}`,
        `You crossed ${(updated.level - 1) * per} XP and reached level ${updated.level}.`,
      )
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Gamification row update error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update gamification row", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE /api/gamification/:userId — remove a player's gamification row.
export async function DELETE(_request: NextRequest, { params }: Context) {
  const { userId: raw } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const userId = parseUserId(raw)
    if (!userId) return NextResponse.json({ success: false, message: "Invalid userId" }, { status: 400 })
    if (!canManage(session, userId)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const deleted = await db
      .delete(gamification)
      .where(and(eq(gamification.userId, userId)))
      .returning({ id: gamification.id })
    if (deleted.length === 0) {
      return NextResponse.json({ success: false, message: "No gamification row" }, { status: 404 })
    }
    return NextResponse.json({ success: true, deleted: deleted[0].id })
  } catch (error) {
    console.error("Gamification row delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete gamification row", error: (error as Error).message },
      { status: 500 },
    )
  }
}
