import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

// The tasks filter bar grew a sort control and the row spilled onto a second line, which pushed
// "Recently updated" — the one control read every day — out of view. The cause was not the new
// control; it was six dropdowns each holding a width guessed in 2025 (w-36, w-40) that their own
// text never needed. So the bar and its controls share one contract, sized by the text inside
// them, and this file keeps anybody from guessing a width again.

const repo = path.resolve(__dirname, "..", "..")
const read = (relative: string) =>
  readFileSync(path.join(repo, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

const kit = read("components/dashboard-kit.tsx")
const tasks = read("app/dashboard/tasks/page.tsx")

/** Every page under app/dashboard — the surface a filter bar can live on. */
function barFiles(dir = path.join(repo, "app/dashboard"), found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) barFiles(absolute, found)
    else if (entry.name.endsWith(".tsx")) found.push(path.relative(repo, absolute))
  }
  return found
}

/** Each `<SelectTrigger …>` tag in a file, opening bracket to closing bracket. */
function triggers(source: string): string[] {
  return source.match(/<SelectTrigger[\s\S]*?>/g) ?? []
}

describe("a filter bar is sized by what it holds", () => {
  it("hands its controls a width that follows their own text", () => {
    expect(kit).toMatch(/export const FILTER_TRIGGER = "[^"]*\bw-auto\b[^"]*"/)
    expect(kit).toMatch(/export const FILTER_TRIGGER = "[^"]*\bshrink-0\b[^"]*"/)
    expect(kit).toMatch(/export const FILTER_TRIGGER = "[^"]*max-w-\[13rem\][^"]*"/)
  })

  it("gives the row a gap small enough to hold six controls on one line", () => {
    expect(kit).toMatch(/export const FILTER_BAR = "flex flex-wrap items-center gap-1\.5/)
  })

  it("makes the search field the only thing that stretches or shrinks", () => {
    expect(kit).toMatch(/export const FILTER_SEARCH = "relative min-w-0 flex-1/)
  })

  it("keeps the sort control in the bar, not on a row of its own", () => {
    const bar = tasks.slice(tasks.indexOf("className={FILTER_BAR}"))
    const inside = bar.slice(0, bar.indexOf("</CardContent>"))
    expect(inside).toContain('aria-label="Sort tasks"')
    expect(inside).toContain('aria-label="Filter by cadence"')
    expect(inside).toMatch(/<SelectTrigger className=\{FILTER_TRIGGER\} aria-label="Sort tasks">/)
  })

  it("leaves no bar dropdown with a hand-guessed width", () => {
    // Only the two shapes this wave removed: a control sized in rem with the text size the guess
    // was made for. A dropdown inside a table cell (billing's per-invoice status) is sized to its
    // column and holds one short word, so it was never the complaint and is not in scope here.
    const offenders: string[] = []
    for (const file of barFiles()) {
      for (const tag of triggers(read(file))) {
        if (/className="h-9 w-\d+ text-sm"|className="h-8 w-\d+ text-xs"/.test(tag)) {
          offenders.push(`${file}: ${tag.trim()}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("has every bar use the shared row class", () => {
    const offenders: string[] = []
    for (const file of barFiles()) {
      const source = read(file)
      if (/className="flex flex-wrap items-center gap-2 py-3"/.test(source)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})
