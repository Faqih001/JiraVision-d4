// Drops the four retired kanban tables. Run from the repo root:
//   node scripts/drop-legacy-kanban-tables.mjs                  # dry run, SELECT only
//   node scripts/drop-legacy-kanban-tables.mjs --snapshot-only   # backup, no DDL
//   node scripts/drop-legacy-kanban-tables.mjs --apply           # snapshot, then DROP
//
// The code that wrote them is gone (commit d3b2ceb): the board at /dashboard/kanban runs on
// /api/tasks, the four /api/dashboard/kanban* routes are deleted, and the sprint/member delete
// handlers no longer unlink kanban rows. Nothing reads or writes these tables any more.
//
// Two things make this safe to run, and both are checked here rather than assumed:
//   1. No foreign key points INTO the cluster from a table outside it. The DROPs run child-first
//      without CASCADE, so an unexpected dependent fails loudly instead of being destroyed.
//   2. The three child tables are empty. If a row appeared since the census, --apply refuses.
//
// Before dropping, --apply writes every row plus the exact production DDL (format_type and
// pg_get_constraintdef, not a reconstruction from the old creation scripts — those seeded five
// columns and lacked the sprint_id key) to backups/kanban-drop-<timestamp>.json.
// scripts/rollback-legacy-kanban-tables.mjs rebuilds from that file.
//
// drizzle-kit push is NOT used. The connection string is never printed; only a masked host.
// .env.local line 1 is a commented stale URL, hence the /^DATABASE_URL=…/m anchor.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
// --snapshot-only exists so the rollback can be exercised against real captured DDL before
// anything is destroyed, rather than being trusted for the first time after the DROP.
const SNAPSHOT_ONLY = process.argv.includes("--snapshot-only")
const WRITE = APPLY || SNAPSHOT_ONLY

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
const DROP_ORDER = ["kanban_task_attachments", "kanban_task_comments", "kanban_tasks", "kanban_columns"]
const CHILDREN = ["kanban_tasks", "kanban_task_comments", "kanban_task_attachments"]

const sql = postgres(match[1], { max: 1, connect_timeout: 30 })

try {
  console.log(bar(`kanban DROP → ${maskHost(match[1])} (${APPLY ? "APPLY" : SNAPSHOT_ONLY ? "SNAPSHOT ONLY, no DDL" : "DRY RUN, SELECT only"})`))

  const present = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name = any(${TABLES})
  `
  const presentNames = new Set(present.map((r) => r.table_name))
  for (const table of TABLES) {
    if (!presentNames.has(table)) {
      console.log(`✓ ${table} is already gone — nothing to do`)
      process.exit(0)
    }
  }

  const counts = {}
  for (const table of TABLES) {
    const [row] = await sql`select count(*)::int as count from ${sql(table)}`
    counts[table] = row.count
    line(`${table} rows`, row.count)
  }

  const columns = await sql`select id, title, color, "order" from kanban_columns order by "order"`
  for (const column of columns) {
    line(`  column ${column.id}: ${column.title}`, `order ${column.order}`)
  }

  console.log(bar("foreign keys pointing into the cluster from outside it"))
  const inward = await sql`
    select conrelid::regclass::text as child, confrelid::regclass::text as parent, conname
    from pg_constraint
    where contype = 'f'
      and confrelid::regclass::text = any(${TABLES})
      and conrelid::regclass::text <> all(${TABLES})
    order by child
  `
  if (inward.length === 0) {
    console.log("  none — the cluster is a leaf, so dropping it cannot orphan a live table")
  } else {
    for (const key of inward) console.log(`  ${key.child} → ${key.parent}  (${key.conname})`)
  }

  const occupied = CHILDREN.filter((table) => counts[table] > 0)
  console.log(bar("statements"))
  for (const table of DROP_ORDER) console.log(`  DROP TABLE IF EXISTS ${table};`)

  if (!WRITE) {
    console.log(bar("DRY RUN — nothing was written"))
    if (inward.length > 0) console.log("✗ --apply would refuse: an outside table still references the cluster")
    if (occupied.length > 0) console.log(`✗ --apply would refuse: ${occupied.join(", ")} no longer empty`)
    if (inward.length === 0 && occupied.length === 0) {
      console.log("✓ --apply would snapshot 4 tables and drop them in the order above")
    }
    process.exit(0)
  }

  if (inward.length > 0) {
    console.error("✗ Refusing to drop: an outside table still references the cluster")
    process.exit(1)
  }
  if (occupied.length > 0) {
    console.error(`✗ Refusing to drop: ${occupied.join(", ")} hold rows that were empty at the census`)
    process.exit(1)
  }

  // Capture the real DDL. format_type renders exactly what production holds, including the
  // varchar lengths, the text[] and jsonb columns, and the timestamptz-vs-timestamp distinction.
  const schema = await sql`
    select
      c.relname as table_name,
      a.attname as column_name,
      format_type(a.atttypid, a.atttypmod) as type,
      a.attnotnull as not_null,
      pg_get_expr(d.adbin, d.adrelid) as default,
      a.attnum
    from pg_class c
    join pg_attribute a on a.attrelid = c.oid
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where c.relname = any(${TABLES}) and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum
  `
  const constraints = await sql`
    select conrelid::regclass::text as table_name, conname, contype, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid::regclass::text = any(${TABLES})
    order by table_name, contype desc
  `
  const rows = {}
  for (const table of TABLES) rows[table] = await sql`select * from ${sql(table)}`

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const file = new URL(`../backups/kanban-drop-${stamp}.json`, import.meta.url)
  mkdirSync(new URL("../backups/", import.meta.url), { recursive: true })
  writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), schema, constraints, rows }, null, 2))
  console.log(`✓ snapshot written to backups/kanban-drop-${stamp}.json`)

  if (SNAPSHOT_ONLY) {
    console.log(bar("snapshot only — no table was dropped"))
    process.exit(0)
  }

  for (const table of DROP_ORDER) {
    await sql`DROP TABLE IF EXISTS ${sql(table)}`
    console.log(`✓ ${table} dropped`)
  }

  const after = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name = any(${TABLES})
  `
  if (after.length > 0) {
    console.error(`✗ Still present after DROP: ${after.map((r) => r.table_name).join(", ")}`)
    process.exit(1)
  }
  console.log(bar("DROP complete — 4 tables removed, 0 rows lost beyond the 4 seed columns"))
} finally {
  await sql.end()
}