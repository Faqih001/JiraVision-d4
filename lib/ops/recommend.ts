// Ops recommendation engine: deterministic rules that read ops_log_entries and produce
// actionable recommendations. Each rule is declared in the pack's opsConfig.recommendRules;
// this module evaluates them against the member's data and returns grounded suggestions.
// No AI, no estimation — every recommendation names a real row and a real condition.

import type { OpsConfigValidated } from "@/lib/packs/ops/validator"
import type { RecommendRule } from "@/lib/packs/ops/types"
import { daysBetween } from "@/lib/registers/staleness"

export type OpsRecommendation = {
  id: string
  ruleId: string
  priority: "Critical" | "High" | "Medium" | "Low"
  observation: string
  risk: string
  action: string
  entityKey: string
  entryId: number | null
  href: string
}

export type OpsRecommendInput = {
  today: string
  entries: Array<{
    id: number
    entityKey: string
    occurredAt: string | Date
    status: string | null
    fields: Record<string, unknown>
  }>
  registerItems?: Array<{
    id: number
    kind: string
    title: string
    fields: Record<string, unknown>
    lastVerifiedAt: string | null
    verifyIntervalDays: number | null
  }>
}

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

// Every log entity lands on the activity logs page filtered to that entity; register_items land on
// the registers page. No href may point at an unmapped route.
const ENTITY_HREF: Record<string, string> = {
  register_items: "/dashboard/registers",
}

function entityHref(entityKey: string): string {
  if (entityKey === "register_items") return ENTITY_HREF.register_items
  return `/dashboard/ops/logs?entity=${encodeURIComponent(entityKey)}`
}

/**
 * Evaluate all recommend rules from the opsConfig against the member's data.
 * Returns a sorted list of recommendations (highest priority first).
 */
export function buildOpsRecommendations(
  config: OpsConfigValidated,
  input: OpsRecommendInput,
): OpsRecommendation[] {
  const rules = config.recommendRules ?? []
  const out: OpsRecommendation[] = []

  for (const rule of rules) {
    const matches = evaluateRule(rule, input)
    for (const match of matches) {
      out.push({
        id: `${rule.id}:${match.entryId ?? "global"}`,
        ruleId: rule.id,
        priority: rule.priority,
        observation: interpolate(rule.observation, match.fields),
        risk: interpolate(rule.risk, match.fields),
        action: rule.action,
        entityKey: rule.entity,
        entryId: match.entryId,
        href: entityHref(rule.entity),
      })
    }
  }

  return out.sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  )
}

type Match = {
  entryId: number | null
  fields: Record<string, unknown>
}

function evaluateRule(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  switch (rule.condition) {
    case "no_result_in_days":
      return evaluateNoResultInDays(rule, input)
    case "result_failed_or_warning":
      return evaluateResultFailedOrWarning(rule, input)
    case "field_below_percent":
      return evaluateFieldBelowPercent(rule, input)
    case "date_field_within_days":
      return evaluateDateWithinDays(rule, input)
    case "stale":
      return evaluateStale(rule, input)
    case "past_sla":
      return evaluatePastSla(rule, input)
    case "no_offsite_copy":
      return evaluateNoOffsiteCopy(rule, input)
    default:
      return []
  }
}

function evaluateNoResultInDays(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  const days = Number(rule.params.days ?? 7)
  const cutoff = new Date(input.today)
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split("T")[0]

  const recentEntries = input.entries.filter((entry) => {
    if (entry.entityKey !== rule.entity) return false
    const occurred = typeof entry.occurredAt === "string" ? entry.occurredAt : entry.occurredAt.toISOString()
    return occurred >= cutoffStr
  })

  if (recentEntries.length > 0) return []

  const latestEntry = input.entries
    .filter((entry) => entry.entityKey === rule.entity)
    .sort((a, b) => {
      const aDate = typeof a.occurredAt === "string" ? a.occurredAt : a.occurredAt.toISOString()
      const bDate = typeof b.occurredAt === "string" ? b.occurredAt : b.occurredAt.toISOString()
      return bDate.localeCompare(aDate)
    })[0]

  return [{ entryId: latestEntry?.id ?? null, fields: latestEntry?.fields ?? {} }]
}

function evaluateResultFailedOrWarning(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  return input.entries
    .filter((entry) => entry.entityKey === rule.entity)
    .filter((entry) => {
      const result = entry.fields.result
      return result === "Failed" || result === "Warning"
    })
    .filter((entry) => {
      const status = entry.status ?? entry.fields.status
      return status !== "Resolved" && status !== "Closed"
    })
    .map((entry) => ({ entryId: entry.id, fields: entry.fields }))
}

