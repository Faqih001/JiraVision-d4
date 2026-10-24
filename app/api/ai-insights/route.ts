import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { aiInsights } from "@/drizzle/schema"
import { desc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

// GET /api/ai-insights?status=active — list AI scrum-master insights
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const rows = status
      ? await db
          .select()
          .from(aiInsights)
          .where(eq(aiInsights.status, status))
          .orderBy(desc(aiInsights.createdAt))
      : await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt))

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("Error fetching AI insights:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch AI insights", error: (error as Error).message },
      { status: 500 },
    )
  }
}
