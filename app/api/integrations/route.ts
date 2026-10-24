import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { readIntegrations } from "./_store"

export const dynamic = "force-dynamic"

// GET /api/integrations -> all stored integration entries for the user
// (persisted in users.preferences.integrations; empty object until the user
// connects or drafts something for the first time)
export async function GET() {
  try {
    const session = await getSession()
    if (!session || typeof session.id !== "number") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const integrations = await readIntegrations(session.id)
    return NextResponse.json({ success: true, integrations })
  } catch (error) {
    console.error("Integrations fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load integrations",
      },
      { status: 500 },
    )
  }
}
