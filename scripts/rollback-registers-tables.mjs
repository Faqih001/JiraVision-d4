// Reverses create-registers-tables.mjs by removing ONLY the two tables phase 15 added.
// Destructive. Refuses to run without REGISTERS_ROLLBACK=yes in the environment, and this
// implementation plan never runs it. It exists so "reversible" in design §13 is true.
//   REGISTERS_ROLLBACK=yes npm run db:registers:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.REGISTERS_ROLLBACK !== "yes") {
  console.error("Refusing to run. Set REGISTERS_ROLLBACK=yes to confirm you want these tables gone.")
  process.exit(1)
}

// Reverse dependency order.
const TABLES = ["register_items", "role_packs"]

// Anything else in this database is somebody's working data.
const PHASE15 = /^(role_packs|register_items)$/
const strays = TABLES.filter((table) => !PHASE15.test(table))
if (strays.length) {
  console.error("Refusing: unexpected table in the rollback list:", strays.join(", "))
  process.exit(1)
}
if (TABLES.length !== 2) {
  console.error(`Refusing: expected 2 tables in the rollback list, found ${TABLES.length}`)
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
