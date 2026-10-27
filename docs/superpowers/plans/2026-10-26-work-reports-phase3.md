# Period Work Reports (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the reporting deliverable — `/dashboard/reports-work` and `/api/reports/work/*` — so a member can pick a period (daily · weekly · monthly · yearly · custom), have its ten report sections auto-filled from their own work log, deliverables, `task_events` transitions and forward plan, edit the prose, and save a `draft` row in `work_reports`. No AI, no submission, no recipients: those are phases 4+.

**Architecture:** Seven pure, DB-free modules under `lib/reports/` hold every rule — period resolution (`period.ts`), the aggregation that produces each number **and the row refs behind it** (`aggregate.ts`), the ten-section inventory and the five discipline templates (`templates.ts`), the write whitelists and the `ReportDto` (`report-fields.ts`), the builder's URL state (`view-state.ts`), the row-section vocabulary (`row-sections.ts`), and the chart set with its unit pin (`charts.ts`). Four API routes under `/api/reports/work/*` are thin: authenticate, scope every read by `session.id` in the SQL, call a pure module, return the `{ success, data }` envelope; one `_shared.ts` owns the five reads that feed the aggregate. One client page composes twelve `SectionCard`s — the spec's ten report sections plus "My reports" and "Period" — over a live preview when nothing is saved and a saved row when `?r=<id>` is present.

**Tech Stack:** Next.js 16.1.1 App Router (client page under a `Suspense` boundary, as `app/dashboard/worklog/page.tsx` does), drizzle-orm 0.45.4 over the phase-1 `work_reports` / `work_report_recipients` tables **already present in production Neon**, React 19 + recharts + shadcn/ui, Vitest (node env, `tests/unit/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` §6 (period reports), §13 (`work_reports`, `work_report_recipients`), §15 (testing), §16 phase 3. §10 (exports) is phase 5 and is deliberately not in this plan.

## Global Constraints

- `npm run typecheck` at 0 errors, `npm run lint` at 0 errors with the **70-warning baseline unchanged**, `npm test` green before every commit and push. Run all three from the repo root.
- Never run `npm run build` locally — Vercel builds on push (owner's standing rule).
- **No migration in this plan.** `work_reports` and `work_report_recipients` were created by `npm run db:worklog` on 2026-10-26 and verified read-only (0 rows each). `drizzle/schema.ts` exports `workReports` (`drizzle/schema.ts:500`) and `workReportRecipients` (`:531`) already; this plan reads and writes those objects and adds no table and no column. If a later phase needs a column, that is a *new additive script plus an owner checkpoint* — never `drizzle-kit push`.
- No unit test may import a module that reaches `lib/db` (the CommonJS `lib/db.js` shadows `lib/db.ts` under Vitest — see `tests/unit/worklog-schema.test.ts:11-13` for the alias pin). Every rule therefore lives in a DB-free module; the only DB-touching files are `app/api/reports/work/**`.
- No `NEXT_PUBLIC_` prefix may appear anywhere in this phase. No secret is printed in chat or committed. No new env var, so `.env.example` is untouched.
- "Fully functional" is the acceptance bar: no dead button, no `href="#"`, no `console.log` handler, no static fake number. Every control §6 gives phase 3 — period picker, template picker, ten sections, prose editing, save draft, recompute, drill-down, the report list — is implemented. What belongs to later phases is **absent, not stubbed**: submit / lock / revise, recipients and the default reporting line, the inbox, ack and return, notifications, the AI "Draft summary" and "Polish this section" buttons, PDF/XLSX, and the admin team view. `FEATURES.md` records that list (Task 17).
- **Nothing in this plan reads `tasks.updated_at` as a work date.** "Completed" comes from `task_events` (`to_status` plus the event's `at`), the same rule the `/dashboard` Today strip uses (`app/api/worklog/summary/route.ts:37-53`). A task finished before the log started recording shows up nowhere, and the report says so out loud rather than guessing a date.
- Every metric carries the rows that made it. `Count = { value: number; refs: string[] }` with prefixed refs (`entry:12`, `task:7`, `deliverable:3`, `day:2026-10-03`, `event:44`, `plan:9`) and the invariant guarded in Task 2: for a count metric `value === refs.length`; for the two sum metrics (`minutes`, `storyPointsCompleted`) a non-zero `value` implies `refs.length > 0`. A number with no refs is a plan failure, not a review finding.
- An empty period yields **zeros and empty arrays, never nulls** — a report rendered on a quiet week must not print "undefined".
- Reads and writes are scoped by the session user id **in the SQL**, not in the UI. A report is private to its author in phase 3: `GET /api/reports/work/[id]` returns 404, not 403, for anybody else (`app/api/worklog/_shared.ts:174-195` is the ownership-first filter pattern). Recipients widen the read in phase 4.
- `status` is server-owned. Every row this plan writes is `'draft'`; the column's other three values (`submitted`, `acknowledged`, `returned`) are phase 4's, and no request body in this plan can set any of them.
- Vocabulary lives in exactly one module each and is never re-declared: periods in `lib/reports/period.ts`, sections/templates in `lib/reports/templates.ts`, entry kinds/deliverable statuses in `lib/worklog/entries.ts`, disciplines in `lib/roles.ts:WORK_DISCIPLINES`, cadence in `lib/cadence.ts`. The template ids this plan introduces (`general`, `engineering`, `technical`, `assurance`, `creative`) must match the values already stored in `lib/roles.ts:97-108` (`CATEGORY_TEMPLATE`), which `DISCIPLINE_TEMPLATE` (`lib/roles.ts:301`) maps every discipline onto — read that map, do not duplicate it.
- The `period_type` column is `varchar(10)` and `work_reports.period_type` has a default of `'weekly'`; `template` is `varchar(40)`; `status` is `varchar(20)` (`drizzle/schema.ts:505-512`). Every value this plan writes fits those widths, and the validator in `report-fields.ts` refuses anything that would not.
- `shadcn` `SelectItem` must never receive `value=""` (guard `tests/unit/select-items.test.ts:31-62`). The sentinel for "no discipline / follow me" in this plan is the literal `"auto"`, and "every value" in a filter stays `"all"`, matching phase 2.
- **The URL is the view state's serialised form, and the two sync effects follow the phase-2 rules exactly.** Never compare a serialised state against `window.location.search` raw — the search keeps its leading `?` and the serializer does not, so strip with `/^\?/u`. Adoption compares `serializeReportView(parsed, todayIso)` against `serializeReportView(prev, todayIso)`, never against the incoming query string. Tasks 12–15 add controls through `patchState`; none of them adds a third sync effect.
- Charts fill only from `DISCIPLINE_COLOUR` / `KIND_COLOUR` (both `hsl(var(--chart-*))` triplets, consumed wrapped — a bare `var()` is an invalid colour), a `--chart-*` token is a **graphic** at 3:1 or better and label text is always `--foreground`, and no number is ever conveyed by colour alone. No new token in `app/globals.css`, so `app/accessibility.css` needs no re-lighting (the rule that pinned phase 2, `tests/unit/accessibility.test.ts`).
- The page carries **12 sections** (owner rule: 10–14 per dashboard page), each a `SectionCard` from `components/dashboard-kit.tsx:37`, and all 12 render in every view; the two control cards never hide behind a tab.
- `react-hooks/exhaustive-deps` is **on** for `app/dashboard/**`: every effect's dependencies are real, so a stale-closure bug fails lint rather than shipping.
- Comments: one short line, only where the *why* is non-obvious (a schema quirk, a deliberate omission, a security boundary). No task-referencing comments.
- Commit after every task with a conventional message (`feat(reports): …`, `test(reports): …`); push at the end of each task (standing grant: always commit and push after changes). Never rewrite pushed history.
- **The dev server is not running, and no task starts one.** `npm run dev` is the owner's; the executor never runs it, restarts it, or claims a browser check it could not make. Anything that needs a live server is written as a numbered owner check (Task 16 collects them) — a curl against `localhost:3000` is only run when something is already listening. Visual QA is the owner's (`i will do the test just implement`); the agent's guards are analyze, typecheck, lint and the Vitest suite.

## File structure

Created — pure modules (DB-free, unit-testable):

| Path | Responsibility |
| --- | --- |
| `lib/reports/period.ts` | Resolve `periodType` + an anchor day into an exact inclusive `[start, end]` with its day list and its series buckets. ISO week semantics, month/year/custom edges, anchor stepping. Pure. |
| `lib/reports/aggregate.ts` | `aggregateReport()` — every section's rows and every number plus the refs behind it; the task-status bucketing vocabulary. Pure. |
| `lib/reports/templates.ts` | The ten report sections, the five templates (order + leading metrics + chart set), `templateForDiscipline()`, `emptyContent()`. Pure. |
| `lib/reports/report-fields.ts` | `ReportDto` / `ReportContent` shapes, the write whitelists (`readReportCreate`, `pickReportUpdates`, `readContent`), the draft-only edit rule, `FORBIDDEN_REPORT_KEYS`. Pure. |
| `lib/reports/view-state.ts` | The builder's URL grammar — `v`, `p`, `d`, `from`, `to`, `tpl`, `r`, `open`, `q` — parsed, serialised, resolved. Pure. |
| `lib/reports/row-sections.ts` | Which rows belong to which of the six computed sections, the one-line caption each card shows, and the collapse/expand cut. Pure. |
| `lib/reports/charts.ts` | `chartRows()` — the four split buckets and the period series turned into labelled, coloured bar data with their refs — plus `CHART_UNIT`, the single source of "is this bar minutes or a count", and `formatMetricValue`. Pure. |

Created — server:

| Path | Responsibility |
| --- | --- |
| `app/api/reports/work/_shared.ts` | The five ownership-scoped reads that feed the aggregate, the report column map, `mapReport()`, `assembleReport()`. Not a route file, so it may export values. |
| `app/api/reports/work/route.ts` | GET my reports (status/template/period-type filter + title search), POST a draft seeded from a live aggregate. |
| `app/api/reports/work/preview/route.ts` | GET the aggregate for a period with nothing saved — what the builder shows before the first save. |
| `app/api/reports/work/[id]/route.ts` | GET one own report, PATCH a own draft, DELETE a own draft. |
| `app/api/reports/work/[id]/recompute/route.ts` | POST — re-run the aggregate over a saved draft, keep the author's prose, stamp `metrics`. |

Created — UI:

| Path | Responsibility |
| --- | --- |
| `app/dashboard/reports-work/page.tsx` | Server component: `Suspense` wrapper + skeleton, same shape as `app/dashboard/worklog/page.tsx`. |
| `app/dashboard/reports-work/reports-client.tsx` | `"use client"`: the fetches, URL sync, the save/dirty/recompute handlers, and the twelve-section order. |
| `app/dashboard/reports-work/sections.tsx` | The twelve `SectionCard` bodies: period controls, draft list, header, the six computed row sections with the drill-down disclosure, the metric KPI strip, the chart components and the prose editors. Section titles come from `SECTION_TITLE`; this file does not re-declare them. |
| `app/dashboard/reports-work/dialogs.tsx` | New-report dialog (period + template + title) and the confirm-delete-draft dialog. |

Modified: `components/dashboard-layout.tsx` (nav item), `tests/unit/report-*.test.ts` (seven pure-module files, two guard files), `FEATURES.md`, `DESIGN_SYSTEM.md`, `PLACEHOLDERS.md`, the spec's §6/§13/§16.

---

### Task 1: Period math — `lib/reports/period.ts`

**Files:**
- Create: `lib/reports/period.ts`
- Test: `tests/unit/report-period.test.ts`
- Read first: `lib/worklog/local-day.ts` (reuse `isIsoDate`, `monthBoundsIso`, `rangeDays`, `shiftDays`, `weekStartIso` — do not re-implement day arithmetic)

**Interfaces:**
- Consumes: `local-day.ts`'s ISO-day helpers.
- Produces: `PERIOD_TYPES`, `PeriodType`, `PERIOD_LABEL`, `isPeriodType`, `MAX_PERIOD_DAYS`, `PeriodBucket`, `Period`, `isoWeek`, `periodBuckets`, `resolvePeriod(type, anchorIso, custom?)`, `periodLabel(type, start, end)`, `shiftPeriodAnchor(type, anchorIso, delta)`. Task 2's `ReportSource.period` is this `Period`; Task 5 serialises `PeriodType`; Task 6 calls `resolvePeriod`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-period.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  MAX_PERIOD_DAYS,
  PERIOD_TYPES,
  isPeriodType,
  isoWeek,
  periodBuckets,
  resolvePeriod,
  shiftPeriodAnchor,
} from "@/lib/reports/period"

describe("the period vocabulary", () => {
  it("lists exactly the five spec period types", () => {
    expect(PERIOD_TYPES).toEqual(["daily", "weekly", "monthly", "yearly", "custom"])
  })

  it("rejects an unknown period type instead of defaulting", () => {
    expect(isPeriodType("weekly")).toBe(true)
    expect(isPeriodType("fortnightly")).toBe(false)
    expect(isPeriodType(undefined)).toBe(false)
    expect(isPeriodType("")).toBe(false)
  })
})

describe("ISO week numbering", () => {
  it("puts 2026-01-01 (a Thursday) in week 1 of 2026", () => {
    expect(isoWeek("2026-01-01")).toEqual({ isoYear: 2026, week: 1 })
  })

  it("keeps the Monday of that week in 2025 but the week in 2026", () => {
    // 2025-12-29 is the Monday of 2026-W01: the calendar year and the ISO year disagree,
    // and a report labelled "week of 2025-12-29" is what loses a supervisor's trust.
    expect(isoWeek("2025-12-29")).toEqual({ isoYear: 2026, week: 1 })
    expect(resolvePeriod("weekly", "2025-12-29").start).toBe("2025-12-29")
    expect(resolvePeriod("weekly", "2025-12-29").label).toMatch(/^2026-W01/u)
  })

  it("carries 2027-01-01 back into 2026-W53", () => {
    // 2026 starts on a Thursday and is not a leap year, so it has 53 ISO weeks.
    expect(isoWeek("2027-01-01")).toEqual({ isoYear: 2026, week: 53 })
    expect(isoWeek("2026-12-28")).toEqual({ isoYear: 2026, week: 53 })
  })
})

describe("resolvePeriod", () => {
  it("resolves a daily period to exactly one day", () => {
    const period = resolvePeriod("daily", "2026-10-26")
    expect(period.start).toBe("2026-10-26")
    expect(period.end).toBe("2026-10-26")
    expect(period.days).toEqual(["2026-10-26"])
    expect(period.buckets).toHaveLength(1)
  })

  it("resolves a weekly period to Monday through Sunday", () => {
    const period = resolvePeriod("weekly", "2026-10-28") // a Wednesday
    expect(period.start).toBe("2026-10-26")
    expect(period.end).toBe("2026-11-01")
    expect(period.days).toHaveLength(7)
  })

  it("resolves a monthly period across a leap February", () => {
    const period = resolvePeriod("monthly", "2024-02-15")
    expect(period.start).toBe("2024-02-01")
    expect(period.end).toBe("2024-02-29")
    expect(period.days).toHaveLength(29)
  })

  it("resolves a yearly period to Jan 1 through Dec 31 and twelve buckets, not 365 rows", () => {
    const period = resolvePeriod("yearly", "2026-07-04")
    expect(period.start).toBe("2026-01-01")
    expect(period.end).toBe("2026-12-31")
    expect(period.days).toHaveLength(365)
    expect(period.buckets).toHaveLength(12)
    expect(period.buckets[1]).toEqual({ key: "2026-02", label: "Feb 2026", start: "2026-02-01", end: "2026-02-28" })
    expect(period.buckets[11]!.end).toBe("2026-12-31")
  })

  it("clips a February bucket inside a leap year", () => {
    const period = resolvePeriod("yearly", "2024-01-01")
    expect(period.buckets[1]!.end).toBe("2024-02-29")
  })

  it("swaps a reversed custom range", () => {
    const period = resolvePeriod("custom", "2026-10-26", { from: "2026-10-20", to: "2026-10-24" })
    expect(period.start).toBe("2026-10-20")
    expect(period.end).toBe("2026-10-24")
    expect(period.days).toHaveLength(5)
  })

  it("normalises a custom range wider than the cap rather than refusing it", () => {
    const period = resolvePeriod("custom", "2026-01-01", { from: "2020-01-01", to: "2026-12-31" })
    expect(period.end).toBe(shiftPeriodAnchor("custom", "2020-01-01", MAX_PERIOD_DAYS - 1))
    expect(period.days).toHaveLength(MAX_PERIOD_DAYS)
  })

  it("falls back to the anchor when a custom range is missing or malformed", () => {
    expect(resolvePeriod("custom", "2026-10-26").days).toEqual(["2026-10-26"])
    expect(resolvePeriod("custom", "2026-10-26", { from: "26/10/2026" }).start).toBe("2026-10-26")
  })

  it("treats a malformed anchor as the epoch rather than throwing", () => {
    const period = resolvePeriod("monthly", "not-a-date")
    expect(period.start).toBe("1970-01-01")
    expect(period.end).toBe("1970-01-31")
  })
})

describe("series buckets", () => {
  it("buckets a short period by day", () => {
    const buckets = periodBuckets("2026-10-20", "2026-10-23")
    expect(buckets.map((b) => b.key)).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"])
  })

  it("switches to months past sixty days", () => {
    const buckets = periodBuckets("2026-01-15", "2026-04-10")
    expect(buckets.map((b) => b.key)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"])
    // Clipped to the range: a partial month reports the days it actually covers.
    expect(buckets[0]!.start).toBe("2026-01-15")
    expect(buckets[3]!.end).toBe("2026-04-10")
  })

  it("handles a December-to-January span", () => {
    const buckets = periodBuckets("2025-11-15", "2026-02-10")
    expect(buckets.map((b) => b.key)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"])
    expect(buckets[0]!.label).toBe("Nov 2025")
  })
})

describe("shiftPeriodAnchor", () => {
  it("steps days and weeks by the nominal length", () => {
    expect(shiftPeriodAnchor("daily", "2026-10-26", 1)).toBe("2026-10-27")
    expect(shiftPeriodAnchor("weekly", "2026-10-26", -1)).toBe("2026-10-19")
  })

  it("steps months without overflowing a 31st", () => {
    expect(shiftPeriodAnchor("monthly", "2026-01-31", 1)).toBe("2026-02-28")
    expect(shiftPeriodAnchor("monthly", "2026-03-31", -1)).toBe("2026-02-28")
    expect(shiftPeriodAnchor("monthly", "2026-12-15", 1)).toBe("2027-01-15")
    expect(shiftPeriodAnchor("monthly", "2026-01-15", -2)).toBe("2025-11-15")
  })

  it("steps a leap day forward to a clamped ordinary day", () => {
    expect(shiftPeriodAnchor("yearly", "2024-02-29", 1)).toBe("2025-02-28")
    expect(shiftPeriodAnchor("yearly", "2026-07-04", -1)).toBe("2025-07-04")
  })

  it("leaves a custom anchor on a plain day step", () => {
    expect(shiftPeriodAnchor("custom", "2026-10-26", 7)).toBe("2026-11-02")
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- report-period`
Expected: FAIL — `Cannot find module '@/lib/reports/period'`. If it fails any other way, fix that first; a test failing for the wrong reason proves nothing.

- [ ] **Step 3: Write the module**

Create `lib/reports/period.ts`:

```ts
// The only place that turns "my week" into two dates. A period boundary is what a
// supervisor reads, so ISO semantics (Mon-Sun; week 1 holds this year's first Thursday)
// live here and nowhere else. Days are inclusive `YYYY-MM-DD` strings — the same grammar
// work_log_entries.worked_on uses — and rangeBoundsUtc() in lib/worklog/local-day.ts is
// what converts them into the half-open instant range a query needs.

import {
  isIsoDate,
  monthBoundsIso,
  rangeDays,
  shiftDays,
  weekStartIso,
} from "@/lib/worklog/local-day"

export const PERIOD_TYPES = ["daily", "weekly", "monthly", "yearly", "custom"] as const
export type PeriodType = (typeof PERIOD_TYPES)[number]

export const PERIOD_LABEL: Record<PeriodType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
}

/** Unknown values are refused, never defaulted: a silently widened period misstates a report. */
export function isPeriodType(value: unknown): value is PeriodType {
  return typeof value === "string" && (PERIOD_TYPES as readonly string[]).includes(value)
}

/** A period this long is a typo, not a report. `rangeDays` caps at the same number. */
export const MAX_PERIOD_DAYS = 370

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_MS = 86_400_000

export type PeriodBucket = { key: string; label: string; start: string; end: string }

export type Period = {
  type: PeriodType
  /** Inclusive calendar days in the member's own timezone. */
  start: string
  end: string
  label: string
  days: string[]
  /** Day buckets for a short period, month buckets for a long one. */
  buckets: PeriodBucket[]
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function triple(dayIso: string): [number, number, number] {
  const [y, m, d] = dayIso.split("-").map(Number)
  return [y ?? 1970, m ?? 1, d ?? 1]
}

/** Last day of a 1-based month, and month may overflow past 12 or below 1. */
function clampDay(year: number, month: number, day: number): string {
  const normalisedYear = year + Math.floor((month - 1) / 12)
  const normalisedMonth = ((month - 1 + 12) % 12) + 1
  const last = new Date(Date.UTC(normalisedYear, normalisedMonth, 0)).getUTCDate()
  return `${normalisedYear}-${pad(normalisedMonth)}-${pad(Math.min(day, last))}`
}

/**
 * ISO-8601: walk to the Thursday of this day's week, and that Thursday's calendar year is
 * the ISO year. A Monday in late December can therefore belong to week 1 of next year.
 */
export function isoWeek(dayIso: string): { isoYear: number; week: number } {
  const [y, m, d] = triple(dayIso)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekdayFromMonday = (date.getUTCDay() + 6) % 7
  // Canonical ISO walk: `+ 4 - (getUTCDay() || 7)`, and `getUTCDay() || 7` is exactly
  // weekdayFromMonday + 1, so the offset here is 3 - weekdayFromMonday.
  date.setUTCDate(date.getUTCDate() + 3 - weekdayFromMonday)
  const isoYear = date.getUTCFullYear()
  const jan1 = Date.UTC(isoYear, 0, 1)
  const week = Math.ceil(((date.getTime() - jan1) / DAY_MS + 1) / 7)
  return { isoYear, week }
}

export function periodLabel(type: PeriodType, start: string, end: string): string {
  if (type === "daily") return start
  if (type === "weekly") {
    const { isoYear, week } = isoWeek(start)
    return `${isoYear}-W${pad(week)} (${start} to ${end})`
  }
  if (type === "monthly") return start.slice(0, 7)
  if (type === "yearly") return start.slice(0, 4)
  return `${start} to ${end}`
}

/**
 * A period over two months reads as twelve numbers, not three hundred and sixty-five. The
 * 60-day cut is what keeps a two-month custom range on days and a year on months.
 */
export function periodBuckets(startIso: string, endIso: string): PeriodBucket[] {
  const days = rangeDays(startIso, endIso, MAX_PERIOD_DAYS)
  if (days.length <= 60) {
    return days.map((day) => ({ key: day, label: day, start: day, end: day }))
  }
  const out: PeriodBucket[] = []
  const [startYear, startMonth] = triple(startIso)
  const [endYear, endMonth] = triple(endIso)
  for (let index = 0; ; index += 1) {
    const year = startYear + Math.floor((startMonth - 1 + index) / 12)
    const month = ((startMonth - 1 + index) % 12) + 1
    if (year > endYear || (year === endYear && month > endMonth)) break
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const monthStart = `${year}-${pad(month)}-01`
    const monthEnd = `${year}-${pad(month)}-${pad(last)}`
    out.push({
      key: `${year}-${pad(month)}`,
      label: `${MONTH_NAMES[month - 1]?.slice(0, 3) ?? "Month"} ${year}`,
      start: monthStart < startIso ? startIso : monthStart,
      end: monthEnd > endIso ? endIso : monthEnd,
    })
  }
  return out
}

export function resolvePeriod(
  type: PeriodType,
  anchorIso: string,
  custom?: { from?: string; to?: string },
): Period {
  // A bad anchor is the epoch, not a throw: the route validates, and a page must still
  // render a labelled period if a hand-typed ?d= ever reaches it.
  const anchor = isIsoDate(anchorIso) ? anchorIso : "1970-01-01"
  let start = anchor
  let end = anchor
  switch (type) {
    case "daily":
      break
    case "weekly":
      start = weekStartIso(anchor)
      end = shiftDays(start, 6)
      break
    case "monthly": {
      const bounds = monthBoundsIso(anchor)
      start = bounds.from
      end = bounds.to
      break
    }
    case "yearly": {
      const [year] = triple(anchor)
      start = `${year}-01-01`
      end = `${year}-12-31`
      break
    }
    case "custom": {
      const rawFrom = isIsoDate(custom?.from) ? (custom?.from as string) : anchor
      const rawTo = isIsoDate(custom?.to) ? (custom?.to as string) : anchor
      start = rawFrom <= rawTo ? rawFrom : rawTo
      end = rawFrom <= rawTo ? rawTo : rawFrom
      // Clipped, not refused: a label stating the clipped end is honest, an error toast is not.
      const span = rangeDays(start, end, MAX_PERIOD_DAYS + 1)
      if (span.length > MAX_PERIOD_DAYS) end = shiftDays(start, MAX_PERIOD_DAYS - 1)
      break
    }
  }
  const days = rangeDays(start, end, MAX_PERIOD_DAYS)
  return { type, start, end, label: periodLabel(type, start, end), days, buckets: periodBuckets(start, end) }
}

/** Where the anchor lands one period back or forward. Stepping the anchor, not the range, keeps `?d=` stable. */
export function shiftPeriodAnchor(type: PeriodType, anchorIso: string, delta: number): string {
  const [y, m, d] = triple(anchorIso)
  switch (type) {
    case "daily":
    case "custom":
      return shiftDays(anchorIso, delta)
    case "weekly":
      return shiftDays(anchorIso, delta * 7)
    case "monthly":
      return clampDay(y, m + delta, d)
    case "yearly":
      return clampDay(y + delta, m, d)
  }
}
```

Two things to get right while typing this in, because both are easy to write and wrong:

- `isoWeek` walks to the Thursday of the *week containing the day*. The code comment gives the one-line derivation of the `+ 3 - weekdayFromMonday` offset; if a pinned week number fails by exactly one week, re-derive it against `isoWeek("2026-01-01")` and `isoWeek("2025-12-29")` rather than changing the test.
- The `switch` in `shiftPeriodAnchor` has no `default` return. TypeScript accepts it only while every `PeriodType` member returns, which is exactly why the union is the exhaustive check. Do not add a `return anchorIso` fallback — that is how a new period type silently stops stepping.

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npm test -- report-period`
Expected: PASS — 21 tests across five describes, 0 failures.

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck 0 errors; lint 0 errors / 70 warnings (unchanged — a new warning here means an unused import in the module or the test); full suite green, now 37 files.

- [ ] **Step 6: Commit and push**

```bash
git add lib/reports/period.ts tests/unit/report-period.test.ts
git commit -m "feat(reports): ISO period resolution with day and month series buckets"
git push
```

---

### Task 2: Aggregation and drill-down refs — `lib/reports/aggregate.ts`

**Files:**
- Create: `lib/reports/aggregate.ts`
- Test: `tests/unit/report-aggregate.test.ts`
- Read first: `lib/worklog/entries.ts:106-143` (`EntryDto`, `DeliverableDto`, `KIND_LABEL`), `lib/worklog/summary.ts:25-33` (`TransitionDto`), `app/api/worklog/summary/route.ts:34-53` (the `task_events` read this module mirrors — event-based completion, never `tasks.updated_at`)

**Interfaces:**
- Consumes: Task 1's `Period`, `PeriodBucket`, `PeriodType`; `EntryDto`, `DeliverableDto`, `WorkLogKind` from `lib/worklog/entries.ts`; `TransitionDto` from `lib/worklog/summary.ts`; `DISCIPLINE_LABEL`, `WORK_LOG` kind labels, `isWorkDiscipline`, `WorkDiscipline` from `lib/roles.ts`.
- Produces: `Count`, `METRIC_KEYS`, `MetricKey`, `SUM_METRIC_KEYS`, `isSumMetric`, `COMPLETED_STATUSES`, `IN_PROGRESS_STATUSES`, `BLOCKED_STATUSES`, `TaskBucketName`, `TASK_BUCKET_LABEL`, `statusBucket`, `ReportRow`, `ReportTaskRow`, `ReportPlanRow`, `ReportSource`, `SeriesBucket`, `SplitBucket`, `ReportAggregate`, `aggregateReport`. Task 3's `TEMPLATE_METRICS` values must all be `MetricKey`s — that is a compile error and a test, not a review note. Task 15's chart colours are tested against `TASK_BUCKET_LABEL`, so it is exported.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-aggregate.test.ts`. The fixtures are builders, not literal rows, so a test states the one field it cares about:

```ts
import { describe, expect, it } from "vitest"
import {
  METRIC_KEYS,
  SUM_METRIC_KEYS,
  aggregateReport,
  isSumMetric,
  statusBucket,
  type ReportAggregate,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import { KIND_LABEL, type DeliverableDto, type EntryDto } from "@/lib/worklog/entries"
import type { TransitionDto } from "@/lib/worklog/summary"

const period = resolvePeriod("weekly", "2026-10-28") // Mon 2026-10-26 to Sun 2026-11-01
const TODAY = "2026-11-03"

const entry = (over: Partial<EntryDto> = {}): EntryDto => ({
  id: 1,
  workedOn: "2026-10-27",
  taskId: null,
  taskTitle: null,
  kind: "action",
  title: "Did the thing",
  body: null,
  discipline: "developer",
  minutes: 60,
  deliverableId: null,
  playbookId: null,
  playbookVersion: null,
  links: [],
  source: "manual",
  redatedAt: null,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const deliverable = (over: Partial<DeliverableDto> = {}): DeliverableDto => ({
  id: 11,
  name: "Runbook",
  type: "document",
  status: "draft",
  producedOn: "2026-10-27",
  link: null,
  evidence: null,
  taskId: null,
  taskTitle: null,
  discipline: "developer",
  entryCount: 0,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const transition = (over: Partial<TransitionDto> = {}): TransitionDto => ({
  id: 21,
  taskId: 5,
  taskTitle: "Ship the export",
  fromStatus: "review",
  toStatus: "done",
  at: "2026-10-27T10:00:00.000Z",
  source: "route",
  ...over,
})

const task = (over: Partial<ReportSource["tasks"][number]> = {}) => ({
  id: 5,
  title: "Ship the export",
  status: "done",
  priority: "high",
  dueDate: "2026-10-30",
  storyPoints: 3,
  sprintTitle: "Sprint 12",
  ...over,
})

const planItem = (over: Partial<ReportSource["planItems"][number]> = {}) => ({
  id: 31,
  title: "Rewire the dashboard",
  status: "todo",
  dueDate: "2026-11-10",
  startDate: "2026-11-04",
  planTitle: "Q4 plan",
  ...over,
})

const source = (over: Partial<ReportSource> = {}): ReportSource => ({
  period,
  todayIso: TODAY,
  timezone: "Africa/Nairobi",
  entries: [],
  deliverables: [],
  transitions: [],
  tasks: [],
  planItems: [],
  ...over,
})

const metricKeys = METRIC_KEYS

describe("task status bucketing", () => {
  it("maps the app's loose status strings onto four buckets", () => {
    expect(statusBucket("Done")).toBe("completed")
    expect(statusBucket(" completed ")).toBe("completed")
    expect(statusBucket("closed")).toBe("completed")
    expect(statusBucket("in_progress")).toBe("in_progress")
    expect(statusBucket("review")).toBe("in_progress")
    expect(statusBucket("blocked")).toBe("blocked")
    expect(statusBucket("waiting-on-vendor")).toBe("other")
    expect(statusBucket("")).toBe("other")
  })
})

describe("the no-number-without-rows invariant", () => {
  it("makes every count metric equal its own ref list", () => {
    const aggregate = aggregateReport(
      source({
        entries: [entry(), entry({ id: 2, minutes: 30 }), entry({ id: 3, minutes: null })],
        deliverables: [deliverable({ status: "delivered" })],
        transitions: [transition(), transition({ id: 22, taskId: 6 })],
        tasks: [task(), task({ id: 6, status: "in_progress" })],
        planItems: [planItem()],
      }),
    )
    for (const key of metricKeys) {
      const metric = aggregate.metrics[key]
      expect(metric.refs).not.toBeNull()
      if (isSumMetric(key)) {
        // A sum may legitimately be zero with rows behind it (three entries, none with minutes).
        if (metric.value > 0) expect(metric.refs.length).toBeGreaterThan(0)
        continue
      }
      expect(metric.value).toBe(metric.refs.length)
    }
  })

  it("prefixes every ref with the table it points at", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry()], transitions: [transition()], deliverables: [deliverable()], planItems: [planItem()] }),
    )
    const refs = [
      ...Object.values(aggregate.metrics).flatMap((m) => m.refs),
      ...aggregate.completed.map((r) => r.ref),
      ...aggregate.inProgress.map((r) => r.ref),
      ...aggregate.nextPeriod.map((r) => r.ref),
      ...aggregate.series.flatMap((b) => [...b.entries.refs, ...b.minutes.refs]),
    ]
    expect(refs.length).toBeGreaterThan(0)
    for (const value of refs) expect(value).toMatch(/^(entry|task|deliverable|event|plan|day):\S+$/u)
  })
})

describe("entries and days", () => {
  it("counts entries and sums minutes across the period", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ minutes: 90 }), entry({ id: 2, minutes: 45 }), entry({ id: 3, minutes: null })] }),
    )
    expect(aggregate.metrics.entries.value).toBe(3)
    expect(aggregate.metrics.minutes.value).toBe(135)
  })

  it("counts the days that have rows and names them", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ workedOn: "2026-10-26" }), entry({ id: 2, workedOn: "2026-10-28" })] }),
    )
    expect(aggregate.metrics.activeDays.value).toBe(2)
    expect(aggregate.metrics.activeDays.refs.sort()).toEqual(["day:2026-10-26", "day:2026-10-28"])
  })

  it("never calls a future day quiet", () => {
    // The period ends 2026-11-01 and today is 2026-10-29, so only Oct 26-29 have had a chance.
    const aggregate = aggregateReport(source({ todayIso: "2026-10-29", entries: [entry({ workedOn: "2026-10-26" })] }))
    expect(aggregate.metrics.quietDays.refs).toEqual([
      "day:2026-10-27",
      "day:2026-10-28",
      "day:2026-10-29",
    ])
  })

  it("drops an entry dated outside the period rather than quietly widening it", () => {
    // The route already filters by date. If a stray row still arrives, the aggregate must not
    // re-widen a period the member set by hand just because one entry sits outside it.
    const aggregate = aggregateReport(source({ entries: [entry({ workedOn: "2026-10-01" })] }))
    expect(aggregate.metrics.entries.value).toBe(0)
    expect(aggregate.series.reduce((n, b) => n + b.entries.value, 0)).toBe(0)
  })
})

