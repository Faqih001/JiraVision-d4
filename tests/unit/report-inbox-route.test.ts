import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

function src(path: string) {
  return readFileSync(path, "utf-8")
}

describe("inbox route", () => {
  const route = src("app/api/reports/inbox/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("queries work_report_recipients for the user", () => {
    expect(route).toMatch(/workReportRecipients/u)
  })

  it("filters to submitted reports only", () => {
    expect(route).toMatch(/submitted/u)
  })

  it("includes admin override via isAdmin", () => {
    expect(route).toMatch(/isAdmin\(/u)
  })
})
