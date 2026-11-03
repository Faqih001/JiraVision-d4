# Organization Visibility & Calendar Range Picker — Design

Date: 2026-11-03 · Status: implemented · Approved by owner via "proceed with best case scenarios"

## 1 · Organization / team-member visibility

**Problem.** Members in the same company could not reliably see each other; every team
surface (directory, assignee pickers, workload, mood, leaderboard) treated the whole
user table as one workspace, so accounts on different organizations leaked into each
other — while two real teammates (fakiiahmad001, mohammedfakii18) had no shared scope.

**Research.** Slack: workspace membership is the visibility boundary; a person belongs
via invitation/join and sees exactly that workspace's directory. Notion: workspace
members + guest invites; no self-discovery by email domain. Atlassian: organization →
site separation; org admins control who is in which product site. None auto-join users
by email domain; all treat "no organization" as a personal/free account with disabled
team surfaces.

**Decision (best case chosen).**
- New `organizations` table (id, name ≤120, owner_id, created_at) plus nullable
  `users.organization_id` and `workspace_invitations.organization_id` (set-null FKs).
  Additive-only migration: `scripts/create-organizations-table.mjs` (`--dry-run`/`--apply`,
  backfills an 'AAC Kenya' org for the two owner accounts) and
  `scripts/rollback-organizations-table.mjs` (guarded by `ORGANIZATIONS_ROLLBACK=yes`).
  `users↔organizations` FK cycles need the explicit `(): AnyPgColumn` return type in
  drizzle/schema.ts to survive TS inference.
- Membership arrives only through: accepting an invitation (the invitation carries the
  inviter's org id; accept writes it onto the user) or creating an organization from the
  team page (creator becomes owner; one org per user — a second create is rejected 409).
  No email-domain auto-join (rejected: leaks members of shared ISP domains).
- Visibility reads: `lib/organizations.ts` — `visibleIdsFor(orgId, viewerId, memberIds)`
  returns the roster for org members and `[viewerId]` for org-less accounts;
  `loadVisibleMemberIds` is the one-roundtrip helper.
- Choke points scoped instead of touching 30+ pages: `getDashboardOverview()` (workload
  = the app's member directory feeding every assignee picker, team mood, leaderboard) and
  `GET/POST /api/team/members`. Invitations created by an admin inherit the admin's org.
- Org-less experience: team page shows a personal-account card with "Create
  organization"; rosters show only the viewer; nothing errors.
- APIs: `GET/POST /api/org` (session-gated), invitation insert reads `loadUserOrgId`.

## 2 · Calendar upgrade (shadcn range picker + working days)

**Problem.** Native `type="date"` inputs: no ranges, OS chrome, opens above the input,
weekends counted like any other day.

**Decision (best case chosen).**
- `lib/working-days.ts` — pure ISO-day math: `toIsoDate`/`fromIsoDate` (strict
  YYYY-MM-DD, rejects rollover), `isWeekend`, `workingDaysBetween` (inclusive Mon–Fri,
  null on invalid endpoints, swap on reversed), `formatDay`.
- `components/ui/date-range-picker.tsx` — `DateRangePicker` (mode="range", two months,
  Popover `side="bottom"`) and `DateField` (mode="single"), values round-tripping as the
  same "YYYY-MM-DD" strings every URL state/API already uses. Weekends are muted and
  disabled by default; the footer's "I am needed this weekend" checkbox re-enables them
  for the open session only (per-open, never persisted). Footer shows the working-day
  count and Clear.
- react-day-picker v8.10 specifics: weekend matcher is `{ dayOfWeek: [0, 6] }`; custom
  modifier styling goes through `modifiersClassNames`, not `classNames`.
- Wired: worklog custom range, reports custom period, sprints date filter and sprint
  dialog start/end, task due dates (tasks dialog, dashboard quick-draft, add-task modal),
  calendar event date. Native inputs elsewhere (kanban, goals, planner, retros, billing,
  ops, wellbeing) intentionally untouched — out of approved scope.

## Testing

`tests/unit/working-days.test.ts` (11) and `tests/unit/organizations.test.ts` (5, pure
helpers); full vitest suite and `tsc --noEmit` as gates. Live Neon application is a
separate owner-approved checkpoint (dry-run first, counts shown, one recommended option).
