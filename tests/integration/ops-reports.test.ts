import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("ops report previews page", () => {
  it("serves the report templates to the client via the pack route", () => {
    const route = src("app/api/ops/pack/route.ts")
    expect(route).toContain("reportTemplates: ctx?.config.reportTemplates")
  })

  it("renders each template's sections from the pack config", () => {
    const client = src("app/dashboard/ops/reports/reports-client.tsx")
    expect(client).toContain("/api/ops/pack")
    expect(client).toContain("template.sections.map")
    expect(client).toContain("kpiById.get(section.kpiId)")
  })

  it("joins the preview to computed KPI values, never estimating them", () => {
    const client = src("app/dashboard/ops/reports/reports-client.tsx")
    expect(client).toContain("/api/ops/kpis")
    expect(client).toContain("new Map(kpis.map")
    expect(client).not.toContain("computeKpis")
  })

  it("hands off to the normal work-report builder with the template period", () => {
    const client = src("app/dashboard/ops/reports/reports-client.tsx")
    expect(client).toContain("/dashboard/reports-work")
    expect(client).toContain('v: "build"')
    expect(client).toContain("period === \"quarterly\"")
  })

  it("is read-only: it writes nothing to reports", () => {
    const client = src("app/dashboard/ops/reports/reports-client.tsx")
    expect(client).not.toContain("method: \"POST\"")
    expect(client).not.toContain("method: \"PATCH\"")
  })

  it("gracefully handles no config and no templates", () => {
    const client = src("app/dashboard/ops/reports/reports-client.tsx")
    expect(client).toContain("No operations configured")
    expect(client).toContain("No report templates")
  })

  it("mounts the page behind a Suspense boundary", () => {
    const page = src("app/dashboard/ops/reports/page.tsx")
    expect(page).toContain("Suspense")
    expect(page).toContain("ReportsClient")
  })
})
