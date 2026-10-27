// Reverses create-invitations-table.mjs by removing ONLY the workspace_invitations table.
// Destructive. Refuses to run without INVITATIONS_ROLLBACK=yes in the environment, and this
// implementation plan never runs it. It exists so "reversible" in design §13 is true.
//   INVITATIONS_ROLLBACK=yes npm run db:invitations:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.INVITATIONS_ROLLBACK !== "yes") {
  console.error("Refusing to run. Set INVITATIONS_ROLLBACK=yes to confirm you want this gone.")
  process.exit(1)
}

const TABLE = "workspace_invitations"

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
  console.log(`removing table ${TABLE}`)
  await sql.unsafe("DROP TABLE IF EXISTS workspace_invitations CASCADE")

  const [left] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${TABLE}
  `
  if (left) {
    console.error(`${TABLE} is still present`)
    process.exit(1)
  }
  console.log("remaining: none")
} catch (error) {
  console.error("Rollback failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}