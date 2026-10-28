// Reverses create-auth-sessions-table.mjs by removing ONLY the auth_sessions table — and with
// it every live login, so signed-in users are immediately sent to the login page.
// Destructive. Refuses to run without AUTH_SESSIONS_ROLLBACK=yes in the environment.
//   AUTH_SESSIONS_ROLLBACK=yes npm run db:auth-sessions:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.AUTH_SESSIONS_ROLLBACK !== "yes") {
  console.error(
    "Refusing to run. Set AUTH_SESSIONS_ROLLBACK=yes to confirm — this signs out every user.",
  )
  process.exit(1)
}

const TABLE = "auth_sessions"

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
  await sql.unsafe("DROP TABLE IF EXISTS auth_sessions CASCADE")

  const [left] = await sql.unsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${TABLE}'`,
  )
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
