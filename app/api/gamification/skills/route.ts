import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  canManage,
  clampInt,
  ensureRow,
  gamifyNotify,
  getRow,
  normalizeSkillTrees,
  writeSkillTrees,
  type SkillTree,
} from "../_helpers"

export const dynamic = "force-dynamic"

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function validateTreeShape(body: Record<string, unknown>, existing?: SkillTree) {
  const errors: string[] = []
  const name = typeof body.name === "string" ? body.name.trim() : existing?.name ?? ""
  if (!name || name.length > 60) errors.push("name is required and must be 1–60 characters")
  const level = clampInt(body.level ?? existing?.level, 1, 99, 1)
  const progress = clampInt(body.progress ?? existing?.progress, 0, 100, 0)
  const tasksToNextLevel = clampInt(body.tasksToNextLevel ?? existing?.tasksToNextLevel, 0, 999, 0)
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 300) : existing?.description
  return { errors, tree: { name, level, progress, tasksToNextLevel, description: description || undefined } }
}

// GET /api/gamification/skills?userId=N — normalised skill trees for a player.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const userIdRaw = request.nextUrl.searchParams.get("userId")
    const userId = userIdRaw ? Number.parseInt(userIdRaw, 10) : session.id
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid userId" }, { status: 400 })
    }
    const row = await getRow(userId)
    return NextResponse.json({
      success: true,
      userId,
      data: row ? normalizeSkillTrees(row.skillTrees) : [],
    })
  } catch (error) {
    console.error("Gamification skills fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load skill trees", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// POST /api/gamification/skills — create a skill tree.
// Body: { userId?, name, level?, progress?, tasksToNextLevel?, description? }
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const userId = clampInt(body.userId, 1, 100_000, session.id)
    if (!canManage(session, userId)) {
      return NextResponse.json({ success: false, message: "Forbidden: manage your own skill trees only" }, { status: 403 })
    }

    const { errors, tree } = validateTreeShape(body)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join("; ") }, { status: 400 })
    }

    const row = await ensureRow(userId)
    const trees = normalizeSkillTrees(row.skillTrees)
    if (trees.some((t) => sameName(t.name, tree.name))) {
      return NextResponse.json(
        { success: false, message: `A skill tree named "${tree.name}" already exists` },
        { status: 409 },
      )
    }
    trees.push(tree)
    const updated = await writeSkillTrees(row, trees)
    await gamifyNotify(
      updated,
      "notifySkillTree",
      session.id === userId ? null : session,
      "Skill tree created",
      `New skill tree "${tree.name}" added at level ${tree.level}.`,
    )
    return NextResponse.json({ success: true, data: trees }, { status: 201 })
  } catch (error) {
    console.error("Gamification skill create error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create skill tree", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// PUT /api/gamification/skills — edit (or rename) a tree.
// Body: { userId?, name (current name), ...updates }
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
    const currentName = typeof body.name === "string" ? body.name : ""
    if (!currentName) {
      return NextResponse.json({ success: false, message: "name (the current tree name) is required" }, { status: 400 })
    }

    const row = await getRow(userId)
    if (!row) return NextResponse.json({ success: false, message: "No gamification row" }, { status: 404 })

    const trees = normalizeSkillTrees(row.skillTrees)
    const existing = trees.find((t) => sameName(t.name, currentName))
    if (!existing) {
      return NextResponse.json({ success: false, message: `Skill tree "${currentName}" not found` }, { status: 404 })
    }

    const { errors, tree } = validateTreeShape({ ...body, name: body.newName ?? existing.name }, existing)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join("; ") }, { status: 400 })
    }
    if (
      !sameName(tree.name, existing.name) &&
      trees.some((t) => sameName(t.name, tree.name))
    ) {
      return NextResponse.json(
        { success: false, message: `A skill tree named "${tree.name}" already exists` },
        { status: 409 },
      )
    }

    const nextTrees = trees.map((t) => (t === existing ? tree : t))
    const updated = await writeSkillTrees(row, nextTrees)
    return NextResponse.json({ success: true, data: updated.skillTrees ? normalizeSkillTrees(updated.skillTrees) : nextTrees })
  } catch (error) {
    console.error("Gamification skill update error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update skill tree", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE /api/gamification/skills — remove a tree. Body or query: { userId?, name }
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
    if (!name) {
      return NextResponse.json({ success: false, message: "name is required" }, { status: 400 })
    }

    const row = await getRow(userId)
    if (!row) return NextResponse.json({ success: false, message: "No gamification row" }, { status: 404 })

    const trees = normalizeSkillTrees(row.skillTrees)
    const next = trees.filter((t) => !sameName(t.name, name))
    if (next.length === trees.length) {
      return NextResponse.json({ success: false, message: `Skill tree "${name}" not found` }, { status: 404 })
    }
    await writeSkillTrees(row, next)
    return NextResponse.json({ success: true, data: next })
  } catch (error) {
    console.error("Gamification skill delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete skill tree", error: (error as Error).message },
      { status: 500 },
    )
  }
}
