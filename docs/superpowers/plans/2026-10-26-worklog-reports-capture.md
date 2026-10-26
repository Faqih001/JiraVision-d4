# Worklog Phase 1 — Schema and Capture — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task, in order, in the
> main session. **Do not dispatch subagents** — the owner requires all work in this repository to be done inline by
> the main agent, so the usual `subagent-driven-development` option is off the table here. Every step below is a
> checkbox; work them in sequence and do not skip a test cycle.

**Goal:** Create the storage for the daily work log, period reports, planner and assistant (10 new tables plus 3
nullable `tasks` columns), extend the cadence vocabulary with `one-off` and `yearly`, add the discipline vocabulary,
and start recording every task status change into `task_events` from every route that can change one.

**Architecture:** One new system of record (`task_events`, `work_log_entries`, `deliverables`, `work_reports` +
recipients, `agent_plans` + `plan_items`, `assistant_threads` + `messages`, `ai_usage_daily`) written by a capture
helper that is called from the existing task mutation routes. The diff logic that decides *what counts as a status
change* is a pure module with no database import, so it is unit-testable; the thin writer that inserts is separate.
Schema arrives as additive raw SQL (the repo idiom) rather than `drizzle-kit push`, because `push` can drop what it
does not find in the schema file and this database is live production Neon.

**Tech Stack:** Next.js 16.1.1 App Router, `drizzle-orm@0.45.4` against Neon Postgres, `postgres` driver for scripts,
Vitest (node environment, `tests/unit/**/*.test.ts`, alias `@` → repo root).

**Spec:** [docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md](../specs/2026-10-26-worklog-reports-planner-assistant-design.md)
§4 (capture), §13 (data model), §15 (testing), §16 phase 1. This plan implements **phase 1 only**. No UI ships in
phase 1; the log starts filling the moment the migration runs and the routes deploy.

## Global Constraints

- **Never run `npm run build` locally.** The owner's standing rule; Vercel builds on push.
- Gates on **every** commit: `npm run typecheck` → 0 errors; `npm run lint` → 0 errors (the 70-warning baseline is
  expected and must not grow); `npm test` → all green. Baseline at the time of writing: 23 files, 424 tests.
