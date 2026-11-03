// Import the owner's IT Technician Goal Import List (12 Q4-2026 goals, 2026-11-03) into
// the OKR workspace at /dashboard/goals, owned by fakiiahmad001@gmail.com.
//
//   node scripts/import-it-technician-goals.mjs --dry-run
//   node scripts/import-it-technician-goals.mjs --apply
//
// Insert-only by design: the goals and goal_checkins tables were empty when this was
// written (the 2026-10-30 demo purge removed the seeded rows), so there is nothing to
// back up or replace, and this script deletes nothing — it has no --restore either.
// --apply refuses to run when any of the 12 titles already exist on the account, so a
// rerun cannot double the list. Run from the repo root.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const OWNER_EMAIL = "fakiiahmad001@gmail.com"
// scripts/create-goals-table.mjs bakes these two CHECK lists into the table.
const GOAL_STATUSES = ["not_started", "on_track", "at_risk", "behind", "achieved", "archived"]
const METRIC_TYPES = ["percent", "number", "currency", "boolean"]

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
if (!APPLY && !process.argv.includes("--dry-run")) {
  console.error("Pass --dry-run or --apply explicitly.")
  process.exit(1)
}

function loadGoals() {
  const goals = JSON.parse(readFileSync(new URL("./data/it-technician-goals.json", import.meta.url), "utf8"))
  if (!Array.isArray(goals) || goals.length !== 12) throw new Error(`expected 12 goals, got ${goals.length}`)
  const seen = new Set()
  for (const g of goals) {
    if (!g.title?.trim() || g.title.length > 255) throw new Error(`goal ${g.seq}: title missing or over 255 chars`)
    if (!g.description?.trim()) throw new Error(`goal ${g.seq}: description missing`)
    if (!GOAL_STATUSES.includes(g.status)) throw new Error(`goal ${g.seq}: status ${g.status} rejected by the CHECK`)
    if (!METRIC_TYPES.includes(g.metricType)) throw new Error(`goal ${g.seq}: metricType ${g.metricType} rejected by the CHECK`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.startDate)) throw new Error(`goal ${g.seq}: start_date must be YYYY-MM-DD`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.dueDate) || g.dueDate < g.startDate) {
      throw new Error(`goal ${g.seq}: due_date must be YYYY-MM-DD and not before start_date`)
    }
    if (!Number.isFinite(g.target)) throw new Error(`goal ${g.seq}: target must be a number`)
    if (g.baseline !== null && !Number.isFinite(g.baseline)) throw new Error(`goal ${g.seq}: baseline must be a number or null`)
    if (!Number.isFinite(g.current)) throw new Error(`goal ${g.seq}: current must be a number`)
    if (seen.has(g.title)) throw new Error(`duplicate title: ${g.title}`)
    seen.add(g.title)
  }
  return goals
}

async function main() {
  const goals = loadGoals()
  const sql = postgres(match[1], { max: 1, connect_timeout: 30 })

  try {
    const [user] = await sql`SELECT id, name FROM users WHERE email = ${OWNER_EMAIL} LIMIT 1`
    if (!user) {
      console.error(`Account ${OWNER_EMAIL} not found — aborting.`)
      process.exit(1)
    }

    const [existing] = await sql`
      SELECT count(*)::int AS goals FROM goals WHERE owner_id = ${user.id}
    `
    const [checkins] = await sql`
      SELECT count(*)::int AS n FROM goal_checkins c
      JOIN goals g ON g.id = c.goal_id WHERE g.owner_id = ${user.id}
    `
    const titles = goals.map((g) => g.title)
    const clashes = await sql`
      SELECT title FROM goals WHERE owner_id = ${user.id} AND title = ANY(${titles})
    `

    console.log(`Account: ${user.id} (${user.name} <${OWNER_EMAIL}>)`)
    console.log(`Database: ${match[1].replace(/^[^@]*@/, "").split("/")[0]}`)
    console.log(`Current rows: ${existing.goals} goals, ${checkins.n} check-ins owned by this account`)
    console.log(`To import: ${goals.length} goals, all top-level, ${goals[0].quarter}, ${goals[0].startDate} → ${goals[0].dueDate}`)
    const byMetric = {}
    for (const g of goals) byMetric[g.metricType] = (byMetric[g.metricType] ?? 0) + 1
    console.log(`Metrics: ${Object.entries(byMetric).map(([k, v]) => `${k} ${v}`).join(", ")} — every one starts at 0% progress`)
    for (const g of goals) {
      console.log(`  ${String(g.seq).padStart(2)}. ${g.title} [${g.metricType} → ${g.target}${g.metricType === "percent" ? "%" : ""}]`)
    }
    if (clashes.length > 0) {
      console.log(`NOTE: ${clashes.length} of the 12 titles already exist on this account:`)
      for (const c of clashes) console.log(`  - ${c.title}`)
    }

    if (!APPLY) {
      console.log("Dry run only — nothing changed. Re-run with --apply.")
      return
    }
    if (clashes.length > 0) {
      console.error("Refusing to double-import: the goals above already exist. Delete them in the app first.")
      process.exit(1)
    }

    await sql.begin(async (tx) => {
      for (const g of goals) {
        await tx`
          INSERT INTO goals (title, description, owner_id, quarter, status, start_date, due_date,
            metric_type, baseline, target, current, parent_id, created_by)
          VALUES (${g.title}, ${g.description}, ${user.id}, ${g.quarter}, ${g.status}, ${g.startDate},
            ${g.dueDate}, ${g.metricType}, ${g.baseline}, ${g.target}, ${g.current}, NULL, ${user.id})`
      }
    })

    const after = await sql`
      SELECT count(*)::int AS goals,
        count(*) FILTER (WHERE status = 'not_started')::int AS not_started,
        count(*) FILTER (WHERE parent_id IS NULL)::int AS top_level,
        count(*) FILTER (WHERE created_by = ${user.id})::int AS created_by_owner
      FROM goals WHERE owner_id = ${user.id}
    `
    console.log(
      `Applied: ${after[0].goals} goals (${after[0].not_started} not_started, ${after[0].top_level} top-level, ` +
        `${after[0].created_by_owner} created by the owner).`
    )
  } catch (error) {
    console.error("IT technician goals import failed:", error.message ?? error)
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main()
