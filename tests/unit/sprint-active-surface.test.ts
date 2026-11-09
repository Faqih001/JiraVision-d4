// Which sprint is "the" active one? On 2026-11-09 production the answer was four, and three
// surfaces each quietly picked one of them:
//
//   app/dashboard/kanban/page.tsx  const activeSprint = sprints.find((s) => s.status === "active")
//   app/dashboard/page.tsx         const { kpis, activeSprint } = overview
//   app/dashboard/tasks/page.tsx   sprintId: overview?.activeSprint?.id ?? ""
//
// A board header naming one of four running sprints is not a filter and not a summary — it is a
// wrong statement about the workspace. These guards hold the set, and hold the shared rule that
// decides the one case where a single sprint is still the right answer: pre-filling a new card.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const KANBAN = "app/dashboard/kanban/page.tsx"
const DASHBOARD = "app/dashboard/page.tsx"
const TASKS = "app/dashboard/tasks/page.tsx"
const LIST_ROUTE = "app/api/sprints/route.ts"
const DETAIL_ROUTE = "app/api/sprints/[id]/route.ts"

describe("the board speaks of active sprints as a set", () => {
  it("kanban no longer picks the first active sprint", () => {
    const code = codeOnly(src(KANBAN))
    expect(code).not.toMatch(/sprints\.find\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.status === "active"\s*\)/)
    expect(code).toContain("activeSprints(")
  })

  it("kanban meters the whole running load", () => {
    expect(codeOnly(src(KANBAN))).toContain("summarizeActiveSprints(")
  })

  it("the dashboard strip does the same", () => {
    const code = codeOnly(src(DASHBOARD))
    expect(code).toContain("activeSprints(")
    expect(code).not.toMatch(/\bactiveSprint\b(?!s)/)
  })

  it("no surface borrows the overview's single active sprint for a default", () => {
    for (const page of [KANBAN, DASHBOARD, TASKS]) {
      expect(codeOnly(src(page)), page).not.toMatch(/overview\?\.activeSprint/)
    }
  })

  it("a new card pre-fills a sprint only when exactly one is running", () => {
    // With four running, guessing one of them into the draft would file work in the wrong place.
    for (const page of [DASHBOARD, TASKS]) {
      expect(codeOnly(src(page)), page).toContain("defaultSprintId(")
    }
  })
})

describe("a sprint read reports the points actually done", () => {
  it("both sprint routes resolve the stored column against live task rows", () => {
    expect(codeOnly(src(LIST_ROUTE))).toContain("reportedCompleted(")
    expect(codeOnly(src(DETAIL_ROUTE))).toContain("reportedCompleted(")
  })

  it("the sprint PUT still maintains the column for the history it records", () => {
    expect(codeOnly(src(DETAIL_ROUTE))).toMatch(/\.set\(\{ completed: /)
  })
})
