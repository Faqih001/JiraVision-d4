// Removes the demo workspace the seed scripts created on 2026-10-24: the accounts whose address is
// @example.com, and every row that hangs off them — the tasks they were assigned, the notifications
// they were sent, the goals they owned, the events they organised. The two real accounts (2026-10-28)
// and their work stay.
//
// Run from the repo root:
//   npm run db:purge:demo            rehearsal. The ledgering, the deletes and every check run inside
//                                    one transaction that is then rolled back, so the counts are the
//                                    counts the real run will get and the database is left exactly as
//                                    it was. The row dump it writes is the thing to read before
//                                    applying.
//   npm run db:purge:demo -- --apply the same statements, committed.
//   npm run db:purge:demo -- --restore backups/demo-purge-<stamp>
//                                    replays that dump's rows back, parents first, in one transaction.
//
// Why not the API endpoint: /api/team/members/[id] refuses a member who still owns tasks and, past
// that, cleans a list of tables that does not reach goals, goal_checkins, sprints, user_onboarding,
// ethical_metrics, ai_insights, automation_rules or report_schedules, so it would stop partway. This
// reads the live schema and closes over it: a row goes when it names a demo account, or when the row
// it points at goes and the schema would not have nullled the pointer for us (ON DELETE SET NULL
// columns keep their row — a deliverable survives the task it came from, with the link cleared).
//
// Two passes, because those directions are opposite. Pass one walks parents first and builds one
// ledger temp table per purged table, holding the key children point at — a task has to be recorded
// as gone before the comments on it can be recognised as going, and a cascade child with no user of
// its own (report_runs under a purged report_schedules) is only reachable through its parent's
// ledger. Pass two deletes children first, because a NO ACTION key refuses to outlive its parent,
// which puts users, the root of this schema's graph, last.
//
// Rows are read with to_jsonb(t.*) rather than as driver values so a timestamp is the text the server
// printed; the machine replaying the file cannot shift a `timestamp without time zone` by its own clock.
//
// What it deliberately cannot reach is a table with no owner column at all — sprints, sprint_analytics,
// ethical_metrics, ai_insights, kanban_columns among them. Those are counted and reported, never
// deleted, because "this row belongs to a demo account" is the only claim this script is allowed to
// make about a row.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import postgres from "postgres"
import {
  PURGE_USERS,
  insertStatement,
  ledgerTable,
  purgeClauses,
  quoteIdent,
  quoteText,
  sequenceResetStatement,
  topoDeleteOrder,
} from "./purge-plan.mjs"

const DEMO_EMAIL_PATTERN = "%@example.com"

// Columns that hold a user id but were created by the raw SQL scripts, so they carry no foreign key
// to users and the schema scan cannot find them. Each is checked against the live schema and skipped
// if this database has moved on; anything person-shaped that is NOT covered is printed for a human to
// read rather than quietly deleted.
const LOOSE_PERSON_COLUMNS = [
  { table: "cms_audit_log", column: "user_id" },
  { table: "cms_content_overrides", column: "updated_by" },
  { table: "team_role_audit", column: "member_id" },
  { table: "team_role_audit", column: "changed_by" },
  { table: "team_settings", column: "updated_by" },
]

// Arrays of user ids, which no predicate on a scalar column can see. Rows that survive the purge and
// still name a demo id have the id taken out of the array; the row itself is nobody's to delete.
const PERSON_JSON_COLUMNS = [
  { table: "calendar_events", column: "attendees" },
  { table: "report_schedules", column: "recipients" },
]

// Provenance links: a number that points at a row, with no foreign key to enforce it. Cleared to NULL
// rather than deleting the row that carries it, because the row is the real account's work.
const LOOSE_POINTER_COLUMNS = [{ table: "plan_items", column: "source_task_id", parent: "tasks" }]

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the live one matches.
const urlMatch = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!urlMatch) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const restoreAt = args.indexOf("--restore")
const RESTORE_DIR = restoreAt === -1 ? null : args[restoreAt + 1]

