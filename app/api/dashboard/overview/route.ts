import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getDashboardOverview, type OverviewScope } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

// GET /api/dashboard/overview — full aggregation for the main dashboard page.
// `?scope=member` narrows every task, sprint and event read to the signed-in
// person; the default stays the workspace aggregate the team pages read.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const scope: OverviewScope =
      new URL(request.url).searchParams.get("scope") === "member" ? "member" : "team"
    const data = await getDashboardOverview(session.id, scope)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Dashboard overview fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to build dashboard overview", error: (error as Error).message },
      { status: 500 },
    )
  }
}
