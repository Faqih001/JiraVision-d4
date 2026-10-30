// Config diffing and merging for the ops engine (PR 11b).
//
// A document can teach the engine new rules — an entity a discipline logs, a KPI threshold the SOP
// actually states, a checklist it mandates — but it must never silently rewrite the ones already in
// use, because rows are already being logged against them. So a proposal is compared against the
// pack's current config item by item and every item gets a status:
//
//   new        — the key or id does not exist yet; applying it only adds.
//   conflict   — the key or id exists with different content; applying it replaces, and says so.
//   duplicate  — the key or id exists with identical content; applying it changes nothing.
//
// The merge is additive-only by construction: it walks the proposal and copies the selected items
// into a copy of the current config, so no unselected item and no existing definition can be dropped
// by omission. A proposal has no way to express "delete this".
//
// Whatever comes out of a merge is run through the same Zod validator the seed script uses, so a
// document can never put a config on the database that hand-authored code would have failed.

import type {
  AutomationTemplate,
  KpiDefinition,
  LogEntity,
  OpsConfig,
  PlaybookSeed,
  RecommendRule,
  ReportTemplate,
} from "@/lib/packs/ops/types"
import { safeValidateOpsConfig, type OpsConfigValidated } from "@/lib/packs/ops/validator"

export type ProposalSection =
  | "logs"
  | "kpis"
  | "playbookSeeds"
  | "reportTemplates"
  | "automationTemplates"
  | "recommendRules"

export const PROPOSAL_SECTIONS: ProposalSection[] = [
  "logs",
  "kpis",
  "playbookSeeds",
  "reportTemplates",
  "automationTemplates",
  "recommendRules",
]

export type ConfigProposal = {
  logs: Record<string, LogEntity>
  kpis: KpiDefinition[]
  playbookSeeds: PlaybookSeed[]
  reportTemplates: ReportTemplate[]
  automationTemplates: AutomationTemplate[]
  recommendRules: RecommendRule[]
}

export type ProposalStatus = "new" | "conflict" | "duplicate"

export type ProposalItem = {
  /** Stable selection handle: `<section>:<key>`. Ids repeat across sections, refs do not. */
  ref: string
  section: ProposalSection
  key: string
  label: string
  status: ProposalStatus
  differences: string[]
}

export type RejectedEntry = {
  section: ProposalSection | "aiPolicy"
  key: string
  reason: string
}

export type ConfigDiff = {
  items: ProposalItem[]
  rejected: RejectedEntry[]
  counts: Record<ProposalStatus, number>
}

export function emptyProposal(): ConfigProposal {
  return {
    logs: {},
    kpis: [],
    playbookSeeds: [],
    reportTemplates: [],
    automationTemplates: [],
    recommendRules: [],
  }
}

export function proposalIsEmpty(proposal: ConfigProposal): boolean {
  return (
    Object.keys(proposal.logs).length === 0 &&
    proposal.kpis.length === 0 &&
    proposal.playbookSeeds.length === 0 &&
    proposal.reportTemplates.length === 0 &&
    proposal.automationTemplates.length === 0 &&
    proposal.recommendRules.length === 0
  )
}

export function proposalCount(proposal: ConfigProposal): number {
  return (
    Object.keys(proposal.logs).length +
    proposal.kpis.length +
    proposal.playbookSeeds.length +
    proposal.reportTemplates.length +
    proposal.automationTemplates.length +
    proposal.recommendRules.length
  )
}

export function refFor(section: ProposalSection, key: string): string {
  return `${section}:${key}`
}

function entityLabel(key: string, entity: LogEntity): string {
  return entity.label?.trim() || key
}

function describeDifferences(current: unknown, proposed: unknown, prefix = ""): string[] {
  const lines: string[] = []

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)

  if (isRecord(current) && isRecord(proposed)) {
    const keys = new Set([...Object.keys(current), ...Object.keys(proposed)])
    for (const key of keys) {
      const path = prefix ? `${prefix}.${key}` : key
      const before = current[key]
      const after = proposed[key]
      if (JSON.stringify(before) === JSON.stringify(after)) continue
      if (isRecord(before) && isRecord(after)) {
        lines.push(...describeDifferences(before, after, path))
      } else {
        lines.push(`${path}: ${formatSide(before)} -> ${formatSide(after)}`)
      }
    }
    return lines
  }

  if (Array.isArray(current) && Array.isArray(proposed)) {
    for (let index = 0; index < Math.max(current.length, proposed.length); index++) {
      const path = `${prefix}[${index}]`
      if (JSON.stringify(current[index]) === JSON.stringify(proposed[index])) continue
      lines.push(`${path}: ${formatSide(current[index])} -> ${formatSide(proposed[index])}`)
    }
    return lines
  }

  lines.push(`${prefix || "value"}: ${formatSide(current)} -> ${formatSide(proposed)}`)
  return lines
}

function formatSide(value: unknown): string {
  if (value === undefined) return "absent"
  if (Array.isArray(value)) return `[${value.map(formatSide).join(", ")}]`
  if (value === null) return "null"
  if (typeof value === "object") {
    const field = value as Record<string, unknown>
    if (typeof field.type === "string") return describeField(field)
    return `${Object.keys(field).length} keys`
  }
  return String(value)
}

/**
 * A log field's whole contract is its type, its closed enum list and whether it must be filled in —
 * collapsing it to "3 keys" would hide the one thing a reviewer has to check before approving.
 */
