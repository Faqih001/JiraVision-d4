import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("planner promote route", () => {
  it("requires authentication", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/getSession\(\)/)
    expect(route).toMatch(/if \(!session\)/)
  })

  it("verifies plan ownership", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/eq\(agentPlans\.createdBy, session\.id\)/)
  })

  it("rejects already-promoted plans", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/plan\.status === "promoted"/)
  })

  it("rejects plans with no items", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/items\.length === 0/)
  })

  it("uses a database transaction", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/db\.transaction/)
  })

  it("inserts tasks with sourcePlanId", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/sourcePlanId: planId/)
  })

  it("creates deliverables where specified", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/insert\(deliverables\)/)
  })

  it("writes task_events birth rows", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/insert\(taskEvents\)/)
    expect(route).toMatch(/fromStatus: "none"/)
    expect(route).toMatch(/toStatus: "todo"/)
    expect(route).toMatch(/source: "promote"/)
  })

  it("flips plan status to promoted", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/status: "promoted"/)
    expect(route).toMatch(/promotedAt: new Date\(\)/)
  })

  it("resolves dependency indices to task IDs", () => {
    const route = src("app/api/planner/[id]/promote/route.ts")
    expect(route).toMatch(/indexToTaskId/)
    expect(route).toMatch(/resolvedDeps/)
  })
})

describe("planner extract route", () => {
  it("requires authentication", () => {
    const route = src("app/api/planner/extract/route.ts")
    expect(route).toMatch(/getSession\(\)/)
    expect(route).toMatch(/if \(!session\)/)
  })

  it("accepts text or pdf input", () => {
    const route = src("app/api/planner/extract/route.ts")
    expect(route).toMatch(/hasText/)
    expect(route).toMatch(/hasPdf/)
  })

  it("enforces PDF size limit", () => {
    const route = src("app/api/planner/extract/route.ts")
    expect(route).toMatch(/MAX_PDF_BYTES/)
    expect(route).toMatch(/15 \* 1024 \* 1024/)
  })

  it("calls geminiJson with the plan schema", () => {
    const route = src("app/api/planner/extract/route.ts")
    expect(route).toMatch(/geminiJson/)
    expect(route).toMatch(/planJsonSchema\(\)/)
    expect(route).toMatch(/extractPlanSchema\.parse/)
  })

  it("stores source text for re-runnability", () => {
    const route = src("app/api/planner/extract/route.ts")
    expect(route).toMatch(/sourceText/)
  })

  it("creates plan with draft status", () => {
    const route = src("app/api/planner/extract/route.ts")
    expect(route).toMatch(/status: "draft"/)
  })

  it("handles Gemini errors with appropriate status codes", () => {
    const route = src("app/api/planner/extract/route.ts")
    expect(route).toMatch(/GeminiError/)
    expect(route).toMatch(/error\.kind === "auth"/)
    expect(route).toMatch(/error\.kind === "quota"/)
  })
})

describe("planner list and detail routes", () => {
  it("list route requires authentication", () => {
    const route = src("app/api/planner/route.ts")
    expect(route).toMatch(/getSession\(\)/)
  })

  it("list route filters by current user", () => {
    const route = src("app/api/planner/route.ts")
    expect(route).toMatch(/eq\(agentPlans\.createdBy, session\.id\)/)
  })

  it("detail route requires authentication", () => {
    const route = src("app/api/planner/[id]/route.ts")
    expect(route).toMatch(/getSession\(\)/)
  })

  it("detail route verifies ownership", () => {
    const route = src("app/api/planner/[id]/route.ts")
    expect(route).toMatch(/eq\(agentPlans\.createdBy, session\.id\)/)
  })

  it("PATCH rejects promoted plans", () => {
    const route = src("app/api/planner/[id]/route.ts")
    expect(route).toMatch(/plan\.status === "promoted"/)
  })

  it("DELETE rejects promoted plans", () => {
    const route = src("app/api/planner/[id]/route.ts")
    expect(route).toMatch(/plan\.status === "promoted"/)
  })

  it("DELETE uses CASCADE to remove items", () => {
    const route = src("app/api/planner/[id]/route.ts")
    expect(route).toMatch(/ON DELETE CASCADE/i)
  })
})

describe("planner item routes", () => {
  it("POST requires authentication", () => {
    const route = src("app/api/planner/[id]/items/route.ts")
    expect(route).toMatch(/getSession\(\)/)
  })

  it("POST rejects promoted plans", () => {
    const route = src("app/api/planner/[id]/items/route.ts")
    expect(route).toMatch(/plan\.status === "promoted"/)
  })

  it("POST requires a title", () => {
    const route = src("app/api/planner/[id]/items/route.ts")
    expect(route).toMatch(/title is required/)
  })

  it("PATCH whitelists fields", () => {
    const route = src("app/api/planner/[id]/items/[itemId]/route.ts")
    expect(route).toMatch(/const updates: Record<string, unknown> = \{\}/)
  })

  it("PATCH rejects promoted plans", () => {
    const route = src("app/api/planner/[id]/items/[itemId]/route.ts")
    expect(route).toMatch(/plan\.status === "promoted"/)
  })

  it("DELETE rejects promoted plans", () => {
    const route = src("app/api/planner/[id]/items/[itemId]/route.ts")
    expect(route).toMatch(/plan\.status === "promoted"/)
  })
})
