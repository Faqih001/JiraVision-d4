// What to do next, rule-based first so it works with no key (design §12 item 6). Every rule
// reads rows the member may see, names them in `refs`, and states only numbers it computed
// from those rows. The AI twin is held to the same shape by `readAiSuggestions`: a suggestion
// survives only if its refs exist in the input and every number it writes is already there.

import { z } from "zod"
import { GeminiError, type JsonSchema } from "@/lib/ai/gemini"
import { daysBetween, type Staleness } from "@/lib/registers/staleness"
import { isIsoDate } from "@/lib/worklog/local-day"

export const RECOMMEND_KINDS = [
  "stale_register",
  "overdue_renewal",
  "deliverable_stuck",
  "career_gap",
  "report_missing",
  "missing_log",
  "ai",
] as const
export type RecommendKind = (typeof RECOMMEND_KINDS)[number]

export type RecommendRef = {
  table: "register_items" | "deliverables" | "work_reports" | "career_levels" | "work_log_entries"
  id: number
}

export type Recommendation = {
  id: string
  kind: RecommendKind
  why: string
  action: string
  href: string
  confidence: number
  refs: RecommendRef[]
}

export type RecommendRegister = {
  id: number
  title: string
  status: string
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  fields: Record<string, string>
  staleness: Staleness
}

export type RecommendPeriod = {
  periodType: "weekly" | "monthly"
  periodStart: string
  periodEnd: string
  hasEntries: boolean
  hasReport: boolean
}

export type RecommendInput = {
  today: string
  registers: RecommendRegister[]
  entriesToday: number
  deliverables: { id: number; name: string; status: string; updatedOn: string }[]
  periods: RecommendPeriod[]
  career: {
    levelId: number | null
    nextTitle: string | null
    gaps: { key: string; label: string; actual: number; target: number }[]
  } | null
}

export const STUCK_DAYS = 3
export const MAX_RECOMMENDATIONS = 8
export const AI_HREF_PREFIXES = [
  "/dashboard/registers",
  "/dashboard/worklog",
  "/dashboard/career",
  "/dashboard/reports-work",
  "/dashboard/playbooks",
  "/dashboard/agent",
] as const

const HREF: Record<string, string> = {
  registers: "/dashboard/registers",
  worklog: "/dashboard/worklog",
  career: "/dashboard/career",
  reports: "/dashboard/reports-work",
}

const RENEWAL_KEY = /renew|expir|due/i

/** The earliest ISO date stored under a renewal-looking field, or null. */
export function renewalDue(fields: Record<string, string>): string | null {
  let earliest: string | null = null
  for (const [key, value] of Object.entries(fields)) {
    if (!RENEWAL_KEY.test(key) || !isIsoDate(value)) continue
    if (!earliest || value < earliest) earliest = value
  }
  return earliest
}

function registerRules(input: RecommendInput): Recommendation[] {
  const out: Recommendation[] = []
  for (const row of input.registers) {
    if (row.status === "disposed" || row.status === "retired") continue

    if (row.staleness === "stale" || (row.staleness === "unknown" && row.verifyIntervalDays !== null)) {
      const reason =
        row.lastVerifiedAt === null
          ? `It has never been verified, and its interval is ${row.verifyIntervalDays} day(s).`
          : `Last verified ${row.lastVerifiedAt}; the interval is ${row.verifyIntervalDays} day(s).`
      out.push({
        id: `stale_register:${row.id}`,
        kind: "stale_register",
        why: `${row.title} is not current. ${reason}`,
        action: "Verify it now",
        href: HREF.registers,
        confidence: row.staleness === "stale" ? 0.9 : 0.6,
        refs: [{ table: "register_items", id: row.id }],
      })
    }

    const due = renewalDue(row.fields)
    if (due && due < input.today) {
      const overdueBy = daysBetween(due, input.today)
      out.push({
        id: `overdue_renewal:${row.id}`,
        kind: "overdue_renewal",
        why: `${row.title} renews on ${due}, ${overdueBy} day(s) overdue.`,
        action: "Start the renewal",
        href: HREF.registers,
        confidence: 0.85,
        refs: [{ table: "register_items", id: row.id }],
      })
    }
  }
  return out
}

