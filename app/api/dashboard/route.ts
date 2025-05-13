import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { tasks, sprints, users, wellbeingMetrics, ethicalMetrics, aiInsights, gamification } from "@/drizzle/schema"
import { eq, and, desc, gte, lte, sql } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get current date
    const today = new Date()
    
    // Get active sprint
    const todayStr = today.toISOString().split('T')[0] // Convert to YYYY-MM-DD format
    const activeSprintResult = await db
      .select()
      .from(sprints)
      .where(
        and(
          gte(sprints.endDate, todayStr),
          lte(sprints.startDate, todayStr)
        )
      )
      .orderBy(desc(sprints.startDate))
      .limit(1)

    const activeSprint = activeSprintResult[0] || null

    // Get user's tasks for active sprint
    let userTasks = []
    if (activeSprint) {
      userTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.assigneeId, session.id),
            eq(tasks.sprintId, activeSprint.id)
          )
        )
        .limit(5)
    }

    // Get team members
    const teamMembers = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      })
      .from(users)
      .limit(10)
    
    // Get wellbeing metrics
    const wellbeingResult = await db
      .select()
      .from(wellbeingMetrics)
      .where(eq(wellbeingMetrics.userId, session.id))
      .orderBy(desc(wellbeingMetrics.date))
      .limit(7)
    
    // Calculate team happiness (average)
    const teamHappinessResult = await db
      .select({
        averageScore: sql<number>`avg(${wellbeingMetrics.wellbeingScore})`,
      })
      .from(wellbeingMetrics)
    
    const teamHappiness = teamHappinessResult[0]?.averageScore || 75
    
    // Get ethical metrics
    const ethicalMetricsResult = await db
      .select()
      .from(ethicalMetrics)
      .orderBy(desc(ethicalMetrics.date))
      .limit(1)
    
    // Get AI insights
    const aiInsightsResult = await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.status, "active"))
      .orderBy(desc(aiInsights.createdAt))
      .limit(1)
    
    // Count tasks by status
    const taskStatusResult = await db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)`,
      })
      .from(tasks)
      .groupBy(tasks.status)

    // Get user's gamification data
    const userGamificationResult = await db
      .select()
      .from(gamification)
      .where(eq(gamification.userId, session.id))
      .limit(1)

    // Format wellbeing data
    const wellbeingData = {
      teamHappiness: Math.round(Number(teamHappiness)),
      teamMembers: teamMembers.map((member: { id: number, name: string, avatar: string | null }) => {
        const memberWellbeing = wellbeingResult.find((w: any) => w.userId === member.id)
        return {
          id: member.id,
          name: member.name,
          avatar: member.avatar || "",
          mood: memberWellbeing?.mood || "Neutral"
        }
      })
    }
    
    // Format ethical metrics
    const ethicalData = ethicalMetricsResult[0] ? {
      workloadBalance: ethicalMetricsResult[0].workloadBalanceScore,
      deiTaskDistribution: ethicalMetricsResult[0].deiTaskDistributionScore,
      payEquityCompliance: ethicalMetricsResult[0].payEquityScore,
    } : {
      workloadBalance: 85,
      deiTaskDistribution: 90,
      payEquityCompliance: 95,
    }

    // Format AI insights
    const aiInsightData = aiInsightsResult[0] ? {
      id: aiInsightsResult[0].id,
      type: aiInsightsResult[0].type,
      title: aiInsightsResult[0].title,
      description: aiInsightsResult[0].description,
      status: aiInsightsResult[0].status,
    } : null
    
    // Format user's gamification data
    const gamificationData = userGamificationResult[0] ? {
      skillTrees: userGamificationResult[0].skillTrees || {
        "Frontend Master": { level: 3, progress: 65, tasksToNextLevel: 7 },
        "Team Player": { level: 4, progress: 80, tasksToNextLevel: 3 },
        "Problem Solver": { level: 2, progress: 40, tasksToNextLevel: 12 },
      },
      nextReward: "Complete 5 more high-priority tasks to unlock a half-day PTO bonus!",
    } : {
      skillTrees: [
        {
          name: "Frontend Master",
          level: 3,
          progress: 65,
          tasksToNextLevel: 7,
        },
        {
          name: "Team Player",
          level: 4,
          progress: 80,
          tasksToNextLevel: 3,
        },
        {
          name: "Problem Solver",
          level: 2,
          progress: 40,
          tasksToNextLevel: 12,
        },
      ],
      nextReward: "Complete 5 more high-priority tasks to unlock a half-day PTO bonus!",
    }

    // Process gamification skillTrees if it's in JSON format
    if (userGamificationResult[0] && gamificationData.skillTrees) {
      if (typeof gamificationData.skillTrees === 'object' && !Array.isArray(gamificationData.skillTrees)) {
        gamificationData.skillTrees = Object.entries(gamificationData.skillTrees).map(([name, data]: [string, any]) => ({
          name,
          level: data.level,
          progress: data.progress,
          tasksToNextLevel: data.tasksToNextLevel,
        }))
      }
    }

    // Return the dashboard data
    return NextResponse.json({
      success: true,
      data: {
        activeSprint,
        tasks: userTasks,
        aiInsight: aiInsightData,
        wellbeing: wellbeingData,
        ethicalMetrics: ethicalData,
        gamification: gamificationData,
        taskStatusCounts: taskStatusResult,
      },
    })
  } catch (error) {
    console.error("Dashboard data fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch dashboard data",
      },
      { status: 500 }
    )
  }
}
