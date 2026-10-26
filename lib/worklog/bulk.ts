// The grammar of a bulk write on the work log. The route executes; this decides whether
// the request was ever allowed to exist. A bulk action must be safe to apply to 200 rows
// at once, which is why kinds that need a per-row companion (time needs minutes,
// deliverable needs a deliverable row) are refused here rather than half-applied there.

import { WORK_LOG_KINDS, isWorkLogKind, type WorkLogKind } from "./entries"
import type { Fail } from "./entry-fields"
import { isIsoDate } from "./local-day"

export const BULK_ACTIONS = ["delete", "set-task", "re-date", "set-kind", "convert-deliverable"] as const
export type BulkAction = (typeof BULK_ACTIONS)[number]

export const BULK_IDS_CAP = 200

// The kinds a bulk reclassify can set. `time` needs minutes of its own per row and `deliverable`
// needs a deliverable row to link to, so both are edited one row at a time. The screen builds its
// Reclassify list from this, so it can never offer a button this reader would refuse.
export const BULK_SETTABLE_KINDS: readonly WorkLogKind[] = WORK_LOG_KINDS.filter(
  (kind) => kind !== "time" && kind !== "deliverable",
)

export type BulkRequest = {
  action: BulkAction
  ids: number[]
  taskId: number | null
  workedOn: string | null
  kind: WorkLogKind | null
}

function isBulkAction(value: unknown): value is BulkAction {
  return typeof value === "string" && (BULK_ACTIONS as readonly string[]).includes(value)
}

function readIds(value: unknown): number[] | Fail {
  if (!Array.isArray(value) || value.length === 0) return { error: "No rows selected." }
  const ids = [...new Set(value.map((raw) => Number(raw)).filter((n) => Number.isInteger(n) && n > 0))]
  if (ids.length === 0) return { error: "No valid entry ids in the selection." }
  if (ids.length > BULK_IDS_CAP) return { error: `Select at most ${BULK_IDS_CAP} rows at a time.` }
  return ids
}

export function readBulkRequest(input: unknown, todayIso: string): { value: BulkRequest } | Fail {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be an object" }
  }
  const source = input as Record<string, unknown>

  const action = source.action
  if (!isBulkAction(action)) {
    // Naming what was sent, because "action must be one of …" on a typo the caller can see
    // is only useful if the answer says which half of it the caller got wrong.
    return { error: `action must be one of: ${BULK_ACTIONS.join(", ")} (got ${String(action).slice(0, 40)})` }
  }

  const ids = readIds(source.ids)
  if ("error" in ids) return ids

  const request: BulkRequest = { action, ids, taskId: null, workedOn: null, kind: null }

  switch (action) {
    case "delete":
    case "convert-deliverable":
      return { value: request }

    case "set-task": {
      // Same convention as the row whitelist: an absent field is not a request to unlink.
      if (source.taskId === undefined) {
        return { error: "set-task needs a taskId (a positive integer, or null to unlink)." }
      }
      const raw = source.taskId
      if (raw === null || raw === "") {
        request.taskId = null
        break
      }
      const n = Number(raw)
      if (!Number.isInteger(n) || n <= 0) return { error: "taskId must be a positive integer or null" }
      request.taskId = n
      break
    }

    case "re-date": {
      const raw = source.workedOn
      if (typeof raw !== "string" || !isIsoDate(raw)) return { error: "re-date needs workedOn as YYYY-MM-DD" }
      if (raw > todayIso) return { error: "A work log entry cannot be dated in the future." }
      request.workedOn = raw
      break
    }

    case "set-kind": {
      const raw = source.kind
      if (!isWorkLogKind(raw)) return { error: `kind must be one of: ${WORK_LOG_KINDS.join(", ")}` }
      if (raw === "time") return { error: "A #time entry needs its own minutes — edit those rows individually." }
      if (raw === "deliverable") return { error: "Use Convert to deliverable to link rows to a deliverable." }
      request.kind = raw
      break
    }
  }

  return { value: request }
}
