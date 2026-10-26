// Reverses create-worklog-tables.mjs by removing ONLY the ten tables phase 1 added. The
// three additive `tasks` columns are left alone: they are nullable, unused by any earlier
// query, and removing them would rewrite a live table for no benefit.
//
// Destructive. Refuses to run without WORKLOG_ROLLBACK=yes in the environment, and this
// implementation plan never runs it. It exists so "reversible" in design §13 is true.
//   WORKLOG_ROLLBACK=yes npm run db:worklog:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.WORKLOG_ROLLBACK !== "yes") {
  console.error("Refusing to run. Set WORKLOG_ROLLBACK=yes to confirm you want these tables gone.")
  process.exit(1)
}

const TABLES = [
  "assistant_messages",
  "assistant_threads",
  "work_report_recipients",
  "work_reports",
  "work_log_entries",
  "task_events",
  "deliverables",
  "plan_items",
  "agent_plans",
  "ai_usage_daily",
]

// The list must be exactly phase 1's tables, no others: anything else in this database is
// somebody's working data.
const PHASE1 =
  /^(task_events|work_log_entries|deliverables|work_reports|work_report_recipients|agent_plans|plan_items|assistant_threads|assistant_messages|ai_usage_daily)$/
const strays = TABLES.filter((t) => !PHASE1.test(t))
if (strays.length) {
  console.error("Refusing: unexpected table in the rollback list:", strays.join(", "))
  process.exit(1)
}
if (TABLES.length !== 10) {
  console.error(`Refusing: expected 10 tables in the rollback list, found ${TABLES.length}`)
  process.exit(1)
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(match[1], { max: 1 })
try {
  // Reverse dependency order, CASCADE so a dependent index or view goes with the table.
  for (const table of TABLES) {
    console.log(`removing table ${table}`)
    await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`)
  }
  const left = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `
  const remaining = left.map((t) => t.table_name).filter((t) => TABLES.includes(t))
  console.log("remaining:", remaining.join(", ") || "none")
  if (remaining.length) process.exit(1)
} catch (error) {
  console.error("Rollback failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