function evaluateFieldBelowPercent(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  const field = String(rule.params.field ?? "")
  const threshold = Number(rule.params.threshold ?? 0)
  if (!field) return []

  const seen = new Set<string>()
  const results: Match[] = []

  for (const entry of input.entries) {
    if (entry.entityKey !== rule.entity) continue
    const system = String(entry.fields.system ?? "")
    if (seen.has(system)) continue

    const entriesForSystem = input.entries.filter(
      (e) => e.entityKey === rule.entity && String(e.fields.system ?? "") === system,
    )
    const latest = entriesForSystem.sort((a, b) => {
      const aDate = typeof a.occurredAt === "string" ? a.occurredAt : a.occurredAt.toISOString()
      const bDate = typeof b.occurredAt === "string" ? b.occurredAt : b.occurredAt.toISOString()
      return bDate.localeCompare(aDate)
    })[0]

    if (!latest) continue
    const value = Number(latest.fields[field] ?? 0)
    const totalCapacity = Number(latest.fields.total_capacity_gb ?? latest.fields.size_gb ?? 100)
    if (totalCapacity > 0 && value / totalCapacity < threshold) {
      seen.add(system)
      results.push({ entryId: latest.id, fields: latest.fields })
    }
  }

  return results
}

function evaluateDateWithinDays(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  const field = String(rule.params.field ?? "")
  const days = Number(rule.params.days ?? 30)
  if (!field) return []

  const today = new Date(input.today)
  const deadline = new Date(today)
  deadline.setDate(deadline.getDate() + days)
  const deadlineStr = deadline.toISOString().split("T")[0]

  if (rule.entity === "register_items") {
    return (input.registerItems ?? [])
      .filter((item) => {
        const value = item.fields[field]
        if (typeof value !== "string" || !value) return false
        return value <= deadlineStr && value >= input.today
      })
      .map((item) => ({ entryId: item.id, fields: { ...item.fields, title: item.title } }))
  }

  return input.entries
    .filter((entry) => entry.entityKey === rule.entity)
    .filter((entry) => {
      const value = entry.fields[field]
      if (typeof value !== "string" || !value) return false
      return value <= deadlineStr && value >= input.today
    })
    .map((entry) => ({ entryId: entry.id, fields: entry.fields }))
}

function evaluateStale(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  return (input.registerItems ?? [])
    .filter((item) => {
      if (!item.lastVerifiedAt || !item.verifyIntervalDays) return false
      const days = daysBetween(item.lastVerifiedAt, input.today)
      return days > item.verifyIntervalDays
    })
    .map((item) => ({ entryId: item.id, fields: { ...item.fields, title: item.title, last_verified_at: item.lastVerifiedAt } }))
}

function evaluatePastSla(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  const SLA_DAYS: Record<string, number> = {
    Critical: 1,
    High: 1,
    Medium: 2,
    Low: 5,
  }

  return input.entries
    .filter((entry) => entry.entityKey === rule.entity)
    .filter((entry) => {
      const status = entry.fields.status ?? entry.status
      if (status === "Resolved" || status === "Closed") return false
      return true
    })
    .filter((entry) => {
      const priority = String(entry.fields.priority ?? "Medium")
      const slaDays = SLA_DAYS[priority] ?? 5
      const dateLogged = String(entry.fields.date_logged ?? "")
      if (!dateLogged) return false
      const days = daysBetween(dateLogged, input.today)
      return days > slaDays
    })
    .map((entry) => {
      const priority = String(entry.fields.priority ?? "Medium")
      const slaDays = SLA_DAYS[priority] ?? 5
      const dateLogged = String(entry.fields.date_logged ?? "")
      const daysOverdue = daysBetween(dateLogged, input.today) - slaDays
      return {
        entryId: entry.id,
        fields: { ...entry.fields, days_overdue: daysOverdue },
      }
    })
}

function evaluateNoOffsiteCopy(rule: RecommendRule, input: OpsRecommendInput): Match[] {
  const seen = new Set<string>()
  const results: Match[] = []

  for (const entry of input.entries) {
    if (entry.entityKey !== rule.entity) continue
    const system = String(entry.fields.system ?? "")
    if (!system || seen.has(system)) continue

    const hasOffsite = input.entries.some(
      (e) =>
        e.entityKey === rule.entity &&
        String(e.fields.system ?? "") === system &&
        String(e.fields.backup_type ?? "").toLowerCase().includes("offsite"),
    )

    if (!hasOffsite) {
      seen.add(system)
      const latest = input.entries
        .filter((e) => e.entityKey === rule.entity && String(e.fields.system ?? "") === system)
        .sort((a, b) => {
          const aDate = typeof a.occurredAt === "string" ? a.occurredAt : a.occurredAt.toISOString()
          const bDate = typeof b.occurredAt === "string" ? b.occurredAt : b.occurredAt.toISOString()
          return bDate.localeCompare(aDate)
        })[0]
      if (latest) {
        results.push({ entryId: latest.id, fields: latest.fields })
      }
    }
  }

  return results
}

function interpolate(template: string, fields: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = fields[key]
    if (value === undefined || value === null) return `{${key}}`
    return String(value)
  })
}