- **Commit and push after every task.** This repository has a standing commit+push grant, and push auto-deploys to
  production (https://jiravision.vercel.app). Never rewrite pushed history.
- **No unit test may import a DB-facing module.** `lib/db.js` is a required CommonJS shim that shadows `lib/db.ts`
  under Vitest, and importing a connection needs `DATABASE_URL` at import time. Anything needing the database stays
  out of the tested module; pure logic lives beside it. (Same reason [lib/roles.ts:1-3](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/lib/roles.ts#L1)
  is cookie- and DB-free.)
- **Only `lib/roles.ts` and `lib/cadence.ts` are vocabulary-owning modules.** No route or component may declare its
  own discipline list or cadence list.
- **Discovered while executing Task 3 (2026-10-26): a second CommonJS shadow exists** — `drizzle/schema.js` is a
  stale four-table duplicate, and Vite's default extension order tries `.js` before `.ts`, so an extensionless
  `@/drizzle/schema` import silently loads it under Vitest (Turbopack prefers `.ts`, so the app was never affected).
  Fixed by pinning the path in `vitest.config.ts`'s `resolve.alias`, above the `"@"` entry. Any later test that
  needs the real schema relies on that pin. The stale file is left in place; deleting it is a separate decision.
- Migration is **additive-only**: `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`. No `DROP`, no
  `ALTER COLUMN`, no data rewrite, and **`drizzle-kit push` is not used**.
- Scripts that touch the database run from the **repo root** and read `.env.local` with `/^DATABASE_URL/m` — line 1
  of `.env.local` is a commented-out stale URL.
- **Task 9 is the only step that writes to production Neon, and it must be preceded by an explicit confirmation from
  the owner.** No test rows are inserted into any live table at any point in this plan.
- `task_events` records **status transitions on the `tasks` table only**. Creation is already a real column
  (`tasks.created_at`); deletion cascades the task's events away with it, so there is no `deleted` event to write.
- Dev server is **not** running and must not be restarted without asking the owner. Visual QA is the owner's.

---

## File structure

| File | Phase 1 role |
| --- | --- |
| `lib/cadence.ts` | **new** — cadence vocabulary, labels, `computeNextRun`, `one-off`, `yearly` |
| `lib/roles.ts` | **modify** — `WORK_DISCIPLINES` + label/icon/colour/template maps, `isWorkDiscipline` |
| `drizzle/schema.ts` | **modify** — 10 tables + 3 `tasks` columns + `index` import |
| `lib/worklog/task-events.ts` | **new, pure** — decides which before/after pairs are status changes |
| `lib/worklog/capture.ts` | **new, DB** — inserts the rows the pure module produced, never throws |
| `lib/task-updates.ts` | **modify** — whitelist gains `startDate` + `discipline`; `sourcePlanId` stays out |
| `app/api/tasks/[id]/route.ts` | **modify** — capture on PUT |
| `app/api/tasks/bulk/route.ts` | **modify** — before-read + capture on `update` |
| `app/api/dashboard/tasks/route.ts` | **modify** — before-read + capture on PUT |
| `app/api/test/tasks/[id]/route.ts` | **modify** — same as its production twin (sibling endpoint) |
| `app/api/test/tasks/bulk/route.ts` | **modify** — same as its production twin |
| `app/api/reports/_shared.ts` | **modify** — cadence definitions re-exported from `lib/cadence.ts` |
| `app/api/reports/route.ts`, `app/api/reports/[id]/route.ts`, `app/api/reports/[id]/run/route.ts` | **modify** — validation messages name all five cadences |
| `app/dashboard/reports/page.tsx` | **modify** — cadence selects and labels come from `lib/cadence.ts` |
| `scripts/create-worklog-tables.mjs` | **new** — the migration |
| `scripts/rollback-worklog-tables.mjs` | **new** — flag-gated, never run by this plan |
| `package.json` | **modify** — two `db:worklog*` scripts |
| `vitest.config.ts` | **modify** — pin `@/drizzle/schema` to the `.ts` (see Task 3 Step 1) |
| `tests/unit/cadence.test.ts` | **new** |
| `tests/unit/worklog-schema.test.ts` | **new** |
| `tests/unit/worklog-capture.test.ts` | **new** |
| `tests/unit/worklog-reports.test.ts` | **new** — the phase-1 subset of the spec's guard file |
| `tests/unit/roles.test.ts`, `tests/unit/task-updates.test.ts`, `tests/unit/schema-safety.test.ts` | **modify** — extend, do not duplicate |

Two deliberate deviations from the spec, both recorded in Task 10 so the design doc is synced afterwards:
`plan_items.order` is renamed `plan_items.sort_order` (`order` is a SQL reserved word and quoting it buys nothing),
and `work_log_entries.playbook_id` is created **without** a foreign key because `playbooks` does not exist until
spec §16 phase 16 — that phase adds the constraint with `ALTER TABLE ... ADD CONSTRAINT`.

---

### Task 1: Cadence vocabulary with `one-off` and `yearly`

**Files:**
- Create: `lib/cadence.ts`
- Create: `tests/unit/cadence.test.ts`
- Modify: `app/api/reports/_shared.ts:47-56` and `:88-94`
- Modify: `app/api/reports/route.ts:57`, `app/api/reports/[id]/route.ts:103`, `app/api/reports/[id]/run/route.ts:57`
- Modify: `app/dashboard/reports/page.tsx:75`, `:122-126`, `:722`, `:978`

**Interfaces:**
- Consumes: nothing.
- Produces: `CADENCES`, `type Cadence`, `isCadence`, `CADENCE_LABEL`, `CADENCE_DAYS`, `computeNextRun(cadence, from?) => string | null`,
  re-exported unchanged from `app/api/reports/_shared.ts` so no existing import breaks.

- [x] **Step 1: Write the failing tests.** Create `tests/unit/cadence.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  CADENCES,
  CADENCE_DAYS,
  CADENCE_LABEL,
  computeNextRun,
  isCadence,
} from "@/lib/cadence"

// Lifted out of app/api/reports/_shared.ts:47,88 so the work log, the register queue
// and the report builder share one recurrence definition. The three cadences that
// already ship must keep producing exactly the timestamps they produced before.
describe("CADENCES", () => {
  it("keeps the three shipped values and adds one-off and yearly", () => {
    expect(CADENCES).toEqual(["one-off", "daily", "weekly", "monthly", "yearly"])
  })

  it("labels every member, so a select can render from the vocabulary alone", () => {
    for (const cadence of CADENCES) {
      expect(CADENCE_LABEL[cadence]).toBeTruthy()
      expect(CADENCE_LABEL[cadence]).not.toBe(cadence)
    }
  })

  it("accepts a member and rejects everything shaped like one but is not", () => {
    expect(isCadence("yearly")).toBe(true)
    expect(isCadence("annual")).toBe(false)
    expect(isCadence("")).toBe(false)
    expect(isCadence(undefined)).toBe(false)
  })
})

describe("computeNextRun", () => {
  const from = new Date("2026-10-26T07:30:00.000Z")

  it("keeps the existing daily step", () => {
    expect(computeNextRun("daily", from)).toBe("2026-10-27T07:30:00.000Z")
  })

  it("keeps the existing weekly step", () => {
    expect(computeNextRun("weekly", from)).toBe("2026-11-02T07:30:00.000Z")
  })

  it("keeps the existing monthly step", () => {
    expect(computeNextRun("monthly", from)).toBe("2026-11-26T07:30:00.000Z")
  })

  it("advances a year for yearly", () => {
    expect(computeNextRun("yearly", from)).toBe("2027-10-26T07:30:00.000Z")
  })

  it("advances a year from a leap day and says where it lands", () => {
    // JS date math rolls an out-of-range day forward rather than clamping it, so a
    // yearly schedule first run on 2028-02-29 next fires on 2029-03-01. Documented here
    // because silently accepting that in a report period would look like an off-by-one.
    expect(computeNextRun("yearly", new Date("2028-02-29T00:00:00.000Z"))).toBe(
      "2029-03-01T00:00:00.000Z",
    )
  })

  it("has no next run at all for a one-off schedule", () => {
    expect(computeNextRun("one-off", from)).toBeNull()
  })

  it("defaults to now, so a caller can pass nothing", () => {
    const before = Date.now()
    const next = computeNextRun("daily")
    expect(next).not.toBeNull()
    expect(Date.parse(next as string) - before).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 5000)
  })

  it("states a period length for everything but one-off", () => {
    expect(CADENCE_DAYS["one-off"]).toBeNull()
    expect(CADENCE_DAYS.yearly).toBe(365)
  })
})
```

- [x] **Step 2: Run them and watch them fail.** `npm test -- cadence` → cannot resolve `@/lib/cadence`.

- [x] **Step 3: Write `lib/cadence.ts`.**

```ts
// Report and recurrence vocabulary. Deliberately free of the database and of cookies,
// the same reason lib/roles.ts is: lib/db.js shadows lib/db.ts under Vitest, so anything
// that imports a connection cannot be unit tested. Kept as one small module because the
// work log, the report builder and the register queue all need the same five values.

export const CADENCES = ["one-off", "daily", "weekly", "monthly", "yearly"] as const
export type Cadence = (typeof CADENCES)[number]

export const CADENCE_LABEL: Record<Cadence, string> = {
  "one-off": "One-off",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
}

/** Nominal period length in days, for range defaults. `one-off` has no period. */
export const CADENCE_DAYS: Record<Cadence, number | null> = {
  "one-off": null,
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
}

export function isCadence(value: unknown): value is Cadence {
  return typeof value === "string" && (CADENCES as readonly string[]).includes(value)
}

/**
 * The next time this schedule should run, or null when it should never run again.
 * UTC arithmetic on purpose: `report_schedules.next_run_at` is a timestamptz and the
 * existing rows were produced this way, so a change here would shift live schedules.
 */
export function computeNextRun(cadence: Cadence, from: Date = new Date()): string | null {
  if (cadence === "one-off") return null
  const next = new Date(from)
  switch (cadence) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1)
      break
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7)
      break
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1)
      break
    case "yearly":
      // setUTCFullYear rolls 29 Feb to 1 Mar of the next year rather than clamping.
      next.setUTCFullYear(next.getUTCFullYear() + 1)
      break
  }
  return next.toISOString()
}
```

- [x] **Step 4: Run the tests.** `npm test -- cadence` → 11 passing.

- [x] **Step 5: Point `app/api/reports/_shared.ts` at the module.** Replace lines 47-56
(`CADENCES`, `Cadence`, `isCadence`) and the `computeNextRun` body at `:88-94` with:

```ts
// The vocabulary lives in lib/cadence.ts so the work log and the register queue use the
// same five values. Re-exported here because every existing `/api/reports` import comes
// from this file.
export {
  CADENCES,
  CADENCE_LABEL,
  computeNextRun,
  isCadence,
  type Cadence,
} from "@/lib/cadence"
```

Keep `parseRangeDays`, `idInList`, `unauthorized`, `badRequest`, `serverError`, `DATASETS` and the DTOs where they
are. If `sql` or `NextResponse` becomes an unused import after the deletion, remove it — lint must not gain a warning.

- [x] **Step 6: Handle the new `null`.** Three call sites interpolate the result into SQL; `NULL::timestamptz` is
valid Postgres and is the honest value for a schedule that will not run again.

- `app/api/reports/[id]/run/route.ts:57` — no change needed if the template already accepts `string | null`;
  verify with `npm run typecheck` in Step 8.
- `app/api/reports/[id]/route.ts:146` — same.
- `app/api/reports/route.ts:81` — `const nextRunAt = computeNextRun(cadence)`: leave as-is; the insert binds null.

Then widen the two validation messages so they cannot lie about the accepted set:
`app/api/reports/[id]/route.ts:103` →
`return badRequest(\`cadence must be one of: ${CADENCES.join(", ")}\`)` and `app/api/reports/route.ts:57`'s
fallback comment if it names three. Add `CADENCES` to that import list.

- [x] **Step 7: Make the existing report builder offer all five.** In `app/dashboard/reports/page.tsx`:
delete the local `type Cadence` at `:75` and the local `CADENCE_LABEL` at `:122-126`; import
`import { CADENCE_LABEL, CADENCES, type Cadence } from "@/lib/cadence"` with the other `@/lib` imports. Replace both
hard-coded lists — the filter select at `:722` and the draft select at `:978` — with `{CADENCES.map((c) => ( … ))}`,
keeping each option's existing markup and `value={c}`. `Schedule.cadence` at `:93` and `draft.cadence` at `:143` keep
the imported type. The table cell that reads `CADENCE_LABEL[...]` at `:309` now resolves for `one-off` and `yearly`.

- [x] **Step 8: Gates.** `npm run typecheck` → 0. `npm run lint` → 0 errors, 70 warnings. `npm test` → 435 passing
(424 + 11).

- [x] **Step 9: Commit and push.**

```bash
git add lib/cadence.ts tests/unit/cadence.test.ts app/api/reports app/dashboard/reports/page.tsx
git commit -m "feat(cadence): move recurrence to its own module and add one-off + yearly"
git push
```

---

### Task 2: Discipline vocabulary

**Files:**
- Modify: `lib/roles.ts` (append after `isSuperAdmin`)
- Modify: `tests/unit/roles.test.ts` (append a `describe` block)

**Interfaces:**
- Consumes: nothing.
- Produces: `WORK_DISCIPLINES`, `type WorkDiscipline`, `DISCIPLINE_LABEL`, `DISCIPLINE_ICON`, `DISCIPLINE_COLOUR`,
  `DISCIPLINE_TEMPLATE`, `DEFAULT_DISCIPLINE`, `isWorkDiscipline`, `normaliseDiscipline`. Task 3 stamps the same
  strings into `tasks.discipline`; Task 4 validates against `isWorkDiscipline`.

- [x] **Step 1: Write the failing tests.** Append to `tests/unit/roles.test.ts`:

```ts
describe("work disciplines", () => {
  it("is the only discipline vocabulary the app has, in report order", () => {
    expect(WORK_DISCIPLINES).toEqual([
      "developer",
      "technician",
      "designer",
      "auditor",
      "coordinator",
    ])
  })

  it("labels, colours, names an icon and picks a template for every member", () => {
    for (const discipline of WORK_DISCIPLINES) {
      expect(DISCIPLINE_LABEL[discipline]).toBeTruthy()
      expect(DISCIPLINE_COLOUR[discipline]).toMatch(/^hsl\(var\(--/)
      expect(DISCIPLINE_ICON[discipline]).toMatch(/^[A-Z]/)
      expect(DISCIPLINE_TEMPLATE[discipline]).toBeTruthy()
    }
  })

  it("defaults to the general template so nobody gets an empty report", () => {
    expect(DEFAULT_DISCIPLINE).toBe("coordinator")
    expect(DISCIPLINE_TEMPLATE.coordinator).toBe("general")
  })

  it("accepts a member in any casing and rejects a near miss", () => {
    expect(isWorkDiscipline("technician")).toBe(true)
    expect(isWorkDiscipline("Tech-Nician")).toBe(false)
    expect(isWorkDiscipline("engineer")).toBe(false)
    expect(normaliseDiscipline(" DEVELOPER ")).toBe("developer")
    expect(normaliseDiscipline("nurse")).toBeNull()
    expect(normaliseDiscipline(null)).toBeNull()
    expect(normaliseDiscipline(undefined)).toBeNull()
  })

  it("names icons as strings, so this module never imports React", () => {
    // lib/roles.ts is imported by unit tests in a node environment; a component import
    // here would drag the whole icon package into every one of them.
    expect(rolesSource).not.toMatch(/lucide-react/)
    expect(rolesSource).not.toMatch(/from "react"/)
  })
})
```

Add at the top of the file, beside its existing imports:

```ts
import {
  DEFAULT_DISCIPLINE,
  DISCIPLINE_COLOUR,
  DISCIPLINE_ICON,
  DISCIPLINE_LABEL,
  DISCIPLINE_TEMPLATE,
  WORK_DISCIPLINES,
  isWorkDiscipline,
  normaliseDiscipline,
} from "@/lib/roles"
import { readFileSync } from "node:fs"
import path from "node:path"

const rolesSource = readFileSync(path.resolve(__dirname, "../../lib/roles.ts"), "utf8")
```

- [x] **Step 2: `npm test -- roles` → fails on the unresolved names.**

- [x] **Step 3: Append to `lib/roles.ts`.**

```ts
// ---- Work disciplines -------------------------------------------------------------
// The one vocabulary for "what kind of work is this". A person may hold several; the
// viewer filter is a preference, not a fork of the app (design §2, §6). Values are the
// strings stored in tasks.discipline, work_log_entries.discipline and
// deliverables.discipline, so renaming one is a migration, not an edit.
export const WORK_DISCIPLINES = [
  "developer",
  "technician",
  "designer",
  "auditor",
  "coordinator",
] as const
export type WorkDiscipline = (typeof WORK_DISCIPLINES)[number]

export const DISCIPLINE_LABEL: Record<WorkDiscipline, string> = {
  developer: "Development",
  technician: "IT & infrastructure",
  designer: "Design",
  auditor: "Audit & assurance",
  coordinator: "Coordination",
}

// Lucide component names, resolved by the component that renders them. Kept as strings so
// this module stays importable in a node test environment.
export const DISCIPLINE_ICON: Record<WorkDiscipline, string> = {
  developer: "Code2",
  technician: "Wrench",
  designer: "Palette",
  auditor: "SearchCheck",
  coordinator: "Users",
}

export const DISCIPLINE_COLOUR: Record<WorkDiscipline, string> = {
  developer: "hsl(var(--chart-pine))",
  technician: "hsl(var(--chart-stone))",
  designer: "hsl(var(--chart-clay))",
  auditor: "hsl(var(--chart-moss))",
  coordinator: "hsl(var(--accent))",
}

// Report template per discipline — read by lib/reports/templates.ts in phase 3.
export const DISCIPLINE_TEMPLATE: Record<WorkDiscipline, string> = {
  developer: "engineering",
  technician: "technical",
  designer: "creative",
  auditor: "assurance",
  coordinator: "general",
}

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

- [x] **Step 4: Confirm the colour tokens exist.** Every palette token in `app/globals.css` is an HSL channel
triplet consumed as `hsl(var(--token))`, which is why the map above is wrapped, not bare.

```bash
grep -nE -- "--(chart-pine|chart-stone|chart-clay|chart-moss|accent):" app/globals.css
```

Ten hits expected (each defined once for light and once for dark). If a token is missing, swap in the nearest
existing `--chart-*` / `--clay` token for that discipline and keep the `hsl(var(--…))` shape so the test's regex
still holds.

- [x] **Step 5: Gates, then commit and push.** `npm test -- roles` → the block's 5 tests pass (11 → 16 in that
file); `npm run typecheck`
→ 0; `npm run lint` → unchanged.

```bash
git add lib/roles.ts tests/unit/roles.test.ts
git commit -m "feat(roles): add the work-discipline vocabulary"
git push
```

---

### Task 3: The ten tables and three `tasks` columns

**Files:**
- Modify: `drizzle/schema.ts` — import list line 1, `tasks` at `:128-141`, append the new tables at end of file
- Create: `tests/unit/worklog-schema.test.ts`

**Interfaces:**
- Consumes: `users`, `tasks`, `sprints` already in the file; `Cadence` strings from Task 1; disciplines from Task 2.
- Produces: exported tables `taskEvents`, `workLogEntries`, `deliverables`, `workReports`, `workReportRecipients`,
  `agentPlans`, `planItems`, `assistantThreads`, `assistantMessages`, `aiUsageDaily`, and `tasks.startDate` /
  `tasks.discipline` / `tasks.sourcePlanId`. Task 5's writer inserts into `taskEvents`.

- [x] **Step 1: Write the failing test.** Create `tests/unit/worklog-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

// drizzle/schema.ts imports only pg-core, so this is a real structural test, not a
// source grep: it reads the column objects. The live tables are created by
// scripts/create-worklog-tables.mjs, which must match these names exactly.
const columnNames = (table: PgTable) => getTableConfig(table).columns.map((c) => c.name)

/** Every table this file exports, indexed by its SQL name. */
const tablesByName = new Map<string, PgTable>()
for (const value of Object.values(schema)) {
  if (value instanceof PgTable) tablesByName.set(getTableConfig(value).name, value)
}

/** The one table with a given SQL name, or a test failure naming it. */
const table = (name: string): PgTable => {
  const found = tablesByName.get(name)
  if (!found) throw new Error(`schema.ts does not export a table named "${name}"`)
  return found
}

const EXPECTED_TABLES = [
  "task_events",
  "work_log_entries",
  "deliverables",
  "work_reports",
  "work_report_recipients",
  "agent_plans",
  "plan_items",
  "assistant_threads",
  "assistant_messages",
  "ai_usage_daily",
]

describe("worklog schema", () => {
  it("declares all ten new tables", () => {
    for (const name of EXPECTED_TABLES) {
      expect(tablesByName.has(name)).toBe(true)
    }
  })

  it.each([
    ["task_events", ["task_id", "actor_id", "from_status", "to_status", "at", "source"]],
    ["work_log_entries", ["user_id", "worked_on", "task_id", "plan_item_id", "kind", "title",
      "body", "discipline", "minutes", "deliverable_id", "playbook_id", "playbook_version",
      "links", "source", "redated_at"]],
    ["deliverables", ["name", "type", "task_id", "plan_item_id", "owner_id", "discipline",
      "status", "produced_on", "link", "object_key", "evidence"]],
    ["work_reports", ["user_id", "period_type", "period_start", "period_end", "title",
      "template", "status", "content", "metrics", "revision_of", "submitted_at",
      "acknowledged_at", "returned_note"]],
    ["work_report_recipients", ["report_id", "user_id", "notified_at", "read_at", "ack_at", "note"]],
    ["agent_plans", ["title", "summary", "source_kind", "source_name", "source_text",
      "object_key", "model", "horizon_start", "horizon_end", "cadence", "status", "created_by",
      "promoted_at"]],
    ["plan_items", ["plan_id", "title", "description", "discipline", "estimate_points",
      "start_date", "due_date", "status", "depends_on", "milestone", "cadence", "sort_order",
      "deliverable", "source_task_id"]],
    ["assistant_threads", ["user_id", "scope", "title"]],
    ["assistant_messages", ["thread_id", "role", "content", "references", "tokens"]],
    ["ai_usage_daily", ["date", "scope", "calls", "input_tokens", "output_tokens"]],
  ] as const)("%s carries its columns", (name, expected) => {
    const names = columnNames(table(name))
    for (const column of expected) expect(names).toContain(column)
  })

  it("adds exactly three nullable columns to tasks, in snake_case", () => {
    const names = columnNames(schema.tasks)
    expect(names).toContain("start_date")
    expect(names).toContain("discipline")
    expect(names).toContain("source_plan_id")
    expect(names).toContain("due_date")
  })

  it("leaves every pre-existing tasks column alone", () => {
    expect(columnNames(schema.tasks)).toEqual([
      "id", "title", "description", "status", "priority", "story_points", "assignee_id",
      "sprint_id", "due_date", "tags", "created_at", "updated_at",
      "start_date", "discipline", "source_plan_id",
    ])
  })

  it("never makes a worklog column required where a caller cannot know it", () => {
    const log = getTableConfig(schema.workLogEntries)
    const nullable = ["task_id", "plan_item_id", "deliverable_id", "playbook_id", "minutes", "redated_at"]
    for (const name of nullable) {
      const column = log.columns.find((c) => c.name === name)
      expect(column?.hasDefault || !column?.notNull).toBe(true)
    }
  })
})
```

- [x] **Step 2: `npm test -- worklog-schema` → fails; `tasks` column list and every new table are missing.** If it
fails with `schema.ts does not export a table named "task_events"` *even after* the tables exist, the test loaded
`drizzle/schema.js`: pin `@/drizzle/schema` to `drizzle/schema.ts` in `vitest.config.ts`'s `resolve.alias`, keeping
that entry above `"@"`.

- [x] **Step 3: Extend the import line.** `drizzle/schema.ts:1` gains `index` from `drizzle-orm/pg-core`:

```ts
import { pgTable, serial, text, varchar, timestamp, boolean, date, integer, decimal, jsonb, primaryKey, unique, uuid, index } from "drizzle-orm/pg-core"
```

- [x] **Step 4: Add the three `tasks` columns.** In `drizzle/schema.ts:128-141`, **after `updatedAt`, at the end of
the column block** — Postgres `ADD COLUMN` appends, so the declaration order has to match the live column order or
the "leaves every pre-existing tasks column alone" assertion is wrong about a table that is fine:

```ts
  // Phase 1 additions (design §13). All nullable: no existing route selects them and no
  // current behaviour changes. The Gantt needs a start, tasks only had a due date;
  // discipline is what makes a report role-aware; source_plan_id keeps a promoted task
  // traceable to the plan that created it, and is written ONLY by the promote route.
  startDate: date("start_date"),
  discipline: varchar("discipline", { length: 40 }),
  sourcePlanId: integer("source_plan_id"),
```

`sourcePlanId` gets **no** foreign key: `agent_plans` is created in the same migration but a planner row must be
deletable without rewriting task history, and `source_plan_id` is a breadcrumb, not a constraint.

- [x] **Step 5: Append the ten tables** to the end of `drizzle/schema.ts`.

```ts
/* ------------------------------------------------------------------ worklog, reports,
      planner and assistant (design §13, phase 1)

   These tables are created in the live database by scripts/create-worklog-tables.mjs,
   which is raw SQL. The column names, modes and defaults below must match that DDL
   line for line — a drift here is a runtime type error against production, not a
   compile error, because the schema file is never pushed.                                   */

// Every status transition on the tasks table, written by lib/worklog/capture.ts.
// The system of record for "what happened on day X". `cascade` on task_id means a
// deleted task takes its history with it, which is why there is no `deleted` event.
export const taskEvents = pgTable(
  "task_events",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    fromStatus: varchar("from_status", { length: 50 }).notNull(),
    toStatus: varchar("to_status", { length: 50 }).notNull(),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
    source: varchar("source", { length: 20 }).notNull().default("route"),
  },
  (table) => [
    index("task_events_task_at_idx").on(table.taskId, table.at),
    index("task_events_at_idx").on(table.at),
  ],
)

export const agentPlans = pgTable("agent_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  sourceKind: varchar("source_kind", { length: 20 }).notNull().default("text"),
  sourceName: text("source_name"),
  sourceText: text("source_text"),
  objectKey: text("object_key"),
  model: varchar("model", { length: 80 }),
  horizonStart: date("horizon_start"),
  horizonEnd: date("horizon_end"),
  cadence: varchar("cadence", { length: 20 }).notNull().default("weekly"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const planItems = pgTable(
  "plan_items",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => agentPlans.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    discipline: varchar("discipline", { length: 40 }),
    estimatePoints: integer("estimate_points").notNull().default(0),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    status: varchar("status", { length: 50 }).notNull().default("todo"),
    dependsOn: jsonb("depends_on").notNull().default("[]"),
    milestone: boolean("milestone").notNull().default(false),
    cadence: varchar("cadence", { length: 20 }),
    // `sort_order`, not `order`: ORDER is a reserved word and every query would need it quoted.
    sortOrder: integer("sort_order").notNull().default(0),
    deliverable: jsonb("deliverable"),
    sourceTaskId: integer("source_task_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("plan_items_plan_idx").on(table.planId, table.sortOrder)],
)

export const deliverables = pgTable(
  "deliverables",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: varchar("type", { length: 30 }).notNull().default("other"),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
    planItemId: integer("plan_item_id").references(() => planItems.id, { onDelete: "set null" }),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
    discipline: varchar("discipline", { length: 40 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    producedOn: date("produced_on"),
    link: text("link"),
    objectKey: text("object_key"),
    evidence: text("evidence"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("deliverables_owner_status_idx").on(table.ownerId, table.status),
    index("deliverables_produced_idx").on(table.producedOn),
  ],
)

// The member's own account of a day. `worked_on` is a plain date on purpose: it is
// resolved through the member's timezone at write time (lib/reports/period.ts, phase 3),
// so a 23:40 entry lands on the day the member thinks it is.
export const workLogEntries = pgTable(
  "work_log_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workedOn: date("worked_on").notNull(),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
    planItemId: integer("plan_item_id").references(() => planItems.id, { onDelete: "set null" }),
    kind: varchar("kind", { length: 20 }).notNull().default("action"),
    title: text("title").notNull(),
    body: text("body"),
    discipline: varchar("discipline", { length: 40 }),
    minutes: integer("minutes"),
    deliverableId: integer("deliverable_id").references(() => deliverables.id, {
      onDelete: "set null",
    }),
    // playbook_id gets its foreign key in phase 16, when the playbooks table is created.
    playbookId: integer("playbook_id"),
    playbookVersion: integer("playbook_version"),
    links: jsonb("links").notNull().default("[]"),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    redatedAt: timestamp("redated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("work_log_entries_user_day_idx").on(table.userId, table.workedOn),
    index("work_log_entries_task_idx").on(table.taskId),
  ],
)

export const workReports = pgTable(
  "work_reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodType: varchar("period_type", { length: 10 }).notNull().default("weekly"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    title: text("title").notNull(),
    template: varchar("template", { length: 40 }).notNull().default("general"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    content: jsonb("content").notNull().default("{}"),
    metrics: jsonb("metrics").notNull().default("{}"),
    revisionOf: integer("revision_of").references((): any => workReports.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    returnedNote: text("returned_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("work_reports_user_period_idx").on(table.userId, table.periodStart),
    index("work_reports_status_idx").on(table.status),
  ],
)

export const workReportRecipients = pgTable(
  "work_report_recipients",
  {
    reportId: integer("report_id")
      .notNull()
      .references(() => workReports.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    ackAt: timestamp("ack_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.reportId, table.userId] }),
    userIdx: index("work_report_recipients_user_read_idx").on(table.userId, table.readAt),
  }),
)

export const assistantThreads = pgTable("assistant_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 20 }).notNull().default("workspace"),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: serial("id").primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => assistantThreads.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 12 }).notNull(),
    content: text("content").notNull(),
    references: jsonb("references").notNull().default("[]"),
    tokens: integer("tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("assistant_messages_thread_idx").on(table.threadId, table.id)],
)

// The durable half of the public-bot caps (design §7): in-memory rate limiting is
// per serverless instance, this is the ceiling.
export const aiUsageDaily = pgTable("ai_usage_daily", {
  date: date("date").notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  calls: integer("calls").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.date, table.scope] }),
}))
```

If `revisionOf` needs the self-reference typed, `(): any =>` is what drizzle 0.45 requires inside a table it has not
finished declaring; the schema has no `any`-lint rule to trip. Confirm with `npm run typecheck`.

- [x] **Step 6: Run the schema test.** `npm test -- worklog-schema` → all passing. The "leaves every pre-existing
tasks column alone" case pins declaration order; if it fails, the new columns were inserted in the wrong place.

- [x] **Step 7: Nothing — the guard case lives in Task 9.** `tests/unit/schema-safety.test.ts` gains a case that
`scripts/create-worklog-tables.mjs` is additive only:

```ts
  it("scripts/create-worklog-tables.mjs is additive only", () => {
    const script = src("scripts/create-worklog-tables.mjs")
    const code = codeOnly(script)
    expect(code).not.toMatch(/\bDROP\b/i)
    expect(code).not.toMatch(/DELETE FROM/i)
    expect(code).not.toMatch(/TRUNCATE/i)
    expect(code).not.toMatch(/ALTER COLUMN/i)
    expect(code).toMatch(/CREATE TABLE IF NOT EXISTS/i)
    expect(code).toMatch(/ADD COLUMN IF NOT EXISTS/i)
    expect(code).toMatch(/information_schema/i)
  })
```

It is written in Task 9 Step 1, not here, because it reads a file that does not exist until Task 9 creates it —
adding it now would leave Task 3 red, and every task in this plan ends green and committable.

- [x] **Step 8: Gates.** `npm run typecheck` → 0 (this is the real check that the new table code is valid drizzle);
`npm run lint` → 0 errors; `npm test` → green, 14 new cases in `tests/unit/worklog-schema.test.ts` (1 table-enumeration,
10 from the `it.each`, 3 `tasks`-column cases) for a total of 449.

- [x] **Step 9: Commit and push.**

```bash
git add drizzle/schema.ts tests/unit/worklog-schema.test.ts
git commit -m "feat(schema): add the worklog, report, planner and assistant tables"
git push
```

---

### Task 4: `startDate` and `discipline` become settable, `sourcePlanId` does not

**Files:**
- Modify: `lib/task-updates.ts` — `MUTABLE_FIELDS` and the switch
- Modify: `tests/unit/task-updates.test.ts`

**Interfaces:**
- Consumes: `isWorkDiscipline` from `lib/roles.ts` (Task 2), `tasks.$inferInsert` (Task 3).
- Produces: `TaskPatch` accepting `startDate?: string | null` and `discipline?: WorkDiscipline | null`, and still
  rejecting `sourcePlanId`, `id`, and every audit column.

- [x] **Step 1: Write the failing tests.** Append to `tests/unit/task-updates.test.ts`:

```ts
describe("phase 1 task columns", () => {
  it("accepts a start date and normalises it to YYYY-MM-DD", () => {
    const result = pickTaskUpdates({ startDate: "2026-10-26T10:00:00.000Z" })
    expect(result).toEqual({ patch: { startDate: "2026-10-26" } })
  })

  it("clears a start date with null or an empty string", () => {
    expect(pickTaskUpdates({ startDate: null })).toEqual({ patch: { startDate: null } })
    expect(pickTaskUpdates({ startDate: "" })).toEqual({ patch: { startDate: null } })
  })

  it("rejects a start date that is not a date", () => {
    expect("error" in pickTaskUpdates({ startDate: "next tuesday" })).toBe(true)
    expect("error" in pickTaskUpdates({ startDate: 12345 })).toBe(true)
  })

  it("accepts a discipline and trims it", () => {
    expect(pickTaskUpdates({ discipline: " Technician " })).toEqual({ patch: { discipline: "technician" } })
    expect(pickTaskUpdates({ discipline: null })).toEqual({ patch: { discipline: null } })
  })

  it("rejects a discipline outside WORK_DISCIPLINES rather than storing a new word", () => {
    const result = pickTaskUpdates({ discipline: "engineer" })
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toContain("technician")
  })

  it("keeps source_plan_id out of reach: only the promote route may set it", () => {
    const result = pickTaskUpdates({ title: "Real work", sourcePlanId: 7 })
    expect(result).toEqual({ patch: { title: "Real work" } })
    expect("sourcePlanId" in (result as { patch: object }).patch).toBe(false)
  })
})
```

- [x] **Step 2: `npm test -- task-updates` → the new cases fail.**

- [x] **Step 3: Extend the whitelist.** In `lib/task-updates.ts`, add `startDate` and `discipline` to
`MUTABLE_FIELDS` (after `dueDate`), import the discipline guard, and add two switch arms.

```ts
import { tasks } from "@/drizzle/schema"
import { WORK_DISCIPLINES, isWorkDiscipline } from "@/lib/roles"
```

```ts
const MUTABLE_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "storyPoints",
  "assigneeId",
  "sprintId",
  "dueDate",
  "startDate",
  "discipline",
  "tags",
] as const
```

```ts
      case "startDate": {
        if (value === null || value === "") {
          patch.startDate = null
          break
        }
        // Strings only: a bare number could be an epoch, an ordinal or a day of the
        // month, and startDate's place on a Gantt bar has to be unambiguous. dueDate
        // still accepts a number because its existing behaviour is not this task.
        if (typeof value !== "string") {
          return { error: "startDate must be a date string or null" }
        }
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) {
          return { error: "startDate must be a valid date" }
        }
        patch.startDate = parsed.toISOString().slice(0, 10)
        break
      }
      case "discipline": {
        if (value === null || value === "") {
          patch.discipline = null
          break
        }
        const candidate = typeof value === "string" ? value.trim().toLowerCase() : value
        if (!isWorkDiscipline(candidate)) {
          return { error: `discipline must be one of: ${WORK_DISCIPLINES.join(", ")}, or null` }
        }
        patch.discipline = candidate
        break
      }
```

Then update the header comment (the file's own documentation of the whitelist) to say that `source_plan_id` is
excluded **on purpose** because the promote transaction writes it, and that `startDate` joins `dueDate` as a
string-mode `date()` column.

- [x] **Step 4: Gates.** `npm test -- task-updates` → green, including the pre-existing cases. Typecheck 0, lint
unchanged. Note that `patch.discipline = candidate` needs `TaskPatch`'s `discipline` typed as the union — drizzle
derives it from `varchar`, so it is `string | null`, which `candidate` satisfies after the guard.

- [x] **Step 5: Commit and push.**

```bash
git add lib/task-updates.ts tests/unit/task-updates.test.ts
git commit -m "feat(tasks): allow startDate and discipline through the update whitelist"
git push
```

---

### Task 5: The status-change rule, pure

**Files:**
- Create: `lib/worklog/task-events.ts`
- Create: `tests/unit/worklog-capture.test.ts`

**Interfaces:**
- Consumes: nothing but its own types.
- Produces: `TASK_EVENT_SOURCES`, `TaskEventSource`, `StatusSnapshot`, `TaskEventRow`, `isTaskEventSource`,
  `statusChanges(before, after, options) => TaskEventRow[]`. Task 6's writer inserts exactly these rows.

- [x] **Step 1: Write the failing tests.** Create `tests/unit/worklog-capture.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { TASK_EVENT_SOURCES, isTaskEventSource, statusChanges } from "@/lib/worklog/task-events"

const at = new Date("2026-10-26T09:00:00.000Z")
const opts = { actorId: 7, source: "route" as const, at }

// task_events is the system of record for "what happened on day X" (design §4, §13).
// This module decides what counts; lib/worklog/capture.ts writes. Split because no unit
// test may import the database (lib/db.js shadows lib/db.ts under Vitest).
describe("statusChanges", () => {
  it("records a transition with both sides", () => {
    expect(statusChanges([{ id: 1, status: "todo" }], [{ id: 1, status: "done" }], opts)).toEqual([
      { taskId: 1, actorId: 7, fromStatus: "todo", toStatus: "done", at, source: "route" },
    ])
  })

  it("records nothing when the status did not move", () => {
    expect(statusChanges([{ id: 1, status: "done" }], [{ id: 1, status: "done" }], opts)).toEqual([])
  })

  it("ignores a task with no before row — creation is tasks.created_at, not an event", () => {
    expect(statusChanges([], [{ id: 2, status: "todo" }], opts)).toEqual([])
  })

  it("ignores an after row that is missing, so a failed read cannot write a fake", () => {
    expect(statusChanges([{ id: 3, status: "in_progress" }], [], opts)).toEqual([])
  })

  it("coerces a null status to empty rather than dropping the transition", () => {
    const [row] = statusChanges([{ id: 4, status: null }], [{ id: 4, status: "todo" }], opts)
    expect(row?.fromStatus).toBe("")
  })

  it("handles a bulk set: only the moved ones are recorded, in after order", () => {
    const before = [
      { id: 1, status: "todo" },
      { id: 2, status: "done" },
      { id: 3, status: "todo" },
    ]
    const after = [
      { id: 3, status: "in_progress" },
      { id: 2, status: "done" },
      { id: 1, status: "in_progress" },
    ]
    expect(statusChanges(before, after, opts).map((r) => [r.taskId, r.toStatus])).toEqual([
      [3, "in_progress"],
      [1, "in_progress"],
    ])
  })

  it("uses the actor passed in, and null when the caller has no session id", () => {
    const [row] = statusChanges([{ id: 1, status: "todo" }], [{ id: 1, status: "done" }], {
      actorId: null,
      source: "bulk",
      at,
    })
    expect(row?.actorId).toBeNull()
    expect(row?.source).toBe("bulk")
  })

  it("defaults the timestamp to the call time, once, for the whole batch", () => {
    const rows = statusChanges(
      [{ id: 1, status: "todo" }, { id: 2, status: "todo" }],
      [{ id: 1, status: "done" }, { id: 2, status: "done" }],
      { actorId: 1, source: "bulk" },
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]?.at).toBeInstanceOf(Date)
    expect(rows[1]?.at.getTime()).toBe(rows[0]?.at.getTime())
  })

  it("knows its own source vocabulary", () => {
    expect(TASK_EVENT_SOURCES).toEqual(["route", "bulk", "promote", "agent"])
    expect(isTaskEventSource("bulk")).toBe(true)
    expect(isTaskEventSource("drag")).toBe(false)
  })
})
```

`isTaskEventSource("drag")` is false on purpose: `drag` was in the spec's source list, but the drag routes write
`kanban_tasks`, not `tasks` (spec §4 correction), so the vocabulary has no user yet.

`promote` and `agent` are declared now and unused until the planner phase writes them. That is deliberate: the
`task_events.source` CHECK constraint in Task 9's DDL enumerates all four, so adding a source later needs a
migration, and a migration is the wrong place to discover the list was short.

- [x] **Step 2: `npm test -- worklog-capture` → fails, module missing.**

- [x] **Step 3: Write `lib/worklog/task-events.ts`.**

```ts
// The rule half of task capture: given the before and after rows of a task write, which
// status transitions are worth a permanent event? Pure on purpose — see the note in
// tests/unit/worklog-capture.test.ts for why the writer lives elsewhere.

export const TASK_EVENT_SOURCES = ["route", "bulk", "promote", "agent"] as const
export type TaskEventSource = (typeof TASK_EVENT_SOURCES)[number]

export function isTaskEventSource(value: unknown): value is TaskEventSource {
  return typeof value === "string" && (TASK_EVENT_SOURCES as readonly string[]).includes(value)
}

/** The narrowest thing a task row can be read as for this rule. */
export type StatusSnapshot = { id: number; status: string | null | undefined }

export type TaskEventRow = {
  taskId: number
  actorId: number | null
  fromStatus: string
  toStatus: string
  at: Date
  source: TaskEventSource
}

/**
 * One row per task whose status actually moved. A task with no before row is a creation,
 * and creation is already recorded honestly by `tasks.created_at`; a task with no after
 * row means the write matched nothing, so inventing a transition would be worse than
 * writing no row. `at` is taken once so a bulk write lands on one instant.
 */
export function statusChanges(
  before: readonly StatusSnapshot[],
  after: readonly StatusSnapshot[],
  options: { actorId: number | null; source: TaskEventSource; at?: Date },
): TaskEventRow[] {
  if (before.length === 0 || after.length === 0) return []

  const at = options.at ?? new Date()
  const beforeById = new Map<number, string>()
  for (const row of before) beforeById.set(row.id, row.status ?? "")

  const rows: TaskEventRow[] = []
  for (const row of after) {
    const fromStatus = beforeById.get(row.id)
    if (fromStatus === undefined) continue
    const toStatus = row.status ?? ""
    if (fromStatus === toStatus) continue
    rows.push({
      taskId: row.id,
      actorId: options.actorId,
      fromStatus,
      toStatus,
      at,
      source: options.source,
    })
  }
  return rows
}
```

- [x] **Step 4: `npm test -- worklog-capture` → 9 passing.** Then `npm run typecheck` and `npm run lint`.

- [x] **Step 5: Commit and push.**

```bash
git add lib/worklog/task-events.ts tests/unit/worklog-capture.test.ts
git commit -m "feat(worklog): pure status-transition rule for task event capture"
git push
```

---

### Task 6: The writer, and capture on `/api/tasks/[id]`

**Files:**
- Create: `lib/worklog/capture.ts`
- Modify: `app/api/tasks/[id]/route.ts` (imports, and after `updateTask` at `:107`)
- Modify: `tests/unit/worklog-capture.test.ts` — no new cases; the writer is exercised by the guard test in Task 10.

**Interfaces:**
- Consumes: `db` from `@/lib/db`, `taskEvents` from `@/drizzle/schema`, `statusChanges` + `TaskEventRow` from
  `./task-events`.
- Produces: `captureStatusChanges(before, after, options): Promise<number>` — returns rows written, never throws.

- [x] **Step 1: Write `lib/worklog/capture.ts`.**

```ts
import { db } from "@/lib/db"
import { taskEvents } from "@/drizzle/schema"
import { statusChanges, type StatusSnapshot, type TaskEventSource } from "./task-events"

/**
 * The write half of task capture. Call it immediately after a task mutation and before any
 * notification, so an event exists even when no one is notified (the notify branches in
 * the task routes all require a different assignee, and the log must not depend on that).
 *
 * A capture failure never fails the user's save: losing one event is better than losing
 * their edit. It is logged loudly rather than swallowed, because a silently empty
 * task_events table would make every report in this product quietly wrong.
 */
export async function captureStatusChanges(
  before: readonly StatusSnapshot[],
  after: readonly StatusSnapshot[],
  options: { actorId: number | null; source: TaskEventSource; at?: Date },
): Promise<number> {
  const rows = statusChanges(before, after, options)
  if (rows.length === 0) return 0
  try {
    await db.insert(taskEvents).values(rows)
    return rows.length
  } catch (error) {
    console.error("[task_events] capture failed", {
      count: rows.length,
      source: options.source,
      message: (error as Error).message,
    })
    return 0
  }
}
```

- [x] **Step 2: Wire `/api/tasks/[id]` PUT.** Add the import:

```ts
import { captureStatusChanges } from "@/lib/worklog/capture"
```

Then in the PUT handler, replace `app/api/tasks/[id]/route.ts:105-110` so the capture sits between the write and
the notifications:

```ts
    // Update the task
    const updatedTask = await updateTask(id, updateData)

    // The status history is the report's evidence, so it is written for every transition,
    // including the ones that are not worth notifying anyone about.
    await captureStatusChanges([existingTask], [updatedTask], {
      actorId,
      source: "route",
    })

    // User-visible events push to the assignee's live bell feed.
```

- [x] **Step 3: Gates.** `npm run typecheck` → 0; `npm run lint` → 0 errors; `npm test` → green (the writer has no
unit test by design; it is covered structurally in Task 10 and functionally the moment the migration exists).

- [x] **Step 4: Commit and push.**

```bash
git add lib/worklog/capture.ts "app/api/tasks/[id]/route.ts"
git commit -m "feat(worklog): capture task status changes on the task detail route"
git push
```

---

### Task 7: Bulk update — read the before-state, then capture

**Files:**
- Modify: `app/api/tasks/bulk/route.ts` — the `'update'` arm at `:49-74`

**Interfaces:**
- Consumes: `captureStatusChanges`, `db`, `tasks`, `inArray`, `and` (already imported at `:6-7`).
- Produces: one `task_events` row per task whose status moved in the bulk write.

- [x] **Step 1: Add the before-read.** In the `'update'` case, replace lines 60-74 so the old statuses are read
**before** the update overwrites them — there is no way to recover them afterwards, which is exactly the hole phase
1 exists to close:

```ts
        const dataWithTimestamp = {
          ...updates.patch,
          updatedAt: new Date()
        }

        // Read the pre-write statuses first: after the UPDATE they are gone, and drizzle's
        // .returning() gives only the new values. One query, then one event insert.
        const beforeRows = await db
          .select({ id: tasks.id, status: tasks.status })
          .from(tasks)
          .where(inArray(tasks.id, numericTaskIds))

        // Update all specified tasks
        result = await db
          .update(tasks)
          .set(dataWithTimestamp)
          .where(inArray(tasks.id, numericTaskIds))
          .returning()

        await captureStatusChanges(beforeRows, result, {
          actorId: session.id,
          source: "bulk",
        })

        break
```

Add `import { captureStatusChanges } from "@/lib/worklog/capture"` to the file's imports. `session.id` is available:
the handler already did `const session = await getSession()` at `:16` and returned 401 when null.

- [x] **Step 2: Do not capture the delete arm.** `case 'delete'` cascades the task's own events away with it, so a
`deleted` row would be erased by the statement that wrote it. Leave a one-line comment saying so at the delete case,
so the next reader does not "fix" the omission:

```ts
      case 'delete':
        // No task_events row here on purpose: task_events.task_id cascades, so an event
        // about a deleted task is deleted with it. Creation is tasks.created_at; deletion
        // is the notifications feed (see the DELETE /api/tasks/[id] handler).
```

- [x] **Step 3: Gates.** Typecheck 0, lint unchanged, `npm test` green.

- [x] **Step 4: Commit and push.**

```bash
git add app/api/tasks/bulk/route.ts
git commit -m "feat(worklog): capture status changes on bulk task update"
git push
```

---

### Task 8: The sibling routes that also move a task's status

The standing rule in this repository is that a fix is not assumed complete until the sibling endpoints have been
audited. Three more routes write `tasks.status`; two of them are the test-mode twins of routes already handled.

**Files:**
- Modify: `app/api/dashboard/tasks/route.ts` — PUT at `:111-157`
- Modify: `app/api/test/tasks/[id]/route.ts` — PUT at `:92-103`
- Modify: `app/api/test/tasks/bulk/route.ts` — `'update'` arm at `:48-71`

**Interfaces:**
- Consumes: `captureStatusChanges` from `@/lib/worklog/capture`.
- Produces: `task_events` coverage of every route that can change `tasks.status`, which the Task 10 guard test
asserts by enumeration.

- [x] **Step 1: `/api/dashboard/tasks` PUT.** This route writes status unconditionally from the body, and drizzle
drops `undefined` keys, so the before-read is the only way to know whether it moved. Add the import, then replace
lines 125-141:

```ts
    // Read the current status before the write; `data.status` may be undefined, in which
    // case drizzle leaves the column alone and there is nothing to record.
    const [beforeRow] = await db
      .select({ id: tasks.id, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, Number(data.id)))

    // Update task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        storyPoints: data.storyPoints,
        assigneeId: data.assigneeId || session.id,
        sprintId: data.sprintId,
        dueDate: data.dueDate === undefined ? undefined : toDueDate(data.dueDate),
        tags: data.tags || [],
        updatedAt: new Date()
      })
      .where(eq(tasks.id, data.id))
      .returning()

    await captureStatusChanges(beforeRow ? [beforeRow] : [], updatedTask ? [updatedTask] : [], {
      actorId: session.id,
      source: "route",
    })
```

- [x] **Step 2: `/api/test/tasks/[id]` PUT.** Mirror the production route: add the import and insert after
`app/api/test/tasks/[id]/route.ts:98`

```ts
    // Same capture as the production route — the log must not depend on which door was used.
    await captureStatusChanges([existingTask], [updatedTask], {
      actorId: session.id,
      source: "route",
    })
```

- [x] **Step 3: `/api/test/tasks/bulk` update arm.** Same shape as Task 7: replace lines 58-68 with the before-read,
the update and

```ts
        await captureStatusChanges(beforeRows, result, {
          actorId: session.id,
          source: "bulk",
        })
```

Add the `captureStatusChanges` import. Confirm `session` is in scope in that handler (it is obtained the same way as
its production twin at the top of the POST handler).

- [x] **Step 4: State what is deliberately **not** wired, in one place.** Append to `lib/worklog/capture.ts` a
comment block so the omissions are decisions, not oversights:

```ts
// Routes that mutate `tasks` but are NOT captured, and why:
//   POST /api/tasks, POST /api/dashboard/tasks, POST /api/dashboard/kanban/tasks —
//     they create rows; creation is `tasks.created_at`, already a real column.
//   DELETE /api/tasks/[id], DELETE /api/dashboard/tasks — task_id cascades, so a
//     deletion event deletes itself.
//   PATCH-ish status writers on kanban: /api/dashboard/kanban/update-status and /reorder
//     write the separate `kanban_tasks` table, not `tasks`. A board drag is therefore not
//     in this log. See design §4's scope correction; unifying the two boards is a decision
//     for later, not something capture can quietly paper over.
//   /api/sprints/[id] (clears sprint_id) and /api/ethical-metrics/apply-recommendation
//     (reassigns) — neither moves `status`.
//   lib/seed-data.ts — demo rows; a seeded task's creation is its created_at like any other.
```

- [x] **Step 5: Gates.** Typecheck 0, lint unchanged, `npm test` green.

- [x] **Step 6: Commit and push.**

```bash
git add app/api/dashboard/tasks/route.ts "app/api/test/tasks" lib/worklog/capture.ts
git commit -m "feat(worklog): capture status changes on the dashboard and test-mode task routes"
git push
```

---

### Task 9: The migration, with the owner's go-ahead

**Files:**
- Create: `scripts/create-worklog-tables.mjs`
- Create: `scripts/rollback-worklog-tables.mjs`
- Modify: `package.json` — `scripts`
- Modify: `tests/unit/schema-safety.test.ts` — the additive-only case deferred from Task 3 Step 7

**Interfaces:**
- Consumes: `.env.local` `DATABASE_URL`; the exact column set from Task 3.
- Produces: the ten tables and three `tasks` columns in production Neon, verified through `information_schema`.

- [x] **Step 1: Write the failing guard test.** Append to `tests/unit/schema-safety.test.ts` the block from Task 3
Step 7 verbatim (the one that reads `scripts/create-worklog-tables.mjs` and asserts `CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`, `information_schema`, and no `DROP` / `DELETE FROM` / `TRUNCATE` / `ALTER COLUMN`). Run
`npm test -- schema-safety` → fails, file not found.

- [x] **Step 2: Write `scripts/create-worklog-tables.mjs`,** following `scripts/create-reports-tables.mjs` exactly
(same env read, same `max: 1` pool, same verify-then-exit(1) shape). Note the deliberate `DROP`-free wording: the
guard test forbids the word.

```js
// Creates the phase-1 worklog tables and the three additive tasks columns, then verifies
// them through information_schema. Additive-only by design and by test: it never drops,
// truncates or rewrites anything. Run from the repo root:
//   npm run db:worklog
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and
// this database is production.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const EXPECTED_TABLES = [
  "task_events",
  "work_log_entries",
  "deliverables",
  "work_reports",
  "work_report_recipients",
  "agent_plans",
  "plan_items",
  "assistant_threads",
  "assistant_messages",
  "ai_usage_daily",
]
const EXPECTED_TASK_COLUMNS = ["start_date", "discipline", "source_plan_id"]

