// A sprint you just created has no tasks in it yet. /api/sprints?scope=mine means "sprints this
// member holds an assigned task in", so an empty sprint is invisible there by definition — which
// is right for a personal board and wrong for the page whose job is to create sprints.
//
// Two sprints created on production (ids 9 and 10, 2026-11-09) both had zero tasks and vanished
// from the list the moment the create dialog closed. These guards hold the page open on a scope
// that can show its own output, and keep a create from landing somewhere the viewer cannot see.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const PAGE = "app/dashboard/sprints/page.tsx"
const ROUTE = "app/api/sprints/route.ts"

describe("the sprint page shows the sprint it just made", () => {
  it("opens on the workspace, not on a task-derived scope", () => {
    const page = codeOnly(src(PAGE))
    expect(page).toMatch(/const \[boardScope, setBoardScope\] = useState<"mine" \| "workspace">\("workspace"\)/)
  })

  it("keeps My sprints as a choice the viewer makes, not the one they land on", () => {
    const page = codeOnly(src(PAGE))
    expect(page).toContain('setBoardScope("mine")')
    expect(page).toContain('aria-label="Sprint scope"')
  })

  it("moves a create into the scope that can hold it", () => {
    // A create is a workspace act. If the viewer had narrowed to My sprints, the new row would
    // be filtered out of the very list the dialog just closed onto.
    const page = codeOnly(src(PAGE))
    const save = page.slice(page.indexOf("const saveSprint ="))
    const body = save.slice(0, save.indexOf("const transitionSprint ="))
    expect(body).toMatch(/if \(!draft\.id\) setBoardScope\("workspace"\)/)
  })

  it("leaves the member scope on the API alone — a personal board still needs it", () => {
    const route = codeOnly(src(ROUTE))
    expect(route).toContain('searchParams.get("scope") === "mine"')
    expect(route).toContain("rows = rows.filter((r) => mine.has(r.id))")
  })
})