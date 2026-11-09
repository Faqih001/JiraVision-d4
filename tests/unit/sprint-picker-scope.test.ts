// /api/sprints?scope=mine means "sprints this member holds an assigned task in". Right for a
// personal list of what you are inside; wrong for a dropdown whose job is to name every sprint a
// card could belong to. Under that scope a newly created sprint — which has no tasks by
// definition until someone puts one in it — could not be picked on kanban, tasks, calendar or
// backlog, and a card already holding it rendered with no sprint label at all.
//
// The board's My board / Workspace toggle stays: it decides which *tasks* are drawn. What it must
// not decide is which sprints exist. Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

/** Every `fetch("/api/sprints…")` url in a file, template interpolation left intact. */
function sprintFetches(source: string): string[] {
  return [...codeOnly(source).matchAll(/fetch\(\s*[`"'](\/api\/sprints[^`"']*)[`"']/g)].map((m) => m[1])
}

function dashboardPages(): string[] {
  const root = resolve(process.cwd(), "app/dashboard")
  return readdirSync(root, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => entry.endsWith("page.tsx"))
    .map((entry) => join("app/dashboard", entry))
}

const PICKERS = [
  "app/dashboard/kanban/page.tsx",
  "app/dashboard/tasks/page.tsx",
  "app/dashboard/calendar/page.tsx",
  "app/dashboard/backlog/page.tsx",
  "app/dashboard/page.tsx",
]

describe("a sprint picker lists every sprint in the workspace", () => {
  it("finds the dashboard pages it is guarding", () => {
    expect(dashboardPages().length).toBeGreaterThan(20)
    for (const page of PICKERS) expect(dashboardPages()).toContain(page)
  })

  it("narrows no sprint read on any dashboard page", () => {
    // App-wide rather than per-file: the next page that grows a sprint dropdown should hit this
    // test instead of repeating the mistake.
    for (const page of dashboardPages()) {
      for (const url of sprintFetches(src(page))) {
        expect(`${page} → ${url}`).not.toMatch(/scope=mine/)
        expect(`${page} → ${url}`).not.toMatch(/scopeParam/)
      }
    }
  })

  it("asks for the workspace scope out loud where the defect lived", () => {
    for (const page of PICKERS) {
      expect(sprintFetches(src(page)), page).toContain("/api/sprints?scope=all")
    }
  })

  it("leaves the board scope on the task reads, where it belongs", () => {
    for (const page of PICKERS.slice(0, 4)) {
      const code = codeOnly(src(page))
      const scoped = [...code.matchAll(/fetch\([`"'](\/api\/(?:tasks|calendar\/events))[^`"']*\$\{scopeParam\}/g)].map((m) => m[1])
      expect(scoped.length, `${page} still scopes its own rows`).toBeGreaterThan(0)
    }
  })
})
