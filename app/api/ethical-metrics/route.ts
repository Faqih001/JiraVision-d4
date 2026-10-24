// Ethical AI metrics workspace API.
//
// Everything the /dashboard/ethical-metrics page shows is derived from live
// rows (tasks / users / wellbeing_metrics) or from snapshots recorded into the
// ethical_metrics table. There is no mock data and no model in the loop: the
// scores are deterministic formulas described by `FORMULAS` below and echoed
// to the UI so the maths is auditable.
//
// Storage notes (schema is additive-frozen for this page):
//   * scores + date            -> ethical_metrics (one row per snapshot)
//   * thresholds / labels /    -> users.preferences JSONB under the
//     recommendation states      "ethicalMetrics" namespace (per member)

import { NextResponse } from "next/server"
import { desc, eq, gte } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { ethicalMetrics, tasks, users, wellbeingMetrics } from "@/drizzle/schema"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export const ETHICS_LINK = "/dashboard/ethical-metrics"
const PREF_NAMESPACE = "ethicalMetrics"

/* ------------------------------------------------------------------ types */

export type EthicsAlertThresholds = {
  payEquityAlertThreshold: number
  workloadBalanceAlertThreshold: number
  deiTaskDistributionAlertThreshold: number
  overtimeAlertThreshold: number
}

export type EthicsConfig = {
  maxOvertimeHours: number
  /** a member above `overloadRatio` x team mean open points is overloaded */
  overloadRatio: number
  /** coefficient of variation that maps to score 0 */
  dispersionCeiling: number
  /** alert when one member holds more than this % of urgent/high points */
  priorityConcentrationAlertPct: number
  /** snapshots older than this many days are "stale" */
  snapshotStaleDays: number
  enablePayEquityTracking: boolean
  enableWorkloadBalanceTracking: boolean
  enableDeiTaskDistributionTracking: boolean
  enableOvertimeMonitoring: boolean
  alertThresholds: EthicsAlertThresholds
}

export const DEFAULT_CONFIG: EthicsConfig = {
  maxOvertimeHours: 5,
  overloadRatio: 1.5,
  dispersionCeiling: 1.5,
  priorityConcentrationAlertPct: 60,
  snapshotStaleDays: 7,
  enablePayEquityTracking: true,
  enableWorkloadBalanceTracking: true,
  enableDeiTaskDistributionTracking: true,
  enableOvertimeMonitoring: true,
  alertThresholds: {
    payEquityAlertThreshold: 95,
    workloadBalanceAlertThreshold: 85,
    deiTaskDistributionAlertThreshold: 90,
    overtimeAlertThreshold: 4,
  },
}

export type SeniorityTier = 1 | 2 | 3

export type TaskRef = {
  id: number
  title: string
  status: string
  priority: string
  storyPoints: number
  dueDate: string | null
}

export type MemberLoad = {
  userId: number
  name: string
  avatar: string | null
  role: string
  jobTitle: string | null
  department: string | null
  seniorityTier: SeniorityTier
  seniorityLabel: string
  openTasks: number
  openPoints: number
  urgentPoints: number
  highPriorityPoints: number
  doneTasks: number
  donePoints: number
  sharePct: number
  expectedSharePct: number
  highPrioritySharePct: number
  workloadRatio: number | null
  overloaded: boolean
  underloaded: boolean
  latestOvertimeHours: number | null
  latestWellbeing: number | null
  latestStress: number | null
  latestMood: string | null
  latestWorkloadLabel: string | null
  lastWellbeingDate: string | null
  openTaskRefs: TaskRef[]
}

export type EthicsScores = {
  workloadBalance: number | null
  deiTaskDistribution: number | null
  payEquity: number | null
  overtimeCompliance: number | null
  composite: number | null
}

export type EthicsAlert = {
  key: string
  label: string
  score: number | null
  threshold: number
  breached: boolean
  detail: string
}

export type ChecklistItem = {
  id: string
  label: string
  requirement: string
  passed: boolean | null
  detail: string
}

export type LiveMetrics = {
  computedAt: string
  memberCount: number
  openTaskCount: number
  totalOpenPoints: number
  totalHighPriorityPoints: number
  meanOpenPoints: number
  medianOpenPoints: number
  scores: EthicsScores
  members: MemberLoad[]
  alerts: EthicsAlert[]
  checklist: ChecklistItem[]
  wellbeingCoveragePct: number
  lastSnapshotDate: string | null
  snapshotStale: boolean
  unmeasurable: string[]
}

export type RecommendationActionType = "reassign_tasks" | "advisory" | "record_snapshot"

export type Recommendation = {
  id: string
  title: string
  description: string
  kind: "rebalance" | "priority_fairness" | "overtime" | "load_equity" | "stale_snapshot"
  severity: "critical" | "warning" | "suggestion"
  status: "pending" | "applied" | "dismissed"
  appliedAt: string | null
  summary: string | null
  subjectUserId: number | null
  subjectName: string | null
  impact: string
  action: {
    type: RecommendationActionType
    taskIds: number[]
    fromUserId: number | null
    toUserId: number | null
    pointsToMove: number
  }
}

export type SnapshotRow = {
  id: number
  date: string
  payEquityScore: number
  workloadBalanceScore: number
  deiTaskDistributionScore: number
  overtimeCompliance: number
  compositeScore: number
  label: string | null
  note: string | null
  source: "recorded" | "edited" | "seed"
  createdAt: string | null
}

export type SnapshotMeta = {
  label?: string
  note?: string
  source?: "recorded" | "edited" | "seed"
}

export type RecommendationState = {
  status: "applied" | "dismissed"
  appliedAt: string
  summary?: string | null
}

export type EthicsMeta = {
  config?: Partial<EthicsConfig> & { alertThresholds?: Partial<EthicsAlertThresholds> }
  snapshots?: Record<string, SnapshotMeta>
  recommendations?: Record<string, RecommendationState>
}

