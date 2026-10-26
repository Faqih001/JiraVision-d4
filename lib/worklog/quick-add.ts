// The quick-add grammar. Two tokens only: `#<number>` is minutes and a kind word is the
// kind. Anything else that starts with # is somebody's note and stays in the title.

import { WORK_LOG_KINDS, type WorkLogKind } from "./entries"

export const MAX_LOG_MINUTES = 1440
const MAX_TITLE_LENGTH = 500

const KIND_TOKENS: Record<string, WorkLogKind> = {
  "#action": "action",
  "#time": "time",
  "#blocker": "blocker",
  "#note": "note",
  "#review": "review",
}

export type QuickAddResult = { title: string; minutes: number | null; kind: WorkLogKind } | { error: string }

export function parseQuickAdd(raw: string): QuickAddResult {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return { error: "Write what you did first." }

  let minutes: number | null = null
  let kind: WorkLogKind = "action"
  let sawKind = false
  const rest: string[] = []

  for (const token of trimmed.split(/\s+/u)) {
    const lower = token.toLowerCase()
    const minutesMatch = /^#(\d{1,4})$/u.exec(lower)
    if (minutesMatch) {
      const value = Number(minutesMatch[1])
      if (value < 1 || value > MAX_LOG_MINUTES) {
        return { error: `#minutes must be between 1 and ${MAX_LOG_MINUTES}.` }
      }
      if (minutes !== null && minutes !== value) {
        return { error: "One #minutes token at a time." }
      }
      minutes = value
      continue
    }
    if (lower === "#deliverable") {
      return { error: "Save the row, then use Convert to deliverable." }
    }
    if (KIND_TOKENS[lower]) {
      if (sawKind && kind !== KIND_TOKENS[lower]) {
        return { error: "One kind token at a time." }
      }
      kind = KIND_TOKENS[lower]
      sawKind = true
      continue
    }
    rest.push(token)
  }

  const title = rest.join(" ").trim()
  if (!title) return { error: "Add what you did, not only tags." }
  if (title.length > MAX_TITLE_LENGTH) return { error: `That title is too long (${MAX_TITLE_LENGTH} characters max).` }
  if (kind === "time" && minutes === null) return { error: "A #time entry needs #minutes." }

  // Guard against a future edit that adds a kind without listing it here.
  if (!WORK_LOG_KINDS.includes(kind)) return { error: "Unknown entry kind." }

  return { title, minutes, kind }
}