// Creation order matters: a table's own foreign keys must already exist.
const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS agent_plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  source_kind VARCHAR(20) NOT NULL DEFAULT 'text',
  source_name TEXT,
  source_text TEXT,
  object_key TEXT,
  model VARCHAR(80),
  horizon_start DATE,
  horizon_end DATE,
  cadence VARCHAR(20) NOT NULL DEFAULT 'weekly',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS plan_items (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES agent_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discipline VARCHAR(40),
  estimate_points INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  due_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestone BOOLEAN NOT NULL DEFAULT FALSE,
  cadence VARCHAR(20),
  sort_order INTEGER NOT NULL DEFAULT 0,
  deliverable JSONB,
  source_task_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS deliverables (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'other',
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  plan_item_id INTEGER REFERENCES plan_items(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  discipline VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  produced_on DATE,
  link TEXT,
  object_key TEXT,
  evidence TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'route'
);
CREATE TABLE IF NOT EXISTS work_log_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worked_on DATE NOT NULL,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  plan_item_id INTEGER REFERENCES plan_items(id) ON DELETE SET NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'action',
  title TEXT NOT NULL,
  body TEXT,
  discipline VARCHAR(40),
  minutes INTEGER,
  deliverable_id INTEGER REFERENCES deliverables(id) ON DELETE SET NULL,
  playbook_id INTEGER,
  playbook_version INTEGER,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  redated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS work_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL DEFAULT 'weekly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  template VARCHAR(40) NOT NULL DEFAULT 'general',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision_of INTEGER REFERENCES work_reports(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  returned_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS work_report_recipients (
  report_id INTEGER NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  ack_at TIMESTAMPTZ,
  note TEXT,
  PRIMARY KEY (report_id, user_id)
);
CREATE TABLE IF NOT EXISTS assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL DEFAULT 'workspace',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS assistant_messages (
  id SERIAL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES assistant_threads(id) ON DELETE CASCADE,
  role VARCHAR(12) NOT NULL,
  content TEXT NOT NULL,
  references JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  date DATE NOT NULL,
  scope VARCHAR(20) NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, scope)
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS discipline VARCHAR(40);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_plan_id INTEGER;
CREATE INDEX IF NOT EXISTS task_events_task_at_idx ON task_events (task_id, at);
CREATE INDEX IF NOT EXISTS task_events_at_idx ON task_events (at);
CREATE INDEX IF NOT EXISTS work_log_entries_user_day_idx ON work_log_entries (user_id, worked_on);
CREATE INDEX IF NOT EXISTS work_log_entries_task_idx ON work_log_entries (task_id);
CREATE INDEX IF NOT EXISTS deliverables_owner_status_idx ON deliverables (owner_id, status);
CREATE INDEX IF NOT EXISTS deliverables_produced_idx ON deliverables (produced_on);
CREATE INDEX IF NOT EXISTS work_reports_user_period_idx ON work_reports (user_id, period_start);
CREATE INDEX IF NOT EXISTS work_reports_status_idx ON work_reports (status);
CREATE INDEX IF NOT EXISTS plan_items_plan_idx ON plan_items (plan_id, sort_order);
CREATE INDEX IF NOT EXISTS assistant_messages_thread_idx ON assistant_messages (thread_id, id);
CREATE INDEX IF NOT EXISTS work_report_recipients_user_read_idx ON work_report_recipients (user_id, read_at)
`

const sql = postgres(match[1], { max: 1 })

try {
  console.log(`SQL → ${EXPECTED_TABLES.length} CREATE TABLE IF NOT EXISTS, 3 additive columns, 11 indexes`)
  await sql.unsafe(CREATE_SQL)

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${EXPECTED_TABLES}::text[])
  `
  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks'
      AND column_name = ANY(${EXPECTED_TASK_COLUMNS}::text[])
  `
  console.log("tables present:", tables.map((t) => t.table_name).join(", ") || "none")
  console.log("tasks columns:", columns.map((c) => c.column_name).join(", ") || "none")

  if (tables.length !== EXPECTED_TABLES.length) {
    console.error(`expected ${EXPECTED_TABLES.length} tables, found ${tables.length}`)
    process.exit(1)
  }
  if (columns.length !== EXPECTED_TASK_COLUMNS.length) {
    console.error(`expected ${EXPECTED_TASK_COLUMNS.length} tasks columns, found ${columns.length}`)
    process.exit(1)
  }
  console.log("OK — schema is in place. No rows were written.")
} catch (error) {
  console.error("Failed to create worklog tables:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
```

`references` is a non-reserved word in Postgres and usable unquoted; if the run complains, quote it as `"references"`
in the DDL and in `drizzle/schema.ts` the column name stays `references`.

- [x] **Step 3: `npm test -- schema-safety` → green.** Typecheck and lint too.

- [x] **Step 4: Write `scripts/rollback-worklog-tables.mjs` — present, gated, and not run by this plan.**

```js
// Reverses create-worklog-tables.mjs by removing ONLY the ten tables phase 1 added. The
// three additive `tasks` columns are left alone: they are nullable, unused by any earlier
// query, and removing them would rewrite a live table for no benefit.
//
// Destructive. Refuses to run without WORKLOG_ROLLBACK=yes in the environment, and this
// implementation plan never runs it. It exists so "reversible" in design §13 is true.
//   WORKLOG_ROLLBACK=yes npm run db:worklog:rollback

import { readFileSync } from "node:fs"
import postgres from "postgres"

if (process.env.WORKLOG_ROLLBACK !== "yes") {
  console.error("Refusing to run. Set WORKLOG_ROLLBACK=yes to confirm you want these tables gone.")
  process.exit(1)
}

const TABLES = [
  "assistant_messages",
  "assistant_threads",
  "work_report_recipients",
  "work_reports",
  "work_log_entries",
  "task_events",
  "deliverables",
  "plan_items",
  "agent_plans",
  "ai_usage_daily",
]

if (process.env.SKIP_REVIEW_CHECKS !== "yes") {
  // placeholder-free guard: the list must be exactly phase 1's tables, no others.
  const strays = TABLES.filter(
    (t) =>
      !/^(task_events|work_log_entries|deliverables|work_reports|work_report_recipients|agent_plans|plan_items|assistant_threads|assistant_messages|ai_usage_daily)$/.test(t),
  )
  if (strays.length) {
    console.error("Refusing: unexpected table in the rollback list:", strays.join(", "))
    process.exit(1)
  }
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(match[1], { max: 1 })
try {
  // Reverse dependency order, CASCADE so an index or dependent view goes with it.
  for (const table of TABLES) {
    console.log(`removing table ${table}`)
    await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`)
  }
  const left = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${TABLES}::text[])
  `
  console.log("remaining:", left.map((t) => t.table_name).join(", ") || "none")
  if (left.length) process.exit(1)
} catch (error) {
  console.error("Rollback failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
```

