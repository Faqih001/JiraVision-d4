# Phase 13 — Career UI and review

Date: 2026-10-27
Spec: §11 and phase 13 of `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the member career page, the admin ladder/review workspace, the request lifecycle with frozen evidence, the sign-off loop, and make `seniorityTierOf` prefer a real placement.

**Architecture:** Phase 12 built the five tables, the pure readiness math, and read-only routes. Phase 13 adds the writes and the two surfaces. Every percentage is still computed server-side from counted rows; a request freezes that output plus the row refs it came from, so the reviewer reads a stable artefact. Admin writes are gated by `isSuperAdmin` in the route, not the button. No migration.

**Tech Stack:** Next.js 16.1.1 App Router, React 19, drizzle-orm, Neon Postgres, Vitest 5, shadcn/ui, lucide-react

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`

## Global Constraints

- `npm run typecheck` → 0 errors; `npm run lint` → 0 errors (only the pre-existing `components/planner/gantt.tsx:43` error remains, untouched); `npm test` → green before commit.
- **No migration.** All five tables and columns exist since phase 12.
- Every member read/write scopes by `session.id`, never by an id in the body or query string. Admin routes additionally require `isSuperAdmin`.
- A readiness percentage is never accepted from a request body; it is recomputed from rows.
- `career_levels.band_*` is the only place a pay band exists. No route writes a band anywhere else, and no member can write a band.
- A member cannot tick their own checklist. `career_signoffs.ticked_by` is the admin's id, set in the route.
- Notifications go through `createNotification`/`notifyMany` with a `link`; `"career"` is added to `NOTIFICATION_TYPES`.
- Two vocabularies stay separate: `gamification.level` is XP ("XP level"); the ladder says "Career level".
- Wording rules: "band not published" until a real range exists; no invented currency, range, percentage or level.

---

## API contracts

| Route | Method | Who | Body / query | Returns |
| --- | --- | --- | --- | --- |
| `/api/career/me` | GET | member | `?discipline=` | existing payload + `admin`, `signoffs`, `latestRequest`, `history` |
| `/api/career/me/evidence` | GET | member | `?discipline=&signal=` | `{ signal, rows, truncated, total, windowStart, windowDays, asOf }` |
| `/api/career/signoffs` | GET | admin | `?userId=&discipline=` | `{ member, placement, current, next }` with signoff details |
| `/api/career/signoffs` | POST | admin | `{ userId, levelId, itemKey, status, note? }` | the upserted sign-off |
| `/api/career/requests` | GET | member/admin | `?status=` | member: own; admin: all, with member + reviewer names |
| `/api/career/requests` | POST | member | `{ discipline }` | `{ id, status: "submitted" }`; freezes evidence |
| `/api/career/requests/[id]/approve` | POST | admin | — | request + placement; notifies the member |
| `/api/career/requests/[id]/return` | POST | admin | `{ note }` | request; notifies the member |
| `/api/career/placements` | GET | admin | — | `{ members, placements }` for the placement editor |
| `/api/career/placements` | POST | admin | `{ userId, discipline, level, note? }` | the upserted placement |
| `/api/career/levels` | GET | member/admin | `?all=1` (admin) | active rungs; all rungs for the admin editor |
| `/api/career/levels/[id]` | PATCH | admin | copy, band, targets, checklist, active | the updated rung |

## Tasks

### Task 1: Request lifecycle vocabulary (pure)

**Files:** create `lib/career/review.ts`, `tests/unit/career-review.test.ts`

- `CAREER_REQUEST_STATUSES = ["draft","submitted","approved","returned"] as const`; `isCareerRequestStatus`.
- `isOpenRequest(status)` → `"draft" | "submitted"`; `canReview(status)` → `"submitted"`.
- `nextLevelOf(level)` → `1→2, 2→3, 3→4, 4→null`, anything else `null`.
- `latestRequest<T extends { requestedAt: string }>(rows)` → newest by `requestedAt`, else `null`.
- `readChecklist(value)` → `{ ok: true, items } | { ok: false, error }`: array ≤ 20; each item `{ key ≤ 80, label ≤ 200, hint ≤ 300 }`, trimmed, unique keys, no empty label. Stored jsonb still goes through `normaliseChecklist`.
- `readTargets(value)` → `{ ok: true, targets } | { ok: false, error }`: object; unknown keys and non-integer/negative/>1,000,000 values are errors; absent keys are fine.

