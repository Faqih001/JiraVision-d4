# Growth AI (Phase 14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give every placed member four AI actions on `/dashboard/career` — a grounded learning path, a market benchmark, a review written from their own counts, and gap-closing tasks that land as a draft planner plan — with every returned URL verified against Google Search grounding metadata.

**Architecture:** One member-only route, `app/api/career/growth` (`GET` for saved outputs, `POST` with `{ action, discipline }`). Pure vocabulary, validators, prompt builders and URL grounding live in `lib/career/growth.ts`; plan creation lives in `lib/career/gap-plan.ts`. The provider module gains an opt-in `googleSearch` flag and returns normalized grounding metadata. Outputs append to the existing `growth_reviews` table; nothing writes `career_levels`.

**Tech Stack:** Next.js 16 route handlers, Drizzle ORM (no schema change), Gemini provider (`lib/ai/gemini.ts`), zod for AI JSON, Vitest source guards + pure unit tests, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (§11, §13, §16 phase 14)

## Global Constraints

- **No invented numbers.** Every prompt receives the member's counted signals, targets and gaps and says "use only these numbers". A provider failure returns an error state, never plausible filler.
- **Every URL is verified.** A learning item or benchmark source renders only if its normalized URL appears in the response's `groundingMetadata`; otherwise it is dropped. If nothing survives, nothing is saved and the route returns 502.
- **AI never writes the ladder.** `career_levels` is immutable from this phase. Benchmark output is a suggestion the UI labels "Suggestion only"; only an admin's `PATCH /api/career/levels/[id]` publishes a band.
- **Append-only snapshots.** Each action inserts one `growth_reviews` row (`kind` = `learning | benchmark | review | task_suggestions`) with `payload`, `narrative`, `source_refs`, `as_of`, `model`, `ai_marked: true`. No updates, no deletes.
- **Member only.** `GET` and `POST` are scoped by the session id. No `userId` query parameter and no admin fan-out.
- **Task suggestions are drafts.** They insert `agent_plans.status = "draft"` with `created_by` = the member and `plan_items`, so the existing `/api/planner/[id]/promote` path remains the only way tasks are created.
- **No migration and no new env var.** `growth_reviews`, `agent_plans` and `plan_items` already exist; `GOOGLE_GEMINI_API_KEY` is documented.
- **AI-marked.** The panel says the output is AI-generated and may be wrong; sources are links the member can open.

---

### Task 1: Grounding support in the provider

**Files:**
- Modify: `lib/ai/gemini.ts`
- Test: `tests/unit/gemini.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GeminiRequest.googleSearch?: boolean`; `Grounding`, `GroundingSource`, `readGrounding(json: unknown): Grounding | null`; `geminiText`/`geminiJson` return `{ …, grounding: Grounding | null }`.

- [x] **Step 1: Write the failing tests**

Append to `tests/unit/gemini.test.ts`:

```ts
import { readGrounding } from "@/lib/ai/gemini"

describe("grounding support", () => {
  it("opts into google_search only when asked", () => {
    expect(source).toContain("googleSearch?: boolean")
    expect(source).toContain("google_search")
    expect(source).toMatch(/if \(req\.googleSearch\)/)
  })

  it("normalises grounding chunks into http(s) sources", () => {
    expect(
      readGrounding({
        candidates: [
          {
            groundingMetadata: {
              webSearchQueries: ["nestjs mentoring"],
              groundingChunks: [
                { web: { uri: "https://example.com/course/", title: "Course" } },
                { web: { uri: "not-a-url", title: "Bad" } },
                { web: { uri: "https://example.com/two#frag" } },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      queries: ["nestjs mentoring"],
      sources: [
        { url: "https://example.com/course", title: "Course" },
        { url: "https://example.com/two", title: null },
      ],
    })
  })

  it("returns null when the answer carried no grounding", () => {
    expect(readGrounding({ candidates: [{ content: { parts: [{ text: "x" }] } }] })).toBeNull()
    expect(readGrounding(null)).toBeNull()
  })
})
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/gemini.test.ts`
Expected: FAIL — `readGrounding` is not exported.

- [x] **Step 3: Add the types and the pure reader**

In `lib/ai/gemini.ts`, above `GeminiRequest`:

