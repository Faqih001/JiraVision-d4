// Creates the task-instances tables (tasks columns + task_instances) if they
// do not exist yet, then verifies them. Additive-only: never drops or alters.
//
// Usage: node scripts/create-task-instances-table.mjs

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

const ALTER_TASKS = `
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cadence VARCHAR(20) DEFAULT 'one-off';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_tasks_cadence ON tasks(cadence);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_template ON tasks(is_template);
`

const CREATE_TASK_INSTANCES = `
CREATE TABLE IF NOT EXISTS task_instances (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  instance_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  completed_at TIMESTAMPTZ,
  completed_by INTEGER REFERENCES users(id),
  notes TEXT,
  checklist_responses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, instance_date)
);
CREATE INDEX IF NOT EXISTS idx_task_instances_task_date ON task_instances(task_id, instance_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON task_instances(status);
`

try {
  console.log("SQL → ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cadence, parent_task_id, is_template, checklist_items …")
  await sql.unsafe(ALTER_TASKS)
  console.log("ALTER TABLE tasks: OK")

  console.log("SQL → CREATE TABLE IF NOT EXISTS task_instances ( … )")
  await sql.unsafe(CREATE_TASK_INSTANCES)
  console.log("CREATE TABLE IF NOT EXISTS task_instances: OK")

  // Verify columns on tasks
  const taskCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks'
    AND column_name IN ('cadence', 'parent_task_id', 'is_template', 'checklist_items')
  `
  console.log("tasks columns present:", taskCols.map((c) => c.column_name).join(", "))
  if (taskCols.length !== 4) {
    console.error("Expected 4 new columns on tasks, found", taskCols.length)
    process.exit(1)
  }

  // Verify task_instances table exists
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_instances'
  `
  console.log("tables present:", tables.map((t) => t.table_name).join(", "))
  if (tables.length !== 1) {
    console.error("Expected task_instances table, found", tables.length)
    process.exit(1)
  }

  // Verify indexes
  const indexes = await sql`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'task_instances'
    AND indexname IN ('idx_task_instances_task_date', 'idx_task_instances_status')
  `
  console.log("task_instances indexes:", indexes.map((i) => i.indexname).join(", "))
  if (indexes.length !== 2) {
    console.error("Expected 2 indexes on task_instances, found", indexes.length)
    process.exit(1)
  }

  console.log("All verifications passed.")
} catch (err) {
  console.error("Failed to create task-instances tables:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
