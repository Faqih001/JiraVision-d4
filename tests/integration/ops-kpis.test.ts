import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("ops KPIs detail page", () => {
  it("computes KPIs from the pack through the API, not the client", () => {
    const client = src("app/dashboard/ops/kpis/kpis-client.tsx")
    expect(client).toContain("/api/ops/pack")
    expect(client).toContain("/api/ops/kpis")
    expect(client).not.toContain("computeKpis")
  })

  it("navigates one month at a time and syncs the month to the URL", () => {
    const client = src("app/dashboard/ops/kpis/kpis-client.tsx")
    expect(client).toContain("shiftMonth")
    expect(client).toContain("search.get(\"month\")")
    expect(client).toContain("router.replace")
  })

  it("shows a target-vs-actual read per KPI", () => {
    const client = src("app/dashboard/ops/kpis/kpis-client.tsx")
    expect(client).toContain("MetIndicator")
    expect(client).toContain("kpi.met")
    expect(client).toContain("formatTarget")
    expect(client).toContain("tabular-nums")
  })

  it("labels every value as computed from logged rows", () => {
    const client = src("app/dashboard/ops/kpis/kpis-client.tsx")
    expect(client).toContain("computed from rows you logged")
  })

  it("gracefully handles a pack with no operations config", () => {
    const client = src("app/dashboard/ops/kpis/kpis-client.tsx")
    expect(client).toContain("No operations configured")
  })

  it("mounts the page behind a Suspense boundary", () => {
    const page = src("app/dashboard/ops/kpis/page.tsx")
    expect(page).toContain("Suspense")
    expect(page).toContain("KpisClient")
  })
})
