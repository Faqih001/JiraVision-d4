# Recurrence Cross-Surface Wave (A–G) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every surface that reads recurrence rows — the calendar API and page, the dashboard, the planner's promote path, the cadence vocabulary and all ~25 completed-status readers — agree with the recurrence model the F1–F6 wave shipped.

**Architecture:** Three new units (a SQL fragment module, a pure promote-mapping module, one pure window-to-occurrences function) plus edits to existing readers. No table, column, migration or cron: every fix is a read predicate, a pure rule, or a write through the horizon writer that already exists.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM over Neon Postgres, React client components, Vitest (behavioural unit tests + source guards), Zod v4 in the planner extractor.

**Spec:** [docs/superpowers/specs/2026-11-04-recurrence-cross-surface-design.md](../specs/2026-11-04-recurrence-cross-surface-design.md) — the spec is the binding authority; this plan is its argument. Where they disagree, the plan-side rulings below decide and say why.

## Global Constraints

- **No schema change, no migration, no new table or column, no cron, no script that writes to production Neon.** Every task is a read predicate, a pure rule, or a write through `ensureInstanceHorizon`.
- **Ruling 1 stands absolutely:** a recurring task draws occurrences, never a template marker. No derived event may read `tasks.dueDate` for a row where `tasks.isTemplate` is true.
- **Ruling 7 stands absolutely:** promote reads `plan_items.cadence` only. Never `agentPlans.cadence` (`notNull`, default `"weekly"` — a plan-review rhythm, not a task schedule) and never `taskReportTemplates.cadence`.
- **Horizon and capture writes never fail the user's read or save.** Wrap them, log, return what you have.
- **Anchor on the member's local day:** `localDay(new Date(), session.timezone)`. Never `new Date().toISOString().slice(0, 10)`, never a UTC `Date` comparison for a day boundary.
- **Client-safe modules only in client components:** `lib/cadence.ts` and `lib/tasks/statuses.ts` may be imported by pages. `lib/tasks/statuses-sql.ts`, `lib/planner/promote-values.ts`, `lib/dashboard-data.ts` and `lib/data-access-task-instances.ts` are server-only.
- **Source guards assert on code, never on comments.** Every guard reads the file through `codeOnly(src(path))`, which strips `/* */` and `//` blocks.
- **`scripts/*.mjs` must not import app code.** The IT-technician import script keeps its mirrored `INSTANCE_COUNTS` literal, held honest by a guard.
- **Do not relax `recurringStatusError`** ([lib/task-updates.ts](../../lib/task-updates.ts)) or any guard in `tests/unit/recurrence-gap-guards.test.ts`. The server's 409 is the backstop; this wave only removes the doors that let a member walk into it.
- **Gates on every task:** `npx tsc --noEmit` clean · `npx vitest run` green (entering baseline **171 files / 2827 tests**) · `npm run lint` at the documented baseline (**82 problems, 4 pre-existing errors** in `components/landing-chatbot.tsx:177,181,190` and `components/planner/gantt.tsx:43`).
- **`scripts/*.mjs` that touch the database run from the repo root** and read the URL with `/^DATABASE_URL="?([^"\n]+)"?/m` — line 1 of `.env.local` is a commented stale URL.
- **Production Neon is read-only in this wave.** A `SELECT` is allowed (announced, host masked); DDL and writes are not, per the standing checkpoint rule.
- **Git:** commit at the end of every task with the message given in its last step. The repo has a standing grant to push; push once, at Task 10, unless told otherwise. A concurrent `git add -A` auto-committer may land your work mid-wave — check `git log` before committing, and never rewrite pushed history.

## Plan-side rulings

Discovered while writing this plan; the spec could not know them. Each is decided here so an implementer does not re-litigate it.

- **P1 — two more F4 doors, both handled in Task 8.** `app/dashboard/tasks/page.tsx:1423` ("Blocked or overdue" → Complete) and `:1457` ("Due this week" → Complete) call `setTaskStatus(t, "done")` on every row, recurring included, so the tasks page still hands a member the raw 409 the dialog avoids. Ruling: the same `isRecurringTask` guard the dialog already uses hides the button on a recurring row, on both pages. **Why:** Ruling 2 and §D4 already decided the member should never see that 409; only its location was unknown. **Cost if wrong:** two buttons missing on a schedule card.
- **P2 — §D1's line map is stale; the reads are named here.** The five reads the spec's table describes are, in today's file: `statusCounts` member/team `lib/dashboard-data.ts:291-300`; `myTasksRows` `:302-307` (which feeds `deadlines` at `:584` and the KPIs at `:548-569`); `myOpenPriorityCounts` `:309-313`; `workloadRows` `:315-329`; the KPI case-when fragments are inside `workloadRows` at `:321-323` and its `orderBy` at `:329`. **Not excluded** from the template predicate: `throughputRows` `:331-340`, `velocityRows` `:439-451` and `sprintTaskRows` `:483-497` — a recurring row deliberately placed in a sprint is the owner's choice, and hiding it would mask the mistake (the same reasoning §G4 applies to sprint aggregates).
- **P3 — `task_instances.status` comparisons stay pinned to `"done"`.** `lib/career/counts.ts:125`, `lib/career/evidence.ts:244` and `lib/worklog/instance-capture.ts:49,55,86` are not swept. **Why:** the instance PATCH whitelist is `["todo","in_progress","done","skipped"]` ([app/api/task-instances/[id]/route.ts:56](../../app/api/task-instances/%5Bid%5D/route.ts)); instance rows cannot hold `completed` or `closed`, and the completed-status list exists for `tasks.status`, a free `varchar(50)`. **Cost if wrong:** an import that writes `"completed"` onto an instance is invisible to the career day count.
- **P4 — the sweep is bigger than ~20, and splits into two tasks.** The exhaustive inventory, from `grep -rn 'status [!=]==? .done.' app lib components` plus `grep -rn "= 'done'\|<> 'done'" `: four more server readers than the spec's table listed — [app/api/sprints/route.ts:106,108](../../app/api/sprints/route.ts), [app/api/analytics/route.ts:183,184](../../app/api/analytics/route.ts), [app/api/activity/route.ts:203,204](../../app/api/activity/route.ts), [app/api/settings/[key]/route.ts:157](../../app/api/settings/%5Bkey%5D/route.ts); plus `lib/dashboard-data.ts:338` (throughput), `:444` (velocity) and the `neqDone` helper at `:716-718`; and five further files the spec never named — [app/api/team/members/route.ts:59-63](../../app/api/team/members/route.ts), [app/api/team/members/[id]/route.ts:33-37](../../app/api/team/members/%5Bid%5D/route.ts), [app/api/automation/_shared.ts:293](../../app/api/automation/_shared.ts), [app/api/ethical-metrics/route.ts:539](../../app/api/ethical-metrics/route.ts), [app/api/ethical-metrics/apply-recommendation/route.ts:190](../../app/api/ethical-metrics/apply-recommendation/route.ts). Task 6 takes the server side, Task 7 the client side. **Why:** ruling 4 said "every surface, raw SQL included", and one 25-file commit is not reviewable. **Cost if wrong:** a half-swept surface, which the per-file guard in Task 6 catches for the server and Task 7's guard catches for the client.
- **P5 — the fragments take the column, and one helper takes nothing.** The spec showed the rule as a constant. It cannot be, because the sites reach `tasks.status` three ways: drizzle's `tasks.status` inside a `.where()`/`.select()`, a raw `db.execute` statement that aliased the table (`FROM tasks t`), and plain JS on a fetched row. So Task 6 ships `completedStatusSql(column)` / `openStatusSql(column)` for the first, `isCompletedTaskStatus(status)` (already exists) for the third, and **`completedStatusListSql()`** for the second: it returns only the bound value list, so an already-aliased fragment reads `` sql`t.status not in (${completedStatusListSql()})` ``. **The aliases are kept, not dropped** — `app/api/automation/_shared.ts` projects 40+ `t.` columns across seven trigger queries and `app/api/reports/_shared.ts` joins `tasks t` twice; rewriting those to the unaliased name is churn with a runtime-error tax and no user-visible gain. Nothing about the single source changes: every fragment still renders `COMPLETED_TASK_STATUSES`.
- **P6 — top-up candidates order by `tasks.id`, not "soonest missing occurrence".** §C3 asked for soonest-missing, which is a per-task aggregate over `task_instances` (a lateral join) inside a read path. With the 25-task bound the deferred set is arbitrary either way, so `asc(tasks.id)` is used: stable, no extra aggregate, earliest-created schedules catch up first.
- **P7 — which new server counts also exclude schedules.** §G4 says counting surfaces hide templates. Applied to the five files P4 adds: the team-directory workload counts (`loadTaskAggregates`, `loadMemberRow`) are member workload, so they get `eq(tasks.isTemplate, false)` like the dashboard reads; the account-removal guard in `app/api/team/members/[id]/route.ts:277-279` does **not** — it answers "does this member own any row that would dangle", and a schedule assigned to them is exactly such a row. `app/api/automation/_shared.ts` and `app/api/ethical-metrics/apply-recommendation/route.ts` are writers deciding which task to move, not counts; they get the status list and no template predicate. **Why:** one rule ("counts hide schedules, safety checks and writers do not") beats a per-file argument. **Cost if wrong:** the removal guard could report a member as free while their imported checklists still point at them.
- **P8 — the career files are not swept and are not missed.** `lib/career/counts.ts:125` and `lib/career/evidence.ts:244` compare `taskInstances.status` to `"done"` (ruling **P3** pins those), and `lib/career/growth.ts:288` only contains the word inside a Gemini prompt. No `tasks.status` literal survives in `lib/career` or `app/api/career`, so the Task 6 guard list omits them. **Why:** stating the exclusion keeps a later reader from "fixing" a pinned instance comparison. **Cost if wrong:** none — a fourth completed word would have to appear on an instance row, which the PATCH whitelist refuses.

