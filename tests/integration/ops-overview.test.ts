import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("ops overview integration", () => {
  it("creates the operations overview page", () => {
    const page = src("app/dashboard/ops/page.tsx")
    expect(page).toContain("Operations overview")
    expect(page).toContain("/api/ops/pack")
    expect(page).toContain("/api/ops/kpis")
    expect(page).toContain("/api/ops/recommendations")
  })

  it("creates the pack resolution route", () => {
    const route = src("app/api/ops/pack/route.ts")
    expect(route).toContain("defaultDisciplineOf")
    expect(route).toContain("loadOpsConfigForDiscipline")
    expect(route).toContain("hasOpsConfig")
  })

  it("creates the recommendations route", () => {
    const route = src("app/api/ops/recommendations/route.ts")
    expect(route).toContain("buildOpsRecommendations")
    expect(route).toContain("loadOpsConfigByPack")
  })

  it("adds My Operations sidebar group to the dashboard layout", () => {
    const layout = src("components/dashboard-layout.tsx")
    expect(layout).toContain("My Operations")
    expect(layout).toContain("/dashboard/ops")
    expect(layout).toContain("/dashboard/ops/logs")
    expect(layout).toContain("/dashboard/ops/kpis")
    expect(layout).toContain("hasOpsConfig")
  })

  it("gates the sidebar group on hasOpsConfig", () => {
    const layout = src("components/dashboard-layout.tsx")
    expect(layout).toMatch(/hasOpsConfig[\s\S]*My Operations/u)
  })

  it("overview page handles missing opsConfig gracefully", () => {
    const page = src("app/dashboard/ops/page.tsx")
    expect(page).toContain("No operations configured")
  })

  it("overview page shows KPI cards", () => {
    const page = src("app/dashboard/ops/page.tsx")
    expect(page).toContain("KpiCard")
    expect(page).toContain("tabular-nums")
  })

  it("overview page shows recommendations", () => {
    const page = src("app/dashboard/ops/page.tsx")
    expect(page).toContain("Recommendations")
    expect(page).toContain("priority")
  })

  it("overview page shows today's checklist", () => {
    const page = src("app/dashboard/ops/page.tsx")
    expect(page).toContain("Today")
    expect(page).toContain("daily_checklist")
  })
})
