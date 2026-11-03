// Import the owner's IT Technician Task Import List (41 tasks, 2026-11-03) as the
// canonical task set for fakiiahmad001@gmail.com, replacing that user's existing tasks
// AFTER a full JSON backup under backups/. Additive + replace only; nothing else in
// the database is touched. work_log_entries rows survive by FK design (task_id → NULL).
//
//   node scripts/import-it-technician-tasks.mjs --dry-run
//   node scripts/import-it-technician-tasks.mjs --apply
//   node scripts/import-it-technician-tasks.mjs --restore backups/it-tasks-backup-<stamp>.json
//
// --apply refuses to run unless the backup file is written first, and refuses to
// double-import: if the account already carries any of the 41 titles it aborts.
// Run from the repo root.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import postgres from "postgres"

const OWNER_EMAIL = "fakiiahmad001@gmail.com"
const DISCIPLINE = "it_operations"
// The list's own defaults: every task starts in Backlog (sprint_id NULL, same as
// app/api/tasks and the board's Backlog bucket) and To do.
const STATUS = "todo"
const SPRINT_ID = null
const INSTANCE_COUNTS = { "one-off": 0, daily: 30, weekly: 12, monthly: 12, yearly: 4 }
const PRIORITIES = new Set(["urgent", "high", "medium", "low"])
const CADENCES = new Set(Object.keys(INSTANCE_COUNTS))

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
const RESTORE_AT = process.argv.indexOf("--restore")
const RESTORE_FILE = RESTORE_AT >= 0 ? process.argv[RESTORE_AT + 1] : null
if (!APPLY && !RESTORE_FILE && !process.argv.includes("--dry-run")) {
  console.error("Pass --dry-run, --apply, or --restore <backup.json> explicitly.")
  process.exit(1)
}
if (APPLY && RESTORE_FILE) {
  console.error("--apply and --restore are mutually exclusive.")
  process.exit(1)
}

function loadTasks() {
  const tasks = JSON.parse(readFileSync(new URL("./data/it-technician-tasks.json", import.meta.url), "utf8"))
  if (!Array.isArray(tasks) || tasks.length !== 41) throw new Error(`expected 41 tasks, got ${tasks.length}`)
  const seen = new Set()
  for (const t of tasks) {
    if (!t.title?.trim() || !t.description?.trim()) throw new Error(`task ${t.seq}: empty title/description`)
    if (!PRIORITIES.has(t.priority)) throw new Error(`task ${t.seq}: bad priority ${t.priority}`)
    if (!CADENCES.has(t.cadence)) throw new Error(`task ${t.seq}: bad cadence ${t.cadence}`)
    if (!Array.isArray(t.tags) || t.tags.length === 0) throw new Error(`task ${t.seq}: tags missing`)
    if (seen.has(t.title)) throw new Error(`duplicate title: ${t.title}`)
    seen.add(t.title)
  }
  return tasks
}

// Mirrors lib/cadence.ts computeNextRun + lib/tasks/recurrence.ts computeInstanceDates:
// UTC arithmetic, first instance dated `from`, cadence steps after.
function instanceDates(cadence, from) {
  const count = INSTANCE_COUNTS[cadence] ?? 0
  const dates = []
  const cursor = new Date(from)
  for (let i = 0; i < count; i++) {
    dates.push(cursor.toISOString().slice(0, 10))
    const next = new Date(cursor)
    if (cadence === "daily") next.setUTCDate(next.getUTCDate() + 1)
    else if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7)
    else if (cadence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1)
    else if (cadence === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1)
    else break
    cursor.setTime(next.getTime())
  }
  return dates
}

async function readUserRows(sql, userId) {
  const [tasks, instances, events, worklogs] = await Promise.all([
    sql`SELECT * FROM tasks WHERE assignee_id = ${userId} ORDER BY id`,
    sql`SELECT ti.* FROM task_instances ti JOIN tasks t ON t.id = ti.task_id WHERE t.assignee_id = ${userId} ORDER BY ti.id`,
    sql`SELECT te.* FROM task_events te JOIN tasks t ON t.id = te.task_id WHERE t.assignee_id = ${userId} ORDER BY te.id`,
    sql`SELECT * FROM work_log_entries WHERE user_id = ${userId} ORDER BY id`,
  ])
  return { tasks, instances, events, worklogs }
}

