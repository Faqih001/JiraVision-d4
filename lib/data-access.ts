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

// For local development and testing - set to false in production
const ENABLE_TEST_MODE = process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_MODE === 'true';

// User functions
export async function getUserProfile(userId: number) {
  try {
    // Validate userId
    if (!userId || typeof userId !== 'number') {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    
    const result = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar: users.avatar,
      jobTitle: users.jobTitle,
      department: users.department,
      location: users.location,
      bio: users.bio,
      language: users.language,
      timezone: users.timezone,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      preferences: users.preferences,
    }).from(users).where(eq(users.id, userId)).limit(1)
    
    // Log warning if user not found
    if (!result[0]) {
      console.warn(`No user found with ID ${userId}`);
    }
    
    return result[0] || null
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error getting user profile ${userId}: ${errorMessage}`, error)
    throw error; // Propagate error to caller for proper handling
  }
}

export async function updateUserProfile(userId: number, profileData: Partial<typeof users.$inferSelect>) {
  try {
    // Filter out sensitive fields that shouldn't be updated directly
    const { id, passwordHash, emailVerified, createdAt, role, email, ...safeUpdateData } = profileData
    
    // Log the data being saved for debugging
    console.log('Updating user profile with data:', safeUpdateData)
    
    // Wrap in try/catch to handle specific database errors
    try {
      await db.update(users)
        .set({
          ...safeUpdateData,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
    } catch (dbError) {
      console.error(`Database error updating profile for user ${userId}:`, dbError)
      const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error";
      throw new Error(`Database update failed: ${errorMessage}`);
    }
    
    // Get the updated profile to return
    try {
      const updatedProfile = await getUserProfile(userId)
      return updatedProfile !== null
    } catch (getError) {
      // If we can't get the updated profile, the update might still have succeeded
      console.warn(`Failed to get updated profile for user ${userId} after update:`, getError);
      return true; // Assume update succeeded since we didn't catch an error in the update
    }
  } catch (error) {
    console.error(`Error updating user profile ${userId}:`, error)
    throw error; // Propagate error to caller for proper handling
  }
}

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

export async function getTaskById(id: number) {
  try {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

    return result[0] || null
  } catch (error) {
    console.error(`Error getting task with ID ${id}:`, error)
    return null
  }
}

export async function createTask(taskData: Omit<typeof tasks.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    // Convert dueDate to string if it's a Date object for PostgreSQL compatibility
    const processedData = {
      ...taskData,
      dueDate: taskData.dueDate // PostgreSQL expects string format for date fields
    }
    
    // Add current timestamps
    const dataWithTimestamps = {
      ...processedData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const [newTask] = await db.insert(tasks).values(dataWithTimestamps).returning()
    return newTask
  } catch (error) {
    console.error('Error creating task:', error)
    throw error
  }
}

export async function updateTask(id: number, taskData: Partial<Omit<typeof tasks.$inferInsert, 'id' | 'createdAt'>>) {
  try {
    // Always update the updatedAt field
    const dataWithTimestamp = {
      ...taskData,
      updatedAt: new Date()
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(dataWithTimestamp)
      .where(eq(tasks.id, id))
      .returning()
    
    return updatedTask
  } catch (error) {
    console.error(`Error updating task with ID ${id}:`, error)
    throw error
  }
}

export async function deleteTask(id: number) {
  try {
    await db.delete(tasks).where(eq(tasks.id, id))
    return true
  } catch (error) {
    console.error(`Error deleting task with ID ${id}:`, error)
    throw error
  }
}

export async function getPaginatedTasks(
  page: number = 1, 
  pageSize: number = 10, 
  filters?: { 
    status?: string, 
    priority?: string, 
    assigneeId?: number, 
    sprintId?: number,
    search?: string
  }
) {
  try {
    const offset = (page - 1) * pageSize
    
    // Build where conditions based on filters
    const whereConditions = []
    
    if (filters) {
      if (filters.status) {
        whereConditions.push(eq(tasks.status, filters.status))
      }
      
      if (filters.priority) {
        whereConditions.push(eq(tasks.priority, filters.priority))
      }
      
      if (filters.assigneeId) {
        whereConditions.push(eq(tasks.assigneeId, filters.assigneeId))
      }
      
      if (filters.sprintId) {
        whereConditions.push(eq(tasks.sprintId, filters.sprintId))
      }
      
      if (filters.search) {
        const searchPattern = `%${filters.search}%`
        whereConditions.push(
          sql`(${tasks.title} ILIKE ${searchPattern} OR ${tasks.description} ILIKE ${searchPattern})`
        )
      }
    }
    
    // Build query with all conditions at once
    const query = db.select().from(tasks)
    if (whereConditions.length > 0) {
      query.where(and(...whereConditions))
    }
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(query.as('filtered_tasks'))
      
    const totalCount = Number(countResult[0]?.count || 0)
    
    // Get paginated results
    const results = await query
      .orderBy(desc(tasks.updatedAt))
      .limit(pageSize)
      .offset(offset)
      
    return {
      tasks: results,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        pageCount: Math.ceil(totalCount / pageSize)
      }
    }
  } catch (error) {
    console.error('Error getting paginated tasks:', error)
    return {
      tasks: [],
      pagination: {
        total: 0,
        page: page,
        pageSize: pageSize,
        pageCount: 0
      }
    }
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

    return result.map((row: any) => ({
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
