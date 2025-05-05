import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { eq } from "drizzle-orm"
import { pgTable, serial, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core"
// Import SQLite libraries as fallback
import { createClient } from '@libsql/client'
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql'
import * as schema from "../drizzle/schema"

// Configure Neon for better connection handling
neonConfig.fetchConnectionCache = true
// Define fetch options to be used when creating the SQL client
const fetchOptions = {
  keepalive: true,
  timeout: 30000, // 30 seconds timeout
}

// Database schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  avatar: text("avatar"),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

// Initialize database connection with retry logic
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Check if we should use SQLite or PostgreSQL
const USE_SQLITE = false // Override any environment variable setting to force PostgreSQL

async function createDbConnection(url: string, retries = MAX_RETRIES) {
  if (USE_SQLITE) {
    try {
      console.log("Using SQLite database for development")
      const client = createClient({
        url: 'file:./local.db',
      })
      return drizzleSqlite(client, { schema })
    } catch (error) {
      console.error("Failed to connect to SQLite database:", error)
      throw error
    }
  }
  
  try {
    const sqlClient = neon(url, { fetchOptions })
    return drizzle(sqlClient)
  } catch (error) {
    if (retries > 0) {
      console.warn(`Database connection failed. Retrying... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return createDbConnection(url, retries - 1)
    }
    console.error("Failed to connect to database after multiple attempts:", error)
    throw error
  }
}

// Use the connection functions
let db: any
let unpooledDb: any

try {
  if (USE_SQLITE) {
    const client = createClient({
      url: 'file:./local.db',
    })
    db = drizzleSqlite(client, { schema })
    unpooledDb = db // For SQLite, use the same connection
    console.log("Using SQLite database in local.db file")
  } else {
    // Initialize connections
    const sqlClient = neon(process.env.DATABASE_URL!, { fetchOptions })
    db = drizzle(sqlClient)

    // For operations that shouldn't use connection pooling
    const unpooledSqlClient = process.env.DATABASE_URL_UNPOOLED 
      ? neon(process.env.DATABASE_URL_UNPOOLED, { fetchOptions })
      : neon(process.env.DATABASE_URL!, { fetchOptions }) // Fallback to main URL
    unpooledDb = drizzle(unpooledSqlClient)
    console.log("USING POSTGRESQL DATABASE with connection:", process.env.DATABASE_URL?.substring(0, 40) + "...")
  }
} catch (error) {
  console.error("Error initializing database connections:", error)
  // Try SQLite as fallback if PostgreSQL fails
  try {
    const client = createClient({
      url: 'file:./local.db',
    })
    db = drizzleSqlite(client, { schema })
    unpooledDb = db
    console.log("Falling back to SQLite database after PostgreSQL connection failure")
  } catch (fallbackError) {
    console.error("Both PostgreSQL and SQLite connections failed:", fallbackError)
    // Create fallback minimal implementations to prevent crashes
    const dummyClient = {
      query: async () => { throw new Error("Database connection is not available") }
    }
    db = drizzle(dummyClient as any)
    unpooledDb = drizzle(dummyClient as any)
  }
}

export { db, unpooledDb }

// Import and initialize database tables
import { initializeDatabase } from "./db-init"

// We need to handle the initialization asynchronously but can't use top-level await
// So we'll use a promise and catch errors with better retry logic
const dbInitPromise = (async () => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await initializeDatabase()
      return true
    } catch (error) {
      if (i < MAX_RETRIES - 1) {
        console.warn(`Database initialization failed. Retrying... (${MAX_RETRIES - i - 1} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      } else {
        console.error("Failed to initialize database after multiple attempts:", error)
        return false
      }
    }
  }
  return false
})()

// User type
export type User = {
  id: number
  name: string
  email: string
  role: string
  avatar?: string
  emailVerified: boolean
}

// Helper functions
export async function getUserByEmail(email: string) {
  try {
    // Ensure database is initialized before querying
    await dbInitPromise
    const result = await db.select().from(users).where(eq(users.email, email))
    return result[0]
  } catch (error) {
    console.error("Error getting user by email:", error)
    return null
  }
}

export async function getUserById(id: number) {
  try {
    await dbInitPromise
    const result = await db.select().from(users).where(eq(users.id, id))
    return result[0]
  } catch (error) {
    console.error("Error getting user by ID:", error)
    return null
  }
}

export async function createUser(data: {
  name: string
  email: string
  passwordHash: string
  avatar?: string
}) {
  try {
    await dbInitPromise
    
    // Check if we're using SQLite
    if (USE_SQLITE) {
      // For SQLite, we need to explicitly set date fields
      const dataWithDates = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const result = await db.insert(users).values(dataWithDates).returning()
      return result[0]
    } else {
      // For PostgreSQL, the default values will handle dates
      const result = await db.insert(users).values(data).returning()
      return result[0]
    }
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  try {
    await dbInitPromise
    const result = await db
      .insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning()
    return result[0]
  } catch (error) {
    console.error("Error creating password reset token:", error)
    return null
  }
}

export async function getPasswordResetToken(token: string) {
  try {
    await dbInitPromise
    const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token))
    return result[0]
  } catch (error) {
    console.error("Error getting password reset token:", error)
    return null
  }
}

export async function deletePasswordResetToken(token: string) {
  try {
    await dbInitPromise
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token))
  } catch (error) {
    console.error("Error deleting password reset token:", error)
  }
}
