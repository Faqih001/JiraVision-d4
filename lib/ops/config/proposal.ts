// Document-to-config proposal engine (PR 11b).
//
// The ops importer can put rows into the schema a pack already has; it cannot extend that schema. This
// module is the other half: it asks Gemini to read a discipline's own SOP, workbook or checklist and write
// back the *definitions* that document actually states — new log entities and their fields, KPIs with the
// thresholds the paper commits to, playbook seeds, report sections, escalation rules.
//
// Two things make that safe enough to run against a live pack:
//
//   1. Nothing is stored here. The output is a proposal, diffed against the current config by
//      lib/ops/config/diff.ts and approved (or not) by a human through /dashboard/ops/config.
//   2. Nothing is invented. The prompt is the strict one — a field, enum value, threshold or frequency
//      the document does not state must be omitted, not inferred — and normaliseProposal() then refuses
//      the shapes that would break the engine: credential-shaped field names, enums with no closed value
//      list (which would reject every write), KPIs that count a source the pack does not log, and
//      aiPolicy, which is a privacy stance rather than something a workbook can propose.
//
// One Gemini call per document, through lib/ai/gemini.ts — the only door.

import { geminiJson } from "@/lib/ai/gemini"
import { CREDENTIAL_KEY } from "@/lib/registers/fields"
import type { OpsConfigValidated } from "@/lib/packs/ops/validator"
import type {
  AutomationTemplate,
  FieldDefinition,
  FieldType,
  KpiDefinition,
  LogEntity,
  PlaybookSeed,
  RecommendRule,
  ReportTemplate,
} from "@/lib/packs/ops/types"
import { emptyProposal, type ConfigProposal, type RejectedEntry } from "./diff"

export type ProposePromptMeta = {
  discipline: string
}

export type ProposalOutcome = {
  proposal: ConfigProposal
  rejected: RejectedEntry[]
}

const FIELD_TYPES: FieldType[] = ["string", "text", "number", "date", "datetime", "enum"]
const AGGREGATIONS = ["count", "sum", "average", "ratio"]
const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly"]
const RULE_PRIORITIES = ["Critical", "High", "Medium", "Low"]
const ACTION_TYPES = ["create_ticket", "escalate_ticket", "send_notification", "create_task"]

const MAX_ENTITIES = 10
const MAX_FIELDS_PER_ENTITY = 25
const MAX_KPIS = 20
const MAX_ITEMS_PER_SECTION = 10
/** Register items are the one source a KPI may count besides this pack's own entities. */
const ALLOWED_EXTRA_SOURCES = ["register_items"]

const PROPOSAL_SCHEMA = {
  type: "object" as const,
  properties: {
    logs: {
      type: "object",
      propertyOrdering: undefined,
      additionalProperties: {
        type: "object",
        properties: {
          label: { type: "string" },
          fields: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                type: { type: "string", enum: FIELD_TYPES },
                label: { type: "string" },
                required: { type: "boolean" },
                default: { type: "string" },
                values: { type: "array", items: { type: "string" } },
              },
              propertyOrdering: ["type", "label", "required", "default", "values"],
            },
          },
        },
        propertyOrdering: ["label", "fields"],
      },
    },
    kpis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          source: { type: "string" },
          aggregation: { type: "string", enum: AGGREGATIONS },
          field: { type: "string" },
          unit: { type: "string" },
          target: { type: "number" },
          numerator: { type: "object" },
          denominator: { type: "string" },
          filter: { type: "object" },
        },
        propertyOrdering: ["id", "label", "source", "aggregation", "field", "unit", "target", "numerator", "denominator", "filter"],
      },
    },
    playbookSeeds: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          frequency: { type: "string", enum: FREQUENCIES },
          method: { type: "array", items: { type: "string" } },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                steps: { type: "array", items: { type: "string" } },
              },
              propertyOrdering: ["name", "steps"],
            },
          },
        },
        propertyOrdering: ["id", "label", "frequency", "method", "phases"],
      },
    },
    reportTemplates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          period: { type: "string", enum: FREQUENCIES },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: { kpiId: { type: "string" }, label: { type: "string" } },
              propertyOrdering: ["kpiId", "label"],
            },
          },
        },
        propertyOrdering: ["id", "label", "period", "sections"],
      },
    },
    automationTemplates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          trigger: {
            type: "object",
            properties: {
              entity: { type: "string" },
              condition: { type: "string" },
              params: { type: "object" },
            },
            propertyOrdering: ["entity", "condition", "params"],
          },
          action: {
            type: "object",
            properties: { type: { type: "string", enum: ACTION_TYPES }, params: { type: "object" } },
            propertyOrdering: ["type", "params"],
          },
        },
        propertyOrdering: ["id", "label", "trigger", "action"],
      },
    },
    recommendRules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          entity: { type: "string" },
          condition: { type: "string" },
          params: { type: "object" },
          priority: { type: "string", enum: RULE_PRIORITIES },
          observation: { type: "string" },
          risk: { type: "string" },
          action: { type: "string" },
        },
        propertyOrdering: ["id", "label", "entity", "condition", "params", "priority", "observation", "risk", "action"],
      },
    },
  },
  propertyOrdering: ["logs", "kpis", "playbookSeeds", "reportTemplates", "automationTemplates", "recommendRules"],
}

