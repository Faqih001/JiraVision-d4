// Reverses create-playbooks-tables.mjs by removing ONLY what phase 16 added: the foreign
// key on work_log_entries.playbook_id and the playbooks table. Destructive. Refuses to run
// without PLAYBOOKS_ROLLBACK=yes in the environment, and this implementation plan never
// runs it. It exists so "reversible" in design §13 is true.
//   PLAYBOOKS_ROLLBACK=yes npm run db:playbooks:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.PLAYBOOKS_ROLLBACK !== "yes") {
  console.error("Refusing to run. Set PLAYBOOKS_ROLLBACK=yes to confirm you want this gone.")
  process.exit(1)
}

const TABLES = ["playbooks"]
const FK_NAME = "work_log_entries_playbook_id_fk"

// Anything else in this database is somebody's working data.
const PHASE16 = /^playbooks$/
const strays = TABLES.filter((table) => !PHASE16.test(table))
if (strays.length) {
  console.error("Refusing: unexpected table in the rollback list:", strays.join(", "))
  process.exit(1)
}
if (TABLES.length !== 1) {
  console.error(`Refusing: expected 1 table in the rollback list, found ${TABLES.length}`)
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
  // Reverse dependency order: the FK lives on work_log_entries, so it goes first.
  console.log(`removing constraint ${FK_NAME}`)
  await sql.unsafe("ALTER TABLE work_log_entries DROP CONSTRAINT IF EXISTS work_log_entries_playbook_id_fk")

  for (const table of TABLES) {
    console.log(`removing table ${table}`)
    await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`)
  }

  const left = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `
  const remaining = left.map((row) => row.table_name).filter((table) => TABLES.includes(table))
  console.log("remaining:", remaining.join(", ") || "none")
  if (remaining.length) process.exit(1)
} catch (error) {
  console.error("Rollback failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
