import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { INTEGRATIONS_LINK, readIntegrations, upsertIntegration } from "../_store"

export const dynamic = "force-dynamic"

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

/**
 * POST /api/integrations/import  { fileName?, total, created, failed }
 * Records the digest of a CSV bulk import run. The tasks themselves were
 * already created by the client posting each valid row to /api/tasks; this
 * route only stores the run summary as a system notification and marks the
 * csv integration's lastSyncAt, so the "imports run" KPI is backed by data.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = asObject(await request.json().catch(() => null))
    if (!body) {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }
    const total = Number(body.total ?? 0)
    const created = Number(body.created ?? 0)
    const failed = Number(body.failed ?? 0)
    if (![total, created, failed].every((n) => Number.isFinite(n) && n >= 0)) {
      return NextResponse.json({ success: false, message: "total/created/failed must be non-negative numbers" }, { status: 400 })
    }
    const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 120) : "tasks.csv"

    const all = await readIntegrations(session.id)
    const entry = all.csv
    if (entry) {
      await upsertIntegration(session.id, "csv", {
        ...entry,
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    const notification = await createNotification({
      userId: session.id,
      type: "system",
      title: `CSV import finished: ${created} task${created === 1 ? "" : "s"} created`,
      body: `${fileName} — ${total} rows parsed, ${created} created via /api/tasks, ${failed} failed.`,
      link: INTEGRATIONS_LINK,
      metadata: { integrationKey: "csv", source: "csv_import", fileName, total, created, failed },
    })

    return NextResponse.json({ success: true, notification })
  } catch (error) {
    console.error("Integration import digest error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to record import run" },
      { status: 500 },
    )
  }
}
