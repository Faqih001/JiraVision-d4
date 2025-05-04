import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { eq } from "drizzle-orm"
import { pgTable, serial, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core"

neonConfig.fetchConnectionCache = true

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

// Initialize database connection
const sqlClient = neon(process.env.DATABASE_URL!)
export const db = drizzle(sqlClient)

// Import and initialize database tables
import { initializeDatabase } from "./db-init"

// We need to handle the initialization asynchronously but can't use top-level await
// So we'll use a promise and catch errors
const dbInitPromise = initializeDatabase().catch((error) => {
  console.error("Failed to initialize database:", error)
  return false
})

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
    const result = await db.insert(users).values(data).returning()
    return result[0]
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
