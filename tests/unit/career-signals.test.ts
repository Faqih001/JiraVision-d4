import { describe, expect, it } from "vitest"
import {
  CAREER_SIGNALS,
  CAREER_SIGNAL_KEYS,
  CAREER_WINDOW_DAYS,
  EMPTY_SIGNALS,
  isCareerSignalKey,
  normaliseSignals,
  normaliseTargets,
} from "@/lib/career/signals"

describe("career signal registry", () => {
  it("carries the nine signals once each", () => {
    expect(CAREER_SIGNAL_KEYS).toHaveLength(9)
    expect(new Set(CAREER_SIGNAL_KEYS).size).toBe(9)
    expect(CAREER_SIGNAL_KEYS).toEqual(CAREER_SIGNALS.map((signal) => signal.key))
  })

  it("gives every signal a label and a hint a member can check", () => {
    for (const signal of CAREER_SIGNALS) {
      expect(signal.label.trim().length).toBeGreaterThan(0)
      expect(signal.hint.trim().length).toBeGreaterThan(0)
    }
  })

  it("counts over the ninety-day window the design names", () => {
    expect(CAREER_WINDOW_DAYS).toBe(90)
  })

  it("has a zero for every key, so no bar can be undefined", () => {
    expect(Object.keys(EMPTY_SIGNALS).sort()).toEqual([...CAREER_SIGNAL_KEYS].sort())
    expect(Object.values(EMPTY_SIGNALS).every((value) => value === 0)).toBe(true)
  })

  it("recognises registry keys and nothing else", () => {
    expect(isCareerSignalKey("days_logged_90")).toBe(true)
    expect(isCareerSignalKey("days_logged_91")).toBe(false)
    expect(isCareerSignalKey(null)).toBe(false)
  })
})

describe("normaliseSignals", () => {
  it("reads a missing signal as zero, never null", () => {
    const signals = normaliseSignals({ days_logged_90: null, actions_logged_90: undefined })
    expect(signals.days_logged_90).toBe(0)
    expect(signals.actions_logged_90).toBe(0)
    expect(signals.tasks_completed_90).toBe(0)
  })

  it("returns all zeros for nothing at all", () => {
    expect(normaliseSignals(null)).toEqual(EMPTY_SIGNALS)
    expect(normaliseSignals(undefined)).toEqual(EMPTY_SIGNALS)
  })

  it("drops negatives, NaN and infinity instead of passing them to the meter", () => {
    const signals = normaliseSignals({
      days_logged_90: -4,
      actions_logged_90: Number.NaN,
      reviews_logged_90: Number.POSITIVE_INFINITY,
    })
    expect(signals.days_logged_90).toBe(0)
    expect(signals.actions_logged_90).toBe(0)
    expect(signals.reviews_logged_90).toBe(0)
  })

  it("truncates fractions rather than showing a half action", () => {
    expect(normaliseSignals({ actions_logged_90: 12.9 }).actions_logged_90).toBe(12)
  })

  it("ignores keys the registry does not know", () => {
    const signals = normaliseSignals({ salary: 999 } as Record<string, number>)
    expect(signals).toEqual(EMPTY_SIGNALS)
  })
})

describe("normaliseTargets", () => {
  it("keeps only registry keys with a finite non-negative target", () => {
    expect(
      normaliseTargets({ days_logged_90: 20, actions_logged_90: -1, reviews_logged_90: 3.7, nope: 5 }),
    ).toEqual({ days_logged_90: 20, reviews_logged_90: 3 })
  })

  it("treats malformed stored jsonb as no targets", () => {
    expect(normaliseTargets("nonsense")).toEqual({})
    expect(normaliseTargets(null)).toEqual({})
  })
})
