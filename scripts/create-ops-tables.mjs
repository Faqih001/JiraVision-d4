// Creates the ops_log_entries table and adds JSONB columns to existing tables.
// Additive-only by design: it never removes or rewrites anything. Run from the repo root:
//   npm run db:ops
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and
// this database is production.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(match[1])

const EXPECTED_TABLES = ["ops_log_entries"]

// Creation order matters: ops_log_entries references users.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ops_log_entries (
  id SERIAL PRIMARY KEY,
  pack_key VARCHAR(60) NOT NULL,
  entity_key VARCHAR(40) NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(30),
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ops_log_entries_owner_idx ON ops_log_entries(owner_id);
CREATE INDEX IF NOT EXISTS ops_log_entries_pack_idx ON ops_log_entries(pack_key);
CREATE INDEX IF NOT EXISTS ops_log_entries_entity_idx ON ops_log_entries(entity_key);
CREATE INDEX IF NOT EXISTS ops_log_entries_occurred_idx ON ops_log_entries(occurred_at);
`

// Add JSONB columns to existing tables
const ALTER_SQL = `
-- Add ops_config to role_packs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_packs' AND column_name = 'ops_config') THEN
    ALTER TABLE role_packs ADD COLUMN ops_config JSONB;
  END IF;
END $$;

-- Add metadata to tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'metadata') THEN
    ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add kpi_bindings to work_reports
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_reports' AND column_name = 'kpi_bindings') THEN
    ALTER TABLE work_reports ADD COLUMN kpi_bindings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
`

async function main() {
  console.log("Checking existing tables...")
  const existing = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${EXPECTED_TABLES})
  `
  const existingNames = new Set(existing.map((row) => row.table_name))

  console.log("Creating ops_log_entries table...")
  await sql.unsafe(CREATE_SQL)
  console.log("✓ ops_log_entries table created")

  console.log("Adding JSONB columns to existing tables...")
  await sql.unsafe(ALTER_SQL)
  console.log("✓ JSONB columns added")

  // Verify
  const after = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${EXPECTED_TABLES})
  `
  const afterNames = new Set(after.map((row) => row.table_name))

  for (const name of EXPECTED_TABLES) {
    if (!afterNames.has(name)) {
      console.error(`✗ Expected table ${name} not found after migration`)
      process.exit(1)
    }
  }

  // Verify columns
  const rolePacksCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'role_packs' AND column_name = 'ops_config'
  `
  if (rolePacksCols.length === 0) {
    console.error("✗ Expected column role_packs.ops_config not found")
    process.exit(1)
  }

  const tasksCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'metadata'
  `
  if (tasksCols.length === 0) {
    console.error("✗ Expected column tasks.metadata not found")
    process.exit(1)
  }

  const workReportsCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'work_reports' AND column_name = 'kpi_bindings'
  `
  if (workReportsCols.length === 0) {
    console.error("✗ Expected column work_reports.kpi_bindings not found")
    process.exit(1)
  }

  console.log("✓ All tables and columns verified")
  console.log("Migration complete")
  await sql.end()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