Test cases: each status predicate; `nextLevelOf` at 1–4 and 0/5; latest-request ordering; duplicate/empty/oversized checklist keys; unknown signal key; negative target.

- [x] Write the failing test, run it, implement, run it green.

### Task 2: Band validation (pure)

**Files:** create `lib/career/bands.ts`, `tests/unit/career-bands.test.ts`

- `readBand({ min, max, currency })` → `{ ok, band }` or `{ ok: false, error }`.
  - Both absent/null → `{ min: null, max: null, currency: null }` (unpublished is valid).
  - Exactly one of min/max → error `"Publish both a minimum and a maximum, or neither."`
  - Numbers must be finite integers ≥ 0; `min ≤ max`.
  - Currency required with numbers: exactly three letters, uppercased.
- `formatBand(band)` → `null` when unpublished; otherwise `"min–max CUR"` with thousands separators (no symbol is invented).

Test cases: null/null/null; 10/20/usd; 20/10; -1/5; 10/20/"US"; 10/20/"USDD"; min only; max only; format null and formatted.

- [x] TDD cycle as above.

### Task 3: Seniority from a real placement (pure)

**Files:** create `lib/career/seniority.ts`, `tests/unit/career-seniority.test.ts`; modify `app/api/ethical-metrics/route.ts` (import instead of local function)

- `type SeniorityTier = 1 | 2 | 3`.
- `tierFromCareerLevel(level)` → `1→1, 2→2, 3→3, 4→3`, anything else `null`.
- `seniorityTierOf(jobTitle, role, careerLevel?)` → the placement tier when `tierFromCareerLevel` is non-null, otherwise the existing job-title/role heuristic (principal/staff/architect/director/head of/vp/lead/manager/scrum master/chief → 3; intern/junior/graduate/assistant/apprentice/trainee → 1; else 2).
- `senioritySource(careerLevel)` → `"placement" | "job_title"`.

Move the function out of the route and import it; keep `SeniorityTier` and `SENIORITY_LABEL`/`SENIORITY_WEIGHT` in the route. Test the L1–L4 mapping, the heuristic fallback with no placement, placement winning over a contradicting job title, and invalid levels.

- [x] TDD cycle; then `npx tsc --noEmit`.

### Task 4: Evidence and profile readers

**Files:** create `lib/career/evidence.ts`, `lib/career/profile.ts`; modify `app/api/career/me/route.ts`, `tests/unit/career-routes.test.ts`

`lib/career/evidence.ts` (DB-facing):
```ts
export const MAX_EVIDENCE_ROWS = 200
export type CareerEvidenceRow = { id: number; label: string; date: string | null }
export type SignalEvidence = { rows: CareerEvidenceRow[]; truncated: boolean }
export type CareerEvidence = Record<CareerSignalKey, SignalEvidence>
export async function collectCareerEvidence(input: {
  userId: number; startDay: string; timeZone: string; keys?: readonly CareerSignalKey[]
}): Promise<CareerEvidence>
```
One query per requested signal, every one `WHERE user_id = ${userId}` and inside the window. Distinct days use `DISTINCT ON (worked_on)`; completed tasks read `tasks` + a done `task_events` row; disciplines are distinct task disciplines; promoted rows require `source='promote'`, `actor_id = userId`, `source_plan_id IS NOT NULL`. Fetch `MAX_EVIDENCE_ROWS + 1` and set `truncated`.

