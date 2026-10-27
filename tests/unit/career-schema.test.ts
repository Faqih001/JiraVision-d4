import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const columnNames = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("career schema", () => {
  it("declares the five phase-12 tables under their SQL names", () => {
    for (const table of [
      schema.careerLevels,
      schema.careerPlacement,
      schema.careerSignoffs,
      schema.careerRequests,
      schema.growthReviews,
    ]) {
      expect(table).toBeInstanceOf(PgTable)
    }
    expect(getTableConfig(schema.careerLevels).name).toBe("career_levels")
    expect(getTableConfig(schema.careerPlacement).name).toBe("career_placement")
    expect(getTableConfig(schema.careerSignoffs).name).toBe("career_signoffs")
    expect(getTableConfig(schema.careerRequests).name).toBe("career_requests")
    expect(getTableConfig(schema.growthReviews).name).toBe("growth_reviews")
  })

  it.each([
    [
      "career_levels",
      ["discipline", "level", "title", "summary", "expectations", "band_min", "band_max",
        "band_currency", "signals", "checklist", "is_active"],
    ],
    [
      "career_placement",
      ["user_id", "discipline", "level", "placed_by", "placed_at", "note"],
    ],
    [
      "career_signoffs",
      ["user_id", "level_id", "item_key", "status", "ticked_by", "ticked_at", "note"],
    ],
    [
      "career_requests",
      ["user_id", "discipline", "from_level", "to_level", "status", "evidence", "note",
        "requested_at", "reviewed_by", "reviewed_at", "return_note", "effective_date"],
    ],
    [
      "growth_reviews",
      ["user_id", "kind", "period_start", "period_end", "payload", "narrative",
        "source_refs", "as_of", "model", "ai_marked"],
    ],
  ] as const)("%s carries its columns", (name, expected) => {
    const table = {
      career_levels: schema.careerLevels,
      career_placement: schema.careerPlacement,
      career_signoffs: schema.careerSignoffs,
      career_requests: schema.careerRequests,
      growth_reviews: schema.growthReviews,
    }[name]
    const names = columnNames(table)
    for (const column of expected) expect(names).toContain(column)
  })

  it("keeps one rung per discipline and level, and one placement per discipline", () => {
    const levels = getTableConfig(schema.careerLevels).indexes.find(
      (index) => index.config.name === "career_levels_discipline_level_idx",
    )
    expect(levels?.config.unique).toBe(true)
    expect(levels?.config.columns.map((column) => (column as { name?: string }).name)).toEqual([
      "discipline",
      "level",
    ])

    const placementPk = getTableConfig(schema.careerPlacement).primaryKeys[0]
    expect(placementPk.columns.map((column) => (column as { name?: string }).name)).toEqual([
      "user_id",
      "discipline",
    ])
  })

  it("does not store what an individual is paid", () => {
    // Anchored on snake_case boundaries: `payload` is a growth snapshot, not a wage.
    const pay = /^(band|pay|salary|compensation|rate)(_|$)/i
    for (const table of [schema.careerPlacement, schema.careerRequests, schema.growthReviews]) {
      expect(columnNames(table).filter((name) => pay.test(name))).toEqual([])
    }
    // Bands are config about the rung, and they live on the rung.
    expect(columnNames(schema.careerLevels)).toEqual(
      expect.arrayContaining(["band_min", "band_max", "band_currency"]),
    )
  })
})

describe("career migration script", () => {
  const script = codeOnly(src("scripts/create-career-tables.mjs"))

  it("is additive only", () => {
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).not.toMatch(/TRUNCATE/i)
    expect(script).not.toMatch(/ALTER COLUMN/i)
  })

  it("creates exactly the five tables, idempotently", () => {
    expect((script.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length).toBe(5)
    expect(script).toMatch(/information_schema/i)
  })

  it("seeds from the one ladder module and never overwrites an edited rung", () => {
    expect(script).toMatch(/ladder-seed\.ts/)
    expect(script).toMatch(/ON CONFLICT \(discipline, level\) DO NOTHING/)
  })

  it("keeps the rollback behind an explicit opt-in", () => {
    const rollback = codeOnly(src("scripts/rollback-career-tables.mjs"))
    expect(rollback).toMatch(/CAREER_ROLLBACK !== "yes"/)
    expect(rollback).toMatch(/TABLES\.length !== 5/)
  })
})
