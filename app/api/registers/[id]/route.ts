// PATCH /api/registers/[id] — edit one custody row (design §12 item 2). The owner and an
// admin may change it; custody and ownership moves are admin-only. A lifecycle move that
// needs a reason refuses without one and records the reason as a work-log note, because the
// register has no place to store prose and the log is where acts are recorded.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { registerItems, users, workLogEntries } from "@/drizzle/schema"
import {
  canReassignRegister,
  canWriteRegister,
  isRegisterCustody,
  readRegisterTransition,
  REGISTER_STATUS_LABEL,
  type RegisterStatus,
} from "@/lib/registers/rules"
import { readRegisterFields } from "@/lib/registers/fields"
import { loadPacks, loadRegisterRow } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { bad, parseId, readInterval, readOwnerId, readTitle, registerSession } from "../_shared"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return bad("Register id must be a positive integer")

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  try {
    const row = await loadRegisterRow(id)
    // A row outside the privacy circle is indistinguishable from one that does not exist.
    if (!row || !canWriteRegister(row, gate.viewer)) {
      return bad("Register row not found", 404)
    }

    const update: Partial<typeof registerItems.$inferInsert> = { updatedAt: new Date() }

    if (body.title !== undefined) {
      const title = readTitle(body.title)
      if (!title) return bad("title must be 1-200 characters.")
      update.title = title
    }

    if (body.fields !== undefined) {
      const fields = readRegisterFields(body.fields)
      if (!fields.ok) return bad(fields.error)
      update.fields = fields.fields
    }

    if (body.verifyIntervalDays !== undefined) {
      const interval = readInterval(body.verifyIntervalDays)
      if (!interval.ok) return bad(interval.error)
      update.verifyIntervalDays = interval.value
    }

    let reason: string | null = null
    let statusChanged = false
    let nextStatus: RegisterStatus | null = null
    if (body.status !== undefined && body.status !== row.status) {
      const transition = readRegisterTransition(row.status, body.status, body.reason)
      if (!transition.ok) return bad(transition.error)
      update.status = transition.status
      nextStatus = transition.status
      reason = transition.reason
      statusChanged = true
    }

    const touchesOwnership =
      body.custody !== undefined || body.ownerId !== undefined || body.parentId !== undefined
    if (touchesOwnership && !canReassignRegister(gate.viewer)) {
      return bad("Only an admin can change custody, ownership or a parent row.", 403)
    }

    if (body.custody !== undefined) {
      if (!isRegisterCustody(body.custody)) return bad("custody must be member, team or org.")
      update.custody = body.custody
    }

    if (body.ownerId !== undefined) {
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
      update.ownerId = owner.value
    }

    if (body.parentId !== undefined) {
      if (body.parentId === null) {
        update.parentId = null
      } else {
        if (typeof body.parentId !== "number" || !Number.isInteger(body.parentId) || body.parentId <= 0) {
          return bad("parentId must be a positive id or null.")
        }
        if (body.parentId === id) return bad("A row cannot be its own parent.")
        const parent = await loadRegisterRow(body.parentId)
        if (!parent || parent.packKey !== row.packKey) {
          return bad("parentId must name a row in the same pack.")
        }
        if (parent.parentId === id) return bad("That parent already sits under this row.")
        update.parentId = parent.id
      }
    }

    const pack = statusChanged
      ? packByKey(await loadPacks(false), row.packKey)
      : null

    await db.transaction(async (tx) => {
      await tx.update(registerItems).set(update).where(eq(registerItems.id, id))

      if (statusChanged && reason) {
        await tx.insert(workLogEntries).values({
          userId: gate.session.id,
          workedOn: gate.today,
          kind: "note",
          title: `Register: ${update.title ?? row.title} — ${REGISTER_STATUS_LABEL[nextStatus ?? row.status]}`,
          body: reason,
          discipline: pack?.ladderDiscipline ?? null,
          source: "manual",
        })
      }
    })

    const updated = await loadRegisterRow(id)
    return NextResponse.json({ success: true, data: { register: updated } })
  } catch (error) {
    console.error("Register update error:", error)
    return bad("Failed to update the register row", 500)
  }
}
