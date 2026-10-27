import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const PLAYBOOK_ROUTES = [
  "app/api/playbooks/route.ts",
  "app/api/playbooks/[id]/route.ts",
  "app/api/playbooks/[id]/publish/route.ts",
  "app/api/playbooks/[id]/run/route.ts",
] as const

describe("playbook routes are session-gated", () => {
  it.each(PLAYBOOK_ROUTES)("%s refuses an anonymous request", (file) => {
    const route = codeOnly(src(file))
    expect(route).toMatch(/await playbookSession\(\)/)
    expect(route).toMatch(/, 401\)/)
  })

  it.each(PLAYBOOK_ROUTES)("%s opts out of static rendering", (file) => {
    expect(codeOnly(src(file))).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("is the only thing standing between a request and the tables", () => {
    const shared = codeOnly(src("app/api/playbooks/_shared.ts"))
    expect(shared).toMatch(/await getSession\(\)/)
    expect(shared).toMatch(/if \(!session\?\.id\) return null/)
  })
})

describe("playbook reads apply visibility", () => {
  const read = codeOnly(src("lib/playbooks/read.ts"))

  it("keeps a draft with its author unless the reader is an admin", () => {
    expect(read).toMatch(/if \(viewer\.admin\) return undefined/)
    expect(read).toMatch(/eq\(playbooks\.status, "published"\)/)
    expect(read).toMatch(/eq\(playbooks\.authorId, viewer\.id\)/)
  })

  it("answers an unreadable detail row as if it did not exist", () => {
    expect(read).toMatch(/export async function loadPlaybook\(/)
    expect(read).toMatch(/canReadPlaybook\(/)
    expect(read).toMatch(/if \(viewer && !canReadPlaybook\(playbook, viewer\)\) return null/)
  })
})

describe("POST /api/playbooks", () => {
  const route = codeOnly(src("app/api/playbooks/route.ts"))

  it("validates the playbook against the pack it names", () => {
    expect(route).toMatch(/packByKey\(/)
    expect(route).toMatch(/readPlaybookInput\(body, defaultMethod\(pack\.method\)\)/)
    expect(route).toMatch(/That role pack does not exist or is inactive/)
  })

  it("cannot be told who wrote it, what version it is or where it came from", () => {
    expect(route).not.toMatch(/source:\s*body\./)
    expect(route).not.toMatch(/authorId:\s*body\./)
    expect(route).not.toMatch(/version:\s*body\./)
    expect(route).not.toMatch(/aiMarked:\s*body\./)
    expect(route).toMatch(/source: "manual"/)
    expect(route).toMatch(/status: "draft"/)
    expect(route).toMatch(/authorId: gate\.session\.id/)
    expect(route).toMatch(/version: 1/)
    expect(route).toMatch(/aiMarked: false/)
  })
})

describe("PATCH /api/playbooks/[id]", () => {
  const route = codeOnly(src("app/api/playbooks/[id]/route.ts"))

  it("only lets the author or an admin edit", () => {
    expect(route).toMatch(/canEditPlaybook\(row, gate\.viewer\)/)
    expect(route).toMatch(/Playbook not found/)
  })

  it("publishes through its own route, so status stops at draft or archived", () => {
    expect(route).toMatch(/body\.status !== "draft" && body\.status !== "archived"/)
    expect(route).not.toMatch(/status: "published"/)
  })

  it("records a human edit of a model draft and bumps a published version", () => {
    expect(route).toMatch(
      /aiMarked: contentEdited && row\.source === "gemini" \? false : row\.aiMarked/,
    )
    expect(route).toMatch(
      /version: contentEdited && row\.status === "published" \? row\.version \+ 1 : row\.version/,
    )
  })
})

describe("POST /api/playbooks/[id]/publish", () => {
  const route = codeOnly(src("app/api/playbooks/[id]/publish/route.ts"))

  it("refuses with the reason the pure rule gives", () => {
    expect(route).toMatch(/publishProblem\(row\)/)
    expect(route).toMatch(/if \(problem\) return bad\(problem, 409\)/)
  })

  it("is the only route that writes the published status", () => {
    expect(route).toMatch(/status: "published"/)
  })
})

describe("POST /api/playbooks/[id]/run", () => {
  const route = codeOnly(src("app/api/playbooks/[id]/run/route.ts"))

  it("only runs a published playbook", () => {
    expect(route).toMatch(/if \(row\.status !== "published"\)/)
    expect(route).toMatch(/, 409\)/)
  })

  it("writes one log row per phase naming the version that was followed", () => {
    expect(route).toMatch(/runEntryDrafts\(row, notes\.value\)/)
    expect(route).toMatch(/db\.transaction\(/)
    expect(route).toMatch(/userId: gate\.session\.id/)
    expect(route).toMatch(/workedOn/)
    expect(route).toMatch(/source: "manual"/)
    expect(route).toMatch(/playbookId/)
    expect(route).toMatch(/playbookVersion/)
  })
})

describe("no playbook route reaches the task table", () => {
  it.each(PLAYBOOK_ROUTES)("%s writes no tasks", (file) => {
    expect(codeOnly(src(file))).not.toMatch(/\btasks\b/)
  })
})
