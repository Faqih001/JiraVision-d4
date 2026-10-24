import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { gamification } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import {
  ensureRow,
  gamifyNotify,
  getCatalogRow,
  normalizeRewards,
  type Redemption,
} from "../../_helpers"

export const dynamic = "force-dynamic"

// POST /api/gamification/rewards/redeem — body { rewardId }
// Redeem flow: the reward's XP cost is deducted from the player's `xp` column
// (the spendable XP balance), the redemption is appended to the rewards jsonb
// ledger on their gamification row, and a notification is sent to the redeemer.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const rewardId = typeof body.rewardId === "string" ? body.rewardId : ""
    if (!rewardId) {
      return NextResponse.json({ success: false, message: "rewardId is required" }, { status: 400 })
    }

    const catalogRow = await getCatalogRow()
    const catalog = catalogRow ? normalizeRewards(catalogRow.rewards).catalog : []
    const reward = catalog.find((r) => r.id === rewardId)
    if (!reward) {
      return NextResponse.json({ success: false, message: "Reward not found in the catalog" }, { status: 404 })
    }
    if (!reward.active) {
      return NextResponse.json({ success: false, message: `"${reward.name}" is not currently available` }, { status: 400 })
    }

    const myRow = await ensureRow(session.id)
    if (myRow.xp < reward.cost) {
      return NextResponse.json(
        { success: false, message: `Not enough XP: "${reward.name}" costs ${reward.cost}, you have ${myRow.xp}` },
        { status: 400 },
      )
    }

    const bag = normalizeRewards(myRow.rewards)
    const entry: Redemption = {
      id: crypto.randomUUID(),
      rewardId: reward.id,
      name: reward.name,
      cost: reward.cost,
      redeemedAt: new Date().toISOString(),
      userId: session.id,
    }
    const nextXp = myRow.xp - reward.cost
    const [updated] = await db
      .update(gamification)
      .set({
        xp: nextXp,
        rewards: { ...bag, ledger: [...bag.ledger, entry] },
        updatedAt: new Date(),
      })
      .where(eq(gamification.id, myRow.id))
      .returning()

    await gamifyNotify(
      updated,
      "notifyRedeem",
      null,
      "Reward redeemed",
      `You redeemed "${reward.name}" for ${reward.cost} XP. ${nextXp} XP remaining.`,
    )

    return NextResponse.json({
      success: true,
      data: { redemption: entry, balance: nextXp, ledger: normalizeRewards(updated.rewards).ledger },
    })
  } catch (error) {
    console.error("Gamification reward redeem error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to redeem reward", error: (error as Error).message },
      { status: 500 },
    )
  }
}
