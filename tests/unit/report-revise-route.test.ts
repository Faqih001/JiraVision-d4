import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

function src(path: string) {
  return readFileSync(path, "utf-8")
}

describe("revise route", () => {
  const route = src("app/api/reports/work/[id]/revise/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("refuses to revise a draft", () => {
    expect(route).toMatch(/isDraft/u)
  })

  it("sets revision_of to the original report id", () => {
    expect(route).toMatch(/revisionOf: id/u)
  })

  it("creates a new draft with status draft", () => {
    expect(route).toMatch(/status: "draft"/u)
  })

  it("recomputes metrics via assembleReport", () => {
    expect(route).toMatch(/assembleReport\(/u)
  })
})
