// Backfills user_onboarding for accounts that existed before the gate did.
//
// Read-only by default — it prints the plan and writes nothing:
//   npm run db:user-onboarding:backfill
// Add --apply to insert the rows:
//   npm run db:user-onboarding:backfill -- --apply
//
// The classification mirrors lib/onboarding/state.ts: a stored status wins; otherwise an
// account created before ONBOARDING_EPOCH_ISO or one with work behind it is completed
// (grandfathered), and everything else starts un-gated as not_started. Existing rows are
// never touched — a member's own decision outranks this script.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const APPLY = process.argv.includes("--apply")

// Keep in sync with ONBOARDING_EPOCH_ISO in lib/onboarding/state.ts.
const EPOCH = "2026-10-27"
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
  const hasTable = await sql
    .unsafe(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${TABLE}'`)
    .then((rows) => rows.length > 0)
  if (APPLY && !hasTable) {
    console.error(`Missing table ${TABLE}. Run "npm run db:user-onboarding" first.`)
    process.exit(1)
  }

  const rows = await sql.unsafe(`
    SELECT u.id,
           u.email,
           u.name,
           u.created_at::text AS created_at,
           u.preferences -> 'settings' -> 'onboarding' ->> 'status' AS stored_status,
           u.preferences -> 'settings' -> 'onboarding' ->> 'step' AS stored_step,
           u.preferences -> 'settings' -> 'onboarding' ->> 'completedAt' AS stored_completed,
           (EXISTS (SELECT 1 FROM tasks t WHERE t.assignee_id = u.id)
            OR EXISTS (SELECT 1 FROM work_log_entries w WHERE w.user_id = u.id)) AS active,
           ${hasTable ? `EXISTS (SELECT 1 FROM ${TABLE} o WHERE o.user_id = u.id)` : "false"} AS has_row
    FROM users u
    ORDER BY u.id
  `)

  const plan = rows.map((row) => {
    const stored = ["not_started", "in_progress", "completed", "skipped"].includes(row.stored_status)
      ? row.stored_status
      : null
    const step = /^\d+$/.test(row.stored_step ?? "") ? Math.min(Number(row.stored_step), 7) : 0
    const createdDay = String(row.created_at).slice(0, 10)
    const grandfathered = !row.active ? createdDay < EPOCH : true

    let status
    if (stored) status = stored
    else if (grandfathered) status = "completed"
    else status = "not_started"

    const storedCompleted =
      row.stored_completed && Number.isFinite(Date.parse(row.stored_completed)) ? row.stored_completed : null

    return {
      userId: row.id,
      email: String(row.email ?? ""),
      name: row.name,
      createdAt: createdDay,
      active: Boolean(row.active),
      stored,
      grandfathered: stored ? false : grandfathered,
      status,
      step: status === "in_progress" ? step : status === "completed" ? 7 : 0,
      completedAt: status === "completed" ? storedCompleted ?? row.created_at : null,
      skipped: status === "skipped",
      hasRow: Boolean(row.has_row),
    }
  })

  for (const entry of plan) {
    const label = entry.hasRow ? "keep existing row" : `insert ${entry.status}`
    const why = entry.hasRow
      ? ""
      : entry.stored
        ? ` (stored: ${entry.stored})`
        : entry.grandfathered
          ? " (grandfathered)"
          : " (never started)"
    console.log(`${String(entry.userId).padStart(3)}  ${(entry.email || "—").padEnd(34)}  ${entry.createdAt}  ${label}${why}`)
  }

  const count = (status) => plan.filter((entry) => !entry.hasRow && entry.status === status).length
  const existing = plan.filter((entry) => entry.hasRow).length
  console.log("")
  console.log(`users: ${plan.length}`)
  console.log(`already have a row (untouched): ${existing}`)
  console.log(`to insert as completed: ${count("completed")}`)
  console.log(`to insert as in_progress: ${count("in_progress")}`)
  console.log(`to insert as not_started: ${count("not_started")}`)
  console.log(`to insert as skipped: ${count("skipped")}`)

  if (!APPLY) {
    console.log("")
    console.log("Dry run. Nothing written. Re-run with -- --apply to insert these rows.")
    process.exit(0)
  }

  const inserts = plan.filter((entry) => !entry.hasRow)
  if (inserts.length === 0) {
    console.log("")
    console.log("Nothing to insert.")
    process.exit(0)
  }

  const values = inserts
    .map((entry) => {
      const started = entry.status === "not_started" ? null : entry.createdAt
      const completed = entry.completedAt ? `'${entry.completedAt}'` : "NULL"
      const skipped = entry.skipped ? `'${entry.createdAt}'` : "NULL"
      return `(${entry.userId}, '${entry.status}', ${entry.step}, 1, 'backfill', ${started ? `'${started}'` : "NULL"}, ${completed}, ${skipped})`
    })
    .join(",\n")

  const inserted = await sql.unsafe(`
    INSERT INTO ${TABLE} (user_id, status, step, version, source, started_at, completed_at, skipped_at)
    VALUES ${values}
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id
  `)

  const [{ count: total }] = await sql.unsafe(`SELECT count(*)::int AS count FROM ${TABLE}`)
  console.log("")
  console.log(`inserted: ${inserted.length}`)
  console.log(`rows in ${TABLE}: ${total}`)
} catch (error) {
  console.error("User onboarding backfill failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
