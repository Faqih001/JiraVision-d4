// Script to seed task data into the database

import { db } from "../lib/db.js";
import { tasks } from "../drizzle/schema.js";

async function seedTasks() {
  try {
    console.log("Starting to seed tasks data...");

    // Get existing users to assign tasks to them
    const users = await db.query.users.findMany();
    
    if (!users || users.length === 0) {
      console.error("No users found. Please create users first.");
      return;
    }

    // Create sample tasks with different statuses and priorities
    const taskData = [
      {
        title: "Create user authentication flow",
        description: "Implement login, registration, and password reset functionality using NextAuth.js",
        status: "completed",
        priority: "high",
        storyPoints: 5,
        assigneeId: users[0].id,
        dueDate: new Date(2025, 4, 10), // May 10, 2025
        tags: JSON.stringify(["authentication", "security", "frontend"])
      },
      {
        title: "Design dashboard UI components",
        description: "Create reusable UI components for the main dashboard including charts, cards and navigation",
        status: "in_progress",
        priority: "medium",
        storyPoints: 3,
        assigneeId: users[0].id,
        dueDate: new Date(2025, 4, 18), // May 18, 2025
        tags: JSON.stringify(["design", "ui", "frontend"])
      },
      {
        title: "Implement chat functionality",
        description: "Set up websockets for real-time messaging and implement the chat interface",
        status: "todo",
        priority: "high",
        storyPoints: 8,
        assigneeId: users.length > 1 ? users[1].id : users[0].id,
        dueDate: new Date(2025, 4, 25), // May 25, 2025
        tags: JSON.stringify(["chat", "websocket", "real-time"])
      },
      {
        title: "Create API documentation",
        description: "Document all API endpoints with Swagger/OpenAPI specification",
        status: "todo",
        priority: "low",
        storyPoints: 2,
        assigneeId: users.length > 2 ? users[2].id : users[0].id,
        dueDate: new Date(2025, 5, 5), // June 5, 2025
        tags: JSON.stringify(["documentation", "api"])
      },
      {
        title: "Set up CI/CD pipeline",
        description: "Configure GitHub Actions for continuous integration and deployment",
        status: "backlog",
        priority: "medium",
        storyPoints: 3,
        assigneeId: users[0].id,
        dueDate: new Date(2025, 5, 10), // June 10, 2025
        tags: JSON.stringify(["devops", "automation"])
      },
      {
        title: "Implement task management API",
        description: "Create REST API endpoints for CRUD operations on tasks",
        status: "in_progress",
        priority: "high",
        storyPoints: 5,
        assigneeId: users.length > 1 ? users[1].id : users[0].id,
        dueDate: new Date(2025, 4, 20), // May 20, 2025
        tags: JSON.stringify(["backend", "api", "tasks"])
      },
      {
        title: "Add user profile management",
        description: "Allow users to update their profile information and preferences",
        status: "todo",
        priority: "medium",
        storyPoints: 3,
        assigneeId: users.length > 2 ? users[2].id : users[0].id,
        dueDate: new Date(2025, 5, 1), // June 1, 2025
        tags: JSON.stringify(["user", "profile", "frontend"])
      },
      {
        title: "Implement wellbeing dashboard",
        description: "Create visualizations for wellbeing metrics and insights",
        status: "backlog",
        priority: "medium",
        storyPoints: 5,
        assigneeId: users[0].id,
        dueDate: new Date(2025, 5, 15), // June 15, 2025
        tags: JSON.stringify(["wellbeing", "dashboard", "visualization"])
      }
    ];

    // Insert tasks into the database
    const result = await db.insert(tasks).values(taskData);
    
    console.log(`Successfully added ${taskData.length} tasks to the database.`);
    console.log("Task seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding tasks:", error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the seed function
seedTasks();