function describeField(field: Record<string, unknown>): string {
  const type = field.type as string
  const values = Array.isArray(field.values) ? ` ${formatSide(field.values)}` : ""
  const required = field.required === true ? ", required" : ""
  return `${type}${values}${required}`
}

const MAX_DIFF_LINES = 8

function differences(current: unknown, proposed: unknown): string[] {
  const all = describeDifferences(current, proposed)
  if (all.length <= MAX_DIFF_LINES) return all
  return [...all.slice(0, MAX_DIFF_LINES), `+${all.length - MAX_DIFF_LINES} more`]
}

/**
 * Classify every proposed item against the config already in force.
 * Duplicates are reported, not hidden: an approval screen that silently drops half the model's
 * output reads like the model ignored the document.
 */
export function diffConfig(current: OpsConfig, proposal: ConfigProposal): ConfigDiff {
  const items: ProposalItem[] = []

  for (const [key, entity] of Object.entries(proposal.logs)) {
    const existing = current.logs[key]
    if (!existing) {
      items.push({ ref: refFor("logs", key), section: "logs", key, label: entityLabel(key, entity), status: "new", differences: [] })
      continue
    }
    const same = JSON.stringify(existing) === JSON.stringify(entity)
    items.push({
      ref: refFor("logs", key),
      section: "logs",
      key,
      label: entityLabel(key, entity),
      status: same ? "duplicate" : "conflict",
      differences: same ? [] : differences(existing, entity),
    })
  }

  const idItems = <T extends { id: string; label: string }>(
    section: ProposalSection,
    proposed: T[],
    existing: T[],
  ) => {
    const byId = new Map(existing.map((entry) => [entry.id, entry]))
    for (const entry of proposed) {
      const before = byId.get(entry.id)
      if (!before) {
        items.push({ ref: refFor(section, entry.id), section, key: entry.id, label: entry.label, status: "new", differences: [] })
        continue
      }
      const same = JSON.stringify(before) === JSON.stringify(entry)
      items.push({
        ref: refFor(section, entry.id),
        section,
        key: entry.id,
        label: entry.label,
        status: same ? "duplicate" : "conflict",
        differences: same ? [] : differences(before, entry),
      })
    }
  }

  idItems("kpis", proposal.kpis, current.kpis)
  idItems("playbookSeeds", proposal.playbookSeeds, current.playbookSeeds ?? [])
  idItems("reportTemplates", proposal.reportTemplates, current.reportTemplates ?? [])
  idItems("automationTemplates", proposal.automationTemplates, current.automationTemplates ?? [])
  idItems("recommendRules", proposal.recommendRules, current.recommendRules ?? [])

  const counts: Record<ProposalStatus, number> = { new: 0, conflict: 0, duplicate: 0 }
  for (const item of items) counts[item.status]++

  return { items, rejected: [], counts }
}

function mergeLogs(current: Record<string, LogEntity>, proposed: Record<string, LogEntity>, selected: Set<string>) {
  const out = { ...current }
  for (const [key, entity] of Object.entries(proposed)) {
    if (selected.has(refFor("logs", key))) out[key] = entity
  }
  return out
}

function mergeById<T extends { id: string }>(current: T[], proposed: T[], selected: Set<string>, section: ProposalSection): T[] {
  const out = [...current]
  for (const entry of proposed) {
    if (!selected.has(refFor(section, entry.id))) continue
    const index = out.findIndex((existing) => existing.id === entry.id)
    if (index === -1) out.push(entry)
    else out[index] = entry
  }
  return out
}

/**
 * Build the config that would go on the database. Items are taken from the typed proposal, never
 * from the diff metadata, and only the selected refs are copied in — so an unreviewed proposal
 * leaves the current config byte-for-byte intact.
 */
export function applySelection(current: OpsConfig, proposal: ConfigProposal, selectedRefs: string[]): OpsConfig {
  const selected = new Set(selectedRefs)
  const merged: OpsConfig = {
    ...current,
    logs: mergeLogs(current.logs, proposal.logs, selected),
    kpis: mergeById(current.kpis, proposal.kpis, selected, "kpis"),
  }

  const seeds = mergeById(current.playbookSeeds ?? [], proposal.playbookSeeds, selected, "playbookSeeds")
  const templates = mergeById(current.reportTemplates ?? [], proposal.reportTemplates, selected, "reportTemplates")
  const automations = mergeById(current.automationTemplates ?? [], proposal.automationTemplates, selected, "automationTemplates")
  const rules = mergeById(current.recommendRules ?? [], proposal.recommendRules, selected, "recommendRules")

  if (seeds.length) merged.playbookSeeds = seeds
  if (templates.length) merged.reportTemplates = templates
  if (automations.length) merged.automationTemplates = automations
  if (rules.length) merged.recommendRules = rules

  return merged
}

export type MergeResult =
  | { ok: true; config: OpsConfigValidated; applied: ProposalItem[] }
  | { ok: false; errors: string[] }

/**
 * Apply the selection and validate the result with the seed script's own schema. The error strings
 * are the Zod issue paths, because a human has to act on them.
 */
export function mergeAndValidate(
  current: OpsConfig,
  diff: ConfigDiff,
  proposal: ConfigProposal,
  selectedRefs: string[],
): MergeResult {
  const applied = diff.items.filter((item) => selectedRefs.includes(item.ref))
  const merged = applySelection(current, proposal, selectedRefs)
  const result = safeValidateOpsConfig(merged)

  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) }
  }

  return { ok: true, config: result.data, applied }
}