function buildSystemPrompt(current: OpsConfigValidated, meta: ProposePromptMeta): string {
  const entityLines = Object.entries(current.logs).map(
    ([key, entity]) => `- "${key}" (${entity.label}): ${Object.keys(entity.fields).join(", ")}`,
  )
  const kpiLines = current.kpis.map((kpi) => `- "${kpi.id}" ${kpi.aggregation} on ${kpi.source}`).join("\n")

  return `You are writing the operations configuration for a ${meta.discipline} role pack, from a document that belongs to that discipline (an SOP, workbook, checklist set or log template).

You are defining the SCHEMA, not extracting records. The output is the set of things this discipline logs, how each is measured and what the document says must happen.

ALREADY CONFIGURED FOR THIS PACK — do not restate these, propose only what the document adds or contradicts:
LOG ENTITIES:
${entityLines.join("\n") || "- none"}

KPIs:
${kpiLines || "- none"}

RETURN ONLY THESE KEYS: logs, kpis, playbookSeeds, reportTemplates, automationTemplates, recommendRules.

logs — map of entityKey to { label, fields }. entityKey is snake_case ASCII. Each field is { type, label, required?, default?, values? } where type is one of ${FIELD_TYPES.join(", ")}, and "values" is the closed list for an enum.
kpis — { id, label, source, aggregation, unit } plus target/field/numerator/denominator/filter as needed. source must be one of the entity keys above or ${ALLOWED_EXTRA_SOURCES.join(", ")}. aggregation is one of ${AGGREGATIONS.join(", ")}: "average" and "sum" need field; "ratio" needs numerator and denominator.
playbookSeeds — { id, label, frequency, method, phases } where frequency is one of ${FREQUENCIES.join(", ")} and phases is [{ name, steps: [string] }]. This is a recurring runbook the document mandates, not a one-off procedure.
reportTemplates — { id, label, period, sections } where every section is { kpiId, label } and kpiId must exist among the KPIs above or the ones you are proposing.
automationTemplates — { id, label, trigger: { entity, condition, params }, action: { type, params } }. action.type is one of ${ACTION_TYPES.join(", ")}.
recommendRules — { id, label, entity, condition, params, priority, observation, risk, action }. priority is one of ${RULE_PRIORITIES.join(", ")}. observation, risk and action are the sentences the document gives for this situation.

RULES:
1. State only what the document states. A field name, enum value, threshold, frequency or retention period that the document does not give must be omitted — never inferred, never "typical for this role", never a number you think is reasonable.
2. A target on a KPI is allowed only where the document commits to that number ("98% uptime", "within 4 hours", "30 days retention"). If it does not, leave target out.
3. Never put a credential value in a definition — no password, token, API key, PIN or private key in any label, default or enum value. Where the document tracks a credential, define a field for where it is kept and who authorises it instead.
4. Every entity, KPI and template must be something this discipline would record or measure repeatedly. Do not propose one-off facts, names of people, or a definition per asset.
5. Prefer a few precise entities over many vague ones. Return empty arrays/objects for sections the document does not define.
6. Keep ids and keys under 40 characters, labels under 80, and enum values under 40.`
}

