import { describe, expect, it } from "vitest"
import { CAREER_SIGNAL_KEYS, type CareerSignalKey } from "@/lib/career/signals"
import {
  PREVIOUS_RUNG_CAP,
  computeReadiness,
  normaliseChecklist,
  type ChecklistItem,
  type Signoff,
} from "@/lib/career/readiness"

const item = (key: string): ChecklistItem => ({ key, label: key, hint: `${key} hint` })

const fullSignals = (value: number): Record<CareerSignalKey, number> =>
  Object.fromEntries(CAREER_SIGNAL_KEYS.map((key) => [key, value])) as Record<CareerSignalKey, number>

const fullTargets = (value = 10) => fullSignals(value)

const tick = (...keys: string[]): Signoff[] =>
  keys.map((itemKey) => ({ itemKey, status: "ticked" as const }))

const base = {
  signals: fullSignals(10),
  targets: fullTargets(),
  checklist: [item("a"), item("b")],
  signoffs: tick("a", "b"),
  currentLevel: null,
}

describe("computeReadiness weighting", () => {
  it("is 100 when every signal and item is met", () => {
    const result = computeReadiness(base)
    expect(result.percent).toBe(100)
    expect(result.signalPercent).toBe(100)
    expect(result.checklistPercent).toBe(100)
    expect(result.gaps).toEqual([])
    expect(result.met).toBe(true)
  })

  it("weights signals 70 and checklist 30", () => {
    const result = computeReadiness({
      ...base,
      checklist: [item("a"), item("b")],
      signoffs: tick("a"),
    })
    expect(result.checklistPercent).toBe(50)
    expect(result.percent).toBe(85)
  })

  it("counts a target of zero as met, not as unearnable", () => {
    const result = computeReadiness({
      ...base,
      signals: fullSignals(0),
      targets: {},
      checklist: [],
      signoffs: [],
    })
    expect(result.signalPercent).toBe(100)
    expect(result.checklistPercent).toBe(100)
    expect(result.percent).toBe(100)
  })

  it("reads a signal with no rows as zero", () => {
    const result = computeReadiness({ ...base, signals: {}, checklist: [], signoffs: [] })
    expect(result.signalPercent).toBe(0)
    expect(result.percent).toBe(30)
  })

  it("gives an empty checklist full credit rather than blocking the rung", () => {
    const result = computeReadiness({ ...base, checklist: [], signoffs: [] })
    expect(result.checklistPercent).toBe(100)
    expect(result.percent).toBe(100)
  })
})

describe("computeReadiness gaps", () => {
  it("lists signal gaps in registry order before checklist gaps", () => {
    const result = computeReadiness({
      ...base,
      signals: { ...fullSignals(10), days_logged_90: 5, tasks_completed_90: 0 },
      signoffs: tick("a"),
    })
    const kinds = result.gaps.map((gap) => gap.kind)
    expect(kinds).toEqual(["signal", "signal", "checklist"])
    expect(result.gaps[0].key).toBe("days_logged_90")
    expect(result.gaps[1].key).toBe("tasks_completed_90")
    expect(result.gaps[0]).toMatchObject({ actual: 5, target: 10 })
    expect(result.gaps[2]).toMatchObject({ key: "b", actual: 0, target: 1 })
    expect(result.gaps[2].hint).toBe("b hint")
    expect(result.met).toBe(false)
  })

  it("keeps a declined item as a gap", () => {
    const result = computeReadiness({
      ...base,
      signoffs: [{ itemKey: "a", status: "declined" }, { itemKey: "b", status: "ticked" }],
    })
    expect(result.checklistPercent).toBe(50)
    expect(result.gaps.map((gap) => gap.key)).toEqual(["a"])
  })

  it("skips a signal already at or above its target", () => {
    const result = computeReadiness({
      ...base,
      signals: { ...fullSignals(10), actions_logged_90: 40 },
    })
    expect(result.gaps).toEqual([])
  })
})

describe("the previous-rung cap", () => {
  const held = {
    level: 2,
    checklist: [item("held-a"), item("held-b")],
    signoffs: tick("held-a"),
  }

  it("clamps a fully-ready member to 59 until the held rung is signed off", () => {
    const result = computeReadiness({ ...base, currentLevel: held })
    expect(result.percent).toBe(PREVIOUS_RUNG_CAP)
    expect(result.capped).toBe(true)
    expect(result.capReason).toMatch(/Level 2/)
    expect(result.capReason).toMatch(/1 mandatory item open/)
  })

  it("never raises a low score: the cap is a ceiling, not a floor", () => {
    const result = computeReadiness({
      ...base,
      signals: {},
      checklist: [],
      signoffs: [],
      currentLevel: held,
    })
    expect(result.percent).toBe(30)
    expect(result.capped).toBe(true)
  })

  it("releases the cap once the held rung is signed off", () => {
    const result = computeReadiness({
      ...base,
      currentLevel: { ...held, signoffs: tick("held-a", "held-b") },
    })
    expect(result.capped).toBe(false)
    expect(result.capReason).toBeNull()
    expect(result.percent).toBe(100)
  })

  it("does not cap a first placement, which holds no rung", () => {
    expect(computeReadiness(base).capped).toBe(false)
  })
})

describe("computeReadiness input hygiene", () => {
  it("cannot be handed a percent", () => {
    const honest = computeReadiness({ ...base, signals: fullSignals(5) })
    const injected = computeReadiness({ ...base, signals: fullSignals(5), percent: 100 } as never)
    expect(injected.percent).toBe(honest.percent)
    expect(injected.percent).not.toBe(100)
  })

  it("ignores malformed checklist rows read from jsonb", () => {
    const result = computeReadiness({
      ...base,
      checklist: [{ key: "a", label: "A", hint: "" }, { key: "" }, null, "x", { key: "a", label: "dup" }] as never,
      signoffs: tick("a"),
    })
    expect(result.checklistPercent).toBe(100)
  })
})

describe("normaliseChecklist", () => {
  it("keeps the first matching key and fills a missing hint", () => {
    expect(
      normaliseChecklist([
        { key: "a", label: "A", hint: "hint" },
        { key: "a", label: "Again" },
        { key: "b", label: "B" },
      ]),
    ).toEqual([
      { key: "a", label: "A", hint: "hint" },
      { key: "b", label: "B", hint: "" },
    ])
  })

  it("returns an empty list for non-arrays", () => {
    expect(normaliseChecklist({ key: "a" })).toEqual([])
    expect(normaliseChecklist(null)).toEqual([])
  })
})
