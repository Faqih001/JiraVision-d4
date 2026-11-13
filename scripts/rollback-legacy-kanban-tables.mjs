// Rebuilds the four retired kanban tables from the snapshot the DROP wrote. Run from the repo root:
//   node scripts/rollback-legacy-kanban-tables.mjs                       # dry run, prints the DDL
//   node scripts/rollback-legacy-kanban-tables.mjs --apply               # recreate and restore
//   node scripts/rollback-legacy-kanban-tables.mjs --apply <snapshot.json>
//
// It restores what production actually held, not what the old creation scripts would have made:
// those seeded five columns (including a "To Do" the live board never had) and omitted the
// sprint_id foreign key. The DDL here comes from format_type and pg_get_constraintdef captured
// at drop time, and the column rows come back with their original ids and orders.
//
// Refuses to run if any of the four tables already exists, so it cannot clobber a live table.
// The connection string is never printed; only a masked host.

import { readFileSync, readdirSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const explicit = args.find((arg) => arg.endsWith(".json"))

function newestSnapshot() {
  const dir = new URL("../backups/", import.meta.url)
  const files = readdirSync(dir).filter((name) => /^kanban-drop-.*\.json$/.test(name)).sort()
  if (files.length === 0) {
    console.error("No backups/kanban-drop-*.json found — nothing to restore from")
    process.exit(1)
  }
  return new URL(`../backups/${files[files.length - 1]}`, import.meta.url)
}

const file = explicit ? new URL(`../${explicit}`, import.meta.url) : newestSnapshot()
const snapshot = JSON.parse(readFileSync(file, "utf8"))

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

// Parent first: kanban_tasks references kanban_columns, and the two child tables reference both.
const CREATE_ORDER = ["kanban_columns", "kanban_tasks", "kanban_task_comments", "kanban_task_attachments"]

function createStatement(table) {
  const columns = snapshot.schema.filter((row) => row.table_name === table)
  // Skip contype 'n' (NOT NULL): already applied per column, and invalid as a table constraint.
  const keys = snapshot.constraints.filter((row) => row.table_name === table && row.contype !== "n")
  const parts = columns.map((column) => {
    let piece = `  "${column.column_name}" ${column.type}`
    if (column.default !== null) piece += ` DEFAULT ${column.default}`
    if (column.not_null) piece += " NOT NULL"
    return piece
  })
  for (const key of keys) parts.push(`  CONSTRAINT "${key.conname}" ${key.def}`)
  return `CREATE TABLE "${table}" (\n${parts.join(",\n")}\n);`
}

function sequencesFor(table) {
  const found = new Set()
  for (const column of snapshot.schema.filter((row) => row.table_name === table)) {
    for (const m of String(column.default ?? "").matchAll(/nextval\('([^']+)'::regclass\)/g)) found.add(m[1])
  }
  return [...found]
}

const sql = postgres(match[1], { max: 1, connect_timeout: 30 })

try {
  console.log(bar(`kanban rollback → ${maskHost(match[1])} (${APPLY ? "APPLY" : "DRY RUN"})`))
  console.log(`  snapshot: ${file.pathname.split("/").pop()}  taken ${snapshot.takenAt}`)

  console.log(bar("statements"))
  for (const table of CREATE_ORDER) {
    for (const sequence of sequencesFor(table)) console.log(`  CREATE SEQUENCE IF NOT EXISTS ${sequence};`)
    console.log(createStatement(table).split("\n").map((l) => `  ${l}`).join("\n"))
    const rows = snapshot.rows[table] ?? []
    console.log(`  -- restore ${rows.length} row(s) into ${table}`)
  }

  // The dry run reads only the snapshot, so it reviews the DDL even when the compute is asleep.
  if (!APPLY) {
    console.log(bar("DRY RUN — nothing was written"))
    process.exit(0)
  }

  const present = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name = any(${CREATE_ORDER})
  `
  if (present.length > 0) {
    console.error(`✗ Refusing to restore: already present — ${present.map((r) => r.table_name).join(", ")}`)
    process.exit(1)
  }

  for (const table of CREATE_ORDER) {
    for (const sequence of sequencesFor(table)) {
      await sql`CREATE SEQUENCE IF NOT EXISTS ${sql(sequence)}`
    }
    await sql.unsafe(createStatement(table))
    console.log(`✓ ${table} recreated`)

    const rows = snapshot.rows[table] ?? []
    if (rows.length > 0) {
      const columns = snapshot.schema.filter((row) => row.table_name === table).map((row) => row.column_name)
      await sql`insert into ${sql(table)} ${sql(rows, ...columns)}`
      console.log(`✓ ${rows.length} row(s) restored into ${table}`)
    }

    for (const sequence of sequencesFor(table)) {
      const [row] = await sql`
        select coalesce(max(id), 1) as max, count(*)::int as count from ${sql(table)}
      `
      await sql`select setval(${sequence}, ${row.max}, ${row.count > 0})`
    }
  }

  console.log(bar("verification"))
  for (const table of CREATE_ORDER) {
    const [row] = await sql`select count(*)::int as count from ${sql(table)}`
    const expected = (snapshot.rows[table] ?? []).length
    const ok = row.count === expected
    console.log(`  ${ok ? "✓" : "✗"} ${table}: ${row.count} row(s), snapshot held ${expected}`)
    if (!ok) process.exit(1)
  }
  console.log(bar("rollback complete — the cluster is back as production held it"))
} finally {
  await sql.end()
}