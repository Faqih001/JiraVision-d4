// GET/POST /api/email/templates — message templates for the email workspace.
// Honesty rule: saving a template with a body does NOT send anything. It
// (1) inserts a real preview row into email_digest with status 'queued' and
// (2) fires a "system" notification whose body references that digest row id,
// so the linkage between template save → persisted queue is verifiable.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export type TemplateRow = {
  id: number
  name: string
  subject: string | null
  body: string | null
  event_type: string | null
  enabled: boolean
  created_at: string | Date
}

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const rows = (await db.execute(sql`
      SELECT id, name, subject, body, event_type, enabled, created_at
      FROM email_templates
      WHERE user_id = ${session.id}
      ORDER BY created_at DESC
    `)) as unknown as TemplateRow[]
    return NextResponse.json({ success: true, data: { items: rows } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to load templates: ${message}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const payload = (await request.json().catch(() => null)) as {
      name?: unknown
      subject?: unknown
      body?: unknown
      eventType?: unknown
      enabled?: unknown
    } | null

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ success: false, message: "Body must be a JSON object" }, { status: 400 })
    }

    const name = typeof payload.name === "string" ? payload.name.trim() : ""
    if (!name || name.length > 255) {
      return NextResponse.json({ success: false, message: "name is required (max 255 chars)" }, { status: 400 })
    }
    const subject = typeof payload.subject === "string" ? payload.subject.trim().slice(0, 500) : ""
    const body = typeof payload.body === "string" ? payload.body : ""
    const eventType =
      typeof payload.eventType === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(payload.eventType)
        ? payload.eventType
        : "info"
    const enabled = typeof payload.enabled === "boolean" ? payload.enabled : true

    const [template] = (await db.execute(sql`
      INSERT INTO email_templates (user_id, name, subject, body, event_type, enabled)
      VALUES (${session.id}, ${name}, ${subject}, ${body}, ${eventType}, ${enabled})
      RETURNING id, name, subject, body, event_type, enabled, created_at
    `)) as unknown as TemplateRow[]

    // A saved template with a body queues a real preview digest row (status
    // 'queued') and a notification that references it by id. Nothing is sent.
    let previewDigestId: number | null = null
    if (body.trim() !== "") {
      const [preview] = (await db.execute(sql`
        INSERT INTO email_digest (user_id, to_email, subject, body, event_type, status)
        VALUES (${session.id}, ${session.email ?? ""}, ${`Template preview — ${subject || name}`}, ${body}, ${eventType}, ${"queued"})
        RETURNING id
      `)) as unknown as { id: number }[]
      previewDigestId = preview?.id ?? null

      await createNotification({
        userId: session.id,
        type: "system",
        title: `Template "${name}" saved`,
        body:
          previewDigestId !== null
            ? `Saved with a body — queued preview digest row #${previewDigestId} in the email workspace. Nothing was sent; this app stores digests only.`
            : "Saved with a body, but the preview digest row could not be queued.",
        link: "/dashboard/email",
        metadata: { templateId: template.id, previewDigestId },
      })
    }

    return NextResponse.json({ success: true, data: { item: template, previewDigestId } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to save template: ${message}` }, { status: 500 })
  }
}
