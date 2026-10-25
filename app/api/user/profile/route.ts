import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getUserProfile, updateUserProfile } from "@/lib/data-access"
import { africanTimezones, internationalTimezones, languages } from "@/lib/timezones"

export const dynamic = "force-dynamic"

// Fields a user may change about themselves. `preferences` is intentionally
// excluded here — the settings workspace owns /api/settings for that column
// and merges at the DB level to avoid clobbering concurrent writers.
const UPDATABLE_FIELDS = [
  "name",
  "avatar",
  "jobTitle",
  "department",
  "location",
  "bio",
  "language",
  "timezone",
] as const

type UpdatableField = (typeof UPDATABLE_FIELDS)[number]

const validLanguages = languages.map((lang) => lang.value)
const validTimezones = [
  ...africanTimezones.map((tz) => tz.value),
  ...internationalTimezones.map((tz) => tz.value),
]

function validateField(field: UpdatableField, value: unknown): string | null {
  switch (field) {
    case "name":
      if (typeof value !== "string" || value.trim() === "") return "Name is required and must be a non-empty string"
      if (value.trim().length > 120) return "Name must be 120 characters or fewer"
      return null
    case "language":
      if (typeof value !== "string" || !validLanguages.includes(value)) {
        return "Invalid language selected. Please choose a valid language."
      }
      return null
    case "timezone":
      if (typeof value !== "string" || !validTimezones.includes(value)) {
        return "Invalid timezone selected. Please choose a valid timezone."
      }
      return null
    case "avatar":
      if (value !== null && typeof value !== "string") return "Avatar must be a string path or null"
      if (typeof value === "string" && value.length > 500) return "Avatar path is too long"
      return null
    case "bio":
      if (value !== null && typeof value !== "string") return "Bio must be a string or null"
      return null
    default:
      if (value !== null && typeof value !== "string") return `${field} must be a string or null`
      return null
  }
}

// GET /api/user/profile — session-scoped profile
export async function GET() {
  try {
    const session = await getSession()

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.id

    const userProfile = await getUserProfile(userId).catch((error) => {
      console.error(`Error fetching profile for user ${userId}:`, error)
      throw new Error(
        `Failed to fetch user profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    })

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile: userProfile,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to fetch user profile:", error)
    return NextResponse.json(
      { error: `Failed to fetch user profile: ${errorMessage}` },
      { status: 500 },
    )
  }
}

// Shared partial-update implementation used by PATCH and PUT.
async function applyProfileUpdate(userId: number, rawBody: unknown) {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 })
  }

  const incoming = rawBody as Record<string, unknown>
  const unknownKeys = Object.keys(incoming).filter(
    (k) => !(UPDATABLE_FIELDS as readonly string[]).includes(k),
  )
  if (unknownKeys.length > 0) {
    return NextResponse.json(
      { error: `Fields not updatable via this endpoint: ${unknownKeys.join(", ")}` },
      { status: 400 },
    )
  }

  const updates: Partial<Record<UpdatableField, string | null>> = {}
  for (const field of UPDATABLE_FIELDS) {
    if (!(field in incoming)) continue
    const value = incoming[field] === undefined ? null : incoming[field]
    const validationError = validateField(field, value)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    updates[field] = (value === null ? null : String(value)) as string | null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
  }

  // `name` is the only NOT NULL column in UPDATABLE_FIELDS and validateField()
  // above already rejects anything but a non-empty string for it, so the null
  // arm is unreachable — ?? undefined just tells the compiler that.
  const success = await updateUserProfile(userId, {
    ...updates,
    name: updates.name ?? undefined,
    updatedAt: new Date(),
  }).catch((error) => {
    console.error(`Error updating profile for user ${userId}:`, error)
    throw new Error(
      `Failed to update user profile: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  })

  if (!success) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }

  const profile = await getUserProfile(userId).catch(() => null)

  return NextResponse.json({
    success: true,
    message: "Profile updated successfully",
    profile,
  })
}

// PATCH /api/user/profile — partial update; only fields present in the body
// are written. Response shape kept compatible with the historical PUT
// ({ success, message }) and additionally returns the fresh profile.
export async function PATCH(request: Request) {
  try {
    const session = await getSession()

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    return applyProfileUpdate(session.id, body)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to update user profile:", error)
    return NextResponse.json(
      { error: `Failed to update user profile: ${errorMessage}` },
      { status: 500 },
    )
  }
}

// PUT /api/user/profile — kept for existing consumers; requires `name` and
// now only writes the fields actually present in the body (the old version
// wiped the avatar when it was omitted).
export async function PUT(request: Request) {
  try {
    const session = await getSession()

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const name = (body as { name?: unknown } | null)?.name
    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    return applyProfileUpdate(session.id, body)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to update user profile:", error)
    return NextResponse.json(
      { error: `Failed to update user profile: ${errorMessage}` },
      { status: 500 },
    )
  }
}
