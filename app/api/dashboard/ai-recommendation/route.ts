import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { aiInsights } from "@/drizzle/schema"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const data = await request.json()
    const { sprintId, taskIds, type, title, description } = data

    if (!sprintId) {
      return NextResponse.json({ error: "Sprint ID is required" }, { status: 400 })
    }

    // Generate AI recommendation
    // In a real implementation, this would use an AI model or service
    // When the client (AI Scrum Master workspace) sends a concrete,
    // data-derived recommendation we persist it verbatim; otherwise we
    // fall back to the original simulated suggestions.

    const recommendations = [
      "Based on your team's velocity and current capacity, I recommend reducing the sprint commitment by 15% this week. Three team members have PTO scheduled, and there's a company all-hands meeting.",
      "Your team has been consistently delivering 20% more story points than committed. Consider increasing sprint capacity by 10-15% to challenge the team.",
      "Task distribution is uneven. Consider redistributing 2-3 tasks from Alex to other team members to prevent burnout.",
      "Code quality metrics indicate increased technical debt. I recommend allocating 20% of the next sprint for refactoring and paying down technical debt.",
      "Team morale indicators suggest scheduling a retrospective focused on work-life balance would be beneficial this week."
    ]

    const clientDescription =
      typeof description === "string" && description.trim() ? description.trim() : null
    const clientTitle = typeof title === "string" && title.trim() ? title.trim() : null
    const clientType = typeof type === "string" && type.trim() ? type.trim() : null

    const insightDescription =
      clientDescription ?? recommendations[Math.floor(Math.random() * recommendations.length)]
    const insightTitle = clientTitle ?? "Sprint Planning Recommendation"
    const insightType = clientType ?? "sprint_planning"
    void taskIds

    // Store the recommendation in the database
    const [newInsight] = await db
      .insert(aiInsights)
      .values({
        type: insightType,
        title: insightTitle,
        description: insightDescription,
        status: "active",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
      })
      .returning()

    return NextResponse.json({
      success: true,
      recommendation: {
        id: newInsight.id,
        type: newInsight.type,
        title: newInsight.title,
        description: newInsight.description,
        status: newInsight.status,
        generatedAt: newInsight.createdAt ? newInsight.createdAt.toISOString() : new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("AI recommendation generation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate AI recommendation",
      },
      { status: 500 }
    )
  }
}
