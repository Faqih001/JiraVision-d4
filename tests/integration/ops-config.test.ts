import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("ops pack config page", () => {
  const route = () => src("app/api/ops/config/route.ts")
  const client = () => src("app/dashboard/ops/config/config-client.tsx")

  it("resolves the config from the caller's own discipline, never a supplied one", () => {
    const r = route()
    expect(r).toContain("defaultDisciplineOf(session)")
    expect(r).toContain("loadOpsConfigForDiscipline(discipline)")
    // No query/body parameter may select another pack's config.
    expect(r).not.toContain("searchParams")
    expect(r).not.toContain("request.json()")
    expect(r).not.toContain("req.query")
  })

  it("hands back the whole config, not the slices /api/ops/pack already serves", () => {
    const r = route()
    expect(r).toContain("config: ctx.config")
    expect(r).not.toContain("config.logs")
    expect(r).not.toContain("config.reportTemplates")
  })

  it("says plainly when a discipline has no pack config instead of rendering an empty shell", () => {
    const r = route()
    expect(r).toContain("No operations pack is configured for")
    expect(client()).toContain("No operations configured")
  })

  it("renders every config section the engine can carry", () => {
    const c = client()
    for (const section of [
      "Log entities",
      "KPI definitions",
      "Playbook seeds",
      "Report templates",
      "Automation templates",
      "Recommendation rules",
      "AI policy",
    ]) {
      expect(c).toContain(section)
    }
  })

  it("shows each field's type, whether it is required and its closed value list", () => {
    const c = client()
    expect(c).toContain("{field.type}")
    expect(c).toContain("field.required &&")
    expect(c).toContain("field.values?.length")
    expect(c).toContain("field.default !== undefined")
  })

  it("names the KPIs that have no target instead of showing a blank", () => {
    const c = client()
    expect(c).toContain("no target set")
    expect(c).toContain("with a target")
  })

  it("explains a thin pack rather than leaving an unexplained gap", () => {
    const c = client()
    expect(c).toContain("derived baseline")
    expect(c).toContain("not invented by the importer")
  })

  it("is read-only: it fetches once and never writes", () => {
    const c = client()
    expect(c).toContain('fetch("/api/ops/config")')
    expect(c).not.toContain('method: "POST"')
    expect(c).not.toContain('method: "PATCH"')
    expect(c).not.toContain('method: "DELETE"')
  })

  it("exposes the raw config so the rules can be checked, not only summarised", () => {
    const c = client()
    expect(c).toContain("Raw config JSON")
    expect(c).toContain("JSON.stringify(config, null, 2)")
  })

  it("keys phase and section lists by position so duplicate names cannot collide", () => {
    const c = client()
    expect(c).toMatch(/key=\{`\$\{seed\.id\}-\$\{index\}`\}/)
    expect(c).toMatch(/key=\{`\$\{template\.id\}-\$\{index\}`\}/)
  })

  it("mounts a suspense shell over the client", () => {
    const page = src("app/dashboard/ops/config/page.tsx")
    expect(page).toContain("<Suspense")
    expect(page).toContain("<ConfigSkeleton />")
    expect(page).toContain("<OpsConfigClient />")
  })

  it("links the config page from the sidebar and the overview top bar", () => {
    const layout = src("components/dashboard-layout.tsx")
    expect(layout).toContain("title: \"Pack config\"")
    expect(layout).toContain("/dashboard/ops/config")

    const overview = src("app/dashboard/ops/page.tsx")
    expect(overview).toContain("/dashboard/ops/config")
    expect(overview).toMatch(/^\s*Settings2,$/m)
  })

  it("wraps the crowded overview top bar instead of overflowing it", () => {
    const overview = src("app/dashboard/ops/page.tsx")
    expect(overview).toContain('<div className="flex flex-wrap gap-2">')
  })
})
