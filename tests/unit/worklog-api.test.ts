import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const shared = () => src("app/api/worklog/_shared.ts")

function routesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(repo, dir))) {
    const relative = `${dir}/${entry}`
    const absolute = path.join(repo, relative)
    if (statSync(absolute).isDirectory()) out.push(...routesIn(relative))
    else if (relative.endsWith("/route.ts")) out.push(relative)
  }
  return out
}

describe("every work log route is session-gated", () => {
  // app/api/worklog/_shared.ts resolves the session, so schema-safety's name-based check
  // cannot see the gate in a route file. This is the half it cannot check: the route must
  // act on a missing session instead of carrying on with an undefined user id.
  const routes = routesIn("app/api/worklog")

  it("finds the routes it is guarding", () => {
    expect(routes.length).toBeGreaterThanOrEqual(1)
  })

  it.each(routes)("%s refuses before touching the database", (file) => {
    const code = src(file)
    expect(code).toMatch(/const session = await worklogSession\(\)/u)
    expect(code).toMatch(/if \(!session\) return unauthorized\(\)/u)
  })
})

describe("work log shared helpers", () => {
  it("always puts ownership first in the filter vocabulary", () => {
    expect(shared()).toMatch(/const conditions: SQL\[\] = \[\n    eq\(workLogEntries\.userId, userId\),/u)
  })

  it("escapes ilike wildcards before building a pattern", () => {
    expect(shared()).toMatch(/likePattern/u)
    expect(shared()).toMatch(/\\\\%_/u)
    expect(shared()).toMatch(/ilike/u)
  })
})

describe("work log entries route", () => {
  const route = () => src("app/api/worklog/entries/route.ts")

  it("scopes every read and write to the session user", () => {
    expect(route()).toMatch(/entryFilters\(state, session\.id, from, to\)/u)
    expect(route()).toMatch(/userId: session\.id/u)
  })

  it("uses the page's own view state instead of a second filter vocabulary", () => {
    expect(route()).toMatch(/parseViewState/u)
    expect(route()).toMatch(/resolveRange/u)
    // the conditions themselves are built in exactly one place
    expect(route()).not.toMatch(/isNotNull\(workLogEntries/u)
  })

  it("only lets a whitelist write the row", () => {
    expect(route()).toMatch(/readEntryCreate/u)
    // A spread body is the exact bug lib/task-updates.ts exists for.
    expect(route()).not.toMatch(/values\(\{?\s*\.\.\.body/u)
  })

  it("refuses a forward-dated log entry", () => {
    expect(route()).toMatch(/localDay/u)
    expect(route()).toMatch(/future/iu)
  })

  it("checks that a deliverable on a row belongs to this member", () => {
    // A foreign key alone would accept another member's deliverable and hand their work
    // to this log, so the ownership predicate is on the check, not only on the schema.
    expect(route()).toMatch(/eq\(deliverables\.ownerId, session\.id\)/u)
  })

  it("has no client secret surface", () => {
    expect(route()).not.toMatch(/NEXT_PUBLIC_/u)
  })
})

describe("work log entry row route", () => {
  const route = () => src("app/api/worklog/entries/[id]/route.ts")

  it("puts ownership in the where clause, not in a check-then-act", () => {
    expect(route()).toMatch(/and\(eq\(workLogEntries\.id, numericId\), eq\(workLogEntries\.userId, session\.id\)\)/u)
  })

  it("answers 404 without distinguishing missing from foreign", () => {
    expect(route()).toMatch(/notFound\("Entry not found"\)/u)
    expect(route()).not.toMatch(/not owned/u)
  })

  it("re-dates through the whitelist, never from the body", () => {
    expect(route()).toMatch(/pickEntryUpdates/u)
    expect(route()).toMatch(/if \(result\.redated\) set\.redatedAt = new Date\(\)/u)
    expect(route()).toMatch(/\.set\(set\)/u)
    expect(route()).not.toMatch(/\.set\(\{ \.\.\.body/u)
  })

  it("parses the params promise the way Next 16 requires", () => {
    expect(route()).toMatch(/params: Promise<\{ id: string \}>/u)
  })
})

describe("work log bulk route", () => {
  const route = () => src("app/api/worklog/entries/bulk/route.ts")

  it("filters the ids by ownership inside the query", () => {
    expect(route()).toMatch(/and\(inArray\(workLogEntries\.id, ids\), eq\(workLogEntries\.userId, userId\)\)/u)
    // one helper, five call sites: a bulk write that skipped ownership would edit foreign rows
    expect(route().match(/ownedIds\(/gu)?.length).toBeGreaterThanOrEqual(6)
  })

  it("reports requested and affected separately", () => {
    expect(route()).toMatch(/requested: body\.ids\.length/u)
    expect(route()).toMatch(/affected: affected\.length/u)
    expect(route()).toMatch(/skipped: body\.ids\.length - affected\.length/u)
  })

  it("runs a multi-write action in one transaction", () => {
    expect(route()).toMatch(/db\.transaction/u)
    expect(route()).toMatch(/insert\(deliverables\)/u)
  })

  it("only writes through the bulk grammar", () => {
    expect(route()).toMatch(/readBulkRequest/u)
    expect(route()).not.toMatch(/\.set\(\{ \.\.\.body/u)
  })

  it("answers 404 when the whole selection was someone else's", () => {
    expect(route()).toMatch(/notFound\("No matching entries"\)/u)
  })
})

describe("work log deliverables routes", () => {
  const list = () => src("app/api/worklog/deliverables/route.ts")
  const row = () => src("app/api/worklog/deliverables/[id]/route.ts")

  it("scopes both list and row routes to the owner", () => {
    expect(list()).toMatch(/eq\(deliverables\.ownerId, session\.id\)/u)
    expect(row()).toMatch(/and\(eq\(deliverables\.id, numericId\), eq\(deliverables\.ownerId, session\.id\)\)/u)
  })

  it("counts the log rows behind each deliverable", () => {
    expect(list()).toMatch(/deliverableSelect/u)
    expect(list()).toMatch(/\.select\(deliverableSelect\)/u)
    expect(row()).toMatch(/deliverableSelect/u)
  })

  it("sends status changes through the lifecycle whitelist", () => {
    expect(row()).toMatch(/pickDeliverableUpdates\(body, existing\.status as DeliverableStatus\)/u)
    expect(row()).not.toMatch(/\.set\(\{ \.\.\.body/u)
  })

  it("refuses a forward-dated producedOn", () => {
    expect(list()).toMatch(/isIsoDate/u)
    expect(list()).toMatch(/future|producedOn must/iu)
    // The same day rule at both ends of the noun's life: a save must not be able to date a
    // deliverable ahead of today when a create cannot.
    expect(row()).toMatch(/localDay/u)
    expect(row()).toMatch(/produced in the future/iu)
  })

  it("says 404 for a deliverable that is not yours", () => {
    expect(row()).toMatch(/notFound\("Deliverable not found"\)/u)
  })

  it("has no client secret surface", () => {
    expect(list()).not.toMatch(/NEXT_PUBLIC_/u)
    expect(row()).not.toMatch(/NEXT_PUBLIC_/u)
  })
})

describe("work log summary route", () => {
  const route = () => src("app/api/worklog/summary/route.ts")

  it("reads entries through the shared filter vocabulary", () => {
    expect(route()).toMatch(/entryFilters\(state, session\.id, from, to\)/u)
  })

  it("scopes task history to the actor, not just the task", () => {
    expect(route()).toMatch(/eq\(taskEvents\.actorId, session\.id\)/u)
  })

  it("bounds the history window in the member's own timezone", () => {
    expect(route()).toMatch(/rangeBoundsUtc\(from, to, session\.timezone\)/u)
    expect(route()).toMatch(/gte\(taskEvents\.at, bounds\.start\)/u)
    expect(route()).toMatch(/lte\(taskEvents\.at, bounds\.end\)/u)
  })

  it("lets the pure module do the arithmetic", () => {
    expect(route()).toMatch(/buildSummary/u)
    expect(route()).toMatch(/viewDays/u)
  })

  it("has no client secret surface", () => {
    expect(route()).not.toMatch(/NEXT_PUBLIC_/u)
  })
})

describe("every worklog route", () => {
  // The phase-2 sweep over what Tasks 6 to 10 built. `routesIn` rather than a literal list:
  // a seventh route added later must fail this file open, not pass a list that never knew it.
  const routes = routesIn("app/api/worklog")
  const files = [...routes, "app/api/worklog/_shared.ts"]

  it("guards the six routes the phase shipped", () => {
    expect(routes).toHaveLength(6)
    for (const expected of [
      "app/api/worklog/entries/route.ts",
      "app/api/worklog/entries/[id]/route.ts",
      "app/api/worklog/entries/bulk/route.ts",
      "app/api/worklog/deliverables/route.ts",
      "app/api/worklog/deliverables/[id]/route.ts",
      "app/api/worklog/summary/route.ts",
    ]) {
      expect(routes).toContain(expected)
    }
  })

  it.each(routes)("%s scopes by the session user in SQL", (file) => {
    expect(src(file)).toMatch(/session\.id|userId/u)
  })

  it("every route that writes goes through a Task 4 whitelist", () => {
    // Only files exporting a write handler are held to this: a read-only route would have to
    // import a function it never calls to satisfy the guard.
    const writers = routes.filter((file) => /export async function (POST|PUT|DELETE)/u.test(src(file)))
    expect(writers).toHaveLength(5)
    for (const file of writers) {
      expect(src(file)).toMatch(
        /readEntryCreate|pickEntryUpdates|readDeliverableCreate|pickDeliverableUpdates|readBulkRequest/u,
      )
      // The whitelist is the whole write: a spread body is the bug lib/task-updates.ts exists for.
      expect(src(file)).not.toMatch(/values\(\{?\s*\.\.\.body/u)
    }
  })

  it.each(files)("%s has no client-only secret and no stub", (file) => {
    const code = src(file)
    expect(code).not.toMatch(/NEXT_PUBLIC_/u)
    expect(code).not.toMatch(/TODO|FIXME|not implemented/iu)
    expect(code).not.toMatch(/return new Response\("stub"/u)
  })

  it("imports nothing that reaches lib/db from a pure module", () => {
    // capture.ts is the one worklog module that writes through db, and it is a server-only
    // importer by design. Everything the page is allowed to import must stay out of that graph.
    for (const file of [
      "lib/worklog/local-day.ts",
      "lib/worklog/entries.ts",
      "lib/worklog/quick-add.ts",
      "lib/worklog/entry-fields.ts",
      "lib/worklog/view-state.ts",
      "lib/worklog/bulk.ts",
      "lib/worklog/summary.ts",
      "lib/worklog/task-events.ts",
    ]) {
      expect(src(file)).not.toMatch(/@\/lib\/db|from "\.\.\/\.\.\/lib\/db"/u)
    }
    expect(src("lib/worklog/capture.ts")).toMatch(/@\/lib\/db/u)
  })

  it("reuses the phase-1 tables instead of declaring a new schema", () => {
    const all = files.map(src).join("\n")
    expect(all).toMatch(/@\/drizzle\/schema/u)
    expect(all).not.toMatch(/CREATE TABLE|ALTER TABLE/u)
  })
})
