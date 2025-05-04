import { db } from "./db"
import { eq, and, desc, sql } from "drizzle-orm"
import {
  users,
  sprints,
  tasks,
  wellbeingMetrics,
  gamification,
  ethicalMetrics,
  sprintAnalytics,
  aiInsights,
} from "../drizzle/schema"

// Sprint functions
export async function getActiveSprint() {
  try {
    const result = await db.select().from(sprints).where(eq(sprints.status, "active")).limit(1)

    return result[0] || null
  } catch (error) {
    console.error("Error getting active sprint:", error)
    return null
  }
}

export async function getSprintById(id: number) {
  try {
    const result = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1)

    return result[0] || null
  } catch (error) {
    console.error(`Error getting sprint ${id}:`, error)
    return null
  }
}

export async function getSprintHistory(limit = 3) {
  try {
    const result = await db
      .select()
      .from(sprints)
      .where(eq(sprints.status, "completed"))
      .orderBy(desc(sprints.endDate))
      .limit(limit)

    return result
  } catch (error) {
    console.error("Error getting sprint history:", error)
    return []
  }
}

// Task functions
export async function getTasksBySprintId(sprintId: number) {
  try {
    const result = await db.select().from(tasks).where(eq(tasks.sprintId, sprintId))

    return result
  } catch (error) {
    console.error(`Error getting tasks for sprint ${sprintId}:`, error)
    return []
  }
}

export async function getTasksByAssignee(userId: number) {
  try {
    const result = await db.select().from(tasks).where(eq(tasks.assigneeId, userId))

    return result
  } catch (error) {
    console.error(`Error getting tasks for user ${userId}:`, error)
    return []
  }
}

export async function getTasksByStatus(status: string) {
  try {
    const result = await db.select().from(tasks).where(eq(tasks.status, status))

    return result
  } catch (error) {
    console.error(`Error getting tasks with status ${status}:`, error)
    return []
  }
}

// Wellbeing metrics functions
export async function getTeamWellbeing() {
  try {
    const today = new Date()
    const result = await db
      .select()
      .from(wellbeingMetrics)
      .where(eq(wellbeingMetrics.date, today.toISOString().split("T")[0]))

    return result
  } catch (error) {
    console.error("Error getting team wellbeing:", error)
    return []
  }
}

export async function getUserWellbeing(userId: number) {
  try {
    const result = await db
      .select()
      .from(wellbeingMetrics)
      .where(eq(wellbeingMetrics.userId, userId))
      .orderBy(desc(wellbeingMetrics.date))
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error(`Error getting wellbeing for user ${userId}:`, error)
    return null
  }
}

// Gamification functions
export async function getUserGamification(userId: number) {
  try {
    const result = await db.select().from(gamification).where(eq(gamification.userId, userId)).limit(1)

    return result[0] || null
  } catch (error) {
    console.error(`Error getting gamification for user ${userId}:`, error)
    return null
  }
}

export async function getTeamLeaderboard(limit = 4) {
  try {
    const result = await db
      .select()
      .from(gamification)
      .innerJoin(users, eq(gamification.userId, users.id))
      .orderBy(desc(gamification.xp))
      .limit(limit)

    return result.map((row) => ({
      id: row.users.id,
      name: row.users.name,
      avatar: row.users.avatar,
      role: row.users.role,
      level: row.gamification.level,
      xp: row.gamification.xp,
    }))
  } catch (error) {
    console.error("Error getting team leaderboard:", error)
    return []
  }
}

// Ethical metrics functions
export async function getLatestEthicalMetrics() {
  try {
    const result = await db.select().from(ethicalMetrics).orderBy(desc(ethicalMetrics.date)).limit(1)

    return result[0] || null
  } catch (error) {
    console.error("Error getting latest ethical metrics:", error)
    return null
  }
}

// AI Insights functions
export async function getActiveAIInsights() {
  try {
    const now = new Date()
    const result = await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.status, "active"),
          sql`${aiInsights.expiresAt} IS NULL OR ${aiInsights.expiresAt} > ${now.toISOString()}`,
        ),
      )

    return result
  } catch (error) {
    console.error("Error getting active AI insights:", error)
    return []
  }
}

// Sprint Analytics functions
export async function getSprintAnalytics(sprintId: number) {
  try {
    const result = await db.select().from(sprintAnalytics).where(eq(sprintAnalytics.sprintId, sprintId)).limit(1)

    return result[0] || null
  } catch (error) {
    console.error(`Error getting analytics for sprint ${sprintId}:`, error)
    return null
  }
}

// Team functions
export async function getTeamMembers() {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
      })
      .from(users)

    return result
  } catch (error) {
    console.error("Error getting team members:", error)
    return []
  }
}
