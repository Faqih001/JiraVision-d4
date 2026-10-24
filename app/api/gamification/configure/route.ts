import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  ensureRow,
  gamifyNotify,
  normalizeRewards,
  writeRewardsBag,
  xpPerLevelFor,
  type GamificationSettings,
} from "../_helpers"

export const dynamic = "force-dynamic"

const BOOLEAN_KEYS = [
  "enableGamification",
  "publicLeaderboard",
  "notifySkillTree",
  "notifyRedeem",
  "notifyAchievement",
  "notifyConfigure",
] as const

function parseSettings(body: Record<string, unknown>, current: GamificationSettings) {
  const next: GamificationSettings = { ...current }
  const errors: string[] = []
  if (body.xpPerLevelOverride !== undefined && body.xpPerLevelOverride !== null && body.xpPerLevelOverride !== "") {
    const n = Number(body.xpPerLevelOverride)
    if (!Number.isFinite(n) || n < 100 || n > 10_000) {
      errors.push("xpPerLevelOverride must be between 100 and 10000 (or empty to use the default 500)")
    } else {
      next.xpPerLevelOverride = Math.round(n)
    }
  } else {
    delete next.xpPerLevelOverride
  }
  for (const key of BOOLEAN_KEYS) {
    if (typeof body[key] === "boolean") next[key] = body[key]
  }
  return { errors, next }
}

// GET /api/gamification/configure — my gamification settings (stored in the
// rewards jsonb bag on my own gamification row) + the effective XP model.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const row = await ensureRow(session.id)
    const settings = normalizeRewards(row.rewards).settings
    return NextResponse.json({
      success: true,
      data: {
        settings,
        xpPerLevel: xpPerLevelFor(settings),
        defaultXpPerLevel: 500,
        level: row.level,
        xp: row.xp,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      },
    })
  } catch (error) {
    console.error("Gamification config fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load gamification settings", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// PUT /api/gamification/configure — save settings and notify the actor.
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const row = await ensureRow(session.id)
    const bag = normalizeRewards(row.rewards)
    const { errors, next } = parseSettings(body, bag.settings)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join("; ") }, { status: 400 })
    }

    const updated = await writeRewardsBag(row, { ...bag, settings: next })
    await gamifyNotify(
      updated,
      "notifyConfigure",
      null,
      "Gamification settings updated",
      `XP per level: ${xpPerLevelFor(next)} · notifications ${
        [next.notifySkillTree, next.notifyRedeem, next.notifyAchievement].every((v) => v !== false)
          ? "enabled"
          : "partially muted"
      }.`,
    )
    return NextResponse.json({ success: true, data: { settings: next, xpPerLevel: xpPerLevelFor(next) } })
  } catch (error) {
    console.error("Gamification config save error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to save gamification settings", error: (error as Error).message },
      { status: 500 },
    )
  }
}
