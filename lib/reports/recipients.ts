// Recipient validation for work reports. A report lists 1–10 recipients, each a
// positive integer user id. The array is sorted and deduplicated on the way in so
// downstream queries can join on it without a DISTINCT.

export type Fail = { error: string }
export type Read<T> = T | Fail
export function isFail(value: unknown): value is Fail {
  return typeof value === "object" && value !== null && "error" in value
}

export const MAX_RECIPIENTS = 10

export function readRecipientIds(input: unknown): Read<{ value: number[] }> {
  if (!Array.isArray(input)) return { error: "recipients must be an array of user ids" }
  if (input.length === 0) return { error: "at least one recipient is required" }
  if (input.length > MAX_RECIPIENTS) {
    return { error: `at most ${MAX_RECIPIENTS} recipients per report` }
  }

  const ids: number[] = []
  for (const raw of input) {
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
      return { error: "every recipient id must be a positive integer" }
    }
    ids.push(raw)
  }

  const unique = [...new Set(ids)]
  if (unique.length !== ids.length) return { error: "duplicate recipient ids are not allowed" }
  return { value: unique.sort((a, b) => a - b) }
}