export const FORMULAS = {
  workloadBalance:
    "100 x (1 - min(1, coefficientOfVariation(open story points per member) / dispersion ceiling)). 100 = identical load, 0 = load spread wider than the ceiling.",
  deiTaskDistribution:
    "Same dispersion formula applied to urgent + high priority open story points per member, i.e. who gets the high-visibility work.",
  payEquity:
    "Structural proxy: 100 x (1 - total variation distance) between each member's share of open points and the share expected from their seniority band (job title + role). The schema has no salary column, so this is a load-equity proxy, not a pay-ratio audit.",
  overtimeCompliance:
    "Share of members whose most recent wellbeing check-in logs overtime hours at or below the configured weekly limit.",
  composite: "Weighted mean (workload .30, DEI .25, pay-equity proxy .25, overtime .20) renormalised over the measurable scores.",
} as const

/* -------------------------------------------------------------- utilities */

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function meanOf(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdevOf(values: number[]): number {
  if (values.length === 0) return 0
  const m = meanOf(values)
  return Math.sqrt(meanOf(values.map((v) => (v - m) ** 2)))
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Dispersion -> 0..100 score. Returns null when it cannot be measured. */
function dispersionScore(values: number[], ceiling: number): number | null {
  if (values.length < 2) return null
  const m = meanOf(values)
  if (m <= 0) return null
  const cv = stdevOf(values) / m
  return clampScore(100 * (1 - Math.min(1, cv / Math.max(0.1, ceiling))))
}

/** Day key from whatever the driver hands back (string | Date | null). */
export function dayKey(value: unknown): string | null {
  if (!value) return null
  const s = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function isoOf(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const SENIORITY_LABEL: Record<SeniorityTier, string> = {
  1: "Junior / individual contributor",
  2: "Mid-level",
  3: "Senior / lead / manager",
}

const SENIORITY_WEIGHT: Record<SeniorityTier, number> = { 1: 1, 2: 1.5, 3: 2 }

/** jobTitle + role -> seniority band. Honest heuristic, surfaced in the UI. */
export function seniorityTierOf(jobTitle: string | null, role: string | null): SeniorityTier {
  const text = `${jobTitle ?? ""} ${role ?? ""}`.toLowerCase()
  if (/(principal|staff|architect|director|head of|vp|lead|manager|scrum master|chief)/.test(text)) return 3
  if (/(intern|junior|graduate|assistant|apprentice|trainee)/.test(text)) return 1
  return 2
}

export function compositeOf(scores: Pick<EthicsScores, "workloadBalance" | "deiTaskDistribution" | "payEquity" | "overtimeCompliance">): number | null {
  const parts: { value: number | null; weight: number }[] = [
    { value: scores.workloadBalance, weight: 0.3 },
    { value: scores.deiTaskDistribution, weight: 0.25 },
    { value: scores.payEquity, weight: 0.25 },
    { value: scores.overtimeCompliance, weight: 0.2 },
  ]
  const usable = parts.filter((p) => p.value !== null)
  if (usable.length === 0) return null
  const weightSum = usable.reduce((a, p) => a + p.weight, 0)
  return clampScore(usable.reduce((a, p) => a + (p.value as number) * p.weight, 0) / weightSum)
}

/* -------------------------------------------------------------- meta store */

export async function readEthicsMeta(userId: number): Promise<EthicsMeta> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const prefs = (rows[0]?.preferences ?? {}) as Record<string, unknown>
  const raw = prefs[PREF_NAMESPACE]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return raw as EthicsMeta
}

export async function writeEthicsMeta(userId: number, patch: Partial<EthicsMeta>): Promise<EthicsMeta> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const prefs = (rows[0]?.preferences ?? {}) as Record<string, unknown>
  const next = { ...prefs, [PREF_NAMESPACE]: { ...(prefs[PREF_NAMESPACE] as EthicsMeta | undefined), ...patch } }
  await db
    .update(users)
    .set({ preferences: next, updatedAt: new Date() })
    .where(eq(users.id, userId))
  return next[PREF_NAMESPACE] as EthicsMeta
}

export function mergeConfig(stored: Partial<EthicsConfig> & { alertThresholds?: Partial<EthicsAlertThresholds> } | undefined): EthicsConfig {
  if (!stored) return { ...DEFAULT_CONFIG, alertThresholds: { ...DEFAULT_CONFIG.alertThresholds } }
  const num = (v: unknown, fallback: number) => {
    const n = toNumberOrNull(v)
    return n === null ? fallback : n
  }
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback)
  return {
    maxOvertimeHours: num(stored.maxOvertimeHours, DEFAULT_CONFIG.maxOvertimeHours),
    overloadRatio: num(stored.overloadRatio, DEFAULT_CONFIG.overloadRatio),
    dispersionCeiling: num(stored.dispersionCeiling, DEFAULT_CONFIG.dispersionCeiling),
    priorityConcentrationAlertPct: num(
      stored.priorityConcentrationAlertPct,
      DEFAULT_CONFIG.priorityConcentrationAlertPct,
    ),
    snapshotStaleDays: num(stored.snapshotStaleDays, DEFAULT_CONFIG.snapshotStaleDays),
    enablePayEquityTracking: bool(stored.enablePayEquityTracking, true),
    enableWorkloadBalanceTracking: bool(stored.enableWorkloadBalanceTracking, true),
    enableDeiTaskDistributionTracking: bool(stored.enableDeiTaskDistributionTracking, true),
    enableOvertimeMonitoring: bool(stored.enableOvertimeMonitoring, true),
    alertThresholds: {
      payEquityAlertThreshold: num(stored.alertThresholds?.payEquityAlertThreshold, DEFAULT_CONFIG.alertThresholds.payEquityAlertThreshold),
      workloadBalanceAlertThreshold: num(stored.alertThresholds?.workloadBalanceAlertThreshold, DEFAULT_CONFIG.alertThresholds.workloadBalanceAlertThreshold),
      deiTaskDistributionAlertThreshold: num(stored.alertThresholds?.deiTaskDistributionAlertThreshold, DEFAULT_CONFIG.alertThresholds.deiTaskDistributionAlertThreshold),
      overtimeAlertThreshold: num(stored.alertThresholds?.overtimeAlertThreshold, DEFAULT_CONFIG.alertThresholds.overtimeAlertThreshold),
    },
  }
}

export async function loadConfig(userId: number): Promise<EthicsConfig> {
  const meta = await readEthicsMeta(userId)
  return mergeConfig(meta.config)
}

/* ------------------------------------------------------------- data reads */

type TaskRecord = {
  id: number
  title: string
  status: string
  priority: string
  storyPoints: number
  assigneeId: number | null
  dueDate: string | null
}

export async function fetchTaskRecords(): Promise<TaskRecord[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      storyPoints: tasks.storyPoints,
      assigneeId: tasks.assigneeId,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    storyPoints: r.storyPoints ?? 0,
    assigneeId: r.assigneeId ?? null,
    dueDate: dayKey(r.dueDate),
  }))
}

