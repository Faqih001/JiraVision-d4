// drizzle-kit push removes anything drizzle/schema.ts does not declare, and this database is
// production. Five additive .mjs scripts created 12 tables the schema file never learned about,
// so it described 52 of the 64 tables prod actually holds — one `push` away from dropping the
// goals, retro, report-schedule, automation and email workspaces.
//
// Every expectation below is a literal read off production (information_schema, 2026-11-13) and
// the creating scripts. Nothing is computed from the schema: an expectation derived from the code
// under test passes no matter what that code says.
//
// The four kanban_* tables are still in the census because they still exist in prod. They leave
// this list in the same commit that drops them, never before — see kanban-retirement.test.ts.

import { describe, expect, it } from "vitest"
import { PgTable, getTableConfig, type PgColumn } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const PROD_TABLES = [
  "agent_plans",
  "ai_insights",
  "ai_usage_daily",
  "assistant_messages",
  "assistant_threads",
  "auth_sessions",
  "automation_rules",
  "automation_runs",
  "calendar_events",
  "career_levels",
  "career_placement",
  "career_requests",
  "career_signoffs",
  "chat_participants",
  "chats",
  "cms_audit_log",
  "cms_content_overrides",
  "deliverables",
  "email_digest",
  "email_preferences",
  "email_templates",
  "ethical_metrics",
  "gamification",
  "goal_checkins",
  "goals",
  "growth_reviews",
  "kanban_columns",
  "kanban_task_attachments",
  "kanban_task_comments",
  "kanban_tasks",
  "messages",
  "notifications",
  "ops_config_audit",
  "ops_log_entries",
  "organizations",
  "password_reset_tokens",
  "plan_items",
  "playbooks",
  "reactions",
  "register_items",
  "report_runs",
  "report_schedules",
  "retro_actions",
  "retro_notes",
  "retros",
  "role_packs",
  "saved_reports",
  "scheduler_heartbeat",
  "sprint_analytics",
  "sprints",
  "task_events",
  "task_instances",
  "task_report_templates",
  "task_reports",
  "tasks",
  "team_role_audit",
  "team_settings",
  "ticket_comments",
  "ticket_departments",
  "ticket_events",
  "tickets",
  "user_onboarding",
  "users",
  "wellbeing_metrics",
  "work_log_entries",
  "work_report_recipients",
  "work_reports",
  "workspace_invitations",
].sort()

const declared = Object.values(schema).filter((value) => value instanceof PgTable)

function tableNamed(name: string): PgTable {
  const table = declared.find((candidate) => getTableConfig(candidate).name === name)
  expect(table, `${name} is declared in drizzle/schema.ts`).toBeInstanceOf(PgTable)
  return table as PgTable
}

function columnOf(tableName: string, columnName: string): PgColumn {
  const column = getTableConfig(tableNamed(tableName)).columns.find((c) => c.name === columnName)
  expect(column, `${tableName}.${columnName} is declared`).toBeDefined()
  return column as PgColumn
}

describe("drizzle/schema.ts describes the whole production database", () => {
  it("declares exactly the 68 tables production holds", () => {
    expect(declared.map((table) => getTableConfig(table).name).sort()).toEqual(PROD_TABLES)
  })
})

// Column sets, not column order: reordering a declaration is a decision, losing a column is a bug.
const NEW_TABLES: Array<[string, string[]]> = [
  [
    "goals",
    [
      "id",
      "title",
      "description",
      "owner_id",
      "quarter",
      "status",
      "start_date",
      "due_date",
      "metric_type",
      "baseline",
      "target",
      "current",
      "parent_id",
      "created_by",
      "created_at",
      "updated_at",
    ],
  ],
  ["goal_checkins", ["id", "goal_id", "value", "note", "author_id", "created_at"]],
  ["retros", ["id", "sprint_id", "title", "date", "status", "created_by", "created_at"]],
  [
    "retro_notes",
    ["id", "retro_id", "category", "body", "author_id", "votes", "voters", "created_at"],
  ],
  ["retro_actions", ["id", "retro_id", "body", "owner_id", "due_date", "done", "created_at"]],
  [
    "report_schedules",
    [
      "id",
      "user_id",
      "name",
      "description",
      "dataset",
      "config",
      "cadence",
      "recipients",
      "is_active",
      "last_run_at",
      "next_run_at",
      "created_at",
      "updated_at",
    ],
  ],
  ["report_runs", ["id", "schedule_id", "status", "rows", "detail", "created_at"]],
  [
    "automation_rules",
    [
      "id",
      "user_id",
      "name",
      "description",
      "trigger",
      "conditions",
      "actions",
      "is_active",
      "run_count",
      "last_run_at",
      "created_at",
      "updated_at",
    ],
  ],
  ["automation_runs", ["id", "rule_id", "status", "matched", "acted", "detail", "created_at"]],
  [
    "email_templates",
    ["id", "user_id", "name", "subject", "body", "event_type", "enabled", "created_at"],
  ],
  ["email_preferences", ["user_id", "data", "updated_at"]],
  [
    "email_digest",
    ["id", "user_id", "to_email", "subject", "body", "event_type", "status", "created_at"],
  ],
]

describe("the 12 tables the additive scripts created are declared", () => {
  it.each(NEW_TABLES)("%s carries exactly its production columns", (name, columns) => {
    const actual = getTableConfig(tableNamed(name)).columns.map((column) => column.name)
    expect(actual.sort()).toEqual([...columns].sort())
  })

  // A serial declared as a plain integer makes every insert supply its own id.
  it.each(NEW_TABLES.filter(([name]) => name !== "email_preferences"))(
    "%s keys on a serial id",
    (name) => {
      const id = columnOf(name, "id")
      expect(id.getSQLType()).toBe("serial")
      expect(id.primary).toBe(true)
    },
  )
})

