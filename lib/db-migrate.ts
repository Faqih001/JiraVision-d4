import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { migrate } from "drizzle-orm/neon-http/migrator"
import 'dotenv/config'

// This script can be run with: npx tsx lib/db-migrate.ts
async function main() {
  console.log("Loading environment variables...")
  console.log("Database URL:", process.env.DATABASE_URL ? "Found" : "Not found")
  
  // Add connection configuration
  neonConfig.fetchConnectionCache = true
  
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql)

    console.log("Running migrations...")

    await migrate(db, { migrationsFolder: "drizzle" })

    console.log("Migrations completed successfully!")
  } catch (error) {
    console.error("Detailed migration error:", error)
    throw error
  }

  process.exit(0)
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