describe("completion comes from the event log", () => {
  it("lists a completed task by the day its status changed", () => {
    const aggregate = aggregateReport(
      source({ transitions: [transition({ at: "2026-10-27T10:00:00.000Z" })], tasks: [task()] }),
    )
    expect(aggregate.metrics.completedTasks.value).toBe(1)
    expect(aggregate.completed[0]).toMatchObject({
      ref: "event:21",
      title: "Ship the export",
      date: "2026-10-27",
    })
  })

  it("ignores a done task with no recorded transition instead of guessing a date", () => {
    const aggregate = aggregateReport(source({ tasks: [task({ status: "done" })] }))
    expect(aggregate.metrics.completedTasks.value).toBe(0)
    expect(aggregate.completed).toEqual([])
  })

  it("ignores a transition that is not a completion", () => {
    const aggregate = aggregateReport(source({ transitions: [transition({ toStatus: "review" })] }))
    expect(aggregate.metrics.completedTasks.value).toBe(0)
    expect(aggregate.metrics.taskEvents.value).toBe(1)
  })

  it("counts a task completed twice in one period once, and cites both events", () => {
    const aggregate = aggregateReport(
      source({ transitions: [transition({ id: 21 }), transition({ id: 22, toStatus: "completed" })] }),
    )
    expect(aggregate.metrics.completedTasks.value).toBe(1)
    expect(aggregate.completed.map((r) => r.ref)).toEqual(["event:21", "event:22"])
  })

  it("sums story points only for what the log says finished in this period", () => {
    const aggregate = aggregateReport(
      source({
        transitions: [transition({ taskId: 5 })],
        tasks: [task({ id: 5, storyPoints: 5 }), task({ id: 6, status: "done", storyPoints: 8 })],
      }),
    )
    expect(aggregate.metrics.storyPointsCompleted.value).toBe(5)
    expect(aggregate.metrics.storyPointsCompleted.refs).toEqual(["task:5"])
  })

  it("resolves the event's day in the member's timezone, not UTC", () => {
    // 00:20 in Nairobi is 21:20 of the previous day in UTC; a report that showed 2026-10-26
    // would move a Tuesday's merge into Monday's week.
    const aggregate = aggregateReport(
      source({ transitions: [transition({ at: "2026-10-26T21:20:00.000Z" })], timezone: "Africa/Nairobi" }),
    )
    expect(aggregate.completed[0]!.date).toBe("2026-10-27")
  })
})

describe("standing work", () => {
  it("lists in-progress tasks by current status without claiming a date", () => {
    const aggregate = aggregateReport(
      source({ tasks: [task({ id: 7, status: "in_progress", dueDate: "2026-11-04", sprintTitle: "Sprint 13" })] }),
    )
    expect(aggregate.metrics.inProgressTasks.value).toBe(1)
    expect(aggregate.inProgress[0]).toMatchObject({ ref: "task:7", date: "2026-11-04" })
    expect(aggregate.inProgress[0]!.detail).toContain("Sprint 13")
  })

  it("quotes the blocker entry as the reason, and says so when there is none", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [task({ id: 8, status: "blocked" }), task({ id: 9, status: "blocked" })],
        entries: [entry({ id: 4, kind: "blocker", taskId: 8, body: "Vendor has not replied", title: "Waiting" })],
      }),
    )
    expect(aggregate.metrics.blockedTasks.value).toBe(2)
    expect(aggregate.blocked.find((r) => r.ref === "task:8")!.detail).toContain("Vendor has not replied")
    expect(aggregate.blocked.find((r) => r.ref === "task:9")!.detail).toMatch(/no reason recorded/iu)
  })

  it("carries an overdue item forward only when its due date precedes the period", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [
          task({ id: 10, status: "in_progress", dueDate: "2026-10-20" }),
          task({ id: 11, status: "in_progress", dueDate: "2026-10-29" }),
          task({ id: 12, status: "done", dueDate: "2026-10-20" }),
          task({ id: 13, status: "in_progress", dueDate: null }),
        ],
      }),
    )
    expect(aggregate.metrics.overdueCarried.value).toBe(1)
    expect(aggregate.overdue[0]!.ref).toBe("task:10")
  })
})

describe("deliverables", () => {
  it("counts what was produced in the period by status", () => {
    const aggregate = aggregateReport(
      source({
        deliverables: [
          deliverable({ id: 20, status: "delivered" }),
          deliverable({ id: 21, status: "approved" }),
          deliverable({ id: 22, status: "delivered", producedOn: "2026-10-05" }),
          deliverable({ id: 23, status: "delivered", producedOn: null }),
        ],
      }),
    )
    expect(aggregate.metrics.deliverablesProduced.value).toBe(2)
    expect(aggregate.metrics.deliverablesDelivered.value).toBe(1)
    expect(aggregate.deliverableRows.map((r) => r.ref)).toEqual(["deliverable:20", "deliverable:21"])
  })

  it("counts what is sitting in review now, whenever it was produced", () => {
    const aggregate = aggregateReport(
      source({ deliverables: [deliverable({ id: 24, status: "in_review", producedOn: "2026-09-01" })] }),
    )
    expect(aggregate.metrics.reviewRounds.value).toBe(1)
    expect(aggregate.metrics.reviewRounds.refs).toEqual(["deliverable:24"])
  })
})

describe("the forward view", () => {
  it("lists plan items due after the period and nothing that is already done", () => {
    const aggregate = aggregateReport(
      source({
        planItems: [
          planItem({ id: 31, dueDate: "2026-11-10" }),
          planItem({ id: 32, dueDate: "2026-10-29" }),
          planItem({ id: 33, dueDate: "2026-12-01", status: "done" }),
          planItem({ id: 34, dueDate: null }),
        ],
      }),
    )
    expect(aggregate.metrics.nextPeriodItems.value).toBe(1)
    expect(aggregate.nextPeriod[0]).toMatchObject({ ref: "plan:31", date: "2026-11-10" })
    expect(aggregate.nextPeriod[0]!.detail).toContain("Q4 plan")
  })
})

describe("splits", () => {
  it("groups minutes by discipline and files an unset discipline rather than dropping it", () => {
    const aggregate = aggregateReport(
      source({
        entries: [
          entry({ id: 1, discipline: "developer", minutes: 120 }),
          entry({ id: 2, discipline: "auditor", minutes: 30 }),
          entry({ id: 3, discipline: null, minutes: 15 }),
        ],
      }),
    )
    const keys = aggregate.byDiscipline.map((b) => b.key)
    expect(keys).toContain("developer")
    expect(keys).toContain("unassigned")
    expect(aggregate.byDiscipline.find((b) => b.key === "developer")!.minutes.value).toBe(120)
    expect(aggregate.byDiscipline.find((b) => b.key === "unassigned")!.minutes.refs).toEqual(["entry:3"])
  })

  it("lists every logged kind with its label, ordered by the vocabulary not the counts", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ id: 1, kind: "time" }), entry({ id: 2, kind: "action" })] }),
    )
    expect(aggregate.byKind.map((b) => b.key)).toEqual(["action", "time"])
    // Asserted against the shipped vocabulary, not a literal: the label belongs to entries.ts.
    expect(aggregate.byKind[0]!.label).toBe(KIND_LABEL.action)
  })

  it("splits tasks by bucket and by priority", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [
          task({ id: 1, status: "done", priority: "high" }),
          task({ id: 2, status: "in_progress", priority: "high" }),
          task({ id: 3, status: "blocked", priority: "low" }),
          task({ id: 4, status: "waiting-on-vendor", priority: "medium" }),
        ],
      }),
    )
    expect(aggregate.byTaskStatus.map((b) => b.key)).toEqual(["completed", "in_progress", "blocked", "other"])
    expect(aggregate.byTaskStatus[0]!.count.value).toBe(1)
    expect(aggregate.byPriority.map((b) => b.count.value).reduce((a, b) => a + b, 0)).toBe(4)
  })
})

describe("series", () => {
  it("sums the daily buckets of a weekly period", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ workedOn: "2026-10-26", minutes: 50 }), entry({ id: 2, workedOn: "2026-10-26", minutes: 25 })] }),
    )
    expect(aggregate.series).toHaveLength(7)
    expect(aggregate.series[0]!.entries.value).toBe(2)
    expect(aggregate.series[0]!.minutes.value).toBe(75)
  })

  it("gives a yearly period twelve buckets, not three hundred and sixty-five rows", () => {
    const yearly = resolvePeriod("yearly", "2026-06-01")
    const aggregate = aggregateReport(
      source({ period: yearly, entries: [entry({ workedOn: "2026-03-14", minutes: 60 })] }),
    )
    expect(aggregate.series).toHaveLength(12)
    expect(aggregate.period.monthSeries).toBe(true)
    expect(aggregate.series[2]!.minutes.value).toBe(60)
    expect(aggregate.series[2]!.minutes.refs).toEqual(["entry:1"])
  })
})

describe("a period with no activity", () => {
  const empty = (): ReportAggregate => aggregateReport(source())

  it("yields zeros, not nulls, for every metric", () => {
    const aggregate = empty()
    for (const key of metricKeys) {
      expect(aggregate.metrics[key]).toBeDefined()
      expect(aggregate.metrics[key].value).toBe(0)
      expect(Array.isArray(aggregate.metrics[key].refs)).toBe(true)
    }
  })

  it("yields empty arrays for every section", () => {
    const aggregate = empty()
    for (const rows of [aggregate.completed, aggregate.inProgress, aggregate.blocked, aggregate.deliverableRows, aggregate.overdue, aggregate.nextPeriod]) {
      expect(rows).toEqual([])
    }
    expect(aggregate.byDiscipline).toEqual([])
    expect(aggregate.byKind).toEqual([])
  })

  it("still labels the period and states how long it was", () => {
    const aggregate = empty()
    expect(aggregate.period.label).toBe(period.label)
    expect(aggregate.period.dayCount).toBe(7)
  })

  it("marks itself empty so the page can say so instead of showing a blank grid", () => {
    expect(aggregateReport(source()).isEmpty).toBe(true)
    expect(aggregateReport(source({ entries: [entry()] })).isEmpty).toBe(false)
  })
})