The `DROP` text in the rollback script is fine for the guard test in Step 2, which reads only
`scripts/create-worklog-tables.mjs`.

- [x] **Step 5: Add the two npm scripts** to `package.json`, next to the existing `db:push` entries:

```json
    "db:worklog": "node scripts/create-worklog-tables.mjs",
    "db:worklog:rollback": "node scripts/rollback-worklog-tables.mjs",
```

- [x] **Step 6: CHECKPOINT — stop and ask the owner before touching production.** Say exactly what is about to
happen: "11 minutes of your time: this adds 10 new tables and 3 nullable columns to the live Neon database, writes
zero rows, and is additive; I will run `npm run db:worklog` from the repo root after confirming the URL on line 1 of
.env.local is still the commented stale one and the real one is matched." Wait for an explicit yes. Do not run it on
an assumption, and do not run the rollback script at all.

Before running, confirm the target is the intended database and nothing is mid-write:

```bash
node -e "const s=require('fs').readFileSync('.env.local','utf8');const m=s.match(/^DATABASE_URL=\"?([^\"\n]+)\"?/m);console.log(m && m[1].replace(/:[^:@]*@/,':***@'))"
```

The password must be masked in the output and must never be pasted into chat.

- [x] **Step 7: Run it once, from the repo root.**

