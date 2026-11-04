// Read-only status census on the production database (spec §G5).
//
// The completed-status sweep replaces `status = 'done'` with `status in ('done','completed','closed')`
// in every aggregate, so several published numbers move the moment it merges. This script says by how
// much, before the merge, from the rows as they are now — so a changed tile is explained in the
// deployment notes rather than discovered in the UI afterwards.
//
//   node scripts/measure-task-statuses.mjs
//
// SELECT only. There is no --apply flag, no backup and no write path: a read of a count needs no
// checkpoint, and the standing rule governs DDL and writes. Never pair this file with a write, and
// never extend it into one — the guard in tests/unit/recurrence-cross-surface-guards.test.ts fails.
//
// The connection string is never printed; only a masked host, so the operator can see which Neon
// endpoint answered. Run from the repo root: .env.local line 1 is a commented stale URL, which is
// why the match is anchored with /^DATABASE_URL=…/m.

import { readFileSync } from "node:fs"
import postgres from "postgres"

// Mirrors COMPLETED_TASK_STATUSES in lib/tasks/statuses.ts. A .mjs script must not import app code,
// so the list is duplicated here and held equal by a guard, the same way scripts/import-it-technician-tasks.mjs
// mirrors INSTANCE_COUNTS.
const COMPLETED_STATUSES = ["done", "completed", "closed"]

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

function maskHost(url) {
  try {
    const host = new URL(url).hostname
    const [first, ...rest] = host.split(".")
    const shown = first.length <= 2 ? first : `${first.slice(0, 2)}${"•".repeat(Math.min(first.length - 2, 8))}`
    return [shown, ...rest].join(".")
  } catch {
    return "•••"
  }
}

const isCompleted = (value) => COMPLETED_STATUSES.includes(String(value ?? "").trim().toLowerCase())
const bar = (label) => `${label} ${"-".repeat(Math.max(0, 62 - label.length))}`

const sql = postgres(match[1], { max: 1, connect_timeout: 30 })
const maskedHost = maskHost(match[1])

try {
  console.log(bar(`status census → ${maskedHost} (SELECT only)`))

  const tasks = await sql`
    select status, count(*)::int as count
    from tasks
    group by status
    order by count(*) desc
  `

  let finishedNow = 0
  let finishedAfter = 0
  for (const row of tasks) {
    const word = String(row.status)
    const countedToday = word.trim().toLowerCase() === "done"
    const countedAfter = isCompleted(word)
    if (countedToday) finishedNow += row.count
    if (countedAfter) finishedAfter += row.count
    console.log(
      `  tasks.status ${JSON.stringify(word)}`.padEnd(34) +
        `${String(row.count).padStart(6)} rows` +
        `${countedAfter ? "  counted finished" : "  open"}` +
        `${countedAfter && !countedToday ? "  ← newly counted" : ""}`,
    )
  }
  console.log(`  finished count: ${finishedNow} → ${finishedAfter} (delta ${finishedAfter - finishedNow})`)
  console.log(`  total task rows: ${tasks.reduce((sum, row) => sum + row.count, 0)}`)

  const templates = await sql`
    select cadence, count(*)::int as count
    from tasks
    where is_template = true
    group by cadence
    order by count(*) desc
  `
  if (templates.length === 0) {
    console.log("  no schedule rows (is_template = true)")
  } else {
    for (const row of templates) {
      console.log(`  schedule cadence ${JSON.stringify(row.cadence)}`.padEnd(34) + `${String(row.count).padStart(6)} rows  excluded from workload counts`)
    }
  }

  const instances = await sql`
    select status, count(*)::int as count
    from task_instances
    group by status
    order by count(*) desc
  `
  let offList = 0
  for (const row of instances) {
    const word = String(row.status)
    // Instance rows are pinned to the PATCH whitelist by ruling P3; anything else here means an
    // import wrote a tasks vocabulary word onto an instance, and the day count would miss it.
    const known = ["todo", "in_progress", "done", "skipped"].includes(word.trim().toLowerCase())
    if (!known) offList++
    console.log(
      `  instance status ${JSON.stringify(word)}`.padEnd(34) +
        `${String(row.count).padStart(6)} rows${known ? "" : "  ← outside the instance whitelist"}`,
    )
  }

  console.log(bar(`census complete — ${offList} instance word(s) outside the whitelist`))
} finally {
  await sql.end()
}
