import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  PURGE_USERS,
  insertStatement,
  ledgerTable,
  purgeClauses,
  quoteIdent,
  quoteText,
  sequenceResetStatement,
  sqlLiteral,
  topoDeleteOrder,
} from "@/scripts/purge-plan.mjs"

const edge = (child: string, parent: string, childColumn = "ref_id", parentColumn = "id") => ({
  child,
  parent,
  childColumn,
  parentColumn,
})

describe("the delete order", () => {
  it("puts a child before the parent it points at", () => {
    const { order, cyclic } = topoDeleteOrder([
      edge("kanban_task_comments", "kanban_tasks", "task_id"),
      edge("kanban_tasks", "users", "assignee_id"),
    ])

    expect(cyclic).toEqual([])
    expect(order.indexOf("kanban_task_comments")).toBeLessThan(order.indexOf("kanban_tasks"))
    expect(order.indexOf("kanban_tasks")).toBeLessThan(order.indexOf("users"))
  })

  it("ends with the root of the graph, never with users first", () => {
    const { order } = topoDeleteOrder([
      edge("messages", "chats", "chat_id"),
      edge("chats", "users", "user_id"),
      edge("reactions", "messages", "message_id"),
    ])

    expect(order[0]).toBe("reactions")
    expect(order.at(-1)).toBe("users")
  })

  it("ignores a self-reference instead of hanging on it", () => {
    const { order, cyclic } = topoDeleteOrder([edge("goals", "goals", "parent_id"), edge("goals", "users", "owner_id")])

    expect(cyclic).toEqual([])
    expect(order).toEqual(["goals", "users"])
  })

  it("reports a cycle rather than silently dropping those tables", () => {
    const { order, cyclic } = topoDeleteOrder([edge("a", "b"), edge("b", "a")])

    expect(order).toEqual([])
    expect(cyclic).toEqual(["a", "b"])
  })

  it("survives an empty or missing edge list", () => {
    expect(topoDeleteOrder([])).toEqual({ order: [], cyclic: [] })
    expect(topoDeleteOrder()).toEqual({ order: [], cyclic: [] })
  })
})

describe("the purge predicate for one table", () => {
  it("matches a column that names a demo account", () => {
    const clauses = purgeClauses({
      table: "tasks",
      personColumns: { tasks: ["assignee_id"] },
      edges: [],
      ledgered: new Set(),
    })

    expect(clauses).toEqual([
      { sql: `"assignee_id" IN (SELECT id FROM ${PURGE_USERS})`, why: "assignee_id names a demo account" },
    ])
  })

  it("follows a pointer into its parent's ledger so a comment goes with its task", () => {
    const clauses = purgeClauses({
      table: "kanban_task_comments",
      personColumns: {},
      edges: [edge("kanban_task_comments", "kanban_tasks", "task_id")],
      ledgered: new Set(["kanban_tasks"]),
    })

    expect(clauses).toHaveLength(1)
    expect(clauses[0].sql).toBe(`"task_id" IN (SELECT "id" FROM "purge_gone_kanban_tasks")`)
    expect(clauses[0].why).toBe("task_id points at a purged kanban_tasks row")
  })

  it("uses the column the parent is actually keyed by", () => {
    const clauses = purgeClauses({
      table: "work_log_entries",
      personColumns: {},
      edges: [edge("work_log_entries", "deliverables", "deliverable_id", "public_ref")],
      ledgered: new Set(["deliverables"]),
    })

    expect(clauses[0].sql).toBe(`"deliverable_id" IN (SELECT "public_ref" FROM "purge_gone_deliverables")`)
  })

  it("skips a parent whose ledger does not exist yet", () => {
    const clauses = purgeClauses({
      table: "kanban_task_comments",
      personColumns: {},
      edges: [edge("kanban_task_comments", "kanban_tasks", "task_id")],
      ledgered: new Set(),
    })

    expect(clauses).toEqual([])
  })

  it("does not double up on users, which every person column already covers", () => {
    const clauses = purgeClauses({
      table: "tasks",
      personColumns: { tasks: ["assignee_id"] },
      edges: [edge("tasks", "users", "assignee_id")],
      ledgered: new Set(["users"]),
    })

    expect(clauses.map((c) => c.sql)).toEqual([`"assignee_id" IN (SELECT id FROM ${PURGE_USERS})`])
  })

  it("keeps one clause per column-parent pair, not one per duplicate edge", () => {
    const clauses = purgeClauses({
      table: "tasks",
      personColumns: { tasks: ["assignee_id"] },
      edges: [edge("tasks", "sprints", "sprint_id"), edge("tasks", "sprints", "sprint_id")],
      ledgered: new Set(["sprints"]),
    })

    expect(clauses.map((clause) => clause.sql)).toEqual([
      `"assignee_id" IN (SELECT id FROM ${PURGE_USERS})`,
      `"sprint_id" IN (SELECT "id" FROM "purge_gone_sprints")`,
    ])
  })

  it("is empty for a table with no person column and no purged parent", () => {
    expect(purgeClauses({ table: "career_levels", personColumns: {}, edges: [], ledgered: new Set() })).toEqual([])
  })

  it("names a ledger within the identifier limit Postgres truncates at", () => {
    expect(ledgerTable("tasks")).toBe("purge_gone_tasks")
    expect(ledgerTable("work_report_recipients")).toBe("purge_gone_work_report_recipients")
    expect(() => ledgerTable("a".repeat(60))).toThrow(/truncated/)
  })
})

