// The method and the step model, pure so the six-step default, the reorder/clone rules and
// the run drafts are all testable without a database. JSON keys follow the design's step
// shape verbatim: the editor, the API and the printed sheet hand the same objects around.

export const SIX_STEP_METHOD = [
  "Identify",
  "Reproduce",
  "Diagnose",
  "Fix",
  "Test",
  "Document",
] as const

export type PlaybookStep = {
  order: number
  phase: string
  action: string
  checks: string[]
  expected: string
  precautions: string[]
  warnings: string[]
  ppe: string[]
  tools_parts: string[]
  time_estimate: string
  stop_condition: string
  escalation: string
  evidence_to_record: string
}

const MAX_PHASES = 12
const MAX_PHASE_LENGTH = 40
const MAX_STEPS = 200
const MAX_ACTION = 500
const MAX_TEXT = 500
const MAX_TIME = 40
const MAX_LIST_ENTRIES = 20
const MAX_LIST_ENTRY = 200
const MAX_NOTE = 4000

const stringsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const text = entry.trim()
    if (text) out.push(text)
  }
  return out
}

/** Rows arrive as jsonb; unusable phases are dropped rather than thrown on. */
export function normaliseMethod(value: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const phase of stringsOf(value)) {
    const key = phase.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(phase)
  }
  return out
}

/** A pack's method wins; the six-step list is the fallback, in the order it is written. */
export function defaultMethod(value: unknown): string[] {
  const method = normaliseMethod(value)
  return method.length > 0 ? method : [...SIX_STEP_METHOD]
}

export type MethodRead = { ok: true; value: string[] } | { ok: false; error: string }

export function readMethod(value: unknown): MethodRead {
  if (!Array.isArray(value)) return { ok: false, error: "method must be an array of phases." }
  if (value.length === 0) return { ok: false, error: "method must list at least one phase." }
  if (value.length > MAX_PHASES) {
    return { ok: false, error: `method may list at most ${MAX_PHASES} phases.` }
  }

  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") return { ok: false, error: "Every phase must be a string." }
    const phase = entry.trim()
    if (!phase || phase.length > MAX_PHASE_LENGTH) {
      return {
        ok: false,
        error: `Every phase must be 1-${MAX_PHASE_LENGTH} characters.`,
      }
    }
    const key = phase.toLowerCase()
    if (seen.has(key)) return { ok: false, error: "method phases must be distinct." }
    seen.add(key)
    out.push(phase)
  }
  return { ok: true, value: out }
}

function readList(value: unknown, label: string): { ok: true; value: string[] } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: [] }
  if (!Array.isArray(value)) return { ok: false, error: `${label} must be an array of strings.` }
  if (value.length > MAX_LIST_ENTRIES) {
    return { ok: false, error: `${label} may hold at most ${MAX_LIST_ENTRIES} entries.` }
  }
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") return { ok: false, error: `${label} must contain only strings.` }
    const text = entry.trim()
    if (!text) continue
    if (text.length > MAX_LIST_ENTRY) {
      return { ok: false, error: `Every ${label} entry must be at most ${MAX_LIST_ENTRY} characters.` }
    }
    out.push(text)
  }
  return { ok: true, value: out }
}

function readText(
  value: unknown,
  label: string,
  max: number,
  required = false,
): { ok: true; value: string } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return required
      ? { ok: false, error: `${label} is required.` }
      : { ok: true, value: "" }
  }
  if (typeof value !== "string") return { ok: false, error: `${label} must be a string.` }
  const text = value.trim()
  if (required && !text) return { ok: false, error: `${label} is required.` }
  if (text.length > max) {
    return { ok: false, error: `${label} must be at most ${max} characters.` }
  }
  return { ok: true, value: text }
}

