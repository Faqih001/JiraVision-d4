import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const REGISTER_ROUTES = [
  "app/api/registers/route.ts",
  "app/api/registers/[id]/route.ts",
  "app/api/registers/[id]/verify/route.ts",
  "app/api/registers/bulk/route.ts",
  "app/api/registers/export/route.ts",
  "app/api/registers/stale/route.ts",
] as const

describe("register routes are session-gated", () => {
  it.each(REGISTER_ROUTES)("%s refuses an anonymous request", (file) => {
    const route = codeOnly(src(file))
    expect(route).toMatch(/await registerSession\(\)/)
    expect(route).toMatch(/, 401\)/)
  })

  it.each(REGISTER_ROUTES)("%s opts out of static rendering", (file) => {
    expect(codeOnly(src(file))).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("is the only thing standing between a request and the tables", () => {
    const shared = codeOnly(src("app/api/registers/_shared.ts"))
    const sessionAt = shared.indexOf("await getSession()")
    expect(sessionAt).toBeGreaterThanOrEqual(0)
    expect(shared).toMatch(/if \(!session\?\.id\) return null/)
  })
})

describe("register reads stay inside the privacy circle", () => {
  const read = codeOnly(src("lib/registers/read.ts"))

  it("applies custody visibility in SQL before rows leave the database", () => {
    expect(read).toMatch(/inArray\(registerItems\.custody, \["team", "org"\]\)/)
    expect(read).toMatch(/eq\(registerItems\.custody, "member"\)/)
    expect(read).toMatch(/eq\(registerItems\.ownerId, viewer\.id\)/)
    expect(read).toMatch(/if \(viewer\.admin\) return undefined/)
  })

  it("routes every list read through the filtered query", () => {
    expect(read).toMatch(/export async function loadVisibleRegisters\(viewer: ViewerView\)/)
    expect(read).toMatch(/\.where\(visibleFilter\(viewer\)\)/)
    expect(codeOnly(src("app/api/registers/route.ts"))).toMatch(/loadVisibleRegisters\(gate\.viewer\)/)
    expect(codeOnly(src("app/api/registers/export/route.ts"))).toMatch(/loadVisibleRegisters\(gate\.viewer\)/)
    expect(codeOnly(src("app/api/registers/stale/route.ts"))).toMatch(/loadVisibleRegisters\(gate\.viewer\)/)
  })
})

describe("POST /api/registers", () => {
  const route = codeOnly(src("app/api/registers/route.ts"))

  it("validates the row against the pack it names", () => {
    expect(route).toMatch(/packByKey\(packs, packKey\)/)
    expect(route).toMatch(/pack\.registerKinds\.some/)
    expect(route).toMatch(/readTitle\(body\.title\)/)
    expect(route).toMatch(/readInterval\(body\.verifyIntervalDays\)/)
  })

  it("refuses credential fields at the boundary", () => {
    expect(route).toMatch(/readRegisterFields\(body\.fields/)
    expect(route).toMatch(/if \(!fields\.ok\) return bad\(fields\.error\)/)
  })

  it("cannot be told what it owns or where it came from", () => {
    expect(route).not.toMatch(/source:\s*body\./)
    expect(route).not.toMatch(/source:\s*["'`]\$\{/)
    expect(route).toMatch(/source: "manual"/)
    expect(route).toMatch(/owner\.value !== gate\.session\.id/)
    expect(route).toMatch(/, 403\)/)
  })

  it("only attaches a child to a row this member may already change", () => {
    expect(route).toMatch(/canWriteRegister\(parent, gate\.viewer\)/)
  })
})

describe("PATCH /api/registers/[id]", () => {
  const route = codeOnly(src("app/api/registers/[id]/route.ts"))

  it("hides rows outside the circle behind a 404", () => {
    expect(route).toMatch(/canWriteRegister\(row, gate\.viewer\)/)
    expect(route).toMatch(/Register row not found/)
  })

  it("re-scans edited fields", () => {
    expect(route).toMatch(/readRegisterFields\(body\.fields\)/)
  })

  it("requires a reason through the lifecycle rule, never from the body directly", () => {
    expect(route).toMatch(/readRegisterTransition\(row\.status, body\.status, body\.reason\)/)
    expect(route).toMatch(/if \(!transition\.ok\) return bad\(transition\.error\)/)
  })

  it("records the reason as a work-log note beside the status move", () => {
    expect(route).toMatch(/db\.transaction/)
    expect(route).toMatch(/kind: "note"/)
    expect(route).toMatch(/workLogEntries/)
  })

  it("keeps custody, ownership and parents in admin hands", () => {
    expect(route).toMatch(/canReassignRegister\(gate\.viewer\)/)
    expect(route).toMatch(/A row cannot be its own parent/)
    expect(route).toMatch(/That parent already sits under this row/)
    expect(route).toMatch(/, 403\)/)
  })
})

describe("POST /api/registers/[id]/verify", () => {
  const route = codeOnly(src("app/api/registers/[id]/verify/route.ts"))

  it("only verifies a row this member may change", () => {
    expect(route).toMatch(/canWriteRegister\(row, gate\.viewer\)/)
    expect(route).toMatch(/Register row not found/)
  })

  it("stamps the register and logs the review in one transaction", () => {
    const txAt = route.indexOf("db.transaction")
    expect(txAt).toBeGreaterThanOrEqual(0)
    expect(route.indexOf('kind: "review"')).toBeGreaterThan(txAt)
    expect(route.indexOf("lastVerifiedAt: gate.today")).toBeGreaterThan(txAt)
  })

  it("takes the day from the session, not the caller", () => {
    expect(route).not.toMatch(/request\.json\(\)/)
    expect(route).toMatch(/workedOn: gate\.today/)
  })

  it("will not verify something already disposed of", () => {
    expect(route).toMatch(/row\.status === "disposed"/)
    expect(route).toMatch(/, 409\)/)
  })
})

describe("POST /api/registers/bulk", () => {
  const route = codeOnly(src("app/api/registers/bulk/route.ts"))

  it("caps a selection instead of accepting an unbounded id list", () => {
    expect(route).toMatch(/const MAX_BULK = 50/)
    expect(route).toMatch(/ids\.length > MAX_BULK/)
    expect(route).toMatch(/new Set/)
  })

  it("re-checks every row before touching it and reports what it skipped", () => {
    expect(route).toMatch(/canWriteRegister\(row, gate\.viewer\)/)
    expect(route).toMatch(/skipped\.push/)
    expect(route).toMatch(/loadRegistersByIds\(ids\)/)
  })

  it("verifies through the same review log as the single-row route", () => {
    expect(route).toMatch(/kind: "review"/)
    expect(route).toMatch(/lastVerifiedAt: gate\.today/)
    expect(route).toMatch(/db\.transaction/)
  })

  it("reassigns only for an admin and only to a real owner", () => {
    expect(route).toMatch(/action === "reassign" && !gate\.viewer\.admin/)
    expect(route).toMatch(/, 403\)/)
    expect(route).toMatch(/readOwnerId\(body\.ownerId\)/)
    expect(route).toMatch(/That owner does not exist/)
  })

  it("moves status through the lifecycle rule with a logged reason", () => {
    expect(route).toMatch(/readRegisterTransition\(row\.status, body\.status, body\.reason\)/)
    expect(route).toMatch(/kind: "note"/)
  })
})

