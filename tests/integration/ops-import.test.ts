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

describe("ops import D5: faithful + editable preview", () => {
  const pageSrc = () => src("app/dashboard/ops/import/page.tsx")

  it("the preview reuses the server's pure validators, not a second schema", () => {
    const preview = src("lib/ops/import/preview.ts")
    expect(preview).toContain("@/lib/ops/fields")
    expect(preview).toContain("@/lib/registers/fields")
  })

  it("the preview drives editors from the pack schema and the preview helpers", () => {
    const content = pageSrc()
    expect(content).toContain("@/lib/ops/import/preview")
    expect(content).toContain("/api/ops/pack")
    expect(content).toContain("declaredFieldNames")
    expect(content).toContain("validateLogEntry")
    expect(content).toContain("readRegisterFieldsFor")
    expect(content).toContain("setStep")
    expect(content).toContain("IMPORT_TASK_STATUSES")
  })

  it("the preview edits the same extraction object that is committed", () => {
    const content = pageSrc()
    // one mutated extraction state is the commit body — preview and commit cannot diverge
    expect(content).toContain("setExtraction")
    expect(content).toMatch(/body:\s*JSON\.stringify\(\{\s*extraction,/)
    expect(content).not.toContain("LogEntriesTable")
  })

  it("register rows surface the credential refusal inline", () => {
    const content = pageSrc()
    expect(content).toContain("Won't import")
    expect(content).toContain("readRegisterFieldsFor(item.fields)")
  })

  it("commit runs register fields through the credential boundary", () => {
    const content = src("lib/ops/import/commit.ts")
    expect(content).toContain("readRegisterFields")
    expect(content).toMatch(/!read\.ok[\s\S]*skipped\+\+/)
  })

  it("commit honors the task status/priority carried by the row", () => {
    const content = src("lib/ops/import/commit.ts")
    expect(content).toContain("safeTaskStatus(task.status)")
    expect(content).toContain("safeTaskPriority(task.priority)")
  })

  it("the extraction prompt is named for the member's discipline, not hardcoded IT", () => {
    const content = src("lib/ops/import/extract.ts")
    expect(content).not.toContain("belongs to an IT operations context")
    expect(content).not.toContain('"server", "computer", "printer"')
    expect(content).toContain("meta.discipline")
    expect(content).toContain("The kinds for this role are")
  })

  it("carried tasks expose status and priority to the preview", () => {
    const content = src("lib/ops/import/extract.ts")
    expect(content).toContain("status: ImportTaskStatus")
    expect(content).toContain("priority: ImportTaskPriority")
  })

  it("the extract route passes discipline and register kinds to the prompt", () => {
    const content = src("app/api/ops/import/extract/route.ts")
    expect(content).toContain("registerKinds")
    expect(content).toMatch(/extractFromDocument\([\s\S]*discipline,/)
  })

  it("adds no new database table (D5 stays on existing surfaces)", () => {
    const content = pageSrc()
    expect(content).not.toMatch(/method:\s*"PATCH"/)
  })
})

describe("ops import D6: the two document doors point at each other", () => {
  it("the ops import page hands off to the agent handover", () => {
    const content = src("app/dashboard/ops/import/page.tsx")
    expect(content).toContain("/dashboard/agent")
    expect(content).toMatch(/href="\/dashboard\/agent"[\s\S]{0,200}agent handover import/)
  })

  it("the agent page hands off to ops import", () => {
    const content = src("app/dashboard/agent/agent-client.tsx")
    expect(content).toContain("/dashboard/ops/import")
    expect(content).toMatch(/href="\/dashboard\/ops\/import"[\s\S]{0,200}Import document/)
  })

  it("both handoffs stay links, not new writes", () => {
    const ops = src("app/dashboard/ops/import/page.tsx")
    const agent = src("app/dashboard/agent/agent-client.tsx")
    expect(ops).not.toMatch(/method:\s*"(PATCH|DELETE)"/)
    expect(agent).not.toMatch(/method:\s*"(PATCH|DELETE)"/)
  })
})
