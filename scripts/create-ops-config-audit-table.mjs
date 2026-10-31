// Creates the ops_config_audit table for tracking config changes.
// Additive-only by design: it never removes or rewrites anything. Run from the repo root:
//   node scripts/create-ops-config-audit-table.mjs
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

const EXPECTED_TABLES = ["ops_config_audit"]

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ops_config_audit (
  id SERIAL PRIMARY KEY,
  pack_key VARCHAR(60) NOT NULL,
  discipline VARCHAR(60) NOT NULL,
  user_id INTEGER NOT NULL,
  operation VARCHAR(20) NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ops_config_audit_pack_idx ON ops_config_audit(pack_key);
CREATE INDEX IF NOT EXISTS ops_config_audit_created_idx ON ops_config_audit(created_at);
`

async function main() {
  console.log("Checking existing tables...")
  const existing = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${EXPECTED_TABLES})
  `
  const existingNames = new Set(existing.map((row) => row.table_name))

  if (existingNames.has("ops_config_audit")) {
    console.log("✓ ops_config_audit table already exists")
  } else {
    console.log("Creating ops_config_audit table...")
    await sql.unsafe(CREATE_SQL)
    console.log("✓ ops_config_audit table created")
  }

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

  console.log("✓ All tables verified")
  console.log("Migration complete")
  await sql.end()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
