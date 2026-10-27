import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const route = codeOnly(src("app/api/career/growth/route.ts"))
const plan = codeOnly(src("lib/career/gap-plan.ts"))

describe("growth route gates and scope", () => {
  it("gates every call on the member session, not a query id", () => {
    expect(route).toMatch(/careerSession\(\)/)
    expect(route).toMatch(/unauthorized\(\)/)
    expect(route).not.toMatch(/searchParams\.get\("userId"\)/)
  })

  it("names the key when Growth AI cannot run", () => {
    expect(route).toMatch(/GOOGLE_GEMINI_API_KEY/)
    expect(route).toMatch(/status: 503/)
  })

  it("accepts exactly the four actions and a known discipline", () => {
    expect(route).toMatch(/isGrowthAction\(/)
    expect(route).toMatch(/isLadderDiscipline\(/)
    expect(route).toMatch(/GROWTH_ACTIONS\.join/)
  })

  it("refuses a member with no placement or no next rung", () => {
    expect(route).toMatch(/You are not placed in this discipline yet/)
    expect(route).toMatch(/You are at the top of this ladder/)
  })

  it("scopes the read by the session id", () => {
    expect(route).toMatch(/eq\(growthReviews\.userId, member\.id\)/)
    expect(route).toMatch(/orderBy\(desc\(growthReviews\.asOf\)/)
  })
})

describe("growth never writes the ladder", () => {
  it("does not update or insert career_levels", () => {
    expect(route).not.toMatch(/careerLevels/)
    expect(plan).not.toMatch(/careerLevels/)
  })

  it("appends a growth review for each action", () => {
    expect(route).toMatch(/growthReviews\)/)
    expect(route).toMatch(/kind: action/)
    expect(route).toMatch(/aiMarked: true/)
  })

  it("drops ungrounded links and refuses an empty grounded answer", () => {
    expect(route).toMatch(/filterGrounded\(/)
    expect(route).toMatch(/No grounded sources were returned/)
    expect(route).toMatch(/result\.grounding/)
  })

  it("sends only the member's own counts to the review and task prompts", () => {
    expect(route).toMatch(/reviewPrompt\(context\)/)
    expect(route).toMatch(/taskSuggestionsPrompt\(context\)/)
    expect(route).toMatch(/signals: profile\.signals/)
    expect(route).toMatch(/readiness: profile\.readiness/)
  })
})

describe("gap tasks land as a draft plan", () => {
  it("creates a draft agent_plan owned by the member", () => {
    expect(plan).toMatch(/status: "draft"/)
    expect(plan).toMatch(/createdBy: userId/)
    expect(plan).toMatch(/sourceKind: "career"/)
    expect(plan).toMatch(/db\.transaction/)
  })

  it("writes plan items and the growth snapshot together", () => {
    expect(plan).toMatch(/planItems\)/)
    expect(plan).toMatch(/growthReviews\)/)
    expect(plan).toMatch(/kind: "task_suggestions"/)
    expect(plan).toMatch(/planId/)
  })

  it("never creates a task directly", () => {
    expect(plan).not.toMatch(/from\(tasks\)/)
    expect(plan).not.toMatch(/insert\(tasks\)/)
  })
})