## File map

| file | responsibility | tasks touching it |
| --- | --- | --- |
| `app/api/calendar/events/route.ts` | the only calendar read; scoping, view modes, horizon top-up | 1, 2, 3 |
| `lib/tasks/recurrence.ts` | occurrence math, incl. the new `horizonOccurrencesForWindow` | 3 |
| `lib/cadence.ts` | the one cadence vocabulary, incl. `SCHEDULE_CADENCES` + `cadenceOrNone` | 4 |
| `lib/planner/extract.ts` | Gemini item schema — consumes the vocabulary | 4 |
| `app/dashboard/planner/[id]/plan-editor-client.tsx` | cadence dropdown — consumes the vocabulary | 4 |
| `app/api/planner/[id]/items/[itemId]/route.ts` | plan-item PATCH — validates cadence through the vocabulary | 4 |
| `lib/planner/promote-values.ts` | **new** — pure plan-item → task insert mapping | 5 |
| `app/api/planner/[id]/promote/route.ts` | promote: carries cadence, assigns, grids after the transaction | 5 |
| `lib/tasks/statuses-sql.ts` | **new** — the completed-status list as SQL fragments | 6 |
| `app/api/reports/_shared.ts`, `app/api/sprints/{[id],}/route.ts`, `app/api/analytics/route.ts`, `app/api/activity/route.ts`, `app/api/settings/[key]/route.ts`, `lib/dashboard-data.ts` | server aggregates | 6, 8 |
| the 11 client pages listed in Task 7 | lists, badges, KPI tiles | 2, 7, 8 |
| `app/dashboard/calendar/page.tsx` | the sidebar deadline list | 2 |
| `app/dashboard/page.tsx` | the Due-today strip and the dashboard status menu | 8 |
| `scripts/measure-task-statuses.mjs` | **new, read-only** — the prod status census | 9 |
| `tests/unit/recurrence-cross-surface-guards.test.ts` | **new** — this wave's guards, one file per wave | 1–9 |
| `tests/unit/task-recurrence.test.ts`, `tests/unit/cadence.test.ts`, `tests/unit/planner-promote-values.test.ts`, `tests/unit/statuses-sql.test.ts` | pure behaviour | 3, 4, 5, 6 |
| `FEATURES.md`, both spec docs | §50 + spec sync | 10 |

---

### Task 1: Calendar scoping (spec §A)

**Files:**
- Modify: `app/api/calendar/events/route.ts` (GET handler, lines 149–236)
- Test: `tests/unit/recurrence-cross-surface-guards.test.ts` (create)