```ts
export type GroundingSource = { url: string; title: string | null }
export type Grounding = { queries: string[]; sources: GroundingSource[] }

function normaliseSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

/** The response's own grounding metadata, normalised; null when Google returned none. */
export function readGrounding(json: unknown): Grounding | null {
  const meta = (json as any)?.candidates?.[0]?.groundingMetadata
  if (!meta || typeof meta !== "object") return null

  const queries = Array.isArray(meta.webSearchQueries)
    ? meta.webSearchQueries.filter((q: unknown): q is string => typeof q === "string")
    : []

  const sources: GroundingSource[] = []
  const seen = new Set<string>()
  for (const chunk of Array.isArray(meta.groundingChunks) ? meta.groundingChunks : []) {
    const url = normaliseSourceUrl(chunk?.web?.uri)
    if (!url || seen.has(url)) continue
    seen.add(url)
    sources.push({ url, title: typeof chunk?.web?.title === "string" ? chunk.web.title : null })
  }

  if (queries.length === 0 && sources.length === 0) return null
  return { queries, sources }
}
```

Add to `GeminiRequest`:

```ts
  /** Enable Google Search grounding. Only the career growth actions use this. */
  googleSearch?: boolean
```

- [x] **Step 4: Add the tool to the request body and the grounding to both returns**

In both `geminiText` and `geminiJson`, after `if (req.system) …`:

```ts
    if (req.googleSearch) body.tools = [{ google_search: {} }]
```

Change both return objects to include:

```ts
      grounding: readGrounding(json),
```

and both return types to:

```ts
Promise<{ text: string; usage: TokenUsage; grounding: Grounding | null }>
Promise<{ data: T; usage: TokenUsage; grounding: Grounding | null }>
```

- [x] **Step 5: Run the test and the typecheck**

Run: `npx vitest run tests/unit/gemini.test.ts && npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [x] **Step 6: Commit**

```bash
git add lib/ai/gemini.ts tests/unit/gemini.test.ts
git commit -m "feat(ai): opt-in google_search grounding with normalised sources"
```

---

### Task 2: Pure growth vocabulary, validators and prompts

**Files:**
- Create: `lib/career/growth.ts`
- Test: `tests/unit/career-growth.test.ts`

**Interfaces:**
- Consumes: `CAREER_SIGNALS`, `CareerSignalKey`, `CareerSignals`, `CareerSignalTargets` from `lib/career/signals`; `CareerReadiness`, `ReadinessGap` from `lib/career/readiness`; `Grounding`, `GroundingSource` from `lib/ai/gemini`.
- Produces: `GROWTH_ACTIONS`, `GrowthAction`, `isGrowthAction`, `GrowthContext`, `LearningItem`, `BenchmarkSuggestion`, `TaskSuggestion`, `readLearningPath(raw)`, `readBenchmark(raw)`, `readTaskSuggestions(raw)`, `filterGrounded(items, grounding)`, `learningPrompt(ctx)`, `benchmarkPrompt(ctx)`, `reviewPrompt(ctx)`, `taskSuggestionsPrompt(ctx)`, `learningSchema`, `benchmarkSchema`, `tasksSchema`.

- [x] **Step 1: Write the failing tests**

Create `tests/unit/career-growth.test.ts`:

```ts
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
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/career-growth.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement `lib/career/growth.ts`**

```ts
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

export type ReadResult<T> = { ok: true; value: T } | { ok: false; error: string }

function readWith<T>(schema: z.ZodType<T>, raw: unknown, label: string): ReadResult<T> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: `${label} did not match the expected shape.` }
  return { ok: true, value: parsed.data }
}

export function readLearningPath(raw: unknown): ReadResult<{ items: LearningItem[] }> {
  const result = readWith(learningSchema, raw, "Learning path")
  if (!result.ok) return result
  return {
    ok: true,
    value: {
      items: result.value.items.map((item, index) => ({
        title: index === 0 && item.title.length === 0 ? item.title : item.title,
        provider: item.provider ?? null,
        url: item.url,
        why: item.why,
        hours: item.hours ?? null,
      })),
    },
  }
}

export function readBenchmark(raw: unknown): ReadResult<{ value: BenchmarkSuggestion }> {
  const result = readWith(benchmarkSchema, raw, "Benchmark")
  if (!result.ok) return result
  const value = result.value
  if (value.min > value.max) return { ok: false, error: "The benchmark minimum is above its maximum." }
  return {
    ok: true,
    value: {
      value: {
        ...value,
        currency: value.currency.toUpperCase(),
        sources: value.sources.map((source) => ({ url: source.url, title: source.title })),
      },
    },
  }
}

export function readTaskSuggestions(raw: unknown): ReadResult<{ tasks: TaskSuggestion[] }> {
  return readWith(tasksSchema, raw, "Task suggestions")
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
    .map((gap) => `- ${gap.kind === "signal" ? "Signal" : "Checklist"}: ${gap.label} (${gap.actual} of ${gap.target}) — ${gap.hint}`)
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
    .filter(Boolean)
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
```

Remove the pointless `index === 0` expression when implementing; map directly.

- [x] **Step 4: Run the tests and typecheck**