`lib/career/profile.ts`:
- `loadCareerProfile({ userId, discipline, timeZone })` returns the current `/api/career/me` data plus:
  - `admin: boolean` (the route fills this from the session),
  - `signoffs`: for current and next levels, `{ levelId, itemKey, status, tickedBy, tickedByName, tickedAt, note }`,
  - `latestRequest`: newest request for the discipline with `{ id, status, toLevel, requestedAt, returnNote, reviewedAt }`,
  - `history`: approved requests for the discipline `{ id, fromLevel, toLevel, requestedAt, reviewedAt, effectiveDate, reviewerName }` newest first.
- Keep the existing no-placement, top-of-ladder and readiness semantics exactly. Every read scoped by `userId`.

`/api/career/me` keeps its 401/400/session gate and calls `loadCareerProfile({ userId: session.id, ... })`.

Update `tests/unit/career-routes.test.ts`: the scoping/readiness guarantees now live in `profile.ts`; assert there (`eq(careerPlacement.userId, userId)`, `computeReadiness(`, `countCareerSignals({ userId,`, no `.insert/.update/.delete`) and assert the route passes `session.id` and never reads a percent from the request.

- [x] Implement; run the career tests.

### Task 5: Session/admin helpers, notification type, sign-off and placement routes

**Files:** create `app/api/career/_shared.ts`, `app/api/career/signoffs/route.ts`, `app/api/career/placements/route.ts`; modify `lib/notifications.ts`, `components/notifications-bell.tsx`, `tests/unit/schema-safety.test.ts`

- `_shared.ts`: `careerSession()` (wraps `getSession`), `careerAdmin()` (401 then 403), `bad(message, status)`, `MAX_NOTE = 2000`, `notifyCareerAdmins(actor, { title, body, link })` (users with role admin/superadmin or an `ADMIN_EMAILS` address, excluding the actor).
- Add `"career"` to `NOTIFICATION_TYPES`; add `career: Award` to `TYPE_ICONS`.
- Add `careerSession|careerAdmin` to the `authGated` regex in `tests/unit/schema-safety.test.ts`, next to `worklogSession`/`reportSession`.
- `GET /api/career/signoffs?userId=&discipline=`: admin; member must have a placement in that discipline; return current and next rung rows with the item text, sign-off status, ticker name and time.
- `POST /api/career/signoffs`: admin; validate `userId`, `levelId`, `itemKey`, `status ∈ ticked|declined`, `note ≤ 2000`; the level must be one of that member's placement disciplines and its checklist must contain `itemKey`; upsert on `(userId, levelId, itemKey)` with `tickedBy = admin.id`, `tickedAt = now`.
- `GET /api/career/placements`: admin; `{ members: [{ id, name, email }], placements: [{ userId, memberName, discipline, level, title, placedAt, note }] }`.
- `POST /api/career/placements`: admin; `{ userId, discipline, level, note? }`; user exists, `isLadderDiscipline`, level 1–4 with a `career_levels` row; note ≤ 2000; upsert on `(userId, discipline)`.

No notification is sent for a placement change (the spec only names submit/approve/return).

- [x] Implement; add source assertions for the 401/403 gate, the admin-only writes, and the upsert targets.

### Task 6: Request flow with frozen evidence

**Files:** create `app/api/career/requests/route.ts`, `app/api/career/requests/[id]/approve/route.ts`, `app/api/career/requests/[id]/return/route.ts`

- `POST /api/career/requests`: session; `{ discipline }`; load the member's profile. 400 if no placement, 409 if at the top rung or a draft/submitted request already exists. Build the snapshot server-side:
  ```ts
  { asOf, windowStart, windowDays, discipline, fromLevel, toLevel,
    signals, readiness, signoffs, checklist: { current, next }, targets: next.targets,
    refs: await collectCareerEvidence({ userId, startDay, timeZone }) }
  ```
  Insert `status: "submitted"`, `evidence`, `requestedAt: now`. Notify every other admin with a link to `/admin/career` and the member/discipline in the body.
