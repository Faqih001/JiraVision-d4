import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  normalizeAchievements,
  normalizeRewards,
  normalizeSkillTrees,
  progressWithinLevel,
  rosterWithRank,
  xpPerLevelFor,
} from "../_helpers"

export const dynamic = "force-dynamic"

// GET /api/gamification/me — convenience snapshot of the signed-in player.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const roster = await rosterWithRank()
    const me = roster.find((r) => r.userId === session.id)
    if (!me) {
      return NextResponse.json({ success: true, data: null })
    }
    const settings = normalizeRewards(me.rewards).settings
    const per = xpPerLevelFor(settings)
    return NextResponse.json({
      success: true,
      data: {
        userId: me.userId,
        name: me.name,
        avatar: me.avatar,
        jobTitle: me.jobTitle,
        level: me.level,
        xp: me.xp,
        tasksCompleted: me.tasksCompleted,
        rank: me.rank,
        rosterSize: roster.length,
        xpPerLevel: per,
        nextLevelXp: me.level * per,
        levelProgressPct: progressWithinLevel(me.xp, per),
        achievements: normalizeAchievements(me.achievements),
        skillTrees: normalizeSkillTrees(me.skillTrees),
        rewards: normalizeRewards(me.rewards),
        updatedAt: me.updatedAt ? new Date(me.updatedAt).toISOString() : null,
      },
    })
  } catch (error) {
    console.error("Gamification me fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load gamification profile", error: (error as Error).message },
      { status: 500 },
    )
  }
}
