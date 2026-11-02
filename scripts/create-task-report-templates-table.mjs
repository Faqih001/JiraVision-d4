// Creates the task_report_templates and task_reports tables if they do not
// exist yet, then verifies them. Additive-only: never drops or alters rows.
//
// Usage: node scripts/create-task-report-templates-table.mjs

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
CREATE TABLE IF NOT EXISTS task_report_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cadence VARCHAR(20) NOT NULL DEFAULT 'monthly',
  discipline VARCHAR(40),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_sources JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS task_reports (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES task_report_templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  author_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_report_templates_cadence ON task_report_templates(cadence);
CREATE INDEX IF NOT EXISTS idx_task_report_templates_discipline ON task_report_templates(discipline);
CREATE INDEX IF NOT EXISTS idx_task_reports_template_id ON task_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_author_id ON task_reports(author_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_status ON task_reports(status);
CREATE INDEX IF NOT EXISTS idx_task_reports_period ON task_reports(period_start, period_end);
`

try {
  console.log("SQL → CREATE TABLE IF NOT EXISTS task_report_templates / task_reports ( … )")
  await sql.unsafe(CREATE_SQL)
  console.log("CREATE TABLE IF NOT EXISTS task_report_templates, task_reports: OK")

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('task_report_templates', 'task_reports')
  `
  console.log("tables present:", tables.map((t) => t.table_name).join(", "))
  if (tables.length !== 2) process.exit(1)
} catch (err) {
  console.error("Failed to create task report tables:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
