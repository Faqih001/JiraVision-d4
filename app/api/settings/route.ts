import { NextResponse, type NextRequest } from "next/server"
import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

// The settings namespace lives inside the existing users.preferences jsonb
// column (drizzle/schema.ts -> users.preferences). All keys written by this
// API are nested under preferences.settings so unrelated consumers of
// preferences (language, chat state, billing) are never touched.

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  // Preferences
  theme: "system",
  density: "comfortable",
  weekStart: "monday",
  timeFormat: "12h",
  sprintView: "board",
  // Notification preferences (stored preference; the realtime bell follows
  // server-side Neon Realtime availability, not these flags)
  notifyEmail: true,
  notifyRealtime: true,
  notifyPush: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  // Task creation defaults
  defaultPriority: "medium",
  defaultStoryPoints: 3,
  defaultSprintId: null as number | null,
}

type StoredPrefs = Record<string, unknown>

function asObject(value: unknown): StoredPrefs {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as StoredPrefs) : {}
}

async function readSettings(userId: number): Promise<{ raw: StoredPrefs; merged: Record<string, unknown> }> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const raw = asObject(rows[0]?.preferences)
  const stored = asObject(raw.settings)
  return { raw, merged: { ...DEFAULT_SETTINGS, ...stored } }
}

/**
 * Merge a patch into preferences.settings at the DB level so concurrent
 * writers of other preferences keys are not clobbered.
 */
async function mergeSettings(userId: number, patch: StoredPrefs) {
  await db.execute(sql`
    UPDATE users
    SET preferences = jsonb_set(
          COALESCE(preferences, '{}'::jsonb),
          '{settings}',
          COALESCE(COALESCE(preferences, '{}'::jsonb) -> 'settings', '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
        ),
        updated_at = NOW()
    WHERE id = ${userId}
  `)
}

function sanitizePatch(body: unknown): { patch: StoredPrefs | null, error?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { patch: null, error: "Body must be a JSON object of settings keys" }
  }
  const source = body as StoredPrefs
  const incoming = asObject(source.settings) // accept { key: value } or { settings: { key: value } }
  const candidate = Object.keys(incoming).length > 0 ? incoming : source
  const patch: StoredPrefs = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (key === "settings") continue
    if (typeof value === "function" || (value && typeof value === "object" && !Array.isArray(value))) continue
    if (key.startsWith("__")) continue
    if (typeof key !== "string" || key.length === 0 || key.length > 64) continue
    patch[key] = value
  }
  return { patch }
}

// GET /api/settings -> defaults merged with the user's stored settings
export async function GET() {
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const { merged } = await readSettings(session.id)
    return NextResponse.json({ success: true, settings: merged, defaults: DEFAULT_SETTINGS })
  } catch (error) {
    console.error("Settings fetch error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to load settings" },
      { status: 500 },
    )
  }
}

// PATCH (or PUT) /api/settings  { key: value, ... }  |  { settings: { ... } }
// Batch save; a "Settings updated" system notification is created when the
// save actually changes 3 or more keys.
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json().catch(() => null)
    const { patch, error } = sanitizePatch(body)
    if (!patch || Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, message: error ?? "No settings provided" }, { status: 400 })
    }

    const { merged } = await readSettings(session.id)
    const changedKeys = Object.entries(patch)
      .filter(([key, value]) => merged[key] !== value)
      .map(([key]) => key)

    if (changedKeys.length > 0) {
      const filteredPatch: StoredPrefs = Object.fromEntries(changedKeys.map((k) => [k, patch[k]]))
      await mergeSettings(session.id, filteredPatch)
      if (changedKeys.length >= 3) {
        await createNotification({
          userId: session.id,
          type: "system",
          title: "Settings updated",
          body: `Batch save changed ${changedKeys.length} preferences: ${changedKeys.slice(0, 6).join(", ")}${changedKeys.length > 6 ? "…" : ""}.`,
          link: "/dashboard/settings",
          metadata: { changedKeys },
        })
      }
    }

    const { merged: after } = await readSettings(session.id)
    return NextResponse.json({ success: true, settings: after, changedKeys })
  } catch (error) {
    console.error("Settings save error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to save settings" },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request)
}

// DELETE /api/settings -> reset the settings namespace back to defaults
export async function DELETE() {
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    await db.execute(sql`
      UPDATE users
      SET preferences = COALESCE(preferences, '{}'::jsonb) - 'settings', updated_at = NOW()
      WHERE id = ${session.id}
    `)
    await createNotification({
      userId: session.id,
      type: "system",
      title: "Settings reset",
      body: "All workspace settings were restored to their defaults.",
      link: "/dashboard/settings",
    })
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS })
  } catch (error) {
    console.error("Settings reset error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to reset settings" },
      { status: 500 },
    )
  }
}
