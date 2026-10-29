import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"
import { opsConfigSchema, safeValidateOpsConfig } from "@/lib/packs/ops/validator"
import { IT_TECHNICIAN_OPS_CONFIG } from "@/lib/packs/ops/it-technician"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const columnNames = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("ops schema", () => {
  it("declares ops_log_entries under its SQL name", () => {
    expect(schema.opsLogEntries).toBeInstanceOf(PgTable)
    expect(getTableConfig(schema.opsLogEntries).name).toBe("ops_log_entries")
  })

  it("carries every column the spec names", () => {
    for (const column of [
      "id",
      "pack_key",
      "entity_key",
      "owner_id",
      "occurred_at",
      "status",
      "fields",
      "source",
      "created_at",
    ]) {
      expect(columnNames(schema.opsLogEntries)).toContain(column)
    }
  })

  it("adds ops_config to role_packs", () => {
    expect(columnNames(schema.rolePacks)).toContain("ops_config")
  })

  it("adds metadata to tasks", () => {
    expect(columnNames(schema.tasks)).toContain("metadata")
  })

  it("adds kpi_bindings to work_reports", () => {
    expect(columnNames(schema.workReports)).toContain("kpi_bindings")
  })

  it("has four indexes on ops_log_entries", () => {
    const source = src("drizzle/schema.ts")
    const code = codeOnly(source)
    for (const idx of [
      "ops_log_entries_owner_idx",
      "ops_log_entries_pack_idx",
      "ops_log_entries_entity_idx",
      "ops_log_entries_occurred_idx",
    ]) {
      expect(code).toContain(idx)
    }
  })

  it("migration script creates the table and columns additively", () => {
    const script = src("scripts/create-ops-tables.mjs")
    expect(script).toContain("CREATE TABLE IF NOT EXISTS ops_log_entries")
    expect(script).toContain("ADD COLUMN ops_config JSONB")
    expect(script).toContain("ADD COLUMN metadata JSONB")
    expect(script).toContain("ADD COLUMN kpi_bindings JSONB")
  })

  it("rollback script drops the table and removes the columns", () => {
    const script = src("scripts/rollback-ops-tables.mjs")
    expect(script).toContain("DROP TABLE IF EXISTS ops_log_entries")
    expect(script).toContain("DROP COLUMN ops_config")
    expect(script).toContain("DROP COLUMN metadata")
    expect(script).toContain("DROP COLUMN kpi_bindings")
  })

  it("npm scripts are registered", () => {
    const pkg = JSON.parse(src("package.json"))
    expect(pkg.scripts["db:ops"]).toBe("node scripts/create-ops-tables.mjs")
    expect(pkg.scripts["db:ops:rollback"]).toBe("node scripts/rollback-ops-tables.mjs")
  })
})

describe("ops validator", () => {
  it("validates the IT Technician opsConfig", () => {
    const result = safeValidateOpsConfig(IT_TECHNICIAN_OPS_CONFIG)
    expect(result.success).toBe(true)
  })

  it("rejects an empty logs object", () => {
    const result = safeValidateOpsConfig({ logs: {}, kpis: [] })
    expect(result.success).toBe(false)
  })

  it("rejects an empty kpis array", () => {
    const result = safeValidateOpsConfig({
      logs: { test: { label: "Test", fields: {} } },
      kpis: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects a ratio KPI without numerator", () => {
    const result = safeValidateOpsConfig({
      logs: { test: { label: "Test", fields: {} } },
      kpis: [
        {
          id: "test_ratio",
          label: "Test ratio",
          source: "test",
          aggregation: "ratio",
          denominator: "count",
          unit: "%",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects an average KPI without field", () => {
    const result = safeValidateOpsConfig({
      logs: { test: { label: "Test", fields: {} } },
      kpis: [
        {
          id: "test_avg",
          label: "Test average",
          source: "test",
          aggregation: "average",
          unit: "days",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("accepts a minimal valid config", () => {
    const result = safeValidateOpsConfig({
      logs: {
        tickets: {
          label: "Tickets",
          fields: {
            title: { type: "string", required: true, label: "Title" },
          },
        },
      },
      kpis: [
        {
          id: "ticket_count",
          label: "Ticket count",
          source: "tickets",
          aggregation: "count",
          unit: "tickets",
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("IT Technician config has 7 log entities", () => {
    expect(Object.keys(IT_TECHNICIAN_OPS_CONFIG.logs)).toHaveLength(7)
  })

  it("IT Technician config has 15 KPIs", () => {
    expect(IT_TECHNICIAN_OPS_CONFIG.kpis).toHaveLength(15)
  })

  it("IT Technician config has 3 playbook seeds", () => {
    expect(IT_TECHNICIAN_OPS_CONFIG.playbookSeeds).toHaveLength(3)
  })

  it("IT Technician config has 8 recommend rules", () => {
    expect(IT_TECHNICIAN_OPS_CONFIG.recommendRules).toHaveLength(8)
  })
})