describe("quoting", () => {
  it("escapes an identifier that contains a quote", () => {
    expect(quoteIdent('or"der')).toBe('"or""der"')
  })

  it("escapes a text literal that contains a quote", () => {
    expect(quoteText("O'Brien")).toBe("'O''Brien'")
  })
})

describe("the restored value of one dumped cell", () => {
  it("writes a missing value as NULL", () => {
    expect(sqlLiteral(null, "integer")).toBe("NULL")
    expect(sqlLiteral(undefined, "text")).toBe("NULL")
  })

  it("leaves a boolean, an integer and a bigint bare", () => {
    expect(sqlLiteral(true, "boolean")).toBe("true")
    expect(sqlLiteral(42, "integer")).toBe("42")
    expect(sqlLiteral(BigInt("9007199254740993"), "bigint")).toBe("9007199254740993")
  })

  it("keeps a timestamp as the text the server printed", () => {
    expect(sqlLiteral("2026-10-29 07:14:02.311", "timestamp")).toBe("'2026-10-29 07:14:02.311'")
  })

  it("casts a structured value to jsonb", () => {
    expect(sqlLiteral({ attendees: [10, 11] }, "jsonb")).toBe(`'{"attendees":[10,11]}'::jsonb`)
    expect(sqlLiteral([1, 2], "json")).toBe("'[1,2]'::jsonb")
  })

  it("builds an array literal from an array column", () => {
    expect(sqlLiteral([10, 11, 12], "integer[]")).toBe("ARRAY[10, 11, 12]::integer[]")
    expect(sqlLiteral(["a", "b"], "text[]")).toBe(`ARRAY['a', 'b']::text[]`)
  })

  it("refuses to write a string into an array column, or an array into a scalar one", () => {
    expect(() => sqlLiteral("1,2", "integer[]")).toThrow(/cannot be written/)
    expect(() => sqlLiteral([1, 2], "integer")).toThrow(/cannot be written/)
  })

  it("refuses a number it cannot represent exactly", () => {
    expect(() => sqlLiteral(Number.POSITIVE_INFINITY, "numeric")).toThrow(/finite/)
    expect(() => sqlLiteral(Number.NaN, "numeric")).toThrow(/finite/)
  })

  it("refuses a nested object inside an array column", () => {
    expect(() => sqlLiteral([{ a: 1 }], "jsonb[]")).toThrow(/nested objects/)
  })
})

