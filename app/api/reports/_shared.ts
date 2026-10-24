// Shared server-only helpers for the reports workspace: dataset registry,
// deterministic SQL aggregations, cadence math and response helpers.
// report_schedules / report_runs are raw-SQL tables (scripts/create-reports-tables.mjs),
// intentionally NOT in drizzle/schema.ts.

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

export const DATASETS = {
  tasks: {
    label: "Tasks",
    groupBys: [
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "assignee", label: "Assignee" },
      { key: "sprint", label: "Sprint" },
    ],
    valueLabel: "tasks",
  },
  sprints: {
    label: "Sprints",
    groupBys: [{ key: "status", label: "Status" }],
    valueLabel: "sprints",
  },
  team: {
    label: "Team workload",
    groupBys: [
      { key: "assignee", label: "Member" },
      { key: "department", label: "Department" },
    ],
    valueLabel: "open tasks",
  },
  wellbeing: {
    label: "Wellbeing",
    groupBys: [
      { key: "mood", label: "Mood" },
      { key: "day", label: "Day" },
    ],
    valueLabel: "check-ins",
  },
} as const

export type DatasetKey = keyof typeof DATASETS
export const DATASET_KEYS = Object.keys(DATASETS) as DatasetKey[]

export const CADENCES = ["daily", "weekly", "monthly"] as const
export type Cadence = (typeof CADENCES)[number]

export function isDatasetKey(v: unknown): v is DatasetKey {
  return typeof v === "string" && DATASET_KEYS.includes(v as DatasetKey)
}

export function isCadence(v: unknown): v is Cadence {
  return typeof v === "string" && (CADENCES as readonly string[]).includes(v)
}

export function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, message }, { status: 400 })
}

export function serverError(error: unknown, action: string) {
  console.error(`Error during ${action}:`, error)
  return NextResponse.json(
    { success: false, message: `Failed to ${action}`, error: (error as Error).message },
    { status: 500 },
  )
}

export function parseRangeDays(v: unknown, fallback = 30): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(365, Math.round(n))
}

/** Safe `id IN (...)` fragment for a list of validated integer ids. */
export function idInList(ids: number[]) {
  return sql.join(
    ids.map((n) => sql`${n}`),
    sql`, `,
  )
}

export function computeNextRun(cadence: Cadence, from: Date = new Date()): string {
  const next = new Date(from)
  if (cadence === "daily") next.setUTCDate(next.getUTCDate() + 1)
  else if (cadence === "weekly") next.setUTCDate(next.getUTCDate() + 7)
  else next.setUTCMonth(next.getUTCMonth() + 1)
  return next.toISOString()
}

export interface DatasetRow {
  name: string
  value: number
}

export interface DatasetResult {
  rows: DatasetRow[]
  total: number
  valueLabel: string
  generatedAt: string
}

/**
 * Runs a deterministic aggregation for one dataset. All queries are
 * parameterized; groupBy is validated against the registry before use, and
 * the switch below maps it to hand-written SQL fragments (no interpolation of
 * user text into queries).
 */
export async function buildDataset(
  dataset: DatasetKey,
  opts: { rangeDays?: number; groupBy?: string } = {},
): Promise<DatasetResult> {
  const rangeDays = parseRangeDays(opts.rangeDays)
  const registry = DATASETS[dataset]
  const groupBy =
    registry.groupBys.find((g) => g.key === opts.groupBy)?.key ?? registry.groupBys[0].key
  const generatedAt = new Date().toISOString()

  if (dataset === "tasks") {
    let rows: DatasetRow[]
    if (groupBy === "status") {
      rows = (await db.execute(sql`
        SELECT status::text AS name, count(*)::int AS value
        FROM tasks
        WHERE created_at >= now() - make_interval(days => ${rangeDays})
        GROUP BY status ORDER BY count(*) DESC
      `)) as unknown as DatasetRow[]
    } else if (groupBy === "priority") {
      rows = (await db.execute(sql`
        SELECT priority::text AS name, count(*)::int AS value
        FROM tasks
        WHERE created_at >= now() - make_interval(days => ${rangeDays})
        GROUP BY priority ORDER BY count(*) DESC
      `)) as unknown as DatasetRow[]
    } else if (groupBy === "assignee") {
      rows = (await db.execute(sql`
        SELECT coalesce(u.name, 'Unassigned')::text AS name, count(*)::int AS value
        FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
        WHERE t.created_at >= now() - make_interval(days => ${rangeDays})
        GROUP BY coalesce(u.name, 'Unassigned') ORDER BY count(*) DESC
      `)) as unknown as DatasetRow[]
    } else {
      rows = (await db.execute(sql`
        SELECT coalesce(s.name, 'No sprint')::text AS name, count(*)::int AS value
        FROM tasks t LEFT JOIN sprints s ON s.id = t.sprint_id
        WHERE t.created_at >= now() - make_interval(days => ${rangeDays})
        GROUP BY coalesce(s.name, 'No sprint') ORDER BY count(*) DESC
      `)) as unknown as DatasetRow[]
    }
    const total = rows.reduce((s, r) => s + r.value, 0)
    return { rows, total, valueLabel: registry.valueLabel, generatedAt }
  }

  if (dataset === "sprints") {
    const rows = (await db.execute(sql`
      SELECT status::text AS name, count(*)::int AS value
      FROM sprints
      WHERE start_date >= (CURRENT_DATE - ${rangeDays}::int) OR status <> 'completed'
      GROUP BY status ORDER BY count(*) DESC
    `)) as unknown as DatasetRow[]
    const total = rows.reduce((s, r) => s + r.value, 0)
    return { rows, total, valueLabel: registry.valueLabel, generatedAt }
  }

  if (dataset === "team") {
    let rows: DatasetRow[]
    if (groupBy === "department") {
      rows = (await db.execute(sql`
        SELECT coalesce(nullif(u.department, ''), 'No department')::text AS name, count(t.id)::int AS value
        FROM users u LEFT JOIN tasks t
          ON t.assignee_id = u.id AND t.status <> 'done'
        GROUP BY coalesce(nullif(u.department, ''), 'No department') ORDER BY count(t.id) DESC
      `)) as unknown as DatasetRow[]
    } else {
      rows = (await db.execute(sql`
        SELECT u.name::text AS name, count(t.id)::int AS value
        FROM users u LEFT JOIN tasks t
          ON t.assignee_id = u.id AND t.status <> 'done'
          AND t.created_at >= now() - make_interval(days => ${rangeDays})
        GROUP BY u.name ORDER BY count(t.id) DESC
      `)) as unknown as DatasetRow[]
    }
    const total = rows.reduce((s, r) => s + r.value, 0)
    return { rows, total, valueLabel: registry.valueLabel, generatedAt }
  }

  // wellbeing
  let rows: DatasetRow[]
  if (groupBy === "day") {
    rows = (await db.execute(sql`
      SELECT to_char(date, 'YYYY-MM-DD') AS name, round(avg(wellbeing_score))::int AS value
      FROM wellbeing_metrics
      WHERE date >= CURRENT_DATE - ${rangeDays}::int
      GROUP BY date ORDER BY date
    `)) as unknown as DatasetRow[]
  } else {
    rows = (await db.execute(sql`
      SELECT mood::text AS name, count(*)::int AS value
      FROM wellbeing_metrics
      WHERE date >= CURRENT_DATE - ${rangeDays}::int
      GROUP BY mood ORDER BY count(*) DESC
    `)) as unknown as DatasetRow[]
  }
  const total = rows.reduce((s, r) => s + r.value, 0)
  return { rows, total, valueLabel: registry.valueLabel, generatedAt }
}

