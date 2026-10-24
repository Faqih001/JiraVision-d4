// GET/POST /api/email/digest — the persisted digest "outbox" for the email
// workspace. Rows are stored, NOT delivered: this app does not send real email.
// Raw parameterized SQL against the email_digest table created by
// scripts/create-email-tables.mjs (schema.ts is owned elsewhere, so we cannot
// add a drizzle table definition here). Placeholders (${}) only.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"

export const dynamic = "force-dynamic"

const DIGEST_STATUSES = ["queued", "delivered", "failed"] as const
type DigestStatus = (typeof DIGEST_STATUSES)[number]

type DigestRow = {
  id: number
  to_email: string | null
  subject: string | null
  body: string | null
  event_type: string | null
  status: string
  created_at: string | Date
}

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? 200)
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 200, 1), 500)

    const [rows, countRows, activityRows] = await Promise.all([
      db.execute(sql`
        SELECT id, to_email, subject, body, event_type, status, created_at
        FROM email_digest
        WHERE user_id = ${session.id}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as unknown as Promise<DigestRow[]>,
      db.execute(sql`
        SELECT status, COUNT(*)::int AS count
        FROM email_digest
        WHERE user_id = ${session.id}
        GROUP BY status
      `) as unknown as Promise<{ status: string; count: number }[]>,
      db.execute(sql`
        SELECT created_at::date AS day, COUNT(*)::int AS count
        FROM email_digest
        WHERE user_id = ${session.id}
          AND status = 'queued'
          AND created_at >= (CURRENT_DATE - INTERVAL '13 days')
        GROUP BY created_at::date
      `) as unknown as Promise<{ day: string | Date; count: number }[]>,
    ])

    const byStatus: Record<string, number> = { queued: 0, delivered: 0, failed: 0 }
    for (const row of countRows) byStatus[row.status] = (byStatus[row.status] ?? 0) + row.count

    // Build a dense 14-day series so the chart never silently drops empty days.
    const countsByDay = new Map<string, number>()
    for (const row of activityRows) {
      const d = row.day instanceof Date ? row.day : new Date(row.day)
      countsByDay.set(d.toISOString().slice(0, 10), row.count)
    }
    const activity: { day: string; queued: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setHours(12, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      activity.push({ day: key, queued: countsByDay.get(key) ?? 0 })
    }

    const grandTotal = Object.values(byStatus).reduce((a, b) => a + b, 0)
    return NextResponse.json({
      success: true,
      data: {
        items: rows,
        summary: { total: grandTotal, queued: byStatus.queued, delivered: byStatus.delivered, failed: byStatus.failed },
        activity,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to load digest rows: ${message}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = (await request.json().catch(() => null)) as {
      toEmail?: unknown
      subject?: unknown
      body?: unknown
      eventType?: unknown
      status?: unknown
    } | null

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim() : ""
    if (!toEmail || toEmail.length > 320 || !toEmail.includes("@")) {
      return NextResponse.json({ success: false, message: "toEmail must be a non-empty address (max 320 chars)" }, { status: 400 })
    }
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 500) : ""
    if (!subject) {
      return NextResponse.json({ success: false, message: "subject is required" }, { status: 400 })
    }
    const content = typeof body.body === "string" ? body.body : ""
    const eventType =
      typeof body.eventType === "string" && body.eventType.trim() ? body.eventType.trim().slice(0, 50) : "system"
    const requestedStatus = typeof body.status === "string" ? body.status : "queued"
    const status: DigestStatus = (DIGEST_STATUSES as readonly string[]).includes(requestedStatus)
      ? (requestedStatus as DigestStatus)
      : "queued"

    const [row] = (await db.execute(sql`
      INSERT INTO email_digest (user_id, to_email, subject, body, event_type, status)
      VALUES (${session.id}, ${toEmail}, ${subject}, ${content}, ${eventType}, ${status})
      RETURNING id, to_email, subject, body, event_type, status, created_at
    `)) as unknown as DigestRow[]

    return NextResponse.json({ success: true, data: { item: row } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to queue digest row: ${message}` }, { status: 500 })
  }
}