```bash
npm run db:worklog
```

Expected final line: `OK — schema is in place. No rows were written.` and 10 table names listed.

- [x] **Step 8: Prove the capture path works against the real tables, without inventing data.** The owner's own
account is the only acceptable subject, and only if they agree; otherwise this waits until phase 2's UI is used in
front of them. **The default is: do not write.** Read-only confirmation instead:

```bash
node -e "
const s=require('fs').readFileSync('.env.local','utf8').match(/^DATABASE_URL=\"?([^\"\n]+)\"?/m)[1];
import('postgres').then(async ({default:pg})=>{const sql=pg(s,{max:1});
const r=await sql\`SELECT COUNT(*)::int AS events FROM task_events\`;
console.log('task_events rows:', r[0].events); await sql.end()})
"
```

Expected `0` — the log is empty until a real status change happens, which is the correct state at the end of phase 1.

- [x] **Step 9: Commit and push.**

```bash
git add scripts/create-worklog-tables.mjs scripts/rollback-worklog-tables.mjs package.json tests/unit/schema-safety.test.ts
git commit -m "feat(worklog): additive migration for the phase 1 tables"
git push
```

---

### Task 10: The guard file and the docs sync

**Files:**
- Create: `tests/unit/worklog-reports.test.ts`
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (§4 events note, §13
`sort_order` + no-FK `playbook_id` + `source` vocabulary)
- Modify: `FEATURES.md` — one row

