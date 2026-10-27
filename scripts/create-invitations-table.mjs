// Creates the phase-17 `workspace_invitations` table. Additive-only by design and by test
// (tests/unit/onboarding-schema.test.ts): it never removes or rewrites anything and seeds no
// rows. Run from the repo root:
//   npm run db:invitations
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

const TABLE = "workspace_invitations"
const INDEX = "workspace_invitations_email_idx"

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx ON workspace_invitations (email);
`

const sql = postgres(match[1], { max: 1 })
try {
  await sql.unsafe(CREATE_SQL)

  const [table] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${TABLE}
  `
  if (!table) {
    console.error(`missing table: ${TABLE}`)
    process.exit(1)
  }

  const unique = await sql`
    SELECT 1 FROM pg_constraint
    WHERE conrelid = ${TABLE}::regclass AND contype = 'u'
  `
  if (!unique.length) {
    console.error("missing unique constraint on token_hash")
    process.exit(1)
  }

  const [index] = await sql`SELECT indexname FROM pg_indexes WHERE indexname = ${INDEX}`
  if (!index) {
    console.error(`missing index: ${INDEX}`)
    process.exit(1)
  }

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM workspace_invitations`

  console.log(`table: ${TABLE}`)
  console.log(`index: ${INDEX}`)
  console.log("unique constraint: token_hash")
  console.log(`invitation rows: ${count}`)
} catch (error) {
  console.error("Invitations migration failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}