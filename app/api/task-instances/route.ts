import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getTaskInstances } from "@/lib/data-access-task-instances"

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
    const filters = {
      taskId: searchParams.get("taskId") ? parseInt(searchParams.get("taskId")!, 10) : undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: searchParams.get("status") || undefined,
    }

    const instances = await getTaskInstances(filters)
    return NextResponse.json({ success: true, data: instances })
  } catch (error) {
    console.error("Error fetching task instances:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch task instances", error: (error as Error).message },
      { status: 500 }
    )
  }
}
