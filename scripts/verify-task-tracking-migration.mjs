// Verifies task tracking migration was applied correctly.
// Usage: node scripts/verify-task-tracking-migration.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]
const sql = postgres(databaseUrl, { max: 1 })

try {
  console.log("Verifying task tracking migration...")

  // Check tasks table columns
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name IN ('cadence', 'parent_task_id', 'is_template', 'checklist_items')
  `
  console.log(`✓ tasks table has ${cols.length}/4 new columns`)
  if (cols.length !== 4) process.exit(1)

  // Check task_instances table
  const instances = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_instances'
  `
  console.log(`✓ task_instances table ${instances.length === 1 ? "exists" : "MISSING"}`)
  if (instances.length !== 1) process.exit(1)

  // Check task_report_templates table
  const templates = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_report_templates'
  `
  console.log(`✓ task_report_templates table ${templates.length === 1 ? "exists" : "MISSING"}`)
  if (templates.length !== 1) process.exit(1)

  // Check task_reports table
  const reports = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_reports'
  `
  console.log(`✓ task_reports table ${reports.length === 1 ? "exists" : "MISSING"}`)
  if (reports.length !== 1) process.exit(1)

  // Check indexes
  const indexes = await sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename IN ('tasks', 'task_instances', 'task_report_templates', 'task_reports')
    AND indexname LIKE 'idx_%'
  `
  console.log(`✓ ${indexes.length} custom indexes created`)

  console.log("\n✅ Migration verified successfully")
} catch (err) {
  console.error("❌ Verification failed:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
