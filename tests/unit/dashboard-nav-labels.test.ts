import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

// The sidebar is the only way into a dashboard page: there is no search that lists routes and no
// sitemap for the workspace. So a page that is finished but absent from navCategories might as well
// not be deployed — /dashboard/planner (plan extraction, the Gantt, promote-to-task) had no entry at
// all, and on mobile the assistant popover is gated behind `!isMobile`, which left no path to it.
// The other half of this file is the naming: three surfaces were called "Reports" and two
// "Playbooks", which makes the sidebar unusable as a map of the product.

const repo = path.resolve(__dirname, "..", "..")
const read = (relative: string) =>
  readFileSync(path.join(repo, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

const layout = read("components/dashboard-layout.tsx")

/** One nav item, exactly as it is written in navCategories. */
const navItem = (title: string, href: string) =>
  new RegExp(`title: "${title}"[\\s\\S]{0,220}?href: "${href.replace(/\//g, "\\/")}"`)

describe("sidebar covers every built dashboard page", () => {
  it.each([
    ["Planner", "/dashboard/planner"],
    ["Integrations", "/dashboard/integrations"],
    ["AI Assistant", "/dashboard/assistant"],
  ])("lists %s at %s", (title, href) => {
    expect(layout).toMatch(navItem(title, href))
  })

  it("points each nav href at a route that actually renders", () => {
    const hrefs = [...layout.matchAll(/href: "(\/dashboard\/[a-z-]+)"/g)].map((m) => m[1])
    expect(hrefs.length).toBeGreaterThan(25)
    for (const href of new Set(hrefs)) {
      const page = path.join(repo, "app", href, "page.tsx")
      expect(existsSync(page), `no page.tsx behind ${href}`).toBe(true)
    }
  })

  it("keeps nested routes lit for their parent item", () => {
    // /dashboard/planner/12 and /dashboard/integrations/… must not drop the sidebar back to
    // "nothing selected", which is why these three use startsWith rather than ===.
    for (const route of ["planner", "assistant"]) {
      expect(layout, route).toContain(`pathname.startsWith("/dashboard/${route}/")`)
    }
  })
})

describe("the report surfaces are distinguishable from the sidebar alone", () => {
  it.each([
    ["Period Reports", "/dashboard/reports-work"],
    ["Report Builder", "/dashboard/reports"],
    ["Pack Reports", "/dashboard/ops/reports"],
    ["Pack Playbooks", "/dashboard/ops/playbooks"],
  ])("lists %s at %s", (title, href) => {
    expect(layout).toMatch(navItem(title, href))
  })

  it("retires the labels that collided", () => {
    for (const dead of ['title: "Reports"', 'title: "Work Reports"', 'title: "Report previews"', 'title: "Playbook previews"']) {
      expect(layout, dead).not.toContain(dead)
    }
  })

  it("calls the reports page the same thing from Automation", () => {
    expect(read("app/dashboard/automation/page.tsx")).toContain('label: "Report Builder"')
  })

  it.each([
    ["app/dashboard/reports-work/reports-client.tsx", "Period reports"],
    ["app/dashboard/reports/page.tsx", "Report Builder"],
    ["app/dashboard/ops/reports/reports-client.tsx", "Pack reports"],
    ["app/dashboard/ops/playbooks/playbooks-client.tsx", "Pack playbooks"],
  ])("titles %s with the nav word %s", (file, heading) => {
    expect(read(file), file).toContain(heading)
  })
})
