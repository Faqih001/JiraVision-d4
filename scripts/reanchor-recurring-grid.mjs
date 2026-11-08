// Re-anchors one schedule's occurrence grid on a given day and ends it at the task's due date.
//
// Why this exists: `POST /api/tasks` used to hand the due date to `generateInitialInstances` as the
// grid's *anchor*, so a weekly schedule made on 2026-11-06 with a due date of 2026-12-18 was born as
// twelve Fridays running 2026-12-18 → 2027-03-05. The kanban draws the day, so it drew no card at
// all on the day the schedule was made. The create door is fixed (commit 474e93c); the rows it
// already wrote are not, and no read can repair them: `horizonDates` never invents a date in the
// past, and the new due-date cap stops it writing anything at all once the tail is 2026-12-18.
//
// The dates come from the real engine — `computeInstanceDates` in lib/tasks/recurrence.ts, loaded
// through a `@/` resolve hook — so this script cannot disagree with the app about which Fridays
// exist. Nothing here re-implements cadence stepping or the weekend rule.
//
// A row that carries work is never deleted. Anything past the new grid that is not a plain 'todo'
// with no notes, no completion and no checklist answers blocks the whole run and is printed.
//
// Run from the repo root:
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/reanchor-recurring-grid.mjs --task 142 --from 2026-11-06
//       rehearsal: SELECTs only, prints the keep/delete/insert sets and the statements --apply
//       would run. Writes nothing.
//   ... --apply
//       those statements in one transaction, after writing backups/reanchor-grid-<stamp>/before.json
//   ... --restore backups/reanchor-grid-<stamp>
//       replays that dump: removes the inserted rows, puts the deleted rows back with their
//       original ids and values, restores tasks.start_date.
//
// --from is the first day the series occupies. --task's due date is the last. Both are required;
// a schedule with no due date is refused rather than handed an open-ended grid.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { pathToFileURL } from "node:url"
import postgres from "postgres"

const ROOT = process.cwd()

// The engine is TypeScript behind the `@/` alias; Node strips the types itself, it just needs the
// specifier resolved. These three modules import nothing, so the hook is the whole loader.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(pathToFileURL(`${ROOT}/${specifier.slice(2)}.ts`).href, context)
    }
    return nextResolve(specifier, context)
  },
})
const { computeInstanceDates } = await import("../lib/tasks/recurrence.ts")

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : (process.argv[i + 1] ?? null)
}

const APPLY = process.argv.includes("--apply")
const RESTORE_DIR = arg("--restore")
const TASK_ID = Number(arg("--task"))
const FROM = arg("--from")
const DAY = /^\d{4}-\d{2}-\d{2}$/

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

if (!RESTORE_DIR) {
  if (!Number.isInteger(TASK_ID) || TASK_ID <= 0) fail("--task <id> is required")
  if (!DAY.test(FROM ?? "") || Number.isNaN(Date.parse(`${FROM}T00:00:00Z`))) {
    fail("--from <YYYY-MM-DD> is required, and must be a real date")
  }
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the live one matches.
const urlMatch = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!urlMatch) fail("DATABASE_URL not found in .env.local")

function maskHost(url) {
  try {
    const u = new URL(url)
    const label = u.hostname.split(".")[0]
    return `${label.slice(0, 3)}***.${u.hostname.split(".").slice(1).join(".")}`
  } catch {
    return "<unparseable>"
  }
}

const sql = postgres(urlMatch[1], { max: 1 })

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const dayName = (iso) => WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()]

// A row is untouched when it is a plain 'todo' with nothing anybody wrote on it. Mirrors the
// conservative rule scripts/reconcile-recurring-tasks.mjs uses for weekend rows.
function isUntouched(row) {
  const checklist = row.checklist_responses
  const emptyChecklist =
    checklist == null ||
    (Array.isArray(checklist) && checklist.length === 0) ||
    checklist === "[]"
  return (
    row.status === "todo" &&
    !row.notes &&
    row.completed_at === null &&
    row.completed_by === null &&
    emptyChecklist
  )
}

