// Report and recurrence vocabulary. Deliberately free of the database and of cookies,
// the same reason lib/roles.ts is: lib/db.js shadows lib/db.ts under Vitest, so anything
// that imports a connection cannot be unit tested. Kept as one small module because the
// work log, the report builder and the register queue all need the same five values.

export const CADENCES = ["one-off", "daily", "weekly", "monthly", "yearly"] as const
export type Cadence = (typeof CADENCES)[number]

export const CADENCE_LABEL: Record<Cadence, string> = {
  "one-off": "One-off",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
}

/** Nominal period length in days, for range defaults. `one-off` has no period. */
export const CADENCE_DAYS: Record<Cadence, number | null> = {
  "one-off": null,
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
}

export function isCadence(value: unknown): value is Cadence {
  return typeof value === "string" && (CADENCES as readonly string[]).includes(value)
}

/**
 * The next time this schedule should run, or null when it should never run again.
 * UTC arithmetic on purpose: `report_schedules.next_run_at` is a timestamptz and the
 * existing rows were produced this way, so a change here would shift live schedules.
 */
export function computeNextRun(cadence: Cadence, from: Date = new Date()): string | null {
  if (cadence === "one-off") return null
  const next = new Date(from)
  switch (cadence) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1)
      break
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7)
      break
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1)
      break
    case "yearly":
      // setUTCFullYear rolls 29 Feb to 1 Mar of the next year rather than clamping.
      next.setUTCFullYear(next.getUTCFullYear() + 1)
      break
  }
  return next.toISOString()
}