Run: `npx vitest run tests/unit/career-growth.test.ts && npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [x] **Step 5: Commit**

```bash
git add lib/career/growth.ts tests/unit/career-growth.test.ts
git commit -m "feat(career): growth validators, grounding filter and prompts"
```

---

### Task 3: Gap-plan writer and the growth route

**Files:**
- Create: `lib/career/gap-plan.ts`
- Create: `app/api/career/growth/route.ts`
- Test: `tests/unit/career-growth.test.ts` (extend), `tests/unit/career-growth-route.test.ts` (source guards)

**Interfaces:**
- Consumes: `careerSession`, `bad`, `unauthorized` from `app/api/career/_shared`; `loadCareerProfile`; `localDay`; `geminiJson`/`geminiText`/`GeminiError`; everything from Task 2.
- Produces: `GET /api/career/growth` → `{ success, data: { aiAvailable, reviews } }`; `POST /api/career/growth` with `{ action, discipline }` → `{ success, data: { review, planId? } }`; `createGapPlan(input)` → `{ planId, reviewId }`.

- [x] **Step 1: Write the failing source guards**

Create `tests/unit/career-growth-route.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const route = codeOnly(src("app/api/career/growth/route.ts"))
const plan = codeOnly(src("lib/career/gap-plan.ts"))

describe("growth route gates and scope", () => {
  it("gates every call on the member session, not a query id", () => {
    expect(route).toMatch(/careerSession\(\)/)
    expect(route).toMatch(/unauthorized\(\)/)
    expect(route).not.toMatch(/searchParams\.get\("userId"\)/)
  })

  it("names the key when Growth AI cannot run", () => {
    expect(route).toMatch(/GOOGLE_GEMINI_API_KEY/)
    expect(route).toMatch(/status: 503/)
  })

  it("accepts exactly the four actions and a known discipline", () => {
    expect(route).toMatch(/isGrowthAction\(/)
    expect(route).toMatch(/isLadderDiscipline\(/)
    expect(route).toMatch(/GROWTH_ACTIONS\.join/)
  })

  it("refuses a member with no placement or no next rung", () => {
    expect(route).toMatch(/You are not placed in this discipline yet/)
    expect(route).toMatch(/You are at the top of this ladder/)
  })

  it("scopes the read by the session id", () => {
    expect(route).toMatch(/eq\(growthReviews\.userId, member\.id\)/)
    expect(route).toMatch(/orderBy\(desc\(growthReviews\.asOf\)/)
  })
})

describe("growth never writes the ladder", () => {
  it("does not update or insert career_levels", () => {
    expect(route).not.toMatch(/careerLevels/)
    expect(plan).not.toMatch(/careerLevels/)
  })

  it("appends a growth review for each action", () => {
    expect(route).toMatch(/growthReviews\)/)
    expect(route).toMatch(/kind: action/)
    expect(route).toMatch(/aiMarked: true/)
  })

  it("drops ungrounded links and refuses an empty grounded answer", () => {
    expect(route).toMatch(/filterGrounded\(/)
    expect(route).toMatch(/No grounded sources were returned/)
    expect(route).toMatch(/readGrounding/)
  })

  it("sends only the member's own counts to the review and task prompts", () => {
    expect(route).toMatch(/reviewPrompt\(context\)/)
    expect(route).toMatch(/taskSuggestionsPrompt\(context\)/)
    expect(route).toMatch(/signals: profile\.signals/)
    expect(route).toMatch(/readiness: profile\.readiness/)
  })
})

describe("gap tasks land as a draft plan", () => {
  it("creates a draft agent_plan owned by the member", () => {
    expect(plan).toMatch(/status: "draft"/)
    expect(plan).toMatch(/createdBy: userId/)
    expect(plan).toMatch(/sourceKind: "career"/)
    expect(plan).toMatch(/db\.transaction/)
  })

  it("writes plan items and the growth snapshot together", () => {
    expect(plan).toMatch(/planItems\)/)
    expect(plan).toMatch(/growthReviews\)/)
    expect(plan).toMatch(/kind: "task_suggestions"/)
    expect(plan).toMatch(/planId/)
  })

  it("never creates a task directly", () => {
    expect(plan).not.toMatch(/from\(tasks\)/)
    expect(plan).not.toMatch(/insert\(tasks\)/)
  })
})
```

- [x] **Step 2: Run the guards to verify they fail**

Run: `npx vitest run tests/unit/career-growth-route.test.ts`
Expected: FAIL — files do not exist.

- [x] **Step 3: Implement `lib/career/gap-plan.ts`**

```ts
// A Growth AI task list becomes a draft agent_plan, never tasks (design §11/§14).
// The existing promote route stays the only way a plan becomes work, and the growth
// snapshot and the plan are written in one transaction so neither exists alone.

import { db } from "@/lib/db"
import { agentPlans, growthReviews, planItems } from "@/drizzle/schema"
import type { ReadinessGap } from "./readiness"
import type { CareerSignals } from "./signals"
import type { TaskSuggestion } from "./growth"

export type GapPlanInput = {
  userId: number
  discipline: string
  fromLevel: number
  toLevel: number
  nextTitle: string
  model: string | null
  tasks: TaskSuggestion[]
  gaps: ReadinessGap[]
  signals: CareerSignals
  asOfDay: string
}

export async function createGapPlan(input: GapPlanInput): Promise<{ planId: number; reviewId: number }> {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(agentPlans)
      .values({
        title: `Close the gap: ${input.nextTitle} (${input.discipline})`,
        summary: `Draft plan suggested by Growth AI from ${input.gaps.length} open gap(s). Review, edit, then promote.`,
        sourceKind: "career",
        sourceName: `${input.discipline} L${input.fromLevel} → L${input.toLevel}`,
        sourceText: JSON.stringify({ gaps: input.gaps, signals: input.signals }),
        model: input.model,
        status: "draft",
        createdBy: input.userId,
      })
      .returning({ id: agentPlans.id })

    await tx.insert(planItems).values(
      input.tasks.map((task, index) => ({
        planId: plan.id,
        title: task.title,
        description: task.description,
        discipline: input.discipline,
        estimatePoints: task.estimatePoints,
        status: "todo",
        dependsOn: [],
        sortOrder: index,
      })),
    )

    const [review] = await tx
      .insert(growthReviews)
      .values({
        userId: input.userId,
        kind: "task_suggestions",
        payload: {
          discipline: input.discipline,
          fromLevel: input.fromLevel,
          toLevel: input.toLevel,
          planId: plan.id,
          tasks: input.tasks,
          gaps: input.gaps,
        },
        narrative: null,
        sourceRefs: input.gaps.map((gap) => ({
          kind: gap.kind,
          key: gap.key,
          actual: gap.actual,
          target: gap.target,
        })),
        model: input.model,
        aiMarked: true,
      })
      .returning({ id: growthReviews.id })

    return { planId: plan.id, reviewId: review.id }
  })
}
```

- [x] **Step 4: Implement `app/api/career/growth/route.ts`**

Key structure (complete file):

```ts
// /api/career/growth — the four Growth AI actions (design §11). Reads and writes are
// scoped to the session member. Learning and benchmark answers are checked against
// Google Search grounding: a URL the response did not ground is dropped, and an
// answer with no grounded source is not saved. Nothing here writes career_levels.

