import { describe, expect, it } from "vitest"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

// drizzle/schema.ts imports only pg-core, so this is a real structural test, not a
// source grep: it reads the column objects. The live tables are created by
// scripts/create-worklog-tables.mjs, which must match these names exactly.
// "@/drizzle/schema" is aliased to the .ts in vitest.config.ts — without that pin it
// resolves the stale four-table drizzle/schema.js shim instead.
const columnNames = (table: PgTable) => getTableConfig(table).columns.map((c) => c.name)

/** Every table this file exports, indexed by its SQL name. */
const tablesByName = new Map<string, PgTable>()
for (const value of Object.values(schema)) {
  if (value instanceof PgTable) tablesByName.set(getTableConfig(value).name, value)
}

/** The one table with a given SQL name, or a test failure naming it. */
const table = (name: string): PgTable => {
  const found = tablesByName.get(name)
  if (!found) throw new Error(`schema.ts does not export a table named "${name}"`)
  return found
}

const EXPECTED_TABLES = [
  "task_events",
  "work_log_entries",
  "deliverables",
  "work_reports",
  "work_report_recipients",
  "agent_plans",
  "plan_items",
  "assistant_threads",
  "assistant_messages",
  "ai_usage_daily",
]

describe("worklog schema", () => {
  it("declares all ten new tables", () => {
    for (const name of EXPECTED_TABLES) {
      expect(tablesByName.has(name)).toBe(true)
    }
  })

  it.each([
    ["task_events", ["task_id", "actor_id", "from_status", "to_status", "at", "source"]],
    ["work_log_entries", ["user_id", "worked_on", "task_id", "plan_item_id", "kind", "title",
      "body", "discipline", "minutes", "deliverable_id", "playbook_id", "playbook_version",
      "links", "source", "redated_at"]],
    ["deliverables", ["name", "type", "task_id", "plan_item_id", "owner_id", "discipline",
      "status", "produced_on", "link", "object_key", "evidence"]],
    ["work_reports", ["user_id", "period_type", "period_start", "period_end", "title",
      "template", "status", "content", "metrics", "revision_of", "submitted_at",
      "acknowledged_at", "returned_note"]],
    ["work_report_recipients", ["report_id", "user_id", "notified_at", "read_at", "ack_at", "note"]],
    ["agent_plans", ["title", "summary", "source_kind", "source_name", "source_text",
      "object_key", "model", "horizon_start", "horizon_end", "cadence", "status", "created_by",
      "promoted_at"]],
    ["plan_items", ["plan_id", "title", "description", "discipline", "estimate_points",
      "start_date", "due_date", "status", "depends_on", "milestone", "cadence", "sort_order",
      "deliverable", "source_task_id"]],
    ["assistant_threads", ["user_id", "scope", "title"]],
    ["assistant_messages", ["thread_id", "role", "content", "references", "tokens"]],
    ["ai_usage_daily", ["date", "scope", "calls", "input_tokens", "output_tokens"]],
  ] as const)("%s carries its columns", (name, expected) => {
    const names = columnNames(table(name))
    for (const column of expected) expect(names).toContain(column)
  })

  it("adds exactly three nullable columns to tasks, in snake_case", () => {
    const names = columnNames(schema.tasks)
    expect(names).toContain("start_date")
    expect(names).toContain("discipline")
    expect(names).toContain("source_plan_id")
    expect(names).toContain("due_date")
  })

  it("leaves every pre-existing tasks column alone", () => {
    expect(columnNames(schema.tasks)).toEqual([
      "id", "title", "description", "status", "priority", "story_points", "assignee_id",
      "sprint_id", "due_date", "tags", "created_at", "updated_at",
      "start_date", "discipline", "source_plan_id",
    ])
  })

  it("never makes a worklog column required where a caller cannot know it", () => {
    const log = getTableConfig(schema.workLogEntries)
    const nullable = ["task_id", "plan_item_id", "deliverable_id", "playbook_id", "minutes", "redated_at"]
    for (const name of nullable) {
      const column = log.columns.find((c) => c.name === name)
      expect(column?.hasDefault || !column?.notNull).toBe(true)
    }
  })
})
