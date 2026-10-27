import { describe, expect, it } from "vitest"
import {
  GROWTH_ACTIONS,
  benchmarkPrompt,
  filterGrounded,
  isGrowthAction,
  learningPrompt,
  readBenchmark,
  readLearningPath,
  readTaskSuggestions,
} from "@/lib/career/growth"
import { EMPTY_SIGNALS } from "@/lib/career/signals"
import type { GrowthContext } from "@/lib/career/growth"

const context: GrowthContext = {
  memberName: "Amina",
  discipline: "developer",
  fromLevel: 2,
  currentTitle: "Intermediate Developer",
  toLevel: 3,
  nextTitle: "Senior Developer",
  nextSummary: "Owns a workstream end to end.",
  signals: { ...EMPTY_SIGNALS, days_logged_90: 12, actions_logged_90: 40 },
  targets: { days_logged_90: 40, actions_logged_90: 120 },
  readiness: {
    percent: 38,
    capped: false,
    capReason: null,
    signalPercent: 31,
    checklistPercent: 55,
    gaps: [
      {
        kind: "signal",
        key: "days_logged_90",
        label: "Days logged",
        actual: 12,
        target: 40,
        hint: "Distinct days with at least one work log entry.",
      },
    ],
    met: false,
  },
  history: [],
  asOfDay: "2026-10-27",
}

const grounding = {
  queries: ["nestjs advanced course"],
  sources: [
    { url: "https://example.com/course", title: "Course" },
    { url: "https://example.com/other", title: "Other" },
  ],
}

describe("growth actions", () => {
  it("accepts exactly the four actions", () => {
    expect(GROWTH_ACTIONS).toEqual(["learning", "benchmark", "review", "task_suggestions"])
    for (const action of GROWTH_ACTIONS) expect(isGrowthAction(action)).toBe(true)
    expect(isGrowthAction("promote")).toBe(false)
    expect(isGrowthAction(null)).toBe(false)
  })
})

describe("learning paths", () => {
  it("keeps only items whose URL is in the grounding metadata", () => {
    const read = readLearningPath({
      items: [
        { title: "Advanced NestJS", provider: "Acme", url: "https://example.com/course/", why: "Covers modules.", hours: 6 },
        { title: "Invented", url: "https://invented.example/x", why: "Not real." },
      ],
    })
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const filtered = filterGrounded(read.items, grounding)
    expect(filtered.dropped).toBe(1)
    expect(filtered.kept).toHaveLength(1)
    expect(filtered.kept[0]).toMatchObject({ title: "Advanced NestJS", url: "https://example.com/course" })
    expect(filtered.kept[0].provider).toBe("Acme")
  })

  it("drops every item when there is no grounding at all", () => {
    const read = readLearningPath({ items: [{ title: "X", url: "https://x.example", why: "y" }] })
    if (!read.ok) throw new Error(read.error)
    expect(filterGrounded(read.items, null).kept).toHaveLength(0)
  })

  it("rejects a malformed answer", () => {
    expect(readLearningPath({ items: [] }).ok).toBe(false)
    expect(readLearningPath({ items: [{ title: "", url: "", why: "" }] }).ok).toBe(false)
  })

  it("copies the counted numbers into the prompt", () => {
    const prompt = learningPrompt(context)
    expect(prompt.user).toContain("Days logged")
    expect(prompt.user).toContain("12 / 40")
    expect(prompt.user).toContain("Senior Developer")
    expect(prompt.system).toMatch(/Use Google Search/)
    expect(prompt.system).toMatch(/Never invent/)
  })
})

describe("benchmark suggestions", () => {
  it("accepts a whole-number range with a currency and sources", () => {
    const read = readBenchmark({
      min: 60000,
      max: 80000,
      currency: "usd",
      market: "Nairobi, Kenya",
      basis: "Annual gross, senior developer, three job boards.",
      sources: [
        { title: "Board A", url: "https://example.com/course" },
        { title: "Board B", url: "https://example.com/other" },
      ],
    })
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value.currency).toBe("USD")
    expect(filterGrounded(read.value.sources, grounding).kept).toHaveLength(2)
  })

  it("rejects a range that is inverted, fractional or sourceless", () => {
    expect(readBenchmark({ min: 9, max: 1, currency: "USD", market: "x", basis: "y", sources: [] }).ok).toBe(false)
    expect(readBenchmark({ min: 1.5, max: 2, currency: "USD", market: "x", basis: "y", sources: [] }).ok).toBe(false)
    expect(readBenchmark({ min: 1, max: 2, currency: "US", market: "x", basis: "y", sources: [] }).ok).toBe(false)
  })

  it("requires a market and a basis in the prompt", () => {
    const prompt = benchmarkPrompt(context)
    expect(prompt.system).toMatch(/Suggest a range, never publish one/)
    expect(prompt.user).toContain("Intermediate Developer")
    expect(prompt.user).toContain("Senior Developer")
  })
})

describe("task suggestions", () => {
  it("accepts three to six concrete tasks", () => {
    const read = readTaskSuggestions({
      tasks: [
        { title: "Log every working day for two weeks", description: "Build the missing habit.", estimatePoints: 3 },
        { title: "Deliver one review write-up", description: "Close the reviews gap.", estimatePoints: 5 },
        { title: "Pair on a senior-owned workstream", description: "Shadow the next rung.", estimatePoints: 3 },
      ],
    })
    expect(read.ok).toBe(true)
  })

  it("rejects too few, too many, or a bad point estimate", () => {
    expect(readTaskSuggestions({ tasks: [] }).ok).toBe(false)
    expect(
      readTaskSuggestions({
        tasks: Array.from({ length: 7 }, (_, i) => ({
          title: `Task ${i}`,
          description: "d",
          estimatePoints: 3,
        })),
      }).ok,
    ).toBe(false)
    expect(
      readTaskSuggestions({
        tasks: [
          { title: "One", description: "d", estimatePoints: 0 },
          { title: "Two", description: "d", estimatePoints: 3 },
          { title: "Three", description: "d", estimatePoints: 3 },
        ],
      }).ok,
    ).toBe(false)
  })
})