describe("GET /api/registers/export", () => {
  const route = codeOnly(src("app/api/registers/export/route.ts"))

  it("downloads a CSV using the page's own filter grammar", () => {
    expect(route).toMatch(/text\/csv; charset=utf-8/)
    expect(route).toMatch(/Content-Disposition/)
    expect(route).toMatch(/parseRegisterView\(search\)/)
    expect(route).toMatch(/registersToCsv\(scoped, gate\.today\)/)
  })
})

describe("/api/registers/stale", () => {
  const route = codeOnly(src("app/api/registers/stale/route.ts"))
  const plan = codeOnly(src("lib/registers/plan.ts"))

  it("lists the overdue rows computed at read time", () => {
    expect(route).toMatch(/isStale\(row, gate\.today\)/)
    expect(route).toMatch(/withState\(await loadVisibleRegisters/)
  })

  it("returns today's draft instead of duplicating it", () => {
    const existingAt = route.indexOf("await findDraftStalePlan")
    expect(existingAt).toBeGreaterThanOrEqual(0)
    expect(route.indexOf("await createStaleCheckPlan")).toBeGreaterThan(existingAt)
    expect(plan).toMatch(/eq\(agentPlans\.status, "draft"\)/)
    expect(plan).toMatch(/sourceNameFor\(today\)/)
  })

  it("schedules through a draft plan, never a task", () => {
    expect(plan).toMatch(/sourceKind: "registers"/)
    expect(plan).toMatch(/status: "draft"/)
    expect(plan).toMatch(/tx\.insert\(planItems\)/)
    expect(plan).toMatch(/cadence: cadenceForInterval\(row\.verifyIntervalDays\)/)
    expect(plan).toMatch(/dueDate: nextCheckDay\(row, today\)/)
    expect(plan).not.toMatch(/from\("tasks"\)|insert\(tasks\)|update\(tasks\)/)
    expect(route).not.toMatch(/insert\(tasks\)|update\(tasks\)/)
  })

  it("says so plainly when there is nothing to schedule", () => {
    expect(route).toMatch(/Nothing is stale today\./)
    expect(route).toMatch(/, 409\)/)
  })
})

describe("/api/packs", () => {
  const route = codeOnly(src("app/api/packs/route.ts"))

  it("lets every member read the active packs and admins widen the read", () => {
    expect(route).toMatch(/loadPacks\(wantsAll && admin\)/)
    expect(route).toMatch(/searchParams\.get\("all"\) === "1"/)
  })

  it("puts pack authoring behind the super-admin gate", () => {
    expect(route.match(/if \(!isSuperAdmin\(session\)\) return bad\("Super-admin access required", 403\)/g)).toHaveLength(2)
    expect(route).toMatch(/export async function POST/)
    expect(route).toMatch(/export async function PATCH/)
  })

  it("refuses a duplicate pack key instead of overwriting it", () => {
    expect(route).toMatch(/A pack with the key/)
    expect(route).toMatch(/, 409\)/)
    expect(route).toMatch(/readPackInput\(body\)/)
  })
})
