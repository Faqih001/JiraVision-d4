import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  COMPLETED_TASK_STATUSES,
  creatableStatusesFor,
  isCompletedTaskStatus,
  statusAfterCadenceChange,
} from "@/lib/tasks/statuses"

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

describe("a create form offers only the statuses the writer will accept", () => {
  const ALL = ["todo", "in_progress", "review", "blocked", "done"]

  it("offers everything for a one-off, however the absence of a cadence arrives", () => {
    for (const cadence of ["one-off", null, undefined, ""]) {
      expect(creatableStatusesFor(cadence, ALL), String(cadence)).toEqual(ALL)
    }
  })

  it("drops the finished words for every schedule cadence", () => {
    for (const cadence of ["daily", "weekly", "monthly", "quarterly", "yearly"]) {
      expect(creatableStatusesFor(cadence, ALL), cadence).toEqual([
        "todo",
        "in_progress",
        "review",
        "blocked",
      ])
    }
  })

  it("drops a legacy finished literal too, not just 'done'", () => {
    expect(creatableStatusesFor("daily", ["todo", "completed", "closed"])).toEqual(["todo"])
  })

  it("hands back a new array rather than filtering the caller's vocabulary in place", () => {
    const vocabulary = ["todo", "done"]
    expect(creatableStatusesFor("daily", vocabulary)).not.toBe(vocabulary)
    expect(vocabulary).toEqual(["todo", "done"])
  })
})

describe("a cadence change keeps a status the writer will still accept", () => {
  const ALL = ["todo", "in_progress", "review", "blocked", "done"]

  it("holds the pick when the new cadence can still carry it", () => {
    expect(statusAfterCadenceChange("weekly", "in_progress", ALL)).toBe("in_progress")
    expect(statusAfterCadenceChange("one-off", "done", ALL)).toBe("done")
  })

  it("falls back to the first state a template can hold", () => {
    expect(statusAfterCadenceChange("daily", "done", ALL)).toBe("todo")
    expect(statusAfterCadenceChange("monthly", "completed", ALL)).toBe("todo")
  })

  it("settles a word the filtered list does not carry, even an open one", () => {
    expect(statusAfterCadenceChange("daily", "backlog", ALL)).toBe("todo")
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
