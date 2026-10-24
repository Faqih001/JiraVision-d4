import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getDashboardOverview } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

// GET /api/dashboard/overview — full aggregation for the main dashboard page.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const data = await getDashboardOverview(session.id)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Dashboard overview fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to build dashboard overview", error: (error as Error).message },
      { status: 500 },
    )
  }
}
