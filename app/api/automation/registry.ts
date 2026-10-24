// Pure rule-model definitions for the automation workspace — no DB or server
// imports, so the client page and the API routes share the exact same
// triggers/conditions/actions vocabulary and templates.

export const TRIGGERS = {
  due_soon: {
    label: "Due soon",
    description: "Open tasks whose due date falls within the next N days.",
    params: [{ key: "days", label: "Days ahead", type: "number", default: 3 }],
  },
  overdue: {
    label: "Overdue",
    description: "Open tasks past their due date.",
    params: [],
  },
  blocked: {
    label: "Blocked task",
    description: "Tasks currently in the blocked column.",
    params: [],
  },
  stale: {
    label: "Stale task",
    description: "Open tasks with no update for N+ days.",
    params: [{ key: "days", label: "Days untouched", type: "number", default: 7 }],
  },
  newly_created: {
    label: "Newly created",
    description: "Tasks created in the last N hours.",
    params: [{ key: "hours", label: "Hours", type: "number", default: 24 }],
  },
  high_priority_open: {
    label: "High-priority open",
    description: "Open tasks with urgent or high priority.",
    params: [],
  },
  unassigned_open: {
    label: "Unassigned open",
    description: "Open tasks with no assignee.",
    params: [],
  },
} as const

export type TriggerKey = keyof typeof TRIGGERS
export const TRIGGER_KEYS = Object.keys(TRIGGERS) as TriggerKey[]

export function isTriggerKey(v: unknown): v is TriggerKey {
  return typeof v === "string" && TRIGGER_KEYS.includes(v as TriggerKey)
}

export const STATUSES = ["todo", "in_progress", "review", "blocked", "done"] as const
export const PRIORITIES = ["urgent", "high", "medium", "low"] as const

export const ACTIONS = {
  set_status: {
    label: "Set status",
    params: [{ key: "status", label: "Status", type: "status", required: true }],
    description: "Moves every matched task to the chosen column.",
  },
  bump_priority: {
    label: "Bump priority",
    params: [],
    description: "Raises priority one level (low→medium→high→urgent).",
  },
  assign_to: {
    label: "Assign to member",
    params: [{ key: "userId", label: "Member", type: "user", required: true }],
    description: "Sets the assignee on every matched task.",
  },
  notify_assignee: {
    label: "Notify assignee",
    params: [],
    description: "Sends each matched task's assignee a notification about it.",
  },
  notify_creator: {
    label: "Notify rule owner",
    params: [],
    description: "Sends you one digest notification listing the matched tasks.",
  },
} as const

export type ActionKey = keyof typeof ACTIONS
export const ACTION_KEYS = Object.keys(ACTIONS) as ActionKey[]

export function isActionKey(v: unknown): v is ActionKey {
  return typeof v === "string" && ACTION_KEYS.includes(v as ActionKey)
}

/* ---------------------------------------------------------------- conditions */

export interface RuleConditions {
  statusIn?: string[]
  priorityIn?: string[]
  minStoryPoints?: number | null
  sprintId?: number | null
}

export interface RuleAction {
  type: ActionKey
  params?: Record<string, string | number>
}

export function conditionsPass(task: TaskShape, c: RuleConditions): boolean {
  if (c.statusIn?.length && !c.statusIn.includes(task.status)) return false
  if (c.priorityIn?.length && !c.priorityIn.includes(task.priority)) return false
  if (typeof c.minStoryPoints === "number" && task.storyPoints < c.minStoryPoints) return false
  if (typeof c.sprintId === "number" && task.sprintId !== c.sprintId) return false
  return true
}

export interface TaskShape {
  id: number
  title: string
  status: string
  priority: string
  storyPoints: number
  assigneeId: number | null
  assigneeName: string | null
  sprintId: number | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

/* ----------------------------------------------------------------- templates */

export interface RuleTemplate {
  key: string
  name: string
  description: string
  trigger: TriggerKey
  triggerParams: Record<string, number>
  conditions: RuleConditions
  actions: RuleAction[]
}

export const TEMPLATES: RuleTemplate[] = [
  {
    key: "overdue-escalate",
    name: "Escalate overdue work",
    description: "Overdue open tasks get their priority bumped and both assignee and rule owner notified.",
    trigger: "overdue",
    triggerParams: {},
    conditions: {},
    actions: [{ type: "bump_priority" }, { type: "notify_assignee" }, { type: "notify_creator" }],
  },
  {
    key: "blocked-alert",
    name: "Blocked task alert",
    description: "Any task sitting in blocked notifies its assignee so it gets unblocked fast.",
    trigger: "blocked",
    triggerParams: {},
    conditions: {},
    actions: [{ type: "notify_assignee" }, { type: "notify_creator" }],
  },
  {
    key: "stale-nudge",
    name: "Nudge stale tasks",
    description: "Open tasks untouched for 7+ days nudge their assignee.",
    trigger: "stale",
    triggerParams: { days: 7 },
    conditions: {},
    actions: [{ type: "notify_assignee" }],
  },
  {
    key: "triage-unassigned",
    name: "Triage unassigned tasks",
    description: "New unassigned open work notifies the rule owner to triage it.",
    trigger: "unassigned_open",
    triggerParams: {},
    conditions: {},
    actions: [{ type: "notify_creator" }],
  },
  {
    key: "due-soon-review",
    name: "Due-soon review push",
    description: "Tasks due within 3 days that are still in todo move to in_progress and notify the assignee.",
    trigger: "due_soon",
    triggerParams: { days: 3 },
    conditions: { statusIn: ["todo"] },
    actions: [{ type: "set_status", params: { status: "in_progress" } }, { type: "notify_assignee" }],
  },
]

export function describeTrigger(trigger: TriggerKey, params: Record<string, number>): string {
  const t = TRIGGERS[trigger]
  if (!t) return trigger
  if (trigger === "due_soon") return `Due within ${params.days ?? 3} days`
  if (trigger === "stale") return `No update for ${params.days ?? 7}+ days`
  if (trigger === "newly_created") return `Created in last ${params.hours ?? 24}h`
  return t.label
}
