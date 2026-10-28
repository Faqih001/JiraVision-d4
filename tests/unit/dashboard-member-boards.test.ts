import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// A signup adds a users row and nothing else, and the workspace's tasks are shared
// rows. The personal boards used to open on all of them, so a brand-new account saw
// a full kanban. These guards pin the member scope: /api/tasks and /api/sprints
// accept `scope=mine` (session id, never the query string), and the personal
// surfaces default to it while team surfaces stay workspace-wide.
const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const tasksRoute = codeOnly(src("app/api/tasks/route.ts"))
const sprintsRoute = codeOnly(src("app/api/sprints/route.ts"))
const dataAccess = codeOnly(src("lib/data-access.ts"))
const kanban = codeOnly(src("app/dashboard/kanban/page.tsx"))
const tasks = codeOnly(src("app/dashboard/tasks/page.tsx"))
const backlog = codeOnly(src("app/dashboard/backlog/page.tsx"))
const calendar = codeOnly(src("app/dashboard/calendar/page.tsx"))
const home = codeOnly(src("app/dashboard/page.tsx"))

describe("GET /api/tasks accepts a member scope", () => {
  it("takes the member id from the session, never from the query string", () => {
    expect(tasksRoute).toContain('memberUserId: searchParams.get("scope") === "mine" ? session?.id : undefined')
  })

  it("constrains the query to that member", () => {
    expect(dataAccess).toContain("memberUserId?: number")
    expect(dataAccess).toContain("whereConditions.push(eq(tasks.assigneeId, filters.memberUserId))")
  })

  it("stays workspace-wide when no scope is asked for", () => {
    expect(tasksRoute).not.toMatch(/memberUserId:\s*session\.id/)
    expect(tasksRoute).not.toContain('searchParams.get("scope") !== "mine"')
  })
})

describe("GET /api/sprints accepts a member scope", () => {
  it("lists only the sprints this member holds tasks in", () => {
    expect(sprintsRoute).toContain('searchParams.get("scope") === "mine"')
    expect(sprintsRoute).toContain("selectDistinct({ sprintId: tasks.sprintId })")
    expect(sprintsRoute).toContain("eq(tasks.assigneeId, session.id)")
    expect(sprintsRoute).toContain("rows = rows.filter((r) => mine.has(r.id))")
  })
})

describe("personal boards open on the member's own rows", () => {
  const boards = [
    ["kanban", kanban, "My board"],
    ["tasks", tasks, "My tasks"],
    ["backlog", backlog, "My backlog"],
    ["calendar", calendar, "My calendar"],
  ] as const

  it.each(boards)("%s defaults to mine with a workspace toggle", (_name, source, label) => {
    expect(source).toContain('useState<"mine" | "workspace">("mine")')
    expect(source).toContain('boardScope === "mine" ? "scope=mine" : "scope=all"')
    expect(source).toMatch(new RegExp(`>\\s*${label}\\s*<`))
    expect(source).toMatch(/>\s*Workspace\s*</)
  })

  it("kanban reads its cards and sprint filter through the scope", () => {
    expect(kanban).toContain("fetch(`/api/tasks?pageSize=200&${scopeParam}`)")
    expect(kanban).toContain("fetch(`/api/sprints?${scopeParam}`)")
    expect(kanban).toContain('fetch("/api/dashboard/overview?scope=member")')
    expect(kanban.match(/scopeParam\]/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it("tasks reads both the table and the KPI list through the scope", () => {
    expect(tasks).toContain("fetch(`/api/tasks?page=${page}&pageSize=100&${scopeParam}`)")
    expect(tasks).toContain("fetch(`/api/tasks?${params.toString()}&${scopeParam}`)")
    expect(tasks).toContain("fetch(`/api/sprints?${scopeParam}`)")
    expect(tasks).toContain('fetch("/api/dashboard/overview?scope=member")')
  })

  it("backlog reads pages and the quiet refresh through the scope", () => {
    expect(backlog).toContain("fetch(`/api/tasks?pageSize=200&page=${page}&${scopeParam}`)")
    expect(backlog).toContain("fetch(`/api/tasks?pageSize=200&${scopeParam}`)")
    expect(backlog).toContain("fetch(`/api/sprints?${scopeParam}`)")
    expect(backlog).toContain('fetch("/api/dashboard/overview?scope=member")')
  })

  it("calendar reads deadlines, milestones and the task link search through the scope", () => {
    expect(calendar).toContain("fetch(`/api/tasks?pageSize=100&${scopeParam}`)")
    expect(calendar).toContain("fetch(`/api/sprints?${scopeParam}`)")
    expect(calendar).toContain("fetch(`/api/tasks?search=${encodeURIComponent(value.trim())}&pageSize=8&${scopeParam}`)")
    expect(calendar).toContain('fetch("/api/dashboard/overview?scope=member")')
  })

  it("the home sprint strip lists only the member's sprints", () => {
    expect(home).toContain('fetch("/api/sprints?scope=mine")')
    expect(home).not.toContain('fetch("/api/sprints")')
  })
})

describe("team surfaces keep the workspace aggregate", () => {
  it.each([
    "app/dashboard/ai-scrum-master/page.tsx",
    "app/dashboard/analytics/page.tsx",
    "app/dashboard/ethical-metrics/page.tsx",
    "app/dashboard/integrations/page.tsx",
  ])("%s still reads the whole workspace", (relative) => {
    const source = codeOnly(src(relative))
    expect(source).toContain('fetch("/api/tasks?pageSize=200"')
    expect(source).not.toContain("scope=mine")
  })
})
