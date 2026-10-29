// Server-only helpers for the goals routes: raw-SQL row shapes, parsing and
// serialization. All access goes through db.execute + parameterized
// `sql` templates (goals/goal_checkins are intentionally NOT in
// drizzle/schema.ts, which another agent owns).

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  computeProgress,
  daysLeft,
  suggestStatus,
  toNumber,
  GOAL_STATUSES,
  METRIC_TYPES,
  type GoalDto,
  type GoalStatus,
  type CheckinDto,
  type MetricType,
} from "./shared"

/** Raw row as returned by GOAL_COLUMNS below (numeric arrives as strings). */
export interface GoalRawRow {
  id: number
  title: string
  description: string | null
  owner_id: number
  quarter: string | null
  status: string
  start_date: string
  due_date: string | null
  metric_type: string
  baseline: string | number | null
  target: string | number
  current: string | number
  parent_id: number | null
  created_by: number
  created_at: string
  updated_at: string
  owner_name: string
  owner_avatar: string | null
  creator_name: string
  checkin_count: number
  child_count: number
}

/**
 * Shared projection: dates/timestamps cast to stable text so the client
 * always receives ISO strings (postgres-js hands raw DATE/TIMESTAMPTZ objects
 * through otherwise, and NUMERIC values are strings by design).
 */
export const GOAL_PROJECTION = sql`
  g.id, g.title, g.description, g.owner_id, g.quarter, g.status,
  to_char(g.start_date, 'YYYY-MM-DD') AS start_date,
  to_char(g.due_date, 'YYYY-MM-DD') AS due_date,
  g.metric_type, g.baseline, g.target, g.current, g.parent_id, g.created_by,
  to_char(g.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(g.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
  o.name AS owner_name, o.avatar AS owner_avatar,
  c.name AS creator_name,
  (SELECT count(*)::int FROM goal_checkins kc WHERE kc.goal_id = g.id) AS checkin_count,
  (SELECT count(*)::int FROM goals ch WHERE ch.parent_id = g.id) AS child_count
`

export const GOAL_FROM = sql`
  FROM goals g
  JOIN users o ON o.id = g.owner_id
  JOIN users c ON c.id = g.created_by
`

export function isGoalStatus(v: unknown): v is GoalStatus {
  return typeof v === "string" && (GOAL_STATUSES as readonly string[]).includes(v)
}

export function isMetricType(v: unknown): v is MetricType {
  return typeof v === "string" && (METRIC_TYPES as readonly string[]).includes(v)
}

export function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

export function serializeGoalRow(row: GoalRawRow): GoalDto {
  const metric = {
    metricType: (isMetricType(row.metric_type) ? row.metric_type : "percent") as MetricType,
    baseline: row.baseline === null ? null : toNumber(row.baseline, 0),
    target: toNumber(row.target, 0),
    current: toNumber(row.current, 0),
  }
  const dates = { startDate: row.start_date, dueDate: row.due_date }
  const status: GoalStatus = isGoalStatus(row.status) ? row.status : "on_track"
  const { progressPct, formula } = computeProgress(metric)
  const left = daysLeft(dates.dueDate)
  return {
    ...metric,
    ...dates,
    id: row.id,
    title: row.title,
    description: row.description,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerAvatar: row.owner_avatar,
    createdBy: row.created_by,
    creatorName: row.creator_name,
    quarter: row.quarter,
    status,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkinCount: row.checkin_count,
    childCount: row.child_count,
    progressPct,
    progressFormula: formula,
    suggestedStatus: suggestStatus({ ...metric, ...dates }, status, progressPct),
    daysLeft: left,
    overdue: left !== null && left < 0 && status !== "achieved" && status !== "archived",
  }
}

/**
 * `mine` is the read a member-facing page uses: goals you own or drafted. A
 * brand-new account then opens on an empty OKR workspace instead of the rows
 * someone else created. `team` is the deliberate aggregate view.
 */
export type GoalScope = "mine" | "team"

