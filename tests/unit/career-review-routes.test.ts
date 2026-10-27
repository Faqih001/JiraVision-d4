import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("career shared helpers", () => {
  const shared = codeOnly(src("app/api/career/_shared.ts"))

  it("returns 401 before 403 and gates on isSuperAdmin", () => {
    expect(shared.indexOf("status: 401")).toBeLessThan(shared.indexOf("status: 403"))
    expect(shared).toMatch(/isSuperAdmin\(member\)/)
  })

  it("fans out only to other admins", () => {
    expect(shared).toMatch(/u\.id <> \$\{actor\.id\}/)
    expect(shared).toMatch(/role[\s\S]{0,80}admin[\s\S]{0,40}superadmin/)
    expect(shared).toMatch(/notifyMany\(ids/)
  })
})

describe("/api/career/signoffs", () => {
  const route = codeOnly(src("app/api/career/signoffs/route.ts"))

  it("gates every method on careerAdmin", () => {
    expect(route.match(/await careerAdmin\(\)/g)).toHaveLength(2)
    expect(route).toMatch(/if \("error" in gate\) return gate\.error/)
  })

  it("writes ticked_by from the admin session, never from the body", () => {
    expect(route).toMatch(/tickedBy: admin\.id/)
    expect(route).not.toMatch(/tickedBy\s*:\s*body/)
  })

  it("upserts on the member, rung and item", () => {
    expect(route).toMatch(
      /onConflictDoUpdate\(\{[\s\S]*target: \[careerSignoffs\.userId, careerSignoffs\.levelId, careerSignoffs\.itemKey\]/,
    )
  })

  it("only signs an item that exists on the rung and in the member's placement", () => {
    expect(route).toMatch(/normaliseChecklist\(level\.checklist\)\.find/)
    expect(route).toMatch(/eq\(careerPlacement\.userId, userId\)/)
  })

  it("returns each rung's id so the editor signs without guessing", () => {
    expect(route).toMatch(/levelId: row\.id/)
  })
})

describe("/api/career/placements", () => {
  const route = codeOnly(src("app/api/career/placements/route.ts"))

  it("gates every method on careerAdmin", () => {
    expect(route.match(/await careerAdmin\(\)/g)).toHaveLength(2)
  })

  it("writes the placement with the admin as placedBy and upserts per discipline", () => {
    expect(route).toMatch(/placedBy: admin\.id/)
    expect(route).toMatch(
      /onConflictDoUpdate\(\{[\s\S]*target: \[careerPlacement\.userId, careerPlacement\.discipline\]/,
    )
    expect(route).toMatch(/isLadderDiscipline\(discipline\)/)
  })

  it("never writes a member row other than the placement", () => {
    expect(route).not.toMatch(/\.update\(users\)/)
  })
})

describe("/api/career/requests", () => {
  const route = codeOnly(src("app/api/career/requests/route.ts"))

  it("gates submission on the member session and takes only a discipline", () => {
    const sessionAt = route.indexOf("await careerSession()")
    expect(sessionAt).toBeGreaterThanOrEqual(0)
    expect(sessionAt).toBeLessThan(route.indexOf("loadCareerProfile("))
    expect(route).toMatch(/isLadderDiscipline\(discipline\)/)
    expect(route).not.toMatch(/body\?\.percent|body\?\.readiness/)
  })

  it("freezes evidence built from counted rows, not from the body", () => {
    expect(route).toMatch(/collectCareerEvidence\(\{\s*userId: member\.id/)
    expect(route).toMatch(/startDay: profile\.windowStart/)
    expect(route).toMatch(/readiness,\s*signoffs/)
    expect(route).toMatch(/refs,/)
  })

  it("refuses a second open request and the top of the ladder", () => {
    expect(route).toMatch(/inArray\(careerRequests\.status, \["draft", "submitted"\]\)/)
    expect(route).toMatch(/status: 409|bad\([^)]*, 409\)/)
  })

  it("notifies other admins and links them to the queue", () => {
    expect(route).toMatch(/notifyCareerAdmins\(member/)
    expect(route).toMatch(/link: "\/admin\/career"/)
  })

  it("scopes a member's list to their own rows", () => {
    expect(route).toMatch(/eq\(careerRequests\.userId, member(Id|\.id)\)/)
    expect(route).toMatch(/REQUEST_LIST_LIMIT = 100/)
  })
})

describe("career request decisions", () => {
  const approve = codeOnly(src("app/api/career/requests/[id]/approve/route.ts"))
  const returned = codeOnly(src("app/api/career/requests/[id]/return/route.ts"))

  it("approves and moves the placement in one transaction", () => {
    expect(approve).toMatch(/await careerAdmin\(\)/)
    expect(approve).toMatch(/db\.transaction\(/)
    expect(approve).toMatch(/status: "approved"/)
    expect(approve).toMatch(/onConflictDoUpdate\(\{/)
  })

  it("refuses a request whose placement moved underneath it", () => {
    expect(approve).toMatch(/placement\.level !== row\.fromLevel/)
    expect(approve).toMatch(/row\.toLevel !== row\.fromLevel \+ 1/)
  })

  it("records the reviewing admin from the session", () => {
    expect(approve).toMatch(/reviewedBy: admin\.id/)
    expect(returned).toMatch(/reviewedBy: admin\.id/)
  })

  it("notifies the member on both decisions", () => {
    expect(approve).toMatch(/createNotification\(\{[\s\S]{0,200}type: "career"/)
    expect(returned).toMatch(/createNotification\(\{[\s\S]{0,200}type: "career"/)
  })

  it("requires a note to return and never writes a placement", () => {
    expect(returned).toMatch(/body\?\.note !== "string"/)
    expect(returned).toMatch(/returnNote: note/)
    expect(returned).not.toMatch(/careerPlacement/)
  })
})

describe("/api/career/me/evidence", () => {
  const route = codeOnly(src("app/api/career/me/evidence/route.ts"))

  it("is member-gated and scoped by the session id", () => {
    const sessionAt = route.indexOf("await careerSession()")
    expect(sessionAt).toBeGreaterThanOrEqual(0)
    expect(sessionAt).toBeLessThan(route.indexOf("collectCareerEvidence("))
    expect(route).toMatch(/status: 401/)
    expect(route.match(/userId: member\.id/g)).toHaveLength(2)
    expect(route).not.toMatch(/searchParams\.get\("userId"\)/)
  })

  it("reads the total from the counter, not from the returned rows", () => {
    expect(route).toMatch(/total: signals\[signal\]/)
    expect(route).toMatch(/countCareerSignals\(/)
  })

  it("accepts only a known signal", () => {
    expect(route).toMatch(/isCareerSignalKey\(signal\)/)
  })
})
