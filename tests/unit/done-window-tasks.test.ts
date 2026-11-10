// Source guards for the tasks page's Done window.
//
// The tasks page is a query tool, so the same control that shortens the board's Done column has to
// start here wide open — and it must narrow only the list a member is reading, never the KPI strip
// and charts, which are counted from a separate all-time read. These hold that split.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const PAGE = "app/dashboard/tasks/page.tsx"

function region(name: string, from: string, to: string): string {
  const page = codeOnly(src(PAGE))
  const start = page.indexOf(from)
  const end = page.indexOf(to, start + from.length)
  expect(start, name).toBeGreaterThan(-1)
  return page.slice(start, end > -1 ? end : page.length)
}

describe("the list narrows; the counts behind it do not", () => {
  it("starts on the window that hides nothing", () => {
    const page = codeOnly(src(PAGE))
    expect(page).toMatch(/const TASKS_DONE_DEFAULT: DoneWindow = "all"/)
    expect(page).toMatch(/useState<DoneWindow>\(TASKS_DONE_DEFAULT\)/)
  })

  it("sends the window only from the visible read", () => {
    const visible = region("loadVisible", "const loadVisible = useCallback", "useEffect(() => {\n    loadBase()")
    expect(visible).toMatch(/const windowParam = doneWindowParam\(doneWindow, TASKS_DONE_DEFAULT\)/)
    expect(visible).toMatch(/if \(windowParam\) params\.set\("doneWindow", windowParam\)/)
    expect(visible).toMatch(/cadenceFilter, search, scopeParam, doneWindow, toast\]/)
  })

  it("leaves the all-time read that feeds the KPIs and charts alone", () => {
    const raw = region("loadRawTasks", "const loadRawTasks = useCallback", "const loadBase = useCallback")
    expect(raw).toMatch(/\/api\/tasks\?page=\$\{page\}&pageSize=100&\$\{scopeParam\}/)
    expect(raw).not.toMatch(/doneWindow/)
  })
})

describe("the window is part of the list's own state", () => {
  it("returns to the first page when the window changes", () => {
    const page = codeOnly(src(PAGE))
    const change = page.slice(page.indexOf("const changeDoneWindow"), page.indexOf("const changeDoneWindow") + 400)
    expect(change).toMatch(/setDoneWindow\(next\)/)
    expect(change).toMatch(/setPagination\(\(p\) => \(\{ \.\.\.p, page: 1 \}\)\)/)
  })

  it("names the window it counted on the showing line", () => {
    const page = codeOnly(src(PAGE))
    expect(page).toMatch(/doneWindowPhrase\(doneWindow, true\)/)
  })

  it("collapses what the window left out to one line that widens it", () => {
    const page = codeOnly(src(PAGE))
    expect(page).toMatch(/earlierDoneLabel\(/)
    expect(page).toMatch(/changeDoneWindow\("all"\)/)
    expect(page).toMatch(/donePayload\?\.window === doneWindow/)
  })
})

describe("a finished row says which day it finished", () => {
  it("shows the completion day in all three views", () => {
    const page = codeOnly(src(PAGE))
    expect(page.match(/doneLine\(t\)/g)?.length).toBe(3)
    expect(page).toMatch(/completionDayLabel\(t\.completedOn, todayIso\)/)
  })

  it("says nothing about a row that has no completion day", () => {
    const page = codeOnly(src(PAGE))
    const line = page.slice(page.indexOf("const doneLine"), page.indexOf("const doneLine") + 300)
    expect(line).toMatch(/if \(!t\.completedOn\) return null/)
  })
})