import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { growthReviews } from "@/drizzle/schema"
import { geminiJson, geminiText, GeminiError } from "@/lib/ai/gemini"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { loadCareerProfile } from "@/lib/career/profile"
import { localDay } from "@/lib/worklog/local-day"
import { createGapPlan } from "@/lib/career/gap-plan"
import {
  GROWTH_ACTIONS,
  benchmarkPrompt,
  benchmarkSchema,
  filterGrounded,
  isGrowthAction,
  learningPrompt,
  learningSchema,
  readBenchmark,
  readLearningPath,
  readTaskSuggestions,
  reviewPrompt,
  taskSuggestionsPrompt,
  tasksSchema,
  type GrowthContext,
} from "@/lib/career/growth"
import { bad, careerSession, unauthorized } from "../_shared"

export const dynamic = "force-dynamic"
export const GROWTH_LIST_LIMIT = 20

const AI_ERROR: Record<GeminiError["kind"], { status: number; message: string }> = {
  auth: { status: 503, message: "Growth AI is not configured." },
  quota: { status: 429, message: "The AI provider is rate limited. Try again later." },
  blocked: { status: 422, message: "The AI provider refused this request." },
  timeout: { status: 504, message: "The AI provider timed out." },
  transport: { status: 502, message: "The AI provider could not be reached." },
  badjson: { status: 502, message: "The AI provider returned an unusable answer." },
}

const MODEL = () => process.env.GEMINI_MODEL ?? null

