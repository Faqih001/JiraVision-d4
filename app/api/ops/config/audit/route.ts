// /api/ops/config/audit — the history of config changes for the caller's pack.
//
// GET → { events } where events is the last 50 audit rows for the pack, newest first. Each event has
// { id, operation, summary, createdAt, userId }. The route does not return the full config snapshots —
// those are large and the audit trail is for "who changed what and when", not "what exactly was in the
// config at that moment". The apply/revert/reset routes log the summary (counts of new/replaced items),
// which is enough to understand the scope of a change without dumping the whole config.
//
// Scope: an admin reads the audit trail for the pack their own discipline resolves to. There is no packKey
// parameter — a body field naming someone else's pack would be a way to read another discipline's history.

import { NextResponse } from "next/server"
import { eq, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { opsConfigAudit } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { forbidden, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()
  if (session.role !== "admin" && session.role !== "super_admin") {
    return forbidden("Only an admin can read the audit trail.")
  }

  try {
    const discipline = defaultDisciplineOf(session)
    if (!discipline) {
      return NextResponse.json({ success: true, data: { events: [] } })
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) {
      return NextResponse.json({ success: true, data: { events: [] } })
    }

    const events = await db
      .select({
        id: opsConfigAudit.id,
        operation: opsConfigAudit.operation,
        summary: opsConfigAudit.summary,
        createdAt: opsConfigAudit.createdAt,
        userId: opsConfigAudit.userId,
      })
      .from(opsConfigAudit)
      .where(eq(opsConfigAudit.packKey, ctx.packKey))
      .orderBy(desc(opsConfigAudit.createdAt))
      .limit(50)

    return NextResponse.json({ success: true, data: { events } })
  } catch (error) {
    return serverError(error, "read ops config audit")
  }
}
