import { sql } from "drizzle-orm"
import { db } from "../lib/db"

async function runMigration() {
  try {
    console.log("Starting database migration...")
    
    // Execute the user preferences migration
    console.log("Adding user preferences columns...")
    
    // Add job_title column
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "job_title" VARCHAR(255);`)
      console.log("Added job_title column")
    } catch (error) {
      console.log("job_title column might already exist:", error.message)
    }
    
    // Add department column
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255);`)
      console.log("Added department column")
    } catch (error) {
      console.log("department column might already exist:", error.message)
    }
    
    // Add location column
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" VARCHAR(255);`)
      console.log("Added location column")
    } catch (error) {
      console.log("location column might already exist:", error.message)
    }
    
    // Add bio column
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;`)
      console.log("Added bio column")
    } catch (error) {
      console.log("bio column might already exist:", error.message)
    }
    
    // Add language column
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" VARCHAR(10) DEFAULT 'en-US';`)
      console.log("Added language column")
    } catch (error) {
      console.log("language column might already exist:", error.message)
    }
    
    // Add timezone column
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(50) DEFAULT 'Africa/Nairobi';`)
      console.log("Added timezone column")
    } catch (error) {
      console.log("timezone column might already exist:", error.message)
    }
    
    // Add preferences column
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" JSONB DEFAULT '{}'::JSONB;`)
      console.log("Added preferences column")
    } catch (error) {
      console.log("preferences column might already exist:", error.message)
    }
    
    console.log("Database migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Failed to run database migration:", error)
    process.exit(1)
  }
}

runMigration()
