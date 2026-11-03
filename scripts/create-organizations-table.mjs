// Creates the `organizations` table and the two membership columns. Additive-only by
// design and by test: it never removes or rewrites anything. It backfills one
// organization ("AAC Kenya") and places the two existing accounts (fakiiahmad001@gmail.com
// and mohammedfakii18@gmail.com) inside it, so today's visibility is unchanged.
// New registrations land with organization_id NULL — personal accounts until invited
// or until the member creates an organization. Run from the repo root:
//   node scripts/create-organizations-table.mjs --dry-run
//   node scripts/create-organizations-table.mjs --apply
// drizzle-kit push is NOT used — it can remove what the schema file does not declare,
// and this database is production.

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

const APPLY = process.argv.includes("--apply")
if (!APPLY && !process.argv.includes("--dry-run")) {
  console.error("Pass --dry-run or --apply explicitly.")
  process.exit(1)
}

const ORG_EMAILS = ["fakiiahmad001@gmail.com", "mohammedfakii18@gmail.com"]

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER
  REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS organization_id INTEGER
  REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS users_organization_id_idx ON users (organization_id);
`

const sql = postgres(match[1], { max: 1 })
try {
  if (!APPLY) {
    // Dry run: report only what exists today.
    const [orgTable] = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'organizations'
    `
    const userCol = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'organization_id'
    `
    const members = await sql`
      SELECT id, email FROM users WHERE email IN ${sql.array(ORG_EMAILS)} ORDER BY id
    `
    console.log(`organizations table: ${orgTable ? "exists" : "MISSING (will create)"}`)
    console.log(`users.organization_id: ${userCol.length ? "exists" : "MISSING (will add)"}`)
    console.log(`backfill targets: ${members.map((m) => `${m.id} ${m.email}`).join(", ") || "none found"}`)
    console.log("Dry run only — nothing changed. Re-run with --apply.")
  } else {
    await sql.unsafe(CREATE_SQL)

    // Backfill: one organization for the two existing accounts, owner is the primary.
    const [org] = await sql`
      INSERT INTO organizations (name, owner_id)
      SELECT 'AAC Kenya', (SELECT id FROM users WHERE email = ${ORG_EMAILS[0]})
      WHERE (SELECT id FROM users WHERE email = ${ORG_EMAILS[0]}) IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'AAC Kenya')
      RETURNING id
    `
    let orgId = org?.id ?? null
    if (!orgId) {
      const [existing] = await sql`SELECT id FROM organizations WHERE name = 'AAC Kenya' LIMIT 1`
      orgId = existing?.id ?? null
    }
    if (orgId) {
      await sql`
        UPDATE users SET organization_id = ${orgId}
        WHERE email IN ${sql.array(ORG_EMAILS)} AND organization_id IS NULL
      `
    }

    // Verify.
    const [table] = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'organizations'
    `
    if (!table) {
      console.error("missing table: organizations")
      process.exit(1)
    }
    const cols = await sql`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE column_name = 'organization_id' AND table_name IN ('users', 'workspace_invitations')
    `
    if (cols.length !== 2) {
      console.error("missing organization_id column:", cols.map((c) => c.table_name).join(", ") || "none")
      process.exit(1)
    }
    const [counts] = await sql`
      SELECT
        (SELECT count(*)::int FROM organizations) AS orgs,
        (SELECT count(*)::int FROM users WHERE organization_id IS NOT NULL) AS with_org,
        (SELECT count(*)::int FROM users WHERE organization_id IS NULL) AS personal
    `
    console.log(`organizations: ${counts.orgs}`)
    console.log(`users with an organization: ${counts.with_org}`)
    console.log(`personal (org-less) users: ${counts.personal}`)
  }
} catch (error) {
  console.error("Organizations migration failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
