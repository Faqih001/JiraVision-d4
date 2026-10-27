import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const has = (relative: string) => existsSync(resolve(process.cwd(), relative))

const PAGES = [
  "app/dashboard/playbooks/page.tsx",
  "app/dashboard/playbooks/[id]/page.tsx",
  "app/dashboard/playbooks/[id]/run/page.tsx",
] as const

describe("the playbook pages are dynamic Suspense shells", () => {
  it.each(PAGES)("%s exists", (file) => {
    expect(has(file)).toBe(true)
  })

  it.each(PAGES)("%s wraps its client in Suspense", (file) => {
    const page = src(file)
    expect(page).toContain("<Suspense")
    expect(page).toMatch(/fallback=/)
  })

  it.each(PAGES)("%s opts out of static rendering", (file) => {
    expect(src(file)).toContain('export const dynamic = "force-dynamic"')
  })

  it("the editor route hands the id to its client", () => {
    const page = src("app/dashboard/playbooks/[id]/page.tsx")
    expect(page).toMatch(/params: Promise<\{ id: string \}>/)
    expect(page).toMatch(/await params/)
  })
})

describe("the sidebar and the top-bar search know about playbooks", () => {
  const layout = src("components/dashboard-layout.tsx")

  it("adds a playbooks nav entry with its own icon", () => {
    expect(layout).toMatch(/BookOpenCheck/)
    expect(layout).toContain('href: "/dashboard/playbooks"')
    expect(layout).toMatch(/pathname\.startsWith\("\/dashboard\/playbooks"\)/)
  })

  it("turns the inert search box into a playbook search", () => {
    expect(layout).toContain("/dashboard/playbooks?q=")
    expect(layout).toMatch(/type="search"/)
  })
})

describe("the list client", () => {
  const client = src("app/dashboard/playbooks/playbooks-client.tsx")

  it("reads the URL state and asks the API for it", () => {
    expect(client).toContain("useSearchParams")
    expect(client).toContain('fetch(`/api/playbooks?${query}`)')
    expect(client).toMatch(/router\.replace/)
  })

  it("searches title, summary, tags and step actions in one palette", () => {
    expect(client).toMatch(/CommandDialog/)
    expect(client).toMatch(/step\.action/)
    expect(client).toMatch(/\.tags\b/)
  })

  it("opens a new playbook against a pack and routes to its editor", () => {
    expect(client).toMatch(/jsonInit\("POST",/)
    expect(client).toMatch(/\/dashboard\/playbooks\/\$\{/)
  })
})

describe("the editor", () => {
  const editor = src("app/dashboard/playbooks/[id]/playbook-editor.tsx")

  it("edits steps through the pure reorder helpers", () => {
    expect(editor).toMatch(/\bmoveStep\(/)
    expect(editor).toMatch(/\bcloneStep\(/)
    expect(editor).toMatch(/\bremoveStep\(/)
    expect(editor).toContain("emptyStep")
  })

  it("lives with the same publish gate as the route", () => {
    expect(editor).toMatch(/publishProblem\(/)
    expect(editor).toContain("/publish")
  })

  it("prints through the fourth PDF layout", () => {
    expect(editor).toContain("exportPlaybookPdf")
  })

  it("warns on a model draft before publishing", () => {
    expect(editor).toMatch(/aiMarked/)
    expect(editor).toMatch(/model/i)
  })
})

describe("the run client", () => {
  const run = src("app/dashboard/playbooks/[id]/run/run-client.tsx")

  it("posts the run to the playbook's own route", () => {
    expect(run).toContain("/api/playbooks/${playbook.id}/run")
    expect(run).toMatch(/jsonInit\("POST",/)
  })

  it("takes one note per method phase", () => {
    expect(run).toMatch(/method\.map\(/)
    expect(run).toMatch(/<Textarea/)
  })
})

describe("the PDF module grows a fourth layout", () => {
  const source = readFileSync(resolve("lib/export/pdf.ts"), "utf8")

  it("exports a playbook layout with one page per phase and a signature block", () => {
    expect(source).toContain("export function exportPlaybookPdf")
    expect(source).toContain("One page per phase")
    expect(source).toContain("Signature")
  })
})
