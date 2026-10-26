# Design: daily work log, period reports to supervisors, Gemini planning agent, dual-mode assistant

Date: 2026-10-26
Status: owner-approved direction, revised twice on owner clarifications (the report is the deliverable; tracking
must be easy at the level of actions and deliverables done on a specific day). This document is the contract for
implementation.

Owner decisions embedded: public bot = Gemini but capped; extraction = draft plan then promote; roles = task
discipline plus a viewer filter; exports = exceljs + jsPDF with no new server runtime; reports go to supervisors,
admins and managers at daily/weekly/monthly/**yearly** cadence; **day-level tracking of actions and deliverables
is the foundation everything else rolls up from.**

## 1. Problem

A member needs to answer, on a Friday or at year end, "what did I do, on which day, what did it produce, where
does each thing stand, what is blocked, what is next" — and hand that to a supervisor as a document they will
read. Today they cannot, because the system does not record work at that granularity.

The gap is concrete. `tasks` has `created_at` and `updated_at` but no status history, so a task marked done
today is indistinguishable from one marked done last Tuesday. `/api/activity` is a derived union of notification
rows and those two timestamps, and the only trace of a status transition is a human-readable notification body
written by `app/api/tasks/[id]/route.ts:114-123`. `/dashboard/reports` schedules and aggregates dataset counts
(`app/api/reports/_shared.ts:10`) to recipients — a manager's chart, not a worker's account. There is no
deliverable concept at all: nothing in the schema represents "the thing I produced".

And there is no working AI: `app/api/ai/generate/route.ts:83-115` returns canned strings keyed on whether the
message contains "sprint" or "task", `lib/ai-models.ts` advertises five providers with no client behind any of
them and fetches two endpoints that do not exist (`lib/ai-models.ts:117`, `lib/ai-models.ts:147`), and the
landing assistant is a keyword matcher over a hard-coded FAQ (`components/landing-chatbot.tsx:21`).

What is being built, in the order that serves the report:

1. **Daily work log** — actions, time, blockers and deliverables recorded against a specific day, captured with
   as little typing as possible, including automatically from task transitions.
2. **Period reports** — day/week/month/year rollups of that log, submitted to named recipients, tracked through
   acknowledgement, exported as PDF/Excel/CSV.
3. **A planning agent** — a PDF or pasted job description becomes a forward plan of tasks, so the "what's next"
   half of the next report is already written and its items carry the right discipline.
4. **A planner workspace** — Gantt, grid/list/board, filters, date range, search, bulk edits.
5. **An assistant** — members ask about their own work; visitors ask about the website.

## 2. Goals and non-goals

Goals

- **Day-level truth.** Every action, deliverable and status change is attributable to a date, an actor and,
  where relevant, a task. Not inferred from `updated_at`.
- **Low-friction capture.** Recording a day should cost seconds: completing a task already produces an event
  without the user doing anything; a quick-add row takes one line; time is optional.
- **No invented numbers.** Every metric in a report is computed from rows the author can drill into. The model
  writes prose about those numbers; it never supplies one.
- A report can be produced for any period in under a minute, reviewed, then locked on submission.
- Recipients get a real notification with a real link, and the author can see who received it, who read it, and
  whether they acknowledged or returned it.
- Yearly is first-class: a month-by-month series, not a 365-row dump.
- Role-aware by data: developer, technician, designer and auditor each get a template whose sections and metrics
  match how their work is judged, and one person may hold several.
- Everything reporting-related works with **no AI key at all**. AI is an accelerant, never a dependency.
- Extraction proposes; a human commits. Nothing enters `tasks` without one explicit click.

Non-goals

- Autonomous agent loops, web browsing, or tool-calling beyond the fixed read set in §7.
- Per-role forks of every dashboard page; one person with two jobs must not pick an identity.
- A Gantt inside `/dashboard/tasks`; the planner is its own surface with its own lifecycle rules.
- Replacing `/dashboard/chat` (real DMs) or the existing `/dashboard/reports` dataset schedules, which stay.
- Payroll/timesheet approval, expense claims, multi-level sign-off chains, DOCX ingestion, org-wide assistant
  memory. Each is a separate proposal once the log and reports exist.

## 3. Architecture at a glance

```
   capture                     store                        rollup                  deliver
  ─────────                   ──────                       ──────                  ───────
  task routes  ──auto──►  task_events ─┐
  /dashboard/worklog ─►  work_log_entries ├─► lib/reports/period.ts   work_reports ─► recipients
  plan promote     ──►  deliverables   ─┘   lib/reports/aggregate.ts      │           (notifyMany)
                                                 lib/reports/templates.ts │
                                                          ▼              ▼
                                                    report sections ─► PDF / XLSX / CSV
                                                                     (lib/export/*)

  planner:  PDF/text ─► lib/ai/gemini.ts ─► agent_plans + plan_items ─(promote)─► tasks (+3 columns)
  chat:     /api/assistant/site ──┐
            /api/assistant/workspace ├─► the same lib/ai/gemini.ts, the only caller of Google
            report prose drafting  ──┘
```

Five rules hold it together:

1. `lib/ai/gemini.ts` is the only module that knows Google's URL, key or payload shape.
2. Grounding is a property of the response *type*, not of a prompt instruction (§7, §8).
3. `task_events` and `work_log_entries` are the system of record for "what happened on day X". Reports and
   assistant answers read from them; nothing derives a day's work from `updated_at` again.
4. The key is server-only, never `NEXT_PUBLIC_`, and a guard test asserts that.
5. Draft artefacts live in their own tables; `tasks` is written only by the promote transaction.

## 4. Daily work log — `/dashboard/worklog`, `/api/worklog/*`

The atom. One row = one thing that happened on one date.

`lib/worklog/capture.ts` writes automatically wherever the app already mutates state, so the log exists even for
a member who never opens the page:

- `task_events` — every status change from `/api/tasks/[id]`, bulk, kanban drag and reorder, and the planner
  promote. One insert alongside the existing notification write.
- `plan_items` / `tasks` creation via promote, stamped with the acting user and date.

`work_log_entries` is where the member adds intent the database cannot know: what they actually did, how long it
took, what they were waiting on. Linking to a task is optional, so "fixed the site's water pump" is recordable
even when no task existed. Kind is one of `action | time | blocker | note | review`, and `deliverable` kind links
into the `deliverables` table rather than duplicating it.

**Deliverables are first-class** because that is what a supervisor asks for. A deliverable row is a named output
with a type (document, code, design, inspection, audit finding, training, report), a link or attachment, a
status lifecycle (`draft → in_review → approved | delivered`), the date it was produced, and the task or plan
item it belongs to. Evidence — the file, the link, the sign-off — lives here, not in a note.

Capture surface, in order of cheapness:

1. **Auto**: task transitions and promotes, no user action.
2. **Quick add**: one-line input at the top of the day view — text, optional `#minutes`, optional task search,
   optional discipline; Enter writes the row.
3. **Day view**: the day's rows grouped by task, a running total, and "add deliverable" on any row.
4. **Week grid**: Mon–Sun columns with per-day totals (rows = tasks or days), edited inline — this is the shape
   most people actually keep a log in.

Views and controls, reusing the grammar `/dashboard/tasks` already speaks (`view` state at
`app/dashboard/tasks/page.tsx:192`, 400ms debounced search at `app/dashboard/tasks/page.tsx:316`): Day · Week ·
List · Board (by kind) · Calendar heat map (dots per day, click to open that day). Filters: date range with
presets (today / this week / last 7 days / this month / custom), task, discipline, kind, has-deliverable,
deliverable status, assignee-neutral "mine only" default, and free-text search over title+body. Every control
mirrors into URL query params so a view is shareable and survives reload. Bulk: convert entry → deliverable,
attach to a task, re-date a misdated entry (with the correction recorded, not silently), group into a report
draft, export selection.

`/dashboard` gains a "Today" strip from the same reads — the log earns its keep by being visible before someone
has to go look for it.

Timezone matters: `worked_on` is stored as a `date` in the member's own timezone (`users.timezone`, default
`Africa/Nairobi`), resolved through `lib/reports/period.ts` so a 23:40 entry is on the day the member thinks it
is, not the day the server thinks it is.

## 5. Admin/team visibility

Super-admins and `admin`-role accounts see a team day view — who logged what on a given date, gaps, and
submitted reports — scoped by the same `isSuperAdmin` policy already in `lib/roles.ts:33`. A member's log is
private to them and their report recipients; it is not a surveillance feed by default, and that boundary is
enforced in the query, not the UI. The team view is one grouped query over the same tables, and it exists in
phase 4 alongside the inbox rather than as its own subsystem.

## 6. Period work reports — `/dashboard/reports-work`, `/api/reports/work/*`

The deliverable. A report is one member's account of one period, built from §4.

**Period.** `lib/reports/period.ts` resolves `periodType` plus an anchor date into an exact `[start, end)` in the
member's timezone: `daily` = that calendar day; `weekly` = ISO Mon–Sun; `monthly` = calendar month; `yearly` =
Jan 1–Dec 31; plus a custom range. ISO week, month and year boundaries, DST and leap edges are unit-tested —
"my week" being off by one day is the fastest way to lose a supervisor's trust. The same module serves
`lib/cadence.ts` recurrence (see §8).

**Auto-population.** `lib/reports/aggregate.ts` reads only rows the author can see and computes: entries and
minutes per day across the period (for a daily report, the day itself; yearly gets 12 buckets, not 365 rows);
completed work with the transition date from `task_events`; in progress; blocked with recorded reasons;
deliverables produced and their status; overdue carried forward; per-discipline, per-task and per-sprint
rollups. Every section carries the id list that made its number, so a supervisor's "where does 14 come from?"
opens 14 rows.

**Sections** (`content jsonb`, author-editable, ordered by template):

1. Header — author, disciplines, job title, period, team, recipients, submitted date, revision number.
2. Summary — KPI strip plus the author's own read of the period.
3. Actions completed — by day, with dates, not just a count.
4. Deliverables — name, type, status, produced-on date, link.
5. In progress — where each item stands and what it waits on.
6. Blocked / at risk — reason, owner, and what the report asks of the recipient.
7. Overdue carried forward — with the reason, not just the date.
8. Next period — from `plan_items` due after `period.end`, the same rows the Gantt draws.
9. Metrics — by discipline, status, priority; yearly adds the monthly series and totals.
10. Notes and asks — capacity, tooling, decisions needed.

**Templates per discipline** (`lib/reports/templates.ts`) — the section list and leading metrics differ, so a
technician's report does not open with story points: developer (items by sprint, points, review states, rework);
technician (jobs by status, response and resolution times, SLA misses, site log); designer (deliverables, review
rounds, assets produced, open feedback); auditor (checks executed vs planned, coverage, findings by severity,
evidence links, outstanding management response); coordinator/general (default). `WORK_DISCIPLINES` (§9) is the
only vocabulary; the template defaults from the author's discipline and is switchable per report, because the
same person may file an audit report and a development report in one month.

**Lifecycle.** `draft → submitted → acknowledged | returned`. Submission is explicit and locks the report; a
correction is a new `revision_of` version, so a supervisor can never be reading one copy while the author edits
another. `returned` carries the recipient's note and pushes the author back to draft. Both actions notify the
other side through the existing `createNotification`/`notifyMany` path — a report is a notification *type* with
a link, not a new pipeline.

**Recipients.** Chosen from `/api/team/members`, validated exactly as `/api/reports/route.ts:70-77` already
validates ids, with a saved default reporting line in settings so "who gets my weekly" is not re-picked every
Friday. Super-admins and `admin` accounts see every submitted report.

**Inbox.** `/dashboard/reports-work/inbox`: newest submissions, unread count, ack and return with a note, and a
per-report recipient state list — which is what makes "did my manager read it" answerable rather than vibes.

**Optional AI prose.** Two buttons, neither required: "Draft summary from my data" (writes sections 2 and 6,
`responseSchema`-constrained, refuses when the metrics are empty) and "Polish this section" (rewrites the
author's own text). Machine-drafted blocks stay visibly marked until the author accepts them, because a
supervisor must be able to tell which words a person chose.

**Cadence.** `lib/cadence.ts` lifts `CADENCES`, `isCadence` and `computeNextRun` out of
`app/api/reports/_shared.ts:47` and `:88` and extends them with `one-off` and `yearly`, so report periods, plan
recurrence and the existing schedule `next_run_at` all agree on one definition. "Draft my weekly on Monday" is a
schedule over the same aggregation, and the existing `/dashboard/reports` page keeps working on it.

## 7. Assistants

### Workspace assistant — `/api/assistant/workspace` (authenticated)

`lib/assistant/context.ts` assembles a context pack from an **allow-list** of reads, each scoped by the session
user id (`getSession()` from `lib/auth-actions`): tasks, `task_events` and `work_log_entries`, deliverables,
sprints, kanban, goals, retros and actions, notifications, report schedules and runs, work reports authored or
received, team, wellbeing, and — only when the request carries a `planId` belonging to that user — that plan's
items. The allow-list is a literal array a reviewer can count; no raw-SQL escape hatch.

Grounding is typed, not requested:

```ts
{ answer: string; references: { kind: string; label: string; count: number }[]; dataAsOf: string }
```

`references` is part of `responseSchema` and the panel renders it as "Sources: 6 log entries, 2 deliverables ·
updated 14:02". An empty pack short-circuits **before** the call and says so — a model with nothing to read will
produce a plausible sentence, and plausible is what we are not shipping.

Persistence: `assistant_threads` (scope `workspace`) + `assistant_messages`, so a conversation survives reload
and cost is attributable. Surfaces: a Popover panel in the top bar next to the bell, `/dashboard/assistant` for
the full transcript, and "ask about this period" pre-scoped from a report draft or a worklog day.
`/dashboard/ai-scrum-master` keeps its workspace and moves its five hard-coded recommendations
(`app/api/dashboard/ai-recommendation/route.ts:29-35`) onto the real provider.

### Public site assistant — `/api/assistant/site` (anonymous, capped)

Tier 1 unchanged: the scripted keyword hit stays, so most visitors cost nothing. Tier 2 on a miss calls Gemini
with a per-pathname pack from `lib/assistant/site-knowledge.ts`, built from `content/*.ts` — the current page's
`searchIndex` entries plus pricing, FAQ, product and legal facts. No web access, so it cannot invent a claim.
Gemini down or capped → the scripted answer, so the widget never breaks.

Caps, each independently sufficient: per-IP `rateLimited("assistant:"+ip, { windowMs: 3_600_000, max: 8 })`;
per-IP daily 24; global daily from `AI_PUBLIC_DAILY_CAP` (default 200) counted in `ai_usage_daily`; input ≤900
characters, one question per request, no attachments; signed-in visitors are pointed at the workspace assistant.
`lib/rate-limit.ts` is in-memory per serverless instance — its own comment says so — so on Vercel those buckets
are approximate and `ai_usage_daily` is the authoritative ceiling the owner reads. 429 copy gives the reset time
and a way forward. One paragraph in `content/legal.ts` (the `translation-by-google` entry is the precedent)
states machine answers about pricing and terms are non-authoritative.

## 8. Planner — `/dashboard/planner`, `/api/planner/*`

Inputs in one drop zone: PDF ≤15MB as an inline part (larger files go to the Neon bucket plus the Files API in a
later phase), pasted text, or `.txt`/`.md` read client-side into the text path. Source text is stored so a plan
is re-runnable without re-paying the model.

`POST /api/planner/extract` calls `geminiJson` with the plan schema:

```ts
{
  title, summary, horizon: { start, end },
  items: [{ title, description, acceptanceCriteria[], discipline,
            estimatePoints, startDate, dueDate, dependsOnItemIndex[],
            milestone, cadence, deliverable: { name, type } | null }]
}
```

Extraction proposes deliverables too, because a job description usually names them ("produce the audit
programme", "hand over the as-built drawings") and those become `deliverables` rows on promote.
`dependsOnItemIndex` is index-based while the batch has no ids and resolves to real ids at promote.

Cadence lines plus the horizon materialise dated rows arithmetically — "generate my month" costs zero tokens and
repeats next month, which is the only way a daily/weekly/monthly feature is honest about being daily.

Draft → promote: extraction writes `agent_plans` + `plan_items` (`status='draft'`); every row is editable in
place (title, description, discipline, dates, estimate, dependencies, cadence, milestone, deliverable), rows can
be added and deleted; "Create N tasks" is one transaction that inserts into `tasks`, stamps
`tasks.source_plan_id`, resolves dependencies onto the new ids, creates the deliverable rows, writes a
`task_events` birth row for each new task and flips the plan to `promoted`. Discard deletes the plan and its
items. A bad extraction costs a minute of editing, never a data cleanup.

Views: Gantt · Grid · List · Board, with filters on discipline, status, cadence, milestone-only, date range
presets, assignee and debounced search, all mirrored to URL query params; bulk select sets discipline/assignee,
shifts dates ±n days, promotes or exports the selection. Same grammar as §4 so the two pages feel like one
product.

Gantt (`components/planner/gantt.tsx`) is hand-built SVG/CSS grid: lanes grouped by discipline or assignee,
day/week/month zoom, today marker, dependency arrows, drag-to-move committing on drop (and writing a
`task_events` row), hover card, visible keyboard focus, `prefers-reduced-motion` honoured, horizontal scroll
below `md`, fed from `plan_items` (draft) or `tasks` (promoted) through one selector. Not recharts — a Gantt is
a layout problem, not a chart-library problem — and being SVG is what lets PDF export rasterise it directly.

## 9. Provider layer — `lib/ai/gemini.ts`

Plain `fetch` against `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with
`x-goog-api-key`. No `@google/genai`: the surface needed is one POST, the app ships no AI SDK today, and bare
`fetch` stubs cleanly in tests.

```ts
export interface GeminiRequest {
  system?: string
  contents: ContentPart[]            // text parts; inline PDF parts for the planner
  responseSchema?: JsonSchema         // when set: responseMimeType "application/json"
  maxOutputTokens?: number
  temperature?: number
}
export function geminiText(req: GeminiRequest): Promise<{ text: string; usage: TokenUsage }>
export function geminiJson<T>(req: GeminiRequest, parse: (raw: unknown) => T): Promise<{ data: T; usage: TokenUsage }>
```

- `GOOGLE_GEMINI_API_KEY` (required), `GEMINI_MODEL` (optional). Unset `GEMINI_MODEL` → one `GET /v1beta/models`
  per cold start, first text-capable generation model cached. Google renames models; a constant is an outage.
- `GeminiError.kind`: `auth | quota | blocked | timeout | transport | badjson`. Each maps to a stated UI state;
  no stack and no raw Google body reaches the client.
- `AbortController` timeouts: 20s chat, 120s extraction, 45s report prose.
- Structured output uses `responseSchema`, and the payload is zod-parsed anyway: schema-constrained models still
  emit invalid JSON on truncation. `badjson` is one corrective retry, then honest failure.
- Deleted with this phase: the mock branches in `/api/ai/generate`, all of `lib/ai-models.ts`, and the IBM
  Granite claims in `PLACEHOLDERS.md`/`FEATURES.md`. Replaced by a real provider, not apologised for.

## 10. Exports

`lib/export/`, generated client-side from data already on screen — no server runtime to install, and it works on
a bad connection because the fetch already happened.

- **PDF** with `jspdf` + `jspdf-autotable`, three layouts: `report` (cover block with author, period, team,
  recipients, submission status and revision; KPI strip; sections as tables and prose; the Gantt image when a
  forward plan is present; page numbers and a footer naming the generating system and the data cutoff),
  `log` (day-by-day table of entries and deliverables for an arbitrary range — the thing a supervisor forwards
  onward) and `plan` (title, horizon, lane-grouped table).
- **XLSX** with `exceljs`: `Report`, `Entries`, `Deliverables`, `By discipline`, `By status`, and a `Monthly
  series` sheet for a yearly period. Real date/number formats, frozen header row, autofilter.
- **CSV/JSON** stay server-side where they already live: `DATASETS` (`app/api/reports/_shared.ts:10`) gains
  `worklog`, `deliverables`, `plans` and `work_reports`, so `/api/reports/export?dataset=worklog&format=csv`
  behaves like the tasks and team exports today.
- Filenames keep the existing convention: `jiravision-<scope>-<stamp>.{pdf,xlsx,csv}`.
- An export always reflects the current filter/selection, or the exact submitted report. What is seen is what is
  filed, which is the whole point of an artefact a supervisor keeps.

## 11. Data model

New drizzle tables (`drizzle/schema.ts`, snake_case columns matching the live DB):

```
work_log_entries       id, user_id ->users.id, worked_on date, task_id ->tasks.id null,
                       plan_item_id ->plan_items.id null, kind(action|time|blocker|note|review|deliverable),
                       title, body, discipline, minutes int null, deliverable_id null,
                       links jsonb, source(auto|manual), created_at, updated_at, redated_at
task_events            id, task_id ->tasks.id (cascade), actor_id ->users.id,
                       from_status, to_status, at timestamptz, source(route|bulk|kanban|promote|drag)
deliverables           id, name, type(document|code|design|inspection|finding|training|report|other),
                       task_id null, plan_item_id null, owner_id ->users.id, discipline,
                       status(draft|in_review|approved|delivered), produced_on date,
                       link text, object_key, evidence text, created_at, updated_at
work_reports           id, user_id, period_type(daily|weekly|monthly|yearly|custom), period_start, period_end,
                       title, template, status(draft|submitted|acknowledged|returned),
                       content jsonb, metrics jsonb, revision_of ->work_reports.id null,
                       submitted_at, acknowledged_at, returned_note, created_at, updated_at
work_report_recipients report_id (cascade), user_id, notified_at, read_at, ack_at, note,
                       primary key (report_id, user_id)
agent_plans            id, title, summary, source_kind(pdf|text), source_name, source_text, object_key,
                       model, horizon_start, horizon_end, cadence, status(draft|promoted|discarded),
                       created_by, created_at, updated_at, promoted_at
plan_items             id, plan_id (cascade), title, description, discipline, estimate_points,
                       start_date, due_date, status, depends_on jsonb, milestone bool, cadence, order,
                       deliverable jsonb null, source_task_id
assistant_threads      id, user_id, scope(site|workspace), title, created_at, updated_at
assistant_messages     id, thread_id (cascade), role, content, references jsonb, tokens, created_at
ai_usage_daily         date, scope(site|workspace|planner|report), calls, input_tokens, output_tokens,
                       primary key (date, scope)
```

Additive nullable `tasks` columns: `start_date date`, `discipline varchar(40)`, `source_plan_id integer`. The
Gantt needs a start and `tasks` has only a due date; `source_plan_id` keeps promote auditable in both
directions. No existing route selects these columns, so no current behaviour changes. `report_schedules` and
`report_runs` stay raw-SQL as they are today (`scripts/create-reports-tables.mjs`, noted at
`app/api/reports/_shared.ts:3`); they are joined to drizzle only if a phase needs typed access, not for tidiness.

`lib/roles.ts` gains the vocabulary, keeping that module cookie- and DB-free so it stays unit-testable
(`lib/roles.ts:1-3`):

```ts
export const WORK_DISCIPLINES = ["developer","technician","designer","auditor","coordinator"] as const
export type WorkDiscipline = (typeof WORK_DISCIPLINES)[number]
// + label, icon, colour-token and report-template maps
```

Viewer preferences go through `/api/settings` so they inherit its `jsonb_set` merge under
`preferences.settings` (`app/api/settings/route.ts:54-65`) and cannot clobber other namespaces:
`workDisciplines: WorkDiscipline[]` (**default: all**, so a member who never opened settings sees their whole
log and their whole report), `defaultReportRecipients: number[]`, `reportCadence: Cadence`.

Migration: `drizzle-kit` push plus a guarded script, run from the repo root reading `/^DATABASE_URL/m` (the
`.env.local` line-1 stale-comment trap), against a checked snapshot, additive only, reversible by dropping the
new tables. `lib/db.js` is a required CJS shim that shadows `lib/db.ts` under Vitest, so no unit test may import
a DB-facing module. Backfill: existing tasks get no fake history — `task_events` starts accruing from deploy,
and a report for a period with no events says "not recorded" rather than inventing a date. Silent backfill from
`updated_at` is explicitly refused; it would produce numbers that look like evidence.

## 12. Error handling, security, privacy

| Case | Behaviour |
| --- | --- |
| `GOOGLE_GEMINI_API_KEY` unset | AI controls render disabled and name the variable. **Log, reports and exports work fully.** No canned answer, no 500. |
| `auth` (bad/rotated key) | Same disabled state plus one line to the owner; Google's body never reaches the client. |
| `quota` / `blocked` | "Google's limit reached for this hour" + scripted fallback on the public bot; the manual report path is unaffected. |
| `timeout` / `transport` | One retry with a shorter prompt, then a stated failure. Extraction and prose drafting keep their input, so retry is not re-work. |
| `badjson` | One corrective retry, then failure. A malformed plan or half-written report is never inserted. |
| Empty context pack | Short-circuit before the call; say there is no data. |
| Period with no activity | A real zero with a visible "nothing recorded for this week", not an empty grid — a submitted zero is information. |
| Misdated log entry | Re-date writes `redated_at` and keeps the correction visible; history is not silently rewritten. |
| Anonymous over cap | 429 with the reset time and a sign-in path. |

Security: server-only key; session required on every workspace, worklog and report route (`getSession()` /
`getCurrentUser()`, as the rest of `/api` does); all reads scoped by session user id, never by an id in the body;
zod-parsed payloads; recipients validated against real member ids; **a log entry, deliverable or report is
readable only by its author, that report's listed recipients, and admin/superadmin** — enforced in the query,
not the UI; uploads to the private Neon bucket under `planner/{userId}/{uuid}.pdf` served through the existing
presigned-redirect route (`app/api/storage/[...key]/route.ts`), whose avatars-only key check is widened to that
prefix deliberately and with a test.

Privacy: the paste path stores no file; deleting a plan removes its object and source text together; a member's
log is not visible to teammates, only to their report recipients and to admins, and that is stated in the policy
rather than implied; the disclosure says plainly that a document is sent to Google for processing.

## 13. Testing

Repo grammar: pure-logic tests under `tests/unit/`, one guard file per subsystem, `npm run typecheck` at 0
errors, `npm run lint` at 0 errors (70-warning baseline), `npm test` green before every commit and push.

- `lib/reports/period.test.ts` — ISO week/month/year boundaries, custom ranges, `Africa/Nairobi` plus a DST
  zone, year-end and leap edges, the yearly 12-bucket series.
- `lib/worklog/capture.test.ts` — every task mutation path writes exactly one `task_events` row (including
  bulk, kanban reorder and promote); `worked_on` resolves in the user's timezone; no backfill fabrication.
- `lib/reports/aggregate.test.ts` — status bucketing, per-day entry counts, deliverables by status, overdue
  carried forward, **the no-metric-without-rows invariant** (every section's number matches its drill-down id
  list), and a period with no activity yielding zeros not nulls.
- `lib/reports/templates.test.ts` — every discipline resolves to a section list, and every section's metric key
  exists in the aggregate output.
- `lib/cadence.test.ts` — migrated `computeNextRun` keeps its daily/weekly/monthly cases passing and adds
  `one-off` and `yearly`.
- `lib/planner/materialise.test.ts` — cadence to dated rows, dependency index→id resolution, horizon clipping, a
  daily line in a one-week horizon producing 7 rows not 31, deliverable rows created on promote.
- `lib/assistant/context.test.ts`, `lib/assistant/site-knowledge.test.ts` — allow-list completeness, every read
  scoped by user id, empty-pack short-circuit, token budget, no member-identifying data in the public pack,
  pricing facts identical to `content/pricing-page.ts`.
- `lib/ai/gemini.test.ts` — stubbed `global.fetch`: payload shape, `responseSchema` wiring, model-discovery
  fallback, each `GeminiError.kind`, abort on timeout, `badjson` retry-then-fail. No live calls in CI.
- `lib/export/*` — the three PDF layouts, section ordering, yearly sheet selection, CSV quoting parity with the
  existing `toCsv`.
- `tests/unit/worklog-reports.test.ts` (guard, in the style of `tests/unit/dashboard-chrome.test.ts`) — the key
  variable never appears with a `NEXT_PUBLIC_` prefix; `/api/ai/generate`'s canned branches are gone; no AI
  surface renders a hard-coded "analysis" string; extraction writes `tasks` only through the promote route;
  `WORK_DISCIPLINES` is the only discipline vocabulary; no report/log route can return a row to someone who is
  neither author nor listed recipient nor admin; nothing computes a day's work from `tasks.updated_at`.
- Manual visual QA stays the owner's (their standing rule); the dev server is not restarted without asking.

## 14. Phases

Each phase is a reviewable, green, committed, pushed unit. Pushing auto-deploys to production.

1. **Schema and capture** — the ten new tables, three `tasks` columns, `lib/cadence.ts` extraction with
   `one-off`/`yearly`, `WORK_DISCIPLINES` + template map, `task_events` writes wired into every existing task
   mutation path, migration + rollback note. No UI yet; the log starts filling on deploy.
2. **Worklog UI** — `/dashboard/worklog`: day view, quick add, week grid, deliverables CRUD, calendar heat,
   filters, search, URL params, bulk, the `/dashboard` "Today" strip.
3. **Reports** — period math, aggregation, per-discipline templates, `/api/reports/work/*`, the
   `/dashboard/reports-work` builder with its ten sections, save/draft, no AI required.
4. **Submission, inbox, admin view** — recipients and default reporting line, submit/lock/revise, ack and
   return with notes, notification type with a link, `/dashboard/reports-work/inbox`, visibility enforcement,
   the admin team day view.
5. **Exports** — PDF (report / log / plan), XLSX, the four new `DATASETS` entries in the CSV route,
   selection-aware, yearly sheets.
6. **Provider** — `lib/ai/gemini.ts`, `.env.example` entries with where-to-get docs, model discovery,
   `GeminiError`, delete the mock and `lib/ai-models.ts`, disabled states, tests on a stubbed `fetch`.
7. **Planner** — upload/paste → extract → editable draft → promote transaction; plans list and detail.
8. **Gantt and views** — lanes, zoom, dependencies, drag with event capture, grid/list/board, filters, bulk.
9. **Workspace assistant** — context pack, typed grounding, threads, top-bar panel, `/dashboard/assistant`,
   "ask about this period", AI Scrum Master onto the real provider, optional grounded report drafting.
10. **Public assistant** — site-knowledge packs, tier-1/tier-2 routing, the five caps, `ai_usage_daily`
    counting, legal disclosure.
11. **Docs and guards** — `FEATURES.md`, `DESIGN_SYSTEM.md` (worklog and planner components, discipline tokens,
    report layouts), `PLACEHOLDERS.md` (the Granite item closes here), README AI section, guard test files.

Phases 1–5 are the reporting product and need no API key at all — that is the part the owner asked for first,
and it is deliberately sequenced so it can be shipped and used before any AI dependency exists. 6–10 add the
intelligence around it. Phase 8 is independent of 2–5 and can move earlier if the Gantt is wanted sooner.

## 15. Risks

- **A report that misrepresents the work.** The hard rule in §2 holds: every number traces to rows the author
  can drill into, and machine prose is marked until accepted. If a metric cannot be computed it is absent, never
  estimated.
- **Logging becomes a chore and people stop doing it.** Mitigated structurally, not by nagging: transitions are
  captured automatically (§4), quick-add is one line, time is optional, and a report is still valid with zero
  manual entries. If the automatic half covers 60% of a normal week, the habit survives.
- **No history before deploy.** Existing tasks have no `task_events`; reports for those periods say "not
  recorded". Restoring the past from `updated_at` is refused (§11) because it manufactures evidence.
- **Cost surprise on the public bot.** Five caps plus `ai_usage_daily`; the owner sets `AI_PUBLIC_DAILY_CAP` to
  a number they mean after reading the first week of counts.
- **Scan-only PDFs.** A photographed job description with no text layer yields confident nonsense; phase 7
  surfaces a token-count and empty-extraction warning and points at the paste box.
- **`tasks` migration on live Neon.** Additive and nullable only, from a checked snapshot, verified through
  `information_schema` before and after.
- **Model renaming.** Handled by `GEMINI_MODEL` plus discovery, not a constant.
- **In-memory rate limits in serverless.** Stated plainly in §7; the DB counter is the ceiling.
- **Manager adoption of a new format.** Mitigated by a PDF that reads like the documents supervisors already
  file, and by leaving the existing `/dashboard/reports` schedules exactly where they are.

## 16. Decisions already taken

- Day-level actions and deliverables are the system of record; reports roll up from them.
- Task status history is captured going forward, never backfilled from `updated_at`.
- Deliverables are their own entity with a lifecycle, because that is what a supervisor asks to see.
- The report is the deliverable; the log, plan, Gantt and assistant all exist to fill it in.
- `yearly` joins the cadence vocabulary and drives a monthly series, not a longer row dump.
- Reports need no AI key; Gemini drafting is optional and visibly marked.
- Submitting locks a report; corrections are a new revision, so a recipient always reads a stable artefact.
- Recipients are explicitly chosen members with a saved default reporting line; admins see all; a member's log
  is not a teammate-visible feed.
- The public bot does reach Gemini, capped — owner's choice over authenticated-only.
- Extraction lands in draft plans; promote is the only path into `tasks`.
- Roles are a per-item discipline plus a per-viewer filter; no per-role workspace fork.
- Exports are client-side `exceljs` + `jspdf`; CSV/JSON stay on the existing server route.
- The assistant reads the signed-in user's own data, and everything for an admin/superadmin.
- The scripted landing FAQ survives as tier 1.
