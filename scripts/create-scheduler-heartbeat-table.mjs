// Creates scheduler_heartbeat: the one row that records when the hourly schedule last fired and
// what it found. Additive-only — it never removes or rewrites anything. Run from the repo root:
//   node scripts/create-scheduler-heartbeat-table.mjs
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and this
// database is production.
//
// No row is seeded. An empty table has to mean "the scheduler has never fired"; inserting a row
// here would claim a fire that never happened.

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

const EXPECTED_TABLES = ["scheduler_heartbeat"]

// The CHECK makes "one row" structural rather than a convention the writer has to remember.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS scheduler_heartbeat (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  last_fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  jobs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scheduler_heartbeat_singleton CHECK (id = 1)
);
`

async function main() {
  console.log("Checking existing tables...")
  const existing = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${EXPECTED_TABLES})
  `
  const existingNames = new Set(existing.map((row) => row.table_name))

  if (existingNames.has("scheduler_heartbeat")) {
    console.log("✓ scheduler_heartbeat table already exists")
  } else {
    console.log("Creating scheduler_heartbeat table...")
    await sql.unsafe(CREATE_SQL)
    console.log("✓ scheduler_heartbeat table created")
  }

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

  const rows = await sql`SELECT count(*)::int AS n FROM scheduler_heartbeat`
  console.log(`✓ All tables verified — ${rows[0].n} row(s), no seed inserted`)
  console.log("Migration complete")
  await sql.end()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})