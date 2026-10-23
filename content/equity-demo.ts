// DEMO DATA — anonymised illustrative sample; no real customer or pay data.

export type RoleBand = "I" | "II" | "III"

export interface EngineerRow {
  id: string
  name: string
  roleBand: RoleBand
  /** Story points committed on the active sprint board. */
  assignedPoints: number
  /** Average open review requests per week. */
  reviewLoad: number
  /** Commits authored outside working hours, rolling 30 days. */
  afterHoursCommits: number
  /** Synthetic pay-equity ratio: offer midpoint ÷ band midpoint (0.8–1.2). */
  compIndex: number
}

export const equityEngineers: EngineerRow[] = [
  { id: "a", name: "Engineer A", roleBand: "III", assignedPoints: 41, reviewLoad: 3, afterHoursCommits: 2, compIndex: 1.04 },
  { id: "b", name: "Engineer B", roleBand: "II", assignedPoints: 38, reviewLoad: 4, afterHoursCommits: 5, compIndex: 0.98 },
  { id: "c", name: "Engineer C", roleBand: "II", assignedPoints: 36, reviewLoad: 9, afterHoursCommits: 4, compIndex: 1.0 },
  { id: "d", name: "Engineer D", roleBand: "III", assignedPoints: 21, reviewLoad: 6, afterHoursCommits: 3, compIndex: 0.86 },
  { id: "e", name: "Engineer E", roleBand: "I", assignedPoints: 18, reviewLoad: 2, afterHoursCommits: 11, compIndex: 1.06 },
  { id: "f", name: "Engineer F", roleBand: "I", assignedPoints: 24, reviewLoad: 2, afterHoursCommits: 3, compIndex: 0.95 },
]

export type MetricKey = "sprintPoints" | "reviewLoad" | "afterHoursCommits" | "compIndex"

export type EngineerMetricField = "assignedPoints" | "reviewLoad" | "afterHoursCommits" | "compIndex"

/**
 * How a metric decides an engineer is "past the watch threshold".
 * insightTemplate/belowInsight/aboveInsight support {name} {ratio} {value} {mean} {min} {max}.
 */
export type WatchRule =
  | {
      kind: "aboveTeamMean"
      /** Flag values above teamMean × factor. */
      factor: number
      description: string
      insightTemplate: string
    }
  | {
      kind: "outsideBand"
      min: number
      max: number
      description: string
      belowInsight: string
      aboveInsight: string
    }

/** Everything the "Why this number?" panel renders — data, not hardcoded JSX. */
export interface MetricWhy {
  formula: string
  source: string
  guardrail: string
}

export interface MetricDefinition {
  key: MetricKey
  field: EngineerMetricField
  /** Tab label. */
  label: string
  /** Short axis/tooltip label. */
  chartLabel: string
  unit: string
  decimals: number
  threshold: WatchRule
  why: MetricWhy
}

const SHARED_GUARDRAIL =
  "Shown aggregated and anonymised; managers never see individual check-in answers."

export const metricDefinitions: MetricDefinition[] = [
  {
    key: "sprintPoints",
    field: "assignedPoints",
    label: "Sprint points",
    chartLabel: "Sprint points",
    unit: "pts",
    decimals: 0,
    threshold: {
      kind: "aboveTeamMean",
      factor: 1.3,
      description: "Watch above 130% of the team mean",
      insightTemplate: "{name} is taking on {ratio} the team's average sprint load.",
    },
    why: {
      formula: "sprintPoints = Σ story points of issues assigned to the engineer in the active sprint",
      source: "Jira sprint board, synced nightly; point values as estimated by the team itself.",
      guardrail: SHARED_GUARDRAIL,
    },
  },
  {
    key: "reviewLoad",
    field: "reviewLoad",
    label: "Review load",
    chartLabel: "Reviews per week",
    unit: "reviews/wk",
    decimals: 0,
    threshold: {
      kind: "aboveTeamMean",
      factor: 1.3,
      description: "Watch above 130% of the team mean",
      insightTemplate: "{name} is carrying {ratio} the team's review load.",
    },
    why: {
      formula: "reviewLoad = avg weekly count of open pull requests where the engineer is a requested reviewer",
      source: "Git host review assignments, rolling 4-week window.",
      guardrail: SHARED_GUARDRAIL,
    },
  },
  {
    key: "afterHoursCommits",
    field: "afterHoursCommits",
    label: "After-hours commits",
    chartLabel: "After-hours commits",
    unit: "commits/mo",
    decimals: 0,
    threshold: {
      kind: "aboveTeamMean",
      factor: 1.3,
      description: "Watch above 130% of the team mean",
      insightTemplate: "{name} is logging {ratio} the team's after-hours commit rate.",
    },
    why: {
      formula: "afterHoursCommits = count of commits authored 19:00–07:00 or on weekends, rolling 30 days",
      source: "Git commit timestamps, normalised to each engineer's own timezone.",
      guardrail: SHARED_GUARDRAIL,
    },
  },
  {
    key: "compIndex",
    field: "compIndex",
    label: "Comp index vs band",
    chartLabel: "Comp index",
    unit: "× band midpoint",
    decimals: 2,
    threshold: {
      kind: "outsideBand",
      min: 0.9,
      max: 1.1,
      description: "Watch outside 0.90–1.10 of the band midpoint",
      belowInsight: "{name}'s comp index of {value} sits below the {min}–{max} watch band for their role band.",
      aboveInsight: "{name}'s comp index of {value} sits above the {min}–{max} watch band for their role band.",
    },
    why: {
      formula: "compIndex = offer midpoint ÷ band midpoint (role band I/II/III; 1.00 = exactly at midpoint)",
      source: "HRIS banding data, self-reported during onboarding; synthetic in this demo — no real pay data.",
      guardrail: SHARED_GUARDRAIL,
    },
  },
]

