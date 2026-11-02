// Seeds IT technician report templates and sample recurring tasks.
// Usage: node scripts/seed-it-technician-data.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]
const sql = postgres(databaseUrl, { max: 1 })

const DAILY_CHECKLIST = [
  { id: "servers", label: "All servers operational", type: "yes-no-na" },
  { id: "network", label: "Network connectivity verified", type: "yes-no-na" },
  { id: "backups", label: "Backup jobs completed successfully", type: "yes-no-na" },
  { id: "tickets", label: "Critical support tickets reviewed", type: "yes-no-na" },
  { id: "updates", label: "Security patches applied", type: "yes-no-na" },
  { id: "logs", label: "System logs reviewed for errors", type: "yes-no-na" },
  { id: "storage", label: "Storage capacity within threshold", type: "yes-no-na" },
  { id: "services", label: "Critical services running", type: "yes-no-na" },
  { id: "dns", label: "DNS resolution operational", type: "yes-no-na" },
  { id: "firewall", label: "Firewall rules verified", type: "yes-no-na" },
  { id: "monitoring", label: "Monitoring alerts acknowledged", type: "yes-no-na" },
  { id: "users", label: "User access issues resolved", type: "yes-no-na" },
  { id: "email", label: "Email system operational", type: "yes-no-na" },
  { id: "printers", label: "Print services operational", type: "yes-no-na" },
  { id: "documentation", label: "Incidents documented", type: "yes-no-na" },
]

const WEEKLY_CHECKLIST = [
  { id: "backups-verify", label: "Verify all scheduled backups", type: "yes-no-na" },
  { id: "storage-review", label: "Review storage utilization", type: "yes-no-na" },
  { id: "updates-apply", label: "Apply pending updates", type: "yes-no-na" },
  { id: "security-scan", label: "Run security scan", type: "yes-no-na" },
  { id: "performance", label: "Review performance metrics", type: "yes-no-na" },
  { id: "logs-audit", label: "Audit system logs", type: "yes-no-na" },
  { id: "user-accounts", label: "Review user accounts", type: "yes-no-na" },
  { id: "license-compliance", label: "Check license compliance", type: "yes-no-na" },
  { id: "disaster-recovery", label: "Verify disaster recovery plan", type: "yes-no-na" },
  { id: "network-security", label: "Review network security", type: "yes-no-na" },
  { id: "hardware-health", label: "Check hardware health", type: "yes-no-na" },
  { id: "documentation-update", label: "Update documentation", type: "yes-no-na" },
  { id: "team-handoff", label: "Prepare handoff notes", type: "yes-no-na" },
]

const MONTHLY_REPORT_SECTIONS = [
  {
    id: "it-support",
    title: "IT Support",
    dataSource: { type: "task_instances", filters: { discipline: "it_operations", status: "done" } },
  },
  {
    id: "backups",
    title: "Backup Operations",
    dataSource: { type: "task_instances", filters: { status: "done" } },
  },
  {
    id: "hardware",
    title: "Hardware Status",
    dataSource: null,
  },
  {
    id: "software",
    title: "Software Updates",
    dataSource: { type: "task_instances", filters: { status: "done" } },
  },
  {
    id: "maintenance",
    title: "Maintenance Activities",
    dataSource: { type: "checklists" },
  },
  {
    id: "risks",
    title: "Risks and Recommendations",
    dataSource: null,
  },
]

try {
  console.log("Seeding IT technician data...")

  // Create report templates
  const templates = await sql`
    INSERT INTO task_report_templates (name, description, cadence, discipline, sections, data_sources)
    VALUES
      (
        'Daily IT Operations Report',
        'Daily operational status and checklist completion',
        'daily',
        'it_operations',
        ${JSON.stringify([
          { id: "daily-checklist", title: "Daily Checklist", dataSource: { type: "checklists" } },
          { id: "incidents", title: "Incidents", dataSource: null },
        ])},
        '{}'::jsonb
      ),
      (
        'Weekly IT Maintenance Report',
        'Weekly maintenance activities and system health',
        'weekly',
        'it_operations',
        ${JSON.stringify([
          { id: "weekly-checklist", title: "Weekly Checklist", dataSource: { type: "checklists" } },
          { id: "maintenance", title: "Maintenance Performed", dataSource: { type: "task_instances", filters: { status: "done" } } },
          { id: "issues", title: "Issues Resolved", dataSource: null },
        ])},
        '{}'::jsonb
      ),
      (
        'Monthly IT Report',
        'Comprehensive monthly IT operations report',
        'monthly',
        'it_operations',
        ${JSON.stringify(MONTHLY_REPORT_SECTIONS)},
        '{}'::jsonb
      )
    RETURNING id, name
  `
  console.log(`Created ${templates.length} report templates`)

  // Create sample recurring tasks (assuming user ID 1 exists)
  const taskResults = await sql`
    INSERT INTO tasks (title, description, cadence, is_template, checklist_items, discipline, status, priority)
    VALUES
      (
        'Daily System Checks',
        'Daily operational verification of critical systems',
        'daily',
        true,
        ${JSON.stringify(DAILY_CHECKLIST)},
        'it_operations',
        'todo',
        'high'
      ),
      (
        'Weekly Maintenance',
        'Weekly preventive maintenance and system review',
        'weekly',
        true,
        ${JSON.stringify(WEEKLY_CHECKLIST)},
        'it_operations',
        'todo',
        'medium'
      ),
      (
        'Monthly Backup Test',
        'Monthly backup restoration testing',
        'monthly',
        true,
        ${JSON.stringify([
          { id: "restore-test", label: "Backup restoration successful", type: "yes-no-na" },
          { id: "data-integrity", label: "Data integrity verified", type: "yes-no-na" },
          { id: "time-metrics", label: "Recovery time within SLA", type: "yes-no-na" },
        ])},
        'it_operations',
        'todo',
        'high'
      )
    RETURNING id, title
  `
  console.log(`Created ${taskResults.length} recurring tasks`)

  console.log("Seed data created successfully")
} catch (err) {
  console.error("Seed failed:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
