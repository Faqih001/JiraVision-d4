// READ-ONLY diagnostic. Runs the Done-window predicate as plain SQL against production and counts
// rows at each stage, so an empty board caused by the predicate is told apart from one caused by a
// thrown query. No writes.
const fs = require("node:fs")
const postgres = require("postgres")

const env = fs.readFileSync(".env.local", "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) throw new Error("no DATABASE_URL")
const sql = postgres(match[1], { max: 1, ssl: { rejectUnauthorized: false } })

const WORDS = `'done', 'completed', 'closed'`
const latest = `(select max(te.at) from task_events te where te.task_id = t.id and te.to_status in (${WORDS}))`
const instant = `coalesce(${latest}, t.updated_at, t.created_at)`
const oneOff = `(t.status in (${WORDS}) and (t.cadence is null or t.cadence = 'one-off'))`
const insideWeek = `(${instant} >= '2026-11-04T00:00:00+00' and ${instant} < '2026-11-11T00:00:00+00')`
const insideAll = `(${instant} < '2026-11-11T00:00:00+00')`
const predWeek = `not ${oneOff} or coalesce(${insideWeek}, true)`
const predAll = `not ${oneOff} or coalesce(${insideAll}, true)`

async function count(where) {
  const [row] = await sql.unsafe(
    `select count(*)::int as c from tasks t ${where ? `where ${where}` : ""}`,
  )
  return row.c
}

;(async () => {
  console.log("tasks total                :", await count(""))
  console.log("assigned to user 1         :", await count("t.assignee_id = 1"))
  console.log("finished one-offs (all)    :", await count(oneOff))
  console.log("u1 + window=all            :", await count(`t.assignee_id = 1 and (${predAll})`))
  console.log("u1 + window=week           :", await count(`t.assignee_id = 1 and (${predWeek})`))
  console.log("u1 + status not done       :", await count(`t.assignee_id = 1 and t.status not in (${WORDS})`))

  const [u1status] = await sql.unsafe(
    `select coalesce(string_agg(t.status, ', ' order by t.status), '(none)') as s
       from (select status from tasks where assignee_id = 1) t`,
  )
  console.log("u1 status census           :", u1status.s)

  const rows = await sql.unsafe(
    `select t.id, t.status, t.cadence, t.is_template, t.updated_at,
            (${latest}) as finish_event, ${instant} as instant
       from tasks t where t.assignee_id = 1 order by t.updated_at desc limit 8`,
  )
  for (const r of rows) {
    console.log("  row", r.id, r.status, String(r.cadence), "tpl=", r.is_template, "instant=", r.instant)
  }

  await sql.end()
})().catch(async (err) => {
  console.log("THREW:", err.message)
  await sql.end({ timeout: 1 })
})
