// Zod validator for OpsConfig.
// Every pack's opsConfig is validated against this schema before it is stored or read.
// The validator is strict: unknown keys are rejected, enums are closed, and every
// cross-field rule (e.g. ratio KPIs must have numerator + denominator) is enforced.

import { z } from "zod"

// ---- Field types -------------------------------------------------------------

const fieldType = z.enum(["string", "text", "number", "date", "datetime", "enum"])

export const fieldDefinitionSchema = z.object({
  type: fieldType,
  label: z.string().min(1).max(80),
  required: z.boolean().optional(),
  default: z.union([z.string(), z.number()]).optional(),
  values: z.array(z.string().min(1).max(40)).min(1).optional(),
})

// ---- Log entities ------------------------------------------------------------

export const logEntitySchema = z.object({
  label: z.string().min(1).max(80),
  fields: z.record(z.string().min(1).max(40), fieldDefinitionSchema),
})

// ---- KPI definitions ---------------------------------------------------------

const kpiFilterValue = z.union([z.string(), z.array(z.string()), z.literal("in_month"), z.literal("not_null")])

export const kpiFilterSchema = z.record(z.string(), kpiFilterValue)

const aggregationType = z.enum(["count", "sum", "average", "ratio"])

export const kpiDefinitionSchema = z
  .object({
    id: z.string().min(1).max(60),
    label: z.string().min(1).max(80),
    source: z.string().min(1).max(40),
    filter: kpiFilterSchema.optional(),
    aggregation: aggregationType,
    field: z.string().optional(),
    numerator: kpiFilterSchema.optional(),
    denominator: z.union([z.string(), z.number()]).optional(),
    target: z.number().min(0).optional(),
    unit: z.string().min(1).max(20),
  })
  .refine(
    (kpi) => {
      if (kpi.aggregation === "ratio") {
        return kpi.numerator !== undefined && kpi.denominator !== undefined
      }
      return true
    },
    { message: "Ratio KPIs must have numerator and denominator" },
  )
  .refine(
    (kpi) => {
      if (kpi.aggregation === "average" || kpi.aggregation === "sum") {
        return kpi.field !== undefined
      }
      return true
    },
    { message: "Average/sum KPIs must specify a field" },
  )

// ---- Playbook seeds ----------------------------------------------------------

const playbookPhaseSchema = z.object({
  name: z.string().min(1).max(40),
  steps: z.array(z.string().min(1).max(200)).min(1),
})

export const playbookSeedSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  method: z.array(z.string().min(1).max(40)).min(1),
  phases: z.array(playbookPhaseSchema).min(1),
})

// ---- Report templates --------------------------------------------------------

const reportSectionSchema = z.object({
  kpiId: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
})

export const reportTemplateSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  period: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  sections: z.array(reportSectionSchema).min(1),
})

// ---- Automation templates ----------------------------------------------------

const automationTriggerSchema = z.object({
  entity: z.string().min(1).max(40),
  condition: z.string().min(1).max(40),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
})

const automationActionSchema = z.object({
  type: z.enum(["create_ticket", "escalate_ticket", "send_notification", "create_task"]),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
})

export const automationTemplateSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  trigger: automationTriggerSchema,
  action: automationActionSchema,
})

// ---- Recommendation rules ----------------------------------------------------

export const recommendRuleSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(120),
  entity: z.string().min(1).max(40),
  condition: z.string().min(1).max(40),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
  observation: z.string().min(1).max(200),
  risk: z.string().min(1).max(200),
  action: z.string().min(1).max(120),
})

// ---- AI policy ---------------------------------------------------------------

export const aiPolicySchema = z.object({
  level: z.enum(["none", "standard", "advanced"]),
  excludedEntities: z.array(z.string()),
  adminReadAccess: z.boolean(),
  managerReadAccess: z.boolean(),
})

// ---- Top-level OpsConfig -----------------------------------------------------

export const opsConfigSchema = z.object({
  logs: z.record(z.string().min(1).max(40), logEntitySchema).refine(
    (logs) => Object.keys(logs).length > 0,
    { message: "OpsConfig must have at least one log entity" },
  ),
  kpis: z.array(kpiDefinitionSchema).min(1, "OpsConfig must have at least one KPI"),
  playbookSeeds: z.array(playbookSeedSchema).optional(),
  reportTemplates: z.array(reportTemplateSchema).optional(),
  automationTemplates: z.array(automationTemplateSchema).optional(),
  recommendRules: z.array(recommendRuleSchema).optional(),
  aiPolicy: aiPolicySchema.optional(),
})

// ---- Validation helper -------------------------------------------------------

export type OpsConfigInput = z.input<typeof opsConfigSchema>
export type OpsConfigValidated = z.output<typeof opsConfigSchema>

export function validateOpsConfig(data: unknown): OpsConfigValidated {
  return opsConfigSchema.parse(data)
}

export function safeValidateOpsConfig(data: unknown): { success: true; data: OpsConfigValidated } | { success: false; error: z.ZodError } {
  const result = opsConfigSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
