// /api/ops/recommendations — deterministic recommendations for the signed-in member.
// GET → evaluate the pack's recommendRules against the member's entries and register items.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { opsLogEntries, registerItems } from "@/drizzle/schema"
import { loadOpsConfigByPack } from "@/lib/ops/config-reader"
import { buildOpsRecommendations, type OpsRecommendInput } from "@/lib/ops/recommend"
import { badRequest, opsSession, serverError, unauthorized } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await opsSession()
  if (!session) return unauthorized()

  try {
    const params = request.nextUrl.searchParams
    const packKey = params.get("pack")
    if (!packKey) return badRequest("pack query parameter is required.")

    const config = await loadOpsConfigByPack(packKey)
    if (!config) return badRequest("That pack does not exist or has no opsConfig.")

    const entries = await db
      .select({
        id: opsLogEntries.id,
        entityKey: opsLogEntries.entityKey,
        occurredAt: opsLogEntries.occurredAt,
        status: opsLogEntries.status,
        fields: opsLogEntries.fields,
      })
      .from(opsLogEntries)
      .where(
        and(
          eq(opsLogEntries.ownerId, session.id),
          eq(opsLogEntries.packKey, packKey),
        ),
      )

    const registers = await db
      .select({
        id: registerItems.id,
        kind: registerItems.kind,
        title: registerItems.title,
        fields: registerItems.fields,
        lastVerifiedAt: registerItems.lastVerifiedAt,
        verifyIntervalDays: registerItems.verifyIntervalDays,
      })
      .from(registerItems)
      .where(eq(registerItems.ownerId, session.id))

    const today = new Date().toISOString().split("T")[0]

    const input: OpsRecommendInput = {
      today,
      entries: entries.map((e) => ({
        id: e.id,
        entityKey: e.entityKey,
        occurredAt: e.occurredAt,
        status: e.status,
        fields: (e.fields as Record<string, unknown>) ?? {},
      })),
      registerItems: registers.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        fields: (r.fields as Record<string, unknown>) ?? {},
        lastVerifiedAt: typeof r.lastVerifiedAt === "string" ? r.lastVerifiedAt : null,
        verifyIntervalDays: r.verifyIntervalDays,
      })),
    }

    const recommendations = buildOpsRecommendations(config, input)

    return NextResponse.json({
      success: true,
      data: { pack: packKey, recommendations },
    })
  } catch (error) {
    return serverError(error, "fetch recommendations")
  }
}