describe("the replay file", () => {
  it("names every column and holds the original primary key", () => {
    const sql = insertStatement({
      table: "tasks",
      primaryKeys: ["id"],
      columns: [
        { name: "id", dataType: "integer" },
        { name: "title", dataType: "text" },
        { name: "assignee_id", dataType: "integer" },
      ],
      row: { id: 7, title: "Ship it", assignee_id: null },
    })

    expect(sql).toBe(`INSERT INTO "tasks" ("id", "title", "assignee_id") VALUES (7, 'Ship it', NULL) ON CONFLICT ("id") DO NOTHING;`)
  })

  it("targets a composite key, which five tables here have", () => {
    expect(
      insertStatement({
        table: "reactions",
        primaryKeys: ["message_id", "user_id"],
        columns: [
          { name: "message_id", dataType: "integer" },
          { name: "user_id", dataType: "integer" },
          { name: "emoji", dataType: "text" },
        ],
        row: { message_id: 3, user_id: 9, emoji: "👍" },
      }),
    ).toBe(`INSERT INTO "reactions" ("message_id", "user_id", "emoji") VALUES (3, 9, '👍') ON CONFLICT ("message_id", "user_id") DO NOTHING;`)
  })

  it("still works for a table whose primary key was never declared", () => {
    expect(
      insertStatement({ table: "notes", primaryKeys: [], columns: [{ name: "body", dataType: "text" }], row: { body: "x" } }),
    ).toContain("ON CONFLICT DO NOTHING")
  })

  it("pushes a serial past the ids it just restored", () => {
    expect(sequenceResetStatement({ table: "tasks", column: "id" })).toBe(
      `SELECT setval(pg_get_serial_sequence('tasks', 'id'), (SELECT MAX("id") FROM "tasks"));`,
    )
  })
})

describe("the runner that uses this plan", () => {
  const src = readFileSync(resolve(process.cwd(), "scripts/purge-demo-data.mjs"), "utf8")
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

  it("only writes when --apply is on the command line", () => {
    expect(code).toMatch(/args\.includes\("--apply"\)/u)
    expect(code).toMatch(/buildPlan\(\{ apply: APPLY \}\)/u)
  })

  it("rehearses by purging, replaying the dump and rolling both back", () => {
    expect(code).toMatch(/class Rehearsal extends Error/u)
    expect(code).toMatch(/if \(!apply\) \{[\s\S]{0,400}await tx\.unsafe\(restoreLines\.join/u)
    expect(code).toMatch(/await tx\.unsafe\(restoreLines\.join\("\\n"\)\)/u)
    expect(code).toMatch(/throw new Rehearsal\(\)/u)
    expect(code).toMatch(/catch \(error\) \{\s*if \(!\(error instanceof Rehearsal\)\) throw error/u)
  })

  it("counts what it deletes and stops if the two disagree", () => {
    expect(code).toMatch(/delete from \$\{quoteIdent\(table\)\} where \$\{predicates\.get\(table\)\}/u)
    expect(code).toMatch(/deleted \$\{gone\[0\]\.c\} rows but the plan counted/u)
  })

  it("walks the ledger parents first and the deletes children first, in one order each", () => {
    expect(code).toMatch(/const parentsFirst = \[\.\.\.order\]\.reverse\(\)/u)
    expect(code).toMatch(/const deleteOrder = \[\.\.\.parentsFirst\]\.reverse\(\)/u)
  })

  it("refuses to empty the workspace", () => {
    expect(code).toMatch(/no account matches the demo address pattern/u)
    expect(code).toMatch(/every account matches the demo pattern/u)
  })

  it("refuses a shape its ledger cannot hold instead of skipping it", () => {
    expect(code).toMatch(/composite foreign keys the ledger cannot hold/u)
    expect(code).toMatch(/no primary key, so its rows cannot be replayed/u)
  })

  it("never deletes a row whose pointer is only SET NULL", () => {
    expect(code).toMatch(/onDelete !== "set null"/u)
  })

  it("reports the ownerless tables it cannot reach", () => {
    expect(code).toMatch(/no owner column, so never touched/u)
  })

  it("reads the live DATABASE_URL, skipping the commented line 1", () => {
    expect(code).toMatch(/DATABASE_URL="\?\(\[\^"\\n\]\+\)"\?\/m/u)
    expect(code).toMatch(/"\.\.\/\.env\.local"/u)
  })

  it("writes the dump inside the ignored backups folder", () => {
    expect(code).toMatch(/backups\/demo-purge-/u)
    expect(readFileSync(resolve(process.cwd(), ".gitignore"), "utf8")).toMatch(/^\/backups\/$/mu)
  })
})
