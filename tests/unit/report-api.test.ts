import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const shared = () => src("app/api/reports/work/_shared.ts")
const listRoute = () => src("app/api/reports/work/route.ts")

/**
 * Comment-stripped, so a negative guard ("this file must not say 403") cannot be defeated by a
 * sentence in a header comment that explains the rule.
 */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

function workRoutesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(repo, dir))) {
    const relative = `${dir}/${entry}`
    if (statSync(path.join(repo, relative)).isDirectory()) out.push(...workRoutesIn(relative))
    else if (relative.endsWith("/route.ts")) out.push(relative)
  }
  return out
}

describe("every work-report route is session-gated", () => {
  // _shared.ts resolves the session, so schema-safety's name-based check cannot see the gate
  // in a route file. This is the half it cannot check.
  const routes = workRoutesIn("app/api/reports/work")

  it("finds the routes it is guarding", () => {
    expect(routes.length).toBeGreaterThanOrEqual(1)
  })

  it.each(routes)("%s refuses before touching the database", (file) => {
    const code = src(file)
    expect(code).toMatch(/const session = await reportSession\(\)/u)
    expect(code).toMatch(/if \(!session\) return unauthorized\(\)/u)
    expect(code).toMatch(/export const dynamic = "force-dynamic"/u)
  })
})

describe("the work-report reads", () => {
  it("names the ownership column of every source it reads", () => {
    // Five different columns, because five different tables own their rows differently. A read
    // that forgot one would hand another member's work to this report.
    for (const guard of [
      /eq\(workLogEntries\.userId, userId\)/u,
      /eq\(deliverables\.ownerId, userId\)/u,
      /eq\(taskEvents\.actorId, userId\)/u,
      /eq\(tasks\.assigneeId, userId\)/u,
      /eq\(agentPlans\.createdBy, userId\)/u,
      /eq\(workReports\.userId, userId\)/u,
    ]) {
      expect(shared()).toMatch(guard)
    }
  })

  it("caps every read, so a yearly report cannot fan out into a timeout", () => {
    expect(shared().match(/\.limit\(/gu)).not.toBeUndefined()
    expect((shared().match(/\.limit\(/gu) ?? []).length).toBeGreaterThanOrEqual(8)
  })

  it("never treats tasks.updated_at as a work date", () => {
    // Spec §15: completion comes from task_events. An updated_at is any edit, by anyone.
    expect(codeOnly(shared())).not.toMatch(/tasks\.updatedAt|updated_at/u)
    expect(codeOnly(src("lib/reports/aggregate.ts"))).not.toMatch(/updatedAt/u)
  })

  it("binds every value it puts in SQL", () => {
    expect(shared()).not.toMatch(/sql\.raw/u)
    // LIKE wildcards escaped before the pattern.
    expect(shared()).toMatch(/replace\(\/\[\\\\%_\]/u)
  })

  it("never puts a request value into a table name or column list", () => {
    // Every user-supplied value reaches SQL as a bound drizzle condition, never as text.
    expect(codeOnly(shared())).not.toMatch(/sql\.raw/u)
  })
})

describe("the list and create route", () => {
  it("reads through the shared whitelist, not its own", () => {
    expect(listRoute()).toMatch(/readReportCreate\(body\)/u)
    expect(listRoute()).toMatch(/listReports\(session\.id, state\.q\)/u)
    expect(listRoute()).toMatch(/parseReportView\(request\.nextUrl\.searchParams, today\)/u)
  })

  it("inserts whitelisted columns only — never a spread body", () => {
    expect(codeOnly(listRoute())).not.toMatch(/\.\.\.body|\.\.\.parsed/u)
    expect(listRoute()).toMatch(/userId: session\.id/u)
    // `status: 201` on the response is fine; a `status: "..."` column value is phase 4's.
    expect(codeOnly(listRoute())).not.toMatch(/status:\s*"/u)
  })

  it("refuses a period pair that does not match its own period type", () => {
    expect(listRoute()).toMatch(/resolvePeriod\(/u)
    expect(listRoute()).toMatch(/must be the period implied by periodType/u)
  })

  it("computes metrics on the server", () => {
    // A draft whose numbers came from the browser is a draft whose numbers are decoration.
    expect(listRoute()).toMatch(/assembleReport\(session\.id, session\.timezone, declared\)/u)
  })

  it("answers with the row it just wrote, re-read through the ownership condition", () => {
    expect(listRoute()).toMatch(/\.returning\(reportColumns\)/u)
    expect(listRoute()).toMatch(/mapReport\(inserted\)/u)
  })
})
