import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const source = readFileSync(resolve("app/api/reports/_shared.ts"), "utf8")

describe("the extended CSV datasets", () => {
  it("registers four new datasets: worklog, deliverables, plans, work_reports", () => {
    expect(source).toMatch(/worklog:\s*\{/u)
    expect(source).toMatch(/deliverables:\s*\{/u)
    expect(source).toMatch(/plans:\s*\{/u)
    expect(source).toMatch(/work_reports:\s*\{/u)
  })

  it("worklog dataset has kind, discipline, and day groupBys", () => {
    expect(source).toMatch(/worklog:[\s\S]*?groupBys:[\s\S]*?kind[\s\S]*?discipline[\s\S]*?day/)
  })

  it("deliverables dataset has status, type, and discipline groupBys", () => {
    expect(source).toMatch(/deliverables:[\s\S]*?groupBys:[\s\S]*?status[\s\S]*?type[\s\S]*?discipline/)
  })

  it("plans dataset has status groupBy", () => {
    expect(source).toMatch(/plans:[\s\S]*?groupBys:[\s\S]*?status/)
  })

  it("work_reports dataset has status, template, and periodType groupBys", () => {
    expect(source).toMatch(/work_reports:[\s\S]*?groupBys:[\s\S]*?status[\s\S]*?template[\s\S]*?periodType/)
  })

  it("buildDataset handles worklog queries", () => {
    expect(source).toMatch(/if\s*\(dataset\s*===\s*"worklog"\)/u)
    expect(source).toMatch(/FROM work_log_entries/u)
  })

  it("buildDataset handles deliverables queries", () => {
    expect(source).toMatch(/if\s*\(dataset\s*===\s*"deliverables"\)/u)
    expect(source).toMatch(/FROM deliverables/u)
  })

  it("buildDataset handles plans queries", () => {
    expect(source).toMatch(/if\s*\(dataset\s*===\s*"plans"\)/u)
    expect(source).toMatch(/FROM agent_plans/u)
  })

  it("buildDataset handles work_reports queries", () => {
    expect(source).toMatch(/if\s*\(dataset\s*===\s*"work_reports"\)/u)
    expect(source).toMatch(/FROM work_reports/u)
  })
})
