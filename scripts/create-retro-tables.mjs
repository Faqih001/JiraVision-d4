// Creates the sprint-retrospective tables used by /dashboard/retros.
// Additive-only: CREATE TABLE IF NOT EXISTS, never drops or alters rows.
// Tables:
//   retros        — one row per retrospective (linked sprint optional, status lifecycle)
//   retro_notes   — free-form notes in three categories; `votes` is the derived
//                   count of `voters` (a JSONB array of user ids) — the vote
//                   model enforced by POST /api/retros/[id]/notes/[noteId]/vote
//   retro_actions — follow-up action items with owner / due date / done flag
//
// Usage: node scripts/create-retro-tables.mjs

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
CREATE TABLE IF NOT EXISTS retros (
  id SERIAL PRIMARY KEY,
  sprint_id INT REFERENCES sprints(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'completed', 'archived')),
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS retro_notes (
  id SERIAL PRIMARY KEY,
  retro_id INT NOT NULL REFERENCES retros(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL CHECK (category IN ('went_well', 'went_bad', 'try_next')),
  body TEXT NOT NULL,
  author_id INT NOT NULL REFERENCES users(id),
  votes INT NOT NULL DEFAULT 0,
  voters JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS retro_actions (
  id SERIAL PRIMARY KEY,
  retro_id INT NOT NULL REFERENCES retros(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  owner_id INT REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS retro_notes_retro_idx ON retro_notes (retro_id);
CREATE INDEX IF NOT EXISTS retro_actions_retro_idx ON retro_actions (retro_id)
`

const TABLES = ["retros", "retro_notes", "retro_actions"]

try {
  console.log("SQL → CREATE TABLE IF NOT EXISTS retros / retro_notes / retro_actions")
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

  // Column-level spot-check of the vote model (voters array drives votes).
  const [votersCol] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'retro_notes' AND column_name = 'voters'
    ) AS "exists"
  `
  console.log("retro_notes.voters exists:", votersCol.exists)

  console.log("All retro tables are ready.")
} catch (err) {
  console.error("Failed to create retro tables:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
