import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const columnNames = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("register schema", () => {
  it("declares the two phase-15 tables under their SQL names", () => {
    expect(schema.rolePacks).toBeInstanceOf(PgTable)
    expect(schema.registerItems).toBeInstanceOf(PgTable)
    expect(getTableConfig(schema.rolePacks).name).toBe("role_packs")
    expect(getTableConfig(schema.registerItems).name).toBe("register_items")
  })

  it("carries every column the spec names", () => {
    const packs = columnNames(schema.rolePacks)
    for (const column of [
      "pack_key",
      "title",
      "disciplines",
      "register_kinds",
      "sections",
      "report_template",
      "ladder_discipline",
      "onboarding",
      "method",
      "is_active",
    ]) {
      expect(packs).toContain(column)
    }

    const items = columnNames(schema.registerItems)
    for (const column of [
      "pack_key",
      "kind",
      "title",
      "fields",
      "status",
      "owner_id",
      "custody",
      "last_verified_at",
      "verify_interval_days",
      "parent_id",
      "source",
    ]) {
      expect(items).toContain(column)
    }
  })

  it("keeps one pack per key", () => {
    const unique = getTableConfig(schema.rolePacks).columns.find(
      (column) => column.name === "pack_key",
    )
    expect(unique?.isUnique).toBe(true)
  })

  it("never stores staleness", () => {
    expect(columnNames(schema.registerItems).filter((name) => /stale/i.test(name))).toEqual([])
    expect(columnNames(schema.rolePacks).filter((name) => /stale/i.test(name))).toEqual([])
  })

  it("lets a register row hang under a parent row", () => {
    expect(columnNames(schema.registerItems)).toContain("parent_id")
  })
})

describe("register migration script", () => {
  const script = codeOnly(src("scripts/create-registers-tables.mjs"))

  it("is additive only", () => {
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).not.toMatch(/TRUNCATE/i)
    expect(script).not.toMatch(/ALTER COLUMN/i)
  })

  it("creates exactly the two tables, idempotently", () => {
    expect((script.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length).toBe(2)
    expect(script).toMatch(/information_schema/i)
  })

  it("seeds from the one pack module and never overwrites an edited pack", () => {
    expect(script).toMatch(/packs\/seed\.ts/)
    expect(script).toMatch(/ON CONFLICT \(pack_key\) DO NOTHING/)
  })

  it("keeps the rollback behind an explicit opt-in", () => {
    const rollback = codeOnly(src("scripts/rollback-registers-tables.mjs"))
    expect(rollback).toMatch(/REGISTERS_ROLLBACK !== "yes"/)
    expect(rollback).toMatch(/TABLES\.length !== 2/)
  })
})
