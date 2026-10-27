import { describe, expect, it } from "vitest"
import { CAREER_SIGNAL_KEYS } from "@/lib/career/signals"
import {
  CAREER_LADDER,
  LADDER_DISCIPLINES,
  isLadderDiscipline,
  ladderLevel,
} from "@/lib/career/ladder-seed"

describe("career ladder seed", () => {
  it("seeds five disciplines x four rungs", () => {
    expect(LADDER_DISCIPLINES).toHaveLength(5)
    expect(CAREER_LADDER).toHaveLength(20)
  })

  it("gives every discipline contiguous levels 1 to 4", () => {
    for (const discipline of LADDER_DISCIPLINES) {
      const levels = CAREER_LADDER.filter((row) => row.discipline === discipline)
        .map((row) => row.level)
        .sort()
      expect(levels).toEqual([1, 2, 3, 4])
    }
  })

  it("gives every rung a unique title", () => {
    const titles = CAREER_LADDER.map((row) => row.title)
    expect(new Set(titles).size).toBe(CAREER_LADDER.length)
    for (const title of titles) expect(title.trim().length).toBeGreaterThan(0)
  })

  it("carries every signal key as a non-negative integer target", () => {
    for (const row of CAREER_LADDER) {
      expect(Object.keys(row.signals).sort()).toEqual([...CAREER_SIGNAL_KEYS].sort())
      for (const key of CAREER_SIGNAL_KEYS) {
        const target = row.signals[key]
        expect(Number.isInteger(target)).toBe(true)
        expect(target).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("never asks a higher rung for less than a lower one", () => {
    for (const discipline of LADDER_DISCIPLINES) {
      const rows = CAREER_LADDER.filter((row) => row.discipline === discipline).sort(
        (a, b) => a.level - b.level,
      )
      for (const key of CAREER_SIGNAL_KEYS) {
        const targets = rows.map((row) => row.signals[key])
        for (let i = 1; i < targets.length; i += 1) {
          expect(targets[i]).toBeGreaterThanOrEqual(targets[i - 1])
        }
      }
    }
  })

  it("publishes no band values", () => {
    for (const row of CAREER_LADDER) {
      expect(row.bandMin).toBeNull()
      expect(row.bandMax).toBeNull()
      expect(row.bandCurrency).toBeNull()
    }
  })

  it("gives every rung two or three checklist items with real wording", () => {
    for (const row of CAREER_LADDER) {
      expect(row.checklist.length).toBeGreaterThanOrEqual(2)
      expect(row.checklist.length).toBeLessThanOrEqual(3)
      for (const item of row.checklist) {
        expect(item.key.trim().length).toBeGreaterThan(0)
        expect(item.label.trim().length).toBeGreaterThan(0)
        expect(item.hint.trim().length).toBeGreaterThan(0)
      }
      expect(row.summary.trim().length).toBeGreaterThan(0)
      expect(row.expectations.trim().length).toBeGreaterThan(0)
    }
  })

  it("keeps checklist item keys unique across the whole ladder", () => {
    const keys = CAREER_LADDER.flatMap((row) => row.checklist.map((item) => item.key))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("ladder helpers", () => {
  it("recognises only the five ladder disciplines", () => {
    expect(isLadderDiscipline("developer")).toBe(true)
    expect(isLadderDiscipline("technician")).toBe(true)
    expect(isLadderDiscipline("astronaut")).toBe(false)
    expect(isLadderDiscipline(undefined)).toBe(false)
  })

  it("looks a rung up by discipline and level", () => {
    expect(ladderLevel("auditor", 3)?.title).toBe("Senior Auditor")
    expect(ladderLevel("auditor", 5)).toBeNull()
  })
})
