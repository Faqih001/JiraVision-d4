// /api/ops/entries — ops log entries for the signed-in member.
// GET  → list entries, filtered by pack, entity, date range. Member-scoped.
// POST → create one entry. Fields are validated against the pack's opsConfig.

import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { opsLogEntries } from "@/drizzle/schema"
import { loadOpsConfigByPack } from "@/lib/ops/config-reader"
import { validateFields } from "@/lib/ops/fields"
import { badRequest, opsSession, serverError, unauthorized } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await opsSession()
  if (!session) return unauthorized()

  try {
    const params = request.nextUrl.searchParams
    const packKey = params.get("pack") || null
    const entityKey = params.get("entity") || null
    const from = params.get("from") || null
    const to = params.get("to") || null
    const limit = Math.min(Number(params.get("limit") ?? "200"), 1000)

    const conditions = [eq(opsLogEntries.ownerId, session.id)]

    if (packKey) conditions.push(eq(opsLogEntries.packKey, packKey))
    if (entityKey) conditions.push(eq(opsLogEntries.entityKey, entityKey))
    if (from) conditions.push(gte(opsLogEntries.occurredAt, new Date(from)))
    if (to) conditions.push(lte(opsLogEntries.occurredAt, new Date(to + "T23:59:59.999Z")))

    const rows = await db
      .select()
      .from(opsLogEntries)
      .where(and(...conditions))
      .orderBy(desc(opsLogEntries.occurredAt), desc(opsLogEntries.createdAt))
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: {
        entries: rows.map(mapEntry),
        filters: { pack: packKey, entity: entityKey, from, to },
      },
    })
  } catch (error) {
    return serverError(error, "fetch ops log entries")
  }
}

export async function POST(request: NextRequest) {
  const session = await opsSession()
  if (!session) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return badRequest("A JSON body is required.")

    const { packKey, entityKey, occurredAt, status, fields } = body as Record<string, unknown>

    if (typeof packKey !== "string" || !packKey.trim()) {
      return badRequest("packKey is required.")
    }

    if (typeof entityKey !== "string" || !entityKey.trim()) {
      return badRequest("entityKey is required.")
    }

    const config = await loadOpsConfigByPack(packKey.trim())
    if (!config) {
      return badRequest("That pack does not exist or has no opsConfig.")
    }

    if (!config.logs[entityKey]) {
      return badRequest(
        `"${entityKey}" is not a valid entity. Valid: ${Object.keys(config.logs).join(", ")}.`,
      )
    }

    if (typeof occurredAt !== "string" || !occurredAt) {
      return badRequest("occurredAt is required (ISO datetime).")
    }

    const fieldResult = validateFields(config, entityKey, fields ?? {})
    if (!fieldResult.ok) return badRequest(fieldResult.error)

    const statusValue = typeof status === "string" ? status.trim().slice(0, 30) : null

    const [inserted] = await db
      .insert(opsLogEntries)
      .values({
        packKey: packKey.trim(),
        entityKey: entityKey.trim(),
        ownerId: session.id,
        occurredAt: new Date(occurredAt),
        status: statusValue,
        fields: fieldResult.fields,
        source: "manual",
      })
      .returning()

    return NextResponse.json(
      { success: true, data: { entry: mapEntry(inserted) } },
      { status: 201 },
    )
  } catch (error) {
    return serverError(error, "create ops log entry")
  }
}

function mapEntry(row: typeof opsLogEntries.$inferSelect) {
  return {
    id: row.id,
    packKey: row.packKey,
    entityKey: row.entityKey,
    ownerId: row.ownerId,
    occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : row.occurredAt,
    status: row.status,
    fields: row.fields,
    source: row.source,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }
}