function buildUserPrompt(): string {
  return "Define the operations configuration this document establishes for the discipline. Return JSON only."
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/** snake_case, ASCII, leading letter — the shape the validator and the log routes both expect. */
function slug(value: unknown, max = 40): string | null {
  const raw = typeof value === "string" ? value : ""
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max)
  if (!cleaned) return null
  if (!/^[a-z]/.test(cleaned)) return null
  return cleaned
}

function normaliseField(
  fieldKey: string,
  raw: unknown,
  reject: (entry: RejectedEntry) => void,
): FieldDefinition | null {
  if (CREDENTIAL_KEY.test(fieldKey)) {
    reject({ section: "logs", key: fieldKey, reason: `"${fieldKey}" looks like a credential. Track where it is kept, not the value.` })
    return null
  }

  const value = asRecord(raw)
  const type = text(value.type, 20) as FieldType | null
  if (!type || !FIELD_TYPES.includes(type)) {
    reject({ section: "logs", key: fieldKey, reason: `field type must be one of ${FIELD_TYPES.join(", ")}.` })
    return null
  }

  const label = text(value.label, 80) ?? fieldKey
  const field: FieldDefinition = { type, label }

  if (value.required === true) field.required = true

  const def = text(value.default, 80)
  if (def !== null) field.default = type === "number" ? Number(def) : def

  if (type === "enum") {
    const values = asList(value.values)
      .map((entry) => text(entry, 40))
      .filter((entry): entry is string => entry !== null)
    if (values.length === 0) {
      // An enum with no closed list rejects every write in lib/ops/fields.ts, so it is worse than no field.
      reject({ section: "logs", key: fieldKey, reason: "an enum with no values would refuse every entry; state the closed list the document gives." })
      return null
    }
    field.values = values
    if (field.default !== undefined && !values.includes(String(field.default))) {
      delete field.default
    }
  }

  return field
}

function normaliseLogs(
  raw: unknown,
  proposal: ConfigProposal,
  reject: (entry: RejectedEntry) => void,
): void {
  for (const [rawKey, rawEntity] of Object.entries(asRecord(raw))) {
    if (Object.keys(proposal.logs).length >= MAX_ENTITIES) {
      reject({ section: "logs", key: rawKey, reason: `proposal is capped at ${MAX_ENTITIES} entities.` })
      continue
    }

    const key = slug(rawKey)
    if (!key) {
      reject({ section: "logs", key: rawKey, reason: "entity key must be snake_case ASCII starting with a letter." })
      continue
    }
    if (proposal.logs[key]) {
      reject({ section: "logs", key, reason: "the document proposed this entity twice; kept the first." })
      continue
    }

    const entity = asRecord(rawEntity)
    const fields: Record<string, FieldDefinition> = {}
    for (const [fieldKey, rawField] of Object.entries(asRecord(entity.fields))) {
      if (Object.keys(fields).length >= MAX_FIELDS_PER_ENTITY) {
        reject({ section: "logs", key, reason: `entity capped at ${MAX_FIELDS_PER_ENTITY} fields.` })
        continue
      }
      const normalisedKey = slug(fieldKey, 40)
      if (!normalisedKey) {
        reject({ section: "logs", key: fieldKey, reason: "field name must be snake_case ASCII." })
        continue
      }
      const field = normaliseField(normalisedKey, rawField, reject)
      if (field) fields[normalisedKey] = field
    }

    if (Object.keys(fields).length === 0) {
      reject({ section: "logs", key, reason: "the entity defined no usable fields." })
      continue
    }

    const entityDef: LogEntity = { label: text(entity.label, 80) ?? key, fields }
    proposal.logs[key] = entityDef
  }
}

