// Simple script to seed tasks directly with SQL
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

process.stdout.write('Starting task seeding script...\n');

// Connection configuration for local database
const client = new Client({
  user: 'jiravision_dev',
  host: 'localhost',
  database: 'jiravisiondb_local',
  password: 'jiravision_pass',
  port: 5432,
});

async function seedTasks() {
  process.stdout.write('Connecting to database...\n');
  
  try {
    await client.connect();
    process.stdout.write('Connected to database successfully.\n');
    
    // Check for users
    const { rows: users } = await client.query('SELECT id, name FROM users');
    process.stdout.write(`Found ${users.length} users.\n`);
    
    if (users.length === 0) {
      process.stdout.write('No users found. Please create users first.\n');
      process.exit(1);
    }
    
    // Sample task data
    const tasks = [
      {
        title: "Create user authentication flow",
        description: "Implement login, registration, and password reset functionality",
        status: "completed",
        priority: "high",
        assigneeId: users[0].id
      },
      {
        title: "Design dashboard UI components",
        description: "Create reusable UI components for the main dashboard",
        status: "in_progress",
        priority: "medium",
        assigneeId: users[0].id
      },
      {
        title: "Implement chat functionality",
        description: "Set up websockets for real-time messaging",
        status: "todo",
        priority: "high",
        assigneeId: users.length > 1 ? users[1].id : users[0].id
      }
    ];
    
    process.stdout.write(`Inserting ${tasks.length} tasks...\n`);
    
    // Insert each task
    for (const task of tasks) {
      await client.query(
        `INSERT INTO tasks (title, description, status, priority, assignee_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [task.title, task.description, task.status, task.priority, task.assigneeId]
      );
      process.stdout.write(`Added task: ${task.title}\n`);
    }
    
    process.stdout.write('All tasks added successfully!\n');
  } catch (err) {
    process.stdout.write(`ERROR: ${err.message}\n`);
    process.stderr.write(`${err.stack}\n`);
  } finally {
    await client.end();
    process.stdout.write('Database connection closed.\n');
  }
}

seedTasks();