type WellbeingRecord = {
  userId: number
  date: string
  overtimeHours: number | null
  stressLevel: number | null
  wellbeingScore: number | null
  mood: string | null
  workload: string | null
}

export async function fetchWellbeingRecords(days = 45): Promise<WellbeingRecord[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  const rows = await db
    .select({
      userId: wellbeingMetrics.userId,
      date: wellbeingMetrics.date,
      overtimeHours: wellbeingMetrics.overtimeHours,
      stressLevel: wellbeingMetrics.stressLevel,
      wellbeingScore: wellbeingMetrics.wellbeingScore,
      mood: wellbeingMetrics.mood,
      workload: wellbeingMetrics.workload,
    })
    .from(wellbeingMetrics)
    .where(gte(wellbeingMetrics.date, since))
    .orderBy(desc(wellbeingMetrics.date))
  return rows.map((r) => ({
    userId: r.userId,
    date: dayKey(r.date) ?? "",
    overtimeHours: toNumberOrNull(r.overtimeHours),
    stressLevel: toNumberOrNull(r.stressLevel),
    wellbeingScore: toNumberOrNull(r.wellbeingScore),
    mood: r.mood ?? null,
    workload: r.workload ?? null,
  }))
}

export async function fetchTeamMembers(): Promise<
  { id: number; name: string; avatar: string | null; role: string; jobTitle: string | null; department: string | null }[]
> {
  return db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      jobTitle: users.jobTitle,
      department: users.department,
    })
    .from(users)
}

/* ------------------------------------------------------------- computation */