async function restore(sql, dump) {
  const [user] = await sql`SELECT id FROM users WHERE email = ${OWNER_EMAIL} LIMIT 1`
  if (!user) throw new Error(`account ${OWNER_EMAIL} not found`)
  const clash = await sql`SELECT count(*)::int AS n FROM tasks WHERE assignee_id = ${user.id}`
  if (clash[0].n > 0) {
    throw new Error(`restore aborted: account already has ${clash[0].n} tasks; delete them before restoring`)
  }
  await sql.begin(async (tx) => {
    for (const t of dump.tasks) {
      await tx`INSERT INTO tasks (id, title, description, status, priority, story_points, assignee_id,
        sprint_id, due_date, tags, created_at, updated_at, start_date, discipline, source_plan_id,
        metadata, cadence, parent_task_id, is_template, checklist_items)
        VALUES (${t.id}, ${t.title}, ${t.description}, ${t.status}, ${t.priority}, ${t.story_points},
        ${t.assignee_id}, ${t.sprint_id}, ${t.due_date}, ${tx.json(t.tags ?? [])}, ${t.created_at},
        ${t.updated_at}, ${t.start_date}, ${t.discipline}, ${t.source_plan_id}, ${tx.json(t.metadata ?? {})},
        ${t.cadence}, ${t.parent_task_id}, ${t.is_template}, ${tx.json(t.checklist_items ?? [])})`
    }
    for (const i of dump.task_instances) {
      await tx`INSERT INTO task_instances (id, task_id, instance_date, status, completed_at, completed_by,
        notes, checklist_responses, created_at)
        VALUES (${i.id}, ${i.task_id}, ${i.instance_date}, ${i.status}, ${i.completed_at}, ${i.completed_by},
        ${i.notes}, ${tx.json(i.checklist_responses ?? [])}, ${i.created_at})`
    }
    for (const e of dump.task_events) {
      await tx`INSERT INTO task_events (id, task_id, user_id, event_type, old_value, new_value, created_at)
        VALUES (${e.id}, ${e.task_id}, ${e.user_id}, ${e.event_type}, ${e.old_value}, ${e.new_value}, ${e.created_at})`
    }
    await tx`SELECT setval(pg_get_serial_sequence('tasks', 'id'), (SELECT COALESCE(MAX(id), 1) FROM tasks))`
    await tx`SELECT setval(pg_get_serial_sequence('task_instances', 'id'), (SELECT COALESCE(MAX(id), 1) FROM task_instances))`
    await tx`SELECT setval(pg_get_serial_sequence('task_events', 'id'), (SELECT COALESCE(MAX(id), 1) FROM task_events))`
  })
  // Rewire worklog links the delete's SET NULL dropped, by original task id.
  for (const w of dump.work_log_entries ?? []) {
    if (w.task_id == null) continue
    await sql`UPDATE work_log_entries SET task_id = ${w.task_id} WHERE id = ${w.id}`
  }
  console.log(
    `Restored from the backup: ${dump.tasks.length} tasks, ${dump.task_instances.length} instances, ` +
      `${dump.task_events.length} events, worklog links rewired for ` +
      `${dump.work_log_entries?.filter((w) => w.task_id != null).length ?? 0} rows.`
  )
}

