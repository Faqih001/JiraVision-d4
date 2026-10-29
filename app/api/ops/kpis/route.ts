// /api/ops/kpis — computed KPIs for the signed-in member's pack.
// GET → compute all KPIs for a given month (defaults to current month).
//       Reads ops_log_entries and register_items, scoped to the member.

import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { opsLogEntries, registerItems } from "@/drizzle/schema"
import { loadOpsConfigByPack } from "@/lib/ops/config-reader"
import { computeMonthlyKpis, type OpsEntry, type RegisterItemRow } from "@/lib/ops/kpis"
import { badRequest, opsSession, serverError, unauthorized } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await opsSession()
  if (!session) return unauthorized()

  try {
    const params = request.nextUrl.searchParams
    const packKey = params.get("pack")
    if (!packKey) return badRequest("pack query parameter is required.")

    const month = params.get("month") ?? currentMonth()
    if (!/^\d{4}-\d{2}$/.test(month)) return badRequest("month must be YYYY-MM.")

    const config = await loadOpsConfigByPack(packKey)
    if (!config) return badRequest("That pack does not exist or has no opsConfig.")

    const from = `${month}-01T00:00:00.000Z`
    const to = `${month}-31T23:59:59.999Z`

    const entries = await db
      .select()
      .from(opsLogEntries)
      .where(
        and(
          eq(opsLogEntries.ownerId, session.id),
          eq(opsLogEntries.packKey, packKey),
          gte(opsLogEntries.occurredAt, new Date(from)),
          lte(opsLogEntries.occurredAt, new Date(to)),
        ),
      )

    const registers = await db
      .select({
        id: registerItems.id,
        kind: registerItems.kind,
        fields: registerItems.fields,
        lastVerifiedAt: registerItems.lastVerifiedAt,
      })
      .from(registerItems)
      .where(eq(registerItems.ownerId, session.id))

    const kpis = computeMonthlyKpis(
      config,
      entries as OpsEntry[],
      month,
      registers as RegisterItemRow[],
    )

    return NextResponse.json({
      success: true,
      data: {
        pack: packKey,
        month,
        kpis,
        entryCount: entries.length,
        registerCount: registers.length,
      },
    })
  } catch (error) {
    return serverError(error, "compute KPIs")
  }
}

function currentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}
