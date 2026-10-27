// POST /api/registers/[id]/verify — "I checked this today" (design §12 item 2).
// The stamp and the work-log review line are written in one transaction: a register that
// says it was checked without a logged act would be a claim with no evidence.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { registerItems, workLogEntries } from "@/drizzle/schema"
import { canWriteRegister, REGISTER_STATUS_LABEL } from "@/lib/registers/rules"
import { loadPacks, loadRegisterRow } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { bad, parseId, registerSession } from "../../_shared"

export const dynamic = "force-dynamic"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await registerSession()
  if (!gate) return bad("Unauthorized", 401)

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) return bad("Register id must be a positive integer")

  try {
    const row = await loadRegisterRow(id)
    if (!row || !canWriteRegister(row, gate.viewer)) {
      return bad("Register row not found", 404)
    }
    if (row.status === "disposed") {
      return bad("A disposed item cannot be verified.", 409)
    }

    const pack = packByKey(await loadPacks(false), row.packKey)

    await db.transaction(async (tx) => {
      await tx.insert(workLogEntries).values({
        userId: gate.session.id,
        workedOn: gate.today,
        kind: "review",
        title: `Verified: ${row.title}`,
        body: `Register item #${row.id} (${row.kind}) — ${REGISTER_STATUS_LABEL[row.status]}.`,
        discipline: pack?.ladderDiscipline ?? null,
        source: "manual",
      })

      await tx
        .update(registerItems)
        .set({ lastVerifiedAt: gate.today, updatedAt: new Date() })
        .where(eq(registerItems.id, id))
    })

    const updated = await loadRegisterRow(id)
    return NextResponse.json({ success: true, data: { register: updated, today: gate.today } })
  } catch (error) {
    console.error("Register verify error:", error)
    return bad("Failed to verify the register row", 500)
  }
}
