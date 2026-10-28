// Creates the `auth_sessions` table so a login is a row instead of a self-asserted cookie.
// Additive-only: it never alters or removes anything and seeds no rows. Run from the repo root:
//   npm run db:auth-sessions
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and this
// database is production.
//
// Every statement here is sql.unsafe with inlined literals. A parameterised query is sent on a
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

const TABLE = "auth_sessions"
const INDEX = "auth_sessions_user_idx"

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);
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
  for (const required of ["token_hash", "user_id", "created_at", "last_seen_at", "expires_at", "revoked_at"]) {
    if (!names.includes(required)) {
      console.error(`missing column: ${required}`)
      process.exit(1)
    }
  }

  const [{ count: uniqueConstraints }] = await sql.unsafe(
    `SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = '${TABLE}'::regclass AND contype = 'u'`,
  )
  if (uniqueConstraints < 1) {
    console.error("missing unique constraint on token_hash")
    process.exit(1)
  }

  const [{ count: fkConstraints }] = await sql.unsafe(
    `SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = '${TABLE}'::regclass AND contype = 'f'`,
  )
  if (fkConstraints < 1) {
    console.error("missing foreign key to users(id)")
    process.exit(1)
  }

  const [index] = await sql.unsafe(`SELECT indexname FROM pg_indexes WHERE indexname = '${INDEX}'`)
  if (!index) {
    console.error(`missing index: ${INDEX}`)
    process.exit(1)
  }

  const [{ count }] = await sql.unsafe(`SELECT count(*)::int AS count FROM ${TABLE}`)

  console.log(`table: ${TABLE}`)
  console.log(`index: ${INDEX}`)
  console.log("unique constraint: token_hash")
  console.log("foreign key: user_id -> users.id ON DELETE CASCADE")
  console.log(`session rows: ${count}`)
} catch (error) {
  console.error("Auth sessions migration failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
