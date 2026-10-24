// GET/PUT /api/email/preferences — the event subscription matrix for the
// email workspace. Stored as one JSONB blob row per user in the
// email_preferences table (created by scripts/create-email-tables.mjs) —
// kept out of users.preferences so the settings workspace is never clobbered.
//
// Shape: { [eventType: NotificationType]: { digest: boolean, inApp: boolean } }

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { NOTIFICATION_TYPES } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export type ChannelPrefs = { digest: boolean; inApp: boolean }
export type PreferenceMap = Record<string, ChannelPrefs>

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

function sanitize(input: unknown): PreferenceMap | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const out: PreferenceMap = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!(NOTIFICATION_TYPES as readonly string[]).includes(key)) continue
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    const v = value as { digest?: unknown; inApp?: unknown }
    if (typeof v.digest !== "boolean" || typeof v.inApp !== "boolean") return null
    out[key] = { digest: v.digest, inApp: v.inApp }
  }
  return out
}

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const [row] = (await db.execute(sql`
      SELECT data, updated_at
      FROM email_preferences
      WHERE user_id = ${session.id}
    `)) as unknown as { data: unknown; updated_at: string | Date }[]

    const data = row && row.data && typeof row.data === "object" ? (row.data as PreferenceMap) : {}
    return NextResponse.json({ success: true, data: { data, stored: Boolean(row), updatedAt: row?.updated_at ?? null } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to load preferences: ${message}` }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const payload = (await request.json().catch(() => null)) as { data?: unknown } | null
    const cleaned = sanitize(payload?.data)
    if (!cleaned) {
      return NextResponse.json(
        {
          success: false,
          message: `data must be an object keyed by event type (${NOTIFICATION_TYPES.join(", ")}), each value { digest: boolean, inApp: boolean }`,
        },
        { status: 400 },
      )
    }

    const serialized = JSON.stringify(cleaned)
    const [row] = (await db.execute(sql`
      INSERT INTO email_preferences (user_id, data, updated_at)
      VALUES (${session.id}, ${serialized}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      RETURNING user_id, data, updated_at
    `)) as unknown as { user_id: number; data: unknown; updated_at: string | Date }[]

    return NextResponse.json({ success: true, data: { data: row?.data ?? cleaned, updatedAt: row?.updated_at ?? null } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, message: `Failed to save preferences: ${message}` }, { status: 500 })
  }
}
