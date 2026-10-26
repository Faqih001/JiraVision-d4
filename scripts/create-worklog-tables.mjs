// Creates the phase-1 worklog tables and the three additive tasks columns, then verifies
// them through information_schema. Additive-only by design and by test (see
// tests/unit/schema-safety.test.ts): it never removes or rewrites anything.
// Run from the repo root:
//   npm run db:worklog
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and
// this database is production.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const EXPECTED_TABLES = [
  "agent_plans",
  "plan_items",
  "deliverables",
  "task_events",
  "work_log_entries",
  "work_reports",
  "work_report_recipients",
  "assistant_threads",
  "assistant_messages",
  "ai_usage_daily",
]
const EXPECTED_TASK_COLUMNS = ["start_date", "discipline", "source_plan_id"]

// Creation order matters: a table's own foreign keys must already exist.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS agent_plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  source_kind VARCHAR(20) NOT NULL DEFAULT 'text',
  source_name TEXT,
  source_text TEXT,
  object_key TEXT,
  model VARCHAR(80),
  horizon_start DATE,
  horizon_end DATE,
  cadence VARCHAR(20) NOT NULL DEFAULT 'weekly',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS plan_items (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES agent_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discipline VARCHAR(40),
  estimate_points INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  due_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestone BOOLEAN NOT NULL DEFAULT FALSE,
  cadence VARCHAR(20),
  sort_order INTEGER NOT NULL DEFAULT 0,
  deliverable JSONB,
  source_task_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS deliverables (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'other',
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  plan_item_id INTEGER REFERENCES plan_items(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  discipline VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  produced_on DATE,
  link TEXT,
  object_key TEXT,
  evidence TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'route'
);
CREATE TABLE IF NOT EXISTS work_log_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worked_on DATE NOT NULL,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  plan_item_id INTEGER REFERENCES plan_items(id) ON DELETE SET NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'action',
  title TEXT NOT NULL,
  body TEXT,
  discipline VARCHAR(40),
  minutes INTEGER,
  deliverable_id INTEGER REFERENCES deliverables(id) ON DELETE SET NULL,
  playbook_id INTEGER,
  playbook_version INTEGER,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  redated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS work_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL DEFAULT 'weekly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  template VARCHAR(40) NOT NULL DEFAULT 'general',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision_of INTEGER REFERENCES work_reports(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  returned_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS work_report_recipients (
  report_id INTEGER NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  ack_at TIMESTAMPTZ,
  note TEXT,
  PRIMARY KEY (report_id, user_id)
);
CREATE TABLE IF NOT EXISTS assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL DEFAULT 'workspace',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS assistant_messages (
  id SERIAL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES assistant_threads(id) ON DELETE CASCADE,
  role VARCHAR(12) NOT NULL,
  content TEXT NOT NULL,
  "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  date DATE NOT NULL,
  scope VARCHAR(20) NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, scope)
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS discipline VARCHAR(40);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_plan_id INTEGER;
CREATE INDEX IF NOT EXISTS task_events_task_at_idx ON task_events (task_id, at);
CREATE INDEX IF NOT EXISTS task_events_at_idx ON task_events (at);
CREATE INDEX IF NOT EXISTS work_log_entries_user_day_idx ON work_log_entries (user_id, worked_on);
CREATE INDEX IF NOT EXISTS work_log_entries_task_idx ON work_log_entries (task_id);
CREATE INDEX IF NOT EXISTS deliverables_owner_status_idx ON deliverables (owner_id, status);
CREATE INDEX IF NOT EXISTS deliverables_produced_idx ON deliverables (produced_on);
CREATE INDEX IF NOT EXISTS work_reports_user_period_idx ON work_reports (user_id, period_start);
CREATE INDEX IF NOT EXISTS work_reports_status_idx ON work_reports (status);
CREATE INDEX IF NOT EXISTS plan_items_plan_idx ON plan_items (plan_id, sort_order);
CREATE INDEX IF NOT EXISTS assistant_messages_thread_idx ON assistant_messages (thread_id, id);
CREATE INDEX IF NOT EXISTS work_report_recipients_user_read_idx ON work_report_recipients (user_id, read_at)
`

const sql = postgres(match[1], { max: 1 })

try {
  console.log(`SQL → ${EXPECTED_TABLES.length} CREATE TABLE IF NOT EXISTS, ${EXPECTED_TASK_COLUMNS.length} additive columns, 11 indexes`)
  await sql.unsafe(CREATE_SQL)

  const tables = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `
  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks'
  `
  const haveTables = new Set(tables.map((t) => t.table_name))
  const haveColumns = new Set(columns.map((c) => c.column_name))
  const missingTables = EXPECTED_TABLES.filter((t) => !haveTables.has(t))
  const missingColumns = EXPECTED_TASK_COLUMNS.filter((c) => !haveColumns.has(c))

  console.log("tables present:", EXPECTED_TABLES.filter((t) => haveTables.has(t)).join(", ") || "none")
  console.log("tasks columns:", EXPECTED_TASK_COLUMNS.filter((c) => haveColumns.has(c)).join(", ") || "none")

  if (missingTables.length) {
    console.error(`missing tables: ${missingTables.join(", ")}`)
    process.exit(1)
  }
  if (missingColumns.length) {
    console.error(`missing tasks columns: ${missingColumns.join(", ")}`)
    process.exit(1)
  }
  console.log("OK — schema is in place. No rows were written.")
} catch (error) {
  console.error("Failed to create worklog tables:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
