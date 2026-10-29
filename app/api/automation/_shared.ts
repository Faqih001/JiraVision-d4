// Server-only helpers for the automation workspace: rule/run serialization and
// the deterministic rule engine. automation_rules / automation_runs are
// raw-SQL tables (scripts/create-automation-tables.mjs), intentionally NOT in
// drizzle/schema.ts.

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { createNotification } from "@/lib/notifications"
import {
  PRIORITIES,
  conditionsPass,
  isActionKey,
  isTriggerKey,
  type ActionKey,
  type RuleAction,
  type RuleConditions,
  type TaskShape,
  type TriggerKey,
} from "./registry"

export const STATUSES = ["todo", "in_progress", "review", "blocked", "done"] as const

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

export async function parseIdParam(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

/* ------------------------------------------------------------------- model */

export interface RuleDto {
  id: number
  userId: number
  name: string
  description: string | null
  trigger: TriggerKey
  triggerParams: Record<string, number>
  conditions: RuleConditions
  actions: RuleAction[]
  isActive: boolean
  runCount: number
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RunDto {
  id: number
  ruleId: number
  ruleName?: string
  status: string
  matched: number
  acted: number
  detail: string | null
  createdAt: string
}

interface RuleRawRow {
  id: number
  user_id: number
  name: string
  description: string | null
  trigger: string
  conditions: RuleConditions | string | null
  actions: RuleAction[] | string | null
  is_active: boolean
  run_count: number
  last_run_at: string | null
  created_at: string
  updated_at: string
}

const RULE_PROJECTION = sql`
  ar.id, ar.user_id, ar.name, ar.description, ar.trigger::text AS trigger,
  ar.conditions, ar.actions, ar.is_active, ar.run_count,
  to_char(ar.last_run_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_run_at,
  to_char(ar.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(ar.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
`

function parseJson<T>(v: T | string | null, fallback: T): T {
  if (v === null || v === undefined) return fallback
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T
    } catch {
      return fallback
    }
  }
  return v
}

export function sanitizeConditions(raw: unknown): RuleConditions {
  const c = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  const out: RuleConditions = {}
  if (Array.isArray(c.statusIn)) {
    const list = c.statusIn.filter((s): s is string => typeof s === "string" && (STATUSES as readonly string[]).includes(s))
    if (list.length) out.statusIn = list
  }
  if (Array.isArray(c.priorityIn)) {
    const list = c.priorityIn.filter((s): s is string => typeof s === "string" && (PRIORITIES as readonly string[]).includes(s))
    if (list.length) out.priorityIn = list
  }
  if (typeof c.minStoryPoints === "number" && Number.isFinite(c.minStoryPoints) && c.minStoryPoints >= 0) {
    out.minStoryPoints = c.minStoryPoints
  }
  if (Number.isInteger(c.sprintId) && Number(c.sprintId) > 0) out.sprintId = Number(c.sprintId)
  return out
}

export function sanitizeActions(raw: unknown): RuleAction[] {
  if (!Array.isArray(raw)) return []
  const out: RuleAction[] = []
  for (const a of raw.slice(0, 10)) {
    if (typeof a !== "object" || a === null) continue
    const { type, params } = a as Record<string, unknown>
    if (!isActionKey(type)) continue
    const clean: RuleAction = { type }
    if (type === "set_status") {
      const s = (params as Record<string, unknown> | undefined)?.status
      if (typeof s === "string" && (STATUSES as readonly string[]).includes(s)) {
        clean.params = { status: s }
      } else {
        continue // set_status without a valid status is a no-op — drop it
      }
    } else if (type === "assign_to") {
      const u = Number((params as Record<string, unknown> | undefined)?.userId)
      if (Number.isInteger(u) && u > 0) clean.params = { userId: u }
      else continue
    }
    out.push(clean)
  }
  return out
}