function deliverableRules(input: RecommendInput): Recommendation[] {
  return input.deliverables.flatMap((row) => {
    if (row.status !== "in_review") return []
    const days = daysBetween(row.updatedOn, input.today)
    if (days < STUCK_DAYS) return []
    return [
      {
        id: `deliverable_stuck:${row.id}`,
        kind: "deliverable_stuck" as const,
        why: `${row.name} has been in review for ${days} day(s).`,
        action: "Open it in the work log",
        href: HREF.worklog,
        confidence: 0.7,
        refs: [{ table: "deliverables" as const, id: row.id }],
      },
    ]
  })
}

function careerRules(input: RecommendInput): Recommendation[] {
  const career = input.career
  if (!career || career.gaps.length === 0) return []
  const gap = [...career.gaps]
    .filter((entry) => entry.actual < entry.target)
    .sort((a, b) => (b.target - b.actual) / Math.max(b.target, 1) - (a.target - a.actual) / Math.max(a.target, 1))[0]
  if (!gap) return []
  return [
    {
      id: `career_gap:${gap.key}`,
      kind: "career_gap",
      why: `${gap.label}: ${gap.actual} of ${gap.target} recorded toward ${
        career.nextTitle ?? "the next rung"
      }.`,
      action: "Open the career page",
      href: HREF.career,
      confidence: 0.6,
      refs: career.levelId ? [{ table: "career_levels", id: career.levelId }] : [],
    },
  ]
}

function reportRules(input: RecommendInput): Recommendation[] {
  return input.periods.flatMap((period) => {
    if (!period.hasEntries || period.hasReport) return []
    return [
      {
        id: `report_missing:${period.periodType}:${period.periodStart}`,
        kind: "report_missing" as const,
        why: `No ${period.periodType} report for ${period.periodStart} – ${period.periodEnd}, and that period has work in it.`,
        action: "Draft the report",
        href: HREF.reports,
        confidence: 0.8,
        refs: [],
      },
    ]
  })
}

function logRule(input: RecommendInput): Recommendation[] {
  if (input.entriesToday > 0) return []
  return [
    {
      id: "missing_log:today",
      kind: "missing_log",
      why: "Nothing is logged for today yet. The report can only show what was recorded.",
      action: "Open the work log",
      href: HREF.worklog,
      confidence: 0.4,
      refs: [],
    },
  ]
}

export function buildRecommendations(
  input: RecommendInput,
  cap = MAX_RECOMMENDATIONS,
): Recommendation[] {
  const all = [
    ...registerRules(input),
    ...reportRules(input),
    ...deliverableRules(input),
    ...careerRules(input),
    ...logRule(input),
  ]
  const seen = new Set<string>()
  return all
    .filter((entry) => (seen.has(entry.id) ? false : (seen.add(entry.id), true)))
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    .slice(0, cap)
}

export const RECOMMEND_SYSTEM = `You suggest at most three next actions for a member, using only the facts the caller gives.

- Every suggestion must name at least one row from the facts by its id, using the same table name.
- Never write a number that is not already in the facts. Do not estimate, round or compute a new count.
- Link only to the member's own pages, chosen from the allowed href list.
- If the facts do not support an additional suggestion beyond the rules already found, return an empty list.`

export const RECOMMEND_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          why: { type: "string" },
          action: { type: "string" },
          href: { type: "string" },
          confidence: { type: "number" },
          refs: {
            type: "array",
            items: {
              type: "object",
              properties: { table: { type: "string" }, id: { type: "number" } },
              required: ["table", "id"],
            },
          },
        },
        required: ["why", "action", "href", "refs"],
      },
    },
  },
  required: ["suggestions"],
}