const sql = postgres(urlMatch[1], { max: 1 })

const HOST = (() => {
  try {
    return new URL(urlMatch[1]).hostname.split(".").slice(0, 2).join("-") + "…"
  } catch {
    return "unknown"
  }
})()

class Rehearsal extends Error {}

function valuesList(values, label) {
  return values
    .map((v) => {
      const n = Number(v)
      if (!Number.isInteger(n)) {
        throw new Error(`${label}: refusing to interpolate a non-integer id (${String(v).slice(0, 24)})`)
      }
      return `(${n})`
    })
    .join(", ")
}

async function readSchema() {
  // One row per foreign key. `conkey[1]`/`confkey[1]` is the only pair a single-column ledger can
  // hold; anything composite is counted below and refused, never skipped quietly.
  const edgeRows = await sql`
    select rel.relname as child, att.attname as child_column,
           prel.relname as parent, patt.attname as parent_column,
           array_length(con.conkey, 1) as key_arity,
           case con.confdeltype when 'c' then 'cascade' when 'n' then 'set null' when 'r' then 'restrict'
             when 'a' then 'no action' else con.confdeltype::text end as on_delete
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_class prel on prel.oid = con.confrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    join pg_attribute patt on patt.attrelid = con.confrelid and patt.attnum = con.confkey[1]
    where con.contype = 'f' and ns.nspname = 'public'
    order by rel.relname, att.attname
  `

  const personRows = edgeRows.filter((e) => e.parent === "users")

  const pkRows = await sql`
    select rel.relname as table_name,
           array_agg(att.attname order by x.ord) as column_names
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace and ns.nspname = 'public'
    join unnest(con.conkey) with ordinality x(num, ord) on true
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = x.num
    where con.contype = 'p'
    group by rel.relname
  `

  const columnRows = await sql`
    select c.table_name, c.column_name, c.data_type, c.udt_name, c.column_default
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
    order by c.table_name, c.ordinal_position
  `

  const tableRows = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name
  `

  const columns = new Map()
  for (const row of columnRows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, [])
    columns.get(row.table_name).push({
      name: row.column_name,
      dataType: row.data_type === "ARRAY" ? `${row.udt_name.replace(/^_/, "")}[]` : row.data_type,
      serial: String(row.column_default ?? "").startsWith("nextval("),
    })
  }

  const personColumns = new Map()
  const addPerson = (table, column) => {
    if (!personColumns.has(table)) personColumns.set(table, [])
    if (!personColumns.get(table).includes(column)) personColumns.get(table).push(column)
  }
  for (const r of personRows) addPerson(r.child, r.child_column)
  const present = new Set(columnRows.map((c) => `${c.table_name}.${c.column_name}`))
  const looseStale = []
  for (const l of LOOSE_PERSON_COLUMNS) {
    if (present.has(`${l.table}.${l.column}`)) addPerson(l.table, l.column)
    else looseStale.push(l)
  }
  addPerson("users", "id")

  // anything that looks like it names a person but is neither a users foreign key nor listed above
  const covered = new Set([...personColumns].flatMap(([t, cols]) => cols.map((c) => `${t}.${c}`)))
  const PERSON_NAME =
    /(^|_)(user|owner|author|creator|organizer|organiser|assignee|actor|member|receiver|recipient|sender|inviter|approver|reviewer|reporter|submitter|performer|attendees|participants)(_|$)|_by$/
  const unwatched = columnRows.filter(
    (c) => PERSON_NAME.test(c.column_name) && !covered.has(`${c.table_name}.${c.column_name}`) && c.data_type !== "ARRAY",
  )

  return {
    tables: tableRows.map((r) => r.table_name),
    columns,
    primaryKeys: new Map(pkRows.map((r) => [r.table_name, r.column_names])),
    personColumns,
    edges: edgeRows
      .filter((e) => e.key_arity === 1)
      .map((e) => ({
        child: e.child,
        childColumn: e.child_column,
        parent: e.parent,
        parentColumn: e.parent_column,
        onDelete: e.on_delete,
      })),
    compositeKeys: edgeRows.filter((e) => e.key_arity > 1).map((e) => `${e.child}.${e.child_column}->${e.parent}`),
    unwatched,
    looseStale,
  }
}

async function buildPlan({ apply }) {
  const schema = await readSchema()
  if (schema.compositeKeys.length) {
    throw new Error(`composite foreign keys the ledger cannot hold: ${schema.compositeKeys.join(", ")}`)
  }

  const { order, cyclic } = topoDeleteOrder(schema.edges.map((e) => ({ child: e.child, parent: e.parent })))
  if (cyclic.length) throw new Error(`reference cycle among ${cyclic.join(", ")} — the plan cannot order them`)

  // a table with a person column and no foreign keys at all never appears in the FK graph, and has
  // nothing that could reference it, so it can sit at the end of the parents-first walk
  const parentsFirst = [...order].reverse()
  for (const t of schema.tables) {
    if ((schema.personColumns.get(t) ?? []).length && !parentsFirst.includes(t)) parentsFirst.push(t)
  }
  // the same list, run the other way, so every table pass one counted is the table pass two deletes
  const deleteOrder = [...parentsFirst].reverse()

  const ledgered = new Set()
  const personColumnMap = Object.fromEntries(schema.personColumns)
  // SET NULL pointers keep their row — the deliverable outlives the task, the link clears itself
  const deleteEdges = schema.edges.filter((e) => e.onDelete !== "set null")

  const predicates = new Map()
  const ledgerCols = new Map()
  const sizeBefore = new Map()
  const dump = {}
  const report = []
  const restoreLines = []
  const counts = { demo: 0, survivors: 0 }

  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(`create temp table ${PURGE_USERS} (id integer primary key) on commit drop`)

      const demo = await tx`select id from users where email like ${DEMO_EMAIL_PATTERN} order by id`
      if (!demo.length) throw new Error("nothing to purge: no account matches the demo address pattern")
      const survivors = await tx`select count(*)::int as n from users where email not like ${DEMO_EMAIL_PATTERN}`
      if (!survivors[0].n) {
        throw new Error("refusing: every account matches the demo pattern, so a purge would empty the workspace")
      }
      counts.demo = demo.length
      counts.survivors = survivors[0].n
      await tx.unsafe(`insert into ${PURGE_USERS} (id) values ${valuesList(demo.map((r) => r.id), "demo ids")}`)

      // ---- pass one, parents first: count the rows, write the dump, and ledger the key children use
      for (const table of parentsFirst) {
        const clauses = purgeClauses({ table, personColumns: personColumnMap, edges: deleteEdges, ledgered })
        if (!clauses.length) continue
        const where = clauses.map((c) => c.sql).join(" OR ")

        const rows = await tx.unsafe(`select to_jsonb(t.*) as row from ${quoteIdent(table)} t where ${where}`)
        if (!rows.length) continue
        predicates.set(table, where)
        dump[table] = rows.map((r) => r.row)
        sizeBefore.set(table, (await tx.unsafe(`select count(*)::int as c from ${quoteIdent(table)}`))[0].c)
        report.push({ kind: "delete", table, rows: dump[table].length, by: clauses.map((c) => c.why).join(", ") })

        // every column of this table that a purging child points at. One ledger per column set, so a
        // child's IN (select …) is always against a column that exists in that ledger.
        const refs = [...new Set(deleteEdges.filter((e) => e.parent === table).map((e) => e.parentColumn))]
        const ledgerColumns = refs.length ? refs : schema.primaryKeys.get(table) ?? []
        const known = schema.columns.get(table) ?? []
        const unknown = ledgerColumns.filter((c) => !known.some((k) => k.name === c))
        if (unknown.length) throw new Error(`${table}: columns missing from the schema: ${unknown.join(", ")}`)
        if (ledgerColumns.length) {
          await tx.unsafe(
            `create temp table ${quoteIdent(ledgerTable(table))} on commit drop as ` +
              `select ${ledgerColumns.map(quoteIdent).join(", ")} from ${quoteIdent(table)} t where false`,
          )
          await tx.unsafe(
            `insert into ${quoteIdent(ledgerTable(table))} ` +
              `select distinct ${ledgerColumns.map(quoteIdent).join(", ")} from ${quoteIdent(table)} t where ${where}`,
          )
          ledgerCols.set(table, ledgerColumns)
          ledgered.add(table)
        }

        const pk = schema.primaryKeys.get(table)
        if (!pk?.length) throw new Error(`${table}: no primary key, so its rows cannot be replayed`)
        const lines = dump[table].map((row) => insertStatement({ table, primaryKeys: pk, columns: known, row }))
        if (pk.length === 1 && known.some((c) => c.serial && c.name === pk[0])) {
          lines.push(sequenceResetStatement({ table, column: pk[0] }))
        }
        restoreLines.push(...lines)
      }

      // ---- pass two, children first: run exactly what pass one counted
      for (const table of deleteOrder) {
        if (!predicates.has(table)) continue
        const gone = await tx.unsafe(
          `with removed as (delete from ${quoteIdent(table)} where ${predicates.get(table)} returning 1) ` +
            `select count(*)::int as c from removed`,
        )
        const expected = dump[table].length
        if (gone[0].c !== expected) {
          throw new Error(`${table}: deleted ${gone[0].c} rows but the plan counted ${expected}`)
        }
      }

      for (const j of PERSON_JSON_COLUMNS) {
        const still = await tx.unsafe(
          `select count(*)::int as c from ${quoteIdent(j.table)} ` +
            `where jsonb_typeof(${quoteIdent(j.column)}) = 'array' and ${quoteIdent(j.column)}::text ~ ` +
            `('(^|[^0-9])(' || (select coalesce(string_agg(id::text, '|'), 'no-demo-ids') from ${PURGE_USERS}) || ')([^0-9]|$)')`,
        )
        if (!still[0].c) continue
        await tx.unsafe(
          `update ${quoteIdent(j.table)} set ${quoteIdent(j.column)} = ` +
            `(select coalesce(jsonb_agg(v), '[]'::jsonb) from jsonb_array_elements(${quoteIdent(j.column)}) v ` +
            `where (v #>> '{}') not in (select id::text from ${PURGE_USERS})) ` +
            `where jsonb_typeof(${quoteIdent(j.column)}) = 'array' and ${quoteIdent(j.column)}::text ~ ` +
            `('(^|[^0-9])(' || (select coalesce(string_agg(id::text, '|'), 'no-demo-ids') from ${PURGE_USERS}) || ')([^0-9]|$)')`,
        )
        report.push({ kind: "json", table: `${j.table}.${j.column}`, rows: still[0].c, by: "demo id removed from the array" })
      }

      for (const p of LOOSE_POINTER_COLUMNS) {
        if (!ledgered.has(p.parent)) continue
        const refs = ledgerCols.get(p.parent) ?? []
        if (!refs.includes("id")) continue
        const linked = await tx.unsafe(
          `select count(*)::int as c from ${quoteIdent(p.table)} where ${quoteIdent(p.column)} in ` +
            `(select "id" from ${quoteIdent(ledgerTable(p.parent))})`,
        )
        if (!linked[0].c) continue
        await tx.unsafe(
          `update ${quoteIdent(p.table)} set ${quoteIdent(p.column)} = null where ${quoteIdent(p.column)} in ` +
            `(select "id" from ${quoteIdent(ledgerTable(p.parent))})`,
        )
        report.push({ kind: "link", table: `${p.table}.${p.column}`, rows: linked[0].c, by: `link to a purged ${p.parent} row cleared` })
      }

      const dangling = []
      for (const [table, cols] of schema.personColumns) {
        if (table === "users") continue
        for (const column of cols) {
          const n = await tx.unsafe(
            `select count(*)::int as c from ${quoteIdent(table)} where ${quoteIdent(column)} is not null ` +
              `and ${quoteIdent(column)} not in (select id from users)`,
          )
          if (n[0].c) dangling.push(`${table}.${column}=${n[0].c}`)
        }
      }
      if (dangling.length) throw new Error(`would leave dangling references: ${dangling.join(", ")}`)

      if (!apply) {
        // a rehearsal is the purge and its own undo, in one transaction that is then rolled back. The
        // replay is what proves the restore file: it has to parse, type-check, and land in a
        // parent-before-child order that the foreign keys accept — and put every count back.
        await tx.unsafe(restoreLines.join("\n"))
        for (const [table, rows] of Object.entries(dump)) {
          const now = await tx.unsafe(`select count(*)::int as c from ${quoteIdent(table)}`)
          if (now[0].c !== sizeBefore.get(table)) {
            throw new Error(
              `restoring ${table} left ${now[0].c} rows where the purge started on ${sizeBefore.get(table)} — ` +
                `the replay file is not complete`,
            )
          }
        }
        throw new Rehearsal()
      }
    })
  } catch (error) {
    if (!(error instanceof Rehearsal)) throw error
  }

  return { schema, report, restoreLines, dump, counts }
}

