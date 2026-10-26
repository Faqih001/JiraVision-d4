# Worklog UI (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/dashboard/worklog` — the day view that reads back what phase 1 wrote (`task_events`) plus full `work_log_entries` and `deliverables` CRUD — and put a live "Today" strip on `/dashboard`.

**Architecture:** Seven pure, DB-free modules under `lib/worklog/` hold every rule (timezone day math, entry/deliverable vocabulary, quick-add parsing, write whitelists, URL view state, bulk grammar, summary aggregation); `lib/roles.ts` widens to the 75-discipline registry the page filters on. Six API routes under `/api/worklog/*` are thin — authenticate, call a pure module, scope every query by `session.id`, return the `{ success, data }` envelope — over one shared `_shared.ts`. One client page composes 11 numbered `SectionCard` sections from four fetches, plus a twelfth that only exists over a selection; all interactivity is local state + `fetch`, and every filter mirrors into the URL so a view is shareable.

**Tech Stack:** Next.js 16.1.1 App Router (client page under a `Suspense` boundary, as `app/(marketing)/faq/page.tsx:113-122` already does), drizzle-orm 0.45.4 query builder against the phase-1 tables already present in production Neon, React 19 + recharts + shadcn/ui, Vitest (node env, `tests/unit/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` §4 (the work log), §13 (`work_log_entries`, `deliverables`, `task_events`), §15 (testing), §16 phase 2.

## Global Constraints

- `npm run typecheck` at 0 errors, `npm run lint` at 0 errors with the **70-warning baseline unchanged**, `npm test` green before every commit and push. Run all three from the repo root.
- Never run `npm run build` locally — Vercel builds on push (owner's standing rule).
- No unit test may import a module that reaches `lib/db` (the CommonJS `lib/db.js` shadows `lib/db.ts` under Vitest). Every rule in this plan therefore lives in a DB-free module.
- `drizzle/schema.ts` is **never pushed** and never edited by this phase — the ten tables and their columns already exist in production (`npm run db:worklog` ran on 2026-10-26, verified read-only). No new migration script in this plan.
- No `NEXT_PUBLIC_` prefix may appear anywhere in this phase. No secret is printed in chat or committed.
- "Fully functional" is the acceptance bar: no dead button, no `href="#"`, no `console.log` handler, no static fake number. Every control in §4 of the spec that phase 2 owns is implemented; the two bulk actions that belong to later phases (`group into report draft`, PDF/XLSX exports) are **absent**, not stubbed — recorded in `FEATURES.md`.
- The page carries **11 numbered sections** (owner rule: 10–14 per dashboard page, ≥15 only on `/dashboard`), each a `SectionCard` from `components/dashboard-kit.tsx:37`, and all 11 render in every view — a view never hides content behind a tab. Section 5 swaps its body between the five views (day, week, all entries, by kind, calendar) so the five views are one section slot, not five. The bulk action bar is a twelfth `SectionCard` that only exists while rows are selected.
- `shadcn` `SelectItem` must never receive `value=""` (guard `tests/unit/select-items.test.ts:31-62`). Sentinel values in this plan are the literal string `"all"`.
- Writes to `work_log_entries` / `deliverables` go through the field whitelists in Task 4. A client can never set `source`, `redatedAt`, `userId`, `ownerId`, `createdBy`, `playbookId` or `planItemId`.
- Every read and write is scoped by the session user id **in the SQL**, not in the UI (`§5`: a member's log is private to them; the team view is phase 4).
- `worked_on` is resolved through `users.timezone` (default `Africa/Nairobi`) via `lib/worklog/local-day.ts`. Never `new Date().toISOString().slice(0,10)` for a member-facing day.
- Vocabulary lives in exactly one module each: kinds/sources/types/statuses in `lib/worklog/entries.ts`, disciplines in `lib/roles.ts:WORK_DISCIPLINES`, cadence in `lib/cadence.ts`. No route or component re-declares a list.
- The discipline vocabulary is the **75 standard work disciplines in 10 category groups** (Task 11). The five ids shipped in phase 1 — `developer`, `technician`, `designer`, `auditor`, `coordinator` — keep their exact spelling, because they are stored in `tasks.discipline`, `work_log_entries.discipline` and `deliverables.discipline`. Nothing is renamed and nothing is removed, so rows and saved preferences written before this phase stay valid; that is the whole migration. Every id is ≤ 40 characters, so the `varchar(40)` columns need no change and this plan still adds **no migration**.
- **A discipline preference is a display filter, never an authorization boundary.** Reads are scoped by `user_id` in SQL (Task 6–10) whatever the member has switched on; the Gantt and My-Work views of later phases must keep that separation.
- Discipline **job titles, departments and project roles are separate dimensions** and are deliberately *not* added here: `lib/roles.ts` holds only work classifications. The other three registries belong to the spec's phase 15 role packs, recorded in `FEATURES.md` by Task 18.
- Style: muted editorial, tokens only (`hsl(var(--chart-pine|chart-stone|chart-clay|chart-moss|chart-slate|chart-teal|chart-bark|chart-plum|chart-sage|chart-ochre|accent|destructive))`), WCAG 2.2 AA — labels on every input, `aria-pressed` on view switches, keyboard-reachable dialogs, no color-only meaning.
- Comments: one short line, only where the *why* is non-obvious (a schema quirk, a deliberate omission, a security boundary). No task-referencing comments.
- Commit after every task with a conventional message; push at the end of each task (standing grant: "always git commit and push after changes in files"). Never rewrite pushed history.
- The dev server is **not** running and must not be restarted by the executor; visual QA is the owner's (`i will do the test just implement`).

## File structure

Created:

| Path | Responsibility |
| --- | --- |
| `lib/worklog/local-day.ts` | Resolve an instant to the member's calendar day, and a day to UTC instants, through an IANA timezone. Owns ISO-day arithmetic (`shiftDays`, `weekStartIso`, `rangeDays`). Pure. |
| `lib/worklog/entries.ts` | The entry/deliverable vocabulary (`WORK_LOG_KINDS`, `ENTRY_SOURCES`, `DELIVERABLE_TYPES`, `DELIVERABLE_STATUSES`, `DELIVERABLE_NEXT`) plus the DTO shapes, every aggregation the page renders, and `entriesToCsv` for the selection export. Pure. |
| `lib/worklog/quick-add.ts` | Parse one line of quick-add text into `{ title, minutes, kind }`. Pure. |
| `lib/worklog/entry-fields.ts` | Field whitelists for entry/deliverable create + update, and the rule that changing `workedOn` stamps `redatedAt`. Pure. |
| `lib/worklog/view-state.ts` | The single mapping between the page's filter state and the URL query string, including the date presets. Pure. |
| `lib/worklog/bulk.ts` | Validate a bulk request body against the action whitelist and the id cap. Pure. |
| `lib/worklog/summary.ts` | `buildSummary()` — the one aggregation the page header, the four summary sections and the `/dashboard` Today strip all read. Pure. |
| `app/api/worklog/_shared.ts` | The pieces every worklog route needs: session, error envelopes, column maps, `entryFilters()`, `deliverableSelect`. Not a route file, so it may export values. |
| `app/api/worklog/entries/route.ts` | GET the filtered range, POST one row. |
| `app/api/worklog/entries/[id]/route.ts` | PUT one own row, DELETE one own row. |
| `app/api/worklog/entries/bulk/route.ts` | delete / attach-to-task / re-date / convert-to-deliverable / set-kind over owned ids, in one transaction. |
| `app/api/worklog/deliverables/route.ts` | GET list with entry counts, POST create. |
| `app/api/worklog/deliverables/[id]/route.ts` | PUT with lifecycle validation, DELETE. |
| `app/api/worklog/summary/route.ts` | Per-day totals, kind/discipline splits, streak, `task_events` transitions. Shared by the page header and the `/dashboard` Today strip. |
| `app/dashboard/worklog/page.tsx` | Server component: `Suspense` wrapper + skeleton. |
| `app/dashboard/worklog/worklog-client.tsx` | `"use client"` page: the four fetches, URL sync, every handler, and the section order. |
| `app/dashboard/worklog/sections.tsx` | All eleven section components plus `DisciplinePicker`, `KindBadge`, `EntryLine`, `EmptySection`, `WorklogSkeleton` and the `SECTION_TITLES` declaration. |
| `app/dashboard/worklog/dialogs.tsx` | `EntryDialog`, `DeliverableDialog` and the three confirm dialogs (one entry, one batch, one deliverable). |
| `tests/unit/worklog-day.test.ts` | Task 1 rules. |
| `tests/unit/worklog-entries.test.ts` | Task 2 rules. |
| `tests/unit/worklog-quick-add.test.ts` | Task 3 rules. |
| `tests/unit/worklog-fields.test.ts` | Task 4 rules. |
| `tests/unit/worklog-view-state.test.ts` | Task 5 rules. |
| `tests/unit/worklog-bulk.test.ts` | Task 8 bulk-request grammar. |
| `tests/unit/worklog-summary.test.ts` | Task 10 aggregation. |
| `tests/unit/worklog-api.test.ts` | Task 18 guard: route source scanned for ownership scoping, whitelists, no `NEXT_PUBLIC_`, no stub. |
| `tests/unit/worklog-page.test.ts` | Task 18 guard: section count, no dead controls, `aria-pressed`, URL sync present. |

Modified:

| Path | Change |
| --- | --- |
| `lib/roles.ts:44-106` | The 75-discipline registry: 10 category groups, one metadata record per discipline, colour from the category, one shared rejection message. |
| `app/globals.css:56-60,100-103` | Six more `--chart-*` tokens so every discipline category has a colour in both themes. |
| `lib/task-updates.ts:128` | Rejection message uses `DISCIPLINE_HINT` instead of listing 75 ids. |
| `tests/unit/roles.test.ts:76-109` | Registry tests replace the five-item assertions. |
| `tests/unit/task-updates.test.ts:121-126` | Asserts the rejection names the field, not the whole vocabulary. |
| `components/dashboard-layout.tsx:214-249` | "Work log" item in the `Main` category. |
| `app/dashboard/page.tsx` | The "Today" strip section fed by `/api/worklog/summary`. |
| `FEATURES.md` | `## 8. Worklog UI (phase 2, 2026-10-26)` — what shipped, what was deliberately left for phases 3–5. |
| `DESIGN_SYSTEM.md` | Worklog section inventory + kind/discipline colour table. |
| `docs/superpowers/specs/…-design.md` | §4 corrected to what actually exists after this phase (bulk actions list, exports deferred). |

---

### Task 1: Timezone day math — `lib/worklog/local-day.ts`

Everything else in this phase reads a *member day*, not a server day. This module is the only place allowed to convert between them.

**Files:**
- Create: `lib/worklog/local-day.ts`
- Test: `tests/unit/worklog-day.test.ts`

**Interfaces:**
- Consumes: nothing (no imports from `lib/db`, `next/*`, or `@/lib/roles`).
- Produces:
  - `localDay(now: Date, timeZone?: string | null): string` → `"YYYY-MM-DD"`
  - `dayStartUtc(dayIso: string, timeZone?: string | null): Date`
  - `dayBoundsUtc(dayIso: string, timeZone?: string | null): { start: Date; end: Date }` (`end` exclusive)
  - `rangeBoundsUtc(fromIso: string, toIso: string, timeZone?: string | null): { start: Date; end: Date }`
  - `shiftDays(dayIso: string, delta: number): string`
  - `weekStartIso(dayIso: string, weekStartsOn?: number): string`
  - `weekDays(mondayIso: string): string[]`
  - `rangeDays(fromIso: string, toIso: string, cap?: number): string[]`
  - `monthBoundsIso(dayIso: string): { from: string; to: string }`
  - `isIsoDate(value: unknown): value is string`
  - `safeZone(timeZone?: string | null): string`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/worklog-day.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  dayBoundsUtc,
  isIsoDate,
  localDay,
  monthBoundsIso,
  rangeDays,
  safeZone,
  shiftDays,
  weekDays,
  weekStartIso,
} from "@/lib/worklog/local-day"

describe("localDay", () => {
  it("puts a late-evening UTC instant on the next member day", () => {
    // 22:30 UTC is 01:30 the following day in Africa/Nairobi (UTC+3, no DST).
    const instant = new Date("2026-03-15T22:30:00Z")
    expect(instant.toISOString().slice(0, 10)).toBe("2026-03-15")
    expect(localDay(instant, "Africa/Nairobi")).toBe("2026-03-16")
  })

  it("puts an early-morning UTC instant on the previous member day", () => {
    const instant = new Date("2026-10-26T01:30:00Z")
    expect(localDay(instant, "America/Los_Angeles")).toBe("2026-10-25")
  })

  it("falls back to UTC for a missing or unusable timezone", () => {
    const instant = new Date("2026-10-26T23:59:00Z")
    expect(localDay(instant, null)).toBe("2026-10-26")
    expect(localDay(instant, "Not/AZone")).toBe("2026-10-26")
    expect(safeZone("Mars/Olympus")).toBe("UTC")
  })
})

describe("dayBoundsUtc", () => {
  it("is a fixed 24 hours in a zone without DST", () => {
    const { start, end } = dayBoundsUtc("2026-10-26", "Africa/Nairobi")
    expect(start.toISOString()).toBe("2026-10-25T21:00:00.000Z")
    expect(end.toISOString()).toBe("2026-10-26T21:00:00.000Z")
  })

  it("is 23 hours on the spring-forward day", () => {
    const { start, end } = dayBoundsUtc("2026-03-08", "America/New_York")
    expect(start.toISOString()).toBe("2026-03-08T05:00:00.000Z")
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000)
  })

  it("is 25 hours on the fall-back day", () => {
    const { start, end } = dayBoundsUtc("2026-11-01", "America/New_York")
    expect(start.toISOString()).toBe("2026-11-01T04:00:00.000Z")
    expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000)
  })

  it("returns whole-minute instants even for half-hour zones", () => {
    const { start } = dayBoundsUtc("2026-01-15", "Asia/Kolkata")
    expect(start.toISOString()).toBe("2026-01-14T18:30:00.000Z")
  })
})

describe("ISO day arithmetic", () => {
  it("walks a non-leap February without inventing a 29th", () => {
    expect(shiftDays("2026-02-28", 1)).toBe("2026-03-01")
    expect(shiftDays("2024-02-28", 1)).toBe("2024-02-29")
    expect(shiftDays("2026-01-01", -1)).toBe("2025-12-31")
  })

  it("anchors a week on Monday and rolls Sunday back", () => {
    expect(weekStartIso("2026-10-27")).toBe("2026-10-26")
    expect(weekStartIso("2026-10-26")).toBe("2026-10-26")
    expect(weekStartIso("2026-11-01")).toBe("2026-10-26")
    expect(weekDays(weekStartIso("2026-11-01"))).toHaveLength(7)
    expect(weekDays("2026-10-26")[6]).toBe("2026-11-01")
  })

  it("clamps a range instead of returning an empty month", () => {
    expect(rangeDays("2026-10-01", "2026-10-05")).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
    ])
    expect(rangeDays("2026-10-06", "2026-10-01")).toEqual([])
    expect(rangeDays("2026-01-01", "2026-12-31", 40)).toHaveLength(40)
  })

  it("gives the real calendar month bounds", () => {
    expect(monthBoundsIso("2026-02-14")).toEqual({ from: "2026-02-01", to: "2026-02-28" })
    expect(monthBoundsIso("2024-02-14")).toEqual({ from: "2024-02-01", to: "2024-02-29" })
    expect(monthBoundsIso("2026-12-30")).toEqual({ from: "2026-12-01", to: "2026-12-31" })
  })

  it("rejects a string that is a real format but not a real date", () => {
    expect(isIsoDate("2026-10-26")).toBe(true)
    expect(isIsoDate("2026-13-01")).toBe(false)
    expect(isIsoDate("2026-02-30")).toBe(false)
    expect(isIsoDate("26-10-26")).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-day`
Expected: FAIL — `Cannot find package '@/lib/worklog/local-day'` (or "Failed to load url"), because the module does not exist.

- [ ] **Step 3: Write the module**

Create `lib/worklog/local-day.ts`:

```ts
// The only place that turns an instant into a member's calendar day, and back again.
// work_log_entries.worked_on is a plain date: it means "the day the member thinks it
// was", so a 23:40 entry must not be pushed to tomorrow by a UTC server. Everything
// that stores or reads a day goes through this file.

const FALLBACK_ZONE = "UTC"
const DAY_MS = 24 * 60 * 60 * 1000

export function safeZone(timeZone?: string | null): string {
  const candidate = (timeZone ?? "").trim()
  if (!candidate) return FALLBACK_ZONE
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate })
    return candidate
  } catch {
    return FALLBACK_ZONE
  }
}

function zoneParts(instant: Date, timeZone: string): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const out: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") out[part.type] = part.value
  }
  return out
}

/** UTC offset of a zone at one instant, in ms. Truncated to whole seconds. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zoneParts(instant, timeZone)
  // Some environments render midnight of a 12-hour-cycle locale as "24".
  const hour = p.hour === "24" ? 0 : Number(p.hour)
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second))
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function dayTriple(dayIso: string): [number, number, number] {
  const [y, m, d] = dayIso.split("-").map(Number)
  return [y, m, d]
}

export function localDay(now: Date, timeZone?: string | null): string {
  const p = zoneParts(now, safeZone(timeZone))
  return `${p.year}-${p.month}-${p.day}`
}

export function shiftDays(dayIso: string, delta: number): string {
  const [y, m, d] = dayTriple(dayIso)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

export function dayStartUtc(dayIso: string, timeZone?: string | null): Date {
  const zone = safeZone(timeZone)
  const [y, m, d] = dayTriple(dayIso)
  const nominal = Date.UTC(y, m - 1, d)
  // Two passes: the first offset is measured at a guess that can sit on the wrong
  // side of a transition, which would shift the whole day by an hour.
  let ts = nominal - zoneOffsetMs(new Date(nominal), zone)
  ts = nominal - zoneOffsetMs(new Date(ts), zone)
  return new Date(ts)
}

export function dayBoundsUtc(dayIso: string, timeZone?: string | null): { start: Date; end: Date } {
  const zone = safeZone(timeZone)
  return { start: dayStartUtc(dayIso, zone), end: dayStartUtc(shiftDays(dayIso, 1), zone) }
}

export function rangeBoundsUtc(fromIso: string, toIso: string, timeZone?: string | null): { start: Date; end: Date } {
  const zone = safeZone(timeZone)
  return { start: dayStartUtc(fromIso, zone), end: dayStartUtc(shiftDays(toIso, 1), zone) }
}

export function weekStartIso(dayIso: string, weekStartsOn = 1): string {
  const [y, m, d] = dayTriple(dayIso)
  const date = new Date(Date.UTC(y, m - 1, d))
  const offset = (date.getUTCDay() - weekStartsOn + 7) % 7
  return shiftDays(dayIso, -offset)
}

export function weekDays(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDays(mondayIso, i))
}

export function rangeDays(fromIso: string, toIso: string, cap = 370): string[] {
  const days: string[] = []
  let cursor = fromIso
  while (cursor <= toIso && days.length < cap) {
    days.push(cursor)
    cursor = shiftDays(cursor, 1)
  }
  return days
}

export function monthBoundsIso(dayIso: string): { from: string; to: string } {
  const [y, m] = dayTriple(dayIso)
  const from = `${y}-${String(m).padStart(2, "0")}-01`
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from, to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}` }
}

export { DAY_MS }
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-day`
Expected: PASS, 12 tests. If a DST assertion disagrees with the running Node's ICU data, do **not** loosen it — print the actual value and confirm it against `Intl` before changing the expectation.

- [ ] **Step 5: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/worklog/local-day.ts tests/unit/worklog-day.test.ts
git commit -m "feat(worklog): timezone-correct day math for the work log"
git push
```
Expected: typecheck 0 errors, lint 0 errors / 70 warnings, all suites green.

---

### Task 2: Entry and deliverable vocabulary — `lib/worklog/entries.ts`

The kinds, sources, deliverable types and lifecycle, plus every number the page renders. `DRAFT` note: the DDL has no `CHECK` constraints, so this whitelist is the only thing keeping `kind` and `status` honest — a route that skips it can write junk, which is why Task 18 guards it.

**Files:**
- Create: `lib/worklog/entries.ts`
- Test: `tests/unit/worklog-entries.test.ts`

**Interfaces:**
- Consumes: `WorkDiscipline`, `WORK_DISCIPLINES` from `@/lib/roles`; `shiftDays` from `./local-day` (Task 1).
- Produces:
  - `WORK_LOG_KINDS`, `WorkLogKind`, `KIND_LABEL`, `KIND_COLOUR`, `isWorkLogKind`
  - `ENTRY_SOURCES`, `EntrySource`, `isEntrySource`
  - `DELIVERABLE_TYPES`, `DeliverableType`, `DELIVERABLE_LABEL`, `isDeliverableType`
  - `DELIVERABLE_STATUSES`, `DeliverableStatus`, `DELIVERABLE_LABEL_STATUS`, `DELIVERABLE_NEXT`, `isDeliverableStatus`, `canMoveDeliverable(from, to): boolean`
  - `EntryDto`, `DeliverableDto`, `DayBucket`, `KindBucket`, `DisciplineBucket`
  - `minutesTotal(entries)`, `countByKind(entries): KindBucket[]`, `minutesByDiscipline(entries): DisciplineBucket[]`
  - `groupByTask(entries)`, `groupByDay(entries, days): DayBucket[]`
  - `streakOf(activeDays, todayIso): { current: number; longest: number }`
  - `gapDays(days, activeDays)`, `unlinkedCount(entries)`, `openBlockerCount(entries)`
  - `formatMinutes(minutes: number | null | undefined): string`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/worklog-entries.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { WORK_DISCIPLINES } from "@/lib/roles"
import {
  DELIVERABLE_NEXT,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  ENTRY_SOURCES,
  KIND_COLOUR,
  WORK_LOG_KINDS,
  canMoveDeliverable,
  countByKind,
  formatMinutes,
  gapDays,
  groupByDay,
  groupByTask,
  isDeliverableStatus,
  isWorkLogKind,
  minutesByDiscipline,
  minutesTotal,
  openBlockerCount,
  streakOf,
  unlinkedCount,
  type EntryDto,
} from "@/lib/worklog/entries"

function entry(overrides: Partial<EntryDto> = {}): EntryDto {
  return {
    id: 1,
    workedOn: "2026-10-26",
    taskId: null,
    taskTitle: null,
    kind: "action",
    title: "Replaced the pump seal",
    body: null,
    discipline: "technician",
    minutes: 45,
    deliverableId: null,
    playbookId: null,
    playbookVersion: null,
    links: [],
    source: "manual",
    redatedAt: null,
    createdAt: "2026-10-26T10:00:00.000Z",
    ...overrides,
  }
}

describe("vocabulary", () => {
  it("matches the columns the migration created", () => {
    expect(WORK_LOG_KINDS).toEqual(["action", "time", "blocker", "note", "review", "deliverable"])
    expect(ENTRY_SOURCES).toEqual(["manual", "auto", "gemini"])
    expect(DELIVERABLE_TYPES).toContain("audit_finding")
    expect(DELIVERABLE_STATUSES).toEqual(["draft", "in_review", "approved", "delivered"])
  })

  it("gives every kind a label and a token colour, not a literal hex", () => {
    for (const kind of WORK_LOG_KINDS) {
      expect(KIND_COLOUR[kind]).toMatch(/^hsl\(var\(--/u)
    }
  })

  it("refuses a value outside the list", () => {
    expect(isWorkLogKind("action")).toBe(true)
    expect(isWorkLogKind("Action")).toBe(false)
    expect(isWorkLogKind("")).toBe(false)
    expect(isDeliverableStatus("shipped")).toBe(false)
  })

  it("has no dead end and no backward leak in the lifecycle", () => {
    for (const status of DELIVERABLE_STATUSES) {
      for (const next of DELIVERABLE_NEXT[status]) {
        expect(DELIVERABLE_STATUSES).toContain(next)
      }
    }
    expect(canMoveDeliverable("draft", "in_review")).toBe(true)
    expect(canMoveDeliverable("draft", "approved")).toBe(false)
    expect(canMoveDeliverable("delivered", "draft")).toBe(false)
    expect(DELIVERABLE_NEXT.delivered).toEqual([])
  })
})

describe("aggregation", () => {
  const rows = [
    entry({ id: 1, minutes: 45, kind: "action", taskId: 7, taskTitle: "Pump" }),
    entry({ id: 2, minutes: 30, kind: "blocker", taskId: 7, taskTitle: "Pump", discipline: "developer" }),
    entry({ id: 3, minutes: null, kind: "note", taskId: null, taskTitle: null, discipline: null }),
    entry({ id: 4, minutes: 15, kind: "review", taskId: 9, taskTitle: "Audit" }),
  ]

  it("totals minutes without treating null as zero noise", () => {
    expect(minutesTotal(rows)).toBe(90)
    expect(minutesTotal([])).toBe(0)
  })

  it("lists every kind, including the kinds with no rows", () => {
    const byKind = countByKind(rows)
    expect(byKind).toHaveLength(WORK_LOG_KINDS.length)
    expect(byKind.find((b) => b.kind === "blocker")).toMatchObject({ count: 1, minutes: 30 })
    expect(byKind.find((b) => b.kind === "time")).toMatchObject({ count: 0, minutes: 0 })
  })

  it("splits minutes by discipline and never invents one", () => {
    const split = minutesByDiscipline(rows)
    expect(split.map((s) => s.discipline)).toEqual(["technician", "developer"])
    expect(split[0]).toEqual({ discipline: "technician", minutes: 60, count: 2 })
    for (const s of split) expect(WORK_DISCIPLINES).toContain(s.discipline)
  })

  it("keeps unlinked work in one honest bucket at the end", () => {
    const groups = groupByTask(rows)
    expect(groups.map((g) => g.taskTitle)).toEqual(["Pump", "Audit", null])
    expect(groups[2].entries.map((e) => e.id)).toEqual([3])
  })

  it("emits a bucket for every day in the window, empty days included", () => {
    const days = ["2026-10-25", "2026-10-26", "2026-10-27"]
    const buckets = groupByDay(rows, days)
    expect(buckets).toHaveLength(3)
    expect(buckets[0]).toMatchObject({ day: "2026-10-25", count: 0, minutes: 0 })
    expect(buckets[1]).toMatchObject({ day: "2026-10-26", count: 4, minutes: 90 })
  })

  it("counts what the log cannot prove", () => {
    expect(unlinkedCount(rows)).toBe(1)
    expect(openBlockerCount(rows)).toBe(1)
  })
})

describe("streaks and gaps", () => {
  it("does not break a streak just because today is still empty", () => {
    expect(streakOf(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26")).toEqual({ current: 3, longest: 3 })
    expect(streakOf(["2026-10-24", "2026-10-25"], "2026-10-26")).toEqual({ current: 2, longest: 2 })
    expect(streakOf(["2026-10-24"], "2026-10-26")).toEqual({ current: 0, longest: 1 })
    expect(streakOf([], "2026-10-26")).toEqual({ current: 0, longest: 0 })
  })

  it("finds the longest run across a gap", () => {
    const active = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-23", "2026-10-24"]
    expect(streakOf(active, "2026-10-24")).toEqual({ current: 2, longest: 3 })
  })

  it("names the quiet days inside the window", () => {
    const days = ["2026-10-24", "2026-10-25", "2026-10-26"]
    expect(gapDays(days, ["2026-10-25"])).toEqual(["2026-10-24", "2026-10-26"])
  })

  it("formats minutes for a reader, not a database", () => {
    expect(formatMinutes(null)).toBe("—")
    expect(formatMinutes(0)).toBe("0m")
    expect(formatMinutes(45)).toBe("45m")
    expect(formatMinutes(90)).toBe("1h 30m")
    expect(formatMinutes(480)).toBe("8h")
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-entries`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `lib/worklog/entries.ts`:

```ts
// The entry/deliverable vocabulary and every number the work log page renders.
// Pure on purpose: lib/db.js shadows lib/db.ts under Vitest, so a module that
// imported a connection could not be tested, and each of these numbers has to be.
// The phase-1 DDL carries no CHECK constraints, so this file — not the database —
// is what keeps `kind` and `status` inside a known set.

import { WORK_DISCIPLINES, type WorkDiscipline } from "@/lib/roles"
import { shiftDays } from "./local-day"

export const WORK_LOG_KINDS = ["action", "time", "blocker", "note", "review", "deliverable"] as const
export type WorkLogKind = (typeof WORK_LOG_KINDS)[number]

export const KIND_LABEL: Record<WorkLogKind, string> = {
  action: "Action",
  time: "Time",
  blocker: "Blocker",
  note: "Note",
  review: "Review",
  deliverable: "Deliverable",
}

export const KIND_COLOUR: Record<WorkLogKind, string> = {
  action: "hsl(var(--chart-pine))",
  time: "hsl(var(--chart-moss))",
  blocker: "hsl(var(--destructive))",
  note: "hsl(var(--chart-stone))",
  review: "hsl(var(--chart-clay))",
  deliverable: "hsl(var(--accent))",
}

export function isWorkLogKind(value: unknown): value is WorkLogKind {
  return typeof value === "string" && (WORK_LOG_KINDS as readonly string[]).includes(value)
}

// `auto` and `gemini` belong to later phases (promotes and the provider). Phase 2's
// routes only ever write `manual`; the values exist so the column is not re-typed
// when a phase that needs them lands.
export const ENTRY_SOURCES = ["manual", "auto", "gemini"] as const
export type EntrySource = (typeof ENTRY_SOURCES)[number]

export function isEntrySource(value: unknown): value is EntrySource {
  return typeof value === "string" && (ENTRY_SOURCES as readonly string[]).includes(value)
}

export const DELIVERABLE_TYPES = [
  "document",
  "code",
  "design",
  "inspection",
  "audit_finding",
  "training",
  "report",
  "other",
] as const
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number]

export const DELIVERABLE_LABEL: Record<DeliverableType, string> = {
  document: "Document",
  code: "Code",
  design: "Design",
  inspection: "Inspection",
  audit_finding: "Audit finding",
  training: "Training",
  report: "Report",
  other: "Other",
}

export function isDeliverableType(value: unknown): value is DeliverableType {
  return typeof value === "string" && (DELIVERABLE_TYPES as readonly string[]).includes(value)
}

export const DELIVERABLE_STATUSES = ["draft", "in_review", "approved", "delivered"] as const
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

export const DELIVERABLE_LABEL_STATUS: Record<DeliverableStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  delivered: "Delivered",
}

export const DELIVERABLE_COLOUR: Record<DeliverableStatus, string> = {
  draft: "hsl(var(--chart-stone))",
  in_review: "hsl(var(--chart-clay))",
  approved: "hsl(var(--chart-moss))",
  delivered: "hsl(var(--chart-pine))",
}

export function isDeliverableStatus(value: unknown): value is DeliverableStatus {
  return typeof value === "string" && (DELIVERABLE_STATUSES as readonly string[]).includes(value)
}

// draft → in_review → approved | delivered, with one step back for rework. Delivered is
// terminal: re-opening accepted evidence is a new deliverable, not an edit of history.
export const DELIVERABLE_NEXT: Record<DeliverableStatus, DeliverableStatus[]> = {
  draft: ["in_review", "delivered"],
  in_review: ["approved", "draft"],
  approved: ["delivered"],
  delivered: [],
}

export function canMoveDeliverable(from: DeliverableStatus, to: DeliverableStatus): boolean {
  return DELIVERABLE_NEXT[from].includes(to)
}

export type EntryDto = {
  id: number
  workedOn: string
  taskId: number | null
  taskTitle: string | null
  kind: WorkLogKind
  title: string
  body: string | null
  discipline: WorkDiscipline | null
  minutes: number | null
  deliverableId: number | null
  playbookId: number | null
  playbookVersion: number | null
  links: string[]
  source: EntrySource
  redatedAt: string | null
  createdAt: string
}

export type DeliverableDto = {
  id: number
  name: string
  type: DeliverableType
  status: DeliverableStatus
  producedOn: string | null
  link: string | null
  evidence: string | null
  taskId: number | null
  taskTitle: string | null
  discipline: WorkDiscipline | null
  entryCount: number
  createdAt: string
}

export type DayBucket = { day: string; count: number; minutes: number; entries: EntryDto[] }
export type KindBucket = { kind: WorkLogKind; label: string; count: number; minutes: number }
export type DisciplineBucket = { discipline: WorkDiscipline; minutes: number; count: number }
export type TaskBucket = { taskId: number | null; taskTitle: string | null; entries: EntryDto[]; minutes: number }

export function minutesTotal(entries: readonly Pick<EntryDto, "minutes">[]): number {
  return entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0)
}

// Every kind is present even with zero rows, so the board and the mix chart cannot
// imply that an unlogged kind did not happen.
export function countByKind(entries: readonly EntryDto[]): KindBucket[] {
  return WORK_LOG_KINDS.map((kind) => {
    const rows = entries.filter((e) => e.kind === kind)
    return { kind, label: KIND_LABEL[kind], count: rows.length, minutes: minutesTotal(rows) }
  })
}

export function minutesByDiscipline(entries: readonly EntryDto[]): DisciplineBucket[] {
  const present = WORK_DISCIPLINES.filter((discipline) => entries.some((e) => e.discipline === discipline))
  return present
    .map((discipline) => {
      const rows = entries.filter((e) => e.discipline === discipline)
      return { discipline, minutes: minutesTotal(rows), count: rows.length }
    })
    .sort((a, b) => b.minutes - a.minutes || a.discipline.localeCompare(b.discipline))
}

export function groupByTask(entries: readonly EntryDto[]): TaskBucket[] {
  const buckets = new Map<string, TaskBucket>()
  for (const e of entries) {
    const key = e.taskId === null ? "unlinked" : `task:${e.taskId}`
    const existing = buckets.get(key)
    if (existing) {
      existing.entries.push(e)
      existing.minutes += e.minutes ?? 0
    } else {
      buckets.set(key, {
        taskId: e.taskId,
        taskTitle: e.taskTitle,
        entries: [e],
        minutes: e.minutes ?? 0,
      })
    }
  }
  const rows = [...buckets.values()]
  // The unlinked bucket sorts by its own label position, and always lands last.
  return rows.sort((a, b) => {
    if (a.taskId === null) return 1
    if (b.taskId === null) return -1
    return b.minutes - a.minutes || (a.taskTitle ?? "").localeCompare(b.taskTitle ?? "")
  })
}

export function groupByDay(entries: readonly EntryDto[], days: readonly string[]): DayBucket[] {
  return days.map((day) => {
    const rows = entries.filter((e) => e.workedOn === day)
    return { day, count: rows.length, minutes: minutesTotal(rows), entries: rows }
  })
}

export function unlinkedCount(entries: readonly EntryDto[]): number {
  return entries.filter((e) => e.taskId === null && e.kind !== "deliverable").length
}

export function openBlockerCount(entries: readonly EntryDto[]): number {
  return entries.filter((e) => e.kind === "blocker" && e.deliverableId === null).length
}

export function gapDays(days: readonly string[], activeDays: readonly string[]): string[] {
  const active = new Set(activeDays)
  return days.filter((day) => !active.has(day))
}

/**
 * `current` counts back from today, but an empty today does not break a streak —
 * the day is still in progress. `longest` walks the sorted set, so an out-of-order
 * array from the API cannot under-report it.
 */
export function streakOf(
  activeDays: readonly string[],
  todayIso: string,
): { current: number; longest: number } {
  const set = new Set(activeDays.filter((d) => typeof d === "string" && d.length === 10))
  if (set.size === 0) return { current: 0, longest: 0 }

  const sorted = [...set].sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i += 1) {
    run = shiftDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1
    if (run > longest) longest = run
  }

  let cursor = set.has(todayIso) ? todayIso : shiftDays(todayIso, -1)
  let current = 0
  while (set.has(cursor)) {
    current += 1
    cursor = shiftDays(cursor, -1)
  }
  return { current, longest }
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—"
  if (minutes < 60) return `${minutes}m`
  const hrs = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hrs}h` : `${hrs}h ${rest}m`
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-entries`
Expected: PASS, 13 tests.

