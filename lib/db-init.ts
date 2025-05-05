import { db } from "./db"
import { sql } from "drizzle-orm"
import { seedDatabase } from "./seed-data"
import { drizzle } from "drizzle-orm/libsql"

// Check if we're using SQLite
const USE_SQLITE = process.env.USE_SQLITE === 'true'

// A helper function to execute SQL with timeout
async function executeSqlWithTimeout(sqlStatement: ReturnType<typeof sql>, timeoutMs = 15000) {
  if (USE_SQLITE) {
    // For SQLite, use run() instead of execute()
    return db.run(sqlStatement)
  }
  
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
    
    if (USE_SQLITE) {
      console.log("Using SQLite for database tables")
      
      // For SQLite, create tables manually with SQLite syntax
      // Users table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          avatar TEXT,
          email_verified INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Password reset tokens table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id),
          token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Sprints table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS sprints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          status TEXT NOT NULL DEFAULT 'planning',
          capacity INTEGER NOT NULL DEFAULT 0,
          completed INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Tasks table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'todo',
          priority TEXT NOT NULL DEFAULT 'medium',
          story_points INTEGER NOT NULL DEFAULT 0,
          assignee_id INTEGER REFERENCES users(id),
          sprint_id INTEGER REFERENCES sprints(id),
          due_date DATE,
          tags TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Wellbeing metrics table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS wellbeing_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          date DATE NOT NULL,
          wellbeing_score INTEGER NOT NULL,
          mood TEXT NOT NULL,
          workload TEXT NOT NULL,
          stress_level INTEGER NOT NULL,
          overtime_hours REAL NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Gamification table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS gamification (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          level INTEGER NOT NULL DEFAULT 1,
          xp INTEGER NOT NULL DEFAULT 0,
          tasks_completed INTEGER NOT NULL DEFAULT 0,
          achievements TEXT DEFAULT '[]',
          skill_trees TEXT DEFAULT '{}',
          rewards TEXT DEFAULT '[]',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Ethical metrics table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS ethical_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          pay_equity_score INTEGER NOT NULL,
          workload_balance_score INTEGER NOT NULL,
          dei_task_distribution_score INTEGER NOT NULL,
          overtime_compliance INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Sprint analytics table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS sprint_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sprint_id INTEGER REFERENCES sprints(id) NOT NULL,
          velocity INTEGER NOT NULL DEFAULT 0,
          completion_rate INTEGER NOT NULL DEFAULT 0,
          quality_score INTEGER NOT NULL DEFAULT 0,
          team_sentiment TEXT DEFAULT 'neutral',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // AI insights table
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS ai_insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP
        )
      `)

      console.log("Database tables initialized successfully")
      
      try {
        // Seed the database with initial data
        await seedDatabase()
      } catch (seedError) {
        console.warn("Warning: Database seeding failed but tables were created:", seedError)
      }
      
      return true
    }
    
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

    console.log("Database tables initialized successfully")

    try {
      // Seed the database with initial data but don't fail initialization if seeding fails
      await seedDatabase()
    } catch (seedError) {
      console.warn("Warning: Database seeding failed but tables were created:", seedError)
    }

    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    
    // Handle specific error types that might indicate network issues
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || 
          error.message.includes('timed out') || 
          error.message.includes('fetch failed')) {
        console.error('Database connection timed out. Please check your network connection and database URL')
      }
    }
    
    throw error // Rethrow to ensure the error is properly handled
  }
}
