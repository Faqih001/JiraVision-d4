# Design: daily work log, period reports to supervisors, Gemini planning agent, dual-mode assistant, career ladder

Date: 2026-10-26
Status: owner-approved direction, revised on owner clarifications (the report is the deliverable; tracking must be
easy at the level of actions and deliverables done on a specific day; the ladder and its growth advice are in scope).
This document is the contract for implementation.

Owner decisions embedded: public bot = Gemini but capped; extraction = draft plan then promote; roles = task
discipline plus a viewer filter; exports = exceljs + jsPDF with no new server runtime; reports go to supervisors,
admins and managers at daily/weekly/monthly/**yearly** cadence; **day-level tracking of actions and deliverables
is the foundation everything else rolls up from**; career ladder = **published bands with no individual pay
stored**, hybrid proof (auto signals plus an admin-signed checklist), the employee requests and an admin approves,
and all four AI growth outputs including live web search; **role packs, custody registers, SOPs with precautions and
recommendations, and a tailoring onboarding — all of them fillable by hand or by the agent, hand entry always
working**; and the ladder, registers and playbooks must **support every role across companies, configured as data**.

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
6. **A career ladder** — the same log read sideways: how close is this person to the next rung, what is missing,
   what does that rung pay, and what should they take next to close the gap.
7. **Role packs, registers and playbooks** — the handover shape of a real job: what you are the keeper of, whether
   those documents are still current, the procedure with its precautions, and an onboarding that tailors the
   dashboard to the role — authored as data so a role nobody has thought of yet needs no code.

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
- A member can see, for their own discipline, exactly what the next rung requires, how much of it their logged work
  already proves, and who signed off the rest — with no salary figure stored about them anywhere.

Non-goals

- Autonomous agent loops, or model-chosen tool calling beyond the fixed read set in §7. **One exception, stated
  plainly:** the career learning path and benchmark actions (§11) enable Google's `google_search` grounding, because
  a course or a market rate that is six months stale is worse than none. It is still one prompt in, one structured
  answer out, and every returned URL is checked against the grounding metadata before it renders.
- Per-role forks of every dashboard page; one person with two jobs must not pick an identity.
- A Gantt inside `/dashboard/tasks`; the planner is its own surface with its own lifecycle rules.
- Replacing `/dashboard/chat` (real DMs) or the existing `/dashboard/reports` dataset schedules, which stay.
- Payroll, salary records, timesheet approval, expense claims, multi-level sign-off chains, DOCX ingestion, org-wide
  assistant memory. §11 publishes **bands per rung**, which is the same information a job posting gives, and stores
  nothing about what any individual is paid. Each remaining item is a separate proposal once the log exists.

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

  career:   task_events + work_log_entries + deliverables + work_reports ─(read-only)─►
            lib/career/readiness.ts ─► percent + gaps ─► /dashboard/career, /admin/career
            growth AI (phase 14) writes snapshots to growth_reviews, never back into the log
```

Five rules hold it together:

1. `lib/ai/gemini.ts` is the only module that knows Google's URL, key or payload shape.
2. Grounding is a property of the response *type*, not of a prompt instruction (§7, §8).
3. `task_events` and `work_log_entries` are the system of record for "what happened on day X". Reports and
   assistant answers read from them; nothing derives a day's work from `updated_at` again.
4. The key is server-only, never `NEXT_PUBLIC_`, and a guard test asserts that.
5. Draft artefacts live in their own tables; `tasks` is written only by the promote transaction.
6. The career ladder only **reads** the log. It writes no task, no entry and no report, and its readiness number is
   recomputed from rows on every request — there is no stored "percent ready" column to go stale.
7. **Every capture surface has two doors into one table.** Work-log rows, deliverables, register items, playbooks,
   report sections and career actions are each writable by a manual form *and* by the agent path, through the same
   validator, with `source(manual|gemini|…)` recording which. The manual form is the primary path and works with no
   API key; the agent only ever pre-fills it. Nothing in this design is AI-only, and nothing an agent wrote is
   committed without a human having seen it.

## 4. Daily work log — `/dashboard/worklog`, `/api/worklog/*`

The atom. One row = one thing that happened on one date.

`lib/worklog/capture.ts` writes automatically wherever the app already mutates state, so the log exists even for
a member who never opens the page:

- `task_events` — every status change on the `tasks` table, from the routes that actually write it:
  `/api/tasks/[id]` PUT, `/api/tasks/bulk` update, `/api/dashboard/tasks` PUT, and the test-mode twins
  `/api/test/tasks/[id]` PUT and `/api/test/tasks/bulk` update. One insert per write, placed **before** the existing
  notification branches so an event exists even when nobody is notified.
  Creation is recorded by `tasks.created_at`, and deletion is not an event because `task_events.task_id` cascades —
  a row about a deleted task is deleted with it.
  **Scope correction (verified 2026-10-26):** the drag-and-reorder routes
  `/api/dashboard/kanban/update-status` and `/api/dashboard/kanban/reorder` mutate the separate `kanban_tasks`
  table, not `tasks`, so a board card drag does **not** produce a `task_events` row. This section previously claimed
  it did. Two boards in this app are not one system of record; making the kanban board write through `tasks` is a
  deliberate later decision, not something capture can paper over.
- `plan_items` / `tasks` creation via promote, stamped with the acting user and date.

`work_log_entries` is where the member adds intent the database cannot know: what they actually did, how long it
took, what they were waiting on. Linking to a task is optional, so "fixed the site's water pump" is recordable
even when no task existed. Kind is one of `action | time | blocker | note | review`, and `deliverable` kind links
into the `deliverables` table rather than duplicating it.

**Deliverables are first-class** because that is what a supervisor asks for. A deliverable row is a named output
with a type (`document | code | design | inspection | audit_finding | training | report | other` — the eighth value
exists because a real log produces things the seven were never going to name), a link or attachment, a status
lifecycle, the date it was produced, and the task or plan item it belongs to. Evidence — the file, the link, the
sign-off — lives here, not in a note.
**Lifecycle as shipped (verified 2026-10-26, `lib/worklog/entries.ts:95`):** `draft → in_review → approved |
delivered`, plus `draft → delivered` for something that ships without review and one step back
(`in_review → draft`) for rework. `delivered` is terminal — re-opening accepted evidence is a new deliverable, not
an edit of history. The same table is read by the server (`pickDeliverableUpdates` refuses an illegal jump) and by
the State select (it offers only the allowed next states plus the row's own), so a control cannot offer a move that
the API would reject.

Capture surface, in order of cheapness:

1. **Auto**: task transitions and promotes, no user action.
2. **Quick add**: one-line input at the top of the day view. Two tokens only (`lib/worklog/quick-add.ts`):
   `#45` is minutes and one of `#action #time #blocker #note #review` is the kind; anything else beginning with `#`
   is somebody's sentence and stays in the title. `#deliverable` is refused with a pointer to "Convert to
   deliverable", because a tag cannot create the row the button then needs. The task and the discipline are chosen
   in the row dialog, not the strip — a parse that guessed a task from a title would attach work to the wrong thing.
3. **Day view**: the day's rows grouped by task, a running total, and "add deliverable" on any row.
4. **Week grid**: Mon–Sun columns with per-day totals (rows = tasks or days). Editing opens the row dialog rather
   than turning a grid cell into an input: the same validation, the same whitelist, one place — **correction
   (2026-10-26)**: "edited inline" as originally written would have meant a second editor with its own rules.

Views and controls, reusing the grammar `/dashboard/tasks` already speaks (`view` state at
`app/dashboard/tasks/page.tsx:192`, 400ms debounced search at `app/dashboard/tasks/page.tsx:316`): Day · Week ·
List · Board (by kind) · Calendar heat map (dots per day, click to open that day). Filters: date range with
presets (today / yesterday / this week / last 7 days / this month / custom), task, discipline, kind,
has-deliverable, deliverable status, and free-text search over title+body. "Mine only" is not a control — every
read is scoped by `user_id` in SQL, so there is nothing else to see (see §12.7: a discipline switch is a display
filter, never a permission). Every control mirrors into URL query params so a view is shareable and survives
reload.

Bulk, **as shipped (2026-10-26)**: the bar offers exactly the five actions `POST /api/worklog/entries/bulk`
accepts — `delete`, `set-task`, `re-date` (with the correction stamped in `redated_at`, not silently), `set-kind`
(only the kinds a row can become without inventing content, `BULK_SETTABLE_KINDS`), and `convert-deliverable`.
Export is CSV, produced client-side from the current selection
(`entriesToCsv(selectedEntries)` → a `jiravision-worklog-<from>-<to>.csv` download). The control lives on the bulk
bar, so an export is always a deliberate act over rows the member ticked — there is no "export the range" query the
page runs behind the view, and no select-all-in-range either; **recorded honestly (2026-10-26)**: this is the one
place the page exports less than it shows, and a whole-range file is phase 5's job (PDF/XLSX are phase 5 too).
**Correction (2026-10-26, phase 3):** there is no "group into a report draft" action and none is coming. A report
is a *period*, not a selection: §6 aggregates every row the author can see between the two dates, so a ticked
draft would create a second, contradicting definition of what a week contained. The bulk bar offers the five
actions `POST /api/worklog/entries/bulk` accepts and nothing else.

`/dashboard` gains a "Today" strip from the same reads — the log earns its keep by being visible before someone
has to go look for it.

Timezone matters: `worked_on` is stored as a `date` in the member's own timezone (`users.timezone`, column default
`Africa/Nairobi`), resolved through **`lib/worklog/local-day.ts`** (`localDay`, `dayBoundsUtc`, `rangeBoundsUtc`,
`weekStartIso`) — **correction (2026-10-26)**: this section named `lib/reports/period.ts`, which was never created;
the day math shipped in phase 2 as its own module so the log does not depend on the report period code it predates.
A null or unparseable `users.timezone` falls back to `UTC` (`FALLBACK_ZONE`), not to the column default, because a
session row can carry `null` where a new user row would not. So a 23:40 entry is on the day the member thinks it
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

1. Header — the title, the period, the template, which figure source the card is showing and the draft number.
   Author, disciplines, job title, team, recipients, submitted date and revision number are phase 4's; phase 3
   renders none of them.
2. Summary — the author's own read of the period. The KPI strip lives in section 9 rather than here, so one card
   owns the numbers and the strip cannot disagree with the charts beside it.
3. Actions completed — by day, with dates, not just a count.
4. Deliverables — name, type, status, produced-on date, link.
5. In progress — where each item stands and what it waits on.
6. Blocked / at risk — the blocker row and the reason recorded on it; what the report asks of the recipient is
   the author's own commentary inside the card, and the recipient arrives with phase 4.
7. Overdue carried forward — with the reason, not just the date.
8. Next period — from `plan_items` due after `period.end`, the same rows the Gantt draws.
9. Metrics — the template's leading KPI tiles plus its charts, the source label, and under every chart the row
   ids that make its bars. A template picks from time-by-discipline, the kind mix, tasks-by-status,
   tasks-by-priority and the period series; yearly's series is twelve month buckets, so "the monthly series and
   totals" is drawn by the templates that lead with time, not by a special case.
10. Notes and asks — capacity, tooling, decisions needed.

**Templates per discipline** (`lib/reports/templates.ts`) — the section list and leading metrics differ, so a
technician's report does not open with story points: developer (items by sprint, points, review states, rework);
technician (jobs by status, response and resolution times, SLA misses, site log); designer (deliverables, review
rounds, assets produced, open feedback); auditor (checks executed vs planned, coverage, findings by severity,
evidence links, outstanding management response); coordinator/general (default). `WORK_DISCIPLINES` (§9) is the
only vocabulary; the template defaults from the author's discipline and is switchable per report, because the
same person may file an audit report and a development report in one month.

**Lifecycle** *(phase 4)*. `draft → submitted → acknowledged | returned`. Submission is explicit and locks the report; a
correction is a new `revision_of` version, so a supervisor can never be reading one copy while the author edits
another. `returned` carries the recipient's note and pushes the author back to draft. Both actions notify the
other side through the existing `createNotification`/`notifyMany` path — a report is a notification *type* with
a link, not a new pipeline.

**Recipients** *(phase 4 — phase 3 never writes
`work_report_recipients`)*. Chosen from `/api/team/members`, validated exactly as `/api/reports/route.ts:70-77` already
validates ids, with a saved default reporting line in settings so "who gets my weekly" is not re-picked every
Friday. Super-admins and `admin` accounts see every submitted report.

**Inbox** *(phase 4)*. `/dashboard/reports-work/inbox`: newest submissions, unread count, ack and return with a note, and a
per-report recipient state list — which is what makes "did my manager read it" answerable rather than vibes.

**Optional AI prose** *(phase 9)*. Two buttons, neither required: "Draft summary from my data" (writes sections 2 and 6,
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

## 11. Career ladder — `/dashboard/career`, `/admin/career`, `/api/career/*`

The log is evidence of work; this turns it into an answer to "what do I do next to get to the next level, and what
does that level pay". Owner decisions: **published bands only, no pay records anywhere**; **hybrid proof** —
auto-computed signals plus an admin-signed competency checklist; **the employee raises the request and an admin
approves it**; **all four AI outputs** (learning path with live web search, market/salary benchmark for the next
rung, a periodic growth review written from the member's own data, and task suggestions that close the gap).

**Ladder shape.** Four rungs per discipline — `1 Junior · 2 Intermediate · 3 Senior · 4 Lead` — so 5 disciplines ×
4 levels = 20 seeded rows. A member holds one placement per discipline (`developer` L3 and `auditor` L2 at the same
time is normal and needs no identity choice, per §2). Promotion moves **one rung at a time**; day one is bootstrapped
by an admin placing existing staff at their real level without a request, so nobody starts at zero.

**Signals — computed, never typed.** Nine metrics, all derived from the tables in §13, each with a per-level target
in `career_levels.signals`:

| key | source rows |
| --- | --- |
| `days_logged_90` | distinct `work_log_entries.worked_on`, rolling 90 days |
| `actions_logged_90` | `work_log_entries` rows, rolling 90 days |
| `reviews_logged_90` | `work_log_entries.kind in (review, deliverable)` |
| `tasks_completed_90` | `task_events.to_status = 'done'` on tasks assigned to the member |
| `points_completed_90` | `tasks.story_points` of those tasks |
| `deliverables_delivered` | `deliverables.status = 'delivered'` in window |
| `reports_submitted` | `work_reports.status in (submitted, acknowledged)` in window |
| `disciplines_touched` | distinct `tasks.discipline` over the window |
| `plan_items_promoted` | `tasks.source_plan_id` set by this member |

`lib/career/readiness.ts` is a **pure, DB-free module** (same discipline as `lib/roles.ts`, whose header at
`lib/roles.ts:1-3` states why): it takes `{ signals, checklist, signoffs, currentLevel, nextLevel }` and returns
`{ percent, capped: bool, gaps: [{ kind: "signal" | "checklist", key, label, actual, target, hint }] }`. Rules:
`percent = 0.7 × signal coverage + 0.3 × checklist coverage`, clamped so a member who has not signed off the
previous rung's mandatory items caps at 59% (`capped: true`, reason stated); a signal with no rows reads `0`, never
missing; the number is always computed server-side and never accepted from the client.

**Checklist integrity.** `career_levels.checklist` holds `{ key, label, hint }[]` authored in
`lib/career/ladder-seed.ts` so the wording is reviewable in git and editable later at `/admin/career`. **Only
admin/superadmin may tick** (`career_signoffs.ticked_by` is required and enforced in the route, not the button) —
a member cannot certify themselves, which is what makes the admin decision in the request flow meaningful rather
than decorative.

**Bands are published config, not personal data.** `career_levels.band_min/band_max/band_currency` describe the rung.
Seeded values are **null** and the UI says "band not published" until the owner enters real numbers — inventing a
range from the web would be exactly the fabricated claim this project already refuses three times over
(`app/api/ethical-metrics/route.ts:247`, `app/dashboard/ethical-metrics/page.tsx:1500`). The AI benchmark action
*suggests* a range with sources and an as-of date; it never writes `career_levels`. An admin applies it deliberately.

**Request flow.** `draft → submitted → approved | returned`. Submitting freezes an `evidence` jsonb snapshot
(the readiness output plus the counted row ids), so the reviewer reads a stable artefact and the member can see
exactly what was counted. Approving upserts `career_placement` and stamps `effective_date`; returning requires a
note. Both outcomes notify through `createNotification` with a link, same transport as reports (§6).

**Integration with what already exists.** `seniorityTierOf(jobTitle, role)` at
`app/api/ethical-metrics/route.ts:316-321` currently *guesses* a band from job-title text and drives the
load-equity metric. Once a real placement exists it becomes the first choice — `L1→tier 1, L2→tier 2, L3/L4→tier 3`
— with the heuristic as fallback, and the page's honesty notes at
`app/dashboard/ethical-metrics/page.tsx:1130` and `:1500` are updated to say which source was used. This is why the
ladder is not a decorative page: it improves a metric that already ships. Two vocabularies must not be confused —
`gamification.level` (`drizzle/schema.ts:164`) is XP and stays "XP level" in the UI; the ladder says "Career level".

**Four surfaces.**
- `/dashboard/career` — placement card, next-rung readiness meter with per-signal bars and a drill-down to the rows
  counted, checklist with who ticked it and when, band (or "not published"), request button with its status, a
  history timeline from approved requests, and the Growth AI panel (four actions, disabled with the key named).
- `/dashboard/career/[discipline]` — the same meter for a second discipline.
- `/admin/career` — ladder editor (levels, bands, signal targets, checklist), placements, and the review queue with
  the frozen evidence side by side.
- `/api/career/{levels,me,signoffs,requests,placements,growth}` — session-scoped reads; writes gated by role.

**Visibility.** The member and admin only. Report recipients do **not** get ladder access by virtue of receiving a
report — the report says what you did, the ladder says what you are paid to become.

## 12. Role packs, registers, playbooks and onboarding

**Why this exists.** A technician's actual job is not a list of tasks. It is custody: of infrastructure, of the
accounts and consoles that run it, of the equipment, and of the things currently wrong. The owner's own handover
document is exactly that shape — Infrastructure (servers, network documentation, IP addressing, firewall/router,
Wi-Fi, printers, cloud services) · Accounts and systems (IT admin accounts, backup administration, endpoint-security
console, helpdesk/ticketing, software licensing portals, vendor portals, remote-support system) · Equipment (computer,
server, printer and network inventories, spares, equipment awaiting repair, awaiting disposal) · Outstanding work
(open tickets, pending repairs, failed backups, scheduled maintenance, pending purchases, vendor issues, software
renewals, hardware replacements) — plus a method: **Identify → Reproduce → Diagnose → Fix → Test → Document**. The
same shape recurs in every role this app must serve (a nurse holds a drug cabinet and a protocol set, an auditor
holds a workpaper index and a sampling method, a field engineer holds plant, spares and a lock-off procedure), so
what gets built is the **shape**, configurable as data; the IT technician pack is the first filled instance.

**1. Role pack** — `role_packs`: `pack_key`, `title`, `disciplines` (a subset of `WORK_DISCIPLINES` — discipline is
*how work is judged* (§6, §11); a pack is *what you are the keeper of*; the two axes stay separate), `register_kinds
jsonb`, `sections jsonb` (which dashboard sections, in which order), `report_template`, `ladder_discipline`,
`onboarding jsonb` (the questions it asks), `method jsonb` (the phase list its playbooks default to), `is_active`.
Two seeded in `lib/packs/seed.ts`: `it-technician` (the four groups above, verbatim) and `general` (a minimal
fallback so nobody is broken by an unmapped role). Admins author new packs at `/admin/packs` with **no code change** —
that is the whole mechanism by which "all other types of roles across companies" is true rather than aspirational, and
§15 makes it a test.

**2. Registers** — `register_items`: `pack_key`, `kind`, `title`, `fields jsonb` (kind-specific: address, serial,
model, console URL, ticket id, renewal date), `status`, `owner_id ->users.id null`, `custody(member|team|org)`,
`last_verified_at date null`, `verify_interval_days int null`, `parent_id` self-ref (a printer under a server room),
`source(manual|gemini|promote)`, timestamps. CRUD UI at `/dashboard/registers` with the same filter grammar as §4
(list/grid/board by status, date filters, search, URL params, bulk verify/re-assign/export) and the disposal and
awaiting-repair lifecycles requiring a reason. `custody=org|team` rows are readable by every authenticated member
and writable by their owner plus admin; `member` rows follow the §14 privacy circle.

**3. Currency, not a filing cabinet.** `verify_interval_days` + `last_verified_at` make staleness a **computed**
state (`lib/registers/staleness.ts`, pure: `now − last_verified_at > interval ⇒ stale`, `null verified ⇒ unknown`,
never "fresh"): stale rows surface on the day strip, enter the report as "documents not current", and — through the
§8 cadence machinery already built in phase 1 — become dated recurring work items so "check the IP addressing doc"
appears where work appears rather than in a queue nobody opens. Verifying writes a `work_log_entries(kind=review)`
row and bumps the date, so the act is logged by doing it.

**4. Secrets never enter the register.** These rows describe *systems that hold credentials*, and the app is not a
vault. `fields` keys matching `/(pass(word|wd)?|secret|token|otp|mfa|private_?key|api_?key|credential)/i` are
**rejected at the API boundary** with a message that names the field and points at "record where it is kept, not
what it is"; the form's placeholder for an account row is *"kept in: password-manager entry / vault path / safe,
and who can authorise it"*. The owner's handover PDF almost certainly contains live credentials, so: it is not
pasted into chat, and when it is ingested (phase 18) the extraction prompt refuses credential values and the
validator refuses them again on the way in. A second guard asserts the placeholder and the reject list are present.

**5. Playbooks (SOPs) with precautions and recommendations** — `playbooks`: `pack_key`, `discipline`, `title`,
`summary`, `scope(register_item kind|null)`, `method jsonb` (the phase list, defaulting to the six-step method and to
the pack's own for non-technical roles), `steps jsonb` — each `{ order, phase, action, checks[], expected,
precautions[], warnings[], ppe[], tools_parts[], time_estimate, stop_condition, escalation, evidence_to_record }` —
plus `precautions[]`/`recommendations[]` at the playbook level, `tags`, `status(draft|published|archived)`,
`version`, `author_id`, `source(manual|gemini)`, `last_verified_at`, `verify_interval_days`. **Manual authoring is
the primary path** — a structured step form, add/reorder/clone, publish. Gemini fills a draft from a title, a
register row, and pasted vendor text (§9 provider, §8 draft-then-commit rule) and the draft keeps `source='gemini'`
and `ai_marked` until a human edits and publishes it; a model-authored precaution is advice, so it renders marked as
such and never silently as a company rule. Executing a playbook (`/dashboard/playbooks/[id]/run`) walks the phases
and writes one `work_log_entries` row per phase with `playbook_id` + `playbook_version`, so "I followed SOP-12 v3 and
documented it" is provable and the report can show method adherence. Search is the existing dashboard command
palette; print reuses the phase-5 `lib/export/pdf.ts` with a fourth layout — one page per phase, step rows with a
signature box, so the printed sheet works as a physical handover or a job sign-off.

**6. Recommendations surface** — `lib/recommend/next.ts`, **rule-based first, so it works with no key**: derived from
real rows — stale registers (§3), a failed backup or open ticket with no log entry today, an overdue renewal, a
deliverable stuck `in_review` past n days, a career gap whose target metric a currently-open task could close (§11),
a report not yet drafted for a period that just ended. Each recommendation is `{ id, kind, why, action, href,
confidence }` and **names the rows it came from**; the AI variant (§16, phase 18) adds grounded suggestions with the
same shape and the same "never invents a number" rule. Every one is a proposal with a button that opens the manual
form pre-filled — accepting is a human write.

**7. Onboarding** — `/onboarding`, the owner's eight steps taken adaptively rather than as a gauntlet:

| Step | Collects | Where it lands |
|---|---|---|
| 1. Welcome | nothing; names how long setup takes and offers *Finish later* | `onboarding.status = "in_progress"` |
| 2. Profile | name, display name, avatar, job title, phone, country, timezone (detected, editable), language | the existing `app/api/user/profile` PATCH (`users.job_title`, `department`, `location`, `language`, `timezone`, `avatar`) |
| 3. Workspace | personal · name a team · accept an invitation | §13's `workspace_invitations` row (phase 17); team fields through `/api/team/settings` |
| 4. Industry | one primary, optional secondaries, or "Not sure yet" | `preferences.settings.onboarding.data.industry` |
| 5. Role and disciplines | searchable job title with free text, optional department, multi-select work disciplines | `users.job_title`/`department` plus `preferences.workDisciplines` from the canonical `WORK_DISCIPLINES` (`lib/roles.ts:110`, grouped by `DISCIPLINE_CATEGORIES` at `:54`) |
| 6. Project management | preferred view, default grouping, notification types, work style | only keys the app already reads: `preferences.settings.sprintView`, the `notify*` flags |
| 7. First project | create · import a scope document · a clearly-labelled sample · skip | existing project APIs plus phase 7's extraction |
| 8. Review and finish | a summary with a per-step *Edit* link | `status = "completed"`, written only after every save returned ok |

Seven rules the wizard is built on, each because the alternative has hurt someone:

- **State lives in `preferences.settings.onboarding`** through the existing `jsonb_set` merge
  (`app/api/settings/route.ts:57-68`): `{ status, step, completedAt, version, data }`, where `status` is
  `"not_started"`, `"in_progress"` or `"completed"` and only `status` is read by routing. No new `users` columns, so
  **no migration and no schema change**; a step persists when it
  validates, which is what makes a refresh, a closed tab and a logout-then-signin all lossless. Retrying a step
  cannot duplicate an organization or a project because the write is keyed by the step's own draft id.
- **Existing members are grandfathered**: anyone whose account predates the feature, or who already has a task or
  log row, is treated as completed on first read and is never routed through the wizard. Nothing on the path clears
  a saved preference, and the fallback for an unanswered question is always the §13 default-all value.
- **No redirect loop**: the gate reads the server session plus `status`, never a client flag, and a completed
  member can still open `/onboarding` deliberately. The only automatic change is signup's
  `router.push("/dashboard")` (`app/(auth)/signup/page.tsx:42`) becoming a push to `/onboarding`; the dashboard
  shows a resumable banner for the incomplete, not a wall.
- **Adaptive, not long**: a personal workspace is not asked for an organization, a department or a job title; every
  step but Welcome and Review has *Skip*, and skipping is a valid answer that leaves the default in place.
- **One vocabulary**: step 5 renders the Phase-2 `DisciplinePicker` (`app/dashboard/worklog/sections.tsx:201`) over
  `WORK_DISCIPLINES`, grouped by `DISCIPLINE_CATEGORIES`, and validates each
  submitted id with `isWorkDiscipline` (`lib/roles.ts:316`), so the wizard cannot mint a competing set of names.
  Defaults to all disciplines, and a selection is a display filter, never a permission.
- **Industry suggests and never restricts**: it re-orders packs, templates and disciplines; it cannot hide a
  register kind or a project type.
- **Secrets stay out**: `onboardingData` refuses a password, token or credential value the way §12's register rule
  does (`lib/registers/fields.ts`, §12 item 4), and step 7's upload reuses the existing file size and type limits.

Step 3 is the one genuinely new mechanism, and the spec states it plainly rather than assuming it: today there is a
single team row (`drizzle/schema.ts:340-352`) and `/api/team/members` POST adds a member by an email an admin
already knows (`app/api/team/members/route.ts:203-281`) — there is no invitation token, so "join by typing your
organization's name" is refused as unsound. Phase 17 adds `workspace_invitations` (random token stored hashed, the
inviter's id, the role it grants, an expiry, a single-use accepted-at) and the join branch resolves only from that
token, server-side. Until it exists the join branch offers *request access*, which notifies the admins through
`createNotification` and changes no membership. Re-editable at `/dashboard/settings`, and it never pre-fills an
invented fact — no member's dashboard claims they own a server they did not say they own.

## 13. Data model

New drizzle tables (`drizzle/schema.ts`, snake_case columns matching the live DB):

```
work_log_entries       id, user_id ->users.id, worked_on date, task_id ->tasks.id null,
                       plan_item_id ->plan_items.id null, kind(action|time|blocker|note|review|deliverable),
                       title, body, discipline, minutes int null, deliverable_id null,
                       links jsonb, source(auto|manual|gemini), playbook_id int null (no foreign key until
                       phase 16 creates `playbooks`),
                       playbook_version int null, created_at, updated_at, redated_at
task_events            id, task_id ->tasks.id (cascade), actor_id ->users.id,
                       from_status, to_status, at timestamptz, source(route|bulk|promote|agent)
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
                       start_date, due_date, status, depends_on jsonb, milestone bool, cadence, sort_order,
                       deliverable jsonb null, source_task_id
                       (renamed: `order` is a SQL reserved word, so every query would need it quoted)
assistant_threads      id, user_id, scope(site|workspace), title, created_at, updated_at
assistant_messages     id, thread_id (cascade), role, content, references jsonb, tokens, created_at
ai_usage_daily         date, scope(site|workspace|planner|report|career), calls, input_tokens, output_tokens,
                       primary key (date, scope)
career_levels          id, discipline, level smallint, title, summary, expectations text,
                       band_min int null, band_max int null, band_currency char(3) null,
                       signals jsonb, checklist jsonb, is_active bool, created_at, updated_at,
                       unique (discipline, level)
career_placement       user_id, discipline, level, placed_by ->users.id, placed_at, note,
                       primary key (user_id, discipline)
career_signoffs        id, user_id, level_id ->career_levels.id, item_key, status(ticked|declined),
                       ticked_by ->users.id not null, ticked_at, note,
                       unique (user_id, level_id, item_key)
career_requests        id, user_id, discipline, from_level, to_level, status(draft|submitted|approved|returned),
                       evidence jsonb, note, requested_at, reviewed_by null, reviewed_at, return_note,
                       effective_date date, created_at, updated_at
growth_reviews         id, user_id, kind(readiness|learning|benchmark|review|task_suggestions),
                       period_start date null, period_end date null, payload jsonb, narrative text,
                       source_refs jsonb, as_of timestamptz, model, ai_marked bool not null default true,
                       created_at
role_packs             id, pack_key unique, title, disciplines jsonb, register_kinds jsonb, sections jsonb,
                       report_template, ladder_discipline, onboarding jsonb, method jsonb,
                       is_active bool, created_at, updated_at
register_items         id, pack_key, kind, title, fields jsonb, status, owner_id ->users.id null,
                       custody(member|team|org), parent_id ->register_items.id null,
                       last_verified_at date null, verify_interval_days int null,
                       reason text null, source(manual|gemini|promote), created_at, updated_at
playbooks              id, pack_key, discipline, title, summary, scope_kind null, method jsonb, steps jsonb,
                       precautions jsonb, recommendations jsonb, tags jsonb, status(draft|published|archived),
                       version int, author_id ->users.id, source(manual|gemini), ai_marked bool,
                       last_verified_at date null, verify_interval_days int null, created_at, updated_at
workspace_invitations  id, token_hash text not null unique, email varchar(255) not null, role varchar(32) not null,
                       invited_by ->users.id, created_at, expires_at timestamptz not null,
                       accepted_at timestamptz null, accepted_by ->users.id null
```

Nineteen new tables: ten for the log, reports, planner and assistant; five for §11; four for §12. `career_placement` is current state; history is
read from approved `career_requests`, so there is no parallel ledger to keep in sync. `growth_reviews` is append-only
by design — a dated snapshot the member can reread, not a mutable field.

`work_reports` is written from phase 3 and `work_report_recipients` is not touched by it at all: phase 3 sets
`period_type`, `period_start`, `period_end`, `template`, `title`, `content` and `metrics` and pins `status` to
`draft`, while `revision_of`, `submitted_at`, `acknowledged_at` and `returned_note` stay null until phase 4 and sit
on the write whitelist's forbidden list (`lib/reports/report-fields.ts`) so no request can set them. No migration
was needed for either table — both have existed in production since phase 1.

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
export const CAREER_RUNGS = [
  { level: 1, name: "Junior" }, { level: 2, name: "Intermediate" },
  { level: 3, name: "Senior" }, { level: 4, name: "Lead" },
] as const
```

`WORK_DISCIPLINES` is the whole app's only work-type vocabulary, and phase 2 of the UI widens it from the five
ids above to seventy-five standard disciplines in ten category groups — `DISCIPLINE_CATEGORIES` in `lib/roles.ts`
(delivery · technology · information · finance · operations · engineering · market · people · science · services,
labelled "Management & project delivery", "Software, IT & digital", "Analysis, research & information", "Finance,
audit & commercial", "Operations & supply chain", "Engineering & built works", "Sales, marketing & customer",
"People, administration & governance", "Health, science & specialist services", "Creative, service & industry
work"). The widening is **additive, with no migration**: the five ids already stored in `tasks.discipline`,
`work_log_entries.discipline` and `deliverables.discipline` stay valid because they are kept verbatim (verified
2026-10-26: `developer`, `technician`, `designer`, `auditor`, `coordinator` are all still in `WORK_DISCIPLINES`),
every id is ≤ 40 characters — the longest is 22 — so all four `varchar(40)` columns are untouched, and the existing
`isWorkDiscipline` guard (`lib/roles.ts:316`; it was at `:97` before phase 2 grew the file) is what rejects an
unknown value at every write: the entry and deliverable write whitelists (`entry-fields.ts:171`), the URL parser
(`view-state.ts:102`, so a hand-typed `?discipline=` cannot smuggle an unknown value into a query) and `/api/tasks`
through `lib/task-updates.ts:127` all call it rather than a page-side copy.
**Correction (2026-10-26):** this paragraph listed `preferences.workDisciplines` among the stored values that stay
valid. That key does not exist yet — `users.preferences` is the `jsonb` column and nothing writes a discipline set
into it; it is what §12.7's step 5 creates, so the honest claim is only that widening the vocabulary cannot break a
key nobody has written. Grouping is a display concern of the picker (`DisciplinePicker`, `sections.tsx:201` — the
category narrows the list and is never itself sent), never a filter value — the URL and the API carry one discipline
at a time. A job title, a
department and a project type stay three separate dimensions and are not flattened into this one, a selected
discipline set is a display preference and not an authorization, and industry suggests a starting set without ever
restricting it. `CAREER_RUNGS` is keyed by discipline and keeps its four levels — a seventy-five-entry ladder would
be a job catalogue, not a progression.

The signal-key registry (`lib/career/signals.ts`) and `lib/career/readiness.ts` stay DB-free for the same reason, so
the ladder's arithmetic is unit-testable without a connection string.

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

## 14. Error handling, security, privacy

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
prefix deliberately and with a test. **Career data** follows the same rule with a tighter circle: placement,
readiness, sign-offs and requests are readable by that member and by admin/superadmin only — never by a report
recipient, never by a teammate, and the routes scope by `session.id` rather than a user id in the body. No column
anywhere stores what an individual is paid; `band_min`/`band_max` exist only on `career_levels`, which is config
about a rung. **Registers and playbooks** (§12): `member` custody rows keep the §14 circle, `team|org` rows are
readable by any authenticated member and writable by owner plus admin; a credential-shaped field key is refused at
the API boundary before it reaches `jsonb`, with the field name in the error and never its value; playbook
precautions authored by the model stay marked `ai_marked` and say so on the printed sheet, because a safety step is
the last place a plausible-sounding invention belongs.

Privacy: the paste path stores no file; deleting a plan removes its object and source text together; a member's
log is not visible to teammates, only to their report recipients and to admins, and that is stated in the policy
rather than implied; the disclosure says plainly that a document is sent to Google for processing.

## 15. Testing

Repo grammar: pure-logic tests under `tests/unit/`, one guard file per subsystem, `npm run typecheck` at 0
errors, `npm run lint` at 0 errors (70-warning baseline), `npm test` green before every commit and push.

- `lib/reports/period.test.ts` — ISO week/month/year boundaries, custom ranges, `Africa/Nairobi` plus a DST
  zone, year-end and leap edges, the yearly 12-bucket series.
- `lib/worklog/capture.test.ts` — every `tasks` mutation path listed in §4 writes exactly one `task_events` row
  (including bulk and promote), a kanban `update-status` drag writes none because it touches `kanban_tasks`,
  `worked_on` resolves in the user's timezone, and no backfill fabrication.
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
- `lib/career/readiness.test.ts` — the weighting math, the previous-rung cap (`capped: true` at 59%), a signal with
  zero rows reading 0 not null, gaps listing both kinds in the right order, and that a client-supplied `percent`
  field is impossible to pass through.
- `lib/career/ladder-seed.test.ts` — every discipline has rungs 1-4 with unique keys, every signal key exists in the
  registry, every target is non-decreasing as the level rises (L3 cannot require fewer delivered items than L2), no
  band value is seeded with a number (they must be null until the owner publishes them), and checklist hints are
  non-empty strings.
- `lib/career/growth.test.ts` — every URL in a grounded answer appears in the grounding metadata or is dropped; the
  benchmark action cannot write `career_levels`.
- `lib/packs/pack.test.ts` — **the "all roles" proof**: a pack written purely as data (a `night-audit` fixture that
  exists nowhere in the UI code) resolves its register kinds, dashboard section list, report template, ladder
  discipline and playbook method through the same selectors the `it-technician` pack uses, with zero code changes;
  every `WORK_DISCIPLINES` member is reachable by exactly one default pack; the `general` pack resolves for an
  unknown role string.
- `lib/registers/staleness.test.ts` — pure date math: `stale`/`fresh`/`unknown`, an interval of 0 days, a
  `last_verified_at` in the future, a leap-day and a month-boundary edge, and that staleness is never stored.
- `lib/registers/fields.test.ts` — the credential reject list blocks `password`, `Password`, `api_key`, `apiKey`,
  `private_key`, `otp`, `mfa_secret`, `token` and nested variants, accepts `kept_in` and `authoriser`, and the
  message names the offending field without echoing its value.
- `lib/playbooks/method.test.ts` — the six-step default is complete and ordered, every step carries at least the
  `action` plus `precautions[]`/`warnings[]` arrays (possibly empty, never undefined), a step's `phase` is in the
  method, run-logging writes one entry per phase with the version, and a `source='gemini'` draft cannot reach
  `published` without a human edit recorded.
- `lib/recommend/next.test.ts` — each rule fires on its real condition and cites the row ids behind it, a rule with
  no rows yields nothing, and no rule's output contains a number absent from its cited rows.
- `lib/export/*` — the three PDF layouts, section ordering, yearly sheet selection, CSV quoting parity with the
  existing `toCsv`.
- `tests/unit/worklog-reports.test.ts` (guard, in the style of `tests/unit/dashboard-chrome.test.ts`) — the key
  variable never appears with a `NEXT_PUBLIC_` prefix; `/api/ai/generate`'s canned branches are gone; no AI
  surface renders a hard-coded "analysis" string; extraction writes `tasks` only through the promote route;
  `WORK_DISCIPLINES` is the only discipline vocabulary; no report/log route can return a row to someone who is
  neither author nor listed recipient nor admin; nothing computes a day's work from `tasks.updated_at`; no career
  table stores an individual's pay (`band_*` lives on `career_levels` only); `career_signoffs` writes are
  admin-gated in the route; the readiness percentage is never read from a request body.
- Manual visual QA stays the owner's (their standing rule); the dev server is not restarted without asking.

## 16. Phases

Each phase is a reviewable, green, committed, pushed unit. Pushing auto-deploys to production.

1. **Schema and capture** *(shipped 2026-10-26; the migration ran against production Neon with the owner's
   per-action approval)* — the ten new tables, three `tasks` columns, `lib/cadence.ts` extraction with
   `one-off`/`yearly`, `WORK_DISCIPLINES` + template map, `task_events` writes wired into every existing task
   mutation path, migration + rollback note. No UI yet; the log starts filling on deploy.
2. **Worklog UI** *(shipped 2026-10-26)* — `/dashboard/worklog`: day view, quick add, week grid, deliverables CRUD,
   calendar heat, filters, search, URL params, bulk, the `/dashboard` "Today" strip. What the phase added beyond
   this line: the log renders five views (day · week grid · list · board-by-kind · calendar heat), the page carries
   eleven cards — the status-change timeline, time by task, the discipline split, the kind mix and coverage were not
   in the one-line summary — the discipline vocabulary widened to 75 in 10 groups with **no migration**, and CSV is
   selection-only (§4), so "export the range" is still open for phase 5.
3. **Reports** *(shipped 2026-10-26)* — period math, aggregation, per-discipline templates, `/api/reports/work/*`,
   the `/dashboard/reports-work` builder with its ten sections, save/draft, no AI required. What the phase added
   beyond this line: the page is twelve cards, not ten (Period and My-reports are the shell); every computed
   section carries the row ids behind its number with the expansion held in `?open=`, so an audited report is a
   link; the drill-down opens the real work log filtered to the period; the template picks the KPI tiles *and* the
   chart set, not only the order; and the page states whether it is showing a saved snapshot or a live preview.
   Nothing here submits, names a recipient, exports a file or drafts prose with AI — §6's lifecycle, inbox,
   export and prose buttons stayed in phases 4, 5 and 9, and no control for them exists on the page.
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
12. **Career ladder schema and math** — the five §11 tables, `lib/career/{signals,readiness,ladder-seed}.ts` all
    DB-free, 20 seeded rungs with null bands, the readiness and seed tests, `/api/career/{levels,me}` reads. No UI.
13. **Career UI and review** — `/dashboard/career` with the readiness meter and drill-downs, checklist display,
    request flow with its frozen evidence, history timeline, `/admin/career` ladder editor + placements + sign-off +
    review queue, notifications on submit/approve/return, and `seniorityTierOf` preferring a real placement.
14. **Growth AI** — grounded learning paths with the URL-verification rule, benchmark snapshots into
    `growth_reviews` (never into `career_levels`), the periodic review written from the member's own counts, and
    gap-closing task suggestions that land as a draft `agent_plan` for the existing promote path.
15. **Role packs and registers** — `role_packs`/`register_items`, `lib/packs/seed.ts` with the IT-technician and
    `general` packs, the staleness and credential-field modules, `/dashboard/registers` CRUD with §4's filter
    grammar, `/admin/packs`, the stale-document queue wired into cadence-generated work items. No AI: the owner
    types their own inventory.
16. **Playbooks** — `playbooks` table, the six-step method module, manual step editor with reorder/clone, palette
    search, run-mode writing one log row per phase, the printable fourth PDF layout with signature boxes.
17. **Onboarding** — `/onboarding` as §12.7's eight adaptive steps, writing `preferences.settings.onboarding`
    through the existing `/api/settings` merge and profile fields through `/api/user/profile` — **no new `users`
    columns and no migration** — per-step persistence with resume, a grandfathered and never-reset existing member,
    a loop-safe server-side gate, the canonical `lib/roles.ts` discipline vocabulary and no others, pack-driven
    ordering on `/dashboard`, re-editable from `/dashboard/settings`, and the skipped-everything default that
    changes nothing for anybody. Its one new server mechanism is `workspace_invitations`: a hashed single-use token
    with an expiry and the role it grants, because joining today means an admin typing your email at
    `/api/team/members` and there is no token to accept. The 17 checks the owner listed are this phase's test file
    list, including the three that protect other people's work: an existing member is never blocked, a saved
    preference is never overwritten by the wizard, and a failed save never marks onboarding complete.
18. **Agent entry for packs, registers and playbooks** — PDF/paste handover ingestion into register rows and
    playbook drafts (credential values refused twice over), grounded precaution suggestions marked as machine
    drafted, and the rule-based recommendation list gaining its AI twin. Needs the provider from phase 6.

Phases 1–5 are the reporting product and need no API key at all — that is the part the owner asked for first,
and it is deliberately sequenced so it can be shipped and used before any AI dependency exists. 6–10 add the
intelligence around it. Phase 8 is independent of 2–5 and can move earlier if the Gantt is wanted sooner.
12 and 13 also need no key and can slot straight after 5: the ladder's arithmetic runs entirely on logged rows, so
it starts meaning something the day the log starts filling. Only 14 waits on the provider. Likewise 15, 16 and 17 —
the register, the playbook and the onboarding are typed by people first, which is the point; 18 is where the agent
gets to fill the same forms. If the technician's handover is the priority, 15+16 are the shortest path to something
they can print, and they depend only on phase 1.

## 17. Risks

- **A report that misrepresents the work.** The hard rule in §2 holds: every number traces to rows the author
  can drill into, and machine prose is marked until accepted. If a metric cannot be computed it is absent, never
  estimated.
- **Logging becomes a chore and people stop doing it.** Mitigated structurally, not by nagging: transitions are
  captured automatically (§4), quick-add is one line, time is optional, and a report is still valid with zero
  manual entries. If the automatic half covers 60% of a normal week, the habit survives.
- **No history before deploy.** Existing tasks have no `task_events`; reports for those periods say "not
  recorded". Restoring the past from `updated_at` is refused (§13) because it manufactures evidence.
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
- **A readiness number read as a promise.** 78% ready is not a half-promotion. The page states that readiness counts
  recorded evidence and that the rung is an admin's decision, bands are published ranges for the role rather than an
  offer to a person, and no pay figure exists in the database to be promised.
- **Logging to the metric instead of the work.** Volume signals alone would reward noise, so a third of the score is
  the checklist and only an admin can move it (§11); the meter also keeps its drill-down, so a reviewer can see
  *which* rows produced the number.
- **Grounding is a moving target.** `google_search` availability, model support and billing are checked in phase 14
  against live discovery, not assumed from documentation; if it is unavailable the advice still renders, labelled
  "no live sources", with links omitted rather than invented.
- **Bootstrapping placements wrongly.** Every write to `career_placement` requires `placed_by` and a note, so a
  day-one bulk placement is attributable and correctable, and a wrong level is visible as a decision rather than
  data.
- **A model-invented precaution.** Safety steps are the costliest place to hallucinate. Precautions default to
  human authoring, machine-drafted ones stay `ai_marked` through to the printed sheet, and the field validator is
  the same for both doors (§12 rule 7) so the agent cannot smuggle a shape the form would reject.
- **The app turning into a password store.** Registers describe custody and location, never values; the field-key
  reject list is a boundary check, not a UI hint, and it is tested with nested and camelCase variants (§15).
- **Pack-as-data quietly becoming pack-as-code.** Every new page that reads a pack must go through the pack
  selectors, and the `night-audit` fixture test fails if a role's behaviour needs an `if (pack_key === …)` branch —
  that test is the mechanism keeping "supports all roles" honest as roles accumulate.

## 18. Decisions already taken

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
- The career ladder publishes **bands per rung and stores no individual pay** — owner's choice, over both
  admin-held salaries and self-entered ones.
- Promotion proof is hybrid: computed signals carry 70%, an admin-signed competency checklist 30%, and a member
  cannot tick their own checklist.
- The employee raises the promotion request and an admin decides it; submitting freezes the evidence the decision
  is made on.
- All four growth AI outputs are wanted, including live web search for learning paths and market benchmarks — the
  one deliberate exception to the no-browsing rule, with returned URLs verified against grounding metadata.
- The ladder reuses the log's tables and the planner's promote path; gap-closing suggestions become a draft plan,
  not a new entity.
- Role support is **data, not code**: a pack is rows plus selectors, so a role the app has never seen is configured
  at `/admin/packs`, and the `night-audit` fixture test is what proves the claim.
- The IT technician's handover shape (infrastructure · accounts and systems · equipment · outstanding work) plus the
  six-step Identify → Reproduce → Diagnose → Fix → Test → Document method is the first filled pack, not the schema.
- Registers record custody and where a secret is kept; the application never stores the secret itself.
- SOPs are hand-authored first and agent-drafted second, through one validator, and stay marked as machine-drafted
  on the printed page.
- Onboarding tailors, it does not gate: everything it collects lives in `preferences.settings`, it is skippable in
  one click, and a member who skips it sees the full default view. Eight steps is the *catalogue*, not the route —
  the wizard adapts to the workspace type, existing members are grandfathered and never reset, joining a workspace
  needs a server-issued invitation rather than a typed name, and the disciplines it offers are the canonical
  `lib/roles.ts` ones.
- The assistant reads the signed-in user's own data, and everything for an admin/superadmin.
- The scripted landing FAQ survives as tier 1.
