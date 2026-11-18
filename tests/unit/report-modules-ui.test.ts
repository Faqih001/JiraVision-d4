import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (path: string) => readFileSync(resolve(path), "utf8")
const client = () => src("app/dashboard/reports-work/reports-client.tsx")
const modulesFile = () => src("app/dashboard/reports-work/module-sections.tsx")
const overviewFile = () => src("app/dashboard/reports-work/overview.tsx")

/** Comment-stripped: a guard about the code cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the module section cards", () => {
  it("live in their own file, so the six computed cards keep their pinned shape", () => {
    expect(codeOnly(modulesFile())).toContain("export function ModuleSectionCard")
    expect(codeOnly(modulesFile())).toContain("export function TimelineSection")
  })

  it("read the pure module helpers and never recompute the numbers", () => {
    const code = codeOnly(modulesFile())
    expect(code).toContain("moduleRowsFor")
    expect(code).toContain("visibleModuleRows")
    expect(code).toContain("hiddenModuleRowCount")
    expect(code).toContain("moduleCaption")
    expect(code).not.toMatch(/\.reduce\(|groupBy|aggregateReport\(/u)
    expect(code).not.toMatch(/fetch\(|useState/u)
    expect(code).not.toMatch(/toISOString\(\)\.slice\(0, *10\)/u)
  })

  it("hide a module with no rows instead of printing an empty card", () => {
    expect(codeOnly(modulesFile())).toMatch(/rows\.length === 0[\s\S]{0,40}return null/u)
  })

  it("badge every timeline row with the module it came from", () => {
    expect(codeOnly(modulesFile())).toContain("MODULE_LABEL[row.source]")
  })
})

describe("the builder wiring", () => {
  it("renders a card for every module section and the merged timeline", () => {
    const code = codeOnly(client())
    expect(code).toContain("MODULE_SECTIONS")
    expect(code).toContain("ModuleSectionCard")
    expect(code).toContain("TimelineSection")
    expect(code).toContain("moduleRowsFor")
  })

  it("only mounts module cards that have rows", () => {
    expect(codeOnly(client())).toMatch(/moduleRowsFor\(section, aggregate\)\.length > 0/u)
  })

  it("fetches the preview in both views, so the list view's mix card shows live numbers", () => {
    const code = codeOnly(client())
    const previewAt = code.indexOf("/api/reports/work/preview")
    const buildBranchAt = code.indexOf('if (state.view === "build")')
    expect(previewAt).toBeGreaterThan(-1)
    expect(buildBranchAt).toBeGreaterThan(-1)
    expect(previewAt).toBeLessThan(buildBranchAt)
  })

  it("keeps the six computed row sections and the two source labels untouched", () => {
    const code = codeOnly(client())
    expect(code.match(/row\("/gu)).toHaveLength(6)
    expect(code.match(/sourceLabel=\{SOURCE_LABEL\[source\]\}/gu)).toHaveLength(2)
  })
})

describe("the workspace mix card", () => {
  it("is a presentational card in the overview, fed by the aggregate's byModule", () => {
    const code = codeOnly(overviewFile())
    expect(code).toContain("export function WorkspaceMixSection")
    expect(code).toContain("byModule")
    expect(code).not.toMatch(/fetch\(|useState|useRouter|\.reduce\(/u)
  })

  it("is rendered by the list view", () => {
    expect(codeOnly(client())).toContain("WorkspaceMixSection")
  })
})

describe("the docs record the rework", () => {
  it("pins the dated section in each deliverable doc", () => {
    expect(src("FEATURES.md")).toMatch(/## 62\. Period reports read the whole workspace \(2026-11-18\)/u)
    expect(src("DESIGN_SYSTEM.md")).toMatch(/## 19\. Period reports read the whole workspace \(2026-11-18\)/u)
    expect(src("PLACEHOLDERS.md")).toMatch(/## 16\. Period reports read the whole workspace \(2026-11-18\) — no new placeholder/u)
  })
})