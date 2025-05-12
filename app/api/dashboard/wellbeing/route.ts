import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { wellbeingMetrics } from "@/drizzle/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    // Get wellbeing metrics for the current user
    const metrics = await db
      .select()
      .from(wellbeingMetrics)
      .where(eq(wellbeingMetrics.userId, session.id))
      .orderBy(desc(wellbeingMetrics.date))
      .limit(7)
    
    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    console.error("Wellbeing metrics error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch wellbeing metrics",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const data = await request.json()
    
    // Insert new wellbeing record
    const [newRecord] = await db
      .insert(wellbeingMetrics)
      .values({
        userId: session.id,
        date: new Date(),
        wellbeingScore: data.wellbeingScore || 50,
        mood: data.mood || "Neutral",
        workload: data.workload || "Balanced",
        stressLevel: data.stressLevel || 3,
        overtimeHours: data.overtimeHours || 0
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: newRecord,
    })
  } catch (error) {
    console.error("Wellbeing metrics creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create wellbeing record",
      },
      { status: 500 }
    )
  }
}
