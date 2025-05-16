import { db } from "./db"
import { sql } from "drizzle-orm"
import { seedDatabase } from "./seed-data"
import { seedTeamMembers } from "@/drizzle/seed-team"

// A helper function to execute SQL with timeout
async function executeSqlWithTimeout(sqlStatement: ReturnType<typeof sql>, timeoutMs = 30000) {
  return Promise.race([
    db.execute(sqlStatement),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

export async function initializeDatabase() {
  try {
    console.log("Initializing database tables...")
    
    // PostgreSQL initialization
    // Execute each CREATE TABLE statement separately with timeout protection
    await executeSqlWithTimeout(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        avatar TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        job_title VARCHAR(255),
        department VARCHAR(255),
        location VARCHAR(255),
        bio TEXT,
        language VARCHAR(10) DEFAULT 'en-US',
        timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
        preferences JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await executeSqlWithTimeout(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await executeSqlWithTimeout(sql`
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

    await executeSqlWithTimeout(sql`
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

    await executeSqlWithTimeout(sql`
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

    await executeSqlWithTimeout(sql`
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

    await executeSqlWithTimeout(sql`
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

    await executeSqlWithTimeout(sql`
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

    await executeSqlWithTimeout(sql`
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
    
    // Kanban tables
    await executeSqlWithTimeout(sql`
      CREATE TABLE IF NOT EXISTS kanban_columns (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'bg-slate-400',
        "order" INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await executeSqlWithTimeout(sql`
      CREATE TABLE IF NOT EXISTS kanban_tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'backlog',
        column_id INTEGER REFERENCES kanban_columns(id) NOT NULL,
        assignee_id INTEGER REFERENCES users(id),
        sprint_id INTEGER REFERENCES sprints(id),
        due_date DATE,
        "order" INTEGER NOT NULL,
        tags TEXT[],
        attachments INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        subtasks JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await executeSqlWithTimeout(sql`
      CREATE TABLE IF NOT EXISTS kanban_task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES kanban_tasks(id) NOT NULL,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    await executeSqlWithTimeout(sql`
      CREATE TABLE IF NOT EXISTS kanban_task_attachments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES kanban_tasks(id) NOT NULL,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        filename TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log("Database tables initialized successfully")

    try {
      // Seed the database with initial data but don't fail initialization if seeding fails
      await seedDatabase()
    } catch (seedError) {
      console.warn("Warning: Database seeding failed but tables were created:", seedError)
    }

    // Add columns to existing users table if it already exists
    try {
      await executeSqlWithTimeout(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS department VARCHAR(255),
        ADD COLUMN IF NOT EXISTS location VARCHAR(255),
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US',
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
        ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'
      `)
      console.log("Updated users table with new columns if needed")
    } catch (alterError) {
      console.error("Error adding columns to users table:", alterError)
    }

    // Seed team members
    await seedTeamMembers()

    console.log("Database initialization completed successfully!")
    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    
    // Handle specific error types that might indicate network issues
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || 
          error.message.includes('timed out') || 
          error.message.includes('fetch failed')) {
        console.error('Database connection timed out. Please check your network connection and database URL')
        
        // Additional debugging information
        console.error('You may need to check:')
        console.error('1. Your Neon PostgreSQL database instance is running (not suspended)')
        console.error('2. Your DATABASE_URL environment variable is correct')
        console.error('3. Your network allows connections to the database')
      }
    }
    
    throw error // Rethrow to ensure the error is properly handled
  }
}
