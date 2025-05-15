// Script to seed task data into the database
const postgres = require('postgres');
require('dotenv').config();

// Use the PostgreSQL connection string for local development
const connectionString = 'postgres://jiravision_dev:jiravision_pass@localhost:5432/jiravisiondb_local';

// Get database connection
const getDbClient = () => {
  return postgres(connectionString, { max: 1 });
};

async function seedTasks() {
  console.log('Starting task data seeding process...');
  
  const client = getDbClient();
  
  try {
    // First, check if we have users
    const users = await client`SELECT id, name FROM users`;
    
    if (users.length === 0) {
      console.error('No users found. Please create users first.');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users to assign tasks to.`);
    
    // Check if we already have tasks
    const existingTasks = await client`SELECT COUNT(*) as count FROM tasks`;
    
    if (existingTasks[0].count > 0) {
      console.log(`Found ${existingTasks[0].count} existing tasks. Continuing anyway.`);
    }
    
    // Create sample tasks with different statuses and priorities
    const taskData = [
      {
        title: "Create user authentication flow",
        description: "Implement login, registration, and password reset functionality using NextAuth.js",
        status: "completed",
        priority: "high",
        story_points: 5,
        assignee_id: users[0].id,
        due_date: new Date(2025, 4, 10), // May 10, 2025
        tags: JSON.stringify(["authentication", "security", "frontend"])
      },
      {
        title: "Design dashboard UI components",
        description: "Create reusable UI components for the main dashboard including charts, cards and navigation",
        status: "in_progress",
        priority: "medium",
        story_points: 3,
        assignee_id: users[0].id,
        due_date: new Date(2025, 4, 18), // May 18, 2025
        tags: JSON.stringify(["design", "ui", "frontend"])
      },
      {
        title: "Implement chat functionality",
        description: "Set up websockets for real-time messaging and implement the chat interface",
        status: "todo",
        priority: "high",
        story_points: 8,
        assignee_id: users.length > 1 ? users[1].id : users[0].id,
        due_date: new Date(2025, 4, 25), // May 25, 2025
        tags: JSON.stringify(["chat", "websocket", "real-time"])
      },
      {
        title: "Create API documentation",
        description: "Document all API endpoints with Swagger/OpenAPI specification",
        status: "todo",
        priority: "low",
        story_points: 2,
        assignee_id: users.length > 2 ? users[2].id : users[0].id,
        due_date: new Date(2025, 5, 5), // June 5, 2025
        tags: JSON.stringify(["documentation", "api"])
      },
      {
        title: "Set up CI/CD pipeline",
        description: "Configure GitHub Actions for continuous integration and deployment",
        status: "backlog",
        priority: "medium",
        story_points: 3,
        assignee_id: users[0].id,
        due_date: new Date(2025, 5, 10), // June 10, 2025
        tags: JSON.stringify(["devops", "automation"])
      },
      {
        title: "Implement task management API",
        description: "Create REST API endpoints for CRUD operations on tasks",
        status: "in_progress",
        priority: "high",
        story_points: 5,
        assignee_id: users.length > 1 ? users[1].id : users[0].id,
        due_date: new Date(2025, 4, 20), // May 20, 2025
        tags: JSON.stringify(["backend", "api", "tasks"])
      },
      {
        title: "Add user profile management",
        description: "Allow users to update their profile information and preferences",
        status: "todo",
        priority: "medium",
        story_points: 3,
        assignee_id: users.length > 2 ? users[2].id : users[0].id,
        due_date: new Date(2025, 5, 1), // June 1, 2025
        tags: JSON.stringify(["user", "profile", "frontend"])
      },
      {
        title: "Implement wellbeing dashboard",
        description: "Create visualizations for wellbeing metrics and insights",
        status: "backlog",
        priority: "medium",
        story_points: 5,
        assignee_id: users[0].id,
        due_date: new Date(2025, 5, 15), // June 15, 2025
        tags: JSON.stringify(["wellbeing", "dashboard", "visualization"])
      }
    ];

    // Insert tasks into the database using raw SQL
    console.log(`Inserting ${taskData.length} tasks into the database...`);
    
    let insertedCount = 0;
    for (const task of taskData) {
      await client`
        INSERT INTO tasks (
          title, description, status, priority, story_points, assignee_id, 
          due_date, tags, created_at, updated_at
        ) VALUES (
          ${task.title}, ${task.description}, ${task.status}, ${task.priority}, 
          ${task.story_points}, ${task.assignee_id}, ${task.due_date}, 
          ${task.tags}, now(), now()
        )
      `;
      insertedCount++;
    }
    
    console.log(`Successfully added ${insertedCount} tasks to the database.`);
    console.log("Task seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding tasks:", error);
  } finally {
    // Close the database connection
    await client.end();
    console.log("Database connection closed.");
  }
}

// Run the seed function with error handling
seedTasks().catch(error => {
  console.error("Unhandled error in seed script:", error);
  process.exit(1);
});
