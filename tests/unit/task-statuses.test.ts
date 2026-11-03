import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { COMPLETED_TASK_STATUSES, isCompletedTaskStatus } from "@/lib/tasks/statuses"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("the completed-task status vocabulary", () => {
  it("counts the three literals a finished task can arrive with", () => {
    expect([...COMPLETED_TASK_STATUSES].sort()).toEqual(["closed", "completed", "done"])
  })

  it("matches the stored literal, trimmed and case-folded", () => {
    expect(isCompletedTaskStatus(" Done ")).toBe(true)
    expect(isCompletedTaskStatus("completed")).toBe(true)
  })

  it("leaves open work and unknown words out", () => {
    for (const status of ["todo", "in_progress", "review", "blocked", "", null, undefined]) {
      expect(isCompletedTaskStatus(status), String(status)).toBe(false)
    }
  })
})

describe("the vocabulary has one home", () => {
  it("is imported by the report bucket and both career readers", () => {
    for (const file of [
      "lib/reports/aggregate.ts",
      "lib/career/counts.ts",
      "lib/career/evidence.ts",
    ]) {
      expect(codeOnly(src(file)), file).toMatch(/from "@\/lib\/tasks\/statuses"/u)
    }
  })

  it("leaves no career query pinned to the single 'done' literal", () => {
    // A task imported or seeded as `completed` is finished work; reading only `done`
    // made those rows invisible to the readiness meter.
    for (const file of ["lib/career/counts.ts", "lib/career/evidence.ts"]) {
      const code = codeOnly(src(file))
      expect(code, file).not.toMatch(/toStatus,\s*"done"/u)
      expect(code, file).not.toMatch(/to_status\s*=\s*'done'/u)
    }
  })
})
