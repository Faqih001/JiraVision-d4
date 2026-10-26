import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

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
