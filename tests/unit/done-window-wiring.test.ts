// The window has to be a WHERE clause on the read that counts the rows, and a value on the row the
// page groups by. Both are one-line wiring mistakes that no pure test can catch: apply the
// predicate after the count and the pile still eats the page budget; anchor the bounds on the
// real today rather than the day being drawn and a past board shows cards that day never held.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const codeOnly = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const READ = codeOnly(src("lib/tasks/completed-on-read.ts"))

describe("the window is spent where the rows are counted", () => {
  const access = codeOnly(src("lib/data-access.ts"))
  const body = access.slice(
    access.indexOf("export async function getPaginatedTasks"),
    access.indexOf("// Wellbeing metrics functions"),
  )

  it("takes a window in the same filters object the rest of the read uses", () => {
    expect(body).toMatch(/doneWindow\??:\s*DoneWindowBounds/)
  })

  it("pushes the predicate in with the other conditions, before the query is built", () => {
    const push = body.indexOf("whereConditions.push(doneWindowSql(")
    const build = body.indexOf("const query = db.select()")
    expect(push).toBeGreaterThan(-1)
    expect(build).toBeGreaterThan(-1)
    expect(push).toBeLessThan(build)
  })

  it("answers how much the window left out, on the same base filters", () => {
    expect(body).toContain("doneEarlierSql(")
    expect(body).toMatch(/doneEarlier[,:]/)
  })

  it("keeps the escape hatch open: a read with no window asks no question of the events table", () => {
    expect(body).toMatch(/if\s*\(filters\?\.doneWindow\)/)
  })
})

describe("the API hands back the day and the window it used", () => {
  const route = codeOnly(src("app/api/tasks/route.ts"))
  const get = route.slice(route.indexOf("export async function GET"), route.indexOf("// POST handler"))

  it("reads the preference off the query string and resolves junk to the page's default", () => {
    expect(get).toMatch(/resolveDoneWindow\(\s*searchParams\.get\("doneWindow"\)/)
  })

  it("anchors the window on the day being drawn, not on the real today", () => {
    expect(get).toMatch(/doneWindowInstants\([^)]*boardDay\.iso/)
  })

  it("takes the timezone from the session and never from the query string", () => {
    expect(get).toMatch(/doneWindowInstants\([^)]*session\?\.timezone/)
    expect(get).not.toMatch(/searchParams\.get\("(timezone|tz|timeZone)"\)/)
  })

  it("asks for the finish events of the page it fetched, once", () => {
    expect(get).toMatch(/finishEventsFor\(/)
    // One call per request: a page asks "when did these finish" once, not once per card.
    expect([...get.matchAll(/finishEventsFor\(/g)]).toHaveLength(1)
  })

  it("puts the completion day on every row the page groups by", () => {
    expect(get).toMatch(/completedOn:\s*completedOnFrom\(/)
  })

  it("tells the page which window it drew, so a count can say what it means", () => {
    expect(get).toMatch(/doneWindow:\s*\{/)
    expect(get).toMatch(/earlier:/)
  })
})

describe("a schedule card is never caught by the window", () => {
  it("hides only a finished one-off", () => {
    // The clause is `not (finished and one-off) or …`, so an open card and a template's card both
    // fall on the keep side. A recurring row's `status` is not a completion at all.
    const window = codeOnly(READ.slice(READ.indexOf("export function doneWindowSql")))
    expect(window).toMatch(/not \$\{finishedOneOffSql\(\)\}/)
  })

  it("names the one-off vocabulary in one place", () => {
    const finished = READ.slice(READ.indexOf("function finishedOneOffSql"), READ.indexOf("export function doneWindowSql"))
    expect(finished).toContain("completedStatusSql(tasks.status)")
    expect(finished).toMatch(/'one-off'/)
    expect(finished).toMatch(/is null/)
  })
})
