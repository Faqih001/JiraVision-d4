// Burnout-risk scoring for the marketing calculator demo.
// Weight model is illustrative (adapted from the five Maslach/crowding-out style
// dimensions we surface in the product); it is a demo heuristic, not a clinical tool.

export interface BurnoutInput {
  workload: number // sustained overload
  autonomy: number // low control over how/when work happens (scored inverted below)
  unclearAsks: number // shifting priorities and unclear "done"
  afterHours: number // nights/weekends/standby bleed
  recognitionGap: number // effort outpacing visible recognition
}

export const BURNOUT_FACTORS = [
  {
    key: "workload" as const,
    label: "Sustained overload",
    help: "Committed work regularly exceeds available hours.",
    weight: 0.28,
  },
  {
    key: "autonomy" as const,
    label: "Low autonomy",
    help: "Little say over scope, sequencing or how the work gets done.",
    weight: 0.18,
  },
  {
    key: "unclearAsks" as const,
    label: "Unclear priorities",
    help: "Goals shift mid-sprint and \"done\" is negotiable.",
    weight: 0.16,
  },
  {
    key: "afterHours" as const,
    label: "After-hours bleed",
    help: "Evenings, weekends or standby becoming the norm.",
    weight: 0.24,
  },
  {
    key: "recognitionGap" as const,
    label: "Recognition gap",
    help: "Effort and care outpace what the team visibly counts.",
    weight: 0.14,
  },
] as const

export type BurnoutBand = "Steady" | "Watch" | "Strained" | "At risk"

export interface BurnoutResult {
  score: number // 0-100
  band: BurnoutBand
  bandAdvice: string
  topDriver: string
}

const BANDS: { min: number; band: BurnoutBand; advice: string }[] = [
  {
    min: 75,
    band: "At risk",
    advice: "Treat this as a now-problem: cut commitments this sprint, not next quarter, and rebalance the specific drivers below.",
  },
  {
    min: 55,
    band: "Strained",
    advice: "Patterns are setting. Rebalance load and make one driver (usually after-hours work) an explicit sprint goal.",
  },
  {
    min: 35,
    band: "Watch",
    advice: "Nothing on fire, but headroom is thin. Protect slack and check the trend after the next two cycles.",
  },
  {
    min: 0,
    band: "Steady",
    advice: "Load and control look sustainable. Keep the signals flowing so drift shows up early.",
  },
]

export function burnoutRisk(input: BurnoutInput): BurnoutResult {
  let total = 0
  let topWeight = -1
  let topDriver = ""
  for (const factor of BURNOUT_FACTORS) {
    const raw = input[factor.key]
    const clamped = Math.min(10, Math.max(0, raw))
    // Autonomy already encodes "low autonomy" in the slider direction.
    const contribution = clamped * factor.weight
    total += contribution
    if (contribution > topWeight) {
      topWeight = contribution
      topDriver = factor.label
    }
  }
  const score = Math.round((total / 10) * 100)
  const hit = BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]
  return { score, band: hit.band, bandAdvice: hit.advice, topDriver }
}
