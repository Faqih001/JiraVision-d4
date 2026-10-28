// Creates the `user_onboarding` table: one row per account recording whether setup was
// ever started, finished or deliberately skipped. Additive-only — it never alters or
// removes anything and seeds no rows; the backfill is a separate, preview-first script
// (scripts/backfill-user-onboarding.mjs). Run from the repo root:
//   npm run db:user-onboarding
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and
// this database is production.
//
// Every statement is sql.unsafe with inlined literals. A parameterised query is sent on a
// prepared statement, and while the Neon compute is waking that handshake is black-holed; a
// literal simple query goes through. lib/db.ts documents the same behaviour.

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

const TABLE = "user_onboarding"
const INDEX = "user_onboarding_status_idx"

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS user_onboarding (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'not_started',
  step INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  source VARCHAR(16) NOT NULL DEFAULT 'gate',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_onboarding_status_idx ON user_onboarding (status);
`

const sql = postgres(match[1], { max: 1 })
try {
  await sql.unsafe(CREATE_SQL)

  const [table] = await sql.unsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${TABLE}'`,
  )
  if (!table) {
    console.error(`missing table: ${TABLE}`)
    process.exit(1)
  }

  const columns = await sql.unsafe(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${TABLE}' ORDER BY ordinal_position`,
  )
  const names = columns.map((c) => c.column_name)
  for (const required of [
    "user_id",
    "status",
    "step",
    "version",
    "source",
    "started_at",
    "completed_at",
    "skipped_at",
    "created_at",
    "updated_at",
  ]) {
    if (!names.includes(required)) {
      console.error(`missing column: ${required}`)
      process.exit(1)
    }
  }

  const [{ count: fkConstraints }] = await sql.unsafe(
    `SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = '${TABLE}'::regclass AND contype = 'f'`,
  )
  if (fkConstraints < 1) {
    console.error("missing foreign key to users(id)")
    process.exit(1)
  }

  const [{ count: pks }] = await sql.unsafe(
    `SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = '${TABLE}'::regclass AND contype = 'p'`,
  )
  if (pks < 1) {
    console.error("missing primary key on user_id")
    process.exit(1)
  }

  const [index] = await sql.unsafe(`SELECT indexname FROM pg_indexes WHERE indexname = '${INDEX}'`)
  if (!index) {
    console.error(`missing index: ${INDEX}`)
    process.exit(1)
  }

  const [{ count }] = await sql.unsafe(`SELECT count(*)::int AS count FROM ${TABLE}`)
  const [{ count: users }] = await sql.unsafe("SELECT count(*)::int AS count FROM users")

  console.log(`table: ${TABLE}`)
  console.log(`index: ${INDEX}`)
  console.log("primary key: user_id")
  console.log("foreign key: user_id -> users.id ON DELETE CASCADE")
  console.log(`onboarding rows: ${count}`)
  console.log(`users with no onboarding row yet: ${users - count}`)
} catch (error) {
  console.error("User onboarding migration failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
