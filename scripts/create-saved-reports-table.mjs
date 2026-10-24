// Creates the saved_reports table (analytics workspace snapshots) if it does
// not exist yet, then verifies it. Additive-only: never drops or alters rows.
//
// Usage: node scripts/create-saved-reports-table.mjs

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
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
CREATE TABLE IF NOT EXISTS saved_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
)
`

try {
  console.log("SQL → CREATE TABLE IF NOT EXISTS saved_reports ( … )")
  await sql.unsafe(CREATE_SQL)
  console.log("CREATE TABLE IF NOT EXISTS saved_reports: OK")

  const [check] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'saved_reports'
    ) AS "exists"
  `
  console.log("SQL → SELECT EXISTS(... information_schema.tables WHERE table_name = 'saved_reports')")
  console.log("saved_reports exists:", check.exists)
  if (!check.exists) process.exit(1)
} catch (err) {
  console.error("Failed to create saved_reports:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
