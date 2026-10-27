// POST /api/registers/bulk — verify, reassign or move a selection in one round trip.
// Every row passes the same write rule as the single-row routes, so a selection can never
// widen what the session may touch; rows it may not act on come back in `skipped` with a
// reason instead of silently vanishing from the result.

import { NextResponse } from "next/server"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { registerItems, users, workLogEntries } from "@/drizzle/schema"
import {
  canWriteRegister,
  readRegisterTransition,
  REGISTER_STATUS_LABEL,
  type RegisterStatus,
} from "@/lib/registers/rules"
import { loadPacks, loadRegistersByIds, type RegisterDto } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { bad, readOwnerId, registerSession } from "../_shared"

export const dynamic = "force-dynamic"

const MAX_BULK = 50
const BULK_ACTIONS = ["verify", "reassign", "status"] as const
type BulkAction = (typeof BULK_ACTIONS)[number]

type Skip = { id: number; reason: string }

function readIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const ids = [
    ...new Set(
      value.filter(
        (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0,
      ),
    ),
  ]
  return ids.length ? ids : null
}

export async function POST(request: Request) {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const action = body.action
  if (typeof action !== "string" || !(BULK_ACTIONS as readonly string[]).includes(action)) {
    return bad(`action must be one of: ${BULK_ACTIONS.join(", ")}.`)
  }
  const ids = readIds(body.ids)
  if (!ids) return bad("ids must be a non-empty array of positive integers.")
  if (ids.length > MAX_BULK) return bad(`A bulk action is limited to ${MAX_BULK} rows.`)

  if (action === "reassign" && !gate.viewer.admin) {
    return bad("Only an admin can reassign register rows.", 403)
  }

  try {
    const rows = await loadRegistersByIds(ids)
    const byId = new Map(rows.map((row) => [row.id, row]))
    const skipped: Skip[] = []
    const writable: RegisterDto[] = []

    for (const id of ids) {
      const row = byId.get(id)
      if (!row || !canWriteRegister(row, gate.viewer)) {
        skipped.push({ id, reason: "Not found, or not yours to change." })
        continue
      }
      writable.push(row)
    }

    if (action === "verify") {
      const verifiable = writable.filter((row) => row.status !== "disposed")
      for (const row of writable) {
        if (row.status === "disposed") skipped.push({ id: row.id, reason: "Disposed items cannot be verified." })
      }

      if (verifiable.length) {
        const packs = await loadPacks(false)
        const packOf = (row: RegisterDto) => packByKey(packs, row.packKey)
        const verifiedIds = verifiable.map((row) => row.id)

        await db.transaction(async (tx) => {
          await tx.insert(workLogEntries).values(
            verifiable.map((row) => ({
              userId: gate.session.id,
              workedOn: gate.today,
              kind: "review",
              title: `Verified: ${row.title}`,
              body: `Register item #${row.id} (${row.kind}) — ${REGISTER_STATUS_LABEL[row.status]}.`,
              discipline: packOf(row)?.ladderDiscipline ?? null,
              source: "manual",
            })),
          )
          await tx
            .update(registerItems)
            .set({ lastVerifiedAt: gate.today, updatedAt: new Date() })
            .where(inArray(registerItems.id, verifiedIds))
        })
      }

      return NextResponse.json({
        success: true,
        data: { updated: writable.filter((row) => row.status !== "disposed").map((row) => row.id), skipped, today: gate.today },
      })
    }

    if (action === "reassign") {
      const owner = readOwnerId(body.ownerId)
      if (!owner.ok) return bad(owner.error)
      if (owner.value !== null) {
        const [exists] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, owner.value))
          .limit(1)
        if (!exists) return bad("That owner does not exist.")
      }

      const reassignable = writable.map((row) => row.id)
      if (reassignable.length) {
        await db
          .update(registerItems)
          .set({ ownerId: owner.value, updatedAt: new Date() })
          .where(inArray(registerItems.id, reassignable))
      }

      return NextResponse.json({
        success: true,
        data: { updated: reassignable, skipped, ownerId: owner.value },
      })
    }

    // status
    const packs = await loadPacks(false)
    const packOf = (row: RegisterDto) => packByKey(packs, row.packKey)
    const moves: { row: RegisterDto; status: RegisterStatus; reason: string | null }[] = []
    for (const row of writable) {
      const transition = readRegisterTransition(row.status, body.status, body.reason)
      if (!transition.ok) {
        skipped.push({ id: row.id, reason: transition.error })
        continue
      }
      moves.push({ row, status: transition.status, reason: transition.reason })
    }

    if (moves.length) {
      const target = moves[0].status
      await db.transaction(async (tx) => {
        await tx
          .update(registerItems)
          .set({ status: target, updatedAt: new Date() })
          .where(inArray(registerItems.id, moves.map((move) => move.row.id)))

        const notes = moves
          .filter((move) => move.reason)
          .map((move) => ({
            userId: gate.session.id,
            workedOn: gate.today,
            kind: "note",
            title: `Register: ${move.row.title} — ${REGISTER_STATUS_LABEL[move.status]}`,
            body: move.reason,
            discipline: packOf(move.row)?.ladderDiscipline ?? null,
            source: "manual",
          }))
        if (notes.length) await tx.insert(workLogEntries).values(notes)
      })
    }

    return NextResponse.json({
      success: true,
      data: { updated: moves.map((move) => move.row.id), skipped },
    })
  } catch (error) {
    console.error("Register bulk error:", error)
    return bad("Failed to update the selected rows", 500)
  }
}