export async function GET(request: Request) {
  const member = await careerSession()
  if (!member) return unauthorized()

  const discipline = new URL(request.url).searchParams.get("discipline")
  if (discipline !== null && !isLadderDiscipline(discipline)) {
    return bad("Unknown career discipline")
  }

  try {
    const reviews = await db
      .select()
      .from(growthReviews)
      .where(eq(growthReviews.userId, member.id))
      .orderBy(desc(growthReviews.asOf), desc(growthReviews.id))
      .limit(GROWTH_LIST_LIMIT)

    return NextResponse.json({
      success: true,
      data: {
        aiAvailable: Boolean(process.env.GOOGLE_GEMINI_API_KEY),
        reviews,
      },
    })
  } catch (error) {
    console.error("Growth read error:", error)
    return NextResponse.json({ success: false, error: "Failed to load growth results" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const member = await careerSession()
  if (!member) return unauthorized()

  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; discipline?: unknown }
    | null
  if (!isGrowthAction(body?.action)) {
    return bad(`action must be one of: ${GROWTH_ACTIONS.join(", ")}`)
  }
  const action = body.action
  const discipline = body.discipline
  if (!isLadderDiscipline(discipline)) return bad("Unknown career discipline")

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "Growth AI is not configured. Set GOOGLE_GEMINI_API_KEY." },
      { status: 503 },
    )
  }

  try {
    const profile = await loadCareerProfile({
      userId: member.id,
      discipline,
      timeZone: member.timezone,
    })
    if (!profile.placement) return bad("You are not placed in this discipline yet", 409)
    if (!profile.next || !profile.readiness || !profile.signals) {
      return bad("You are at the top of this ladder", 409)
    }

    const context: GrowthContext = {
      memberName: member.name,
      discipline,
      fromLevel: profile.placement.level,
      currentTitle: profile.current?.title ?? null,
      toLevel: profile.next.level,
      nextTitle: profile.next.title,
      nextSummary: profile.next.summary,
      signals: profile.signals,
      targets: profile.next.targets,
      readiness: profile.readiness,
      history: profile.history.map((entry) => ({ fromLevel: entry.fromLevel, toLevel: entry.toLevel })),
      asOfDay: localDay(new Date(), member.timezone),
    }

    if (action === "review") {
      const prompt = reviewPrompt(context)
      const result = await geminiText({
        system: prompt.system,
        contents: [{ text: prompt.user }],
        temperature: 0.3,
        maxOutputTokens: 2048,
        timeoutMs: 45_000,
      })
      const narrative = result.text.trim().slice(0, 12_000)
      if (!narrative) return bad("The AI provider returned an empty review.", 502)

      const [review] = await db
        .insert(growthReviews)
        .values({
          userId: member.id,
          kind: action,
          payload: {
            discipline,
            fromLevel: context.fromLevel,
            toLevel: context.toLevel,
            signals: context.signals,
            readiness: context.readiness,
            asOfDay: context.asOfDay,
          },
          narrative,
          sourceRefs: Object.entries(context.signals).map(([key, actual]) => ({
            kind: "signal",
            key,
            actual,
            target: context.targets[key as keyof typeof context.targets] ?? 0,
          })),
          model: MODEL(),
          aiMarked: true,
        })
        .returning()

      return NextResponse.json({ success: true, data: { review } })
    }

    if (action === "task_suggestions") {
      const prompt = taskSuggestionsPrompt(context)
      const result = await geminiJson(
        {
          system: prompt.system,
          contents: [{ text: prompt.user }],
          responseSchema: tasksSchema.shape ? tasksSchemaToJson() : {},
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        (raw) => readTaskSuggestions(raw),
      )
      if (!result.data.ok) return bad("The AI provider returned unusable task suggestions.", 502)

      const created = await createGapPlan({
        userId: member.id,
        discipline,
        fromLevel: context.fromLevel,
        toLevel: context.toLevel,
        nextTitle: context.nextTitle,
        model: MODEL(),
        tasks: result.data.value.tasks,
        gaps: context.readiness.gaps,
        signals: context.signals,
        asOfDay: context.asOfDay,
      })

      const [review] = await db
        .select()
        .from(growthReviews)
        .where(eq(growthReviews.id, created.reviewId))
        .limit(1)

      return NextResponse.json({ success: true, data: { review, planId: created.planId } })
    }

    const grounded = action === "learning"
    const prompt = grounded ? learningPrompt(context) : benchmarkPrompt(context)
    const result = await geminiJson(
      {
        system: prompt.system,
        contents: [{ text: prompt.user }],
        responseSchema: grounded ? learningJsonSchema() : benchmarkJsonSchema(),
        googleSearch: true,
        temperature: 0.2,
        maxOutputTokens: 4096,
        timeoutMs: 90_000,
      },
      (raw) => (grounded ? readLearningPath(raw) : readBenchmark(raw)),
    )

    if (grounded) {
      const read = result.data
      if (!read.ok) return bad("The AI provider returned an unusable learning path.", 502)
      const filtered = filterGrounded(read.value.items, result.grounding)
      if (filtered.kept.length === 0) {
        return bad("No grounded sources were returned; nothing was saved.", 502)
      }
      const sources = filtered.kept.map((item) => ({ url: item.url, title: item.title }))
      const [review] = await db
        .insert(growthReviews)
        .values({
          userId: member.id,
          kind: "learning",
          payload: {
            discipline,
            fromLevel: context.fromLevel,
            toLevel: context.toLevel,
            items: filtered.kept,
            dropped: filtered.dropped,
            queries: result.grounding?.queries ?? [],
            asOfDay: context.asOfDay,
          },
          narrative: null,
          sourceRefs: sources,
          model: MODEL(),
          aiMarked: true,
        })
        .returning()
      return NextResponse.json({ success: true, data: { review } })
    }

    const read = result.data
    if (!read.ok) return bad("The AI provider returned an unusable benchmark.", 502)
    const filtered = filterGrounded(read.value.value.sources, result.grounding)
    if (filtered.kept.length < 2) {
      return bad("No grounded sources were returned; nothing was saved.", 502)
    }
    const benchmark = { ...read.value.value, sources: filtered.kept }
    const [review] = await db
      .insert(growthReviews)
      .values({
        userId: member.id,
        kind: "benchmark",
        payload: {
          discipline,
          fromLevel: context.fromLevel,
          toLevel: context.toLevel,
          benchmark,
          asOfDay: context.asOfDay,
        },
        narrative: null,
        sourceRefs: filtered.kept,
        model: MODEL(),
        aiMarked: true,
      })
      .returning()
    return NextResponse.json({ success: true, data: { review } })
  } catch (error) {
    if (error instanceof GeminiError) {
      const mapped = AI_ERROR[error.kind]
      return NextResponse.json({ success: false, error: mapped.message }, { status: mapped.status })
    }
    console.error("Growth action error:", error)
    return NextResponse.json({ success: false, error: "Failed to run the growth action" }, { status: 500 })
  }
}
```

Implement the three JSON-schema functions at the bottom of `lib/career/growth.ts` (plain objects, no zod introspection):

```ts
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
```

Use `tasksJsonSchema()` in the route, not `tasksSchema.shape`.

- [x] **Step 5: Run the route guards, growth tests and typecheck**

Run: `npx vitest run tests/unit/career-growth.test.ts tests/unit/career-growth-route.test.ts && npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [x] **Step 6: Commit**

