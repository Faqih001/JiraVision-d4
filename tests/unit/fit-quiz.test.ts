import { describe, expect, it } from "vitest"
import { fitQuizMaxScore, fitQuizQuestions } from "@/content/fit-quiz"
import {
  buildFitResult,
  fitQuizThresholds,
  isComplete,
  scoreFit,
  type FitAnswers,
} from "@/app/(marketing)/fit-quiz/fit-model"

const maxAnswers: FitAnswers = {
  "team-size": "11-30",
  "current-tool": "jira",
  "planning-life": "derails",
  "what-hurts": "estimation",
  visibility: "aggregate",
  history: "fresh",
}

const withOver = (overrides: FitAnswers): FitAnswers => ({ ...maxAnswers, ...overrides })

describe("fit quiz content data", () => {
  it("has six questions with 0–3 point options and a 18-point ceiling", () => {
    expect(fitQuizQuestions).toHaveLength(6)
    expect(fitQuizMaxScore).toBe(18)
    for (const q of fitQuizQuestions) {
      expect(q.options.length).toBeGreaterThanOrEqual(3)
      for (const o of q.options) {
        expect(o.points).toBeGreaterThanOrEqual(0)
        expect(o.points).toBeLessThanOrEqual(3)
      }
    }
    const recomputed = fitQuizQuestions.reduce(
      (sum, q) => sum + Math.max(...q.options.map((o) => o.points)),
      0,
    )
    expect(recomputed).toBe(fitQuizMaxScore)
  })

  it("uses unique question and option ids", () => {
    const ids = new Set(fitQuizQuestions.map((q) => q.id))
    expect(ids.size).toBe(fitQuizQuestions.length)
    for (const q of fitQuizQuestions) {
      const optionIds = new Set(q.options.map((o) => o.id))
      expect(optionIds.size).toBe(q.options.length)
    }
  })
})

describe("scoreFit / isComplete", () => {
  it("empty answers score zero and are incomplete", () => {
    expect(scoreFit({})).toEqual({ score: 0, answered: 0 })
    expect(isComplete({})).toBe(false)
    expect(buildFitResult({})).toBeNull()
  })

  it("partial answers count only valid, answered questions", () => {
    const partial: FitAnswers = { "team-size": "11-30", "current-tool": "bogus-id" }
    expect(scoreFit(partial)).toEqual({ score: 3, answered: 1 })
    expect(isComplete(partial)).toBe(false)
    expect(buildFitResult(partial)).toBeNull()
  })

  it("all-max answers reach the published ceiling", () => {
    expect(scoreFit(maxAnswers).score).toBe(fitQuizMaxScore)
    expect(isComplete(maxAnswers)).toBe(true)
  })
})

describe("verdict bands", () => {
  it("13 points is the strong threshold", () => {
    const r = buildFitResult(
      withOver({
        "team-size": "11-30",
        "current-tool": "asana-linear",
        "planning-life": "slow",
        "what-hurts": "recognition",
        visibility: "context",
        history: "some",
      }),
    )!
    // 3 + 2 + 2 + 2 + 2 + 2 = 13
    expect(r.score).toBe(fitQuizThresholds.strong)
    expect(r.verdict).toBe("strong")
  })

  it("12 points drops to conditional", () => {
    const r = buildFitResult(
      withOver({
        "team-size": "5-10",
        "current-tool": "asana-linear",
        "planning-life": "slow",
        "what-hurts": "recognition",
        visibility: "context",
        history: "some",
      }),
    )!
    expect(r.score).toBe(12)
    expect(r.verdict).toBe("conditional")
  })

  it("8 points or less is not-now", () => {
    const r = buildFitResult(
      withOver({
        "team-size": "5-10",
        "current-tool": "other",
        "planning-life": "fine",
        "what-hurts": "recognition",
        visibility: "less",
        history: "fresh",
      }),
    )!
    expect(r.score).toBe(8)
    expect(r.verdict).toBe("not-now")
  })
})

describe("vetoes", () => {
  it("per-person rankings refuses regardless of score", () => {
    const r = buildFitResult(withOver({ visibility: "rankings" }))!
    expect(r.score).toBe(fitQuizMaxScore - 3)
    expect(r.verdict).toBe("rankings-refusal")
    expect(r.ctas.map((c) => c.href)).toContain("/products/ethical-metrics")
  })

  it("“nothing hurts” caps at not-yet even with a high score", () => {
    const r = buildFitResult(withOver({ "what-hurts": "nothing" }))!
    expect(r.score).toBeGreaterThanOrEqual(fitQuizThresholds.strong)
    expect(r.verdict).toBe("no-pain")
    expect(r.recommendedProduct).toBeNull()
  })
})

describe("personalisation", () => {
  it("“what hurts” selects the recommended product", () => {
    expect(buildFitResult(withOver({ "what-hurts": "burnout" }))!.recommendedProduct?.href).toBe(
      "/products/team-wellbeing",
    )
    expect(buildFitResult(withOver({ "what-hurts": "fairness" }))!.recommendedProduct?.name).toBe(
      "Ethical Metrics",
    )
  })

  it("strong verdict personalises the second CTA with the product page", () => {
    const r = buildFitResult(maxAnswers)!
    expect(r.ctas[0]!.href).toBe("/pricing")
    expect(r.ctas[1]!.href).toBe("/products/ai-scrum-master")
    expect(r.ctas[1]!.label).toMatch(/AI Scrum Master/)
  })

  it("every CTA and caveat href is internal", () => {
    const r = buildFitResult(
      withOver({ "team-size": "76+", "current-tool": "other", history: "attachments" }),
    )!
    for (const cta of r.ctas) expect(cta.href.startsWith("/")).toBe(true)
    for (const caveat of r.caveats) expect(caveat.href.startsWith("/")).toBe(true)
  })

  it("caveat answers attach caveats without changing the verdict path", () => {
    const r = buildFitResult(withOver({ "team-size": "76+", history: "attachments" }))!
    const texts = r.caveats.map((c) => c.text)
    expect(texts.some((t) => /Enterprise/.test(t))).toBe(true)
    expect(texts.some((t) => /never copies attachments/.test(t))).toBe(true)
    expect(r.verdict).toBe("strong")
  })
})

describe("determinism", () => {
  it("same answers produce an identical result object", () => {
    const a = buildFitResult(maxAnswers)!
    const b = buildFitResult(maxAnswers)!
    expect(b).toEqual(a)
  })
})