function writeDump({ dir, dump, restoreLines, counts, applied }) {
  const tables = Object.keys(dump) // pass-one order: parents first, so a replay follows it as written
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  writeFileSync(
    `${dir}/manifest.json`,
    JSON.stringify(
      {
        takenAt: new Date().toISOString(),
        host: HOST,
        mode: applied ? "apply" : "rehearsal",
        demoPattern: DEMO_EMAIL_PATTERN,
        demoAccounts: counts.demo,
        accountsKept: counts.survivors,
        tables,
        rows: Object.fromEntries(tables.map((t) => [t, dump[t].length])),
        totalRows: tables.reduce((n, t) => n + dump[t].length, 0),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  )
  writeFileSync(`${dir}/rows.json`, JSON.stringify(dump, null, 2), { mode: 0o600 })
  writeFileSync(
    `${dir}/restore.sql`,
    [
      `-- rows the ${applied ? "purge" : "rehearsal"} of ${new Date().toISOString()} took out of ${HOST}`,
      `-- every statement is ON CONFLICT DO NOTHING, so replaying it twice is harmless.`,
      `-- psql "$DATABASE_URL" -f ${dir}/restore.sql`,
      ``,
      ...restoreLines,
    ].join("\n"),
    { mode: 0o600 },
  )
  return tables
}

async function runRestore(dir) {
  if (!existsSync(`${dir}/manifest.json`)) {
    console.error(`no manifest.json in ${dir} — expected a folder this script wrote`)
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8"))
  const dump = JSON.parse(readFileSync(`${dir}/rows.json`, "utf8"))
  const schema = await readSchema()
  const order = manifest.tables ?? []

  const counts = []
  await sql.begin(async (tx) => {
    for (const table of order) {
      const rows = dump[table]
      if (!rows?.length) continue
      const cols = schema.columns.get(table)
      const pk = schema.primaryKeys.get(table)
      if (!cols || !pk) throw new Error(`table ${table} is gone from the schema — cannot replay ${rows.length} rows`)
      for (const row of rows) {
        await tx.unsafe(insertStatement({ table, primaryKeys: pk, columns: cols, row }))
      }
      for (const c of cols) {
        if (c.serial && pk.includes(c.name)) await tx.unsafe(sequenceResetStatement({ table, column: c.name }))
      }
      counts.push(`${table}=${rows.length}`)
    }
  })

  const [summary] = await sql`
    select (select count(*) from users)::int as accounts, (select count(*) from tasks)::int as tasks
  `
  console.log(`restored ${counts.join(", ") || "nothing"}`)
  console.log(`accounts now ${summary.accounts}, tasks now ${summary.tasks}`)
}

async function main() {
  console.log(`database: ${HOST}`)
  if (RESTORE_DIR) {
    await runRestore(RESTORE_DIR)
    return
  }

  const { schema, report, restoreLines, dump, counts } = await buildPlan({ apply: APPLY })

  const stamp = new Date().toISOString().replaceAll(/[-:]/g, "").slice(0, 15)
  const dir = `backups/demo-purge-${stamp}${APPLY ? "-applied" : ""}`
  writeDump({ dir, dump, restoreLines, counts, applied: APPLY })

  console.log(`\n${counts.demo} demo accounts, ${counts.survivors} others kept`)
  console.log(`plan (${APPLY ? "APPLIED" : "rehearsal"}, ledgered parents first, deleted children first):`)
  for (const r of report) {
    console.log(`  ${r.kind === "delete" ? "delete" : r.kind}  ${r.table.padEnd(30)} ${String(r.rows).padStart(5)}  ${r.by}`)
  }
  const deleted = report.filter((r) => r.kind === "delete")
  console.log(
    `  ${"rows deleted".padEnd(38)} ${String(deleted.reduce((n, r) => n + r.rows, 0)).padStart(5)}  across ${deleted.length} tables`,
  )

  if (APPLY) {
    const [after] = await sql`
      select (select count(*) from users where email like ${DEMO_EMAIL_PATTERN})::int as demo_left,
             (select count(*) from users)::int as accounts,
             (select count(*) from tasks)::int as tasks,
             (select count(*) from notifications)::int as notifications,
             (select count(*) from register_items)::int as register_items
    `
    console.log(
      `committed — demo accounts left ${after.demo_left}, accounts ${after.accounts}, tasks ${after.tasks}, ` +
        `notifications ${after.notifications}, register items ${after.register_items} (kept)`,
    )
  } else {
    console.log(`\nrehearsal: the transaction was rolled back and the database is unchanged.`)
    console.log(`to run it for real:  npm run db:purge:demo -- --apply`)
  }
  console.log(`dump: ${dir}/ — rows.json, restore.sql, manifest.json`)
  console.log(`to put these rows back:  node scripts/purge-demo-data.mjs --restore ${dir}`)

  if (schema.looseStale.length) {
    console.log(`\nno longer in the schema, skipped: ${schema.looseStale.map((l) => `${l.table}.${l.column}`).join(", ")}`)
  }
  if (schema.unwatched.length) {
    console.log(`\nperson-shaped columns the plan does NOT cover (counted, never deleted):`)
    for (const c of schema.unwatched) {
      const hit = await sql.unsafe(
        `select count(*)::int as c from ${quoteIdent(c.table_name)} where ${quoteIdent(c.column_name)}::text in ` +
          `(select id::text from users where email like ${quoteText(DEMO_EMAIL_PATTERN)})`,
      )
      console.log(`  ${c.table_name}.${c.column_name} (${c.data_type}) — ${hit[0].c} row(s) naming a demo id`)
    }
  }

  const leftovers = []
  for (const table of schema.tables) {
    if ((schema.personColumns.get(table) ?? []).length) continue
    const n = await sql.unsafe(`select count(*)::int as c from ${quoteIdent(table)}`)
    if (n[0].c) leftovers.push(`${table}=${n[0].c}`)
  }
  console.log(`\nno owner column, so never touched: ${leftovers.join("  ")}`)
}

main()
  .catch((error) => {
    console.error(error.message ?? error)
    process.exitCode = 1
  })
  .finally(() => sql.end({ timeout: 5 }))
