// /api/registers — what this person is the keeper of (design §12 item 2).
// GET  → every row they may see, filtered by the page's own URL state, with staleness computed.
// POST → one manual row. `source` is never taken from the body, and credential fields are
//        refused here, at the boundary, rather than trusted from the form.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { registerItems, users } from "@/drizzle/schema"
import { canWriteRegister, isRegisterCustody } from "@/lib/registers/rules"
import { readRegisterFields } from "@/lib/registers/fields"
import {
  defaultDisciplineOf,
  loadPacks,
  loadRegisterRow,
  loadVisibleRegisters,
  withState,
} from "@/lib/registers/read"
import { filterRegisters, parseRegisterView } from "@/lib/registers/view-state"
import { packByKey, resolvePack } from "@/lib/packs/pack"
import {
  bad,
  readInterval,
  readOwnerId,
  readTitle,
  registerSession,
} from "./_shared"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  try {
    const packs = await loadPacks(false)
    const pack = resolvePack(packs, defaultDisciplineOf(gate.session))
    const search = new URL(request.url).searchParams
    const rows = withState(await loadVisibleRegisters(gate.viewer), gate.today)
    const filtered = filterRegisters(rows, parseRegisterView(search), gate.viewer.id, gate.today)
    const requestedPack = search.get("pack")
    const scoped = requestedPack ? filtered.filter((row) => row.packKey === requestedPack) : filtered

    return NextResponse.json({
      success: true,
      data: {
        registers: scoped,
        packs,
        pack,
        admin: gate.viewer.admin,
        today: gate.today,
        counts: {
          total: rows.length,
          stale: rows.filter((row) => row.staleness === "stale").length,
          unknown: rows.filter((row) => row.staleness === "unknown").length,
        },
      },
    })
  } catch (error) {
    console.error("Registers read error:", error)
    return bad("Failed to load the register", 500)
  }
}

export async function POST(request: Request) {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const packKey = typeof body.packKey === "string" ? body.packKey.trim() : ""
  if (!packKey) return bad("packKey is required")

  try {
    const packs = await loadPacks(false)
    const pack = packByKey(packs, packKey)
    if (!pack) return bad("That role pack does not exist or is inactive.", 404)

    const kind = typeof body.kind === "string" ? body.kind.trim() : ""
    if (!pack.registerKinds.some((entry) => entry.key === kind)) {
      return bad(`kind must be one of: ${pack.registerKinds.map((entry) => entry.key).join(", ")}.`)
    }

    const title = readTitle(body.title)
    if (!title) return bad("title must be 1-200 characters.")

    const fields = readRegisterFields(body.fields ?? {})
    if (!fields.ok) return bad(fields.error)

    const custody = body.custody === undefined ? "member" : body.custody
    if (!isRegisterCustody(custody)) {
      return bad("custody must be member, team or org.")
    }

    const interval = readInterval(body.verifyIntervalDays)
    if (!interval.ok) return bad(interval.error)

    const owner = body.ownerId === undefined ? { ok: true as const, value: gate.session.id } : readOwnerId(body.ownerId)
    if (!owner.ok) return bad(owner.error)
    if (!gate.viewer.admin && owner.value !== gate.session.id) {
      return bad("You can only own your own rows.", 403)
    }
    if (owner.value !== null) {
      const [exists] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, owner.value))
        .limit(1)
      if (!exists) return bad("That owner does not exist.")
    }

    let parentId: number | null = null
    if (body.parentId !== undefined && body.parentId !== null) {
      if (typeof body.parentId !== "number" || !Number.isInteger(body.parentId) || body.parentId <= 0) {
        return bad("parentId must be a positive id or null.")
      }
      const parent = await loadRegisterRow(body.parentId)
      if (!parent || parent.packKey !== pack.packKey) {
        return bad("parentId must name a row in the same pack.")
      }
      if (!canWriteRegister(parent, gate.viewer)) {
        return bad("You cannot attach a row to that parent.", 403)
      }
      parentId = parent.id
    }

    const [inserted] = await db
      .insert(registerItems)
      .values({
        packKey: pack.packKey,
        kind,
        title,
        fields: fields.fields,
        status: "in_service",
        ownerId: owner.value,
        custody,
        verifyIntervalDays: interval.value,
        parentId,
        source: "manual",
      })
      .returning({ id: registerItems.id })

    const row = await loadRegisterRow(inserted.id)
    return NextResponse.json({ success: true, data: { register: row } }, { status: 201 })
  } catch (error) {
    console.error("Register create error:", error)
    return bad("Failed to create the register row", 500)
  }
}