export function emptyStep(phase: string, order: number): PlaybookStep {
  return {
    order,
    phase,
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

export type StepRead = { ok: true; value: PlaybookStep } | { ok: false; error: string }

/**
 * A step's phase must be one of the playbook's method phases, and every array is present
 * in the result even when the input omitted it — a printed sheet cannot render `undefined`.
 */
export function readStep(value: unknown, method: readonly string[], order: number): StepRead {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Each step must be an object." }
  }
  const raw = value as Record<string, unknown>

  const phase = typeof raw.phase === "string" ? raw.phase.trim() : ""
  if (!phase || !method.includes(phase)) {
    return { ok: false, error: `phase must be one of: ${method.join(", ")}.` }
  }

  const action = readText(raw.action, "action", MAX_ACTION, true)
  if (!action.ok) return action

  const expected = readText(raw.expected, "expected", MAX_TEXT)
  if (!expected.ok) return expected
  const time = readText(raw.time_estimate, "time_estimate", MAX_TIME)
  if (!time.ok) return time
  const stop = readText(raw.stop_condition, "stop_condition", MAX_TEXT)
  if (!stop.ok) return stop
  const escalation = readText(raw.escalation, "escalation", MAX_TEXT)
  if (!escalation.ok) return escalation
  const evidence = readText(raw.evidence_to_record, "evidence_to_record", MAX_TEXT)
  if (!evidence.ok) return evidence

  const checks = readList(raw.checks, "checks")
  if (!checks.ok) return checks
  const precautions = readList(raw.precautions, "precautions")
  if (!precautions.ok) return precautions
  const warnings = readList(raw.warnings, "warnings")
  if (!warnings.ok) return warnings
  const ppe = readList(raw.ppe, "ppe")
  if (!ppe.ok) return ppe
  const tools = readList(raw.tools_parts, "tools_parts")
  if (!tools.ok) return tools

  return {
    ok: true,
    value: {
      order,
      phase,
      action: action.value,
      checks: checks.value,
      expected: expected.value,
      precautions: precautions.value,
      warnings: warnings.value,
      ppe: ppe.value,
      tools_parts: tools.value,
      time_estimate: time.value,
      stop_condition: stop.value,
      escalation: escalation.value,
      evidence_to_record: evidence.value,
    },
  }
}

export type StepsRead = { ok: true; value: PlaybookStep[] } | { ok: false; error: string }

export function readSteps(value: unknown, method: readonly string[]): StepsRead {
  if (value === undefined || value === null) return { ok: true, value: [] }
  if (!Array.isArray(value)) return { ok: false, error: "steps must be an array." }
  if (value.length > MAX_STEPS) {
    return { ok: false, error: `steps may hold at most ${MAX_STEPS} entries.` }
  }
  const out: PlaybookStep[] = []
  for (let index = 0; index < value.length; index += 1) {
    const parsed = readStep(value[index], method, index + 1)
    if (!parsed.ok) return { ok: false, error: `Step ${index + 1}: ${parsed.error}` }
    out.push(parsed.value)
  }
  return { ok: true, value: out }
}

/** The reader's tolerant path: malformed or out-of-method steps are dropped, never thrown. */
export function normaliseSteps(value: unknown, method: readonly string[]): PlaybookStep[] {
  if (!Array.isArray(value)) return []
  const out: PlaybookStep[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue
    const raw = entry as Record<string, unknown>
    const phase = typeof raw.phase === "string" ? raw.phase.trim() : ""
    if (!phase || !method.includes(phase)) continue
    const text = (key: string): string => (typeof raw[key] === "string" ? (raw[key] as string) : "")
    out.push({
      order: out.length + 1,
      phase,
      action: text("action"),
      checks: stringsOf(raw.checks),
      expected: text("expected"),
      precautions: stringsOf(raw.precautions),
      warnings: stringsOf(raw.warnings),
      ppe: stringsOf(raw.ppe),
      tools_parts: stringsOf(raw.tools_parts),
      time_estimate: text("time_estimate"),
      stop_condition: text("stop_condition"),
      escalation: text("escalation"),
      evidence_to_record: text("evidence_to_record"),
    })
  }
  return out
}

const renumber = (steps: readonly PlaybookStep[]): PlaybookStep[] =>
  steps.map((step, index) => ({ ...step, order: index + 1 }))

export function moveStep(steps: readonly PlaybookStep[], from: number, to: number): PlaybookStep[] {
  if (from === to) return renumber(steps)
  if (from < 0 || from >= steps.length || to < 0 || to >= steps.length) return renumber(steps)
  const next = [...steps]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return renumber(next)
}

export function cloneStep(steps: readonly PlaybookStep[], index: number): PlaybookStep[] {
  const step = steps[index]
  if (!step) return renumber(steps)
  const copy: PlaybookStep = {
    ...step,
    checks: [...step.checks],
    precautions: [...step.precautions],
    warnings: [...step.warnings],
    ppe: [...step.ppe],
    tools_parts: [...step.tools_parts],
  }
  const next = [...steps]
  next.splice(index + 1, 0, copy)
  return renumber(next)
}

export function removeStep(steps: readonly PlaybookStep[], index: number): PlaybookStep[] {
  if (index < 0 || index >= steps.length) return renumber(steps)
  return renumber(steps.filter((_, position) => position !== index))
}

export type RunPlaybook = {
  id: number
  title: string
  version: number
  discipline: string | null
  method: readonly string[]
}

export type RunDraft = {
  kind: "action"
  title: string
  body: string | null
  discipline: string | null
  playbookId: number
  playbookVersion: number
}

/** One row per method phase, each naming the version that was followed. */
export function runEntryDrafts(
  playbook: RunPlaybook,
  notes: Readonly<Record<string, string>> = {},
): RunDraft[] {
  return playbook.method.map((phase) => {
    const note = (notes[phase] ?? "").trim()
    return {
      kind: "action",
      title: `${playbook.title} — ${phase}`,
      body: note || null,
      discipline: playbook.discipline,
      playbookId: playbook.id,
      playbookVersion: playbook.version,
    }
  })
}

export type NotesRead = { ok: true; value: Record<string, string> } | { ok: false; error: string }

export function readRunNotes(value: unknown, method: readonly string[]): NotesRead {
  if (value === undefined || value === null) return { ok: true, value: {} }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "notes must be an object keyed by method phase." }
  }
  const out: Record<string, string> = {}
  for (const [phase, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!method.includes(phase)) {
      return { ok: false, error: `notes may only name method phases: ${method.join(", ")}.` }
    }
    if (typeof raw !== "string") return { ok: false, error: `The note for ${phase} must be a string.` }
    const note = raw.trim()
    if (note.length > MAX_NOTE) {
      return { ok: false, error: `The note for ${phase} must be at most ${MAX_NOTE} characters.` }
    }
    if (note) out[phase] = note
  }
  return { ok: true, value: out }
}
