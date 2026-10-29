// KPI computation engine: deterministic, rules-first.
// Reads ops_log_entries rows and computes every KPI declared in the pack's opsConfig.
// No AI, no estimation — every number comes from a row that exists.

import type { OpsConfigValidated } from "@/lib/packs/ops/validator"
import type { KpiDefinition, KpiFilter } from "@/lib/packs/ops/types"

export type OpsEntry = {
  id: number
  packKey: string
  entityKey: string
  ownerId: number
  occurredAt: string | Date
  status: string | null
  fields: Record<string, unknown>
  source: string
  createdAt: string | Date
}

export type KpiResult = {
  id: string
  label: string
  value: number
  target: number | null
  unit: string
  aggregation: string
  met: boolean | null
}

export type KpiComputationInput = {
  today: string // ISO date YYYY-MM-DD
  entries: OpsEntry[]
  registerItems?: RegisterItemRow[]
}

export type RegisterItemRow = {
  id: number
  kind: string
  fields: Record<string, unknown>
  lastVerifiedAt: string | null
}

/**
 * Compute all KPIs for a pack given the entries and (optionally) register items.
 */
export function computeKpis(config: OpsConfigValidated, input: KpiComputationInput): KpiResult[] {
  return config.kpis.map((kpi) => computeOneKpi(kpi, input))
}

function computeOneKpi(kpi: KpiDefinition, input: KpiComputationInput): KpiResult {
  const rows = resolveRows(kpi, input)
  const filtered = applyFilter(rows, kpi.filter, input.today)

  let value: number
  switch (kpi.aggregation) {
    case "count":
      value = filtered.length
      break
    case "sum":
      value = sumField(filtered, kpi.field!)
      break
    case "average":
      value = filtered.length > 0 ? sumField(filtered, kpi.field!) / filtered.length : 0
      break
    case "ratio": {
      const numeratorRows = applyFilter(filtered, kpi.numerator ?? {}, input.today)
      const denominator = kpi.denominator === "count" ? filtered.length : Number(kpi.denominator ?? 1)
      value = denominator > 0 ? numeratorRows.length / denominator : 0
      break
    }
    default:
      value = 0
  }

  const target = kpi.target ?? null
  const met = target !== null ? (kpi.aggregation === "ratio" ? value >= target : value >= target) : null

  return {
    id: kpi.id,
    label: kpi.label,
    value: Math.round(value * 1000) / 1000,
    target,
    unit: kpi.unit,
    aggregation: kpi.aggregation,
    met,
  }
}

function resolveRows(kpi: KpiDefinition, input: KpiComputationInput): Row[] {
  if (kpi.source === "register_items") {
    return (input.registerItems ?? []).map((row) => ({
      entityKey: "register_items",
      occurredAt: "",
      status: null,
      fields: { ...row.fields, kind: row.kind, last_verified_at: row.lastVerifiedAt },
    }))
  }
  return input.entries
    .filter((entry) => entry.entityKey === kpi.source)
    .map((entry) => ({
      entityKey: entry.entityKey,
      occurredAt: typeof entry.occurredAt === "string" ? entry.occurredAt : entry.occurredAt.toISOString(),
      status: entry.status,
      fields: entry.fields,
    }))
}

type Row = {
  entityKey: string
  occurredAt: string
  status: string | null
  fields: Record<string, unknown>
}

function applyFilter(rows: Row[], filter: KpiFilter | undefined, today: string): Row[] {
  if (!filter) return rows
  return rows.filter((row) => matchesFilter(row, filter, today))
}

function matchesFilter(row: Row, filter: KpiFilter, today: string): boolean {
  for (const [key, condition] of Object.entries(filter)) {
    const fieldValue = row.fields[key]

    if (condition === "in_month") {
      if (typeof fieldValue !== "string" || !fieldValue) return false
      const monthPrefix = today.slice(0, 7) // YYYY-MM
      if (!fieldValue.startsWith(monthPrefix)) return false
      continue
    }

    if (condition === "not_null") {
      if (fieldValue === null || fieldValue === undefined || fieldValue === "") return false
      continue
    }

    if (Array.isArray(condition)) {
      if (!condition.includes(String(fieldValue ?? ""))) return false
      continue
    }

    if (typeof condition === "string") {
      if (String(fieldValue ?? "") !== condition) return false
      continue
    }
  }
  return true
}

function sumField(rows: Row[], field: string): number {
  let total = 0
  for (const row of rows) {
    const value = row.fields[field]
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value
    } else if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) total += parsed
    }
  }
  return total
}

/**
 * Compute KPIs for a specific month (defaults to current month).
 */
export function computeMonthlyKpis(
  config: OpsConfigValidated,
  entries: OpsEntry[],
  month: string,
  registerItems?: RegisterItemRow[],
): KpiResult[] {
  const today = month.length === 7 ? `${month}-28` : month
  return computeKpis(config, { today, entries, registerItems })
}
