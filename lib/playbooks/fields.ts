// The write boundary for a playbook. Only these fields reach the table: `source`, `status`,
// `version`, `authorId` and `aiMarked` are decided by the route, never by the body.

import { isWorkDiscipline } from "@/lib/roles"
import { defaultMethod, readMethod, readSteps, type PlaybookStep } from "./method"

export type PlaybookInput = {
  packKey: string
  discipline: string | null
  title: string
  summary: string | null
  scopeKind: string | null
  method: string[]
  steps: PlaybookStep[]
  precautions: string[]
  recommendations: string[]
  tags: string[]
  verifyIntervalDays: number | null
}

export type PlaybookInputRead = { ok: true; value: PlaybookInput } | { ok: false; error: string }

const MAX_TITLE = 200
const MAX_SUMMARY = 2000
const SCOPE_KIND = /^[a-z0-9][a-z0-9_]{0,39}$/

function readList(
  value: unknown,
  label: string,
  maxEntries: number,
  maxLength: number,
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: [] }
  if (!Array.isArray(value)) return { ok: false, error: `${label} must be an array of strings.` }
  if (value.length > maxEntries) {
    return { ok: false, error: `${label} may hold at most ${maxEntries} entries.` }
  }
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") return { ok: false, error: `${label} must contain only strings.` }
    const text = entry.trim()
    if (!text) continue
    if (text.length > maxLength) {
      return { ok: false, error: `Every ${label} entry must be at most ${maxLength} characters.` }
    }
    out.push(text)
  }
  return { ok: true, value: out }
}

export function readPlaybookInput(value: unknown, fallbackMethod: readonly string[]): PlaybookInputRead {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Playbook must be an object." }
  }
  const raw = value as Record<string, unknown>

  const packKey = typeof raw.packKey === "string" ? raw.packKey.trim() : ""
  if (!packKey) return { ok: false, error: "packKey is required." }

  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  if (!title || title.length > MAX_TITLE) {
    return { ok: false, error: `title must be 1-${MAX_TITLE} characters.` }
  }

  const summary =
    raw.summary === undefined || raw.summary === null
      ? null
      : typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : null
  if (summary && summary.length > MAX_SUMMARY) {
    return { ok: false, error: `summary must be at most ${MAX_SUMMARY} characters.` }
  }

  const discipline =
    raw.discipline === undefined || raw.discipline === null
      ? null
      : isWorkDiscipline(raw.discipline)
        ? raw.discipline
        : undefined
  if (discipline === undefined) {
    return { ok: false, error: "discipline must be null or a known work discipline." }
  }

  const scopeKind =
    raw.scopeKind === undefined || raw.scopeKind === null
      ? null
      : typeof raw.scopeKind === "string" && SCOPE_KIND.test(raw.scopeKind.trim())
        ? raw.scopeKind.trim()
        : undefined
  if (scopeKind === undefined) {
    return { ok: false, error: "scopeKind must be null or a lowercase kind key." }
  }

  let method: string[]
  if (raw.method === undefined || raw.method === null) {
    method = defaultMethod(fallbackMethod)
  } else {
    const parsed = readMethod(raw.method)
    if (!parsed.ok) return parsed
    method = parsed.value
  }

  const steps = readSteps(raw.steps, method)
  if (!steps.ok) return steps

  const precautions = readList(raw.precautions, "precautions", 50, 200)
  if (!precautions.ok) return precautions
  const recommendations = readList(raw.recommendations, "recommendations", 50, 200)
  if (!recommendations.ok) return recommendations
  const tags = readList(raw.tags, "tags", 20, 40)
  if (!tags.ok) return tags

  const interval =
    raw.verifyIntervalDays === undefined || raw.verifyIntervalDays === null
      ? null
      : raw.verifyIntervalDays
  if (
    interval !== null &&
    (typeof interval !== "number" || !Number.isInteger(interval) || interval < 0 || interval > 3650)
  ) {
    return { ok: false, error: "verifyIntervalDays must be a whole number of days between 0 and 3650." }
  }

  return {
    ok: true,
    value: {
      packKey,
      discipline,
      title,
      summary,
      scopeKind,
      method,
      steps: steps.value,
      precautions: precautions.value,
      recommendations: recommendations.value,
      tags: tags.value,
      verifyIntervalDays: interval,
    },
  }
}
