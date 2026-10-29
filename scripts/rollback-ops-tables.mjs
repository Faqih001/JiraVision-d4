// Rolls back the ops tables and columns created by create-ops-tables.mjs.
// Additive-only reversal: drops the new table and columns, but never touches data in
// existing tables. Run from the repo root:
//   npm run db:ops:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(match[1])

const ROLLBACK_SQL = `
-- Drop ops_log_entries table
DROP TABLE IF EXISTS ops_log_entries;

-- Remove ops_config from role_packs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_packs' AND column_name = 'ops_config') THEN
    ALTER TABLE role_packs DROP COLUMN ops_config;
  END IF;
END $$;

-- Remove metadata from tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'metadata') THEN
    ALTER TABLE tasks DROP COLUMN metadata;
  END IF;
END $$;

-- Remove kpi_bindings from work_reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_reports' AND column_name = 'kpi_bindings') THEN
    ALTER TABLE work_reports DROP COLUMN kpi_bindings;
  END IF;
END $$;
`

async function main() {
  console.log("Rolling back ops tables and columns...")
  await sql.unsafe(ROLLBACK_SQL)
  console.log("✓ Rollback complete")
  await sql.end()
}

main().catch((err) => {
  console.error("Rollback failed:", err)
  process.exit(1)
})
