// Precautions, drafted but never silently adopted (design §12 item 5, §17 risk
// "a model-invented precaution"). The model sees the member's unsaved draft and returns
// advice with a reason; only text that is short, non-duplicated and free of credential
// requests survives. Nothing here writes — the editor decides what a human accepts.

import { z } from "zod"
import { GeminiError, type JsonSchema } from "@/lib/ai/gemini"
import { asksForCredentialValue } from "@/lib/registers/fields"

export type PrecautionDraft = {
  title: string
  summary: string | null
  method: string[]
  steps: { phase: string; action: string }[]
  existing: string[]
}

export type PrecautionSuggestion = { text: string; why: string }

const MAX_TITLE = 200
const MAX_SUMMARY = 2000
const MAX_PHASES = 12
const MAX_STEPS = 40
const MAX_TEXT = 500
const MAX_SUGGESTION = 200
const MAX_WHY = 240

export const PRECAUTIONS_SYSTEM = `You suggest safety precautions for a procedure.

- Every suggestion must follow only from the steps the caller lists. Do not invent equipment, hazards or regulations.
- Never ask for a credential value (password, token, key). A precaution about credentials says where they are kept.
- Return 3 to 6 suggestions. Each is one sentence of practice, plus one sentence saying which step or condition it protects.
- If the steps do not support any precaution, return an empty list rather than generic advice.`

export const PRECAUTIONS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, why: { type: "string" } },
        required: ["text", "why"],
      },
    },
  },
  required: ["suggestions"],
}

export function precautionsPrompt(draft: PrecautionDraft): string {
  const lines = [`Playbook: ${draft.title}`]
  if (draft.summary) lines.push(`Summary: ${draft.summary}`)
  lines.push(`Method: ${draft.method.join(" → ")}`, "", "Steps:")
  draft.steps.forEach((step, index) => {
    lines.push(`${index + 1}. [${step.phase}] ${step.action}`)
  })
  if (draft.existing.length > 0) {
    lines.push("", "Already written by a person (do not repeat):")
    draft.existing.forEach((entry) => lines.push(`- ${entry}`))
  }
  return lines.join("\n")
}

export type PrecautionDraftRead =
  | { ok: true; value: PrecautionDraft }
  | { ok: false; error: string }

export function readPrecautionDraft(value: unknown): PrecautionDraftRead {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "A playbook draft is required." }
  }
  const raw = value as Record<string, unknown>

  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  if (!title || title.length > MAX_TITLE) {
    return { ok: false, error: `title must be 1-${MAX_TITLE} characters.` }
  }

  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim().slice(0, MAX_SUMMARY)
      : null

  if (!Array.isArray(raw.method) || raw.method.length === 0 || raw.method.length > MAX_PHASES) {
    return { ok: false, error: `method must list 1-${MAX_PHASES} phases.` }
  }
  const method: string[] = []
  for (const entry of raw.method) {
    if (typeof entry !== "string" || !entry.trim() || entry.trim().length > 40) {
      return { ok: false, error: "Every method phase must be 1-40 characters." }
    }
    method.push(entry.trim())
  }

  if (!Array.isArray(raw.steps) || raw.steps.length === 0 || raw.steps.length > MAX_STEPS) {
    return { ok: false, error: `steps must hold 1-${MAX_STEPS} entries.` }
  }
  const steps: { phase: string; action: string }[] = []
  for (const entry of raw.steps) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: "Every step must be an object." }
    }
    const step = entry as Record<string, unknown>
    const phase = typeof step.phase === "string" ? step.phase.trim() : ""
    if (!method.includes(phase)) {
      return { ok: false, error: `phase must be one of: ${method.join(", ")}.` }
    }
    const action = typeof step.action === "string" ? step.action.trim() : ""
    if (!action || action.length > MAX_TEXT) {
      return { ok: false, error: `Every step needs an action of at most ${MAX_TEXT} characters.` }
    }
    steps.push({ phase, action })
  }

  const existing: string[] = []
  if (raw.existing !== undefined && raw.existing !== null) {
    if (!Array.isArray(raw.existing)) return { ok: false, error: "existing must be an array of strings." }
    for (const entry of raw.existing) {
      if (typeof entry !== "string") return { ok: false, error: "existing must hold only strings." }
      if (entry.trim()) existing.push(entry.trim().slice(0, MAX_SUGGESTION))
    }
  }

  return { ok: true, value: { title, summary, method, steps, existing } }
}

const suggestionsSchema = z.object({
  suggestions: z.array(
    z.object({ text: z.string().optional(), why: z.string().optional() }),
  ).default([]),
})

export function readPrecautions(
  raw: unknown,
  existing: readonly string[],
  max = 6,
): PrecautionSuggestion[] {
  let parsed: z.infer<typeof suggestionsSchema>
  try {
    parsed = suggestionsSchema.parse(raw)
  } catch {
    throw new GeminiError("badjson", "The precaution answer was not a list of suggestions.")
  }

  const seen = new Set(existing.map((entry) => entry.trim().toLowerCase()))
  const out: PrecautionSuggestion[] = []

  for (const entry of parsed.suggestions) {
    const text = (entry.text ?? "").trim()
    const why = (entry.why ?? "").trim()
    if (!text || text.length > MAX_SUGGESTION) continue
    if (!why || why.length > MAX_WHY) continue
    if (asksForCredentialValue(text) || asksForCredentialValue(why)) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ text, why })
    if (out.length >= max) break
  }

  if (out.length === 0) {
    throw new GeminiError("badjson", "No precaution survived the review rules.")
  }
  return out
}
