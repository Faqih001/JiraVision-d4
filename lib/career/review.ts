// Request lifecycle and admin input readers for the career ladder (design §11).
// Pure and DB-free on purpose: the routes call these, the tests call these, and
// nothing here knows about a database or a cookie.

import type { ChecklistItem } from "./readiness"
import { isCareerSignalKey, type CareerSignalTargets } from "./signals"

export const CAREER_REQUEST_STATUSES = ["draft", "submitted", "approved", "returned"] as const
export type CareerRequestStatus = (typeof CAREER_REQUEST_STATUSES)[number]

const OPEN_STATUSES: ReadonlySet<string> = new Set(["draft", "submitted"])

export function isCareerRequestStatus(value: unknown): value is CareerRequestStatus {
  return typeof value === "string" && (CAREER_REQUEST_STATUSES as readonly string[]).includes(value)
}

/** A request still being worked on or reviewed; a returned one is closed. */
export function isOpenRequest(status: unknown): boolean {
  return typeof status === "string" && OPEN_STATUSES.has(status)
}

export function canReview(status: unknown): boolean {
  return status === "submitted"
}

/** Promotion moves one rung at a time; 4 is the top and has no next. */
export function nextLevelOf(level: number): number | null {
  if (!Number.isInteger(level) || level < 1 || level >= 4) return null
  return level + 1
}

/** Newest row by requestedAt. Invalid dates are ignored, so a bad row cannot win. */
export function latestRequest<T extends { requestedAt: string | Date }>(
  rows: readonly T[],
): T | null {
  let latest: T | null = null
  let latestAt = Number.NEGATIVE_INFINITY
  for (const row of rows) {
    const at =
      row.requestedAt instanceof Date
        ? row.requestedAt.getTime()
        : new Date(row.requestedAt).getTime()
    if (Number.isFinite(at) && at > latestAt) {
      latest = row
      latestAt = at
    }
  }
  return latest
}

export const MAX_CHECKLIST_ITEMS = 20
export const MAX_CHECKLIST_KEY = 80
export const MAX_CHECKLIST_LABEL = 200
export const MAX_CHECKLIST_HINT = 300

export type ChecklistRead = { ok: true; items: ChecklistItem[] } | { ok: false; error: string }

const trimmed = (value: unknown): string | null =>
  typeof value === "string" ? value.trim() : null

/**
 * Stricter than normaliseChecklist: an admin edit that drops a malformed item is a
 * silent loss, so the editor is told which item is wrong instead.
 */
export function readChecklist(value: unknown): ChecklistRead {
  if (!Array.isArray(value)) {
    return { ok: false, error: "Checklist must be a list of items." }
  }
  if (value.length > MAX_CHECKLIST_ITEMS) {
    return { ok: false, error: `A rung can have at most ${MAX_CHECKLIST_ITEMS} checklist items.` }
  }

  const items: ChecklistItem[] = []
  const seen = new Set<string>()

  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `Checklist item ${index + 1} must be an object.` }
    }
    const record = entry as Record<string, unknown>

    const key = trimmed(record.key)
    if (!key) return { ok: false, error: `Checklist item ${index + 1} needs a key.` }
    if (key.length > MAX_CHECKLIST_KEY) {
      return { ok: false, error: `Checklist keys must be ${MAX_CHECKLIST_KEY} characters or fewer.` }
    }
    if (seen.has(key)) return { ok: false, error: "Checklist keys must be unique." }
    seen.add(key)

    const label = trimmed(record.label)
    if (!label) return { ok: false, error: `Checklist item ${index + 1} needs a label.` }
    if (label.length > MAX_CHECKLIST_LABEL) {
      return { ok: false, error: `Checklist labels must be ${MAX_CHECKLIST_LABEL} characters or fewer.` }
    }

    const hint = trimmed(record.hint) ?? ""
    if (hint.length > MAX_CHECKLIST_HINT) {
      return { ok: false, error: `Checklist hints must be ${MAX_CHECKLIST_HINT} characters or fewer.` }
    }

    items.push({ key, label, hint })
  }

  return { ok: true, items }
}

export const MAX_TARGET = 1_000_000

export type TargetsRead =
  | { ok: true; targets: CareerSignalTargets }
  | { ok: false; error: string }

/** Unknown keys are an error, not silently discarded — a typo must be visible. */
export function readTargets(value: unknown): TargetsRead {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Signal targets must be an object." }
  }

  const targets: CareerSignalTargets = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isCareerSignalKey(key)) {
      return { ok: false, error: `Unknown signal key: ${key}.` }
    }
    if (
      typeof raw !== "number" ||
      !Number.isFinite(raw) ||
      !Number.isInteger(raw) ||
      raw < 0 ||
      raw > MAX_TARGET
    ) {
      return {
        ok: false,
        error: `Target for ${key} must be a whole number between 0 and ${MAX_TARGET}.`,
      }
    }
    targets[key] = raw
  }

  return { ok: true, targets }
}
