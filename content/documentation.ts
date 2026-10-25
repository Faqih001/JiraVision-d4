// The single documentation catalogue for /resources/documentation.
// Both the index page and the [slug] reader import from here, so an index link
// can never point at a doc that does not exist.
//
// Everything below describes features that are actually implemented in this
// repo (dashboard routes, /api routes, lib helpers). No SDKs, no bearer tokens,
// no external docs/community sites — those do not exist and are not claimed.

export type DocEndpoint = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  path: string
  description: string
}

export type DocExample = { title: string; code: string }

export type DocEntry = {
  slug: string
  title: string
  description: string
  category: DocCategoryId
  /** markdown-lite: `#`/`##`/`###` headings, `- ` bullets, `1.` steps, blank lines */
  content: string
  endpoints?: DocEndpoint[]
  examples?: DocExample[]
}

export type DocCategoryId =
  | "getting-started"
  | "team"
  | "delivery"
  | "api"
  | "insights"
  | "support"

export type DocCategory = {
  id: DocCategoryId
  title: string
  description: string
  /** lucide icon name, resolved by the index page */
  icon: string
}

export const docCategories: DocCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Sign in, set up your workspace and learn the basics",
    icon: "FileText",
  },
  {
    id: "team",
    title: "Team & Governance",
    description: "Members, roles, workspace settings and wellbeing",
    icon: "Users",
  },
  {
    id: "delivery",
    title: "Delivery",
    description: "Tasks, boards, sprints, retros and notifications",
    icon: "KanbanSquare",
  },
  {
    id: "api",
    title: "API Reference",
    description: "Endpoints, cookie-session auth and rate limits",
    icon: "Code",
  },
  {
    id: "insights",
    title: "Reporting & Analytics",
    description: "Dashboards, metrics, reports and exports",
    icon: "BarChart",
  },
  {
    id: "support",
    title: "Troubleshooting",
    description: "Common issues, error shapes and system status",
    icon: "LifeBuoy",
  },
]

