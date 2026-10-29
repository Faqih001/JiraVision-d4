// /api/ops/entries/[id] — one ops log entry.
// GET   → read it (owner or admin).
// PATCH → update fields, status, occurredAt. Fields re-validated against the pack's opsConfig.
// DELETE → remove it (owner or admin).

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { opsLogEntries } from "@/drizzle/schema"
import { loadOpsConfigByPack } from "@/lib/ops/config-reader"
import { validateFields } from "@/lib/ops/fields"
import { badRequest, forbidden, notFound, opsSession, parseId, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await opsSession()
  if (!session) return unauthorized()

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return badRequest("Entry id must be a positive integer.")

  try {
    const row = await loadEntry(id)
    if (!row) return notFound("Ops log entry not found.")
    if (row.ownerId !== session.id && !session.admin) {
      return forbidden("You can only read your own entries.")
    }

    return NextResponse.json({ success: true, data: { entry: mapEntry(row) } })
  } catch (error) {
    return serverError(error, "fetch ops log entry")
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await opsSession()
  if (!session) return unauthorized()

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return badRequest("Entry id must be a positive integer.")

  try {
    const row = await loadEntry(id)
    if (!row) return notFound("Ops log entry not found.")
    if (row.ownerId !== session.id && !session.admin) {
      return forbidden("You can only edit your own entries.")
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return badRequest("A JSON body is required.")

    const { occurredAt, status, fields } = body as Record<string, unknown>
    const update: Partial<typeof opsLogEntries.$inferInsert> = {}

    if (occurredAt !== undefined) {
      if (typeof occurredAt !== "string" || !occurredAt) {
        return badRequest("occurredAt must be an ISO datetime string.")
      }
      update.occurredAt = new Date(occurredAt)
    }

    if (status !== undefined) {
      if (status !== null && typeof status !== "string") {
        return badRequest("status must be a string or null.")
      }
      update.status = status ? String(status).trim().slice(0, 30) : null
    }

    if (fields !== undefined) {
      const config = await loadOpsConfigByPack(row.packKey)
      if (!config) return badRequest("The pack's opsConfig could not be loaded.")

      const merged = { ...(row.fields as Record<string, unknown>), ...(fields as Record<string, unknown>) }
      const result = validateFields(config, row.entityKey, merged)
      if (!result.ok) return badRequest(result.error)
      update.fields = result.fields
    }

    if (Object.keys(update).length === 0) {
      return badRequest("Nothing to update.")
    }

    await db.update(opsLogEntries).set(update).where(eq(opsLogEntries.id, id))
    const updated = await loadEntry(id)

    return NextResponse.json({ success: true, data: { entry: mapEntry(updated!) } })
  } catch (error) {
    return serverError(error, "update ops log entry")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await opsSession()
  if (!session) return unauthorized()

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return badRequest("Entry id must be a positive integer.")

  try {
    const row = await loadEntry(id)
    if (!row) return notFound("Ops log entry not found.")
    if (row.ownerId !== session.id && !session.admin) {
      return forbidden("You can only delete your own entries.")
    }

    await db.delete(opsLogEntries).where(eq(opsLogEntries.id, id))
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (error) {
    return serverError(error, "delete ops log entry")
  }
}

async function loadEntry(id: number) {
  const [row] = await db
    .select()
    .from(opsLogEntries)
    .where(eq(opsLogEntries.id, id))
    .limit(1)
  return row ?? null
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
