import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  ensureRow,
  getCatalogRow,
  getRow,
  normalizeRewards,
  writeRewardsBag,
  xpPerLevelFor,
  type RewardItem,
} from "../_helpers"

export const dynamic = "force-dynamic"

function parseReward(body: Record<string, unknown>, existing?: RewardItem) {
  const errors: string[] = []
  const name = typeof body.name === "string" ? body.name.trim() : existing?.name ?? ""
  if (!name || name.length > 80) errors.push("name is required (1–80 characters)")
  const costRaw = body.cost === undefined ? existing?.cost : body.cost
  const cost = Number(costRaw)
  if (!Number.isFinite(cost) || cost <= 0 || cost > 1_000_000) errors.push("cost must be a positive XP amount")
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 300) : existing?.description
  const active = typeof body.active === "boolean" ? body.active : existing?.active ?? true
  return { errors, reward: { name, cost: Math.round(cost), description: description || undefined, active } }
}

// GET /api/gamification/rewards — shared catalog, my redemption ledger, my XP balance.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const catalogRow = await getCatalogRow()
    const catalog = catalogRow ? normalizeRewards(catalogRow.rewards).catalog : []
    const myRow = await getRow(session.id)
    const mine = myRow ? normalizeRewards(myRow.rewards) : { catalog: [], ledger: [], settings: {} }
    return NextResponse.json({
      success: true,
      data: {
        catalog,
        ledger: mine.ledger.filter((r) => r.userId === session.id || r.userId === 0),
        balance: myRow?.xp ?? 0,
        xpPerLevel: myRow ? xpPerLevelFor(mine.settings) : xpPerLevelFor({}),
        catalogOwnerUserId: catalogRow?.userId ?? null,
      },
    })
  } catch (error) {
    console.error("Gamification rewards fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to load rewards", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// POST /api/gamification/rewards — create a catalog entry.
// Body: { name, cost, description?, active? }
// The catalog lives in the rewards jsonb of the lowest-userId gamification row.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const { errors, reward } = parseReward(body)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join("; ") }, { status: 400 })
    }

    const catalogRow = await getCatalogRow()
    if (!catalogRow) {
      await ensureRow(session.id)
      return NextResponse.json(
        { success: false, message: "Reward catalog row was just created — retry the save" },
        { status: 503 },
      )
    }
    const bag = normalizeRewards(catalogRow.rewards)
    if (bag.catalog.some((r) => r.name.trim().toLowerCase() === reward.name.toLowerCase())) {
      return NextResponse.json({ success: false, message: `A reward named "${reward.name}" already exists` }, { status: 409 })
    }
    const item: RewardItem = {
      id: crypto.randomUUID(),
      ...reward,
      createdAt: new Date().toISOString(),
    }
    bag.catalog = [...bag.catalog, item]
    await writeRewardsBag(catalogRow, bag)
    return NextResponse.json({ success: true, data: bag.catalog }, { status: 201 })
  } catch (error) {
    console.error("Gamification reward create error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create reward", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// PUT /api/gamification/rewards — update a catalog entry. Body: { rewardId, ...updates }
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const rewardId = typeof body.rewardId === "string" ? body.rewardId : ""
    if (!rewardId) return NextResponse.json({ success: false, message: "rewardId is required" }, { status: 400 })

    const catalogRow = await getCatalogRow()
    if (!catalogRow) return NextResponse.json({ success: false, message: "No reward catalog yet" }, { status: 404 })
    const bag = normalizeRewards(catalogRow.rewards)
    const existing = bag.catalog.find((r) => r.id === rewardId)
    if (!existing) return NextResponse.json({ success: false, message: "Reward not found" }, { status: 404 })

    const { errors, reward } = parseReward(body, existing)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join("; ") }, { status: 400 })
    }
    if (
      reward.name.toLowerCase() !== existing.name.toLowerCase() &&
      bag.catalog.some((r) => r.id !== rewardId && r.name.trim().toLowerCase() === reward.name.toLowerCase())
    ) {
      return NextResponse.json({ success: false, message: `A reward named "${reward.name}" already exists` }, { status: 409 })
    }
    bag.catalog = bag.catalog.map((r) => (r.id === rewardId ? { ...r, ...reward } : r))
    await writeRewardsBag(catalogRow, bag)
    return NextResponse.json({ success: true, data: bag.catalog })
  } catch (error) {
    console.error("Gamification reward update error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update reward", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE /api/gamification/rewards — remove a catalog entry. Body/query: { rewardId }
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const rewardId =
      typeof body.rewardId === "string" ? body.rewardId : request.nextUrl.searchParams.get("rewardId") ?? ""
    if (!rewardId) return NextResponse.json({ success: false, message: "rewardId is required" }, { status: 400 })

    const catalogRow = await getCatalogRow()
    if (!catalogRow) return NextResponse.json({ success: false, message: "No reward catalog yet" }, { status: 404 })
    const bag = normalizeRewards(catalogRow.rewards)
    const next = bag.catalog.filter((r) => r.id !== rewardId)
    if (next.length === bag.catalog.length) {
      return NextResponse.json({ success: false, message: "Reward not found" }, { status: 404 })
    }
    bag.catalog = next
    await writeRewardsBag(catalogRow, bag)
    return NextResponse.json({ success: true, data: next })
  } catch (error) {
    console.error("Gamification reward delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete reward", error: (error as Error).message },
      { status: 500 },
    )
  }
}
