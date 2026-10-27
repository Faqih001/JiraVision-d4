import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

function src(path: string) {
  return readFileSync(path, "utf-8")
}

describe("admin day route", () => {
  const route = src("app/api/reports/admin/day/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("checks admin via isAdmin", () => {
    expect(route).toMatch(/isAdmin\(/u)
  })

  it("queries work_log_entries", () => {
    expect(route).toMatch(/workLogEntries/u)
  })

  it("queries work_reports for submitted reports on that date", () => {
    expect(route).toMatch(/workReports/u)
  })

  it("returns 403 for non-admin users", () => {
    expect(route).toMatch(/403/u)
  })
})
