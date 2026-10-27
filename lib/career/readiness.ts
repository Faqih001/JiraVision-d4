// The readiness number (design §11). Pure on purpose: it takes counts and sign-offs and
// returns a percentage, so the same inputs always produce the same number and no test
// needs a database. The number is computed here, server-side only; nothing accepts a
// percentage from a request body.

import {
  CAREER_SIGNAL_KEYS,
  signalHint,
  signalLabel,
  type CareerSignalKey,
  type CareerSignalTargets,
} from "./signals"

export type ChecklistItem = { key: string; label: string; hint: string }

/** A recorded decision on one checklist item. Declined stays a gap until re-ticked. */
export type Signoff = { itemKey: string; status: "ticked" | "declined" }

export type ReadinessGap = {
  kind: "signal" | "checklist"
  key: string
  label: string
  actual: number
  target: number
  hint: string
}

export type CareerReadiness = {
  percent: number
  capped: boolean
  capReason: string | null
  signalPercent: number
  checklistPercent: number
  gaps: ReadinessGap[]
  met: boolean
}

export type HeldLevel = {
  level: number
  checklist: readonly ChecklistItem[]
  signoffs: readonly Signoff[]
}

export type CareerReadinessInput = {
  /** Actual counts over the window; missing or null keys read 0. */
  signals: Partial<Record<CareerSignalKey, number | null | undefined>> | null | undefined
  /** Per-signal targets for the rung being assessed. */
  targets: CareerSignalTargets | null | undefined
  /** The checklist of the rung being assessed. */
  checklist: readonly ChecklistItem[] | null | undefined
  /** Sign-offs recorded for that rung. */
  signoffs: readonly Signoff[] | null | undefined
  /** The rung the member holds today; null for the first placement. */
  currentLevel: HeldLevel | null
}

export const SIGNAL_WEIGHT = 0.7
export const CHECKLIST_WEIGHT = 0.3
/** A member who has not signed off the rung they hold cannot show more than this. */
export const PREVIOUS_RUNG_CAP = 59

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const coverage = (actual: number, target: number) => {
  if (!Number.isFinite(target) || target <= 0) return 1
  return clamp01(actual / target)
}

const tickedKeys = (signoffs: readonly Signoff[] | null | undefined): Set<string> =>
  new Set((signoffs ?? []).filter((s) => s.status === "ticked").map((s) => s.itemKey))

/** Keep only well-formed items, first occurrence per key, so stored jsonb cannot break the meter. */
export function normaliseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: ChecklistItem[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue
    const candidate = entry as Record<string, unknown>
    const key = typeof candidate.key === "string" ? candidate.key.trim() : ""
    const label = typeof candidate.label === "string" ? candidate.label.trim() : ""
    if (!key || !label || seen.has(key)) continue
    seen.add(key)
    out.push({
      key,
      label,
      hint: typeof candidate.hint === "string" ? candidate.hint.trim() : "",
    })
  }
  return out
}

export function computeReadiness(input: CareerReadinessInput): CareerReadiness {
  const targets = input.targets ?? {}
  const checklist = normaliseChecklist(input.checklist)
  const ticked = tickedKeys(input.signoffs)

  let signalTotal = 0
  for (const key of CAREER_SIGNAL_KEYS) {
    const actual = typeof input.signals?.[key] === "number" ? Number(input.signals?.[key]) : 0
    signalTotal += coverage(Math.max(0, actual), targets[key] ?? 0)
  }
  const signalPercent = Math.round((signalTotal / CAREER_SIGNAL_KEYS.length) * 100)

  const tickedCount = checklist.filter((item) => ticked.has(item.key)).length
  // No checklist configured is complete, not unearnable.
  const checklistPercent =
    checklist.length === 0 ? 100 : Math.round((tickedCount / checklist.length) * 100)

  let percent = Math.round(signalPercent * SIGNAL_WEIGHT + checklistPercent * CHECKLIST_WEIGHT)

  const gaps: ReadinessGap[] = []
  for (const key of CAREER_SIGNAL_KEYS) {
    const target = targets[key] ?? 0
    const raw = input.signals?.[key]
    const actual = typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0
    if (target > 0 && actual < target) {
      gaps.push({
        kind: "signal",
        key,
        label: signalLabel(key),
        actual,
        target,
        hint: signalHint(key),
      })
    }
  }
  for (const item of checklist) {
    if (ticked.has(item.key)) continue
    gaps.push({
      kind: "checklist",
      key: item.key,
      label: item.label,
      actual: 0,
      target: 1,
      hint: item.hint,
    })
  }

  // The cap reads the rung the member holds, not the one they want: an unsign off
  // rung makes the next rung unreachable no matter how good the metrics look.
  let capped = false
  let capReason: string | null = null
  if (input.currentLevel) {
    const heldTicked = tickedKeys(input.currentLevel.signoffs)
    const open = input.currentLevel.checklist.filter((item) => !heldTicked.has(item.key))
    if (open.length > 0) {
      capped = true
      percent = Math.min(percent, PREVIOUS_RUNG_CAP)
      capReason = `Level ${input.currentLevel.level} still has ${open.length} mandatory item${
        open.length === 1 ? "" : "s"
      } open.`
    }
  }

  return {
    percent,
    capped,
    capReason,
    signalPercent,
    checklistPercent,
    gaps,
    met: gaps.length === 0 && percent >= 100,
  }
}