- `GET /api/career/requests`: session; `?status=` validated against `CAREER_REQUEST_STATUSES`; member sees only `eq(careerRequests.userId, session.id)`; admin sees all and gets `memberName`/`reviewerName`; newest first, limit 100.
- `POST .../approve`: admin; request must be `submitted`; the member's current placement must still equal `fromLevel` and `toLevel === fromLevel + 1` (else 409 "The member's placement changed…"). Transaction: update the request (`approved`, `reviewedBy`, `reviewedAt`, `effectiveDate = localDay(now, member.timezone)`) and upsert `career_placement` (`level = toLevel`, `placedBy`, `placedAt`, note `Approved request #id`). Notify the member with a link to `/dashboard/career`.
- `POST .../return`: admin; note required, ≤ 2000; request must be `submitted`; set `returned`, `returnNote`, reviewer fields; notify the member with the note (first 200 chars).

- [x] Implement; assert tests: session/admin gates, evidence built by `collectCareerEvidence` (never from the body), `reviewedBy` from the session, notification calls, and no `percent` read from the request.

### Task 7: Ladder read and edit routes

**Files:** modify `app/api/career/levels/route.ts`; create `app/api/career/levels/[id]/route.ts`

- `GET /api/career/levels`: session; active only unless `?all=1` and the session is super-admin; include normalised `signals` and `checklist`.
- `PATCH /api/career/levels/[id]`: admin; `title` required 1–200; `summary`/`expectations` null or ≤ 2000; `band` via `readBand`; `signals` via `readTargets`; `checklist` via `readChecklist`; `isActive` boolean. Update `updatedAt`. Never touches `career_placement`, `career_signoffs` or any member row.

- [x] Implement; assert the PATCH is admin-only, the band validator is used, and a checklist key is capped at 80 characters.

### Task 8: Member page

**Files:** create `app/dashboard/career/page.tsx`, `app/dashboard/career/[discipline]/page.tsx`, `app/dashboard/career/career-client.tsx`, `app/dashboard/career/readiness-panel.tsx`; modify `components/dashboard-layout.tsx`

- Server pages: Suspense + skeleton; `[discipline]` awaits `params`, passes the discipline to the client; no DB import in the page.
- Client (`career-client.tsx`): fetch `/api/career/me?discipline=`; states for loading, error, no placement, top of ladder. Placement card; discipline switcher built from `placements`; "Admin: ladder & review" link only when `data.admin`.
- `readiness-panel.tsx`: big percentage, `signalPercent`/`checklistPercent`, cap reason when `capped`; nine signal rows with `actual/target` and a bar; each row expands and fetches `/api/career/me/evidence?signal=&discipline=` to list label + date (empty → "Nothing counted in this window"); current and next checklist with ticked-by/when (or "Awaiting admin sign-off"); band card: "Band not published" when `!band.published`, else `formatBand`.
- Request card: no open request → button "Request promotion to {next.title}"; submitted → "Awaiting review since …"; returned → the note plus a new-request button; top of ladder → "You are at the top of this ladder."
- History timeline: approved requests with from→to, effective date, reviewer.
- Add a "Career" nav item (`TrendingUp`) after Work Reports, active for `/dashboard/career` and subpaths.
- Do not build the Growth AI panel (phase 14).

- [x] Implement; add source guards: no local percentage calculation, requests go to `/api/career/requests`, evidence to `/api/career/me/evidence`, "Band not published" copy exists, admin link gated.

### Task 9: Admin page

**Files:** create `app/admin/career/page.tsx`, `app/admin/career/ladder-editor.tsx`, `app/admin/career/placement-panel.tsx`, `app/admin/career/review-queue.tsx`

- Page fetches `/api/career/levels?all=1`; 401/403 → "Super-admin access required." Tabs: Ladder, Placements, Review queue.
- Ladder editor: discipline selector; one card per rung with title/summary/expectations, band min/max/currency (blank means unpublished, with that sentence), nine target inputs, checklist rows (key/label/hint, add/remove), active switch; Save per rung → PATCH; show the server error verbatim.
- Placements: member list from the GET; per-member discipline/level/note form → POST; expandable sign-off panel for the selected member/discipline: current and next rung items with Tick/Decline buttons → POST `/api/career/signoffs`; show who ticked and when.
- Review queue: submitted requests with the frozen evidence beside the decision: percent, capped reason, signals actual/target, ref counts, window and as-of; Approve; Return with a required note. Below, approved and returned history.
- No bulk actions, no self-service placement.