try {
  console.log(`\nreanchor-recurring-grid — ${APPLY ? "APPLY" : "REHEARSAL (read-only)"}`)
  console.log(`host: ${maskHost(urlMatch[1])}\n`)

  if (RESTORE_DIR) {
    if (!existsSync(`${RESTORE_DIR}/before.json`)) fail(`no before.json in ${RESTORE_DIR}`)
    const before = JSON.parse(readFileSync(`${RESTORE_DIR}/before.json`, "utf8"))

    // A restore deletes the rows the apply inserted. If somebody has since worked one of them,
    // that work is not this script's to throw away.
    if (before.inserted.length) {
      const inserted = await sql`
        select id, instance_date::text as instance_date, status, notes,
               completed_at, completed_by, checklist_responses
          from task_instances
         where task_id = ${before.task.id}
           and instance_date = any(${before.inserted}::date[])`
      const worked = inserted.filter((r) => !isUntouched(r))
      if (worked.length) {
        console.log("these inserted rows now carry work — restore refused, nothing written")
        for (const r of worked) {
          console.log(`  #${r.id}  ${r.instance_date}  status=${r.status}  notes=${r.notes ? "yes" : "no"}  completed_at=${r.completed_at ? "set" : "null"}`)
        }
        console.log()
        await sql.end()
        process.exit(1)
      }
    }

    await sql.begin(async (tx) => {
      if (before.inserted.length) {
        await tx`
          delete from task_instances
           where task_id = ${before.task.id}
             and instance_date = any(${before.inserted}::date[])`
      }
      for (const row of before.deleted) {
        await tx`
          insert into task_instances
            (id, task_id, instance_date, status, completed_at, completed_by, notes,
             checklist_responses, created_at)
          values
            (${row.id}, ${row.task_id}, ${row.instance_date}, ${row.status},
             ${row.completed_at}, ${row.completed_by}, ${row.notes},
             ${JSON.stringify(row.checklist_responses ?? [])}::jsonb, ${row.created_at})`
      }
      if (before.deleted.length) {
        await tx`
          select setval(
            pg_get_serial_sequence('task_instances', 'id'),
            (select max(id) from task_instances))`
      }
      await tx`
        update tasks
           set start_date = ${before.task.start_date},
               updated_at = ${before.task.updated_at}
         where id = ${before.task.id}`
    })
    console.log(
      `restored task #${before.task.id}: removed ${before.inserted.length} inserted rows, ` +
        `put back ${before.deleted.length} deleted rows, start_date = ${before.task.start_date ?? "null"}\n`,
    )
  } else {
    const [task] = await sql`
      select id, title, cadence, is_template, status, assignee_id,
             due_date::text as due_date, start_date::text as start_date,
             to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS.US') as updated_at
        from tasks
       where id = ${TASK_ID}`

    if (!task) fail(`no task #${TASK_ID}`)
    if (!task.cadence || task.cadence === "one-off") fail(`task #${TASK_ID} is not a schedule (cadence=${task.cadence})`)
    if (!task.is_template) fail(`task #${TASK_ID} carries cadence=${task.cadence} but is_template=false — run scripts/reconcile-recurring-tasks.mjs first`)
    if (!task.due_date) fail(`task #${TASK_ID} has no due date, so the series has no end to stop at`)

    console.log(`task #${task.id}  ${task.title}`)
    console.log(`  cadence ${task.cadence}   status ${task.status}   assignee ${task.assignee_id ?? "none"}`)
    console.log(`  start_date ${task.start_date ?? "null"}   due_date ${task.due_date}`)
    console.log(`  new anchor ${FROM} (${dayName(FROM)})\n`)

    // The engine owns the dates. A weekend anchor rolls to the Monday, exactly as a create would.
    const target = computeInstanceDates(task.cadence, new Date(`${FROM}T00:00:00Z`), task.due_date)
    if (target.length === 0) {
      fail(`the engine produced no dates for ${task.cadence} from ${FROM} to ${task.due_date} — nothing to write`)
    }
    if (target[0] !== FROM) {
      console.log(`  note: ${FROM} is a ${dayName(FROM)}, so the engine rolls the first occurrence to ${target[0]} (${dayName(target[0])})\n`)
    }

    // Timestamps are read as the exact text Postgres stores, so a restore writes back the same
    // value rather than a Date round-tripped through the driver's local timezone.
    const rows = await sql`
      select id, task_id, instance_date::text as instance_date, status,
             to_char(completed_at, 'YYYY-MM-DD HH24:MI:SS.US') as completed_at,
             completed_by, notes, checklist_responses,
             to_char(created_at, 'YYYY-MM-DD HH24:MI:SS.US') as created_at
        from task_instances
       where task_id = ${TASK_ID}
       order by instance_date, id`

    const targetSet = new Set(target)
    const held = new Map(rows.map((r) => [r.instance_date, r]))

    const keep = rows.filter((r) => targetSet.has(r.instance_date))
    const outside = rows.filter((r) => !targetSet.has(r.instance_date))
    const toDelete = outside.filter(isUntouched)
    const blocked = outside.filter((r) => !isUntouched(r))
    const toInsert = target.filter((d) => !held.has(d))

    console.log(`the grid as it stands — ${rows.length} rows`)
    for (const r of rows) {
      const verdict = targetSet.has(r.instance_date) ? "keep  " : isUntouched(r) ? "DELETE" : "BLOCK "
      console.log(
        `  ${verdict}  ${r.instance_date} (${dayName(r.instance_date)})  #${String(r.id).padEnd(5)} ${r.status.padEnd(12)}${r.notes ? "  has notes" : ""}${r.completed_at ? "  completed" : ""}`,
      )
    }
    if (rows.length === 0) console.log("  (empty)")

    console.log(`\nthe grid the engine gives — ${target.length} occurrences, ${target[0]} → ${target[target.length - 1]}`)
    for (const d of target) {
      console.log(`  ${held.has(d) ? "exists " : "INSERT "}  ${d} (${dayName(d)})`)
    }

    console.log("\nwhat would change")
    console.log(`  keep as they are            ${keep.length} rows`)
    console.log(`  delete (outside the series) ${toDelete.length} rows`)
    console.log(`  insert (missing occurrence) ${toInsert.length} rows`)
    console.log(`  tasks.start_date            ${task.start_date ?? "null"} -> ${FROM}`)
    console.log(`  blocked by somebody's work  ${blocked.length} rows\n`)

    if (blocked.length) {
      console.log("these rows are outside the new series but carry work — nothing is written until they are dealt with by hand")
      for (const r of blocked) {
        console.log(`  #${r.id}  ${r.instance_date}  status=${r.status}  notes=${r.notes ? "yes" : "no"}  completed_at=${r.completed_at ?? "null"}  completed_by=${r.completed_by ?? "null"}`)
      }
      console.log("\nrehearsal ran no writes — the database is exactly as it was.\n")
      await sql.end()
      process.exit(1)
    }

    if (toDelete.length === 0 && toInsert.length === 0 && task.start_date === FROM) {
      console.log("nothing to do — the grid already matches the series.\n")
      await sql.end()
      process.exit(0)
    }

    const deleteIds = toDelete.map((r) => r.id)

    if (!APPLY) {
      console.log("statements --apply would run")
      if (deleteIds.length) {
        console.log(`  delete from task_instances where id = any(${JSON.stringify(deleteIds)})`)
      }
      if (toInsert.length) {
        console.log(`  insert into task_instances (task_id, instance_date, status) values`)
        for (const d of toInsert) console.log(`    (${TASK_ID}, '${d}', 'todo')`)
      }
      console.log(`  update tasks set start_date = '${FROM}', updated_at = now() where id = ${TASK_ID}`)
      console.log(
        `\n  ${deleteIds.length} rows deleted + ${toInsert.length} rows inserted, ` +
          "backup written to backups/reanchor-grid-<stamp>/before.json",
      )
      console.log("rehearsal ran no writes — the database is exactly as it was.")
      console.log("re-run with --apply to commit these changes.\n")
      await sql.end()
      process.exit(0)
    }

    // The backup is written before the transaction, not after: a rollback is only possible if the
    // before-values are already on disk.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const dir = `backups/reanchor-grid-${stamp}`
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      `${dir}/before.json`,
      JSON.stringify(
        {
          task: { id: task.id, start_date: task.start_date, updated_at: task.updated_at },
          deleted: toDelete,
          inserted: toInsert,
        },
        null,
        2,
      ),
    )
    writeFileSync(
      `${dir}/RESTORE.md`,
      `# Restore\n\nBefore-values for task #${task.id}: ${toDelete.length} deleted task_instances rows, ${toInsert.length} inserted dates, and the previous start_date.\n\n\`\`\`\nnode --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/reanchor-recurring-grid.mjs --restore ${dir}\n\`\`\`\n`,
    )

    await sql.begin(async (tx) => {
      if (deleteIds.length) {
        // By id, and only while still untouched, so a row somebody works on between the rehearsal
        // and the apply is left alone rather than deleted.
        await tx`
          delete from task_instances
           where id = any(${deleteIds})
             and status = 'todo'
             and notes is null
             and completed_at is null
             and completed_by is null
             and (checklist_responses is null or checklist_responses = '[]'::jsonb)`
      }
      if (toInsert.length) {
        for (const d of toInsert) {
          await tx`
            insert into task_instances (task_id, instance_date, status)
            values (${TASK_ID}, ${d}, 'todo')
            on conflict (task_id, instance_date) do nothing`
        }
      }
      await tx`
        update tasks
           set start_date = ${FROM},
               updated_at = now()
         where id = ${TASK_ID}`
    })

    const after = await sql`
      select instance_date::text as instance_date, status
        from task_instances
       where task_id = ${TASK_ID}
       order by instance_date`

    const afterDates = after.map((r) => r.instance_date)
    const matches =
      afterDates.length === target.length && afterDates.every((d, i) => d === target[i])

    console.log("applied.")
    console.log(`  rows on the grid now  ${after.length}`)
    console.log(`  dates                 ${afterDates.join(", ") || "(none)"}`)
    console.log(`  matches the engine    ${matches ? "yes" : "NO — read this before using the board"}`)
    console.log(`  tasks.start_date      ${FROM}`)
    console.log(`  backup                ${dir}\n`)
    if (!matches) process.exitCode = 1
  }
} catch (err) {
  console.error("failed:", err.message)
  process.exitCode = 1
} finally {
  await sql.end()
}