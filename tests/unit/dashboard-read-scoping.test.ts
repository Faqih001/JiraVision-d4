import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// A freshly created account opened /dashboard/goals and found five OKRs owned by someone
// else, because /api/goals had no user predicate at all. The same shape turned up on the
// retros, automation, scheduled-reports and calendar reads, and on the sprints page (whose
// API already supported `scope=mine` but was never asked for it). These guards pin the rule:
// a read of rows that carry an author, owner or invitee list them for that person by
// default, and the workspace-wide view is something the member opts into.

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const goalsQueries = codeOnly(src("app/api/goals/queries.ts"))
const goalsRoute = codeOnly(src("app/api/goals/route.ts"))
const goalsPage = codeOnly(src("app/dashboard/goals/page.tsx"))
const retrosRoute = codeOnly(src("app/api/retros/route.ts"))
const retrosPage = codeOnly(src("app/dashboard/retros/page.tsx"))
const automationShared = codeOnly(src("app/api/automation/_shared.ts"))
const automationRoute = codeOnly(src("app/api/automation/route.ts"))
const reportsShared = codeOnly(src("app/api/reports/_shared.ts"))
const reportsRoute = codeOnly(src("app/api/reports/route.ts"))
const calendarRoute = codeOnly(src("app/api/calendar/events/route.ts"))
const calendarPage = codeOnly(src("app/dashboard/calendar/page.tsx"))
const sprintsPage = codeOnly(src("app/dashboard/sprints/page.tsx"))