export async function computeLive(config: EthicsConfig): Promise<LiveMetrics> {
  const [memberRows, taskRows, wellbeingRows, snapshotRows] = await Promise.all([
    fetchTeamMembers(),
    fetchTaskRecords(),
    fetchWellbeingRecords(),
    db
      .select({ date: ethicalMetrics.date })
      .from(ethicalMetrics)
      .orderBy(desc(ethicalMetrics.date))
      .limit(1),
  ])

  const assignedUserIds = new Set(taskRows.filter((t) => t.assigneeId !== null).map((t) => t.assigneeId as number))
  const wellbeingUserIds = new Set(wellbeingRows.map((w) => w.userId))
  const tracked = memberRows.filter(
    (m) => assignedUserIds.has(m.id) || wellbeingUserIds.has(m.id) || m.role === "manager" || m.role === "admin",
  )
  const pool = tracked.length > 0 ? tracked : memberRows

  const isOpen = (t: TaskRecord) => t.status !== "done"
  const latestWellbeing = new Map<number, WellbeingRecord>()
  for (const w of wellbeingRows) {
    if (!latestWellbeing.has(w.userId)) latestWellbeing.set(w.userId, w)
  }

  const members: MemberLoad[] = pool.map((m) => {
    const own = taskRows.filter((t) => t.assigneeId === m.id)
    const open = own.filter(isOpen)
    const done = own.filter((t) => !isOpen(t))
    const openPoints = open.reduce((a, t) => a + t.storyPoints, 0)
    const urgentPoints = open.filter((t) => t.priority === "urgent").reduce((a, t) => a + t.storyPoints, 0)
    const highPriorityPoints = open
      .filter((t) => t.priority === "urgent" || t.priority === "high")
      .reduce((a, t) => a + t.storyPoints, 0)
    const tier = seniorityTierOf(m.jobTitle, m.role)
    const w = latestWellbeing.get(m.id)
    return {
      userId: m.id,
      name: m.name,
      avatar: m.avatar,
      role: m.role,
      jobTitle: m.jobTitle,
      department: m.department,
      seniorityTier: tier,
      seniorityLabel: SENIORITY_LABEL[tier],
      openTasks: open.length,
      openPoints,
      urgentPoints,
      highPriorityPoints,
      doneTasks: done.length,
      donePoints: done.reduce((a, t) => a + t.storyPoints, 0),
      sharePct: 0,
      expectedSharePct: 0,
      highPrioritySharePct: 0,
      workloadRatio: null,
      overloaded: false,
      underloaded: false,
      latestOvertimeHours: w?.overtimeHours ?? null,
      latestWellbeing: w?.wellbeingScore ?? null,
      latestStress: w?.stressLevel ?? null,
      latestMood: w?.mood ?? null,
      latestWorkloadLabel: w?.workload ?? null,
      lastWellbeingDate: w?.date ?? null,
      openTaskRefs: open
        .slice()
        .sort((a, b) => b.storyPoints - a.storyPoints)
        .slice(0, 12)
        .map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, storyPoints: t.storyPoints, dueDate: t.dueDate })),
    }
  })

  const totalOpenPoints = members.reduce((a, m) => a + m.openPoints, 0)
  const totalHighPoints = members.reduce((a, m) => a + m.highPriorityPoints, 0)
  const weightSum = members.reduce((a, m) => a + SENIORITY_WEIGHT[m.seniorityTier], 0)
  const meanOpenPoints = meanOf(members.map((m) => m.openPoints))

  for (const m of members) {
    m.sharePct = totalOpenPoints > 0 ? (m.openPoints / totalOpenPoints) * 100 : 0
    m.expectedSharePct = weightSum > 0 ? (SENIORITY_WEIGHT[m.seniorityTier] / weightSum) * 100 : 0
    m.highPrioritySharePct = totalHighPoints > 0 ? (m.highPriorityPoints / totalHighPoints) * 100 : 0
    m.workloadRatio = meanOpenPoints > 0 ? m.openPoints / meanOpenPoints : null
    m.overloaded = meanOpenPoints > 0 && m.openPoints > config.overloadRatio * meanOpenPoints
    m.underloaded = meanOpenPoints > 0 && m.openPoints < meanOpenPoints * 0.7
  }

  const openPointSeries = members.map((m) => m.openPoints)
  const highPointSeries = members.map((m) => m.highPriorityPoints)

  const workloadBalance = config.enableWorkloadBalanceTracking ? dispersionScore(openPointSeries, config.dispersionCeiling) : null
  const deiTaskDistribution = config.enableDeiTaskDistributionTracking
    ? dispersionScore(highPointSeries, config.dispersionCeiling)
    : null

  let payEquity: number | null = null
  if (config.enablePayEquityTracking && members.length >= 2 && totalOpenPoints > 0 && weightSum > 0) {
    const tvd =
      0.5 *
      members.reduce(
        (a, m) => a + Math.abs(m.openPoints / totalOpenPoints - SENIORITY_WEIGHT[m.seniorityTier] / weightSum),
        0,
      )
    payEquity = clampScore(100 * (1 - Math.min(1, tvd)))
  }

  const measured = config.enableOvertimeMonitoring ? members.filter((m) => m.latestOvertimeHours !== null) : []
  const overtimeCompliance =
    config.enableOvertimeMonitoring && measured.length > 0
      ? clampScore(
          (measured.filter((m) => (m.latestOvertimeHours as number) <= config.maxOvertimeHours).length /
            measured.length) *
            100,
        )
      : null

  const scores: EthicsScores = {
    workloadBalance,
    deiTaskDistribution,
    payEquity,
    overtimeCompliance,
    composite: compositeOf({ workloadBalance, deiTaskDistribution, payEquity, overtimeCompliance }),
  }

  const unmeasurable: string[] = []
  if (workloadBalance === null) unmeasurable.push("Workload balance (needs >= 2 members with logged story points)")
  if (deiTaskDistribution === null) unmeasurable.push("DEI distribution (no urgent/high open story points to spread)")
  if (payEquity === null) unmeasurable.push("Pay-equity proxy (no open points to allocate across bands)")
  if (overtimeCompliance === null) unmeasurable.push("Overtime compliance (no wellbeing check-ins in the last 45 days)")

  const lastSnapshotDate = dayKey(snapshotRows[0]?.date) ?? null
  const snapshotStale =
    lastSnapshotDate === null ||
    Date.now() - new Date(`${lastSnapshotDate}T00:00:00`).getTime() > config.snapshotStaleDays * 86_400_000

  const overloadedMembers = members.filter((m) => m.overloaded)
  const concentrated = members.filter((m) => m.highPrioritySharePct > config.priorityConcentrationAlertPct)
  const overLimit = measured.filter((m) => (m.latestOvertimeHours as number) > config.maxOvertimeHours)
  const earlyWarning = measured.filter(
    (m) =>
      (m.latestOvertimeHours as number) > config.alertThresholds.overtimeAlertThreshold &&
      (m.latestOvertimeHours as number) <= config.maxOvertimeHours,
  )
  const highStress = members.filter((m) => (m.latestStress ?? 0) >= 8)

  const alerts: EthicsAlert[] = [
    {
      key: "workloadBalance",
      label: "Workload balance",
      score: workloadBalance,
      threshold: config.alertThresholds.workloadBalanceAlertThreshold,
      breached: workloadBalance !== null && workloadBalance < config.alertThresholds.workloadBalanceAlertThreshold,
      detail: `${overloadedMembers.length} member(s) above ${config.overloadRatio}x the ${meanOpenPoints.toFixed(1)} pt mean`,
    },
    {
      key: "deiTaskDistribution",
      label: "DEI task distribution",
      score: deiTaskDistribution,
      threshold: config.alertThresholds.deiTaskDistributionAlertThreshold,
      breached:
        deiTaskDistribution !== null &&
        deiTaskDistribution < config.alertThresholds.deiTaskDistributionAlertThreshold,
      detail:
        concentrated.length > 0
          ? `${concentrated.length} member(s) hold >${config.priorityConcentrationAlertPct}% of urgent/high points`
          : "High-visibility work spread below the concentration alert level",
    },
    {
      key: "payEquity",
      label: "Pay-equity proxy",
      score: payEquity,
      threshold: config.alertThresholds.payEquityAlertThreshold,
      breached: payEquity !== null && payEquity < config.alertThresholds.payEquityAlertThreshold,
      detail: "Load share compared with seniority-band expectation (no salary column in schema)",
    },
    {
      key: "overtimeCompliance",
      label: "Overtime compliance",
      score: overtimeCompliance,
      threshold: config.alertThresholds.overtimeAlertThreshold,
      breached:
        overLimit.length > 0 ||
        earlyWarning.length > 0 ||
        (overtimeCompliance !== null && overtimeCompliance < config.alertThresholds.overtimeAlertThreshold),
      detail:
        overLimit.length > 0
          ? `${overLimit.length} member(s) over the ${config.maxOvertimeHours}h weekly limit`
          : `${measured.length} check-in(s) measured · limit ${config.maxOvertimeHours}h`,
    },
  ]

  const wellbeingCovered = members.filter((m) => m.latestOvertimeHours !== null).length
  const wellbeingCoveragePct = members.length > 0 ? Math.round((wellbeingCovered / members.length) * 100) : 0

  const checklist: ChecklistItem[] = [
    {
      id: "data_coverage",
      label: "Every tracked member reports",
      requirement: `Latest wellbeing check-in exists for 100% of the ${members.length} tracked members`,
      passed: members.length > 0 && wellbeingCovered === members.length,
      detail: `${wellbeingCovered}/${members.length} members have a check-in in the last 45 days (${wellbeingCoveragePct}%)`,
    },
    {
      id: "no_overload",
      label: "No overloaded member",
      requirement: `No member above ${config.overloadRatio}x mean open story points`,
      passed: members.length > 0 && overloadedMembers.length === 0,
      detail:
        overloadedMembers.length === 0
          ? `All members within ${config.overloadRatio}x of the ${meanOpenPoints.toFixed(1)} pt mean`
          : `${overloadedMembers.map((m) => `${m.name} (${m.openPoints} pts)`).join(", ")} exceed it`,
    },
    {
      id: "overtime_limit",
      label: "Overtime inside the limit",
      requirement: `No logged overtime above ${config.maxOvertimeHours}h/week`,
      passed: config.enableOvertimeMonitoring ? overLimit.length === 0 && measured.length > 0 : null,
      detail:
        measured.length === 0
          ? "No overtime readings in the window - not measurable"
          : overLimit.length === 0
            ? `Highest logged value ${Math.max(0, ...measured.map((m) => m.latestOvertimeHours as number)).toFixed(1)}h across ${measured.length} members`
            : `${overLimit.map((m) => `${m.name} (${(m.latestOvertimeHours as number).toFixed(1)}h)`).join(", ")} over the limit`,
    },
    {
      id: "priority_mix",
      label: "High-visibility work is shared",
      requirement: `No member holds >${config.priorityConcentrationAlertPct}% of urgent/high open points`,
      passed: totalHighPoints > 0 ? concentrated.length === 0 : null,
      detail:
        totalHighPoints === 0
          ? "No urgent/high open points in flight - not measurable"
          : `Top holder ${Math.max(0, ...members.map((m) => m.highPrioritySharePct)).toFixed(0)}% of ${totalHighPoints} pts`,
    },
    {
      id: "band_alignment",
      label: "Load matches seniority band",
      requirement: `Pay-equity proxy at or above ${config.alertThresholds.payEquityAlertThreshold}`,
      passed: payEquity === null ? null : payEquity >= config.alertThresholds.payEquityAlertThreshold,
      detail: payEquity === null ? "Not measurable without open points to allocate" : `Proxy score ${payEquity}/100`,
    },
    {
      id: "snapshot_cadence",
      label: "Snapshot cadence",
      requirement: `A metrics snapshot recorded within ${config.snapshotStaleDays} days`,
      passed: !snapshotStale,
      detail: lastSnapshotDate ? `Last recorded ${lastSnapshotDate}` : "No snapshots recorded yet",
    },
    {
      id: "stress_watch",
      label: "No unreported strain",
      requirement: "No member logging stress level 8/10 or higher",
      passed: measured.length > 0 ? highStress.length === 0 : null,
      detail:
        highStress.length === 0
          ? "All check-ins below the stress threshold"
          : `${highStress.map((m) => `${m.name} (${m.latestStress}/10)`).join(", ")} at or above 8/10`,
    },
    {
      id: "score_alerts",
      label: "All scores above alert thresholds",
      requirement: "Workload, DEI and pay-equity scores at or above their configured floors",
      passed: alerts.filter((a) => a.score !== null).length > 0 && alerts.filter((a) => a.score !== null && !a.breached).length === alerts.filter((a) => a.score !== null).length,
      detail: `${alerts.filter((a) => a.breached).length} of ${alerts.length} monitored axes in alert state`,
    },
  ]

  return {
    computedAt: new Date().toISOString(),
    memberCount: members.length,
    openTaskCount: taskRows.filter(isOpen).length,
    totalOpenPoints,
    totalHighPriorityPoints: totalHighPoints,
    meanOpenPoints,
    medianOpenPoints: medianOf(openPointSeries),
    scores,
    members,
    alerts,
    checklist,
    wellbeingCoveragePct,
    lastSnapshotDate,
    snapshotStale,
    unmeasurable,
  }
}

