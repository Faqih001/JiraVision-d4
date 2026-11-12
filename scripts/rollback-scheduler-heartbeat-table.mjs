// Rolls back scheduler_heartbeat. Run from the repo root:
//   node scripts/rollback-scheduler-heartbeat-table.mjs
// Destructive, but the only loss is the last-fired timestamp: per-item run history lives in
// report_runs, automation_runs and email_digest.status and is untouched.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")

const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(match[1])

async function main() {
  console.log("Dropping scheduler_heartbeat table...")
  await sql`DROP TABLE IF EXISTS scheduler_heartbeat CASCADE`
  console.log("✓ scheduler_heartbeat table dropped")

  console.log("Rollback complete")
  await sql.end()
}

main().catch((err) => {
  console.error("Rollback failed:", err)
  process.exit(1)
})