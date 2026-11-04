// Restores the one invariant the recurrence model assumes and the 2026-11-03 IT import broke:
// a task is a schedule exactly when it carries a cadence — `is_template = (cadence <> 'one-off')`.
//
// Every writer in the app maintains that pairing (`lib/task-updates.ts` derives `is_template`
// from `cadence` and ignores a body that sets the flag directly; `promoteTaskValues` does the
// same). The import wrote cadences without the flag, so 32 rows arrived as schedules the schema
// calls one-offs. Three surfaces then disagree about them:
//
//   - the dashboard and workload counts exclude `is_template = true`, so those 32 still count as
//     open work;
//   - the kanban, the tasks page and `recurringStatusError` all test the *cadence*, so they refuse
//     to let that open work ever be finished;
//   - the calendar's bounded horizon top-up only writes grids for `is_template = true`, so those
//     32 grids run out and stop growing.
//
// The net effect is a card you cannot close and a grid that silently dies. Flipping the flag is
// the whole fix for the first and third; the second is already correct.
//
// A schedule must also not be finished — closing one would delete the schedule it describes, which
// is why the app refuses the patch. Rows already at a completed word are reopened to `in_progress`
// ("this schedule is running"), the only honest open state for a row whose own status no longer
// participates in any count.
//
// Grids are NOT written here. `ensureInstanceHorizon` lives in TypeScript and is already called,
// bounded, by the calendar read (25 schedules per request, 90 occurrences each); duplicating the
// engine in SQL would give the dates two authors. The rows this script flips start growing on the
// next calendar or task-instances read.
//
// Run from the repo root:
//   node scripts/reconcile-recurring-tasks.mjs            rehearsal: SELECTs only, prints the exact
//                                                         row counts and the two UPDATE statements
//                                                         --apply would run. Writes nothing.
//   node scripts/reconcile-recurring-tasks.mjs --apply    those two statements in one transaction,
//                                                         after writing backups/reconcile-recurring-<stamp>.
//   node scripts/reconcile-recurring-tasks.mjs --restore backups/reconcile-recurring-<stamp>
//                                                         replays that dump's before-values.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import postgres from "postgres"

const APPLY = process.argv.includes("--apply")
const restoreIdx = process.argv.indexOf("--restore")
const RESTORE_DIR = restoreIdx === -1 ? null : process.argv[restoreIdx + 1]

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the live one matches.
const urlMatch = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!urlMatch) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

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

// The words the app treats as finished, mirrored from lib/tasks/statuses.ts. A guard test pins the
// two lists together; this script must never be the only place one of them is written.
const COMPLETED_STATUSES = ["done", "completed", "closed"]
const REOPEN_TO = "in_progress"

