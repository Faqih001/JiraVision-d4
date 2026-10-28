# JiraVision

A team delivery workspace: a public marketing site plus a signed-in dashboard with tasks, sprints,
kanban, a work log, period work reports, a plan-to-Gantt planner, a career ladder, custody registers,
standard operating procedures, and an AI assistant.

The original scaffold came from a v0.dev export. This repository is no longer generated or synced by
v0 — changes land through commits, and Vercel builds from `main`.

Live: **[https://jiravision.vercel.app](https://jiravision.vercel.app)**

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 3.4, shadcn/ui on Radix primitives |
| Data | Drizzle ORM over Neon Postgres (`@neondatabase/serverless`) |
| Auth | Cookie sessions, bcryptjs password hashes |
| AI | Google Gemini behind one module, `lib/ai/gemini.ts` |
| Tests | Vitest 5 (unit), Playwright (e2e) |
| Extras | Resend (email), ExcelJS + jsPDF (exports), Recharts, dnd-kit |

## Getting started

Requirements: Node.js 20.9 or newer (Next 16 minimum) and npm.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL at minimum
npm run db:push              # apply drizzle/schema.ts to that database
npm run dev                  # http://localhost:3000
```

Database scripts read `.env.local` first, then `.env` (`drizzle.config.ts`). Next.js itself reads
`.env.local`. `.env.example` documents every variable, including where to obtain the optional ones.

Without `GOOGLE_GEMINI_API_KEY` the app still runs: AI controls render disabled and everything
else — logging, reporting, exporting — works normally. See [AI](#ai).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server on port 3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint over `app components lib hooks types context` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright smoke suite |
| `npm run db:push` | Push `drizzle/schema.ts` to the database |
| `npm run db:worklog` | Create the worklog/reports/planner tables (additive) |
| `npm run db:worklog:rollback` | Drop those tables again |
| `npm run db:career` | Create the career tables and seed the 20-rung ladder |
| `npm run db:career:rollback` | Drop the career tables again |
| `npm run db:registers` | Create the role-pack and register tables and seed the two packs |
| `npm run db:registers:rollback` | Drop those tables again |
| `npm run db:playbooks` | Create the playbooks table and the work-log foreign key (additive) |
| `npm run db:playbooks:rollback` | Drop that table and the constraint again |
| `npm run db:invitations` | Create the workspace-invitation table (additive) |
| `npm run db:invitations:rollback` | Drop that table again |
| `npm run db:seed` | Insert sample data |
| `npm run db:migrate` | Run the SQL migrations in `drizzle/` |

## Layout

- `app/(marketing)/` — 22 public routes (pricing, products, solutions, compare, legal, resources…)
- `app/dashboard/` — 43 signed-in pages, including `worklog`, `reports-work`, `planner`, `career`, `registers`, `playbooks`, `agent`, `assistant`
- `app/onboarding/` — the eight-step setup wizard, one signed-in page outside the dashboard shell
- `app/admin/` — super-admin surfaces: the landing CMS (`/admin/cms`), the career ladder (`/admin/career`) and role-pack authoring (`/admin/packs`)
- `app/api/` — 176 route handlers; every data route re-checks the session itself
- `components/` — shared UI, including the dashboard shell and the assistant panel
- `lib/` — auth, data access, roles, and the domain modules: `worklog/`, `reports/`, `planner/`, `assistant/`, `career/`, `packs/`, `registers/`, `playbooks/`, `onboarding/`, `agent/`, `recommend/`, `ai/`
- `drizzle/` — schema (`schema.ts`), migrations, and seed scripts
- `content/` — marketing copy and the legal notice
- `tests/unit/`, `tests/e2e/` — Vitest unit tests and the Playwright smoke test

## Authentication

Sign-in sets two cookies — `session_id` (a UUID) and `user_id` — and passwords are bcrypt hashes
compared at login. `proxy.ts` is a **redirect-only gate**: it checks that the cookies are present and
sends anonymous visitors to `/login`. It can never be the security boundary, so each API route and
server action loads the session itself with `getSession()` and scopes its query by `user_id`.

## AI

All AI features go through one module, `lib/ai/gemini.ts` — it is the only place that knows Google's URL,
key and payload shape. Everything else calls `geminiText()` or `geminiJson()` and handles `GeminiError`
(`auth | quota | blocked | timeout | transport | badjson`). Nothing calls Google directly.

Configure it in `.env.local` (see `.env.example` for where to get a key):

| Variable | Required | Meaning |
|---|---|---|
| `GOOGLE_GEMINI_API_KEY` | yes, for any AI surface | Unset → AI controls render disabled; the log, reports and exports work fully |
| `GEMINI_MODEL` | no | Unset → the first text-capable model is discovered once per cold start |
| `AI_PUBLIC_DAILY_CAP` | no | Global daily ceiling for the anonymous site assistant (default 200) |

Six surfaces use it:

| Surface | Route | Who can call it | Grounded in |
|---|---|---|---|
| Site assistant | `POST /api/assistant/site` | Anyone (rate-limited) | Published `content/*` text for the current pathname |
| Workspace assistant | `POST /api/assistant/workspace` (+ `/threads`) | Signed-in member | That member's own tasks, work log, deliverables, reports |
| Planner extraction | `POST /api/planner/extract` | Signed-in member | The pasted or uploaded brief |
| AI scrum master | `POST /api/dashboard/ai-recommendation` | Signed-in member | The sprint's own rows |
| Career growth | `GET/POST /api/career/growth` | Signed-in member | Their own counts and gaps, plus Google Search results whose URLs are verified against grounding metadata |
| Provider proxy | `POST /api/ai/generate` | Signed-in member | Whatever the caller sends |

Four rules hold across all of them:

1. **No invented numbers.** A prompt that produces a recommendation is given real values and told to use only
   those. If the provider fails, the route says so (503/422) rather than inventing advice; the rule engine on
   the client is the fallback, not a plausible sentence.
2. **The model reads only what it is given.** The public assistant gets published site text, so it cannot
   disclose anything private; the workspace assistant gets one member's rows, scoped by `user_id`.
3. **The cheap path answers first.** The site assistant answers from 35 keyword entries before it ever calls
   the model, so most visitor questions cost nothing. Per-visitor caps are 8/hour and 24/day; the global
   ceiling is `AI_PUBLIC_DAILY_CAP`.
4. **Web answers are verified, not trusted.** The career growth actions (learning path and benchmark) are the
   only surfaces allowed to search the web. A returned URL renders only if it appears in the response's own
   grounding metadata; every other item is dropped. If nothing survives, the action returns 502 and saves
   nothing, rather than showing an unverified course or pay range.

The legal notice states the same thing to visitors: what the assistant reads, and that a published page
outranks a machine answer (`content/legal.ts`, section `ai-assistant-answers`).

## Role packs and registers

Role packs are rows, not code: `/admin/packs` authors what a role is the keeper of, and
`/dashboard/registers` holds the rows themselves — custody, status, a verify interval, and no credential
values (the field validator refuses them). Staleness is computed from `last_verified_at` and the interval,
never stored. Scheduling the stale queue writes a draft planner plan, and only promote turns a plan item
into a task. The tables are additive (`npm run db:registers`) and the script is safe to re-run.

## Playbooks

`/dashboard/playbooks` holds standard operating procedures as rows: a method (the six-step default is
Identify → Reproduce → Diagnose → Fix → Test → Document, overridden by the role pack's own), steps
grouped into those phases, precautions and a re-verify interval. Authoring is a form with reorder and
clone; publishing is a separate route and refuses a model-drafted row, an empty step or an empty action.
Following one (`/dashboard/playbooks/[id]/run`) writes one action row per method phase into the work log,
each carrying the playbook id and version — it never creates tasks. The printed layout is the fourth in
`lib/export/pdf.ts`: one page per phase with a signature block. `npm run db:playbooks` is additive and
safe to re-run.

## Onboarding

`/onboarding` is the eight-step setup wizard — Welcome, Profile, Workspace, Industry, Role and
disciplines, Project management, First project, Review and finish. It is adaptive rather than required:
every step but Welcome and Review can be skipped, and skipping leaves the default in place.

State lives in `preferences.settings.onboarding` (`{ status, step, completedAt, version, data }`) and is
written through `/api/settings`' existing jsonb merge, so no `users` column was added and no migration
accompanies the wizard. Each step saves when it validates, which makes a refresh, a closed tab or a
logout-then-signin lossless; a member can resume from the dashboard banner or reopen the wizard from
`/dashboard/settings`.

Existing members are grandfathered: an account created before 2026-10-27, or one that already has a task
or a work-log row, reads as complete on first visit and is never routed through the wizard. Nothing on
the path clears a saved preference, and the dashboard never redirects — an incomplete member sees a
*Resume setup* banner, not a wall.

Joining a workspace works by invitation, not by typing a name. A super-admin sends a link from
`/dashboard/team`; the token in `/onboarding?invite=…` is stored as a SHA-256 hash, expires after seven
days, is bound to one email address and works once. Until the token is accepted, the wizard's join branch
offers *request access* instead, which notifies the workspace admins and changes no membership.
`npm run db:invitations` creates the one new table (additive and safe to re-run).

## Agent entry

`/dashboard/agent` is the one door for machine help, in two tabs kept in the URL. **Handover** reads a
pasted brief or one PDF (15 MB) against a role pack and shows register rows and playbook drafts as a
**preview** — nothing is written until the member ticks rows and commits. The preview route stores
neither the text nor the PDF and logs neither; the commit route re-validates every row through the manual
validators, dedupes by pack/kind/title, and stamps `source: "gemini"` with playbooks as drafts. Credential
values are refused at both doors, at any depth, and the refusal names the field path instead of repeating
the value. **What next** loads six rules computed server-side from the member's own rows
(`stale_register`, `overdue_renewal`, `deliverable_stuck`, `career_gap`, `report_missing`, `missing_log`);
the AI twin is a separate button, and a suggestion survives only if the rows it names exist and every
number it writes already appears in the member's facts. With no key the rules still work; nothing in
either tab writes a task, and the playbook editor's *Suggest precautions* button marks the row so the
printed sheet says the advice was model-drafted.

## Testing

`npm test` runs the Vitest suite: pure domain modules plus source-assertion tests that read route and
component files (with comments stripped) to pin behaviour, so no database is needed. `npm run test:e2e`
runs the Playwright smoke suite against a running server.

The same three gates run before every release: `npm run lint`, `npm run typecheck`, `npm test`.

## Deployment

Production is the Vercel project `jiravision` at [https://jiravision.vercel.app](https://jiravision.vercel.app),
building from `main`. Environment variables live in the Vercel project settings, never in the repo —
`.env.example` is the authoritative list of names.

## Further reading

- `FEATURES.md` — what the product does, feature by feature
- `USER_PROFILES.md` — the accounts in the live `users` table, where they came from, and how to sign in
- `DESIGN_SYSTEM.md` — tokens, components and layout rules
- `PLACEHOLDERS.md` — every stand-in and what replaced it
- `docs/superpowers/specs/` — the design spec and per-phase plans