**Interfaces:**
- Consumes: every file above.
- Produces: the phase-1 subset of the spec's guard file. Phases 2-18 add blocks to this same file; it is the thing
that keeps the invariants true after the person who wrote them has moved on.

- [x] **Step 1: Write the guard.** Create `tests/unit/worklog-reports.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

function routeFilesUnder(dir: string): string[] {
  const out: string[] = []
  const walk = (current: string) => {
    for (const entry of readdirSync(path.join(repo, current))) {
      const relative = `${current}/${entry}`
      if (entry === "route.ts") out.push(relative)
      else if (!/\./.test(entry)) walk(relative)
    }
  }
  walk(dir)
  return out
}

// Phase 1 invariants of the worklog design. Later phases add blocks here.

describe("task_events capture covers every status-writing route", () => {
  const captured = [
    "app/api/tasks/[id]/route.ts",
    "app/api/tasks/bulk/route.ts",
    "app/api/dashboard/tasks/route.ts",
    "app/api/test/tasks/[id]/route.ts",
    "app/api/test/tasks/bulk/route.ts",
  ]

  it.each(captured)("%s calls captureStatusChanges", (file) => {
    expect(src(file)).toMatch(/captureStatusChanges\(/)
  })

  it("reads the before-state on every bulk or blind write", () => {
    for (const file of [
      "app/api/tasks/bulk/route.ts",
      "app/api/dashboard/tasks/route.ts",
      "app/api/test/tasks/bulk/route.ts",
    ]) {
      const body = src(file)
      expect(body).toMatch(/select\(\{ id: tasks\.id, status: tasks\.status \}\)/)
    }
  })

  it("captures before the notification branches, not inside them", () => {
    const body = src("app/api/tasks/[id]/route.ts")
    const capture = body.indexOf("captureStatusChanges(")
    const notify = body.indexOf("createNotification({")
    expect(capture).toBeGreaterThan(-1)
    expect(notify).toBeGreaterThan(-1)
    expect(capture).toBeLessThan(notify)
  })

  it("leaves the kanban board out, because it writes kanban_tasks not tasks", () => {
    for (const file of [
      "app/api/dashboard/kanban/update-status/route.ts",
      "app/api/dashboard/kanban/reorder/route.ts",
    ]) {
      expect(src(file)).not.toMatch(/captureStatusChanges/)
      expect(src(file)).toMatch(/kanbanTasks/)
    }
  })
})

describe("nothing manufactures history", () => {
  it("no worklog or report module infers a day from tasks.updated_at", () => {
    const offenders = routeFilesUnder("app/api").filter((file) => {
      const body = codeOnly(src(file))
      return /workLogEntries|taskEvents|workReports/.test(body) && /updated_at/.test(body)
    })
    expect(offenders).toEqual([])
  })

  it("task_events has no backfill script", () => {
    const scripts = readdirSync(path.join(repo, "scripts"))
    expect(scripts.filter((name) => /backfill.*task.*(event|histor)/i.test(name))).toEqual([])
  })
})

describe("vocabulary has one owner", () => {
  it("cadences are declared in lib/cadence.ts and nowhere else", () => {
    const declared = routeFilesUnder("app")
      .concat(["app/dashboard/reports/page.tsx"])
      .filter((file) => /type Cadence =|CADENCES = \[/.test(src(file)))
    expect(declared).toEqual([])
    expect(src("lib/cadence.ts")).toMatch(/export const CADENCES/)
  })

  it("disciplines are declared in lib/roles.ts and nowhere else", () => {
    const declared = routeFilesUnder("app")
      .concat(["app/dashboard/reports/page.tsx"])
      .filter((file) => /WORK_DISCIPLINES = \[/.test(src(file)))
    expect(declared).toEqual([])
    expect(src("lib/roles.ts")).toMatch(/export const WORK_DISCIPLINES/)
  })

  it("the whitelist still refuses the audit and promote-only columns", () => {
    const body = src("lib/task-updates.ts")
    expect(body).toMatch(/startDate/)
    expect(body).toMatch(/discipline/)
    expect(body).not.toMatch(/"sourcePlanId"/)
  })
})

describe("capture cannot be lost silently", () => {
  it("the writer logs a named failure instead of swallowing it", () => {
    const body = src("lib/worklog/capture.ts")
    expect(body).toMatch(/\[task_events\] capture failed/)
    expect(body).toMatch(/catch/)
  })

  it("the events table is inserted into only through the capture module", () => {
    const files = routeFilesUnder("app").concat(["lib/data-access.ts"])
    const offenders = files.filter((file) => /insert\(taskEvents\)/.test(src(file)))
    expect(offenders).toEqual([])
    expect(src("lib/worklog/capture.ts")).toMatch(/insert\(taskEvents\)/)
  })
})
```