```bash
git add lib/career/gap-plan.ts app/api/career/growth/route.ts tests/unit/career-growth.test.ts tests/unit/career-growth-route.test.ts
git commit -m "feat(career): growth route with grounded sources and draft gap plans"
```

---

### Task 4: Growth AI panel on the member career page

**Files:**
- Create: `app/dashboard/career/growth-panel.tsx`
- Modify: `app/dashboard/career/career-client.tsx`
- Test: `tests/unit/career-pages.test.ts` (extend)

**Interfaces:**
- Consumes: `GET/POST /api/career/growth`; `GROWTH_ACTIONS`, `GrowthAction`, `GROWTH_ACTION_LABEL` from `lib/career/growth`.
- Produces: `<GrowthPanel discipline={data.discipline} top={data.top} />` rendered inside the placement branch.

- [x] **Step 1: Write the failing guards**

Append to `tests/unit/career-pages.test.ts` inside the member-page describe block:

```ts
  it("offers four Growth AI actions with the key named and honest labels", () => {
    const growth = codeOnly(src("app/dashboard/career/growth-panel.tsx"))
    expect(growth).toMatch(/fetch\("\/api\/career\/growth"/)
    expect(growth).toMatch(/method: "POST"/)
    expect(growth).toMatch(/GOOGLE_GEMINI_API_KEY/)
    expect(growth).toMatch(/Suggestion only/)
    expect(growth).toMatch(/rel="noreferrer"/)
    expect(growth).toMatch(/\/dashboard\/planner\//)
    expect(growth).toMatch(/filterGrounded|dropped/)
    expect(growth).not.toMatch(/computeReadiness|countCareerSignals/)
  })

  it("mounts the growth panel only when a placement exists", () => {
    expect(client).toMatch(/<GrowthPanel discipline=\{data\.discipline\} top=\{data\.top\} \/>/)
  })
```

- [x] **Step 2: Run the guards to verify they fail**

Run: `npx vitest run tests/unit/career-pages.test.ts`
Expected: FAIL — `growth-panel.tsx` missing and no `GrowthPanel`.

- [x] **Step 3: Implement `app/dashboard/career/growth-panel.tsx`**

