import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const source = readFileSync(resolve("lib/export/xlsx.ts"), "utf8")

describe("the XLSX export module", () => {
  it("exports two layouts: report and log", () => {
    expect(source).toContain("export async function exportReportXlsx")
    expect(source).toContain("export async function exportLogXlsx")
  })

  it("uses exceljs", () => {
    expect(source).toMatch(/import.*ExcelJS.*from ["']exceljs["']/u)
  })

  it("follows the filename convention jiravision-<scope>-<stamp>.xlsx", () => {
    expect(source).toContain("jiravision-${scope}-${stamp}.xlsx")
  })

  it("report layout includes multiple sheets", () => {
    expect(source).toContain('addWorksheet("Report")')
    expect(source).toContain('addWorksheet("Completed")')
    expect(source).toContain('addWorksheet("Deliverables")')
    expect(source).toContain('addWorksheet("By discipline")')
    expect(source).toContain('addWorksheet("By status")')
  })

  it("report layout includes monthly series sheet for yearly periods", () => {
    expect(source).toContain('addWorksheet("Monthly series")')
    expect(source).toContain("metrics.period.monthSeries")
  })

  it("freezes the header row in each sheet", () => {
    expect(source).toMatch(/views[\s\S]*?=[\s\S]*?\[[\s\S]*?\{[\s\S]*?state:[\s\S]*?"frozen"[\s\S]*?ySplit:[\s\S]*?1[\s\S]*?\}/)
  })

  it("adds autofilter to data sheets", () => {
    expect(source).toContain("autoFilter")
  })

  it("formats dates and numbers", () => {
    expect(source).toContain("addDateNumberFormats")
    expect(source).toContain("yyyy-mm-dd")
    expect(source).toContain("#,##0")
  })

  it("bolds the header row", () => {
    expect(source).toMatch(/getRow\(1\)\.font[\s\S]*?=[\s\S]*?\{[\s\S]*?bold:[\s\S]*?true[\s\S]*?\}/)
  })
})
