import { db } from "./db"
import { sql } from "drizzle-orm"
import { seedDatabase } from "./seed-data"

export async function initializeDatabase() {
  try {
    console.log("Initializing database tables...")

    // Execute each CREATE TABLE statement separately
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        avatar TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sprints (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'planning',
        capacity INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'todo',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        story_points INTEGER NOT NULL DEFAULT 0,
        assignee_id INTEGER REFERENCES users(id),
        sprint_id INTEGER REFERENCES sprints(id),
        due_date DATE,
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wellbeing_metrics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        date DATE NOT NULL,
        wellbeing_score INTEGER NOT NULL,
        mood VARCHAR(50) NOT NULL,
        workload VARCHAR(50) NOT NULL,
        stress_level INTEGER NOT NULL,
        overtime_hours DECIMAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gamification (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        xp INTEGER NOT NULL DEFAULT 0,
        tasks_completed INTEGER NOT NULL DEFAULT 0,
        achievements JSONB DEFAULT '[]',
        skill_trees JSONB DEFAULT '{}',
        rewards JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ethical_metrics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        pay_equity_score INTEGER NOT NULL,
        workload_balance_score INTEGER NOT NULL,
        dei_task_distribution_score INTEGER NOT NULL,
        overtime_compliance INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sprint_analytics (
        id SERIAL PRIMARY KEY,
        sprint_id INTEGER REFERENCES sprints(id) NOT NULL,
        velocity INTEGER NOT NULL DEFAULT 0,
        completion_rate INTEGER NOT NULL DEFAULT 0,
        quality_score INTEGER NOT NULL DEFAULT 0,
        team_sentiment VARCHAR(50) DEFAULT 'neutral',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `)

    console.log("Database tables initialized successfully")

    // Seed the database with initial data
    await seedDatabase()

    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    throw error // Rethrow to ensure the error is properly handled
  }
}
