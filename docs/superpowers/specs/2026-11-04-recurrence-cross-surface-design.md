# Recurrence Cross-Surface Design (wave A–H)

**Date:** 2026-11-04
**Status:** approved design, awaiting implementation plan
**Builds on:** [2026-11-02 task-tracking-recurrence-design.md](./2026-11-02-task-tracking-recurrence-design.md) (the recurrence model, F1–F6) and [2026-10-26 worklog-reports-planner-assistant-design.md](./2026-10-26-worklog-reports-planner-assistant-design.md) (§11 career signals, §13 completed-status rule)
**Prior wave:** F1–F6 shipped and deployed 2026-11-04 (`587d5a9`, Vercel `jiravision-4e06vfqyz`)

## Goal

The F1–F6 wave fixed recurrence where a member works on it — the tasks page, the boards, the instance API,
the career signal. Every *other* surface that reads the same rows kept the old assumptions. This wave makes
the calendar, the dashboard, the planner's promote path, the cadence vocabulary and every completed-status
reader agree with the recurrence model that now exists.

**Non-goal, stated up front:** no schema change, no migration, no new table or column, no cron, and no
script that writes to production Neon. Every fix is a read predicate, a pure rule, or a write through the
horizon writer the previous wave already shipped.

## Why this wave exists — the audit

