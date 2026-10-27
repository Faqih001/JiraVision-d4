// Creates the two phase-15 tables and seeds the role packs. Additive-only by design and by
// test (tests/unit/register-schema.test.ts): it never removes or rewrites anything, and the
// seed uses ON CONFLICT DO NOTHING so an admin's later edit survives a re-run. Run from the
// repo root:
//   npm run db:registers
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and
// this database is production.
//
// The pack rows come from lib/packs/seed.ts with Node's type stripping rather than being
// copied here, so the seeded rows and the tests read one source.

import { readFileSync } from "node:fs"
import postgres from "postgres"
import { SEED_PACKS } from "../lib/packs/seed.ts"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const EXPECTED_TABLES = ["role_packs", "register_items"]

// Creation order matters: register_items references users and itself.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS role_packs (
  id SERIAL PRIMARY KEY,
  pack_key VARCHAR(60) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  disciplines JSONB NOT NULL DEFAULT '[]'::jsonb,
  register_kinds JSONB NOT NULL DEFAULT '[]'::jsonb,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_template VARCHAR(30),
  ladder_discipline VARCHAR(40),
  onboarding JSONB NOT NULL DEFAULT '[]'::jsonb,
  method JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS role_packs_active_idx ON role_packs (is_active);

CREATE TABLE IF NOT EXISTS register_items (
  id SERIAL PRIMARY KEY,
  pack_key VARCHAR(60) NOT NULL,
  kind VARCHAR(40) NOT NULL,
  title TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'in_service',
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  custody VARCHAR(10) NOT NULL DEFAULT 'member',
  last_verified_at DATE,
  verify_interval_days INTEGER,
  parent_id INTEGER REFERENCES register_items(id) ON DELETE SET NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS register_items_pack_kind_idx ON register_items (pack_key, kind);
CREATE INDEX IF NOT EXISTS register_items_owner_idx ON register_items (owner_id);
CREATE INDEX IF NOT EXISTS register_items_status_idx ON register_items (status);
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

  for (const pack of SEED_PACKS) {
    await sql`
      INSERT INTO role_packs
        (pack_key, title, disciplines, register_kinds, sections, report_template,
         ladder_discipline, onboarding, method, is_active)
      VALUES
        (${pack.packKey}, ${pack.title}, ${sql.json(pack.disciplines)},
         ${sql.json(pack.registerKinds)}, ${sql.json(pack.sections)},
         ${pack.reportTemplate}, ${pack.ladderDiscipline}, ${sql.json(pack.onboarding)},
         ${sql.json(pack.method)}, ${pack.isActive})
      ON CONFLICT (pack_key) DO NOTHING
    `
  }

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM role_packs`
  const [{ items }] = await sql`SELECT count(*)::int AS items FROM register_items`

  console.log("tables:", EXPECTED_TABLES.join(", "))
  console.log(`role_packs rows: ${count} (expected ${SEED_PACKS.length})`)
  console.log(`register_items rows: ${items} (the owner types their own inventory)`)
} catch (error) {
  console.error("Registers migration failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