Run `npm test -- worklog-reports`. If a case fails on an over-broad regex (the `updated_at` scan is the likely
one, since routes legitimately `SELECT` timestamps), narrow the regex to the derivation shape it is guarding —
e.g. `/worked_on[\s\S]{0,80}updated_at/` — rather than deleting the case. A guard test that was weakened to pass is
worse than no guard test.

- [x] **Step 2: Sync the design document.** Three edits to
`docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`:
1. In §13's `plan_items` line, `order` → `sort_order`, with the trailing note "renamed: `order` is a SQL reserved
word".
2. In §13's `work_log_entries` line, mark `playbook_id` as "no foreign key until phase 16 creates `playbooks`".
3. In §4's `task_events` bullet, replace the source vocabulary `route|bulk|kanban|promote|drag` with
`route|bulk|promote|agent`, and add: "Creation is recorded by `tasks.created_at`, deletion is not an event because
`task_events.task_id` cascades — a row about a deleted task is deleted with it."

- [x] **Step 3: `FEATURES.md`.** Add one numbered row in the style of the existing list, stating plainly what is
true today: the tables and the capture exist; status changes are being recorded from the five routes; there is no
worklog UI yet (phase 2), and the log is empty until a task actually moves. Do not describe a page that does not
exist.

- [x] **Step 4: Full gates.**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: 0 typecheck errors, 0 lint errors with the 70-warning baseline unchanged, and every test file green —
roughly 27 files and 480 tests once this phase's additions are counted (the exact number comes from Steps 1 above;
do not tune a test to hit a number).