```tsx
"use client"

// Four Growth AI actions (design §11). The panel only renders what the server saved:
// it never computes readiness, never invents a source and never publishes a band. A
// learning item or benchmark source is shown only because the route verified its URL
// against Google Search grounding.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import {
  GROWTH_ACTIONS,
  GROWTH_ACTION_LABEL,
  type GrowthAction,
} from "@/lib/career/growth"

type LearningPayload = {
  items: Array<{ title: string; provider: string | null; url: string; why: string; hours: number | null }>
  dropped: number
  queries: string[]
  asOfDay: string
}

type BenchmarkPayload = {
  benchmark: {
    min: number
    max: number
    currency: string
    market: string
    basis: string
    sources: Array<{ url: string; title: string | null }>
  }
  asOfDay: string
}

type ReviewPayload = {
  signals: Record<string, number>
  readiness: { percent: number; capped: boolean; capReason: string | null }
  asOfDay: string
}

type TasksPayload = {
  planId: number
  tasks: Array<{ title: string; description: string; estimatePoints: number }>
  gaps: Array<{ kind: string; label: string }>
  asOfDay: string
}

type GrowthRow = {
  id: number
  kind: GrowthAction
  payload: LearningPayload | BenchmarkPayload | ReviewPayload | TasksPayload
  narrative: string | null
  sourceRefs: Array<{ url?: string; title?: string | null; key?: string; actual?: number; target?: number }>
  asOf: string
  model: string | null
  aiMarked: boolean
}

function day(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export function GrowthPanel({ discipline, top }: { discipline: string | null; top: boolean }) {
  const { toast } = useToast()
  const [aiAvailable, setAiAvailable] = useState(false)
  const [rows, setRows] = useState<GrowthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<GrowthAction | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/career/growth")
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error ?? `Request failed (${res.status})`)
      setAiAvailable(Boolean(json.data.aiAvailable))
      setRows((json.data.reviews ?? []) as GrowthRow[])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/career/growth")
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(json?.error ?? `Request failed (${res.status})`)
        if (cancelled) return
        setAiAvailable(Boolean(json.data.aiAvailable))
        setRows((json.data.reviews ?? []) as GrowthRow[])
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const run = async (action: GrowthAction) => {
    if (!discipline) return
    setBusy(action)
    try {
      const res = await fetch("/api/career/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, discipline }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error ?? `Request failed (${res.status})`)
      toast({ title: `${GROWTH_ACTION_LABEL[action]} saved`, description: "The result is below and in your history." })
      await load()
    } catch (err) {
      toast({
        title: `${GROWTH_ACTION_LABEL[action]} failed`,
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const latest = (action: GrowthAction): GrowthRow | undefined =>
    rows.find((row) => row.kind === action)

  const disabled = !aiAvailable || top || busy !== null || !discipline

  return (
    <SectionCard title="Growth AI" icon={<Badge variant="outline">AI</Badge>}>
      <div className="space-y-4">
        {!aiAvailable ? (
          <Alert>
            <AlertDescription>
              Growth AI is off. Set <code className="rounded bg-muted px-1">GOOGLE_GEMINI_API_KEY</code> to
              enable it; the rest of this page works without it.
            </AlertDescription>
          </Alert>
        ) : null}

        {top ? (
          <p className="text-sm text-muted-foreground">
            You are at the top of this ladder, so there is no next rung to prepare for.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {GROWTH_ACTIONS.map((action) => (
              <Button
                key={action}
                variant="outline"
                disabled={disabled}
                onClick={() => void run(action)}
              >
                {busy === action ? "Working…" : GROWTH_ACTION_LABEL[action]}
              </Button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          AI-generated and may be wrong. Learning links and benchmark sources are checked against the
          search results before they appear; anything unverified is dropped.
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? <p className="text-sm text-muted-foreground">Loading saved results…</p> : null}

        {!loading && rows.length === 0 ? (
          <EmptyNote>No growth results yet.</EmptyNote>
        ) : null}

        <div className="space-y-4">
          {GROWTH_ACTIONS.map((action) => {
            const row = latest(action)
            if (!row) return null
            return (
              <div key={row.id} className="rounded-md border border-border/60 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{GROWTH_ACTION_LABEL[action]}</p>
                  <Badge variant="outline">{row.aiMarked ? "AI" : "Saved"}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {day(row.asOf)}
                    {row.model ? ` · ${row.model}` : ""}
                  </span>
                </div>
                <GrowthBody row={row} />
              </div>
            )
          })}
        </div>
      </div>
    </SectionCard>
  )
}

function GrowthBody({ row }: { row: GrowthRow }) {
  if (row.kind === "learning") {
    const payload = row.payload as LearningPayload
    return (
      <div className="space-y-2">
        <ul className="space-y-2">
          {payload.items.map((item) => (
            <li key={item.url} className="text-sm">
              <a className="font-medium underline" href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
              {item.provider ? <span className="text-muted-foreground"> · {item.provider}</span> : null}
              {item.hours ? <span className="text-muted-foreground"> · {item.hours}h</span> : null}
              <p className="text-xs text-muted-foreground">{item.why}</p>
            </li>
          ))}
        </ul>
        {payload.dropped > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {payload.dropped} unverified link{payload.dropped === 1 ? "" : "s"} removed.
          </p>
        ) : null}
      </div>
    )
  }

  if (row.kind === "benchmark") {
    const { benchmark } = row.payload as BenchmarkPayload
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium">
          {benchmark.min.toLocaleString()}–{benchmark.max.toLocaleString()} {benchmark.currency}
          <span className="text-muted-foreground"> · {benchmark.market}</span>
        </p>
        <p className="text-xs text-muted-foreground">{benchmark.basis}</p>
        <ul className="space-y-1 text-xs">
          {benchmark.sources.map((source) => (
            <li key={source.url}>
              <a className="underline" href={source.url} target="_blank" rel="noreferrer">
                {source.title ?? source.url}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          Suggestion only. A band is published by an admin on the ladder, never by this action.
        </p>
      </div>
    )
  }

  if (row.kind === "review") {
    return <p className="whitespace-pre-line text-sm">{row.narrative}</p>
  }

  const payload = row.payload as TasksPayload
  return (
    <div className="space-y-2 text-sm">
      <ul className="space-y-2">
        {payload.tasks.map((task, index) => (
          <li key={`${task.title}-${index}`}>
            <p className="font-medium">
              {task.title} <span className="text-muted-foreground">· {task.estimatePoints} pts</span>
            </p>
            <p className="text-xs text-muted-foreground">{task.description}</p>
          </li>
        ))}
      </ul>
      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/planner/${payload.planId}`}>Review the draft plan</Link>
      </Button>
    </div>
  )
}
```

- [x] **Step 4: Mount it in `career-client.tsx`**

Import `GrowthPanel` from `./growth-panel` and render after `<ReadinessPanel … />`:

```tsx
          <ReadinessPanel data={data} discipline={data.discipline} />

          <GrowthPanel discipline={data.discipline} top={data.top} />
