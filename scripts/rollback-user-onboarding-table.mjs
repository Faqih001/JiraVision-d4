// Reverses create-user-onboarding-table.mjs by removing ONLY the user_onboarding table.
// The gate then treats every account as unknown again, which means members who skipped
// setup are asked once more — accounts keep their answers, they live in
// users.preferences.settings.onboarding. Destructive. Refuses without
// USER_ONBOARDING_ROLLBACK=yes in the environment.
//   USER_ONBOARDING_ROLLBACK=yes npm run db:user-onboarding:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.USER_ONBOARDING_ROLLBACK !== "yes") {
  console.error(
    "Refusing to run. Set USER_ONBOARDING_ROLLBACK=yes to confirm — every account becomes un-gated again.",
  )
  process.exit(1)
}

const TABLE = "user_onboarding"

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
  const [{ count }] = await sql.unsafe(`SELECT count(*)::int AS count FROM ${TABLE}`).catch(() => [{ count: 0 }])
  console.log(`removing table ${TABLE} (${count} rows)`)
  await sql.unsafe("DROP TABLE IF EXISTS user_onboarding CASCADE")

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
