// Creates the goals/OKR workspace tables used by /dashboard/goals.
// Additive-only: CREATE TABLE IF NOT EXISTS, never drops or alters rows.
// Tables:
//   goals         — OKRs with metric type (percent/number/currency/boolean),
//                   baseline/target/current, status, and self-referencing
//                   parent_id (ON DELETE SET NULL so deleting a parent keeps
//                   its children as roots).
//   goal_checkins — append-only progress log per goal (ON DELETE CASCADE).
//
// After the DDL, seeds 4 demo goals (+1 sub-goal, a few check-ins) ONLY when
// the goals table is completely empty, so rerunning is harmless.
//
// Usage: node scripts/create-goals-table.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so
// only the uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]

const sql = postgres(databaseUrl, { max: 1 })

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INT NOT NULL REFERENCES users(id),
  quarter VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('not_started','on_track','at_risk','behind','achieved','archived')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NULL,
  metric_type VARCHAR(20) NOT NULL DEFAULT 'percent'
    CHECK (metric_type IN ('percent','number','currency','boolean')),
  baseline NUMERIC NULL,
  target NUMERIC NOT NULL,
  current NUMERIC NOT NULL DEFAULT 0,
  parent_id INT NULL REFERENCES goals(id) ON DELETE SET NULL,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS goal_checkins (
  id SERIAL PRIMARY KEY,
  goal_id INT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  author_id INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_owner_idx ON goals(owner_id);
CREATE INDEX IF NOT EXISTS goals_parent_idx ON goals(parent_id);
CREATE INDEX IF NOT EXISTS goal_checkins_goal_idx ON goal_checkins(goal_id, created_at)
`

const TABLES = ["goals", "goal_checkins"]

try {
  console.log("SQL → CREATE TABLE IF NOT EXISTS goals / goal_checkins (+ indexes)")
  await sql.unsafe(CREATE_SQL)

  for (const table of TABLES) {
    const [check] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) AS "exists"
    `
    console.log(`${table} exists:`, check.exists)
    if (!check.exists) process.exit(1)
  }
  console.log("All goals-workspace tables are ready.")

  // ---------------------------------------------------------------- seed ---
  // Demo content ONLY when the goals table is empty; clearly realistic OKR
  // titles. Dates are relative to CURRENT_DATE (computed here in JS, same
  // day math as the server) so time-vs-progress suggestions stay sensible.
  const [countRow] = await sql`SELECT count(*)::int AS n FROM goals`
  if (countRow.n > 0) {
    console.log(`Seed skipped — goals table already has ${countRow.n} rows.`)
  } else {
    const [owner] = await sql`SELECT id FROM users ORDER BY id ASC LIMIT 1`
    if (!owner) {
      console.log("Seed skipped — no users exist yet.")
    } else {
      const uid = owner.id
      const iso = (d) => d.toISOString().slice(0, 10)
      const dayMs = 86_400_000
      const now = new Date()
      const shift = (days) => iso(new Date(now.getTime() + days * dayMs))
      const year = now.getFullYear()
      const q = Math.floor(now.getMonth() / 3) + 1
      const quarter = `${year}-Q${q}`

      const [g1] = await sql`
        INSERT INTO goals (title, description, owner_id, quarter, status, start_date, due_date, metric_type, baseline, target, current, created_by)
        VALUES ('Cut cycle time 20%',
          'Reduce median issue-to-deploy cycle time from 6.1d to 4.9d across the core squad.',
          ${uid}, ${quarter}, 'on_track', ${shift(-30)}, ${shift(45)}, 'percent', 10, 100, 45, ${uid})
        RETURNING id
      `
      const [g2] = await sql`
        INSERT INTO goals (title, description, owner_id, quarter, status, start_date, due_date, metric_type, baseline, target, current, created_by)
        VALUES ('Onboard 5 teams',
          'Get five internal teams running their sprints end-to-end in JiraVision.',
          ${uid}, ${quarter}, 'on_track', ${shift(-21)}, ${shift(60)}, 'number', 0, 5, 2, ${uid})
        RETURNING id
      `
      const [g3] = await sql`
        INSERT INTO goals (title, description, owner_id, quarter, status, start_date, due_date, metric_type, baseline, target, current, created_by)
        VALUES ('Ship SOC 2 Type II audit',
          'Complete evidence collection and pass the Type II audit before quarter close.',
          ${uid}, ${quarter}, 'at_risk', ${shift(-60)}, ${shift(20)}, 'percent', 0, 100, 15, ${uid})
        RETURNING id
      `
      const [g4] = await sql`
        INSERT INTO goals (title, description, owner_id, quarter, status, start_date, due_date, metric_type, baseline, target, current, created_by)
        VALUES ('Reach $50k MRR',
          'Grow monthly recurring revenue from pilot pricing to $50k.',
          ${uid}, ${quarter}, 'on_track', ${shift(-45)}, ${shift(75)}, 'currency', 0, 50000, 31000, ${uid})
        RETURNING id
      `
      const [sub1] = await sql`
        INSERT INTO goals (title, description, owner_id, quarter, status, start_date, due_date, metric_type, baseline, target, current, parent_id, created_by)
        VALUES ('Automate deploy pipeline',
          'Sub-goal under cycle time: CI/CD for all core services (10 pipelines).',
          ${uid}, ${quarter}, 'on_track', ${shift(-14)}, ${shift(45)}, 'number', 0, 10, 6, ${g1.id}, ${uid})
        RETURNING id
      `

      const checkins = [
        [g1.id, 20, "Baseline measured across 3 repos."],
        [g1.id, 35, "Deploy queue moved to trunk-based; first gains visible."],
        [g1.id, 45, "Median cycle time down to 5.5d."],
        [g2.id, 1, "Design squad onboarded."],
        [g2.id, 2, "Data squad onboarded."],
        [g3.id, 10, "Evidence collection started."],
        [g3.id, 15, "Vendor trust portal still pending."],
        [sub1.id, 4, "4 of 10 pipelines live."],
        [g4.id, 24000, "Pilot tier conversions picking up."],
        [g4.id, 31000, "Two teams upgraded to standard plan."],
      ]
      for (const [goalId, value, note] of checkins) {
        await sql`
          INSERT INTO goal_checkins (goal_id, value, note, author_id)
          VALUES (${goalId}, ${value}, ${note}, ${uid})
        `
      }

      console.log(
        `Seeded 5 goals (incl. 1 sub-goal) + ${checkins.length} check-ins under user #${uid} for ${quarter}.`,
      )
    }
  }
} catch (err) {
  console.error("Failed to create goals tables:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