/* ---------------------------------------------------------- recommendations */

const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, urgent: 3 }

/** Move the lowest-priority tasks that cover `pointsNeeded` (max 3 tasks). */
function pickTasksToMove(refs: TaskRef[], pointsNeeded: number): TaskRef[] {
  const sorted = [...refs].sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) || a.storyPoints - b.storyPoints,
  )
  const chosen: TaskRef[] = []
  let points = 0
  for (const t of sorted) {
    if (points >= pointsNeeded) break
    chosen.push(t)
    points += t.storyPoints
    if (chosen.length >= 3) break
  }
  return chosen
}

export function buildRecommendations(live: LiveMetrics, meta: EthicsMeta, config: EthicsConfig): Recommendation[] {
  const states = meta.recommendations ?? {}
  const byId = (id: string): { status: "pending" | "applied" | "dismissed"; appliedAt: string | null; summary: string | null } => {
    const s = states[id]
    return s ? { status: s.status, appliedAt: s.appliedAt, summary: s.summary ?? null } : { status: "pending", appliedAt: null, summary: null }
  }
  const recs: Recommendation[] = []

  const overloaded = live.members
    .filter((m) => m.overloaded)
    .sort((a, b) => (b.workloadRatio ?? 0) - (a.workloadRatio ?? 0))
  const capacity = live.members
    .filter((m) => !m.overloaded && m.openPoints <= live.meanOpenPoints)
    .sort((a, b) => a.openPoints - b.openPoints)

  for (const m of overloaded) {
    const excess = m.openPoints - live.meanOpenPoints
    const pointsNeeded = Math.max(1, Math.round(excess))
    const movees = pickTasksToMove(m.openTaskRefs, pointsNeeded)
    if (movees.length === 0) continue
    const target = capacity.find((c) => c.userId !== m.userId) ?? null
    const id = `rebalance-${m.userId}`
    const movedPoints = movees.reduce((a, t) => a + t.storyPoints, 0)
    recs.push({
      id,
      title: target ? `Rebalance ${m.name}'s queue` : `Trim ${m.name}'s queue`,
      description: target
        ? `${m.name} carries ${m.openPoints} open points (${(m.workloadRatio ?? 0).toFixed(2)}x the ${live.meanOpenPoints.toFixed(1)} pt team mean). Move ${movees.length} task(s) worth ${movedPoints} pts to ${target.name} (${target.openPoints} open pts) to bring both closer to the mean.`
        : `${m.name} carries ${m.openPoints} open points (${(m.workloadRatio ?? 0).toFixed(2)}x the team mean) and no member currently sits below the mean, so the surplus needs a scope cut rather than a reassignment.`,
      kind: "rebalance",
      severity: (m.workloadRatio ?? 0) >= config.overloadRatio * 1.4 ? "critical" : "warning",
      status: byId(id).status,
      appliedAt: byId(id).appliedAt,
      summary: byId(id).summary,
      subjectUserId: m.userId,
      subjectName: m.name,
      impact: target
        ? `-${movedPoints} pts from ${m.name}, +${movedPoints} pts for ${target.name}`
        : `${movedPoints} pts flagged for scope review`,
      action: {
        type: "reassign_tasks",
        taskIds: movees.map((t) => t.id),
        fromUserId: m.userId,
        toUserId: target?.userId ?? null,
        pointsToMove: movedPoints,
      },
    })
  }

  const concentrated = live.members.filter((m) => m.highPrioritySharePct > config.priorityConcentrationAlertPct && m.highPriorityPoints > 0)
  const starved = live.members.filter((m) => m.highPriorityPoints === 0 && m.openPoints > 0)
  for (const m of concentrated) {
    const id = `priority-${m.userId}`
    const donorTasks = m.openTaskRefs.filter((t) => t.priority === "urgent" || t.priority === "high")
    const candidate = donorTasks.find((t) => t.priority === "high") ?? donorTasks[0] ?? null
    const target = starved.sort((a, b) => b.openPoints - a.openPoints)[0] ?? null
    recs.push({
      id,
      title: `Spread high-visibility work away from ${m.name}`,
      description: `${m.name} holds ${m.highPrioritySharePct.toFixed(0)}% of the team's urgent/high open story points${target ? ` while ${target.name} has none in flight` : ""}. Rotating one priority item gives another member the same exposure.`,
      kind: "priority_fairness",
      severity: "warning",
      status: byId(id).status,
      appliedAt: byId(id).appliedAt,
      summary: byId(id).summary,
      subjectUserId: m.userId,
      subjectName: m.name,
      impact: candidate && target ? `"${candidate.title}" (${candidate.storyPoints} pts) -> ${target.name}` : "review only",
      action:
        candidate && target
          ? {
              type: "reassign_tasks",
              taskIds: [candidate.id],
              fromUserId: m.userId,
              toUserId: target.userId,
              pointsToMove: candidate.storyPoints,
            }
          : { type: "advisory", taskIds: [], fromUserId: m.userId, toUserId: null, pointsToMove: 0 },
    })
  }

  const overLimit = live.members.filter(
    (m) => m.latestOvertimeHours !== null && m.latestOvertimeHours > config.maxOvertimeHours,
  )
  if (overLimit.length > 0) {
    const id = `overtime-${overLimit.map((m) => m.userId).join("-")}`
    recs.push({
      id,
      title: `Overtime breach for ${overLimit.length} member(s)`,
      description: `Last check-in logged ${overLimit.map((m) => `${m.name} ${(m.latestOvertimeHours as number).toFixed(1)}h`).join(", ")} against a ${config.maxOvertimeHours}h weekly limit. Review scope with them before the next sprint.`,
      kind: "overtime",
      severity: "critical",
      status: byId(id).status,
      appliedAt: byId(id).appliedAt,
      summary: byId(id).summary,
      subjectUserId: overLimit[0].userId,
      subjectName: overLimit.map((m) => m.name).join(", "),
      impact: `${overLimit.length} member(s) above limit`,
      action: { type: "advisory", taskIds: [], fromUserId: overLimit[0].userId, toUserId: null, pointsToMove: 0 },
    })
  }

  const mismatched = live.members.filter(
    (m) => m.openPoints > 0 && m.seniorityTier === 1 && m.sharePct - m.expectedSharePct > 15,
  )
  for (const m of mismatched) {
    const id = `equity-${m.userId}`
    recs.push({
      id,
      title: `Band-load outlier: ${m.name}`,
      description: `${m.name} sits in the "${m.seniorityLabel.toLowerCase()}" band yet carries ${m.sharePct.toFixed(0)}% of open points against a ${m.expectedSharePct.toFixed(0)}% band expectation. Confirm scope ownership and review compensation banding - the schema stores no salary, so this is the structural proxy.`,
      kind: "load_equity",
      severity: "warning",
      status: byId(id).status,
      appliedAt: byId(id).appliedAt,
      summary: byId(id).summary,
      subjectUserId: m.userId,
      subjectName: m.name,
      impact: `${(m.sharePct - m.expectedSharePct).toFixed(0)} pts-% above band expectation`,
      action: { type: "advisory", taskIds: [], fromUserId: m.userId, toUserId: null, pointsToMove: 0 },
    })
  }

  if (live.snapshotStale) {
    const id = "stale-snapshot"
    recs.push({
      id,
      title: "Record an ethical metrics snapshot",
      description: live.lastSnapshotDate
        ? `The last snapshot was recorded on ${live.lastSnapshotDate}, older than the ${config.snapshotStaleDays}-day cadence. Recording today keeps the trend chart and week-over-week deltas honest.`
        : `No snapshot has been recorded yet, so trend and deltas have nothing to compare against. Recording today starts the history.`,
      kind: "stale_snapshot",
      severity: "suggestion",
      status: byId(id).status,
      appliedAt: byId(id).appliedAt,
      summary: byId(id).summary,
      subjectUserId: null,
      subjectName: null,
      impact: "writes one ethical_metrics row",
      action: { type: "record_snapshot", taskIds: [], fromUserId: null, toUserId: null, pointsToMove: 0 },
    })
  }

  const order: Record<Recommendation["severity"], number> = { critical: 0, warning: 1, suggestion: 2 }
  return recs.sort(
    (a, b) =>
      (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) ||
      order[a.severity] - order[b.severity] ||
      b.action.pointsToMove - a.action.pointsToMove,
  )
}