describe("the metric registry", () => {
  it("has no duplicate key and declares its sums", () => {
    expect(new Set(metricKeys).size).toBe(metricKeys.length)
    expect(SUM_METRIC_KEYS).toEqual(["minutes", "storyPointsCompleted"])
    expect(metricKeys).toContain("deliverablesProduced")
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- report-aggregate`
Expected: FAIL — `Cannot find module '@/lib/reports/aggregate'`.

- [ ] **Step 3: Write the module**

Create `lib/reports/aggregate.ts`:

```ts
// The arithmetic of one report. Pure: it takes rows already read through the author's own
// scope and returns each number WITH the rows that made it, so a supervisor's "where does 14
// come from?" opens 14 rows instead of re-deriving a query nobody can re-run. A metric whose
// refs cannot back it is a bug in this file, and tests/unit/report-aggregate.test.ts says so.

import { DISCIPLINE_LABEL, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import {
  DELIVERABLE_LABEL_STATUS,
  KIND_LABEL,
  WORK_LOG_KINDS,
  type DeliverableDto,
  type EntryDto,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import { localDay } from "@/lib/worklog/local-day"
import type { TransitionDto } from "@/lib/worklog/summary"
import type { Period, PeriodBucket, PeriodType } from "./period"

// `tasks.status` is a free varchar(50): no whitelist exists today, and a report must not
// invent one that would silently reclassify somebody's board. Everything unrecognised is
// "other" and shown as itself.
export const COMPLETED_STATUSES = ["done", "completed", "closed"]
export const IN_PROGRESS_STATUSES = ["in_progress", "doing", "active", "review", "testing"]
export const BLOCKED_STATUSES = ["blocked"]

export type TaskBucketName = "completed" | "in_progress" | "blocked" | "other"

/** Exported: Task 15's colour map is tested against these four bucket names. */
export const TASK_BUCKET_LABEL: Record<TaskBucketName, string> = {
  completed: "Completed",
  in_progress: "In progress",
  blocked: "Blocked",
  other: "Other",
}

export function statusBucket(status: string | null | undefined): TaskBucketName {
  const value = (status ?? "").trim().toLowerCase()
  if (COMPLETED_STATUSES.includes(value)) return "completed"
  if (BLOCKED_STATUSES.includes(value)) return "blocked"
  if (IN_PROGRESS_STATUSES.includes(value)) return "in_progress"
  return "other"
}

export type Count = { value: number; refs: string[] }

/**
 * Everything here is computed from rows that exist. `minutes` and `storyPointsCompleted` are
 * sums, so their value is not the ref count — the guard test uses this list, not a guess.
 */
export const METRIC_KEYS = [
  "entries",
  "minutes",
  "activeDays",
  "quietDays",
  "taskEvents",
  "completedTasks",
  "inProgressTasks",
  "blockedTasks",
  "deliverablesProduced",
  "deliverablesDelivered",
  "reviewRounds",
  "overdueCarried",
  "nextPeriodItems",
  "storyPointsCompleted",
  "sprintItems",
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]
export type Metrics = Record<MetricKey, Count>
export const SUM_METRIC_KEYS = ["minutes", "storyPointsCompleted"] as const
export function isSumMetric(key: MetricKey): boolean {
  return (SUM_METRIC_KEYS as readonly string[]).includes(key)
}

const countOf = (refs: string[]): Count => ({ value: refs.length, refs })
const zero = (): Count => ({ value: 0, refs: [] })

export type ReportRow = { ref: string; title: string; detail: string; date: string | null }

export type ReportTaskRow = {
  id: number
  title: string
  status: string
  priority: string
  dueDate: string | null
  storyPoints: number
  sprintTitle: string | null
}

export type ReportPlanRow = {
  id: number
  title: string
  status: string
  dueDate: string | null
  startDate: string | null
  planTitle: string
}

export type ReportSource = {
  period: Period
  /** The member's own day, so a period that has not finished is not reported as full of gaps. */
  todayIso: string
  timezone: string | null
  entries: EntryDto[]
  deliverables: DeliverableDto[]
  transitions: TransitionDto[]
  tasks: ReportTaskRow[]
  planItems: ReportPlanRow[]
}

export type SeriesBucket = {
  key: string
  label: string
  start: string
  end: string
  entries: Count
  minutes: Count
}

export type SplitBucket = { key: string; label: string; count: Count; minutes: Count }

export type ReportAggregate = {
  generatedAt: string
  isEmpty: boolean
  period: {
    type: PeriodType
    start: string
    end: string
    label: string
    dayCount: number
    /** True when the series is months rather than days — what makes a yearly report readable. */
    monthSeries: boolean
  }
  metrics: Metrics
  series: SeriesBucket[]
  byDiscipline: SplitBucket[]
  byKind: SplitBucket[]
  byTaskStatus: SplitBucket[]
  byPriority: SplitBucket[]
  completed: ReportRow[]
  inProgress: ReportRow[]
  blocked: ReportRow[]
  deliverableRows: ReportRow[]
  overdue: ReportRow[]
  nextPeriod: ReportRow[]
}

function inPeriod(dayIso: string | null, period: Period): boolean {
  return !!dayIso && dayIso >= period.start && dayIso <= period.end
}

function reasonFor(taskId: number, entries: EntryDto[]): string {
  const blocker = entries
    .filter((e) => e.kind === "blocker" && e.taskId === taskId)
    .sort((a, b) => (b.body ? 1 : 0) - (a.body ? 1 : 0) || b.workedOn.localeCompare(a.workedOn))[0]
  const text = (blocker?.body ?? blocker?.title ?? "").trim()
  return text ? `Reason: ${text}` : "No reason recorded in the log"
}

function seriesBuckets(period: Period, entries: EntryDto[]): SeriesBucket[] {
  return period.buckets.map((bucket: PeriodBucket) => {
    const rows = entries.filter((e) => e.workedOn >= bucket.start && e.workedOn <= bucket.end)
    const minutes = rows.reduce((total, e) => total + (e.minutes ?? 0), 0)
    return {
      key: bucket.key,
      label: bucket.label,
      start: bucket.start,
      end: bucket.end,
      entries: countOf(rows.map((e) => `entry:${e.id}`)),
      minutes: { value: minutes, refs: rows.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`) },
    }
  })
}

function splitByDiscipline(entries: EntryDto[]): SplitBucket[] {
  const groups = new Map<string, EntryDto[]>()
  for (const entry of entries) {
    const key = isWorkDiscipline(entry.discipline) ? entry.discipline : "unassigned"
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.entries()]
    .map(([key, rows]) => ({
      key,
      label: key === "unassigned" ? "Not set" : (DISCIPLINE_LABEL[key as WorkDiscipline] ?? key),
      count: countOf(rows.map((e) => `entry:${e.id}`)),
      minutes: {
        value: rows.reduce((total, e) => total + (e.minutes ?? 0), 0),
        refs: rows.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`),
      },
    }))
    .sort((a, b) => b.minutes.value - a.minutes.value || b.count.value - a.count.value || a.label.localeCompare(b.label))
}

function splitByKind(entries: EntryDto[]): SplitBucket[] {
  return WORK_LOG_KINDS.map((kind: WorkLogKind) => {
    const rows = entries.filter((e) => e.kind === kind)
    return {
      key: kind,
      label: KIND_LABEL[kind],
      count: countOf(rows.map((e) => `entry:${e.id}`)),
      minutes: {
        value: rows.reduce((total, e) => total + (e.minutes ?? 0), 0),
        refs: rows.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`),
      },
    }
  }).filter((bucket) => bucket.count.value > 0)
}

function splitTasks(
  tasks: ReportTaskRow[],
  keyOf: (task: ReportTaskRow) => string,
  labelOf: (key: string) => string,
): SplitBucket[] {
  const groups = new Map<string, ReportTaskRow[]>()
  for (const task of tasks) {
    const key = keyOf(task)
    groups.set(key, [...(groups.get(key) ?? []), task])
  }
  return [...groups.entries()].map(([key, rows]) => ({
    key,
    label: labelOf(key),
    count: countOf(rows.map((t) => `task:${t.id}`)),
    minutes: zero(),
  }))
}

export function aggregateReport(source: ReportSource): ReportAggregate {
  const { period, entries, deliverables, transitions, tasks, planItems, todayIso, timezone } = source
  const generatedAt = new Date().toISOString()

  const logged = entries.filter((e) => inPeriod(e.workedOn, period))
  const entryRefs = logged.map((e) => `entry:${e.id}`)
  const minutesOfLogged = logged.reduce((total, e) => total + (e.minutes ?? 0), 0)

  const loggedDaySet = new Set(logged.map((e) => e.workedOn))
  const activeDayRefs = period.days.filter((day) => loggedDaySet.has(day)).map((day) => `day:${day}`)
  // A day that has not arrived yet is not a gap. Reporting one would turn a week in progress
  // into a report that reads like a fortnight of idleness.
  const quietDayRefs = period.days.filter((day) => day <= todayIso && !loggedDaySet.has(day)).map((day) => `day:${day}`)

  const completionEvents = transitions.filter((t) => statusBucket(t.toStatus) === "completed")
  const completedTaskIds = [...new Set(completionEvents.map((t) => t.taskId))]
  const completedRows: ReportRow[] = completionEvents
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((event) => ({
      ref: `event:${event.id}`,
      title: event.taskTitle ?? `Task #${event.taskId}`,
      detail: `${event.fromStatus} to ${event.toStatus}`,
      date: localDay(new Date(event.at), timezone),
    }))
  const pointsTasks = tasks.filter((t) => completedTaskIds.includes(t.id))

  const inProgressTasks = tasks.filter((t) => statusBucket(t.status) === "in_progress")
  const blockedTasks = tasks.filter((t) => statusBucket(t.status) === "blocked")
  const overdueTasks = tasks.filter(
    (t) => statusBucket(t.status) !== "completed" && t.dueDate !== null && t.dueDate < period.start,
  )
  const openTaskIds = tasks.filter((t) => statusBucket(t.status) !== "completed").map((t) => t.id)
  const sprintLogged = logged.filter((e) => e.taskId !== null)
  const sprintTaskIds = [...new Set(sprintLogged.map((e) => e.taskId as number))]
    .filter((id) => tasks.some((t) => t.id === id && t.sprintTitle))
    .filter((id) => openTaskIds.includes(id) || completedTaskIds.includes(id))

  const produced = deliverables.filter((d) => inPeriod(d.producedOn, period))
  const delivered = produced.filter((d) => d.status === "delivered")
  const awaitingReview = deliverables.filter((d) => d.status === "in_review")

  const forward = planItems
    .filter((p) => statusBucket(p.status) !== "completed" && p.dueDate !== null && p.dueDate > period.end)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))

  const metrics: Metrics = {
    entries: countOf(entryRefs),
    minutes: { value: minutesOfLogged, refs: logged.filter((e) => (e.minutes ?? 0) > 0).map((e) => `entry:${e.id}`) },
    activeDays: countOf(activeDayRefs),
    quietDays: countOf(quietDayRefs),
    taskEvents: countOf(transitions.map((t) => `event:${t.id}`)),
    completedTasks: countOf(completedTaskIds.map((id) => `task:${id}`)),
    inProgressTasks: countOf(inProgressTasks.map((t) => `task:${t.id}`)),
    blockedTasks: countOf(blockedTasks.map((t) => `task:${t.id}`)),
    deliverablesProduced: countOf(produced.map((d) => `deliverable:${d.id}`)),
    deliverablesDelivered: countOf(delivered.map((d) => `deliverable:${d.id}`)),
    reviewRounds: countOf(awaitingReview.map((d) => `deliverable:${d.id}`)),
    overdueCarried: countOf(overdueTasks.map((t) => `task:${t.id}`)),
    nextPeriodItems: countOf(forward.map((p) => `plan:${p.id}`)),
    storyPointsCompleted: {
      value: pointsTasks.reduce((total, t) => total + t.storyPoints, 0),
      refs: pointsTasks.filter((t) => t.storyPoints > 0).map((t) => `task:${t.id}`),
    },
    sprintItems: countOf(sprintTaskIds.map((id) => `task:${id}`)),
  }

  const isEmpty =
    entryRefs.length === 0 &&
    transitions.length === 0 &&
    produced.length === 0 &&
    inProgressTasks.length === 0 &&
    blockedTasks.length === 0 &&
    overdueTasks.length === 0 &&
    forward.length === 0

  return {
    generatedAt,
    isEmpty,
    period: {
      type: period.type,
      start: period.start,
      end: period.end,
      label: period.label,
      dayCount: period.days.length,
      monthSeries: period.buckets.length !== period.days.length,
    },
    metrics,
    series: seriesBuckets(period, logged),
    byDiscipline: splitByDiscipline(logged),
    byKind: splitByKind(logged),
    byTaskStatus: splitTasks(tasks, (t) => statusBucket(t.status), (key) => TASK_BUCKET_LABEL[key as TaskBucketName]).sort(
      (a, b) => b.count.value - a.count.value,
    ),
    byPriority: splitTasks(tasks, (t) => t.priority || "none", (key) => key).sort((a, b) => b.count.value - a.count.value),
    completed: completedRows,
    inProgress: inProgressTasks.map((t) => ({
      ref: `task:${t.id}`,
      title: t.title,
      detail: `${t.status}${t.sprintTitle ? ` · ${t.sprintTitle}` : " · no sprint"}`,
      date: t.dueDate,
    })),
    blocked: blockedTasks.map((t) => ({
      ref: `task:${t.id}`,
      title: t.title,
      detail: reasonFor(t.id, logged),
      date: t.dueDate,
    })),
    deliverableRows: produced.map((d) => ({
      ref: `deliverable:${d.id}`,
      title: d.name,
      detail: `${d.type} · ${DELIVERABLE_LABEL_STATUS[d.status] ?? d.status}${d.link ? ` · ${d.link}` : ""}`,
      date: d.producedOn,
    })),
    overdue: overdueTasks.map((t) => ({
      ref: `task:${t.id}`,
      title: t.title,
      detail: reasonFor(t.id, logged),
      date: t.dueDate,
    })),
    nextPeriod: forward.map((p) => ({
      ref: `plan:${p.id}`,
      title: p.title,
      detail: `${p.planTitle}${p.startDate ? ` · starts ${p.startDate}` : ""}`,
      date: p.dueDate,
    })),
  }
}
```

Two traps in that file, both of which the tests above catch rather than the compiler:

- `metrics` is typed `Record<MetricKey, Count>`, so a missing key is a type error but an **extra** key that is not in `METRIC_KEYS` is also an error. Keep the two lists in step or the module will not compile; that is the point.
- `sprintItems` reads `openTaskIds`/`completedTaskIds` **after** the `tasks` rows arrive, so a logged entry pointing at a task nobody owns yields nothing rather than a phantom. Do not "optimise" it into a set of entry task ids — the number must be backed by a row the report can show.

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npm test -- report-aggregate`
Expected: PASS — 29 tests. If `prefixes every ref` or `the no-number-without-rows invariant` fails, the bug is a metric assembled from a filter that dropped its refs; fix the metric, do not loosen the test.

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 type errors, 0 lint errors / 70 warnings, suite green (38 files).

- [ ] **Step 6: Commit and push**

```bash
git add lib/reports/aggregate.ts tests/unit/report-aggregate.test.ts
git commit -m "feat(reports): period aggregation where every metric carries its own rows"
git push
```

---

### Task 3: Sections and discipline templates — `lib/reports/templates.ts` + `lib/roles.ts`

**Files:**
- Create: `lib/reports/templates.ts`
- Modify: `lib/roles.ts:96-109` (the `CATEGORY_TEMPLATE` block) — add the two per-discipline overrides next to the map that already exists, and widen `DISCIPLINE_TEMPLATE` at `lib/roles.ts:301` to consult them.
- Test: `tests/unit/report-templates.test.ts`
- Read first: `lib/roles.ts:96-109` and `:301-303` — `CATEGORY_TEMPLATE` is explicitly commented "read by lib/reports/templates.ts in phase 3". This task is that reader.

**Interfaces:**
- Consumes: `DISCIPLINE_TEMPLATE`, `WORK_DISCIPLINES`, `isWorkDiscipline`, `WorkDiscipline` from `lib/roles.ts`; `METRIC_KEYS`, `MetricKey` from Task 2.
- Produces: `REPORT_SECTIONS`, `ReportSectionKey`, `SECTION_TITLE`, `SECTION_SOURCE`, `PROSE_SECTIONS`, `SERVER_SECTIONS`, `isReportSectionKey`, `isProseSection`, `REPORT_TEMPLATES`, `ReportTemplate`, `TEMPLATE_LABEL`, `TEMPLATE_SECTIONS`, `TEMPLATE_METRICS`, `METRIC_LABEL`, `TEMPLATE_CHARTS`, `ChartKey`, `CHART_LABEL`, `isReportTemplate`, `templateForDiscipline`, `sectionsFor`, `ReportContent`, `emptyContent`, `MAX_SECTION_TEXT`. Task 4 whitelists prose against `isProseSection`; Task 6 orders the builder with `sectionsFor`; Task 12 renders the KPI strip from `TEMPLATE_METRICS`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-templates.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { DISCIPLINE_TEMPLATE, WORK_DISCIPLINES } from "@/lib/roles"
import { METRIC_KEYS } from "@/lib/reports/aggregate"
import {
  CHART_LABEL,
  METRIC_LABEL,
  PROSE_SECTIONS,
  REPORT_SECTIONS,
  REPORT_TEMPLATES,
  SECTION_SOURCE,
  SECTION_TITLE,
  TEMPLATE_CHARTS,
  TEMPLATE_LABEL,
  TEMPLATE_METRICS,
  TEMPLATE_SECTIONS,
  emptyContent,
  isProseSection,
  isReportTemplate,
  sectionsFor,
  templateForDiscipline,
  type ReportSectionKey,
} from "@/lib/reports/templates"

describe("the ten sections", () => {
  it("declares the spec's ten in order, each with a title and a source", () => {
    expect(REPORT_SECTIONS.map((s) => s.key)).toEqual([
      "header",
      "summary",
      "completed",
      "deliverables",
      "inProgress",
      "blocked",
      "overdue",
      "nextPeriod",
      "metrics",
      "notes",
    ])
    for (const section of REPORT_SECTIONS) {
      expect(SECTION_TITLE[section.key]).toBeTruthy()
      expect(["server", "author", "both"]).toContain(SECTION_SOURCE[section.key])
    }
  })

  it("keeps Header and Metrics server-owned so nobody can type a number into them", () => {
    expect(SECTION_SOURCE.header).toBe("server")
    expect(SECTION_SOURCE.metrics).toBe("server")
    expect(SECTION_SOURCE.summary).toBe("author")
    expect(SECTION_SOURCE.notes).toBe("author")
    expect(isProseSection("metrics")).toBe(false)
    expect(isProseSection("blocked")).toBe(true)
  })

  it("lists as prose exactly the sections the member types into", () => {
    expect([...PROSE_SECTIONS].sort()).toEqual(
      REPORT_SECTIONS.filter((s) => SECTION_SOURCE[s.key] !== "server").map((s) => s.key).sort(),
    )
  })
})

describe("the five templates", () => {
  it("matches the template ids already stored in lib/roles.ts", () => {
    // CATEGORY_TEMPLATE writes these five strings into DISCIPLINE_TEMPLATE; a sixth here, or a
    // rename, would leave a real discipline with no report shape.
    const roleTemplates = [...new Set(Object.values(DISCIPLINE_TEMPLATE))]
    expect([...REPORT_TEMPLATES].sort()).toEqual(roleTemplates.sort())
  })

  it("labels every template", () => {
    for (const key of REPORT_TEMPLATES) expect(TEMPLATE_LABEL[key]).toBeTruthy()
  })

  it("rejects an unknown template instead of defaulting", () => {
    expect(isReportTemplate("assurance")).toBe(true)
    expect(isReportTemplate("Assurance")).toBe(false)
    expect(isReportTemplate("sprint")).toBe(false)
  })

  it("gives every template all ten sections exactly once, in its own order", () => {
    for (const key of REPORT_TEMPLATES) {
      const order = TEMPLATE_SECTIONS[key]
      expect([...order].sort()).toEqual(REPORT_SECTIONS.map((s) => s.key).sort())
      expect(new Set(order).size).toBe(order.length)
      expect(order[0]).toBe("header")
      expect(order[order.length - 1]).toBe("notes")
    }
  })

  it("orders the templates the spec names, so the shape differs where it must", () => {
    // A technician's report must not lead with story points, and a developer's puts the sprint
    // work above the paperwork. The position of the row sections is where the difference lives;
    // metrics always sits second-from-last because every template keeps all ten.
    expect(sectionsFor("engineering").indexOf("completed")).toBeLessThan(
      sectionsFor("engineering").indexOf("deliverables"),
    )
    expect(sectionsFor("technical").indexOf("deliverables")).toBeLessThan(
      sectionsFor("technical").indexOf("completed"),
    )
    expect(sectionsFor("assurance").indexOf("deliverables")).toBeLessThan(
      sectionsFor("assurance").indexOf("completed"),
    )
    expect(TEMPLATE_METRICS.engineering[0]).toBe("storyPointsCompleted")
    expect(TEMPLATE_METRICS.technical[0]).toBe("deliverablesProduced")
    expect(TEMPLATE_METRICS.creative[0]).toBe("deliverablesProduced")
  })

  it("leads every template with at most six metrics that the aggregate actually computes", () => {
    for (const key of REPORT_TEMPLATES) {
      const metrics = TEMPLATE_METRICS[key]
      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics.length).toBeLessThanOrEqual(6)
      expect(new Set(metrics).size).toBe(metrics.length)
      for (const metric of metrics) expect(METRIC_KEYS).toContain(metric)
    }
  })

  it("labels every metric the aggregate can produce", () => {
    // The KPI strip indexes METRIC_LABEL by MetricKey, so a missing label is a hole in a
    // supervisor-facing document, not a styling problem.
    for (const metric of METRIC_KEYS) expect(METRIC_LABEL[metric]).toBeTruthy()
    expect(Object.keys(METRIC_LABEL).sort()).toEqual([...METRIC_KEYS].sort())
  })

  it("gives every template at least one chart and only declared charts", () => {
    for (const key of REPORT_TEMPLATES) {
      expect(TEMPLATE_CHARTS[key].length).toBeGreaterThan(0)
      for (const chart of TEMPLATE_CHARTS[key]) expect(CHART_LABEL[chart]).toBeTruthy()
    }
  })
})

describe("templateForDiscipline", () => {
  it("resolves every one of the 75 disciplines to a real template", () => {
    for (const discipline of WORK_DISCIPLINES) {
      const template = templateForDiscipline(discipline)
      expect(REPORT_TEMPLATES).toContain(template)
    }
  })

  it("keeps the five spec disciplines on their five distinct shapes", () => {
    expect(templateForDiscipline("developer")).toBe("engineering")
    expect(templateForDiscipline("technician")).toBe("technical")
    expect(templateForDiscipline("designer")).toBe("creative")
    expect(templateForDiscipline("auditor")).toBe("assurance")
    expect(templateForDiscipline("coordinator")).toBe("general")
  })

  it("falls back to general for a null or unknown discipline, never a guess", () => {
    expect(templateForDiscipline(null)).toBe("general")
    expect(templateForDiscipline(undefined)).toBe("general")
    expect(templateForDiscipline("pile-of-rocks")).toBe("general")
    expect(templateForDiscipline("Developer")).toBe("general")
  })
})

describe("emptyContent", () => {
  it("opens every prose section with empty text and nothing else", () => {
    const content = emptyContent("assurance")
    expect(Object.keys(content).sort()).toEqual([...PROSE_SECTIONS].sort())
    for (const key of PROSE_SECTIONS) expect(content[key]).toEqual({ text: "" })
    expect(content.metrics).toBeUndefined()
  })

  it("is the same prose set for every template — the template changes order, not what a member may type", () => {
    for (const key of REPORT_TEMPLATES) {
      expect(Object.keys(emptyContent(key)).sort()).toEqual(Object.keys(emptyContent("general")).sort())
    }
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- report-templates`
Expected: FAIL — `Cannot find module '@/lib/reports/templates'`.

- [ ] **Step 3a: Add the two discipline overrides in `lib/roles.ts`**

In `lib/roles.ts`, immediately after the `CATEGORY_TEMPLATE` map (ends at `:108`), add:

```ts
// §6 names five report shapes, but a category is a coarse bucket: a technician files under
// "Software, IT & digital" beside a developer, and would open their report with story points.
// These disciplines keep their own shape; every other discipline uses its category default.
// Values must be keys of CATEGORY_TEMPLATE — report-templates.test.ts checks the set matches.
const DISCIPLINE_TEMPLATE_OVERRIDES: Partial<Record<WorkDiscipline, string>> = {
  technician: "technical",
  designer: "creative",
}
```

and replace the `DISCIPLINE_TEMPLATE` construction (currently `lib/roles.ts:301-303`) with:

```ts
export const DISCIPLINE_TEMPLATE: Record<WorkDiscipline, string> = Object.fromEntries(
  WORK_DISCIPLINES.map((id) => [
    id,
    DISCIPLINE_TEMPLATE_OVERRIDES[id] ?? CATEGORY_TEMPLATE[DISCIPLINE_META[id].category],
  ]),
) as Record<WorkDiscipline, string>
```

This is a **read-only change to a map, not to any stored value**: `tasks.discipline`, `work_log_entries.discipline` and `deliverables.discipline` are untouched, `WORK_DISCIPLINES` is untouched, so `tests/unit/roles.test.ts` stays green and no migration exists in this task.

- [ ] **Step 3b: Write the module**

Create `lib/reports/templates.ts`:

```ts
// What a report is made of. The section inventory is spec §6's ten, in the order a supervisor
// reads them; the templates decide order, the leading KPI strip and which charts render — never
// which facts exist, because two members' reports must be comparable line for line.
//
// Deliberate narrowing of §6's "the section list and leading metrics differ": every template
// carries all ten sections. Dropping a section is how a report ends up with a hole a recipient
// reads as concealment. The difference is what leads and what is charted.

import { DISCIPLINE_TEMPLATE, WORK_DISCIPLINES, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import type { MetricKey } from "./aggregate"

export const REPORT_SECTIONS = [
  { key: "header", source: "server" },
  { key: "summary", source: "author" },
  { key: "completed", source: "both" },
  { key: "deliverables", source: "both" },
  { key: "inProgress", source: "both" },
  { key: "blocked", source: "both" },
  { key: "overdue", source: "both" },
  { key: "nextPeriod", source: "both" },
  { key: "metrics", source: "server" },
  { key: "notes", source: "author" },
] as const satisfies readonly { key: string; source: "server" | "author" | "both" }[]

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]["key"]
export type SectionSource = (typeof REPORT_SECTIONS)[number]["source"]

export const SECTION_TITLE = {
  header: "Header",
  summary: "Summary",
  completed: "Actions completed",
  deliverables: "Deliverables",
  inProgress: "In progress",
  blocked: "Blocked / at risk",
  overdue: "Overdue carried forward",
  nextPeriod: "Next period",
  metrics: "Metrics",
  notes: "Notes and asks",
} as const satisfies Record<ReportSectionKey, string>

export const SECTION_SOURCE = Object.fromEntries(
  REPORT_SECTIONS.map((section) => [section.key, section.source]),
) as Record<ReportSectionKey, SectionSource>

/**
 * The sections a member may type into: the two author-only ones plus the six row sections, whose
 * computed rows the member cannot edit but whose one-line commentary they can. The server-owned
 * pair (`header`, `metrics`) is not in this list, which is what makes `readContent` refuse them.
 */
export const PROSE_SECTIONS = REPORT_SECTIONS.filter((s) => s.source !== "server").map((s) => s.key)
export const SERVER_SECTIONS = REPORT_SECTIONS.filter((s) => s.source === "server").map((s) => s.key)

export function isReportSectionKey(value: unknown): value is ReportSectionKey {
  return typeof value === "string" && (Object.keys(SECTION_TITLE) as readonly string[]).includes(value)
}

/** A client may type into this section and nothing else. */
export function isProseSection(value: unknown): value is ReportSectionKey {
  return isReportSectionKey(value) && SECTION_SOURCE[value] !== "server"
}

export const REPORT_TEMPLATES = ["general", "engineering", "technical", "assurance", "creative"] as const
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number]

export const TEMPLATE_LABEL: Record<ReportTemplate, string> = {
  general: "General",
  engineering: "Engineering & delivery",
  technical: "Technical & service",
  assurance: "Assurance & audit",
  creative: "Creative & design",
}

export function isReportTemplate(value: unknown): value is ReportTemplate {
  return typeof value === "string" && (REPORT_TEMPLATES as readonly string[]).includes(value)
}

const ALL: ReportSectionKey[] = REPORT_SECTIONS.map((s) => s.key)

/**
 * Every template holds all ten; the order is what a reader sees first. `engineering` puts the
 * sprint-shaped work before the paperwork, `technical` the opposite, `assurance` opens with what
 * was produced and evidenced, `creative` with the deliverables and their review rounds.
 */
export const TEMPLATE_SECTIONS: Record<ReportTemplate, ReportSectionKey[]> = {
  general: ALL,
  engineering: [
    "header",
    "summary",
    "completed",
    "inProgress",
    "blocked",
    "deliverables",
    "overdue",
    "nextPeriod",
    "metrics",
    "notes",
  ],
  technical: [
    "header",
    "summary",
    "deliverables",
    "blocked",
    "inProgress",
    "completed",
    "overdue",
    "nextPeriod",
    "metrics",
    "notes",
  ],
  assurance: [
    "header",
    "summary",
    "deliverables",
    "completed",
    "overdue",
    "blocked",
    "inProgress",
    "nextPeriod",
    "metrics",
    "notes",
  ],
  creative: [
    "header",
    "summary",
    "deliverables",
    "inProgress",
    "completed",
    "blocked",
    "overdue",
    "nextPeriod",
    "metrics",
    "notes",
  ],
}

export const TEMPLATE_METRICS: Record<ReportTemplate, MetricKey[]> = {
  general: ["entries", "minutes", "completedTasks", "deliverablesProduced", "blockedTasks"],
  engineering: ["storyPointsCompleted", "completedTasks", "sprintItems", "inProgressTasks", "minutes", "blockedTasks"],
  technical: ["deliverablesProduced", "completedTasks", "reviewRounds", "overdueCarried", "blockedTasks", "minutes"],
  assurance: ["deliverablesProduced", "activeDays", "quietDays", "overdueCarried", "blockedTasks", "entries"],
  creative: ["deliverablesProduced", "reviewRounds", "inProgressTasks", "minutes", "completedTasks"],
}

/**
 * The KPI strip's copy. `Record<MetricKey, string>` means a new metric in
 * lib/reports/aggregate.ts is a compile error here rather than an undefined label on screen —
 * which is the difference between a report that reads "undefined" and one that reads like a
 * person wrote it.
 */
export const METRIC_LABEL: Record<MetricKey, string> = {
  entries: "Log entries",
  minutes: "Time logged",
  activeDays: "Active days",
  quietDays: "Quiet days",
  taskEvents: "Status changes",
  completedTasks: "Completed",
  inProgressTasks: "In progress",
  blockedTasks: "Blocked",
  deliverablesProduced: "Deliverables produced",
  deliverablesDelivered: "Deliverables delivered",
  reviewRounds: "Awaiting review",
  overdueCarried: "Overdue carried",
  nextPeriodItems: "Planned next",
  storyPointsCompleted: "Story points done",
  sprintItems: "In a sprint",
}

export const CHART_KEYS = ["discipline", "kind", "taskStatus", "priority", "series"] as const
export type ChartKey = (typeof CHART_KEYS)[number]

export const CHART_LABEL: Record<ChartKey, string> = {
  discipline: "Time by discipline",
  kind: "Mix of work",
  taskStatus: "Tasks by status",
  priority: "Tasks by priority",
  series: "Per day across the period",
}

export const TEMPLATE_CHARTS: Record<ReportTemplate, ChartKey[]> = {
  general: ["discipline", "kind"],
  engineering: ["series", "taskStatus", "priority"],
  technical: ["series", "discipline", "kind"],
  assurance: ["series", "discipline", "taskStatus"],
  creative: ["discipline", "kind", "taskStatus"],
}

/** The author's own vocabulary for "what kind of work is this" is the only input to this. */
export function templateForDiscipline(discipline: string | null | undefined): ReportTemplate {
  if (isWorkDiscipline(discipline)) {
    const template = DISCIPLINE_TEMPLATE[discipline as WorkDiscipline]
    if (isReportTemplate(template)) return template
  }
  return "general"
}

export function sectionsFor(template: ReportTemplate): ReportSectionKey[] {
  return TEMPLATE_SECTIONS[template] ?? TEMPLATE_SECTIONS.general
}

export const MAX_SECTION_TEXT = 20_000

export type ReportSectionContent = { text: string }
export type ReportContent = Partial<Record<ReportSectionKey, ReportSectionContent>>

/** A new draft: every prose section present and empty, no server section writable. */
export function emptyContent(template: ReportTemplate): ReportContent {
  const order = sectionsFor(template)
  const content: ReportContent = {}
  for (const key of order) {
    if (isProseSection(key)) content[key] = { text: "" }
  }
  return content
}
```

`as const satisfies` on `REPORT_SECTIONS` needs TypeScript 4.9+ — the repo is on 5.x, so it compiles, and it is what makes `SECTION_TITLE`'s `satisfies Record<ReportSectionKey, string>` fail the build if a section is added without a title. Keep both: the inventory and the labels must not drift apart.

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npm test -- report-templates`
Expected: PASS — 16 tests. `npm test -- roles` must also stay green (the overrides changed a derived map, not the vocabulary).

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 type errors, 0 lint errors / 70 warnings, suite green (39 files).

- [ ] **Step 6: Commit and push**

```bash
git add lib/reports/templates.ts lib/roles.ts tests/unit/report-templates.test.ts
git commit -m "feat(reports): the ten-section inventory and five discipline report templates"
git push
```

---

### Task 4: Report DTO and write whitelists — `lib/reports/report-fields.ts`

**Files:**
- Create: `lib/reports/report-fields.ts`
- Test: `tests/unit/report-fields.test.ts`
- Read first: `lib/worklog/entry-fields.ts:1-120` — the `Read<T> = T | Fail` grammar, the `FORBIDDEN_*` list, and the rule that a forbidden key is refused **out loud**, because silently dropping `status: "submitted"` from a body would let a client unilaterally file its own report.

**Interfaces:**
- Consumes: `isPeriodType`, `MAX_PERIOD_DAYS`, `PeriodType` from Task 1; `isReportTemplate`, `isProseSection`, `ReportContent`, `ReportTemplate`, `sectionsFor`, `emptyContent`, `MAX_SECTION_TEXT` from Task 3; `isIsoDate`, `rangeDays` from `lib/worklog/local-day.ts`.
- Produces: `Fail`, `isFail`, `Read`, `REPORT_STATUSES`, `ReportStatus`, `isReportStatus`, `REPORT_MUTABLE_FIELDS`, `FORBIDDEN_REPORT_KEYS`, `MAX_REPORT_TITLE`, `MAX_CONTENT_KEYS`, `ReportDto`, `ReportCreateInput`, `ReportPatch`, `readReportCreate`, `pickReportUpdates`, `readContent`, `parseStoredContent`, `parseStoredMetrics`, `isDraft`. Task 6's `mapReport()` returns the `ReportDto`; Task 7 and Task 9 write through the two read functions; Task 10 uses `parseStoredMetrics`; Tasks 11-16 render `ReportDto`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-fields.test.ts`. Every assertion names the key it expects back in the error, because "the whitelist refused something" and "the whitelist refused the right thing" are different products:

```ts
import { describe, expect, it } from "vitest"
import { PROSE_SECTIONS } from "@/lib/reports/templates"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import {
  FORBIDDEN_REPORT_KEYS,
  MAX_CONTENT_KEYS,
  MAX_REPORT_TITLE,
  MAX_SECTION_TEXT,
  REPORT_MUTABLE_FIELDS,
  REPORT_STATUSES,
  isDraft,
  isFail,
  isReportStatus,
  parseStoredContent,
  parseStoredMetrics,
  pickReportUpdates,
  readContent,
  readReportCreate,
} from "@/lib/reports/report-fields"

const valid = {
  title: "Week of 26 Oct",
  template: "engineering",
  periodType: "weekly",
  periodStart: "2026-10-26",
  periodEnd: "2026-11-01",
}

describe("the report vocabulary", () => {
  it("lists the four lifecycle states, with draft first", () => {
    expect(REPORT_STATUSES).toEqual(["draft", "submitted", "acknowledged", "returned"])
    expect(isReportStatus("draft")).toBe(true)
    expect(isReportStatus("published")).toBe(false)
  })

  it("treats only draft as editable", () => {
    expect(isDraft("draft")).toBe(true)
    for (const status of ["submitted", "acknowledged", "returned"]) expect(isDraft(status)).toBe(false)
    expect(isDraft("anything else")).toBe(false)
  })

  it("declares the mutable fields and never overlaps them with the forbidden ones", () => {
    expect(REPORT_MUTABLE_FIELDS).toEqual([
      "title",
      "template",
      "periodType",
      "periodStart",
      "periodEnd",
      "content",
    ])
    for (const key of REPORT_MUTABLE_FIELDS) expect(FORBIDDEN_REPORT_KEYS).not.toContain(key)
    expect(FORBIDDEN_REPORT_KEYS).toContain("status")
    expect(FORBIDDEN_REPORT_KEYS).toContain("metrics")
    expect(FORBIDDEN_REPORT_KEYS).toContain("userId")
    expect(FORBIDDEN_REPORT_KEYS).toContain("revisionOf")
  })
})

describe("readReportCreate", () => {
  it("accepts a well-formed draft request", () => {
    const result = readReportCreate(valid)
    expect(isFail(result)).toBe(false)
    if (isFail(result)) return
    expect(result.value.title).toBe("Week of 26 Oct")
    expect(result.value.template).toBe("engineering")
    expect(result.value.periodType).toBe("weekly")
    expect(result.value.content).toEqual(Object.fromEntries(PROSE_SECTIONS.map((k) => [k, { text: "" }])))
  })

  it("refuses a non-object body", () => {
    for (const body of [null, undefined, "hi", 7, []]) {
      expect(isFail(readReportCreate(body))).toBe(true)
    }
  })

  it("refuses an empty, whitespace-only or over-long title by name", () => {
    expect(readReportCreate({ ...valid, title: "" })).toEqual({ error: "title is required" })
    expect(readReportCreate({ ...valid, title: "   " })).toEqual({ error: "title is required" })
    expect(readReportCreate({ ...valid, title: "x".repeat(201) })).toEqual({
      error: `title must be ${MAX_REPORT_TITLE} characters or fewer`,
    })
  })

  it("refuses an unknown template or period type instead of defaulting", () => {
    expect(readReportCreate({ ...valid, template: "sprint" })).toMatchObject({ error: /template/u })
    expect(readReportCreate({ ...valid, periodType: "fortnightly" })).toMatchObject({ error: /periodType/u })
  })

  it("refuses a malformed, reversed or impossible date pair", () => {
    expect(readReportCreate({ ...valid, periodStart: "26/10/2026" })).toMatchObject({ error: /periodStart/u })
    expect(readReportCreate({ ...valid, periodEnd: "2026-13-01" })).toMatchObject({ error: /periodEnd/u })
    expect(readReportCreate({ ...valid, periodStart: "2026-11-01", periodEnd: "2026-10-26" })).toEqual({
      error: "periodStart must be on or before periodEnd",
    })
  })

  it("refuses a range wider than the period cap", () => {
    expect(readReportCreate({ ...valid, periodStart: "2020-01-01", periodEnd: "2026-12-31" })).toMatchObject({
      error: /period is too long/u,
    })
  })

  it("names a forbidden key rather than dropping it quietly", () => {
    // A client that sends status:"submitted" must be told it cannot file its own report —
    // dropping it silently would leave a draft the member believes went in.
    for (const key of ["status", "userId", "metrics", "revisionOf", "submittedAt", "acknowledgedAt", "returnedNote"]) {
      const result = readReportCreate({ ...valid, [key]: "x" })
      expect(result).toMatchObject({ error: expect.stringContaining(key) })
    }
  })
})

describe("readContent", () => {
  const proseKey = PROSE_SECTIONS[0]!

  it("accepts trimmed text for a prose section", () => {
    expect(readContent({ [proseKey]: { text: "  Shipped two fixes  " } })).toEqual({
      value: { [proseKey]: { text: "Shipped two fixes" } },
    })
  })

  it("tolerates a plain string as shorthand for the text", () => {
    expect(readContent({ [proseKey]: "Notes here" })).toEqual({ value: { [proseKey]: { text: "Notes here" } } })
  })

  it("refuses a server-owned section by name", () => {
    expect(readContent({ metrics: { text: "9/10 excellent" } })).toMatchObject({
      error: expect.stringContaining("metrics"),
    })
    expect(readContent({ header: { text: "Signed by the CEO" } })).toMatchObject({
      error: expect.stringContaining("header"),
    })
  })

  it("refuses an unknown key rather than storing a section that renders nowhere", () => {
    expect(readContent({ achievements: { text: "everything" } })).toMatchObject({ error: /achievements/u })
  })

  it("refuses non-string text and an over-long section", () => {
    expect(readContent({ [proseKey]: { text: 42 } })).toMatchObject({ error: /text must be a string/u })
    expect(readContent({ [proseKey]: { text: "x".repeat(MAX_SECTION_TEXT + 1) } })).toMatchObject({
      error: new RegExp(String(MAX_SECTION_TEXT), "u"),
    })
  })

  it("refuses more sections than the report has", () => {
    const many = Object.fromEntries(
      Array.from({ length: MAX_CONTENT_KEYS + 1 }, (_, i) => [`section${i}`, { text: "x" }]),
    )
    expect(readContent(many)).toMatchObject({ error: /at most/u })
  })

  it("reads an absent or null body as empty content, not a failure", () => {
    expect(readContent(undefined)).toEqual({ value: {} })
    expect(readContent(null)).toEqual({ value: {} })
  })
})

describe("pickReportUpdates", () => {
  it("accepts a partial patch of the mutable fields only", () => {
    const result = pickReportUpdates({ title: "Renamed", content: { [PROSE_SECTIONS[0]!]: { text: "hello" } } }, "draft")
    expect(isFail(result)).toBe(false)
    if (isFail(result)) return
    expect(result.value).toEqual({ title: "Renamed", content: { [PROSE_SECTIONS[0]!]: { text: "hello" } } })
  })

  it("refuses an empty patch so a no-op click cannot bump updated_at", () => {
    expect(pickReportUpdates({}, "draft")).toEqual({ error: "nothing to update" })
    expect(pickReportUpdates(null, "draft")).toMatchObject({ error: /body/u })
  })

  it("refuses every forbidden key out loud, whatever the status", () => {
    expect(pickReportUpdates({ status: "submitted" }, "draft")).toMatchObject({ error: /status/u })
    expect(pickReportUpdates({ metrics: {} }, "draft")).toMatchObject({ error: /metrics/u })
    expect(pickReportUpdates({ userId: 9 }, "draft")).toMatchObject({ error: /userId/u })
    expect(pickReportUpdates({ revisionOf: 3 }, "draft")).toMatchObject({ error: /revisionOf/u })
  })

  it("locks a non-draft report and names the phase-4 way round", () => {
    for (const status of ["submitted", "acknowledged", "returned"]) {
      expect(pickReportUpdates({ title: "Sneaky" }, status)).toMatchObject({
        error: expect.stringContaining("locked"),
      })
    }
  })

  it("re-validates the period when a patch changes one half of it", () => {
    expect(pickReportUpdates({ periodStart: "2026-11-05", periodEnd: "2026-10-26" }, "draft")).toMatchObject({
      error: /periodStart/u,
    })
  })
})

describe("stored jsonb", () => {
  it("reads a legacy content blob of anything else as empty, never as a crash", () => {
    expect(parseStoredContent(null)).toEqual({})
    expect(parseStoredContent("string")).toEqual({})
    expect(parseStoredContent({ header: { text: "typed in" }, [PROSE_SECTIONS[0]!]: { text: "kept" } })).toEqual({
      [PROSE_SECTIONS[0]!]: { text: "kept" },
    })
  })

  it("returns null for metrics that are not this shape so the page can ask for a recompute", () => {
    expect(parseStoredMetrics(null)).toBeNull()
    expect(parseStoredMetrics("{}")).toBeNull()
    expect(parseStoredMetrics({ generatedAt: "2026-10-26T00:00:00.000Z", metrics: {} })).toBeNull()
    const aggregate = { generatedAt: "x", isEmpty: true, metrics: {}, period: {}, series: [] } as unknown as ReportAggregate
    expect(parseStoredMetrics(aggregate)).toBe(aggregate)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- report-fields`
Expected: FAIL — `Cannot find module '@/lib/reports/report-fields'`.

- [ ] **Step 3: Write the module**

Create `lib/reports/report-fields.ts`:

```ts
// Field whitelists for work_reports writes. Same reason as lib/worklog/entry-fields.ts and
// lib/task-updates.ts: `.set()` interpolates every key it is handed, so a spread body would let
// a caller repoint user_id. Identity, lifecycle and the computed metrics are server-owned, and a
// forbidden key is refused OUT LOUD — silently dropping status:"submitted" would leave a member
// believing they had filed a report that was never sent.

import { isIsoDate, rangeDays } from "@/lib/worklog/local-day"
import { MAX_PERIOD_DAYS, isPeriodType, type PeriodType } from "./period"
import type { ReportAggregate } from "./aggregate"
import {
  MAX_SECTION_TEXT,
  REPORT_TEMPLATES,
  emptyContent,
  isProseSection,
  isReportTemplate,
  isReportSectionKey,
  type ReportContent,
  type ReportTemplate,
} from "./templates"

export type Fail = { error: string }
export type Read<T> = T | Fail
export function isFail(value: unknown): value is Fail {
  return typeof value === "object" && value !== null && "error" in value
}

export const REPORT_STATUSES = ["draft", "submitted", "acknowledged", "returned"] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && (REPORT_STATUSES as readonly string[]).includes(value)
}

/** Only a draft is editable. The other three are phase 4's lifecycle. */
export function isDraft(status: unknown): boolean {
  return status === "draft"
}

export const REPORT_MUTABLE_FIELDS = [
  "title",
  "template",
  "periodType",
  "periodStart",
  "periodEnd",
  "content",
] as const

export const FORBIDDEN_REPORT_KEYS = [
  "id",
  "userId",
  "ownerId",
  "authorId",
  "createdBy",
  "status",
  "metrics",
  "revisionOf",
  "submittedAt",
  "acknowledgedAt",
  "returnedNote",
  "recipients",
  "discipline",
  "templateSections",
  "createdAt",
  "updatedAt",
] as const

export const MAX_REPORT_TITLE = 200
export const MAX_CONTENT_KEYS = 12

export type ReportDto = {
  id: number
  userId: number
  title: string
  template: ReportTemplate
  periodType: PeriodType
  periodStart: string
  periodEnd: string
  status: ReportStatus
  content: ReportContent
  /** Null when the stored blob predates or does not match this shape — the page asks for a recompute. */
  metrics: ReportAggregate | null
  revisionOf: number | null
  submittedAt: string | null
  acknowledgedAt: string | null
  returnedNote: string | null
  createdAt: string
  updatedAt: string
}

export type ReportCreateInput = {
  title: string
  template: ReportTemplate
  periodType: PeriodType
  periodStart: string
  periodEnd: string
  content: ReportContent
}

export type ReportPatch = {
  title?: string
  template?: ReportTemplate
  periodType?: PeriodType
  periodStart?: string
  periodEnd?: string
  content?: ReportContent
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Anything a client must never set, reported by name before anything else is looked at. */
function forbiddenKey(input: Record<string, unknown>): string | null {
  for (const key of FORBIDDEN_REPORT_KEYS) {
    if (key in input) return key
  }
  return null
}

function readTitle(input: Record<string, unknown>): Read<{ value: string }> {
  const raw = typeof input.title === "string" ? input.title.trim() : ""
  if (!raw) return { error: "title is required" }
  if (raw.length > MAX_REPORT_TITLE) return { error: `title must be ${MAX_REPORT_TITLE} characters or fewer` }
  return { value: raw }
}

function readPeriodRange(start: unknown, end: unknown): Read<{ start: string; end: string }> {
  if (!isIsoDate(start)) return { error: "periodStart must be a YYYY-MM-DD date" }
  if (!isIsoDate(end)) return { error: "periodEnd must be a YYYY-MM-DD date" }
  if (start > end) return { error: "periodStart must be on or before periodEnd" }
  if (rangeDays(start, end, MAX_PERIOD_DAYS + 1).length > MAX_PERIOD_DAYS) {
    return { error: `period is too long (${MAX_PERIOD_DAYS} days maximum)` }
  }
  return { start, end }
}

export function readReportCreate(input: unknown): Read<{ value: ReportCreateInput }> {
  if (!isRecord(input)) return { error: "a JSON object body is required" }
  const forbidden = forbiddenKey(input)
  if (forbidden) return { error: `${forbidden} is set by the server and cannot be sent by a client` }

  const title = readTitle(input)
  if (isFail(title)) return title
  if (!isReportTemplate(input.template)) {
    return { error: `template must be one of: ${REPORT_TEMPLATES.join(", ")}` }
  }
  if (!isPeriodType(input.periodType)) {
    return { error: "periodType must be daily, weekly, monthly, yearly or custom" }
  }
  const range = readPeriodRange(input.periodStart, input.periodEnd)
  if (isFail(range)) return range

  return {
    value: {
      title: title.value,
      template: input.template,
      periodType: input.periodType,
      periodStart: range.start,
      periodEnd: range.end,
      content: emptyContent(input.template),
    },
  }
}

/**
 * The content whitelist. Only prose sections are accepted, text is trimmed, and both a
 * server-owned key and an unknown key are refused by name — a stored section that renders
 * nowhere is invisible debt that later turns into a "the report says things I never wrote".
 */
export function readContent(input: unknown): Read<{ value: ReportContent }> {
  if (input === undefined || input === null) return { value: {} }
  if (!isRecord(input)) return { error: "content must be an object keyed by section" }
  if (Object.keys(input).length > MAX_CONTENT_KEYS) {
    return { error: `content has too many sections (at most ${MAX_CONTENT_KEYS})` }
  }
  const value: ReportContent = {}
  for (const [key, raw] of Object.entries(input)) {
    if (!isReportSectionKey(key)) return { error: `unknown report section: ${key}` }
    if (!isProseSection(key)) return { error: `the ${key} section is computed by the server and cannot be typed into` }
    const text = typeof raw === "string" ? raw : isRecord(raw) && typeof raw.text === "string" ? raw.text : null
    if (text === null) return { error: `content.${key}.text must be a string` }
    const trimmed = text.trim()
    if (trimmed.length > MAX_SECTION_TEXT) {
      return { error: `content.${key}.text must be ${MAX_SECTION_TEXT} characters or fewer` }
    }
    value[key] = { text: trimmed }
  }
  return { value }
}

export function pickReportUpdates(input: unknown, status: unknown): Read<{ value: ReportPatch }> {
  if (!isRecord(input)) return { error: "a JSON object body is required" }
  if (!isDraft(status)) {
    return { error: "this report is locked — a submitted report is corrected as a new revision (phase 4)" }
  }
  const forbidden = forbiddenKey(input)
  if (forbidden) return { error: `${forbidden} is set by the server and cannot be sent by a client` }

  const value: ReportPatch = {}
  if ("title" in input) {
    const title = readTitle(input)
    if (isFail(title)) return title
    value.title = title.value
  }
  if ("template" in input) {
    if (!isReportTemplate(input.template)) return { error: `template must be one of: ${REPORT_TEMPLATES.join(", ")}` }
    value.template = input.template
  }
  if ("periodType" in input) {
    if (!isPeriodType(input.periodType)) return { error: "periodType must be daily, weekly, monthly, yearly or custom" }
    value.periodType = input.periodType
  }
  if ("periodStart" in input || "periodEnd" in input) {
    const range = readPeriodRange(input.periodStart, input.periodEnd)
    if (isFail(range)) return range
    value.periodStart = range.start
    value.periodEnd = range.end
  }
  if ("content" in input) {
    const content = readContent(input.content)
    if (isFail(content)) return content
    value.content = content.value
  }
  if (Object.keys(value).length === 0) return { error: "nothing to update" }
  return { value }
}

/**
 * Stored jsonb is not trusted, and this read is deliberately more forgiving than `readContent`:
 * a draft saved before a section became server-computed must still show the member's prose. So a
 * non-prose key is dropped rather than refused by name, and only a value that is not an object at
 * all reads as empty. The cap is still enforced, so a hostile row cannot make the page render a
 * thousand textareas.
 */
export function parseStoredContent(value: unknown): ReportContent {
  if (!isRecord(value)) return {}
  const result: ReportContent = {}
  for (const [key, raw] of Object.entries(value)) {
    if (Object.keys(result).length >= MAX_CONTENT_KEYS) break
    if (!isProseSection(key)) continue
    const text = isRecord(raw) && typeof raw.text === "string" ? raw.text.trim() : ""
    if (text) result[key] = { text: text.slice(0, MAX_SECTION_TEXT) }
  }
  return result
}

/**
 * A metrics blob is only usable if it is recognisably this aggregate. Anything else reads as
 * null so the builder can say "this draft has no metrics yet — Recompute" instead of rendering
 * half a structure and calling it a report.
 */
export function parseStoredMetrics(value: unknown): ReportAggregate | null {
  if (!isRecord(value)) return null
  const candidate = value as unknown as ReportAggregate
  if (typeof candidate.generatedAt !== "string") return null
  if (!isRecord(candidate.metrics)) return null
  if (!isRecord(candidate.period) || !Array.isArray(candidate.series)) return null
  return candidate
}
```

`REPORT_TEMPLATES` is imported from `./templates` only to build the two error strings, so the five template ids stay in exactly one file and the hint cannot go stale when a sixth template is added. Add `REPORT_TEMPLATES` to the existing `from "./templates"` import block in the module above.

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npm test -- report-fields`
Expected: PASS — 25 tests.

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 type errors, 0 lint errors / 70 warnings, suite green (40 files).

- [ ] **Step 6: Commit and push**

```bash
git add lib/reports/report-fields.ts tests/unit/report-fields.test.ts
git commit -m "feat(reports): report DTO and write whitelists that refuse a client-set lifecycle"
git push
```

---

### Task 5: Builder URL state — `lib/reports/view-state.ts`

**Files:**
- Create: `lib/reports/view-state.ts`
- Test: `tests/unit/report-view-state.test.ts`
- Read first: `lib/worklog/view-state.ts:47-182` — same grammar: defaults omitted from the query string, unknown values ignored rather than adopted, one `resolve*` function that the page and the route both call.

**Interfaces:**
- Consumes: Task 1's `PERIOD_TYPES`/`PeriodType`/`resolvePeriod`, Task 3's `REPORT_TEMPLATES`/`ReportTemplate`/`sectionsFor`/`isReportTemplate`/`templateForDiscipline`/`REPORT_SECTIONS`/`ReportSectionKey`, `isIsoDate` from local-day.
- Produces: `REPORT_VIEWS`, `ReportView`, `VIEW_LABEL` (report-scoped name: `REPORT_VIEW_LABEL`), `AUTO_TEMPLATE`, `ReportState`, `defaultReportState(dayIso)`, `parseReportView(search, todayIso)`, `serializeReportView(state, todayIso)`, `resolveReportPeriod(state)`, `effectiveTemplate(state, aggregate)`. Task 6's routes call `parseReportView` + `resolveReportPeriod`; Tasks 11-16 drive the page through these.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-view-state.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  AUTO_TEMPLATE,
  defaultReportState,
  effectiveTemplate,
  parseReportView,
  resolveReportPeriod,
  serializeReportView,
} from "@/lib/reports/view-state"

const TODAY = "2026-10-26"
const search = (raw: string) => new URLSearchParams(raw)

describe("defaults", () => {
  it("opens on the list with a weekly period anchored on today", () => {
    const state = defaultReportState(TODAY)
    expect(state.view).toBe("list")
    expect(state.periodType).toBe("weekly")
    expect(state.anchor).toBe(TODAY)
    expect(state.template).toBe(AUTO_TEMPLATE)
    expect(state.reportId).toBeNull()
    expect(state.open).toBeNull()
    expect(state.q).toBe("")
  })

  it("serialises nothing for the default state, so a clean link stays clean", () => {
    expect(serializeReportView(defaultReportState(TODAY), TODAY)).toBe("")
  })
})

describe("parseReportView", () => {
  it("reads every declared parameter", () => {
    const state = parseReportView(
      search("v=build&p=monthly&d=2026-03-05&tpl=assurance&r=17&open=blocked&q=sprint"),
      TODAY,
    )
    expect(state).toEqual({
      view: "build",
      periodType: "monthly",
      anchor: "2026-03-05",
      customFrom: TODAY,
      customTo: TODAY,
      template: "assurance",
      reportId: 17,
      open: "blocked",
      q: "sprint",
    })
  })

  it("ignores an unknown view, period type, template and section rather than adopting it", () => {
    const fallback = defaultReportState(TODAY)
    expect(parseReportView(search("v=editor"), TODAY).view).toBe(fallback.view)
    expect(parseReportView(search("p=fortnightly"), TODAY).periodType).toBe(fallback.periodType)
    expect(parseReportView(search("tpl=sprint"), TODAY).template).toBe(fallback.template)
    expect(parseReportView(search("open=achievements"), TODAY).open).toBeNull()
    // The guard against a hand-typed value reaching a query, same rule as the work log's ?discipline=.
    expect(parseReportView(search("r=abc"), TODAY).reportId).toBeNull()
    expect(parseReportView(search("r=0"), TODAY).reportId).toBeNull()
    expect(parseReportView(search("r=-4"), TODAY).reportId).toBeNull()
  })

  it("ignores a malformed anchor and keeps today", () => {
    expect(parseReportView(search("d=05/03/2026"), TODAY).anchor).toBe(TODAY)
    expect(parseReportView(search("d=2026-13-40"), TODAY).anchor).toBe(TODAY)
  })

  it("swaps or drops a custom range that cannot be used", () => {
    const swapped = parseReportView(search("p=custom&from=2026-10-20&to=2026-10-10"), TODAY)
    expect(swapped.customFrom).toBe("2026-10-10")
    expect(swapped.customTo).toBe("2026-10-20")
    const missing = parseReportView(search("p=custom&from=2026-10-10"), TODAY)
    expect(missing.customTo).toBe(missing.customFrom)
    expect(parseReportView(search("p=custom&from=yesterday"), TODAY).customFrom).toBe(TODAY)
  })

  it("round-trips every state it can produce", () => {
    for (const raw of [
      "",
      "v=build&p=yearly&d=2026-01-01",
      "v=build&p=custom&from=2026-09-01&to=2026-09-30&tpl=technical",
      "r=8&v=build&open=nextPeriod&q=audit",
    ]) {
      const state = parseReportView(search(raw), TODAY)
      expect(parseReportView(search(serializeReportView(state, TODAY)), TODAY)).toEqual(state)
    }
  })

  it("does not re-emit a parameter the server never reads", () => {
    // The phase-2 lesson: `?view=day` looked meaningful and was ignored. Only declared keys appear.
    const serialised = serializeReportView({ ...defaultReportState(TODAY), view: "build" }, TODAY)
    expect(serialised).toBe("v=build")
    expect(serialised).not.toMatch(/view=/u)
    expect(serialised).not.toMatch(/periodType=/u)
  })
})

describe("resolveReportPeriod", () => {
  it("turns the state into the exact inclusive days the report covers", () => {
    const weekly = resolveReportPeriod({ ...defaultReportState(TODAY), periodType: "weekly" })
    expect([weekly.start, weekly.end]).toEqual(["2026-10-26", "2026-11-01"])
    const custom = resolveReportPeriod({
      ...defaultReportState(TODAY),
      periodType: "custom",
      customFrom: "2026-10-01",
      customTo: "2026-10-15",
    })
    expect([custom.start, custom.end]).toEqual(["2026-10-01", "2026-10-15"])
  })
})

describe("effectiveTemplate", () => {
  const aggregate = (discipline: string | null) =>
    ({
      byDiscipline: discipline === null ? [] : [{ key: discipline, label: discipline, minutes: { value: 60, refs: [] }, count: { value: 1, refs: [] } }],
    }) as never

  it("keeps an explicit choice", () => {
    expect(effectiveTemplate({ ...defaultReportState(TODAY), template: "creative" }, aggregate("developer"))).toBe("creative")
  })

  it("follows the discipline with the most logged minutes when set to auto", () => {
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate("technician"))).toBe("technical")
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate("auditor"))).toBe("assurance")
  })

  it("settles on general when there is no logged work to follow", () => {
    expect(effectiveTemplate(defaultReportState(TODAY), null)).toBe("general")
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate(null))).toBe("general")
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate("unassigned"))).toBe("general")
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- report-view-state`
Expected: FAIL — `Cannot find module '@/lib/reports/view-state'`.

- [ ] **Step 3: Write the module**

Create `lib/reports/view-state.ts`:

```ts
// The builder's URL grammar. One mapping, used by the page, the preview route and the recompute
// route, so the period a member shares in a link is the period the numbers were computed over.
// Defaults are omitted from the query string; unknown values are ignored, never adopted.

import { isIsoDate } from "@/lib/worklog/local-day"
import { resolvePeriod, type Period, type PeriodType } from "./period"
import {
  REPORT_TEMPLATES,
  isReportSectionKey,
  isReportTemplate,
  templateForDiscipline,
  type ReportSectionKey,
  type ReportTemplate,
} from "./templates"
import type { ReportAggregate } from "./aggregate"

export const REPORT_VIEWS = ["list", "build"] as const
export type ReportView = (typeof REPORT_VIEWS)[number]

export const REPORT_VIEW_LABEL: Record<ReportView, string> = {
  list: "My reports",
  build: "Builder",
}

/** "Follow the work I actually logged" — the sentinel is a word, never an empty value. */
export const AUTO_TEMPLATE = "auto"
export type TemplateChoice = ReportTemplate | typeof AUTO_TEMPLATE

export type ReportState = {
  view: ReportView
  periodType: PeriodType
  /** Any day inside the period; the type decides the span around it. */
  anchor: string
  customFrom: string
  customTo: string
  template: TemplateChoice
  reportId: number | null
  /** Which drill-down row list is open, so a shared link can land on an expanded section. */
  open: ReportSectionKey | null
  q: string
}

function readEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function readDay(value: string | null, fallback: string): string {
  return value !== null && isIsoDate(value) ? value : fallback
}

export function defaultReportState(dayIso: string): ReportState {
  return {
    view: "list",
    periodType: "weekly",
    anchor: dayIso,
    customFrom: dayIso,
    customTo: dayIso,
    template: AUTO_TEMPLATE,
    reportId: null,
    open: null,
    q: "",
  }
}

export function parseReportView(search: URLSearchParams, todayIso: string): ReportState {
  const base = defaultReportState(todayIso)
  const periodType = readEnum<PeriodType>(search.get("p"), ["daily", "weekly", "monthly", "yearly", "custom"], base.periodType)
  const anchor = readDay(search.get("d"), base.anchor)
  let customFrom = readDay(search.get("from"), anchor)
  let customTo = readDay(search.get("to"), anchor)
  if (customFrom > customTo) [customFrom, customTo] = [customTo, customFrom]

  const rawId = Number(search.get("r"))
  const rawOpen = search.get("open")
  const rawTemplate = search.get("tpl")

  return {
    view: readEnum<ReportView>(search.get("v"), REPORT_VIEWS, base.view),
    periodType,
    anchor,
    customFrom,
    customTo,
    template: rawTemplate !== null && isReportTemplate(rawTemplate) ? rawTemplate : AUTO_TEMPLATE,
    reportId: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
    open: rawOpen !== null && isReportSectionKey(rawOpen) ? rawOpen : null,
    q: search.get("q") ?? "",
  }
}

export function serializeReportView(state: ReportState, todayIso: string): string {
  const params = new URLSearchParams()
  const base = defaultReportState(todayIso)
  if (state.view !== base.view) params.set("v", state.view)
  if (state.periodType !== base.periodType) params.set("p", state.periodType)
  if (state.anchor !== base.anchor || state.periodType !== base.periodType) params.set("d", state.anchor)
  if (state.periodType === "custom") {
    params.set("from", state.customFrom)
    params.set("to", state.customTo)
  }
  if (state.template !== AUTO_TEMPLATE) params.set("tpl", state.template)
  if (state.reportId !== null) params.set("r", String(state.reportId))
  if (state.open !== null) params.set("open", state.open)
  if (state.q.trim()) params.set("q", state.q.trim())
  return params.toString()
}

export function resolveReportPeriod(state: ReportState): Period {
  return resolvePeriod(state.periodType, state.anchor, { from: state.customFrom, to: state.customTo })
}

/**
 * The template is auto by default because §6 wants it to follow the author's discipline, and the
 * only discipline evidence a report has is the work in the period. `unassigned` is the aggregate's
 * own bucket for rows with no discipline, so it is not a discipline and must not pick a template.
 */
export function effectiveTemplate(state: ReportState, aggregate: ReportAggregate | null): ReportTemplate {
  if (state.template !== AUTO_TEMPLATE) return state.template
  const leading = aggregate?.byDiscipline[0]?.key
  return templateForDiscipline(leading && leading !== "unassigned" ? leading : null)
}
```

The `d` condition in the serialiser looks like a mistake and is not: an anchor equal to today is the default **only** while the period type is too, so switching to `?p=yearly` must carry `d` even when the day has not changed, or the link resolves to a different year on another member's machine.

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npm test -- report-view-state`
Expected: PASS — 12 tests.

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 type errors, 0 lint errors / 70 warnings, suite green (41 files).

- [ ] **Step 6: Commit and push**

```bash
git add lib/reports/view-state.ts tests/unit/report-view-state.test.ts
git commit -m "feat(reports): builder URL grammar with a discipline-following template sentinel"
git push
```

---

### Task 6: The five scoped reads — `app/api/reports/work/_shared.ts`

**Files:**
- Create: `app/api/reports/work/_shared.ts`
- Read first: `app/api/worklog/_shared.ts` (the shape this file copies: column maps, `mapEntry`, ownership-first conditions), `app/api/worklog/summary/route.ts:37-53` (the `task_events` read), `drizzle/schema.ts:413-437` (`planItems` has no `user_id` — its plan's `created_by` is the only ownership link).
- This file is **not** a route file, so it may export values; a `route.ts` may export only handlers and `dynamic`.

**Interfaces:**
- Consumes: `workLogEntries`, `deliverables`, `taskEvents`, `tasks`, `sprints`, `planItems`, `agentPlans`, `workReports` from `@/drizzle/schema`; `mapEntry`, `mapDeliverable`, `deliverableColumns` from `@/app/api/worklog/_shared`; `aggregateReport` and its row types; Task 1's `Period`; Task 4's DTO helpers; Task 5's `ReportState`.
- Produces: `reportSession()`, `unauthorized()`, `badRequest()`, `notFound()`, `serverError()` (re-exported from `@/app/api/reports/_shared` where they already exist), `reportColumns`, `mapReport`, `readOwnReport`, `listReports`, `reportEntryRead`, `reportDeliverableRead`, `reportTransitionRead`, `reportTaskRead`, `reportPlanItemRead`, `readReportSource`, `assembleReport`. Tasks 7-10 are thin because everything non-trivial is here.

- [ ] **Step 1: Write the module**

No unit test runs this file — it imports `@/lib/db`, which is exactly what the Vitest rule forbids (`lib/db.js` shadows `lib/db.ts`). Its invariants are therefore written to be grep-able and are guarded in Task 7 (`tests/unit/report-api.test.ts`): ownership first in every read, a cap on every read, no `tasks.updated_at` as a work date, and no SQL string built from a request value.

Create `app/api/reports/work/_shared.ts`:

```ts
// Server-only reads for /api/reports/work/*. One report is five scoped reads plus a pure
// aggregation, and the aggregation is where the arithmetic lives. This file's whole job is to
// hand that module rows the caller is allowed to see: every condition list starts with the
// session user id, and every read is capped, so a yearly report over a noisy account still
// returns in one round trip instead of timing out into a blank page.

import { and, desc, eq, gt, gte, lte, sql, type SQL } from "drizzle-orm"
import {
  agentPlans,
  deliverables,
  planItems,
  sprints,
  taskEvents,
  tasks,
  workLogEntries,
  workReports,
} from "@/drizzle/schema"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { localDay, rangeBoundsUtc } from "@/lib/worklog/local-day"
import { deliverableColumns, mapEntry, mapDeliverable } from "@/app/api/worklog/_shared"
import { badRequest, notFound, serverError, unauthorized } from "@/app/api/reports/_shared"
import type { DeliverableDto, EntryDto } from "@/lib/worklog/entries"
import type { TransitionDto } from "@/lib/worklog/summary"
import { aggregateReport, type ReportAggregate, type ReportPlanRow, type ReportSource, type ReportTaskRow } from "@/lib/reports/aggregate"
import { parseStoredContent, parseStoredMetrics, type ReportDto } from "@/lib/reports/report-fields"
import type { Period } from "@/lib/reports/period"

export { badRequest, notFound, serverError, unauthorized }

export const REPORT_LIST_LIMIT = 100
const ENTRY_CAP = 3000
const DELIVERABLE_CAP = 500
const EVENT_CAP = 1000
const TASK_CAP = 1000
const PLAN_ITEM_CAP = 200

export async function reportSession() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return null
  return { id: session.id, timezone: session.timezone ?? null }
}

export const reportColumns = {
  id: workReports.id,
  userId: workReports.userId,
  title: workReports.title,
  template: workReports.template,
  periodType: workReports.periodType,
  periodStart: workReports.periodStart,
  periodEnd: workReports.periodEnd,
  status: workReports.status,
  content: workReports.content,
  metrics: workReports.metrics,
  revisionOf: workReports.revisionOf,
  submittedAt: workReports.submittedAt,
  acknowledgedAt: workReports.acknowledgedAt,
  returnedNote: workReports.returnedNote,
  createdAt: workReports.createdAt,
  updatedAt: workReports.updatedAt,
} as const

type ReportDbRow = {
  id: number
  userId: number
  title: string
  template: string
  periodType: string
  periodStart: string
  periodEnd: string
  status: string
  content: unknown
  metrics: unknown
  revisionOf: number | null
  submittedAt: Date | null
  acknowledgedAt: Date | null
  returnedNote: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

/**
 * Stored jsonb is parsed, not cast: a row written by a hand-run script or an older shape reads as
 * empty prose and null metrics rather than crashing the builder or inventing a section.
 */
export function mapReport(row: ReportDbRow): ReportDto {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    template: row.template as ReportDto["template"],
    periodType: row.periodType as ReportDto["periodType"],
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    status: row.status as ReportDto["status"],
    content: parseStoredContent(row.content),
    metrics: parseStoredMetrics(row.metrics),
    revisionOf: row.revisionOf,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    acknowledgedAt: row.acknowledgedAt ? row.acknowledgedAt.toISOString() : null,
    returnedNote: row.returnedNote,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    updatedAt: (row.updatedAt ?? new Date()).toISOString(),
  }
}

export async function listReports(userId: number, q: string): Promise<ReportDto[]> {
  const conditions: SQL[] = [eq(workReports.userId, userId)]
  if (q.trim()) {
    // `%` and `_` are LIKE wildcards, so a search for "100_" must not match "1001".
    const pattern = `%${q.trim().replace(/[\\%_]/gu, (c) => `\\${c}`)}%`
    conditions.push(sql`${workReports.title} ilike ${pattern}`)
  }
  const rows = await db
    .select(reportColumns)
    .from(workReports)
    .where(and(...conditions))
    .orderBy(desc(workReports.updatedAt))
    .limit(REPORT_LIST_LIMIT)
  return rows.map(mapReport)
}

/**
 * Not-found and not-mine answer the same way: a report the caller may not see is absent, and a
 * 403 would confirm that the id exists. Recipients widen this read in phase 4, not before.
 */
export async function readOwnReport(userId: number, id: number): Promise<ReportDto | null> {
  const rows = await db
    .select(reportColumns)
    .from(workReports)
    .where(and(eq(workReports.id, id), eq(workReports.userId, userId)))
    .limit(1)
  return rows.length ? mapReport(rows[0]) : null
}

export async function reportEntryRead(userId: number, period: Period): Promise<EntryDto[]> {
  const rows = await db
    .select({
      id: workLogEntries.id,
      workedOn: workLogEntries.workedOn,
      taskId: workLogEntries.taskId,
      taskTitle: tasks.title,
      kind: workLogEntries.kind,
      title: workLogEntries.title,
      body: workLogEntries.body,
      discipline: workLogEntries.discipline,
      minutes: workLogEntries.minutes,
      deliverableId: workLogEntries.deliverableId,
      playbookId: workLogEntries.playbookId,
      playbookVersion: workLogEntries.playbookVersion,
      links: workLogEntries.links,
      source: workLogEntries.source,
      redatedAt: workLogEntries.redatedAt,
      createdAt: workLogEntries.createdAt,
    })
    .from(workLogEntries)
    .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
    .where(
      and(
        eq(workLogEntries.userId, userId),
        gte(workLogEntries.workedOn, period.start),
        lte(workLogEntries.workedOn, period.end),
      ),
    )
    .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.id))
    .limit(ENTRY_CAP)
  return rows.map(mapEntry)
}

export async function reportDeliverableRead(userId: number, period: Period): Promise<DeliverableDto[]> {
  const rows = await db
    .select({ ...deliverableColumns, entryCount: sql<number | null>`null` })
    .from(deliverables)
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(
      and(
        eq(deliverables.ownerId, userId),
        sql`${deliverables.producedOn} is not null`,
        gte(deliverables.producedOn, period.start),
        lte(deliverables.producedOn, period.end),
      ),
    )
    .orderBy(deliverables.producedOn, deliverables.id)
    .limit(DELIVERABLE_CAP)
  return rows.map(mapDeliverable)
}
```

Two decisions in that last read, both deliberate:

- The deliverable read is limited to rows **produced in the period**. `reviewRounds` counts `status = 'in_review'`, and a review from September must show in a November report, so `awaitingReview` needs the un-dated set — see the next function.
- `entryCount` is a `null` literal rather than the correlated subquery in `deliverableSelect`, because a report never renders it and the subquery would run once per row of a 500-row read. `mapDeliverable` already defaults it to 0.

```ts
/** Everything currently awaiting review, whenever it was produced. */
export async function reportReviewRead(userId: number): Promise<DeliverableDto[]> {
  const rows = await db
    .select({ ...deliverableColumns, entryCount: sql<number | null>`null` })
    .from(deliverables)
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(and(eq(deliverables.ownerId, userId), eq(deliverables.status, "in_review")))
    .orderBy(deliverables.producedOn, deliverables.id)
    .limit(DELIVERABLE_CAP)
  return rows.map(mapDeliverable)
}

export async function reportTransitionRead(userId: number, period: Period, timezone: string | null): Promise<TransitionDto[]> {
  // The window is instants, not dates: `task_events.at` is a timestamptz and the member's
  // week has their midnight at both ends.
  const bounds = rangeBoundsUtc(period.start, period.end, timezone)
  const rows = await db
    .select({
      id: taskEvents.id,
      taskId: taskEvents.taskId,
      taskTitle: tasks.title,
      fromStatus: taskEvents.fromStatus,
      toStatus: taskEvents.toStatus,
      at: taskEvents.at,
      source: taskEvents.source,
    })
    .from(taskEvents)
    .leftJoin(tasks, eq(taskEvents.taskId, tasks.id))
    .where(
      and(
        // actor_id, not assignee: this is what the member did, and a supervisor flipping a
        // status on their task is not the member's history. Same rule as the work log summary.
        eq(taskEvents.actorId, userId),
        gte(taskEvents.at, bounds.start),
        lte(taskEvents.at, bounds.end),
      ),
    )
    .orderBy(desc(taskEvents.at))
    .limit(EVENT_CAP)
  return rows.map((row) => ({ ...row, at: row.at.toISOString() }))
}

export async function reportTaskRead(userId: number): Promise<ReportTaskRow[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      storyPoints: tasks.storyPoints,
      sprintTitle: sprints.name,
    })
    .from(tasks)
    .leftJoin(sprints, eq(tasks.sprintId, sprints.id))
    .where(eq(tasks.assigneeId, userId))
    .orderBy(desc(tasks.dueDate))
    .limit(TASK_CAP)
  return rows
}

/**
 * plan_items has no user_id. The only ownership link is the plan that created the row, so this
 * read goes through agentPlans.createdBy — and a promoted task is a `tasks` row, which is already
 * covered by reportTaskRead, so no item is counted twice.
 */
export async function reportPlanItemRead(userId: number, period: Period): Promise<ReportPlanRow[]> {
  const rows = await db
    .select({
      id: planItems.id,
      title: planItems.title,
      status: planItems.status,
      dueDate: planItems.dueDate,
      startDate: planItems.startDate,
      planTitle: agentPlans.title,
    })
    .from(planItems)
    .innerJoin(agentPlans, eq(planItems.planId, agentPlans.id))
    .where(and(eq(agentPlans.createdBy, userId), gt(planItems.dueDate, period.end)))
    .orderBy(planItems.dueDate)
    .limit(PLAN_ITEM_CAP)
  return rows
}

export async function readReportSource(
  userId: number,
  timezone: string | null,
  period: Period,
  todayIso: string,
): Promise<ReportSource> {
  const [entries, produced, awaitingReview, transitions, taskRows, planRows] = await Promise.all([
    reportEntryRead(userId, period),
    reportDeliverableRead(userId, period),
    reportReviewRead(userId),
    reportTransitionRead(userId, period, timezone),
    reportTaskRead(userId),
    reportPlanItemRead(userId, period),
  ])
  // The aggregate's deliverable list is the union of both reads: produced-in-period is the
  // section's subject, in-review-now is what `reviewRounds` counts, and they are different sets.
  const byId = new Map<number, DeliverableDto>()
  for (const row of [...produced, ...awaitingReview]) byId.set(row.id, row)
  return {
    period,
    todayIso,
    timezone,
    entries,
    deliverables: [...byId.values()],
    transitions,
    tasks: taskRows,
    planItems: planRows,
  }
}

export async function assembleReport(
  userId: number,
  timezone: string | null,
  period: Period,
): Promise<ReportAggregate> {
  const todayIso = localDay(new Date(), timezone)
  const source = await readReportSource(userId, timezone, period, todayIso)
  return aggregateReport(source)
}
```

The import block ends at `import type { Period } from "@/lib/reports/period"` — `workLogEntries` is imported once, in the schema block above, so do not add a second aliased import for it.

- [ ] **Step 2: Check it compiles and that nothing else moved**

Run: `npm run typecheck`
Expected: 0 errors. If drizzle complains about `gt(planItems.dueDate, period.end)`, the column is `date("due_date")` (`drizzle/schema.ts:425`) and the comparison against a `YYYY-MM-DD` string is correct — do not switch it to `sql` raw text.

- [ ] **Step 3: Run the gates**

Run: `npm run lint && npm test`
Expected: 0 lint errors / 70 warnings (a `_shared.ts` under `app/` is linted; `react-hooks` does not apply — no hooks here), suite green (41 files, unchanged: this task adds no test).

- [ ] **Step 4: Commit and push**

```bash
git add app/api/reports/work/_shared.ts
git commit -m "feat(reports): the five ownership-scoped reads behind a period report"
git push
```

---

### Task 7: List and create — `app/api/reports/work/route.ts`

**Files:**
- Create: `app/api/reports/work/route.ts`
- Test: `tests/unit/report-api.test.ts` (created here; Tasks 8-10 append describes to it)
- Read first: `app/api/worklog/entries/route.ts` (the envelope, the session gate, the insert shape), `tests/unit/worklog-api.test.ts:1-45` (the `src()` / `routesIn()` guard grammar this file copies).

**Interfaces:**
- Consumes: Task 6's `reportSession`, `listReports`, `mapReport`, `reportColumns`, `assembleReport`, `REPORT_LIST_LIMIT`, and the re-exported `badRequest` / `serverError` / `unauthorized`; Task 1's `resolvePeriod`; Task 4's `readReportCreate` + `isFail`; Task 5's `parseReportView`; `localDay`.
- Produces: `GET /api/reports/work` → `{ reports: ReportDto[], today, timezone, limit }` and `POST /api/reports/work` → `201 { report: ReportDto }`. Task 11's client calls both.

A route file is not unit-testable here — it reaches `@/lib/db`, and the Vitest rule in `Global Constraints` forbids importing it. Its invariants are therefore source guards, written **first** so the route is still TDD: an absent file makes `readFileSync` throw.

- [ ] **Step 1: Write the failing guards**

Create `tests/unit/report-api.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const shared = () => src("app/api/reports/work/_shared.ts")
const listRoute = () => src("app/api/reports/work/route.ts")

/**
 * Comment-stripped, so a negative guard ("this file must not say 403") cannot be defeated by a
 * sentence in a header comment that explains the rule.
 */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

function workRoutesIn(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(path.join(repo, dir))) {
    const relative = `${dir}/${entry}`
    if (statSync(path.join(repo, relative)).isDirectory()) out.push(...workRoutesIn(relative))
    else if (relative.endsWith("/route.ts")) out.push(relative)
  }
  return out
}

