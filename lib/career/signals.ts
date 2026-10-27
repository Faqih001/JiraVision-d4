// The nine career signals (design §11). This module is the registry only — every count
// is computed server-side in lib/career/counts.ts — and it stays free of database and
// cookie imports so the readiness arithmetic is unit-testable, the same reason
// lib/roles.ts and lib/reports/readiness-adjacent modules are.

/** Every signal is counted over this rolling window, ending today. */
export const CAREER_WINDOW_DAYS = 90

export type CareerSignalKey =
  | "days_logged_90"
  | "actions_logged_90"
  | "reviews_logged_90"
  | "tasks_completed_90"
  | "points_completed_90"
  | "deliverables_delivered"
  | "reports_submitted"
  | "disciplines_touched"
  | "plan_items_promoted"

export type CareerSignal = {
  key: CareerSignalKey
  /** Shown next to the bar in the readiness meter. */
  label: string
  /** What is counted, in words the member can check against their own log. */
  hint: string
}

export const CAREER_SIGNALS: readonly CareerSignal[] = [
  {
    key: "days_logged_90",
    label: "Days logged",
    hint: "Distinct days with at least one work log entry.",
  },
  {
    key: "actions_logged_90",
    label: "Entries logged",
    hint: "Work log entries of any kind, not just time records.",
  },
  {
    key: "reviews_logged_90",
    label: "Reviews and deliverables logged",
    hint: "Work log entries whose kind is review or deliverable.",
  },
  {
    key: "tasks_completed_90",
    label: "Tasks completed",
    hint: "Distinct tasks assigned to you that reached done.",
  },
  {
    key: "points_completed_90",
    label: "Story points completed",
    hint: "Story points on those completed tasks.",
  },
  {
    key: "deliverables_delivered",
    label: "Deliverables delivered",
    hint: "Deliverables you own that reached delivered.",
  },
  {
    key: "reports_submitted",
    label: "Reports submitted",
    hint: "Period reports you submitted that were not returned.",
  },
  {
    key: "disciplines_touched",
    label: "Disciplines touched",
    hint: "Distinct disciplines on tasks you worked in the window.",
  },
  {
    key: "plan_items_promoted",
    label: "Plan items promoted",
    hint: "Tasks you created by promoting a plan item.",
  },
] as const

export const CAREER_SIGNAL_KEYS: readonly CareerSignalKey[] = CAREER_SIGNALS.map(
  (signal) => signal.key,
)

export type CareerSignals = Record<CareerSignalKey, number>
export type CareerSignalTargets = Partial<Record<CareerSignalKey, number>>

// Written out in full so a key added to the type without a value is a compile error.
export const EMPTY_SIGNALS: CareerSignals = {
  days_logged_90: 0,
  actions_logged_90: 0,
  reviews_logged_90: 0,
  tasks_completed_90: 0,
  points_completed_90: 0,
  deliverables_delivered: 0,
  reports_submitted: 0,
  disciplines_touched: 0,
  plan_items_promoted: 0,
}

export function isCareerSignalKey(value: unknown): value is CareerSignalKey {
  return typeof value === "string" && (CAREER_SIGNAL_KEYS as readonly string[]).includes(value)
}

export function signalLabel(key: CareerSignalKey): string {
  return CAREER_SIGNALS.find((signal) => signal.key === key)?.label ?? key
}

export function signalHint(key: CareerSignalKey): string {
  return CAREER_SIGNALS.find((signal) => signal.key === key)?.hint ?? ""
}

/** Keep only registry keys with a finite, non-negative target; stored jsonb is untrusted. */
export function normaliseTargets(value: unknown): CareerSignalTargets {
  const out: CareerSignalTargets = {}
  if (!value || typeof value !== "object") return out
  const record = value as Record<string, unknown>
  for (const key of CAREER_SIGNAL_KEYS) {
    const raw = record[key]
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) out[key] = Math.trunc(raw)
  }
  return out
}

/**
 * Fill every registry key. A signal with no rows reads 0 — never null, never missing,
 * so the meter cannot show a bar that silently means "not counted".
 */
export function normaliseSignals(
  input: Partial<Record<string, number | null | undefined>> | null | undefined,
): CareerSignals {
  const out: CareerSignals = { ...EMPTY_SIGNALS }
  if (!input) return out
  for (const key of CAREER_SIGNAL_KEYS) {
    const value = input[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = Math.max(0, Math.trunc(value))
    }
  }
  return out
}
