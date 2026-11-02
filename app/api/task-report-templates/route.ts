import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { taskReportTemplates } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cadence = searchParams.get("cadence") || undefined
    const discipline = searchParams.get("discipline") || undefined

    const conditions = [eq(taskReportTemplates.isActive, true)]
    if (cadence) conditions.push(eq(taskReportTemplates.cadence, cadence))
    if (discipline) conditions.push(eq(taskReportTemplates.discipline, discipline))

    const templates = await db
      .select()
      .from(taskReportTemplates)
      .where(and(...conditions))

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error("Error fetching task report templates:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch templates", error: (error as Error).message },
      { status: 500 }
    )
  }
}
