// Reverses create-organizations-table.mjs: removes the two organization_id columns and
// the organizations table. Destructive — membership rows go with it. Refuses to run
// without ORGANIZATIONS_ROLLBACK=yes in the environment. It exists so "reversible" is
// true; the implementation plan never runs it.
//   ORGANIZATIONS_ROLLBACK=yes node scripts/rollback-organizations-table.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.ORGANIZATIONS_ROLLBACK !== "yes") {
  console.error("Refusing to run. Set ORGANIZATIONS_ROLLBACK=yes to confirm you want this gone.")
  process.exit(1)
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(match[1], { max: 1 })
try {
  console.log("dropping users.organization_id, workspace_invitations.organization_id, organizations")
  await sql.unsafe(`
    DROP INDEX IF EXISTS users_organization_id_idx;
    ALTER TABLE workspace_invitations DROP COLUMN IF EXISTS organization_id;
    ALTER TABLE users DROP COLUMN IF EXISTS organization_id;
    DROP TABLE IF EXISTS organizations CASCADE;
  `)

  const [left] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  `
  if (left) {
    console.error("organizations is still present")
    process.exit(1)
  }
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE column_name = 'organization_id' AND table_name IN ('users', 'workspace_invitations')
  `
  if (cols.length) {
    console.error("organization_id columns still present")
    process.exit(1)
  }
  console.log("remaining: none")
} catch (error) {
  console.error("Rollback failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