/* ------------------------------------------------------------- snapshots */

export type EthicalMetricsRowRecord = {
  id: number
  date: unknown
  payEquityScore: number
  workloadBalanceScore: number
  deiTaskDistributionScore: number
  overtimeCompliance: number
  createdAt: unknown
}

export function serializeSnapshot(row: EthicalMetricsRowRecord, meta: EthicsMeta): SnapshotRow {
  const m = (meta.snapshots ?? {})[String(row.id)] ?? {}
  return {
    id: row.id,
    date: dayKey(row.date) ?? "",
    payEquityScore: row.payEquityScore,
    workloadBalanceScore: row.workloadBalanceScore,
    deiTaskDistributionScore: row.deiTaskDistributionScore,
    overtimeCompliance: row.overtimeCompliance,
    compositeScore:
      compositeOf({
        workloadBalance: row.workloadBalanceScore,
        deiTaskDistribution: row.deiTaskDistributionScore,
        payEquity: row.payEquityScore,
        overtimeCompliance: row.overtimeCompliance,
      }) ?? 0,
    label: m.label ?? null,
    note: m.note ?? null,
    source: m.source ?? "seed",
    createdAt: isoOf(row.createdAt),
  }
}

export async function listSnapshots(userId: number, limit = 12): Promise<SnapshotRow[]> {
  const rows = await db
    .select({
      id: ethicalMetrics.id,
      date: ethicalMetrics.date,
      payEquityScore: ethicalMetrics.payEquityScore,
      workloadBalanceScore: ethicalMetrics.workloadBalanceScore,
      deiTaskDistributionScore: ethicalMetrics.deiTaskDistributionScore,
      overtimeCompliance: ethicalMetrics.overtimeCompliance,
      createdAt: ethicalMetrics.createdAt,
    })
    .from(ethicalMetrics)
    .orderBy(desc(ethicalMetrics.date), desc(ethicalMetrics.id))
    .limit(Math.max(1, Math.min(limit, 60)))
  const meta = await readEthicsMeta(userId)
  return rows.map((r) => serializeSnapshot(r, meta))
}