**Interfaces:**
- Consumes: `loadVisibleMemberIds(userId: number): Promise<number[]>` from `@/lib/organizations` (already exists, returns the caller's org member ids, or `[userId]` for a personal account).
- Produces: `assigneeScope` — a `SQL` predicate in the GET handler that every derived (non-`calendar_events`) branch must include. Task 2 pushes it onto a second branch; Task 3 derives a narrower `topUpScope` from the same two expressions.

- [ ] **Step 1: Write the failing guard test**

Create `tests/unit/recurrence-cross-surface-guards.test.ts`:

```ts
// Source guards for the recurrence cross-surface wave (A–G). Behaviour lives in the pure
// modules and is unit-tested there; these guards hold the wiring, because every fix here is
// a rule a future reader can quietly bypass by dropping one predicate.
// Guards assert on code only — a comment can never satisfy one.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("the calendar reads only the schedules you may see", () => {
  const route = codeOnly(src("app/api/calendar/events/route.ts"))

  it("resolves the visible member set once per request", () => {
    expect(route).toMatch(/loadVisibleMemberIds\(session\.id\)/)
  })

  it("scopes the instance branch by assignee instead of drawing every member's grid", () => {
    expect(route).toMatch(/const assigneeScope =/)
    expect(route).toMatch(/instanceConditions\.push\(assigneeScope\)/)
  })

  it("keeps unassigned schedules visible under scope=all and hidden under scope=mine", () => {
    expect(route).toMatch(/eq\(tasks\.assigneeId, session\.id\)/)
    expect(route).toMatch(/or\(inArray\(tasks\.assigneeId, visibleIds\), isNull\(tasks\.assigneeId\)\)/)
  })

  it("never leaves a derived branch on an unfiltered sql`true`", () => {
    expect(route).not.toMatch(/instanceConditions\.length > 0/)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts`
Expected: FAIL — "resolves the visible member set once per request" (no `loadVisibleMemberIds` in the route) and the three predicates after it.

- [ ] **Step 3: Add the imports**

In `app/api/calendar/events/route.ts`, extend the drizzle import on line 4 and add the helper import below it:

```ts
import { and, desc, eq, or, gte, inArray, isNull, lte, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { loadVisibleMemberIds } from "@/lib/organizations"
import { createNotification } from "@/lib/notifications"
```

- [ ] **Step 4: Read the visible set and build the predicate**

In `GET`, replace the `mineOnly` line and the `conditions` block (lines 163–179) so the scope is resolved before any branch runs:

```ts
    const mineOnly = searchParams.get("scope") === "mine"

    // `scope=all` is the workspace's schedule, so an unassigned recurring task is visible
    // there and hidden under `scope=mine`. Ruling 5: the 41 imported IT tasks are unassigned
    // today and would otherwise vanish from the calendar until someone claims them.
    const visibleIds = mineOnly ? [session.id] : await loadVisibleMemberIds(session.id)
    const assigneeScope = mineOnly
      ? eq(tasks.assigneeId, session.id)
      : or(inArray(tasks.assigneeId, visibleIds), isNull(tasks.assigneeId))!

    const conditions = []
    if (startDate && !Number.isNaN(Date.parse(startDate))) {
      conditions.push(gte(calendarEvents.startTime, new Date(startDate)))
    }
    if (endDate && !Number.isNaN(Date.parse(endDate))) {
      conditions.push(lte(calendarEvents.endTime, new Date(endDate)))
    }
    if (mineOnly) {
      conditions.push(
        or(
          eq(calendarEvents.organizerId, session.id),
          sql`${calendarEvents.attendees} @> ${JSON.stringify([session.id])}::jsonb`,
        )!,
      )
    }
```

`calendar_events` keeps its own predicate untouched: real meetings are already scoped by organiser and invitee.

- [ ] **Step 5: Scope the instance branch**

Replace the whole instances block (lines 201–220) with:

```ts
    // Parse viewMode parameter
    const viewMode = searchParams.get("viewMode") || "due"
    const validViewModes = ["due", "cadence", "both", "range"]
    if (!validViewModes.includes(viewMode)) {
      return NextResponse.json(
        { success: false, error: `Invalid viewMode. Must be one of: ${validViewModes.join(", ")}` },
        { status: 400 }
      )
    }

    // Occurrences of a schedule, in their own status. Always assignee-scoped, so the
    // `where` can never degrade to `sql`true``.
    let instancesWithTasks: any[] = []
    if (viewMode === "cadence" || viewMode === "both" || viewMode === "range") {
      const instanceConditions = [assigneeScope]
      if (startDate && !Number.isNaN(Date.parse(startDate))) {
        instanceConditions.push(gte(taskInstances.instanceDate, startDate))
      }
      if (endDate && !Number.isNaN(Date.parse(endDate))) {
        instanceConditions.push(lte(taskInstances.instanceDate, endDate))
      }

      instancesWithTasks = await db
        .select({
          instance: taskInstances,
          taskTitle: tasks.title,
        })
        .from(taskInstances)
        .leftJoin(tasks, eq(taskInstances.taskId, tasks.id))
        .where(and(...instanceConditions))
    }
```

The guard in Step 1 expects `instanceConditions.push(assigneeScope)`; because the array is seeded with it above, instead write the seed as the push the guard names:

```ts
      const instanceConditions = []
      instanceConditions.push(assigneeScope)
      if (startDate && !Number.isNaN(Date.parse(startDate))) {
```

- [ ] **Step 6: Scope the recurring-template branch**

In the `due`/`both` block (lines 222–236), add the predicate to the condition list:

```ts
      const taskConditions = [eq(tasks.isTemplate, true), assigneeScope]
```

Task 2 deletes this branch; until then it must be scoped, because it is the branch that currently draws every member's schedules onto your month grid.

- [ ] **Step 7: Run the guards, typecheck and the suite**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add app/api/calendar/events/route.ts tests/unit/recurrence-cross-surface-guards.test.ts
git commit -m "fix(calendar): scope derived recurrence events to the members who may see them"
```

---

### Task 2: View modes re-cut (spec §B)

**Files:**
- Modify: `app/api/calendar/events/route.ts` (lines 222–236 deleted, 260–282 replaced)
- Modify: `app/dashboard/calendar/page.tsx` (`TaskRow` at :133–139, `deadlineRows` at :559–570)
- Test: `tests/unit/recurrence-cross-surface-guards.test.ts` (append)

**Interfaces:**
- Consumes: `assigneeScope` from Task 1; `isCompletedTaskStatus(value)` from `@/lib/tasks/statuses` (client-safe, already imported by other pages).
- Produces: the event shape both derived branches emit — `eventType: "task_instance"` for an occurrence, `eventType: "task"` with `isRecurring: false` for a one-off deadline. Task 3 adds the horizon top-up in front of these queries; Task 8's guards read these names.

- [ ] **Step 1: Write the failing guard test**

Append to `tests/unit/recurrence-cross-surface-guards.test.ts`:

```ts
describe("a schedule draws occurrences and a deadline draws its due date", () => {
  const route = codeOnly(src("app/api/calendar/events/route.ts"))

  it("has no template branch left", () => {
    expect(route).not.toMatch(/recurringTasksList/)
    expect(route).not.toMatch(/recurringEvents/)
    expect(route).not.toMatch(/isTemplate, true/)
  })

  it("reads only non-template tasks in the deadline branch", () => {
    expect(route).toMatch(/eq\(tasks\.isTemplate, false\)/)
    expect(route).toMatch(/isNotNull\(tasks\.dueDate\)/)
  })

  it("never stamps an event with the request clock", () => {
    expect(route).not.toMatch(/startTime:[^\n]*new Date\(\)\.toISOString\(\)/)
  })

  it("carries the assignee predicate on both derived branches", () => {
    expect(route.match(/push\(assigneeScope\)/g)?.length).toBe(2)
  })

  it("treats a one-off deadline as a deadline, not a schedule", () => {
    const page = codeOnly(src("app/dashboard/calendar/page.tsx"))
    expect(page).toMatch(/isCompletedTaskStatus\(t\.status\)/)
    expect(page).toMatch(/isRecurringTask\(t\)/)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts`
Expected: FAIL — the template branch still exists, `isTemplate, true` is still present, and the page still compares `t.status === "done"`.

- [ ] **Step 3: Add the imports the new branch needs**

In `app/api/calendar/events/route.ts` line 4, add `isNotNull`:

```ts
import { and, asc, desc, eq, inArray, isNull, isNotNull, or, gte, lte, sql } from "drizzle-orm"
```

(`asc` is used by Task 3; adding it here keeps the import line stable across both tasks.)

- [ ] **Step 4: Replace the template branch with a one-off deadline branch**

Delete lines 222–236 (`recurringTasksList` + its query) and put this in their place:

```ts
    // Deadlines: a task with a real due date and no schedule. `is_template = false` is the
    // complement of the instance branch above, so no task can reach both lists and `both`
    // cannot double count — the structural reason, not a dedupe step to forget later.
    let oneOffTasksList: Array<{
      id: number
      title: string
      description: string | null
      dueDate: string | null
      status: string
      priority: string
      assigneeId: number | null
      createdAt: Date | string | null
      updatedAt: Date | string | null
    }> = []
    if (viewMode === "due" || viewMode === "both") {
      const oneOffConditions = [eq(tasks.isTemplate, false), isNotNull(tasks.dueDate)]
      oneOffConditions.push(assigneeScope)
      if (startDate && !Number.isNaN(Date.parse(startDate))) {
        oneOffConditions.push(gte(tasks.dueDate, startDate))
      }
      if (endDate && !Number.isNaN(Date.parse(endDate))) {
        oneOffConditions.push(lte(tasks.dueDate, endDate))
      }
      oneOffTasksList = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          dueDate: tasks.dueDate,
          status: tasks.status,
          priority: tasks.priority,
          assigneeId: tasks.assigneeId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(and(...oneOffConditions))
    }
```

- [ ] **Step 5: Replace the template event mapping**

Delete the `recurringEvents` block (lines 260–279) and put this in its place:

```ts
    // A one-off deadline keeps the day its owner set. `isRecurring: false` is what makes the
    // page colour it as a deadline instead of a schedule, which is now honest — a task with a
    // real due date and no cadence is exactly that.
    const oneOffEvents = oneOffTasksList.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      description: task.description,
      startTime: `${task.dueDate}T00:00:00Z`,
      endTime: `${task.dueDate}T23:59:59Z`,
      location: null,
      eventType: "task",
      isRecurring: false,
      taskStatus: task.status,
      priority: task.priority,
      taskId: task.id,
      isAllDay: true,
      recurringPattern: {},
      organizer: { id: task.assigneeId ?? 0, name: "System", avatar: null },
      attendees: [],
      color: "amber",
      createdAt: toIso(task.createdAt),
      updatedAt: toIso(task.updatedAt),
    }))
```

- [ ] **Step 6: Merge the new list**

In the merge line (formerly :282), swap the deleted name:

```ts
    const allEvents = [...rows.map((row) => formatEvent(row, allUsers)), ...instanceEvents, ...oneOffEvents]
```

- [ ] **Step 7: Make the page's sidebar list agree**

In `app/dashboard/calendar/page.tsx`, widen the local row type (:133–139) and guard the deadline filter (:559–570).

```ts
type TaskRow = {
  id: number
  title: string
  status: string
  priority: string
  dueDate: string | null
  cadence: string | null
}
```

```ts
  const isRecurringTask = (t: { cadence?: string | null }) =>
    Boolean(t.cadence && t.cadence !== "one-off")

  const deadlineRows = useMemo(() => {
    const today0 = startOfDay(new Date())
    const horizon = addDays(today0, 14)
    return tasks
      .filter((t) => {
        if (!t.dueDate || isCompletedTaskStatus(t.status) || isRecurringTask(t)) return false
        const d = new Date(t.dueDate)
        return d.getTime() <= horizon.getTime()
      })
      .sort((a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime())
      .slice(0, 8)
  }, [tasks])
```

`isRecurringTask` is the same local rule the tasks page uses ([app/dashboard/tasks/page.tsx:195](../../app/dashboard/tasks/page.tsx#L195)) — deliberately re-declared rather than imported, because a shared home for it would have to live in a module both pages can import, and one `cadence !== "one-off"` test is not worth that coupling. `GET /api/tasks` returns the full row, so `cadence` is already on the wire; only the local type was hiding it.

Add the import next to the other `@/lib` imports at the top of the page:

```ts
import { isCompletedTaskStatus } from "@/lib/tasks/statuses"
```

- [ ] **Step 8: Run the guards, typecheck and the suite**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts && npx tsc --noEmit`
Expected: PASS. If the "both derived branches" count guard fails, one branch lost its predicate — fix the branch, not the guard.

- [ ] **Step 9: Commit**

```bash
git add app/api/calendar/events/route.ts app/dashboard/calendar/page.tsx tests/unit/recurrence-cross-surface-guards.test.ts
git commit -m "fix(calendar): draw occurrences for schedules and real due dates for one-offs"
```

---

### Task 3: Horizon top-up on the calendar read (spec §C)

**Files:**
- Modify: `lib/tasks/recurrence.ts` (append after `HORIZON_OCCURRENCES` at :13)
- Modify: `app/api/calendar/events/route.ts` (insert between the `viewMode` validation and the instance query)
- Test: `tests/unit/task-recurrence.test.ts` (append), `tests/unit/recurrence-cross-surface-guards.test.ts` (append)

**Interfaces:**
- Consumes: `assigneeScope`/`visibleIds`/`mineOnly` from Task 1; `CADENCE_DAYS` from `@/lib/cadence`; `ensureInstanceHorizon(taskId, cadence, todayIso, occurrences)` from `@/lib/data-access-task-instances` (already exists, 4th arg defaults to `HORIZON_OCCURRENCES`); `isCadence(value)` from `@/lib/cadence`.
- Produces: `MAX_HORIZON_OCCURRENCES` (90), `horizonOccurrencesForWindow(cadence, todayIso, endDateIso)` and the file-local `HORIZON_TASK_LIMIT` (25). Task 5 calls `ensureInstanceHorizon` with three arguments, so the default must stay.

- [ ] **Step 1: Write the failing unit tests**

Append to `tests/unit/task-recurrence.test.ts` (its import block gains `horizonOccurrencesForWindow` and `MAX_HORIZON_OCCURRENCES`):

```ts
describe("horizonOccurrencesForWindow", () => {
  it("covers a 42-day month grid on a daily cadence", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "2026-12-16")).toBe(43)
  })

  it("needs two yearly rows to reach next year", () => {
    expect(horizonOccurrencesForWindow("yearly", "2026-11-04", "2027-11-04")).toBe(2)
  })

  it("falls back to the standing horizon when the reader sent no window", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", null)).toBe(HORIZON_OCCURRENCES)
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "not-a-date")).toBe(HORIZON_OCCURRENCES)
  })

  it("caps a 12-month daily view at the bound rather than writing 366 rows", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "2027-11-04")).toBe(
      MAX_HORIZON_OCCURRENCES,
    )
  })

  it("never asks for a negative or zero window", () => {
    expect(horizonOccurrencesForWindow("daily", "2026-11-04", "2026-10-01")).toBe(1)
  })

  it("treats a one-off as no window demand", () => {
    // CADENCE_DAYS["one-off"] is null: the caller never tops one up, and the answer is the
    // standing horizon rather than a division by nothing.
    expect(horizonOccurrencesForWindow("one-off", "2026-11-04", "2026-12-16")).toBe(
      HORIZON_OCCURRENCES,
    )
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/unit/task-recurrence.test.ts`
Expected: FAIL — "No `horizonOccurrencesForWindow` export is found".

- [ ] **Step 3: Implement the pure window math**

In `lib/tasks/recurrence.ts`, add under `HORIZON_OCCURRENCES`. The file already imports `type Cadence` from `@/lib/cadence`; widen that import to also take `CADENCE_DAYS`:

```ts
import { CADENCE_DAYS, type Cadence, computeNextRun } from "@/lib/cadence"
```

```ts
/** The most occurrences one read may ask one schedule to materialise in a single request. */
export const MAX_HORIZON_OCCURRENCES = 90

/** A `YYYY-MM-DD` string as UTC midnight, or null when it is not a real date. */
function dayMs(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const ms = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(ms) ? null : ms
}

/**
 * How many scheduled dates a grid needs to reach the end of the window a reader is about to
 * draw, so a month view shows a month of occurrences instead of the seven rows the standing
 * horizon keeps.
 *
 * The window is measured in whole days between two calendar dates, never between two `Date`
 * instants: both operands are plain dates, so a viewer in Auckland and a viewer in Lagos get
 * the count their own grid has to cover, not an hour of drift.
 */
export function horizonOccurrencesForWindow(
  cadence: Cadence,
  todayIso: string,
  endDateIso: string | null | undefined,
): number {
  const days = CADENCE_DAYS[cadence]
  if (days === null) return HORIZON_OCCURRENCES

  const today = dayMs(todayIso)
  const end = dayMs(endDateIso)
  if (today === null || end === null) return HORIZON_OCCURRENCES

  const span = Math.round((end - today) / 86_400_000)
  // A window that closed in the past still gets the row for its own day rather than zero,
  // which `horizonDates` would read as "ask for nothing".
  if (span < 0) return 1

  return Math.min(MAX_HORIZON_OCCURRENCES, Math.ceil(span / days) + 1)
}
```

- [ ] **Step 4: Run the unit tests**

Run: `npx vitest run tests/unit/task-recurrence.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing guard**

Append to `tests/unit/recurrence-cross-surface-guards.test.ts`:

```ts
describe("a calendar read tops up the grid it is about to draw", () => {
  const route = codeOnly(src("app/api/calendar/events/route.ts"))
  const recurrence = codeOnly(src("lib/tasks/recurrence.ts"))

  it("sits in front of the instance query", () => {
    expect(route.indexOf("ensureInstanceHorizon(")).toBeLessThan(
      route.indexOf("instancesWithTasks = await db"),
    )
    expect(route).toMatch(/horizonOccurrencesForWindow\(/)
  })

  it("is bounded in rows and in tasks", () => {
    expect(recurrence).toMatch(/export const MAX_HORIZON_OCCURRENCES = 90/)
    expect(route).toMatch(/const HORIZON_TASK_LIMIT = 25/)
    expect(route).toMatch(/limit\(HORIZON_TASK_LIMIT \+ 1\)/)
    expect(route).toMatch(/horizon deferred/)
  })

  it("tops up only schedules that have an owner", () => {
    expect(route).toMatch(/const topUpScope =/)
    // exactly one `isNull(tasks.assigneeId)` exists: Task 1's visible-scope predicate. A second
    // would mean the top-up reached for an unassigned schedule, and a write into someone's grid
    // needs an owner.
    expect(route.match(/isNull\(tasks\.assigneeId\)/g)?.length).toBe(1)
  })

  it("anchors on the member's local day and never fails the read", () => {
    expect(route).toMatch(/localDay\(new Date\(\), session\.timezone\)/)
    expect(route).toMatch(/horizon top-up failed/)
  })
})
```

- [ ] **Step 6: Run it and watch it fail**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts`
Expected: FAIL — no `ensureInstanceHorizon`, no `topUpScope`, no `localDay` in the route.

- [ ] **Step 7: Add the imports and the file-local bound**

In `app/api/calendar/events/route.ts`, extend the import block:

```ts
import { and, asc, desc, eq, inArray, isNull, isNotNull, or, gte, lte, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { loadVisibleMemberIds } from "@/lib/organizations"
import { createNotification } from "@/lib/notifications"
import { isCadence } from "@/lib/cadence"
import { horizonOccurrencesForWindow } from "@/lib/tasks/recurrence"
import { ensureInstanceHorizon } from "@/lib/data-access-task-instances"
import { localDay } from "@/lib/worklog/local-day"
```

and put the bound above `export async function GET`:

```ts
/** §C3: how many schedules one calendar read may top up. The rest catch up on the next read. */
const HORIZON_TASK_LIMIT = 25
```

- [ ] **Step 8: Insert the bounded top-up**

In `GET`, between the `viewMode` validation block and the `// Occurrences of a schedule…` comment, insert:

```ts
    // A grid that ran out shows nothing, and a month view that stops at today is the usual
    // reason. Top the owned schedules up to the window's end before reading them.
    //
    // This is a write inside a read, so three things hold it down: only tasks this member owns
    // (an unassigned schedule is visible but never written — a write into a grid needs an
    // owner), at most HORIZON_TASK_LIMIT tasks, and at most MAX_HORIZON_OCCURRENCES rows each.
    // It is awaited serially because the coverage check per task is what makes the common path
    // one cheap SELECT. And it is swallowed: a failed top-up shows the rows already there.
    if (viewMode === "cadence" || viewMode === "both" || viewMode === "range") {
      const todayIso = localDay(new Date(), session.timezone)
      const windowEnd =
        endDate && !Number.isNaN(Date.parse(endDate)) ? endDate.slice(0, 10) : null
      try {
        const topUpScope = mineOnly
          ? eq(tasks.assigneeId, session.id)
          : inArray(tasks.assigneeId, visibleIds)
        const candidates = await db
          .select({ id: tasks.id, cadence: tasks.cadence })
          .from(tasks)
          .where(and(eq(tasks.isTemplate, true), topUpScope))
          .orderBy(asc(tasks.id))
          .limit(HORIZON_TASK_LIMIT + 1)

        const batch = candidates.slice(0, HORIZON_TASK_LIMIT)
        if (candidates.length > batch.length) {
          console.log(
            `[task_instances] horizon deferred: ${candidates.length - batch.length} tasks`,
          )
        }

        for (const candidate of batch) {
          if (!isCadence(candidate.cadence)) continue
          await ensureInstanceHorizon(
            candidate.id,
            candidate.cadence,
            todayIso,
            horizonOccurrencesForWindow(candidate.cadence, todayIso, windowEnd),
          )
        }
      } catch (error) {
        console.error("[task_instances] horizon top-up failed:", error)
      }
    }
```

`endDate.slice(0, 10)` normalises both shapes the page can send (`2026-12-16` and a full ISO timestamp). Candidates come from `tasks`, not `task_instances`: a grid that has run out has no row inside the window to find it by (§C2). Ordering is `asc(tasks.id)` per ruling **P6**.

- [ ] **Step 9: Run the guards, typecheck and the suite**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts tests/unit/task-recurrence.test.ts && npx tsc --noEmit`
Expected: PASS. If `isCadence(candidate.cadence)` fails to narrow, `tasks.cadence` is typed `string | null` and the guard is right — widen the select alias, do not cast.

- [ ] **Step 10: Commit**

```bash
git add lib/tasks/recurrence.ts app/api/calendar/events/route.ts tests/unit/task-recurrence.test.ts tests/unit/recurrence-cross-surface-guards.test.ts
git commit -m "feat(calendar): top up schedule grids to the window the member opened"
```

---

### Task 4: One cadence vocabulary (spec §F)

**Files:**
- Modify: `lib/cadence.ts` (append after `CADENCES` at :6)
- Modify: `lib/planner/extract.ts:26` and `:75`
- Modify: `app/dashboard/planner/[id]/plan-editor-client.tsx:61` and `:512`
- Modify: `app/api/planner/[id]/items/[itemId]/route.ts:87-89`
- Test: `tests/unit/cadence.test.ts` (append), `tests/unit/recurrence-cross-surface-guards.test.ts` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `SCHEDULE_CADENCES` (the five scheduling words), `ScheduleCadence`, `cadenceOrNone(value: unknown): Cadence | null`. Task 5 consumes `isCadence` and the `cadence`/`isTemplate` derivation.

- [ ] **Step 1: Write the failing unit tests**

Append to `tests/unit/cadence.test.ts` (add `SCHEDULE_CADENCES`, `cadenceOrNone` to its import from `@/lib/cadence`; `CADENCES` is already imported there):

```ts
describe("SCHEDULE_CADENCES", () => {
  it("is the cadence list with the no-schedule word removed", () => {
    expect([...SCHEDULE_CADENCES]).toEqual(CADENCES.filter((c) => c !== "one-off"))
  })

  it("never offers one-off as a schedule", () => {
    expect(SCHEDULE_CADENCES).not.toContain("one-off")
  })
})

describe("cadenceOrNone", () => {
  it("round-trips every known word", () => {
    for (const value of CADENCES) expect(cadenceOrNone(value)).toBe(value)
  })

  it("turns an unknown word into null rather than a stored lie", () => {
    expect(cadenceOrNone("fortnightly")).toBeNull()
    expect(cadenceOrNone("Daily")).toBeNull()
    expect(cadenceOrNone("")).toBeNull()
  })

  it("turns anything that is not a string into null", () => {
    expect(cadenceOrNone(null)).toBeNull()
    expect(cadenceOrNone(undefined)).toBeNull()
    expect(cadenceOrNone(7)).toBeNull()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run tests/unit/cadence.test.ts`
Expected: FAIL — "No `SCHEDULE_CADENCES` export is found".

- [ ] **Step 3: Implement the vocabulary additions**

In `lib/cadence.ts`, immediately after the `CADENCES` declaration:

```ts
/**
 * The words that schedule a task. `one-off` is deliberately absent: a plan item either
 * schedules something or schedules nothing, and the editor has never offered "one-off" as a
 * cadence. Deriving this list from `CADENCES` would be nicer, but a `.filter()` on an
 * `as const` tuple loses the tuple type and Zod's `z.enum` needs the tuple.
 */
export const SCHEDULE_CADENCES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const
export type ScheduleCadence = (typeof SCHEDULE_CADENCES)[number]

/** A known cadence word, or null for "no schedule". An unknown word never persists. */
export function cadenceOrNone(value: unknown): Cadence | null {
  return isCadence(value) ? value : null
}
```

- [ ] **Step 4: Run the unit tests**

Run: `npx vitest run tests/unit/cadence.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing guards**

Append to `tests/unit/recurrence-cross-surface-guards.test.ts`:

```ts
describe("one cadence vocabulary", () => {
  // Scoped to task-cadence sites. `agent_plans.cadence` and `task_report_templates.cadence`
  // are different schedules that merely share the word (spec §F), and lib/reports/period.ts,
  // lib/packs/ops/validator.ts and lib/ops/config/proposal.ts legitimately repeat a subset —
  // so the guard names the four files that must not carry a private copy.
  const files = [
    "lib/planner/extract.ts",
    "app/dashboard/planner/[id]/plan-editor-client.tsx",
    "app/api/planner/[id]/items/[itemId]/route.ts",
  ]

  it("keeps no private copy of the schedule list", () => {
    for (const file of files) {
      expect(codeOnly(src(file))).not.toMatch(/"daily",\s*"weekly",\s*"monthly"/)
    }
  })

  it("points every consumer at the shared list", () => {
    expect(codeOnly(src("lib/planner/extract.ts"))).toMatch(/z\.enum\(SCHEDULE_CADENCES\)/)
    expect(codeOnly(src("lib/planner/extract.ts"))).toMatch(/enum: \[\.\.\.SCHEDULE_CADENCES\]/)
    expect(codeOnly(src("app/dashboard/planner/[id]/plan-editor-client.tsx"))).toMatch(
      /SCHEDULE_CADENCES\.map/,
    )
    expect(codeOnly(src("app/api/planner/[id]/items/[itemId]/route.ts"))).toMatch(
      /cadenceOrNone\(body\.cadence\)/,
    )
  })

  it("keeps the migration script's mirrored grid counts honest", () => {
    const script = src("scripts/import-it-technician-tasks.mjs")
    for (const [cadence, count] of Object.entries(INSTANCE_COUNTS)) {
      expect(script).toContain(`${cadence}: ${count}`)
    }
  })
})
```

`INSTANCE_COUNTS` here is the real module value, so add it to the test's imports at the top of `tests/unit/recurrence-cross-surface-guards.test.ts`:

```ts
import { INSTANCE_COUNTS } from "@/lib/tasks/recurrence"
```

This guard reads the script source once per cadence and compares it against the module the app actually uses — a script may not import app code, so equality is the most a migration script can be held to.

- [ ] **Step 6: Run them and watch them fail**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts`
Expected: FAIL on the three private copies.

- [ ] **Step 7: Collapse the extractor's copies**

In `lib/planner/extract.ts`, add to the existing `@/lib/cadence` import (line 12 imports `computeNextRun`):

```ts
import { SCHEDULE_CADENCES, computeNextRun } from "@/lib/cadence"
```

line 26:

```ts
  cadence: z.enum(SCHEDULE_CADENCES).optional(),
```

and line 75 (inside `planJsonSchema`):

```ts
            cadence: { type: "STRING", enum: [...SCHEDULE_CADENCES] },
```

The validator and the Gemini `responseSchema` now come from one array, so a model cannot be asked for a word the parser will reject mid-request.

- [ ] **Step 8: Collapse the editor's copy and label it properly**

In `app/dashboard/planner/[id]/plan-editor-client.tsx`, delete the local declaration at :61:

```ts
const CADENCES = ["daily", "weekly", "monthly", "quarterly", "yearly"]
```

add the import next to the other `@/lib` imports:

```ts
import { CADENCE_LABEL, SCHEDULE_CADENCES } from "@/lib/cadence"
```

and replace the dropdown body at :512 so the option reads "Quarterly" rather than "quarterly" — the file already imports `CADENCE_LABEL` nowhere, so this is the first use:

```ts
                          {SCHEDULE_CADENCES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {CADENCE_LABEL[c]}
                            </SelectItem>
                          ))}
```

- [ ] **Step 9: Validate the cadence on the plan-item PATCH**

In `app/api/planner/[id]/items/[itemId]/route.ts`, add the import:

```ts
import { cadenceOrNone } from "@/lib/cadence"
```

and replace :87-89:

```ts
  if (typeof body.cadence === "string") {
    updates.cadence = body.cadence || null
  }
```

with:

```ts
  // `undefined` means the field was not sent; null means "no schedule", and an unknown word
  // is stored as null rather than as a cadence nothing can step by.
  if (body.cadence !== undefined) {
    updates.cadence = cadenceOrNone(body.cadence)
  }
```

The old `typeof body.cadence === "string"` guard also made the editor's "None" choice unsaveable — it sent `null`, which was skipped, leaving the stored cadence in place. `body.cadence !== undefined` fixes that while keeping the missing-field behaviour.

- [ ] **Step 10: Run the guards, typecheck and the suite**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts tests/unit/cadence.test.ts && npx tsc --noEmit`
Expected: PASS. If `z.enum(SCHEDULE_CADENCES)` reports a tuple error, the declaration lost its `as const` — restore it, do not cast at the call site (`lib/notifications.ts:10-22` is the same pattern, already accepted by this zod version).

- [ ] **Step 11: Commit**

```bash
git add lib/cadence.ts lib/planner/extract.ts "app/dashboard/planner/[id]/plan-editor-client.tsx" "app/api/planner/[id]/items/[itemId]/route.ts" tests/unit/cadence.test.ts tests/unit/recurrence-cross-surface-guards.test.ts
git commit -m "refactor(cadence): one schedule vocabulary for the extractor, the editor and the plan-item PATCH"
```

---

### Task 5: Promote carries the cadence and builds the grid (spec §E)

**Files:**
- Create: `lib/planner/promote-values.ts`
- Modify: `app/api/planner/[id]/promote/route.ts` (the insert at :72-86, and after the transaction at :124)
- Test: `tests/unit/planner-promote-values.test.ts` (create), `tests/unit/recurrence-cross-surface-guards.test.ts` (append)

**Interfaces:**
- Consumes: `isCadence` / `Cadence` from `@/lib/cadence` (Task 4), `readLegacyDiscipline` from `@/lib/roles` (already imported by the route; `lib/roles.ts` is DB-free), `ensureInstanceHorizon(taskId, cadence, todayIso)` from `@/lib/data-access-task-instances`, `localDay` from `@/lib/worklog/local-day`.
- Produces: `promoteTaskValues(item, session): TaskInsertValues` and `type PromotableItem`.

- [ ] **Step 1: Write the failing unit tests**

Create `tests/unit/planner-promote-values.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { promoteTaskValues, type PromotableItem } from "@/lib/planner/promote-values"

const item = (over: Partial<PromotableItem> = {}): PromotableItem => ({
  title: "Renew the firewall licence",
  description: "Before it lapses.",
  estimatePoints: 3,
  startDate: "2026-11-10",
  dueDate: "2026-11-30",
  discipline: "it_support",
  cadence: null,
  ...over,
})

describe("promoteTaskValues", () => {
  it("keeps a known cadence and marks the row as a schedule", () => {
    const values = promoteTaskValues(item({ cadence: "daily" }), { id: 7 })
    expect(values.cadence).toBe("daily")
    expect(values.isTemplate).toBe(true)
  })

  it("treats no cadence as a one-off task", () => {
    const values = promoteTaskValues(item(), { id: 7 })
    expect(values.cadence).toBe("one-off")
    expect(values.isTemplate).toBe(false)
  })

  it("degrades an unknown cadence word instead of persisting it", () => {
    const values = promoteTaskValues(item({ cadence: "fortnightly" }), { id: 7 })
    expect(values.cadence).toBe("one-off")
    expect(values.isTemplate).toBe(false)
  })

  it("assigns the promoted task to the promoter, every time", () => {
    for (const cadence of ["daily", "monthly", null, "nonsense"] as const) {
      expect(promoteTaskValues(item({ cadence }), { id: 42 }).assigneeId).toBe(42)
    }
  })

  it("carries the item's own fields through", () => {
    const values = promoteTaskValues(item({ cadence: "quarterly" }), { id: 7 })
    expect(values).toMatchObject({
      title: "Renew the firewall licence",
      description: "Before it lapses.",
      status: "todo",
      priority: "medium",
      storyPoints: 3,
      startDate: "2026-11-10",
      dueDate: "2026-11-30",
      discipline: "it_support",
    })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/planner-promote-values.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Create the pure mapping**

Create `lib/planner/promote-values.ts`:

```ts
// The pure half of a promote: what one plan item becomes when it is inserted as a task.
//
// It is DB-free by import, not by job — the type comes from the schema as a type-only
// reference, so the cadence and is_template derivation can be unit tested the way every other
// rule in lib/tasks is. The grid those values imply is written by the route, through
// ensureInstanceHorizon, after the insert transaction resolves.

import type { tasks } from "@/drizzle/schema"
import { isCadence } from "@/lib/cadence"
import { readLegacyDiscipline } from "@/lib/roles"

type TaskInsertValues = typeof tasks.$inferInsert

export type PromotableItem = {
  title: string
  description: string | null
  estimatePoints: number | null
  startDate: string | null
  dueDate: string | null
  discipline: string | null
  cadence: string | null
}

export function promoteTaskValues(
  item: PromotableItem,
  session: { id: number },
): TaskInsertValues {
  // Only plan_items.cadence is read. agent_plans.cadence is notNull with a default of
  // "weekly" — it is how often the plan is reviewed — and falling back to it would promote
  // every one-off item in every plan as a weekly schedule with a real grid.
  const cadence = isCadence(item.cadence) ? item.cadence : "one-off"

  return {
    title: item.title,
    description: item.description,
    status: "todo",
    priority: "medium",
    storyPoints: item.estimatePoints,
    startDate: item.startDate,
    dueDate: item.dueDate,
    discipline: readLegacyDiscipline(item.discipline),
    cadence,
    // The same derivation as app/api/tasks/route.ts:140 and F6's rule: a schedule is a
    // template, and the two fields are never set apart.
    isTemplate: cadence !== "one-off",
    assigneeId: session.id,
  }
}
```

- [ ] **Step 4: Run the unit tests**

Run: `npx vitest run tests/unit/planner-promote-values.test.ts`
Expected: PASS. If `typeof tasks.$inferInsert` reports an error against the `import type`, change it to a value import — the module is server-only either way (see the Global Constraints) and the route is its only consumer besides the test.

- [ ] **Step 5: Write the failing guard**

Append to `tests/unit/recurrence-cross-surface-guards.test.ts`:

```ts
describe("promote carries the cadence and grids after the transaction", () => {
  const route = codeOnly(src("app/api/planner/[id]/promote/route.ts"))

  it("builds task values from the plan item, not from the plan", () => {
    expect(route).toMatch(/promoteTaskValues\(item, \{ id: session\.id \}\)/)
    expect(route).not.toMatch(/agentPlans\.cadence/)
    expect(route).not.toMatch(/plan\.cadence/)
  })

  it("materialises the grid after the transaction, never inside it", () => {
    const txOpen = route.indexOf("db.transaction(")
    const txReturn = route.indexOf("return { taskIds: createdTaskIds")
    const grid = route.indexOf("ensureInstanceHorizon(")
    expect(txOpen).toBeGreaterThan(-1)
    expect(txReturn).toBeGreaterThan(txOpen)
    // The transaction's own return statement is its last line, so anything after it is outside.
    expect(grid).toBeGreaterThan(txReturn)
    expect(route.slice(txOpen, txReturn)).not.toMatch(/ensureInstanceHorizon\(/)
  })

  it("keeps the born-finished rule alone", () => {
    expect(route).not.toMatch(/captureTaskBirths/)
  })
})
```

- [ ] **Step 6: Replace the insert values**

In `app/api/planner/[id]/promote/route.ts`, add the imports:

```ts
import { isCadence } from "@/lib/cadence"
import { promoteTaskValues } from "@/lib/planner/promote-values"
import { ensureInstanceHorizon } from "@/lib/data-access-task-instances"
import { localDay } from "@/lib/worklog/local-day"
```

Above the loop, next to `const createdTaskIds: number[] = []`, add the list the grid pass needs:

```ts
    const createdSchedules: { id: number; cadence: Cadence }[] = []
```

(`Cadence` comes from the same `@/lib/cadence` import line: `import { isCadence, type Cadence } from "@/lib/cadence"`.)

Replace the insert (formerly :72-86) — `sourcePlanId` and `tags` stay route-owned because `sourcePlanId` is written only here:

```ts
      const values = promoteTaskValues(item, { id: session.id })
      const tags = resolvedDeps.length > 0 ? [{ _dependsOn: resolvedDeps }] : []

      const [task] = await tx
        .insert(tasks)
        .values({ ...values, sourcePlanId: planId, tags })
        .returning()

      if (!task) throw new Error("Failed to create task")

      indexToTaskId.set(i, task.id)
      createdTaskIds.push(task.id)
      if (values.isTemplate && isCadence(values.cadence)) {
        createdSchedules.push({ id: task.id, cadence: values.cadence })
      }
```

- [ ] **Step 7: Grid after the transaction**

Immediately after `const result = await db.transaction(...)` closes (before the `return NextResponse.json(` at the end of the handler), add:

```ts
  // A promoted schedule needs occurrences, or the calendar and the tasks panel show a title with
  // no dates under it. Outside the transaction on purpose: a horizon write must never roll back
  // a promote. ensureInstanceHorizon catches its own failures, so nothing is wrapped again here.
  if (createdSchedules.length > 0) {
    const todayIso = localDay(new Date(), session.timezone)
    for (const schedule of createdSchedules) {
      await ensureInstanceHorizon(schedule.id, schedule.cadence, todayIso)
    }
  }
```

`createdSchedules` is declared inside the transaction callback, so hoist it to the handler scope — put `const createdSchedules: { id: number; cadence: Cadence }[] = []` next to `const items = await db.select()...` (before `const result = await db.transaction(`) instead of inside the callback. The callback closes over it.

- [ ] **Step 8: Run the guards, typecheck and the suite**

Run: `npx vitest run tests/unit/planner-promote-values.test.ts tests/unit/recurrence-cross-surface-guards.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/planner/promote-values.ts "app/api/planner/[id]/promote/route.ts" tests/unit/planner-promote-values.test.ts tests/unit/recurrence-cross-surface-guards.test.ts
git commit -m "feat(planner): promote carries the item cadence and builds the schedule grid"
```

---

### Task 6: The completed-status list as SQL, and the server sweep (spec §G1, §G4)

**Files:**
- Create: `lib/tasks/statuses-sql.ts`
- Modify: `app/api/reports/_shared.ts:207-221`
- Modify: `app/api/sprints/[id]/route.ts:55,57,88,117,118,371`
- Modify: `app/api/sprints/route.ts:106,108`
- Modify: `app/api/analytics/route.ts:183-184`
- Modify: `app/api/activity/route.ts:203-204`
- Modify: `app/api/settings/[key]/route.ts:157`
- Modify: `app/api/team/members/route.ts:56-67`
- Modify: `app/api/team/members/[id]/route.ts:33-37`
- Modify: `app/api/automation/_shared.ts:293`
- Modify: `app/api/ethical-metrics/route.ts:539`
- Modify: `app/api/ethical-metrics/apply-recommendation/route.ts:190`
- Modify: `lib/dashboard-data.ts:312,321-323,329,338,444,500,524,549,554,716-718`
- Test: `tests/unit/statuses-sql.test.ts` (create), `tests/unit/recurrence-cross-surface-guards.test.ts` (append)

**Interfaces:**
- Consumes: `COMPLETED_TASK_STATUSES` from `@/lib/tasks/statuses` (client-safe, already the single home of the words).
- Produces: `completedStatusSql(column)`, `openStatusSql(column)` and `completedStatusListSql()` — the two column forms for drizzle-referenced predicates and the list form for raw SQL that already aliased the table (ruling **P5**), each returning a drizzle `SQL`. Task 7 keeps using `isCompletedTaskStatus` on the client; Task 8 reads both from `lib/dashboard-data.ts`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/statuses-sql.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { tasks } from "@/drizzle/schema"
import { COMPLETED_TASK_STATUSES } from "@/lib/tasks/statuses"
import { completedStatusListSql, completedStatusSql, openStatusSql } from "@/lib/tasks/statuses-sql"

describe("completedStatusSql", () => {
  it("binds every word in the shared list, so a fourth word arrives automatically", () => {
    const { sql, params } = completedStatusSql(tasks.status).toSQL()
    expect(params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(sql.toLowerCase()).toContain("in (")
  })

  it("renders the qualified column, not a bare name", () => {
    expect(completedStatusSql(tasks.status).toSQL().sql).toContain('"tasks"."status"')
  })
})

describe("openStatusSql", () => {
  it("is the exact negation of the completed fragment", () => {
    const open = openStatusSql(tasks.status).toSQL()
    expect(open.params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(open.sql.toLowerCase()).toContain("not (")
  })
})

describe("completedStatusListSql", () => {
  it("binds one placeholder per word and no column of its own", () => {
    const { sql, params } = completedStatusListSql().toSQL()
    expect(params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(sql.split("?").length - 1).toBe(COMPLETED_TASK_STATUSES.length)
    expect(sql).not.toContain("status")
  })

  it("renders a valid `not in` after a raw aliased column", () => {
    const fragment = sql`t.status not in (${completedStatusListSql()})`.toSQL()
    expect(fragment.params).toEqual([...COMPLETED_TASK_STATUSES])
    expect(fragment.sql.toLowerCase()).toContain("t.status not in")
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/statuses-sql.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Create the fragments**

Create `lib/tasks/statuses-sql.ts`:

```ts
// The completed-status list, as SQL.
//
// Server-only: this renders a drizzle fragment. The client half of the same rule is
// isCompletedTaskStatus() in lib/tasks/statuses.ts, which is case- and whitespace-tolerant and
// raw SQL is not — an accepted asymmetry, because every swept site reads rows this app wrote.
//
// Three forms, because the rule is applied to `tasks.status` reached three ways: through
// drizzle's column objects, inside a raw statement that aliased the table, and in JS on a row
// already fetched. A constant bound to the first cannot serve the second.

import { sql, type SQL } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import { COMPLETED_TASK_STATUSES } from "@/lib/tasks/statuses"

/** The bound word list on its own, for a fragment that names its own (possibly aliased) column. */
export function completedStatusListSql(): SQL {
  return sql.join(
    COMPLETED_TASK_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  )
}

/** `status in ('done','completed','closed')` — this task is finished, whichever word wrote it. */
export function completedStatusSql(column: PgColumn): SQL {
  return sql`${column} in (${completedStatusListSql()})`
}

/** The one source for "this task is still open": the exact negation of the list above. */
export function openStatusSql(column: PgColumn): SQL {
  return sql`not (${completedStatusSql(column)})`
}
```

- [ ] **Step 4: Run the unit test**

Run: `npx vitest run tests/unit/statuses-sql.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing guard**

Append to `tests/unit/recurrence-cross-surface-guards.test.ts`:

```ts
describe("the server reads the completed-status list, not a literal", () => {
  const serverFiles = [
    "app/api/reports/_shared.ts",
    "app/api/sprints/[id]/route.ts",
    "app/api/sprints/route.ts",
    "app/api/analytics/route.ts",
    "app/api/activity/route.ts",
    "app/api/settings/[key]/route.ts",
    "app/api/team/members/route.ts",
    "app/api/team/members/[id]/route.ts",
    "app/api/automation/_shared.ts",
    "app/api/ethical-metrics/route.ts",
    "app/api/ethical-metrics/apply-recommendation/route.ts",
    "lib/dashboard-data.ts",
  ]

  it("leaves no status-vs-'done' comparison in a swept server file", () => {
    for (const file of serverFiles) {
      const code = codeOnly(src(file))
      expect(code, file).not.toMatch(/status\s*[!=]==?\s*["']done["']/)
      expect(code, file).not.toMatch(/status\}? (<>=?|<>) ?'done'/)
      expect(code, file).not.toMatch(/neqDone\(/)
    }
  })

  it("imports the shared rule into each of them", () => {
    for (const file of serverFiles) {
      const code = src(file)
      expect(
        /@\/lib\/tasks\/statuses(-sql)?/.test(code),
        `${file} imports neither statuses helper`,
      ).toBe(true)
    }
  })

  it("excludes schedules from the counting reads, and only those", () => {
    // Task 8 adds the same predicate to the dashboard reads; this guard only pins what Task 6 does.
    expect(codeOnly(src("app/api/reports/_shared.ts"))).toMatch(/isTemplate|is_template = false/)
    expect(codeOnly(src("app/api/team/members/route.ts"))).toMatch(/eq\(tasks\.isTemplate, false\)/)
    const detail = codeOnly(src("app/api/team/members/[id]/route.ts"))
    expect(detail.slice(0, detail.indexOf("export async function DELETE"))).toMatch(
      /eq\(tasks\.isTemplate, false\)/,
    )
    // ruling P7: the account-removal guard counts every owned row, schedules included
    expect(detail.slice(detail.indexOf("export async function DELETE"))).not.toMatch(/isTemplate/)
  })
})
```

The second regex covers `= 'done'`, `<> 'done'`, `!= 'done'` and `!== 'done'` after a drizzle interpolation (`${tasks.status}`). It is deliberately narrow: it does not look at `sprints.status`, `entry.status` or a `dataKey="done"` chart prop, all of which are other vocabularies (§G3).

- [ ] **Step 6: Run it and watch it fail**

Run: `npx vitest run tests/unit/recurrence-cross-surface-guards.test.ts`
Expected: FAIL on all seven files.

- [ ] **Step 7: Reports — raw SQL keeps its alias, gains the list and the schedule exclusion**

In `app/api/reports/_shared.ts`, add:

```ts
import { completedStatusListSql } from "@/lib/tasks/statuses-sql"
```

Replace the `department` branch (formerly :207-213):

```ts
      rows = (await db.execute(sql`
        SELECT coalesce(nullif(u.department, ''), 'No department')::text AS name, count(t.id)::int AS value
        FROM users u LEFT JOIN tasks t
          ON t.assignee_id = u.id
          AND t.status not in (${completedStatusListSql()})
          AND t.is_template = false
        GROUP BY coalesce(nullif(u.department, ''), 'No department') ORDER BY count(t.id) DESC
      `)) as unknown as DatasetRow[]
```

and the `name` branch (formerly :215-221):

```ts
      rows = (await db.execute(sql`
        SELECT u.name::text AS name, count(t.id)::int AS value
        FROM users u LEFT JOIN tasks t
          ON t.assignee_id = u.id
          AND t.status not in (${completedStatusListSql()})
          AND t.is_template = false
          AND t.created_at >= now() - make_interval(days => ${rangeDays})
        GROUP BY u.name ORDER BY count(t.id) DESC
      `)) as unknown as DatasetRow[]
```

Both statements keep their `tasks t` alias, which is why they use `completedStatusListSql()` (the value list alone) rather than `openStatusSql(tasks.status)` — the column-fragment forms render `"tasks"."status"`, and Postgres rejects the original table name once a table is aliased (ruling **P5**). And `t.is_template = false` is §G4: a recurring schedule is unfinished forever by design, so counting it as open workload would inflate every department bar by the number of checklists the owner imported. Both branches are `LEFT JOIN`s, so a member with only schedules still appears with a zero bar rather than vanishing from the chart.

- [ ] **Step 8: Sprints detail route**

In `app/api/sprints/[id]/route.ts`, add:

```ts
import { isCompletedTaskStatus } from "@/lib/tasks/statuses"
import { completedStatusSql, openStatusSql } from "@/lib/tasks/statuses-sql"
```

`getAggregates` (:55, :57):

```ts
      donePoints: sql<number>`coalesce(sum(case when ${completedStatusSql(tasks.status)} then ${tasks.storyPoints} else 0 end), 0)::int`,
      taskCount: sql<number>`count(*)::int`,
      doneCount: sql<number>`count(case when ${completedStatusSql(tasks.status)} then 1 end)::int`,
```

The burndown loop (:88) — JS, so the JS helper:

```ts
    if (!isCompletedTaskStatus(t.status) || !t.updatedAt) continue
```

`getTeamCapacity` (:117-118):

```ts
      donePoints: sql<number>`coalesce(sum(case when ${completedStatusSql(tasks.status)} then ${tasks.storyPoints} else 0 end), 0)::int`,
      openPoints: sql<number>`coalesce(sum(case when ${openStatusSql(tasks.status)} then ${tasks.storyPoints} else 0 end), 0)::int`,
```

and the close-sprint guard (:371):

```ts
      .where(and(eq(tasks.sprintId, id), openStatusSql(tasks.status)))
```

Per §G4, **no** `isTemplate` predicate is added to any sprint aggregate: a recurring task placed in a sprint is the owner's deliberate choice, and hiding it would mask the mistake.

- [ ] **Step 9: The remaining server readers**

`app/api/sprints/route.ts` — add both helper imports (same two lines as Step 8), then :106 and :108:

```ts
      donePoints: sql<number>`coalesce(sum(case when ${completedStatusSql(tasks.status)} then ${tasks.storyPoints} else 0 end), 0)::int`,
      taskCount: sql<number>`count(*)::int`,
      doneCount: sql<number>`count(case when ${completedStatusSql(tasks.status)} then 1 end)::int`,
```

`app/api/analytics/route.ts:183-184` — add `import { isCompletedTaskStatus } from "@/lib/tasks/statuses"`:

```ts
    const doneTasks = taskRows.filter((t: TaskRow) => isCompletedTaskStatus(t.status))
    const openTasks = taskRows.filter((t: TaskRow) => !isCompletedTaskStatus(t.status))
```

`app/api/activity/route.ts:203-204` — add the same import, and read the rule once:

```ts
        const finished = isCompletedTaskStatus(t.status)
        events.push({
          id: `t-${t.id}-u`,
          kind: "task",
          type: finished ? "task_completed" : "task_updated",
          title: finished ? `Task completed: ${t.title}` : `Task updated: ${t.title}`,
```

`app/api/settings/[key]/route.ts:157` — add `import { openStatusSql } from "@/lib/tasks/statuses-sql"` and replace the `ne(tasks.status, "done")`:

```ts
    .where(and(eq(tasks.assigneeId, userId), openStatusSql(tasks.status)))
```

If `ne` becomes unused in that file, remove it from the drizzle import line — an unused import is a new lint problem, and the lint gate has a fixed baseline.

The five files ruling **P4** adds to the inventory:

`app/api/team/members/route.ts` — add `import { openStatusSql } from "@/lib/tasks/statuses-sql"` and `and` to the drizzle import line (it currently has `asc, desc, eq, ne, sql`). `loadTaskAggregates` (formerly :59-66):

```ts
      openTasks: sql<number>`count(*) filter (where ${openStatusSql(tasks.status)})::int`,
      doneTasks: sql<number>`count(*) filter (where ${completedStatusSql(tasks.status)})::int`,
      blockedTasks: sql<number>`count(*) filter (where ${tasks.status} = 'blocked')::int`,
      openPoints:
        sql<number>`coalesce(sum(${tasks.storyPoints}) filter (where ${openStatusSql(tasks.status)}), 0)::int`,
    })
    .from(tasks)
    .where(and(sql`${tasks.assigneeId} is not null`, eq(tasks.isTemplate, false)))
```

Add `completedStatusSql` to that same import line. `blockedTasks` is not swept — `"blocked"` is an open status, not a completed one (§G3).

`app/api/team/members/[id]/route.ts` — add the same two-helper import. `loadMemberRow` (formerly :33-37, the member-profile card):

```ts
      openTasks: sql<number>`count(*) filter (where ${openStatusSql(tasks.status)})::int`,
      doneTasks: sql<number>`count(*) filter (where ${completedStatusSql(tasks.status)})::int`,
      blockedTasks: sql<number>`count(*) filter (where ${tasks.status} = 'blocked')::int`,
      openPoints:
        sql<number>`coalesce(sum(${tasks.storyPoints}) filter (where ${openStatusSql(tasks.status)}), 0)::int`,
      totalTasks: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(eq(tasks.assigneeId, memberId), eq(tasks.isTemplate, false)))
```

`and` is already imported there. The `DELETE` handler's `taskCounts` (formerly :277-279) gets the two status fragments and **no** template predicate, per ruling **P7**:

```ts
        openTasks: sql<number>`count(*) filter (where ${openStatusSql(tasks.status)})::int`,
        doneTasks: sql<number>`count(*) filter (where ${completedStatusSql(tasks.status)})::int`,
```

`app/api/automation/_shared.ts:293` — the one fragment shared by all seven trigger queries, so one edit fixes every rule. Add `import { completedStatusListSql } from "@/lib/tasks/statuses-sql"` and replace the literal:

```ts
  const open = sql`t.status not in (${completedStatusListSql()})`
```

The `t` alias stays (the projection below it uses `t.` throughout). This is a writer choosing which task to move, so no `is_template` predicate is added here either — but note what this changes in practice: a `due_soon` or `overdue` rule previously fired on an open schedule, and now fires on it for the same reason it fired before, because no completed word ever lands on a template. The sweep is a correctness fix for rows written `completed`/`closed`, not a behaviour change for rules.

`app/api/ethical-metrics/route.ts:539` and `app/dashboard/ethical-metrics/page.tsx` are read once here and once in Task 7. Add `import { isCompletedTaskStatus } from "@/lib/tasks/statuses"` to the route and:

```ts
  const isOpen = (t: TaskRecord) => !isCompletedTaskStatus(t.status)
```

`app/api/ethical-metrics/apply-recommendation/route.ts:190` — same import, and the skip guard reads:

```ts
        if (!taskRow || isCompletedTaskStatus(taskRow.status)) continue
```

- [ ] **Step 10: Dashboard data, server side**

In `lib/dashboard-data.ts`, add:

```ts
import { isCompletedTaskStatus } from "@/lib/tasks/statuses"
import { completedStatusSql, openStatusSql } from "@/lib/tasks/statuses-sql"
```

Delete the `neqDone` helper at the bottom of the file (formerly :716-718) and use its replacement at the priority read (formerly :312):

```ts
      .where(and(eq(tasks.assigneeId, userId), openStatusSql(tasks.status)))
```

In `workloadRows`, declare the two case expressions once above the `Promise.all` block that owns them, so the aggregate and its `orderBy` cannot drift apart:

```ts
  const openCase = () => sql`case when ${openStatusSql(tasks.status)} then 1 end`
  const doneCase = () => sql`case when ${completedStatusSql(tasks.status)} then 1 end`
```

and rewrite the fragments (formerly :321-323) and the ordering (formerly :329):

```ts
        openPoints: sql<number>`coalesce(sum(case when ${openStatusSql(tasks.status)} then ${tasks.storyPoints} else 0 end), 0)::int`,
        openTasks: sql<number>`count(${openCase()})::int`,
        doneTasks: sql<number>`count(${doneCase()})::int`,
```

```ts
      .orderBy(desc(sql`count(${openCase()})`)),
```

In `throughputRows` (formerly :338):

```ts
      .where(and(completedStatusSql(tasks.status), gte(tasks.updatedAt, weekAgo), member ? eq(tasks.assigneeId, userId) : undefined))
```

In `velocityRows` (formerly :444):

```ts
            completed: sql<number>`coalesce(sum(case when ${completedStatusSql(tasks.status)} then ${tasks.storyPoints} else 0 end), 0)::int`,
```

and the four JS comparisons — the sprint burndown reads (formerly :500 and :524), the `notDone` helper (formerly :549) and the completed-this-week KPI (formerly :554):

```ts
    const donePoints = sprintTaskRows.filter((t) => isCompletedTaskStatus(t.status)).reduce((s, t) => s + t.storyPoints, 0)
```

```ts
      if (!isCompletedTaskStatus(t.status) || !t.updatedAt) continue
```

```ts
  const notDone = (t: (typeof myTasks)[number]) => !isCompletedTaskStatus(t.status)
```

```ts
  const myCompletedThisWeek = myTasks.filter(
    (t) => isCompletedTaskStatus(t.status) && t.updatedAt && t.updatedAt >= weekAgo,
  ).length
```

- [ ] **Step 11: Run the guards, typecheck and the suite**

Run: `npx vitest run tests/unit/statuses-sql.test.ts tests/unit/recurrence-cross-surface-guards.test.ts && npx tsc --noEmit && npx vitest run`
Expected: PASS, and the full suite still green. A red pre-existing test here usually means the swept read changed a number a fixture asserted; read the assertion — if it hardcodes `done`-only counting, it is the test that was wrong, and ruling 4 says the sweep is the intent.

- [ ] **Step 12: Commit**

```bash
git add lib/tasks/statuses-sql.ts app/api/reports/_shared.ts "app/api/sprints/[id]/route.ts" app/api/sprints/route.ts app/api/analytics/route.ts app/api/activity/route.ts "app/api/settings/[key]/route.ts" lib/dashboard-data.ts tests/unit/statuses-sql.test.ts tests/unit/recurrence-cross-surface-guards.test.ts
git commit -m "fix(statuses): read the completed-status list in every server aggregate"
```
