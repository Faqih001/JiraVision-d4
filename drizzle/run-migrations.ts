import { sql } from "drizzle-orm"
import { db } from "../lib/db"
import * as fs from "fs"
import * as path from "path"

// Idempotent top-level columns the older app revisions expected on `users`.
// The canonical source for these is lib/db-init.ts and the drizzle migrations;
// this script only exists to repair a database that predates them.
const USER_COLUMNS = [
  '"job_title" VARCHAR(255)',
  '"department" VARCHAR(255)',
  '"location" VARCHAR(255)',
  '"bio" TEXT',
  `"language" VARCHAR(10) DEFAULT 'en-US'`,
  `"timezone" VARCHAR(50) DEFAULT 'Africa/Nairobi'`,
  `"preferences" JSONB DEFAULT '{}'::JSONB`,
  `"status" VARCHAR(20) DEFAULT 'offline'`,
] as const

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function runMigration() {
  try {
    console.log("Starting database migration...")

    for (const column of USER_COLUMNS) {
      const name = column.split(" ")[0].replace(/"/g, "")
      try {
        await db.execute(sql.raw(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS ${column};`))
        console.log(`Added ${name} column`)
      } catch (error) {
        console.log(`${name} column might already exist:`, describe(error))
      }
    }

    console.log("Running chat tables migration...")
    try {
      const chatMigrationPath = path.join(
        __dirname,
        "migrations",
        "20240701000000_add_chat_tables.sql"
      )
      if (fs.existsSync(chatMigrationPath)) {
        const migrationSql = fs.readFileSync(chatMigrationPath, "utf8")
        await db.execute(sql.raw(migrationSql))
        console.log("Chat tables migration completed successfully")
      } else {
        console.log("Chat migration file doesn't exist, skipping")
      }
    } catch (error) {
      console.error("Error running chat migration:", describe(error))
    }

    console.log("Database migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Failed to run database migration:", error)
    process.exit(1)
  }
}

runMigration()
