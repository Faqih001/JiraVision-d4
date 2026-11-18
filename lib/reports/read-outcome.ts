// Classifying a single-report read so a waking database is never reported as a privacy violation.
// The row route answers a true 404 only for a stranger's id; every other non-success — a 503 while
// Neon wakes, a 500, a dropped connection — is transient and retryable, not "this report is not
// yours". Conflating the two is how a cold start disables the editor and claims the report is absent.

export type RowReadOutcome = "ok" | "absent" | "transient"

/** `status` is the HTTP status, or 0 when the request never reached the server (network failure). */
export function classifyRowRead(status: number, success: boolean): RowReadOutcome {
  if (success) return "ok"
  if (status === 404) return "absent"
  return "transient"
}