export async function getSnapshotById(userId: number, id: number): Promise<SnapshotRow | null> {
  const [row, meta] = await Promise.all([
    db
      .select({
        id: ethicalMetrics.id,
        date: ethicalMetrics.date,
        payEquityScore: ethicalMetrics.payEquityScore,
        workloadBalanceScore: ethicalMetrics.workloadBalanceScore,
        deiTaskDistributionScore: ethicalMetrics.deiTaskDistributionScore,
        overtimeCompliance: ethicalMetrics.overtimeCompliance,
        createdAt: ethicalMetrics.createdAt,
      })
      .from(ethicalMetrics)
      .where(eq(ethicalMetrics.id, id))
      .limit(1),
    readEthicsMeta(userId),
  ])
  return row[0] ? serializeSnapshot(row[0], meta) : null
}

export async function recordSnapshot(opts: {
  userId: number
  date?: string | null
  label?: string | null
  note?: string | null
  scores?: Partial<EthicsScores> | null
  source?: "recorded" | "edited"
}): Promise<{ snapshot: SnapshotRow; live: LiveMetrics; config: EthicsConfig }> {
  const config = await loadConfig(opts.userId)
  const live = await computeLive(config)
  const scores = live.scores
  const resolved: Record<string, number | null> = {
    workloadBalance: opts.scores?.workloadBalance ?? scores.workloadBalance,
    deiTaskDistribution: opts.scores?.deiTaskDistribution ?? scores.deiTaskDistribution,
    payEquity: opts.scores?.payEquity ?? scores.payEquity,
    overtimeCompliance: opts.scores?.overtimeCompliance ?? scores.overtimeCompliance,
  }
  const missing = Object.entries(resolved).filter(([, v]) => v === null).map(([k]) => k)
  if (missing.length > 0) {
    throw new SnapshotUnmeasurableError(missing)
  }

  const date = opts.date ?? new Date().toISOString().slice(0, 10)
  const values = {
    date,
    payEquityScore: resolved.payEquity as number,
    workloadBalanceScore: resolved.workloadBalance as number,
    deiTaskDistributionScore: resolved.deiTaskDistribution as number,
    overtimeCompliance: resolved.overtimeCompliance as number,
  }
  const [inserted] = await db.insert(ethicalMetrics).values(values).returning()

  const meta = await readEthicsMeta(opts.userId)
  const snapshots = { ...(meta.snapshots ?? {}) }
  const label = typeof opts.label === "string" && opts.label.trim() ? opts.label.trim().slice(0, 120) : null
  const note = typeof opts.note === "string" && opts.note.trim() ? opts.note.trim().slice(0, 500) : null
  snapshots[String(inserted.id)] = { label: label ?? `Snapshot ${date}`, note: note ?? undefined, source: opts.source ?? "recorded" }
  await writeEthicsMeta(opts.userId, { snapshots })

  await createNotification({
    userId: opts.userId,
    type: "system",
    title: `Ethics snapshot recorded: ${label ?? date}`,
    body: `Workload ${values.workloadBalanceScore} · DEI ${values.deiTaskDistributionScore} · pay proxy ${values.payEquityScore} · overtime ${values.overtimeCompliance}.`,
    link: ETHICS_LINK,
    metadata: {
      action: "ethics_snapshot_created",
      snapshotId: inserted.id,
      label: label ?? `Snapshot ${date}`,
      date,
      scores: values,
      composite: compositeOf({
        workloadBalance: values.workloadBalanceScore,
        deiTaskDistribution: values.deiTaskDistributionScore,
        payEquity: values.payEquityScore,
        overtimeCompliance: values.overtimeCompliance,
      }),
    },
  })

  const snapshot = (await getSnapshotById(opts.userId, inserted.id)) as SnapshotRow
  return { snapshot, live, config }
}