function normaliseKpis(
  current: OpsConfigValidated,
  raw: unknown,
  proposal: ConfigProposal,
  reject: (entry: RejectedEntry) => void,
): void {
  const knownSources = new Set([...Object.keys(current.logs), ...ALLOWED_EXTRA_SOURCES])

  for (const entry of asList(raw)) {
    if (proposal.kpis.length >= MAX_KPIS) {
      reject({ section: "kpis", key: "?", reason: `proposal is capped at ${MAX_KPIS} KPIs.` })
      break
    }

    const value = asRecord(entry)
    const id = slug(value.id, 60) ?? null
    const label = text(value.label, 80)
    const aggregation = text(value.aggregation, 20)
    const source = slug(value.source, 40)

    if (!id || !label) {
      reject({ section: "kpis", key: String(value.id ?? "?"), reason: "a KPI needs an id and a label." })
      continue
    }
    if (proposal.kpis.some((kpi) => kpi.id === id)) {
      reject({ section: "kpis", key: id, reason: "the document proposed this KPI twice; kept the first." })
      continue
    }
    if (!aggregation || !AGGREGATIONS.includes(aggregation)) {
      reject({ section: "kpis", key: id, reason: `aggregation must be one of ${AGGREGATIONS.join(", ")}.` })
      continue
    }
    if (!source || (!knownSources.has(source) && !proposal.logs[source])) {
      reject({ section: "kpis", key: id, reason: `"${source ?? "none"}" is not an entity this pack logs.` })
      continue
    }

    const kpi: KpiDefinition = { id, label, source, aggregation: aggregation as KpiDefinition["aggregation"], unit: text(value.unit, 20) ?? "" }

    if (aggregation === "average" || aggregation === "sum") {
      const field = slug(value.field, 40)
      if (!field) {
        reject({ section: "kpis", key: id, reason: `${aggregation} needs a field to add up.` })
        continue
      }
      kpi.field = field
    }

    if (aggregation === "ratio") {
      if (!isRecord(value.numerator) || value.denominator === undefined) {
        reject({ section: "kpis", key: id, reason: "a ratio needs numerator and denominator." })
        continue
      }
      kpi.numerator = value.numerator as KpiDefinition["numerator"]
      kpi.denominator = typeof value.denominator === "number" ? value.denominator : String(value.denominator)
    }

    if (isRecord(value.filter) && Object.keys(value.filter).length > 0) {
      kpi.filter = value.filter as KpiDefinition["filter"]
    }

    // A threshold is the one number the document has to own outright.
    if (typeof value.target === "number" && Number.isFinite(value.target) && value.target >= 0) {
      kpi.target = value.target
    }

    proposal.kpis.push(kpi)
  }
}

function normaliseSeeds(raw: unknown, proposal: ConfigProposal, reject: (entry: RejectedEntry) => void): void {
  for (const entry of asList(raw)) {
    const value = asRecord(entry)
    const id = slug(value.id, 40)
    const label = text(value.label, 80)
    const frequency = text(value.frequency, 20)

    if (!id || !label) {
      reject({ section: "playbookSeeds", key: String(value.id ?? "?"), reason: "a seed needs an id and a label." })
      continue
    }
    if (!frequency || !FREQUENCIES.includes(frequency)) {
      reject({ section: "playbookSeeds", key: id, reason: `frequency must be one of ${FREQUENCIES.join(", ")} — the document has to state how often.` })
      continue
    }
    if (proposal.playbookSeeds.length >= MAX_ITEMS_PER_SECTION) {
      reject({ section: "playbookSeeds", key: id, reason: `proposal is capped at ${MAX_ITEMS_PER_SECTION} seeds.` })
      break
    }
    if (proposal.playbookSeeds.some((seed) => seed.id === id)) {
      reject({ section: "playbookSeeds", key: id, reason: "the document proposed this seed twice; kept the first." })
      continue
    }

    const method = asList(value.method)
      .map((step) => text(step, 40))
      .filter((step): step is string => step !== null)
    const phases = asList(value.phases)
      .map((phase) => {
        const record = asRecord(phase)
        const name = text(record.name, 40)
        const steps = asList(record.steps)
          .map((step) => text(step, 200))
          .filter((step): step is string => step !== null)
        return name && steps.length > 0 ? { name, steps } : null
      })
      .filter((phase): phase is { name: string; steps: string[] } => phase !== null)

    if (method.length === 0 || phases.length === 0) {
      reject({ section: "playbookSeeds", key: id, reason: "a seed needs the method and at least one phase with steps." })
      continue
    }

    proposal.playbookSeeds.push({ id, label, frequency: frequency as PlaybookSeed["frequency"], method, phases })
  }
}

