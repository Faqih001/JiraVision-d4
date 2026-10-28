import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// The home dashboard used to render the workspace's rows, so an account created a
// minute ago showed a busy sprint, a roster of strangers and 35 seeded tasks. These
// guards pin the split: the home reads only the signed-in member's rows, and the
// workspaces' team pages keep the aggregate.
const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const page = codeOnly(src("app/dashboard/page.tsx"))
const data = codeOnly(src("lib/dashboard-data.ts"))
const route = codeOnly(src("app/api/dashboard/overview/route.ts"))

describe("the home dashboard reads only this member's rows", () => {
  it("asks the overview endpoint for the member scope", () => {
    expect(page).toContain('const OVERVIEW_URL = "/api/dashboard/overview?scope=member"')
    expect(page.match(/fetch\(OVERVIEW_URL/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(page).not.toContain('fetch("/api/dashboard/overview")')
  })

  it("accepts the scope and keeps its default workspace-wide", () => {
    expect(route).toContain('=== "member" ? "member" : "team"')
    expect(route).toContain("getDashboardOverview(session.id, scope)")
    expect(data).toContain('scope: OverviewScope = "team"')
  })

  it("counts only this member's task statuses", () => {
    expect(data).toMatch(/member\s*\?\s*db\s*\.select\(\{\s*status: tasks\.status[\s\S]{0,220}?\.where\(eq\(tasks\.assigneeId, userId\)\)/)
  })

  it("takes the active sprint from the sprints this member works in", () => {
    expect(data).toContain("mySprintIds.has(s.id)")
    expect(data).toContain("selectDistinct({ sprintId: tasks.sprintId })")
    expect(data).toMatch(/member \? eq\(tasks\.assigneeId, userId\) : undefined/)
  })

  it("measures throughput and velocity on this member's own points", () => {
    expect(data).toMatch(/gte\(tasks\.updatedAt, weekAgo\), member \? eq\(tasks\.assigneeId, userId\) : undefined/)
    expect(data).toMatch(/innerJoin\(sprints, eq\(sprints\.id, tasks\.sprintId\)\)/)
  })

  it("only lists events this member runs or is invited to", () => {
    expect(data).toContain("eq(calendarEvents.organizerId, userId)")
    expect(data).toMatch(/calendarEvents\.attendees[\s\S]*@>/)
  })

  it("reports the member's own wellbeing, never the team average", () => {
    expect(data).toContain("myWellbeing: number")
    expect(data).toContain("const myWellbeing = wellbeingRows[0]?.score ?? 0")
    expect(page).toContain("kpis.myWellbeing")
    expect(page).not.toContain("kpis.teamHappiness")
  })

  it("re-reads on focus instead of waiting for a manual refresh", () => {
    // The shared hook owns the focus/visibility listeners; its own guard pins that behaviour.
    expect(page).toContain("useLiveRefresh(reloadQuiet")
  })

  it("leaves the workspace panels to the pages that own them", () => {
    for (const panel of ["Team workload", "Team mood", "Ethical health", "AI scrum master"]) {
      expect(page).not.toContain(panel)
    }
    expect(page).not.toContain("overview.leaderboard")
  })
})
