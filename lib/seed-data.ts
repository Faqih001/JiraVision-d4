import { db } from "./db"
import {
  users,
  sprints,
  tasks,
  wellbeingMetrics,
  gamification,
  ethicalMetrics,
  sprintAnalytics,
  aiInsights,
  kanbanColumns,
  kanbanTasks
} from "../drizzle/schema"
import { sql } from "drizzle-orm"
import bcrypt from "bcryptjs"

// Check if we're using SQLite
const USE_SQLITE = false // Override any environment variable setting to force PostgreSQL

export async function seedDatabase() {
  try {
    console.log("Checking if database needs seeding...")

    // Check if users table is empty
    const existingUsers = await db.select({ count: sql`count(*)` }).from(users)

    if (Number(existingUsers[0].count) > 0) {
      console.log("Database already has data, skipping seed")
      return
    }

    console.log("Seeding database with initial data...")

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10)
    
    // For SQLite, we need to handle the insertion differently
    let adminUser;
    if (USE_SQLITE) {
      const result = await db
        .insert(users)
        .values({
          name: "Admin User",
          email: "admin@jiravision.com",
          passwordHash: hashedPassword,
          role: "admin",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      
      // For SQLite, fetch the user after insertion
      const users_result = await db.select().from(users).where(sql`email = 'admin@jiravision.com'`);
      adminUser = users_result[0];
    } else {
      [adminUser] = await db
        .insert(users)
        .values({
          name: "Admin User",
          email: "admin@jiravision.com",
          passwordHash: hashedPassword,
          role: "admin",
          emailVerified: true,
        })
        .returning();
    }

    // Create demo users
    let demoUsers;
    if (USE_SQLITE) {
      // For SQLite, insert one by one and collect results
      demoUsers = [];
      
      const demoUserData = [
        {
          name: "John Developer",
          email: "john@example.com",
          passwordHash: await bcrypt.hash("password123", 10),
          role: "user",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Sarah Designer",
          email: "sarah@example.com",
          passwordHash: await bcrypt.hash("password123", 10),
          role: "user",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Mike Manager",
          email: "mike@example.com",
          passwordHash: await bcrypt.hash("password123", 10),
          role: "manager",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      for (const userData of demoUserData) {
        await db.insert(users).values(userData);
        const result = await db.select().from(users).where(sql`email = ${userData.email}`);
        demoUsers.push(result[0]);
      }
    } else {
      demoUsers = await db
        .insert(users)
        .values([
          {
            name: "John Developer",
            email: "john@example.com",
            passwordHash: await bcrypt.hash("password123", 10),
            role: "user",
            emailVerified: true,
          },
          {
            name: "Sarah Designer",
            email: "sarah@example.com",
            passwordHash: await bcrypt.hash("password123", 10),
            role: "user",
            emailVerified: true,
          },
          {
            name: "Mike Manager",
            email: "mike@example.com",
            passwordHash: await bcrypt.hash("password123", 10),
            role: "manager",
            emailVerified: true,
          },
        ])
        .returning();
    }

    // Create sprints
    const currentDate = new Date()
    const twoWeeksFromNow = new Date(currentDate)
    twoWeeksFromNow.setDate(currentDate.getDate() + 14)

    const pastSprintEnd = new Date(currentDate)
    pastSprintEnd.setDate(currentDate.getDate() - 1)

    const pastSprintStart = new Date(pastSprintEnd)
    pastSprintStart.setDate(pastSprintEnd.getDate() - 14)

    let demoSprints;
    if (USE_SQLITE) {
      demoSprints = [];
      
      const sprintData = [
        {
          name: "Sprint 1",
          description: "First sprint of the project",
          startDate: pastSprintStart,
          endDate: pastSprintEnd,
          status: "completed",
          capacity: 40,
          completed: 35,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Sprint 2",
          description: "Current active sprint",
          startDate: currentDate,
          endDate: twoWeeksFromNow,
          status: "active",
          capacity: 45,
          completed: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      for (const sprint of sprintData) {
        await db.insert(sprints).values(sprint);
        const result = await db.select().from(sprints).where(sql`name = ${sprint.name}`);
        demoSprints.push(result[0]);
      }
    } else {
      demoSprints = await db
        .insert(sprints)
        .values([
          {
            name: "Sprint 1",
            description: "First sprint of the project",
            startDate: pastSprintStart,
            endDate: pastSprintEnd,
            status: "completed",
            capacity: 40,
            completed: 35,
          },
          {
            name: "Sprint 2",
            description: "Current active sprint",
            startDate: currentDate,
            endDate: twoWeeksFromNow,
            status: "active",
            capacity: 45,
            completed: 10,
          },
        ])
        .returning();
    }

    // Create tasks
    const tasksData = [
      {
        title: "Implement user authentication",
        description: "Set up user authentication system with login and registration",
        status: "completed",
        priority: "high",
        storyPoints: 8,
        assigneeId: demoUsers[0].id,
        sprintId: demoSprints[0].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Design dashboard UI",
        description: "Create wireframes and mockups for the main dashboard",
        status: "completed",
        priority: "medium",
        storyPoints: 5,
        assigneeId: demoUsers[1].id,
        sprintId: demoSprints[0].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Implement dashboard frontend",
        description: "Develop the frontend components for the dashboard",
        status: "in_progress",
        priority: "high",
        storyPoints: 13,
        assigneeId: demoUsers[0].id,
        sprintId: demoSprints[1].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Create API endpoints",
        description: "Develop backend API endpoints for the dashboard data",
        status: "todo",
        priority: "medium",
        storyPoints: 8,
        assigneeId: demoUsers[0].id,
        sprintId: demoSprints[1].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Design system documentation",
        description: "Create comprehensive documentation for the design system",
        status: "todo",
        priority: "low",
        storyPoints: 3,
        assigneeId: demoUsers[1].id,
        sprintId: demoSprints[1].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await db.insert(tasks).values(tasksData);

    // Create wellbeing metrics
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    for (const user of demoUsers) {
      await db.insert(wellbeingMetrics).values([
        {
          userId: user.id,
          date: yesterday,
          wellbeingScore: Math.floor(Math.random() * 30) + 70, // 70-100
          mood: ["energized", "focused", "balanced"][Math.floor(Math.random() * 3)],
          workload: ["low", "balanced", "high"][Math.floor(Math.random() * 3)],
          stressLevel: Math.floor(Math.random() * 30) + 20, // 20-50
          overtimeHours: Math.random() * 2, // 0-2 hours
          createdAt: new Date(),
        },
        {
          userId: user.id,
          date: today,
          wellbeingScore: Math.floor(Math.random() * 30) + 70, // 70-100
          mood: ["energized", "focused", "balanced"][Math.floor(Math.random() * 3)],
          workload: ["low", "balanced", "high"][Math.floor(Math.random() * 3)],
          stressLevel: Math.floor(Math.random() * 30) + 20, // 20-50
          overtimeHours: Math.random() * 2, // 0-2 hours
          createdAt: new Date(),
        },
      ])

      // Create gamification data
      await db.insert(gamification).values({
        userId: user.id,
        level: Math.floor(Math.random() * 5) + 1, // Level 1-5
        xp: Math.floor(Math.random() * 1000),
        tasksCompleted: Math.floor(Math.random() * 20),
        achievements: JSON.stringify([
          {
            id: 1,
            name: "First Task Completed",
            description: "Completed your first task",
            unlockedAt: new Date().toISOString(),
          },
          {
            id: 2,
            name: "Sprint Champion",
            description: "Completed all assigned tasks in a sprint",
            unlockedAt: new Date().toISOString(),
          },
        ]),
        skillTrees: JSON.stringify({
          technical: { level: 3, points: 120 },
          communication: { level: 2, points: 80 },
          leadership: { level: 1, points: 40 },
        }),
        rewards: JSON.stringify([
          { id: 1, name: "Coffee Voucher", description: "Free coffee voucher", redeemedAt: null },
          { id: 2, name: "Extra Break", description: "30 minute extra break", redeemedAt: new Date().toISOString() },
        ]),
        updatedAt: new Date(),
      })
    }

    // Create ethical metrics
    await db.insert(ethicalMetrics).values([
      {
        date: yesterday,
        payEquityScore: 85,
        workloadBalanceScore: 78,
        deiTaskDistributionScore: 82,
        overtimeCompliance: 95,
        createdAt: new Date(),
      },
      {
        date: today,
        payEquityScore: 87,
        workloadBalanceScore: 80,
        deiTaskDistributionScore: 84,
        overtimeCompliance: 96,
        createdAt: new Date(),
      },
    ])

    // Create sprint analytics
    for (const sprint of demoSprints) {
      await db.insert(sprintAnalytics).values({
        sprintId: sprint.id,
        velocity: sprint.status === "completed" ? 35 : 10,
        completionRate: sprint.status === "completed" ? 88 : 22,
        qualityScore: sprint.status === "completed" ? 92 : 85,
        teamSentiment: sprint.status === "completed" ? "positive" : "neutral",
        createdAt: new Date(),
      })
    }

    // Create AI insights
    await db.insert(aiInsights).values([
      {
        type: "sprint_planning",
        title: "Consider reducing sprint capacity",
        description:
          "Based on the last 3 sprints, the team consistently completes 10% less than the planned capacity. Consider reducing the next sprint capacity by 10% for more realistic planning.",
        status: "active",
        createdAt: new Date(),
      },
      {
        type: "risk_alert",
        title: "Potential bottleneck detected",
        description:
          "John has 5 high-priority tasks assigned for the current sprint, which is 50% more than other team members. This might create a bottleneck.",
        status: "active",
        createdAt: new Date(),
      },
      {
        type: "team_insight",
        title: "Improved team velocity",
        description:
          "The team's velocity has increased by 15% over the last 3 sprints. Great job on the continuous improvement!",
        status: "active",
        createdAt: new Date(),
      },
    ])

    // Add Kanban Columns
    const initialColumns = [
      { title: "Backlog", color: "bg-slate-400", order: 10 },
      { title: "To Do", color: "bg-blue-500", order: 20 },
      { title: "In Progress", color: "bg-amber-500", order: 30 },
      { title: "Review", color: "bg-purple-500", order: 40 },
      { title: "Done", color: "bg-green-500", order: 50 }
    ]
    
    let kanbanColumnsData;
    if (USE_SQLITE) {
      kanbanColumnsData = [];
      
      for (const column of initialColumns) {
        await db.insert(kanbanColumns).values({
          ...column,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        const result = await db.select().from(kanbanColumns).where(sql`title = ${column.title}`);
        kanbanColumnsData.push(result[0]);
      }
    } else {
      kanbanColumnsData = await db
        .insert(kanbanColumns)
        .values(initialColumns.map(column => ({
          ...column,
          createdAt: new Date(),
          updatedAt: new Date()
        })))
        .returning();
    }
    
    // Add Kanban Tasks
    const kanbanTasksData = [
      {
        title: "Research competitor pricing",
        description: "Analyze pricing structures of main competitors",
        priority: "medium",
        status: "backlog",
        columnId: kanbanColumnsData[0].id,
        assigneeId: demoUsers[0].id,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        order: 10,
        tags: ["Research", "Marketing"],
        attachments: 2,
        comments: 3,
        subtasks: { total: 4, completed: 1 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Update API documentation",
        description: "Create comprehensive documentation for all API endpoints",
        priority: "low",
        status: "backlog",
        columnId: kanbanColumnsData[0].id,
        order: 20,
        tags: ["Documentation", "API"],
        attachments: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Create onboarding flow wireframes",
        description: "Design the user onboarding experience",
        priority: "high",
        status: "todo",
        columnId: kanbanColumnsData[1].id,
        assigneeId: demoUsers[1].id,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        order: 10,
        tags: ["Design", "UI/UX"],
        attachments: 5,
        comments: 8,
        subtasks: { total: 3, completed: 0 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Implement authentication service",
        description: "Build secure authentication service with JWT tokens",
        priority: "high",
        status: "todo",
        columnId: kanbanColumnsData[1].id,
        order: 20,
        tags: ["Backend", "Security"],
        comments: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Implement dashboard charts",
        description: "Create interactive charts for the main dashboard",
        priority: "medium",
        status: "in_progress",
        columnId: kanbanColumnsData[2].id,
        assigneeId: demoUsers[0].id,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
        order: 10,
        tags: ["Frontend", "Data Visualization"],
        attachments: 1,
        comments: 4,
        subtasks: { total: 5, completed: 2 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Review landing page design",
        description: "Review and provide feedback on the new landing page design",
        priority: "medium",
        status: "review",
        columnId: kanbanColumnsData[3].id,
        assigneeId: demoUsers[2].id,
        order: 10,
        tags: ["Design", "Marketing"],
        comments: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Setup CI/CD pipeline",
        description: "Implement continuous integration and deployment",
        priority: "high",
        status: "done",
        columnId: kanbanColumnsData[4].id,
        assigneeId: demoUsers[0].id,
        order: 10,
        tags: ["DevOps", "Infrastructure"],
        attachments: 2,
        subtasks: { total: 3, completed: 3 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Create project documentation",
        description: "Write comprehensive documentation for the project",
        priority: "low",
        status: "done",
        columnId: kanbanColumnsData[4].id,
        order: 20,
        tags: ["Documentation"],
        comments: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    if (USE_SQLITE) {
      for (const task of kanbanTasksData) {
        await db.insert(kanbanTasks).values(task);
      }
    } else {
      await db
        .insert(kanbanTasks)
        .values(kanbanTasksData);
    }
    
    console.log("Database seeded successfully!")
    return true
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}