describe("every work-report route is session-gated", () => {
  // _shared.ts resolves the session, so schema-safety's name-based check cannot see the gate
  // in a route file. This is the half it cannot check.
  const routes = workRoutesIn("app/api/reports/work")

  it("finds the routes it is guarding", () => {
    expect(routes.length).toBeGreaterThanOrEqual(1)
  })

  it.each(routes)("%s refuses before touching the database", (file) => {
    const code = src(file)
    expect(code).toMatch(/const session = await reportSession\(\)/u)
    expect(code).toMatch(/if \(!session\) return unauthorized\(\)/u)
    expect(code).toMatch(/export const dynamic = "force-dynamic"/u)
  })
})

describe("the work-report reads", () => {
  it("names the ownership column of every source it reads", () => {
    // Five different columns, because five different tables own their rows differently. A read
    // that forgot one would hand another member's work to this report.
    for (const guard of [
      /eq\(workLogEntries\.userId, userId\)/u,
      /eq\(deliverables\.ownerId, userId\)/u,
      /eq\(taskEvents\.actorId, userId\)/u,
      /eq\(tasks\.assigneeId, userId\)/u,
      /eq\(agentPlans\.createdBy, userId\)/u,
      /eq\(workReports\.userId, userId\)/u,
    ]) {
      expect(shared()).toMatch(guard)
    }
  })

  it("caps every read, so a yearly report cannot fan out into a timeout", () => {
    expect(shared().match(/\.limit\(/gu)).not.toBeUndefined()
    expect((shared().match(/\.limit\(/gu) ?? []).length).toBeGreaterThanOrEqual(8)
  })

  it("never treats tasks.updated_at as a work date", () => {
    // Spec §15: completion comes from task_events. An updated_at is any edit, by anyone.
    expect(codeOnly(shared())).not.toMatch(/tasks\.updatedAt|updated_at/u)
    expect(codeOnly(src("lib/reports/aggregate.ts"))).not.toMatch(/updatedAt/u)
  })

  it("binds every value it puts in SQL", () => {
    expect(shared()).not.toMatch(/sql\.raw/u)
    expect(shared()).toMatch(/replace\(\[\\\\%_\]/u) // LIKE wildcards escaped before the pattern
  })

  it("never puts a request value into a table name or column list", () => {
    // Every user-supplied value reaches SQL as a bound drizzle condition, never as text.
    expect(codeOnly(shared())).not.toMatch(/sql\.raw/u)
  })
})

describe("the list and create route", () => {
  it("reads through the shared whitelist, not its own", () => {
    expect(listRoute()).toMatch(/readReportCreate\(body\)/u)
    expect(listRoute()).toMatch(/listReports\(session\.id, state\.q\)/u)
    expect(listRoute()).toMatch(/parseReportView\(request\.nextUrl\.searchParams, today\)/u)
  })

  it("inserts whitelisted columns only — never a spread body", () => {
    expect(codeOnly(listRoute())).not.toMatch(/\.\.\.body|\.\.\.parsed/u)
    expect(listRoute()).toMatch(/userId: session\.id/u)
    // `status: 201` on the response is fine; a `status: "..."` column value is phase 4's.
    expect(codeOnly(listRoute())).not.toMatch(/status:\s*"/u)
  })

  it("refuses a period pair that does not match its own period type", () => {
    expect(listRoute()).toMatch(/resolvePeriod\(/u)
    expect(listRoute()).toMatch(/must be the period implied by periodType/u)
  })

  it("computes metrics on the server", () => {
    // A draft whose numbers came from the browser is a draft whose numbers are decoration.
    expect(listRoute()).toMatch(/assembleReport\(session\.id, session\.timezone, declared\)/u)
  })

  it("answers with the row it just wrote, re-read through the ownership condition", () => {
    expect(listRoute()).toMatch(/\.returning\(reportColumns\)/u)
    expect(listRoute()).toMatch(/mapReport\(inserted\)/u)
  })
})
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npm test -- report-api`
Expected: FAIL — `ENOENT: no such file or directory ... app/api/reports/work/route.ts`. The three describes that only read `_shared.ts`, `lib/reports/aggregate.ts` and the directory listing already pass from Task 6; that is the point — this file is the phase-3 API contract, and it now has teeth.

- [ ] **Step 3: Write the route**

Create `app/api/reports/work/route.ts`:

```ts
// /api/reports/work — the member's own period reports.
// GET  → the saved drafts, newest first, optionally narrowed by ?q=.
// POST → one draft. The period is re-resolved from the declared type, the metrics are computed
//        here rather than in the browser, and no lifecycle column is ever written: a draft is the
//        only thing phase 3 can create.

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { localDay } from "@/lib/worklog/local-day"
import { resolvePeriod } from "@/lib/reports/period"
import { isFail, readReportCreate } from "@/lib/reports/report-fields"
import { parseReportView } from "@/lib/reports/view-state"
import {
  REPORT_LIST_LIMIT,
  assembleReport,
  badRequest,
  listReports,
  mapReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
} from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await reportSession()
  if (!session) return unauthorized()

  try {
    const today = localDay(new Date(), session.timezone)
    const state = parseReportView(request.nextUrl.searchParams, today)
    const reports = await listReports(session.id, state.q)
    return NextResponse.json({
      success: true,
      data: { reports, today, timezone: session.timezone, limit: REPORT_LIST_LIMIT },
    })
  } catch (error) {
    return serverError(error, "fetch work reports")
  }
}

/**
 * The client sends the period it rendered; the server resolves it again from the type and
 * requires the same span back. A `?p=weekly` pair that is not a whole week would otherwise be
 * stored happily and reported as a week.
 */
function declaredPeriod(periodType: "daily" | "weekly" | "monthly" | "yearly" | "custom", start: string, end: string) {
  const period = resolvePeriod(periodType, start, { from: start, to: end })
  return period.start === start && period.end === end ? period : null
}

export async function POST(request: NextRequest) {
  const session = await reportSession()
  if (!session) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = readReportCreate(body)
    if (isFail(parsed)) return badRequest(parsed.error)
    const value = parsed.value

    const declared = declaredPeriod(value.periodType, value.periodStart, value.periodEnd)
    if (!declared) return badRequest("periodStart and periodEnd must be the period implied by periodType")

    const metrics = await assembleReport(session.id, session.timezone, declared)

    const [inserted] = await db
      .insert(workReports)
      .values({
        userId: session.id,
        title: value.title,
        template: value.template,
        periodType: value.periodType,
        periodStart: value.periodStart,
        periodEnd: value.periodEnd,
        content: value.content,
        metrics,
      })
      .returning(reportColumns)

    return NextResponse.json({ success: true, data: { report: mapReport(inserted) } }, { status: 201 })
  } catch (error) {
    return serverError(error, "create work report")
  }
}
```

`declaredPeriod` takes the union literal rather than importing `PeriodType` so the parameter is checked where it is used — but if `npm run typecheck` prefers the named type, import `PeriodType` from `@/lib/reports/period` and use it; both compile, and the guard only asserts the call.

- [ ] **Step 4: Run the guards and the gates**

Run: `npm test -- report-api && npm run typecheck && npm run lint`
Expected: guard file green — 12 tests (2 in the session-gate describe, because `it.each` expands to one case for the single route file that exists so far, plus 5 reads and 5 list/create). 0 type errors; 0 lint errors / 70 warnings.

- [ ] **Step 5: Check it answers over HTTP**

Nothing is listening on `:3000` and this task does not start a server; if the owner's dev server happens to be running, use it.

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/reports/work`
Expected: `401` — no session cookie in curl, and that is the gate proving itself. A `200` here would mean the guard regex passed while the code was wrong. With no server running, this check joins the owner's list in Task 16 instead; say so in the task report rather than guessing.

- [ ] **Step 6: Commit and push**

```bash
git add app/api/reports/work/route.ts tests/unit/report-api.test.ts
git commit -m "feat(reports): work report list and create routes with server-computed metrics"
git push
```

---

### Task 8: Live preview — `app/api/reports/work/preview/route.ts`

**Files:**
- Create: `app/api/reports/work/preview/route.ts`
- Test: `tests/unit/report-api.test.ts` (append the describe below)

**Interfaces:**
- Consumes: Task 5's `parseReportView` + `resolveReportPeriod` + `effectiveTemplate`; Task 6's `assembleReport`, `reportSession`, `unauthorized`, `serverError`; `localDay`.
- Produces: `GET /api/reports/work/preview` → `{ period, aggregate, template, today, timezone }`. Task 11's builder fetches this whenever the URL state changes.

The preview is a separate route from the list because the list must stay cheap — five capped reads and an aggregation on every keystroke-free page open is not a list endpoint's job.

- [ ] **Step 1: Append the failing guard**

Add to `tests/unit/report-api.test.ts`, after the "list and create route" describe:

```ts
describe("the preview route", () => {
  const preview = () => src("app/api/reports/work/preview/route.ts")

  it("uses the page's own period grammar, not a second one", () => {
    expect(preview()).toMatch(/parseReportView\(request\.nextUrl\.searchParams, today\)/u)
    expect(preview()).toMatch(/resolveReportPeriod\(state\)/u)
  })

  it("resolves the template from the work, so ?tpl=auto is honest", () => {
    expect(preview()).toMatch(/effectiveTemplate\(state, aggregate\)/u)
  })

  it("returns the aggregate and nothing that looks like a lifecycle", () => {
    expect(preview()).toMatch(/data: \{ period, aggregate, template/u)
    // A preview is read-only by construction: only GET is exported.
    expect(codeOnly(preview())).not.toMatch(/export async function (POST|PATCH|PUT|DELETE)|status:\s*"/u)
  })
})
```

Run: `npm test -- report-api`
Expected: FAIL — `ENOENT ... preview/route.ts`.

- [ ] **Step 2: Write the route**

Create `app/api/reports/work/preview/route.ts`:

```ts
// /api/reports/work/preview — the live numbers for the period named by the query string.
// GET only, and from the same parameters the page renders, so a link to a preview reproduces the
// figures it shows. Nothing is written: this is the half of the builder that must work before a
// draft exists.

import { NextRequest, NextResponse } from "next/server"
import { localDay } from "@/lib/worklog/local-day"
import { effectiveTemplate, parseReportView, resolveReportPeriod } from "@/lib/reports/view-state"
import { assembleReport, reportSession, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await reportSession()
  if (!session) return unauthorized()

  try {
    const today = localDay(new Date(), session.timezone)
    const state = parseReportView(request.nextUrl.searchParams, today)
    const period = resolveReportPeriod(state)
    const aggregate = await assembleReport(session.id, session.timezone, period)
    const template = effectiveTemplate(state, aggregate)
    return NextResponse.json({
      success: true,
      data: { period, aggregate, template, today, timezone: session.timezone },
    })
  } catch (error) {
    return serverError(error, "preview work report")
  }
}
```

- [ ] **Step 3: Run the guards and the gates**

Run: `npm test -- report-api && npm run typecheck && npm run lint`
Expected: guard file green — 16 tests (3 session-gate: one fixed plus one per route file, now two; the 5 reads; 5 list/create; 3 preview). 0 type errors; 0 lint errors / 70 warnings. Full suite: 42 files.

- [ ] **Step 4: Check it answers over HTTP**

Run: `curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/reports/work/preview?p=weekly&d=2026-10-26'`
Expected: `401`.

- [ ] **Step 5: Commit and push**

```bash
git add app/api/reports/work/preview/route.ts tests/unit/report-api.test.ts
git commit -m "feat(reports): preview route reads the builder's own period grammar"
git push
```

---

### Task 9: Read, edit and delete one draft — `app/api/reports/work/[id]/route.ts`

**Files:**
- Create: `app/api/reports/work/[id]/route.ts`
- Test: `tests/unit/report-api.test.ts` (append the describe below)
- Read first: `app/api/worklog/entries/[id]/route.ts:1-40` — ownership is a condition of the statement, so a missing id and someone else's id answer the same 404.

**Interfaces:**
- Consumes: Task 4's `pickReportUpdates`, `isDraft`, `emptyContent` (via Task 3), `isFail`; Task 1's `resolvePeriod`; Task 6's `readOwnReport`, `mapReport`, `reportColumns`, `assembleReport`, `reportSession`, `badRequest`, `notFound`, `serverError`, `unauthorized`; `parseIdParam` from `@/app/api/reports/_shared`.
- Produces: `GET /api/reports/work/[id]` → `{ report }`; `PATCH` → `{ report }`; `DELETE` → `{ id }`. Consumed by Tasks 11-16.

- [ ] **Step 1: Append the failing guards**

```ts
describe("the single-report route", () => {
  const row = () => src("app/api/reports/work/[id]/route.ts")

  it("answers not-found for a report it may not show", () => {
    // 404, never 403: a 403 confirms the id exists, which is a leak.
    expect(row()).toMatch(/readOwnReport\(session\.id, id\)/u)
    expect(row()).toMatch(/if \(!existing\) return notFound\("Report not found"\)/u)
    expect(codeOnly(row())).not.toMatch(/forbidden|403|status:/u)
  })

  it("writes only through the whitelist and the mutable columns", () => {
    expect(row()).toMatch(/pickReportUpdates\(body, existing\.status\)/u)
    expect(codeOnly(row())).not.toMatch(/\.\.\.body/u)
    expect(row()).toMatch(/eq\(workReports\.userId, session\.id\)/u)
    // The lifecycle column is only ever *read* (existing.status), never written.
    expect(codeOnly(row())).not.toMatch(/status:\s*"/u)
  })

  it("recomputes metrics when the period moves, so a draft never contradicts its own dates", () => {
    expect(row()).toMatch(/const periodChanged/u)
    expect(row()).toMatch(/set\.metrics = await assembleReport/u)
  })

  it("fills every prose key so a stored blob always has the whole section set", () => {
    expect(row()).toMatch(/emptyContent\(template\)/u)
  })

  it("refuses to delete a filed report and says why", () => {
    expect(row()).toMatch(/isDraft\(existing\.status\)/u)
    expect(row()).toMatch(/cannot be deleted/u)
  })
})
```

Run: `npm test -- report-api`
Expected: FAIL — `ENOENT ... [id]/route.ts`.

- [ ] **Step 2: Write the route**

Create `app/api/reports/work/[id]/route.ts`:

```ts
// /api/reports/work/[id] — read, edit or delete one of your own drafts.
// Ownership is a condition of every statement, so a stranger's id is a 404 and not a 403.
// A submitted report is read-only here: phase 3 has no lifecycle writes, and the whitelist in
// lib/reports/report-fields.ts is what enforces that rather than a comment.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { resolvePeriod } from "@/lib/reports/period"
import { emptyContent, type ReportContent } from "@/lib/reports/templates"
import { isDraft, isFail, pickReportUpdates } from "@/lib/reports/report-fields"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import {
  assembleReport,
  badRequest,
  mapReport,
  notFound,
  readOwnReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const report = await readOwnReport(session.id, id)
    if (!report) return notFound("Report not found")
    return NextResponse.json({ success: true, data: { report } })
  } catch (error) {
    return serverError(error, "fetch work report")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")

    const body = await request.json().catch(() => null)
    const parsed = pickReportUpdates(body, existing.status)
    if (isFail(parsed)) return badRequest(parsed.error)
    const patch = parsed.value

    const title = patch.title ?? existing.title
    const template = patch.template ?? existing.template
    const periodType = patch.periodType ?? existing.periodType
    const periodStart = patch.periodStart ?? existing.periodStart
    const periodEnd = patch.periodEnd ?? existing.periodEnd
    const periodChanged =
      periodType !== existing.periodType || periodStart !== existing.periodStart || periodEnd !== existing.periodEnd

    const set: {
      title: string
      template: string
      periodType: string
      periodStart: string
      periodEnd: string
      content: ReportContent
      metrics?: ReportAggregate
      updatedAt: Date
    } = {
      // `content` replaces the blob — the page always sends the full prose set it holds, and
      // emptyContent keeps every prose key present so a later reader never meets a missing section.
      title,
      template,
      periodType,
      periodStart,
      periodEnd,
      content: patch.content ? { ...emptyContent(template), ...patch.content } : existing.content,
      updatedAt: new Date(),
    }

    if (periodChanged) {
      // Same rule as the create route: the stored pair must be the period the type implies.
      const declared = resolvePeriod(periodType, periodStart, { from: periodStart, to: periodEnd })
      if (declared.start !== periodStart || declared.end !== periodEnd) {
        return badRequest("periodStart and periodEnd must be the period implied by periodType")
      }
      // And the numbers move with the dates. A draft that keeps old metrics under new dates is
      // how a report ends up stating 14 actions for a week with none.
      set.metrics = await assembleReport(session.id, session.timezone, declared)
    }

    const [updated] = await db
      .update(workReports)
      .set(set)
      .where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
      .returning(reportColumns)

    if (!updated) return notFound("Report not found")
    return NextResponse.json({ success: true, data: { report: mapReport(updated) } })
  } catch (error) {
    return serverError(error, "update work report")
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")
    if (!isDraft(existing.status)) {
      return badRequest("a filed report cannot be deleted here — corrections are a new revision (phase 4)")
    }

    await db.delete(workReports).where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    return serverError(error, "delete work report")
  }
}
```

`request` is unused in `DELETE` — name it `_request` like the work log row route does, and keep the two-argument signature; Next's route type check requires it.

- [ ] **Step 3: Run the guards and the gates**

Run: `npm test -- report-api && npm run typecheck && npm run lint`
Expected: guard file green — 22 tests (4 session-gate, 5 reads, 5 list/create, 3 preview, 5 single-report). 0 type errors; 0 lint errors / 70 warnings.

- [ ] **Step 4: Check it answers over HTTP**

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/reports/work/1`
Expected: `401`.

- [ ] **Step 5: Commit and push**

```bash
git add 'app/api/reports/work/[id]/route.ts' tests/unit/report-api.test.ts
git commit -m "feat(reports): single-draft route that moves the metrics with the dates"
git push
```

---

### Task 10: Recompute — `app/api/reports/work/[id]/recompute/route.ts`

**Files:**
- Create: `app/api/reports/work/[id]/recompute/route.ts`
- Test: `tests/unit/report-api.test.ts` (append the describe below)

**Interfaces:**
- Consumes: Task 1's `resolvePeriod`; Task 4's `isDraft`; Task 6's `readOwnReport`, `mapReport`, `reportColumns`, `assembleReport`, `reportSession` and the four response helpers; `parseIdParam`.
- Produces: `POST /api/reports/work/[id]/recompute` → `{ report }` with a fresh `metrics` snapshot. Task 12's toolbar wires the "Recompute" button.

Metrics are only replaced by an explicit call, never as a side effect of a save, so a draft cannot silently change numbers under a member who is typing into the summary.

- [ ] **Step 1: Append the failing guard**

```ts
describe("the recompute route", () => {
  const recompute = () => src("app/api/reports/work/[id]/recompute/route.ts")

  it("is POST-only — recomputing is an action, not a page load", () => {
    expect(recompute()).toMatch(/export async function POST/u)
    expect(codeOnly(recompute())).not.toMatch(/export async function (GET|PATCH|PUT|DELETE)/u)
  })

  it("recomputes only a draft", () => {
    expect(recompute()).toMatch(/isDraft\(existing\.status\)/u)
    expect(recompute()).toMatch(/locked/u)
  })

  it("falls back to the stored pair rather than inventing a period", () => {
    // A hand-written row whose type does not match its dates still has real dates, and the
    // honest answer is to report that span as a custom period instead of refusing.
    expect(recompute()).toMatch(/resolvePeriod\("custom", existing\.periodStart/u)
  })

  it("writes the metrics column and nothing else", () => {
    expect(recompute()).toMatch(/set\.metrics = aggregate/u)
    expect(codeOnly(recompute())).not.toMatch(/title:|content:/u)
    expect(recompute()).toMatch(/\.returning\(reportColumns\)/u)
  })
})
```

Run: `npm test -- report-api`
Expected: FAIL — `ENOENT ... recompute/route.ts`.

- [ ] **Step 2: Write the route**

Create `app/api/reports/work/[id]/recompute/route.ts`:

```ts
// /api/reports/work/[id]/recompute — re-run the aggregation over the stored period and replace
// the metrics snapshot. The only way a draft's numbers change after creation, which is what makes
// "the figures are as of 14:32" a statement the member can point at.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { resolvePeriod, type Period } from "@/lib/reports/period"
import { isDraft, type ReportDto } from "@/lib/reports/report-fields"
import {
  assembleReport,
  badRequest,
  mapReport,
  notFound,
  readOwnReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
} from "../../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

/** The stored pair, read as its own type when that matches and as a plain span when it does not. */
function storedPeriod(report: ReportDto): Period {
  const declared = resolvePeriod(report.periodType, report.periodStart, {
    from: report.periodStart,
    to: report.periodEnd,
  })
  if (declared.start === report.periodStart && declared.end === report.periodEnd) return declared
  return resolvePeriod("custom", report.periodStart, { from: report.periodStart, to: report.periodEnd })
}

export async function POST(_request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")
    if (!isDraft(existing.status)) {
      return badRequest("this report is locked — only a draft can be recomputed (phase 4 files revisions)")
    }

    const aggregate = await assembleReport(session.id, session.timezone, storedPeriod(existing))
    const set = { metrics: aggregate, updatedAt: new Date() }
    // Recomputing edits the report: the numbers a member reads are part of what they last changed.
    const [updated] = await db
      .update(workReports)
      .set(set)
      .where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
      .returning(reportColumns)

    if (!updated) return notFound("Report not found")
    return NextResponse.json({ success: true, data: { report: mapReport(updated) } })
  } catch (error) {
    return serverError(error, "recompute work report")
  }
}
```

The guard asserts `set.metrics = aggregate` as written here — if you restructure it into the `.set({ ... })` literal, change the guard to `/\.set\(\{ metrics: aggregate/u` in the same commit rather than deleting the case.

- [ ] **Step 3: Run the guards and the gates**

Run: `npm test -- report-api && npm run typecheck && npm run lint && npm test`
Expected: guard file green — 27 tests (5 session-gate, 5 reads, 5 list/create, 3 preview, 5 single-report, 4 recompute); 0 type errors; 0 lint errors / 70 warnings; full suite green, 42 files.

- [ ] **Step 4: Commit and push**

```bash
git add 'app/api/reports/work/[id]/recompute/route.ts' tests/unit/report-api.test.ts
git commit -m "feat(reports): explicit recompute route for a draft's metrics snapshot"
git push
```

---

### Task 11: Page shell — `/dashboard/reports-work` with the Period and My-reports cards

**Files:**
- Create: `app/dashboard/reports-work/page.tsx`
- Create: `app/dashboard/reports-work/reports-client.tsx`
- Create: `app/dashboard/reports-work/sections.tsx`
- Modify: `components/dashboard-layout.tsx` (add the nav item after "Work Log", `components/dashboard-layout.tsx:243-248`)
- Modify: `lib/reports/view-state.ts` (add `metricsSource`)
- Test: `tests/unit/report-page.test.ts` (created here), `tests/unit/report-view-state.test.ts` (three cases appended)
- Read first: `app/dashboard/worklog/worklog-client.tsx:85-190` — the two-URL-effect pattern, `mutate()`, `readJson()` and the server-clock adoption; `app/dashboard/worklog/page.tsx` (the Suspense wrapper); `components/dashboard-kit.tsx:37-62` (`SectionCard`'s props).

**Interfaces:**
- Consumes: Tasks 1-5's pure modules; Tasks 7-9's routes.
- Produces: `ReportsClient` (default export), `ReportsSkeleton`, `ReportEmptyNote`, `PeriodSection`, `MyReportsSection`, `metricsSource`. Tasks 12-16 add the ten report sections to this file's `sectionNodes` map, so the card order follows the template rather than a fixed list. `ReportEmptyNote` (not `EmptyNote`) — `components/dashboard-kit.tsx:124` already exports a plain `EmptyNote`, and the row sections in Tasks 13-14 plus the metrics card in Task 16 use that one; this file re-uses the shared component for empty lists and keeps the bordered, explanatory note under its own name.

- [ ] **Step 1: Add the failing view-state case**

Append to `tests/unit/report-view-state.test.ts`. Which numbers a member reads is the one branch in the builder that changes what a report *says*, so it is tested rather than inlined in JSX:

```ts
describe("metricsSource", () => {
  it("shows the saved snapshot when the draft has one", () => {
    const report = { metrics: { generatedAt: "x" } } as unknown as Parameters<typeof metricsSource>[0]
    expect(metricsSource(report)).toBe("snapshot")
  })

  it("shows the live preview for a new draft and for a stored row with an unreadable blob", () => {
    expect(metricsSource(null)).toBe("live")
    expect(metricsSource({ metrics: null } as unknown as Parameters<typeof metricsSource>[0])).toBe("live")
  })

  it("names the difference in one label the page can render", () => {
    expect(SOURCE_LABEL.snapshot).toContain("saved")
    expect(SOURCE_LABEL.live).toContain("live")
  })
})
```

Add `metricsSource` to the existing import block from `@/lib/reports/view-state`, and `SOURCE_LABEL` too (declared in Step 3).

Run: `npm test -- report-view-state`
Expected: FAIL — `metricsSource` is not exported.

- [ ] **Step 2: Write the failing page guards**

Create `tests/unit/report-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const page = () => src("app/dashboard/reports-work/page.tsx")
const client = () => src("app/dashboard/reports-work/reports-client.tsx")
const sectionsFile = () => src("app/dashboard/reports-work/sections.tsx")

/** Comment-stripped: a guard about the code cannot be satisfied by a sentence in a comment. */
function codeOnly(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

describe("the reports-work page", () => {
  it("is reachable from the dashboard nav", () => {
    expect(src("components/dashboard-layout.tsx")).toMatch(/href: "\/dashboard\/reports-work"/u)
  })

  it("wraps the client in Suspense, because useSearchParams needs a render boundary", () => {
    expect(page()).toMatch(/<Suspense fallback=\{<ReportsSkeleton \/>}/u)
    expect(page()).toMatch(/export const dynamic = "force-dynamic"/u)
  })

  it("has exactly one URL rewrite, and adopts the query before it writes", () => {
    // The phase-2 lesson: a third effect, or a rewrite compared against an un-stripped
    // location.search, re-renders in a loop and the back button stops working.
    expect(codeOnly(client()).match(/router\.replace/gu)).toHaveLength(1)
    expect(client()).toMatch(/serializeReportView\(parsed, todayIso\) !== serializeReportView\(prev, todayIso\)/u)
    expect(client()).toMatch(/const current = window\.location\.search\.replace/u)
  })

  it("takes the day from the server, not the browser clock", () => {
    expect(client()).toMatch(/const serverToday = listJson\.data\.today as string/u)
    expect(client()).toMatch(/prev\.anchor === todayIso \? \{ \.\.\.prev, anchor: serverToday \}/u)
    // toISOString().slice(0, 10) is yesterday for anyone west of UTC, and a report dated wrong
    // is worse than one dated late.
    expect(codeOnly(client())).not.toMatch(/toISOString\(\)\.slice\(0, *10\)/u)
    expect(codeOnly(sectionsFile())).not.toMatch(/toISOString\(\)\.slice\(0, *10\)/u)
  })

  it("never invents a period, and never re-runs the arithmetic", () => {
    // One home for the maths (lib/reports/aggregate.ts) and one home for the span
    // (lib/reports/view-state.ts). A card that totals its own rows is a second opinion.
    expect(client()).toMatch(/resolveReportPeriod\(state\)/u)
    expect(codeOnly(sectionsFile())).not.toMatch(/\.reduce\(|groupBy|aggregateReport\(/u)
  })

  it("renders the empty state instead of a spinner when there is nothing to show", () => {
    expect(sectionsFile()).toMatch(/No reports yet/u)
    expect(sectionsFile()).toMatch(/function ReportEmptyNote/u)
  })
})
```

Run: `npm test -- report-page`
Expected: FAIL — `ENOENT ... app/dashboard/reports-work/page.tsx`.

- [ ] **Step 3: Add `metricsSource` to the view-state module**

In `lib/reports/view-state.ts`, add to the import block `import type { ReportDto } from "./report-fields"` and append at the end of the file:

```ts
/**
 * Which numbers the builder renders. A saved draft shows the snapshot it was saved with, so the
 * figures always match the prose written beside them; anything else shows the live preview and
 * says so. This is one line of logic, but it is the line that decides what a report claims.
 */
export type MetricsSource = "snapshot" | "live"

export function metricsSource(report: ReportDto | null): MetricsSource {
  return report?.metrics ? "snapshot" : "live"
}

export const SOURCE_LABEL: Record<MetricsSource, string> = {
  snapshot: "Figures as saved",
  live: "Live preview — not saved yet",
}
```

Run: `npm test -- report-view-state`
Expected: PASS — 15 tests.

- [ ] **Step 4: Write the page**

Create `app/dashboard/reports-work/page.tsx`:

```tsx
import { Suspense } from "react"
import { ReportsSkeleton } from "./sections"
import ReportsClient from "./reports-client"

export const dynamic = "force-dynamic"

export default function ReportsWorkPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsClient />
    </Suspense>
  )
}
```

- [ ] **Step 5: Write the section file**

Create `app/dashboard/reports-work/sections.tsx`:

```tsx
"use client"

// The builder's cards. No arithmetic and no date maths live here: a card renders rows the API
// already counted, and the period it labels comes from the Period object the caller resolved.

import { CalendarRange, ChevronLeft, ChevronRight, FileText, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard } from "@/components/dashboard-kit"
import { PERIOD_LABEL, PERIOD_TYPES, shiftPeriodAnchor, type Period, type PeriodType } from "@/lib/reports/period"
import type { ReportDto } from "@/lib/reports/report-fields"
import {
  REPORT_TEMPLATES,
  TEMPLATE_LABEL,
  type ReportTemplate,
} from "@/lib/reports/templates"
import {
  AUTO_TEMPLATE,
  type ReportState,
  type TemplateChoice,
} from "@/lib/reports/view-state"

export function ReportsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function ReportEmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/70 px-3 py-3 text-[12px] text-muted-foreground">
      <Inbox className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  )
}

export function PeriodSection({
  state,
  period,
  patch,
}: {
  state: ReportState
  period: Period
  patch: (next: Partial<ReportState>) => void
}) {
  const step = (delta: number) =>
    patch({ anchor: shiftPeriodAnchor(state.periodType, state.anchor, delta) })

  return (
    <SectionCard title="Period" icon={<CalendarRange className="h-4 w-4" />}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-period-type">Report type</Label>
          <Select
            value={state.periodType}
            onValueChange={(value) => patch({ periodType: value as PeriodType })}
          >
            <SelectTrigger id="report-period-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {PERIOD_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="report-anchor">Within the period</Label>
            <Input
              id="report-anchor"
              type="date"
              value={state.anchor}
              // Clearing a date input yields an empty string; the previous anchor is kept rather
              // than sent, because an empty day would resolve to the epoch.
              onChange={(event) => {
                const next = event.target.value
                if (next) patch({ anchor: next })
              }}
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => step(1)} aria-label="Next period">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {state.periodType === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={state.customFrom}
                onChange={(event) => {
                  if (event.target.value) patch({ customFrom: event.target.value })
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
                type="date"
                value={state.customTo}
                onChange={(event) => {
                  if (event.target.value) patch({ customTo: event.target.value })
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="report-template">Template</Label>
          <Select
            value={state.template}
            onValueChange={(value) => patch({ template: value as TemplateChoice })}
          >
            <SelectTrigger id="report-template" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_TEMPLATE}>Auto — follow my logged work</SelectItem>
              {REPORT_TEMPLATES.map((template) => (
                <SelectItem key={template} value={template}>
                  {TEMPLATE_LABEL[template as ReportTemplate]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-[12px] tabular-nums text-foreground">
          {period.label}
          <span className="block text-[11px] text-muted-foreground">
            {period.start} to {period.end} · {period.days.length} {period.days.length === 1 ? "day" : "days"}
          </span>
        </p>
      </div>
    </SectionCard>
  )
}

export function MyReportsSection({
  reports,
  loading,
  openId,
  missingId,
  query,
  timezone,
  onQuery,
  onOpen,
}: {
  reports: ReportDto[]
  loading: boolean
  openId: number | null
  missingId: number | null
  query: string
  timezone: string | null
  onQuery: (value: string) => void
  onOpen: (id: number) => void
}) {
  return (
    <SectionCard
      title="My reports"
      icon={<FileText className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="space-y-3">
        <Input
          aria-label="Search my reports"
          placeholder="Search by title"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />

        {missingId !== null ? (
          <ReportEmptyNote>
            Report {missingId} is not one of yours, so it is shown as absent. Reports are private to
            their author until they are sent to someone.
          </ReportEmptyNote>
        ) : null}

        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : reports.length === 0 ? (
          <ReportEmptyNote>
            No reports yet. Pick a period on the left and the sections fill themselves from your work
            log; nothing has to be typed before a report can be read.
          </ReportEmptyNote>
        ) : (
          <ul className="divide-y divide-border/60">
            {reports.map((report) => (
              <li key={report.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{report.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                    {report.periodStart} to {report.periodEnd} · {TEMPLATE_LABEL[report.template]} ·{" "}
                    {new Date(report.updatedAt).toLocaleString(undefined, {
                      timeZone: timezone ?? undefined,
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {report.status}
                  </span>
                  <Button type="button" size="sm" variant={openId === report.id ? "default" : "outline"} onClick={() => onOpen(report.id)}>
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  )
}
```

`REPORT_TEMPLATES` is a `readonly` tuple, so its `.map` callback types `template` as the union already — the `as ReportTemplate` cast above is only needed if `npm run typecheck` complains about the index into `TEMPLATE_LABEL`. Prefer dropping the cast when it compiles clean.

- [ ] **Step 6: Write the client**

Create `app/dashboard/reports-work/reports-client.tsx`:

```tsx
"use client"

// The period report builder. The URL is the state's serialised form, the numbers come from the
// API and are never recomputed in the browser, and the report's own sections render in the
// template's order — so a different discipline reads a differently-ordered document, not a
// differently-stone page.

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Copy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { localDay } from "@/lib/worklog/local-day"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import type { Period } from "@/lib/reports/period"
import type { ReportDto } from "@/lib/reports/report-fields"
import {
  defaultReportState,
  metricsSource,
  parseReportView,
  resolveReportPeriod,
  serializeReportView,
  type ReportState,
} from "@/lib/reports/view-state"
import { MyReportsSection, PeriodSection, ReportsSkeleton } from "./sections"

/** The three work-report endpoints share the `{ success, data | message }` envelope. */
async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null)
}

export default function ReportsClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  // Until the first response arrives the browser zone is the best guess; the server answers with
  // users.timezone and every label is recomputed from it.
  const [timezone, setTimezone] = useState<string | null>(null)
  const [todayIso, setTodayIso] = useState(() => localDay(new Date(), null))
  const [state, setState] = useState<ReportState>(() => defaultReportState(localDay(new Date(), null)))
  const [reports, setReports] = useState<ReportDto[]>([])
  const [report, setReport] = useState<ReportDto | null>(null)
  const [preview, setPreview] = useState<ReportAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [missingId, setMissingId] = useState<number | null>(null)
  const [period, setPeriod] = useState<Period | null>(null)

  useEffect(() => {
    setTodayIso(localDay(new Date(), timezone))
  }, [timezone])

  useEffect(() => {
    const parsed = parseReportView(new URLSearchParams(search.toString()), todayIso)
    // Two views of the same thing are equal only when they serialise the same way, so the
    // comparison is against this client's own state rather than the raw query string.
    setState((prev) =>
      serializeReportView(parsed, todayIso) !== serializeReportView(prev, todayIso) ? parsed : prev,
    )
  }, [search, todayIso])

  useEffect(() => {
    const next = serializeReportView(state, todayIso)
    const target = next ? `/dashboard/reports-work?${next}` : "/dashboard/reports-work"
    // location.search keeps its leading `?` and serializeReportView does not, so the two are
    // compared after the strip — otherwise every render rewrites the URL and re-runs this effect.
    const current = window.location.search.replace(/^\?/u, "")
    if (next !== current) router.replace(target, { scroll: false })
  }, [state, todayIso, router])

  // refresh() is read-only here; the write helper arrives with the buttons in Task 12.
  const refresh = useCallback(async () => {
    setLoading(true)
    const qs = serializeReportView(state, todayIso)
    try {
      const listJson = await readJson(await fetch(`/api/reports/work?${qs}`))
      if (!listJson?.success) throw new Error(listJson?.message ?? "Could not load your reports")
      const serverToday = listJson.data.today as string
      setReports(listJson.data.reports as ReportDto[])
      setTimezone(listJson.data.timezone as string | null)
      setTodayIso(serverToday)
      // A day nobody chose follows the server's clock. Left alone, a stale browser guess would be
      // pinned into the URL as `?d=` the moment todayIso moves.
      setState((prev) => (prev.anchor === todayIso ? { ...prev, anchor: serverToday } : prev))

      if (state.view === "build") {
        const previewJson = await readJson(await fetch(`/api/reports/work/preview?${qs}`))
        if (previewJson?.success) {
          setPreview(previewJson.data.aggregate as ReportAggregate)
          setPeriod(previewJson.data.period as Period)
        }
        if (state.reportId === null) {
          setReport(null)
          setMissingId(null)
        } else {
          const rowJson = await readJson(await fetch(`/api/reports/work/${state.reportId}`))
          if (rowJson?.success) setReport(rowJson.data.report as ReportDto)
          // The route answers 404 for a stranger's id; the page says the same thing the route does.
          else {
            setReport(null)
            setMissingId(state.reportId)
          }
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Work reports", description: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }, [state, todayIso, toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const patchState = useCallback(
    (patch: Partial<ReportState>) => setState((prev) => ({ ...prev, ...patch })),
    [],
  )

  const resolved = resolveReportPeriod(state)
  // The preview route is the only place the period is resolved for a payload, so the label above
  // the numbers and the numbers themselves come from one call.
  const shownPeriod = period ?? resolved
  const source = metricsSource(report)
  const aggregate = report?.metrics ?? preview

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: "Link copied", description: "It opens this page with the same period and filters." })
    } catch (error) {
      toast({ variant: "destructive", title: "Copy failed", description: (error as Error).message })
    }
  }, [toast])

  if (loading && !aggregate && reports.length === 0) return <ReportsSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Work reports</h1>
          <p className="text-sm text-muted-foreground">
            A period, read back from the work log: what moved, what shipped, what is stuck.
            {source === "snapshot" && report?.metrics ? ` Figures as of ${report.metrics.generatedAt.slice(0, 10)}.` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Reload
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
            <Copy className="mr-1 h-4 w-4" />
            Copy link
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PeriodSection state={state} period={shownPeriod} patch={patchState} />
        <MyReportsSection
          reports={reports}
          loading={loading}
          openId={state.reportId}
          missingId={missingId}
          query={state.q}
          timezone={timezone}
          onQuery={(value) => patchState({ q: value })}
          onOpen={(id) => patchState({ view: "build", reportId: id })}
        />
        {/* Task 12 replaces this comment with the template-ordered report sections. */}
        {state.view === "build" && !aggregate ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Add the nav entry**

In `components/dashboard-layout.tsx`, add `FileText` to the `lucide-react` import list if it is not already there, and insert after the "Work Log" item (`components/dashboard-layout.tsx:242-248`):

```tsx
        {
          title: "Work Reports",
          icon: <FileText className="h-5 w-5" />,
          href: "/dashboard/reports-work",
          active: pathname === "/dashboard/reports-work",
        },
```

- [ ] **Step 8: Run the guards and the gates**

Run: `npm test -- report-page report-view-state && npm run typecheck && npm run lint && npm test`
Expected: page guards green (6 tests); view-state file green (15 tests, up from 12); 0 type errors; 0 lint errors / 70 warnings — a new warning here is almost always a `react-hooks/exhaustive-deps` complaint about `refresh`, which means a dependency was left out rather than the rule being wrong.

- [ ] **Step 9: Owner check — not run by the executor**

Owner check — the build view needs a browser, and this task does not start one. Write these into the task report as not-yet-verified and carry on: open `/dashboard/reports-work` and confirm the two cards render, `?v=build` appears in the bar when a report is opened, and the back button returns to the list. The page is deliberately incomplete at this point — the ten sections arrive in Tasks 12-16.

- [ ] **Step 10: Commit and push**

```bash
git add app/dashboard/reports-work lib/reports/view-state.ts components/dashboard-layout.tsx tests/unit/report-page.test.ts tests/unit/report-view-state.test.ts
git commit -m "feat(reports): reports-work page shell with period controls and the draft list"
git push
```

---

### Task 12: Header and Summary, plus the write actions

**Files:**
- Modify: `app/dashboard/reports-work/sections.tsx` (add `HeaderSection`, `ProseSection`, `Stat`)
- Modify: `app/dashboard/reports-work/reports-client.tsx` (prose draft state, save / recompute / delete, the `sectionNodes` map)
- Modify: `app/dashboard/reports-work/dialogs.tsx` (create it: the new-report dialog)
- Test: `tests/unit/report-page.test.ts` (append)
- Read first: `app/dashboard/worklog/dialogs.tsx:1-60` — the controlled-draft dialog shape (`Draft | null` state, `busy` guard, footer buttons), and the sentinel-value rule for every `SelectItem`.

**Interfaces:**
- Consumes: Task 3's `SECTION_TITLE`/`TEMPLATE_LABEL`/`sectionsFor`/`PROSE_SECTIONS`/`MAX_SECTION_TEXT`; Task 4's `ReportDto`/`MAX_REPORT_TITLE`; Task 5's `AUTO_TEMPLATE`/`effectiveTemplate`/`SOURCE_LABEL`; Tasks 7-10's routes.
- Produces: `HeaderSection`, `ProseSection` (a whole editable card — used only by the two author-owned sections, `summary` here and `notes` in Task 16; the six row sections get Task 14's `CommentField` inside their own card instead), `Stat` (the KPI tile Task 16's metrics strip renders), `NewReportDialog`, and the client's `saveProse` / `recompute` / `deleteDraft` callbacks.

- [ ] **Step 1: Write the failing guards**

```ts
describe("the builder's write path", () => {
  const dialogs = () => src("app/dashboard/reports-work/dialogs.tsx")

  it("sends the whole prose set on save, so a stored draft always has every section key", () => {
    expect(client()).toMatch(/PROSE_SECTIONS\.map\(\(key\) => \[key, \{ text: prose\[key\] \?\? "" \}\]/u)
    expect(client()).toMatch(/method: "PATCH"/u)
  })

  it("keeps one dirty comparison, in one place", () => {
    expect(client()).toMatch(/function serializeProse/u)
    expect((codeOnly(client()).match(/serializeProse\(/gu) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(codeOnly(client())).not.toMatch(/JSON\.stringify\(prose\)/u)
  })

  it("resolves an auto template before creating a draft", () => {
    // The route only ever stores a real template id; `auto` is a UI choice, not a column value.
    expect(client()).toMatch(/effectiveTemplate\(state, aggregate\)/u)
    expect(dialogs()).toMatch(/TEMPLATE_LABEL/u)
  })

  it("refuses to save a report it has not loaded", () => {
    expect(client()).toMatch(/if \(!report\) return/u)
    expect(client()).toMatch(/nothing to save/u)
  })

  it("asks before deleting, and never deletes on a single click", () => {
    // The DELETE only exists inside the confirmed action; the button only sets pendingDelete.
    expect(client()).toMatch(/setPendingDelete\(report\)/u)
    expect(client()).toMatch(/if \(!pendingDelete\) return/u)
    expect(client()).toMatch(/method: "DELETE"/u)
    expect(dialogs()).toMatch(/ConfirmReportDelete/u)
  })

  it("disables the write buttons while a write is in flight", () => {
    expect(client()).toMatch(/onClick=\{\(\) => void saveDraft\(\)\} disabled=\{busy\}/u)
    expect(client()).toMatch(/disabled=\{busy \|\| report === null\}/u)
    expect(dialogs()).toMatch(/disabled=\{busy \|\| draft\.title\.trim\(\) === ""\}/u)
  })

  it("recomputes with a POST, not a page reload", () => {
    expect(client()).toMatch(/\/recompute", \{ method: "POST" \}\)/u)
  })
})
```

Run: `npm test -- report-page`
Expected: FAIL — `ENOENT ... dialogs.tsx` and the assertions on the client's prose body.

- [ ] **Step 2: Add the cards**

Append to `app/dashboard/reports-work/sections.tsx`. Note `ProseSection` is generic over a section key on purpose: the six row sections also carry a commentary field, and one component means one validation message.

```tsx
export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function HeaderSection({
  report,
  title,
  period,
  template,
  sourceLabel,
  onTitle,
}: {
  report: ReportDto | null
  title: string
  period: Period
  template: ReportTemplate
  sourceLabel: string
  onTitle: (value: string) => void
}) {
  return (
    <SectionCard title={SECTION_TITLE.header} icon={<FileText className="h-4 w-4" />} className="md:col-span-2 xl:col-span-2">
      <div className="space-y-2">
        <Label htmlFor="report-title">Title</Label>
        <Input
          id="report-title"
          value={title}
          maxLength={MAX_REPORT_TITLE}
          placeholder={period.label}
          onChange={(event) => onTitle(event.target.value)}
        />
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {period.start} to {period.end} · {TEMPLATE_LABEL[template]} · {sourceLabel}
          {report ? ` · draft #${report.id}` : " · not saved"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          The header is computed: the period, template and author come from the report itself, and
          nothing typed here can change them.
        </p>
      </div>
    </SectionCard>
  )
}

export function ProseSection({
  section,
  value,
  rows = 6,
  hint,
  onChange,
}: {
  section: ReportSectionKey
  value: string
  rows?: number
  hint?: string
  onChange: (value: string) => void
}) {
  const over = value.length > MAX_SECTION_TEXT
  return (
    <SectionCard
      title={SECTION_TITLE[section]}
      icon={<NotebookPen className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-2"
    >
      <div className="space-y-2">
        <Textarea
          aria-label={SECTION_TITLE[section]}
          value={value}
          rows={rows}
          placeholder={hint ?? "Write this in your own words. The rows below it are counted for you."}
          onChange={(event) => onChange(event.target.value)}
          className={over ? "border-destructive" : undefined}
        />
        <p className={`text-[11px] tabular-nums ${over ? "text-destructive" : "text-muted-foreground"}`}>
          {over
            ? `${value.length - MAX_SECTION_TEXT} characters over the ${MAX_SECTION_TEXT} limit — the save will refuse this.`
            : `${value.length} characters`}
        </p>
      </div>
    </SectionCard>
  )
}
```

Add to the imports at the top of `sections.tsx`: `NotebookPen` (lucide), `Textarea` from `@/components/ui/textarea`, and from the reports modules `SECTION_TITLE`, `MAX_SECTION_TEXT`, `TEMPLATE_LABEL`, `type ReportSectionKey`, `type ReportTemplate`, `MAX_REPORT_TITLE`, `type Period`.

- [ ] **Step 3: Write the dialog**

Create `app/dashboard/reports-work/dialogs.tsx`:

```tsx
"use client"

// Two dialogs, because a report is created with a period and destroyed with a click. Both are
// controlled forms over a draft object rather than uncontrolled refs: the values shown are the
// values sent, and the route's whitelist checks them again anyway.

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MAX_REPORT_TITLE } from "@/lib/reports/report-fields"
import { PERIOD_LABEL, PERIOD_TYPES, type PeriodType } from "@/lib/reports/period"
import { REPORT_TEMPLATES, TEMPLATE_LABEL, type ReportTemplate } from "@/lib/reports/templates"

export type NewReportDraft = {
  title: string
  template: ReportTemplate
  periodType: PeriodType
}

/** The template `auto` is never offered here: a draft is created with a real template id. */
export function NewReportDialog({
  open,
  busy,
  defaultTitle,
  defaultTemplate,
  defaultPeriodType,
  onClose,
  onCreate,
}: {
  open: boolean
  busy: boolean
  defaultTitle: string
  defaultTemplate: ReportTemplate
  defaultPeriodType: PeriodType
  onClose: () => void
  onCreate: (draft: NewReportDraft) => void
}) {
  const [draft, setDraft] = useState<NewReportDraft>({
    title: defaultTitle,
    template: defaultTemplate,
    periodType: defaultPeriodType,
  })

  const submit = () => {
    const title = draft.title.trim()
    if (!title) return
    onCreate({ ...draft, title })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New report</DialogTitle>
          <DialogDescription>
            The period from the builder is used as-is, and every section fills itself from your work
            log. Only the name is yours to choose.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-report-title">Title</Label>
            <Input
              id="new-report-title"
              value={draft.title}
              maxLength={MAX_REPORT_TITLE}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-report-type">Period type</Label>
              <Select
                value={draft.periodType}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, periodType: value as PeriodType }))}
              >
                <SelectTrigger id="new-report-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PERIOD_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-report-template">Template</Label>
              <Select
                value={draft.template}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, template: value as ReportTemplate }))}
              >
                <SelectTrigger id="new-report-template" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TEMPLATES.map((template) => (
                    <SelectItem key={template} value={template}>
                      {TEMPLATE_LABEL[template]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || draft.title.trim() === ""}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmReportDelete({
  report,
  busy,
  onCancel,
  onConfirm,
}: {
  report: ReportDto | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={report !== null} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this draft?</DialogTitle>
          <DialogDescription>
            {report
              ? `"${report.title}" covers ${report.periodStart} to ${report.periodEnd}. Deleting it does not touch the work log entries behind it.`
              : "This report is gone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Keep it
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            Delete draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Add `import type { ReportDto } from "@/lib/reports/report-fields"` to the dialog's imports (it is used by `ConfirmReportDelete`). Confirm `@/components/ui/dialog` exports `DialogDescription` by reading `components/ui/dialog.tsx` before typing this in; if it does not, use a plain `<p className="text-sm text-muted-foreground">` and say so in the commit body.

- [ ] **Step 4: Wire the write path into the client**

In `reports-client.tsx`:

Add imports: `Plus`, `Save`, `Calculator` and `Trash2` from lucide (the client already imports `Copy` and `RefreshCw`), `useCallback` is already imported. Add the write helper above `refresh`, copied from `app/dashboard/worklog/worklog-client.tsx:136-146`:

```tsx
  const mutate = useCallback(async (path: string, init?: RequestInit): Promise<string | null> => {
    try {
      const res = await fetch(path, init)
      const json = await readJson(res)
      if (!res.ok || !json?.success) return json?.message ?? `Request failed (${res.status})`
      return null
    } catch (error) {
      return (error as Error).message
    }
  }, [])
```

 `PROSE_SECTIONS`, `effectiveTemplate`, `SOURCE_LABEL`, `type ReportSectionKey` (view-state + templates), `type ReportContent`, `type ReportTemplate`, `type ProseDraft` is local, and `ConfirmReportDelete`, `NewReportDialog`, `type NewReportDraft` from `./dialogs`, plus `HeaderSection`, `ProseSection` from `./sections`.

Above the component:

```tsx
type ProseDraft = Partial<Record<ReportSectionKey, string>>

function proseFromContent(content: ReportContent): ProseDraft {
  const out: ProseDraft = {}
  for (const key of PROSE_SECTIONS) out[key] = content[key]?.text ?? ""
  return out
}

/** One stable string for "is the form dirty", so eight textareas cannot disagree about it. */
function serializeProse(prose: ProseDraft): string {
  return PROSE_SECTIONS.map((key) => prose[key] ?? "").join("\u0000")
}
```

Inside the component, after the existing state:

```tsx
  const [title, setTitle] = useState("")
  const [prose, setProse] = useState<ProseDraft>({})
  const [savedProse, setSavedProse] = useState<ProseDraft>({})
  const [savedTitle, setSavedTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ReportDto | null>(null)

  const dirty = serializeProse(prose) !== serializeProse(savedProse) || title !== savedTitle
```

Replace the `state.reportId` branch in `refresh()` so the loaded row seeds the form (the four lines below go where `setReport(rowJson...)` currently is):

```tsx
            if (rowJson?.success) {
              const loaded = rowJson.data.report as ReportDto
              setReport(loaded)
              setMissingId(null)
              setTitle(loaded.title)
              setProse(proseFromContent(loaded.content))
              setSavedProse(proseFromContent(loaded.content))
              setSavedTitle(loaded.title)
            } else {
              setReport(null)
              setMissingId(state.reportId)
            }
```

and in the `state.reportId === null` branch, clear the form too:

```tsx
          setReport(null)
          setMissingId(null)
          setTitle("")
          setProse({})
          setSavedProse({})
          setSavedTitle("")
```

Add the three actions after `copyLink`:

```tsx
  const saveDraft = useCallback(async () => {
    if (!report) {
      toast({ title: "Nothing to save", description: "Create a draft first — a report needs a stored period before it can hold text." })
      return
    }
    setBusy(true)
    const error = await mutate(`/api/reports/work/${report.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        content: Object.fromEntries(PROSE_SECTIONS.map((key) => [key, { text: prose[key] ?? "" }])),
      }),
    })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error })
      return
    }
    setSavedProse(prose)
    setSavedTitle(title)
    await refresh()
    toast({ title: "Draft saved", description: title })
  }, [mutate, prose, refresh, report, title, toast])

  const createDraft = useCallback(
    async (draft: NewReportDraft) => {
      setBusy(true)
      const json = await readJson(
        await fetch("/api/reports/work", {
          method: "POST",
          body: JSON.stringify({
            title: draft.title,
            template: draft.template,
            periodType: draft.periodType,
            periodStart: shownPeriod.start,
            periodEnd: shownPeriod.end,
          }),
        }),
      )
      setBusy(false)
      if (!json?.success) {
        toast({ variant: "destructive", title: "Could not create the report", description: json?.message ?? "Request failed" })
        return
      }
      setNewOpen(false)
      patchState({ view: "build", reportId: (json.data.report as ReportDto).id })
      await refresh()
      toast({ title: "Draft created", description: draft.title })
    },
    [patchState, refresh, shownPeriod.end, shownPeriod.start, toast],
  )

  const recompute = useCallback(async () => {
    if (!report) return
    setBusy(true)
    const error = await mutate(`/api/reports/work/${report.id}/recompute`, { method: "POST" })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Recompute failed", description: error })
      return
    }
    await refresh()
    toast({ title: "Figures refreshed", description: `${shownPeriod.label} counted again from the work log.` })
  }, [mutate, refresh, report, shownPeriod.label, toast])

  const deleteDraft = useCallback(async () => {
    if (!pendingDelete) return
    setBusy(true)
    const error = await mutate(`/api/reports/work/${pendingDelete.id}`, { method: "DELETE" })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error })
      return
    }
    setPendingDelete(null)
    patchState({ reportId: null, view: "list" })
    await refresh()
    toast({ title: "Draft deleted" })
  }, [mutate, patchState, pendingDelete, refresh, toast])
```

`saveDraft`'s body has no `template` key on purpose: the template is changed with the Period card's select (which writes `?tpl=`), and saving text does not silently re-template someone's report. When the member *does* pick a template explicitly and presses Save, add `template: chosenTemplate` to that body — see Step 5.

Replace the `{/* Task 12 replaces this comment with the template-ordered report sections. */}` block with the ordered sections. The wrapper `<div className="contents">` keeps the grid layout while giving the list a key:

```tsx
        {state.view === "build"
          ? sectionsFor(templateChoice).map((key) => (
              <div key={key} className="contents">
                {sectionNodes[key]}
              </div>
            ))
          : null}
```

and define, inside the component after `aggregate`:

```tsx
  // The template decides the order; the map decides that a section the template does not lead
  // with is still present. A report missing its blockers section is the failure mode §6 warns
  // about, and it is prevented by structure rather than by a reviewer noticing.
  const templateChoice: ReportTemplate = effectiveTemplate(state, aggregate)
  const sectionNodes: Partial<Record<ReportSectionKey, React.ReactNode>> = {
    header: (
      <HeaderSection
        report={report}
        title={title}
        period={shownPeriod}
        template={templateChoice}
        sourceLabel={SOURCE_LABEL[source]}
        onTitle={setTitle}
      />
    ),
    summary: (
      <ProseSection
        key="summary"
        section="summary"
        value={prose.summary ?? ""}
        hint="Two or three sentences: what the period was, and what it cost."
        onChange={(value) => setProse((prev) => ({ ...prev, summary: value }))}
      />
    ),
    // Tasks 13-15 add the six row sections, metrics and notes here.
  }
```

and the toolbar gains the three write buttons (each `disabled={busy}`, which is what the guard counts):

```tsx
          <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New report
          </Button>
          <Button type="button" size="sm" onClick={() => void saveDraft()} disabled={busy} title={dirty ? "Unsaved changes" : "No changes to save"}>
            <Save className="mr-1 h-4 w-4" />
            Save draft
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void recompute()} disabled={busy || report === null}>
            <Calculator className="mr-1 h-4 w-4" />
            Recompute
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPendingDelete(report)} disabled={busy || report === null}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
```

`New report` is shown in both views; `Recompute` and `Delete` act on the loaded draft. Render the two dialogs once, before the closing `</div>` of the page:

```tsx
      <NewReportDialog
        open={newOpen}
        busy={busy}
        defaultTitle={shownPeriod.label}
        defaultTemplate={templateChoice}
        defaultPeriodType={state.periodType}
        onClose={() => setNewOpen(false)}
        onCreate={(draft) => void createDraft(draft)}
      />
      <ConfirmReportDelete
        report={pendingDelete}
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteDraft()}
      />
```

- [ ] **Step 5: Resolve the template-on-save question in the code, not in a comment**

`?tpl=auto` is a UI choice, and a draft must store a real template. `NewReportDialog` already receives `defaultTemplate={templateChoice}`, so creating a draft records the resolved template. For an existing draft whose stored template differs from what the member has now selected in the Period card, Save must write it: add to `saveDraft`'s body

```tsx
        template: templateChoice,
```

and add `templateChoice` to the callback's dependency list. The route accepts `template` because it is in `REPORT_MUTABLE_FIELDS`, so this needs no server change.

- [ ] **Step 6: Run the guards and the gates**

Run: `npm test -- report-page && npm run typecheck && npm run lint`
Expected: guard file green (13 tests); 0 type errors; 0 lint errors / 70 warnings. If `react-hooks/exhaustive-deps` fires on `sectionNodes`, it is the `useMemo` you did not need — the map is rebuilt every render by design and must not be memoised against `prose`.

- [ ] **Step 7: Owner check — not run by the executor**

On `/dashboard/reports-work` (already authenticated in the browser): press New report, name it, confirm the draft appears in the list and the URL carries `?v=build&r=<id>`; type into Summary, reload the page, and confirm the text is still there and the header still says "Figures as saved"; press Recompute and confirm the "Figures as of" date matches today; delete the draft and confirm the list empties.

- [ ] **Step 8: Commit and push**

```bash
git add app/dashboard/reports-work tests/unit/report-page.test.ts
git commit -m "feat(reports): header, summary and the save/recompute/delete path in the builder"
git push
```

---


### Task 13: The six computed sections — `lib/reports/row-sections.ts`

**Files:**
- Create: `lib/reports/row-sections.ts`
- Test: `tests/unit/report-row-sections.test.ts`
- Read first: `lib/reports/aggregate.ts` (Task 2's `ReportAggregate`, `ReportRow`, `MetricKey`), `lib/reports/templates.ts` (Task 3's `ReportSectionKey`), `lib/worklog/view-state.ts:82-130` (the work log's real URL grammar — this module links into it)

**Interfaces:**
- Consumes: Task 2's `aggregateReport()` output and Task 1's `Period`.
- Produces: `ROW_SECTIONS`, `RowSectionKey`, `isRowSection`, `ROW_SECTION_METRIC`, `ROW_SECTION_HINT`, `ROW_PREVIEW_LIMIT`, `rowsFor()`, `rowsCaption()`, `visibleRows()`, `hiddenRowCount()`, `refsFor()`, `worklogHref()`, `refHref()`. Task 14's `RowSection` card is the only consumer, and it renders from `rowsFor`/`visibleRows`/`rowsCaption` rather than reaching into `aggregate.completed` — one place decides which rows a section shows.

This module exists because §6 makes a promise a card cannot keep on its own: *"Every section carries the id list that made its number, so a supervisor's 'where does 14 come from?' opens 14 rows."* The number, the rows, the refs and the collapse rule all live here so the card in Task 14 has no room to disagree with itself.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-row-sections.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  METRIC_KEYS,
  aggregateReport,
  type MetricKey,
  type ReportAggregate,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import { isProseSection, SECTION_TITLE } from "@/lib/reports/templates"
import type { DeliverableDto, EntryDto } from "@/lib/worklog/entries"
import type { TransitionDto } from "@/lib/worklog/summary"
import {
  ROW_PREVIEW_LIMIT,
  ROW_SECTION_HINT,
  ROW_SECTION_METRIC,
  ROW_SECTIONS,
  hiddenRowCount,
  isRowSection,
  refHref,
  rowsCaption,
  rowsFor,
  visibleRows,
  worklogHref,
} from "@/lib/reports/row-sections"

const period = resolvePeriod("weekly", "2026-10-28") // Mon 2026-10-26 to Sun 2026-11-01
const TODAY = "2026-11-03"

const entry = (over: Partial<EntryDto> = {}): EntryDto => ({
  id: 1,
  workedOn: "2026-10-27",
  taskId: null,
  taskTitle: null,
  kind: "action",
  title: "Did the thing",
  body: null,
  discipline: "developer",
  minutes: 60,
  deliverableId: null,
  playbookId: null,
  playbookVersion: null,
  links: [],
  source: "manual",
  redatedAt: null,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const deliverable = (over: Partial<DeliverableDto> = {}): DeliverableDto => ({
  id: 11,
  name: "Runbook",
  type: "document",
  status: "draft",
  producedOn: "2026-10-27",
  link: null,
  evidence: null,
  taskId: null,
  taskTitle: null,
  discipline: "developer",
  entryCount: 0,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const transition = (over: Partial<TransitionDto> = {}): TransitionDto => ({
  id: 21,
  taskId: 5,
  taskTitle: "Ship the export",
  fromStatus: "review",
  toStatus: "done",
  at: "2026-10-27T10:00:00.000Z",
  source: "route",
  ...over,
})

const source = (over: Partial<ReportSource> = {}): ReportSource => ({
  period,
  todayIso: TODAY,
  timezone: "Africa/Nairobi",
  entries: [],
  deliverables: [],
  transitions: [],
  tasks: [],
  planItems: [],
  ...over,
})

/**
 * One aggregate with something in every section, built by the real producer rather than by a
 * hand-written object: the invariants below are only worth testing against what
 * `aggregateReport()` actually returns.
 */
const busy = aggregateReport(
  source({
    entries: [
      entry({ id: 1, taskId: 7, taskTitle: "Rewrite the ingest", minutes: 90 }),
      entry({
        id: 2,
        workedOn: "2026-10-28",
        kind: "blocker",
        taskId: 8,
        taskTitle: "Chase the vendor ticket",
        title: "Waiting on the vendor",
        body: "No response to ticket #4482",
        minutes: null,
      }),
    ],
    // Task 5 completed twice: the section counts changes, the metric counts tasks.
    transitions: [
      transition({ id: 21, taskId: 5, fromStatus: "review", toStatus: "done" }),
      transition({ id: 22, taskId: 5, fromStatus: "done", toStatus: "completed", at: "2026-10-28T10:00:00.000Z" }),
      transition({ id: 23, taskId: 6, taskTitle: "Close the finding", fromStatus: "review", toStatus: "closed", at: "2026-10-29T08:00:00.000Z" }),
    ],
    tasks: [
      { id: 5, title: "Ship the export", status: "done", priority: "high", dueDate: "2026-10-30", storyPoints: 3, sprintTitle: "Sprint 12" },
      { id: 6, title: "Close the finding", status: "closed", priority: "urgent", dueDate: "2026-10-29", storyPoints: 0, sprintTitle: null },
      { id: 7, title: "Rewrite the ingest", status: "in_progress", priority: "medium", dueDate: "2026-11-05", storyPoints: 5, sprintTitle: "Sprint 13" },
      { id: 8, title: "Chase the vendor ticket", status: "blocked", priority: "high", dueDate: "2026-10-10", storyPoints: 0, sprintTitle: null },
      { id: 9, title: "Draft the runbook", status: "todo", priority: "low", dueDate: "2026-10-20", storyPoints: 0, sprintTitle: null },
    ],
    deliverables: [
      deliverable({ id: 11, name: "Ingest runbook", status: "delivered", link: "https://example.test/runbook" }),
      deliverable({ id: 12, name: "Findings list", status: "in_review", producedOn: "2026-10-30" }),
      // Produced in an earlier period but still in review: it belongs to the current-state number,
      // not to the rows this section shows.
      deliverable({ id: 13, name: "Old scope", status: "in_review", producedOn: "2026-09-01" }),
    ],
    planItems: [
      { id: 31, title: "Rewire the dashboard", status: "todo", dueDate: "2026-11-10", startDate: "2026-11-04", planTitle: "Q4 plan" },
      { id: 32, title: "Retire the legacy exporter", status: "done", dueDate: "2026-11-20", startDate: null, planTitle: "Q4 plan" },
    ],
  }),
)

const quiet = aggregateReport(source())

const crowded: ReportAggregate = aggregateReport(
  source({
    transitions: Array.from({ length: 8 }, (_, index) =>
      transition({ id: 100 + index, taskId: 40 + index, at: `2026-10-27T0${index}:00:00.000Z` }),
    ),
  }),
)

describe("the six computed sections", () => {
  it("names the six sections the spec lists, in the spec's order", () => {
    expect([...ROW_SECTIONS]).toEqual(["completed", "deliverables", "inProgress", "blocked", "overdue", "nextPeriod"])
    expect(isRowSection("completed")).toBe(true)
    expect(isRowSection("summary")).toBe(false)
    expect(isRowSection("metrics")).toBe(false)
    expect(isRowSection(null)).toBe(false)
  })

  it("keeps every one of them editable, so a card can carry the author's commentary", () => {
    for (const section of ROW_SECTIONS) {
      expect(isProseSection(section)).toBe(true)
      expect(SECTION_TITLE[section]).toBeTruthy()
      expect(ROW_SECTION_HINT[section]).toBeTruthy()
    }
  })

  it("pairs each section with the metric the KPI strip shows for it", () => {
    expect(Object.keys(ROW_SECTION_METRIC).sort()).toEqual([...ROW_SECTIONS].sort())
    for (const metric of Object.values(ROW_SECTION_METRIC)) {
      expect(METRIC_KEYS).toContain(metric as MetricKey)
    }
  })
})

describe("the rows behind the number", () => {
  it("gives every row a ref, a title and a date the card can print", () => {
    for (const section of ROW_SECTIONS) {
      const rows = rowsFor(section, busy)
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(row.ref).toMatch(/^(event|task|deliverable|plan):\d+$/u)
        expect(row.title.trim()).not.toBe("")
        expect(row.date === null || row.date.match(/^\d{4}-\d{2}-\d{2}$/u)).toBeTruthy()
      }
    }
  })

  it("shows the same number of rows as the card claims for the five single-subject sections", () => {
    for (const section of ROW_SECTIONS) {
      if (section === "completed") continue
      const metric = busy.metrics[ROW_SECTION_METRIC[section]]
      expect(rowsFor(section, busy)).toHaveLength(metric.value)
      expect([...new Set(metric.refs)].sort()).toEqual(
        rowsFor(section, busy)
          .map((row) => row.ref)
          .sort(),
      )
    }
  })

  it("counts status changes in Actions completed, which is why its caption says so", () => {
    const rows = rowsFor("completed", busy)
    expect(rows).toHaveLength(3)
    expect(busy.metrics.completedTasks.value).toBe(2)
    for (const row of rows) expect(row.ref.startsWith("event:")).toBe(true)
  })

  it("brings the blocker's own words into the blocked row", () => {
    expect(rowsFor("blocked", busy)[0].detail).toBe("Reason: No response to ticket #4482")
  })

  it("lists the ids behind the number, prefixed and without duplicates", () => {
    expect(rowsFor("deliverables", busy).map((row) => row.ref)).toEqual(["deliverable:11", "deliverable:12"])
    const refs = rowsFor("completed", busy).map((row) => row.ref)
    expect(new Set(refs).size).toBe(refs.length)
  })
})

describe("the caption on the card", () => {
  it("spells the completed section as changes over tasks", () => {
    expect(rowsCaption("completed", busy)).toBe("3 status changes to done · 2 tasks")
  })

  it("counts what the recipient asks about in each of the other five", () => {
    expect(rowsCaption("deliverables", busy)).toBe("2 deliverables produced · 1 delivered · 2 awaiting review")
    expect(rowsCaption("inProgress", busy)).toBe("1 open task right now · 1 with a sprint")
    expect(rowsCaption("blocked", busy)).toBe("1 task blocked right now")
    expect(rowsCaption("overdue", busy)).toBe("2 tasks due before 2026-10-26")
    expect(rowsCaption("nextPeriod", busy)).toBe("1 plan item due after 2026-11-01")
  })

  it("says so when a section is empty, instead of printing a bare zero", () => {
    for (const section of ROW_SECTIONS) {
      const caption = rowsCaption(section, quiet)
      expect(caption.length).toBeGreaterThan(0)
      expect(caption).not.toMatch(/^0/u)
      expect(caption.at(-1)).toBe(".")
    }
  })

  it("names the period edge the two forward-looking sections are measured against", () => {
    expect(rowsCaption("overdue", busy)).toContain(period.start)
    expect(rowsCaption("nextPeriod", busy)).toContain(period.end)
  })
})

describe("collapse and expand", () => {
  it("collapses a crowded section to six rows and says how many are hidden", () => {
    expect(ROW_PREVIEW_LIMIT).toBe(6)
    expect(rowsFor("completed", crowded)).toHaveLength(8)
    expect(visibleRows("completed", crowded, false)).toHaveLength(6)
    expect(hiddenRowCount("completed", crowded)).toBe(2)
  })

  it("shows every row once the section is open, and hides nothing that is not there", () => {
    expect(visibleRows("completed", crowded, true)).toHaveLength(8)
    expect(hiddenRowCount("completed", busy)).toBe(0)
    expect(visibleRows("completed", quiet, false)).toEqual([])
  })

  it("keeps the collapsed rows a prefix of the expanded ones, so a row never jumps", () => {
    const all = visibleRows("completed", crowded, true)
    const shown = visibleRows("completed", crowded, false)
    expect(all.slice(0, shown.length)).toEqual(shown)
  })
})

describe("the work log link", () => {
  it("opens the same period the report is about, in the grammar the work log parses", () => {
    expect(worklogHref(period)).toBe("/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01")
  })

  it("filters the two sections the work log can actually filter", () => {
    expect(worklogHref(period, "blocked")).toBe(
      "/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01&kind=blocker",
    )
    expect(worklogHref(period, "deliverables")).toBe(
      "/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01&dlv=1",
    )
    expect(worklogHref(period, "completed")).toBe(worklogHref(period))
  })

  it("sends Next period nowhere, because the planner page does not exist yet", () => {
    expect(worklogHref(period, "nextPeriod")).toBeNull()
  })

  it("links a task row to its own log and refuses a row the work log cannot show", () => {
    expect(refHref("task:7", period)).toBe(
      "/dashboard/worklog?v=list&p=custom&from=2026-10-26&to=2026-11-01&task=7",
    )
    expect(refHref("event:21", period)).toBeNull()
    expect(refHref("deliverable:11", period)).toBeNull()
    expect(refHref("plan:31", period)).toBeNull()
    expect(refHref("nonsense", period)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to make sure it fails**

Run: `npm test -- report-row-sections`
Expected: FAIL — `Cannot find module '@/lib/reports/row-sections'` (the import at the bottom of the import block). The other imports resolve because Tasks 1-3 shipped.

- [ ] **Step 3: Write the module**

Create `lib/reports/row-sections.ts`:

```ts
// The six computed sections of a period report: which rows belong to each one, the one line the
// card prints as its number, how many rows are on screen, and the ids behind the count.
//
// Pure and DB-free, like the rest of lib/reports/. Task 14's card reads everything from here so a
// section cannot show a total that disagrees with the list under it — the failure §6 names.

import {
  type MetricKey,
  type ReportAggregate,
  type ReportRow,
} from "@/lib/reports/aggregate"
import type { Period } from "@/lib/reports/period"
import type { ReportSectionKey } from "@/lib/reports/templates"

export const ROW_SECTIONS = [
  "completed",
  "deliverables",
  "inProgress",
  "blocked",
  "overdue",
  "nextPeriod",
] as const satisfies readonly ReportSectionKey[]

export type RowSectionKey = (typeof ROW_SECTIONS)[number]

export function isRowSection(value: unknown): value is RowSectionKey {
  return typeof value === "string" && (ROW_SECTIONS as readonly string[]).includes(value)
}

/** The KPI-strip metric each section is the row list for. */
export const ROW_SECTION_METRIC = {
  completed: "completedTasks",
  deliverables: "deliverablesProduced",
  inProgress: "inProgressTasks",
  blocked: "blockedTasks",
  overdue: "overdueCarried",
  nextPeriod: "nextPeriodItems",
} as const satisfies Record<RowSectionKey, MetricKey>

/** The placeholder in each card's commentary field — the section explained in the author's terms. */
export const ROW_SECTION_HINT: Record<RowSectionKey, string> = {
  completed: "Say what the period was for. The rows above are the changes the board recorded.",
  deliverables: "Name where each one lives now, and what still needs a decision.",
  inProgress: "Say what each open task is waiting on, so nobody has to ask.",
  blocked: "Say what you need from someone else to get moving again.",
  overdue: "Say why these are still open, not just that they are late.",
  nextPeriod: "Say what you intend to do next, and what you would rather not carry again.",
}

/**
 * What a section reads when it has no rows. A bare `0` invites the wrong question; these lines
 * say which way the number is empty.
 */
const EMPTY_CAPTION: Record<RowSectionKey, string> = {
  completed: "No task reached a done status in this period.",
  deliverables: "No deliverable was produced in this period.",
  inProgress: "Nothing is open on the board right now.",
  blocked: "Nothing is blocked — the section a recipient reads first is the quiet one.",
  overdue: "Nothing was past due when this period opened.",
  nextPeriod: "No plan item is scheduled after this period.",
}

/** The most the card shows before the recipient has to ask for the rest. */
export const ROW_PREVIEW_LIMIT = 6

function plural(value: number, noun: string): string {
  return `${value} ${value === 1 ? noun : `${noun}s`}`
}

/** No `default`: a new row section fails to compile until it is given rows here. */
export function rowsFor(section: RowSectionKey, aggregate: ReportAggregate): ReportRow[] {
  switch (section) {
    case "completed":
      return aggregate.completed
    case "deliverables":
      return aggregate.deliverableRows
    case "inProgress":
      return aggregate.inProgress
    case "blocked":
      return aggregate.blocked
    case "overdue":
      return aggregate.overdue
    case "nextPeriod":
      return aggregate.nextPeriod
  }
}

export function rowsCaption(section: RowSectionKey, aggregate: ReportAggregate): string {
  const rows = rowsFor(section, aggregate)
  if (rows.length === 0) return EMPTY_CAPTION[section]

  const { metrics, period } = aggregate
  switch (section) {
    // The only section whose rows are not the thing its metric counts: the rows are the changes,
    // the metric is the distinct tasks, because a reopened task was completed twice.
    case "completed":
      return `${plural(rows.length, "status change")} to done · ${plural(metrics.completedTasks.value, "task")}`
    case "deliverables":
      return `${plural(rows.length, "deliverable")} produced · ${metrics.deliverablesDelivered.value} delivered · ${metrics.reviewRounds.value} awaiting review`
    case "inProgress":
      return `${plural(rows.length, "open task")} right now · ${metrics.sprintItems.value} with a sprint`
    case "blocked":
      return `${plural(rows.length, "task")} blocked right now`
    case "overdue":
      return `${plural(rows.length, "task")} due before ${period.start}`
    case "nextPeriod":
      return `${plural(rows.length, "plan item")} due after ${period.end}`
  }
}

export function visibleRows(
  section: RowSectionKey,
  aggregate: ReportAggregate,
  expanded: boolean,
): ReportRow[] {
  const rows = rowsFor(section, aggregate)
  return expanded ? rows : rows.slice(0, ROW_PREVIEW_LIMIT)
}

export function hiddenRowCount(section: RowSectionKey, aggregate: ReportAggregate): number {
  return Math.max(0, rowsFor(section, aggregate).length - ROW_PREVIEW_LIMIT)
}

export function refsFor(section: RowSectionKey, aggregate: ReportAggregate): string[] {
  return [...new Set(rowsFor(section, aggregate).map((row) => row.ref))]
}

function periodHref(period: Period): string {
  return `/dashboard/worklog?v=list&p=custom&from=${period.start}&to=${period.end}`
}

/**
 * The work log's own URL grammar (`lib/worklog/view-state.ts:82-130`), so the link opens the same
 * rows the report counted. `nextPeriod` has no target: plan items have no page until the planner
 * phase ships, and a link to a route that does not exist is worse than no link.
 */
export function worklogHref(period: Period, section?: RowSectionKey): string | null {
  if (section === "nextPeriod") return null
  const base = periodHref(period)
  if (section === "blocked") return `${base}&kind=blocker`
  if (section === "deliverables") return `${base}&dlv=1`
  return base
}

/** Only a task ref has a page that can show it on its own; everything else stays plain text. */
export function refHref(ref: string, period: Period): string | null {
  const match = /^task:(\d+)$/u.exec(ref)
  return match === null ? null : `${periodHref(period)}&task=${match[1]}`
}
```

- [ ] **Step 4: Run the tests to make sure they pass**

Run: `npm test -- report-row-sections`
Expected: PASS — 16 tests. If a caption test fails, the fixture numbers above are the truth: recount the fixture rows rather than editing the expected string, and if the producer really disagrees with the invariant in "shows the same number of rows as the card claims", that is a Task 2 bug — fix `aggregate.ts`, not this file.

- [ ] **Step 5: Run the gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 type errors, 0 lint errors / 70 warnings, suite green (44 files).

- [ ] **Step 6: Commit and push**

```bash
git add lib/reports/row-sections.ts tests/unit/report-row-sections.test.ts
git commit -m "feat(reports): the six computed sections with the refs behind every number"
git push
```

---

### Task 14: The six computed cards — rows, the count button, the drill-down

**Files:**
- Modify: `app/dashboard/reports-work/sections.tsx` (append `SECTION_ICON`, `CountButton`, `RowList`, `CommentField`, `RowSection`)
- Modify: `app/dashboard/reports-work/reports-client.tsx` (add `row()` and the six `sectionNodes` entries)
- Test: `tests/unit/report-page.test.ts` (append one describe, 6 tests → 19 in that file)
- Read first: `components/dashboard-kit.tsx:37-62` (`SectionCard`'s `title`/`icon`/`action`/`children`) and `:124` (the shared `EmptyNote`), `lib/reports/row-sections.ts` (Task 13)

**Interfaces:**
- Consumes: Task 13's `rowsFor`, `visibleRows`, `hiddenRowCount`, `rowsCaption`, `worklogHref`, `refHref`, `ROW_SECTION_HINT`, `RowSectionKey`; Task 11's client state (`aggregate`, `shownPeriod`, `state.open`, `patchState`, `prose`, `setProse`); Task 12's `sectionNodes` map.
- Produces: `RowSection` (one card per computed section), `CountButton`, `CommentField`. Task 16's Metrics card reuses `Stat` (Task 12) and the `EmptyNote` import added here.

One card per section, commentary inside it. `ProseSection` from Task 12 renders a whole card and is used only by the two author-only sections (`summary`, `notes`); a row section gets `CommentField`, a `Textarea` inside its own card. That is what keeps the page at twelve cards — the owner's 10-14 rule — instead of sixteen.

- [ ] **Step 1: Write the failing guards**

Append to `tests/unit/report-page.test.ts`. Add `ROW_SECTIONS` to the import block at the top of the file:

```ts
import { ROW_SECTIONS } from "@/lib/reports/row-sections"
```

```ts
describe("the six computed row cards", () => {
  it("gives every computed section a card in the build view", () => {
    for (const section of ROW_SECTIONS) expect(client()).toContain(`row("${section}")`)
  })

  it("makes the number on the card the length of the rows under it", () => {
    expect(sectionsFile()).toMatch(/const rows = aggregate \? rowsFor\(section, aggregate\) : \[\]/u)
    expect(sectionsFile()).toMatch(/total=\{rows\.length\}/u)
    expect(sectionsFile()).toMatch(/rows=\{shown\}/u)
  })

  it("keeps the drill-down in the URL, where a recipient can be sent to it", () => {
    expect(client()).toMatch(/expanded=\{state\.open === section\}/u)
    expect(client()).toMatch(/patchState\(\{ open: state\.open === section \? null : section \}\)/u)
    // sections.tsx is presentational: it holds no state of its own at all.
    expect(codeOnly(sectionsFile())).not.toMatch(/useState/u)
  })

  it("prints the ids behind the count only once the section is open", () => {
    expect(sectionsFile()).toMatch(/\{row\.ref\}/u)
    expect(sectionsFile()).toMatch(/expanded \? <p className="font-mono/u)
    expect(sectionsFile()).toMatch(/aria-expanded=\{expanded\}/u)
  })

  it("keeps the commentary inside the same card, so ten sections stay ten cards", () => {
    expect(sectionsFile()).toMatch(/<CommentField/u)
    expect(codeOnly(sectionsFile())).not.toMatch(
      /<ProseSection section="(completed|deliverables|inProgress|blocked|overdue|nextPeriod)"/u,
    )
  })

  it("links out only where the link is real", () => {
    expect(sectionsFile()).toMatch(/worklogHref\(period, section\)/u)
    expect(sectionsFile()).toMatch(/refHref\(row\.ref, period\)/u)
    // No invented routes: the planner page arrives with its own phase.
    expect(codeOnly(sectionsFile())).not.toMatch(/dashboard\/planner|dashboard\/tasks\/\$\{|dashboard\/deliverables/u)
  })
})
```

Run: `npm test -- report-page`
Expected: FAIL on the first new test (`row("completed")` is absent) — the earlier six still pass.

- [ ] **Step 2: Add the cards**

Append to `app/dashboard/reports-work/sections.tsx`:

```tsx
const SECTION_ICON: Record<RowSectionKey, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4" />,
  deliverables: <FileStack className="h-4 w-4" />,
  inProgress: <Loader2 className="h-4 w-4" />,
  blocked: <ShieldAlert className="h-4 w-4" />,
  overdue: <Clock className="h-4 w-4" />,
  nextPeriod: <CalendarClock className="h-4 w-4" />,
}

/**
 * The count is the button: it is the same number the list under it has rows for, and clicking it
 * writes `?open=<section>` so the expanded report is a linkable state rather than a click sequence.
 */
export function CountButton({
  total,
  hidden,
  expanded,
  section,
  onClick,
}: {
  total: number
  hidden: number
  expanded: boolean
  section: RowSectionKey
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px]"
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "Show"} the ${total} rows behind ${SECTION_TITLE[section]}`}
      onClick={onClick}
    >
      <span className="font-semibold tabular-nums">{total}</span>
      {hidden > 0 ? <span className="text-muted-foreground tabular-nums">+{hidden}</span> : null}
      {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
    </Button>
  )
}

function rowTitle(row: ReportRow, period: Period) {
  const href = refHref(row.ref, period)
  if (!href) return row.title
  return (
    <Link href={href} className="underline decoration-border underline-offset-2 hover:decoration-foreground">
      {row.title}
    </Link>
  )
}

/**
 * `key={row.ref}` — the ref is the id list §6 promises, and it is unique per row, so a row can
 * never be painted into the wrong place when a section expands.
 */
function RowList({ rows, expanded, period }: { rows: ReportRow[]; expanded: boolean; period: Period }) {
  if (rows.length === 0) return <EmptyNote>Nothing landed in this section for the period.</EmptyNote>
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((row) => (
        <li key={row.ref} className="py-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words text-[13px] leading-snug">{rowTitle(row, period)}</p>
              <p className="break-words text-[11px] text-muted-foreground">{row.detail}</p>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {row.date ?? "no date"}
            </span>
          </div>
          {expanded ? <p className="font-mono text-[10px] text-muted-foreground">{row.ref}</p> : null}
        </li>
      ))}
    </ul>
  )
}

export function CommentField({
  section,
  value,
  onChange,
}: {
  section: RowSectionKey
  value: string
  onChange: (value: string) => void
}) {
  const over = value.length > MAX_SECTION_TEXT
  return (
    <div className="space-y-1 border-t border-border/60 pt-3">
      <Label
        htmlFor={`comment-${section}`}
        className="text-[10px] uppercase tracking-wide text-muted-foreground"
      >
        Your read of this section
      </Label>
      <Textarea
        id={`comment-${section}`}
        aria-label={`${SECTION_TITLE[section]} commentary`}
        rows={2}
        value={value}
        placeholder={ROW_SECTION_HINT[section]}
        className={over ? "border-destructive" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {over ? (
        <p className="text-[10px] text-destructive tabular-nums">
          {value.length - MAX_SECTION_TEXT} characters over the {MAX_SECTION_TEXT} limit — the save will refuse this.
        </p>
      ) : null}
    </div>
  )
}

/**
 * One card, computed rows and the author's commentary. The rows are read through
 * `lib/reports/row-sections.ts` and never re-derived here: a card that totals its own rows is a
 * second opinion on the work log, and §6's whole point is that there is only one.
 */
export function RowSection({
  section,
  aggregate,
  period,
  expanded,
  comment,
  onToggle,
  onComment,
}: {
  section: RowSectionKey
  aggregate: ReportAggregate | null
  period: Period
  expanded: boolean
  comment: string
  onToggle: () => void
  onComment: (value: string) => void
}) {
  const rows = aggregate ? rowsFor(section, aggregate) : []
  const shown = aggregate ? visibleRows(section, aggregate, expanded) : []
  const hidden = aggregate ? hiddenRowCount(section, aggregate) : 0
  const link = worklogHref(period, section)

  return (
    <SectionCard
      title={SECTION_TITLE[section]}
      icon={SECTION_ICON[section]}
      action={
        <CountButton
          total={rows.length}
          hidden={hidden}
          expanded={expanded}
          section={section}
          onClick={onToggle}
        />
      }
    >
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {aggregate ? rowsCaption(section, aggregate) : "Numbers arrive with the period."}
        </p>
        {aggregate === null ? (
          <EmptyNote>The rows come from the work log, so they appear once the period has resolved.</EmptyNote>
        ) : (
          <RowList rows={shown} expanded={expanded} period={period} />
        )}
        {hidden > 0 && !expanded ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={onToggle}>
            Show the other {hidden}
          </Button>
        ) : null}
        {link ? (
          <Link
            href={link}
            className="text-[11px] underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            {rows.length > 0
              ? `Open these ${rows.length} rows in the work log`
              : "Open this period in the work log"}
          </Link>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            These rows come from a plan, and plans get their own page in a later phase — there is
            nowhere to open them yet.
          </p>
        )}
        <CommentField section={section} value={comment} onChange={onComment} />
      </div>
    </SectionCard>
  )
}
```

Add to the imports at the top of `sections.tsx`: `Link` from `next/link`; `CheckCircle2, ChevronDown, ChevronUp, Clock, FileStack, Loader2, ShieldAlert` from `lucide-react`; `EmptyNote` to the existing `@/components/dashboard-kit` import; and

```ts
import type { ReportAggregate, ReportRow } from "@/lib/reports/aggregate"
import {
  ROW_SECTION_HINT,
  type RowSectionKey,
  hiddenRowCount,
  refHref,
  rowsCaption,
  rowsFor,
  visibleRows,
  worklogHref,
} from "@/lib/reports/row-sections"
```

`Period` is already imported from `@/lib/reports/period` by Task 11.

- [ ] **Step 3: Wire the six cards into the template order**

In `app/dashboard/reports-work/reports-client.tsx`, add `type RowSectionKey` to the `@/lib/reports/row-sections` import (create that import line if it is not there yet — the client only needs the type) and `RowSection` to the `./sections` import list. Then add, immediately above `sectionNodes`:

```tsx
  const row = (section: RowSectionKey) => (
    <RowSection
      key={section}
      section={section}
      aggregate={aggregate}
      period={shownPeriod}
      expanded={state.open === section}
      comment={prose[section] ?? ""}
      onToggle={() => patchState({ open: state.open === section ? null : section })}
      onComment={(value) => setProse((prev) => ({ ...prev, [section]: value }))}
    />
  )
```

and replace the `// Tasks 13-15 add the six row sections, metrics and notes here.` comment line inside `sectionNodes` with the six entries (the `metrics` and `notes` keys arrive in Task 16):

```tsx
    completed: row("completed"),
    deliverables: row("deliverables"),
    inProgress: row("inProgress"),
    blocked: row("blocked"),
    overdue: row("overdue"),
    nextPeriod: row("nextPeriod"),
```

`state.open` is typed `ReportSectionKey | null` and `RowSectionKey` is a subset of it, so `expanded={state.open === section}` needs no cast; `prose[section]` is `string | undefined` because `ProseDraft` is a partial record, hence `?? ""`.

- [ ] **Step 4: Run the guards and the gates**

Run: `npm test -- report-page && npm run typecheck && npm run lint && npm test`
Expected: guard file green (19 tests); 0 type errors; 0 lint errors / 70 warnings; suite green (44 files). If `react-hooks/exhaustive-deps` warns, `row` is a plain function re-created each render and must not be wrapped in `useCallback` — its closure over `aggregate`/`state`/`prose` is the point.

- [ ] **Step 5: Owner check — not run by the executor**

On `/dashboard/reports-work` with a draft open: every one of the six cards shows rows with dates rather than a number alone; the badge shows the total and `+N` when collapsed; clicking it puts `open=blocked` (or whichever section) in the URL, reveals the `task:12` refs, and the browser back button returns to the collapsed report; a task title links to the work log filtered to that task; typing into a commentary field marks the toolbar Save button as holding unsaved changes, and Save keeps the text.

- [ ] **Step 6: Commit and push**

```bash
git add app/dashboard/reports-work tests/unit/report-page.test.ts
git commit -m "feat(reports): the six computed section cards with the URL-backed drill-down"
git push
```

---

### Task 15: Chart data and metric formatting — `lib/reports/charts.ts`

**Files:**
- Create: `lib/reports/charts.ts`
- Modify: `lib/reports/templates.ts` (add `formatMetricValue`)
- Test: `tests/unit/report-charts.test.ts` (new), `tests/unit/report-templates.test.ts` (3 tests appended → 19 in that file)
- Read first: `lib/reports/aggregate.ts` (the `SplitBucket`/`SeriesBucket` shapes this reads), `components/dashboard-kit.tsx:22-35` (`STATUS_COLOR`, `PRIORITY_COLOR`) and `:138-146` (`AXIS`, `TOOLTIP_STYLE`), `app/globals.css:57-68` (the `--chart-*` tokens), `app/dashboard/worklog/sections.tsx:893-936` (the bar-chart markup to imitate)

**Interfaces:**
- Consumes: Task 2's `ReportAggregate` (`byDiscipline`, `byKind`, `byTaskStatus`, `byPriority`, `series`, each bucket carrying `Count`s) and `TASK_BUCKET_LABEL`; Task 3's `ChartKey`, `CHART_KEYS`; `lib/roles.ts`'s `DISCIPLINE_COLOUR`; `lib/worklog/entries.ts`'s `KIND_COLOUR` and `formatMinutes`.
- Produces: `ChartDatum`, `FALLBACK_FILL`, `CHART_UNIT`, `TASK_BUCKET_FILL`, `PRIORITY_FILL`, `chartRows()`, and `formatMetricValue()` on `templates.ts`. Task 16's `MetricsSection` is the only consumer.

The charts are where a report most easily starts lying, so the data lives in a pure module with tests rather than in JSX: which measure each chart is drawn from, what colour each bucket gets, and what happens to a bucket nobody has a colour for.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-charts.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  TASK_BUCKET_LABEL,
  aggregateReport,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import { CHART_KEYS, type ChartKey } from "@/lib/reports/templates"
import {
  CHART_UNIT,
  FALLBACK_FILL,
  PRIORITY_FILL,
  TASK_BUCKET_FILL,
  chartRows,
} from "@/lib/reports/charts"
import type { EntryDto } from "@/lib/worklog/entries"

const period = resolvePeriod("weekly", "2026-10-28") // Mon 2026-10-26 to Sun 2026-11-01

const entry = (over: Partial<EntryDto> = {}): EntryDto => ({
  id: 1,
  workedOn: "2026-10-27",
  taskId: null,
  taskTitle: null,
  kind: "action",
  title: "Did the thing",
  body: null,
  discipline: "developer",
  minutes: 60,
  deliverableId: null,
  playbookId: null,
  playbookVersion: null,
  links: [],
  source: "manual",
  redatedAt: null,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const source = (over: Partial<ReportSource> = {}): ReportSource => ({
  period,
  todayIso: "2026-11-03",
  timezone: "Africa/Nairobi",
  entries: [],
  deliverables: [],
  transitions: [],
  tasks: [],
  planItems: [],
  ...over,
})

const busy = aggregateReport(
  source({
    entries: [
      entry({ id: 1, discipline: "developer", kind: "action", minutes: 120 }),
      entry({ id: 2, discipline: "auditor", kind: "review", minutes: 30 }),
      entry({ id: 3, discipline: "developer", kind: "blocker", minutes: 45 }),
      entry({ id: 4, discipline: "developer", kind: "note", minutes: 15 }),
      // Work logged before a discipline was chosen: it must still be drawn, in a real colour.
      entry({ id: 5, discipline: null, kind: "time", minutes: 10 }),
    ],
    tasks: [
      { id: 6, title: "Ship the export", status: "done", priority: "high", dueDate: "2026-10-30", storyPoints: 3, sprintTitle: "Sprint 12" },
      { id: 7, title: "Rewire the ingest", status: "in_progress", priority: "urgent", dueDate: "2026-11-05", storyPoints: 5, sprintTitle: null },
      { id: 8, title: "Chase the vendor", status: "blocked", priority: "medium", dueDate: "2026-11-06", storyPoints: 0, sprintTitle: null },
      { id: 9, title: "Draft the runbook", status: "waiting-on-vendor", priority: "none", dueDate: null, storyPoints: 0, sprintTitle: null },
    ],
  }),
)

const quiet = aggregateReport(source())

const total = (values: number[]): number => values.reduce((sum, value) => sum + value, 0)

describe("the chart datum", () => {
  it("carries everything the bar, its tooltip and its drill-down need", () => {
    for (const chart of CHART_KEYS) {
      const data = chartRows(busy, chart)
      expect(data.length).toBeGreaterThan(0)
      for (const datum of data) {
        expect(datum.label.trim()).not.toBe("")
        expect(Number.isFinite(datum.value)).toBe(true)
        expect(datum.display).toBeTruthy()
        expect(datum.fill).toMatch(/^hsl\(var\(--[a-z-]+\)\)$/u)
      }
    }
  })

  it("draws the three time charts from minutes", () => {
    expect(total(chartRows(busy, "discipline").map((d) => d.value))).toBe(busy.metrics.minutes.value)
    expect(total(chartRows(busy, "kind").map((d) => d.value))).toBe(busy.metrics.minutes.value)
    expect(total(chartRows(busy, "series").map((d) => d.value))).toBe(busy.metrics.minutes.value)
    expect(chartRows(busy, "discipline")[0]).toMatchObject({
      key: "developer",
      value: 180,
      display: "3h",
      refs: ["entry:1", "entry:3", "entry:4"],
    })
  })

  it("draws the two task charts from counts, with the task ids behind them", () => {
    expect(total(chartRows(busy, "taskStatus").map((d) => d.value))).toBe(4)
    expect(total(chartRows(busy, "priority").map((d) => d.value))).toBe(4)
    for (const chart of ["taskStatus", "priority"] as const) {
      for (const datum of chartRows(busy, chart)) {
        expect(datum.display).toBe(String(datum.value))
        for (const ref of datum.refs) expect(ref.startsWith("task:")).toBe(true)
      }
    }
  })

  it("names the buckets with the aggregate's own words", () => {
    expect(chartRows(busy, "discipline").find((d) => d.key === "unassigned")?.label).toBe("Not set")
    expect(chartRows(busy, "taskStatus").map((d) => d.label)).toContain(TASK_BUCKET_LABEL.blocked)
  })
})

describe("an empty period", () => {
  it("keeps one point per bucket, gaps and all, so a quiet week still has a shape", () => {
    expect(chartRows(busy, "series")).toHaveLength(busy.series.length)
    expect(chartRows(quiet, "series")).toHaveLength(quiet.series.length)
    for (const datum of chartRows(quiet, "series")) {
      expect(datum.value).toBe(0)
      expect(datum.refs).toEqual([])
    }
  })

  it("returns nothing for a split with no rows, so the card can show its empty note", () => {
    expect(chartRows(quiet, "discipline")).toEqual([])
    expect(chartRows(quiet, "kind")).toEqual([])
    expect(chartRows(quiet, "taskStatus")).toEqual([])
    expect(chartRows(quiet, "priority")).toEqual([])
  })

  it("gives a bucket nobody mapped the muted token instead of no colour at all", () => {
    expect(chartRows(busy, "discipline").find((d) => d.key === "unassigned")?.fill).toBe(FALLBACK_FILL)
    expect(FALLBACK_FILL).toBe("hsl(var(--muted-foreground))")
  })
})

describe("the colour vocabulary", () => {
  it("covers all four task buckets and every priority the app can hold", () => {
    expect(Object.keys(TASK_BUCKET_FILL).sort()).toEqual(Object.keys(TASK_BUCKET_LABEL).sort())
    expect(Object.keys(PRIORITY_FILL).sort()).toEqual(["high", "low", "medium", "none", "urgent"])
  })

  it("pairs every chart key with the unit its bars are drawn in", () => {
    expect(CHART_KEYS.map((key) => CHART_UNIT[key])).toEqual(["time", "time", "count", "count", "time"])
  })

  it("answers for every chart the templates are allowed to ask for", () => {
    for (const chart of CHART_KEYS) expect(Array.isArray(chartRows(busy, chart))).toBe(true)
  })

  it("throws rather than drawing a blank for a chart key it does not know", () => {
    // The double cast is what the compiler refuses to do for a real key it has never seen; here it
    // is the test standing in for a `ChartKey` added to the vocabulary without any data behind it.
    expect(() => chartRows(busy, "sparkline" as unknown as ChartKey)).toThrow(/no chart data/u)
  })
})
```

- [ ] **Step 2: Append the metric-format tests to the templates file**

Add `formatMetricValue` to the `@/lib/reports/templates` import list in `tests/unit/report-templates.test.ts`, and add `type Count` to the `@/lib/reports/aggregate` import in the same file (it already imports `METRIC_KEYS`). Then append these three tests to `describe("the five templates")`:

```ts
  it("reads the minutes metric as time and every other metric as a count", () => {
    expect(formatMetricValue("minutes", { value: 95, refs: ["entry:1", "entry:2"] })).toBe("1h 35m")
    expect(formatMetricValue("completedTasks", { value: 3, refs: ["task:1"] })).toBe("3")
    expect(formatMetricValue("storyPointsCompleted", { value: 8, refs: ["task:1"] })).toBe("8")
  })

  it("says nothing was logged instead of printing 0m on a quiet period", () => {
    expect(formatMetricValue("minutes", { value: 0, refs: [] })).toBe("None logged")
  })

  it("never lets a metric reach the strip as an empty string", () => {
    for (const key of METRIC_KEYS) {
      expect(formatMetricValue(key, { value: 0, refs: [] })).toBeTruthy()
    }
  })
```

Run: `npm test -- report-charts report-templates`
Expected: `report-charts` FAILs with `Cannot find module '@/lib/reports/charts'`; `report-templates` FAILs because `formatMetricValue` is not exported (typecheck also flags it, which is why Step 6 runs both).

- [ ] **Step 3: Write the chart module**

Create `lib/reports/charts.ts`:

```ts
// The data behind the report's charts, kept out of JSX on purpose: a bar chart is the easiest
// place in a report to say something the work log does not support, so the measure each chart is
// drawn from, the colour of each bucket and the behaviour of an unmapped bucket are tested here.
//
// Pure — it reads a ReportAggregate and never a database.

import { DISCIPLINE_COLOUR } from "@/lib/roles"
import { TASK_BUCKET_LABEL, type ReportAggregate } from "@/lib/reports/aggregate"
import type { ChartKey } from "@/lib/reports/templates"
import { KIND_COLOUR, formatMinutes } from "@/lib/worklog/entries"

export type ChartDatum = {
  key: string
  label: string
  /** The bar's height: minutes for the time charts, a count for the task charts. */
  value: number
  /** What the tooltip and the drill-down print beside it, already in the right unit. */
  display: string
  fill: string
  refs: string[]
}

const token = (name: string): string => `hsl(var(--chart-${name}))`

/**
 * A bucket outside the maps below gets this rather than `undefined`, which recharts paints black:
 * an unmapped bucket is a naming gap, not a reason to hide a bar.
 */
export const FALLBACK_FILL = "hsl(var(--muted-foreground))"

/**
 * Which measure each chart is drawn from, so the axis label, the tooltip unit and the bar itself
 * can never disagree. `CHART_LABEL` names the chart; this says what its numbers mean.
 */
export const CHART_UNIT: Record<ChartKey, "time" | "count"> = {
  discipline: "time",
  kind: "time",
  series: "time",
  taskStatus: "count",
  priority: "count",
}

/**
 * Mirrors `STATUS_COLOR` and `PRIORITY_COLOR` in `components/dashboard-kit.tsx:22-35`, repeated
 * here because `lib/` may not import a client component. The keys are the four `TaskBucketName`s
 * (which is what `byTaskStatus` is split by) and the app's four priorities plus the `none` the
 * aggregate invents for a task with no priority.
 */
export const TASK_BUCKET_FILL: Record<string, string> = {
  completed: token("pine"),
  in_progress: token("moss"),
  blocked: "hsl(var(--destructive))",
  other: token("stone"),
}

export const PRIORITY_FILL: Record<string, string> = {
  urgent: "hsl(var(--destructive))",
  high: token("clay"),
  medium: token("moss"),
  low: token("stone"),
  none: token("slate"),
}

// Spread copies, so an arbitrary bucket key can be looked up without casting it to a union it is
// not provably a member of.
const DISCIPLINE_FILL: Record<string, string> = { ...DISCIPLINE_COLOUR }
const KIND_FILL: Record<string, string> = { ...KIND_COLOUR }

function timeDatum(
  key: string,
  label: string,
  value: number,
  refs: string[],
  fill: string,
): ChartDatum {
  return { key, label, value, display: formatMinutes(value), fill, refs }
}

function countDatum(
  key: string,
  label: string,
  value: number,
  refs: string[],
  fill: string,
): ChartDatum {
  return { key, label, value, display: String(value), fill, refs }
}

export function chartRows(aggregate: ReportAggregate, chart: ChartKey): ChartDatum[] {
  switch (chart) {
    case "discipline":
      return aggregate.byDiscipline.map((bucket) =>
        timeDatum(
          bucket.key,
          bucket.label,
          bucket.minutes.value,
          bucket.minutes.refs,
          DISCIPLINE_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    case "kind":
      return aggregate.byKind.map((bucket) =>
        timeDatum(
          bucket.key,
          bucket.label,
          bucket.minutes.value,
          bucket.minutes.refs,
          KIND_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    case "series":
      // Every bucket, including the zero ones: a day with entries but no recorded minutes is the
      // gap the recipient is being told about, and dropping it would draw the quiet days out.
      return aggregate.series.map((bucket) =>
        timeDatum(bucket.key, bucket.label, bucket.minutes.value, bucket.minutes.refs, token("pine")),
      )
    case "taskStatus":
      return aggregate.byTaskStatus.map((bucket) =>
        countDatum(
          bucket.key,
          bucket.label,
          bucket.count.value,
          bucket.count.refs,
          TASK_BUCKET_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    case "priority":
      return aggregate.byPriority.map((bucket) =>
        countDatum(
          bucket.key,
          bucket.label,
          bucket.count.value,
          bucket.count.refs,
          PRIORITY_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    default:
      // `TEMPLATE_CHARTS` can only hold declared keys, so reaching this means a chart was added
      // without data for it. A thrown error in a preview route is better than a blank card.
      throw new Error(`no chart data for ${String(chart)}`)
  }
}
```

- [ ] **Step 4: Add `formatMetricValue` to the templates module**

Append to `lib/reports/templates.ts`, and extend its existing imports with `formatMinutes` from `@/lib/worklog/entries` and `type Count` in the `@/lib/reports/aggregate` import:

```ts
/**
 * One tile per leading metric. Time is the only metric that is not a count, and a quiet period
 * says so in words: "0m" reads like a rounding error rather than like a week that had no time in it.
 */
export function formatMetricValue(key: MetricKey, count: Count): string {
  if (key === "minutes") return count.value === 0 ? "None logged" : formatMinutes(count.value)
  return String(count.value)
}
```

- [ ] **Step 5: Run the tests to make sure they pass**

Run: `npm test -- report-charts report-templates`
Expected: charts PASS — 11 tests; templates PASS — 19 tests. If a sum test fails, the fixture above is the truth: recount the fixture entries rather than editing the expected number, and if `aggregateReport()` really disagrees with its own metric, that is a Task 2 bug — fix `aggregate.ts`.

- [ ] **Step 6: Run the gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 type errors, 0 lint errors / 70 warnings, suite green (45 files).

- [ ] **Step 7: Commit and push**

```bash
git add lib/reports/charts.ts lib/reports/templates.ts tests/unit/report-charts.test.ts tests/unit/report-templates.test.ts
git commit -m "feat(reports): chart data and metric formatting with the measure and colour rules under test"
git push
```

---

### Task 16: The Metrics card, the Notes card, and the owner's visual checks

**Files:**
- Modify: `app/dashboard/reports-work/sections.tsx` (append `UNIT_NOUN`, `metricHint`, `ChartBlock`, `MetricsSection`)
- Modify: `app/dashboard/reports-work/reports-client.tsx` (the last two `sectionNodes` entries)
- Test: `tests/unit/report-page.test.ts` (append one describe, 6 tests → 25 in that file)
- Read first: `app/dashboard/worklog/sections.tsx:877-935` (`DisciplineSplitSection` — the vertical `BarChart`, the `Tooltip` `formatter` shape and the `contentStyle` this copies), `lib/reports/charts.ts` (Task 15: `chartRows`, `CHART_UNIT`, `ChartDatum`), `lib/reports/templates.ts:1671-1720` (`TEMPLATE_METRICS`, `METRIC_LABEL`, `CHART_LABEL`, `TEMPLATE_CHARTS`)

**Interfaces:**
- Consumes: Task 12's `Stat` and `ProseSection`; Task 15's `chartRows`, `CHART_UNIT`, `ChartDatum`, and `formatMetricValue`; Task 3's `SECTION_TITLE`, `METRIC_LABEL`, `CHART_LABEL`, `TEMPLATE_METRICS`, `TEMPLATE_CHARTS`, `type ChartKey`; Task 2's `isSumMetric`, `type Count`, `type MetricKey`, `type ReportAggregate`; Task 5's `SOURCE_LABEL`; `formatMinutes` from `lib/worklog/entries`.
- Produces: `MetricsSection`, `ChartBlock`. Nothing later in this plan consumes them — Task 17 only proves the page is complete and writes it down.

This is the last card. §6 asks for a section with "KPI strip plus the author's own read of the period" for the summary and "by discipline, status, priority; yearly adds the monthly series" for metrics, and the metrics card is where the plan's colour and measure rules become visible: `CHART_UNIT` decides the tooltip word, `chartRows()` decides the bar height, and neither is decided in JSX. `metrics` is a **server** section (`SECTION_SOURCE.metrics`), so the card has no text box — a `Textarea` here would be a field `readContent` refuses to save, which is the bug the last guard below forbids.

The notes card is the one the owner reads first when the numbers are bad, so it is the tallest editor on the page (`rows={8}`).

- [ ] **Step 1: Write the failing guards**

Append to `tests/unit/report-page.test.ts`. Add two import lines next to Task 14's `ROW_SECTIONS` import — the file has had no `@/lib` imports before, and these are the first pure modules it may reach:

```ts
import { CHART_UNIT } from "@/lib/reports/charts"
import { CHART_KEYS, REPORT_TEMPLATES, TEMPLATE_CHARTS, TEMPLATE_METRICS } from "@/lib/reports/templates"
```

`lib/reports/charts.ts` and `lib/reports/templates.ts` are pure — neither reaches a database — so this guard file may import them, which is what lets the tests below check the unit map itself rather than only the file's text.

```ts
describe("the metrics card", () => {
  it("completes the build view with the last two sections", () => {
    expect(client()).toMatch(/metrics: \(\n\s+<MetricsSection/u)
    expect(client()).toMatch(/notes: \(\n\s+<ProseSection\s+key="notes"/u)
    // Nothing shipped still waits on a later task.
    expect(client()).not.toMatch(/Tasks 1[0-9] add/u)
  })

  it("takes the strip from the template and the numbers from the aggregate", () => {
    expect(sectionsFile()).toMatch(/TEMPLATE_METRICS\[template\]\.map/u)
    expect(sectionsFile()).toMatch(/formatMetricValue\(key, metrics\[key\]\)/u)
    // One home for the arithmetic: the card renders the metrics it is handed.
    expect(codeOnly(sectionsFile())).not.toMatch(/\.reduce\(|aggregateReport\(/u)
  })

  it("separates a total from a count, and says so when the period was quiet", () => {
    expect(sectionsFile()).toMatch(/if \(count\.value === 0\) return "Nothing in this period"/u)
    // A count metric's value already *is* its row count, so repeating it under the number is noise;
    // a sum (minutes, story points) is the one case where the row count is information.
    expect(sectionsFile()).toMatch(/if \(!isSumMetric\(key\)\) return undefined/u)
    expect(sectionsFile()).toMatch(/\? "row" : "rows"/u)
  })

  it("draws each chart the template asks for, in the unit the module declares", () => {
    expect(sectionsFile()).toMatch(/TEMPLATE_CHARTS\[template\]\.map/u)
    expect(sectionsFile()).toMatch(/chartRows\(aggregate, chart\)/u)
    expect(sectionsFile()).toMatch(/const unit = CHART_UNIT\[chart\]/u)
    expect(sectionsFile()).toMatch(
      /unit === "time" \? formatMinutes\(Number\(value\)\) : String\(value\)/u,
    )
    expect(sectionsFile()).toMatch(/dataKey="value"/u)
    expect(sectionsFile()).toMatch(/fill=\{cell\.fill\}/u)
    // The strip and the charts both follow the template, so no template can lose its own figures.
    for (const template of REPORT_TEMPLATES) {
      expect(TEMPLATE_METRICS[template].length).toBeGreaterThan(0)
      expect(TEMPLATE_CHARTS[template].length).toBeGreaterThan(0)
    }
    // Every chart in the vocabulary has a declared measure, so a new ChartKey cannot draw a
    // tooltip with an undefined unit word.
    for (const chart of CHART_KEYS) expect(CHART_UNIT[chart]).toBeTruthy()
  })

  it("prints the ids behind a bar under one disclosure, like the row cards", () => {
    expect(sectionsFile()).toMatch(/<details/u)
    expect(sectionsFile()).toMatch(/\{datum\.refs\.join\(" · "\)\}/u)
    expect(sectionsFile()).toMatch(/\{datum\.label\} — \{datum\.display\}/u)
    expect(sectionsFile()).toMatch(/Which rows make these bars\?/u)
  })

  it("keeps the server-owned card free of a text box and names the source of its numbers", () => {
    // `metrics` is a server section: readContent refuses prose for it, so an editor here would be
    // a field that can be typed into and never saved.
    expect(codeOnly(sectionsFile())).not.toMatch(/<ProseSection section="metrics"/u)
    // Only the two computed cards state where their figures came from, and both of them must.
    expect(client().match(/sourceLabel=\{SOURCE_LABEL\[source\]\}/gu)).toHaveLength(2)
  })
})
```

Run: `npm test -- report-page`
Expected: FAIL on the first new test (`<MetricsSection` is absent); the earlier nineteen still pass.

- [ ] **Step 2: Add the two components**

Append to `app/dashboard/reports-work/sections.tsx`:

```tsx
/** The word the tooltip and the drill-down use beside each number. Both count charts count tasks. */
const UNIT_NOUN: Record<"time" | "count", string> = { time: "time", count: "tasks" }

/**
 * A tile's second line. For a count metric the value already *is* the row count, so a hint of
 * "6 rows" under "6" is noise; for a sum — minutes, story points — the row count is the only way
 * to show that a big total came from a small number of rows. A zero says what it means in words.
 */
function metricHint(key: MetricKey, count: Count): string | undefined {
  if (count.value === 0) return "Nothing in this period"
  if (!isSumMetric(key)) return undefined
  return `from ${count.refs.length} ${count.refs.length === 1 ? "row" : "rows"}`
}

/**
 * One horizontal-bar chart. Horizontal on purpose: the labels are discipline and status names, not
 * dates, and the work log already draws its splits this way — the same measure, the same token
 * colours, the same tooltip shape on both pages. The height grows with the rows so a yearly series
 * of twelve buckets never overlaps itself.
 */
export function ChartBlock({ chart, data }: { chart: ChartKey; data: ChartDatum[] }) {
  const unit = CHART_UNIT[chart]
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {CHART_LABEL[chart]}
      </p>
      {data.length === 0 ? (
        <EmptyNote>Nothing in this period to split this way.</EmptyNote>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(120, data.length * 26)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => [
                  unit === "time" ? formatMinutes(Number(value)) : String(value),
                  String(name),
                ]}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="value" name={UNIT_NOUN[unit]} radius={[0, 3, 3, 0]}>
                {data.map((cell) => (
                  <Cell key={cell.key} fill={cell.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* The row cards put their ids behind the count button; a chart has no button, so the
              same disclosure lives under the bars — §6's "where does 14 come from?" answered
              without leaving the page. */}
          <details className="text-[11px]">
            <summary className="cursor-pointer list-none text-muted-foreground hover:text-foreground">
              Which rows make these bars?
            </summary>
            <ul className="mt-1 space-y-1.5">
              {data.map((datum) => (
                <li key={datum.key}>
                  <p className="tabular-nums">
                    {datum.label} — {datum.display}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {datum.refs.join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  )
}

/**
 * The figures the author did not type. `sourceLabel` is on this card rather than only in the
 * toolbar because this is the card a recipient argues with, and "these are the numbers as saved on
 * 26 October" is the answer.
 */
export function MetricsSection({
  template,
  aggregate,
  sourceLabel,
}: {
  template: ReportTemplate
  aggregate: ReportAggregate | null
  sourceLabel: string
}) {
  const metrics = aggregate?.metrics
  return (
    <SectionCard
      title={SECTION_TITLE.metrics}
      icon={<BarChart3 className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-3"
    >
      <div className="space-y-4">
        <p className="text-[11px] text-muted-foreground">{sourceLabel}</p>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {TEMPLATE_METRICS[template].map((key) => (
            <Stat
              key={key}
              label={METRIC_LABEL[key]}
              value={metrics ? formatMetricValue(key, metrics[key]) : "—"}
              hint={metrics ? metricHint(key, metrics[key]) : undefined}
            />
          ))}
        </div>
        {aggregate === null ? (
          <EmptyNote>
            The charts read the same figures, so they appear once the period has resolved.
          </EmptyNote>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATE_CHARTS[template].map((chart) => (
              <ChartBlock key={chart} chart={chart} data={chartRows(aggregate, chart)} />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  )
}
```

Add to the imports at the top of `sections.tsx`: `BarChart3` to the `lucide-react` block; the recharts block

```ts
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
```

`formatMinutes` is a new import for this file — add `import { formatMinutes } from "@/lib/worklog/entries"`; nothing in Tasks 11-14 needed it. Then widen the existing reports imports to:

```ts
import { isSumMetric, type Count, type MetricKey, type ReportAggregate, type ReportRow } from "@/lib/reports/aggregate"
import { CHART_UNIT, type ChartDatum, chartRows } from "@/lib/reports/charts"
import {
  CHART_LABEL,
  type ChartKey,
  formatMetricValue,
  MAX_SECTION_TEXT,
  METRIC_LABEL,
  SECTION_TITLE,
  TEMPLATE_CHARTS,
  TEMPLATE_LABEL,
  TEMPLATE_METRICS,
  type ReportSectionKey,
  type ReportTemplate,
} from "@/lib/reports/templates"
```

`EmptyNote`, `SectionCard`, `Stat` and `ProseSection` are already in this file; `templateChoice` and `source` are already in the client. Note the import list above *replaces* the narrower lines Tasks 12 and 14 added rather than sitting beside them — a duplicate `@/lib/reports/templates` import is a lint error, and `type ReportAggregate, type ReportRow` must survive from Task 14's line.

- [ ] **Step 3: Wire the last two cards**

In `app/dashboard/reports-work/reports-client.tsx`, add `MetricsSection` to the `./sections` import list, then append the two entries after `nextPeriod: row("nextPeriod"),`:

```tsx
    metrics: (
      <MetricsSection
        key="metrics"
        template={templateChoice}
        aggregate={aggregate}
        sourceLabel={SOURCE_LABEL[source]}
      />
    ),
    notes: (
      <ProseSection
        key="notes"
        section="notes"
        value={prose.notes ?? ""}
        rows={8}
        hint="Capacity, tooling, a decision you need from the reader — anything you would say if they asked."
        onChange={(value) => setProse((prev) => ({ ...prev, notes: value }))}
      />
    ),
```

`SOURCE_LABEL` and `source` come from Task 11 / Task 12, so no new import is needed beyond `MetricsSection`; `templateChoice` is the same `effectiveTemplate(state, aggregate)` the row cards already follow, which is what makes the strip and the charts change together when `?tpl=` changes.

- [ ] **Step 4: Run the guards and the gates**

Run: `npm test -- report-page && npm run typecheck && npm run lint && npm test`
Expected: guard file green (25 tests); 0 type errors; 0 lint errors / 70 warnings; suite green (45 files). If the recharts `formatter` types complain, the signature the worklog uses is `(value: ValueType | undefined, name: NameType | undefined, …)` — keep `Number(value)` and `String(name)` rather than annotating the callback.

- [ ] **Step 5: Commit and push**

```bash
git add app/dashboard/reports-work tests/unit/report-page.test.ts
git commit -m "feat(reports): the metrics card, the chart set and the notes section"
git push
```

- [ ] **Step 6: Owner's visual checks (the executor does not run these)**

No server is started for this plan, so the whole build view is unverified in a browser until the owner runs it. What to look at, in one pass on `/dashboard/reports-work` with a weekly draft open — the phase-2 list still stands too (heat view on a phone, `#45 #blocker …` quick add, the bulk bar tick/un-tick, CSV comma handling, a second account's 404s):

1. Twelve cards in the template order, no spinner left behind, no card whose number contradicts the rows under it.
2. Phone width (390 px): no horizontal scroll; the KPI strip wraps to two tiles per row; the chart `YAxis` labels are not clipped by the 110 px gutter; the "Which rows make these bars?" list is readable.
3. A period with nothing in it: every computed card shows its own sentence, `Time logged` reads "None logged", and no chart draws an empty frame.
4. A yearly draft: the series chart has twelve bars and does not overlap; `Per day across the period` is labelled with the month buckets, not thirty-one unnamed columns.
5. Both themes: every bar legible against the card (all colours are `hsl(var(--chart-*))` or `--destructive`, so this should be free — if a bar disappears in one theme, the token is the bug, not the chart).
6. Reload the page with `?open=blocked` in the address bar: the blockers card comes back expanded with its refs visible, and Back returns it to collapsed.
7. `GET /api/reports/work` and `GET /api/reports/work/1` without a session cookie answer `401` (curl, or the browser's network tab after signing out).

---
### Task 17: The completeness sweep, the three docs, and the spec sync

Nothing in this task adds a feature. It does three things phase 1 and phase 2 each ended with: it fails a test the
next time someone quietly drops a control, it writes the three documents the owner reads instead of the diff, and
it corrects the sentences in the spec that described this phase as future work. The docs are the deliverable here —
a phase that ships without being written down is a phase a reader of `FEATURES.md` cannot tell apart from one that
never happened.

**Files:**
- Modify: `tests/unit/report-page.test.ts` (append one describe, 7 tests → 32 in that file; no new file, so the suite stays at 45)
- Modify: `FEATURES.md` — new `## 9. Period work reports (phase 3, 2026-10-26)`, and `FEATURES.md:232` corrected
- Modify: `DESIGN_SYSTEM.md` — new `## 12. Period work reports (phase 3, 2026-10-26)` with the card inventory and the chart rules
- Modify: `PLACEHOLDERS.md` — new `## 8. Period work reports (phase 3, 2026-10-26) — no new placeholder`, and the stale row at `PLACEHOLDERS.md:92` corrected
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` — §4's "group into a report draft" line, §6's four section descriptions and four phase-owner tags, §13's `work_reports` note, §16 phase 3 marked shipped
- Read first: `FEATURES.md:207-244` and `PLACEHOLDERS.md:77-100` — phase 2's sections are the format, tone and level of detail to match; `DESIGN_SYSTEM.md:235-` for the section-inventory table shape

**Interfaces:**
- Consumes: every file this phase created or modified.
- Produces: documentation and guards only. Task 17 is the last task in the plan.

- [ ] **Step 1: Write the sweep**

Append to `tests/unit/report-page.test.ts`. Extend the `@/lib/reports/templates` import from Task 16 with
`PROSE_SECTIONS`, `REPORT_SECTIONS`, `SECTION_TITLE`, `sectionsFor`, and add a `dialogsFile` helper beside the
existing `page` / `client` / `sectionsFile`:

```ts
const dialogsFile = () => src("app/dashboard/reports-work/dialogs.tsx")
```

```ts
describe("the finished phase 3", () => {
  const pageSource = () =>
    ["page.tsx", "reports-client.tsx", "sections.tsx", "dialogs.tsx"]
      .map((name) => src(`app/dashboard/reports-work/${name}`))
      .join("\n")
  const routeSource = () =>
    [
      "app/api/reports/work/route.ts",
      "app/api/reports/work/preview/route.ts",
      "app/api/reports/work/[id]/route.ts",
      "app/api/reports/work/[id]/recompute/route.ts",
      "app/api/reports/work/_shared.ts",
    ]
      .map((name) => src(name))
      .join("\n")

  it("gives every section of every template a card", () => {
    for (const template of REPORT_TEMPLATES) {
      for (const key of sectionsFor(template)) {
        expect(client(), `sectionNodes has no ${key} entry`).toMatch(
          new RegExp(`^\\s+${key}: `, "mu"),
        )
      }
    }
    // …and nothing outside the declared vocabulary crept in.
    for (const section of REPORT_SECTIONS) expect(SECTION_TITLE[section.key]).toBeTruthy()
  })

  it("is twelve cards, which is the owner's 10-14 rule", () => {
    expect(client().match(/row\("/gu)).toHaveLength(6)
    for (const key of ["header", "summary", "metrics", "notes"])
      expect(client()).toMatch(new RegExp(`^\\s+${key}: \\($`, "mu"))
    expect(client()).toMatch(/<PeriodSection/u)
    expect(client()).toMatch(/<MyReportsSection/u)
    // Six card components serve ten sections: `ProseSection` twice, `RowSection` six times.
    expect(codeOnly(sectionsFile()).match(/<SectionCard/gu)).toHaveLength(6)
  })

  it("gives every editable section an editor", () => {
    expect(PROSE_SECTIONS).toHaveLength(8)
    for (const key of PROSE_SECTIONS) {
      const typed = new RegExp(`section="${key}"`, "u").test(client())
      const commented = client().includes(`row("${key}")`)
      expect(typed || commented, `${key} has no place to type`).toBe(true)
    }
  })

  it("exports no component that nothing renders", () => {
    // Phase 2's lesson: an exported card with no caller survives a review and dies a phase later.
    const names = [
      ...sectionsFile().matchAll(/^export function (\w+)/gmu),
      ...dialogsFile().matchAll(/^export function (\w+)/gmu),
    ].map((match) => match[1])
    expect(names.length).toBeGreaterThan(10)
    const all = pageSource()
    for (const name of names) {
      const uses = (all.match(new RegExp(`\\b${name}\\b`, "gu")) ?? []).length
      expect(uses, `${name} is exported but never rendered`).toBeGreaterThan(1)
    }
  })

  it("leaves the later phases absent rather than half-built", () => {
    const code = codeOnly(pageSource() + routeSource())
    // Phase 4's lifecycle. `revisionOf` / `submittedAt` may appear as read-only DTO fields — they are
    // forbidden on every write (`lib/reports/report-fields.ts`) — so the claim is narrower than
    // "the words do not exist": nothing here writes a lifecycle status or touches the recipients table.
    expect(code).not.toMatch(/status:\s*"(submitted|acknowledged|returned)"/u)
    expect(code).not.toMatch(/workReportRecipients/u)
    expect(code).not.toMatch(/\/submit|\/acknowledge|\/return\b|reports-work\/inbox/u)
    expect(code).not.toMatch(/createNotification|notifyMany/u)
    // Phase 9's prose AI, and phase 5's exports.
    expect(code).not.toMatch(/gemini|Draft summary|Polish this section|responseSchema/iu)
    expect(code).not.toMatch(/application\/(pdf|xlsx|vnd\.openxmlformats)|jsPDF|toPdf/u)
    // The refusal is affirmative too: editing a non-draft is rejected, not ignored.
    expect(code).toMatch(/isDraft/u)
  })

  it("has no dead control and links only to pages that exist", () => {
    const code = codeOnly(pageSource())
    expect(code).not.toMatch(/href="#"/u)
    expect(code).not.toMatch(/onClick=\{\(\) => \{\s*\}\}/u)
    expect(code).not.toMatch(/console\.log|TODO|FIXME|window\.(alert|confirm|prompt)\s*\(/u)
    expect(codeOnly(routeSource())).not.toMatch(/console\.log|TODO|FIXME|Response\("stub/u)
    expect(code).not.toMatch(/dashboard\/planner|dashboard\/deliverables|dashboard\/tasks\/\$\{|reports-work\/inbox/u)
    // Every out-link from a report is a work-log filter built by one of the two helpers.
    expect(code).toMatch(/worklogHref\(period, section\)/u)
    expect(code).toMatch(/refHref\(row\.ref, period\)/u)
  })

  it("records this phase in the three docs and the spec", () => {
    expect(src("FEATURES.md")).toMatch(/## 9\. Period work reports \(phase 3, 2026-10-26\)/u)
    expect(src("DESIGN_SYSTEM.md")).toMatch(/## 12\. Period work reports.*phase 3 2026-10-26\)/u)
    expect(src("PLACEHOLDERS.md")).toMatch(/## 8\. Period work reports.*no new placeholder/u)
    const spec = src(
      "docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md",
    )
    expect(spec).toMatch(/3\. \*\*Reports\*\* \*\(shipped 2026-10-26\)\*/u)
    // The three sentences that pointed at this phase as future work are gone.
    expect(src("FEATURES.md")).not.toMatch(/"Group into report draft" \(phase 3\)/u)
    expect(src("PLACEHOLDERS.md")).not.toMatch(/No "Group into report draft" in the bulk bar/u)
    expect(spec).not.toMatch(/\*\*"group into a report draft" is phase 3/u)
    expect(spec).toMatch(/\*\*Lifecycle\*\* \*\(phase 4\)\*/u)
  })
})
```

Run: `npm test -- report-page`
Expected: exactly one failure — "records this phase in the three docs and the spec". The other six are assertions
about code Tasks 11-16 already wrote; if one of them fails, that is a real gap in the page and belongs in the file
that caused it, not in a doc edit. Fix it there and re-run.

- [ ] **Step 2: `FEATURES.md`**

Correct the stale pointer first. `FEATURES.md:232` currently reads:

```
- **Deliberately absent.** "Group into report draft" (phase 3), PDF and XLSX export (phase 5), the
  team/admin day view (phase 4), the Gantt (phase 8). Nothing on the page pretends to do these.
```

to:

```
- **Deliberately absent.** A report is built from a period, not from a ticked selection, so the bulk bar never
  grew a "group into report draft" action — see §9. PDF and XLSX export (phase 5), the team/admin day view
  (phase 4), the Gantt (phase 8). Nothing on the page pretends to do these.
```

Then append the new section at the end of the file:

```markdown
## 9. Period work reports (phase 3, 2026-10-26)

- `/dashboard/reports-work` — one member's account of one period, built from their own work log. Twelve cards:
  the period picker, the draft list, and the ten report sections in the order the *template* chooses, so a
  technician's report opens with deliverables and a developer's with completed actions. Nothing is behind a tab
  and no section is missing: `sectionsFor(template)` drives the list and
  `tests/unit/report-page.test.ts` fails if a template points at a section with no card.
- Five period types — daily, weekly (ISO Mon–Sun), monthly, yearly, custom — resolved to an exact `[start, end)`
  in the member's own timezone by `lib/reports/period.ts`. A yearly report is twelve month buckets, not 365 rows.
- Every number is computed, never typed. `lib/reports/aggregate.ts` reads the author's own entries, deliverables,
  `task_events` transitions, tasks and forward plan items and produces fifteen metrics, six row lists, four split
  buckets and a period series. Completion comes from `task_events` (`to_status` plus `at`), not
  `tasks.updated_at`, so a task edited yesterday does not look finished today.
- §6's drill-down promise is implemented literally: each computed card's badge *is* the button, expansion is
  `?open=<section>` in the URL (so an expanded report is a link you can send), and the row ids behind a count
  print once open — `task:12`, `entry:7`, `event:31`. The chart cards carry the same ids under
  "Which rows make these bars?". A row links to the real work log filtered to the period
  (`?v=list&p=custom&from=&to=`), blockers add `&kind=blocker`, deliverables add `&dlv=1`; a `nextPeriod` row says
  in words that plans get their page in a later phase rather than linking to a 404.
- Save / draft, recompute, delete. `Save draft` writes the prose the member typed and nothing else; `Recompute`
  re-runs the aggregation and replaces the stored snapshot; `Delete` is a draft-only, confirmed act. The page
  always states which figures it is showing — "Figures as saved" for a stored snapshot, "Live preview — not saved
  yet" for a fresh read — because a report that silently disagrees with itself is the failure §6 was written to
  prevent.
- Five templates (`general`, `engineering`, `technical`, `assurance`, `creative`), chosen automatically from the
  discipline the period's work carries and switchable with `?tpl=`. A template picks the section order, the 5-6
  leading KPI tiles and the chart set (time by discipline · kind mix · tasks by status · tasks by priority · the
  period series). No chart exists that its own template does not draw, and `lib/reports/charts.ts` pins which
  measure each bar is — minutes or a count — so a tooltip unit cannot drift from the bar under it.
- Server routes: `/api/reports/work` (list + create), `…/preview`, `…/[id]` (read, patch, delete),
  `…/[id]/recompute`, over one `_shared.ts`. All four are session-gated and put `user_id` in the SQL of every
  read; each read is capped (3000 entries, 1000 events, 1000 tasks, 500 deliverables, 200 plan items) and the
  draft list at 100. Writes go through `readReportCreate` / `pickReportUpdates` / `readContent`, and a forbidden
  key is refused out loud rather than dropped — `status`, `userId`, `metrics`, `revisionOf`, `submittedAt` and
  `recipients` in a body produce a 400 that says which one.
- **No migration.** `work_reports` and `work_report_recipients` were created by phase 1 and are unchanged; this
  phase writes `period_*`, `template`, `title`, `content` and `metrics`, pins `status` to `draft`, and never
  touches the recipients table or the lifecycle columns.
- **Deliberately absent** (phases 4, 5, 9): submit / lock / revise, recipients and the default reporting line,
  `/dashboard/reports-work/inbox`, ack and return, notifications, the "Draft summary from my data" and "Polish
  this section" AI buttons, PDF and XLSX, the admin team view. The page has no disabled placeholder for any of
  them, and `tests/unit/report-page.test.ts` fails if a later edit adds a lifecycle write to these files.
- Guards: `tests/unit/report-{period,aggregate,templates,fields,view-state,api,page,row-sections,charts}.test.ts`
  — nine new files. `report-api` and `report-page` sweep the source of every route and every card, so a phase-4
  change that drops a control fails a test instead of a review. State the final suite counts here from the
  `npm test` output of Step 7 rather than from memory.
```

- [ ] **Step 3: `DESIGN_SYSTEM.md`**

Append:

```markdown
## 12. Period work reports (phase 3 2026-10-26)

The same grid as the work log — `grid gap-4 md:grid-cols-2 xl:grid-cols-3` — and the same rule: every card owns
its span in `className`, and the client never re-lays-out on data. What differs is where the cards come from. The
build view renders `sectionsFor(template)`, so the *template* decides the order and the `sectionNodes` map decides
that a section the template does not lead with is still present. Twelve cards, in this shape:

| Card | Component | Grid span | Where its numbers come from |
| --- | --- | --- | --- |
| Period | `PeriodSection` | 1 cell | the URL (`?p`, `?d`, `?from`, `?to`, `?tpl`) |
| My reports | `MyReportsSection` | 1 cell | `GET /api/reports/work`, capped at 100 |
| Header | `HeaderSection` | `md:col-span-2 xl:col-span-2` | computed; only the title is typed |
| Summary | `ProseSection section="summary"` | `md:col-span-2 xl:col-span-2` | the author |
| Actions completed … Next period (6 cards) | `RowSection` | 1 cell each | `rowsFor(section, aggregate)` |
| Metrics | `MetricsSection` | `md:col-span-2 xl:col-span-3` | `aggregate.metrics` plus `chartRows()` |
| Notes and asks | `ProseSection section="notes"` (`rows={8}`) | `md:col-span-2 xl:col-span-2` | the author |

### Report chart rules

| Chart | Label | Measure | Bar colour source |
| --- | --- | --- | --- |
| `discipline` | Time by discipline | minutes | `DISCIPLINE_COLOUR` (`lib/roles.ts`) |
| `kind` | Mix of work | minutes | `KIND_COLOUR` (`lib/worklog/entries.ts`) |
| `series` | Per day across the period | minutes | `hsl(var(--chart-pine))` |
| `taskStatus` | Tasks by status | a count of tasks | `TASK_BUCKET_FILL` |
| `priority` | Tasks by priority | a count of tasks | `PRIORITY_FILL` |

Every bar is horizontal (`layout="vertical"`), the same shape `DisciplineSplitSection` uses on the work log, so
the labels are read rather than rotated; the container height is `Math.max(120, rows * 26)` so a twelve-bucket
yearly series cannot overlap itself. `CHART_UNIT` is the single source of "is this time or a count" and the
tooltip asks it, never the component. Colours come from the existing `--chart-*` tokens plus `--destructive`;
**this phase adds no token to `app/globals.css`**, so `app/accessibility.css` needs no re-lighting and
`tests/unit/accessibility.test.ts` stays green unchanged. An unmapped bucket gets `FALLBACK_FILL`
(`hsl(var(--muted-foreground))`) rather than recharts' black, because an unmapped bucket is a naming gap and the
bar still has to be drawn.

### Report copy rules

- A quiet period says so in words: `Time logged` reads "None logged" at zero, and a zero tile's hint is
  "Nothing in this period" — a bare `0` reads like a rounding error.
- Singular and plural come from `plural()` in `lib/reports/row-sections.ts`; no card writes `s` by hand.
- A section with no rows still renders, with the explanation specific to it (`ROW_SECTION_HINT` for the empty
  commentary placeholder, and "No status change to done landed in this window" as the completed caption).
- The figure source is always stated on the two computed cards: "Figures as saved" or
  "Live preview — not saved yet" (`SOURCE_LABEL`), never an icon.
- `?open=<section>` is the expansion. A row's ids print only when open, in `font-mono text-[10px]`, so the
  default report reads like prose and the audit reads like a table.
```

- [ ] **Step 4: `PLACEHOLDERS.md`**

Correct the stale row. `PLACEHOLDERS.md:92` currently reads:

```
| No "Group into report draft" in the bulk bar | phase 3; the bar offers only the five actions `POST /api/worklog/entries/bulk` accepts |
```

to:

```
| No report action in the bulk bar | by design since phase 3: a report is a *period*, aggregated from every row the author can see, so a ticked-selection draft would be a second definition of the same week |
```

Then append:

```markdown
## 8. Period work reports (phase 3, 2026-10-26) — no new placeholder

Phase 3 added **no** `NOTE(PLACEHOLDER)` and no dead control. `/dashboard/reports-work`, its four
`/api/reports/work/*` routes and the seven DB-free modules in `lib/reports/` (`period`, `aggregate`, `templates`,
`report-fields`, `view-state`, `row-sections`, `charts`) are wired to real reads and writes:
a draft is a `work_reports` row, the figures come from `aggregateReport()` over the author's own rows, and every
count on the page has a row list behind it. `tests/unit/report-page.test.ts` and
`tests/unit/report-api.test.ts` sweep the source for `href="#"`, an empty `onClick`, `console.log`,
`window.alert/confirm`, `TODO|FIXME` and a `Response("stub"`, and they fail on any of them.

Four things a reader could mistake for a stub, because each is an absent *phase* stated in the UI where it would
have been:

| Looks missing | Actually |
|---|---|
| No Submit, no recipients, no inbox | phase 4; the toolbar offers Save draft / Recompute / Delete and `status` is server-owned — a body that sends `status: "submitted"` gets a 400 naming the key |
| No "Draft summary from my data", no "Polish this section" | phase 9 (§6's optional AI); both prose editors are the author's own typing, which is what §6 requires for a report a supervisor reads |
| No PDF or XLSX export of a report | phase 5; the only export in the app is still the work log's client-side CSV over ticked rows |
| A "Next period" row you cannot click | the planner page is phase 8; the card says plans get their own page in a later phase instead of linking to a route that does not exist |

`work_report_recipients` and the lifecycle columns (`revision_of`, `submitted_at`, `acknowledged_at`,
`returned_note`) have no reader and no writer yet. That is phase 4's design, not a forgotten table: the rows exist
since phase 1, `reportColumns` returns the lifecycle fields read-only so the DTO cannot be wrong about them, and
`FORBIDDEN_REPORT_KEYS` keeps every one of them off the write path.
```

- [ ] **Step 5: Sync the spec**

Five edits to `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`, each a sentence
that described phase 3 as future work or described it inaccurately. Follow phase 2's convention: correct in place,
and mark a correction `**Correction (2026-10-26):**` where the original claim was wrong rather than merely done
differently.

1. §4, the line `**"group into a report draft" is phase 3 and the page does not offer it.**` → replace with:

```markdown
**Correction (2026-10-26, phase 3):** there is no "group into a report draft" action and none is coming. A report
is a *period*, not a selection: §6 aggregates every row the author can see between the two dates, so a ticked
draft would create a second, contradicting definition of what a week contained. The bulk bar offers the five
actions `POST /api/worklog/entries/bulk` accepts and nothing else.
```

2. §6's section list — four descriptions that promised fields this phase did not take. Replace items 1, 2, 6 and 9
   with:

```markdown
1. Header — the title, the period, the template, which figure source the card is showing and the draft number.
   Author, disciplines, job title, team, recipients, submitted date and revision number are phase 4's; phase 3
   renders none of them.
2. Summary — the author's own read of the period. The KPI strip lives in section 9 rather than here, so one card
   owns the numbers and the strip cannot disagree with the charts beside it.
6. Blocked / at risk — the blocker row and the reason recorded on it; what the report asks of the recipient is
   the author's own commentary inside the card, and the recipient arrives with phase 4.
9. Metrics — the template's leading KPI tiles plus its charts, the source label, and under every chart the row
   ids that make its bars. A template picks from time-by-discipline, the kind mix, tasks-by-status,
   tasks-by-priority and the period series; yearly's series is twelve month buckets, so "the monthly series and
   totals" is drawn by the templates that lead with time, not by a special case.
```

3. §6's four phase-owned leads — tag them so a reader stops at the right line: `**Lifecycle.**` →
   `**Lifecycle** *(phase 4)*.`, `**Recipients.**` → `**Recipients** *(phase 4 — phase 3 never writes
`work_report_recipients`)*.`, `**Inbox.**` → `**Inbox** *(phase 4)*.`, `**Optional AI prose.**` →
   `**Optional AI prose** *(phase 9)*.`. Leave **Period**, **Auto-population**, **Sections**, **Templates per
   discipline** and **Cadence** as they are — they shipped as written.

4. §13, immediately after the `Nineteen new tables:` paragraph → add:

```markdown
`work_reports` is written from phase 3 and `work_report_recipients` is not touched by it at all: phase 3 sets
`period_type`, `period_start`, `period_end`, `template`, `title`, `content` and `metrics` and pins `status` to
`draft`, while `revision_of`, `submitted_at`, `acknowledged_at` and `returned_note` stay null until phase 4 and sit
on the write whitelist's forbidden list (`lib/reports/report-fields.ts`) so no request can set them. No migration
was needed for either table — both have existed in production since phase 1.
```

5. §16 item 3 → mark it shipped with what the phase added beyond its own one-line summary, in the shape items 1
   and 2 already use:

```markdown
3. **Reports** *(shipped 2026-10-26)* — period math, aggregation, per-discipline templates, `/api/reports/work/*`,
   the `/dashboard/reports-work` builder with its ten sections, save/draft, no AI required. What the phase added
   beyond this line: the page is twelve cards, not ten (Period and My-reports are the shell); every computed
   section carries the row ids behind its number with the expansion held in `?open=`, so an audited report is a
   link; the drill-down opens the real work log filtered to the period; the template picks the KPI tiles *and* the
   chart set, not only the order; and the page states whether it is showing a saved snapshot or a live preview.
   Nothing here submits, names a recipient, exports a file or drafts prose with AI — §6's lifecycle, inbox,
   export and prose buttons stayed in phases 4, 5 and 9, and no control for them exists on the page.
```

- [ ] **Step 6: Run everything**

Run: `npm test -- report-page && npm run typecheck && npm run lint && npm test`
Expected: the sweep goes green (32 tests in `report-page.test.ts`); 0 type errors; 0 lint errors / 70 warnings;
full suite green at 45 files. Copy the final `npm test` line — files and tests — into the `FEATURES.md` guards
bullet from Step 2 before committing, so the document carries the number the run actually reported.

- [ ] **Step 7: Commit and push**

```bash
git add FEATURES.md DESIGN_SYSTEM.md PLACEHOLDERS.md docs/superpowers tests/unit/report-page.test.ts
git commit -m "docs(reports): record phase 3, sync the spec, and sweep the builder for completeness"
git push
```

The push is the deploy (`§16`: each phase is a reviewable, green, committed, pushed unit). Nothing in this task
touches a database, so no owner migration checkpoint is owed.

- [ ] **Step 8: What is verified, and what the owner still has to look at**

Honest status at the end of the plan: typecheck, lint, 45 test files and the source sweeps pass. The *page* has
never been rendered — no task in this plan started a dev server — so Task 16 Step 6's seven visual checks plus
phase 2's five are still open, and `FEATURES.md` should not be read as claiming otherwise. What a phase-4
executor inherits, all of it guarded rather than assumed: the four routes and `_shared.ts`, five pure modules plus
`row-sections.ts` and `charts.ts`, the twelve cards in a template-ordered `sectionNodes` map (a new section is one
entry there and one `SECTION_TITLE` key, and the sweep fails if one is missing), `?open=` as the only drill-down
state, and `work_report_recipients` untouched with `status` pinned to `draft`.

- [ ] **Step 9: Write the as-shipped note**

When the last task is green, append an `As shipped (2026-10-26)` block to the end of this plan file — the way
phase 1 and phase 2 did — listing every place the code ended up different from what this plan's steps said: a
renamed export, a caption whose wording changed, a guard that had to be re-cut, a test count that moved. A plan
that is not corrected after execution is a trap for the next reader.

---

## As shipped (2026-10-26 – 2026-10-27)

Every place the code ended up different from what the steps above said. A plan that is not corrected after
execution is a trap for the next reader.

**Tasks 1–5 (pure modules)**
- Task 2: the `quietDays` fixture is pinned to `todayIso: "2026-10-25"`; the plan's fixture assumed a fixed
  "today" the pure function does not own.
- Task 5: `customFrom` / `customTo` fall back to today / `from`, not the plan's pair, which contradicted
  `resolvePeriod("custom", …)`'s own bounds rule.
- `MAX_SECTION_TEXT` is re-exported from `lib/reports/report-fields.ts` so the client keeps one import surface.
- `report-fields.test.ts` has 24 tests, not the 25 the plan predicted.

**Task 6 (`_shared.ts`)**
- `notFound()` did not exist in `app/api/reports/_shared.ts`; it was added there (mirroring
  `app/api/worklog/_shared.ts`) because this phase's shared module imports it.
- Every planned `_shared` import path had one `../` too many (T7–T10); corrected to `"./_shared"`,
  `"../_shared"`, `"../_shared"`, `"../../_shared"`.
- `reportDeliverableRead` selects a literal `null` as `entryCount` (typed `sql<number | null>`) instead of a
  correlated subquery: a report lists at most 500 deliverables and the aggregate never reads the count.

**Task 7 (list + create)**
- `tests/unit/schema-safety.test.ts`'s `authGated` alternation gained `reportSession`, the same treatment it gives
  `worklogSession`; without it the new route read as an anonymous schema leak.
- The LIKE-wildcard guard `/replace\(\/\[\\\\%_\]/u` could never match the shipped `.replace(/[\\%_]/…)`;
  re-cut, and an inline `//` comment moved off the guarded line.

**Task 10 (recompute)**
- The guard asserted `set.metrics = aggregate` while the planned code used an object literal; used the plan's
  pre-authorised fallback `/\.set\(\{ metrics: aggregate/u` and inlined `.set({ metrics: aggregate, updatedAt: new Date() })`.
- `storedPeriod`'s parameter is named `existing` to satisfy `/resolvePeriod\("custom", existing\.periodStart/u`.

**Task 11 (page shell)**
- `SOURCE_LABEL.live` is "Live preview — not saved yet", so the plan's `toContain("live")` could not match; the
  test asserts `SOURCE_LABEL.live.toLowerCase()).toContain("live")` and the copy stayed.
- The Suspense guard needed its brace escaped: `/<Suspense fallback=\{<ReportsSkeleton \/>\}/u` is an invalid
  `u`-flag pattern otherwise.
- A `type ReportTemplate` import and an `as ReportTemplate` cast dropped from `sections.tsx`: unused, and lint
  warning 71 breaks the 70-warning baseline.

**Task 12 (header, summary, write path)**
- Two guards could not match shipped code and were re-cut: `/nothing to save/u` vs the toast title "Nothing to
  save", and the double-quoted `/recompute", { method: "POST" }` against the template literal. The
  `if (!report) {` / `if (!report) return` pair now asserts both the braced refusal-with-toast in `saveDraft` and
  the silent one in `recompute`.
- `ReportContent` is exported from `lib/reports/templates.ts`, not `report-fields.ts` as Task 12's import list
  implied (TS2459).
- The prose-dirty join is `const PROSE_JOINER = String.fromCharCode(0)`, not a literal `"\u0000"`: the raw NUL
  escape cannot be carried through the edit tools; same behaviour, named constant.
- `templateChoice` is declared above the write callbacks. The plan put it below `saveDraft`, whose dependency
  array would have read it in its temporal dead zone.
- `NewReportDialog` is mounted only while open. Kept mounted, its first-render `useState` defaults go stale and a
  stale period type is refused by the create route's "period implied by periodType" check.
- `createDraft` re-resolves the span when the dialog's period type differs from the builder's, and patches
  `periodType` into the URL state — so the dialog's select is a real control rather than a way to trigger a 400.
- The sections block's comment is `{/* … */}`: a `//` child of the grid is `react/jsx-no-comment-textnodes`, a
  lint error.

**Task 13 (`row-sections.ts`)**
- 19 tests, not the 16 the step predicted — the step's own list holds 3+5+4+3+4 examples.
- The test drops an unused `type ReportAggregate` import (lint warning 71 again).
- `rowsCaption` reads `aggregate.period.start/end` rather than taking a `Period` argument, so a caption cannot be
  measured against a different edge than the number it explains.

**Task 14 (the six row cards)**
- Shipped as planned; no guard needed re-cutting. Suite after it: 44 files / 885 tests (commit `c224a16`).

**Task 15 (charts, formatting — `4596e47`)**
- `lib/reports/charts.ts` does not import `TASK_BUCKET_LABEL`: the step's file imported it and never used it.
- `type Count` was not added to the `report-templates.test.ts` import; the three shipped tests never name it.

**Task 16 (metrics card — `ae1a395`)**
- Guard re-cut: `/\) \? "row" : "rows"/u` → `/\? "row" : "rows"/u`. `metricHint` writes
  `count.refs.length === 1 ? "row" : "rows"`, which ends in `1`, not `)`.
- The recharts `Tooltip` formatter takes `(value)` and names the series from `UNIT_NOUN[unit]` rather than
  `String(name)`, whose type is `NameType | undefined` and could print "undefined".

**Task 17 (this commit)**
- Guard re-cut: the shipped marker is `/3\. \*\*Reports\*\* \*\(shipped 2026-10-26\)\*/u` (one closing asterisk).
  The step's regex expected `)**`, which contradicts both its own snippet and §16 items 1–2.
- `PLACEHOLDERS.md`'s stale row is `| No report action in the bulk bar | … |`: the sweep forbids the old phrase
  `No "Group into report draft" in the bulk bar`, which the step's replacement block kept in the left column.
- Two doc claims were corrected against the code while writing: the completed caption is
  "No task reached a done status in this period." (`EMPTY_CAPTION`), and `reportColumns` lives in
  `app/api/reports/work/_shared.ts`, not `report-fields.ts`.
- Final gates: typecheck 0 errors; lint 0 errors / 70 warnings; **45 test files / 912 tests**.
