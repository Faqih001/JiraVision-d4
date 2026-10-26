import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { ROW_SECTIONS } from "@/lib/reports/row-sections"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const page = () => src("app/dashboard/reports-work/page.tsx")
const client = () => src("app/dashboard/reports-work/reports-client.tsx")
const sectionsFile = () => src("app/dashboard/reports-work/sections.tsx")

/** Comment-stripped: a guard about the code cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the reports-work page", () => {
  it("is reachable from the dashboard nav", () => {
    expect(src("components/dashboard-layout.tsx")).toMatch(/href: "\/dashboard\/reports-work"/u)
  })

  it("wraps the client in Suspense, because useSearchParams needs a render boundary", () => {
    expect(page()).toMatch(/<Suspense fallback=\{<ReportsSkeleton \/>\}/u)
    expect(page()).toMatch(/export const dynamic = "force-dynamic"/u)
  })

  it("has exactly one URL rewrite, and adopts the query before it writes", () => {
    // The phase-2 lesson: a third effect, or a rewrite compared against an un-stripped
    // location.search, re-renders in a loop and the back button stops working.
    expect(codeOnly(client()).match(/router\.replace/gu)).toHaveLength(1)
    expect(client()).toMatch(
      /serializeReportView\(parsed, todayIso\) !== serializeReportView\(prev, todayIso\)/u,
    )
    expect(client()).toMatch(/const current = window\.location\.search\.replace/u)
  })

  it("takes the day from the server, not the browser clock", () => {
    expect(client()).toMatch(/const serverToday = listJson\.data\.today as string/u)
    expect(client()).toMatch(/prev\.anchor === todayIso \? \{ \.\.\.prev, anchor: serverToday \}/u)
    // toISOString().slice(0, 10) is yesterday for anyone west of UTC, and a report dated wrong
    // is worse than one dated late.
    expect(codeOnly(client())).not.toMatch(/toISOString\(\)\.slice\(0, *10\)/u)
    expect(codeOnly(sectionsFile())).not.toMatch(/toISOString\(\)\.slice\(0, *10\)/u)
  })

  it("never invents a period, and never re-runs the arithmetic", () => {
    // One home for the maths (lib/reports/aggregate.ts) and one home for the span
    // (lib/reports/view-state.ts). A card that totals its own rows is a second opinion.
    expect(client()).toMatch(/resolveReportPeriod\(state\)/u)
    expect(codeOnly(sectionsFile())).not.toMatch(/\.reduce\(|groupBy|aggregateReport\(/u)
  })

  it("renders the empty state instead of a spinner when there is nothing to show", () => {
    expect(sectionsFile()).toMatch(/No reports yet/u)
    expect(sectionsFile()).toMatch(/function ReportEmptyNote/u)
  })
})

describe("the builder's write path", () => {
  const dialogs = () => src("app/dashboard/reports-work/dialogs.tsx")

  it("sends the whole prose set on save, so a stored draft always has every section key", () => {
    expect(client()).toMatch(/PROSE_SECTIONS\.map\(\(key\) => \[key, \{ text: prose\[key\] \?\? "" \}\]/u)
    expect(client()).toMatch(/method: "PATCH"/u)
  })

  it("keeps one dirty comparison, in one place", () => {
    expect(client()).toMatch(/function serializeProse/u)
    expect((codeOnly(client()).match(/serializeProse\(/gu) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(codeOnly(client())).not.toMatch(/JSON\.stringify\(prose\)/u)
  })

  it("resolves an auto template before creating a draft", () => {
    // The route only ever stores a real template id; `auto` is a UI choice, not a column value.
    expect(client()).toMatch(/effectiveTemplate\(state, aggregate\)/u)
    expect(dialogs()).toMatch(/TEMPLATE_LABEL/u)
  })

  it("refuses to save a report it has not loaded", () => {
    // Two plan guards could not match the shipped code and are corrected here: saveDraft
    // refuses with a braced block plus a toast (the toast is the point — the member is told
    // why), and the recompute call uses a template literal, not a quoted path. The one-line
    // `if (!report) return` form does exist, in recompute, where there is nothing to explain.
    expect(client()).toMatch(/if \(!report\) \{/u)
    expect(client()).toMatch(/if \(!report\) return/u)
    expect(client()).toMatch(/Nothing to save/u)
  })

  it("asks before deleting, and never deletes on a single click", () => {
    // The DELETE only exists inside the confirmed action; the button only sets pendingDelete.
    expect(client()).toMatch(/setPendingDelete\(report\)/u)
    expect(client()).toMatch(/if \(!pendingDelete\) return/u)
    expect(client()).toMatch(/method: "DELETE"/u)
    expect(dialogs()).toMatch(/ConfirmReportDelete/u)
  })

  it("disables the write buttons while a write is in flight", () => {
    expect(client()).toMatch(/onClick=\{\(\) => void saveDraft\(\)\} disabled=\{busy\}/u)
    expect(client()).toMatch(/disabled=\{busy \|\| report === null\}/u)
    expect(dialogs()).toMatch(/disabled=\{busy \|\| draft\.title\.trim\(\) === ""\}/u)
  })

  it("recomputes with a POST, not a page reload", () => {
    expect(client()).toMatch(/\/recompute`, \{ method: "POST" \}\)/u)
  })
})

describe("the six computed row cards", () => {
  it("gives every computed section a card in the build view", () => {
    for (const section of ROW_SECTIONS) expect(client()).toContain(`row("${section}")`)
  })

  it("makes the number on the card the length of the rows under it", () => {
    expect(sectionsFile()).toMatch(/const rows = aggregate \? rowsFor\(section, aggregate\) : \[\]/u)
    expect(sectionsFile()).toMatch(/total=\{rows\.length\}/u)
    expect(sectionsFile()).toMatch(/rows=\{shown\}/u)
  })

  it("keeps the drill-down in the URL, where a recipient can be sent to it", () => {
    expect(client()).toMatch(/expanded=\{state\.open === section\}/u)
    expect(client()).toMatch(/patchState\(\{ open: state\.open === section \? null : section \}\)/u)
    // sections.tsx is presentational: it holds no state of its own at all.
    expect(codeOnly(sectionsFile())).not.toMatch(/useState/u)
  })

  it("prints the ids behind the count only once the section is open", () => {
    expect(sectionsFile()).toMatch(/\{row\.ref\}/u)
    expect(sectionsFile()).toMatch(/expanded \? <p className="font-mono/u)
    expect(sectionsFile()).toMatch(/aria-expanded=\{expanded\}/u)
  })

  it("keeps the commentary inside the same card, so ten sections stay ten cards", () => {
    expect(sectionsFile()).toMatch(/<CommentField/u)
    expect(codeOnly(sectionsFile())).not.toMatch(
      /<ProseSection section="(completed|deliverables|inProgress|blocked|overdue|nextPeriod)"/u,
    )
  })

  it("links out only where the link is real", () => {
    expect(sectionsFile()).toMatch(/worklogHref\(period, section\)/u)
    expect(sectionsFile()).toMatch(/refHref\(row\.ref, period\)/u)
    // No invented routes: the planner page arrives with its own phase.
    expect(codeOnly(sectionsFile())).not.toMatch(
      /dashboard\/planner|dashboard\/tasks\/\$\{|dashboard\/deliverables/u,
    )
  })
})
