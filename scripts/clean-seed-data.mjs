// Clears all comprehensive seed data so the next db-init re-seeds fresh.
// Deletes in child-first order to respect foreign keys, then removes the
// @example.com team member accounts the old users module created.
//
// Run from the repo root:
//   node scripts/clean-seed-data.mjs              rehearsal (transaction rolled back)
//   node scripts/clean-seed-data.mjs --apply      commit the deletes
//
// After running with --apply, the next app start (or db-init) will re-seed
// all data scoped to fakiiahmad001@gmail.com.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const urlMatch = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!urlMatch) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
const sql = postgres(urlMatch[1], { max: 1 })

const HOST = (() => {
  try {
    return new URL(urlMatch[1]).hostname.split(".").slice(0, 2).join("-") + "…"
  } catch {
    return "unknown"
  }
})()

// Child-first: every table whose rows point at an earlier table comes first.
const SEED_TABLES = [
  "task_instances",           // -> tasks
  "task_report_templates",    // -> tasks
  "task_reports",             // -> task_report_templates
  "work_log_entries",         // -> tasks, users
  "work_report_recipients",   // -> work_reports
  "work_reports",             // -> users
  "task_events",              // -> tasks
  "calendar_events",          // -> users (organizer)
  "ops_log_entries",          // -> users (owner)
  "register_items",           // -> users (owner)
  "playbooks",                // -> users (author)
  "gamification",             // -> users
  "wellbeing_metrics",        // -> users
  "ethical_metrics",          // standalone
  "ai_insights",              // standalone
  "tasks",                    // -> users (assignee)
]

const TEAM_EMAIL_PATTERN = "%@example.com"

async function countRow(sql, table) {
  const [r] = await sql.unsafe(`select count(*)::int as c from ${table}`)
  return r.c
}

async function main() {
  console.log(`database: ${HOST}`)
  console.log(`mode: ${APPLY ? "APPLY (will commit)" : "rehearsal (will roll back)"}\n`)

  const before = {}
  for (const t of SEED_TABLES) {
    before[t] = await countRow(sql, t)
  }
  const teamUsers = await sql`select count(*)::int as c from users where email like ${TEAM_EMAIL_PATTERN}`
  before["users (team members)"] = teamUsers[0].c

  const totalBefore = Object.values(before).reduce((n, c) => n + c, 0)
  console.log("rows before cleanup:")
  for (const [t, c] of Object.entries(before)) {
    if (c > 0) console.log(`  ${t.padEnd(35)} ${String(c).padStart(6)}`)
  }
  console.log(`  ${"TOTAL".padEnd(35)} ${String(totalBefore).padStart(6)}\n`)

  try {
    await sql.begin(async (tx) => {
      for (const t of SEED_TABLES) {
        const r = await tx.unsafe(`delete from ${t}`)
        const deleted = Number(r.count ?? r[0]?.count ?? 0)
        if (deleted > 0) {
          console.log(`  deleted ${String(deleted).padStart(6)}  from ${t}`)
        }
      }

      const teamResult = await tx`delete from users where email like ${TEAM_EMAIL_PATTERN}`
      const teamDeleted = Number(teamResult.count ?? teamResult[0]?.count ?? 0)
      if (teamDeleted > 0) {
        console.log(`  deleted ${String(teamDeleted).padStart(6)}  from users (team members @example.com)`)
      }

      if (!APPLY) {
        console.log("\nrehearsal complete — rolling back (database unchanged)")
        throw new Error("__rehearsal__")
      }
    })
  } catch (e) {
    if (e.message !== "__rehearsal__") throw e
  }

  if (APPLY) {
    const after = {}
    for (const t of SEED_TABLES) {
      after[t] = await countRow(sql, t)
    }
    const teamAfter = await sql`select count(*)::int as c from users where email like ${TEAM_EMAIL_PATTERN}`
    after["users (team members)"] = teamAfter[0].c

    console.log("\nrows after cleanup:")
    for (const [t, c] of Object.entries(after)) {
      if (c > 0) console.log(`  ${t.padEnd(35)} ${String(c).padStart(6)}`)
    }

    const [users] = await sql`select count(*)::int as c from users`
    console.log(`\ncommitted. remaining users: ${users.c}`)
    console.log("next app start will re-seed all data for fakiiahmad001@gmail.com")
  } else {
    console.log("\nrehearsal: database is unchanged.")
    console.log("to run for real:  node scripts/clean-seed-data.mjs --apply")
  }
}

main()
  .catch((error) => {
    if (error.message === "__rehearsal__") return
    console.error(error.message ?? error)
    process.exitCode = 1
  })
  .finally(() => sql.end({ timeout: 5 }))