function bar(n, total, width = 28) {
  if (total <= 0) return ""
  const filled = Math.round((n / total) * width)
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`
}

try {
  console.log(`\nreconcile-recurring-tasks — ${APPLY ? "APPLY" : "REHEARSAL (rolls back)"}`)
  console.log(`host: ${maskHost(urlMatch[1])}\n`)

  if (RESTORE_DIR) {
    if (!existsSync(`${RESTORE_DIR}/before.json`)) {
      console.error(`no before.json in ${RESTORE_DIR}`)
      process.exit(1)
    }
    const before = JSON.parse(readFileSync(`${RESTORE_DIR}/before.json`, "utf8"))
    await sql.begin(async (tx) => {
      for (const row of before) {
        await tx`
          update tasks
             set is_template = ${row.is_template},
                 status      = ${row.status},
                 updated_at  = ${row.updated_at}
           where id = ${row.id}`
      }
    })
    console.log(`restored ${before.length} tasks rows from ${RESTORE_DIR}`)
  } else {
    // ---- what is there now -------------------------------------------------
    const pairs = await sql`
      select cadence, is_template, count(*)::int as n
        from tasks
       group by cadence, is_template
       order by cadence, is_template`

    console.log("cadence × is_template as it stands")
    const pairTotal = pairs.reduce((s, r) => s + r.n, 0)
    for (const r of pairs) {
      const flag = r.is_template ? "template" : "one-off flag"
      const wrong = r.cadence !== "one-off" && !r.is_template
      console.log(
        `  ${r.cadence.padEnd(10)} ${flag.padEnd(13)} ${String(r.n).padStart(3)}  ${bar(r.n, pairTotal)}${wrong ? "   <-- violates the invariant" : ""}`,
      )
    }
    console.log(`  ${"total".padEnd(24)} ${String(pairTotal).padStart(3)}\n`)

    // ---- the rows this script would touch ----------------------------------
    const toFlag = await sql`
      select id, title, cadence, status, assignee_id, is_template
        from tasks
       where cadence is not null
         and cadence <> 'one-off'
         and is_template = false
       order by id`

    const toReopen = await sql`
      select id, title, cadence, status, assignee_id, is_template
        from tasks
       where cadence is not null
         and cadence <> 'one-off'
         and status = any(${COMPLETED_STATUSES})
       order by id`

    const opposite = await sql`
      select id, title, cadence, status
        from tasks
       where is_template = true
         and (cadence is null or cadence = 'one-off')
       order by id`

    const grids = await sql`
      select t.id, count(i.id)::int as instances,
             min(i.instance_date)::text as oldest,
             max(i.instance_date)::text as newest
        from tasks t
        left join task_instances i on i.task_id = t.id
       where t.cadence is not null and t.cadence <> 'one-off'
       group by t.id
       order by t.id`

    const emptyGrids = grids.filter((g) => g.instances === 0)
    const instanceTotal = grids.reduce((s, g) => s + g.instances, 0)

    const weekendRows = await sql`
      select count(*)::int as n
        from task_instances
       where extract(isodow from instance_date) >= 6`

    console.log("what would change")
    console.log(`  flip is_template false -> true   ${toFlag.length} tasks`)
    console.log(`  reopen a finished schedule       ${toReopen.length} tasks  (-> ${REOPEN_TO})`)
    console.log(`  template flagged with no cadence ${opposite.length} tasks  (left alone; reported)`)
    console.log(`  schedules with an empty grid     ${emptyGrids.length} of ${grids.length}  (grow on the next calendar read)`)
    console.log(`  instance rows already on the grid ${instanceTotal}`)
    console.log(`  instance rows dated Sat/Sun      ${weekendRows[0].n}  (NOT touched by this script)\n`)

    if (toReopen.length) {
      console.log("the schedules that would be reopened")
      for (const r of toReopen) {
        console.log(`  #${r.id}  ${r.status.padEnd(10)} -> ${REOPEN_TO.padEnd(12)} ${r.cadence.padEnd(9)} ${String(r.title).slice(0, 52)}`)
      }
      console.log()
    }

    if (opposite.length) {
      console.log("flagged as a template but carrying no cadence — read these, they are not auto-fixed")
      for (const r of opposite) console.log(`  #${r.id}  cadence=${r.cadence}  status=${r.status}  ${String(r.title).slice(0, 52)}`)
      console.log()
    }

    if (toFlag.length === 0 && toReopen.length === 0) {
      console.log("nothing to do — the invariant already holds.")
      await sql.end()
      process.exit(0)
    }

    // ---- the change --------------------------------------------------------
    const ids = [...new Set([...toFlag.map((r) => r.id), ...toReopen.map((r) => r.id)])]

    if (!APPLY) {
      console.log("statements --apply would run")
      console.log("  update tasks set is_template = true, updated_at = now()")
      console.log("   where cadence is not null and cadence <> 'one-off' and is_template = false")
      console.log(`  update tasks set status = '${REOPEN_TO}', updated_at = now()`)
      console.log(`   where cadence is not null and cadence <> 'one-off' and status = any(${JSON.stringify(COMPLETED_STATUSES)})`)
      console.log(`\n  ${ids.length} distinct rows, backup written to backups/reconcile-recurring-<stamp>/before.json`)
      console.log("rehearsal ran no writes — the database is exactly as it was.")
      console.log("re-run with --apply to commit these changes.\n")
      await sql.end()
      process.exit(0)
    }

    const touched = await sql`
      select id, is_template, status, updated_at
        from tasks
       where id = any(${ids})
       order by id`

    await sql.begin(async (tx) => {
      await tx`
        update tasks
           set is_template = true,
               updated_at  = now()
         where cadence is not null
           and cadence <> 'one-off'
           and is_template = false`

      await tx`
        update tasks
           set status     = ${REOPEN_TO},
               updated_at = now()
         where cadence is not null
           and cadence <> 'one-off'
           and status = any(${COMPLETED_STATUSES})`
    })

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const dir = `backups/reconcile-recurring-${stamp}`
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      `${dir}/before.json`,
      JSON.stringify(
        touched.map((r) => ({
          id: r.id,
          is_template: r.is_template,
          status: r.status,
          updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
        })),
        null,
        2,
      ),
    )
    writeFileSync(
      `${dir}/RESTORE.md`,
      `# Restore\n\nBefore-values for ${touched.length} tasks rows, taken immediately before the apply.\n\n\`\`\`\nnode scripts/reconcile-recurring-tasks.mjs --restore ${dir}\n\`\`\`\n`,
    )

    const after = await sql`
      select count(*) filter (where cadence <> 'one-off' and is_template = false)::int as violating,
             count(*) filter (where cadence <> 'one-off')::int as schedules,
             count(*) filter (where cadence <> 'one-off' and status = any(${COMPLETED_STATUSES}))::int as finished_schedules
        from tasks`

    console.log("applied.")
    console.log(`  rows still violating the invariant ${after[0].violating}`)
    console.log(`  schedules                          ${after[0].schedules}`)
    console.log(`  schedules at a completed word      ${after[0].finished_schedules}`)
    console.log(`  backup                             ${dir}\n`)
  }
} catch (err) {
  console.error("failed:", err.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
