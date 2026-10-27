import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const columnNames = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("playbook schema", () => {
  it("declares playbooks under its SQL name", () => {
    expect(schema.playbooks).toBeInstanceOf(PgTable)
    expect(getTableConfig(schema.playbooks).name).toBe("playbooks")
  })

  it("carries every column the spec names", () => {
    for (const column of [
      "pack_key",
      "discipline",
      "title",
      "summary",
      "scope_kind",
      "method",
      "steps",
      "precautions",
      "recommendations",
      "tags",
      "status",
      "version",
      "author_id",
      "source",
      "ai_marked",
      "last_verified_at",
      "verify_interval_days",
    ]) {
      expect(columnNames(schema.playbooks)).toContain(column)
    }
  })

  it("gives work_log_entries the foreign key phase 16 deferred", () => {
    const entries = src("drizzle/schema.ts")
    expect(entries).toMatch(
      /playbookId: integer\("playbook_id"\)\.references\(\(\) => playbooks\.id, \{ onDelete: "set null" \}\)/,
    )
  })

  it("never stores a run state on the playbook", () => {
    expect(columnNames(schema.playbooks).filter((name) => /run|progress/i.test(name))).toEqual([])
  })
})

describe("playbook migration script", () => {
  const script = codeOnly(src("scripts/create-playbooks-tables.mjs"))

  it("is additive only", () => {
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).not.toMatch(/TRUNCATE/i)
    expect(script).not.toMatch(/ALTER COLUMN/i)
  })

  it("creates the table idempotently and adds the FK only once", () => {
    expect((script.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length).toBe(1)
    expect(script).toMatch(/pg_constraint/)
    expect(script).toMatch(/work_log_entries_playbook_id_fk/)
    expect(script).toMatch(/information_schema/i)
  })

  it("keeps the rollback behind an explicit opt-in", () => {
    const rollback = codeOnly(src("scripts/rollback-playbooks-tables.mjs"))
    expect(rollback).toMatch(/PLAYBOOKS_ROLLBACK !== "yes"/)
    expect(rollback).toMatch(/TABLES\.length !== 1/)
    expect(rollback).toMatch(/DROP CONSTRAINT IF EXISTS work_log_entries_playbook_id_fk/)
  })
})