async function main() {
  const tasks = RESTORE_FILE ? null : loadTasks()
  const sql = postgres(match[1], { max: 1, connect_timeout: 30 })

  try {
    if (RESTORE_FILE) {
      await restore(sql, JSON.parse(readFileSync(RESTORE_FILE, "utf8")))
      return
    }

    const [user] = await sql`SELECT id, name FROM users WHERE email = ${OWNER_EMAIL} LIMIT 1`
    if (!user) {
      console.error(`Account ${OWNER_EMAIL} not found — aborting.`)
      process.exit(1)
    }
    const current = await readUserRows(sql, user.id)
    const alreadyImported = current.tasks.filter((t) => tasks.some((x) => x.title === t.title))

    const forecast = tasks.reduce(
      (acc, t) => {
        acc[t.cadence] += 1
        acc.instances += instanceDates(t.cadence, new Date()).length
        return acc
      },
      { "one-off": 0, daily: 0, weekly: 0, monthly: 0, yearly: 0, instances: 0 }
    )

    console.log(`Account: ${user.id} (${user.name} <${OWNER_EMAIL}>)`)
    console.log(`Database: ${match[1].replace(/^[^@]*@/, "").split("/")[0]}`)
    console.log(
      `Current rows: ${current.tasks.length} tasks, ${current.instances.length} instances, ` +
        `${current.events.length} events, ${current.worklogs.length} worklog entries`
    )
    if (alreadyImported.length > 0) console.log(`NOTE: ${alreadyImported.length} of the 41 titles already exist on this account.`)
    console.log(
      `To import: 41 tasks (daily ${forecast.daily}, weekly ${forecast.weekly}, monthly ${forecast.monthly}, ` +
        `one-off ${forecast["one-off"]}) + ${forecast.instances} task instances`
    )
    console.log("Worklog entries are never deleted; their task links reset to NULL (history stays readable).")

    if (!APPLY) {
      console.log("Dry run only — nothing changed. Re-run with --apply.")
      return
    }
    if (alreadyImported.length > 0) {
      console.error("Refusing to double-import. Restore from a backup first or clear the tasks.")
      process.exit(1)
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".").join("")
    const backupFile = `backups/it-tasks-backup-${stamp}.json`
    const backup = {
      takenAt: new Date().toISOString(),
      databaseUrlHost: match[1].replace(/^[^@]*@/, "").split("/")[0],
      userId: user.id,
      userEmail: OWNER_EMAIL,
      counts: {
        tasks: current.tasks.length,
        task_instances: current.instances.length,
        task_events: current.events.length,
        work_log_entries: current.worklogs.length,
      },
      tasks: current.tasks,
      task_instances: current.instances,
      task_events: current.events,
      work_log_entries: current.worklogs,
    }
    mkdirSync("backups", { recursive: true })
    writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    const written = JSON.parse(readFileSync(backupFile, "utf8"))
    if (written.tasks.length !== current.tasks.length) {
      console.error(`Backup verification failed (${written.tasks.length}/${current.tasks.length}) — aborting before any delete.`)
      process.exit(1)
    }
    console.log(`Backup written: ${backupFile}`)

    await sql.begin(async (tx) => {
      await tx`DELETE FROM task_events WHERE task_id IN (SELECT id FROM tasks WHERE assignee_id = ${user.id})`
      await tx`DELETE FROM task_instances WHERE task_id IN (SELECT id FROM tasks WHERE assignee_id = ${user.id})`
      await tx`DELETE FROM tasks WHERE assignee_id = ${user.id}`
      const anchor = new Date()
      for (const t of tasks) {
        const [row] = await tx`
          INSERT INTO tasks (title, description, status, priority, story_points, assignee_id, sprint_id,
            tags, discipline, cadence)
          VALUES (${t.title}, ${t.description}, ${STATUS}, ${t.priority}, ${t.storyPoints}, ${user.id},
            ${SPRINT_ID}, ${tx.json(t.tags)}, ${DISCIPLINE}, ${t.cadence})
          RETURNING id`
        const dates = instanceDates(t.cadence, anchor)
        for (const d of dates) {
          await tx`INSERT INTO task_instances (task_id, instance_date, status) VALUES (${row.id}, ${d}, ${STATUS})`
        }
      }
    })

    const after = await readUserRows(sql, user.id)
    const orphans = await sql`SELECT count(*)::int AS n FROM work_log_entries WHERE user_id = ${user.id} AND task_id IS NOT NULL`
    console.log(`Applied: ${after.tasks.length} tasks, ${after.instances.length} instances, ${after.events.length} events.`)
    console.log(`Worklog rows still linked to a task: ${orphans[0].n} (expected 0 — task links were reset to NULL).`)
  } catch (error) {
    console.error("IT technician import failed:", error.message ?? error)
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main()
