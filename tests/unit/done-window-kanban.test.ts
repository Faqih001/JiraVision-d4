// Source guards for the Done column's window.
//
// The window itself is a WHERE clause (tests/unit/done-window-read.test.ts holds the SQL, and
// done-window-wiring.test.ts the read), so what these hold is the other half: the choice has to
// survive a reload, the column has to group by the day the server named, and a card the read could
// not date has to stay on screen instead of falling through a `Map` lookup.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const KANBAN = "app/dashboard/kanban/page.tsx"
const KIT = "components/dashboard-kit.tsx"

describe("the Done window segment is one shared control", () => {
  it("offers every window the vocabulary has, in its declared order", () => {
    const kit = codeOnly(src(KIT))
    expect(kit).toMatch(/export function DoneWindowSegment/)
    expect(kit).toMatch(/DONE_WINDOWS\.map/)
    expect(kit).toMatch(/role="group"/)
  })

  it("says which choice is live to a screen reader", () => {
    const kit = codeOnly(src(KIT))
    const segment = kit.slice(kit.indexOf("export function DoneWindowSegment"))
    expect(segment).toMatch(/aria-pressed=\{value === w\}/)
    expect(segment).toMatch(/variant=\{value === w \? "secondary" : "ghost"\}/)
  })
})

describe("the board carries its Done window in the address", () => {
  it("defaults the board to a week", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/const KANBAN_DONE_DEFAULT: DoneWindow = "week"/)
    expect(page).toMatch(/resolveDoneWindow\(urlParams\.get\("done"\), KANBAN_DONE_DEFAULT\)/)
  })

  it("asks the API for the window on both the load and the live tick", () => {
    const page = codeOnly(src(KANBAN))
    const asks = page.match(/\/api\/tasks\?pageSize=200&\$\{scopeParam\}\$\{dateQuery\}\$\{doneQuery\}/g) ?? []
    expect(asks.length).toBe(2)
    expect(page).toMatch(
      /const doneQuery = doneWindowParam\(doneWindow, KANBAN_DONE_DEFAULT\) \? `&done=\$\{doneWindow\}` : ""/,
    )
  })

  it("keeps the day and the window in one address so neither drops the other", () => {
    const page = codeOnly(src(KANBAN))
    const builder = page.slice(page.indexOf("const boardPath = useCallback"))
    expect(builder).toMatch(/boardDayParam\(/)
    expect(builder).toMatch(/doneWindowParam\(/)
    expect(builder).toMatch(/URLSearchParams/)
    expect(page).toMatch(/goToDay[\s\S]{0,200}boardPath\(iso, doneWindow\)/)
    expect(page).toMatch(/goToWindow[\s\S]{0,300}boardPath\(boardDay\.iso, window\)/)
  })
})

describe("the Done column shows the window it asked for", () => {
  it("renders the segment only where a window means something", () => {
    const page = codeOnly(src(KANBAN))
    const board = page.slice(page.indexOf("{view === \"board\" ? ("))
    expect(board.match(/<DoneWindowSegment/g)?.length).toBe(1)
    expect(board).toMatch(/col\.status === "done"[\s\S]{0,200}<DoneWindowSegment/)
  })

  it("groups the cards under the day each one closed", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/groupByCompletionDay\(/)
    expect(page).toMatch(/\{group\.label\}/)
    expect(page).toMatch(/group\.rows\.map\(\(t\) => renderCard\(t, !readOnly\)\)/)
  })

  it("collapses what the window left out to one line that widens it", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/earlierDoneLabel\(/)
    expect(page).toMatch(/goToWindow\("all"\)/)
    // The line reads the server's count of the rows the window hid, never a length of the rows it
    // was already given, and it stays silent when nothing was hidden.
    expect(page).toMatch(/\(donePayload\?\.earlier ?? 0\) > 0/)
    expect(page).not.toMatch(/earlierDoneLabel\(doneTasks\.length\)/)
  })

  it("labels the done total with the window it actually counted", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/doneWindowPhrase\(doneWindow, boardDay\.isToday\)/)
  })
})

describe("a schedule card is never caught by the window", () => {
  it("dates a schedule's card by the day being drawn, not by the row", () => {
    const page = codeOnly(src(KANBAN))
    expect(page).toMatch(/t\.completedOn \?\? \(isRecurring\(t\) \? boardDay\.iso : null\)/)
  })

  it("keeps a card the read could not date on screen", () => {
    const page = codeOnly(src(KANBAN))
    const groups = page.slice(page.indexOf("const doneView = useMemo"))
    expect(groups).toMatch(/doneDayOf\(t\) === null/)
    expect(page).toMatch(/undated\.map\(\(t\) => renderCard\(t, !readOnly\)\)/)
  })
})