- [x] Implement; add source guards for the admin gate, the three panels, and the band sentence.

### Task 10: `seniorityTierOf` prefers a placement

**Files:** modify `app/api/ethical-metrics/route.ts`, `app/dashboard/ethical-metrics/page.tsx`; create `tests/unit/ethical-metrics-career.test.ts`

- `computeLive` loads `career_placement` rows and builds `Map<userId, max level>`; each member's tier is `seniorityTierOf(jobTitle, role, maxLevel)` and the payload gains `senioritySource: "placement" | "job_title"`.
- The priority matrix row shows `seniorityLabel` plus "· ladder" or "· job title"; the chart note and the honesty notes say tiers come from the ladder when a placement exists, otherwise from job title + role, and that `career_placement` is now one of the rows read.
- Test: route imports `careerPlacement`, passes the level as the third argument, the page renders the source, and both honesty paragraphs mention the ladder.

- [x] Implement; run typecheck and the ethical guard.

### Task 11: Docs and gates

**Files:** `FEATURES.md` (§18), `README.md` (route/page counts, career surfaces), spec phase 13 line, this plan

- FEATURES §18: surfaces, request states, frozen evidence, the cap, sign-off rule, band rule, notifications, the ethical-metrics integration, deliberate absences, guard files and suite count.
- Spec phase 13 marked shipped with "what the phase added beyond this line" and the suite count.
- README: add `/dashboard/career` and `/admin/career` to the layout, update API-handler and dashboard-page counts if literal, mention the career routes.
- Gates: `npx tsc --noEmit`, `npm run lint`, `npm test`; `git status`/`git log` first (concurrent auto-commit watcher), stage only phase-13 files, commit `feat(career): phase 13 — career page, review flow and admin ladder`, push under the standing grant.
- Update project memory `jiravision-worklog-reports-phases.md` (phase 13 shipped; next 14 growth AI, 15–16 registers/playbooks, 17 onboarding).

## Deliberately absent

- **Growth AI panel** — phase 14 owns learning paths, benchmarks, periodic reviews and gap tasks. No disabled four-action panel is rendered here; a fake panel would be worse than its absence.
- **Ladder editor history/audit** — the rung edits are not versioned; the checklist wording stays reviewable in git.
- **Sign-off migration when an admin renames a checklist key** — old sign-offs keep the old key and become unused; the admin sees the new key un-ticked.
- **Withdrawing a submitted request** — not in the spec; a returned request can be resubmitted as a new one.
- **Bulk placement or bulk sign-off**, CSV export of the ladder, and a member directory on the career page.
- **A pay record** — none exists and none is added.

## File ownership

- `lib/career/{review,bands,seniority,evidence,profile}.ts` — new
- `app/api/career/{_shared.ts,signoffs/route.ts,placements/route.ts,me/evidence/route.ts,requests/route.ts,requests/[id]/approve/route.ts,requests/[id]/return/route.ts,levels/[id]/route.ts}` — new; `me/route.ts`, `levels/route.ts` — extended
- `app/dashboard/career/*`, `app/admin/career/*` — new
- `app/api/ethical-metrics/route.ts`, `app/dashboard/ethical-metrics/page.tsx` — extended
- `lib/notifications.ts`, `components/notifications-bell.tsx`, `components/dashboard-layout.tsx` — extended
- `tests/unit/{career-review,career-bands,career-seniority,career-review-routes,career-pages,ethical-metrics-career}.test.ts` — new; `career-routes.test.ts`, `schema-safety.test.ts` — updated
- `FEATURES.md`, `README.md`, spec, this plan — docs