| id | surface | defect, with the line that shows it |
| --- | --- | --- |
| A | calendar API | `scope=mine` filters `calendar_events` only ([app/api/calendar/events/route.ts:172-179](../../../app/api/calendar/events/route.ts#L172)). The instance branch (:212-219) and the template branch (:232-235) have no assignee predicate, so every member's recurrences land on your calendar. The member-scope wave closed this on other reads and never reached these two branches. |
| B | calendar API | a recurring task emits **both** its instances and one extra event at `tasks.dueDate` — and at `new Date()` when `dueDate` is null (:264-265). Every cadence task therefore drops a marker on *today*, and `both` counts it twice. |
| B′ | calendar API | the same `due` branch asks for `eq(tasks.isTemplate, true)` (:225), so it shows *only* recurring templates and **no one-off due dates at all**. Half of the view was inverted. |
| C | calendar API | the calendar never tops up a horizon. `ensureInstanceHorizon` runs only on `GET /api/task-instances?taskId=` and on instance completion, so a grid that ran out reads as an empty calendar until that task is opened elsewhere. |
| D | dashboard | `/api/dashboard/overview` counts recurring templates as open forever. F4 made a template unable to reach a completed status, so `openTasks`/`openPoints` ([lib/dashboard-data.ts:312](../../../lib/dashboard-data.ts#L312), :321-323) accumulate one permanent open item per schedule. And the dashboard has no recurring surface at all: `app/dashboard/page.tsx` fetches (:287-291) never ask for instances, and `setTaskStatus` (:434) offers Done on a recurring card, so the member meets a raw 409 toast where the boards hide the option. |
| E | planner promote | the insert (:72-86) writes neither `cadence` nor `assigneeId`, although `plan_items.cadence` exists ([drizzle/schema.ts:453](../../../drizzle/schema.ts#L453)), the extractor captures it ([lib/planner/extract.ts:26](../../../lib/planner/extract.ts#L26)) and the editor edits it (plan-editor-client.tsx:61). A recurring plan promotes as a one-off; with no assignee it is invisible to career counts, which filter `assigneeId`, and cannot be topped up, which requires `assigneeId === session.id`. |
| F | vocabulary | the cadence list is written four times: `lib/cadence.ts:6`, `lib/planner/extract.ts:26` and `:75`, `plan-editor-client.tsx:61`. Each survived the `quarterly` addition by luck. The plan-item PATCH accepts *any* string (items/[itemId]/route.ts:87-89) and stores it. |
| G | ~20 readers | `COMPLETED_TASK_STATUSES` exists ([lib/tasks/statuses.ts:8](../../../lib/tasks/statuses.ts#L8)) but most readers compare against the `'done'` literal, including raw SQL at [app/api/reports/_shared.ts:211](../../../app/api/reports/_shared.ts#L211) and [app/api/sprints/[id]/route.ts:118](../../../app/api/sprints/[id]/route.ts#L118). Rows reading `completed` or `closed` count as unfinished. §13 of the worklog design calls this out; the career wave closed it for career only. |

## Rulings

Recorded because they are decisions, not discoveries, and an implementer should not re-litigate them.

1. **A recurring task draws occurrences, never a template.** The calendar shows one marker per
   `task_instances` row in its own status. No `tasks.dueDate` marker for a template, in any view mode.
   **Why:** the template's own `dueDate` is a creation-time artefact that no recurrence rule maintains, and
   the null case renders as *today*. **Cost if wrong:** a schedule whose due date was meaningful to the owner
   shows only its occurrences — recoverable by making the due date an instance, which is already true.
2. **Recurring templates are excluded from dashboard counts, and today's occurrences get their own strip.**
   **Why:** a template that cannot legally reach `done` is not backlog; and work you can do today must be
   visible where you start the day. **Cost if wrong:** `openTasks` drops by the number of templates, which is
   the intended reading, but a member who counted schedules as open work sees the number fall.
3. **Promote carries `cadence` + `is_template`, materialises the grid, and assigns to the promoter.**
   **Why:** otherwise a recurring plan cannot be completed, topped up, or counted by anyone. **Cost if wrong:**
   the promoter becomes the assignee by default and must reassign on the board; cheaper than an ownerless
   schedule nobody can act on.
4. **The completed-status sweep covers every surface, raw SQL included.**
   **Why:** half a vocabulary is worse than none, because the failing case looks like a quiet member.
   **Cost if wrong:** aggregate numbers move where rows read `completed`/`closed`; measured read-only before
   merge (§G5) so the delta is explained, not mysterious.
5. **Unassigned recurring tasks stay visible under `scope=all` and hidden under `scope=mine`.**
   **Why:** `scope=all` reads as "the workspace's schedule"; the 41 imported IT tasks are unassigned today and
   would otherwise vanish from the calendar until claimed.
6. **A calendar read may write a horizon, bounded.** The alternative — synthesising dates for display only —
   leaves a marker that cannot be clicked to completion. Bounds in §C3.
7. **Promote reads `plan_items.cadence` only, never `agent_plans.cadence`.** The plan's own cadence is
   non-null (`weekly` by default) and means "how often we review this plan"; inheriting it would turn every
   promoted one-off into a weekly schedule. **Why:** a silent vocabulary collision is exactly the class of bug
   this wave exists to remove. **Cost if wrong:** a plan author who meant "these items inherit the plan rhythm"
   must set cadence per item.

## Components

Three new files, each with one job; everything else is an edit to a reader.

| unit | responsibility | depends on |
| --- | --- | --- |
| `lib/tasks/statuses-sql.ts` | the completed-status list as a SQL fragment (`completedStatusSql`, `openStatusSql`) | `drizzle/schema`, `lib/tasks/statuses` |
| `lib/planner/promote-values.ts` | the pure mapping from a plan item + session to a task insert shape | `lib/cadence`, `drizzle/schema` (types only) |
| `lib/tasks/recurrence.ts` *(extended)* | `horizonOccurrencesForWindow(cadence, startDate, endDate)` — window length to occurrence count | `lib/cadence` |

Why `statuses-sql.ts` is a second module and not a second export of the first: `lib/tasks/statuses.ts` is
imported by client components ([app/dashboard/tasks/page.tsx:81](../../../app/dashboard/tasks/page.tsx#L81) and
[app/dashboard/kanban/page.tsx:86](../../../app/dashboard/kanban/page.tsx#L86)). A `sql` tagged template needs
the table object, and pulling `drizzle/schema` into a client bundle is how a page starts shipping the database.
It also keeps the module testable: `lib/db.js` shadows `lib/db.ts` under Vitest, so schema-importing modules are
already fragile ground for unit tests.

---

## A — Calendar scoping

**File:** `app/api/calendar/events/route.ts`

The recurrence branches join `tasks` already, so the predicate is one `and()` argument on each.

| `scope` | predicate on the recurrence branches |
| --- | --- |
| `mine` | `eq(tasks.assigneeId, session.id)` |
| `all` (default) | `or(inArray(tasks.assigneeId, visibleIds), isNull(tasks.assigneeId))` |

`visibleIds = await loadVisibleMemberIds(session.id)`
([lib/organizations.ts:54](../../../lib/organizations.ts#L54)) — the same helper the assignee picker and the
team directory use, so org membership decides visibility here exactly as it does everywhere else. It is read
once per request and reused by both branches.

`calendar_events` keeps its existing predicate (:165-179), including the attendees JSON containment. Nothing
in this section changes what a real meeting does; it closes the hole where the *derived* events ignored scope.

After §B lands there are still two derived branches — instances and one-off tasks — and **both** carry the
predicate above. Scoping is applied to whichever branches exist at the time, so a later branch added to this
route is covered by the scoping guard in Testing rather than by memory of this paragraph.

## B — View modes re-cut

**Files:** `app/api/calendar/events/route.ts`, `app/dashboard/calendar/page.tsx`

`recurringTasksList` (:222-236) and `recurringEvents` (:260-279) are deleted. The mode table becomes:

| `viewMode` | returns |
| --- | --- |
| `due` | `calendar_events` + one-off tasks (`eq(tasks.isTemplate, false)`) whose `dueDate` falls in the window |
| `cadence` | `calendar_events` + `task_instances` rows whose `instanceDate` falls in the window |
| `both` (the page's default, :267) | the union of the two above |
| `range` | `task_instances` in the window only, as today |

The `due`/`cadence` predicates are complements on `is_template`, so no task can appear twice in `both` — that
is the structural reason the double count cannot come back, rather than a dedupe step to forget later.

Event shape for an instance keeps what the page already reads: `eventType: "task_instance"`,
`instanceStatus`, `instanceId`, `taskId`, `isRecurring: true`, all-day. A one-off in `due` mode keeps
`eventType: "task"` and its `dueDate` — which is now honest, because only a task with a real due date and no
schedule reaches that branch.

**Page side:** `isRecurringInstance` (:755-756) stays as the colour/status rule. `deadlineRows` (:560-570)
gains `!isCompletedTaskStatus(t.status)` and skips recurring templates, so the sidebar list matches the grid
and the API. The four view-mode buttons (:863-865) need no change — the re-cut is entirely in what each mode
means.

## C — Horizon on the surface you look at

**Files:** `app/api/calendar/events/route.ts`, `lib/tasks/recurrence.ts`

`ensureInstanceHorizon(taskId, cadence, todayIso, occurrences = HORIZON_OCCURRENCES)`
([lib/data-access-task-instances.ts:81](../../../lib/data-access-task-instances.ts#L81)) already counts rows
held from `todayIso` forward and early-returns when coverage is met, so no new writer is needed — the calendar
supplies the occurrences the window requires.

### C1 — Pure part

```ts
// lib/tasks/recurrence.ts
export const MAX_HORIZON_OCCURRENCES = 90

export function horizonOccurrencesForWindow(
  cadence: Cadence,
  todayIso: string,
  endDateIso: string | null,
): number
```

`ceil(daysBetween(today, end) / CADENCE_DAYS[cadence]) + 1`, floored at 1, capped at
`MAX_HORIZON_OCCURRENCES`, and `HORIZON_OCCURRENCES` (7) when the window is missing or unparseable.
`CADENCE_DAYS` is [lib/cadence.ts:19](../../../lib/cadence.ts#L19) (daily 1, weekly 7, monthly 30, quarterly 92,
yearly 365; `one-off` is `null`, which is why the function takes a `Cadence` and returns
`HORIZON_OCCURRENCES` before touching the table).

### C2 — Call site

Runs only for the modes that read instances (`cadence`, `both`, `range`), and only after the visible-id set is
known. The candidate set is a query on `tasks` — not on `task_instances`, because a task whose grid ran out has
no row in the window to find it by:

```sql
select id, cadence from tasks
 where is_template = true and assignee_id in (visibleIds)   -- or = session.id under scope=mine
```

Each candidate is topped up with `ensureInstanceHorizon(taskId, cadence, todayIso,
horizonOccurrencesForWindow(cadence, todayIso, endDate))`, awaited serially. `todayIso` is
`localDay(new Date(), session.timezone)` — the member's day, never UTC, for consistency with the previous
wave.

Note the asymmetry, which is deliberate: an unassigned recurring task is *visible* under `scope=all` (ruling 5)
but never topped up, because a write into someone's schedule requires an owner — the same reason
`GET /api/task-instances` restricts the top-up to `assigneeId === session.id`
([app/api/task-instances/route.ts:40](../../../app/api/task-instances/route.ts#L40)). Such a task shows the rows
it already has until it is claimed.

### C3 — Bounds, because a read is inserting

- **90 rows per task** per request. A 42-day month grid needs 43 occurrences on a daily cadence; a 12-month
  view needs 366 and writes 90, then catches the rest on the next read.
- **25 tasks per request**, ordered by soonest missing occurrence. The surplus logs
  `[task_instances] horizon deferred: N tasks` and returns what it has — the same "capture failure never fails
  the user's read" rule the `task_events` writers use.

In steady state neither bound bites: post-F2 a daily grid holds 30 occurrences and every longer cadence holds
more (`INSTANCE_COUNTS`: daily 30, weekly 12, monthly 12, quarterly 8, yearly 4), so the coverage check
early-returns for any task already reaching the window end. The bounds exist for the first calendar open after
deploy, which is exactly when the catch-up write is wanted.

## D — Dashboard

**Files:** `lib/dashboard-data.ts`, `app/dashboard/page.tsx`

### D1 — Templates out of the counts

Every member-scoped task read in `getDashboardOverview`
([lib/dashboard-data.ts:228](../../../lib/dashboard-data.ts#L228)) gains `eq(tasks.isTemplate, false)`:

| read | line | what it feeds |
| --- | --- | --- |
| `statusCounts` | :293-296 | the status donut |
| team-wide status counts | :298-300 | the same chart, team scope |
| deadline list | :304-306 | `DeadlineTask` rows / overdue |
| workload open + priority | :310-313 | `WorkloadRow` |
| `openPoints` / `openTasks` / `doneTasks` | :321-323 | the KPI tiles |

Team-scope reads get the same predicate, otherwise one member's schedules inflate another's numbers.

### D2 — Occurrences into the strip

One added query, one added field on `DashboardOverview` (:181, alongside `myTasks` at :193):

```ts
dueToday: {
  instanceId: number
  taskId: number
  title: string
  instanceDate: string
  status: string
  priority: string
}[]                    // ≤ 8 rows, ordered by priority then title
dueTodayCount: number  // every open row dated today
missedCount: number    // every open row dated before today, for this member
```

Predicate: `taskInstances` joined to `tasks` on `assigneeId = session.id`, `instanceDate = localDay(now, tz)`,
status filtered by `isSettledInstanceStatus()`
([lib/tasks/instance-window.ts:29](../../../lib/tasks/instance-window.ts#L29)) — the same predicate F1's window
uses, which is what keeps the strip and the tasks page from ever disagreeing about "still open". The counts are
`count()` queries in the same round trip, not slices of the capped list.

### D3 — The strip itself

Inside `TodayStrip` ([app/dashboard/page.tsx:138](../../../app/dashboard/page.tsx#L138)): a row
`Due today · N`, each of up to 8 items with a checkbox that
`PATCH /api/task-instances/[id]` with `{ status: "done" }` and then `reloadQuiet()`. When `dueTodayCount > 8`,
a "see all" link to `/dashboard/tasks`. When `missedCount > 0`, the F1 wording verbatim — "Missed N days …
logged in the work log, not repeatable here" — so a missed day is never offered as a checkbox.

No quick-add, no checklist editor here; that is the tasks page's job and the strip's existing comment (:136-137)
says so deliberately.

### D4 — F4 parity on the dashboard's own status menu

`OverviewTask` gains `cadence`. `setTaskStatus` (:434) hides completed statuses when the row is recurring, using
`isCompletedTaskStatus` from `lib/tasks/statuses.ts` and a local `isRecurringTask` — the same two pieces the
tasks page already combines ([app/dashboard/tasks/page.tsx:195](../../../app/dashboard/tasks/page.tsx#L195)), and
deliberately not `lib/task-updates.ts`, which pulls in `drizzle/schema` and belongs on the server. The server's
409 stays as the backstop; the member should never see it.

## E — Promote

**Files:** `app/api/planner/[id]/promote/route.ts`, new `lib/planner/promote-values.ts`

```ts
export function promoteTaskValues(
  item: { title: string; description: string | null; estimatePoints: number | null
          startDate: string | null; dueDate: string | null; discipline: string | null
          cadence: string | null },
  session: { id: number },
): TaskInsertValues
```

Adds to what the route already writes (:74-85):

| field | value |
| --- | --- |
| `cadence` | `isCadence(item.cadence) ? item.cadence : "one-off"` — an invalid word degrades to one-off, never persists |
| `isTemplate` | `cadence !== "one-off"` — the same derivation as F6's rule and `app/api/tasks/route.ts:140` |
| `assigneeId` | `session.id` |

The grid is materialised **after** `db.transaction` (:55) resolves, looping the recurring created ids through
`ensureInstanceHorizon(taskId, cadence, localDay(new Date(), session.timezone))`. Outside the transaction on
purpose: a horizon write must never roll back or fail a promote, which is the standing rule for every capture
writer in this app.

No `task_events` birth rows: promoted tasks are inserted as `status: "todo"`, and
[lib/worklog/task-events.ts](../../../lib/worklog/task-events.ts) only writes a birth for a row that arrives
finished. That rule is unchanged and must not be loosened here.

**Do not fall back to the plan's own cadence.** `agent_plans.cadence`
([drizzle/schema.ts:429](../../../drizzle/schema.ts#L429)) is `notNull` with default `"weekly"` — it is the
plan's *review* rhythm, and every plan already has a value. Using it as the fallback for an item with no
cadence would silently promote every one-off task in every plan as a weekly recurring schedule with a real
grid. The fallback is `"one-off"`, and only `plan_items.cadence`
([drizzle/schema.ts:453](../../../drizzle/schema.ts#L453), nullable by design) is read.

`app/api/planner/[id]/items/[itemId]/route.ts` is **not** a fifth task-write door — it updates `plan_items`
(:102-106), never `tasks` — so `recurringStatusError` does not belong there. Its cadence handling still changes,
under F.

## F — One cadence vocabulary

**Files:** `lib/cadence.ts`, `lib/planner/extract.ts`, `plan-editor-client.tsx`, `items/[itemId]/route.ts`,
`scripts/import-it-technician-tasks.mjs`

```ts
// lib/cadence.ts
export const SCHEDULE_CADENCES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const
export type ScheduleCadence = (typeof SCHEDULE_CADENCES)[number]
export function cadenceOrNone(value: unknown): Cadence | null
```

`SCHEDULE_CADENCES` is `CADENCES` without `"one-off"` — a plan item schedules something or schedules nothing,
so the editor has never offered `one-off` and shouldn't start. Consumers:

- `lib/planner/extract.ts:26` → `z.enum(SCHEDULE_CADENCES)`, and `:75` → `enum: [...SCHEDULE_CADENCES]` so the
  Gemini schema cannot drift from the validator mid-request.
- `plan-editor-client.tsx:61` → import `SCHEDULE_CADENCES`, labels from `CADENCE_LABEL`.
- `items/[itemId]/route.ts:87-89` → `updates.cadence = cadenceOrNone(body.cadence)`, so `"fortnightly"` becomes
  `null` instead of a stored lie.

**Out of scope, with the reason.** The schema holds four columns named `cadence` and only two speak this
vocabulary: `tasks.cadence` ([drizzle/schema.ts:169](../../../drizzle/schema.ts#L169), default `one-off`) and
`plan_items.cadence` (:453, nullable — the suggestion §E honours). The other two are different schedules that
merely share a word: `agent_plans.cadence` (:429, `notNull` default `weekly` — how often the plan is reviewed)
and `task_report_templates.cadence`
([drizzle/schema.ts:956](../../../drizzle/schema.ts#L956), `notNull` default `monthly` — how often the report is
generated). `lib/packs/ops/types.ts` `frequency` is a playbook period, again unrelated. The guard in §H is
scoped to task-cadence sites so it cannot fire on any of these correct uses.

`scripts/import-it-technician-tasks.mjs` keeps its mirrored `INSTANCE_COUNTS` literal (a migration script must
not import app code) and gains the equality guard described in §H.

## G — Completed-status sweep

**New:** `lib/tasks/statuses-sql.ts`

```ts
export const completedStatusSql: SQL                // status IN ('done','completed','closed')
export const openStatusSql: SQL                     // the negation, one source for both
```

Built from `COMPLETED_TASK_STATUSES` so the array remains the only place the words live. The JS side keeps
using `isCompletedTaskStatus(value)` (case- and whitespace-tolerant, which raw SQL is not — noted as a known
asymmetry, accepted because the swept SQL sites read rows written by this app).

### G1 — Aggregate and gate sites (numbers change here)

| file | lines | current | after |
| --- | --- | --- | --- |
| `app/api/reports/_shared.ts` | 211, 218 | `t.status <> 'done'` | `openStatusSql` |
| `app/api/sprints/[id]/route.ts` | 88 | `t.status !== "done"` | `isCompletedTaskStatus` |
| `app/api/sprints/[id]/route.ts` | 118, 371 | `<> 'done'` | `completedStatusSql` / `openStatusSql` |
| `lib/dashboard-data.ts` | 312 | `neqDone(...)` | `openStatusSql` |
| `lib/dashboard-data.ts` | 321-323 | `<> 'done'`, `= 'done'` | both fragments |

### G2 — List and badge sites (only the visible set changes)

`app/dashboard/kanban/page.tsx` 169, 470, 498, 744, 1091 · `app/dashboard/tasks/page.tsx` 180, 184, 692-693,
722, 748 · `app/dashboard/backlog/page.tsx` 260, 352 · `app/dashboard/gamification/page.tsx` 177 ·
`app/dashboard/gamification/leaderboard/page.tsx` 70 · `app/dashboard/team-wellbeing/page.tsx` 185 ·
`app/dashboard/ai-scrum-master/page.tsx` 435, 500, 638 · `app/dashboard/analytics/page.tsx` 209 ·
`app/dashboard/email/page.tsx` 273 (already tolerates two words — becomes the shared call) ·
`app/dashboard/calendar/page.tsx` 564 · `app/dashboard/page.tsx` 768, 780, 831, 844 — all to
`isCompletedTaskStatus`.

### G3 — Deliberately not swept

`app/dashboard/ops/page.tsx:314` reads `entry.status` on `ops_log_entries`, a different table with its own
vocabulary. `lib/seed-data.ts:530, 544` are *writers* of the literal `"done"`, which is a legal value. Both
stay, with a comment naming why, so the guard's exclusion list is not a mystery.

### G4 — Where the recurring exclusion belongs

The sweep and D1 interact: a recurring template's `status` is now permanently unfinished, so any *counting*
surface must also exclude `is_template = true` or it counts forever-open schedules as unfinished work. The
swept aggregate sites in §G1 are checked against this rule one by one; §D1 handles the dashboard, and the
reports workload SQL at :211/:218 gains the same predicate. Sprint aggregates do **not** — a recurring task
inside a sprint is a deliberate choice by the owner, and excluding it silently would hide the mistake.

### G5 — Measure before merge

One read-only query, prod, before the sweep is merged. A `SELECT` needs no checkpoint approval under the standing
rule — that rule governs DDL and writes — but it is still announced, run against the production project
(`snowy-truth-57678083`) with the host masked in the report, and never paired with a write in the same script:

```sql
select status, count(*) from tasks group by status order by count(*) desc;
```

Reported with the deployment notes as "these numbers move, by this much, because rows read `closed`", so a
changed tile is explained rather than discovered.

## Testing

House rule: DB-free pure modules tested behaviourally; route wiring tested by source guards that never assert
on comment text.

| area | kind | case |
| --- | --- | --- |
| `horizonOccurrencesForWindow` | unit, pure | daily over a 42-day window → 43; yearly over 12 months → 2; no window → 7; 12-month daily view → 90 (capped); end before today → 1 |
| `promoteTaskValues` | unit, pure | cadence `daily` → `daily` + `isTemplate: true`; `null` → `one-off` + false; `"fortnightly"` → `one-off`; `assigneeId` = session id, for every case |
| `cadenceOrNone` | unit, pure | every `CADENCES` value round-trips; unknown string → `null`; `null`/`undefined`/number → `null` |
| `completedStatusSql` / `openStatusSql` | unit, pure | the fragments are built from `COMPLETED_TASK_STATUSES`, so a fourth word added to the list appears in the SQL — assert the rendered SQL text contains all three words |
| calendar scoping | guard | both recurrence branches carry an assignee predicate; neither is `sql\`true\`` while a session exists; `loadVisibleMemberIds` is called once |
| view modes | guard | the route has no `eq(tasks.isTemplate, true)` in an event branch; no `new Date().toISOString()` used as an event `startTime` |
| dashboard counts | guard | each of the five reads at §D1 matches `isTemplate`; `dueToday` uses `isSettledInstanceStatus` and `localDay` |
| dashboard status menu | guard | `setTaskStatus` is unreachable for a recurring row; `OverviewTask` carries `cadence` |
| promote | guard | `ensureInstanceHorizon` appears *after* `db.transaction` in source order, never inside its callback; no `captureTaskBirths` call in the route |
| vocabulary | guard | no `"weekly", "monthly"` sequence outside `lib/cadence.ts`; `INSTANCE_COUNTS` in the import script equals `lib/tasks/recurrence.ts` |
| status sweep | guard, per file | no swept file contains a `status … "done"` comparison (`codeOnly()`); each imports the shared helper or fragment |
| behaviour | unit | a task reading `closed` counts as finished in the sprint velocity and the report workload; a recurring template contributes 0 to `openTasks` and 1 to `dueToday` when its instance is dated today |

New guards live in `tests/unit/recurrence-cross-surface-guards.test.ts` alongside the previous wave's
`recurrence-gap-guards.test.ts`, so a future reader sees one file per wave rather than one growing file.

## Sequencing

Nine tasks, one commit each. A precedes B precedes C because they edit the same route in that order — scope
first, then the branch that gets deleted, then the branch that gets a writer.

1. **A** calendar scoping (+ guards)
2. **B** view-mode re-cut, template branch deleted (+ guards, page `deadlineRows`)
3. **C** `horizonOccurrencesForWindow` + bounded top-up on the calendar read
4. **F** cadence vocabulary collapse — placed before E because E consumes `isCadence` and `cadenceOrNone`, and
   doing it first keeps both edits off the same lines twice
5. **E** `promote-values.ts` + grid after transaction
6. **G** new `statuses-sql.ts` + §G1 aggregate sites, then §G2 list sites in one sweep per page group
7. **D** dashboard counts out, strip in, status menu guarded
8. **G5** the read-only prod measurement and its report
9. **H** docs, full gates, commit and push

D is last because it depends on both `isSettledInstanceStatus` (already shipped) and the swept status helper.

## Gates

`npx tsc --noEmit` clean · full `npx vitest run` green (baseline entering this wave: 171 files / 2827 tests) ·
`npm run lint` at the documented baseline (82 problems, 4 pre-existing errors in
`components/landing-chatbot.tsx:177,181,190` and `components/planner/gantt.tsx:43`) · FEATURES.md §50 · both
spec docs synced (§Calendar and §UI of the recurrence design; §11 and §13 of the worklog design) · one
Vercel production deployment verified after push.

## Risks

- **A read that writes (C).** Bounded by 90 occurrences per task and 25 tasks per request, and self-limiting in
  steady state. The escape hatch if it misbehaves in production is to pass `occurrences = HORIZON_OCCURRENCES`
  instead of the window-derived number, which reverts the calendar to "keeps 7 ahead" without touching the
  route's read shape.
- **Aggregate numbers move (G) and a KPI tile falls (D1).** Both are the intended reading and both are measured
  before merge (§G5). The owner tests the UI visually, so each is called out in the deployment notes with the
  exact tile.
- **Neon latency on the calendar.** Up to 25 sequential top-ups inside one request can be slow on a cold
  compute. Mitigated by the coverage early-return, which means the common path issues one `count()` per task
  and no inserts.
- **`is_template` depends on every write path staying honest.** Three writers set it today
  (`app/api/tasks/route.ts:140`, `lib/task-updates.ts:150`, and now `promoteTaskValues`). The §F guard on the
  derivation is the only thing stopping a fourth writer from setting one field without the other; it belongs on
  the list of guards that must not be relaxed.
