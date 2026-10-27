// Growth AI vocabulary, validators and prompts (design §11). Pure on purpose: the
// route calls these, the tests call these, and nothing here knows about a database,
// a cookie or Google. The one hard rule: a URL that the response's grounding
// metadata does not contain is not a source, and it is dropped.

import { z } from "zod"
import type { Grounding, GroundingSource } from "@/lib/ai/gemini"
import { CAREER_SIGNALS, type CareerSignalTargets, type CareerSignals } from "./signals"
import type { CareerReadiness } from "./readiness"

export const GROWTH_ACTIONS = ["learning", "benchmark", "review", "task_suggestions"] as const
export type GrowthAction = (typeof GROWTH_ACTIONS)[number]

export function isGrowthAction(value: unknown): value is GrowthAction {
  return typeof value === "string" && (GROWTH_ACTIONS as readonly string[]).includes(value)
}

export const GROWTH_ACTION_LABEL: Record<GrowthAction, string> = {
  learning: "Learning path",
  benchmark: "Market benchmark",
  review: "Growth review",
  task_suggestions: "Gap tasks",
}

export const MAX_LEARNING_ITEMS = 6
export const MAX_TASKS = 6
export const MIN_TASKS = 3
export const MAX_POINTS = 13

export type GrowthContext = {
  memberName: string
  discipline: string
  fromLevel: number
  currentTitle: string | null
  toLevel: number
  nextTitle: string
  nextSummary: string | null
  signals: CareerSignals
  targets: CareerSignalTargets
  readiness: CareerReadiness
  history: Array<{ fromLevel: number; toLevel: number }>
  asOfDay: string
}

export type LearningItem = {
  title: string
  provider: string | null
  url: string
  why: string
  hours: number | null
}

export type BenchmarkSuggestion = {
  min: number
  max: number
  currency: string
  market: string
  basis: string
  sources: GroundingSource[]
}

export type TaskSuggestion = {
  title: string
  description: string
  estimatePoints: number
}

const text = (max: number) => z.string().trim().min(1).max(max)

export const learningSchema = z.object({
  items: z
    .array(
      z.object({
        title: text(200),
        provider: z.string().trim().max(200).optional().nullable(),
        url: z.string().trim().url().max(2000),
        why: text(1000),
        hours: z.number().int().min(1).max(200).optional().nullable(),
      }),
    )
    .min(1)
    .max(MAX_LEARNING_ITEMS),
})

export const benchmarkSchema = z.object({
  min: z.number().int().min(0).max(1_000_000_000),
  max: z.number().int().min(0).max(1_000_000_000),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/),
  market: text(200),
  basis: text(1000),
  sources: z
    .array(z.object({ title: text(200), url: z.string().trim().url().max(2000) }))
    .min(2)
    .max(10),
})

export const tasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: text(200),
        description: text(2000),
        estimatePoints: z.number().int().min(1).max(MAX_POINTS),
      }),
    )
    .min(MIN_TASKS)
    .max(MAX_TASKS),
})

export type LearningRead = { ok: true; items: LearningItem[] } | { ok: false; error: string }
export type BenchmarkRead = { ok: true; value: BenchmarkSuggestion } | { ok: false; error: string }
export type TasksRead = { ok: true; tasks: TaskSuggestion[] } | { ok: false; error: string }

export function readLearningPath(raw: unknown): LearningRead {
  const parsed = learningSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Learning path did not match the expected shape." }
  return {
    ok: true,
    items: parsed.data.items.map((item) => ({
      title: item.title,
      provider: item.provider ?? null,
      url: item.url,
      why: item.why,
      hours: item.hours ?? null,
    })),
  }
}

export function readBenchmark(raw: unknown): BenchmarkRead {
  const parsed = benchmarkSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Benchmark did not match the expected shape." }
  const value = parsed.data
  if (value.min > value.max) return { ok: false, error: "The benchmark minimum is above its maximum." }
  return {
    ok: true,
    value: {
      ...value,
      currency: value.currency.toUpperCase(),
      sources: value.sources.map((source) => ({ url: source.url, title: source.title })),
    },
  }
}

export function readTaskSuggestions(raw: unknown): TasksRead {
  const parsed = tasksSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Task suggestions did not match the expected shape." }
  return { ok: true, tasks: parsed.data.tasks }
}

function normaliseUrl(value: string): string | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

/** Keep the items whose URL is a grounding source; replace the URL with the verified one. */
export function filterGrounded<T extends { url: string }>(
  items: readonly T[],
  grounding: Grounding | null,
): { kept: T[]; dropped: number } {
  const allowed = new Map<string, GroundingSource>()
  for (const source of grounding?.sources ?? []) {
    const key = normaliseUrl(source.url)
    if (key) allowed.set(key, source)
  }

  const kept: T[] = []
  let dropped = 0
  for (const item of items) {
    const key = normaliseUrl(item.url)
    const source = key ? allowed.get(key) : undefined
    if (!source) {
      dropped += 1
      continue
    }
    kept.push({ ...item, url: source.url })
  }
  return { kept, dropped }
}

