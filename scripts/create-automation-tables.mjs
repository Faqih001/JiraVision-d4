// Creates the automation-workspace tables (automation_rules + automation_runs)
// if they do not exist yet, then verifies them. Additive-only: never drops or
// alters rows.
//
// Usage: node scripts/create-automation-tables.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so
// only the uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]

const sql = postgres(databaseUrl, { max: 1 })

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS automation_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger VARCHAR(40) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS automation_runs (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'ok',
  matched INTEGER NOT NULL DEFAULT 0,
  acted INTEGER NOT NULL DEFAULT 0,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`

try {
  console.log("SQL → CREATE TABLE IF NOT EXISTS automation_rules / automation_runs ( … )")
  await sql.unsafe(CREATE_SQL)
  console.log("CREATE TABLE IF NOT EXISTS automation_rules, automation_runs: OK")

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('automation_rules', 'automation_runs')
  `
  console.log("tables present:", tables.map((t) => t.table_name).join(", "))
  if (tables.length !== 2) process.exit(1)
} catch (err) {
  console.error("Failed to create automation tables:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
