import { describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"
import { tasks } from "@/drizzle/schema"
import { COMPLETED_TASK_STATUSES } from "@/lib/tasks/statuses"
import { completedStatusListSql, completedStatusSql, openStatusSql } from "@/lib/tasks/statuses-sql"

// A drizzle `SQL` fragment has no `toSQL()`; the dialect is what renders it. PgDialect is
// constructed without a connection, so this measures the same text the server will send.
const render = (fragment: ReturnType<typeof completedStatusSql>) => new PgDialect().sqlToQuery(fragment)

describe("completedStatusSql", () => {
  it("binds every word in the shared list, so a fourth word arrives automatically", () => {
    const { sql: text, params } = render(completedStatusSql(tasks.status))
    expect(params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(text.toLowerCase()).toContain("in (")
  })

  it("renders the qualified column, not a bare name", () => {
    expect(render(completedStatusSql(tasks.status)).sql).toContain('"tasks"."status"')
  })
})

describe("openStatusSql", () => {
  it("is the exact negation of the completed fragment", () => {
    const open = render(openStatusSql(tasks.status))
    expect(open.params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(open.sql.toLowerCase()).toContain("not (")
  })
})

describe("completedStatusListSql", () => {
  it("binds one placeholder per word and no column of its own", () => {
    const { sql: text, params } = render(completedStatusListSql())
    expect(params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(text.split("$").length - 1).toBe(COMPLETED_TASK_STATUSES.length)
    expect(text).not.toContain("status")
  })

  it("renders a valid `not in` after a raw aliased column", () => {
    const fragment = render(sql`t.status not in (${completedStatusListSql()})`)
    expect(fragment.params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(fragment.sql.toLowerCase()).toContain("t.status not in")
  })
})