function signalLines(context: GrowthContext): string {
  return CAREER_SIGNALS.map((signal) => {
    const actual = context.signals[signal.key]
    const target = context.targets[signal.key] ?? 0
    return `- ${signal.label}: ${actual} / ${target} (${signal.hint})`
  }).join("\n")
}

function gapLines(context: GrowthContext): string {
  if (context.readiness.gaps.length === 0) return "- No open gaps: the meter reads complete."
  return context.readiness.gaps
    .map(
      (gap) =>
        `- ${gap.kind === "signal" ? "Signal" : "Checklist"}: ${gap.label} (${gap.actual} of ${gap.target}) — ${gap.hint}`,
    )
    .join("\n")
}

function rungHeader(context: GrowthContext): string {
  return [
    `Member: ${context.memberName}`,
    `Discipline: ${context.discipline}`,
    `Held rung: level ${context.fromLevel}${context.currentTitle ? ` — ${context.currentTitle}` : ""}`,
    `Next rung: level ${context.toLevel} — ${context.nextTitle}`,
    context.nextSummary ? `Next rung summary: ${context.nextSummary}` : null,
    `Readiness today: ${context.readiness.percent}%${context.readiness.capped ? ` (capped: ${context.readiness.capReason ?? "previous rung incomplete"})` : ""}`,
    `Window: ${context.asOfDay}, rolling 90 days`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
}

export function learningPrompt(context: GrowthContext): { system: string; user: string } {
  return {
    system: `You suggest learning resources for a member of a small delivery team.

Rules:
- Use Google Search for every recommendation.
- Only recommend resources you found in the search results.
- Return the exact URL from the results for each item. Never invent a course, provider, price or URL.
- 3 to ${MAX_LEARNING_ITEMS} items, each realistic to finish in under 200 hours.
- Say why the item closes a named gap. Do not promise a promotion.`,
    user: `${rungHeader(context)}

Counted evidence and targets:
${signalLines(context)}

Open gaps:
${gapLines(context)}

Suggest learning items that close these gaps.`,
  }
}

export function benchmarkPrompt(context: GrowthContext): { system: string; user: string } {
  return {
    system: `You research market pay ranges for one job rung.

Rules:
- Use Google Search.
- Suggest a range, never publish one. The range is annual gross pay in one currency.
- Name the market the sources actually price. If you cannot verify a market, say so in the basis.
- Return at least two sources with the exact URLs from the results.
- If you cannot find credible sources, return no numbers. Never invent a figure, currency or URL.
- This is advice for an admin. It never becomes a published band by itself.`,
    user: `${rungHeader(context)}

Find the market range for the next rung (${context.nextTitle}) in the discipline above.`,
  }
}

export function reviewPrompt(context: GrowthContext): { system: string; user: string } {
  return {
    system: `You write a short growth review for a team member.

Rules:
- Use only the numbers provided. Do not invent projects, clients, praise or metrics.
- If a number is missing, say it is missing.
- Name gaps plainly and suggest one or two concrete next actions from the gaps list.
- 250 to 400 words, plain text, no headings, no markdown links.
- Never promise a promotion or a salary.`,
    user: `${rungHeader(context)}

Counted evidence and targets:
${signalLines(context)}

Open gaps:
${gapLines(context)}

Approved promotions so far: ${context.history.length}.`,
  }
}

export function taskSuggestionsPrompt(context: GrowthContext): { system: string; user: string } {
  return {
    system: `You propose concrete work tasks that close the gap between a member's logged evidence and their next rung.

Rules:
- Use only the gaps and targets provided.
- Each task must be something the member could log in a work log and complete.
- ${MIN_TASKS} to ${MAX_TASKS} tasks, each 1 to ${MAX_POINTS} story points.
- Do not invent achievements, projects, clients or metrics.
- A task title is an imperative verb phrase. A description says what "done" looks like.`,
    user: `${rungHeader(context)}

Counted evidence and targets:
${signalLines(context)}

Open gaps:
${gapLines(context)}`,
  }
}

export function learningJsonSchema() {
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            provider: { type: "string" },
            url: { type: "string" },
            why: { type: "string" },
            hours: { type: "integer" },
          },
          required: ["title", "url", "why"],
        },
      },
    },
    required: ["items"],
  }
}

export function benchmarkJsonSchema() {
  return {
    type: "object",
    properties: {
      min: { type: "integer" },
      max: { type: "integer" },
      currency: { type: "string" },
      market: { type: "string" },
      basis: { type: "string" },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, url: { type: "string" } },
          required: ["title", "url"],
        },
      },
    },
    required: ["min", "max", "currency", "market", "basis", "sources"],
  }
}

export function tasksJsonSchema() {
  return {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            estimatePoints: { type: "integer" },
          },
          required: ["title", "description", "estimatePoints"],
        },
      },
    },
    required: ["tasks"],
  }
}
