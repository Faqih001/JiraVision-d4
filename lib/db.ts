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
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)

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
  const result = await db.select().from(users).where(eq(users.email, email))
  return result[0]
}

export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id))
  return result[0]
}

export async function createUser(data: {
  name: string
  email: string
  passwordHash: string
  avatar?: string
}) {
  const result = await db.insert(users).values(data).returning()
  return result[0]
}

export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const result = await db
    .insert(passwordResetTokens)
    .values({
      userId,
      token,
      expiresAt,
    })
    .returning()
  return result[0]
}

export async function getPasswordResetToken(token: string) {
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token))
  return result[0]
}

export async function deletePasswordResetToken(token: string) {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token))
}