export const documentation: Record<string, DocEntry> = {
  "getting-started": {
    slug: "getting-started",
    title: "JiraVision overview",
    description: "What the product is, where each feature lives and how the pieces fit together.",
    category: "getting-started",
    content: `
# JiraVision overview

JiraVision is an AI-assisted project management workspace. This page maps the product so you know
where to go for each job.

## What you get

- Delivery: tasks, a kanban board, a backlog, sprints, goals and a calendar
- AI: an AI Scrum Master that drafts sprint plans and writes a rationale you can reject
- People: team wellbeing check-ins, gamification, ethical metrics and team chat
- Operations: reports with CSV/JSON export, an activity feed, automations, billing and settings
- Governance: team workspace settings, role changes with an audit log, and a super-admin content
  manager for the marketing pages

## Where things live

1. Sign in at /login (or create an account at /signup).
2. The dashboard shell lives at /dashboard. The left navigation is grouped into Main, Planning,
   AI Features, Team, Metrics and Applications.
3. Every dashboard page reads and writes through /api routes — there is no mock data layer in the
   signed-in app.
4. Marketing pages (home, pricing, products, solutions, resources) are editable by a super-admin
   from /admin/cms.

## How data flows

- Your session is a pair of HttpOnly cookies (session_id and user_id). See the authentication doc.
- Dashboard mutations write a row to Postgres and then create a notification for the people
  affected.
- Notifications reach open browsers through the SSE feed at /api/notifications/live, which is what
  drives the bell in the top bar.

## What this product is not

- There is no public SDK and no bearer-token API. The API is the same cookie-session API the
  dashboard uses.
- Direct Jira site import is configuration-only in this build; the CSV importer is the real path.
- Wellbeing never reads message content. Check-ins are self-reported and aggregated.
    `,
  },

  "quick-start": {
    slug: "quick-start",
    title: "Quick start",
    description: "From an empty account to a planned sprint in about ten minutes.",
    category: "getting-started",
    content: `
# Quick start

This walkthrough uses only routes that exist in the app. Follow it top to bottom.

## 1. Create your account

1. Go to /signup and submit the form. It posts to /api/auth/register.
2. Sign in at /login. That posts to /api/auth/login and sets the session_id and user_id cookies.
3. Confirm the session with GET /api/user/current — it returns the signed-in user row.

## 2. Set your profile

1. Open /dashboard/settings.
2. Fill in Profile (name, role, timezone) — it saves through PATCH /api/user/profile.
3. Upload an avatar if you want one; it posts to /api/user/avatar/upload and is stored in object
   storage.
4. Leave Notifications on so the bell in the top bar receives events.

## 3. Add your team

1. Open /dashboard/team.
2. Add a member. The form posts to /api/team/members and creates a notification for that person.
3. Promote someone to admin with the role control on their row — it patches
   /api/team/members/<id>/role and writes an entry to the role audit log.

## 4. Create work

1. Open /dashboard/tasks and create a task: title, description, status, priority, story points,
   assignee, due date and tags.
2. Switch between grid and list view with the toggle in the toolbar; filters and search are applied
   server-side through GET /api/tasks.
3. Drag the same task on /dashboard/kanban. Drops call /api/dashboard/kanban/reorder and
   /api/dashboard/kanban/update-status.

## 5. Plan a sprint

1. Open /dashboard/sprints and create a sprint with a start and end date.
2. Assign tasks to it (sprintId on the task) from /dashboard/backlog.
3. Open /dashboard/ai-scrum-master to generate a capacity-aware draft plan. Nothing is written to
   your board until you approve the draft.

## 6. Check the signals

1. /dashboard/team-wellbeing for anonymous check-ins and workload.
2. /dashboard/ethical-metrics for the documented team-level indicators and their formulas.
3. /dashboard/reports to build a report, then export it as CSV or JSON.

## Next

- Read the notifications doc to understand the bell and the SSE feed.
- Read the API reference if you want to script any of the above.
    `,
    endpoints: [
      { method: "POST", path: "/api/auth/register", description: "Create an account." },
      { method: "POST", path: "/api/auth/login", description: "Exchange credentials for the session cookies." },
      { method: "GET", path: "/api/user/current", description: "Return the signed-in user." },
      { method: "GET", path: "/api/tasks", description: "Paginated, filterable task list." },
    ],
  },

  "workspace-setup": {
    slug: "workspace-setup",
    title: "Account & workspace setup",
    description: "Profile, password, sessions, preferences and the settings audit feed.",
    category: "getting-started",
    content: `
# Account & workspace setup

/dashboard/settings is the personal control centre. It is organised into cards, each backed by a
real read/write endpoint.

## Profile and account

- Profile: name, role, timezone and bio. Saves through PATCH /api/user/profile.
- Avatar: upload with POST /api/user/avatar/upload, remove with POST /api/user/avatar/remove.
- Account: shows the email the session belongs to. Changing it requires a password confirmation.

## Password and sessions

- Security · password posts to /api/auth/forgot-password, which issues a reset token and emails the
  link. The link lands on /reset-password and posts to /api/auth/reset-password.
- Sessions lists active session cookies and lets you end one. Ending a session calls
  POST /api/auth/logout for the current browser.

## Preferences and defaults

- Preferences: theme, density and language. Persisted per user through /api/settings/<key>.
- Task defaults: the status, priority and story points pre-filled on the create-task form.
- Notifications: which event types reach your bell. Workspace-wide notification switches live in
  /dashboard/team/settings instead.

## Data and safety

- Data export downloads your own records. Bulk dataset export is documented in the data export doc.
- Settings audit feed lists every settings write with the actor and timestamp — the same pattern the
  team role audit log uses.
- Danger zone: requesting account deletion checks that you have no open assigned tasks, records a
  deletionRequestedAt flag and a system notification for manual review. You can cancel the request
  before review.

## Workspace-wide settings

Team name, workspace notification switches and role governance live in /dashboard/team/settings and
are restricted to admin and super-admin roles.
    `,
    endpoints: [
      { method: "GET", path: "/api/settings", description: "All persisted settings for the signed-in user." },
      { method: "PATCH", path: "/api/settings", description: "Merge a partial settings object." },
      { method: "GET", path: "/api/settings/<key>", description: "Read one setting." },
      { method: "PUT", path: "/api/settings/<key>", description: "Write one setting." },
      { method: "DELETE", path: "/api/settings/<key>", description: "Reset one setting to its default." },
      { method: "PATCH", path: "/api/user/profile", description: "Update profile fields." },
      { method: "POST", path: "/api/auth/forgot-password", description: "Issue a password reset token." },
    ],
  },

  "importing-data": {
    slug: "importing-data",
    title: "Importing and moving data",
    description: "The CSV importer, the Jira configuration card, and what each one really does.",
    category: "getting-started",
    content: `
# Importing and moving data

## The CSV importer (real)

/dashboard/integrations has a CSV bulk tasks card. It is the supported way to bring work in.

1. Export your current board from Jira (or any tool) as CSV.
2. Open /dashboard/integrations and select CSV bulk tasks.
3. Choose the delimiter (comma, semicolon or pipe) and whether to skip invalid rows.
4. Run the import. Rows are created through the task write path, so each imported task gets an id,
   timestamps and shows up in /dashboard/tasks immediately.

Column mapping follows the task fields: title, description, status, priority, story points,
assignee, sprint, due date and tags.

## The Jira card (configuration-only)

The Jira import card records a site URL and project key and lets you test the connection, but this
build makes no call to Atlassian APIs. Treat it as configuration you can review, not as a sync. If
you need data in now, use the CSV importer.

## Other integration cards

- Slack: incoming webhook URL, channel and subscribed events.
- GitHub: repository URL, default branch and PR auto-linking.
- Google Calendar: internal calendar feed only — no Google sync happens in this build.
- Webhooks: an endpoint URL, an optional signing secret and the events to send.
- Zapier: a catch-hook URL and a trigger event.

Each card persists its configuration to your account preferences, supports a draft state you publish
later, and can be tested from the same dialog.

## Moving data out

Use GET /api/reports/export with format=csv or format=json for datasets, and the Data export card in
/dashboard/settings for your own records.
    `,
    endpoints: [
      { method: "GET", path: "/api/integrations", description: "List saved integration configurations." },
      { method: "PUT", path: "/api/integrations/<key>", description: "Save one integration configuration." },
      { method: "POST", path: "/api/integrations/test", description: "Test an integration configuration." },
      { method: "POST", path: "/api/integrations/import", description: "Run the CSV bulk task import." },
      { method: "GET", path: "/api/reports/export", description: "Download a dataset as CSV or JSON." },
    ],
  },

  "inviting-users": {
    slug: "inviting-users",
    title: "Adding team members",
    description: "How the team page creates members, what they receive and how removal works.",
    category: "team",
    content: `
# Adding team members

## Where

/dashboard/team lists every member with their role, status and workload. The toolbar has an
invite/add control and a link to /dashboard/team/settings for workspace governance.

## Adding a member

1. Open /dashboard/team and choose the add-member control.
2. Enter their name, email and starting role (user, admin or super-admin).
3. Submit. The request posts to /api/team/members, which inserts the user row, applies the
   workspace notification preferences, and creates a "member joined" notification.
4. The new member appears in the list immediately and can sign in at /login once they set a
   password through the reset flow.

## Roles at creation time

- user: the default. Can manage their own tasks, check-ins and settings.
- admin: can also manage members and workspace settings.
- super-admin: everything an admin can do, plus the marketing content manager at /admin/cms.

Only admin and super-admin callers may create members with a privileged role. A non-privileged caller
receives 403 and no row is written.

## Editing and removing

- PATCH /api/team/members/<id> updates name, email, role and status.
- PATCH /api/team/members/<id>/role changes just the role and writes an audit entry.
- DELETE /api/team/members/<id> removes the member and creates a "member removed" notification.

Every one of these writes is reflected in the team audit feed on /dashboard/team/settings.

## Invitations and notifications

There is no third-party email delivery service in this build. "Inviting" means creating the member
record and notifying them in-app; they set their own password from /forgot-password. The bell and the
SSE feed carry the notification.
    `,
    endpoints: [
      { method: "GET", path: "/api/team/members", description: "List members with role and workload." },
      { method: "POST", path: "/api/team/members", description: "Create a member and notify them." },
      { method: "PATCH", path: "/api/team/members/<id>", description: "Update a member." },
      { method: "DELETE", path: "/api/team/members/<id>", description: "Remove a member." },
    ],
  },

  "user-roles": {
    slug: "user-roles",
    title: "Roles & permissions",
    description: "The three roles, what each one unlocks, and how privilege checks behave.",
    category: "team",
    content: `
# Roles & permissions

## The three roles

- user — default. Own work, own settings, own check-ins, chat and gamification.
- admin — everything a user can do, plus member management, role changes and workspace settings.
- superadmin — everything an admin can do, plus the landing-page content manager (/admin/cms) and
  its audit log.

The canonical list lives in lib/team-settings-model.ts as MEMBER_ROLES. normalizeRole() trims and
lowercases input, and isPrivilegedRole() answers the "can this caller govern the workspace?" question
used by the API routes.

## Becoming a super-admin without the role

ADMIN_EMAILS is an environment variable holding a comma-separated allow-list. A signed-in user whose
email is in that list is treated as a super-admin even if their stored role is user. This exists so a
first administrator can bootstrap governance before any role has been granted.

## What a failed check looks like

- Unauthenticated: 401 with { success: false, message: "Unauthorized" }.
- Authenticated but not privileged: 403 with a message naming the required role. No row is written
  and no notification is created.

## Role changes are audited

PATCH /api/team/members/<id>/role records the previous role, the new role, the actor and the
timestamp in team_role_audit. /dashboard/team/settings shows the most recent entries so a promotion
can never be silent.

## Design guidance

- Grant admin for people-management, not for report access. Reports and exports are available to
  every signed-in member.
- Keep superadmin to the people who should be able to edit public marketing copy.
- Prefer the ADMIN_EMAILS bootstrap for the first admin, then grant the role in-app and remove the
  address from the environment if you want the allow-list empty.
    `,
    endpoints: [
      { method: "PATCH", path: "/api/team/members/<id>/role", description: "Change a role; admin only; writes an audit entry." },
      { method: "GET", path: "/api/team/settings", description: "Workspace settings, including the role audit feed." },
      { method: "GET", path: "/api/user/current", description: "The caller's own user row, including role." },
    ],
  },

  "workspace-settings": {
    slug: "workspace-settings",
    title: "Workspace settings",
    description: "Team name, workspace notification switches, governance and the audit feed.",
    category: "team",
    content: `
# Workspace settings

/dashboard/team/settings is the workspace-level counterpart to /dashboard/settings (which is
personal). It is gated to admin and super-admin roles.

## What you can change

- Team name: up to 120 characters, trimmed, blanks rejected.
- Notification switches: five workspace-level toggles decide whether an event creates a notification
  at all — memberJoined, memberRemoved, profileUpdated, roleChanged and wellbeingAlert. Turning one
  off suppresses that notification type for everyone; it does not change what any individual sees in
  their own bell preferences.
- Member roles: change a role from the member table. Every change is recorded.

## How the settings row works

The workspace has a single settings row. GET /api/team/settings creates it on first read with the
documented defaults, so there is nothing to initialise by hand. PUT /api/team/settings accepts a
partial object; unknown keys are dropped, booleans are coerced, and the response includes the name of
the user who last updated it plus an ISO timestamp.

## Audit feed

The page shows the most recent role changes with actor, previous role, new role and when it
happened. The same data is available from the settings payload, so a script can diff it.

## Relationship to personal preferences

1. Workspace switches decide whether an event is recorded at all.
2. Personal notification preferences in /dashboard/settings decide which recorded events reach your
   bell.
3. The SSE feed at /api/notifications/live delivers whatever survives both filters.

## Guarding it

- GET requires a session.
- PUT and role changes require a privileged role; everyone else gets 403.
- Writes create a notification for the affected members when the matching workspace switch is on.
    `,
    endpoints: [
      { method: "GET", path: "/api/team/settings", description: "Read workspace settings; creates the default row on first read." },
      { method: "PUT", path: "/api/team/settings", description: "Write a partial settings object; admin only." },
    ],
    examples: [
      {
        title: "Turn off profile-update notifications",
        code: `PUT /api/team/settings
Cookie: session_id=...; user_id=...
Content-Type: application/json

{ "notifications": { "profileUpdated": false } }

200
{
  "success": true,
  "settings": {
    "teamName": "Delivery",
    "notifications": {
      "memberJoined": true,
      "memberRemoved": true,
      "profileUpdated": false,
      "roleChanged": true,
      "wellbeingAlert": true
    },
    "updatedAt": "2026-10-24T09:12:44Z",
    "updatedByName": "Ada Okonkwo"
  }
}`,
      },
    ],
  },

  "team-wellbeing-setup": {
    slug: "team-wellbeing-setup",
    title: "Team wellbeing setup",
    description: "Anonymous check-ins, workload signals and the aggregation rules.",
    category: "team",
    content: `
# Team wellbeing setup

Team wellbeing combines two signals: a short self-reported check-in and workload numbers that already
exist in the workspace. It never reads message content.

## What it collects

- A wellbeing score from the member's own check-in.
- A workload label (one of the fixed set, defaulting to Balanced).
- An optional free-text note the member writes.
- Task load derived from assigned tasks and their statuses.

That is the whole input surface. There is no sentiment analysis of chat, no keyboard or activity
tracking, and no reading of communications.

## First run

1. Open /dashboard/team-wellbeing.
2. Submit a check-in. It posts to /api/dashboard/wellbeing and creates a row in wellbeing_metrics.
3. The page then shows the 14-day happiness trend, the mood distribution, per-member wellbeing, and
   a workload-vs-wellbeing comparison.
4. Read the "About anonymity" card before sharing any of this with the wider team — it states the
   aggregation rules in the same place the data is shown.

## Alerts

When a check-in moves a member's score, the write path creates a wellbeing notification for that
member naming the previous and current score. The workspace switch wellbeingAlert in
/dashboard/team/settings controls whether that notification is recorded at all.

## Editing a check-in

PATCH and DELETE /api/dashboard/wellbeing/<id> let a member correct or remove their own entry.
Removing it also removes it from the trends on the next render.

## Using it well

- Treat the numbers as a prompt for a conversation, not a verdict on a person.
- Compare workload against wellbeing rather than ranking either one.
- Keep the anonymity rules intact: small groups should be merged rather than shown individually.
- Pair this page with /dashboard/ethical-metrics, which prints the formula behind every indicator.
    `,
    endpoints: [
      { method: "GET", path: "/api/dashboard/wellbeing", description: "Wellbeing rows with workload and trend data." },
      { method: "POST", path: "/api/dashboard/wellbeing", description: "Submit a check-in; notifies the member on score change." },
      { method: "PATCH", path: "/api/dashboard/wellbeing/<id>", description: "Correct your own check-in." },
      { method: "DELETE", path: "/api/dashboard/wellbeing/<id>", description: "Remove your own check-in." },
    ],
  },

  "ai-scrum-master-guide": {
    slug: "ai-scrum-master-guide",
    title: "AI Scrum Master guide",
    description: "Draft plans, health score, velocity forecast, rebalancer and the approval gate.",
    category: "team",
    content: `
# AI Scrum Master guide

The AI Scrum Master lives at /dashboard/ai-scrum-master. It produces drafts and explanations. It does
not change your board on its own.

## The approval gate

Every recommendation is a draft until a human accepts it. Accepting writes the change through the
normal task and sprint endpoints, which means it produces the same notifications and activity entries
as a manual edit. Dismissing a recommendation moves it to the dismissed archive on the same page,
where it stays readable.

## What is on the page

- Sprint health score: a single gauge built from completion, blocker count and scope movement.
- Meeting & PTO load (next 7 days): calendar pressure per member, so a plan can account for absence.
- Burndown projection: actual, ideal and AI-projected lines on one chart.
- Velocity forecast: what the team is likely to complete, based on finished story points from recent
  sprints.
- Workload rebalancer: suggests moving work away from overloaded members and names who could take it.
- Automation log: every run, what it produced, and what you did with it.
- Dismissed archive: recommendations you rejected, with the reason recorded.

## Generating a draft

1. Open /dashboard/ai-scrum-master.
2. Run a recommendation. The call goes to /api/dashboard/ai-recommendation and reads capacity,
   history and skills.
3. Read the rationale. Each suggested item comes with a plain-language reason, not just a score.
4. Accept, edit or dismiss.

## Insights

/api/ai-insights stores generated insights as rows you can list, read and delete. The chat assistant
at /dashboard/chat can also call the generation endpoint (/api/ai/generate) when you ask it about a
sprint.

## Model configuration

The AI settings page lists the configured providers and models (lib/ai-models.ts). The generation
endpoint returns which model answered, so you can see what produced a draft. Provider availability
depends on the keys configured in the environment; when a provider is not configured the endpoint
says so instead of inventing an answer.

## Retrospectives

/dashboard/retros runs the retro side of the cycle: notes, votes on notes, and action items with
owners. Each write goes through /api/retros/<id>/notes, /api/retros/<id>/notes/<noteId>/vote and
/api/retros/<id>/actions.
    `,
    endpoints: [
      { method: "POST", path: "/api/dashboard/ai-recommendation", description: "Generate a capacity-aware sprint draft." },
      { method: "GET", path: "/api/ai-insights", description: "List stored insights." },
      { method: "POST", path: "/api/ai-insights", description: "Store an insight." },
      { method: "DELETE", path: "/api/ai-insights/<id>", description: "Delete an insight." },
      { method: "POST", path: "/api/ai/generate", description: "Chat-style generation. Simulated text until a provider key is configured; the reply labels the model it emulated." },
      { method: "GET", path: "/api/retros", description: "List retrospectives." },
    ],
  },

  "task-fields": {
    slug: "task-fields",
    title: "Task fields & statuses",
    description: "Every field a task carries, the allowed statuses and priorities, and bulk edits.",
    category: "delivery",
    content: `
# Task fields & statuses

## Fields

- title — required, shown everywhere the task appears.
- description — long text.
- status — one of todo, in_progress, review, blocked, done. Defaults to todo.
- priority — one of urgent, high, medium, low. Defaults to medium.
- storyPoints — integer used by velocity and burndown.
- assigneeId — the member who owns it.
- sprintId — the sprint it belongs to; null means backlog.
- dueDate — optional date, surfaced on /dashboard/calendar.
- tags — JSON array of strings, filterable.
- createdAt / updatedAt — server timestamps, returned as UTC ISO strings.

The status and priority lists are exported from components/dashboard-kit.tsx as STATUSES and
PRIORITIES, so the filters, the board columns and the API validation all agree.

## Status semantics

- todo: not started.
- in_progress: actively being worked.
- review: waiting on someone else (code review, design review, approval).
- blocked: cannot proceed; the reason belongs in the description or a comment.
- done: finished. Everything except done counts as open in the dashboard aggregates.

## Creating and editing

1. POST /api/tasks with a JSON body creates a task and notifies the assignee.
2. PATCH /api/tasks/<id> applies a partial update. A status change to done is what the velocity and
   burndown calculations look for, so it moves the charts on the next render.
3. DELETE /api/tasks/<id> removes it.
4. POST /api/tasks/bulk applies one change to many task ids — useful after a sprint review.

## Filtering

GET /api/tasks accepts page, pageSize, status, priority, assigneeId, sprintId and search. The
response is { success, data, pagination }, which is what the grid and list views on /dashboard/tasks
consume.

## Kanban-specific records

The board keeps its own column order and card position in kanban_columns and kanban_tasks, plus
comments and attachments per card. That is why a drag on /dashboard/kanban calls the kanban reorder
and update-status endpoints rather than the plain task endpoint.

## Tags

Tags are free-form strings stored as JSON. Use them for cross-cutting concerns (tech-debt, a11y,
onboarding) rather than duplicating a status.
    `,
    endpoints: [
      { method: "GET", path: "/api/tasks?page=&pageSize=&status=&priority=&assigneeId=&sprintId=&search=", description: "Paginated, filtered task list." },
      { method: "POST", path: "/api/tasks", description: "Create a task; notifies the assignee." },
      { method: "PATCH", path: "/api/tasks/<id>", description: "Partial update." },
      { method: "DELETE", path: "/api/tasks/<id>", description: "Delete a task." },
      { method: "POST", path: "/api/tasks/bulk", description: "Apply one change to many tasks." },
    ],
    examples: [
      {
        title: "Create a task",
        code: `POST /api/tasks
Cookie: session_id=...; user_id=...
Content-Type: application/json

{
  "title": "Replace the login rate limiter",
  "description": "Move to the shared limiter in lib/rate-limit.ts",
  "status": "todo",
  "priority": "high",
  "storyPoints": 5,
  "assigneeId": 9,
  "sprintId": 3,
  "dueDate": "2026-11-04",
  "tags": ["tech-debt", "auth"]
}

201
{ "success": true, "data": { "id": 482, "title": "Replace the login rate limiter", "status": "todo" } }`,
      },
    ],
  },

  "boards-and-views": {
    slug: "boards-and-views",
    title: "Boards, backlog and views",
    description: "Grid vs list, drag-and-drop columns, backlog grooming and the calendar.",
    category: "delivery",
    content: `
# Boards, backlog and views

## Tasks — grid and list

The same dataset rendered two ways. The toolbar toggle switches between a dense grid and a
row-per-task list; both apply the same server-side filters (status, priority, assignee, sprint,
search) and both open the same create/edit dialog. Choose grid when you are scanning, list when you
are reading descriptions.

## Kanban — drag and drop

Columns map to the task statuses. Dragging a card between columns calls the kanban update-status
endpoint; reordering inside a column calls the kanban reorder endpoint. Cards open to a detail panel
with comments and attachments, each persisted through their own endpoints.

## Backlog — grooming

Everything without a sprint. From here you estimate story points, set priority, assign an owner and
pull items into a sprint. This is the page to use before a planning session, and the page the AI Scrum
Master reads when it drafts a plan.

## Calendar — dates

Sprint boundaries, task due dates and calendar events in one month view. Events are full CRUD through
/api/calendar/events and /api/calendar/events/<id>. The Google Calendar integration card produces an
internal feed URL only — it does not sync with Google in this build.

## Choosing a view

1. Planning a sprint: backlog, then the AI Scrum Master draft.
2. Running the day: kanban.
3. Auditing or bulk-editing: tasks in list view, then POST /api/tasks/bulk.
4. Communicating dates: calendar.

## View state is yours

Filters, view mode and column order are part of your persisted settings, so a page comes back the way
you left it. Resetting them is a card in /dashboard/settings.
    `,
    endpoints: [
      { method: "GET", path: "/api/dashboard/kanban", description: "Board columns with their cards." },
      { method: "POST", path: "/api/dashboard/kanban/reorder", description: "Persist a card position." },
      { method: "POST", path: "/api/dashboard/kanban/update-status", description: "Move a card to another column." },
      { method: "GET", path: "/api/dashboard/tasks", description: "Task dataset for the grid and list views." },
      { method: "POST", path: "/api/calendar/events", description: "Create a calendar event." },
    ],
  },

  "sprints-and-goals": {
    slug: "sprints-and-goals",
    title: "Sprints, goals & retros",
    description: "The delivery cycle: sprint CRUD, goal progress, retro notes and action items.",
    category: "delivery",
    content: `
# Sprints, goals & retros

## Sprints

/dashboard/sprints is full CRUD over the sprints table (name, start date, end date, status). Tasks
reference a sprint through sprintId, so a sprint view is a filter rather than a copy of the data.

1. Create the sprint.
2. Pull tasks in from /dashboard/backlog.
3. Watch completion on /dashboard/ai-scrum-master (burndown, velocity forecast, health score).
4. Close it and run a retro.

/api/sprints, /api/sprints/<id> and /api/sprints/<id>/tasks back the page. Sprint-level analytics are
stored separately in sprint_analytics so historical charts stay stable after the sprint closes.

## Goals

/dashboard/goals tracks longer-horizon objectives with owner, target date and progress. Progress is
updated through /api/goals/<id>/progress, and the goals page renders the trend rather than a single
percentage. Link a goal to a sprint when the sprint is the thing that moves it.

## Retrospectives

/dashboard/retros gives each sprint a retro with three kinds of record:

- Notes: what went well, what did not, what to try. Created and deleted through
  /api/retros/<id>/notes and /api/retros/<id>/notes/<noteId>.
- Votes: members vote on notes so the loudest topic is the one you discuss.
  /api/retros/<id>/notes/<noteId>/vote.
- Action items: an owner and a state, carried into the next sprint.
  /api/retros/<id>/actions and /api/retros/<id>/actions/<actionId>.

## The cycle in one picture

1. Backlog grooming — estimate and prioritise.
2. AI draft plan — accept, edit or dismiss each recommendation.
3. Delivery — kanban during the sprint, health score and burndown alongside.
4. Retro — notes, votes, action items.
5. Goals — roll the outcomes up into the objective they serve.

## Notifications

Starting a sprint, closing one, creating an action item and completing a goal each write a
notification for the people affected, which the bell and the SSE feed deliver.
    `,
    endpoints: [
      { method: "GET", path: "/api/sprints", description: "List sprints." },
      { method: "POST", path: "/api/sprints", description: "Create a sprint." },
      { method: "PATCH", path: "/api/sprints/<id>", description: "Update a sprint." },
      { method: "GET", path: "/api/sprints/<id>/tasks", description: "Tasks in one sprint." },
      { method: "PATCH", path: "/api/goals/<id>/progress", description: "Record goal progress." },
      { method: "POST", path: "/api/retros/<id>/actions", description: "Add a retro action item." },
    ],
  },

  "notifications": {
    slug: "notifications",
    title: "Notifications & realtime",
    description: "The bell, event types, the SSE feed and how writes become notifications.",
    category: "delivery",
    content: `
# Notifications & realtime

## The rule

Every dashboard mutation that someone else should know about creates a notification row. That row is
then pushed to open browsers. There is no separate "event bus" to configure.

## Event types

info, task, sprint, mention, wellbeing, gamification, ai, system and cms. The type drives the icon and
colour in the bell feed and is the value you filter on.

## Delivery

1. GET /api/notifications returns your feed, newest first, with read state and an in-app link.
2. GET /api/notifications/live is a Server-Sent Events stream. The browser subscribes once and
   receives new rows as they are written; this is what makes the bell update without a refresh.
3. PATCH /api/notifications/<id> marks one read; DELETE removes it.

If the stream disconnects (sleep, network change) the client resubscribes and falls back to a poll so
nothing is silently lost.

## Writing a notification from your own code

Use createNotification({ userId, type, title, body, link, metadata }) from lib/notifications.ts, or
notifyMany(ids, payload) for a group. link should be an in-app route such as /dashboard/tasks so a
click lands somewhere real.

## Two levels of control

- Workspace switches in /dashboard/team/settings decide whether an event type is recorded at all
  (memberJoined, memberRemoved, profileUpdated, roleChanged, wellbeingAlert).
- Personal preferences in /dashboard/settings decide which recorded events reach your bell.

## Chat notifications

/dashboard/chat has its own unread and mute state through /api/chat/<chatId>/read,
/api/chat/<chatId>/mute and /api/chat/notifications. Muting a conversation stops its notifications
without hiding the messages.

## Debugging

- Nothing arriving: check that the SSE request is open in the network tab and that the workspace
  switch for that event is on.
- Arriving twice: a reconnect can replay recent rows; the feed de-duplicates by id.
- Service reachability: GET /api/health reports Postgres, realtime, storage and functions for the
  signed-in user.
    `,
    endpoints: [
      { method: "GET", path: "/api/notifications", description: "Your notification feed." },
      { method: "GET", path: "/api/notifications/live", description: "SSE stream of new notifications." },
      { method: "PATCH", path: "/api/notifications/<id>", description: "Mark one notification read." },
      { method: "DELETE", path: "/api/notifications/<id>", description: "Delete one notification." },
      { method: "GET", path: "/api/health", description: "Authenticated service reachability report." },
    ],
    examples: [
      {
        title: "Subscribe to the live feed",
        code: `const source = new EventSource("/api/notifications/live")

source.addEventListener("notification", (event) => {
  const row = JSON.parse(event.data)
  // row.type is one of info | task | sprint | mention | wellbeing
  //                | gamification | ai | system | cms
  prependToBell(row)
})

source.onerror = () => {
  source.close()
  pollNotifications() // fall back to GET /api/notifications
}`,
      },
    ],
  },

  "automation-and-activity": {
    slug: "automation-and-activity",
    title: "Automations & the activity feed",
    description: "Rule-based automations, manual runs, and the audit trail of everything that changed.",
    category: "delivery",
    content: `
# Automations & the activity feed

## Automations

/dashboard/automation is where you define rules: a trigger, a condition and an action. Rules are
stored rows with full CRUD through /api/automation and /api/automation/<id>, and each one can be run
on demand with POST /api/automation/<id>/run so you can test it before leaving it enabled.

1. Create the rule and give it a name that says what it does.
2. Run it once manually and read the result.
3. Enable it.
4. Watch the runs on the same page — each run records what it matched and what it changed.

Automations that change tasks go through the same write path as a human edit, so they produce the
same notifications and appear in the activity feed. That is deliberate: nothing should happen in this
workspace without a trace.

## Activity feed

/dashboard/activity lists changes across the workspace with actor, target and timestamp, backed by
/api/activity and /api/activity/<id>. Use it to answer "who moved this task?" or "when did this
sprint start?".

Related audit trails, each on its own page:

- Settings writes: the audit feed card in /dashboard/settings.
- Role changes: the audit feed in /dashboard/team/settings.
- Marketing content edits: /api/admin/cms/audit, shown in /admin/cms.
- Automation runs: the run log on /dashboard/automation.

## Guardrails

- An automation cannot bypass a role check. If the rule's actor lacks permission, the run fails and
  the failure is logged.
- Deleting a rule keeps its historical runs, so the feed stays honest.
- Bulk task changes are recorded once per affected task, not once per run.
    `,
    endpoints: [
      { method: "GET", path: "/api/automation", description: "List automation rules." },
      { method: "POST", path: "/api/automation", description: "Create a rule." },
      { method: "PATCH", path: "/api/automation/<id>", description: "Update a rule." },
      { method: "POST", path: "/api/automation/<id>/run", description: "Run a rule on demand." },
      { method: "GET", path: "/api/activity", description: "Workspace activity feed." },
    ],
  },

  "api-overview": {
    slug: "api-overview",
    title: "API overview",
    description: "Shape of the API, response envelope, and what it is not.",
    category: "api",
    content: `
# API overview

## What it is

The API is the set of Next.js route handlers under app/api — more than 120 of them. It is the same
API the dashboard uses: there is no separate public surface, no version prefix and no API key.

Every route:

- accepts and returns JSON
- reads the session from the request cookies
- is rendered dynamically (no cached responses), so a write is visible on the next read

## Response envelope

Success:

    { "success": true, "data": ... }

Some list routes add pagination:

    { "success": true, "data": [...], "pagination": { "page": 1, "pageSize": 10, "total": 138 } }

Failure:

    { "success": false, "message": "Unauthorized" }

A few older routes return { error: "..." } instead; the error-messages doc lists which status codes
map to which shape.

## Status codes

- 200 read, 201 create
- 400 malformed body or a value the model rejects
- 401 no session
- 403 session exists but the role is not allowed
- 404 the id does not exist
- 409 a conflict, such as deleting an account that still has open assigned tasks
- 429 rate limited
- 500 an unexpected server error; the message field carries the underlying error text

## Timestamps

Postgres TIMESTAMP columns are UTC-naive, so the readers project them with to_char into
YYYY-MM-DDTHH:MM:SSZ strings. Anything ending in Z from this API is UTC.

## What it is not

- No bearer tokens, no OAuth client credentials, no signed API keys.
- No public SDK. The examples in these docs are plain fetch calls.
- No /api/v1 prefix. Paths are exactly the ones listed in the endpoints doc.

## Trying it

Signed in, in the browser console of any dashboard page:

    const r = await fetch("/api/tasks?pageSize=5")
    console.log(await r.json())

The cookies are sent automatically because they belong to the same origin.
    `,
    endpoints: [
      { method: "GET", path: "/api/status", description: "Unauthenticated liveness: { success, message, time }." },
      { method: "GET", path: "/api/health", description: "Authenticated service reachability (Postgres, realtime, storage, functions)." },
      { method: "GET", path: "/api/user/current", description: "The signed-in user row." },
    ],
    examples: [
      {
        title: "Read your own user row",
        code: `const res = await fetch("/api/user/current", { credentials: "same-origin" })

if (res.status === 401) {
  location.href = "/login"
}

const { success, data } = await res.json()
// data.id, data.name, data.email, data.role`,
      },
    ],
  },

  "api-authentication": {
    slug: "api-authentication",
    title: "Authentication",
    description: "Cookie sessions, the auth routes, and how role checks are enforced.",
    category: "api",
    content: `
# Authentication

## Session cookies

Signing in sets two HttpOnly cookies: session_id and user_id. They are sent automatically with every
same-origin fetch, which is why the dashboard never handles a token in JavaScript. Because they are
HttpOnly, client code cannot read them — the settings page reports their names rather than values for
that reason.

## Routes

1. POST /api/auth/register — create an account.
2. POST /api/auth/login — exchange email and password for the session cookies.
3. POST /api/auth/logout — end the current session.
4. GET /api/auth/session — describe the current session.
5. POST /api/auth/forgot-password — issue a reset token and send the link.
6. POST /api/auth/reset-password — consume the token and set a new password.
7. GET /api/auth/verify-token — check a reset token before showing the form.

There is also POST /api/auth/signup, kept for the marketing signup form, which routes into the same
registration path.

## Enforcing it in a route handler

    import { getSession } from "@/lib/auth-actions"

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

For role checks use getCurrentUser() with isSuperAdmin()/isPrivilegedRole() from lib/session and
lib/team-settings-model, and answer 403 rather than 401 when the caller is signed in but not allowed.

## ADMIN_EMAILS

A comma-separated allow-list of emails treated as super-admin regardless of the stored role. It exists
so the first administrator can bootstrap governance. Set it in the environment (and in .env.example
with a note about where the value comes from) rather than in code.

## Password resets

Tokens are stored in password_reset_tokens with an expiry. /forgot-password requests one,
/reset-password consumes it. A token can be used once.

## Development note

Some task routes permit unauthenticated access when NODE_ENV is development or ENABLE_TEST_MODE is
"true", so the CSV importer and scripted tests can run without a browser session. In production that
flag is off and the 401 path applies.
    `,
    endpoints: [
      { method: "POST", path: "/api/auth/login", description: "Sign in; sets session_id and user_id." },
      { method: "POST", path: "/api/auth/logout", description: "End the current session." },
      { method: "GET", path: "/api/auth/session", description: "Current session details." },
      { method: "POST", path: "/api/auth/register", description: "Create an account." },
      { method: "POST", path: "/api/auth/forgot-password", description: "Issue a reset token." },
      { method: "POST", path: "/api/auth/reset-password", description: "Set a new password with a valid token." },
    ],
  },

  "api-endpoints": {
    slug: "api-endpoints",
    title: "Endpoint reference",
    description: "Every route family in the app, grouped by the page it serves.",
    category: "api",
    content: `
# Endpoint reference

Angle brackets mean a path parameter. All routes are same-origin JSON endpoints under /api.

## Auth & profile

- POST /api/auth/register, /api/auth/signup, /api/auth/login, /api/auth/logout
- GET /api/auth/session, /api/auth/verify-token
- POST /api/auth/forgot-password, /api/auth/reset-password
- GET /api/user/current; GET/PATCH /api/user/profile
- POST /api/user/avatar/upload, /api/user/avatar/remove

## Settings

- GET/PATCH/DELETE /api/settings
- GET/PUT/DELETE /api/settings/<key>

## Team & governance

- GET/POST /api/team/members; PATCH/DELETE /api/team/members/<id>
- PATCH /api/team/members/<id>/role
- GET/PUT /api/team/settings

## Tasks & delivery

- GET/POST /api/tasks; PATCH/DELETE /api/tasks/<id>; POST /api/tasks/bulk
- GET /api/dashboard/tasks, /api/dashboard/overview
- GET /api/dashboard/kanban, /api/dashboard/kanban/tasks
- POST /api/dashboard/kanban/reorder, /api/dashboard/kanban/update-status
- GET/POST /api/sprints; PATCH/DELETE /api/sprints/<id>; GET /api/sprints/<id>/tasks
- GET/POST /api/goals; PATCH/DELETE /api/goals/<id>; PATCH /api/goals/<id>/progress
- GET/POST /api/calendar/events; PATCH/DELETE /api/calendar/events/<id>
- GET/POST /api/retros; PATCH/DELETE /api/retros/<id>
- GET/POST/DELETE /api/retros/<id>/notes and /api/retros/<id>/notes/<noteId>
- POST /api/retros/<id>/notes/<noteId>/vote
- GET/POST /api/retros/<id>/actions; PATCH/DELETE /api/retros/<id>/actions/<actionId>
- GET/POST /api/automation; PATCH/DELETE /api/automation/<id>; POST /api/automation/<id>/run
- GET /api/activity; GET/DELETE /api/activity/<id>

## AI

- POST /api/dashboard/ai-recommendation
- GET/POST /api/ai-insights; GET/DELETE /api/ai-insights/<id>
- POST /api/ai/generate
- /api/aitopia/<...path> for the assistant surface

## People signals

- GET/POST /api/dashboard/wellbeing; PATCH/DELETE /api/dashboard/wellbeing/<id>
- GET/POST /api/ethical-metrics; GET/DELETE /api/ethical-metrics/<id>
- GET/PUT /api/ethical-metrics/config; POST /api/ethical-metrics/apply-recommendation
- GET /api/gamification, /api/gamification/me, /api/gamification/<userId>
- GET /api/gamification/achievements, /api/gamification/skills, /api/gamification/rewards
- PUT /api/gamification/configure; POST /api/gamification/rewards/redeem

## Notifications

- GET /api/notifications; PATCH/DELETE /api/notifications/<id>
- GET /api/notifications/live (SSE)

## Chat

- GET/POST /api/chat; PATCH/DELETE /api/chat/<chatId>
- POST /api/chat/dm; GET/POST /api/chat/messages
- PATCH/DELETE /api/chat/messages/<messageId>
- POST /api/chat/messages/<messageId>/reactions, /restore, /permanent-delete
- POST /api/chat/<chatId>/archive, /mute, /read; PATCH /api/chat/<chatId>/settings
- GET /api/chat/notifications

## Reports & analytics

- GET /api/analytics; GET/POST /api/analytics/reports; GET/DELETE /api/analytics/reports/<id>
- GET/POST /api/reports; PATCH/DELETE /api/reports/<id>; POST /api/reports/<id>/run
- GET /api/reports/preview; GET /api/reports/export

## Email

- GET/POST /api/email/digest; PATCH/DELETE /api/email/digest/<id>
- GET/PATCH /api/email/preferences
- GET/POST /api/email/templates; PATCH/DELETE /api/email/templates/<id>

## Billing

- GET /api/billing/summary, /api/billing/subscription, /api/billing/transactions
- PATCH /api/billing/subscription; GET/DELETE /api/billing/transactions/<id>
- GET/PATCH /api/billing/settings

## Integrations

- GET /api/integrations; PUT /api/integrations/<key>
- POST /api/integrations/test, /api/integrations/import

## Admin & platform

- GET/PUT /api/admin/cms; GET /api/admin/cms/audit (super-admin only)
- GET /api/status (public), GET /api/health (authenticated)
- POST /api/contact, /api/newsletter, /api/newsletter/confirm, /api/careers, /api/quote
- GET /api/storage/<...key>
- POST /api/setup (only while the users table is empty), GET /api/demo
- /api/test/tasks, /api/test/tasks/<id>, /api/test/tasks/bulk (development only)
    `,
    endpoints: [
      { method: "GET", path: "/api/dashboard/overview", description: "Aggregate payload behind the main dashboard." },
      { method: "GET", path: "/api/analytics", description: "Analytics datasets for the charts." },
      { method: "GET", path: "/api/reports/export", description: "CSV or JSON download of a dataset." },
    ],
  },

  "api-rate-limits": {
    slug: "api-rate-limits",
    title: "Rate limits",
    description: "Where limiting is applied, the defaults, and how to respond to a 429.",
    category: "api",
    content: `
# Rate limits

## Where limiting is applied

Rate limiting is applied to the endpoints that can be abused by an anonymous caller, not to every
route. Today that is:

- POST /api/newsletter — 5 requests per minute per IP.
- The shared form handler in lib/forms/handler.ts, which backs /api/contact, /api/careers and
  /api/quote — limited per minute by the maxPerMinute argument each caller passes.

Authenticated dashboard routes rely on the session instead: a caller has to be signed in, and every
write is attributed and recorded in the activity feed.

## Defaults

lib/rate-limit.ts uses a fixed window with windowMs = 60000 and max = 5 unless the caller overrides
them. The counter is in-process, so it resets when the server process restarts and is per instance
rather than globally shared.

## What a limited response looks like

    HTTP/1.1 429 Too Many Requests
    { "success": false, "message": "Too many requests. Please try again later." }

## Handling it in a client

1. Read the 429 and stop retrying immediately.
2. Wait for the window to roll over — at most windowMs.
3. Retry once. If it fails again, surface the message to the person rather than looping.

## Changing a limit

Pass your own window and max where the limiter is constructed. Keep the values in the route file next
to the handler so the limit is discoverable, and add any new environment-driven value to .env.example
with a note about where it comes from.

## Bulk work

If you need to move a lot of tasks, use POST /api/tasks/bulk once instead of many single writes, and
GET /api/reports/export for downloads rather than paging through a list endpoint.
    `,
    endpoints: [
      { method: "POST", path: "/api/newsletter", description: "Rate limited to 5 per minute per IP." },
      { method: "POST", path: "/api/contact", description: "Limited by the shared form handler." },
      { method: "POST", path: "/api/tasks/bulk", description: "One request, many task updates." },
    ],
  },

  "dashboards": {
    slug: "dashboards",
    title: "The dashboard workspace",
    description: "What the main dashboard shows, how filters work, and where each chart comes from.",
    category: "insights",
    content: `
# The dashboard workspace

## The main page

/dashboard is the landing page after sign-in. It is built from section cards, each backed by the same
overview payload from GET /api/dashboard/overview, so the numbers on one page cannot disagree with each
other.

Sections include:

- Sprint burndown — completed story points against the ideal line for the active sprint.
- Velocity — points finished per sprint, from tasks whose status is done.
- Task status mix — the five statuses as a distribution.
- My open priorities — everything assigned to you that is not done, grouped by priority.
- Weekly throughput — tasks completed per week.
- Team mood — the aggregated wellbeing signal, linking through to /dashboard/team-wellbeing.

Around the cards: quick stats, your open work, upcoming due dates, recent activity, the notification
bell, and shortcuts to every other page.

## Filters

The toolbar filters (sprint, status, priority, assignee, range) are applied on the server and change
the payload, not just the rendering. That means a filtered dashboard and an exported report of the
same filter agree.

## Grid and list

Where a section can be shown as a table, the toggle switches between a card grid and a dense list.
The choice is part of your persisted settings, so the page returns the way you left it.

## Other pages

- /dashboard/analytics — velocity trend, cumulative flow, weekly throughput, assignee workload,
  priority mix, due-date pressure, quality signals, wellbeing vs velocity and delivery health.
- /dashboard/reports — saved report schedules, run history and export.
- /dashboard/activity — the workspace audit trail.
- /dashboard/goals — objectives and their progress over time.

## Reading a chart honestly

Every chart here is computed from rows you can also see in a table. If a number looks wrong, open the
underlying list on /dashboard/tasks with the same filter — the two views read the same data.
    `,
    endpoints: [
      { method: "GET", path: "/api/dashboard/overview", description: "Everything the main dashboard renders." },
      { method: "GET", path: "/api/analytics", description: "Datasets for the analytics charts." },
      { method: "GET", path: "/api/activity", description: "Recent workspace activity." },
    ],
  },

  "metrics-guide": {
    slug: "metrics-guide",
    title: "Metrics guide",
    description: "How velocity, throughput, burndown and workload are calculated, and what they exclude.",
    category: "insights",
    content: `
# Metrics guide

## Velocity

Sum of storyPoints on tasks whose status is done, grouped by the sprint they belong to, using updatedAt
as the completion time. A task moved out of done stops counting. Tasks with no story points contribute
zero, which is why unestimated work makes velocity look flat rather than wrong.

## Burndown

Open points at sprint start minus points completed each day, plotted against an ideal straight line
from the sprint start date to its end date. The AI-projected line on /dashboard/ai-scrum-master uses
the same series and extends it.

## Weekly throughput

Count of tasks that reached done in each of the last N weeks. It counts tasks, not points, so it is
comparable across teams with different estimation habits and not comparable to velocity.

## Cumulative flow

Task counts per status per day. Widening bands mean work is accumulating in that status — a review
band that keeps growing is a review-capacity problem, not a coding problem.

## Assignee workload

Open tasks and open points per member, from the same filter the dashboard is using. Pair it with the
wellbeing page before acting on it: load alone does not tell you whether someone is struggling.

## Due-date pressure

Tasks with a dueDate inside the selected range that are not done, grouped by how close the date is.

## Quality signals

Blocked-task count and time in review, both derived from status changes rather than from any code
analysis.

## What is deliberately excluded

- Lines of code, commit counts and keystrokes.
- Per-person velocity rankings.
- Activity or presence scores.

The exclusion list is published on /dashboard/ethical-metrics, which also prints the formula behind
each indicator it shows.

## Comparing teams

Compare throughput and predictability, not velocity. Velocity is only meaningful inside one team's own
history because story points are a local unit.
    `,
    endpoints: [
      { method: "GET", path: "/api/analytics", description: "Metric datasets behind the analytics charts." },
      { method: "GET", path: "/api/dashboard/overview", description: "Headline numbers for the main dashboard." },
      { method: "GET", path: "/api/ethical-metrics", description: "Documented team-level indicators." },
    ],
  },

  "ethical-metrics": {
    slug: "ethical-metrics",
    title: "Ethical metrics",
    description: "Indicators that print their formula, alert thresholds and the refusal list.",
    category: "insights",
    content: `
# Ethical metrics

## The idea

A small set of team-level indicators where every card can open and show how it was calculated: the
formula, the source events and the exclusions. If a number cannot show its working, it does not belong
on the page.

## What is on the page

- Snapshot trend — stored snapshots over time, so a metric can be read as a direction rather than a
  single value.
- Workload balance per member — open load distribution across the team.
- Priority-fairness matrix — who is carrying the urgent and high-priority work, computed from
  /api/tasks rather than from a separate store.
- Load vs seniority band — whether the heaviest load is landing on the least experienced people.
- Alert thresholds & limits — the configuration that decides when an indicator raises an alert.

## Configuring it

1. Open the configure dialog on /dashboard/ethical-metrics.
2. Set thresholds and limits. The draft is stored through /api/ethical-metrics/config.
3. Save. Config changes apply to the next snapshot.

## Applying a recommendation

When an indicator crosses a threshold the page offers a recommendation. Accepting it calls
POST /api/ethical-metrics/apply-recommendation, which performs the underlying change (for example
reassigning load) and records it — it does not silently edit a metric.

## Unavailable state

If the supporting data is missing, the page shows an "Ethical metrics unavailable" card explaining
what is absent instead of rendering zeros. Zeros and missing data are different claims.

## The refusal list

Published alongside the indicators:

- No lines of code.
- No per-person velocity.
- No activity, presence or keyboard-time scores.
- No ranking of people against each other by default.

## Snapshots

Each snapshot is a row you can list and delete through /api/ethical-metrics and
/api/ethical-metrics/<id>. Deleting a snapshot removes it from the trend on the next render.
    `,
    endpoints: [
      { method: "GET", path: "/api/ethical-metrics", description: "Indicator snapshots." },
      { method: "POST", path: "/api/ethical-metrics", description: "Store a snapshot." },
      { method: "DELETE", path: "/api/ethical-metrics/<id>", description: "Delete a snapshot." },
      { method: "GET", path: "/api/ethical-metrics/config", description: "Read thresholds and limits." },
      { method: "PUT", path: "/api/ethical-metrics/config", description: "Save thresholds and limits." },
      { method: "POST", path: "/api/ethical-metrics/apply-recommendation", description: "Apply a recommendation as a real change." },
    ],
  },

  "data-export": {
    slug: "data-export",
    title: "Reports & data export",
    description: "Saved report schedules, run history, and CSV/JSON downloads.",
    category: "insights",
    content: `
# Reports & data export

## Report schedules

/dashboard/reports lets you build a report and keep it. A schedule is a dataset, a range in days, a
grouping, a cadence and a recipient list. Schedules are full CRUD through /api/reports and
/api/reports/<id>, and creating one notifies the owner.

## Datasets

The registry comes from GET /api/reports, so the builder never hardcodes a list:

- tasks — group by status, priority, assignee or sprint. Values are tasks.
- sprints — group by status. Values are sprints.
- team — group by member or department. Values are open tasks.
- wellbeing — group by mood or day. Values are check-ins.

## Running and previewing

1. POST /api/reports/preview renders the report without saving it — use this while building.
2. POST /api/reports/<id>/run executes a saved schedule immediately and records a run.
3. GET /api/reports returns schedules plus the 50 most recent runs, each with a status and timestamp.

## Exporting

GET /api/reports/export?dataset=tasks&rangeDays=30&groupBy=status&format=csv returns a file
attachment. format=json returns the same rows as JSON. Every parameter is validated against the
registry, so an unknown dataset or grouping is a 400 rather than an empty file.

## Other ways data leaves the app

- The Data export card in /dashboard/settings for your own records.
- The CSV bulk tasks integration card in /dashboard/integrations for board-shaped exports and imports.
- Any list endpoint with a large pageSize, if you want to transform the JSON yourself.

## Recipients

Recipients are member ids. When a scheduled run completes they receive a notification with a link back
to the report, which is how a weekly digest reaches people who never open the dashboard.
    `,
    endpoints: [
      { method: "GET", path: "/api/reports", description: "Schedules, recent runs and the dataset registry." },
      { method: "POST", path: "/api/reports", description: "Create a schedule; notifies the owner." },
      { method: "POST", path: "/api/reports/preview", description: "Render a report without saving it." },
      { method: "POST", path: "/api/reports/<id>/run", description: "Run a saved schedule now." },
      { method: "GET", path: "/api/reports/export", description: "Download a dataset as CSV or JSON." },
    ],
    examples: [
      {
        title: "Download 30 days of tasks grouped by status",
        code: `GET /api/reports/export?dataset=tasks&rangeDays=30&groupBy=status&format=csv
Cookie: session_id=...; user_id=...

200
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="tasks-30d-by-status.csv"

label,value
todo,42
in_progress,18
review,7
blocked,3
done,68`,
      },
    ],
  },

  "gamification": {
    slug: "gamification",
    title: "Gamification & recognition",
    description: "Skill trees, points for the behaviours your team votes on, and reward redemption.",
    category: "team",
    content: `
# Gamification & recognition

## The default is not a leaderboard

Points map onto skill-tree branches — Craft, Collaboration and Stewardship — and the default views are
team totals and personal progression. Individual ranking exists only behind an explicit guardrail
switch that shows you the consequences before you turn it on.

## What earns points

Your team votes on which behaviours count: code reviews, mentoring, onboarding someone, documentation,
tech-debt work. Points attach to verifiable events in the workspace rather than to self-reporting, so a
claim has a source.

## Where it lives

/dashboard/gamification shows your points, skill branches, achievements and available rewards.
/api/gamification/me is your own record; /api/gamification/<userId> is another member's public view.

## Skills and achievements

- GET /api/gamification/skills — the skill tree definition.
- GET /api/gamification/achievements — what has been unlocked and what is still locked, with the
  requirement for each.

## Rewards

- GET /api/gamification/rewards — the catalogue and its costs.
- POST /api/gamification/rewards/redeem — spend points. Redemption checks the balance, records the
  redemption and notifies the person who approved the catalogue.

## Configuration

PUT /api/gamification/configure changes the point values, the guardrail switch and the reward
catalogue. It is an admin action, and the change is announced so nobody's points move silently.

## Using it without harm

1. Let the team choose the behaviours. Points for the wrong thing produce the wrong work.
2. Keep rankings off unless there is a specific reason, and revisit that reason each quarter.
3. Read gamification next to /dashboard/ethical-metrics — recognition that concentrates on the same
   three people is a workload signal, not a success story.
    `,
    endpoints: [
      { method: "GET", path: "/api/gamification/me", description: "Your points, skills and achievements." },
      { method: "GET", path: "/api/gamification/<userId>", description: "Another member's public gamification view." },
      { method: "GET", path: "/api/gamification/skills", description: "Skill tree definition." },
      { method: "GET", path: "/api/gamification/achievements", description: "Achievements and their requirements." },
      { method: "GET", path: "/api/gamification/rewards", description: "Reward catalogue." },
      { method: "POST", path: "/api/gamification/rewards/redeem", description: "Redeem points for a reward." },
      { method: "PUT", path: "/api/gamification/configure", description: "Admin configuration of points and guardrails." },
    ],
  },

  "common-issues": {
    slug: "common-issues",
    title: "Common issues",
    description: "The problems people actually hit, with the check that resolves each one.",
    category: "support",
    content: `
# Common issues

## The bell shows nothing

1. Confirm you are signed in: GET /api/user/current should return your row, not 401.
2. Open the network tab and look for the /api/notifications/live request. If it is not there, reload —
   the client resubscribes on load.
3. Check the workspace switches in /dashboard/team/settings. If memberJoined or wellbeingAlert is off,
   those events are never recorded for anyone.
4. Check your own preferences in /dashboard/settings.

## A page is empty but nothing errored

Empty usually means the filter excludes everything, or the workspace has no rows yet. Clear the
filters first. Then confirm with a direct read — GET /api/tasks?pageSize=5 — which tells you whether
the dataset is empty or the view is filtering it.

## A write returns 403

You are signed in as a role that is not allowed to do that. Member management, role changes and
workspace settings require admin or super-admin; /admin/cms requires super-admin (or an email listed in
ADMIN_EMAILS). Ask an admin, or have your address added to ADMIN_EMAILS to bootstrap the first one.

## A write returns 409

The server refused on purpose. The common case is account deletion while tasks are still assigned to
you — the message names the count. Reassign or complete them and retry.

## CSV import skips rows

"Skip invalid rows on import" is on by default. Turn it off to see which rows fail and why. Rows need
at least a title; unknown statuses fall back to todo and unknown priorities to medium.

## Charts look flat after a sprint

Velocity and burndown count tasks whose status is done. If work was finished but left in review, the
charts will not move. Move the status, then reload.

## The AI draft says a provider is unavailable

The generation endpoint reports which model answered. When the configured provider has no key in the
environment it says so instead of inventing a draft. Add the key and retry.

## Timezones look wrong

Timestamps from the API are UTC (they end in Z). The dashboard renders them in the timezone on your
profile. If a due date looks a day off, check the profile timezone rather than the data.

## Still stuck

Capture the route, the status code and the response body, then use /contact. Those three things are
what makes a report actionable.
    `,
  },

  "error-messages": {
    slug: "error-messages",
    title: "Error messages & status codes",
    description: "What each status means here and the exact body shape to expect.",
    category: "support",
    content: `
# Error messages & status codes

## The standard failure body

    { "success": false, "message": "Human-readable reason" }

Server-side failures add the underlying error text:

    { "success": false, "message": "Failed to export dataset", "error": "column \"foo\" does not exist" }

A few older handlers use { "error": "Unauthorized" } instead of message. Check for both keys when you
write a client.

## 400 Bad Request

The body was parseable but a value was rejected — an unknown dataset key, a grouping that does not
exist for that dataset, a team name over 120 characters, a role that is not in MEMBER_ROLES. Nothing is
written. Fix the value; do not retry as-is.

## 401 Unauthorized

No session. Either the cookies were never set (not signed in) or they expired. Redirect to /login.

## 403 Forbidden

Signed in, not allowed. The message names what is required. Retrying with the same session will always
fail.

## 404 Not Found

The id does not exist, or it exists and belongs to a route that is not public. On marketing pages a
404 renders the group not-found boundary with links back to the home page and the blog.

## 409 Conflict

A deliberate refusal with a reason. Example — requesting account deletion while work is still assigned:

    {
      "success": false,
      "message": "Cannot request deletion: 3 tasks still assigned to you. Reassign or complete them first.",
      "assignedTasks": 3
    }

Duplicate-name cases behave the same way: creating a reward or achievement whose name already exists
returns 409 with the offending name in the message.

## 429 Too Many Requests

Rate limited. The window is 60 seconds and the default maximum is 5 requests per IP on the limited
routes. Wait for the window rather than retrying in a loop.

## 500 Internal Server Error

Unexpected. The message field says which operation failed ("Failed to build dashboard overview") and
the error field carries the database or provider text. These are logged server-side with the same
prefix, so quoting the message in a support request lets us find the log line.

## Reading errors in the browser

The dashboard surfaces failures as toasts with the server message. If a toast says "Failed to X" with
no detail, open the network tab and read the response body — the detail is there.
    `,
    examples: [
      {
        title: "Handle every failure shape in one place",
        code: `async function call(path, init) {
  const res = await fetch(path, { credentials: "same-origin", ...init })
  if (res.ok) return res.json()

  const body = await res.json().catch(() => ({}))
  const message = body.message ?? body.error ?? \`Request failed (\${res.status})\`

  if (res.status === 401) location.href = "/login"
  if (res.status === 429) await new Promise((r) => setTimeout(r, 60_000))

  throw new Error(message)
}`,
      },
    ],
  },

  "system-status": {
    slug: "system-status",
    title: "System status",
    description: "The public status page, the status endpoint and the authenticated health report.",
    category: "support",
    content: `
# System status

## The public page

/status is the human-facing status page. It renders the current state of each service with the copy
maintained in content/status.ts, and it names how to report a problem.

## The public endpoint

GET /api/status requires no session:

    { "success": true, "message": "API server is running", "time": "2026-10-24T09:41:02.118Z" }

Use it for an external uptime check. It proves the app is serving; it does not prove the database is
reachable.

## The authenticated health report

GET /api/health requires a session and reports reachability per service — Postgres, realtime, object
storage and serverless functions — each with ok and detail. It never returns environment values, only
whether the dependency answered.

    {
      "postgres": { "ok": true, "detail": "Lakebase Postgres reachable" },
      "realtime": { "ok": false, "detail": "NEON_REALTIME_SECRET not set" }
    }

A dependency that is not configured reports ok: false with the reason, which is the difference between
"broken" and "not enabled".

## Monitoring it yourself

1. Ping GET /api/status from your own monitor for availability.
2. After sign-in, call GET /api/health to see which dependencies are actually wired.
3. Watch the SSE feed: if /api/notifications/live stops delivering while writes still succeed, the
   realtime dependency is the thing to check.

## Environment-driven services

Realtime, storage and functions are optional and switch on when their secrets are present. The health
report is the fastest way to see which of them are live in a given environment.
    `,
    endpoints: [
      { method: "GET", path: "/api/status", description: "Public liveness check." },
      { method: "GET", path: "/api/health", description: "Authenticated per-service reachability." },
    ],
  },

  "contact-support": {
    slug: "contact-support",
    title: "Getting help",
    description: "How to reach us and what to include so the first reply is useful.",
    category: "support",
    content: `
# Getting help

## Where to go

- /contact — the support and sales form. It posts to /api/contact, is rate limited, and stores the
  message so someone can pick it up.
- /faq — the full question set, grouped by Product, Pricing, Migration, Company and Security, with a
  link from each answer to the page that explains it properly.
- /status — current service state before you report an outage.
- /accessibility — how to report an accessibility barrier specifically.

There is no community forum, no chat widget and no ticketing system in this product. The contact form
is the supported channel.

## What to include

1. The route you were on, for example /dashboard/reports.
2. What you did, in order.
3. What you expected and what happened instead.
4. The API call from the network tab: method, path, status code and response body.
5. Whether it reproduces in a private window with extensions disabled.

Item 4 is the one that turns a day of guessing into a fix. Item 5 rules out the most common false
positive: a browser extension injecting markup and causing a hydration error that is not in the app.

## Before you write

- Check the common issues doc — the bell, empty pages, 403 and 409 cases are all covered there.
- Check /status for a known incident.
- Confirm your session is live with GET /api/user/current.

## Reporting a security problem

Use /contact and say plainly that it is a security report. Do not post credentials, tokens or customer
data in the message; describe where they are instead.

## Accessibility reports

Send them through /contact with the page, the assistive technology and browser, and what broke. The
accessibility statement page lists the conformance target and the known gaps.
    `,
  },

  "integrations": {
    slug: "integrations",
    title: "Integrations",
    description: "The seven integration cards, what each one really does, and how configuration persists.",
    category: "support",
    content: `
# Integrations

## Where

/dashboard/integrations. Each card has its own configuration schema, a test action and a draft state
you can publish later. Configuration persists to your account preferences, so it survives reloads and
is scoped to you rather than to the browser.

## The cards

- Slack — incoming webhook URL, channel name and subscribed events.
- GitHub — repository URL, default branch, and auto-linking of PRs that mention task ids.
- Jira import — site URL and project key. Configuration-only in this build: no call is made to
  Atlassian APIs. Use the CSV importer for real data movement.
- Google Calendar — include task due dates and sprint boundaries. Produces an internal feed URL; no
  Google sync happens in this build.
- Webhooks — endpoint URL, optional signing secret and subscribed events.
- CSV bulk tasks — delimiter and whether to skip invalid rows. This is the real importer.
- Zapier — catch-hook URL and trigger event.

## Lifecycle of a configuration

1. Open the card and fill in the fields. Required fields are marked.
2. Save. The live configuration is updated and a toast confirms it.
3. Or save as draft — the page then shows a drafts banner and nothing changes until you publish.
4. Test the connection from the same dialog to see whether the endpoint answers.

## Events

The subscribed-event list is shared across the Slack, Webhooks and Zapier cards, so an event name means
the same thing everywhere. Notifications are the source of most of them: a task created, a sprint
started, a role changed.

## Reading it programmatically

- GET /api/integrations returns the saved configurations.
- PUT /api/integrations/<key> saves one.
- POST /api/integrations/test runs the test action.
- POST /api/integrations/import runs the CSV import.

## Honest limits

- No OAuth flows. Credentials you enter are stored as configuration for that card.
- No two-way sync. Jira and Google Calendar are configuration surfaces in this build.
- Webhook delivery is outbound to the URL you supply; there is no inbound webhook receiver other than
  the routes listed in the endpoint reference.
    `,
    endpoints: [
      { method: "GET", path: "/api/integrations", description: "Saved integration configurations." },
      { method: "PUT", path: "/api/integrations/<key>", description: "Save one configuration." },
      { method: "POST", path: "/api/integrations/test", description: "Test a configuration." },
      { method: "POST", path: "/api/integrations/import", description: "Run the CSV bulk task import." },
    ],
  },

  "content-management": {
    slug: "content-management",
    title: "Landing-page content management",
    description: "How a super-admin edits marketing copy, and how overrides are audited.",
    category: "support",
    content: `
# Landing-page content management

## Who can use it

Super-admin only: a stored role of superadmin, or an email present in ADMIN_EMAILS. Everyone else gets
403 from /api/admin/cms and never sees the editor in navigation.

## Where

/admin/cms lists the editable landing pages and the sections within them. Pick a section, edit the
copy, save. The marketing page renders the override on the next request.

## How an override works

1. The page reads its default copy from the content module in content/ (home.ts, pricing-page.ts,
   products.ts, solutions.ts, about.ts and the rest).
2. lib/cms-registry.ts declares which parts of those modules are editable — the section keys and the
   shape of each.
3. A saved override is a row in cms_content_overrides keyed by page and section.
4. Rendering merges the override over the default, so an untouched section always shows the code
   default and a removed override restores it.

## Audit

Every write lands in cms_audit_log with the actor, the section, the previous value and the new one.
GET /api/admin/cms/audit returns it and /admin/cms shows it, so public copy can never change without a
record of who changed it.

## Working safely

- Edit one section at a time and look at the live page afterwards.
- Removing an override is the undo: it restores the default from code rather than leaving stale copy.
- Overrides survive deployments because they live in the database, not in the build.
- Keep claims true. The registry exposes marketing copy, and the placeholders document lists the
  claims that still need an owner decision before launch.

## Relationship to the rest of the docs

This is the only part of the product where a non-developer can change what the public sees. Everything
else in these docs describes the signed-in workspace.
    `,
    endpoints: [
      { method: "GET", path: "/api/admin/cms", description: "Editable pages, sections and current overrides." },
      { method: "PUT", path: "/api/admin/cms", description: "Save or remove an override; super-admin only." },
      { method: "GET", path: "/api/admin/cms/audit", description: "The override audit log." },
    ],
  },
}

