import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("/api/career/me", () => {
  const route = codeOnly(src("app/api/career/me/route.ts"))

  it("loads the session before touching the database", () => {
    const sessionAt = route.indexOf("await getSession()")
    expect(sessionAt).toBeGreaterThanOrEqual(0)
    expect(sessionAt).toBeLessThan(route.indexOf(".from("))
    expect(route).toMatch(/status: 401/)
  })

  it("scopes every member read by the session id, not by a request id", () => {
    expect(route).toMatch(/eq\(careerPlacement\.userId, session\.id\)/)
    expect(route).toMatch(/eq\(careerSignoffs\.userId, session\.id\)/)
    expect(route).toMatch(/userId: session\.id/)
    expect(route).not.toMatch(/request\.json\(\)/)
  })

  it("accepts only a known ladder discipline from the query string", () => {
    expect(route).toMatch(/isLadderDiscipline\(requested\)/)
    expect(route).toMatch(/status: 400/)
  })

  it("computes readiness on the server and never reads a percentage from the caller", () => {
    expect(route).toMatch(/computeReadiness\(/)
    expect(route).not.toMatch(/percent\s*[:=]/)
  })

  it("never writes", () => {
    expect(route).not.toMatch(/\.insert\(|\.update\(|\.delete\(/)
  })
})

describe("/api/career/levels", () => {
  const route = codeOnly(src("app/api/career/levels/route.ts"))

  it("is session-gated", () => {
    const sessionAt = route.indexOf("await getSession()")
    expect(sessionAt).toBeGreaterThanOrEqual(0)
    expect(sessionAt).toBeLessThan(route.indexOf(".from("))
    expect(route).toMatch(/status: 401/)
  })

  it("returns active rungs only", () => {
    expect(route).toMatch(/eq\(careerLevels\.isActive, true\)/)
  })

  it("never writes", () => {
    expect(route).not.toMatch(/\.insert\(|\.update\(|\.delete\(/)
  })
})

describe("career signal counting", () => {
  const counts = codeOnly(src("lib/career/counts.ts"))

  it("scopes all six queries by the member id", () => {
    expect(counts).toMatch(/eq\(workLogEntries\.userId, userId\)/)
    expect(counts.match(/eq\(tasks\.assigneeId, userId\)/g)).toHaveLength(2)
    expect(counts).toMatch(/eq\(deliverables\.ownerId, userId\)/)
    expect(counts).toMatch(/eq\(workReports\.userId, userId\)/)
    expect(counts).toMatch(/eq\(taskEvents\.actorId, userId\)/)
  })

  it("returns zero-filled signals rather than nulls", () => {
    expect(counts).toMatch(/return normaliseSignals\(/)
  })

  it("counts completed tasks once, not once per reopened event", () => {
    // Completion is read from `tasks` with an EXISTS on the done event, so a task that
    // was reopened and finished twice still contributes one completion.
    expect(counts).toMatch(/from\(tasks\)[\s\S]{0,400}exists\(/)
    expect(counts).toMatch(/eq\(taskEvents\.toStatus, "done"\)/)
    expect(counts).toMatch(/count\(distinct \$\{tasks\.id\}\)/)
  })
})

describe("career routes are announced to Next as dynamic", () => {
  it.each(["app/api/career/levels/route.ts", "app/api/career/me/route.ts"])(
    "%s opts out of static rendering",
    (file) => {
      expect(codeOnly(src(file))).toMatch(/export const dynamic = "force-dynamic"/)
    },
  )
})
