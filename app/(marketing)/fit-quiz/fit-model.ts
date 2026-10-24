// Pure, deterministic scoring model for the /fit-quiz island.
// No React, no browser APIs — the verdict, caveats and personalised CTAs are all
// derivable from the six answers, which is what tests/unit/fit-quiz.test.ts pins down.

import {
  fitQuizMaxScore,
  fitQuizQuestions,
  fitVerdictCopy,
  type FitOption,
  type FitQuestionId,
  type FitVerdictCopy,
  type FitVerdictKey,
} from "@/content/fit-quiz"

export type FitAnswers = Readonly<Partial<Record<FitQuestionId, string>>>

export interface FitAnswerDetail {
  questionId: FitQuestionId
  questionTitle: string
  optionLabel: string
  points: number
  why: string
}

export interface FitCaveat {
  text: string
  linkLabel: string
  href: string
}

export interface FitCta {
  label: string
  href: string
  note: string
}

export interface FitProduct {
  name: string
  href: string
}

export interface FitResult {
  answers: FitAnswers
  verdict: FitVerdictKey
  copy: FitVerdictCopy
  score: number
  maxScore: number
  details: FitAnswerDetail[]
  caveats: FitCaveat[]
  /** The product page chosen by the "what hurts" answer, if any. */
  recommendedProduct: FitProduct | null
  /** Personalised call-to-actions; falls back to the static verdict copy. */
  ctas: FitCta[]
}

export const fitQuizThresholds = { strong: 13, conditional: 9 } as const

const hurtProducts: Record<string, FitProduct> = {
  estimation: { name: "AI Scrum Master", href: "/products/ai-scrum-master" },
  burnout: { name: "Team Wellbeing Radar", href: "/products/team-wellbeing" },
  fairness: { name: "Ethical Metrics", href: "/products/ethical-metrics" },
  recognition: { name: "Gamification", href: "/products/gamification" },
}

export function findOption(questionId: FitQuestionId, optionId: string): FitOption | undefined {
  return fitQuizQuestions.find((q) => q.id === questionId)?.options.find((o) => o.id === optionId)
}

export function isComplete(answers: FitAnswers): boolean {
  return fitQuizQuestions.every((q) => findOption(q.id, answers[q.id] ?? "") !== undefined)
}

export function scoreFit(answers: FitAnswers): { score: number; answered: number } {
  let score = 0
  let answered = 0
  for (const question of fitQuizQuestions) {
    const option = findOption(question.id, answers[question.id] ?? "")
    if (!option) continue
    answered += 1
    score += option.points
  }
  return { score, answered }
}

function verdictFor(answers: FitAnswers, score: number): FitVerdictKey {
  // Vetoes first, regardless of points.
  if (answers.visibility === "rankings") return "rankings-refusal"
  if (answers["what-hurts"] === "nothing") return "no-pain"
  if (score >= fitQuizThresholds.strong) return "strong"
  if (score >= fitQuizThresholds.conditional) return "conditional"
  return "not-now"
}

function caveatsFor(answers: FitAnswers): FitCaveat[] {
  const caveats: FitCaveat[] = []
  if (answers["team-size"] === "76+") {
    caveats.push({
      text: "At 76+ people this is an Enterprise conversation: security review, procurement and written SLAs before any pilot.",
      linkLabel: "Start that conversation",
      href: "/contact",
    })
  }
  if (answers["current-tool"] === "trello-notion" || answers["current-tool"] === "asana-linear") {
    caveats.push({
      text: "Your work lives outside Jira today. JiraVision sits on a Jira base, so the plan is: stand up (or keep) Jira, then migrate with a phase-by-phase scope.",
      linkLabel: "Price the migration",
      href: "/migration",
    })
  }
  if (answers["current-tool"] === "other") {
    caveats.push({
      text: "Without a Jira-compatible base, the tenancy decision comes before anything JiraVision can do. That's a real precondition, not a footnote.",
      linkLabel: "Compare the honest options",
      href: "/compare",
    })
  }
  if (answers.history === "attachments") {
    caveats.push({
      text: "JiraVision never copies attachments. If your scope requires file migration, that needs a written agreement before you commit — the planner flags it too.",
      linkLabel: "See the attachment policy",
      href: "/migration",
    })
  }
  if (answers.visibility === "context") {
    caveats.push({
      text: "Individual-facing features are opt-in and self-reported only. Any expectation of ambient activity data will disappoint you — by design.",
      linkLabel: "Read the guardrails",
      href: "/products/ethical-metrics",
    })
  }
  if (answers.visibility === "less") {
    caveats.push({
      text: "You asked for fewer dashboards. Our views are deliberately signal-dense; bring this caveat to a trial and judge whether they earn their place.",
      linkLabel: "What the signals look like",
      href: "/products/team-wellbeing",
    })
  }
  if (answers["planning-life"] === "slow") {
    caveats.push({
      text: "Your pain is planning speed, not overload. The AI draft + human-approval loop helps, but fix ceremony in your process first — tools amplify whatever is there.",
      linkLabel: "How the draft loop works",
      href: "/products/ai-scrum-master",
    })
  }
  return caveats
}

function ctasFor(verdict: FitVerdictKey, product: FitProduct | null): FitCta[] {
  const copy = fitVerdictCopy[verdict]
  if (verdict === "strong" && product) {
    return [
      copy.ctas[0]!,
      {
        label: `Deep-dive: ${product.name}`,
        href: product.href,
        note: "Chosen from your “what hurts most” answer.",
      },
    ]
  }
  if (verdict === "conditional" && product) {
    return [
      {
        label: `Start with ${product.name}`,
        href: product.href,
        note: "Chosen from your “what hurts most” answer.",
      },
      copy.ctas[1] ?? copy.ctas[0]!,
    ]
  }
  return copy.ctas.map((c) => ({ ...c }))
}

/** Null until all six questions carry a valid option id. */
export function buildFitResult(answers: FitAnswers): FitResult | null {
  if (!isComplete(answers)) return null
  const { score } = scoreFit(answers)
  const verdict = verdictFor(answers, score)
  const details: FitAnswerDetail[] = fitQuizQuestions.map((question) => {
    const option = findOption(question.id, answers[question.id] ?? "")!
    return {
      questionId: question.id,
      questionTitle: question.title,
      optionLabel: option.label,
      points: option.points,
      why: option.why,
    }
  })
  const recommendedProduct = hurtProducts[answers["what-hurts"] ?? ""] ?? null
  return {
    answers,
    verdict,
    copy: fitVerdictCopy[verdict],
    score,
    maxScore: fitQuizMaxScore,
    details,
    caveats: caveatsFor(answers),
    recommendedProduct,
    ctas: ctasFor(verdict, recommendedProduct),
  }
}
