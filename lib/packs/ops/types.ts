// OpsConfig type definitions for the operations engine.
// Each role pack declares its opsConfig as data; this file defines the shape.
// Validated by lib/packs/ops/validator.ts using Zod.

// ---- Field types (ops_log_entries.fields JSONB) ------------------------------

export type FieldType = "string" | "text" | "number" | "date" | "datetime" | "enum"

export type FieldDefinition = {
  type: FieldType
  label: string
  required?: boolean
  default?: string | number
  values?: string[] // for enum fields
}

export type LogEntity = {
  label: string
  fields: Record<string, FieldDefinition>
}

// ---- KPI definitions ---------------------------------------------------------

export type AggregationType = "count" | "sum" | "average" | "ratio"

export type KpiFilter = {
  [field: string]: string | string[] | "in_month" | "not_null"
}

export type KpiDefinition = {
  id: string
  label: string
  source: string // entity_key from logs or "register_items"
  filter?: KpiFilter
  aggregation: AggregationType
  field?: string // for average/sum
  numerator?: KpiFilter // for ratio
  denominator?: string | number // for ratio: "count" or a fixed number
  target?: number
  unit: string
}

// ---- Playbook seeds ----------------------------------------------------------

export type PlaybookPhase = {
  name: string
  steps: string[]
}

export type PlaybookSeed = {
  id: string
  label: string
  frequency: "daily" | "weekly" | "monthly" | "quarterly"
  method: string[]
  phases: PlaybookPhase[]
}

// ---- Report templates --------------------------------------------------------

export type ReportSection = {
  kpiId: string
  label: string
}

export type ReportTemplate = {
  id: string
  label: string
  period: "daily" | "weekly" | "monthly" | "quarterly"
  sections: ReportSection[]
}

// ---- Automation templates ----------------------------------------------------

export type AutomationTrigger = {
  entity: string
  condition: string
  params: Record<string, string | number>
}

export type AutomationAction = {
  type: "create_ticket" | "escalate_ticket" | "send_notification" | "create_task"
  params: Record<string, string | number>
}

export type AutomationTemplate = {
  id: string
  label: string
  trigger: AutomationTrigger
  action: AutomationAction
}

// ---- Recommendation rules ----------------------------------------------------

export type RecommendRule = {
  id: string
  label: string
  entity: string
  condition: string
  params: Record<string, string | number>
  priority: "Critical" | "High" | "Medium" | "Low"
  observation: string
  risk: string
  action: string
}

// ---- AI policy ---------------------------------------------------------------

export type AiPolicy = {
  level: "none" | "standard" | "advanced"
  excludedEntities: string[]
  adminReadAccess: boolean
  managerReadAccess: boolean
}

// ---- Top-level OpsConfig -----------------------------------------------------

export type OpsConfig = {
  logs: Record<string, LogEntity>
  kpis: KpiDefinition[]
  playbookSeeds?: PlaybookSeed[]
  reportTemplates?: ReportTemplate[]
  automationTemplates?: AutomationTemplate[]
  recommendRules?: RecommendRule[]
  aiPolicy?: AiPolicy
}
