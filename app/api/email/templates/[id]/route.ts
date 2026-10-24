// PATCH/DELETE /api/email/templates/[id] — edit or remove a template.
// PATCH accepts partial updates (name/subject/body/eventType/enabled).
// When a PATCH changes the body to a non-empty value, the same honest linkage
// as POST applies: a preview digest row is queued and a system notification
// references it. Nothing is ever sent.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications"
import type { TemplateRow } from "../route"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params
  const templateId = Number(id)
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid template id" }, { status: 400 })
  }

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

    // Load the existing row so the update is a merge, not an overwrite.
    const [existing] = (await db.execute(sql`
      SELECT id, name, subject, body, event_type, enabled, created_at
      FROM email_templates
      WHERE id = ${templateId} AND user_id = ${session.id}
    `)) as unknown as TemplateRow[]

    if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

    const name =
      typeof payload.name === "string" && payload.name.trim() ? payload.name.trim().slice(0, 255) : existing.name
    const subject = typeof payload.subject === "string" ? payload.subject.trim().slice(0, 500) : existing.subject
    const body = typeof payload.body === "string" ? payload.body : existing.body
    const eventType =
      typeof payload.eventType === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(payload.eventType)
        ? payload.eventType
        : existing.event_type
    const enabled = typeof payload.enabled === "boolean" ? payload.enabled : existing.enabled

    const [updated] = (await db.execute(sql`
      UPDATE email_templates
      SET name = ${name}, subject = ${subject}, body = ${body}, event_type = ${eventType}, enabled = ${enabled}
      WHERE id = ${templateId} AND user_id = ${session.id}
      RETURNING id, name, subject, body, event_type, enabled, created_at
    `)) as unknown as TemplateRow[]

    // Real persisted linkage when the edited template still carries a body.
    let previewDigestId: number | null = null
    if (typeof payload.body === "string" && payload.body.trim() !== "") {
      const [preview] = (await db.execute(sql`
        INSERT INTO email_digest (user_id, to_email, subject, body, event_type, status)
        VALUES (${session.id}, ${session.email ?? ""}, ${`Template preview — ${subject || name}`}, ${body}, ${eventType ?? "info"}, ${"queued"})
        RETURNING id
      `)) as unknown as { id: number }[]
      previewDigestId = preview?.id ?? null

      await createNotification({
        userId: session.id,
        type: "system",
        title: `Template "${name}" updated`,
        body:
          previewDigestId !== null
            ? `Edited with a body — queued preview digest row #${previewDigestId}. Nothing was sent; this app stores digests only.`
            : "Edited with a body, but the preview digest row could not be queued.",
        link: "/dashboard/email",
        metadata: { templateId, previewDigestId },
      })
    }

    return NextResponse.json({ success: true, data: { item: updated, previewDigestId } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to update template: ${message}` }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params
  const templateId = Number(id)
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid template id" }, { status: 400 })
  }

  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const [row] = (await db.execute(sql`
      DELETE FROM email_templates
      WHERE id = ${templateId} AND user_id = ${session.id}
      RETURNING id
    `)) as unknown as { id: number }[]

    if (!row) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: row.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to delete template: ${message}` }, { status: 500 })
  }
}