- [x] **Step 5: Commit and push, then confirm the production deploy picked it up.**

```bash
git add tests/unit/worklog-reports.test.ts FEATURES.md docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md
git commit -m "test(worklog): guard the phase 1 capture invariants and sync the design doc"
git push
```

Then check the deployment (the CLI token is at `~/Library/Application Support/com.vercel.cli/auth.json`, key
`token`) and confirm the newest entry's `meta.githubCommitSha` is the commit just pushed and `ready` is `"READY"`:

```bash
node -e "
const fs=require('fs');
const tok=JSON.parse(fs.readFileSync(process.env.HOME+'/Library/Application Support/com.vercel.cli/auth.json','utf8')).token;
const q='https://api.vercel.com/v6/deployments?projectId=prj_5akmPKW5NQVgYaficUS3qGIbodLU&teamId=team_67Cw6MmztzZEHiaj8FQ4TQg2&limit=3';
fetch(q,{headers:{Authorization:'Bearer '+tok}}).then(r=>r.json()).then(d=>{
  for(const x of d.deployments) console.log(x.meta?.githubCommitSha?.slice(0,7), x.ready, x.meta?.githubCommitRef);
});
"
```

- [x] **Step 6: Report to the owner, and hand them the check they can do.** Phase 1 ships no UI (their standing rule
is that they do the visual testing). Say: the log is now recording; to see it in the app you must change a task's
status once, and then phase 2's page is the first thing that reads it back. Offer to move on to phase 2 (worklog UI)
or phase 15 (registers, which is what their handover document actually needs first).

---

## After phase 1

The next unit of work, in the order that serves the owner's stated purpose:
**phase 2** (`/dashboard/worklog` — the day view that reads what this phase wrote), then **phase 3** (period
reports), **4** (submission and inbox), **5** (exports). If the IT technician handover is the priority instead,
**phases 15 and 16** (registers and playbooks) depend on nothing but this phase and produce something printable.
