import { NextResponse, type NextRequest } from "next/server"
import { and, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks, users } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { DEFAULT_SETTINGS } from "../route"

export const dynamic = "force-dynamic"

type StoredPrefs = Record<string, unknown>

function asObject(value: unknown): StoredPrefs {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as StoredPrefs) : {}
}

async function readStoredSettings(userId: number): Promise<StoredPrefs> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return asObject(asObject(rows[0]?.preferences).settings)
}

async function mergeSetting(userId: number, key: string, value: unknown) {
  await db.execute(sql`
    UPDATE users
    SET preferences = jsonb_set(
          COALESCE(preferences, '{}'::jsonb),
          '{settings}',
          COALESCE(COALESCE(preferences, '{}'::jsonb) -> 'settings', '{}'::jsonb) || jsonb_build_object(${key}::text, ${JSON.stringify(value ?? null)}::jsonb)
        ),
        updated_at = NOW()
    WHERE id = ${userId}
  `)
}

async function dropSetting(userId: number, key: string) {
  await db.execute(sql`
    UPDATE users
    SET preferences = jsonb_set(
          COALESCE(preferences, '{}'::jsonb),
          '{settings}',
          COALESCE(COALESCE(preferences, '{}'::jsonb) -> 'settings', '{}'::jsonb) - ${key}
        ),
        updated_at = NOW()
    WHERE id = ${userId}
  `)
}

const VALID_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/

// The onboarding namespace is a structured object validated against the stored state, so it
// cannot come through this arbitrary key/value route. PATCH /api/settings owns it.
const RESERVED_SETTINGS_KEYS = ["onboarding"]

function reservedKey(key: string) {
  if (!RESERVED_SETTINGS_KEYS.includes(key)) return null
  return NextResponse.json(
    { success: false, message: "Use PATCH /api/settings for the onboarding namespace" },
    { status: 400 },
  )
}

// GET /api/settings/:key -> { key, value }
export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    if (!VALID_KEY.test(key)) {
      return NextResponse.json({ success: false, message: "Invalid settings key" }, { status: 400 })
    }
    const stored = await readStoredSettings(session.id)
    const value = key in stored ? stored[key] : DEFAULT_SETTINGS[key]
    return NextResponse.json({ success: true, key, value })
  } catch (error) {
    console.error("Setting fetch error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to load setting" },
      { status: 500 },
    )
  }
}

// PUT /api/settings/:key  { value: any }
// Special keys:
//   deletionRequestedAt  -> account-deletion request guarded by open assigned tasks (409)
//   lastPasswordResetLinkRequestedAt -> records a security event + system notification
export async function PUT(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    if (!VALID_KEY.test(key)) {
      return NextResponse.json({ success: false, message: "Invalid settings key" }, { status: 400 })
    }
    const reserved = reservedKey(key)
    if (reserved) return reserved

    const body = await request.json().catch(() => null)
    const value = body && typeof body === "object" && "value" in (body as StoredPrefs) ? (body as StoredPrefs).value : body

    if (key === "deletionRequestedAt") {
      return handleDeletionRequest(session.id, value)
    }

    if (key === "lastPasswordResetLinkRequestedAt" && value) {
      await mergeSetting(session.id, key, value)
      await createNotification({
        userId: session.id,
        type: "system",
        title: "Security: password reset link requested",
        body: "A password reset link was requested for this account from the settings workspace.",
        link: "/dashboard/settings",
        metadata: { event: "password_reset_link_requested" },
      })
      return NextResponse.json({ success: true, key, value })
    }

    await mergeSetting(session.id, key, value)
    return NextResponse.json({ success: true, key, value })
  } catch (error) {
    console.error("Setting save error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to save setting" },
      { status: 500 },
    )
  }
}

async function handleDeletionRequest(userId: number, value: unknown) {
  if (!value) {
    // explicit cancellation
    await dropSetting(userId, "deletionRequestedAt")
    await createNotification({
      userId,
      type: "system",
      title: "Account deletion request cancelled",
      body: "The pending account deletion request was cancelled from the settings workspace.",
      link: "/dashboard/settings",
      metadata: { event: "deletion_cancelled" },
    })
    return NextResponse.json({ success: true, key: "deletionRequestedAt", value: null })
  }

  // Blocked (409) while the account still owns assigned open tasks — same
  // guard shape the team member APIs use before destructive member actions.
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.assigneeId, userId), ne(tasks.status, "done")))
  const openAssigned = Number(countRow?.count ?? 0)

  if (openAssigned > 0) {
    return NextResponse.json(
      {
        success: false,
        message: `Cannot request deletion: ${openAssigned} task${openAssigned === 1 ? "" : "s"} still assigned to you. Reassign or complete them first.`,
        assignedTasks: openAssigned,
      },
      { status: 409 },
    )
  }

  const timestamp = new Date().toISOString()
  await mergeSetting(userId, "deletionRequestedAt", timestamp)
  await createNotification({
    userId,
    type: "system",
    title: "Account deletion requested",
    body: "Deletion of this account was requested from the settings workspace. A manual review step is required before the account is actually removed.",
    link: "/dashboard/settings",
    metadata: { event: "deletion_requested", requestedAt: timestamp },
  })
  return NextResponse.json({ success: true, key: "deletionRequestedAt", value: timestamp })
}

// DELETE /api/settings/:key -> remove the stored override (falls back to default)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    if (!VALID_KEY.test(key)) {
      return NextResponse.json({ success: false, message: "Invalid settings key" }, { status: 400 })
    }
    const reserved = reservedKey(key)
    if (reserved) return reserved

    if (key === "deletionRequestedAt") {
      return handleDeletionRequest(session.id, false)
    }

    await dropSetting(session.id, key)
    return NextResponse.json({ success: true, key, value: DEFAULT_SETTINGS[key] })
  } catch (error) {
    console.error("Setting delete error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to delete setting" },
      { status: 500 },
    )
  }
}