describe("the OKR read belongs to the member", () => {
  it("names the two columns that make a goal yours", () => {
    expect(goalsQueries).toMatch(
      /scope === "team" \? sql`` : sql`WHERE \(g\.owner_id = \$\{userId\} OR g\.created_by = \$\{userId\}\)`/,
    )
  })

  it("filters the list and the check-in feed with the same clause", () => {
    expect(goalsQueries).toMatch(/export async function fetchGoals\(userId: number, scope: GoalScope = "mine"\)/)
    expect(goalsQueries).toMatch(/export async function fetchCheckins\(\s*userId: number,\s*scope: GoalScope = "mine",/)
    expect(goalsQueries.match(/\$\{goalVisibility\(userId, scope\)\}/g)?.length).toBe(2)
  })

  it("takes the scope from the query string but the id only from the session", () => {
    expect(goalsRoute).toContain('searchParams.get("scope") === "team" ? "team" : "mine"')
    expect(goalsRoute).toContain("fetchGoals(session.id, scope)")
    expect(goalsRoute).toContain("fetchCheckins(session.id, scope, 1000)")
  })

  it("opens the page on the member's own goals", () => {
    expect(goalsPage).toContain('useState<"mine" | "team">("mine")')
    expect(goalsPage).toContain('goalScope === "mine" ? "scope=mine" : "scope=team"')
    expect(goalsPage).toContain("fetch(`/api/goals?${scopeParam}`)")
    expect(goalsPage).not.toContain('fetch("/api/goals")')
    expect(goalsPage).toContain("role=\"group\"\n            aria-label=\"Goal scope\"")
  })

  it("lists only the owners who actually own a visible goal", () => {
    expect(goalsPage).toMatch(/const owners = useMemo\(\(\) => \{[\s\S]{0,260}?for \(const g of goals\)/)
    const filterBar = goalsPage.slice(goalsPage.indexOf('Label className="text-xs">Owner'))
    expect(filterBar).toContain("owners.map((m)")
    // The create dialog still gets the whole roster — you may hand a goal to anyone.
    expect(goalsPage).toContain("{members.map((m) => (")
  })

  it("says so when the member simply has no goals", () => {
    expect(goalsPage).toContain("goals.length === 0 ? (")
    expect(goalsPage).toContain("No goals assigned to you or drafted by you yet.")
  })
})

describe("the retro feed belongs to the member", () => {
  it("counts the three ways a person is in a retro", () => {
    expect(retrosRoute).toMatch(/export function retroVisibility\(userId: number, scope: RetroScope\)/)
    expect(retrosRoute).toContain("if (scope === \"team\") return sql``")
    expect(retrosRoute).toContain("WHERE r.created_by = ${userId}")
    expect(retrosRoute).toContain("n.author_id = ${userId}")
    expect(retrosRoute).toContain("a.owner_id = ${userId}")
  })

  it("applies it to both the list and the category mix", () => {
    expect(retrosRoute).toContain('searchParams.get("scope") === "team" ? "team" : "mine"')
    expect(retrosRoute).toContain("const visibility = retroVisibility(session.id, scope)")
    expect(retrosRoute.match(/\$\{visibility\}/g)?.length).toBe(2)
  })

  it("opens the page on the member's own retros", () => {
    expect(retrosPage).toContain('useState<"mine" | "team">("mine")')
    expect(retrosPage).toContain('retroScope === "mine" ? "scope=mine" : "scope=team"')
    expect(retrosPage).toContain("fetch(`/api/retros?${scopeParam}`)")
    expect(retrosPage).not.toContain('fetch("/api/retros"),')
    expect(retrosPage).toContain('aria-label="Retro scope"')
  })
})

describe("automation rules and their runs belong to their author", () => {
  it("filters both reads on the owner column the insert already writes", () => {
    expect(automationShared).toContain("export async function fetchRules(userId: number)")
    expect(automationShared).toContain("FROM automation_rules ar WHERE ar.user_id = ${userId}")
    expect(automationShared).toContain("export async function fetchRuns(userId: number, limit = 50)")
    expect(automationShared).toMatch(/JOIN automation_rules ar ON ar\.id = au\.rule_id\s*\n\s*WHERE ar\.user_id = \$\{userId\}/)
  })

  it("passes the session id from both the list and the create response", () => {
    expect(automationRoute).toContain("fetchRules(session.id)")
    expect(automationRoute).toContain("fetchRuns(session.id, 50)")
    expect(automationRoute).not.toContain("fetchRules()")
  })
})

describe("report schedules and their runs belong to their author", () => {
  it("filters both reads on the owner column", () => {
    expect(reportsShared).toContain("export async function fetchSchedules(userId: number)")
    expect(reportsShared).toMatch(/FROM report_schedules rs\s*\n\s*WHERE rs\.user_id = \$\{userId\}/)
    expect(reportsShared).toContain("export async function fetchRuns(userId: number, limit = 50)")
    expect(reportsShared).toMatch(/JOIN report_schedules rs ON rs\.id = rr\.schedule_id\s*\n\s*WHERE rs\.user_id = \$\{userId\}/)
  })

  it("passes the session id from both the list and the create response", () => {
    expect(reportsRoute).toContain("fetchSchedules(session.id)")
    expect(reportsRoute).toContain("fetchRuns(session.id, 50)")
    expect(reportsRoute).not.toContain("fetchSchedules()")
  })
})

describe("the calendar only shows events the member is in", () => {
  it("matches the home dashboard's own-events predicate", () => {
    expect(calendarRoute).toContain('searchParams.get("scope") === "mine"')
    expect(calendarRoute).toContain("eq(calendarEvents.organizerId, session.id)")
    expect(calendarRoute).toMatch(
      /calendarEvents\.attendees\}\s*@\>\s*\$\{JSON\.stringify\(\[session\.id\]\)\}::jsonb/,
    )
  })

  it("has no always-true fallback", () => {
    expect(calendarRoute).not.toContain("sql`1=1`")
  })

  it("sends the scope the page's own toggle is already holding", () => {
    expect(calendarPage).toContain('useState<"mine" | "workspace">("mine")')
    expect(calendarPage).toContain("fetch(`/api/calendar/events?${scopeParam}`)")
    expect(calendarPage).not.toContain('fetch("/api/calendar/events")')
    expect(calendarPage).toMatch(/const reloadEvents = useCallback\(async \(\) => \{[\s\S]{0,420}\[toast, scopeParam\]\)/)
  })
})

describe("the sprints page asks for the sprints it is a member of", () => {
  it("defaults to the member's own board", () => {
    expect(sprintsPage).toContain('useState<"mine" | "workspace">("mine")')
    expect(sprintsPage).toContain('boardScope === "mine" ? "scope=mine" : "scope=all"')
    expect(sprintsPage.match(/fetch\(`\/api\/sprints\?\$\{scopeParam\}`\)/g)?.length).toBe(2)
    expect(sprintsPage).not.toContain('fetch("/api/sprints")')
    expect(sprintsPage).toContain('aria-label="Sprint scope"')
  })
})
