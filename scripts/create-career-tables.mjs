// Creates the five phase-12 career tables and seeds the twenty-rung ladder. Additive-only
// by design and by test (tests/unit/career-schema.test.ts): it never removes or rewrites
// anything, and the seed uses ON CONFLICT DO NOTHING so an admin's later edit survives a
// re-run. Run from the repo root:
//   npm run db:career
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and
// this database is production.
//
// The ladder wording is imported from lib/career/ladder-seed.ts with Node's type
// stripping rather than copied here, so the seeded rows and the tests read one source.

import { readFileSync } from "node:fs"
import postgres from "postgres"
import { CAREER_LADDER } from "../lib/career/ladder-seed.ts"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const EXPECTED_TABLES = [
  "career_levels",
  "career_placement",
  "career_signoffs",
  "career_requests",
  "growth_reviews",
]

// Creation order matters: a table's own foreign keys must already exist.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS career_levels (
  id SERIAL PRIMARY KEY,
  discipline VARCHAR(40) NOT NULL,
  level SMALLINT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  expectations TEXT,
  band_min INTEGER,
  band_max INTEGER,
  band_currency CHAR(3),
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS career_levels_discipline_level_idx
  ON career_levels (discipline, level);

CREATE TABLE IF NOT EXISTS career_placement (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discipline VARCHAR(40) NOT NULL,
  level SMALLINT NOT NULL,
  placed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  PRIMARY KEY (user_id, discipline)
);

CREATE TABLE IF NOT EXISTS career_signoffs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL REFERENCES career_levels(id) ON DELETE CASCADE,
  item_key VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ticked',
  ticked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ticked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS career_signoffs_user_level_item_idx
  ON career_signoffs (user_id, level_id, item_key);

CREATE TABLE IF NOT EXISTS career_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discipline VARCHAR(40) NOT NULL,
  from_level SMALLINT NOT NULL,
  to_level SMALLINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  return_note TEXT,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS career_requests_user_status_idx
  ON career_requests (user_id, status);

CREATE TABLE IF NOT EXISTS growth_reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL,
  period_start DATE,
  period_end DATE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative TEXT,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model VARCHAR(80),
  ai_marked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS growth_reviews_user_kind_idx
  ON growth_reviews (user_id, kind, as_of);
`

const sql = postgres(match[1], { max: 1 })
try {
  await sql.unsafe(CREATE_SQL)

  const present = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${EXPECTED_TABLES})
  `
  const found = new Set(present.map((row) => row.table_name))
  const missing = EXPECTED_TABLES.filter((table) => !found.has(table))
  if (missing.length) {
    console.error("missing tables:", missing.join(", "))
    process.exit(1)
  }

  for (const row of CAREER_LADDER) {
    await sql`
      INSERT INTO career_levels
        (discipline, level, title, summary, expectations, signals, checklist)
      VALUES
        (${row.discipline}, ${row.level}, ${row.title}, ${row.summary}, ${row.expectations},
         ${sql.json(row.signals)}, ${sql.json(row.checklist)})
      ON CONFLICT (discipline, level) DO NOTHING
    `
  }

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM career_levels`
  const [{ bands }] = await sql`
    SELECT count(*)::int AS bands FROM career_levels
    WHERE band_min IS NOT NULL OR band_max IS NOT NULL
  `

  console.log("tables:", EXPECTED_TABLES.join(", "))
  console.log(`career_levels rows: ${count} (expected ${CAREER_LADDER.length})`)
  console.log(`published bands: ${bands} (expected 0 — the owner has not set numbers)`)

  if (count !== CAREER_LADDER.length) {
    console.error("seed incomplete: expected one row per discipline and rung")
    process.exit(1)
  }
} catch (error) {
  console.error("Career migration failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
