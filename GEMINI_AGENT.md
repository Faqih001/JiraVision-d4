# Gemini across the app — every agent, what it analyses, what it may not do

This is the reference for the AI side of JiraVision: the one module that talks to Google, the nine
surfaces that use it, what each is allowed to read, what it persists, and how a failure looks to the
member. It is the deep version of the [README's AI section](README.md); the per-page CRUD map is in
[DASHBOARD_PAGES.md](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/DASHBOARD_PAGES.md).
"design §n" citations, as used across the code comments, mean
[docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md).

## 1. One door to the provider

`lib/ai/gemini.ts` is the only file that knows Google's URL, the key and the payload shape. Nothing
else calls `generativelanguage.googleapis.com`. Two exports cover every surface:

| Function | Returns | Used by |
| --- | --- | --- |
| `geminiText(req)` | `{ text, usage, grounding }` | prose answers (site assistant, scrum master, growth review) |
| `geminiJson(req, parse)` | `{ data, usage, grounding }` | structured output against a `responseSchema`, validated by the caller's `parse` |

Request knobs, and what the app does with them:

- **`timeoutMs`** — defaults are `chat` 20s, `extraction` 120s, `prose` 45s. Every surface sets its
  own explicitly; the table in §3 lists them.
- **`retries`** — a retry happens **only** for `kind === "timeout"`, and the `timeoutMs` budget is
  split between the attempts (`attemptMs = timeoutMs / attempts`). A 429 or an auth failure is never
  retried, because retrying a quota wall is how you stay over it.
- **`thinkingBudget`** — Gemini 2.5+ thinks before answering. Only the **agent handover** sets it to
  `0` (app/api/agent/handover/route.ts:77): thinking over a handover PDF cost ~9k tokens and 68s
  against 24–36s without, the number recorded at `route.ts:75`. Planner extraction leaves thinking on,
  because a 30-item plan needs it. `thinks(model)` skips the config for pre-2.5 models, which answer
  400 to a `thinkingConfig`, and treats unversioned aliases as 2.5+.
- **`googleSearch`** — adds Google Search grounding. Only two career-growth actions use it (§4.8).
- **`responseSchema` / `maxOutputTokens` / `temperature` / `system`** — passed straight through as
  `generationConfig` and `systemInstruction`.
- **`contents`** — a list of text parts or `inlineData` parts (`{ mimeType, data }`, base64). The two
  PDF surfaces (planner brief, agent handover) send the file as one `inlineData` part.
- **`readGrounding(json)`** — normalises `groundingMetadata` into `{ queries, sources[] }`, dropping
  non-http URLs, stripping hashes and trailing slashes, deduplicating. This is the only evidence a
  web-sourced answer is allowed to render from.

**Model discovery.** With `GEMINI_MODEL` unset the module lists models once per cold start and caches
the first `generateContent`-capable, non-vision, non-embedding model. Google renames models
frequently, so unset is the resilient setting. `resetModelCache()` exists for tests.

**Errors.** Every failure leaves the module as `GeminiError` with one of six kinds; no stack and no raw
Google body reaches a client. Each route family owns its own kind → status/message map, so the same
`GeminiError` is not one status app-wide:

| `kind` | Raised when | agent routes (`app/api/agent/_shared.ts:36`) | career growth (app/api/career/growth/route.ts:37) | scrum master | proxy (`/api/ai/generate`) |
| --- | --- | --- | --- | --- | --- |
| `auth` | key missing/invalid, discovery refused | 503 "AI drafting is not configured…" | 503 "Growth AI is not configured." | 503 + "use the rule engine" | 401 |
| `quota` | 429 from Google | 429 | 429 | 503 | 429 |
| `blocked` | 400 with `blocked`/`safety` | 422 | 422 | 503 | 400 |
| `timeout` | AbortController fired | 504 "The AI provider did not answer in time." | 504 | 503 | 504 |
| `transport` | network error, 5xx, discovery failed | 502 | 502 | 503 | 500 |
| `badjson` | no text part, unparseable JSON, schema rejected | 502 "The AI answer did not survive validation." | 502 | 503 | 500 |

The workspace assistant (`app/api/assistant/workspace/route.ts:107`) does not use a `kind` map at all —
`lib/assistant/workspace.ts:102` converts the `GeminiError` into a plain `Error` with a friendly
sentence and the route answers **500** with that message. The planner (`app/api/planner/extract/route.ts:96`)
has its own three-way map — `auth` → 500, `quota` → 429, anything else → 502 — with `kind` in the body so
the page can name the reason. The site assistant never surfaces an AI error to a visitor at all: on any
`GeminiError` it returns a scripted sentence (§4.1).

`app/api/agent/_shared.ts` owns the first column for all four agent routes, so none of them can drift
apart or leak Google's status text.

## 2. Configuration and budget

| Variable | Required | Effect |
| --- | --- | --- |
| `GOOGLE_GEMINI_API_KEY` | for any AI surface | Unset → every AI control renders disabled and the rest of the app (log, reports, exports) is fully functional |
| `GEMINI_MODEL` | no | Unset → auto-discover, cached per cold start |
| `AI_PUBLIC_DAILY_CAP` | no | Global daily ceiling for the anonymous site assistant, default 200 |

**The key is on the free tier: 20 `generateContent` requests/day for `gemini-2.5-flash`, and Google
answers 429 until the daily reset.** Consequences worth knowing:

- One member clicking "Ask the AI twin" repeatedly can spend the day's budget for the whole app.
- A local dev probe counts against the owner's budget, so verify code paths with tests rather than
  live calls.
- The surfaces that answer without the model (rules, keyword tier, deterministic calculations) exist
  partly for this reason. Enable billing before a team relies on any of §4.

**Usage is not metered per member.** `ai_usage_daily` (`date`, `scope`, `calls`) is written by the
site assistant only, and its `inputTokens`/`outputTokens` columns are always written as `0` — token
counts come back on `usage` but are stored nowhere. `assistant_messages.tokens` is the same: hardcoded
`0` with a `// TODO: track actual token usage` at
[app/api/assistant/workspace/route.ts:81](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/api/assistant/workspace/route.ts#L81).
No surface records its own spend, so there is no per-surface cost report yet — the only budget signal is
the 429.

## 3. The nine surfaces at a glance

| # | Surface | Route → module | UI trigger | Provider call | Persists |
| --- | --- | --- | --- | --- | --- |
| 1 | Site assistant | `POST /api/assistant/site` → `lib/assistant/site.ts` | landing chatbot | `geminiText` · temp 0.5 · 500 tok · 15s | `ai_usage_daily` counter only |
| 2 | Workspace assistant | `POST /api/assistant/workspace` → `lib/assistant/workspace.ts` | `/dashboard/assistant` + top-bar panel | `geminiJson` · temp 0.3 · 20s | `assistant_threads` |
| 3 | Planner extraction | `POST /api/planner/extract` | `/dashboard/planner` "Extract a Plan" (paste or PDF) | `geminiJson` · temp 0.2 · 8192 tok · 120s | `agent_plans` + `plan_items` |
| 4 | Agent handover preview | `POST /api/agent/handover` → `lib/agent/handover.ts` | `/dashboard/agent` "The handover" | `geminiJson` · temp 0.1 · 120s · `thinkingBudget: 0` · 1 retry | nothing — preview only |
| — | Handover commit | `POST /api/agent/handover/commit` | tick rows → Commit | **no model call** | `register_items`, playbook drafts |
| 5 | Precaution suggestions | `POST /api/agent/precautions` → `lib/agent/precautions.ts` | playbook editor "Precautions" | `geminiJson` · temp 0.3 · 45s | nothing — merged into the draft |
| 6 | Recommendation AI twin | `POST /api/agent/recommendations` → `lib/recommend/next.ts` | `/dashboard/agent` "What next" | `geminiJson` · temp 0.2 · 45s | nothing |
| 7 | AI Scrum Master | `POST /api/dashboard/ai-recommendation` | `/dashboard/ai-scrum-master` | `geminiText` · temp 0.4 · 300 tok · 20s | `ai_insights` row |
| 8 | Career growth | `POST /api/career/growth` → `lib/career/growth.ts` | `/dashboard/career` Growth AI panel | `geminiText` + `geminiJson`, 2 actions with `googleSearch: true` | `growth_reviews`, plus a draft plan for `task_suggestions` |
| 9 | Provider proxy | `POST /api/ai/generate` | **no page calls it** | both functions, body-supplied | nothing |

The handover commit row is in this table because it is the write half of surface 4, but it never calls
the provider. §4 walks the same routes in the order the product meets them.

## 4. What each agent analyses

### 4.1 Site assistant — the anonymous one, and it answers before it calls

Two tiers (design §7). Tier 1 matches the question against the `KEYWORD_RESPONSES` table in
`lib/assistant/site.ts` (33 entries) and replies instantly and free. Only on a miss does tier 2 call Gemini, and only after two gates: per-visitor limits
(**8/hour, 24/day per IP**, `lib/rate-limit`, both answered as 429 at the route) and the global
**`AI_PUBLIC_DAILY_CAP`** enforced by an upsert into `ai_usage_daily` (scope `"site"`, one row per
date). Past the cap the visitor gets a scripted "daily limit" sentence with `source: "keyword"`, not an
error — the chat never breaks, it just stops being clever. The prompt is built from pathname-based
knowledge, so the model is shown published marketing copy, is told to answer *only* from it and to point
at the published page as the authoritative version. If Google fails, the answer is a scripted fallback
and HTTP stays 200 (§6). Tracking fails **open** — if the counter errors, the request is allowed — so a
database wobble degrades cost control, never availability.

### 4.2 Workspace assistant — one member's rows, nothing else

`assembleWorkspaceContext()` (`lib/assistant/context.ts`) reads five tables for that member only —
tasks, task events, work-log entries, deliverables and work reports — with `daysBack: 30` and `limit:
50` per set, and `formatContextForPrompt()` turns them into the context block. `callWorkspaceAssistant`
short-circuits **before** calling Gemini when that context comes back empty: the member is told to log
some work, and the request never reaches Google (lib/assistant/workspace.ts:62).

The answer is constrained to a schema, so a reference is a named row-set with a count, not a vibe:

```ts
{ answer: string, references: [{ kind, label, count }], dataAsOf: string }
```

`dataAsOf` is overridden with the real context timestamp rather than whatever the model claimed
(lib/assistant/workspace.ts:95).

A question is persisted as an `assistant_threads` + `assistant_messages` pair (app/api/assistant/workspace/route.ts:53,65,77),
threads are re-readable through `GET /api/assistant/workspace/threads` and `/threads/[id]` and
deletable, and a `threadId` is refused with 404 unless it belongs to the asking `user_id`. The same
endpoint backs the top-bar `AssistantPanel` (components/assistant-panel.tsx, mounted in
components/dashboard-layout.tsx), so a member can ask from any page.

Unlike the site assistant, this route has **no rate limit** — the only throttle is the key's own daily
quota, which is why one member's curiosity can spend it (§2).

### 4.3 Planner extraction — a brief becomes a plan, not a task list

Accepts pasted text or one PDF (`inlineData`, max 15 MB), runs at 120s with 8192 output tokens at
temp 0.2, and validates the JSON with `extractPlanSchema.parse` before a row is written
(`planJsonSchema()` is what constrains Google's own output). It creates `agent_plans` + `plan_items`
with `status: "draft"` **only** — nothing becomes a task here. Promotion
(`POST /api/planner/[id]/promote`) is a separate, deterministic transaction.

Two things make this surface different from the agent routes. It **stores the source**: the pasted text
or the PDF as base64 in `agent_plans.source_text`, deliberately, so a plan can be re-read without
re-paying the model (app/api/planner/extract/route.ts:3). Treat that column as holding the customer's
brief. And its error map is its own (app/api/planner/extract/route.ts:96): `auth` → 500, `quota` → 429,
anything else → 502, with `kind` in the body so the page can name the reason.

### 4.4–4.5 Agent handover — the strictest guardrails in the app

`POST /api/agent/handover` takes pasted text or one PDF and returns structured register rows and
playbook drafts. Its own guards (app/api/agent/handover/route.ts:26-51): a session, a required
`packKey` that must resolve through `loadPacks(false)` + `packByKey` or answer 404, **exactly one** **exactly one**
of text or PDF (`Boolean(text) === Boolean(pdf)` is rejected), text capped at `MAX_TEXT = 60_000`
characters, and an attachment that must declare `application/pdf` and decode under
`MAX_PDF_BYTES = 15 * 1024 * 1024`. The role pack is re-read server-side and passed into
`readHandover`, so a row whose `kind` is not in that pack's list is refused rather than shown — the
model cannot invent a register kind and have it land. The brief lives in memory for the request only;
it is never stored or logged. Temperature is 0.1, thinking is off, and the 120s budget is split across
2 attempts because a hung request from Google's side is what the retry absorbs.

**Nothing is stored by the preview.** The UI shows tickable previews plus a refusal panel naming the
exact field paths the server would not accept, and only `POST /api/agent/handover/commit` writes —
with no model call at all. Commit repeats the checks in one transaction (app/api/agent/handover/commit/route.ts:61):
the pack must still exist, `kind` must be one the pack lists, `stripCredentialValues` drops any
credential-shaped key or value before `readRegisterFields` sees it, a title already in that pack's
register is skipped as a duplicate, and every row that does land is marked `source: "gemini"` with the
signed-in member as `owner_id`. Playbook drafts land with `ai_marked: true`, so publishing them still
requires a human edit.

### 4.6 Precaution suggestions — advice that stays a draft

`POST /api/agent/precautions` does **not** read the stored playbook: the client sends the editor's
*unsaved* draft and `readPrecautionDraft(body.playbook)` validates that shape before any provider call
(app/api/agent/precautions/route.ts:25). The prompt is built from what the author has typed so far, and
`readPrecautions(raw, draft.value.existing)` drops suggestions that duplicate a line already in the
draft. Nothing is persisted, and publishing (`POST /api/playbooks/[id]/publish`) separately refuses a
model-drafted row, an empty step or an empty action — so an unedited AI suggestion cannot become live
procedure by accident. A provider failure is a 503, never an invented precaution.

### 4.7 Recommendation AI twin — rules first, model second, always

`lib/recommend/next.ts` builds the recommendation list from the member's real rows with deterministic
rules. The route returns `{ rules, ai, aiAvailable, today }`, and the AI twin runs only when the
client explicitly asks (`body.ai === true`) — the button is a separate one on `/dashboard/agent`.
`aiAvailable` is `Boolean(process.env.GOOGLE_GEMINI_API_KEY)`, so a missing key disables the control
instead of erroring.

The AI answer passes through `readAiSuggestions(raw, input)` before it reaches the page. A suggestion
is dropped — silently — if any of these fail:

- `why` empty or over 240 chars, `action` empty or over 120 chars, or either contains a newline;
- `href` is not exactly one of the `AI_HREF_PREFIXES` (or a query string on one) — no absolute URLs;
- **every number in the text must already appear in the facts the prompt was given**
  (`numbersAppear(text, factText(input))`);
- each `refs[]` entry must name a known table and an id the member can actually see.

That is the "no invented numbers" rule enforced in code, and it is why a slow or quota-blocked model
still leaves a working page: the rules are the product, the twin is an enhancement.

### 4.8 Career growth — the only surface allowed on the open web

Four actions (`review`, `task_suggestions`, `learning`, `benchmark`), each with its own prompt in
`lib/career/growth.ts`, whitelisted by `isGrowthAction()` before any call:

| Action | Call | Web | Writes |
| --- | --- | --- | --- |
| review | `geminiText` · temp 0.3 · 2048 tok · 45s | no | `growth_reviews` |
| task_suggestions | `geminiJson` · temp 0.2 · 2048 tok · 120s (default) | no | `growth_reviews` **plus a draft `agent_plans` + `plan_items`** |
| learning | `geminiJson` + `googleSearch: true` · temp 0.2 · 4096 tok · 90s | yes | `growth_reviews` |
| benchmark | `geminiJson` + `googleSearch: true` · temp 0.2 · 4096 tok · 90s | yes | `growth_reviews` |

`createGapPlan()` (lib/career/gap-plan.ts:24) writes the snapshot and the draft plan in one
transaction, `sourceKind: "career"` and `status: "draft"` — so the model's task list is a planner draft
like any other, and promoting it to real work is still the deterministic human step.

For the two web actions a returned URL renders **only if it appears in that response's own grounding
metadata** (`readGrounding`); every other item is dropped, and if nothing survives the action answers
502 and saves nothing. A course link or a pay range is never shown on the model's say-so. The panel
never computes readiness and never invents a source — it draws what the server saved.

### 4.9 AI Scrum Master — one sentence, from that sprint's rows

`POST /api/dashboard/ai-recommendation` (app/api/dashboard/ai-recommendation/route.ts:99) is the one
surface where the model is the *minority* path. If the client sends a title and description — the text
its rule engine already computed from the sprint's real numbers — the route stores that verbatim and
never calls Google. Only when no description arrives does it read `sprints` and that sprint's `tasks`
and ask for short prose ("no markdown, no bullet points, no invented numbers") at temp 0.4, 300 tokens,
20s. The answer is stored as an `ai_insights` row so `/dashboard/ai-scrum-master` shows history rather
than a regenerated string per visit; insights are editable and dismissible through
`PATCH`/`DELETE /api/ai-insights/[id]` and expire after 7 days.

Two caveats worth knowing before you add to this surface: `ai_insights` has **no owner column**, so a
recommendation stored here is visible to every member's dashboard reads (it is listed in
DASHBOARD_PAGES.md's "Known limits"); and the route trusts the client's prose when it supplies it,
because that prose came from the client's own deterministic engine, not from a model.

### 4.10 The provider proxy — present, unused

`POST /api/ai/generate` accepts `{ system, contents, responseSchema?, maxOutputTokens?, temperature?,
timeoutMs? }` for a signed-in member and returns `{ text|data, usage }`. It is real and tested, but
**no page calls it**; the named surfaces above are the API the product actually uses. Treat it as the
escape hatch, not as a feature.

## 5. Rules that hold across all of them

1. **No invented numbers.** Facts go in with the prompt; only those facts may come out — enforced by
   `numbersAppear`, by `responseSchema`, and by "say 503/422 rather than advise".
2. **The model reads only what it is given.** Site text for visitors, one member's `user_id`-scoped
   rows for the workspace surfaces. Nothing gets a roster it was not entitled to.
3. **The cheap path answers first.** Rules, keyword tiers, and deterministic math run before any
   request; a fallback that reads plausibly is a bug, not a rescue.
4. **AI output is data, never a side effect.** Nothing a model wrote becomes *work* without a separate
   human action (handover commit, playbook publish, plan promote) — a model can fill a draft, and every
   draft it fills is still a draft. The two surfaces that do store a machine note directly are the ones
   whose whole product *is* that note (`ai_insights`, `growth_reviews`), and both are editable and
   dismissible afterwards.
5. **A missing key is a disabled control, not an error.** `aiAvailable` gates the buttons everywhere.
6. **Google's own error text never reaches a browser.** Routes map `GeminiError.kind` to a status and a
   short UI sentence written here; the raw Google body and stack stay in the module. A model's *answer*
   does reach the browser — that is the product — but only after the validators in §4, and a
   `GeminiError.message` never does.

## 6. How a failure looks in the app

| Member sees | Cause | What still works |
| --- | --- | --- |
| "The AI provider did not answer in time." | `timeout` → 504 (agent family) | the rule list, the page, every non-AI control |
| A disabled AI button + hint | `GOOGLE_GEMINI_API_KEY` unset (`aiAvailable: false`) | all of it |
| "The AI provider is rate-limited or out of quota for this key. Try again later." | `quota` → 429, free-tier day spent | rules and keyword tier |
| "The AI provider refused this content." | `blocked` → 422 | manual entry of the same rows |
| "The AI answer did not survive validation." | `badjson` → 502 — a schema or validator refused the payload. The internal sentence the validator threw (`lib/recommend/next.ts:338`, "The suggestion answer was not a list.") is dropped by the error map (`_shared.ts:54`), so it reaches neither the browser nor the log | rules; nothing was saved |
| "AI request timed out. Try again." | workspace assistant, `timeout` → 500 | the same question re-asked, and every non-AI page |
| "AI quota exceeded. Apply a recommendation computed by the rule engine instead." | scrum master, `quota` → 503 | the client rule engine, which is the default path |
| "I'm having trouble connecting to the AI service right now. Please check our FAQ page or contact support@jiravision.com." | visitor asked something off-topic and the model failed → scripted answer, HTTP 200 | tier-1 keyword answers |
| "Too many requests. Please try again in an hour." | visitor past 8/hour on the site assistant → 429 | tier-1 keyword answers |

The agent family and career growth share one message set (`_shared.ts:45`, `growth/route.ts:37`); the
scrum master always appends "Apply a recommendation computed by the rule engine instead." so the
fallback is named in the failure itself.

## 7. Where Gemini is **not** used

Ethical metrics, analytics, workload and velocity numbers, sprint and burndown math, report bodies and
exports, work-log parsing, readiness percentages, staleness and register validation are all
deterministic code. A number on a dashboard is never model-produced; the model's role begins after the
arithmetic is finished.

Note for operators: `.env.example` still names "report prose" as an AI feature. It is not one —
reports contain no model call.

### The one other outbound AI-ish call is not Gemini, and it is an open proxy

`app/api/aitopia/[...path]/route.ts` (`GET`/`POST`/`OPTIONS`) joins the URL segments it was matched on
and fetches `https://extensions.aitopia.ai/<path>`, then echoes that upstream's status and JSON body back
to the caller. It is not a model surface — nothing here touches `lib/ai/gemini.ts` — but it belongs in
this document because it is the app's only other outbound call to an AI vendor, and it is the one route
that leaves this deployment with someone else's credentials:

- **No session check.** `tests/unit/schema-safety.test.ts:178` pins it as a *known* ungated endpoint, so
  it is a documented exception, not an oversight.
- **Every inbound header but `host`, `origin` and `referer` is forwarded upstream** (`route.ts:30-34`,
  `:75-79`) — so an `Authorization` header or this app's own session `Cookie` on the incoming request is
  replayed to `extensions.aitopia.ai`.
- **`Access-Control-Allow-Origin: *`** on every response and on the preflight, so any website can drive
  this route as a relay into that one origin's path space (the destination host is fixed, so it is not
  arbitrary SSRF; the path and query string are entirely caller-controlled).
- The proxied URL, query string included, is written to the server log (`route.ts:23`, `:68`).
- `next.config.mjs:13-20` also declares an `afterFiles` rewrite to the same destination. Route handlers
  win over `afterFiles` rewrites, so the route above is what runs and the rewrite is dead weight.
- `app/api/cors-middleware.ts` sets the same CORS headers but is **not active** — Next only loads
  `middleware.ts` at the project root (or `src/`), and there is none.
- The browser half is dev-only: `app/providers/client-cors-wrapper.tsx:10` renders the `fetch`
  interceptor solely when `NODE_ENV === 'development'`.
- **No product code calls it.** The interceptor only rewrites requests that already name
  `extensions.aitopia.ai`, and none do. `REDESIGN_PLAN.md:17` records the dependency as "kept as-is".

That makes it an unused outbound relay, not a feature. Removing the route, the rewrite, the interceptor,
the wrapper and its entry in `schema-safety.test.ts`'s allow-list would close it with nothing to
re-wire; it is left in place because deleting a third-party integration is the owner's call, not a
documentation fix.

## 8. Adding a tenth surface

1. **Pure module first.** Prompt builder + response schema + validator in `lib/<area>/…`, the way
   `lib/recommend/next.ts`, `lib/agent/handover.ts` and `lib/career/growth.ts` do it. No fetch there.
2. **Route second.** Session gate (reuse `agentSession()` for agent-family routes), re-read the rows
   with the session, scope every write to `gate.id`, and treat an id from the body as a *key to resolve*,
   not a filter — the handover's `packKey` goes through `packByKey` before anything is written. Then
   `geminiText`/`geminiJson`, then `geminiFailure(error) ?? bad(...)`.
3. **Say what it costs.** Explicit `temperature`, `timeoutMs`, `maxOutputTokens`. `thinkingBudget: 0`
   with `retries: 1` is the handover's choice (a 120s budget split across 2 attempts, because thinking
   over a PDF doubles both output and latency); the planner deliberately keeps thinking *on* at 8192
   output tokens, because a 30-item plan needs it. Do not copy one onto the other by reflex.
4. **Keep the deterministic path the default.** Return `{ rules, ai, aiAvailable }` shaped output so
   the page works when the model does not.
5. **Persist behind a human action** unless the stored note *is* the feature.
6. **Guards:** a unit test that stubs the provider (`tests/unit/gemini.test.ts` shows the shape) and a
   source-shape test pinning the knobs. `tests/unit/ai-config-docs.test.ts` additionally fails if the
   new code reads an env var that `.env.example` does not document, and pins the README's AI section
   (route paths named there must exist, `lib/ai/gemini.ts` must be named, the no-invented-numbers rule
   and the `ai-assistant-answers` legal section must stay in it).

## 9. Tests that pin this behaviour

`tests/unit/gemini.test.ts` (provider), `ai-config-docs.test.ts` (env + README),
`assistant-site.test.ts` and `assistant-site-knowledge.test.ts` (tiers and caps),
`assistant-context.test.ts` / `assistant-ask.test.ts` / `assistant-panel.test.ts` (workspace),
`planner-extract.test.ts`, `agent-handover.test.ts`, `agent-precautions.test.ts`,
`recommend-next.test.ts`, `career-growth.test.ts` + `career-growth-route.test.ts`,
`ai-recommendation-route.test.ts`, `legal-ai-disclosure.test.ts`.