export function goalVisibility(userId: number, scope: GoalScope) {
  return scope === "team" ? sql`` : sql`WHERE (g.owner_id = ${userId} OR g.created_by = ${userId})`
}

export async function fetchGoals(userId: number, scope: GoalScope = "mine"): Promise<GoalDto[]> {
  const rows = (await db.execute(sql`
    SELECT ${GOAL_PROJECTION}
    ${GOAL_FROM}
    ${goalVisibility(userId, scope)}
    ORDER BY g.updated_at DESC
  `)) as unknown as GoalRawRow[]
  return rows.map(serializeGoalRow)
}

export async function fetchGoalById(id: number): Promise<GoalDto | null> {
  const rows = (await db.execute(sql`
    SELECT ${GOAL_PROJECTION}
    ${GOAL_FROM}
    WHERE g.id = ${id}
    LIMIT 1
  `)) as unknown as GoalRawRow[]
  return rows[0] ? serializeGoalRow(rows[0]) : null
}

interface CheckinRawRow {
  id: number
  goal_id: number
  goal_title: string
  value: string | number
  note: string | null
  author_id: number
  author_name: string
  author_avatar: string | null
  created_at: string
}

export const CHECKIN_PROJECTION = sql`
  k.id, k.goal_id, g.title AS goal_title, k.value, k.note,
  k.author_id, a.name AS author_name, a.avatar AS author_avatar,
  to_char(k.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
`

export function serializeCheckin(row: CheckinRawRow): CheckinDto {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalTitle: row.goal_title,
    value: toNumber(row.value, 0),
    note: row.note,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    createdAt: row.created_at,
  }
}

/**
 * The feed reads the same visibility as the list — `goalVisibility` only names
 * the `g` alias, which both queries join — so a member's activity rail can only
 * ever mention goals they can already see.
 */
export async function fetchCheckins(
  userId: number,
  scope: GoalScope = "mine",
  limit = 1000,
): Promise<CheckinDto[]> {
  const rows = (await db.execute(sql`
    SELECT ${CHECKIN_PROJECTION}
    FROM goal_checkins k
    JOIN users a ON a.id = k.author_id
    JOIN goals g ON g.id = k.goal_id
    ${goalVisibility(userId, scope)}
    ORDER BY k.created_at ASC, k.id ASC
    LIMIT ${limit}
  `)) as unknown as CheckinRawRow[]
  return rows.map(serializeCheckin)
}

export async function fetchCheckinsForGoal(goalId: number): Promise<CheckinDto[]> {
  const rows = (await db.execute(sql`
    SELECT ${CHECKIN_PROJECTION}
    FROM goal_checkins k
    JOIN users a ON a.id = k.author_id
    JOIN goals g ON g.id = k.goal_id
    WHERE k.goal_id = ${goalId}
    ORDER BY k.created_at ASC, k.id ASC
  `)) as unknown as CheckinRawRow[]
  return rows.map(serializeCheckin)
}

/** Guarded param parse for {id} segments. */
export async function parseIdParam(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params
  const n = Number.parseInt(id, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * True when `parentId` would create a cycle for goal `id` (self-parent or an
 * ancestor chain that loops back). Goals are few; walking up is cheap.
 */
export async function wouldCycle(id: number, parentId: number): Promise<boolean> {
  if (id === parentId) return true
  let cursor: number | null = parentId
  const seen = new Set<number>()
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor)
    if (cursor === id) return true
    const rows = (await db.execute(sql`
      SELECT parent_id FROM goals WHERE id = ${cursor}
    `)) as unknown as { parent_id: number | null }[]
    cursor = rows[0]?.parent_id ?? null
  }
  return false
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export function serverError(err: unknown, what: string): NextResponse {
  const message = err instanceof Error ? err.message : "Unknown error"
  return NextResponse.json({ success: false, message: `Failed to ${what}: ${message}` }, { status: 500 })
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ success: false, message }, { status: 400 })
}
