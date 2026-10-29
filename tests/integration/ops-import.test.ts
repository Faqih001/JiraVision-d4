import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("ops import", () => {
  it("has the extract API route", () => {
    const content = src("app/api/ops/import/extract/route.ts")
    expect(content).toContain("extractFromDocument")
    expect(content).toContain("POST")
  })

  it("has the commit API route", () => {
    const content = src("app/api/ops/import/commit/route.ts")
    expect(content).toContain("commitExtraction")
    expect(content).toContain("POST")
  })

  it("has the import page", () => {
    const content = src("app/dashboard/ops/import/page.tsx")
    expect(content).toContain("Import from document")
    expect(content).toContain("/api/ops/import/extract")
    expect(content).toContain("/api/ops/import/commit")
  })

  it("the extract route gates on auth", () => {
    const content = src("app/api/ops/import/extract/route.ts")
    expect(content).toMatch(/getSession|opsSession/)
    expect(content).toContain("unauthorized")
  })

  it("the commit route gates on auth", () => {
    const content = src("app/api/ops/import/commit/route.ts")
    expect(content).toMatch(/getSession|opsSession/)
    expect(content).toContain("unauthorized")
  })

  it("the import page handles all five phases", () => {
    const content = src("app/dashboard/ops/import/page.tsx")
    for (const phase of ["upload", "extracting", "preview", "committing", "done"]) {
      expect(content).toContain(phase)
    }
  })

  it("the sidebar includes the import link", () => {
    const content = src("components/dashboard-layout.tsx")
    expect(content).toContain("/dashboard/ops/import")
    expect(content).toContain("Import document")
  })

  it("the overview page links to import", () => {
    const content = src("app/dashboard/ops/page.tsx")
    expect(content).toContain("/dashboard/ops/import")
  })
})
