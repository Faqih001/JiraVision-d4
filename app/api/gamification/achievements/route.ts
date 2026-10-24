import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  canManage,
  clampInt,
  ensureRow,
  gamifyNotify,
  getRow,
  normalizeAchievements,
  rosterWithRank,
  writeAchievements,
  type AchievementEntry,
} from "../_helpers"

export const dynamic = "force-dynamic"

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

// GET /api/gamification/achievements — every achievement entry across the
// roster, flattened with its owner. Optional ?userId=N to filter.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const userIdRaw = request.nextUrl.searchParams.get("userId")
    const roster = await rosterWithRank()
    const rows: {
      userId: number
      name: string
      avatar: string | null
      rank: number
      entry: AchievementEntry
    }[] = []
    for (const row of roster) {
      if (userIdRaw && row.userId !== Number.parseInt(userIdRaw, 10)) continue
      for (const entry of normalizeAchievements(row.achievements)) {
        rows.push({ userId: row.userId, name: row.name, avatar: row.avatar, rank: row.rank, entry })
      }
    }
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("Gamification achievements fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load achievements", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// POST /api/gamification/achievements — unlock/create an achievement for a player.
// Body: { userId?, name, description?, xp?, unlockedAt? }
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const userId = clampInt(body.userId, 1, 100_000, session.id)
    if (!canManage(session, userId)) {
      return NextResponse.json({ success: false, message: "Forbidden: managers can unlock for teammates" }, { status: 403 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name || name.length > 80) {
      return NextResponse.json({ success: false, message: "name is required (1–80 characters)" }, { status: 400 })
    }
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 300) : undefined
    const xp = body.xp === undefined ? undefined : clampInt(body.xp, 0, 100_000, 0)
    const unlockedAt =
      typeof body.unlockedAt === "string" && !Number.isNaN(Date.parse(body.unlockedAt))
        ? new Date(body.unlockedAt).toISOString()
        : new Date().toISOString()

    const row = await ensureRow(userId)
    const entries = normalizeAchievements(row.achievements)
    const existing = entries.find((e) => sameName(e.name, name))
    const entry: AchievementEntry = {
      name,
      description: description ?? existing?.description,
      xp: xp ?? existing?.xp,
      unlockedAt,
      unlockedByUserId: session.id === userId ? null : session.id,
    }
    const next = existing
      ? entries.map((e) => (e === existing ? entry : e))
      : [...entries, entry]
    await writeAchievements(row, next)

    if (session.id !== userId) {
      // Unlock performed by someone else → notify the recipient (unless their
      // gamification settings disable achievement notifications).
      await gamifyNotify(
        row,
        "notifyAchievement",
        session,
        `Achievement unlocked: ${name}`,
        `Unlocked "${name}" for you.`,
      )    }
    return NextResponse.json({ success: true, data: next }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error("Gamification achievement unlock error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to unlock achievement", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// PUT — edit an achievement entry's metadata. Body: { userId?, name, updates: {...} }
export async function PUT(request: NextRequest) {
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
    const name = typeof body.name === "string" ? body.name : ""
    if (!name) return NextResponse.json({ success: false, message: "name is required" }, { status: 400 })
    const updates = (body.updates ?? {}) as Record<string, unknown>

    const row = await getRow(userId)
    if (!row) return NextResponse.json({ success: false, message: "No gamification row" }, { status: 404 })
    const entries = normalizeAchievements(row.achievements)
    const target = entries.find((e) => sameName(e.name, name))
    if (!target) return NextResponse.json({ success: false, message: `Achievement "${name}" not found` }, { status: 404 })

    const nextName = typeof updates.name === "string" ? updates.name.trim() : target.name
    if (!nextName || nextName.length > 80) {
      return NextResponse.json({ success: false, message: "name must be 1–80 characters" }, { status: 400 })
    }
    if (nextName.toLowerCase() !== target.name.toLowerCase() && entries.some((e) => sameName(e.name, nextName))) {
      return NextResponse.json({ success: false, message: `Achievement "${nextName}" already exists` }, { status: 409 })
    }
    const edited: AchievementEntry = {
      ...target,
      name: nextName,
      description:
        typeof updates.description === "string" ? updates.description.trim().slice(0, 300) : target.description,
      xp: updates.xp === undefined ? target.xp : clampInt(updates.xp, 0, 100_000, 0),
      unlockedAt:
        typeof updates.unlockedAt === "string" && !Number.isNaN(Date.parse(updates.unlockedAt))
          ? new Date(updates.unlockedAt).toISOString()
          : target.unlockedAt,
    }
    await writeAchievements(row, entries.map((e) => (e === target ? edited : e)))
    return NextResponse.json({ success: true, data: edited })
  } catch (error) {
    console.error("Gamification achievement update error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update achievement", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE — remove an achievement entry. Body or query: { userId?, name }
export async function DELETE(request: NextRequest) {
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
    const name = typeof body.name === "string" ? body.name : request.nextUrl.searchParams.get("name") ?? ""
    if (!name) return NextResponse.json({ success: false, message: "name is required" }, { status: 400 })

    const row = await getRow(userId)
    if (!row) return NextResponse.json({ success: false, message: "No gamification row" }, { status: 404 })
    const entries = normalizeAchievements(row.achievements)
    const next = entries.filter((e) => !sameName(e.name, name))
    if (next.length === entries.length) {
      return NextResponse.json({ success: false, message: `Achievement "${name}" not found` }, { status: 404 })
    }
    await writeAchievements(row, next)
    return NextResponse.json({ success: true, data: next })
  } catch (error) {
    console.error("Gamification achievement delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete achievement", error: (error as Error).message },
      { status: 500 },
    )
  }
}
