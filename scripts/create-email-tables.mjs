// Creates the email-workspace tables used by /dashboard/email (digest center).
// Additive-only: CREATE TABLE IF NOT EXISTS, never drops or alters rows.
// Tables:
//   email_templates  — per-user message templates (name/subject/body/event/enabled)
//   email_digest     — queued/delivered digest rows (the persisted "outbox" log)
//   email_preferences— one JSONB blob row per user holding the subscription matrix
//
// Usage: node scripts/create-email-tables.mjs

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
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  event_type VARCHAR(50) DEFAULT 'info',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS email_digest (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email VARCHAR(320),
  subject VARCHAR(500),
  body TEXT,
  event_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'queued',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS email_preferences (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW()
)
`

const TABLES = ["email_templates", "email_digest", "email_preferences"]

try {
  console.log("SQL → CREATE TABLE IF NOT EXISTS email_templates / email_digest / email_preferences")
  await sql.unsafe(CREATE_SQL)

  for (const table of TABLES) {
    const [check] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) AS "exists"
    `
    console.log(`${table} exists:`, check.exists)
    if (!check.exists) process.exit(1)
  }
  console.log("All email-workspace tables are ready.")
} catch (err) {
  console.error("Failed to create email tables:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
