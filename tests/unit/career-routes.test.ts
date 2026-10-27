import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("/api/career/me", () => {
  const route = codeOnly(src("app/api/career/me/route.ts"))

  it("loads the session before reading the profile", () => {
    const sessionAt = route.indexOf("await getSession()")
    expect(sessionAt).toBeGreaterThanOrEqual(0)
    expect(sessionAt).toBeLessThan(route.indexOf("loadCareerProfile("))
    expect(route).toMatch(/status: 401/)
  })

  it("scopes every member read by the session id, not by a request id", () => {
    expect(route).toMatch(/loadCareerProfile\(\{\s*userId: session\.id/)
    expect(route).not.toMatch(/request\.json\(\)/)
    expect(route).not.toMatch(/searchParams\.get\("userId"\)/)
  })

  it("accepts only a known ladder discipline from the query string", () => {
    expect(route).toMatch(/isLadderDiscipline\(requested\)/)
    expect(route).toMatch(/status: 400/)
  })

  it("never reads a percentage from the caller", () => {
    expect(route).not.toMatch(/percent\s*[:=]/)
    expect(route).not.toMatch(/request\.json\(\)/)
  })

  it("never writes", () => {
    expect(route).not.toMatch(/\.insert\(|\.update\(|\.delete\(/)
  })
})

describe("career profile reader", () => {
  const profile = codeOnly(src("lib/career/profile.ts"))

  it("scopes every membership read by the member id it is given", () => {
    expect(profile).toMatch(/eq\(careerPlacement\.userId, userId\)/)
    expect(profile).toMatch(/eq\(careerSignoffs\.userId, userId\)/)
    expect(profile).toMatch(/eq\(careerRequests\.userId, userId\)/)
    expect(profile).toMatch(/userId,\s*startDay|userId,\s*\n?\s*startDay/)
  })

  it("computes readiness on the server", () => {
    expect(profile).toMatch(/computeReadiness\(/)
    expect(profile).toMatch(/countCareerSignals\(/)
  })
})

describe("career evidence reader", () => {
  const evidence = codeOnly(src("lib/career/evidence.ts"))

  it("scopes every evidence query by the member id", () => {
    expect(evidence).toMatch(/eq\(workLogEntries\.userId, userId\)/)
    expect(evidence).toMatch(/eq\(tasks\.assigneeId, userId\)/)
    expect(evidence).toMatch(/eq\(deliverables\.ownerId, userId\)/)
    expect(evidence).toMatch(/eq\(workReports\.userId, userId\)/)
  })

  it("caps the row count instead of returning an unbounded list", () => {
    expect(evidence).toMatch(/MAX_EVIDENCE_ROWS = 200/)
    expect(evidence).toMatch(/truncated: rows\.length > MAX_EVIDENCE_ROWS/)
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

  it("returns active rungs only, and shows inactive ones only to a super-admin", () => {
    expect(route).toMatch(/eq\(careerLevels\.isActive, true\)/)
    expect(route).toMatch(/isSuperAdmin\(session\)/)
    expect(route).toMatch(/searchParams\.get\("all"\) === "1"/)
  })

  it("never writes", () => {
    expect(route).not.toMatch(/\.insert\(|\.update\(|\.delete\(/)
  })
})

describe("PATCH /api/career/levels/[id]", () => {
  const route = codeOnly(src("app/api/career/levels/[id]/route.ts"))

  it("is admin-gated", () => {
    expect(route).toMatch(/await careerAdmin\(\)/)
    expect(route).toMatch(/if \("error" in gate\) return gate\.error/)
  })

  it("validates the band, targets and checklist through the pure readers", () => {
    expect(route).toMatch(/readBand\(body\.band/)
    expect(route).toMatch(/readTargets\(body\.signals\)/)
    expect(route).toMatch(/readChecklist\(body\.checklist\)/)
  })

  it("only edits the rung itself", () => {
    expect(route).toMatch(/\.update\(careerLevels\)/)
    expect(route).toMatch(/updatedAt: new Date\(\)/)
    expect(route).not.toMatch(/careerPlacement|careerSignoffs|careerRequests/)
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
