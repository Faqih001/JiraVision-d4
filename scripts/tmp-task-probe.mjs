// Throwaway read-only probe: current task data for user 1 on the configured DB.
import { readFileSync } from "node:fs"
import postgres from "postgres"

const m = readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)
const sql = postgres(m[1], { max: 1, connect_timeout: 30 })
try {
  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM tasks WHERE assignee_id = 1) AS tasks_assigned,
      (SELECT count(*)::int FROM tasks) AS tasks_total,
      (SELECT count(*)::int FROM task_instances ti JOIN tasks t ON t.id = ti.task_id WHERE t.assignee_id = 1) AS instances,
      (SELECT count(*)::int FROM task_events te JOIN tasks t ON t.id = te.task_id WHERE t.assignee_id = 1) AS task_events,
      (SELECT count(*)::int FROM sprints) AS sprints,
      (SELECT count(*)::int FROM work_log_entries WHERE user_id = 1) AS worklogs,
      (SELECT count(*)::int FROM deliverables) AS deliverables
  `
  console.log(JSON.stringify(counts))
  const byCadence = await sql`
    SELECT cadence, count(*)::int AS n FROM tasks WHERE assignee_id = 1 GROUP BY cadence ORDER BY cadence
  `
  console.log(JSON.stringify(byCadence))
  const titles = await sql`SELECT id, title, status, cadence FROM tasks WHERE assignee_id = 1 ORDER BY id LIMIT 60`
  for (const t of titles) console.log(`${t.id}\t${t.status}\t${t.cadence}\t${t.title}`)
} finally {
  await sql.end({ timeout: 5 })
}