export function isMetricKey(value: string): value is MetricKey {
  return metricDefinitions.some((def) => def.key === value)
}

export function metricDefinition(key: MetricKey): MetricDefinition {
  const def = metricDefinitions.find((candidate) => candidate.key === key)
  if (!def) {
    throw new Error(`Unknown equity metric: ${key}`)
  }
  return def
}

export function formatMetricNumber(key: MetricKey, value: number): string {
  return value.toFixed(metricDefinition(key).decimals)
}

export function formatMetricValue(key: MetricKey, value: number): string {
  const def = metricDefinition(key)
  return `${value.toFixed(def.decimals)} ${def.unit}`
}

export function teamMean(key: MetricKey, rows: EngineerRow[] = equityEngineers): number {
  const field = metricDefinition(key).field
  return rows.reduce((sum, row) => sum + row[field], 0) / rows.length
}

export interface WatchedEngineer {
  engineer: EngineerRow
  value: number
  /** value ÷ team mean — the "2.1×" in the insight line. */
  ratio: number
  direction: "above" | "below"
}

function isWatched(def: MetricDefinition, value: number, mean: number): boolean {
  if (def.threshold.kind === "aboveTeamMean") {
    return value > mean * def.threshold.factor
  }
  return value < def.threshold.min || value > def.threshold.max
}

export function watchedEngineers(key: MetricKey, rows: EngineerRow[] = equityEngineers): WatchedEngineer[] {
  const def = metricDefinition(key)
  const mean = teamMean(key, rows)
  const watched = rows
    .map((engineer) => {
      const value = engineer[def.field]
      return {
        engineer,
        value,
        ratio: mean > 0 ? value / mean : 0,
        direction: (value < mean ? "below" : "above") as WatchedEngineer["direction"],
      }
    })
    .filter((entry) => isWatched(def, entry.value, mean))
  // Largest deviation first so the insight headline names the most extreme case.
  return watched.sort((a, b) => Math.abs(b.value - mean) - Math.abs(a.value - mean))
}

export interface MetricInsight {
  mean: number
  thresholdDescription: string
  watched: WatchedEngineer[]
  /** One-line, plain-language summary of the worst deviation. */
  headline: string
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [placeholder, replacement]) => text.split(`{${placeholder}}`).join(replacement),
    template,
  )
}

export function buildMetricInsight(key: MetricKey, rows: EngineerRow[] = equityEngineers): MetricInsight {
  const def = metricDefinition(key)
  const mean = teamMean(key, rows)
  const threshold = def.threshold
  const watched = watchedEngineers(key, rows)
  const worst = watched[0]

  let headline = `No one is past the watch threshold for ${def.chartLabel.toLowerCase()} this cycle.`
  if (worst && threshold.kind === "aboveTeamMean") {
    headline = fillTemplate(threshold.insightTemplate, {
      name: worst.engineer.name,
      ratio: `${worst.ratio.toFixed(1)}×`,
      value: formatMetricNumber(key, worst.value),
      mean: formatMetricNumber(key, mean),
    })
  } else if (worst && threshold.kind === "outsideBand") {
    const template = worst.value < threshold.min ? threshold.belowInsight : threshold.aboveInsight
    headline = fillTemplate(template, {
      name: worst.engineer.name,
      ratio: `${worst.ratio.toFixed(1)}×`,
      value: formatMetricNumber(key, worst.value),
      mean: formatMetricNumber(key, mean),
      min: String(threshold.min),
      max: String(threshold.max),
    })
  }

  return { mean, thresholdDescription: def.threshold.description, watched, headline }
}
