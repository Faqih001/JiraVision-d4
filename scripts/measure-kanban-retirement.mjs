// Read-only census of the retired kanban cluster on the production database.
//
// The code that wrote these four tables is gone: the board at /dashboard/kanban runs on /api/tasks,
// and the sprint-delete and member-delete handlers no longer unlink kanban rows. That is only safe
// while no kanban row still points at a live sprint or member — those keys are ON DELETE NO ACTION,
// so a leftover row would turn a delete into SQLSTATE 23503. This script answers that before the
// code ships, and supplies the row counts the DROP itself will be approved against.
//
//   node scripts/measure-kanban-retirement.mjs
//
// SELECT only. There is no --apply flag, no backup and no write path: a read of a count needs no
// checkpoint, and the standing rule governs DDL and writes. Never pair this file with a write, and
// never extend it into one.
//
// The connection string is never printed; only a masked host, so the operator can see which Neon
// endpoint answered. Run from the repo root: .env.local line 1 is a commented stale URL, which is
// why the match is anchored with /^DATABASE_URL=…/m.

import { readFileSync } from "node:fs"
import postgres from "postgres"

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

const bar = (label) => `${label} ${"-".repeat(Math.max(0, 62 - label.length))}`
const line = (label, value) => console.log(`  ${label}`.padEnd(46) + `${value}`.padStart(10))

const TABLES = ["kanban_columns", "kanban_tasks", "kanban_task_comments", "kanban_task_attachments"]

const sql = postgres(match[1], { max: 1, connect_timeout: 30 })

try {
  console.log(bar(`kanban census → ${maskHost(match[1])} (SELECT only)`))

  for (const table of TABLES) {
    const [row] = await sql`select count(*)::int as count from ${sql(table)}`
    line(`${table} rows`, row.count)
  }

  const columns = await sql`select id, title, "order", created_at from kanban_columns order by "order"`
  for (const column of columns) {
    line(`  column ${column.id}: ${column.title}`, `order ${column.order}`)
  }

  // The two keys the retired handlers used to clear. Anything above zero here is a delete that
  // would now fail, and must be resolved before the code ships rather than after a member reports it.
  const sprintLinks = await sql`
    select kt.sprint_id, s.name, count(*)::int as count
    from kanban_tasks kt
    left join sprints s on s.id = kt.sprint_id
    where kt.sprint_id is not null
    group by kt.sprint_id, s.name
    order by kt.sprint_id
  `
  line("kanban_tasks pointing at a sprint", sprintLinks.reduce((sum, r) => sum + r.count, 0))
  for (const link of sprintLinks) {
    line(`  sprint ${link.sprint_id} (${link.name ?? "missing"})`, `${link.count} rows`)
  }

  const memberLinks = await sql`
    select
      (select count(*)::int from kanban_tasks where assignee_id is not null) as tasks,
      (select count(*)::int from kanban_task_comments) as comments,
      (select count(*)::int from kanban_task_attachments) as attachments
  `
  line("kanban_tasks pointing at a member", memberLinks[0].tasks)
  line("kanban_task_comments pointing at a member", memberLinks[0].comments)
  line("kanban_task_attachments pointing at a member", memberLinks[0].attachments)

  // Every foreign key that leaves the cluster, so the census cannot miss a third live parent.
  const outward = await sql`
    select
      conrelid::regclass::text as child,
      confrelid::regclass::text as parent,
      conname
    from pg_constraint
    where contype = 'f'
      and conrelid::regclass::text = any(${TABLES})
      and confrelid::regclass::text <> all(${TABLES})
    order by child, parent
  `
  console.log(bar("foreign keys leaving the cluster"))
  for (const key of outward) {
    console.log(`  ${key.child} → ${key.parent}  (${key.conname})`)
  }

  const blockers =
    sprintLinks.reduce((sum, r) => sum + r.count, 0) +
    memberLinks[0].tasks +
    memberLinks[0].comments +
    memberLinks[0].attachments
  console.log(bar(`census complete — ${blockers} row(s) still reference a live parent`))
} finally {
  await sql.end()
}