export class SnapshotUnmeasurableError extends Error {
  keys: string[]
  constructor(keys: string[]) {
    super(`Not measurable from live rows: ${keys.join(", ")}`)
    this.keys = keys
  }
}

/* ---------------------------------------------------------------- handlers */

// GET /api/ethical-metrics — live computation + stored snapshots + recommendations.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get("limit") ?? "12")
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(Math.trunc(limitRaw), 60)) : 12

    const meta = await readEthicsMeta(session.id)
    const config = mergeConfig(meta.config)
    const [live, snapshots] = await Promise.all([computeLive(config), listSnapshots(session.id, limit)])
    const recommendations = buildRecommendations(live, meta, config)

    const latest = snapshots[0] ?? null

    return NextResponse.json({
      success: true,
      data: {
        live,
        snapshots,
        recommendations,
        config,
        formulas: FORMULAS,
        latest,
        session: { userId: session.id, name: session.name },
      },
      // legacy alias kept so older callers still find `metrics`
      metrics: latest
        ? {
            ...latest,
            recommendations: recommendations.map((r) => ({
              id: r.subjectUserId ?? 0,
              key: r.id,
              title: r.title,
              description: r.description,
              status: r.status,
              type: r.severity,
              createdAt: r.appliedAt ?? live.computedAt,
            })),
            complianceHistory: checklistHistory(live.checklist),
            teamWorkloadData: live.members.map((m) => ({
              userId: m.userId,
              name: m.name,
              avatar: m.avatar,
              workloadPercentage: Math.round((m.workloadRatio ?? 0) * 100),
              status: m.overloaded ? ("high" as const) : m.underloaded ? ("low" as const) : ("balanced" as const),
              overtimeHours: m.latestOvertimeHours ?? 0,
            })),
          }
        : null,
    })
  } catch (error) {
    console.error("Ethical metrics fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to build ethical metrics", error: (error as Error).message },
      { status: 500 },
    )
  }
}

function checklistHistory(items: ChecklistItem[]) {
  const now = Date.now()
  return items.map((c, i) => ({
    id: i + 1,
    title: c.label,
    description: c.detail,
    type: c.passed === false ? ("warning" as const) : ("success" as const),
    date: new Date(now - i * 86_400_000).toISOString(),
  }))
}

// POST /api/ethical-metrics — record a snapshot of today's computed scores.
// Body: { date?, label?, note?, scores?: { workloadBalance?, deiTaskDistribution?, payEquity?, overtimeCompliance? } }
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null
    if (body.date && !date) {
      return NextResponse.json({ success: false, message: "date must look like YYYY-MM-DD" }, { status: 400 })
    }
    const scoresIn = body.scores && typeof body.scores === "object" && !Array.isArray(body.scores)
      ? (body.scores as Record<string, unknown>)
      : null
    const parsedScores: Partial<EthicsScores> | null = scoresIn
      ? {
          workloadBalance: toNumberOrNull(scoresIn.workloadBalance),
          deiTaskDistribution: toNumberOrNull(scoresIn.deiTaskDistribution),
          payEquity: toNumberOrNull(scoresIn.payEquity),
          overtimeCompliance: toNumberOrNull(scoresIn.overtimeCompliance),
        }
      : null

    const { snapshot, live } = await recordSnapshot({
      userId: session.id,
      date,
      label: typeof body.label === "string" ? body.label : null,
      note: typeof body.note === "string" ? body.note : null,
      scores: parsedScores,
      source: "recorded",
    })

    return NextResponse.json(
      {
        success: true,
        message: "Ethical metrics snapshot recorded",
        data: { snapshot, snapshots: await listSnapshots(session.id, 12), live },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof SnapshotUnmeasurableError) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot record a snapshot: ${error.keys.join(", ")} are not measurable from live rows. Assign open tasks with story points first.`,
          keys: error.keys,
        },
        { status: 422 },
      )
    }
    console.error("Ethical metrics snapshot create error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to record ethical metrics snapshot", error: (error as Error).message },
      { status: 500 },
    )
  }
}