/** The text the number rule checks against: every id, date, count and target in the input. */
export function factText(input: RecommendInput): string {
  return JSON.stringify({
    today: input.today,
    entriesToday: input.entriesToday,
    registers: input.registers.map((row) => ({
      id: row.id,
      title: row.title,
      lastVerifiedAt: row.lastVerifiedAt,
      verifyIntervalDays: row.verifyIntervalDays,
      fields: row.fields,
    })),
    deliverables: input.deliverables,
    periods: input.periods,
    career: input.career,
  })
}

export function recommendationPrompt(input: RecommendInput, rules: readonly Recommendation[]): string {
  return [
    "Facts:",
    factText(input),
    "",
    "Rules already found (do not repeat them):",
    JSON.stringify(rules.map((entry) => ({ id: entry.id, why: entry.why }))),
    "",
    `Allowed hrefs: ${AI_HREF_PREFIXES.join(", ")}`,
  ].join("\n")
}

const aiSchema = z.object({
  suggestions: z
    .array(
      z.object({
        why: z.string().optional(),
        action: z.string().optional(),
        href: z.string().optional(),
        confidence: z.number().optional(),
        refs: z
          .array(z.object({ table: z.string().optional(), id: z.number().optional() }))
          .optional(),
      }),
    )
    .default([]),
})

const TABLES = new Set<string>([
  "register_items",
  "deliverables",
  "work_reports",
  "career_levels",
  "work_log_entries",
])

function knownIds(input: RecommendInput): Map<string, Set<number>> {
  return new Map([
    ["register_items", new Set(input.registers.map((row) => row.id))],
    ["deliverables", new Set(input.deliverables.map((row) => row.id))],
    ["career_levels", new Set(input.career?.levelId ? [input.career.levelId] : [])],
  ])
}

const NUMBER = /\d+(?:\.\d+)?/g

function numbersAppear(text: string, facts: string): boolean {
  const tokens = text.match(NUMBER) ?? []
  const haystack = facts.match(NUMBER) ?? []
  const available = new Set(haystack)
  return tokens.every((token) => available.has(token))
}

export function readAiSuggestions(raw: unknown, input: RecommendInput): Recommendation[] {
  let parsed: z.infer<typeof aiSchema>
  try {
    parsed = aiSchema.parse(raw)
  } catch {
    throw new GeminiError("badjson", "The suggestion answer was not a list.")
  }

  const facts = factText(input)
  const ids = knownIds(input)
  const out: Recommendation[] = []

  for (const entry of parsed.suggestions) {
    const why = (entry.why ?? "").trim()
    const action = (entry.action ?? "").trim()
    const href = (entry.href ?? "").trim()
    if (!why || why.length > 240 || !action || action.length > 120) continue
    if (/[\r\n]/.test(why) || /[\r\n]/.test(action) || /[\r\n]/.test(href)) continue
    if (href.includes("//") || !AI_HREF_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}?`))) {
      continue
    }
    if (!numbersAppear(`${why} ${action}`, facts)) continue

    const refs: RecommendRef[] = []
    for (const ref of entry.refs ?? []) {
      if (typeof ref.table !== "string" || typeof ref.id !== "number") continue
      if (!TABLES.has(ref.table)) continue
      if (!ids.get(ref.table)?.has(ref.id)) continue
      refs.push({ table: ref.table as RecommendRef["table"], id: ref.id })
    }
    if (refs.length === 0) continue

    out.push({
      id: `ai:${out.length + 1}`,
      kind: "ai",
      why,
      action,
      href,
      confidence: Math.min(0.95, Math.max(0.3, entry.confidence ?? 0.5)),
      refs,
    })
    if (out.length >= 3) break
  }

  if (out.length === 0) {
    throw new GeminiError("badjson", "No suggestion survived the grounding rules.")
  }
  return out
}
