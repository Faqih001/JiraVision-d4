// Creates the phase-16 `playbooks` table and the foreign key phase 1 deferred on
// work_log_entries.playbook_id. Additive-only by design and by test
// (tests/unit/playbook-schema.test.ts): it never removes or rewrites anything and seeds no
// rows — the owner authors their own SOPs. Run from the repo root:
//   npm run db:playbooks
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

const EXPECTED_TABLES = ["playbooks"]
const FK_NAME = "work_log_entries_playbook_id_fk"

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS playbooks (
  id SERIAL PRIMARY KEY,
  pack_key VARCHAR(60) NOT NULL,
  discipline VARCHAR(40),
  title TEXT NOT NULL,
  summary TEXT,
  scope_kind VARCHAR(40),
  method JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  precautions JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  ai_marked BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at DATE,
  verify_interval_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS playbooks_pack_status_idx ON playbooks (pack_key, status);
CREATE INDEX IF NOT EXISTS playbooks_author_idx ON playbooks (author_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${FK_NAME}') THEN
    ALTER TABLE work_log_entries
      ADD CONSTRAINT ${FK_NAME}
      FOREIGN KEY (playbook_id) REFERENCES playbooks(id) ON DELETE SET NULL;
  END IF;
END $$;
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

  const [constraint] = await sql`
    SELECT conname FROM pg_constraint WHERE conname = ${FK_NAME}
  `
  if (!constraint) {
    console.error(`missing foreign key: ${FK_NAME}`)
    process.exit(1)
  }

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM playbooks`
  const [{ entries }] = await sql`SELECT count(*)::int AS entries FROM work_log_entries`

  console.log("tables:", EXPECTED_TABLES.join(", "))
  console.log(`foreign key: ${FK_NAME}`)
  console.log(`playbooks rows: ${count} (the owner authors their own SOPs)`)
  console.log(`work_log_entries rows: ${entries} (unchanged)`)
} catch (error) {
  console.error("Playbooks migration failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
