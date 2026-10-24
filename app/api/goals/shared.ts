// Pure helpers for the goals/OKR workspace — no DB or server imports so both
// the API routes and the client page can share the exact same math.

export const GOAL_STATUSES = [
  "not_started",
  "on_track",
  "at_risk",
  "behind",
  "achieved",
  "archived",
] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const METRIC_TYPES = ["percent", "number", "currency", "boolean"] as const
export type MetricType = (typeof METRIC_TYPES)[number]

/** Fields needed to compute progress — works for both raw rows and DTOs. */
export interface GoalMetric {
  metricType: MetricType
  baseline: number | null
  target: number
  current: number
}

export interface GoalDates {
  startDate: string
  dueDate: string | null
}

export interface GoalDto extends GoalMetric, GoalDates {
  id: number
  title: string
  description: string | null
  ownerId: number
  ownerName: string
  ownerAvatar: string | null
  createdBy: number
  creatorName: string
  quarter: string | null
  status: GoalStatus
  parentId: number | null
  createdAt: string
  updatedAt: string
  checkinCount: number
  childCount: number
  progressPct: number
  progressFormula: string
  suggestedStatus: GoalStatus
  daysLeft: number | null
  overdue: boolean
}

export interface CheckinDto {
  id: number
  goalId: number
  goalTitle: string
  value: number
  note: string | null
  authorId: number
  authorName: string
  authorAvatar: string | null
  createdAt: string
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Not started",
  on_track: "On track",
  at_risk: "At risk",
  behind: "Behind",
  achieved: "Achieved",
  archived: "Archived",
}

/** Higher rank = further from done (achieved/archived both count as settled). */
export const GOAL_STATUS_RANK: Record<GoalStatus, number> = {
  not_started: 0,
  on_track: 1,
  at_risk: 2,
  behind: 3,
  achieved: 4,
  archived: 4,
}

export function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n))
}

/**
 * Progress % by metric type (formula is surfaced in the UI as an honest note):
 *  - percent           → current, clamped 0–100
 *  - number/currency   → (current − baseline) / (target − baseline), clamped
 *  - boolean           → current >= 1 ? 100 : 0
 */
export function computeProgress(g: GoalMetric): { progressPct: number; formula: string } {
  if (g.metricType === "percent") {
    return { progressPct: Math.round(clampPct(g.current)), formula: "percent metric — progress = current % (clamped 0–100)" }
  }
  if (g.metricType === "boolean") {
    return { progressPct: g.current >= 1 ? 100 : 0, formula: "boolean metric — achieved once current ≥ 1" }
  }
  const baseline = g.baseline ?? 0
  const denom = g.target - baseline
  if (denom <= 0) {
    return {
      progressPct: g.current >= g.target ? 100 : 0,
      formula: "target ≤ baseline — progress = 100% once current ≥ target",
    }
  }
  const pct = ((g.current - baseline) / denom) * 100
  return {
    progressPct: Math.round(clampPct(pct)),
    formula: `(${g.metricType}: (current − baseline) ÷ (target − baseline))`,
  }
}

/**
 * Heuristic suggestion: compare progress against time elapsed between
 * start_date and due_date. Never returns 'archived'; the user always keeps a
 * manual override — this is only a badge + spotlight input.
 */
export function suggestStatus(
  g: GoalMetric & GoalDates,
  status: GoalStatus,
  progressPct: number,
  now: Date = new Date(),
): GoalStatus {
  if (status === "archived") return "archived"
  if (progressPct >= 100) return "achieved"
  if (!g.dueDate) return progressPct > 0 ? "on_track" : "not_started"

  const start = new Date(`${g.startDate}T00:00:00Z`).getTime()
  const due = new Date(`${g.dueDate}T23:59:59Z`).getTime()
  const t = now.getTime()
  if (t > due) return "behind"
  const span = due - start
  if (span <= 0) return progressPct > 0 ? "on_track" : "not_started"
  const expectedPct = clampPct(((t - start) / span) * 100)
  const gap = expectedPct - progressPct
  if (gap <= 10) return "on_track"
  if (gap <= 25) return "at_risk"
  return "behind"
}

export function daysLeft(dueDate: string | null, now: Date = new Date()): number | null {
  if (!dueDate) return null
  const due = new Date(`${dueDate}T23:59:59`)
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000)
}

/** Default quarter label for the create form, e.g. "2026-Q4". */
export function currentQuarter(now: Date = new Date()): string {
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`
}

/** Number-ish parse that tolerates the strings postgres-js returns for NUMERIC. */
export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}