function normaliseReportTemplates(
  current: OpsConfigValidated,
  raw: unknown,
  proposal: ConfigProposal,
  reject: (entry: RejectedEntry) => void,
): void {
  const kpiIds = new Set([...current.kpis.map((kpi) => kpi.id), ...proposal.kpis.map((kpi) => kpi.id)])

  for (const entry of asList(raw)) {
    const value = asRecord(entry)
    const id = slug(value.id, 40)
    const label = text(value.label, 80)
    const period = text(value.period, 20)

    if (!id || !label) {
      reject({ section: "reportTemplates", key: String(value.id ?? "?"), reason: "a template needs an id and a label." })
      continue
    }
    if (!period || !FREQUENCIES.includes(period)) {
      reject({ section: "reportTemplates", key: id, reason: `period must be one of ${FREQUENCIES.join(", ")}.` })
      continue
    }
    if (proposal.reportTemplates.length >= MAX_ITEMS_PER_SECTION) {
      reject({ section: "reportTemplates", key: id, reason: `proposal is capped at ${MAX_ITEMS_PER_SECTION} templates.` })
      break
    }
    if (proposal.reportTemplates.some((template) => template.id === id)) {
      reject({ section: "reportTemplates", key: id, reason: "the document proposed this template twice; kept the first." })
      continue
    }

    const sections = asList(value.sections)
      .map((section) => {
        const record = asRecord(section)
        const kpiId = slug(record.kpiId, 60)
        const sectionLabel = text(record.label, 80)
        if (!kpiId || !sectionLabel) return null
        if (!kpiIds.has(kpiId)) {
          reject({ section: "reportTemplates", key: `${id}.${kpiId}`, reason: "section names a KPI neither the pack nor the document defines." })
          return null
        }
        return { kpiId, label: sectionLabel }
      })
      .filter((section): section is ReportTemplate["sections"][number] => section !== null)

    if (sections.length === 0) {
      reject({ section: "reportTemplates", key: id, reason: "no section of this template points at a defined KPI." })
      continue
    }

    proposal.reportTemplates.push({ id, label, period: period as ReportTemplate["period"], sections })
  }
}

function normaliseAutomations(
  current: OpsConfigValidated,
  raw: unknown,
  proposal: ConfigProposal,
  reject: (entry: RejectedEntry) => void,
): void {
  const knownEntities = new Set([...Object.keys(current.logs), ...Object.keys(proposal.logs)])

  for (const entry of asList(raw)) {
    const value = asRecord(entry)
    const id = slug(value.id, 40)
    const label = text(value.label, 80)
    const trigger = asRecord(value.trigger)
    const action = asRecord(value.action)

    if (!id || !label) {
      reject({ section: "automationTemplates", key: String(value.id ?? "?"), reason: "an automation needs an id and a label." })
      continue
    }
    if (proposal.automationTemplates.length >= MAX_ITEMS_PER_SECTION) {
      reject({ section: "automationTemplates", key: id, reason: `proposal is capped at ${MAX_ITEMS_PER_SECTION} automations.` })
      break
    }
    if (proposal.automationTemplates.some((template) => template.id === id)) {
      reject({ section: "automationTemplates", key: id, reason: "the document proposed this automation twice; kept the first." })
      continue
    }

    const entity = slug(trigger.entity, 40)
    const condition = text(trigger.condition, 40)
    const actionType = text(action.type, 30)

    if (!entity || !knownEntities.has(entity)) {
      reject({ section: "automationTemplates", key: id, reason: `trigger names "${entity ?? "nothing"}", which no entity logs.` })
      continue
    }
    if (!condition) {
      reject({ section: "automationTemplates", key: id, reason: "a trigger needs its condition." })
      continue
    }
    if (!actionType || !ACTION_TYPES.includes(actionType)) {
      reject({ section: "automationTemplates", key: id, reason: `action type must be one of ${ACTION_TYPES.join(", ")}.` })
      continue
    }

    const template: AutomationTemplate = {
      id,
      label,
      trigger: { entity, condition, params: paramStringRecord(trigger.params) },
      action: { type: actionType as AutomationTemplate["action"]["type"], params: paramStringRecord(action.params) },
    }
    proposal.automationTemplates.push(template)
  }
}