describe("email_preferences is one row per member, not a log", () => {
  it("has no surrogate id and keys on user_id", () => {
    const columns = getTableConfig(tableNamed("email_preferences")).columns
    expect(columns.map((column) => column.name)).not.toContain("id")
    expect(columnOf("email_preferences", "user_id").primary).toBe(true)
  })
})

// The three email tables were created with TIMESTAMP, the other nine with TIMESTAMPTZ. Drizzle's
// timestamp mapper appends "+0000" only when withTimezone is false, so declaring the wrong flag
// shifts every stored instant by the server's offset — a digest that reads "sent 07:00" for a row
// written at 10:00.
const COLUMN_TYPES: Array<[string, string, string]> = [
  ["email_templates", "created_at", "timestamp"],
  ["email_digest", "created_at", "timestamp"],
  ["email_preferences", "updated_at", "timestamp"],
  ["goals", "created_at", "timestamp with time zone"],
  ["goals", "updated_at", "timestamp with time zone"],
  ["goal_checkins", "created_at", "timestamp with time zone"],
  ["retros", "created_at", "timestamp with time zone"],
  ["retro_notes", "created_at", "timestamp with time zone"],
  ["retro_actions", "created_at", "timestamp with time zone"],
  ["report_schedules", "created_at", "timestamp with time zone"],
  ["report_schedules", "updated_at", "timestamp with time zone"],
  ["report_schedules", "last_run_at", "timestamp with time zone"],
  ["report_schedules", "next_run_at", "timestamp with time zone"],
  ["report_runs", "created_at", "timestamp with time zone"],
  ["automation_rules", "created_at", "timestamp with time zone"],
  ["automation_rules", "updated_at", "timestamp with time zone"],
  ["automation_rules", "last_run_at", "timestamp with time zone"],
  ["automation_runs", "created_at", "timestamp with time zone"],
  // OKR metrics carry fractions and currency; an integer column truncates them.
  ["goals", "baseline", "numeric"],
  ["goals", "target", "numeric"],
  ["goals", "current", "numeric"],
  ["goal_checkins", "value", "numeric"],
  ["goals", "start_date", "date"],
  ["goals", "due_date", "date"],
  ["retros", "date", "date"],
  ["retro_actions", "due_date", "date"],
  ["retro_actions", "done", "boolean"],
  ["report_schedules", "is_active", "boolean"],
  ["automation_rules", "is_active", "boolean"],
  ["email_templates", "enabled", "boolean"],
  ["retro_notes", "voters", "jsonb"],
  ["report_schedules", "config", "jsonb"],
  ["report_schedules", "recipients", "jsonb"],
  ["automation_rules", "conditions", "jsonb"],
  ["automation_rules", "actions", "jsonb"],
  ["email_preferences", "data", "jsonb"],
  // Lengths that are not the house 255 default. A short declaration makes push ALTER the column.
  ["goals", "title", "varchar(255)"],
  ["goals", "quarter", "varchar(20)"],
  ["goals", "status", "varchar(20)"],
  ["goals", "metric_type", "varchar(20)"],
  ["retros", "title", "varchar(255)"],
  ["retros", "status", "varchar(20)"],
  ["retro_notes", "category", "varchar(30)"],
  ["report_schedules", "name", "varchar(255)"],
  ["report_schedules", "dataset", "varchar(40)"],
  ["report_schedules", "cadence", "varchar(20)"],
  ["report_runs", "status", "varchar(20)"],
  ["automation_rules", "name", "varchar(255)"],
  ["automation_rules", "trigger", "varchar(40)"],
  ["automation_runs", "status", "varchar(20)"],
  ["email_templates", "name", "varchar(255)"],
  ["email_templates", "subject", "varchar(500)"],
  ["email_templates", "event_type", "varchar(50)"],
  // RFC 5321 maximum address length; 255 would reject valid recipients.
  ["email_digest", "to_email", "varchar(320)"],
  ["email_digest", "subject", "varchar(500)"],
  ["email_digest", "event_type", "varchar(50)"],
  ["email_digest", "status", "varchar(20)"],
]

describe("column types match the DDL that created them", () => {
  it.each(COLUMN_TYPES)("%s.%s is %s", (table, column, sqlType) => {
    expect(columnOf(table, column).getSQLType()).toBe(sqlType)
  })
})

// NOT NULL is part of the insert contract: declaring it where prod allows null makes callers
// supply a value the column does not need, and omitting it where prod requires one lets a write
// fail at the driver instead of at the boundary.
const NULLABILITY: Array<[string, string, boolean]> = [
  ["email_templates", "enabled", false],
  ["email_templates", "event_type", false],
  ["email_digest", "status", false],
  ["email_digest", "to_email", false],
  ["report_schedules", "is_active", true],
  ["report_schedules", "created_at", true],
  ["automation_rules", "is_active", true],
  ["automation_runs", "created_at", true],
  ["retro_notes", "votes", true],
  ["retro_notes", "voters", true],
  ["retro_actions", "done", true],
  ["goals", "target", true],
  ["goals", "baseline", false],
  ["goals", "due_date", false],
  ["goal_checkins", "value", true],
]

describe("nullability matches production", () => {
  it.each(NULLABILITY)("%s.%s notNull is %s", (table, column, notNull) => {
    expect(columnOf(table, column).notNull).toBe(notNull)
  })
})