export function toCsv(result: DatasetResult, nameKey: string): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [`${esc(nameKey)},${esc(result.valueLabel)}`]
  for (const r of result.rows) lines.push(`${esc(r.name)},${r.value}`)
  lines.push(`${esc("Total")},${result.total}`)
  lines.push(`${esc("Generated at")},${esc(result.generatedAt)}`)
  return lines.join("\n")
}

export interface ScheduleDto {
  id: number
  userId: number
  name: string
  description: string | null
  dataset: DatasetKey
  config: { rangeDays?: number; groupBy?: string }
  cadence: Cadence
  recipients: number[]
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
  runCount?: number
}

export interface RunDto {
  id: number
  scheduleId: number
  scheduleName?: string
  status: string
  rows: number
  detail: string | null
  createdAt: string
}

const SCHEDULE_PROJECTION = sql`
  rs.id, rs.user_id, rs.name, rs.description, rs.dataset, rs.config, rs.cadence,
  rs.recipients, rs.is_active,
  to_char(rs.last_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_run_at,
  to_char(rs.next_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS next_run_at,
  to_char(rs.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(rs.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
  (SELECT count(*)::int FROM report_runs rr WHERE rr.schedule_id = rs.id) AS run_count
`

interface ScheduleRawRow {
  id: number
  user_id: number
  name: string
  description: string | null
  dataset: string
  config: { rangeDays?: number; groupBy?: string } | string | null
  cadence: string
  recipients: number[] | string | null
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
  run_count: number
}

export function serializeSchedule(row: ScheduleRawRow): ScheduleDto {
  let config = row.config
  if (typeof config === "string") {
    try {
      config = JSON.parse(config)
    } catch {
      config = {}
    }
  }
  let recipients = row.recipients
  if (typeof recipients === "string") {
    try {
      recipients = JSON.parse(recipients)
    } catch {
      recipients = []
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    dataset: isDatasetKey(row.dataset) ? row.dataset : "tasks",
    config: (config ?? {}) as ScheduleDto["config"],
    cadence: isCadence(row.cadence) ? row.cadence : "weekly",
    recipients: Array.isArray(recipients) ? recipients.map(Number).filter(Number.isInteger) : [],
    isActive: row.is_active === true,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    runCount: row.run_count,
  }
}

export async function fetchSchedules(): Promise<ScheduleDto[]> {
  const rows = (await db.execute(sql`
    SELECT ${SCHEDULE_PROJECTION}
    FROM report_schedules rs
    ORDER BY rs.updated_at DESC
  `)) as unknown as ScheduleRawRow[]
  return rows.map(serializeSchedule)
}

export async function fetchScheduleById(id: number): Promise<ScheduleDto | null> {
  const rows = (await db.execute(sql`
    SELECT ${SCHEDULE_PROJECTION}
    FROM report_schedules rs
    WHERE rs.id = ${id}
  `)) as unknown as ScheduleRawRow[]
  return rows.length ? serializeSchedule(rows[0]) : null
}

export async function fetchRuns(limit = 50): Promise<RunDto[]> {
  const rows = (await db.execute(sql`
    SELECT rr.id, rr.schedule_id, rs.name AS schedule_name, rr.status::text AS status,
      rr.rows, rr.detail,
      to_char(rr.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM report_runs rr
    JOIN report_schedules rs ON rs.id = rr.schedule_id
    ORDER BY rr.created_at DESC
    LIMIT ${limit}
  `)) as unknown as {
    id: number
    schedule_id: number
    schedule_name: string
    status: string
    rows: number
    detail: string | null
    created_at: string
  }[]
  return rows.map((r) => ({
    id: r.id,
    scheduleId: r.schedule_id,
    scheduleName: r.schedule_name,
    status: r.status,
    rows: r.rows,
    detail: r.detail,
    createdAt: r.created_at,
  }))
}

export async function parseIdParam(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}