/** Every doc, in catalogue order. */
export const docList: DocEntry[] = Object.values(documentation)

export function getDoc(slug: string): DocEntry | null {
  return documentation[slug] ?? null
}

/** Docs in one category, for the index cards and the reader's sidebar. */
export function docsByCategory(category: DocCategoryId): DocEntry[] {
  return docList.filter((doc) => doc.category === category)
}

/**
 * Related reading for a doc: the rest of its own category first, then the
 * overview. Always resolves to slugs that exist, because it reads the catalogue.
 */
export function relatedDocs(slug: string, limit = 4): DocEntry[] {
  const doc = documentation[slug]
  if (!doc) return []
  const sameCategory = docsByCategory(doc.category).filter((entry) => entry.slug !== slug)
  const others = docList.filter(
    (entry) => entry.slug !== slug && entry.category !== doc.category && entry.slug !== "getting-started",
  )
  const overview = documentation["getting-started"]
  const picked = [...sameCategory, ...others].slice(0, limit)
  if (doc.slug !== "getting-started" && overview && picked.length < limit) picked.push(overview)
  return picked
}

/** Index-page search over titles, descriptions and body copy. */
export function searchDocs(query: string): DocEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return docList
  return docList
    .map((doc) => {
      const inTitle = doc.title.toLowerCase().includes(needle)
      const inDescription = doc.description.toLowerCase().includes(needle)
      const hits = doc.content.toLowerCase().split(needle).length - 1
      const score = (inTitle ? 100 : 0) + (inDescription ? 40 : 0) + hits
      return { doc, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.doc)
}

/** Rough reading time in minutes, derived from the doc body. */
export function readingTime(doc: DocEntry): number {
  const words = doc.content.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Doc slugs for sitemap.xml. */
export function docSlugs(): string[] {
  return docList.map((doc) => doc.slug)
}
