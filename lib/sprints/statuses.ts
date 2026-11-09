// The one rule for "the sprint moved". `sprints.status` is a varchar that the edit dialog offers
// as a plain choice and the row actions offer as Start / Complete, so the writer and the form have
// to agree about which moves are real. An earlier version of the PUT handler allowed only
// planned→active and active→completed, which made the dialog's own dropdown a promise it broke:
// picking "Active" on a closed sprint saved as an error, and a sprint closed by mistake stayed
// closed forever.

export const SPRINT_STATUSES = ["planned", "planning", "active", "completed"] as const

export type SprintStatus = (typeof SPRINT_STATUSES)[number]
export type NormalizedSprintStatus = "planned" | "active" | "completed"

/** `planning` is the older spelling of `planned`; rows written before 2026 still carry it. */
export function normalizeSprintStatus(status: string): NormalizedSprintStatus {
  if (status === "active") return "active"
  if (status === "completed") return "completed"
  return "planned"
}

export type SprintTransition = "started" | "completed" | "reopened"

/**
 * What a move from one status to another means, or null when nothing moved.
 *
 * Returning null matters: the edit dialog saves the whole draft, status included, so an unchanged
 * status must not notify the whole team that a sprint was completed.
 */
export function sprintTransition(from: string, to: string): SprintTransition | null {
  const before = normalizeSprintStatus(from)
  const after = normalizeSprintStatus(to)
  if (before === after) return null
  if (after === "completed") return "completed"
  if (after === "active" && before === "planned") return "started"
  return "reopened"
}
