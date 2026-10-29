// Pure planning for scripts/purge-demo-data.mjs: the order tables are emptied in, the predicate that
// empties each one, and the INSERT statements that would put the rows back.
//
// It is kept out of the runner for the same reason the rest of this repo's math sits beside the SQL
// that uses it — the shape of a purge against a live database has to be readable and testable without
// a database (tests/unit/demo-purge-plan.test.ts).

export const PURGE_USERS = "purge_users"
export const LEDGER_PREFIX = "purge_gone_"

/** Postgres truncates an identifier past 63 bytes, and a quietly truncated temp-table name is a bug
 *  nobody would see until a delete matched nothing. */
export function ledgerTable(parent) {
  const name = `${LEDGER_PREFIX}${parent}`
  if (name.length > 60) throw new Error(`ledger table name would be truncated: ${name}`)
  return name
}

export function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`
}

export function quoteText(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

/**
 * @typedef {object} PurgeEdge
 * @property {string} child the table holding the key
 * @property {string} childColumn the column holding the key
 * @property {string} parent the table the key points at
 * @property {string} [parentColumn] the column of the parent it points at
 * @property {string} [onDelete]
 */

/**
 * The order rows are DELETED in: children before parents.
 *
 * `edges` are foreign keys as { child, parent }: the child holds the key, the parent is what it
 * points at. A NO ACTION or RESTRICT key refuses to outlive its parent, so a child must be emptied
 * before the parent it points at — the topological order of a graph whose arrows run child -> parent,
 * which puts `users`, the root of this schema's graph, last.
 *
 * A self-reference cannot be ordered against itself (goals.parent_id, a quoted message) and is left
 * to the FK's own ON DELETE. Anything still unvisited afterwards is inside a reference cycle; those
 * are reported rather than quietly dropped, because the order is the one thing this plan cannot guess.
 *
 * @param {PurgeEdge[]} [edges]
 * @returns {{ order: string[], cyclic: string[] }}
 */
export function topoDeleteOrder(edges) {
  const parentsOf = new Map()
  const nodes = new Set()
  for (const edge of edges ?? []) {
    if (!edge?.child || !edge?.parent || edge.child === edge.parent) continue
    nodes.add(edge.child)
    nodes.add(edge.parent)
    if (!parentsOf.has(edge.child)) parentsOf.set(edge.child, new Set())
    parentsOf.get(edge.child).add(edge.parent)
  }

  const pending = new Map()
  for (const node of nodes) pending.set(node, 0)
  for (const [child, parents] of parentsOf) {
    for (const parent of parents) pending.set(parent, pending.get(parent) + 1)
  }

  const order = []
  const ready = [...nodes].filter((n) => pending.get(n) === 0).sort()
  while (ready.length) {
    const node = ready.shift()
    order.push(node)
    for (const parent of [...(parentsOf.get(node) ?? [])].sort()) {
      const next = pending.get(parent) - 1
      pending.set(parent, next)
      if (next === 0) ready.push(parent)
    }
    ready.sort()
  }

  return { order, cyclic: [...nodes].filter((n) => !order.includes(n)).sort() }
}

/**
 * The predicate that empties one table.
 *
 * Two kinds of clause. A column that names a demo account's id. A column that points at a row already
 * gathered into that row's parent ledger — the comment on a task that is going, the attachment on a
 * card whose assignee is going. The second kind is what makes this a closure over the schema instead
 * of a list of tables that happen to mention users, and it is why `edges` must arrive already
 * filtered: a caller that wants SET NULL pointers left alone drops them here, not in the SQL.
 *
 * Every returned clause carries the `why` the report prints, so what is about to be deleted can be
 * read without reading the SQL.
 *
 * @param {{ table: string, personColumns: Record<string, string[]>,
 *   edges?: PurgeEdge[], ledgered: Set<string> }} spec
 * @returns {{ sql: string, why: string }[]}
 */
export function purgeClauses({ table, personColumns, edges = [], ledgered }) {
  const clauses = []
  for (const column of personColumns?.[table] ?? []) {
    clauses.push({
      sql: `${quoteIdent(column)} IN (SELECT id FROM ${PURGE_USERS})`,
      why: `${column} names a demo account`,
    })
  }
  const seen = new Set()
  for (const edge of edges) {
    if (edge.child !== table) continue
    // every reference to users is already a person column; a ledger of users would be a second,
    // subtly different way of saying the same thing
    if (edge.parent === PURGE_USERS || edge.parent === "users") continue
    if (!ledgered?.has(edge.parent)) continue
    const key = `${edge.childColumn}->${edge.parent}`
    if (seen.has(key)) continue
    seen.add(key)
    clauses.push({
      sql: `${quoteIdent(edge.childColumn)} IN (SELECT ${quoteIdent(edge.parentColumn)} FROM ${quoteIdent(ledgerTable(edge.parent))})`,
      why: `${edge.childColumn} points at a purged ${edge.parent} row`,
    })
  }
  return clauses
}

/**
 * A SQL literal for one dumped value in a column of the given type.
 *
 * The dump reads rows with `to_jsonb(t.*)` precisely so this never has to guess: a timestamp arrives
 * as the text the server printed, not a JavaScript Date, so the machine replaying the file cannot
 * shift a `timestamp without time zone` by its own clock. Anything it cannot render exactly throws —
 * a silently wrong restore file is the one outcome worse than no restore file.
 */
export function sqlLiteral(value, dataType) {
  if (value === null || value === undefined) return "NULL"
  const type = String(dataType ?? "text").toLowerCase()
  const isJson = type === "json" || type === "jsonb"

  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "bigint") return String(value)
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`not a finite number for a ${type} column: ${value}`)
    return String(value)
  }
  if (isJson) return `${quoteText(JSON.stringify(value))}::jsonb`
  if (typeof value === "string") {
    if (type.endsWith("[]")) throw new Error(`a text value cannot be written into the ${type} column`)
    return quoteText(value)
  }
  if (Array.isArray(value)) {
    if (!type.endsWith("[]")) throw new Error(`an array cannot be written into the ${type} column`)
    const base = type.slice(0, -2)
    const body = value
      .map((item) => {
        if (item === null || item === undefined) return "NULL"
        if (typeof item === "object") throw new Error(`nested objects are not supported in a ${base}[] column`)
        return typeof item === "string" ? quoteText(item) : String(item)
      })
      .join(", ")
    return `ARRAY[${body}]::${base}[]`
  }
  throw new Error(`unsupported value for a ${type} column: ${JSON.stringify(value).slice(0, 80)}`)
}

/**
 * One replayable INSERT for a dumped row, holding its original primary key so the children inserted
 * after it still point at the same parent. Five tables here have a composite key (reactions,
 * chat_participants, work_report_recipients, career_placement, ai_usage_daily), so the conflict target
 * is a list, not a name. ON CONFLICT keeps a partial replay idempotent.
 *
 * @param {{ table: string, primaryKeys: string[],
 *   columns: { name: string, dataType: string }[], row: Record<string, unknown> }} spec
 * @returns {string}
 */
export function insertStatement({ table, primaryKeys, columns, row }) {
  const names = (columns ?? []).map((c) => quoteIdent(c.name)).join(", ")
  const values = (columns ?? []).map((c) => sqlLiteral(row?.[c.name], c.dataType)).join(", ")
  const keys = (primaryKeys ?? []).map((c) => quoteIdent(c))
  const conflict = keys.length ? `ON CONFLICT (${keys.join(", ")}) DO NOTHING` : "ON CONFLICT DO NOTHING"
  return `INSERT INTO ${quoteIdent(table)} (${names}) VALUES (${values}) ${conflict};`
}

/**
 * A serial column restored with explicit ids leaves its sequence behind, and the next insert the app
 * makes would collide with a row that is already there. Only emitted for a column that is actually
 * backed by a sequence, which the caller knows from its column_default.
 */
export function sequenceResetStatement({ table, column }) {
  return `SELECT setval(pg_get_serial_sequence(${quoteText(table)}, ${quoteText(column)}), (SELECT MAX(${quoteIdent(column)}) FROM ${quoteIdent(table)}));`
}