```

- [x] **Step 5: Run tests, lint and typecheck**

Run: `npx vitest run tests/unit/career-pages.test.ts tests/unit/career-growth.test.ts tests/unit/career-growth-route.test.ts && npx tsc --noEmit`
Then: `npx eslint app/dashboard/career/growth-panel.tsx app/dashboard/career/career-client.tsx`
Expected: PASS; no `react-hooks/set-state-in-effect` error.

- [x] **Step 6: Commit**

```bash
git add app/dashboard/career/growth-panel.tsx app/dashboard/career/career-client.tsx tests/unit/career-pages.test.ts
git commit -m "feat(career): Growth AI panel with grounded links and draft plans"
```

---

### Task 5: Docs, gates and commit

**Files:** `FEATURES.md` (§19), `README.md` (AI surfaces), spec phase 14 line, this plan.

- [x] **Step 1: FEATURES §19** — surfaces, four actions, grounding rule, storage kinds, no-ladder-write rule, draft plan handoff, member-only scope, AI-unavailable state, deliberate absences, guard files and suite count.
- [x] **Step 2: README** — "Five surfaces" becomes "Six surfaces"; add `Career growth | POST /api/career/growth | Signed-in member | Their own counts and gaps, plus Google Search results whose URLs are verified against grounding metadata`. Add the grounding exception to the three rules (rule 2 or a new rule 4).
- [x] **Step 3: Spec phase 14** — mark shipped with what the phase added beyond the line and the suite count.
- [x] **Step 4: Check plan checkboxes**, update project memory `jiravision-worklog-reports-phases.md` (phase 14 shipped; next 15–16 registers/playbooks, 17 onboarding).
- [x] **Step 5: Gates**

```bash
npx tsc --noEmit
npm run lint          # 0 errors; components/planner/gantt.tsx:43 is the known pre-existing error
npm test
git status            # check for the concurrent auto-commit watcher before staging
```

- [x] **Step 6: Commit and push**

```bash
git add FEATURES.md README.md docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md docs/superpowers/plans/2026-10-27-growth-ai-phase14.md
git commit -m "feat(career): phase 14 — Growth AI with grounded sources and draft gap plans"
git push
```

## Deliberately absent

- **A published band from AI.** The benchmark is a suggestion with sources; only an admin's ladder edit publishes a range.
- **AI task creation.** Suggestions become a draft `agent_plan`; the existing promote click is still the only path to `tasks`.
- **Admin access to a member's growth reviews.** The ladder admin surface reviews requests, not AI advice.
- **Caching or quotas per member.** Each click calls the provider once; the provider's own quota errors surface as 429.
- **Grounding fallback without sources.** If Google Search grounding is unavailable, the action fails loudly rather than showing unverified numbers or links.
- **Editable or deletable snapshots.** `growth_reviews` is append-only; a later run adds a newer row.
