// The preview editor's pure side (the agent's handover door). The preview is local, so an edit
// is a real client-side change but never a write: commit re-runs the same validators the manual
// forms use. These helpers mirror those rules so a row the server is certain to skip cannot be
// silently committed — the server stays the gate, the client only gives the feedback early.

import type { PlaybookStep } from "@/lib/playbooks/method"
import { CREDENTIAL_KEY } from "@/lib/registers/fields"
import { isWorkDiscipline } from "@/lib/roles"
import type { HandoverPlaybookDraft, HandoverRegisterDraft } from "./handover"

export type FieldPair = { key: string; value: string }

const MAX_TITLE = 200
const MAX_FIELDS = 40

/** The draft keeps fields as a Record; the form edits ordered pairs. */
export function pairsFromFields(fields: Record<string, string>): FieldPair[] {
  return Object.entries(fields).map(([key, value]) => ({ key, value }))
}

export function fieldsFromPairs(pairs: readonly FieldPair[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of pairs) {
    const key = pair.key.trim()
    if (!key) continue
    out[key] = pair.value.trim()
  }
  return out
}

/** A register row the "Add" button can start from: a valid kind, member custody, no fields yet. */
export function blankRegister(kinds: readonly string[]): HandoverRegisterDraft {
  return {
    kind: kinds[0] ?? "",
    title: "",
    custody: "member",
    fields: {},
  }
}

/** A playbook draft that survives the manual form's checks even when the model proposed none. */
export function blankPlaybook(method: readonly string[]): HandoverPlaybookDraft {
  const phases = method.length > 0 ? [...method] : ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"]
  return {
    discipline: null,
    title: "",
    summary: null,
    scopeKind: null,
    method: phases,
    steps: [],
    precautions: [],
    recommendations: [],
    tags: [],
  }
}

/** One blank step for the step editor, ordered to its slot and keyed to a real method phase. */
export function stepFor(method: readonly string[], order: number): PlaybookStep {
  return {
    order,
    phase: method[0] ?? "Identify",
    action: "",
    checks: [],
    expected: "",
    precautions: [],
    warnings: [],
    ppe: [],
    tools_parts: [],
    time_estimate: "",
    stop_condition: "",
    escalation: "",
    evidence_to_record: "",
  }
}

/** Re-number after add/remove so the printed step order always matches the array order. */
export function renumberSteps(steps: readonly PlaybookStep[]): PlaybookStep[] {
  return steps.map((step, index) => ({ ...step, order: index + 1 }))
}

/**
 * Mirror of the register commit rules: title 1-200, a kind the pack lists, at most 40 fields and
 * no credential-shaped name. Each problem is a sentence the dialog shows; the server decides alone.
 */
export function registerDraftIssues(draft: HandoverRegisterDraft, kindKeys: readonly string[]): string[] {
  const issues: string[] = []
  const title = draft.title.trim()
  if (!title) issues.push("A title is required.")
  else if (title.length > MAX_TITLE) issues.push(`The title must be at most ${MAX_TITLE} characters.`)

  if (!kindKeys.includes(draft.kind)) issues.push("Choose a kind this role pack lists.")

  const keys = Object.keys(draft.fields)
  if (keys.length > MAX_FIELDS) issues.push(`A register row holds at most ${MAX_FIELDS} fields.`)
  for (const key of keys) {
    if (CREDENTIAL_KEY.test(key)) {
      issues.push(`"${key}" looks like a credential — record where it is kept instead.`)
    }
  }
  return issues
}

/**
 * Mirror of the playbook commit rules: a title, a discipline that is null or a known one, at least
 * one step, and every step naming a method phase with an action. Anything deeper (length caps) the
 * server refuses and reports in `skipped`, so we do not duplicate every bound here.
 */
export function playbookDraftIssues(draft: HandoverPlaybookDraft): string[] {
  const issues: string[] = []
  const title = draft.title.trim()
  if (!title) issues.push("A title is required.")
  else if (title.length > MAX_TITLE) issues.push(`The title must be at most ${MAX_TITLE} characters.`)

  if (draft.discipline !== null && !isWorkDiscipline(draft.discipline)) {
    issues.push("Choose a known discipline or clear it.")
  }

  if (draft.steps.length === 0) issues.push("Add at least one step.")
  draft.steps.forEach((step, index) => {
    if (!draft.method.includes(step.phase)) {
      issues.push(`Step ${index + 1}: phase must be one of ${draft.method.join(", ")}.`)
    }
    if (!step.action.trim()) issues.push(`Step ${index + 1}: an action is required.`)
  })
  return issues
}
