// Rolls back the ops_config_audit table. Run from the repo root:
//   node scripts/rollback-ops-config-audit-table.mjs
// This is destructive — it drops the table and all audit events.

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
  console.log("Dropping ops_config_audit table...")
  await sql`DROP TABLE IF EXISTS ops_config_audit CASCADE`
  console.log("✓ ops_config_audit table dropped")

  console.log("Rollback complete")
  await sql.end()
}

main().catch((err) => {
  console.error("Rollback failed:", err)
  process.exit(1)
})
