import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

describe("ops playbook previews page", () => {
  it("serves the playbook seeds to the client via the pack route", () => {
    const route = src("app/api/ops/pack/route.ts")
    expect(route).toContain("playbookSeeds: ctx?.config.playbookSeeds")
    expect(route).toContain("playbookSeeds: null")
  })

  it("renders each seed's method and every step inside each phase", () => {
    const client = src("app/dashboard/ops/playbooks/playbooks-client.tsx")
    expect(client).toContain("/api/ops/pack")
    expect(client).toContain("seed.method.map")
    expect(client).toContain("seed.phases.map")
    expect(client).toContain("phase.steps.map")
  })

  it("keys phases and steps by position, not by their text", () => {
    const client = src("app/dashboard/ops/playbooks/playbooks-client.tsx")
    expect(client).toContain("key={`${seed.id}-${phaseIndex}`}")
    expect(client).toContain("key={`${seed.id}-${phaseIndex}-${stepIndex}`}")
  })

  it("hands off to the playbook library with the seed label as a working search", () => {
    const client = src("app/dashboard/ops/playbooks/playbooks-client.tsx")
    expect(client).toContain("/dashboard/playbooks")
    expect(client).toMatch(/new URLSearchParams\(\{ q: seed\.label \}\)/u)
  })

  it("says plainly that seeds are declarations, not saved SOPs", () => {
    const client = src("app/dashboard/ops/playbooks/playbooks-client.tsx")
    expect(client).toContain("not saved SOPs")
    expect(client).toContain("nothing here is written to your")
  })

  it("is read-only: it writes nothing to playbooks", () => {
    const client = src("app/dashboard/ops/playbooks/playbooks-client.tsx")
    expect(client).not.toContain('method: "POST"')
    expect(client).not.toContain('method: "PATCH"')
    expect(client).not.toContain('method: "DELETE"')
  })

  it("gracefully handles no config and no seeds", () => {
    const client = src("app/dashboard/ops/playbooks/playbooks-client.tsx")
    expect(client).toContain("No operations configured")
    expect(client).toContain("No playbook seeds")
  })

  it("mounts the page behind a Suspense boundary", () => {
    const page = src("app/dashboard/ops/playbooks/page.tsx")
    expect(page).toContain("Suspense")
    expect(page).toContain("OpsPlaybooksClient")
    expect(page).toContain("PlaybooksSkeleton")
  })

  it("links the sidebar and the overview top bar to the previews page", () => {
    const layout = src("components/dashboard-layout.tsx")
    expect(layout).toContain("Playbook previews")
    expect(layout).toContain("/dashboard/ops/playbooks")

    const overview = src("app/dashboard/ops/page.tsx")
    expect(overview).toContain("/dashboard/ops/playbooks")
    expect(overview).toMatch(/^\s*BookOpenCheck,$/m)
  })
})