export function sanitizeTriggerParams(trigger: TriggerKey, raw: unknown): Record<string, number> {
  const p = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  const out: Record<string, number> = {}
  if (trigger === "due_soon" || trigger === "stale") {
    const days = Number(p.days)
    out.days = Number.isFinite(days) && days > 0 ? Math.min(90, Math.round(days)) : trigger === "due_soon" ? 3 : 7
  }
  if (trigger === "newly_created") {
    const hours = Number(p.hours)
    out.hours = Number.isFinite(hours) && hours > 0 ? Math.min(720, Math.round(hours)) : 24
  }
  return out
}

export function serializeRule(row: RuleRawRow): RuleDto {
  const trigger: TriggerKey = isTriggerKey(row.trigger) ? row.trigger : "overdue"
  // The conditions jsonb doubles as the rule's config document:
  // { statusIn?, priorityIn?, minStoryPoints?, sprintId?, triggerParams? }
  const rawConfig = parseJson<Record<string, unknown>>(
    row.conditions as Record<string, unknown> | string | null,
    {},
  )
  const conditions = sanitizeConditions(rawConfig)
  const actions = sanitizeActions(parseJson<RuleAction[] | string | null>(row.actions, null))
  const triggerParams = sanitizeTriggerParams(trigger, rawConfig.triggerParams)
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    trigger,
    triggerParams,
    conditions,
    actions,
    isActive: row.is_active === true,
    runCount: row.run_count,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * A rule belongs to whoever wrote it — `automation_rules.user_id` is set on
 * insert and the run history hangs off the rule — so both reads take the
 * owner. A member who has never built an automation opens on an empty page.
 */
export async function fetchRules(userId: number): Promise<RuleDto[]> {
  const rows = (await db.execute(sql`
    SELECT ${RULE_PROJECTION} FROM automation_rules ar WHERE ar.user_id = ${userId} ORDER BY ar.updated_at DESC
  `)) as unknown as RuleRawRow[]
  return rows.map(serializeRule)
}

export async function fetchRuleById(id: number): Promise<RuleDto | null> {
  const rows = (await db.execute(sql`
    SELECT ${RULE_PROJECTION} FROM automation_rules ar WHERE ar.id = ${id}
  `)) as unknown as RuleRawRow[]
  return rows.length ? serializeRule(rows[0]) : null
}

export async function fetchRuns(userId: number, limit = 50): Promise<RunDto[]> {
  const rows = (await db.execute(sql`
    SELECT au.id, au.rule_id, ar.name AS rule_name, au.status::text AS status,
      au.matched, au.acted, au.detail,
      to_char(au.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM automation_runs au
    JOIN automation_rules ar ON ar.id = au.rule_id
    WHERE ar.user_id = ${userId}
    ORDER BY au.created_at DESC
    LIMIT ${limit}
  `)) as unknown as {
    id: number
    rule_id: number
    rule_name: string
    status: string
    matched: number
    acted: number
    detail: string | null
    created_at: string
  }[]
  return rows.map((r) => ({
    id: r.id,
    ruleId: r.rule_id,
    ruleName: r.rule_name,
    status: r.status,
    matched: r.matched,
    acted: r.acted,
    detail: r.detail,
    createdAt: r.created_at,
  }))
}

/* ------------------------------------------------------------------ engine */

const TASK_PROJECTION = sql`
  t.id, t.title, t.status::text AS status, t.priority::text AS priority,
  t.story_points, t.assignee_id, t.sprint_id,
  to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
  to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(t.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
  u.name AS assignee_name
`

const TASK_FROM = sql`
  FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
`

interface TaskRawRow {
  id: number
  title: string
  status: string
  priority: string
  story_points: number
  assignee_id: number | null
  sprint_id: number | null
  due_date: string | null
  created_at: string
  updated_at: string
  assignee_name: string | null
}

function toTaskShape(r: TaskRawRow): TaskShape {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    storyPoints: r.story_points,
    assigneeId: r.assignee_id,
    assigneeName: r.assignee_name,
    sprintId: r.sprint_id,
    dueDate: r.due_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** Candidate set for a trigger, evaluated against CURRENT workspace state. */
async function triggerCandidates(rule: RuleDto): Promise<TaskShape[]> {
  const open = sql`t.status <> 'done'`
  switch (rule.trigger) {
    case "due_soon": {
      const days = rule.triggerParams.days ?? 3
      const rows = (await db.execute(sql`
        SELECT ${TASK_PROJECTION} ${TASK_FROM}
        WHERE ${open} AND t.due_date IS NOT NULL
          AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ${days}::int
        ORDER BY t.due_date
      `)) as unknown as TaskRawRow[]
      return rows.map(toTaskShape)
    }
    case "overdue": {
      const rows = (await db.execute(sql`
        SELECT ${TASK_PROJECTION} ${TASK_FROM}
        WHERE ${open} AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE
        ORDER BY t.due_date
      `)) as unknown as TaskRawRow[]
      return rows.map(toTaskShape)
    }
    case "blocked": {
      const rows = (await db.execute(sql`
        SELECT ${TASK_PROJECTION} ${TASK_FROM}
        WHERE t.status = 'blocked' ORDER BY t.updated_at DESC
      `)) as unknown as TaskRawRow[]
      return rows.map(toTaskShape)
    }
    case "stale": {
      const days = rule.triggerParams.days ?? 7
      const rows = (await db.execute(sql`
        SELECT ${TASK_PROJECTION} ${TASK_FROM}
        WHERE ${open} AND t.updated_at < now() - make_interval(days => ${days})
        ORDER BY t.updated_at
      `)) as unknown as TaskRawRow[]
      return rows.map(toTaskShape)
    }
    case "newly_created": {
      const hours = rule.triggerParams.hours ?? 24
      const rows = (await db.execute(sql`
        SELECT ${TASK_PROJECTION} ${TASK_FROM}
        WHERE t.created_at >= now() - make_interval(hours => ${hours})
        ORDER BY t.created_at DESC
      `)) as unknown as TaskRawRow[]
      return rows.map(toTaskShape)
    }
    case "high_priority_open": {
      const rows = (await db.execute(sql`
        SELECT ${TASK_PROJECTION} ${TASK_FROM}
        WHERE ${open} AND t.priority IN ('urgent', 'high')
        ORDER BY t.priority, t.updated_at DESC
      `)) as unknown as TaskRawRow[]
      return rows.map(toTaskShape)
    }
    case "unassigned_open": {
      const rows = (await db.execute(sql`
        SELECT ${TASK_PROJECTION} ${TASK_FROM}
        WHERE ${open} AND t.assignee_id IS NULL
        ORDER BY t.created_at DESC
      `)) as unknown as TaskRawRow[]
      return rows.map(toTaskShape)
    }
  }
}

export interface PlannedAction {
  taskId: number
  taskTitle: string
  action: ActionKey
  detail: string
}

export interface EngineResult {
  matched: TaskShape[]
  planned: PlannedAction[]
  acted: number
  dryRun: boolean
}

/**
 * Evaluate a rule against the current workspace state and (unless dryRun)
 * apply its actions for real: task rows are updated, notifications are
 * created, and the run is logged. Deterministic — same state, same outcome.
 */
export async function executeRule(
  rule: RuleDto,
  opts: { dryRun?: boolean; actorName: string } = { actorName: "Automation" },
): Promise<EngineResult> {
  const dryRun = opts.dryRun === true
  const candidates = await triggerCandidates(rule)
  const matched = candidates.filter((t) => conditionsPass(t, rule.conditions))

  const planned: PlannedAction[] = []
  for (const task of matched) {
    for (const action of rule.actions) {
      if (action.type === "set_status") {
        const status = String(action.params?.status ?? "")
        if (task.status !== status) {
          planned.push({ taskId: task.id, taskTitle: task.title, action: "set_status", detail: `${task.status} → ${status}` })
        }
      } else if (action.type === "bump_priority") {
        const idx = PRIORITIES.indexOf(task.priority as (typeof PRIORITIES)[number])
        const next = idx > 0 ? PRIORITIES[idx - 1] : null // PRIORITIES is urgent-first
        if (next && next !== task.priority) {
          planned.push({ taskId: task.id, taskTitle: task.title, action: "bump_priority", detail: `${task.priority} → ${next}` })
        }
      } else if (action.type === "assign_to") {
        const userId = Number(action.params?.userId)
        if (task.assigneeId !== userId) {
          planned.push({ taskId: task.id, taskTitle: task.title, action: "assign_to", detail: `assignee → user ${userId}` })
        }
      } else if (action.type === "notify_assignee") {
        if (task.assigneeId) {
          planned.push({ taskId: task.id, taskTitle: task.title, action: "notify_assignee", detail: `notify ${task.assigneeName ?? `user ${task.assigneeId}`}` })
        }
      } else if (action.type === "notify_creator") {
        planned.push({ taskId: task.id, taskTitle: task.title, action: "notify_creator", detail: `digest to rule owner` })
      }
    }
  }

  if (dryRun) {
    return { matched, planned, acted: 0, dryRun: true }
  }

  let acted = 0
  const digestLines: string[] = []

  for (const p of planned) {
    if (p.action === "set_status") {
      const status = p.detail.split(" → ")[1]
      await db.execute(sql`
        UPDATE tasks SET status = ${status}, updated_at = now() WHERE id = ${p.taskId}
      `)
      acted++
    } else if (p.action === "bump_priority") {
      const next = p.detail.split(" → ")[1]
      await db.execute(sql`
        UPDATE tasks SET priority = ${next}, updated_at = now() WHERE id = ${p.taskId}
      `)
      acted++
    } else if (p.action === "assign_to") {
      const userId = Number(p.detail.replace("assignee → user ", ""))
      await db.execute(sql`
        UPDATE tasks SET assignee_id = ${userId}, updated_at = now() WHERE id = ${p.taskId}
      `)
      acted++
    } else if (p.action === "notify_assignee") {
      const task = matched.find((t) => t.id === p.taskId)
      if (task?.assigneeId) {
        await createNotification({
          userId: task.assigneeId,
          type: "task",
          title: `Automation: "${task.title}" needs attention`,
          body: `Rule “${rule.name}” flagged this task (${opts.actorName}).`,
          link: "/dashboard/tasks",
          metadata: { ruleId: rule.id, taskId: task.id, action: "automation" },
        })
        acted++
      }
    } else if (p.action === "notify_creator") {
      const task = matched.find((t) => t.id === p.taskId)
      if (task) digestLines.push(`#${task.id} ${task.title} (${task.status}/${task.priority})`)
    }
  }

  if (digestLines.length) {
    await createNotification({
      userId: rule.userId,
      type: "task",
      title: `Automation digest: ${rule.name} matched ${matched.length} task(s)`,
      body: digestLines.slice(0, 8).join(" · ") + (digestLines.length > 8 ? " …" : ""),
      link: "/dashboard/automation",
      metadata: { ruleId: rule.id, action: "automation-digest", count: digestLines.length },
    })
    acted++
  }

  const detail = `${matched.length} matched · ${acted} action(s) applied`
  await db.execute(sql`
    INSERT INTO automation_runs (rule_id, status, matched, acted, detail)
    VALUES (${rule.id}, 'ok', ${matched.length}, ${acted}, ${detail})
  `)
  await db.execute(sql`
    UPDATE automation_rules
    SET run_count = run_count + 1, last_run_at = now(), updated_at = now()
    WHERE id = ${rule.id}
  `)

  return { matched, planned, acted, dryRun: false }
}
