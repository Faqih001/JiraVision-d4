// The completed-status list, as SQL.
//
// Server-only: this renders a drizzle fragment. The client half of the same rule is
// isCompletedTaskStatus() in lib/tasks/statuses.ts, which is case- and whitespace-tolerant and
// raw SQL is not — an accepted asymmetry, because every swept site reads rows this app wrote.
//
// Three forms, because the rule is applied to `tasks.status` reached three ways: through
// drizzle's column objects, inside a raw statement that aliased the table, and in JS on a row
// already fetched. A constant bound to the first cannot serve the second.

import { sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import { COMPLETED_TASK_STATUSES } from "@/lib/tasks/statuses"

/** The bound word list on its own, for a fragment that names its own (possibly aliased) column. */
export function completedStatusListSql(): SQL {
  return sql.join(
    COMPLETED_TASK_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  )
}

/** `status in ('done','completed','closed')` — this task is finished, whichever word wrote it. */
export function completedStatusSql(column: PgColumn): SQL {
  return sql`${column} in (${completedStatusListSql()})`
}

/** The one source for "this task is still open": the exact negation of the list above. */
export function openStatusSql(column: PgColumn): SQL {
  return sql`not (${completedStatusSql(column)})`
}