function normaliseRules(
  current: OpsConfigValidated,
  raw: unknown,
  proposal: ConfigProposal,
  reject: (entry: RejectedEntry) => void,
): void {
  const knownEntities = new Set([...Object.keys(current.logs), ...Object.keys(proposal.logs)])

  for (const entry of asList(raw)) {
    const value = asRecord(entry)
    const id = slug(value.id, 40)
    const label = text(value.label, 120)
    const entity = slug(value.entity, 40)
    const condition = text(value.condition, 40)
    const priority = text(value.priority, 20)

    if (!id || !label) {
      reject({ section: "recommendRules", key: String(value.id ?? "?"), reason: "a rule needs an id and a label." })
      continue
    }
    if (!entity || !knownEntities.has(entity)) {
      reject({ section: "recommendRules", key: id, reason: `rule watches "${entity ?? "nothing"}", which no entity logs.` })
      continue
    }
    if (!condition) {
      reject({ section: "recommendRules", key: id, reason: "a rule needs the condition that fires it." })
      continue
    }
    if (!priority || !RULE_PRIORITIES.includes(priority)) {
      reject({ section: "recommendRules", key: id, reason: `priority must be one of ${RULE_PRIORITIES.join(", ")}.` })
      continue
    }

    const observation = text(value.observation, 200)
    const risk = text(value.risk, 200)
    const action = text(value.action, 120)
    if (!observation || !risk || !action) {
      reject({ section: "recommendRules", key: id, reason: "a rule states what was observed, the risk and the action — in the document's own words." })
      continue
    }

    if (proposal.recommendRules.length >= MAX_ITEMS_PER_SECTION) {
      reject({ section: "recommendRules", key: id, reason: `proposal is capped at ${MAX_ITEMS_PER_SECTION} rules.` })
      break
    }
    if (proposal.recommendRules.some((rule) => rule.id === id)) {
      reject({ section: "recommendRules", key: id, reason: "the document proposed this rule twice; kept the first." })
      continue
    }

    const rule: RecommendRule = {
      id,
      label,
      entity,
      condition,
      params: paramStringRecord(value.params),
      priority: priority as RecommendRule["priority"],
      observation,
      risk,
      action,
    }
    proposal.recommendRules.push(rule)
  }
}

function paramStringRecord(raw: unknown): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(asRecord(raw))) {
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value
    else if (typeof value === "string") out[key] = value.trim().slice(0, 120)
  }
  return out
}

export function normaliseProposal(current: OpsConfigValidated, raw: unknown): ProposalOutcome {
  const rejected: RejectedEntry[] = []
  const reject = (entry: RejectedEntry) => rejected.push(entry)
  const body = asRecord(raw)

  if (body.aiPolicy !== undefined) {
    reject({ section: "aiPolicy", key: "aiPolicy", reason: "AI policy is a privacy stance the owner sets, not something a document can propose." })
  }

  const proposal = emptyProposal()
  normaliseLogs(body.logs, proposal, reject)
  normaliseKpis(current, body.kpis, proposal, reject)
  normaliseSeeds(body.playbookSeeds, proposal, reject)
  normaliseReportTemplates(current, body.reportTemplates, proposal, reject)
  normaliseAutomations(current, body.automationTemplates, proposal, reject)
  normaliseRules(current, body.recommendRules, proposal, reject)

  return { proposal, rejected }
}

export async function proposeConfigFromDocument(
  current: OpsConfigValidated,
  mimeType: string,
  base64Data: string,
  meta: ProposePromptMeta,
): Promise<ProposalOutcome> {
  const { data } = await geminiJson<unknown>(
    {
      system: buildSystemPrompt(current, meta),
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        { text: buildUserPrompt() },
      ],
      responseSchema: PROPOSAL_SCHEMA,
      timeoutMs: 120_000,
      thinkingBudget: 0,
      retries: 1,
    },
    (raw) => raw,
  )

  return normaliseProposal(current, data)
}