- [ ] **Step 5: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/worklog/entries.ts tests/unit/worklog-entries.test.ts
git commit -m "feat(worklog): entry and deliverable vocabulary with the page aggregations"
git push
```

### Task 3: Quick add parsing — `lib/worklog/quick-add.ts`

One line of text becomes one honest row. Only two sigils exist, because inventing a
second one (`@task`, `!blocker`, `/done`) would be a private language nobody reads:
`#45` is minutes and a kind word is kind. An unrecognised `#tag` stays in the title.

**Files:**
- Create: `lib/worklog/quick-add.ts`
- Test: `tests/unit/worklog-quick-add.test.ts`

**Interfaces:**
- Consumes: `WorkLogKind`, `WORK_LOG_KINDS` from `./entries` (Task 2).
- Produces: `parseQuickAdd(raw: string): QuickAddResult` where
  `QuickAddResult = { title: string; minutes: number | null; kind: WorkLogKind } | { error: string }`,
  and `MAX_LOG_MINUTES = 1440`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/worklog-quick-add.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { parseQuickAdd } from "@/lib/worklog/quick-add"

// The repo's grammar for a `{ value } | { error }` union in a test: narrow, then read.
function parsed(raw: string) {
  const result = parseQuickAdd(raw)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result
}

function why(raw: string): string {
  const result = parseQuickAdd(raw)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

describe("parseQuickAdd", () => {
  it("takes a plain sentence as an action with no minutes", () => {
    expect(parsed("Replaced the pump seal")).toEqual({
      title: "Replaced the pump seal",
      minutes: null,
      kind: "action",
    })
  })

  it("lifts a #minutes token out of the title", () => {
    expect(parsed("#45 rewired the distribution board")).toEqual({
      title: "rewired the distribution board",
      minutes: 45,
      kind: "action",
    })
  })

  it("lifts a kind token and keeps the rest", () => {
    expect(parsed("#blocker waiting on the landlord for roof access")).toEqual({
      title: "waiting on the landlord for roof access",
      minutes: null,
      kind: "blocker",
    })
  })

  it("takes both tokens in any order", () => {
    expect(parsed("#review #90 audit sample walkthrough")).toEqual(
      parsed("audit sample walkthrough #review #90"),
    )
    expect(parsed("#review #90 audit sample walkthrough")).toEqual({
      title: "audit sample walkthrough",
      minutes: 90,
      kind: "review",
    })
  })

  it("keeps an unrecognised tag in the title instead of dropping it", () => {
    expect(parsed("#rooftop replaced the antenna mount")).toEqual({
      title: "#rooftop replaced the antenna mount",
      minutes: null,
      kind: "action",
    })
  })

  it("refuses two different minutes or two different kinds", () => {
    expect(why("#30 fix #45 fix")).toMatch(/one/iu)
    expect(why("#note #review same thing")).toMatch(/one/iu)
  })

  it("refuses minutes that cannot fit in a day", () => {
    expect(why("#1441 something")).toMatch(/1440/u)
    expect(why("#0 something")).toMatch(/1440/u)
  })

  it("refuses to invent a deliverable row through the quick add", () => {
    expect(why("#deliverable pump report")).toMatch(/convert/iu)
  })

  it("refuses nothing but tags", () => {
    expect(why("#45")).toMatch(/what you did/iu)
    expect(why("   ")).toMatch(/what you did/iu)
  })

  it("collapses whitespace and caps the title length", () => {
    expect(why(`  a   b    ${"c".repeat(600)}  `)).toMatch(/too long/iu)
    expect(parsed("  trimmed   twice  ").title).toBe("trimmed twice")
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-quick-add`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `lib/worklog/quick-add.ts`:

```ts
// The quick-add grammar. Two tokens only: `#<number>` is minutes and a kind word is the
// kind. Anything else that starts with # is somebody's note and stays in the title.

import { WORK_LOG_KINDS, type WorkLogKind } from "./entries"

export const MAX_LOG_MINUTES = 1440
const MAX_TITLE_LENGTH = 500

const KIND_TOKENS: Record<string, WorkLogKind> = {
  "#action": "action",
  "#time": "time",
  "#blocker": "blocker",
  "#note": "note",
  "#review": "review",
}

export type QuickAddResult = { title: string; minutes: number | null; kind: WorkLogKind } | { error: string }

export function parseQuickAdd(raw: string): QuickAddResult {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return { error: "Write what you did first." }

  let minutes: number | null = null
  let kind: WorkLogKind = "action"
  let sawKind = false
  const rest: string[] = []

  for (const token of trimmed.split(/\s+/u)) {
    const lower = token.toLowerCase()
    const minutesMatch = /^#(\d{1,4})$/u.exec(lower)
    if (minutesMatch) {
      const value = Number(minutesMatch[1])
      if (value < 1 || value > MAX_LOG_MINUTES) {
        return { error: `#minutes must be between 1 and ${MAX_LOG_MINUTES}.` }
      }
      if (minutes !== null && minutes !== value) {
        return { error: "One #minutes token at a time." }
      }
      minutes = value
      continue
    }
    if (lower === "#deliverable") {
      return { error: "Save the row, then use Convert to deliverable." }
    }
    if (KIND_TOKENS[lower]) {
      if (sawKind && kind !== KIND_TOKENS[lower]) {
        return { error: "One kind token at a time." }
      }
      kind = KIND_TOKENS[lower]
      sawKind = true
      continue
    }
    rest.push(token)
  }

  const title = rest.join(" ").trim()
  if (!title) return { error: "Add what you did, not only tags." }
  if (title.length > MAX_TITLE_LENGTH) return { error: `That title is too long (${MAX_TITLE_LENGTH} characters max).` }
  if (kind === "time" && minutes === null) return { error: "A #time entry needs #minutes." }

  // Guard against a future edit that adds a kind without listing it here.
  if (!WORK_LOG_KINDS.includes(kind)) return { error: "Unknown entry kind." }

  return { title, minutes, kind }
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-quick-add`
Expected: PASS, 10 tests.

- [ ] **Step 5: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/worklog/quick-add.ts tests/unit/worklog-quick-add.test.ts
git commit -m "feat(worklog): quick-add parser with a two-token grammar"
git push
```

---

### Task 4: Write whitelists — `lib/worklog/entry-fields.ts`

Same reason `lib/task-updates.ts` exists: drizzle interpolates every key handed to
`.set()` as a column identifier, so an unfiltered body could repoint `user_id`. This file
also owns the two rules the UI must not be trusted with — who sets `redatedAt`, and what a
`link` is allowed to look like.

**Files:**
- Create: `lib/worklog/entry-fields.ts`
- Test: `tests/unit/worklog-fields.test.ts`

**Interfaces:**
- Consumes: `isWorkDiscipline`, `WorkDiscipline`, `WORK_DISCIPLINES` from `@/lib/roles`;
  `workLogEntries`, `deliverables` from `@/drizzle/schema` (type-only, this file is unit
  tested so it must not import `@/lib/db`); vocabulary guards from `./entries`;
  `isIsoDate` from `./local-day`.
- Produces:
  - `Fail = { error: string }`, `isFail(value: unknown): value is Fail`, and the `Read<T> = T | Fail`
    convention every reader below returns
  - `EntryCreateInput`, `readEntryCreate(input: unknown): Read<{ value: EntryCreateInput }>`
  - `EntryCurrent = { workedOn: string; minutes: number | null; kind: WorkLogKind; deliverableId: number | null }`
  - `EntryPatch = Partial<Omit<typeof workLogEntries.$inferInsert, forbidden>>` so a route can
    spread it into `.set()` and `tsc` rejects a `user_id` by construction
  - `pickEntryUpdates(input: unknown, current: EntryCurrent): Read<{ patch: EntryPatch; redated: boolean }>`
  - `DeliverableCreateInput`, `DeliverablePatch`, `readDeliverableCreate(input: unknown)`
  - `pickDeliverableUpdates(input: unknown, currentStatus: DeliverableStatus): Read<{ patch: DeliverablePatch }>`
  - `ENTRY_MUTABLE_FIELDS`, `DELIVERABLE_MUTABLE_FIELDS` (exported for the guard test)

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/worklog-fields.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  DELIVERABLE_MUTABLE_FIELDS,
  ENTRY_MUTABLE_FIELDS,
  pickDeliverableUpdates,
  pickEntryUpdates,
  readDeliverableCreate,
  readEntryCreate,
  type EntryCurrent,
} from "@/lib/worklog/entry-fields"

const current: EntryCurrent = { workedOn: "2026-10-26", minutes: 30, kind: "action", deliverableId: null }

// The repo's grammar for a `{ value } | { error }` union in a test: narrow, then read.
function entryValue(input: unknown) {
  const result = readEntryCreate(input)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result.value
}

function entryError(input: unknown): string {
  const result = readEntryCreate(input)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

function entryPatch(input: unknown, at: EntryCurrent = current) {
  const result = pickEntryUpdates(input, at)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result
}

function entryPatchError(input: unknown, at: EntryCurrent = current): string {
  const result = pickEntryUpdates(input, at)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

function deliverableValue(input: unknown) {
  const result = readDeliverableCreate(input)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result.value
}

function deliverableError(input: unknown): string {
  const result = readDeliverableCreate(input)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

function deliverablePatch(input: unknown, status: "draft" | "in_review" | "approved" | "delivered" = "draft") {
  const result = pickDeliverableUpdates(input, status)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result.patch
}

function deliverablePatchError(input: unknown, status: "draft" | "in_review" | "approved" | "delivered" = "draft"): string {
  const result = pickDeliverableUpdates(input, status)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

describe("readEntryCreate", () => {
  it("fills the column defaults instead of requiring them", () => {
    expect(entryValue({ workedOn: "2026-10-26", title: "  Replaced the seal  " })).toEqual({
      workedOn: "2026-10-26",
      title: "Replaced the seal",
      kind: "action",
      body: null,
      discipline: null,
      minutes: null,
      taskId: null,
      deliverableId: null,
    })
  })

  it("refuses a non-object body and an empty title", () => {
    expect(entryError(null)).toMatch(/object/iu)
    expect(entryError("nope")).toMatch(/object/iu)
    expect(entryError({ workedOn: "2026-10-26", title: "  " })).toMatch(/title/iu)
  })

  it("refuses a day that is not a real date", () => {
    expect(entryError({ workedOn: "2026-02-30", title: "x" })).toMatch(/workedOn/iu)
    expect(entryError({ workedOn: new Date().toISOString(), title: "x" })).toMatch(/workedOn/iu)
    expect(entryError({ title: "x" })).toMatch(/workedOn/iu)
  })

  it("refuses a kind outside the vocabulary", () => {
    expect(entryError({ workedOn: "2026-10-26", title: "x", kind: "shipped" })).toMatch(/kind/iu)
  })

  it("refuses minutes that are not whole minutes in a day", () => {
    expect(entryError({ workedOn: "2026-10-26", title: "x", minutes: 90.5 })).toMatch(/minutes/iu)
    expect(entryError({ workedOn: "2026-10-26", title: "x", minutes: 2000 })).toMatch(/minutes/iu)
    expect(entryValue({ workedOn: "2026-10-26", title: "x", minutes: 0 }).minutes).toBe(0)
  })

  it("refuses a time entry with no minutes", () => {
    expect(entryError({ workedOn: "2026-10-26", title: "x", kind: "time" })).toMatch(/minutes/iu)
    expect(entryValue({ workedOn: "2026-10-26", title: "x", kind: "time", minutes: 60 }).kind).toBe("time")
  })

  it("normalises discipline case and accepts null", () => {
    expect(entryValue({ workedOn: "2026-10-26", title: "x", discipline: " Technician " }).discipline).toBe("technician")
    expect(entryValue({ workedOn: "2026-10-26", title: "x", discipline: null }).discipline).toBeNull()
    expect(entryError({ workedOn: "2026-10-26", title: "x", discipline: "plumber" })).toMatch(/discipline/iu)
  })
})

describe("pickEntryUpdates", () => {
  it("names a field the client may never set, instead of ignoring it", () => {
    for (const forbidden of ["userId", "source", "redatedAt", "planItemId", "playbookId", "id", "createdBy"]) {
      expect(entryPatchError({ [forbidden]: 7 })).toMatch(new RegExp(forbidden, "iu"))
      expect(entryPatchError({ [forbidden]: 7 })).toMatch(/server/iu)
    }
  })

  it("marks a re-dated correction so the route can stamp it", () => {
    expect(entryPatch({ workedOn: "2026-10-24" })).toEqual({ patch: { workedOn: "2026-10-24" }, redated: true })
    expect(entryPatch({ title: "typo fix" })).toEqual({ patch: { title: "typo fix" }, redated: false })
  })

  it("refuses an update that changes nothing", () => {
    expect(entryPatchError({})).toMatch(/No updatable/iu)
    expect(entryPatchError({ body: undefined })).toMatch(/No updatable/iu)
  })

  it("keeps a deliverable entry pointing at a deliverable", () => {
    expect(entryPatchError({ kind: "deliverable" })).toMatch(/deliverable/iu)
    expect(entryPatch({ kind: "deliverable", deliverableId: 4 }).patch).toEqual({ kind: "deliverable", deliverableId: 4 })
    expect(entryPatch({ kind: "deliverable" }, { ...current, deliverableId: 9 }).patch).toEqual({ kind: "deliverable" })
  })

  it("refuses a time entry that drops its minutes", () => {
    // The hazard is a time entry with no minutes: switching to `time` on a row that has
    // 30 minutes stored is a legitimate change, so the refusal is checked on the row that
    // has none, and clearing minutes on a time row is checked below.
    expect(entryPatchError({ kind: "time" }, { ...current, minutes: null })).toMatch(/minutes/iu)
    expect(entryPatch({ kind: "time" }).patch).toEqual({ kind: "time" })
    expect(entryPatch({ kind: "time", minutes: 60 }).patch).toEqual({ kind: "time", minutes: 60 })
    expect(entryPatchError({ minutes: null }, { ...current, kind: "time" })).toMatch(/minutes/iu)
  })

  it("only accepts whole positive ids for links", () => {
    expect(entryPatchError({ taskId: 0 })).toMatch(/taskId/iu)
    expect(entryPatchError({ taskId: "abc" })).toMatch(/taskId/iu)
    expect(entryPatch({ taskId: "12" }).patch).toEqual({ taskId: 12 })
    expect(entryPatch({ taskId: null }).patch).toEqual({ taskId: null })
  })

  it("exposes exactly the fields the routes are allowed to write", () => {
    expect(ENTRY_MUTABLE_FIELDS).toEqual([
      "title",
      "body",
      "kind",
      "discipline",
      "minutes",
      "taskId",
      "workedOn",
      "deliverableId",
    ])
    expect(ENTRY_MUTABLE_FIELDS).not.toContain("source")
  })
})

describe("deliverables", () => {
  it("defaults type and status the way the columns do", () => {
    expect(deliverableValue({ name: "Pump inspection sheet" })).toMatchObject({
      name: "Pump inspection sheet",
      type: "other",
      status: "draft",
      link: null,
    })
  })

  it("rejects a link that is not a web address", () => {
    expect(deliverableError({ name: "x", link: "javascript:alert(1)" })).toMatch(/link/iu)
    expect(deliverableError({ name: "x", link: "data:text/html,hi" })).toMatch(/link/iu)
    expect(deliverableValue({ name: "x", link: "https://example.com/sheet" }).link).toBe("https://example.com/sheet")
    expect(deliverableValue({ name: "x", link: "/uploads/sheet.pdf" }).link).toBe("/uploads/sheet.pdf")
  })

  it("validates the produced day as a plain date", () => {
    expect(deliverableError({ name: "x", producedOn: "2026-13-01" })).toMatch(/producedOn/iu)
    expect(deliverableValue({ name: "x", producedOn: "" }).producedOn).toBeNull()
  })

  it("refuses an illegal lifecycle move in the whitelist, not the UI", () => {
    expect(deliverablePatchError({ status: "approved" }, "draft")).toMatch(/from draft/iu)
    expect(deliverablePatch({ status: "delivered" }, "draft")).toEqual({ status: "delivered" })
    expect(deliverablePatchError({ status: "draft" }, "delivered")).toMatch(/terminal/iu)
    expect(deliverablePatchError({ status: "draft" }, "draft")).toMatch(/No updatable/iu)
  })

  it("refuses a client-set owner", () => {
    expect(deliverablePatchError({ ownerId: 3 })).toMatch(/ownerId/iu)
    expect(deliverablePatchError({ createdBy: 3 })).toMatch(/createdBy/iu)
  })

  it("keeps the type inside the vocabulary", () => {
    expect(deliverableError({ name: "x", type: "spreadsheet" })).toMatch(/type/iu)
    expect(DELIVERABLE_MUTABLE_FIELDS).toContain("evidence")
    expect(DELIVERABLE_MUTABLE_FIELDS).not.toContain("ownerId")
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-fields`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `lib/worklog/entry-fields.ts`:

```ts
// Field whitelists for work log and deliverable writes. Same reason as
// lib/task-updates.ts: `.set()` interpolates every key it is handed, so a spread body
// would let a caller repoint user_id. A forbidden key is refused out loud — silently
// dropping `source: "auto"` would make the log look machine-written from a browser.

import { deliverables, workLogEntries } from "@/drizzle/schema"
import { WORK_DISCIPLINES, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import {
  DELIVERABLE_LABEL,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  WORK_LOG_KINDS,
  canMoveDeliverable,
  isDeliverableStatus,
  isDeliverableType,
  isWorkLogKind,
  type DeliverableStatus,
  type DeliverableType,
  type WorkLogKind,
} from "./entries"
import { isIsoDate } from "./local-day"

export const ENTRY_MUTABLE_FIELDS = [
  "title",
  "body",
  "kind",
  "discipline",
  "minutes",
  "taskId",
  "workedOn",
  "deliverableId",
] as const

export const DELIVERABLE_MUTABLE_FIELDS = [
  "name",
  "type",
  "status",
  "taskId",
  "producedOn",
  "link",
  "evidence",
  "discipline",
] as const

// Everything else on those two tables is server-owned: identity, provenance and the
// correction stamp. `source` stays "manual" because phase 6 is what earns "gemini".
const FORBIDDEN_ENTRY_KEYS = [
  "id",
  "userId",
  "source",
  "redatedAt",
  "planItemId",
  "playbookId",
  "playbookVersion",
  "createdAt",
  "updatedAt",
  "createdBy",
  "ownerId",
] as const

const FORBIDDEN_DELIVERABLE_KEYS = [
  "id",
  "ownerId",
  "createdBy",
  "planItemId",
  "objectKey",
  "createdAt",
  "updatedAt",
] as const

const MAX_TITLE = 500
const MAX_BODY = 5000
const MAX_NAME = 255
const MAX_MINUTES = 1440

export type EntryCreateInput = {
  workedOn: string
  title: string
  kind: WorkLogKind
  body: string | null
  discipline: WorkDiscipline | null
  minutes: number | null
  taskId: number | null
  deliverableId: number | null
}

export type DeliverableCreateInput = {
  name: string
  type: DeliverableType
  status: DeliverableStatus
  taskId: number | null
  producedOn: string | null
  link: string | null
  evidence: string | null
  discipline: WorkDiscipline | null
}

export type EntryCurrent = {
  workedOn: string
  minutes: number | null
  kind: WorkLogKind
  deliverableId: number | null
}

export type EntryPatch = Partial<Omit<typeof workLogEntries.$inferInsert, (typeof FORBIDDEN_ENTRY_KEYS)[number]>>

export type DeliverablePatch = Partial<
  Omit<typeof deliverables.$inferInsert, (typeof FORBIDDEN_DELIVERABLE_KEYS)[number]>
>

export type Fail = { error: string }

export function isFail(value: unknown): value is Fail {
  return typeof value === "object" && value !== null && "error" in value
}

/** Every reader returns a value or a Fail; `Read<T>` keeps the narrowing honest. */
type Read<T> = T | Fail

function rejectForbidden(source: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    if (source[key] !== undefined) return `${key} is set by the server, not the client.`
  }
  return null
}

function asBody(input: unknown): Read<Record<string, unknown>> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Request body must be a JSON object" }
  return input as Record<string, unknown>
}

/** Strings only: a bare number could be an epoch or a day of the month. */
function readDay(value: unknown, field: string): Read<string | null> {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string" || !isIsoDate(value)) {
    return { error: `${field} must be a YYYY-MM-DD date or null` }
  }
  return value
}

function readRequiredDay(value: unknown, field: string): Read<string> {
  const day = readDay(value, field)
  if (isFail(day)) return day
  if (day === null) return { error: `${field} must be a YYYY-MM-DD date` }
  return day
}

function readId(value: unknown, field: string): Read<number | null> {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && !/^\d+$/u.test(value)) {
    return { error: `${field} must be a positive integer or null` }
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) return { error: `${field} must be a positive integer or null` }
  return n
}

function readMinutes(value: unknown): Read<number | null> {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean" || value === "") return { error: "minutes must be a whole number or null" }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > MAX_MINUTES) {
    return { error: `minutes must be a whole number between 0 and ${MAX_MINUTES}, or null` }
  }
  return n
}

function readDiscipline(value: unknown): Read<WorkDiscipline | null> {
  if (value === null || value === undefined || value === "") return null
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : value
  if (!isWorkDiscipline(candidate)) {
    return { error: `discipline must be one of: ${WORK_DISCIPLINES.join(", ")}, or null` }
  }
  return candidate
}

function readRequiredText(value: unknown, field: string, max: number): Read<string> {
  if (typeof value !== "string" || value.trim() === "") return { error: `${field} is required` }
  const trimmed = value.trim()
  if (trimmed.length > max) return { error: `${field} is too long (${max} characters max)` }
  return trimmed
}

function readOptionalText(value: unknown, field: string, max: number): Read<string | null> {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") return { error: `${field} must be a string or null` }
  const trimmed = value.trim()
  if (trimmed.length > max) return { error: `${field} is too long (${max} characters max)` }
  return trimmed || null
}

function readKind(value: unknown): Read<WorkLogKind> {
  const candidate = value === undefined || value === null ? "action" : value
  if (!isWorkLogKind(candidate)) return { error: `kind must be one of: ${WORK_LOG_KINDS.join(", ")}` }
  return candidate
}

/** A deliverable link is opened by a supervisor: no javascript:, no data:. */
function readLink(value: unknown): Read<string | null> {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string") return { error: "link must be a string or null" }
  const trimmed = value.trim()
  if (/^(javascript|data|vbscript):/iu.test(trimmed)) return { error: "link must be an http(s) address or a path" }
  if (/^https?:\/\//u.test(trimmed) || trimmed.startsWith("/")) return trimmed
  return { error: "link must be an http(s) address or a path" }
}

export function readEntryCreate(input: unknown): Read<{ value: EntryCreateInput }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const workedOn = readRequiredDay(body.workedOn, "workedOn")
  if (isFail(workedOn)) return workedOn

  const title = readRequiredText(body.title, "title", MAX_TITLE)
  if (isFail(title)) return title

  const note = readOptionalText(body.body, "body", MAX_BODY)
  if (isFail(note)) return note

  const kind = readKind(body.kind)
  if (isFail(kind)) return kind

  const minutes = readMinutes(body.minutes)
  if (isFail(minutes)) return minutes

  const discipline = readDiscipline(body.discipline)
  if (isFail(discipline)) return discipline

  const taskId = readId(body.taskId, "taskId")
  if (isFail(taskId)) return taskId

  const deliverableId = readId(body.deliverableId, "deliverableId")
  if (isFail(deliverableId)) return deliverableId

  if (kind === "time" && !minutes) return { error: "A time entry needs minutes." }
  if (kind === "deliverable" && !deliverableId) {
    return { error: "A deliverable entry needs a deliverable — create it with Convert to deliverable." }
  }

  return { value: { workedOn, title, kind, body: note, discipline, minutes, taskId, deliverableId } }
}

export function pickEntryUpdates(
  input: unknown,
  current: EntryCurrent,
): Read<{ patch: EntryPatch; redated: boolean }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const refusal = rejectForbidden(body, FORBIDDEN_ENTRY_KEYS)
  if (refusal) return { error: refusal }

  const patch: EntryPatch = {}

  if (body.title !== undefined) {
    const title = readRequiredText(body.title, "title", MAX_TITLE)
    if (isFail(title)) return title
    patch.title = title
  }
  if (body.body !== undefined) {
    const note = readOptionalText(body.body, "body", MAX_BODY)
    if (isFail(note)) return note
    patch.body = note
  }
  if (body.kind !== undefined) {
    const kind = readKind(body.kind)
    if (isFail(kind)) return kind
    patch.kind = kind
  }
  if (body.discipline !== undefined) {
    const discipline = readDiscipline(body.discipline)
    if (isFail(discipline)) return discipline
    patch.discipline = discipline
  }
  if (body.minutes !== undefined) {
    const minutes = readMinutes(body.minutes)
    if (isFail(minutes)) return minutes
    patch.minutes = minutes
  }
  if (body.taskId !== undefined) {
    const taskId = readId(body.taskId, "taskId")
    if (isFail(taskId)) return taskId
    patch.taskId = taskId
  }
  if (body.deliverableId !== undefined) {
    const deliverableId = readId(body.deliverableId, "deliverableId")
    if (isFail(deliverableId)) return deliverableId
    patch.deliverableId = deliverableId
  }
  if (body.workedOn !== undefined) {
    const workedOn = readRequiredDay(body.workedOn, "workedOn")
    if (isFail(workedOn)) return workedOn
    patch.workedOn = workedOn
  }

  if (Object.keys(patch).length === 0) {
    return { error: `No updatable entry fields provided. Allowed: ${ENTRY_MUTABLE_FIELDS.join(", ")}` }
  }

  const nextKind = patch.kind !== undefined ? (patch.kind as WorkLogKind) : current.kind
  const nextMinutes = patch.minutes !== undefined ? patch.minutes : current.minutes
  if (nextKind === "time" && !nextMinutes) return { error: "A time entry needs minutes." }

  const nextDeliverable =
    patch.deliverableId !== undefined ? patch.deliverableId : current.deliverableId
  if (nextKind === "deliverable" && !nextDeliverable) {
    return { error: "A deliverable entry needs a deliverable — create it with Convert to deliverable." }
  }

  // Comparing to the stored day means clicking Save on an unchanged day does not stamp a
  // correction the person did not make.
  const redated = patch.workedOn !== undefined && patch.workedOn !== current.workedOn

  return { patch, redated }
}

export function readDeliverableCreate(input: unknown): Read<{ value: DeliverableCreateInput }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const name = readRequiredText(body.name, "name", MAX_NAME)
  if (isFail(name)) return name

  const typeCandidate = body.type === undefined || body.type === null || body.type === "" ? "other" : body.type
  if (!isDeliverableType(typeCandidate)) {
    return { error: `type must be one of: ${DELIVERABLE_TYPES.join(", ")} (${Object.values(DELIVERABLE_LABEL).join(", ")})` }
  }

  const statusCandidate =
    body.status === undefined || body.status === null || body.status === "" ? "draft" : body.status
  if (!isDeliverableStatus(statusCandidate)) {
    return { error: `status must be one of: ${DELIVERABLE_STATUSES.join(", ")}` }
  }

  const producedOn = readDay(body.producedOn, "producedOn")
  if (isFail(producedOn)) return producedOn

  const link = readLink(body.link)
  if (isFail(link)) return link

  const evidence = readOptionalText(body.evidence, "evidence", MAX_BODY)
  if (isFail(evidence)) return evidence

  const taskId = readId(body.taskId, "taskId")
  if (isFail(taskId)) return taskId

  const discipline = readDiscipline(body.discipline)
  if (isFail(discipline)) return discipline

  return {
    value: {
      name,
      type: typeCandidate,
      status: statusCandidate,
      taskId,
      producedOn,
      link,
      evidence,
      discipline,
    },
  }
}

export function pickDeliverableUpdates(
  input: unknown,
  currentStatus: DeliverableStatus,
): Read<{ patch: DeliverablePatch }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const refusal = rejectForbidden(body, FORBIDDEN_DELIVERABLE_KEYS)
  if (refusal) return { error: refusal }

  const patch: DeliverablePatch = {}

  if (body.name !== undefined) {
    const name = readRequiredText(body.name, "name", MAX_NAME)
    if (isFail(name)) return name
    patch.name = name
  }
  if (body.type !== undefined) {
    const type = body.type
    if (!isDeliverableType(type)) return { error: `type must be one of: ${DELIVERABLE_TYPES.join(", ")}` }
    patch.type = type
  }
  if (body.status !== undefined) {
    const status = body.status
    if (!isDeliverableStatus(status)) {
      return { error: `status must be one of: ${DELIVERABLE_STATUSES.join(", ")}` }
    }
    if (status !== currentStatus) {
      // The lifecycle is a rule, so it is checked where it can be tested — not in a
      // dropdown that merely happens to offer only the legal next steps.
      if (currentStatus === "delivered") return { error: "delivered is terminal — record a new deliverable." }
      if (!canMoveDeliverable(currentStatus, status)) {
        return { error: `Cannot take a deliverable from ${currentStatus} to ${status}.` }
      }
      patch.status = status
    }
  }
  if (body.producedOn !== undefined) {
    const producedOn = readDay(body.producedOn, "producedOn")
    if (isFail(producedOn)) return producedOn
    patch.producedOn = producedOn
  }
  if (body.link !== undefined) {
    const link = readLink(body.link)
    if (isFail(link)) return link
    patch.link = link
  }
  if (body.evidence !== undefined) {
    const evidence = readOptionalText(body.evidence, "evidence", MAX_BODY)
    if (isFail(evidence)) return evidence
    patch.evidence = evidence
  }
  if (body.taskId !== undefined) {
    const taskId = readId(body.taskId, "taskId")
    if (isFail(taskId)) return taskId
    patch.taskId = taskId
  }
  if (body.discipline !== undefined) {
    const discipline = readDiscipline(body.discipline)
    if (isFail(discipline)) return discipline
    patch.discipline = discipline
  }

  if (Object.keys(patch).length === 0) {
    return { error: `No updatable deliverable fields provided. Allowed: ${DELIVERABLE_MUTABLE_FIELDS.join(", ")}` }
  }

  return { patch }
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-fields`
Expected: PASS, 20 tests. The helpers at the top of the test file narrow the
`{ value } | { error }` unions the way `tests/unit/task-updates.test.ts:120-130` does, so
`tsc --noEmit` (which includes `tests/`) stays clean — keep that shape if you add cases.

- [ ] **Step 5: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/worklog/entry-fields.ts tests/unit/worklog-fields.test.ts
git commit -m "feat(worklog): write whitelists for entries and deliverables"
git push
```

**As shipped (2026-10-26, `2569ce1`) — two corrections to the code above.** Both were
required by the tests, which are the rule:

1. Presence is read as `body.<field> !== undefined`, not `"field" in body`. A JSON body
   that carries `"body": undefined` means *the client did not send this field*, so it must
   be skipped; the plan's `in` check would patch it to `null` and blank the note — and would
   fail this file's own "refuses an update that changes nothing" case. An explicit `null` is
   still the client asking to clear a column, so the readers accept `null`. The same holds
   for the invariant merge: `patch.minutes !== undefined ? patch.minutes : current.minutes`.
2. `expect(entryPatchError({ kind: "time" }))` was wrong: the stored fixture row has
   `minutes: 30`, so changing kind to `time` legitimately produces a 30-minute time entry.
   Refusing it would show "A time entry needs minutes" on a row that visibly reads 30m — a
   dead end with nothing to fix. The assertion now passes a row with `minutes: null`, which
   is the genuine hazard, and keeps a positive case for the kind-only change.

---

### Task 5: URL view state — `lib/worklog/view-state.ts`

The spec requires every control to mirror into the query string so a view is shareable and
survives reload. No page in this repo does that yet, so the mapping lives here as a pure
function with a round-trip test rather than being spread across `useState` calls.

**Files:**
- Create: `lib/worklog/view-state.ts`
- Test: `tests/unit/worklog-view-state.test.ts`

**Interfaces:**
- Consumes: `WORK_LOG_KINDS`, `DELIVERABLE_STATUSES`, guards from `./entries`;
  `WORK_DISCIPLINES`, `isWorkDiscipline` from `@/lib/roles`; `monthBoundsIso`, `shiftDays`,
  `weekStartIso`, `rangeDays`, `isIsoDate` from `./local-day`.
- Produces:
  - `WORKLOG_VIEWS`, `WorklogView`, `isWorklogView`
  - `RANGE_PRESETS`, `RangePreset`, `isRangePreset`
  - `ViewState` (fields below), `defaultViewState(dayIso): ViewState`
  - `parseViewState(search: URLSearchParams, todayIso: string): ViewState`
  - `serializeViewState(state: ViewState, todayIso: string): string`
  - `resolveRange(state: ViewState, todayIso: string): { from: string; to: string }`
  - `viewDays(state: ViewState, todayIso: string): string[]` (the days the grid/heat renders)

```ts
export type ViewState = {
  view: WorklogView
  day: string
  preset: RangePreset
  from: string | null
  to: string | null
  q: string
  kind: WorkLogKind | "all"
  discipline: WorkDiscipline | "all"
  taskId: number | null
  deliverableStatus: DeliverableStatus | "all"
  hasDeliverable: boolean
}
```

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/worklog-view-state.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  VIEW_LABEL,
  WORKLOG_VIEWS,
  defaultViewState,
  parseViewState,
  resolveRange,
  serializeViewState,
  viewDays,
  type ViewState,
} from "@/lib/worklog/view-state"

const TODAY = "2026-10-26" // a Monday

const sp = (qs: string) => new URLSearchParams(qs)

/** The range controls (preset, custom pair) only drive the fetch for the range views. */
function listed(overrides: Partial<ViewState> = {}): ViewState {
  return { ...defaultViewState(TODAY), view: "list", ...overrides }
}

describe("defaults", () => {
  it("opens on the day view of today", () => {
    expect(defaultViewState(TODAY)).toMatchObject({ view: "day", day: TODAY, preset: "today", q: "" })
    expect(WORKLOG_VIEWS).toEqual(["day", "week", "list", "board", "heat"])
    expect(VIEW_LABEL.day).toBe("Day")
    expect(VIEW_LABEL.list).toBe("All entries")
  })

  it("omits every default from the query string", () => {
    expect(serializeViewState(defaultViewState(TODAY), TODAY)).toBe("")
    expect(serializeViewState({ ...defaultViewState(TODAY), view: "heat" }, TODAY)).toBe("v=heat")
  })
})

describe("parseViewState", () => {
  it("falls back to the default instead of throwing on a hand-edited URL", () => {
    const state = parseViewState(sp("v=gantt&kind=shipped&discipline=plumber&task=-4&day=not-a-date"), TODAY)
    expect(state.view).toBe("day")
    expect(state.kind).toBe("all")
    expect(state.discipline).toBe("all")
    expect(state.taskId).toBeNull()
    expect(state.day).toBe(TODAY)
  })

  it("reads every control back", () => {
    const state = parseViewState(
      sp("v=board&day=2026-10-20&p=custom&from=2026-10-01&to=2026-10-20&q=pump&kind=blocker&discipline=auditor&task=12&dstatus=in_review&dlv=1"),
      TODAY,
    )
    expect(state).toEqual({
      view: "board",
      day: "2026-10-20",
      preset: "custom",
      from: "2026-10-01",
      to: "2026-10-20",
      q: "pump",
      kind: "blocker",
      discipline: "auditor",
      taskId: 12,
      deliverableStatus: "in_review",
      hasDeliverable: true,
    })
  })

  it("round-trips", () => {
    const state = parseViewState(sp("v=list&p=last-7&kind=time&discipline=developer&q=audit&task=3"), TODAY)
    expect(parseViewState(sp(serializeViewState(state, TODAY)), TODAY)).toEqual(state)
  })
})

describe("resolveRange", () => {
  it("maps each preset to real calendar days", () => {
    expect(resolveRange(listed(), TODAY)).toEqual({ from: "2026-10-26", to: "2026-10-26" })
    expect(resolveRange(listed({ preset: "yesterday" }), TODAY)).toEqual({
      from: "2026-10-25",
      to: "2026-10-25",
    })
    expect(resolveRange(listed({ preset: "this-week" }), TODAY)).toEqual({
      from: "2026-10-26",
      to: "2026-11-01",
    })
    expect(resolveRange(listed({ preset: "last-7" }), TODAY)).toEqual({
      from: "2026-10-20",
      to: "2026-10-26",
    })
    expect(resolveRange(listed({ preset: "this-month" }), TODAY)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    })
  })

  it("uses from/to for custom, and repairs a broken pair", () => {
    const custom = listed({ preset: "custom", from: "2026-10-01", to: "2026-10-20" })
    expect(resolveRange(custom, TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-20" })
    expect(resolveRange({ ...custom, from: "2026-10-20", to: "2026-10-01" }, TODAY)).toEqual({
      from: "2026-10-01",
      to: "2026-10-20",
    })
    expect(resolveRange({ ...custom, from: null, to: null }, TODAY)).toEqual({ from: TODAY, to: TODAY })
  })

  it("anchors a week or heat window on the selected day, not today", () => {
    expect(resolveRange({ ...defaultViewState(TODAY), view: "week", day: "2026-11-04" }, TODAY)).toEqual({
      from: "2026-11-02",
      to: "2026-11-08",
    })
    expect(resolveRange({ ...defaultViewState(TODAY), view: "heat", day: "2026-11-04" }, TODAY)).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    })
  })
})

describe("viewDays", () => {
  it("gives the week grid seven days and the heat map a month", () => {
    expect(viewDays({ ...defaultViewState(TODAY), view: "week", day: "2026-10-28" }, TODAY)).toHaveLength(7)
    expect(viewDays({ ...defaultViewState(TODAY), view: "week", day: "2026-10-28" }, TODAY)[0]).toBe("2026-10-26")
    const heat = viewDays({ ...defaultViewState(TODAY), view: "heat" }, TODAY)
    expect(heat[0]).toBe("2026-10-01")
    expect(heat[heat.length - 1]).toBe("2026-10-31")
    expect(viewDays(defaultViewState(TODAY), TODAY)).toEqual(["2026-10-26"])
    expect(viewDays({ ...defaultViewState(TODAY), view: "list" }, TODAY)).toHaveLength(1)
  })

  it("refuses to render a range wider than the view can hold", () => {
    const long = listed({ preset: "custom" as const, from: "2020-01-01", to: "2026-10-26" })
    expect(viewDays(long, TODAY)).toHaveLength(90)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-view-state`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `lib/worklog/view-state.ts`:

```ts
// The one mapping between the work log page's controls and its query string. Unknown or
// hand-edited values fall back to the default rather than erroring: a shared link should
// open something sensible, and a stale param must not break a fetch.

import { isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import {
  isDeliverableStatus,
  isWorkLogKind,
  type DeliverableStatus,
  type WorkLogKind,
} from "./entries"
import { isIsoDate, monthBoundsIso, rangeDays, shiftDays, weekStartIso } from "./local-day"

export const WORKLOG_VIEWS = ["day", "week", "list", "board", "heat"] as const
export type WorklogView = (typeof WORKLOG_VIEWS)[number]

export function isWorklogView(value: unknown): value is WorklogView {
  return typeof value === "string" && (WORKLOG_VIEWS as readonly string[]).includes(value)
}

// The button text and the section title both come from here, so a renamed view is renamed
// in one place and can never disagree with itself.
export const VIEW_LABEL: Record<WorklogView, string> = {
  day: "Day",
  week: "Week",
  list: "All entries",
  board: "By kind",
  heat: "Calendar",
}

export const RANGE_PRESETS = ["today", "yesterday", "this-week", "last-7", "this-month", "custom"] as const
export type RangePreset = (typeof RANGE_PRESETS)[number]

export const PRESET_LABEL: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "This week",
  "last-7": "Last 7 days",
  "this-month": "This month",
  custom: "Custom",
}

export function isRangePreset(value: unknown): value is RangePreset {
  return typeof value === "string" && (RANGE_PRESETS as readonly string[]).includes(value)
}

export type ViewState = {
  view: WorklogView
  day: string
  preset: RangePreset
  from: string | null
  to: string | null
  q: string
  kind: WorkLogKind | "all"
  discipline: WorkDiscipline | "all"
  taskId: number | null
  deliverableStatus: DeliverableStatus | "all"
  hasDeliverable: boolean
}

export function defaultViewState(dayIso: string): ViewState {
  return {
    view: "day",
    day: dayIso,
    preset: "today",
    from: null,
    to: null,
    q: "",
    kind: "all",
    discipline: "all",
    taskId: null,
    deliverableStatus: "all",
    hasDeliverable: false,
  }
}

export function parseViewState(search: URLSearchParams, todayIso: string): ViewState {
  const base = defaultViewState(todayIso)

  const view = search.get("v")
  base.view = isWorklogView(view) ? view : base.view

  const day = search.get("day")
  base.day = day && isIsoDate(day) ? day : base.day

  const preset = search.get("p")
  base.preset = isRangePreset(preset) ? preset : base.preset

  const from = search.get("from")
  const to = search.get("to")
  base.from = from && isIsoDate(from) ? from : null
  base.to = to && isIsoDate(to) ? to : null

  base.q = (search.get("q") ?? "").slice(0, 120)

  const kind = search.get("kind")
  base.kind = kind === null || kind === "all" ? "all" : isWorkLogKind(kind) ? kind : "all"

  const discipline = search.get("discipline")
  base.discipline =
    discipline === null || discipline === "all"
      ? "all"
      : isWorkDiscipline(discipline)
        ? discipline
        : "all"

  const task = search.get("task")
  if (task && /^\d+$/u.test(task)) base.taskId = Number(task)

  const dstatus = search.get("dstatus")
  base.deliverableStatus =
    dstatus === null || dstatus === "all"
      ? "all"
      : isDeliverableStatus(dstatus)
        ? dstatus
        : "all"

  base.hasDeliverable = search.get("dlv") === "1"

  return base
}

export function serializeViewState(state: ViewState, todayIso: string): string {
  const out = new URLSearchParams()
  const base = defaultViewState(todayIso)

  if (state.view !== base.view) out.set("v", state.view)
  if (state.day !== base.day) out.set("day", state.day)
  if (state.preset !== base.preset) out.set("p", state.preset)
  if (state.preset === "custom") {
    if (state.from) out.set("from", state.from)
    if (state.to) out.set("to", state.to)
  }
  if (state.q.trim()) out.set("q", state.q.trim())
  if (state.kind !== "all") out.set("kind", state.kind)
  if (state.discipline !== "all") out.set("discipline", state.discipline)
  if (state.taskId !== null) out.set("task", String(state.taskId))
  if (state.deliverableStatus !== "all") out.set("dstatus", state.deliverableStatus)
  if (state.hasDeliverable) out.set("dlv", "1")

  return out.toString()
}

/**
 * Day/week/heat windows follow `day` (what the person navigated to); list and board follow
 * the preset, which is the range they said they wanted to see. The day the person is
 * standing on is not a range they asked for, so a preset must not override it.
 */
export function resolveRange(state: ViewState, todayIso: string): { from: string; to: string } {
  if (state.view === "day") return { from: state.day, to: state.day }

  if (state.view === "week") {
    const monday = weekStartIso(state.day)
    return { from: monday, to: shiftDays(monday, 6) }
  }

  if (state.view === "heat") return monthBoundsIso(state.day)

  switch (state.preset) {
    case "today":
      return { from: todayIso, to: todayIso }
    case "yesterday": {
      const yesterday = shiftDays(todayIso, -1)
      return { from: yesterday, to: yesterday }
    }
    case "this-week": {
      const monday = weekStartIso(todayIso)
      return { from: monday, to: shiftDays(monday, 6) }
    }
    case "last-7":
      return { from: shiftDays(todayIso, -6), to: todayIso }
    case "this-month":
      return monthBoundsIso(todayIso)
    case "custom": {
      if (state.from && state.to) {
        return state.from <= state.to
          ? { from: state.from, to: state.to }
          : { from: state.to, to: state.from }
      }
      if (state.from) return { from: state.from, to: state.from }
      if (state.to) return { from: state.to, to: state.to }
      return { from: todayIso, to: todayIso }
    }
  }
}

const RANGE_DAY_CAP = 90
const HEAT_DAY_CAP = 370

export function viewDays(state: ViewState, todayIso: string): string[] {
  const { from, to } = resolveRange(state, todayIso)
  return rangeDays(from, to, state.view === "heat" ? HEAT_DAY_CAP : RANGE_DAY_CAP)
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-view-state`
Expected: PASS, 10 tests.

- [ ] **Step 5: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/worklog/view-state.ts tests/unit/worklog-view-state.test.ts
git commit -m "feat(worklog): shareable URL view state for the work log page"
git push
```

**As shipped (2026-10-26, `284e2f9`) — three corrections to the code above.**

1. `WORK_DISCIPLINES`, `WORK_LOG_KINDS` and `DELIVERABLE_STATUSES` are **not** imported here.
   The parsing rules only need the `is*` guards, and an unused import is a lint **error** in
   this repo, so the block above would not have passed its own gate.
2. The preset cases in `resolveRange` needed `view: "list"`. As written, `{ ...defaultViewState(TODAY), preset: "yesterday" }`
   still has `view: "day"`, and the day view follows `day` — the same function the "anchors a
   week on the selected day" case depends on. A preset that overrode the day view would make
   the two assertions in this file mutually unsatisfiable, so the test now says which view is
   asking for a range. `listed()` is that statement.
3. `VIEW_LABEL` is imported by the test and must be asserted, not merely imported (same
   unused-import rule); it now checks the two labels a reader would notice if they drifted.
   The heat-window and range-cap cases were added because neither branch had coverage.

### Task 6: Entries list + create — `app/api/worklog/entries/route.ts`

The route parses its own query string with the page's `parseViewState`, so the URL a
person shares and the SQL that ran are the same object — no second filter vocabulary to
drift. Every read carries `user_id = session.id`: §5 makes a member's log private by
default, and that boundary is in the query, not the UI.

**Files:**
- Create: `app/api/worklog/_shared.ts`
- Create: `app/api/worklog/entries/route.ts`
- Test (append): `tests/unit/worklog-api.test.ts`

**Interfaces:**
- Consumes: `workLogEntries`, `deliverables`, `tasks`, `users` from `@/drizzle/schema`;
  `getSession` from `@/lib/auth-actions`; `localDay`, `isIsoDate` from
  `@/lib/worklog/local-day`; `parseViewState`, `resolveRange` from
  `@/lib/worklog/view-state`; `readEntryCreate` from `@/lib/worklog/entry-fields`;
  `EntryDto`, `isWorkLogKind` from `@/lib/worklog/entries`.
- Produces (used by Tasks 7–10 and 11):
  - `unauthorized()`, `badRequest(message)`, `serverError(error, action)` — same shapes as
    `app/api/reports/_shared.ts:65-79`, re-declared here because that file is reports-only.
  - `worklogSession(): Promise<{ id: number; timezone: string | null } | null>`
  - `mapEntry(row: EntryRow): EntryDto`, `EntryRow` (the select shape)
  - `entryColumns` — the shared column list so GET, POST and bulk return identical shapes
  - `entryFilters(state: ViewState, userId: number, from: string, to: string): SQL[]` — the one
    filter vocabulary, used by the entries list, the summary and every chart section
  - `likePattern(raw: string): string` — `%`/`_` escaped before any `ilike`
  - `mapDeliverable(row: DeliverableRow): DeliverableDto`, `deliverableColumns`,
    `deliverableSelect` (columns + the correlated `entryCount`)
  - `GET /api/worklog/entries?<view-state params>` → `{ success: true, data: { entries: EntryDto[], range: { from, to }, today: string, timezone: string | null } }` — `today` and `timezone` are the member's, which is what the client stamps into its day controls.
  - `POST /api/worklog/entries` with `{ workedOn, title, kind?, body?, discipline?, minutes?, taskId? }` → `{ success: true, data: { entry: EntryDto } }` (201)

- [ ] **Step 1: Write the failing guard cases**

Create `tests/unit/worklog-api.test.ts`. Guard tests read route source because no unit test
may import a module that reaches `lib/db` (this is the same reason as
`tests/unit/worklog-reports.test.ts`), and each case below is written before its route:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const shared = () => src("app/api/worklog/_shared.ts")

describe("work log shared helpers", () => {
  it("always puts ownership first in the filter vocabulary", () => {
    expect(shared()).toMatch(/const conditions: SQL\[\] = \[\n    eq\(workLogEntries\.userId, userId\),/u)
  })

  it("escapes ilike wildcards before building a pattern", () => {
    expect(shared()).toMatch(/likePattern/u)
    expect(shared()).toMatch(/\\\\%_/u)
    expect(shared()).toMatch(/ilike/u)
  })
})

describe("work log entries route", () => {
  const route = () => src("app/api/worklog/entries/route.ts")

  it("scopes every read and write to the session user", () => {
    expect(route()).toMatch(/entryFilters\(state, session\.id, from, to\)/u)
    expect(route()).toMatch(/userId: session\.id/u)
  })

  it("uses the page's own view state instead of a second filter vocabulary", () => {
    expect(route()).toMatch(/parseViewState/u)
    expect(route()).toMatch(/resolveRange/u)
    // the conditions themselves are built in exactly one place
    expect(route()).not.toMatch(/isNotNull\(workLogEntries/u)
  })

  it("only lets a whitelist write the row", () => {
    expect(route()).toMatch(/readEntryCreate/u)
    // A spread body is the exact bug lib/task-updates.ts exists for.
    expect(route()).not.toMatch(/values\(\{?\s*\.\.\.body/u)
  })

  it("refuses a forward-dated log entry", () => {
    expect(route()).toMatch(/localDay/u)
    expect(route()).toMatch(/future/iu)
  })

  it("checks that a deliverable on a row belongs to this member", () => {
    // A foreign key alone would accept another member's deliverable and hand their work
    // to this log, so the ownership predicate is on the check, not only on the schema.
    expect(route()).toMatch(/eq\(deliverables\.ownerId, session\.id\)/u)
  })

  it("has no client secret surface", () => {
    expect(route()).not.toMatch(/NEXT_PUBLIC_/u)
  })
})
```

**Also shipped, not in the plan above:** `tests/unit/schema-safety.test.ts` decides whether a
route is auth-gated by matching a call **name** in the route's own text. `worklogSession()`
calls `getSession()` one file over, so every work log route looked anonymous and the
allowlist case failed. Two changes, both now in the repo:

- that matcher also recognizes `worklogSession`;
- the name check's blind spot is closed where it matters — `tests/unit/worklog-api.test.ts`
  enumerates `app/api/worklog/**/route.ts` and asserts each one contains
  `const session = await worklogSession()` **and** `if (!session) return unauthorized()`.
  A later work log route that forgets the null branch fails a test instead of silently
  querying with an undefined user id. **Tasks 7–10 inherit this: keep that exact pair of
  lines in each new route.**

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-api`
Expected: FAIL — `ENOENT: no such file or directory, open '…/app/api/worklog/entries/route.ts'`.

- [ ] **Step 3: Write the shared helpers**

Create `app/api/worklog/_shared.ts`:

```ts
// Server-only helpers for /api/worklog/*. Envelope shapes match app/api/reports/_shared.ts
// so the page's fetch layer is one function, not two.

import { NextResponse } from "next/server"
import { eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { deliverables, tasks, workLogEntries } from "@/drizzle/schema"
import type { DeliverableDto, EntryDto } from "@/lib/worklog/entries"
import type { ViewState } from "@/lib/worklog/view-state"

export function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, message }, { status: 400 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ success: false, message }, { status: 404 })
}

export function serverError(error: unknown, action: string) {
  console.error(`Error during ${action}:`, error)
  const message = error instanceof Error ? error.message : String(error)
  return NextResponse.json({ success: false, message: `Failed to ${action}`, error: message }, { status: 500 })
}

export async function worklogSession() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return null
  return { id: session.id, timezone: session.timezone ?? null }
}

export type EntryRow = {
  id: number
  workedOn: string
  taskId: number | null
  taskTitle: string | null
  kind: string
  title: string
  body: string | null
  discipline: string | null
  minutes: number | null
  deliverableId: number | null
  playbookId: number | null
  playbookVersion: number | null
  links: unknown
  source: string
  redatedAt: Date | null
  createdAt: Date
}

export const entryColumns = {
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
} as const

// A `date` column comes back as "YYYY-MM-DD" already; only the timestamptz columns need
// ISO conversion. `kind` is already whitelisted by the vocabulary module on the way in.
export function mapEntry(row: EntryRow): EntryDto {
  return {
    id: row.id,
    workedOn: row.workedOn,
    taskId: row.taskId,
    taskTitle: row.taskTitle ?? null,
    kind: row.kind as EntryDto["kind"],
    title: row.title,
    body: row.body ?? null,
    discipline: row.discipline as EntryDto["discipline"],
    minutes: row.minutes,
    deliverableId: row.deliverableId,
    playbookId: row.playbookId,
    playbookVersion: row.playbookVersion,
    links: Array.isArray(row.links) ? (row.links as string[]) : [],
    source: row.source as EntryDto["source"],
    redatedAt: row.redatedAt ? row.redatedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

export type DeliverableRow = {
  id: number
  name: string
  type: string
  status: string
  producedOn: string | null
  link: string | null
  evidence: string | null
  taskId: number | null
  taskTitle: string | null
  discipline: string | null
  entryCount: number | null
  createdAt: Date
}

export const deliverableColumns = {
  id: deliverables.id,
  name: deliverables.name,
  type: deliverables.type,
  status: deliverables.status,
  producedOn: deliverables.producedOn,
  link: deliverables.link,
  evidence: deliverables.evidence,
  taskId: deliverables.taskId,
  taskTitle: tasks.title,
  discipline: deliverables.discipline,
  createdAt: deliverables.createdAt,
} as const

export function mapDeliverable(row: DeliverableRow): DeliverableDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type as DeliverableDto["type"],
    status: row.status as DeliverableDto["status"],
    producedOn: row.producedOn ?? null,
    link: row.link ?? null,
    evidence: row.evidence ?? null,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    discipline: row.discipline as DeliverableDto["discipline"],
    entryCount: row.entryCount ?? 0,
    createdAt: row.createdAt.toISOString(),
  }
}

// The full read shape for a deliverable. `entryCount` is a correlated subquery rather than
// a join because a join would multiply the rows the board counts. It lives here, not in a
// route file: a route.ts may export handlers and config, and a shared SQL fragment exported
// from one route into another is exactly the shape that breaks Next's route type check.
export const deliverableSelect = {
  ...deliverableColumns,
  entryCount: sql<number>`(
    select count(*) from work_log_entries w
    where w.deliverable_id = ${deliverables.id} and w.user_id = ${deliverables.ownerId}
  )::int`,
}

/** `postgres` error codes, surfaced as a 400 instead of a 500 with a stack in the body. */
export function isForeignKeyViolation(error: unknown): boolean {
  return (error as { code?: string }).code === "23503"
}

/** `%` and `_` are wildcards; a search for "100_" must not match "1001". */
export function likePattern(raw: string): string {
  return `%${raw.replace(/[\\%_]/gu, (c) => `\\${c}`)}%`
}

/**
 * The single filter vocabulary for the work log. The page, `GET /api/worklog/entries` and
 * `GET /api/worklog/summary` all call this, so the number a shared URL shows can never be
 * produced by a different predicate than the list under it. `userId` is not optional.
 */
export function entryFilters(state: ViewState, userId: number, from: string, to: string): SQL[] {
  const conditions: SQL[] = [
    eq(workLogEntries.userId, userId),
    gte(workLogEntries.workedOn, from),
    lte(workLogEntries.workedOn, to),
  ]
  if (state.kind !== "all") conditions.push(eq(workLogEntries.kind, state.kind))
  if (state.discipline !== "all") conditions.push(eq(workLogEntries.discipline, state.discipline))
  if (state.taskId !== null) conditions.push(eq(workLogEntries.taskId, state.taskId))
  if (state.hasDeliverable) conditions.push(isNotNull(workLogEntries.deliverableId))
  if (state.q.trim()) {
    const pattern = likePattern(state.q.trim())
    conditions.push(sql`(${workLogEntries.title} ilike ${pattern} or ${workLogEntries.body} ilike ${pattern})`)
  }
  if (state.deliverableStatus !== "all") {
    // A subquery, not a join, so a status filter cannot multiply the rows.
    conditions.push(
      sql`exists (select 1 from ${deliverables} d where d.id = ${workLogEntries.deliverableId} and d.status = ${state.deliverableStatus} and d.owner_id = ${userId})`,
    )
  }
  return conditions
}
```

- [ ] **Step 4: Write the route**

Create `app/api/worklog/entries/route.ts`:

```ts
// /api/worklog/entries — the member's own day rows.
// GET  → the range named by the query string, filtered by the page's own view state.
// POST → one manual row. `source` is never taken from the body: a browser write is
//        manual, and only the phases that earn provenance (promotes, the provider) set it.

import { NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks, workLogEntries } from "@/drizzle/schema"
import { readEntryCreate } from "@/lib/worklog/entry-fields"
import { localDay } from "@/lib/worklog/local-day"
import { parseViewState, resolveRange } from "@/lib/worklog/view-state"
import {
  badRequest,
  entryColumns,
  entryFilters,
  isForeignKeyViolation,
  mapEntry,
  serverError,
  unauthorized,
  worklogSession,
} from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const today = localDay(new Date(), session.timezone)
    const state = parseViewState(request.nextUrl.searchParams, today)
    const { from, to } = resolveRange(state, today)

    const rows = await db
      .select(entryColumns)
      .from(workLogEntries)
      .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
      .where(and(...entryFilters(state, session.id, from, to)))
      .orderBy(sql`${workLogEntries.workedOn} desc`, sql`${workLogEntries.createdAt} desc`)
      .limit(1000)

    return NextResponse.json({
      success: true,
      data: { entries: rows.map(mapEntry), range: { from, to }, today, timezone: session.timezone },
    })
  } catch (error) {
    return serverError(error, "fetch work log entries")
  }
}

export async function POST(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const today = localDay(new Date(), session.timezone)
    const parsed = readCreateBody(body, today)
    if ("error" in parsed) return badRequest(parsed.error)
    const value = parsed.value

    if (value.deliverableId !== null) {
      // Checked, not just FK-enforced: a deliverable owned by someone else would insert
      // cleanly and hand their work to this member's log.
      const [mine] = await db
        .select({ id: deliverables.id })
        .from(deliverables)
        .where(and(eq(deliverables.id, value.deliverableId), eq(deliverables.ownerId, session.id)))
        .limit(1)
      if (!mine) return badRequest("deliverableId does not refer to one of your deliverables")
    }

    const [inserted] = await db
      .insert(workLogEntries)
      .values({ ...value, userId: session.id, source: "manual" })
      .returning({ id: workLogEntries.id })

    const [row] = await db
      .select(entryColumns)
      .from(workLogEntries)
      .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
      .where(eq(workLogEntries.id, inserted.id))
      .limit(1)

    return NextResponse.json({ success: true, data: { entry: mapEntry(row) } }, { status: 201 })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task or deliverable no longer exists.")
    return serverError(error, "create work log entry")
  }
}

/**
 * An omitted `workedOn` is stamped with the day in the member's own timezone — the only
 * honest default at 23:40. A future day is a plan, not a log, so it is refused rather
 * than silently pulled back to today.
 */
function readCreateBody(body: unknown, today: string) {
  const source =
    body && typeof body === "object" && !Array.isArray(body) && (body as Record<string, unknown>).workedOn === undefined
      ? { ...(body as Record<string, unknown>), workedOn: today }
      : body
  const result = readEntryCreate(source)
  if ("error" in result) return result
  if (result.value.workedOn > today) return { error: "A work log entry cannot be dated in the future." }
  return result
}
```

- [ ] **Step 5: Run the guards and the gates**

Run: `npm test -- worklog-api`
Expected: PASS, 10 tests (the 7 above plus the ownership case and the two session-gating
cases). Also run the whole suite: the session-gate change touches
`tests/unit/schema-safety.test.ts`, whose allowlist case is the one that fails first.

```bash
npm run typecheck && npm run lint && npm test
```
Expected: typecheck 0 errors, lint 0 errors / 70 warnings (an unused import shows up as a
lint error, so run the whole gate set even though the guard tests are green).

- [ ] **Step 6: Commit**

```bash
git add app/api/worklog/_shared.ts app/api/worklog/entries/route.ts \
  tests/unit/worklog-api.test.ts tests/unit/schema-safety.test.ts
git commit -m "feat(worklog): entries list and create routes"
git push
```

**As shipped (2026-10-26, `16710b8`) — two defects in the code above, both caught by the
gates rather than by reading:**

1. `POST` uses `deliverables` but the import list only brought in `tasks, workLogEntries`.
   `tsc` fails; the import is `{ deliverables, tasks, workLogEntries }`.
2. `deliverableSelect` interpolated `${deliverables.owner_id}`. Drizzle's JS property is
   `ownerId` (`drizzle/schema.ts:447`) — `owner_id` is the SQL name, and the undefined
   property would have thrown at query time, which no guard test in this task executes.
   Fixed to `${deliverables.ownerId}`.

---

### Task 7: One row — `app/api/worklog/entries/[id]/route.ts`

Ownership lives in the `WHERE` clause, so a wrong id and someone else's id are the same
answer: 404, no existence leak.

**Files:**
- Create: `app/api/worklog/entries/[id]/route.ts`
- Test (append): `tests/unit/worklog-api.test.ts`

**Interfaces:**
- Consumes: `pickEntryUpdates`, `EntryCurrent` from `@/lib/worklog/entry-fields`;
  `entryColumns`, `mapEntry`, `worklogSession`, `unauthorized`, `badRequest`, `notFound`,
  `serverError`, `isForeignKeyViolation` from `../../_shared`.
- Produces:
  - `PUT /api/worklog/entries/:id` → `{ success: true, data: { entry: EntryDto } }`
  - `DELETE /api/worklog/entries/:id` → `{ success: true, data: { id: number } }`

- [ ] **Step 1: Write the failing guard cases**

Append to `tests/unit/worklog-api.test.ts`:

```ts
describe("work log entry row route", () => {
  const route = () => src("app/api/worklog/entries/[id]/route.ts")

  it("puts ownership in the where clause, not in a check-then-act", () => {
    expect(route()).toMatch(/and\(eq\(workLogEntries\.id, numericId\), eq\(workLogEntries\.userId, session\.id\)\)/u)
  })

  it("answers 404 without distinguishing missing from foreign", () => {
    expect(route()).toMatch(/notFound\("Entry not found"\)/u)
    expect(route()).not.toMatch(/not owned/u)
  })

  it("re-dates through the whitelist, never from the body", () => {
    expect(route()).toMatch(/pickEntryUpdates/u)
    expect(route()).toMatch(/if \(result\.redated\) set\.redatedAt = new Date\(\)/u)
    expect(route()).toMatch(/\.set\(set\)/u)
    expect(route()).not.toMatch(/\.set\(\{ \.\.\.body/u)
  })

  it("parses the params promise the way Next 16 requires", () => {
    expect(route()).toMatch(/params: Promise<\{ id: string \}>/u)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-api`
Expected: FAIL — the new `describe` block throws ENOENT for the route file.

- [ ] **Step 3: Write the route**

Create `app/api/worklog/entries/[id]/route.ts`:

```ts
// /api/worklog/entries/[id] — edit or delete one of your own rows.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks, workLogEntries } from "@/drizzle/schema"
import { pickEntryUpdates, type EntryCurrent, type EntryPatch } from "@/lib/worklog/entry-fields"
import { badRequest, entryColumns, isForeignKeyViolation, mapEntry, notFound, serverError, unauthorized, worklogSession } from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function loadOwned(id: number, userId: number) {
  const [row] = await db
    .select(entryColumns)
    .from(workLogEntries)
    .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
    .where(and(eq(workLogEntries.id, id), eq(workLogEntries.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function PUT(request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Entry id must be a positive integer")

  try {
    const existing = await loadOwned(numericId, session.id)
    if (!existing) return notFound("Entry not found")

    const body = await request.json().catch(() => null)
    const current: EntryCurrent = {
      workedOn: existing.workedOn,
      minutes: existing.minutes,
      kind: existing.kind as EntryCurrent["kind"],
      deliverableId: existing.deliverableId,
    }
    const result = pickEntryUpdates(body, current)
    if ("error" in result) return badRequest(result.error)

    const set: EntryPatch & { updatedAt: Date; redatedAt?: Date } = { ...result.patch, updatedAt: new Date() }
    if (result.redated) set.redatedAt = new Date()

    const updated = await db
      .update(workLogEntries)
      .set(set)
      .where(and(eq(workLogEntries.id, numericId), eq(workLogEntries.userId, session.id)))
      .returning({ id: workLogEntries.id })

    if (updated.length === 0) return notFound("Entry not found")

    // Re-read for the joined task title: .returning() can only see this table.
    const refreshed = await loadOwned(numericId, session.id)
    return NextResponse.json({ success: true, data: { entry: mapEntry(refreshed ?? existing) } })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task or deliverable no longer exists.")
    return serverError(error, "update work log entry")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Entry id must be a positive integer")

  try {
    const deleted = await db
      .delete(workLogEntries)
      .where(and(eq(workLogEntries.id, numericId), eq(workLogEntries.userId, session.id)))
      .returning({ id: workLogEntries.id })

    if (deleted.length === 0) return notFound("Entry not found")
    return NextResponse.json({ success: true, data: { id: numericId } })
  } catch (error) {
    return serverError(error, "delete work log entry")
  }
}
```

`mapEntry(row ?? existing)` is not a fallback for a race — the update just committed, so the
re-read succeeds; `existing` only keeps the types honest. `.returning()` is on the id column
only because drizzle cannot put a joined select into a `RETURNING` list; the re-read is what
attaches `taskTitle`.

- [ ] **Step 4: Run the guards and gates**

```bash
npm test -- worklog-api && npm run typecheck && npm run lint && npm test
git add app/api/worklog/entries/\[id\]/route.ts tests/unit/worklog-api.test.ts
git commit -m "feat(worklog): entry edit and delete routes with ownership in the where clause"
git push
```
Expected: 15 guard tests (the 10 from Task 6, these 4, and the session-gating case this file
now runs for a **second** route), typecheck 0 errors, lint 0 errors / 70 warnings.

**As shipped (2026-10-26, `7c66fcd`) — one defect in the code above.** `loadOwned` returns
`row ?? null`, a single row, but the re-read after the update destructured it
(`const [row] = await loadOwned(...)`). `tsc` rejects it — TS2488, no `[Symbol.iterator]` —
so the plan's own Step 4 gate was the thing that would have caught it. Named `refreshed` for
the same reason the row route reads its value back rather than trusting `.returning()`.


---

### Task 8: Bulk actions — `lib/worklog/bulk.ts` + `app/api/worklog/entries/bulk/route.ts`

Selection is the fastest way to wreck a log, so the action grammar is a pure module with
its own tests, and the route only executes an already-validated request. `requested` versus
`affected` is the honest answer to "I selected 40, six belonged to nothing": the route never
pretends a row that the ownership filter dropped was touched.

**Files:**
- Create: `lib/worklog/bulk.ts`
- Create: `app/api/worklog/entries/bulk/route.ts`
- Test: `tests/unit/worklog-bulk.test.ts`
- Test (append): `tests/unit/worklog-api.test.ts`

**Interfaces:**
- Consumes: `WORK_LOG_KINDS`, `isWorkLogKind`, `WorkLogKind` from `./entries`;
  `isIsoDate` from `./local-day`; `Fail` from `./entry-fields`. The route also uses
  `unauthorized`, `badRequest`, `notFound`, `serverError`, `worklogSession`, `entryColumns`,
  `mapEntry` from `../../_shared`.
- Produces:
  - `BULK_ACTIONS`, `BulkAction`, `BulkRequest`
  - `readBulkRequest(input: unknown, todayIso: string): { value: BulkRequest } | Fail`
  - `BULK_IDS_CAP` (200)
  - `POST /api/worklog/entries/bulk` → `{ success: true, data: { action, requested, affected, skipped, entries: EntryDto[], deliverable?: DeliverableDto } }`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/worklog-bulk.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { BULK_ACTIONS, BULK_IDS_CAP, readBulkRequest } from "@/lib/worklog/bulk"

const TODAY = "2026-10-26"

const ok = (input: unknown) => {
  const result = readBulkRequest(input, TODAY)
  if ("error" in result) throw new Error(result.error)
  return result.value
}
const why = (input: unknown) => {
  const result = readBulkRequest(input, TODAY)
  if (!("error" in result)) throw new Error("expected an error")
  return result.error
}

describe("readBulkRequest", () => {
  it("offers exactly the five actions this phase owns", () => {
    expect([...BULK_ACTIONS]).toEqual(["delete", "set-task", "re-date", "set-kind", "convert-deliverable"])
  })

  it("requires a non-empty selection", () => {
    expect(why({ action: "delete", ids: [] })).toMatch(/no rows selected/iu)
    expect(why({ action: "delete" })).toMatch(/no rows selected/iu)
  })

  it("drops non-positive ids instead of trusting them", () => {
    expect(ok({ action: "delete", ids: [1, 2, 0, -5, "6", 1] })).toEqual({
      action: "delete",
      ids: [1, 2, 6],
      taskId: null,
      workedOn: null,
      kind: null,
    })
  })

  it("refuses an oversized selection", () => {
    const ids = Array.from({ length: BULK_IDS_CAP + 1 }, (_, i) => i + 1)
    expect(why({ action: "delete", ids })).toMatch(/at most 200/iu)
  })

  it("rejects an unknown action by name", () => {
    expect(why({ action: "explode", ids: [1] })).toMatch(/explode/u)
  })

  it("treats set-task as both attach and detach", () => {
    expect(ok({ action: "set-task", ids: [1], taskId: 42 }).taskId).toBe(42)
    expect(ok({ action: "set-task", ids: [1], taskId: null }).taskId).toBeNull()
    expect(why({ action: "set-task", ids: [1] })).toMatch(/taskId/u)
    expect(why({ action: "set-task", ids: [1], taskId: "soon" })).toMatch(/positive integer or null/iu)
  })

  it("refuses to re-date a bulk selection into the future", () => {
    expect(ok({ action: "re-date", ids: [1], workedOn: "2026-10-25" }).workedOn).toBe("2026-10-25")
    expect(why({ action: "re-date", ids: [1], workedOn: "2026-12-01" })).toMatch(/future/iu)
    expect(why({ action: "re-date", ids: [1], workedOn: "not-a-day" })).toMatch(/YYYY-MM-DD/u)
    expect(why({ action: "re-date", ids: [1] })).toMatch(/workedOn/u)
  })

  it("keeps kinds that need per-row companions out of bulk", () => {
    expect(ok({ action: "set-kind", ids: [1], kind: "blocker" }).kind).toBe("blocker")
    expect(why({ action: "set-kind", ids: [1], kind: "time" })).toMatch(/minutes/iu)
    expect(why({ action: "set-kind", ids: [1], kind: "deliverable" })).toMatch(/Convert to deliverable/iu)
    expect(why({ action: "set-kind", ids: [1], kind: "nope" })).toMatch(/one of/iu)
    expect(why({ action: "set-kind", ids: [1] })).toMatch(/kind/u)
  })

  it("accepts convert-deliverable with no payload", () => {
    expect(ok({ action: "convert-deliverable", ids: [3, 4] }).action).toBe("convert-deliverable")
  })

  it("rejects a body that is not an object", () => {
    expect(why(null)).toMatch(/object/iu)
    expect(why([])).toMatch(/object/iu)
    expect(why("delete")).toMatch(/object/iu)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-bulk`
Expected: FAIL — `Failed to load url @/lib/worklog/bulk`.

- [ ] **Step 3: Write the module**

Create `lib/worklog/bulk.ts`:

```ts
// The grammar of a bulk write on the work log. The route executes; this decides whether
// the request was ever allowed to exist. A bulk action must be safe to apply to 200 rows
// at once, which is why kinds that need a per-row companion (time needs minutes,
// deliverable needs a deliverable row) are refused here rather than half-applied there.

import { WORK_LOG_KINDS, isWorkLogKind, type WorkLogKind } from "./entries"
import { isIsoDate } from "./local-day"
import type { Fail } from "./entry-fields"

export const BULK_ACTIONS = ["delete", "set-task", "re-date", "set-kind", "convert-deliverable"] as const
export type BulkAction = (typeof BULK_ACTIONS)[number]

export const BULK_IDS_CAP = 200

export type BulkRequest = {
  action: BulkAction
  ids: number[]
  taskId: number | null
  workedOn: string | null
  kind: WorkLogKind | null
}

function isBulkAction(value: unknown): value is BulkAction {
  return typeof value === "string" && (BULK_ACTIONS as readonly string[]).includes(value)
}

function readIds(value: unknown): number[] | Fail {
  if (!Array.isArray(value) || value.length === 0) return { error: "No rows selected." }
  const ids = [...new Set(value.map((raw) => Number(raw)).filter((n) => Number.isInteger(n) && n > 0))]
  if (ids.length === 0) return { error: "No valid entry ids in the selection." }
  if (ids.length > BULK_IDS_CAP) return { error: `Select at most ${BULK_IDS_CAP} rows at a time.` }
  return ids
}

export function readBulkRequest(input: unknown, todayIso: string): { value: BulkRequest } | Fail {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be an object" }
  }
  const source = input as Record<string, unknown>

  const action = source.action
  if (!isBulkAction(action)) {
    // Naming what was sent, because "action must be one of …" on a typo the caller can see
    // is only useful if the answer says which half of it the caller got wrong.
    return { error: `action must be one of: ${BULK_ACTIONS.join(", ")} (got ${String(action).slice(0, 40)})` }
  }

  const ids = readIds(source.ids)
  if ("error" in ids) return ids

  const request: BulkRequest = { action, ids, taskId: null, workedOn: null, kind: null }

  switch (action) {
    case "delete":
    case "convert-deliverable":
      return { value: request }

    case "set-task": {
      // Same convention as the row whitelist: an absent field is not a request to unlink.
      if (source.taskId === undefined) {
        return { error: "set-task needs a taskId (a positive integer, or null to unlink)." }
      }
      const raw = source.taskId
      if (raw === null || raw === "") {
        request.taskId = null
        break
      }
      const n = Number(raw)
      if (!Number.isInteger(n) || n <= 0) return { error: "taskId must be a positive integer or null" }
      request.taskId = n
      break
    }

    case "re-date": {
      const raw = source.workedOn
      if (typeof raw !== "string" || !isIsoDate(raw)) return { error: "re-date needs workedOn as YYYY-MM-DD" }
      if (raw > todayIso) return { error: "A work log entry cannot be dated in the future." }
      request.workedOn = raw
      break
    }

    case "set-kind": {
      const raw = source.kind
      if (!isWorkLogKind(raw)) return { error: `kind must be one of: ${WORK_LOG_KINDS.join(", ")}` }
      if (raw === "time") return { error: "A #time entry needs its own minutes — edit those rows individually." }
      if (raw === "deliverable") return { error: "Use Convert to deliverable to link rows to a deliverable." }
      request.kind = raw
      break
    }
  }

  return { value: request }
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-bulk`
Expected: PASS, 10 tests.

- [ ] **Step 5: Write the failing route guards**

Append to `tests/unit/worklog-api.test.ts`:

```ts
describe("work log bulk route", () => {
  const route = () => src("app/api/worklog/entries/bulk/route.ts")

  it("filters the ids by ownership inside the query", () => {
    expect(route()).toMatch(/and\(inArray\(workLogEntries\.id, ids\), eq\(workLogEntries\.userId, userId\)\)/u)
    // one helper, five call sites: a bulk write that skipped ownership would edit foreign rows
    expect(route().match(/ownedIds\(/gu)?.length).toBeGreaterThanOrEqual(6)
  })

  it("reports requested and affected separately", () => {
    expect(route()).toMatch(/requested: body\.ids\.length/u)
    expect(route()).toMatch(/affected: affected\.length/u)
    expect(route()).toMatch(/skipped: body\.ids\.length - affected\.length/u)
  })

  it("runs a multi-write action in one transaction", () => {
    expect(route()).toMatch(/db\.transaction/u)
    expect(route()).toMatch(/insert\(deliverables\)/u)
  })

  it("only writes through the bulk grammar", () => {
    expect(route()).toMatch(/readBulkRequest/u)
    expect(route()).not.toMatch(/\.set\(\{ \.\.\.body/u)
  })

  it("answers 404 when the whole selection was someone else's", () => {
    expect(route()).toMatch(/notFound\("No matching entries"\)/u)
  })
})
```

Run: `npm test -- worklog-api` → FAIL (ENOENT for the bulk route).

- [ ] **Step 6: Write the route**

Create `app/api/worklog/entries/bulk/route.ts`:

```ts
// /api/worklog/entries/bulk — act on a selection of your own rows in one round trip.

import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks, workLogEntries } from "@/drizzle/schema"
import { readBulkRequest, type BulkRequest } from "@/lib/worklog/bulk"
import { WORK_LOG_KINDS } from "@/lib/worklog/entries"
import { localDay } from "@/lib/worklog/local-day"
import {
  badRequest,
  entryColumns,
  deliverableSelect,
  mapDeliverable,
  mapEntry,
  notFound,
  serverError,
  unauthorized,
  worklogSession,
} from "../../_shared"

export const dynamic = "force-dynamic"

function ownedIds(ids: readonly number[], userId: number) {
  return and(inArray(workLogEntries.id, ids), eq(workLogEntries.userId, userId))
}

export async function POST(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const parsed = await readBody(request, localDay(new Date(), session.timezone))
  if ("error" in parsed) return badRequest(parsed.error)
  const body = parsed.value

  try {
    switch (body.action) {
      case "delete": {
        const affected = await db
          .delete(workLogEntries)
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, [])
      }

      case "set-task": {
        if (body.taskId !== null) {
          const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, body.taskId)).limit(1)
          if (!task) return badRequest("That task no longer exists.")
        }
        const affected = await db
          .update(workLogEntries)
          .set({ taskId: body.taskId, updatedAt: new Date() })
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, await reload(affected.map((r) => r.id), session.id))
      }

      case "re-date": {
        // The grammar already guarantees this; the column is NOT NULL and the request field
        // is nullable, so the route narrows rather than handing drizzle a null it would
        // reject at compile time.
        if (body.workedOn === null) return badRequest("re-date needs workedOn as YYYY-MM-DD")
        const affected = await db
          .update(workLogEntries)
          .set({ workedOn: body.workedOn, redatedAt: new Date(), updatedAt: new Date() })
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, await reload(affected.map((r) => r.id), session.id))
      }

      case "set-kind": {
        if (body.kind === null) return badRequest(`kind must be one of: ${WORK_LOG_KINDS.join(", ")}`)
        const affected = await db
          .update(workLogEntries)
          .set({ kind: body.kind, updatedAt: new Date() })
          .where(ownedIds(body.ids, session.id))
          .returning({ id: workLogEntries.id })
        if (affected.length === 0) return notFound("No matching entries")
        return done(body, affected, await reload(affected.map((r) => r.id), session.id))
      }

      case "convert-deliverable": {
        // One deliverable for the whole selection: the rows become the evidence that the
        // thing exists, so the name comes from the first row the member actually wrote.
        const [seed] = await db
          .select(entryColumns)
          .from(workLogEntries)
          .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
          .where(ownedIds(body.ids, session.id))
          .orderBy(workLogEntries.workedOn, workLogEntries.id)
          .limit(1)
        if (!seed) return notFound("No matching entries")

        const created = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(deliverables)
            .values({
              name: seed.title.slice(0, 120),
              type: "other",
              status: "draft",
              ownerId: session.id,
              createdBy: session.id,
              taskId: seed.taskId,
              discipline: seed.discipline,
              producedOn: seed.workedOn,
              evidence: seed.body ?? null,
            })
            .returning({ id: deliverables.id })

          const touched = await tx
            .update(workLogEntries)
            .set({ deliverableId: row.id, kind: "deliverable", updatedAt: new Date() })
            .where(ownedIds(body.ids, session.id))
            .returning({ id: workLogEntries.id })

          return { deliverableId: row.id, touched }
        })

        const [record] = await db
          .select(deliverableSelect)
          .from(deliverables)
          .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
          .where(eq(deliverables.id, created.deliverableId))
          .limit(1)
        return NextResponse.json({
          success: true,
          data: {
            action: body.action,
            requested: body.ids.length,
            affected: created.touched.length,
            skipped: body.ids.length - created.touched.length,
            entries: await reload(created.touched.map((r) => r.id), session.id),
            deliverable: mapDeliverable(record),
          },
        })
      }
    }
  } catch (error) {
    return serverError(error, "bulk update work log entries")
  }
}

async function readBody(request: NextRequest, today: string) {
  const json = await request.json().catch(() => null)
  return readBulkRequest(json, today)
}

async function reload(ids: readonly number[], userId: number) {
  if (ids.length === 0) return []
  const rows = await db
    .select(entryColumns)
    .from(workLogEntries)
    .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
    .where(ownedIds(ids, userId))
    .orderBy(workLogEntries.workedOn, workLogEntries.id)
  return rows.map(mapEntry)
}

function done(body: BulkRequest, affected: readonly { id: number }[], entries: Awaited<ReturnType<typeof reload>>) {
  return NextResponse.json({
    success: true,
    data: {
      action: body.action,
      requested: body.ids.length,
      affected: affected.length,
      skipped: body.ids.length - affected.length,
      entries,
    },
  })
}
```

`ownedIds()` exists because the same two-condition `where` appears five times, and a bulk
route that forgot `userId` in one of them would silently edit someone else's rows. The
count subquery is a real `count`, not a `1`: `Convert to deliverable` reports how many log
rows now back the deliverable, and that number is what makes §4's "drill into the rows
behind every claim" true on the deliverable card.

- [ ] **Step 7: Run the guards and gates**

```bash
npm test -- worklog-api && npm run typecheck && npm run lint && npm test
git add lib/worklog/bulk.ts app/api/worklog/entries/bulk/route.ts tests/unit/worklog-bulk.test.ts tests/unit/worklog-api.test.ts
git commit -m "feat(worklog): bulk actions with ownership-filtered ids and honest counts"
git push
```
Expected: 21 guard tests in `worklog-api` (Task 6's 10, Task 7's 4, this task's 5, plus the
session-gating case, which now runs for a **third** route file) and 10 in `worklog-bulk`;
typecheck 0 errors, lint 0 errors / 70 warnings.

**As shipped (2026-10-26, `c7acc86`) — four corrections, and one discovery that Tasks 9–10 must
know about.**

1. The unknown-action refusal has to name what was sent. `action must be one of: delete, …`
   on its own fails this task's own `expect(why({ action: "explode", ids: [1] })).toMatch(/explode/u)`,
   so the message now carries the (truncated) value.
2. `set-task` reads `source.taskId === undefined`, not `!("taskId" in source)` — the same
   boundary convention Task 4 settled: an absent field is not a request to unlink.
3. `tsc` rejects `.set({ workedOn: body.workedOn })` and `.set({ kind: body.kind })`: those
   request fields are nullable, the columns are `NOT NULL`, and drizzle types the difference.
   Each case now narrows with a one-line guard. The plan's version does not compile.
4. The route needs `WORK_LOG_KINDS` imported for the `set-kind` message; the plan never
   imports it, which is a lint error rather than a type error.
5. **`tests/unit/worklog-reports.test.ts` changed, and this is not optional for later
   tasks.** Its "nothing manufactures history" case forbade `workedOn` appearing within 80
   characters of `updatedAt` in any `app/api/**/route.ts` that touches the log. Phase 1 could
   afford that blunt window; phase 2 legitimately writes both in one statement (a member
   re-dates a row, and the row is touched), so the rule now matches a day *derived* from the
   touch stamp — `workedOn: tasks.updatedAt`, `date(tasks.updated_at) as worked_on`, in either
   order — and asserts both directions on itself so the narrowing cannot decay into a guard
   that catches nothing. Tasks 9 and 10 write the same pair and will trip the old shape.


---

### Task 9: Deliverables CRUD — `app/api/worklog/deliverables/route.ts` + `[id]/route.ts`

A deliverable is the noun the report is written about, so it gets its own four endpoints.
The lifecycle is enforced by `DELIVERABLE_NEXT` through `pickDeliverableUpdates`, and
`owner_id` is in every `WHERE`, exactly as in Task 7.

**Files:**
- Create: `app/api/worklog/deliverables/route.ts`
- Create: `app/api/worklog/deliverables/[id]/route.ts`
- Test (append): `tests/unit/worklog-api.test.ts`

**Interfaces:**
- Consumes: `deliverables`, `workLogEntries`, `tasks` from `@/drizzle/schema`;
  `readDeliverableCreate`, `pickDeliverableUpdates`, `DELIVERABLE_MUTABLE_FIELDS` from
  `@/lib/worklog/entry-fields`; `DELIVERABLE_STATUSES`, `isDeliverableStatus`,
  `DeliverableStatus` from `@/lib/worklog/entries` (`DELIVERABLE_NEXT` is consumed by
  `pickDeliverableUpdates`, not by a route — importing it here would be a lint error);
  `isIsoDate`, `localDay` from `@/lib/worklog/local-day`; `deliverableColumns`,
  `mapDeliverable`, `worklogSession` and the envelope helpers from `../../_shared`.
- Produces:
  - `GET /api/worklog/deliverables?status=&q=&from=&to=` → `{ success: true, data: { deliverables: DeliverableDto[] } }`
  - `POST /api/worklog/deliverables` → `{ success: true, data: { deliverable: DeliverableDto } }` (201)
  - `PUT /api/worklog/deliverables/:id` → `{ success: true, data: { deliverable: DeliverableDto } }`
  - `DELETE /api/worklog/deliverables/:id` → `{ success: true, data: { id: number } }`

- [ ] **Step 1: Write the failing guard cases**

Append to `tests/unit/worklog-api.test.ts`:

```ts
describe("work log deliverables routes", () => {
  const list = () => src("app/api/worklog/deliverables/route.ts")
  const row = () => src("app/api/worklog/deliverables/[id]/route.ts")

  it("scopes both list and row routes to the owner", () => {
    expect(list()).toMatch(/eq\(deliverables\.ownerId, session\.id\)/u)
    expect(row()).toMatch(/and\(eq\(deliverables\.id, numericId\), eq\(deliverables\.ownerId, session\.id\)\)/u)
  })

  it("counts the log rows behind each deliverable", () => {
    expect(list()).toMatch(/deliverableSelect/u)
    expect(list()).toMatch(/\.select\(deliverableSelect\)/u)
    expect(row()).toMatch(/deliverableSelect/u)
  })

  it("sends status changes through the lifecycle whitelist", () => {
    expect(row()).toMatch(/pickDeliverableUpdates\(body, existing\.status as DeliverableStatus\)/u)
    expect(row()).not.toMatch(/\.set\(\{ \.\.\.body/u)
  })

  it("refuses a forward-dated producedOn", () => {
    expect(list()).toMatch(/isIsoDate/u)
    expect(list()).toMatch(/future|producedOn must/iu)
    // The same day rule at both ends of the noun's life: a save must not be able to date a
    // deliverable ahead of today when a create cannot.
    expect(row()).toMatch(/localDay/u)
    expect(row()).toMatch(/produced in the future/iu)
  })

  it("says 404 for a deliverable that is not yours", () => {
    expect(row()).toMatch(/notFound\("Deliverable not found"\)/u)
  })

  it("has no client secret surface", () => {
    expect(list()).not.toMatch(/NEXT_PUBLIC_/u)
    expect(row()).not.toMatch(/NEXT_PUBLIC_/u)
  })
})
```

Run: `npm test -- worklog-api` → FAIL (ENOENT for both files).

- [ ] **Step 2: Write the list + create route**

Create `app/api/worklog/deliverables/route.ts`:

```ts
// /api/worklog/deliverables — the named outputs a log points at.
// GET  → the member's deliverables, newest produced first, each with its row count.
// POST → one draft deliverable. owner_id and created_by are always the session.

import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks } from "@/drizzle/schema"
import { readDeliverableCreate } from "@/lib/worklog/entry-fields"
import { DELIVERABLE_STATUSES, isDeliverableStatus } from "@/lib/worklog/entries"
import { isIsoDate, localDay } from "@/lib/worklog/local-day"
import {
  badRequest,
  deliverableSelect,
  isForeignKeyViolation,
  likePattern,
  mapDeliverable,
  serverError,
  unauthorized,
  worklogSession,
} from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const params = request.nextUrl.searchParams
    const conditions: SQL[] = [eq(deliverables.ownerId, session.id)]

    const status = params.get("status")
    if (status && status !== "all") {
      if (!isDeliverableStatus(status)) {
        return badRequest(`status must be one of: ${DELIVERABLE_STATUSES.join(", ")}, or all`)
      }
      conditions.push(eq(deliverables.status, status))
    }

    const q = params.get("q")?.trim()
    if (q) {
      const pattern = likePattern(q)
      conditions.push(sql`(${deliverables.name} ilike ${pattern} or ${deliverables.evidence} ilike ${pattern})`)
    }

    const from = params.get("from")
    const to = params.get("to")
    if (from && to) {
      if (!isIsoDate(from) || !isIsoDate(to) || from > to) return badRequest("from and to must be YYYY-MM-DD dates, from first")
      conditions.push(sql`${deliverables.producedOn} between ${from} and ${to}`)
    }

    const rows = await db
      .select(deliverableSelect)
      .from(deliverables)
      .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
      .where(and(...conditions))
      .orderBy(sql`${deliverables.producedOn} desc nulls last`, desc(deliverables.id))
      .limit(500)

    return NextResponse.json({ success: true, data: { deliverables: rows.map(mapDeliverable) } })
  } catch (error) {
    return serverError(error, "fetch deliverables")
  }
}

export async function POST(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = readDeliverableCreate(body)
    if ("error" in parsed) return badRequest(parsed.error)
    const value = parsed.value

    if (value.producedOn) {
      // The member's own today, not UTC: a draft started at 23:40 must not be refused for
      // being "tomorrow" because the server clock had already crossed midnight.
      const today = localDay(new Date(), session.timezone)
      if (value.producedOn > today) return badRequest("A deliverable cannot be produced in the future.")
    }
    if (value.taskId !== null) {
      const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, value.taskId)).limit(1)
      if (!task) return badRequest("That task no longer exists.")
    }

    const [inserted] = await db
      .insert(deliverables)
      .values({ ...value, ownerId: session.id, createdBy: session.id })
      .returning({ id: deliverables.id })

    const [row] = await db
      .select(deliverableSelect)
      .from(deliverables)
      .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
      .where(eq(deliverables.id, inserted.id))
      .limit(1)

    return NextResponse.json({ success: true, data: { deliverable: mapDeliverable(row) } }, { status: 201 })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task no longer exists.")
    return serverError(error, "create deliverable")
  }
}
```

Note the `status` param is validated against the vocabulary rather than silently ignored:
the deliverable board in Task 15 drives its columns from `DELIVERABLE_STATUSES`, so a typo in
a shared URL must say so instead of rendering the unfiltered set. `… desc nulls last` is
plain Postgres, and it keeps an undated draft out of the top of a list a supervisor reads.

- [ ] **Step 3: Write the row route**

Create `app/api/worklog/deliverables/[id]/route.ts`:

```ts
// /api/worklog/deliverables/[id] — edit one deliverable, walk its lifecycle, or delete it.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, tasks } from "@/drizzle/schema"
import { pickDeliverableUpdates } from "@/lib/worklog/entry-fields"
import type { DeliverableStatus } from "@/lib/worklog/entries"
import { localDay } from "@/lib/worklog/local-day"
import {
  badRequest,
  deliverableSelect,
  isForeignKeyViolation,
  mapDeliverable,
  notFound,
  serverError,
  unauthorized,
  worklogSession,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function loadOwned(id: number, userId: number) {
  const [row] = await db
    .select(deliverableSelect)
    .from(deliverables)
    .leftJoin(tasks, eq(deliverables.taskId, tasks.id))
    .where(and(eq(deliverables.id, id), eq(deliverables.ownerId, userId)))
    .limit(1)
  return row ?? null
}

export async function PUT(request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Deliverable id must be a positive integer")

  try {
    const existing = await loadOwned(numericId, session.id)
    if (!existing) return notFound("Deliverable not found")

    const body = await request.json().catch(() => null)
    const result = pickDeliverableUpdates(body, existing.status as DeliverableStatus)
    if ("error" in result) return badRequest(result.error)

    const produced = result.patch.producedOn
    if (typeof produced === "string") {
      // The create route refuses this, so the edit route has to as well — otherwise a
      // deliverable could be walked forward into tomorrow by saving it instead of creating it.
      const today = localDay(new Date(), session.timezone)
      if (produced > today) return badRequest("A deliverable cannot be produced in the future.")
    }

    const set = { ...result.patch, updatedAt: new Date() }
    const updated = await db
      .update(deliverables)
      .set(set)
      .where(and(eq(deliverables.id, numericId), eq(deliverables.ownerId, session.id)))
      .returning({ id: deliverables.id })

    if (updated.length === 0) return notFound("Deliverable not found")
    // Re-read for the joined task title and the row count: .returning() only sees this table.
    const row = await loadOwned(numericId, session.id)
    return NextResponse.json({ success: true, data: { deliverable: mapDeliverable(row ?? existing) } })
  } catch (error) {
    if (isForeignKeyViolation(error)) return badRequest("That task no longer exists.")
    return serverError(error, "update deliverable")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  const { params } = context
  const numericId = parseId((await params).id)
  if (numericId === null) return badRequest("Deliverable id must be a positive integer")

  try {
    // The rows survive: work_log_entries.deliverable_id is ON DELETE SET NULL, so
    // deleting the noun never deletes the evidence.
    const deleted = await db
      .delete(deliverables)
      .where(and(eq(deliverables.id, numericId), eq(deliverables.ownerId, session.id)))
      .returning({ id: deliverables.id })

    if (deleted.length === 0) return notFound("Deliverable not found")
    return NextResponse.json({ success: true, data: { id: numericId } })
  } catch (error) {
    return serverError(error, "delete deliverable")
  }
}
```

Both routes read through the same `deliverableSelect` from `_shared.ts`, so the count on the
board, the count on the card after a save, and the count in Task 8's
`Convert to deliverable` response are one expression with one definition — which is the only
reason a number on this page can be trusted later by the report builder.

- [ ] **Step 4: Run the guards and gates**

```bash
npm test -- worklog-api && npm run typecheck && npm run lint && npm test
git add app/api/worklog/deliverables tests/unit/worklog-api.test.ts
git commit -m "feat(worklog): deliverables CRUD with lifecycle transitions and log row counts"
git push
```
Expected: 29 guard tests in `worklog-api` (Task 8 left 21; +6 here, and +2 because its
session-gating `it.each` re-enumerates `app/api/worklog` and found two new route files),
typecheck 0 errors, lint 0 errors / 70 warnings. Full suite: 34 files / 597 tests — the other
2 come from `schema-safety`'s per-route `it.each`, which already learned in Task 6 to treat
`worklogSession` as a gate.

**As shipped (2026-10-26, `1ce691b`) — three corrections.**

1. The list route does not import `type DeliverableStatus`. The plan's import list carries it,
   the route never uses it, and an unused import is a lint error here, not a warning. The row
   route does use it, in the `existing.status as DeliverableStatus` cast the guard pins.
2. `new Date().toISOString().slice(0, 10)` is **UTC** today. Task 6 settled that the day a
   member is allowed to write is the day in *their* timezone, and `workLogEntries` carries that
   comment in `drizzle/schema.ts` (`worked_on` is resolved through the member's timezone at
   write time). A deliverable dated against a UTC midnight is the same bug the log refused, so
   both routes now call `localDay(new Date(), session.timezone)`. The plan's version would
   refuse a 23:40 draft in Jakarta and accept a phantom "tomorrow" one in Los Angeles.
3. **The edit route refuses a forward-dated `producedOn` too, and the guard test says so.** The
   plan only checked it on create, which left `PUT` able to walk a deliverable into tomorrow
   after the fact — the same "a plan is not a log" rule, half-applied. Because
   `pickDeliverableUpdates` types the patch field as the column's insert type, the check narrows
   with `typeof produced === "string"` instead of trusting it.

`conditions` also needs the `SQL[]` annotation (the plan writes `const conditions = [eq(…)]`).
It typechecks either way in isolation — I tested that — but the annotation is what lets the
`type SQL` import stay honest and matches `entryFilters` in `_shared.ts`, which the same review
process reads next to it.

---

### Task 10: Summary — `lib/worklog/summary.ts` + `app/api/worklog/summary/route.ts`

Six sections render from one payload. The arithmetic is a pure function so the numbers on
the streak, the gap list and the totals can be tested without a database; the route only
fetches rows and hands them over. Task events are scoped by `actor_id`, so the "what moved"
feed shows what this member did, not what happened to their tasks by someone else's hand.

**Files:**
- Create: `lib/worklog/summary.ts`
- Create: `app/api/worklog/summary/route.ts`
- Test: `tests/unit/worklog-summary.test.ts`
- Test (append): `tests/unit/worklog-api.test.ts`

**Interfaces:**
- Consumes: `EntryDto`, `DayBucket`, `DisciplineBucket`, `KindBucket`, `TaskBucket`,
  `countByKind`, `gapDays`, `groupByDay`, `groupByTask`, `minutesTotal`, `openBlockerCount`,
  `streakOf`, `unlinkedCount` from `./entries`; `rangeDays` from `./local-day`;
  `parseViewState`, `resolveRange`, `viewDays` from `./view-state`. The route also uses
  `entryColumns`, `entryFilters`, `mapEntry`, `serverError`, `unauthorized`, `worklogSession`
  from `../_shared` and `taskEvents`, `tasks`, `workLogEntries` from `@/drizzle/schema`.
- Produces:
  - `TransitionDto`, `WorklogSummary`, `buildSummary(input): WorklogSummary`
  - `GET /api/worklog/summary?<view-state params>` → `{ success: true, data: WorklogSummary }`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/worklog-summary.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { buildSummary, type EntryDto, type TransitionDto } from "@/lib/worklog/summary"
import { rangeDays } from "@/lib/worklog/local-day"

const DAYS = rangeDays("2026-10-19", "2026-10-25")

function entry(over: Partial<EntryDto>): EntryDto {
  return {
    id: 1,
    workedOn: "2026-10-19",
    taskId: null,
    taskTitle: null,
    kind: "action",
    title: "Racked a switch",
    body: null,
    discipline: "technician",
    minutes: 30,
    deliverableId: null,
    playbookId: null,
    playbookVersion: null,
    links: [],
    source: "manual",
    redatedAt: null,
    createdAt: "2026-10-19T06:00:00.000Z",
    ...over,
  }
}

const transition = (over: Partial<TransitionDto>): TransitionDto => ({
  id: 1,
  taskId: 7,
  taskTitle: "Replace the patch panel",
  fromStatus: "in_progress",
  toStatus: "review",
  at: "2026-10-20T08:00:00.000Z",
  source: "route",
  ...over,
})

describe("buildSummary", () => {
  it("keeps every day of the range, empty ones included", () => {
    const out = buildSummary({ entries: [], days: DAYS, from: "2026-10-19", to: "2026-10-25", todayIso: "2026-10-25" })
    expect(out.days).toHaveLength(7)
    expect(out.days[0]).toEqual({ day: "2026-10-19", count: 0, minutes: 0, entries: [] })
    expect(out.totals).toEqual({ entries: 0, minutes: 0, activeDays: 0 })
  })

  it("counts all six kinds even when a kind has no rows", () => {
    const out = buildSummary({ entries: [entry({})], days: DAYS, from: "2026-10-19", to: "2026-10-25", todayIso: "2026-10-25" })
    expect(out.kinds).toHaveLength(6)
    expect(out.kinds.find((k) => k.kind === "review")?.count).toBe(0)
  })

  it("totals minutes across the whole range", () => {
    const out = buildSummary({
      entries: [entry({ minutes: 45 }), entry({ minutes: 90, workedOn: "2026-10-21" })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.totals.minutes).toBe(135)
    expect(out.totals.entries).toBe(2)
    expect(out.totals.activeDays).toBe(2)
  })

  it("lists the empty days inside the range as gaps", () => {
    const out = buildSummary({
      entries: [entry({ workedOn: "2026-10-19" }), entry({ workedOn: "2026-10-22" })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.gaps).toEqual(["2026-10-20", "2026-10-21", "2026-10-23", "2026-10-24", "2026-10-25"])
  })

  it("does not let a future day extend the streak", () => {
    const out = buildSummary({
      entries: [entry({ workedOn: "2026-10-24" }), entry({ workedOn: "2026-10-25" }), entry({ workedOn: "2026-10-26" })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.streak.current).toBe(2)
  })

  it("keeps an unlinked bucket last in the task rollup", () => {
    const out = buildSummary({
      entries: [entry({ taskId: 3, taskTitle: "Audit", minutes: 60 }), entry({ taskId: null, minutes: 15 })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.tasks.map((t) => t.taskTitle)).toEqual(["Audit", null])
    expect(out.tasks[1].minutes).toBe(15)
    expect(out.unlinked).toBe(1)
  })

  it("counts a blocker as open only while it has no deliverable attached", () => {
    const out = buildSummary({
      entries: [entry({ kind: "blocker" }), entry({ kind: "blocker", deliverableId: 4 })],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
    })
    expect(out.openBlockers).toBe(1)
  })

  it("returns newest transition first", () => {
    const out = buildSummary({
      entries: [],
      days: DAYS,
      from: "2026-10-19",
      to: "2026-10-25",
      todayIso: "2026-10-25",
      transitions: [transition({ at: "2026-10-20T08:00:00.000Z" }), transition({ id: 2, at: "2026-10-23T08:00:00.000Z" })],
    })
    expect(out.transitions.map((t) => t.id)).toEqual([2, 1])
  })

  it("carries the requested range back to the page", () => {
    const out = buildSummary({ entries: [], days: DAYS, from: "2026-10-19", to: "2026-10-25", todayIso: "2026-10-25" })
    expect(out.range).toEqual({ from: "2026-10-19", to: "2026-10-25" })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-summary`
Expected: FAIL — `Failed to load url @/lib/worklog/summary`.

- [ ] **Step 3: Write the module**

Create `lib/worklog/summary.ts`:

```ts
// The arithmetic behind six sections of the work log page and the /dashboard "Today" strip.
// Pure: it takes rows already read through the ownership filter and returns buckets, so a
// wrong number is a test failure rather than a query nobody can re-run.

import {
  countByKind,
  gapDays,
  groupByDay,
  groupByTask,
  minutesByDiscipline,
  minutesTotal,
  openBlockerCount,
  streakOf,
  unlinkedCount,
  type DayBucket,
  type DisciplineBucket,
  type EntryDto,
  type KindBucket,
  type TaskBucket,
} from "./entries"

// The page and the tests both speak in EntryDto; re-exporting keeps one source of truth.
export type { EntryDto } from "./entries"

export type TransitionDto = {
  id: number
  taskId: number
  taskTitle: string | null
  fromStatus: string
  toStatus: string
  at: string
  source: string
}

export type WorklogSummary = {
  range: { from: string; to: string }
  totals: { entries: number; minutes: number; activeDays: number }
  days: DayBucket[]
  kinds: KindBucket[]
  disciplines: DisciplineBucket[]
  tasks: TaskBucket[]
  gaps: string[]
  streak: { current: number; longest: number }
  unlinked: number
  openBlockers: number
  transitions: TransitionDto[]
}

export function buildSummary(input: {
  entries: readonly EntryDto[]
  days: readonly string[]
  from: string
  to: string
  todayIso: string
  transitions?: readonly TransitionDto[]
}): WorklogSummary {
  const days = groupByDay(input.entries, input.days)
  const activeDays = days.filter((d) => d.count > 0).map((d) => d.day)

  // A day after today cannot be part of a habit yet, and a preset range such as
  // "this month" always contains some.
  const pastActive = activeDays.filter((d) => d <= input.todayIso)

  const transitions = [...(input.transitions ?? [])].sort((a, b) => b.at.localeCompare(a.at))

  return {
    range: { from: input.from, to: input.to },
    totals: { entries: input.entries.length, minutes: minutesTotal(input.entries), activeDays: activeDays.length },
    days,
    kinds: countByKind(input.entries),
    disciplines: minutesByDiscipline(input.entries),
    tasks: groupByTask(input.entries),
    gaps: gapDays(input.days, activeDays),
    streak: streakOf(pastActive, input.todayIso),
    unlinked: unlinkedCount(input.entries),
    openBlockers: openBlockerCount(input.entries),
    transitions,
  }
}
```

The test imports `EntryDto` from this module rather than from `./entries`, which is why the
re-export line is above: a section that renders a summary should not have to know which
vocabulary module the row shape came from.

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-summary`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write the failing route guards**

Append to `tests/unit/worklog-api.test.ts`:

```ts
describe("work log summary route", () => {
  const route = () => src("app/api/worklog/summary/route.ts")

  it("reads entries through the shared filter vocabulary", () => {
    expect(route()).toMatch(/entryFilters\(state, session\.id, from, to\)/u)
  })

  it("scopes task history to the actor, not just the task", () => {
    expect(route()).toMatch(/eq\(taskEvents\.actorId, session\.id\)/u)
  })

  it("bounds the history window in the member's own timezone", () => {
    expect(route()).toMatch(/rangeBoundsUtc\(from, to, session\.timezone\)/u)
    expect(route()).toMatch(/gte\(taskEvents\.at, bounds\.start\)/u)
    expect(route()).toMatch(/lte\(taskEvents\.at, bounds\.end\)/u)
  })

  it("lets the pure module do the arithmetic", () => {
    expect(route()).toMatch(/buildSummary/u)
    expect(route()).toMatch(/viewDays/u)
  })

  it("has no client secret surface", () => {
    expect(route()).not.toMatch(/NEXT_PUBLIC_/u)
  })
})
```

Run: `npm test -- worklog-api` → FAIL (ENOENT for the summary route).

- [ ] **Step 6: Write the route**

Create `app/api/worklog/summary/route.ts`:

```ts
// /api/worklog/summary — one payload for the totals, streak, heat, splits, coverage and
// "what moved" sections. Filters come from the same query string the page renders, so a
// shared URL reproduces the numbers and the list underneath them.

import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { taskEvents, tasks, workLogEntries } from "@/drizzle/schema"
import { localDay, rangeBoundsUtc } from "@/lib/worklog/local-day"
import { buildSummary, type TransitionDto } from "@/lib/worklog/summary"
import { parseViewState, resolveRange, viewDays } from "@/lib/worklog/view-state"
import { entryColumns, entryFilters, mapEntry, serverError, unauthorized, worklogSession } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await worklogSession()
  if (!session) return unauthorized()

  try {
    const today = localDay(new Date(), session.timezone)
    const state = parseViewState(request.nextUrl.searchParams, today)
    const { from, to } = resolveRange(state, today)

    const rows = await db
      .select(entryColumns)
      .from(workLogEntries)
      .leftJoin(tasks, eq(workLogEntries.taskId, tasks.id))
      .where(and(...entryFilters(state, session.id, from, to)))
      .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.id))
      .limit(1000)
    const entries = rows.map(mapEntry)

    const bounds = rangeBoundsUtc(from, to, session.timezone)
    const events = await db
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
      .where(and(eq(taskEvents.actorId, session.id), gte(taskEvents.at, bounds.start), lte(taskEvents.at, bounds.end)))
      .orderBy(desc(taskEvents.at))
      .limit(200)

    const transitions: TransitionDto[] = events.map((e) => ({ ...e, at: e.at.toISOString() }))

    return NextResponse.json({
      success: true,
      data: buildSummary({ entries, days: viewDays(state, today), from, to, todayIso: today, transitions }),
    })
  } catch (error) {
    return serverError(error, "summarise work log")
  }
}
```

`viewDays` rather than `rangeDays` because the heat section needs whole weeks around a short
range: a seven-day week that starts on Friday must still render seven lanes, and `gapDays`
over the real grid is what makes an untouched weekend visible instead of hiding it.

- [ ] **Step 7: Run the guards and gates**

```bash
npm test -- worklog-summary worklog-api && npm run typecheck && npm run lint && npm test
git add lib/worklog/summary.ts app/api/worklog/summary tests/unit/worklog-summary.test.ts tests/unit/worklog-api.test.ts
git commit -m "feat(worklog): summary payload with streaks, gaps and timezone-bounded task history"
git push
```
Expected: 9 summary tests, 27 guard tests, typecheck 0 errors, lint 0 errors / 70 warnings.

---

### Task 11: The 75-discipline registry — `lib/roles.ts` + `app/globals.css`

Every section that mentions a discipline (the filter, the split, the badge, later the Gantt lane)
reads one vocabulary. Phase 1 shipped five members because five roles were in scope; the work log
is industry-agnostic, so the registry widens to the 75 standard work disciplines grouped into 10
categories before the page lands.

Two things make this safe rather than destructive:

- The five existing ids are kept **verbatim**. They are stored in `tasks.discipline`,
  `work_log_entries.discipline` and `deliverables.discipline`, so renaming one would be a data
  migration. Nothing here renames or removes anything.
- Because the change is purely additive, rows and saved `preferences.workDisciplines` written
  before this task stay valid, and a member who never opened settings sees all 75 (an absent key
  means "all"). There is no migration script to write, and `varchar(40)` already fits the longest
  new id (`electrical_engineering`, 22 characters).

`DISCIPLINE_META` is typed `Record<WorkDiscipline, …>`, so an id without its label, icon and
category is a compile error rather than a runtime blank — that is the validation the registry
needs, and the display maps below are derived from it so they cannot drift.

**Files:**
- Modify: `lib/roles.ts:44-106`
- Modify: `app/globals.css:56-60` (light `:root` chart series) and `app/globals.css:100-103` (dark)
- Modify: `lib/task-updates.ts:128` and `lib/worklog/entry-fields.ts` (Task 4's `readDiscipline`)
- Test: `tests/unit/roles.test.ts` (replace the `work disciplines` describe block)

**Interfaces:**
- Consumes: nothing — this is the root of the vocabulary.
- Produces: `DISCIPLINE_CATEGORIES`, `type DisciplineCategory`, `DISCIPLINE_CATEGORY_LABEL`,
  `DISCIPLINE_CATEGORY_COLOUR`, `WORK_DISCIPLINES` (75 ids), `type WorkDiscipline`,
  `DISCIPLINE_LABEL`, `DISCIPLINE_ICON`, `DISCIPLINE_CATEGORY`, `DISCIPLINE_COLOUR`,
  `DISCIPLINE_TEMPLATE`, `disciplinesInCategory()`, `DISCIPLINE_HINT`, `DEFAULT_DISCIPLINE`,
  `isWorkDiscipline()`, `normaliseDiscipline()`. Task 12's filter, Task 2's
  `minutesByDiscipline` and Task 15's split section consume the maps; nothing else may re-declare
  a discipline name.

- [ ] **Step 1: Replace the registry tests**

In `tests/unit/roles.test.ts`, swap the whole `describe("work disciplines", …)` block (lines
76–109) for this, and extend the import list with `DISCIPLINE_CATEGORIES`,
`DISCIPLINE_CATEGORY`, `DISCIPLINE_CATEGORY_LABEL`, `disciplinesInCategory`:

```ts
describe("work disciplines", () => {
  it("is the only discipline vocabulary the app has: 75 unique members", () => {
    expect(WORK_DISCIPLINES).toHaveLength(75)
    expect(new Set(WORK_DISCIPLINES).size).toBe(75)
  })

  it("keeps the five ids phase 1 wrote into the database", () => {
    // These strings are row data in tasks/work_log_entries/deliverables. A rename here is a
    // migration, so the test exists to make an accidental one loud.
    for (const id of ["developer", "technician", "designer", "auditor", "coordinator"]) {
      expect(WORK_DISCIPLINES).toContain(id)
    }
    expect(DISCIPLINE_LABEL.developer).toBe("Software Development")
    expect(DISCIPLINE_LABEL.technician).toBe("Technical Support")
    expect(DISCIPLINE_LABEL.designer).toBe("Design & UX")
    expect(DISCIPLINE_LABEL.auditor).toBe("Audit & Assurance")
    expect(DISCIPLINE_LABEL.coordinator).toBe("Coordination")
  })

  it("labels, colours, names an icon and a category for every member", () => {
    for (const discipline of WORK_DISCIPLINES) {
      expect(DISCIPLINE_LABEL[discipline]).toBeTruthy()
      expect(DISCIPLINE_COLOUR[discipline]).toMatch(/^hsl\(var\(--chart-[a-z]+\)\)$/u)
      expect(DISCIPLINE_ICON[discipline]).toMatch(/^[A-Z][A-Za-z]+$/u)
      expect(DISCIPLINE_TEMPLATE[discipline]).toBeTruthy()
      expect(DISCIPLINE_CATEGORIES).toContain(DISCIPLINE_CATEGORY[discipline])
    }
  })

  it("partitions into the ten categories without losing or inventing a member", () => {
    const groups = DISCIPLINE_CATEGORIES.map(disciplinesInCategory)
    expect(groups.every((group) => group.length > 0)).toBe(true)
    expect(groups.flat().sort()).toEqual([...WORK_DISCIPLINES].sort())
    expect(DISCIPLINE_CATEGORIES).toHaveLength(10)
  })

  it("labels every category and gives it a colour", () => {
    for (const category of DISCIPLINE_CATEGORIES) {
      expect(DISCIPLINE_CATEGORY_LABEL[category]).toBeTruthy()
      expect(DISCIPLINE_CATEGORY_COLOUR[category]).toMatch(/^hsl\(var\(--chart-[a-z]+\)\)$/u)
    }
  })

  it("defines each category colour in both themes", () => {
    const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8")
    for (const category of DISCIPLINE_CATEGORIES) {
      const token = DISCIPLINE_CATEGORY_COLOUR[category].replace(/^hsl\(var\(--/, "").replace(/\)\)$/, "")
      expect(css.split(token).length - 1).toBeGreaterThanOrEqual(3)
    }
  })

  it("fits the varchar(40) columns that store an id", () => {
    for (const id of WORK_DISCIPLINES) expect(id.length).toBeLessThanOrEqual(40)
  })

  it("defaults to the general template so nobody gets an empty report", () => {
    expect(DEFAULT_DISCIPLINE).toBe("coordinator")
    expect(DISCIPLINE_TEMPLATE.coordinator).toBe("general")
  })

  it("accepts a member in any casing and rejects a job title", () => {
    expect(isWorkDiscipline("technician")).toBe(true)
    expect(isWorkDiscipline("Tech-Nician")).toBe(false)
    expect(isWorkDiscipline("engineer")).toBe(false)
    expect(normaliseDiscipline(" DEVELOPER ")).toBe("developer")
    // A job title is a person, not a classification: it is not a discipline.
    expect(normaliseDiscipline("senior software engineer")).toBeNull()
    expect(normaliseDiscipline("nurse")).toBeNull()
    expect(normaliseDiscipline(null)).toBeNull()
    expect(normaliseDiscipline(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- roles`
Expected: FAIL — `WORK_DISCIPLINES` has 5 members, `DISCIPLINE_CATEGORIES` is not exported.

- [ ] **Step 3: Add the six chart tokens**

In `app/globals.css`, extend the light `:root` chart series block (after `--chart-moss`) and the
`.dark` block (after its `--chart-moss`). Every value is an HSL channel triplet, and the dark
values are lighter than the light ones because the badges set the token as text on a card:

```css
    /* light */
    --chart-slate: 215 18% 34%;
    --chart-teal: 186 24% 30%;
    --chart-bark: 24 22% 30%;
    --chart-plum: 320 16% 34%;
    --chart-sage: 76 18% 32%;
    --chart-ochre: 44 46% 40%;
```

```css
    /* dark */
    --chart-slate: 212 22% 58%;
    --chart-teal: 186 26% 55%;
    --chart-bark: 26 28% 58%;
    --chart-plum: 320 20% 62%;
    --chart-sage: 76 22% 60%;
    --chart-ochre: 44 52% 60%;
```

- [ ] **Step 4: Write the registry**

Replace `lib/roles.ts:44-106` (everything from the `// ---- Work disciplines` comment to the end
of `normaliseDiscipline`) with:

```ts
// ---- Work disciplines -------------------------------------------------------------
// The one vocabulary for "what kind of work is this". A person may hold several; the
// viewer filter is a preference, not a fork of the app (design §2, §6) and never an
// authorization boundary — every read is scoped by user id in SQL regardless of it.
// Values are the strings stored in tasks.discipline, work_log_entries.discipline and
// deliverables.discipline, so renaming one is a migration, not an edit.
//
// Job titles, departments and project roles are different dimensions and do not live
// here: a "Senior Accountant" (title) in "Finance" (department) who is "Project Lead"
// (project role) still logs work classified `finance`, `auditor` or `analyst`.
export const DISCIPLINE_CATEGORIES = [
  "delivery",
  "technology",
  "information",
  "finance",
  "operations",
  "engineering",
  "market",
  "people",
  "science",
  "services",
] as const
export type DisciplineCategory = (typeof DISCIPLINE_CATEGORIES)[number]

export const DISCIPLINE_CATEGORY_LABEL: Record<DisciplineCategory, string> = {
  delivery: "Management & project delivery",
  technology: "Software, IT & digital",
  information: "Analysis, research & information",
  finance: "Finance, audit & commercial",
  operations: "Operations & supply chain",
  engineering: "Engineering & built works",
  market: "Sales, marketing & customer",
  people: "People, administration & governance",
  science: "Health, science & specialist services",
  services: "Creative, service & industry work",
}

// A category owns the colour, not each discipline: ten families stay legible in a chart,
// seventy-five hues do not. Every token is declared in light and dark in app/globals.css.
export const DISCIPLINE_CATEGORY_COLOUR: Record<DisciplineCategory, string> = {
  delivery: "hsl(var(--chart-pine))",
  technology: "hsl(var(--chart-slate))",
  information: "hsl(var(--chart-teal))",
  finance: "hsl(var(--chart-moss))",
  operations: "hsl(var(--chart-stone))",
  engineering: "hsl(var(--chart-bark))",
  market: "hsl(var(--chart-clay))",
  people: "hsl(var(--chart-plum))",
  science: "hsl(var(--chart-sage))",
  services: "hsl(var(--chart-ochre))",
}

// Report template per category — read by lib/reports/templates.ts in phase 3.
const CATEGORY_TEMPLATE: Record<DisciplineCategory, string> = {
  delivery: "general",
  technology: "engineering",
  information: "assurance",
  finance: "assurance",
  operations: "technical",
  engineering: "engineering",
  market: "creative",
  people: "general",
  science: "technical",
  services: "creative",
}

export const WORK_DISCIPLINES = [
  // Management, leadership & project delivery
  "executive",
  "manager",
  "product",
  "program",
  "portfolio",
  "coordinator",
  "team_lead",
  "change_management",
  // Software, IT & digital technology
  "developer",
  "architect",
  "designer",
  "technician",
  "it_operations",
  "devops",
  "networking",
  "security",
  "data_engineering",
  "ai_ml",
  "database",
  "tester",
  // Business analysis, research & information
  "analyst",
  "researcher",
  "data_analyst",
  "data_science",
  "monitoring_evaluation",
  "information_management",
  "content",
  "communications",
  // Finance, accounting, audit & commercial management
  "finance",
  "auditor",
  "tax",
  "treasury",
  "procurement",
  "commercial",
  "cost_control",
  "risk_management",
  // Operations, supply chain & logistics
  "operations",
  "supply_chain",
  "logistics",
  "inventory",
  "facilities",
  "maintenance",
  "quality_management",
  "production",
  // Engineering, construction & physical infrastructure
  "civil_engineering",
  "construction",
  "electrical_engineering",
  "mechanical_engineering",
  "surveying",
  "environmental",
  "health_safety",
  // Sales, marketing, customer service & growth
  "sales",
  "marketing",
  "customer_success",
  "customer_support",
  "digital_marketing",
  "partnerships",
  // Human resources, administration & legal
  "human_resources",
  "learning_development",
  "administration",
  "legal",
  "compliance",
  "ethics",
  // Healthcare, science & specialist services
  "healthcare",
  "public_health",
  "laboratory",
  "pharmaceutical",
  "agriculture",
  "education",
  // Creative, service & industry-specific work
  "creative",
  "hospitality",
  "retail",
  "energy",
  "community_development",
  "general",
] as const
export type WorkDiscipline = (typeof WORK_DISCIPLINES)[number]

type DisciplineMeta = { label: string; icon: string; category: DisciplineCategory }

// Record<WorkDiscipline, …> is the validation: add an id without its metadata and this
// object no longer typechecks, so a missing label can never reach a member's screen.
// Every icon name below was checked against the installed lucide-react exports (75 unique,
// 0 missing) because this module must not import the package itself.
const DISCIPLINE_META: Record<WorkDiscipline, DisciplineMeta> = {
  executive: { label: "Executive Leadership", icon: "Crown", category: "delivery" },
  manager: { label: "Project Management", icon: "ClipboardList", category: "delivery" },
  product: { label: "Product Management", icon: "Compass", category: "delivery" },
  program: { label: "Program Management", icon: "Layers", category: "delivery" },
  portfolio: { label: "Portfolio Management", icon: "Briefcase", category: "delivery" },
  coordinator: { label: "Coordination", icon: "Users", category: "delivery" },
  team_lead: { label: "Team Leadership", icon: "UserCheck", category: "delivery" },
  change_management: { label: "Change Management", icon: "Shuffle", category: "delivery" },
  developer: { label: "Software Development", icon: "Code2", category: "technology" },
  architect: { label: "Solutions & Systems Architecture", icon: "DraftingCompass", category: "technology" },
  designer: { label: "Design & UX", icon: "Palette", category: "technology" },
  technician: { label: "Technical Support", icon: "Wrench", category: "technology" },
  it_operations: { label: "IT Operations", icon: "ServerCog", category: "technology" },
  devops: { label: "DevOps & Infrastructure", icon: "GitBranch", category: "technology" },
  networking: { label: "Networking & Telecommunications", icon: "Network", category: "technology" },
  security: { label: "Cybersecurity", icon: "ShieldCheck", category: "technology" },
  data_engineering: { label: "Data Engineering", icon: "DatabaseZap", category: "technology" },
  ai_ml: { label: "AI & Machine Learning", icon: "BrainCircuit", category: "technology" },
  database: { label: "Database Administration", icon: "Database", category: "technology" },
  tester: { label: "Quality Assurance & Testing", icon: "Bug", category: "technology" },
  analyst: { label: "Business & Systems Analysis", icon: "ClipboardCheck", category: "information" },
  researcher: { label: "Research & Investigation", icon: "Microscope", category: "information" },
  data_analyst: { label: "Data Analysis & Business Intelligence", icon: "BarChart3", category: "information" },
  data_science: { label: "Data Science & Statistics", icon: "Sigma", category: "information" },
  monitoring_evaluation: { label: "Monitoring, Evaluation & Learning", icon: "Target", category: "information" },
  information_management: { label: "Information & Records Management", icon: "FolderTree", category: "information" },
  content: { label: "Content & Technical Documentation", icon: "FileText", category: "information" },
  communications: { label: "Communications & Public Relations", icon: "Megaphone", category: "information" },
  finance: { label: "Finance & Accounting", icon: "Wallet", category: "finance" },
  auditor: { label: "Audit & Assurance", icon: "SearchCheck", category: "finance" },
  tax: { label: "Tax Management & Compliance", icon: "Receipt", category: "finance" },
  treasury: { label: "Treasury & Cash Management", icon: "Landmark", category: "finance" },
  procurement: { label: "Procurement & Purchasing", icon: "ShoppingCart", category: "finance" },
  commercial: { label: "Commercial & Contract Management", icon: "FileSignature", category: "finance" },
  cost_control: { label: "Cost Estimation & Control", icon: "Calculator", category: "finance" },
  risk_management: { label: "Enterprise Risk Management", icon: "ShieldAlert", category: "finance" },
  operations: { label: "Business Operations", icon: "Workflow", category: "operations" },
  supply_chain: { label: "Supply Chain Management", icon: "Boxes", category: "operations" },
  logistics: { label: "Logistics & Transportation", icon: "Truck", category: "operations" },
  inventory: { label: "Inventory & Warehouse Management", icon: "Package", category: "operations" },
  facilities: { label: "Facilities & Property Management", icon: "Building2", category: "operations" },
  maintenance: { label: "Maintenance & Asset Management", icon: "Hammer", category: "operations" },
  quality_management: { label: "Quality Management", icon: "BadgeCheck", category: "operations" },
  production: { label: "Production & Manufacturing", icon: "Factory", category: "operations" },
  civil_engineering: { label: "Civil & Structural Engineering", icon: "Ruler", category: "engineering" },
  construction: { label: "Construction & Site Management", icon: "HardHat", category: "engineering" },
  electrical_engineering: { label: "Electrical Engineering", icon: "Zap", category: "engineering" },
  mechanical_engineering: { label: "Mechanical Engineering", icon: "Cog", category: "engineering" },
  surveying: { label: "Surveying & Geospatial Services", icon: "Map", category: "engineering" },
  environmental: { label: "Environmental Management", icon: "Leaf", category: "engineering" },
  health_safety: { label: "Occupational Health & Safety", icon: "Siren", category: "engineering" },
  sales: { label: "Sales & Business Development", icon: "TrendingUp", category: "market" },
  marketing: { label: "Marketing & Brand Management", icon: "BadgePercent", category: "market" },
  customer_success: { label: "Customer Success & Account Management", icon: "HeartHandshake", category: "market" },
  customer_support: { label: "Customer Support & Service", icon: "Headphones", category: "market" },
  digital_marketing: { label: "Digital Marketing & E-commerce", icon: "MousePointerClick", category: "market" },
  partnerships: { label: "Partnerships & Stakeholder Engagement", icon: "Handshake", category: "market" },
  human_resources: { label: "Human Resources & People Operations", icon: "UserPlus", category: "people" },
  learning_development: { label: "Learning & Development", icon: "GraduationCap", category: "people" },
  administration: { label: "Administration & Office Management", icon: "Inbox", category: "people" },
  legal: { label: "Legal Services", icon: "Scale", category: "people" },
  compliance: { label: "Regulatory Compliance & Governance", icon: "FileCheck", category: "people" },
  ethics: { label: "Ethics & Safeguarding", icon: "ScrollText", category: "people" },
  healthcare: { label: "Healthcare & Clinical Services", icon: "Stethoscope", category: "science" },
  public_health: { label: "Public Health & Health Programs", icon: "HeartPulse", category: "science" },
  laboratory: { label: "Laboratory & Scientific Services", icon: "FlaskConical", category: "science" },
  pharmaceutical: { label: "Pharmaceutical & Medical Products", icon: "Pill", category: "science" },
  agriculture: { label: "Agriculture & Agribusiness", icon: "Sprout", category: "science" },
  education: { label: "Education & Training Delivery", icon: "BookOpen", category: "science" },
  creative: { label: "Creative & Media Production", icon: "PenTool", category: "services" },
  hospitality: { label: "Hospitality & Events", icon: "UtensilsCrossed", category: "services" },
  retail: { label: "Retail & Store Operations", icon: "Store", category: "services" },
  energy: { label: "Energy & Utilities", icon: "Flame", category: "services" },
  community_development: { label: "Community Development & Social Impact", icon: "Globe", category: "services" },
  general: { label: "General & Unclassified Work", icon: "HelpCircle", category: "services" },
}

const mapMeta = <K extends keyof DisciplineMeta>(
  key: K,
): Record<WorkDiscipline, DisciplineMeta[K]> =>
  Object.fromEntries(WORK_DISCIPLINES.map((id) => [id, DISCIPLINE_META[id][key]])) as Record<
    WorkDiscipline,
    DisciplineMeta[K]
  >

export const DISCIPLINE_LABEL = mapMeta("label")
export const DISCIPLINE_ICON = mapMeta("icon")
export const DISCIPLINE_CATEGORY = mapMeta("category")

// Every palette token in app/globals.css is an HSL channel triplet, so it is consumed
// wrapped — a bare var() here is an invalid colour and renders nothing.
export const DISCIPLINE_COLOUR: Record<WorkDiscipline, string> = Object.fromEntries(
  WORK_DISCIPLINES.map((id) => [id, DISCIPLINE_CATEGORY_COLOUR[DISCIPLINE_META[id].category]]),
) as Record<WorkDiscipline, string>

export const DISCIPLINE_TEMPLATE: Record<WorkDiscipline, string> = Object.fromEntries(
  WORK_DISCIPLINES.map((id) => [id, CATEGORY_TEMPLATE[DISCIPLINE_META[id].category]]),
) as Record<WorkDiscipline, string>

export function disciplinesInCategory(category: DisciplineCategory): WorkDiscipline[] {
  return WORK_DISCIPLINES.filter((id) => DISCIPLINE_META[id].category === category)
}

// One message for both write whitelists. Listing 75 ids in an API error would swallow the
// sentence it belongs to.
export const DISCIPLINE_HINT =
  "discipline must be a known work discipline (see lib/roles.ts), or null to clear it"

export const DEFAULT_DISCIPLINE: WorkDiscipline = "coordinator"

export function isWorkDiscipline(value: unknown): value is WorkDiscipline {
  return typeof value === "string" && (WORK_DISCIPLINES as readonly string[]).includes(value)
}

/** Exact match after trimming; unknown values are null, never a silent default. */
export function normaliseDiscipline(value: unknown): WorkDiscipline | null {
  if (typeof value !== "string") return null
  const candidate = value.trim().toLowerCase()
  return isWorkDiscipline(candidate) ? candidate : null
}
```

`DEFAULT_DISCIPLINE` stays `coordinator` and its category maps to the `general` template, so the
existing default-report behaviour and `tests/unit/worklog-reports.test.ts:97` (exactly one file
declares `WORK_DISCIPLINES = [`) both still hold.

- [ ] **Step 5: Point the two rejection messages at the hint**

`lib/task-updates.ts` — replace the template literal built from `WORK_DISCIPLINES.join(", ")` in
the `case "discipline":` branch, and drop `WORK_DISCIPLINES` from the import list if nothing else
in the file uses it (an unused import is a lint error):

```ts
        if (!isWorkDiscipline(candidate)) {
          return { error: DISCIPLINE_HINT }
        }
```

In `lib/worklog/entry-fields.ts` (Task 4), `readDiscipline` does the same:

```ts
  if (!isWorkDiscipline(candidate)) return { error: DISCIPLINE_HINT }
```

and its import becomes `import { DISCIPLINE_HINT, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"`.

Then relax the one assertion that counted the old list, in `tests/unit/task-updates.test.ts`:

```ts
  it("rejects a discipline outside WORK_DISCIPLINES rather than storing a new word", () => {
    const result = pickTaskUpdates({ discipline: "engineer" })
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toMatch(/discipline/u)
  })
```

- [ ] **Step 6: Run the registry tests**

Run: `npm test -- roles task-updates`
Expected: PASS — 9 registry cases, and the task-updates case still rejects a job title.

- [ ] **Step 7: Run the gates and commit**

```bash
npm run typecheck && npm run lint && npm test
git add lib/roles.ts lib/task-updates.ts lib/worklog/entry-fields.ts app/globals.css tests/unit/roles.test.ts tests/unit/task-updates.test.ts
git commit -m "feat(roles): 75 work disciplines in 10 category groups"
git push
```
Expected: typecheck 0 errors, lint 0 errors / 70 warnings unchanged, the full suite green.
`lib/worklog/entry-fields.ts` is only present if Task 4 already landed; if it has not, do this
task after Task 4 and skip that path here.

---

### Task 12: The page, the URL, and sections 1–4

`app/dashboard/worklog/page.tsx` stays a server file whose only job is the Suspense boundary
`useSearchParams` requires; every control, fetch and mutation lives in `worklog-client.tsx`.
This task lands the four sections that make the page usable on its own — totals, quick add,
filters, view toolbar — and the data layer every later section reads from.

**Files:**
- Modify: `components/dashboard-layout.tsx` (add the nav item)
- Create: `app/dashboard/worklog/page.tsx`
- Create: `app/dashboard/worklog/worklog-client.tsx`
- Create: `app/dashboard/worklog/sections.tsx`
- Test (create): `tests/unit/worklog-page.test.ts`

**Interfaces:**
- Consumes: `serializeViewState`, `parseViewState`, `defaultViewState`, `resolveRange`,
  `PRESET_LABEL`, `WORKLOG_VIEWS`, `RANGE_PRESETS`, `ViewState`, `WorklogView` from
  `@/lib/worklog/view-state`; `EntryDto`, `DeliverableDto`, `KIND_LABEL`, `KIND_COLOUR`,
  `WORK_LOG_KINDS`, `DELIVERABLE_STATUSES`, `DELIVERABLE_LABEL_STATUS`, `formatMinutes` from
  `@/lib/worklog/entries`; `WorklogSummary` from `@/lib/worklog/summary`; `parseQuickAdd` from
  `@/lib/worklog/quick-add`; `shiftDays`, `weekStartIso`, `localDay` from
  `@/lib/worklog/local-day`; `WORK_DISCIPLINES` from `@/lib/roles`; `SectionCard`,
  `EmptyNote` from `@/components/dashboard-kit`; `useToast` from `@/hooks/use-toast`.
- Produces (used by Tasks 13–17):
  - `WorklogClient()` — the only component that holds page state: `state`, `todayIso`, `entries`,
    `deliverables`, `summary`, `tasks`, `loading`, `saving`, and the `selection` set Tasks 13 and
    15 add row buttons to
  - `readJson(res)` / `mutate(path, init)` — module-local helpers; `mutate` returns an error
    message or `null`, so every section reports failures the same way
  - `WorklogSkeleton()` in `sections.tsx`, plus `KindBadge`, `EntryLine` and `EmptySection`
    exported for Tasks 13–15 (they are rendered there, not left idle)
  - the four section components `TotalsSection`, `QuickAddSection`, `FilterSection`,
    `ViewToolbarSection` and the `DisciplinePicker` inside the filter

- [ ] **Step 1: Write the failing guard cases**

Create `tests/unit/worklog-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

describe("work log page shell", () => {
  const page = () => src("app/dashboard/worklog/page.tsx")

  it("wraps the search-param client in Suspense", () => {
    expect(page()).toMatch(/<Suspense fallback=\{<WorklogSkeleton \/>}\>/u)
    expect(page()).toMatch(/<WorklogClient \/>/u)
    expect(page()).not.toMatch(/"use client"/u)
  })

  it("is dynamic so the member's own session is never cached", () => {
    expect(page()).toMatch(/export const dynamic = "force-dynamic"/u)
  })
})

describe("work log client", () => {
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")

  it("mirrors every control into the query string", () => {
    expect(client()).toMatch(/useSearchParams/u)
    expect(client()).toMatch(/serializeViewState\(state, todayIso\)/u)
    expect(client()).toMatch(/router\.replace\(url, \{ scroll: false \}\)/u)
  })

  it("only rewrites the URL when the query actually differs", () => {
    // Without this the replace re-renders, the effect re-runs, and the page loops.
    expect(client()).toMatch(/next !== window\.location\.search/u)
  })

  it("adopts the URL only when it disagrees with local state", () => {
    // A router.replace pushes new search params back into this same effect; adopting them
    // unconditionally would overwrite a control the member just touched.
    expect(client()).toMatch(/serializeViewState\(parsed, todayIso\) !== incoming/u)
  })

  it("reads all four endpoints through one fetch set", () => {
    expect(client()).toMatch(/fetch\(`\/api\/worklog\/entries\?\$\{qs\}`\)/u)
    expect(client()).toMatch(/fetch\(`\/api\/worklog\/summary\?\$\{qs\}`\)/u)
    expect(client()).toMatch(/"\/api\/worklog\/deliverables"/u)
    expect(client()).toMatch(/"\/api\/tasks"/u)
  })

  it("takes the member's day and timezone from the server, not the browser", () => {
    expect(client()).toMatch(/setTodayIso\(entriesJson\.data\.today\)/u)
    expect(client()).toMatch(/setTimezone\(entriesJson\.data\.timezone\)/u)
    expect(client()).toMatch(/localDay\(new Date\(\), timezone\)/u)
  })

  it("has no dead affordances", () => {
    const code = client()
    expect(code).not.toMatch(/href="#"/u)
    expect(code).not.toMatch(/TODO|coming soon|not implemented/iu)
    expect(code).not.toMatch(/dispatchEvent\(new CustomEvent/u)
  })

  it("uses the repo's sentinel grammar for selects", () => {
    expect(client()).not.toMatch(/SelectItem value=""/u)
  })

  it("narrows the 75 disciplines through the category picker", () => {
    const sections = src("app/dashboard/worklog/sections.tsx")
    expect(sections).toMatch(/disciplinesInCategory/u)
    expect(sections).toMatch(/DISCIPLINE_LABEL/u)
    expect(client()).toMatch(/<DisciplinePicker /u)
    // A flat 75-row select is unusable; the grouping is the control.
    expect(sections).not.toMatch(/WORK_DISCIPLINES\.map/u)
  })

  it("keeps presentation out of the client", () => {
    expect(src("app/dashboard/worklog/sections.tsx")).not.toMatch(/fetch\(/u)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-page`
Expected: FAIL — ENOENT for `app/dashboard/worklog/page.tsx`.

- [ ] **Step 3: Add the nav item**

In `components/dashboard-layout.tsx`, add `CalendarCheck` to the `lucide-react` import list
(it is not imported yet), then insert the item into the `Main` category between **Tasks** and
**Backlog**:

```tsx
        {
          title: "Work Log",
          icon: <CalendarCheck className="h-5 w-5" />,
          href: "/dashboard/worklog",
          active: pathname === "/dashboard/worklog",
        },
```

- [ ] **Step 4: Write the page shell**

Create `app/dashboard/worklog/page.tsx`:

```tsx
import { Suspense } from "react"
import { DisciplinePicker, WorklogSkeleton } from "./sections"
import WorklogClient from "./worklog-client"

export const dynamic = "force-dynamic"

export default function WorklogPage() {
  return (
    <Suspense fallback={<WorklogSkeleton />}>
      <WorklogClient />
    </Suspense>
  )
}
```

- [ ] **Step 5: Write the shared presentational pieces**

Create `app/dashboard/worklog/sections.tsx`:

```tsx
"use client"

// Presentation only: no fetch and no page data. The client owns the data, this file owns the
// look, so a section can be restyled without touching a mutation path. The one piece of local
// state here is the discipline group in `DisciplinePicker`, which is a way of finding a value
// among 75 options and is deliberately never sent anywhere.

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { KIND_COLOUR, KIND_LABEL, formatMinutes, type EntryDto, type WorkLogKind } from "@/lib/worklog/entries"
import type { ViewState } from "@/lib/worklog/view-state"

export function WorklogSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  )
}

export function KindBadge({ kind }: { kind: WorkLogKind }) {
  return (
    <Badge
      variant="outline"
      className="border-transparent text-[10px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: `color-mix(in srgb, ${KIND_COLOUR[kind]} 15%, transparent)`,
        color: KIND_COLOUR[kind],
      }}
    >
      {KIND_LABEL[kind]}
    </Badge>
  )
}

export function EntryLine({
  entry,
  selected = false,
  onToggle,
  onEdit,
  onDelete,
  onConvert,
}: {
  entry: EntryDto
  selected?: boolean
  // Every action is optional: a view that has no handlers renders a row with no checkbox and
  // no buttons, so an unwired control can never reach a member's screen.
  onToggle?: (id: number) => void
  onEdit?: (entry: EntryDto) => void
  onDelete?: (entry: EntryDto) => void
  onConvert?: (entry: EntryDto) => void
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
      {onToggle ? (
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[hsl(var(--chart-pine))]"
          checked={selected}
          aria-label={`Select ${entry.title}`}
          onChange={() => onToggle(entry.id)}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={entry.kind} />
          <span className="text-sm font-medium leading-snug">{entry.title}</span>
        </div>
        {entry.body ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{entry.body}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {entry.workedOn}
          </span>
          <span>{entry.minutes === null ? "no time" : formatMinutes(entry.minutes)}</span>
          {entry.taskTitle ? (
            <a href={`/dashboard/tasks?task=${entry.taskId}`} className="underline underline-offset-2 hover:text-foreground">
              {entry.taskTitle}
            </a>
          ) : (
            <span>unlinked</span>
          )}
          {entry.deliverableId ? <span>· deliverable #{entry.deliverableId}</span> : null}
          {entry.redatedAt ? <span title={entry.redatedAt}>· re-dated</span> : null}
        </div>
      </div>
      {onEdit ? (
        <div className="flex shrink-0 gap-1">
          <button type="button" className="rounded p-1 text-xs underline underline-offset-2 hover:bg-muted" onClick={() => onEdit(entry)}>
            Edit
          </button>
          {onConvert && entry.kind !== "deliverable" && entry.deliverableId === null ? (
            <button type="button" className="rounded p-1 text-xs underline underline-offset-2 hover:bg-muted" onClick={() => onConvert(entry)}>
              To deliverable
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="rounded p-1 text-xs text-destructive underline underline-offset-2 hover:bg-muted"
              onClick={() => onDelete(entry)}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function EmptySection({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <EmptyNote>Nothing logged here yet. Quick add above takes one line.</EmptyNote>
    </SectionCard>
  )
}

// Seventy-five disciplines will not fit a readable dropdown, so the group comes first: the
// category narrows the list below it and is never itself a filter — the URL carries one
// `discipline` param, which is what the API reads.
export function DisciplinePicker({
  value,
  onChange,
}: {
  value: ViewState["discipline"]
  onChange: (discipline: ViewState["discipline"]) => void
}) {
  const [group, setGroup] = useState<DisciplineCategory | "all">(
    value === "all" ? "all" : DISCIPLINE_CATEGORY[value],
  )

  const options = group === "all" ? [] : disciplinesInCategory(group)

  const pickGroup = (next: DisciplineCategory | "all") => {
    setGroup(next)
    // Staying on a discipline that just left the list would show one filter and send another.
    if (value !== "all" && DISCIPLINE_CATEGORY[value] !== next) onChange("all")
  }

  return (
    <>
      <Select value={group} onValueChange={(v) => pickGroup(v as DisciplineCategory | "all")}>
        <SelectTrigger className="h-8 text-xs" aria-label="Discipline group">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All groups</SelectItem>
          {DISCIPLINE_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {DISCIPLINE_CATEGORY_LABEL[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ViewState["discipline"])}
        disabled={group === "all"}
      >
        <SelectTrigger className="h-8 text-xs" aria-label="Work discipline">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {group === "all" ? "Pick a group first" : "Any discipline in this group"}
          </SelectItem>
          {options.map((discipline) => (
            <SelectItem key={discipline} value={discipline}>
              {DISCIPLINE_LABEL[discipline]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
```

- [ ] **Step 6: Write the client with sections 1–4**

Create `app/dashboard/worklog/worklog-client.tsx`:

```tsx
"use client"

// The work log: what a member did, on the day they say they did it. State lives here, the
// URL is the state's serialised form, and every mutation goes through mutate() so a failure
// reads the same wherever it happens.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, Copy, RefreshCw, SlidersHorizontal, Sparkles, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import { localDay, shiftDays } from "@/lib/worklog/local-day"
import { parseQuickAdd } from "@/lib/worklog/quick-add"
import {
  DELIVERABLE_LABEL_STATUS,
  DELIVERABLE_STATUSES,
  KIND_LABEL,
  WORK_LOG_KINDS,
  formatMinutes,
  type DeliverableDto,
  type DeliverableStatus,
  type EntryDto,
  type WorkLogKind,
} from "@/lib/worklog/entries"
import type { WorklogSummary } from "@/lib/worklog/summary"
import {
  PRESET_LABEL,
  RANGE_PRESETS,
  VIEW_LABEL,
  WORKLOG_VIEWS,
  defaultViewState,
  parseViewState,
  resolveRange,
  serializeViewState,
  type ViewState,
  type WorklogView,
} from "@/lib/worklog/view-state"
import { DisciplinePicker, WorklogSkeleton } from "./sections"

export type TaskOption = { id: number; title: string }

async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null)
}

export default function WorklogClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()

  // Until the first response arrives, the browser's own zone is the best guess; the server
  // answers with users.timezone and every day label is recomputed from it.
  const [timezone, setTimezone] = useState<string | null>(null)
  const [todayIso, setTodayIso] = useState(() => localDay(new Date(), null))
  useEffect(() => {
    setTodayIso(localDay(new Date(), timezone))
  }, [timezone])

  const [state, setState] = useState<ViewState>(() => defaultViewState(localDay(new Date(), null)))
  const [entries, setEntries] = useState<EntryDto[]>([])
  const [deliverables, setDeliverables] = useState<DeliverableDto[]>([])
  const [summary, setSummary] = useState<WorklogSummary | null>(null)
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // The state this client last wrote into the URL. A router.replace feeds new search params
  // back into the effect below; without this the page would adopt its own echo and undo a
  // control the member had just touched.
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const incoming = search.toString()
    const parsed = parseViewState(new URLSearchParams(incoming), todayIso)
    if (serializeViewState(parsed, todayIso) !== incoming) setState(parsed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, todayIso])

  useEffect(() => {
    const next = serializeViewState(state, todayIso)
    const target = next ? `/dashboard/worklog?${next}` : "/dashboard/worklog"
    if (next !== window.location.search) router.replace(target, { scroll: false })
  }, [state, todayIso, router])

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

  const refresh = useCallback(async () => {
    setLoading(true)
    const qs = serializeViewState(state, todayIso)
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/worklog/entries?${qs}`),
        fetch(`/api/worklog/summary?${qs}`),
      ])
      const entriesJson = await readJson(entriesRes)
      if (!entriesJson?.success) throw new Error(entriesJson?.message ?? "Could not load your work log")
      setEntries(entriesJson.data.entries as EntryDto[])
      setTimezone(entriesJson.data.timezone as string | null)
      setTodayIso(entriesJson.data.today as string)
      const summaryJson = await readJson(summaryRes)
      if (summaryJson?.success) setSummary(summaryJson.data as WorklogSummary)
      const deliverablesJson = await readJson(await fetch("/api/worklog/deliverables"))
      if (deliverablesJson?.success) {
        setDeliverables(deliverablesJson.data.deliverables as DeliverableDto[])
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Work log", description: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }, [state, todayIso, toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    fetch("/api/tasks?pageSize=200")
      .then(readJson)
      .then((json) => {
        if (!json?.success) return
        setTasks(
          (json.data as { id: number; title: string }[]).map((t) => ({ id: t.id, title: t.title })).slice(0, 200),
        )
      })
      .catch(() => {
        /* the task filter offers nothing; every other control still works */
      })
  }, [])

  const patchState = useCallback(
    (patch: Partial<ViewState>) => setState((prev) => ({ ...prev, ...patch })),
    [],
  )

  const range = resolveRange(state, todayIso)
  const deliverableById = useMemo(
    () => new Map(deliverables.map((d) => [d.id, d])),
    [deliverables],
  )

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TotalsSection summary={summary} loading={loading} range={range} todayIso={todayIso} />
      <QuickAddSection
        todayIso={todayIso}
        saving={saving}
        setSaving={setSaving}
        mutate={mutate}
        refresh={refresh}
        toast={toast}
      />
      <FilterSection
        state={state}
        patchState={patchState}
        tasks={tasks}
        deliverableCount={deliverables.length}
      />
      <ViewToolbarSection
        state={state}
        patchState={patchState}
        todayIso={todayIso}
        refresh={refresh}
        toast={toast}
      />
    </div>
  )
}

export { WorklogSkeleton }
```

`readJson` returns `any` on purpose: the three endpoints share the `{ success, data | message }`
envelope, and each call site narrows it once with `json?.success` before reading `data`. The
`deliverableById` map is built here and passed to the day view in Task 13, which is where a row's
deliverable label is rendered.

- [ ] **Step 7: Write the four section components**

Append to `app/dashboard/worklog/worklog-client.tsx` (below the client, same file — they read
the same imports and nothing else needs them):

```tsx
function TotalsSection({
  summary,
  loading,
  range,
  todayIso,
}: {
  summary: WorklogSummary | null
  loading: boolean
  range: { from: string; to: string }
  todayIso: string
}) {
  const todayRows = summary?.days.find((d) => d.day === todayIso)
  return (
    <SectionCard
      title="This period"
      icon={<CalendarDays className="h-4 w-4" />}
      action={
        <span className="text-[11px] text-muted-foreground">
          {range.from === range.to ? range.from : `${range.from} → ${range.to}`}
        </span>
      }
    >
      {loading && !summary ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Entries" value={String(summary?.totals.entries ?? 0)} />
            <Stat label="Time logged" value={formatMinutes(summary?.totals.minutes ?? 0)} />
            <Stat label="Active days" value={String(summary?.totals.activeDays ?? 0)} />
            <Stat label="Longest streak" value={`${summary?.streak.longest ?? 0}d`} />
          </div>
          <p className="text-xs text-muted-foreground">
            Today: {todayRows?.count ?? 0} {todayRows?.count === 1 ? "entry" : "entries"} ·{" "}
            {formatMinutes(todayRows?.minutes ?? 0)} · current streak {summary?.streak.current ?? 0} day
            {(summary?.streak.current ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </SectionCard>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function QuickAddSection({
  todayIso,
  saving,
  setSaving,
  mutate,
  refresh,
  toast,
}: {
  todayIso: string
  saving: boolean
  setSaving: (v: boolean) => void
  mutate: (path: string, init?: RequestInit) => Promise<string | null>
  refresh: () => Promise<void>
  toast: ReturnType<typeof useToast>["toast"]
}) {
  const [line, setLine] = useState("")
  const [kind, setKind] = useState<WorkLogKind | "auto">("auto")
  const [taskId, setTaskId] = useState("none")

  const submit = async () => {
    const parsed = parseQuickAdd(line)
    if ("error" in parsed) {
      toast({ variant: "destructive", title: "Quick add", description: parsed.error })
      return
    }
    setSaving(true)
    const body = {
      workedOn: todayIso,
      title: parsed.value.title,
      minutes: parsed.value.minutes,
      kind: kind === "auto" ? parsed.value.kind : kind,
      taskId: taskId === "none" ? null : Number(taskId),
    }
    const error = await mutate("/api/worklog/entries", { method: "POST", body: JSON.stringify(body) })
    setSaving(false)
    if (error) {
      toast({ variant: "destructive", title: "Quick add", description: error })
      return
    }
    setLine("")
    await refresh()
    toast({ title: "Logged", description: `${body.title}` })
  }

  return (
    <SectionCard title="Quick add" icon={<Sparkles className="h-4 w-4" />}>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Label htmlFor="quick-add" className="sr-only">
          What did you do?
        </Label>
        <Input
          id="quick-add"
          placeholder="Fixed the failing build #90 #action"
          value={line}
          onChange={(event) => setLine(event.target.value)}
          disabled={saving}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as WorkLogKind | "auto")}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Kind from tags</SelectItem>
              {WORK_LOG_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">
            <Timer className="mr-1 inline h-3 w-3" aria-hidden />
            #90 = 90 minutes
          </span>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Log it"}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}

function FilterSection({
  state,
  patchState,
  tasks,
  deliverableCount,
}: {
  state: ViewState
  patchState: (patch: Partial<ViewState>) => void
  tasks: TaskOption[]
  deliverableCount: number
}) {
  const active =
    (state.q.trim() ? 1 : 0) +
    (state.kind !== "all" ? 1 : 0) +
    (state.discipline !== "all" ? 1 : 0) +
    (state.taskId !== null ? 1 : 0) +
    (state.deliverableStatus !== "all" ? 1 : 0) +
    (state.hasDeliverable ? 1 : 0)

  const clearAll = () =>
    patchState({
      q: "",
      kind: "all",
      discipline: "all",
      taskId: null,
      deliverableStatus: "all",
      hasDeliverable: false,
    })

  return (
    <SectionCard
      title="Find in the log"
      icon={<SlidersHorizontal className="h-4 w-4" />}
      action={
        active > 0 ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>
            Clear {active}
          </Button>
        ) : null
      }
    >
      <div className="space-y-2">
        <Label htmlFor="worklog-search" className="sr-only">
          Search titles and notes
        </Label>
        <Input
          id="worklog-search"
          placeholder="Search titles and notes"
          value={state.q}
          onChange={(event) => patchState({ q: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={state.kind} onValueChange={(v) => patchState({ kind: v as WorkLogKind | "all" })}>
            <SelectTrigger className="h-8 text-xs" aria-label="Entry kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {WORK_LOG_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={state.taskId === null ? "all" : String(state.taskId)}
            onValueChange={(v) => patchState({ taskId: v === "all" ? null : Number(v) })}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Task">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any task</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.title.slice(0, 40)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={state.deliverableStatus}
            onValueChange={(v) => patchState({ deliverableStatus: v as DeliverableStatus | "all" })}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Deliverable state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any deliverable state</SelectItem>
              {DELIVERABLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {DELIVERABLE_LABEL_STATUS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DisciplinePicker value={state.discipline} onChange={(d) => patchState({ discipline: d })} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant={state.hasDeliverable ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            aria-pressed={state.hasDeliverable}
            onClick={() => patchState({ hasDeliverable: !state.hasDeliverable })}
          >
            {state.hasDeliverable ? "Linked only" : "Any deliverable link"}
          </Button>
          <span className="text-[11px] text-muted-foreground">{deliverableCount} deliverables on file</span>
        </div>
      </div>
    </SectionCard>
  )
}


function ViewToolbarSection({
  state,
  patchState,
  todayIso,
  refresh,
  toast,
}: {
  state: ViewState
  patchState: (patch: Partial<ViewState>) => void
  todayIso: string
  refresh: () => Promise<void>
  toast: ReturnType<typeof useToast>["toast"]
}) {
  const copyLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "This view opens exactly here." })
    } catch {
      // A browser that blocks the clipboard still gets the link, and it is never lost.
      window.prompt("Copy this view's link", url)
    }
  }

  return (
    <SectionCard
      title="View"
      icon={<CalendarDays className="h-4 w-4" />}
      action={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void refresh()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Reload</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void copyLink()}>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Copy link to this view</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {WORKLOG_VIEWS.map((v) => (
            <Button
              key={v}
              variant={state.view === v ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              aria-pressed={state.view === v}
              onClick={() => patchState({ view: v as WorklogView })}
            >
              {VIEW_LABEL[v]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => patchState({ day: shiftDays(state.day, -1) })}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Previous day</span>
          </Button>
          <span className="min-w-24 text-center text-xs font-medium tabular-nums">{state.day}</span>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => patchState({ day: shiftDays(state.day, 1) })}>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Next day</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => patchState({ day: todayIso })} disabled={state.day === todayIso}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGE_PRESETS.map((p) => (
            <Button
              key={p}
              variant={state.preset === p ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[11px]"
              aria-pressed={state.preset === p}
              onClick={() => patchState({ preset: p })}
            >
              {PRESET_LABEL[p]}
            </Button>
          ))}
        </div>
        {state.preset === "custom" ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-8 w-40 text-xs"
              value={state.from ?? ""}
              max={todayIso}
              onChange={(event) => patchState({ from: event.target.value || null })}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-8 w-40 text-xs"
              value={state.to ?? ""}
              max={todayIso}
              onChange={(event) => patchState({ to: event.target.value || null })}
            />
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}
```

Two details in that file are deliberate.

The task filter has one sentinel, `"all"`, and every other value is a real numeric id —
`parseViewState` only accepts a `task` param matching `/^\d+$/`, so a hand-typed negative value
falls back to "any task" instead of sending something the API would reject. There is no
"unlinked only" option here because the API has no such predicate; the Day view lists unlinked
rows under their own heading and section 14 counts them.

`DisciplinePicker` keeps its group choice in local state on purpose. The URL and the API speak
one discipline at a time (`?discipline=procurement`), so a group is a way to find that value
among 75, not a second filter — and picking a group that no longer contains the selected
discipline clears the selection rather than showing one thing and sending another.

This task lands sections 1–4 only. Section 5 and the four other view bodies arrive in Task 13, the row actions and bulk bar in
Tasks 14–15, and sections 6–11 in Task 16. Each of those lands as its own commit, so the
deployed route is never left with a control that does nothing: `EmptySection` and `EntryLine`
exported from `sections.tsx` are first rendered by Task 13, and an `EntryLine` without handlers
renders no buttons at all.

- [ ] **Step 8: Run the guards and gates**

```bash
npm test -- worklog-page && npm run typecheck && npm run lint && npm test
git add components/dashboard-layout.tsx app/dashboard/worklog tests/unit/worklog-page.test.ts
git commit -m "feat(worklog): work log page with URL-synced view state, quick add and filters"
git push
```
Expected: 12 page guards, typecheck 0 errors, lint 0 errors / 70 warnings. Visit
`/dashboard/worklog` in the deployed app — the four sections render, quick add writes a real
row, and the URL changes with every control. Visual check is the owner's.

### Task 13: The view slot — day, week, list, board and heat (section 5)

One section, five renderings. The `View` toolbar (section 4) switches between them and the
mirror in the URL (`?v=week`) is what makes a view shareable. Every body reads the same
`DayBucket[]` the summary endpoint already builds, so no body can disagree with the totals.

**Files:**
- Modify: `app/dashboard/worklog/sections.tsx`
- Modify: `app/dashboard/worklog/worklog-client.tsx`
- Test: `tests/unit/worklog-page.test.ts` (append the cases below)

**Interfaces:**
- Consumes: `DayBucket`, `EntryDto`, `KIND_LABEL`, `formatMinutes` from `@/lib/worklog/entries`;
  `VIEW_LABEL`, `WorklogView`, `ViewState` from `@/lib/worklog/view-state`; `DISCIPLINE_LABEL`
  from `@/lib/roles`; `EmptyNote`, `SectionCard` from `@/components/dashboard-kit`.
- Produces: `LogSection({ view, days, loading, todayIso, onPickDay })` in `sections.tsx`, plus the
  read-only row bodies `DayBody`, `WeekBody`, `ListBody`, `BoardBody`, `HeatBody`. Task 14 adds the
  optional action props (`onEdit`/`onDelete`/`onConvert`/`onToggle`/`selection`) to `LogSection`,
  which forwards them to `EntryLine`; Task 16 does not touch this file's exports.

- [ ] **Step 1: Write the failing guard cases**

Append to `tests/unit/worklog-page.test.ts` (inside the `work log client` describe it would read
as noise — keep these in their own describe so a failure names the view that broke):

```ts
describe("work log views", () => {
  const sections = () => src("app/dashboard/worklog/sections.tsx")
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")

  it("renders the active view in one section slot", () => {
    expect(client()).toMatch(/<LogSection/u)
    expect(client()).toMatch(/title=\{VIEW_LABEL\[state\.view\]\}/u)
  })

  it("builds all five bodies", () => {
    for (const name of ["DayBody", "WeekBody", "ListBody", "BoardBody", "HeatBody"]) {
      expect(sections()).toContain(`function ${name}(`)
    }
    expect(sections()).toMatch(/case "heat":/u)
  })

  it("lets a week or heat cell jump to that day", () => {
    expect(sections()).toMatch(/onPickDay=\{day\}/u)
    expect(client()).toMatch(/patchState\(\{ day, view: "day" \}\)/u)
  })

  it("never encodes a value in colour alone", () => {
    const code = sections()
    // Every tinted cell also carries its number as text.
    expect(code).toMatch(/\{bucket\.count\}/u)
    expect(code).toMatch(/formatMinutes\(bucket\.minutes\)/u)
    expect(code).toMatch(/border-border\/60/u)
  })

  it("says what an empty range means instead of showing a blank card", () => {
    const code = sections()
    expect(code).toMatch(/Nothing logged on/u)
    expect(code).toMatch(/EmptyNote/u)
  })

  it("keeps presentation honest: no fetch, no page data", () => {
    expect(sections()).not.toMatch(/fetch\(/u)
    expect(sections()).not.toMatch(/useRouter/u)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-page`
Expected: FAIL — `LogSection` is not rendered by the client yet.

- [ ] **Step 3: Write the bodies**

Append to `app/dashboard/worklog/sections.tsx`. `HeatBody` and `WeekBody` read `days` (the whole
range, empty days included, as the summary builds it), so a quiet week is visible as a quiet week
rather than as a shorter list:

```tsx
function DayList({ entries }: { entries: EntryDto[] }) {
  if (entries.length === 0) {
    return <EmptyNote>Nothing logged on this day yet. Quick add above, or the day picker in View.</EmptyNote>
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <EntryLine key={entry.id} entry={entry} />
      ))}
    </ul>
  )
}

function DayBody({ days, day }: { days: DayBucket[]; day: string }) {
  const bucket = days.find((d) => d.day === day)
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {day} · {bucket?.count ?? 0} {(bucket?.count ?? 0) === 1 ? "entry" : "entries"} ·{" "}
        {formatMinutes(bucket?.minutes ?? 0)}
      </p>
      <DayList entries={bucket?.entries ?? []} />
    </div>
  )
}

function WeekBody({
  days,
  loading,
  onPickDay,
}: {
  days: DayBucket[];
  loading: boolean;
  onPickDay: (day: string) => void
}) {
  const week = days.slice(0, 7)
  if (!loading && week.every((bucket) => bucket.count === 0)) {
    return <EmptyNote>Nothing logged in this week. Nothing to move — try another week.</EmptyNote>
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {week.map((bucket) => (
        <div key={bucket.day} className="rounded-lg border border-border/60 bg-background/40 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-full justify-between px-1 text-[11px] font-semibold"
            onClick={() => onPickDay(bucket.day)}
          >
            <span>{bucket.day.slice(5)}</span>
            <span className="tabular-nums text-muted-foreground">
              {bucket.count} · {formatMinutes(bucket.minutes)}
            </span>
          </Button>
          <ul className="mt-1 space-y-1">
            {bucket.entries.slice(0, 3).map((entry) => (
              <li key={entry.id} className="truncate text-[11px]" title={entry.title}>
                {entry.title}
              </li>
            ))}
            {bucket.entries.length > 3 ? (
              // Plain text, not a link: the day it would open is already one click away in the
              // header above, and a second control for the same thing is noise.
              <li className="text-[11px] text-muted-foreground">+{bucket.entries.length - 3} more</li>
            ) : null}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ListBody({ days }: { days: DayBucket[] }) {
  const filled = days.filter((bucket) => bucket.count > 0)
  if (filled.length === 0) {
    return <EmptyNote>Nothing logged in this range. Widen it in View, or clear a filter.</EmptyNote>
  }
  return (
    <div className="space-y-3">
      {filled.map((bucket) => (
        <div key={bucket.day}>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold tabular-nums">{bucket.day}</h4>
            <span className="text-[11px] text-muted-foreground">
              {bucket.count} entries · {formatMinutes(bucket.minutes)}
            </span>
          </div>
          <ul className="mt-1.5 space-y-2">
            {bucket.entries.map((entry) => (
              <EntryLine key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function BoardBody({ days }: { days: DayBucket[] }) {
  const entries = days.flatMap((bucket) => bucket.entries)
  const kinds = WORK_LOG_KINDS.map((kind) => ({
    kind,
    rows: entries.filter((entry) => entry.kind === kind),
  }))
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {kinds.map(({ kind, rows }) => (
        <div key={kind} className="rounded-lg border border-border/60 bg-background/40 p-2">
          <div className="flex items-center justify-between gap-2">
            <KindBadge kind={kind} />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {rows.length} · {formatMinutes(rows.reduce((sum, e) => sum + (e.minutes ?? 0), 0))}
            </span>
          </div>
          {rows.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">No {KIND_LABEL[kind].toLowerCase()} logged.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {rows.map((entry) => (
                <EntryLine key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

function HeatBody({
  days,
  todayIso,
  onPickDay,
}: {
  days: DayBucket[];
  todayIso: string;
  onPickDay: (day: string) => void
}) {
  const busiest = Math.max(1, ...days.map((bucket) => bucket.minutes))
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((bucket) => {
          const ratio = bucket.minutes / busiest
          return (
            <button
              key={bucket.day}
              type="button"
              onClick={() => onPickDay(bucket.day)}
              title={`${bucket.day} · ${bucket.count} entries · ${formatMinutes(bucket.minutes)}`}
              className={
                "flex h-9 flex-col items-center justify-center rounded border border-border/60 text-[10px] tabular-nums transition-colors hover:border-foreground " +
                (bucket.day === todayIso ? "outline outline-1 outline-offset-1" : "")
              }
              style={{
                // The number is the reading; the tint is only a hint, so a colour-blind member
                // still sees the difference between an empty day and a six-hour one.
                backgroundColor:
                  bucket.count === 0
                    ? "transparent"
                    : `color-mix(in srgb, hsl(var(--chart-pine)) ${Math.round(12 + ratio * 55)}%, transparent)`,
              }}
            >
              <span>{Number(bucket.day.slice(8))}</span>
              <span className={bucket.count === 0 ? "text-muted-foreground" : "font-semibold"}>
                {bucket.count}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {days.length} days shown · click a day to open it. The number is entries logged.
      </p>
    </div>
  )
}

export function LogSection({
  view,
  days,
  loading,
  todayIso,
  onPickDay,
}: {
  view: WorklogView;
  days: DayBucket[];
  loading: boolean;
  todayIso: string;
  onPickDay: (day: string) => void;
}) {
  const body = (() => {
    switch (view) {
      case "day":
        return <DayBody days={days} day={todayIso} />
      case "week":
        return <WeekBody days={days} loading={loading} onPickDay={onPickDay} />
      case "list":
        return <ListBody days={days} />
      case "board":
        return <BoardBody days={days} />
      case "heat":
        return <HeatBody days={days} todayIso={todayIso} onPickDay={onPickDay} />
    }
  })()

  return (
    <SectionCard
      title={`${VIEW_LABEL[view]} view`}
      icon={<CalendarDays className="h-4 w-4" />}
      className="md:col-span-2 xl:col-span-3"
    >
      {loading && days.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        body
      )}
    </SectionCard>
  )
}
```

`DayBody` takes the day to show as a prop, so Task 14 can pass the picker's day; until then
`LogSection` hands it `todayIso`. Note the switch is exhaustive over `WorklogView`, so adding a
sixth view without a body is a compile error rather than a blank card.

- [ ] **Step 4: Render it in the client**

In `app/dashboard/worklog/worklog-client.tsx`, add `LogSection` to the `./sections` import, extend
the `view-days` selector the client already owns, and put the slot after the four sections:

```tsx
  const viewDaysList = useMemo(() => summary?.days ?? [], [summary])
```

```tsx
      <ViewToolbarSection
        state={state}
        patchState={patchState}
        todayIso={todayIso}
        refresh={refresh}
        toast={toast}
      />
      <LogSection
        view={state.view}
        days={viewDaysList}
        loading={loading}
        todayIso={state.view === "day" ? state.day : todayIso}
        onPickDay={(day) => patchState({ day, view: "day" })}
      />
```

The day the Day view shows is `state.day` (the picker in section 4), while the other four bodies
stay on the member's real today for their "is this today" highlight.

- [ ] **Step 5: Run the guards**

Run: `npm test -- worklog-page`
Expected: PASS — 12 Task-12 guards plus 6 new view guards.

- [ ] **Step 6: Gates and commit**

```bash
npm run typecheck && npm run lint && npm test
git add app/dashboard/worklog tests/unit/worklog-page.test.ts
git commit -m "feat(worklog): day, week, list, board and calendar heat views"
git push
```
Expected: typecheck 0 errors, lint 0 errors / 70 warnings, full suite green.

---

### Task 14: Row actions — `dialogs.tsx`, edit, delete and convert

A row is a record, so it must be correctable. This task turns on the controls `EntryLine` has been
carrying as optional props: Edit opens a real form, Delete asks for confirmation in the app (never
`window.confirm`), and To deliverable promotes the row through the bulk endpoint, which is the only
place that write is transactional.

**Files:**
- Create: `app/dashboard/worklog/dialogs.tsx`
- Modify: `app/dashboard/worklog/worklog-client.tsx`
- Test: `tests/unit/worklog-page.test.ts`

**Interfaces:**
- Consumes: `EntryDto`, `WORK_LOG_KINDS`, `KIND_LABEL`, `type WorkLogKind` from
  `@/lib/worklog/entries`; `DISCIPLINE_LABEL`, `WORK_DISCIPLINES`, `type WorkDiscipline` from
  `@/lib/roles`; `DisciplinePicker`, `LogSection` from `./sections`; `TaskOption` from the client;
  `Dialog`, `AlertDialog` pieces from `@/components/ui/*`.
- Produces: `EntryDraft`, `EntryDialog`, `ConfirmDelete` in `dialogs.tsx`; `LogSection` gains the
  optional `selection`/`onToggle`/`onEdit`/`onDelete`/`onConvert` props and forwards them to every
  `EntryLine`. Task 15 reads the client's `selection` and `toggleSelect`.

- [ ] **Step 1: Write the failing guard cases**

Append to `tests/unit/worklog-page.test.ts`:

```ts
describe("work log dialogs", () => {
  const dialogs = () => src("app/dashboard/worklog/dialogs.tsx")
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")

  it("labels every field and never uses a native prompt", () => {
    const code = dialogs()
    expect(code).toMatch(/<Label htmlFor="entry-title"/u)
    expect(code).toMatch(/<Label htmlFor="entry-minutes"/u)
    expect(code).toMatch(/<Label htmlFor="entry-day"/u)
    expect(code).toMatch(/aria-describedby=\{titleError/u)
    expect(client()).not.toMatch(/window\.(confirm|alert|prompt)\(/u)
  })

  it("sends a new row to POST and an existing one to PUT", () => {
    expect(client()).toMatch(/method: "POST"/u)
    expect(client()).toMatch(/`\$\{mutateBase\}\/\$\{draft\.id\}`/u)
    expect(client()).toMatch(/method: "PUT"/u)
    expect(client()).toMatch(/method: "DELETE"/u)
  })

  it("keeps a blank minutes field null instead of zero", () => {
    // A zero-minute entry claims the member logged no time; a null claims they did not say.
    expect(client()).toMatch(/minutes\.trim\(\) === "" \? null : Number\(minutes\.trim\(\)\)/u)
  })

  it("converts a row through the bulk endpoint, in one transaction", () => {
    expect(client()).toMatch(/"\/api\/worklog\/entries\/bulk"/u)
    expect(client()).toMatch(/action: "convert-deliverable"/u)
  })

  it("asks before destroying a row", () => {
    expect(client()).toMatch(/setPendingDelete/u)
    expect(dialogs()).toMatch(/AlertDialogAction/u)
    expect(dialogs()).toMatch(/Delete entry/u)
  })

  it("turns the row controls on only where the client passes handlers", () => {
    expect(client()).toMatch(/onEdit=\{openEntry\}/u)
    expect(client()).toMatch(/onDelete=\{setPendingDelete\}/u)
    expect(client()).toMatch(/onConvert=\{convertEntry\}/u)
    expect(client()).toMatch(/onToggle=\{toggleSelect\}/u)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-page`
Expected: FAIL — ENOENT for `app/dashboard/worklog/dialogs.tsx`.

- [ ] **Step 3: Give `LogSection` its action props**

In `app/dashboard/worklog/sections.tsx`, widen `LogSection` and thread the handlers down to the
three bodies that render rows (`DayBody`, `ListBody`, `BoardBody`). Their props objects gain:

```tsx
type RowActions = {
  selection?: number[]
  onToggle?: (id: number) => void
  onEdit?: (entry: EntryDto) => void
  onDelete?: (entry: EntryDto) => void
  onConvert?: (entry: EntryDto) => void
}
```

and every `<EntryLine key={entry.id} entry={entry} />` becomes:

```tsx
  <EntryLine
    key={entry.id}
    entry={entry}
    selected={actions.selection?.includes(entry.id) ?? false}
    onToggle={actions.onToggle}
    onEdit={actions.onEdit}
    onDelete={actions.onDelete}
    onConvert={actions.onConvert}
  />
```

`LogSection`'s signature gains `actions: RowActions` (one object, so Task 15 does not re-thread
five props through five bodies). The bodies receive it unchanged: `DayBody`/`ListBody`/`BoardBody`
take `actions` and pass it down.

- [ ] **Step 4: Write the dialog and the confirmation**

Create `app/dashboard/worklog/dialogs.tsx`:

```tsx
"use client"

// The only two writes the work log page makes through a form. Validation here is the polite
// version of the server's (lib/worklog/entry-fields.ts): a member never posts a row the API is
// going to reject, and the server still decides.

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { WORK_DISCIPLINES, type WorkDiscipline } from "@/lib/roles"
import { KIND_LABEL, WORK_LOG_KINDS, type EntryDto, type WorkLogKind } from "@/lib/worklog/entries"
import { DisciplinePicker, type EntryDraft } from "./sections"
import type { TaskOption } from "./worklog-client"

export type { EntryDraft }

const EMPTY: EntryDraft = {
  id: null,
  title: "",
  body: "",
  workedOn: "",
  minutes: "",
  kind: "action",
  discipline: "all",
  taskId: "all",
  deliverableId: "all",
}

export function toDraft(entry: EntryDto | null, workedOn: string): EntryDraft {
  if (!entry) return { ...EMPTY, workedOn }
  return {
    id: entry.id,
    title: entry.title,
    body: entry.body ?? "",
    workedOn: entry.workedOn,
    minutes: entry.minutes === null ? "" : String(entry.minutes),
    kind: entry.kind,
    discipline: entry.discipline ?? "all",
    taskId: entry.taskId === null ? "all" : String(entry.taskId),
    deliverableId: entry.deliverableId === null ? "all" : String(entry.deliverableId),
  }
}

export function EntryDialog({
  draft,
  todayIso,
  tasks,
  deliverables,
  saving,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  draft: EntryDraft | null;
  todayIso: string;
  tasks: TaskOption[];
  deliverables: { id: number; name: string }[];
  saving: boolean;
  onDraftChange: (draft: EntryDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: EntryDraft) => Promise<void>;
}) {
  const [errors, setErrors] = useState<{ title?: string; minutes?: string; day?: string }>({})
  const open = draft !== null
  const current = draft ?? EMPTY

  useEffect(() => {
    // A fresh row starts a fresh form; editing starts from the stored values.
    setErrors({})
  }, [draft?.id, draft?.workedOn])

  if (!open) return null

  const validate = () => {
    const next: typeof errors = {}
    if (!current.title.trim()) next.title = "Say what you did."
    const minutes = current.minutes.trim()
    if (minutes !== "") {
      const parsed = Number(minutes)
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1440) {
        next.minutes = "Minutes are a whole number from 0 to 1440."
      }
    }
    if (!current.workedOn) next.day = "Pick the day you did it."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const set = (patch: Partial<EntryDraft>) => onDraftChange({ ...current, ...patch })

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">{current.id === null ? "Log an entry" : "Edit entry"}</DialogTitle>
          <DialogDescription className="text-xs">
            The day you choose is the day the report uses. Moving an entry to another day is
            recorded, not silent.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (validate()) void onSubmit(current)
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="entry-title">What did you do?</Label>
            <Input
              id="entry-title"
              value={current.title}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "entry-title-error" : undefined}
              onChange={(event) => set({ title: event.target.value })}
              placeholder="Replaced the failing pump seal on line 2"
            />
            {errors.title ? (
              <p id="entry-title-error" className="text-xs text-destructive">
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-body">Detail (optional)</Label>
            <Textarea
              id="entry-body"
              rows={3}
              value={current.body}
              onChange={(event) => set({ body: event.target.value })}
              placeholder="Anything a report or a reviewer would need"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-day">Day</Label>
              <Input
                id="entry-day"
                type="date"
                max={todayIso}
                value={current.workedOn}
                aria-invalid={errors.day ? true : undefined}
                aria-describedby={errors.day ? "entry-day-error" : undefined}
                onChange={(event) => set({ workedOn: event.target.value })}
              />
              {errors.day ? (
                <p id="entry-day-error" className="text-xs text-destructive">
                  {errors.day}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-minutes">Minutes</Label>
              <Input
                id="entry-minutes"
                inputMode="numeric"
                value={current.minutes}
                aria-invalid={errors.minutes ? true : undefined}
                aria-describedby={errors.minutes ? "entry-minutes-error" : undefined}
                onChange={(event) => set({ minutes: event.target.value })}
                placeholder="90"
              />
              {errors.minutes ? (
                <p id="entry-minutes-error" className="text-xs text-destructive">
                  {errors.minutes}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-kind">Kind</Label>
              <Select value={current.kind} onValueChange={(v) => set({ kind: v as WorkLogKind })}>
                <SelectTrigger id="entry-kind" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_LOG_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {KIND_LABEL[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium leading-none">Work discipline</span>
            <DisciplinePicker
              value={current.discipline}
              onChange={(discipline) => set({ discipline })}
              compact
            />
            <p className="text-[11px] text-muted-foreground">
              {current.discipline === "all"
                ? `Unclassified — ${WORK_DISCIPLINES.length} disciplines available`
                : KIND_LABEL[current.kind] === KIND_LABEL[current.kind]
                  ? "Used to group the Gantt and your reports"
                  : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="entry-task">Task</Label>
              <Select value={current.taskId} onValueChange={(v) => set({ taskId: v })}>
                <SelectTrigger id="entry-task" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No task (unlinked)</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={String(task.id)}>
                      {task.title.slice(0, 48)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-deliverable">Deliverable</Label>
              <Select value={current.deliverableId} onValueChange={(v) => set({ deliverableId: v })}>
                <SelectTrigger id="entry-deliverable" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No deliverable</SelectItem>
                  {deliverables.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name.slice(0, 48)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : current.id === null ? "Log it" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDelete({
  entry,
  busy,
  onOpenChange,
  onConfirm,
}: {
  entry: EntryDto | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entry: EntryDto) => void;
}) {
  return (
    <AlertDialog open={entry !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Delete entry</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {entry
              ? `"${entry.title}" (${entry.workedOn}) leaves the log. A task's own history is not
                 touched, and nothing else can point at this row.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy || entry === null}
            onClick={(event) => {
              event.preventDefault()
              if (entry) onConfirm(entry)
            }}
          >
            {busy ? "Deleting…" : "Delete entry"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

Two things to get right while typing that in. `EntryDraft` is declared once, in `sections.tsx`
(step 5 below), because `LogSection`'s "add an entry for this day" action needs it and `dialogs.tsx`
must not import from the client that imports it. And the discipline hint line is a plain ternary
over `DISCIPLINE_LABEL[current.discipline]` — replace the awkward guard above with:

```tsx
            <p className="text-[11px] text-muted-foreground">
              {current.discipline === "all"
                ? `Unclassified — pick a group above to classify it (${WORK_DISCIPLINES.length} disciplines)`
                : DISCIPLINE_LABEL[current.discipline] ?? ""}
            </p>
```

with `DISCIPLINE_LABEL` added to the `@/lib/roles` import.

- [ ] **Step 5: `EntryDraft` and the `compact` picker variant**

In `app/dashboard/worklog/sections.tsx`, add above `DisciplinePicker`:

```tsx
export type EntryDraft = {
  id: number | null
  title: string
  body: string
  workedOn: string
  minutes: string
  kind: WorkLogKind
  discipline: WorkDiscipline | "all"
  taskId: string
  deliverableId: string
}
```

and give `DisciplinePicker` an optional `compact` flag that only changes spacing, so the dialog
gets the same search-by-group behaviour as the filter:

```tsx
export function DisciplinePicker({
  value,
  onChange,
  compact = false,
}: {
  value: ViewState["discipline"]
  onChange: (discipline: ViewState["discipline"]) => void
  compact?: boolean
}) {
```

```tsx
  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-2" : "contents"}>
```

Closing that `div` at the end of the component replaces the bare fragment, and
`type WorkDiscipline` joins the `@/lib/roles` import list in that file.

- [ ] **Step 6: Wire the client**

In `app/dashboard/worklog/worklog-client.tsx`:

```tsx
import { ConfirmDelete, EntryDialog, toDraft, type EntryDraft } from "./dialogs"
```

state, beside the existing ones:

```tsx
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState<EntryDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EntryDto | null>(null)
  const [busy, setBusy] = useState(false)
```

handlers, after `patchState`:

```tsx
  const toggleSelect = useCallback((id: number) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const openEntry = useCallback((entry: EntryDto | null) => {
    setDraft(toDraft(entry, entry?.workedOn ?? state.day))
  }, [state.day])

  const submitEntry = useCallback(
    async (value: EntryDraft) => {
      setBusy(true)
      const minutes = value.minutes.trim()
      const payload = {
        title: value.title.trim(),
        body: value.body.trim() === "" ? null : value.body,
        workedOn: value.workedOn,
        minutes: minutes.trim() === "" ? null : Number(minutes.trim()),
        kind: value.kind,
        discipline: value.discipline === "all" ? null : value.discipline,
        taskId: value.taskId === "all" ? null : Number(value.taskId),
        deliverableId: value.deliverableId === "all" ? null : Number(value.deliverableId),
      }
      const error =
        value.id === null
          ? await mutate("/api/worklog/entries", { method: "POST", body: JSON.stringify(payload) })
          : await mutate(`${mutateBase}/${value.id}`, { method: "PUT", body: JSON.stringify(payload) })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Work log", description: error })
        return
      }
      setDraft(null)
      await refresh()
      toast({ title: value.id === null ? "Logged" : "Entry updated", description: payload.title })
    },
    [mutate, refresh, toast, mutateBase],
  )

  const deleteEntry = useCallback(
    async (entry: EntryDto) => {
      setBusy(true)
      const error = await mutate(`${mutateBase}/${entry.id}`, { method: "DELETE" })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Work log", description: error })
        return
      }
      setPendingDelete(null)
      setSelection((prev) => prev.filter((id) => id !== entry.id))
      await refresh()
      toast({ title: "Entry deleted", description: entry.title })
    },
    [mutate, refresh, toast, mutateBase],
  )

  const convertEntry = useCallback(
    async (entry: EntryDto) => {
      setBusy(true)
      const error = await mutate("/api/worklog/entries/bulk", {
        method: "POST",
        body: JSON.stringify({ action: "convert-deliverable", ids: [entry.id] }),
      })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Convert to deliverable", description: error })
        return
      }
      await refresh()
      toast({ title: "Deliverable created", description: `From "${entry.title}"` })
    },
    [mutate, refresh, toast],
  )
```

with `mutateBase` declared once above the handlers, so the guard's template literal is a single
identifiable string:

```tsx
  const mutateBase = "/api/worklog/entries"
```

`EntryDto` is already imported; `setPendingDelete` and `openEntry` are passed down, and the JSX
gains the two dialogs plus a header action on the view slot:

```tsx
      <LogSection
        view={state.view}
        days={viewDaysList}
        loading={loading}
        todayIso={state.view === "day" ? state.day : todayIso}
        onPickDay={(day) => patchState({ day, view: "day" })}
        actions={{
          selection,
          onToggle: toggleSelect,
          onEdit: openEntry,
          onDelete: setPendingDelete,
          onConvert: (entry) => void convertEntry(entry),
        }}
        onAddDay={() => openEntry(null)}
      />
      <EntryDialog
        draft={draft}
        todayIso={todayIso}
        tasks={tasks}
        deliverables={deliverables.map((d) => ({ id: d.id, name: d.name }))}
        saving={busy}
        onDraftChange={setDraft}
        onOpenChange={(open) => !open && setDraft(null)}
        onSubmit={submitEntry}
      />
      <ConfirmDelete
        entry={pendingDelete}
        busy={busy}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={(entry) => void deleteEntry(entry)}
      />
```

`LogSection` takes `onAddDay` and renders it as the section's `action` (the day being edited is
`state.day`, so `openEntry(null)` already seeds the right date):

```tsx
      action={
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddDay}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add an entry
        </Button>
      }
```

with `Plus` added to the `lucide-react` import in `sections.tsx` and `Button` imported from
`@/components/ui/button`.

- [ ] **Step 7: Run the guards and gates**

```bash
npm test -- worklog-page && npm run typecheck && npm run lint && npm test
git add app/dashboard/worklog tests/unit/worklog-page.test.ts
git commit -m "feat(worklog): edit, delete and convert entries from the log views"
git push
```
Expected: 6 dialog guards green, typecheck 0 errors, lint 0 errors / 70 warnings. On the deployed
page: Edit changes a row and reload shows the change; Delete removes it; To deliverable creates one
and the row shows `· deliverable #N`.

---

### Task 15: The bulk bar and a CSV of exactly what is on screen

The twelfth section: a `SectionCard` that exists only while rows are selected. It is the only
place the five bulk actions of Task 8 reach the screen, and it exports the selection as CSV
without a server round trip — the same client-side blob the activity feed already uses
(`app/dashboard/activity/page.tsx:372-395`), so a member can take their week to a spreadsheet on
day one, before phase 5's server exports exist.

The escape-and-join grammar lives in `lib/worklog/entries.ts` as a pure function, not in the
component: a CSV that mis-quotes a title containing a comma is a data bug, and this plan's rule is
that data bugs are testable.

**Files:**
- Modify: `lib/worklog/entries.ts` (append `entriesToCsv`)
- Modify: `tests/unit/worklog-entries.test.ts` (append a `describe("csv")`)
- Modify: `app/dashboard/worklog/sections.tsx` (add `BulkSection`)
- Modify: `app/dashboard/worklog/dialogs.tsx` (add `ConfirmBulkDelete`)
- Modify: `app/dashboard/worklog/worklog-client.tsx` (bulk handlers + `applyBulk`)
- Test (append): `tests/unit/worklog-page.test.ts`

**Interfaces:**
- Consumes: `BulkAction`, `BULK_ACTIONS`, `BULK_IDS_CAP` from `@/lib/worklog/bulk`; `EntryDto`,
  `WORK_LOG_KINDS`, `KIND_LABEL` from `@/lib/worklog/entries`; `TaskOption` from the client;
  `SectionCard`, `EmptyNote`; `AlertDialog*` from `@/components/ui/alert-dialog`;
  `Select*`, `Label`, `Button`, `toast`.
- Produces:
  - `entriesToCsv(entries: readonly EntryDto[]): string`
  - `BulkSection({ entries, selection, busy, todayIso, tasks, onApply, onExport, onClear })`
  - `ConfirmBulkDelete({ count, busy, onOpenChange, onConfirm })`
  - `applyBulk(action: BulkAction, payload?: Record<string, unknown>): Promise<void>` in the client

- [ ] **Step 1: Write the failing CSV tests**

Append to `tests/unit/worklog-entries.test.ts` (the file already has an `entry(over)` factory from
Task 2 — reuse it, do not redefine it):

```ts
describe("csv", () => {
  it("starts with the column header", () => {
    const csv = entriesToCsv([])
    expect(csv.split("\n")[0]).toBe(
      '"worked_on","kind","title","body","task","discipline","minutes","deliverable","source"',
    )
  })

  it("writes one row per entry in the order given", () => {
    const csv = entriesToCsv([
      entry({ id: 1, workedOn: "2026-10-19" }),
      entry({ id: 2, workedOn: "2026-10-20" }),
    ])
    expect(csv.trim().split("\n")).toHaveLength(3)
  })

  it("quotes every field and doubles the quotes inside it", () => {
    const csv = entriesToCsv([entry({ title: 'Reboot, then "confirm" the switch' })])
    expect(csv).toContain('"Reboot, then ""confirm"" the switch"')
  })

  it("leaves a null body, task and discipline empty rather than printing null", () => {
    const csv = entriesToCsv([entry({ body: null, taskId: null, taskTitle: null, discipline: null })])
    const row = csv.trim().split("\n")[1]
    expect(row).not.toMatch(/\bnull\b/u)
    expect(row).toContain('"",""')
  })

  it("writes an empty minutes cell for an untimed row and a number otherwise", () => {
    // These two rows contain no quotes and no commas, so splitting on `","` reads the columns.
    const cells = (line: string) => line.replace(/^"|"$/g, "").split('","')
    const [untimed] = entriesToCsv([entry({ minutes: null })]).trim().split("\n").slice(1)
    const [timed] = entriesToCsv([entry({ minutes: 45 })]).trim().split("\n").slice(1)
    expect(cells(untimed)[6]).toBe("")
    expect(cells(timed)[6]).toBe("45")
  })

  it("keeps a newline inside its quoted field instead of splitting the record", () => {
    const csv = entriesToCsv([entry({ body: "line one\nline two" })])
    expect(csv).toContain('"line one\nline two"')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-entries`
Expected: FAIL — `entriesToCsv is not a function` (or a TS error on the import).

- [ ] **Step 3: Write the CSV function**

Add the import to the top of `tests/unit/worklog-entries.test.ts`:

```ts
import { entriesToCsv } from "@/lib/worklog/entries"
```

Append to `lib/worklog/entries.ts`:

```ts
const CSV_HEADER = [
  "worked_on",
  "kind",
  "title",
  "body",
  "task",
  "discipline",
  "minutes",
  "deliverable",
  "source",
] as const

/**
 * One quoted field per column, exactly as the activity export does it. A body keeps its
 * newlines inside the quotes, so a row never splits into two records.
 */
function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function entriesToCsv(entries: readonly EntryDto[]): string {
  const rows = entries.map((e) =>
    [
      e.workedOn,
      e.kind,
      e.title,
      e.body ?? "",
      e.taskTitle ?? "",
      e.discipline ?? "",
      e.minutes ?? "",
      e.deliverableId ?? "",
      e.source,
    ]
      .map(csvCell)
      .join(","),
  )
  return [CSV_HEADER.map(csvCell).join(","), ...rows].join("\n")
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- worklog-entries`
Expected: PASS — the six `csv` cases green, the Task 2 cases still green.

- [ ] **Step 5: Write the failing bar guards**

Append to `tests/unit/worklog-page.test.ts`:

```ts
describe("bulk bar", () => {
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")
  const sections = () => src("app/dashboard/worklog/sections.tsx")

  it("exists only while a selection exists", () => {
    expect(client()).toMatch(/selection\.length > 0\s*&&\s*<BulkSection/u)
    expect(sections()).toMatch(/export function BulkSection/u)
  })

  it("offers every bulk action the API implements", () => {
    const code = sections()
    for (const action of ["delete", "set-task", "re-date", "set-kind", "convert-deliverable"]) {
      expect(code).toContain(`"${action}"`)
    }
    expect(code).toMatch(/type BulkAction/u)
  })

  it("posts the selection to the bulk route through one handler", () => {
    // The client's `mutate` is what calls fetch, so the guard reads the call site: one
    // path string, used by both applyBulk and confirmBulkDelete.
    expect(client()).toMatch(/onApply=\{applyBulk\}/u)
    expect(client()).toMatch(/"\/api\/worklog\/entries\/bulk"/u)
    expect(client()).toMatch(/body: JSON\.stringify\(\{ action, ids: selection/u)
  })

  it("asks before deleting a batch", () => {
    expect(client()).toMatch(/setPendingBulkDelete\(true\)/u)
    expect(src("app/dashboard/worklog/dialogs.tsx")).toMatch(/export function ConfirmBulkDelete/u)
    expect(client()).not.toMatch(/window\.confirm\(/u)
  })

  it("exports the current selection as a real download", () => {
    const code = client()
    expect(code).toMatch(/entriesToCsv/u)
    expect(code).toMatch(/new Blob\(\[csv\], \{ type: "text\/csv;charset=utf-8" \}\)/u)
    expect(code).toMatch(/a\.download = `jiravision-worklog-\$\{range\.from\}-\$\{range\.to\}\.csv`/u)
    expect(code).toMatch(/URL\.revokeObjectURL\(url\)/u)
  })

  it("clears the selection after a successful action", () => {
    expect(client()).toMatch(/setSelection\(\[\]\)/u)
  })

  it("disables every button while a write is in flight", () => {
    expect(sections()).toMatch(/disabled=\{busy\}/u)
  })
})
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npm test -- worklog-page`
Expected: FAIL on the first bulk case (`client()` has no `BulkSection`).

- [ ] **Step 7: Write `BulkSection`**

Append to `app/dashboard/worklog/sections.tsx`, with `Download`, `Trash2`, `X`, `Link2` and
`FileStack` added to the `lucide-react` import, `type BulkAction` from `@/lib/worklog/bulk`, and
`WORK_LOG_KINDS`, `KIND_LABEL` already imported from Task 12:

```tsx
export function BulkSection({
  entries,
  selection,
  busy,
  todayIso,
  tasks,
  onApply,
  onExport,
  onClear,
}: {
  entries: EntryDto[];
  selection: number[];
  busy: boolean;
  todayIso: string;
  tasks: TaskOption[];
  onApply: (action: BulkAction, payload?: Record<string, unknown>) => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const [taskId, setTaskId] = useState("all")
  const [kind, setKind] = useState<WorkLogKind>(WORK_LOG_KINDS[0])
  const [workedOn, setWorkedOn] = useState(todayIso)
  const chosen = entries.filter((e) => selection.includes(e.id))

  return (
    <SectionCard
      title={`Selected — ${selection.length} ${selection.length === 1 ? "entry" : "entries"}`}
      icon={<FileStack className="h-4 w-4" />}
      action={
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear} disabled={busy}>
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      }
      className="md:col-span-2 xl:col-span-3"
    >
      {selection.length === 0 ? (
        <EmptyNote>Tick rows in the view above to act on them together.</EmptyNote>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="bulk-task" className="text-[11px]">
              Task
            </Label>
            <Select value={taskId} onValueChange={setTaskId} disabled={busy}>
              <SelectTrigger id="bulk-task" className="h-8 w-44 text-xs">
                <SelectValue placeholder="Move to a task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Unlink from any task</SelectItem>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title.slice(0, 44)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bulk-kind" className="text-[11px]">
              Reclassify as
            </Label>
            <Select value={kind} onValueChange={(v) => setKind(v as WorkLogKind)} disabled={busy}>
              <SelectTrigger id="bulk-kind" className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_LOG_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bulk-date" className="text-[11px]">
              Re-date to
            </Label>
            <Input
              id="bulk-date"
              type="date"
              value={workedOn}
              max={todayIso}
              onChange={(e) => setWorkedOn(e.target.value)}
              className="h-8 w-40 text-xs"
              disabled={busy}
            />
          </div>

          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busy} onClick={() => onApply("set-task", { taskId: taskId === "all" ? null : Number(taskId) })}>
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Move
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busy} onClick={() => onApply("set-kind", { kind })}>
            Reclassify
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busy} onClick={() => onApply("re-date", { workedOn })}>
            Re-date
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busy} onClick={() => onApply("convert-deliverable")}>
            To deliverables
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" disabled={busy} onClick={onExport}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => onApply("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {formatMinutes(minutesTotal(chosen))} in the selection
          </span>
        </div>
      )}
    </SectionCard>
  )
}
```

`minutesTotal` joins the `@/lib/worklog/entries` import — the selection's time is computed by the
same function the totals card uses, so the bar and the header cannot drift apart. `Input` comes
from `@/components/ui/input` and `WorkLogKind` is the type export from
`@/lib/worklog/entries`; `useState` is already imported in this file. The `"all"` sentinel is what
unlinks — `SelectItem value=""` is forbidden by `tests/unit/select-items.test.ts:31-62`.

- [ ] **Step 8: Write `ConfirmBulkDelete`**

Append to `app/dashboard/worklog/dialogs.tsx` — deleting a batch of rows is the one action in this
phase with no undo, so it gets its own dialog rather than an inline button:

```tsx
export function ConfirmBulkDelete({
  count,
  busy,
  open,
  onOpenChange,
  onConfirm,
}: {
  count: number;
  busy: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            Delete {count} {count === 1 ? "entry" : "entries"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            These rows leave your work log. A task's own change history is recorded separately and
            is not touched. This cannot be undone from the page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy}>Keep them</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy || count === 0}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {busy ? "Deleting…" : `Delete ${count}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 9: Wire the client**

Add to `app/dashboard/worklog/worklog-client.tsx`:

```tsx
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false)

  const applyBulk = useCallback(
    async (action: BulkAction, payload?: Record<string, unknown>) => {
      if (selection.length === 0) return
      if (action === "delete") {
        setPendingBulkDelete(true)
        return
      }
      setBusy(true)
      const error = await mutate("/api/worklog/entries/bulk", {
        method: "POST",
        body: JSON.stringify({ action, ids: selection, ...payload }),
      })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Bulk action", description: error })
        return
      }
      setSelection([])
      setPendingBulkDelete(false)
      await refresh()
      toast({
        title: "Applied to your log",
        description: `${selection.length} ${selection.length === 1 ? "entry" : "entries"} · ${action.replace("-", " ")}`,
      })
    },
    [mutate, refresh, selection, toast],
  )

  const confirmBulkDelete = useCallback(async () => {
    setBusy(true)
    const error = await mutate("/api/worklog/entries/bulk", {
      method: "POST",
      body: JSON.stringify({ action: "delete", ids: selection }),
    })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Delete", description: error })
      return
    }
    const n = selection.length
    setSelection([])
    setPendingBulkDelete(false)
    await refresh()
    toast({ title: "Entries deleted", description: `${n} removed from your log` })
  }, [mutate, refresh, selection, toast])

  const exportCsv = useCallback(() => {
    const chosen = entries.filter((e) => selection.includes(e.id))
    if (chosen.length === 0) {
      toast({ variant: "destructive", title: "Export", description: "Nothing selected to export." })
      return
    }
    const csv = entriesToCsv(chosen)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jiravision-worklog-${range.from}-${range.to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported", description: `${chosen.length} entries` })
  }, [entries, selection, range.from, range.to, toast])
```

with `BulkAction` imported from `@/lib/worklog/bulk` and `entriesToCsv` added to the existing
`@/lib/worklog/entries` import, and the JSX gaining, directly after the `LogSection`:

```tsx
      {selection.length > 0 && (
        <BulkSection
          entries={entries}
          selection={selection}
          busy={busy}
          todayIso={todayIso}
          tasks={tasks}
          onApply={applyBulk}
          onExport={exportCsv}
          onClear={() => setSelection([])}
        />
      )}
      <ConfirmBulkDelete
        count={selection.length}
        busy={busy}
        open={pendingBulkDelete}
        onOpenChange={(next) => !next && setPendingBulkDelete(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
```

and `BulkSection` / `ConfirmBulkDelete` added to the `./sections` and `./dialogs` imports.

`applyBulk` is also what Task 14's single-row `convertEntry` should call once this lands — leave
`convertEntry` as it is (it posts one id to the same route and works), and note in the commit
message that the row action and the bar share the endpoint.

- [ ] **Step 10: Run the guards and gates**

```bash
npm test -- worklog-page worklog-entries && npm run typecheck && npm run lint && npm test
git add lib/worklog/entries.ts tests/unit/worklog-entries.test.ts app/dashboard/worklog tests/unit/worklog-page.test.ts
git commit -m "feat(worklog): bulk bar and selection CSV export"
git push
```
Expected: 7 bulk guards + 6 CSV cases green, the whole suite green, typecheck 0 errors, lint 0
errors / 70 warnings. On the deployed page: tick three rows, Move them onto a task, and the rows
re-render with the task title; Export CSV downloads a file whose rows are those three.

---

### Task 16: Sections 6 to 11 — deliverables, transitions, and the six read-backs

The remaining six numbered sections. Five of them render fields the summary endpoint already
returns, which is the point of computing them server-side: the day column, the totals card and the
charts cannot disagree. The sixth is the deliverables board, which owns its own fetch and its own
lifecycle buttons — a `draft` row offers `In review` and `Delivered` because `DELIVERABLE_NEXT`
says so, not because the component guessed.

Everything here is read-only presentation plus deliverable CRUD; no new arithmetic enters a
component. The two charts are `recharts` inside a `ResponsiveContainer`, the same grammar
`app/dashboard/activity/page.tsx:653-664` already uses, with fills taken from the discipline and
kind colour maps so the palette stays in one place.

**Files:**
- Modify: `app/dashboard/worklog/sections.tsx` (six new section components)
- Modify: `app/dashboard/worklog/dialogs.tsx` (`DeliverableDialog`)
- Modify: `app/dashboard/worklog/worklog-client.tsx` (deliverable mutation + render order)
- Test (append): `tests/unit/worklog-page.test.ts`

**Interfaces:**
- Consumes: `WorklogSummary`, `TransitionDto` from `@/lib/worklog/summary`; `DeliverableDto`,
  `DELIVERABLE_NEXT`, `DELIVERABLE_STATUSES`, `DELIVERABLE_TYPES`, `DELIVERABLE_LABEL`, `DELIVERABLE_LABEL_STATUS`,
  `DELIVERABLE_LABEL`, `KIND_COLOUR`, `KIND_LABEL`, `canMoveDeliverable`, `formatMinutes` from
  `@/lib/worklog/entries`; `DISCIPLINE_COLOUR`, `DISCIPLINE_LABEL`, `DISCIPLINE_ICON`,
  `WORK_DISCIPLINES` from `@/lib/roles`; `DisciplinePicker`, `EmptySection`, `EmptyNote`,
  `SectionCard`, `KindBadge` from Task 12; `Dialog*`, `Select*`, `Input`, `Label`, `Textarea`,
  `Button`, `useToast`.
- Produces:
  - `DeliverablesSection({ deliverables, loading, onNew, onEdit, onMove, onDelete })`
  - `TransitionsSection({ transitions, loading })`
  - `TimeByTaskSection({ tasks, loading, totalMinutes })`
  - `DisciplineSplitSection({ disciplines, loading, totalMinutes })`
  - `KindMixSection({ kinds, openBlockers, loading })`
  - `CoverageSection({ gaps, streak, unlinked, totals, range, loading, onPickDay })`
  - `DeliverableDialog({ draft, onDraftChange, onOpenChange, saving, tasks, onSubmit })` and
    `DeliverableDraft`
  - `saveDeliverable(value: DeliverableDraft): Promise<void>`, `deleteDeliverable(id: number)`,
    `moveDeliverable(id: number, status: DeliverableStatus)` in the client

- [ ] **Step 1: Write the failing guards**

Append to `tests/unit/worklog-page.test.ts`:

```ts
describe("sections 6 to 11", () => {
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")
  const sections = () => src("app/dashboard/worklog/sections.tsx")

  it("renders the eleven numbered sections in one order", () => {
    const code = client()
    for (const name of [
      "TotalsSection",
      "QuickAddSection",
      "FilterSection",
      "ViewToolbarSection",
      "LogSection",
      "DeliverablesSection",
      "TransitionsSection",
      "TimeByTaskSection",
      "DisciplineSplitSection",
      "KindMixSection",
      "CoverageSection",
    ]) {
      expect(code).toMatch(new RegExp(`<${name}\\b`, "u"))
    }
  })

  it("drives the deliverable buttons from the lifecycle map, not literals", () => {
    const code = sections()
    expect(code).toMatch(/DELIVERABLE_NEXT\[d\.status\]/u)
    expect(code).toMatch(/canMoveDeliverable/u)
    expect(code).not.toMatch(/status === "draft" \? "in_review"/u)
  })

  it("links a deliverable to its own edit and delete actions", () => {
    const code = sections()
    expect(code).toMatch(/onClick=\{\(\) => onEdit\(d\)\}/u)
    expect(code).toMatch(/onClick=\{\(\) => onDelete\(d\.id\)\}/u)
    // The client mutates through `mutate`, whose first argument is the path built from
    // `deliverableBase`, so the guard reads that string rather than a literal fetch.
    expect(client()).toMatch(/const deliverableBase = "\/api\/worklog\/deliverables"/u)
    expect(client()).toMatch(/`\$\{deliverableBase\}\/\$\{value\.id\}`/u)
    expect(client()).toMatch(/`\$\{deliverableBase\}\/\$\{d\.id\}`/u)
    expect(client()).toMatch(/`\$\{deliverableBase\}\/\$\{id\}`/u)
  })

  it("colours charts from the shared maps", () => {
    const code = sections()
    expect(code).toMatch(/DISCIPLINE_COLOUR\[row\.discipline\]/u)
    expect(code).toMatch(/KIND_COLOUR\[k\.kind\]/u)
    expect(code).not.toMatch(/fill="#[0-9a-f]{3,6}"/iu)
  })

  it("never draws a bar from a number it worked out itself", () => {
    const code = sections()
    expect(code).toMatch(/summary\.disciplines|disciplines: DisciplineBucket\[\]/u)
    expect(code).not.toMatch(/reduce\(\(sum, e\) => sum \+ \(e\.minutes \?\? 0\), 0\)/u)
  })

  it("surfaces a gap by name with a way to fill it", () => {
    const code = sections()
    expect(code).toMatch(/onPickDay/u)
    expect(code).toMatch(/gaps\.length === 0/u)
    expect(code).not.toMatch(/<EmptySection title="Coverage"\/>/u)
  })

  it("keeps every transition row honest about where it came from", () => {
    const code = sections()
    expect(code).toMatch(/SOURCE_LABEL\[t\.source\]/u)
    expect(code).toMatch(/captured automatically/u)
  })

  it("has no dead control in the new sections", () => {
    const code = `${sections()}${client()}`
    expect(code).not.toMatch(/href="#"/u)
    expect(code).not.toMatch(/onClick=\{\(\) => \{\}\}/u)
    expect(code).not.toMatch(/console\.log/u)
  })

  it("gives every new input a label", () => {
    const dialogs = src("app/dashboard/worklog/dialogs.tsx")
    expect(dialogs).toMatch(/<Label htmlFor="deliverable-name"/u)
    expect(dialogs).toMatch(/<Label htmlFor="deliverable-link"/u)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-page`
Expected: FAIL on the first case (`DeliverablesSection` is not rendered).

- [ ] **Step 3: The deliverables board (section 6)**

Append to `app/dashboard/worklog/sections.tsx`. `FolderKanban`, `ExternalLink`, `Pencil`,
`Trash2`, `ArrowRight` join the `lucide-react` import; `DeliverableDto`, `DELIVERABLE_NEXT`,
`DELIVERABLE_LABEL`, `DELIVERABLE_TYPES`, `canMoveDeliverable`, `type DeliverableStatus`
join the `@/lib/worklog/entries` import; `DISCIPLINE_LABEL`, `DISCIPLINE_COLOUR` are already
imported by Task 12.

```tsx
export function DeliverablesSection({
  deliverables,
  loading,
  onNew,
  onEdit,
  onMove,
  onDelete,
}: {
  deliverables: DeliverableDto[];
  loading: boolean;
  onNew: () => void;
  onEdit: (deliverable: DeliverableDto) => void;
  onMove: (deliverable: DeliverableDto, status: DeliverableStatus) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <SectionCard
      title="Deliverables"
      icon={<FolderKanban className="h-4 w-4" />}
      action={
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add one
        </Button>
      }
      className="md:col-span-2 xl:col-span-3"
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : deliverables.length === 0 ? (
        <EmptyNote>
          Nothing on file for this range. Convert a log row with the bulk bar, or add one here —
          a deliverable is what you handed over, the rows under it are the evidence.
        </EmptyNote>
      ) : (
        <ul className="divide-y divide-border">
          {deliverables.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 first:pt-0 last:pb-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: d.discipline ? DISCIPLINE_COLOUR[d.discipline] : "hsl(var(--muted-foreground))" }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {DELIVERABLE_LABEL_STATUS[d.status]} · {DELIVERABLE_LABEL[d.type]}
                  {d.producedOn ? ` · ${d.producedOn}` : ""}
                  {d.taskTitle ? ` · ${d.taskTitle}` : ""} · {d.entryCount}{" "}
                  {d.entryCount === 1 ? "entry" : "entries"}
                  {d.discipline ? ` · ${DISCIPLINE_LABEL[d.discipline]}` : ""}
                </p>
              </div>
              {d.link && (
                <a
                  href={d.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  Open
                </a>
              )}
              {DELIVERABLE_NEXT[d.status].map((next) => (
                <Button
                  key={next}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onMove(d, next)}
                  disabled={!canMoveDeliverable(d.status, next)}
                >
                  <ArrowRight className="h-3 w-3" aria-hidden />
                  {DELIVERABLE_LABEL_STATUS[next]}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(d)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Edit {d.name}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDelete(d.id)}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Delete {d.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
```

`DELIVERABLE_NEXT[d.status]` is the only set of buttons rendered, so a `delivered` row shows none —
the lifecycle has no way back, and the board does not pretend it does. `Skeleton` comes from
`@/components/ui/skeleton`.

- [ ] **Step 4: The transitions timeline (section 7)**

```tsx
export function TransitionsSection({
  transitions,
  loading,
}: {
  transitions: TransitionDto[];
  loading: boolean;
}) {
  // Source is shown because an automatic capture and a hand-written log row carry different
  // weight in a report, and the member is entitled to know which one they are looking at.
  const SOURCE_LABEL: Record<string, string> = {
    route: "edited on the task",
    bulk: "bulk change",
    agent: "from an assistant",
    auto: "captured automatically",
  }
  return (
    <SectionCard title="Status changes" icon={<GitBranch className="h-4 w-4" />} className="md:col-span-2">
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : transitions.length === 0 ? (
        <EmptyNote>
          No task moved status in this range. Moving one on the task page writes its row here —
          nothing has to be logged by hand for this section to fill.
        </EmptyNote>
      ) : (
        <ol className="space-y-2">
          {transitions.map((t) => (
            <li key={t.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="tabular-nums text-muted-foreground">{t.at.slice(11, 16)}</span>
              <span className="font-medium">{t.taskTitle}</span>
              <span className="text-muted-foreground">
                {t.fromStatus ?? "—"} <ArrowRight className="inline h-3 w-3" aria-hidden /> {t.toStatus}
              </span>
              <span className="text-[11px] text-muted-foreground/80">{SOURCE_LABEL[t.source] ?? t.source}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}
```

`GitBranch` joins the `lucide-react` import; `TransitionDto` is imported as a type from
`@/lib/worklog/summary`.

- [ ] **Step 5: Time by task, discipline split, kind mix (sections 8, 9, 10)**

```tsx
export function TimeByTaskSection({
  tasks,
  loading,
  totalMinutes,
}: {
  tasks: TaskBucket[];
  loading: boolean;
  totalMinutes: number;
}) {
  const rows = tasks.slice(0, 8)
  return (
    <SectionCard title="Time by task" icon={<Timer className="h-4 w-4" />} className="md:col-span-2 xl:col-span-2">
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <EmptyNote>Nothing logged against a task yet in this range.</EmptyNote>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((t) => {
            const share = totalMinutes > 0 ? Math.round((t.minutes / totalMinutes) * 100) : 0
            return (
              <li key={t.taskId ?? "unlinked"} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{t.taskTitle ?? "Unlinked entries"}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMinutes(t.minutes)} · {share}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full bg-muted"
                  role="img"
                  aria-label={`${t.taskTitle ?? "Unlinked"}: ${formatMinutes(t.minutes)}, ${share}% of the range`}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${Math.max(share, 2)}%`, background: "hsl(var(--chart-pine))" }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t.entries.length} {t.entries.length === 1 ? "entry" : "entries"}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

export function DisciplineSplitSection({
  disciplines,
  loading,
  totalMinutes,
}: {
  disciplines: DisciplineBucket[];
  loading: boolean;
  totalMinutes: number;
}) {
  const data = disciplines.map((row) => ({
    name: DISCIPLINE_LABEL[row.discipline],
    minutes: row.minutes,
    count: row.count,
    fill: DISCIPLINE_COLOUR[row.discipline],
  }))
  return (
    <SectionCard title="Where the time went" icon={<ChartPie className="h-4 w-4" />} className="md:col-span-2 xl:col-span-2">
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : data.length === 0 ? (
        <EmptyNote>
          No classified minutes in this range. A discipline is set on the entry form; unclassified
          work still shows in the log, it just cannot be split.
        </EmptyNote>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: unknown, name: unknown) =>
                  name === "minutes" ? [formatMinutes(Number(value)), "time"] : [value, name]
                }
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
              />
              <Bar dataKey="minutes" radius={[0, 3, 3, 0]}>
                {data.map((cell) => (
                  <Cell key={cell.name} fill={cell.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground">
            {formatMinutes(totalMinutes)} classified across {data.length}{" "}
            {data.length === 1 ? "discipline" : "disciplines"}
          </p>
        </>
      )}
    </SectionCard>
  )
}

export function KindMixSection({
  kinds,
  openBlockers,
  loading,
}: {
  kinds: KindBucket[];
  openBlockers: number;
  loading: boolean;
}) {
  return (
    <SectionCard
      title="Mix of work"
      icon={<Shapes className="h-4 w-4" />}
      action={
        openBlockers > 0 ? (
          <span className="text-[11px] font-medium text-destructive">
            {openBlockers} open {openBlockers === 1 ? "blocker" : "blockers"}
          </span>
        ) : null
      }
      className="md:col-span-2 xl:col-span-2"
    >
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {kinds.map((k) => (
            <li key={k.kind} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOUR[k.kind] }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{k.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {k.count} · {formatMinutes(k.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
```

`TaskBucket`, `DisciplineBucket`, `KindBucket` are type imports from `@/lib/worklog/entries`;
`Timer`, `ChartPie`, `Shapes` join the icon import — `PieChart` is the **recharts** component and is
already imported under that name for the chart itself, so the section icon has to be lucide
`ChartPie` or the two collide on the import line. `Bar`, `BarChart`, `Cell`, `ResponsiveContainer`,
`Tooltip`, `XAxis`, `YAxis` come from `recharts` — the same seven the activity page already pulls.
The bar colour is per-cell from `DISCIPLINE_COLOUR`, so a discipline reads the same colour here, in
the filter picker, and on the Gantt of phase 8.

- [ ] **Step 6: Coverage and gaps (section 11)**

```tsx
export function CoverageSection({
  gaps,
  streak,
  unlinked,
  totals,
  range,
  loading,
  onPickDay,
}: {
  gaps: string[];
  streak: { current: number; longest: number };
  unlinked: number;
  totals: { entries: number; minutes: number; activeDays: number };
  range: { from: string; to: string };
  loading: boolean;
  onPickDay: (day: string) => void;
}) {
  const spanned = rangeDays(range.from, range.to).length
  const covered = totals.activeDays
  return (
    <SectionCard title="Coverage" icon={<CalendarCheck2 className="h-4 w-4" />} className="md:col-span-2 xl:col-span-3">
      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Stat label="Days logged" value={`${covered} of ${spanned}`} />
            <Stat label="Current streak" value={`${streak.current} ${streak.current === 1 ? "day" : "days"}`} />
            <Stat label="Longest streak" value={`${streak.longest} ${streak.longest === 1 ? "day" : "days"}`} />
            <Stat label="Unlinked entries" value={String(unlinked)} />
          </div>
          {gaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Every day from {range.from} to {range.to} has something in it.
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {gaps.length} {gaps.length === 1 ? "day" : "days"} with no entry in this range —
                select one to fill it:
              </p>
              <div className="flex flex-wrap gap-1">
                {gaps.slice(0, 21).map((day) => (
                  <Button
                    key={day}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] tabular-nums"
                    onClick={() => onPickDay(day)}
                  >
                    {day.slice(5)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}
```

`Stat` is the small component Task 12 already defined in this file — reuse it, do not re-declare.
`CalendarCheck2` joins the icon import and `rangeDays` joins the `@/lib/worklog/local-day` import.
The gap list is capped at 21 because a year-long filter would otherwise push everything else off
the page; the cap is visible in the copy, so it is not a silent truncation.

- [ ] **Step 7: `DeliverableDialog`**

Append to `app/dashboard/worklog/dialogs.tsx`. A deliverable is the report's unit of proof, so the
form asks for the link and the evidence in the same breath as the name:

```tsx
export type DeliverableDraft = {
  id: number | null
  name: string
  type: DeliverableType
  status: DeliverableStatus
  producedOn: string
  link: string
  evidence: string
  taskId: string
  discipline: ViewState["discipline"]
}

export const EMPTY_DELIVERABLE: DeliverableDraft = {
  id: null,
  name: "",
  type: "document",
  status: "draft",
  producedOn: "",
  link: "",
  evidence: "",
  taskId: "all",
  discipline: "all",
}

export function toDeliverableDraft(d: DeliverableDto, todayIso: string): DeliverableDraft {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    status: d.status,
    producedOn: d.producedOn ?? todayIso,
    link: d.link ?? "",
    evidence: d.evidence ?? "",
    taskId: d.taskId === null ? "all" : String(d.taskId),
    discipline: d.discipline ?? "all",
  }
}
```

```tsx
export function DeliverableDialog({
  draft,
  tasks,
  saving,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  draft: DeliverableDraft | null;
  tasks: TaskOption[];
  saving: boolean;
  onDraftChange: (draft: DeliverableDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: DeliverableDraft) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  if (draft === null) return null
  const set = (patch: Partial<DeliverableDraft>) => onDraftChange({ ...draft, ...patch })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (draft.name.trim().length < 2) next.name = "Name the thing that was handed over."
    if (draft.producedOn && !isIsoDate(draft.producedOn)) next.producedOn = "Use the date picker."
    if (draft.link && !/^https?:\/\//i.test(draft.link.trim())) next.link = "A link needs http:// or https://."
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onSubmit(draft)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{draft.id === null ? "New deliverable" : "Edit deliverable"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="deliverable-name">Name</Label>
            <Input
              id="deliverable-name"
              value={draft.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "deliverable-name-error" : undefined}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Firewall rule set v3"
            />
            {errors.name && (
              <p id="deliverable-name-error" className="text-[11px] text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-type">Type</Label>
              <Select value={draft.type} onValueChange={(v) => set({ type: v })}>
                <SelectTrigger id="deliverable-type" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DELIVERABLE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-status">State</Label>
              <Select value={draft.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger id="deliverable-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DELIVERABLE_LABEL_STATUS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-produced">Produced on</Label>
              <Input
                id="deliverable-produced"
                type="date"
                value={draft.producedOn}
                aria-invalid={Boolean(errors.producedOn)}
                onChange={(e) => set({ producedOn: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-task">Task</Label>
              <Select value={draft.taskId} onValueChange={(v) => set({ taskId: v })}>
                <SelectTrigger id="deliverable-task" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No task</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.title.slice(0, 44)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-link">Link</Label>
            <Input
              id="deliverable-link"
              value={draft.link}
              aria-invalid={Boolean(errors.link)}
              aria-describedby={errors.link ? "deliverable-link-error" : undefined}
              onChange={(e) => set({ link: e.target.value })}
              placeholder="https://…"
            />
            {errors.link && (
              <p id="deliverable-link-error" className="text-[11px] text-destructive">
                {errors.link}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-evidence">Evidence note</Label>
            <Textarea
              id="deliverable-evidence"
              rows={2}
              value={draft.evidence}
              onChange={(e) => set({ evidence: e.target.value })}
              placeholder="Where a reviewer would find it, and what proves it is the current version."
            />
          </div>

          <div className="space-y-1.5">
            <DisciplinePicker compact value={draft.discipline} onChange={(discipline) => set({ discipline })} />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : draft.id === null ? "Create deliverable" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

`ViewState` is a type import from `@/lib/worklog/view-state` — the draft's `discipline` field is the
same `WorkDiscipline | "all"` the filter and the picker already speak, so the dialog needs no third
spelling of "unclassified".

`DELIVERABLE_LABEL` is the type-name map Task 2 defines beside `DELIVERABLE_TYPES`
(`lib/worklog/entries.ts:612-621`) — there is no second label map, and adding one would be the
vocabulary-split the constraints forbid. `FormEvent` is a `react` type import, `isIsoDate` comes from
`@/lib/worklog/local-day`, `DisciplinePicker` from `./sections`.

- [ ] **Step 8: Wire the client**

Add to `app/dashboard/worklog/worklog-client.tsx`:

```tsx
  const [deliverableDraft, setDeliverableDraft] = useState<DeliverableDraft | null>(null)
  const [pendingDeliverableDelete, setPendingDeliverableDelete] = useState<number | null>(null)

  const saveDeliverable = useCallback(
    async (value: DeliverableDraft) => {
      const payload = {
        name: value.name.trim(),
        type: value.type,
        status: value.status,
        producedOn: value.producedOn || null,
        link: value.link.trim() || null,
        evidence: value.evidence.trim() || null,
        taskId: value.taskId === "all" ? null : Number(value.taskId),
        discipline: value.discipline === "all" ? null : value.discipline,
      }
      setBusy(true)
      const error =
        value.id === null
          ? await mutate("/api/worklog/deliverables", { method: "POST", body: JSON.stringify(payload) })
          : await mutate(`${deliverableBase}/${value.id}`, { method: "PUT", body: JSON.stringify(payload) })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Deliverable", description: error })
        return
      }
      setDeliverableDraft(null)
      await refresh()
      toast({ title: value.id === null ? "Deliverable created" : "Deliverable updated", description: payload.name })
    },
    [mutate, refresh, toast, deliverableBase],
  )

  const moveDeliverable = useCallback(
    async (d: DeliverableDto, status: DeliverableStatus) => {
      setBusy(true)
      const error = await mutate(`${deliverableBase}/${d.id}`, { method: "PUT", body: JSON.stringify({ status }) })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "State change", description: error })
        return
      }
      await refresh()
      toast({ title: "Deliverable moved", description: `${d.name} → ${DELIVERABLE_LABEL_STATUS[status]}` })
    },
    [mutate, refresh, toast, deliverableBase],
  )

  const deleteDeliverable = useCallback(
    async (id: number) => {
      setBusy(true)
      const error = await mutate(`${deliverableBase}/${id}`, { method: "DELETE" })
      setBusy(false)
      if (error) {
        toast({ variant: "destructive", title: "Delete deliverable", description: error })
        return
      }
      setPendingDeliverableDelete(null)
      await refresh()
      toast({ title: "Deliverable deleted", description: "Its log entries stay in the log." })
    },
    [mutate, refresh, toast, deliverableBase],
  )
```

with `const deliverableBase = "/api/worklog/deliverables"` declared next to `mutateBase` — the
whitelist in Task 4 refuses a `status` jump the lifecycle forbids, so a stale browser tab gets a
readable error instead of an illegal row. The render tree gains, after the bulk bar:

```tsx
      <DeliverablesSection
        deliverables={deliverables}
        loading={loading}
        onNew={() => setDeliverableDraft({ ...EMPTY_DELIVERABLE, producedOn: state.day })}
        onEdit={(d) => setDeliverableDraft(toDeliverableDraft(d, todayIso))}
        onMove={(d, status) => void moveDeliverable(d, status)}
        onDelete={setPendingDeliverableDelete}
      />
      <TransitionsSection transitions={summary?.transitions ?? []} loading={loading} />
      <TimeByTaskSection
        tasks={summary?.tasks ?? []}
        loading={loading}
        totalMinutes={summary?.totals.minutes ?? 0}
      />
      <DisciplineSplitSection
        disciplines={summary?.disciplines ?? []}
        loading={loading}
        totalMinutes={summary?.totals.minutes ?? 0}
      />
      <KindMixSection kinds={summary?.kinds ?? []} openBlockers={summary?.openBlockers ?? 0} loading={loading} />
      <CoverageSection
        gaps={summary?.gaps ?? []}
        streak={summary?.streak ?? { current: 0, longest: 0 }}
        unlinked={summary?.unlinked ?? 0}
        totals={summary?.totals ?? { entries: 0, minutes: 0, activeDays: 0 }}
        range={summary?.range ?? { from: state.rangeFrom, to: state.rangeTo }}
        loading={loading}
        onPickDay={(day) => patchState({ day, view: "day" })}
      />
      <DeliverableDialog
        draft={deliverableDraft}
        tasks={tasks}
        saving={busy}
        onDraftChange={setDeliverableDraft}
        onOpenChange={(open) => !open && setDeliverableDraft(null)}
        onSubmit={(value) => void saveDeliverable(value)}
      />
      <ConfirmDelete
        entry={pendingDelete}
        busy={busy}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={(entry) => void deleteEntry(entry)}
      />
```

`DeliverableStatus`, `DELIVERABLE_LABEL_STATUS` and `type DeliverableDto` join the
`@/lib/worklog/entries` import list, and `DeliverableDialog`, `ConfirmDeliverableDelete`,
`EMPTY_DELIVERABLE`, `toDeliverableDraft`, `type DeliverableDraft` join the `./dialogs` import, while
`DeliverablesSection`, `TransitionsSection`, `TimeByTaskSection`, `DisciplineSplitSection`,
`KindMixSection` and `CoverageSection` join the `./sections` one — an unused import is a lint error
in this repo, so every name added here must also be used here.

Then a second `ConfirmDelete`-shaped dialog for a deliverable delete. `ConfirmDelete` is typed to an
`EntryDto`, so add a sibling in `dialogs.tsx` rather than widening it — same shape, different noun:

```tsx
export function ConfirmDeliverableDelete({
  id,
  busy,
  onOpenChange,
  onConfirm,
}: {
  id: number | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: number) => void;
}) {
  return (
    <AlertDialog open={id !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Delete this deliverable?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            The record of a handed-over item is removed. The log entries that describe the work
            stay in your log — they are yours either way.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy || id === null}
            onClick={(event) => {
              event.preventDefault()
              if (id !== null) onConfirm(id)
            }}
          >
            {busy ? "Deleting…" : "Delete deliverable"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

rendered as:

```tsx
      <ConfirmDeliverableDelete
        id={pendingDeliverableDelete}
        busy={busy}
        onOpenChange={(open) => !open && setPendingDeliverableDelete(null)}
        onConfirm={(id) => void deleteDeliverable(id)}
      />
```

`TransitionsSection` reads `summary.transitions`, which the route already caps to the range and
scopes to `actor_id = session.id` (Task 10) — so the section says "what you moved", not "what
moved on your tasks".

- [ ] **Step 9: Run the guards and gates**

```bash
npm test -- worklog-page && npm run typecheck && npm run lint && npm test
git add app/dashboard/worklog tests/unit/worklog-page.test.ts
git commit -m "feat(worklog): deliverables board, transitions and the read-back sections"
git push
```
Expected: 9 new guards green, 11 sections rendered, typecheck 0 errors, lint 0 errors / 70
warnings. On the deployed page: Add one creates a deliverable that appears in the list; its
`In review` button moves it and the `Draft` button disappears for good once it reaches
`delivered`; the gap chips jump the day view; the discipline bars match the totals card.

---

### Task 17: The "Today" strip on `/dashboard`, and what a member sees first

`app/dashboard/page.tsx` is a client page that already loads `/api/dashboard/overview` in `load()`
(`app/dashboard/page.tsx:137-177`) and renders its sections as `SectionCard`s. It gains one more:
the day the member is standing in, read from the same summary endpoint the work log uses with
`view=day`, so the two pages cannot disagree about what today contains.

The strip is a preview with three jobs — show what is logged, show what moved, and give one keystroke
to the log itself. It is deliberately not a fourth input surface: quick add lives on the work log
page, because a strip that also writes rows is two places to learn.

**Files:**
- Modify: `app/dashboard/page.tsx`
- Test (append): `tests/unit/worklog-page.test.ts`

**Interfaces:**
- Consumes: `GET /api/worklog/summary?view=day` → `WorklogSummary` (Task 10); `EntryDto`,
  `KIND_LABEL`, `formatMinutes` from `@/lib/worklog/entries`; `DISCIPLINE_LABEL`, `DISCIPLINE_COLOUR`
  from `@/lib/roles`; `localDay` from `@/lib/worklog/local-day`; `SectionCard`, `EmptyNote`;
  `Link` from `next/link`.
- Produces: `TodayStrip({ summary, loading, todayIso })` — a local component in the dashboard page,
  plus the `today` slot inside that page's existing `load()`.

- [ ] **Step 1: Write the failing guards**

Append to `tests/unit/worklog-page.test.ts`:

```ts
describe("dashboard today strip", () => {
  const dash = () => src("app/dashboard/page.tsx")

  it("fetches the day through the shared summary endpoint", () => {
    expect(dash()).toMatch(/fetch\("\/api\/worklog\/summary\?view=day"\)/u)
  })

  it("keeps the day on the server's calendar, not the browser's", () => {
    expect(dash()).toMatch(/localDay\(new Date\(\)/u)
    expect(dash()).not.toMatch(/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/u)
  })

  it("degrades to a link when the summary call fails", () => {
    const code = dash()
    expect(code).toMatch(/setToday\(null\)/u)
    expect(code).toMatch(/\/dashboard\/worklog/u)
    expect(code).not.toMatch(/catch \{\s*\}/u)
  })

  it("shows the three numbers the strip exists for", () => {
    const code = dash()
    expect(code).toMatch(/totals\.entries/u)
    expect(code).toMatch(/totals\.minutes/u)
    expect(code).toMatch(/streak\.current/u)
  })

  it("links every row it previews to the log filtered by that day", () => {
    expect(dash()).toMatch(/\/dashboard\/worklog\?\$\{new URLSearchParams\(\{ v: "day", day: todayIso \}\)\}/u)
  })

  it("does not fake a section when there is nothing logged", () => {
    expect(dash()).toMatch(/EmptyNote|Nothing logged yet/u)
    expect(dash()).not.toMatch(/placeholder|lorem/iu)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- worklog-page`
Expected: FAIL — `app/dashboard/page.tsx` has no worklog fetch.

- [ ] **Step 3: Load the day**

In `app/dashboard/page.tsx`, add to the state block beside the existing `overview` state:

```tsx
  const [today, setToday] = useState<WorklogSummary | null>(null)
  const [todayLoading, setTodayLoading] = useState(true)
```

and inside `load()`, in parallel with the two fetches it already runs, so a slow log endpoint cannot
delay the sprint data:

```tsx
      const todayRes = await fetch("/api/worklog/summary?view=day")
      const todayJson = await todayRes.json()
      if (todayRes.ok && todayJson?.success) {
        setToday(todayJson.data as WorklogSummary)
      } else {
        setToday(null)
      }
```

with `setTodayLoading(false)` in the existing `finally`, and `type WorklogSummary` imported from
`@/lib/worklog/summary`. The failure branch matters: `getSession()` returning null is a 401 here, and
a dashboard that renders a card of zeros would be lying about the member's day.

- [ ] **Step 4: Write the strip**

Add above the page component:

```tsx
function TodayStrip({
  summary,
  loading,
  todayIso,
}: {
  summary: WorklogSummary | null;
  loading: boolean;
  todayIso: string;
}) {
  const logHref = `/dashboard/worklog?${new URLSearchParams({ v: "day", day: todayIso })}`
  const day = summary?.days[0]
  return (
    <SectionCard
      title={`Today — ${todayIso}`}
      icon={<CalendarClock className="h-4 w-4" />}
      action={
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={logHref}>
            Open work log
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      }
    >
      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : summary === null ? (
        <EmptyNote>
          Could not read your log right now.{" "}
          <Link href={logHref} className="underline underline-offset-2">
            Open the work log
          </Link>{" "}
          to try again.
        </EmptyNote>
      ) : summary.totals.entries === 0 ? (
        <EmptyNote>
          Nothing logged today yet. The work log takes one line — what you did, roughly how long,
          and which kind of work it was.
        </EmptyNote>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
              {summary.totals.entries} {summary.totals.entries === 1 ? "entry" : "entries"}
            </span>
            <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
              {formatMinutes(summary.totals.minutes)} recorded
            </span>
            <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
              {summary.streak.current} {summary.streak.current === 1 ? "day" : "days"} in a row
            </span>
            {summary.openBlockers > 0 && (
              <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive tabular-nums">
                {summary.openBlockers} open {summary.openBlockers === 1 ? "blocker" : "blockers"}
              </span>
            )}
          </div>
          <ul className="divide-y divide-border">
            {(day?.entries ?? []).slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-baseline gap-2 py-1.5 text-xs first:pt-0 last:pb-0">
                <span
                  className="h-2 w-2 shrink-0 translate-y-0.5 rounded-full"
                  style={{ background: e.discipline ? DISCIPLINE_COLOUR[e.discipline] : "hsl(var(--muted-foreground))" }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="shrink-0 text-muted-foreground">
                  {KIND_LABEL[e.kind]}
                  {e.minutes ? ` · ${formatMinutes(e.minutes)}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {summary.transitions.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {summary.transitions.length} {summary.transitions.length === 1 ? "task" : "tasks"}{" "}
              changed status today — {summary.transitions.map((t) => t.toStatus).join(", ")}
            </p>
          )}
          {(day?.entries.length ?? 0) > 5 && (
            <p className="text-[11px] text-muted-foreground">
              {day!.entries.length - 5} more in the work log.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  )
}
```

`CalendarClock` and `ArrowRight` are already imported by this file
(`app/dashboard/page.tsx:24,27`); `SectionCard`, `EmptyNote`, `Skeleton`, `Button`, `Link` likewise.
Four new imports join them: `localDay` from `@/lib/worklog/local-day`, `type WorklogSummary` from
`@/lib/worklog/summary`, and `KIND_LABEL` plus `formatMinutes` from `@/lib/worklog/entries`.
`DISCIPLINE_COLOUR` comes from `@/lib/roles`.
The five-entry cap is stated in the last line rather than silent, so a member is never told their day
was five things when it was nine.

- [ ] **Step 5: Place it first**

The strip goes at the top of the sections grid, before "Sprint burndown"
(`app/dashboard/page.tsx:700`), because "what did I do today" outranks "how is the sprint trending"
on the page a member opens every morning:

```tsx
        <TodayStrip
          summary={today}
          loading={todayLoading}
          todayIso={today?.range.from ?? localDay(new Date())}
        />
```

The heading's day is `today.range.from` — for `view=day` the route resolves that through
`users.timezone` (Task 10), so a member who logs at 23:50 Nairobi time sees the entry under the day
it belongs to even when their laptop is a day ahead. `localDay(new Date())` is only the fallback for
the moment before the first response lands, and the guard in step 1 pins that shape so this cannot
drift into a bare `toISOString().slice(0,10)`.

- [ ] **Step 6: Run the guards and gates**

```bash
npm test -- worklog-page && npm run typecheck && npm run lint && npm test
git add app/dashboard/page.tsx tests/unit/worklog-page.test.ts
git commit -m "feat(dashboard): today strip from the worklog summary"
git push
```
Expected: 6 strip guards green, `/dashboard` at 16 sections (`≥15` owner rule holds), typecheck 0
errors, lint 0 errors / 70 warnings. On the deployed page: log an entry on `/dashboard/worklog`,
back to `/dashboard`, and it is in the strip with its kind and time.

---

### Task 18: Docs, the two guard files, and the spec sync

Phase 1 ended with a guard test that would fail the next time someone widened an endpoint; phase 2
ends the same way, plus three documentation changes the owner reads instead of the diff. Nothing in
this task adds a feature — it makes the phase auditable and records the two things that were
deliberately left out, because "absent" and "forgotten" look identical in a README three months from
now.

**Files:**
- Create: `tests/unit/worklog-api.test.ts` (Task 6–10 each appended a `describe`; this task asserts
  the file still covers every route)
- Modify: `tests/unit/worklog-page.test.ts` (one final sweep)
- Modify: `FEATURES.md` — new `## 8. Worklog UI (phase 2, 2026-10-26)`
- Modify: `DESIGN_SYSTEM.md` — the section inventory and the kind/discipline colour table
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` — §4
  corrected to what exists, §16 phase 2 marked shipped, §12.7/§16 phase 17 widened to the owner's
  onboarding brief
- Modify: `PLACEHOLDERS.md` — nothing new is a placeholder; say so and close the gap the phase left

**Interfaces:**
- Consumes: every file this phase created or modified.
- Produces: documentation only, plus two guard files that fail if a later phase quietly removes a
  control.

- [ ] **Step 1: Write the API guard sweep**

`tests/unit/worklog-api.test.ts` was appended to by Tasks 6–10. Add the final `describe` that makes
the whole file's intent explicit — each route is scanned, not spot-checked:

```ts
describe("every worklog route", () => {
  const routes = [
    "app/api/worklog/entries/route.ts",
    "app/api/worklog/entries/[id]/route.ts",
    "app/api/worklog/entries/bulk/route.ts",
    "app/api/worklog/deliverables/route.ts",
    "app/api/worklog/deliverables/[id]/route.ts",
    "app/api/worklog/summary/route.ts",
    "app/api/worklog/_shared.ts",
  ]

  it.each(routes)("%s scopes by the session user in SQL", (route) => {
    const code = src(route)
    expect(code).toMatch(/session\.id|userId/u)
  })

  // Only the files that actually export a write handler are held to the whitelist, so a
  // read-only route is not forced to import a function it never calls.
  const writers = routes.filter((route) => /export async function (POST|PUT|DELETE)/.test(src(route)))

  it("every route that writes goes through a Task 4 whitelist", () => {
    expect(writers.length).toBeGreaterThanOrEqual(5)
    for (const route of writers) {
      expect(src(route)).toMatch(
        /readEntryCreate|pickEntryUpdates|readDeliverableCreate|pickDeliverableUpdates|readBulkRequest/u,
      )
    }
  })

  it.each(routes)("%s has no client-only secret and no stub", (route) => {
    const code = src(route)
    expect(code).not.toMatch(/NEXT_PUBLIC_/u)
    expect(code).not.toMatch(/TODO|FIXME|not implemented/iu)
    expect(code).not.toMatch(/return new Response\("stub"/u)
  })

  it("imports nothing that reaches lib/db from a pure module", () => {
    for (const file of [
      "lib/worklog/local-day.ts",
      "lib/worklog/entries.ts",
      "lib/worklog/quick-add.ts",
      "lib/worklog/entry-fields.ts",
      "lib/worklog/view-state.ts",
      "lib/worklog/bulk.ts",
      "lib/worklog/summary.ts",
    ]) {
      expect(src(file)).not.toMatch(/@\/lib\/db|from "\.\.\/\.\.\/lib\/db"/u)
    }
  })

  it("reuses the phase-1 tables instead of declaring a new schema", () => {
    const all = routes.map(src).join("\n")
    expect(all).toMatch(/@\/drizzle\/schema/u)
    expect(all).not.toMatch(/CREATE TABLE|ALTER TABLE/u)
  })
})
```

Run: `npm test -- worklog-api`. If a route fails its own guard, fix the route — the guard is the
contract the earlier tasks wrote.

- [ ] **Step 2: Write the page sweep**

Append to `tests/unit/worklog-page.test.ts`:

```ts
describe("the finished page", () => {
  const client = () => src("app/dashboard/worklog/worklog-client.tsx")
  it("has eleven always-visible sections and one conditional bar", () => {
    const code = client()
    const sections = [
      "TotalsSection",
      "QuickAddSection",
      "FilterSection",
      "ViewToolbarSection",
      "LogSection",
      "DeliverablesSection",
      "TransitionsSection",
      "TimeByTaskSection",
      "DisciplineSplitSection",
      "KindMixSection",
      "CoverageSection",
    ]
    for (const name of sections) {
      expect(code).toMatch(new RegExp(`<${name}[\\s(]`, "u"))
    }
    expect(code).toMatch(/selection\.length > 0\s*&&\s*<BulkSection/u)
    expect(src("app/dashboard/worklog/sections.tsx")).toMatch(/export const SECTION_TITLES/u)
  })

  it("declares the section titles it renders", () => {
    const titles = src("app/dashboard/worklog/sections.tsx")
    for (const title of [
      "This period",
      "Quick add",
      "Find in the log",
      "View",
      "Deliverables",
      "Status changes",
      "Time by task",
      "Where the time went",
      "Mix of work",
      "Coverage",
    ]) {
      expect(titles).toContain(title)
    }
  })

  it("leaves no dead affordance anywhere on the page", () => {
    const code = [
      "app/dashboard/worklog/page.tsx",
      "app/dashboard/worklog/worklog-client.tsx",
      "app/dashboard/worklog/sections.tsx",
      "app/dashboard/worklog/dialogs.tsx",
    ]
      .map(src)
      .join("\n")
    expect(code).not.toMatch(/href="#"/u)
    expect(code).not.toMatch(/onClick=\{\(\) => \{\}\}/u)
    expect(code).not.toMatch(/console\.(log|warn)\(/u)
    expect(code).not.toMatch(/window\.(alert|confirm)\(/u)
    expect(code).not.toMatch(/TODO|FIXME/iu)
  })

  it("never treats a discipline preference as a permission", () => {
    // The filter narrows what the member sees; the SQL narrows what they may see at all.
    expect(src("app/api/worklog/_shared.ts")).toMatch(/user_id|userId/u)
    expect(client()).not.toMatch(/if \(!state\.disciplines\.includes\(.*\)\) return null/u)
  })

  it("keeps the vocabulary in one module per dimension", () => {
    const page = [
      "app/dashboard/worklog/worklog-client.tsx",
      "app/dashboard/worklog/sections.tsx",
      "app/dashboard/worklog/dialogs.tsx",
    ]
      .map(src)
      .join("\n")
    expect(page).not.toMatch(/const WORK_LOG_KINDS/u)
    expect(page).not.toMatch(/const DELIVERABLE_STATUSES/u)
    expect(page).not.toMatch(/\["draft", "in_review", "approved", "delivered"\]/u)
  })

  it("wires the nav item that makes the page reachable", () => {
    expect(src("components/dashboard-layout.tsx")).toMatch(/\/dashboard\/worklog/u)
    expect(src("components/dashboard-layout.tsx")).toMatch(/Work log/u)
  })
})
```

The `SECTION_TITLES` export lists the ten fixed titles in render order — a guard that counts
`<SectionCard`s would pass on a page that rendered the same one twice, and would fail when a
section legitimately changes its own heading. Add the array in the same edit as the guard so the
test drives a declaration rather than prose:

```tsx
export const SECTION_TITLES = [
  "This period",
  "Quick add",
  "Find in the log",
  "View",
  "Deliverables",
  "Status changes",
  "Time by task",
  "Where the time went",
  "Mix of work",
  "Coverage",
] as const
```

(Sections 5 and the bulk bar title their own cards from `VIEW_LABEL` and the selection count, so
they are not in this list — the guard above asserts both separately.)

- [ ] **Step 3: `FEATURES.md`**

Append a numbered section in the file's existing style. State plainly what shipped and what did not:

```markdown
## 8. Worklog UI (phase 2, 2026-10-26)

`/dashboard/worklog` — the day view that reads back what phase 1 captured, plus the record of work
that was never a task.

**Shipped.** Eleven sections on one page, every one visible in every view: totals for the range,
quick add (one line, optional `15m` / kind / discipline), filters (search, task, kind, discipline
by group, deliverable state, date presets), the view toolbar, the log itself in five renderings
(day, week grid, all entries, by kind, calendar heat), the deliverables board, the status-change
timeline read from `task_events`, time by task, the discipline split, the kind mix with open
blockers, and coverage with its gap days. Full CRUD on entries and deliverables through dialogs with
inline validation; a bulk bar over a selection with five actions that match the API exactly; CSV
export of what is on screen; every control mirrored into the URL so a view is a link; the member's
day resolved through their own timezone. `/dashboard` gained a "Today" strip from the same summary
endpoint. The work-discipline vocabulary is now 75 disciplines in 10 category groups, and the five
ids shipped in phase 1 keep their spelling, so existing rows and saved preferences stayed valid —
this phase added no migration.

**Deliberately absent.** "Group into report draft" (phase 3), PDF and XLSX export (phase 5), the
team/admin day view (phase 4), the Gantt (phase 8). Nothing on the page pretends to do these.

**Still separate dimensions.** `lib/roles.ts` holds work classifications only. Job titles,
departments and project roles are not in it and are not collapsed into it; they arrive with the
phase-15 role packs and the phase-17 onboarding. A discipline preference is a display filter —
every read is scoped by `user_id` in SQL regardless of what a member has switched on.
```

- [ ] **Step 4: `DESIGN_SYSTEM.md`**

Add the two tables the phase produced. The colour table matters because it is the only place a
reader can confirm that a discipline's colour comes from its **category**, not from a per-discipline
choice, which is what keeps 75 values legible:

```markdown
### Work log section inventory

| # | Section | Component | Grid | Data |
| --- | --- | --- | --- | --- |
| 1 | Totals for the range | `TotalsSection` | `md:col-span-2 xl:col-span-3` | `summary.totals` |
| 2 | Quick add | `QuickAddSection` | `md:col-span-2` | `parseQuickAdd` → `POST /api/worklog/entries` |
| 3 | Filter | `FilterSection` | `md:col-span-2` | `lib/worklog/view-state` |
| 4 | View | `ViewToolbarSection` | `md:col-span-2` | `WORKLOG_VIEWS`, `RANGE_PRESETS` |
| 5 | The log | `LogSection` | `md:col-span-2 xl:col-span-3` | `summary.days`, `/api/worklog/entries` |
| 6 | Deliverables | `DeliverablesSection` | `md:col-span-2 xl:col-span-3` | `/api/worklog/deliverables` |
| 7 | Status changes | `TransitionsSection` | `md:col-span-2` | `summary.transitions` |
| 8 | Time by task | `TimeByTaskSection` | `md:col-span-2 xl:col-span-2` | `summary.tasks` |
| 9 | Where the time went | `DisciplineSplitSection` | `md:col-span-2 xl:col-span-2` | `summary.disciplines` |
| 10 | Mix of work | `KindMixSection` | `md:col-span-2 xl:col-span-2` | `summary.kinds` |
| 11 | Coverage | `CoverageSection` | `md:col-span-2 xl:col-span-3` | `summary.gaps`, `.streak` |
| — | Selected | `BulkSection` | full width, only while rows are ticked | the selection |

### Kind and discipline colour

Kinds take `KIND_COLOUR[kind]`; disciplines take `DISCIPLINE_COLOUR[d]`, which is the **category**
colour — `delivery→pine`, `technology→slate`, `information→teal`, `finance→moss`,
`operations→stone`, `engineering→bark`, `market→clay`, `people→plum`, `science→sage`,
`services→ochre`. Every value is `hsl(var(--chart-*))`; a bare `var()` is an invalid colour and
renders nothing, which is why the wrap is in the map and not at the call site. Colour never carries
meaning alone: every badge and bar also prints its label.
```

- [ ] **Step 5: Sync the spec**

Two of the three edits below were made when the owner added the brief, and are already on the spec
file — apply the remaining one and re-read the others against what actually shipped.
`docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`:

1. **§4** *(still to do)* — the bulk actions list becomes the five that exist (`delete`, `set-task`, `re-date`,
   `set-kind`, `convert-deliverable`), and the export sentence becomes
   "CSV client-side from the current selection or the filtered range; PDF and XLSX are phase 5."
2. **§12.7 Onboarding** *(already written; verify, do not rewrite)* — the three-step sketch is already
   replaced by the owner's eight adaptive steps, keeping the architecture the spec had chosen: state
   lives under `preferences.settings.onboarding` written through the existing `/api/settings`
   `jsonb_set` merge, **not** new `users` columns, so the signup path and the auth schema stay
   untouched and no migration is needed. Progress persists after each step, a member who leaves
   resumes where they stopped, and a completed member is never redirected back. The owner's four
   rules are recorded: existing members are grandfathered as completed and never lose a saved
   preference; a workspace join goes through an invitation the server verifies, never by typing an
   organisation name; a discipline preference is a display filter, not authorization; the wizard
   consumes the canonical `lib/roles.ts` vocabulary and creates no competing one. **Check only** that
   §13's `workspace_invitations` row and §13's 75-discipline paragraph still describe what phase 2
   built — if `DisciplinePicker` shipped with a different grouping name than `DISCIPLINE_CATEGORIES`,
   the spec is the file that has to change.
3. **§16** *(partly done)* — phase 17's line is already widened to the eight adaptive steps and the
   invitation mechanism. Still to do: mark **phase 2 shipped** with its date.

- [ ] **Step 6: `PLACEHOLDERS.md`**

Record that phase 2 added none, and what a reader should not mistake for one. The command palette
shortcut, the notification bell and the AI panel keep whatever state they had before this phase; the
work log introduces no new stub.

- [ ] **Step 7: Full gates, then the final commit**

```bash
npm run typecheck && npm run lint && npm test
```
Expected: 0 type errors, 0 lint errors / exactly 70 warnings, the whole suite green
(phase 1 shipped 27 files / 486 tests; this phase adds nine test files — day, entries, quick-add,
fields, view-state, bulk, summary, api, page — and roughly 230 cases).

```bash
git add FEATURES.md DESIGN_SYSTEM.md PLACEHOLDERS.md docs/superpowers/specs tests/unit/worklog-api.test.ts tests/unit/worklog-page.test.ts
git commit -m "docs(worklog): phase 2 shipped — features, section inventory, spec sync"
git push
```

- [ ] **Step 8: What the owner checks by hand**

Visual QA is theirs (`i will do the test just implement`). The five things a test cannot see:

1. `?v=heat` on a phone — the calendar does not overflow the card.
2. Quick add `#45 #blocker landlord will not give roof access` → the row shows 45 minutes and the
   Blocker badge, and the sentence keeps `#45`-free text; an unrecognised `#tech` stays in the title
   rather than silently becoming a discipline, because a sigil nobody reads is a private language.
3. Tick 3 rows → the bulk bar appears; un-tick everything → it disappears.
4. Export CSV and open it in a spreadsheet: a title with a comma is one cell, not two rows.
5. A second account cannot reach the first one's rows by editing a URL id — every mutation answers
   404.

---


