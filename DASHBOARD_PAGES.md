# Dashboard pages — sections, behaviour, CRUD

Every route under `app/dashboard/**` — what it shows, what each part of it does, and the create /
read / update / delete calls it makes.

## How the data flows

- **No page reads the database directly.** Every dashboard page is a client component that fetches
  `/api/*`. `/api/dashboard/overview` is the shared read aggregator the workspace pages call first.
- **One gate for the whole area.** `app/dashboard/layout.tsx` (server) redirects an unauthenticated
  cookie to `/login` and an account that has not been set up to `/onboarding`, before any page runs.
- **Reads are member-scoped by default.** `/api/goals`, `/api/retros`, `/api/sprints`,
  `/api/calendar/events` and the automation / scheduled-report reads list rows owned or authored by
  the signed-in member unless the caller asks for the workspace view. This is pinned by
  `tests/unit/dashboard-read-scoping.test.ts` — it exists because a fresh account opened
  `/dashboard/goals` and found five OKRs belonging to someone else.
- **CRUD legend.** `C` create · `R` read · `U` update · `D` delete. A method is listed once per
  entity even when several sections trigger it.
- **Bulk writers answer `POST`.** `/api/tasks/bulk`, `/api/worklog/entries/bulk` and
  `/api/registers/bulk` accept a mixed set of updates and deletes in one body, so the verb is POST
  even when the rows above classify the action as `U` or `D`.

Navigation groups below match the order in `components/dashboard-layout.tsx`.

---

## Main

### `/dashboard` — Dashboard

The member's home: today's work, the sprint's trajectory, and the shortcuts that write real rows.

| Section | What it does |
| --- | --- |
| Today strip | Day's deadlines, events and unlogged work; quick-add task and work-log entry inline |
| My open priorities | The member's unfinished tasks sorted by priority/due date; status and assignee editable |
| Sprint burndown / Velocity / Weekly throughput | Charts from the current sprint's tasks, computed server-side |
| Task status mix | Distribution of the member's tasks across statuses |
| Upcoming deadlines / Upcoming events | Due tasks and calendar events for the next window |
| My wellbeing | The member's own latest check-ins and mood trend |
| Progress & rewards | XP, level and streak snapshot from the gamification row |
| Activity | Recent status changes touching the member |
| Stale-register nudge | Counts rows in `/api/registers/stale` that need a re-verification |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/dashboard/overview`, `/api/sprints`, `/api/tasks`, `/api/worklog/summary`, `/api/registers/stale`, `/api/onboarding`, `/api/notifications` | loads every card |
| C | `/api/tasks`, `/api/dashboard/tasks` | quick-added task |
| U | `/api/tasks/[id]`, `/api/notifications/[id]` (PATCH), `/api/onboarding` (PATCH) | task status/assignee, mark notification read, onboarding step |
| D | — | nothing deletes from this page |

### `/dashboard/kanban` — Kanban Board

Drag-and-drop board over the member's tasks, with column-scoped filters and an insights rail.

| Section | What it does |
| --- | --- |
| Board columns | Backlog → In progress → Review → Done; a drop writes the new status and position |
| Quick add card | "What needs doing?" input creating a card with assignee/priority/sprint/labels |
| Card modal | Edit title, description, assignee, priority, sprint, due date, labels; delete the card |
| Activity | Per-card change feed |
| Recently moved (48h) / Cycle snapshot / Board insights · completions (7 days) | Throughput, ageing and movement summary |
| Filters | Sprint, assignee, priority, text search — all serialised in the URL |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/tasks?pageSize=200&scope=…`, `/api/sprints`, `/api/dashboard/overview`, `/api/notifications` | cards and columns |
| C | `/api/tasks` | new card |
| U | `/api/tasks/[id]` (PUT/PATCH) | drag-drop status + position, field edits |
| D | `/api/tasks/[id]` (DELETE) | removed card |

> `/api/dashboard/kanban`, `/kanban/tasks`, `/kanban/reorder` and `/kanban/update-status` still exist
> and write the `kanban_tasks` tables, but no dashboard page calls them — the board runs on `/api/tasks`.
> They are covered by `lib/worklog/capture.ts` and `tests/unit/worklog-reports.test.ts` only.

### `/dashboard/sprints` — Sprints

Sprint roster and the detail panel for one sprint.

| Section | What it does |
| --- | --- |
| Sprint list / search | All sprints with status, date range, and the member's tasks inside |
| New sprint form | Name, goal, start/end dates, status |
| Completion rate / Velocity history / Scope changes / Team capacity / Upcoming agenda | Analytics for the selected sprint |
| Sprint tasks | Rows assigned to the sprint, movable to backlog or another sprint |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/sprints`, `/api/sprints/[id]`, `/api/sprints/[id]/tasks` | list, detail, membership |
| C | `/api/sprints` (POST) | created sprint |
| U | `/api/sprints/[id]` (PUT), `/api/tasks/[id]` | edited dates/goal/status, retargeted tasks |
| D | `/api/sprints/[id]` (DELETE) | archived/deleted sprint (its tasks fall back to backlog) |

### `/dashboard/tasks` — Tasks

The full task table with bulk actions.

| Section | What it does |
| --- | --- |
| Task table (grid) | Sort, filter by sprint/assignee/priority/status, inline edit, row drawer |
| Quick add | Title, assignee, priority, sprint, labels |
| Bulk bar | Multi-select → status/priority/sprint change or delete via `/api/tasks/bulk` |
| My workload vs team | Empty state when the member has no tasks of their own; otherwise per-person load |
| Status mix / Tasks per assignee / Tasks per sprint / Due this week / Needs attention / Recently updated | Charts and lists driven by the same read |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/tasks`, `/api/sprints`, `/api/dashboard/overview` | table + analytics |
| C | `/api/tasks` | new task |
| U | `/api/tasks/[id]` (PUT), `/api/tasks/bulk` | field edits, bulk status/priority/sprint/assignee |
| D | `/api/tasks/[id]` (DELETE), `/api/tasks/bulk` | single and bulk delete |

### `/dashboard/worklog` — Work Log

What a member did, on the day they say they did it. URL is the state; every mutation goes through one
`mutate()` so failures read the same everywhere.

| Section | What it does |
| --- | --- |
| Quick add | Natural-language line parsed by `lib/worklog/quick-add.ts` into entry + task link |
| This period / Find in the log | Range picker, search, entry-kind and discipline filters |
| View slot | Day / week / list / board / heatmap renderings of the same rows |
| Coverage / Days logged / Active days / Current streak / Longest streak / Unlinked entries | Summary stat cards |
| Where the time went / Mix of work / Time by task / Status changes | Breakdowns by discipline, task and kind |
| Deliverables | Deliverable rows with state, linked entries |
| Entry dialog | Edit hours, kind, discipline, task link; confirm-delete |
| Bulk bar + CSV export | Multi-select edits, and CSV/PDF/XLSX built client-side by `lib/export/*` |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/worklog/entries`, `/api/worklog/summary`, `/api/worklog/deliverables`, `/api/tasks` | log rows, stats, deliverables |
| C | `/api/worklog/entries` (POST), `/api/worklog/deliverables` (POST) | logged entry, deliverable |
| U | `/api/worklog/entries/[id]` (PUT), `/api/worklog/entries/bulk`, `/api/worklog/deliverables/[id]` (PUT) | edited entry, bulk kind/task/time change, deliverable state |
| D | `/api/worklog/entries/[id]` (DELETE), `/api/worklog/entries/bulk`, `/api/worklog/deliverables/[id]` (DELETE) | removed entry / deliverable |

### `/dashboard/reports-work` — Work Reports

The period-report builder: draft → submitted → acknowledged, with the numbers computed only on the
server.

| Section | What it does |
| --- | --- |
| My reports | Drafts and submitted reports for the member, searchable |
| Period / Previous / Next period | Cadence resolution (daily, weekly, monthly, one-off, yearly) |
| Report body | Template-ordered sections rendered from server rows, never recomputed in the browser |
| Create / edit dialog | Period, discipline, free-text fields against a route whitelist |
| Submit / Revise / Recompute | Lifecycle actions: submit routes to recipients, revise reopens a submitted report, recompute re-runs the aggregates |
| Team day view (admin) | `/api/reports/admin/day` reads the roster's entries for one day |
| Settings | Default reporting line and visibility |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/reports/work`, `/api/reports/work/[id]`, `/api/reports/work/preview`, `/api/settings`, `/api/team/members` | reports, preview, reporting line |
| C | `/api/reports/work` (POST) | new draft |
| U | `/api/reports/work/[id]` (PATCH), `/api/reports/work/[id]/submit`, `/revise`, `/recompute` (POST) | edited draft, submission, revision, re-aggregation |
| D | `/api/reports/work/[id]` (DELETE) | discarded report |

### `/dashboard/reports-work/inbox` — Report inbox

Reached from the notification a submission sends (there is no sidebar entry).

| Section | What it does |
| --- | --- |
| Inbox list | Reports addressed to the member, newest first |
| Report detail | The full submitted document |
| Acknowledge / Return | Mark read, or send back for revision with a note |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/reports/inbox` | rows the member is a recipient of |
| U | `/api/reports/inbox/[id]/ack`, `/api/reports/inbox/[id]/return` (POST) | recipient status, report status returned to the author |
| C / D | — | the inbox creates and deletes nothing |

### `/dashboard/career` — Career

The member's ladder position, readiness and promotion request. Nothing here computes a percentage.

| Section | What it does |
| --- | --- |
| The rung you hold / No placement yet | Current band and placement, or the empty state |
| Readiness | Server-supplied meter with band, checklist and signal bars |
| Signals drill-down | Clicking a signal fetches `/api/career/me/evidence` for the rows behind its count |
| Promotion request | Raise a request against a target band; shows its pending/approved/returned state |
| History | Approved placements and sign-offs |
| Growth AI | Four server-saved actions: gap plan, learning items, benchmark sources, drafted plan link |
| Career disciplines | Choose a discipline; links into `/dashboard/career/[discipline]` |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/career/me`, `/api/career/requests`, `/api/career/me/evidence`, `/api/career/growth`, `/api/career/levels` | profile, request state, evidence, growth rows |
| C | `/api/career/requests` (POST), `/api/career/growth` (POST) | new promotion request; growth action recorded |
| U | `/api/career/requests/[id]/approve`, `/return` (POST, admin path) | request lifecycle moves |
| D | — | career history is append-only for the member |

`/dashboard/career/[discipline]` is the per-discipline ladder view: **R only**, from
`/api/career/levels` plus `lib/career/ladder-seed.ts`.

### `/dashboard/registers` — Registers

The compliance register workspace (asset, competency, permit, tool, site registers). The server returns
only rows the person may see; the page never decides visibility.

| Section | What it does |
| --- | --- |
| Register view switch | Choose which register (asset/competency/permit/tool/site) is loaded |
| Row table | Filter, sort, search; per-row field editor with name/value pairs |
| Add row form | Create a row against the role pack's field list |
| Verify | Mark a row verified with the checking member recorded |
| Bulk bar | Multi-select verify/update |
| Export | Server-side CSV of the visible rows |
| Stale flag | Rows past their re-verification date, from `/api/registers/stale` |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/registers`, `/api/registers/stale`, `/api/registers/export` (GET) | rows, staleness, CSV |
| C | `/api/registers` (POST) | new row |
| U | `/api/registers/[id]` (PATCH), `/api/registers/bulk`, `/api/registers/[id]/verify` | edited field(s), bulk change, verification |
| D | — | rows are lifecycle-closed, not deleted, by this page |

A credential-shaped field name is refused by the API, so the page cannot store one by accident.

### `/dashboard/playbooks` — Playbooks

Method library: a role-pack-scoped, versioned, publishable procedure.

| Section | What it does |
| --- | --- |
| Library list | Only the rows this member may read; search + "open a draft against a role pack" |
| Nothing written yet | Empty state that seeds the first draft |
| Editor (`/playbooks/[id]`) | Title, summary, phases and ordered steps, Tools & parts, Checks, Warnings, Precautions, PPE; move/clone/remove keeps orders 1..n; Recommendations and AI precaution suggestions |
| Publish | Saves the draft then publishes; the version that goes live is the saved one |
| Run (`/playbooks/[id]/run`) | Works the phases in order, writes what happened per phase; submitting leaves one work-log action entry per phase naming the playbook and version |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/playbooks`, `/api/playbooks/[id]` | library and stored version |
| C | `/api/playbooks` (POST), `/api/playbooks/[id]/run` (POST) | new draft; a run with its work-log entries |
| U | `/api/playbooks/[id]` (PATCH), `/api/playbooks/[id]/publish` (POST), `/api/agent/precautions` (POST) | edited steps, published version, AI-suggested precautions merged in |
| D | — | versions are never deleted; a bad edit is superseded by the next publish |

### `/dashboard/agent` — Agent

The agent's single door: a preview-then-commit handover, plus "what next" recommendations.

| Section | What it does |
| --- | --- |
| Role pack | Chooses the pack whose fields, playbook shapes and vocabulary the run uses |
| The handover | Upload/paste a handover, preview the extracted register rows and playbook drafts |
| Register rows / Playbook drafts | Tickable previews; nothing is stored until commit |
| Refusal panel | Names the exact field paths the server would not accept |
| What next | Rule-first recommendations with a separate AI twin button |
| Commit | Writes only the ticked rows |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/registers` | existing rows so duplicates are shown as updates |
| C | `/api/agent/handover` (POST, preview), `/api/agent/handover/commit` (POST), `/api/agent/recommendations` (POST) | extraction preview, committed rows/drafts, recommendations |
| U / D | — | commit only creates; it never mutates or deletes an existing row |

### `/dashboard/backlog` — Backlog

The unprioritised pool, ranked, with grooming tools.

| Section | What it does |
| --- | --- |
| Prioritized backlog ranking | Undone tasks without a sprint, scored by priority, age and owner coverage |
| Assign to sprint | Moves the selected rows into a sprint |
| Pull work back to backlog | Returns a task from a sprint to the pool |
| New item form | "What needs doing?" with assignee and priority |
| Backlog age / Priority mix / Owner coverage / Groomed in the last 7 days | Grooming roll-ups |
| Filters | Priority, assignee, age, text search |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/tasks`, `/api/sprints`, `/api/dashboard/overview` | the pool and its charts |
| C | `/api/tasks` | new backlog item |
| U | `/api/tasks/[id]` (PUT/PATCH), `/api/tasks/bulk` | prioritise, assign, sprint move (single and bulk) |
| D | `/api/tasks/[id]` (DELETE) | discarded item |

---

## Planning### `/dashboard/goals` — Goals & OKRs

| Section | What it does |
| --- | --- |
| Goal board | Card per objective with progress and status |
| Goal tree | Parent/child alignment view (`goals.parent_id`) |
| Filters | Owner, quarter, status, text search |
| Recent check-ins / Check-in trend | Latest progress notes and the trend line |
| Owner leaderboard / Status mix / Quarter comparison / Suggested status changes | Roll-ups across the member's goals |
| New goal form | Title, description, owner, quarter, targets |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/goals`, `/api/goals/[id]`, `/api/team/members` | board, tree, owner picker |
| C | `/api/goals` (POST), `/api/goals/[id]/progress` (POST) | objective/key result; check-in |
| U | `/api/goals/[id]` (PATCH) | edited goal, status, progress |
| D | `/api/goals/[id]` (DELETE) | removed goal (its check-ins cascade) |

### `/dashboard/retros` — Retrospectives

| Section | What it does |
| --- | --- |
| Retro board | Draft → scheduled → completed → archived lifecycle per sprint |
| Three-column note board | Went well / to improve / to try, with database-enforced one-vote-per-user |
| Action items | Owner, due date, done state per retro |
| Retro activity / Notes per retro / Note mix / Action outcomes per retro | History and roll-ups |
| New retro form | Sprint picker, title, date |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/retros`, `/api/retros/[id]`, `/api/sprints`, `/api/dashboard/overview` | retros, notes, actions |
| C | `/api/retros`, `/api/retros/[id]/notes`, `/api/retros/[id]/actions`, `/api/retros/[id]/notes/[noteId]/vote` | retro, note, action item, vote |
| U | `/api/retros/[id]` (PATCH), `/api/retros/[id]/notes/[noteId]`, `/api/retros/[id]/actions/[actionId]` | lifecycle/status change, edited note or action |
| D | `/api/retros/[id]`, `/notes/[noteId]`, `/actions/[actionId]`, `/vote` (DELETE) | remove retro, note, action or vote |

### `/dashboard/automation` — Automation

| Section | What it does |
| --- | --- |
| Rules | The member's rules with trigger, condition, action and status |
| Template gallery | Pre-written rules that become real rows on use |
| Filters | Status, member, text search |
| Dry-run preview | Runs the rule against current data without writing |
| Runs & actions — last 14 days / Run history — all rules / Trigger mix | Execution log |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/automation`, `/api/automation/[id]`, `/api/sprints`, `/api/team/members` | rules, runs, trigger context |
| C | `/api/automation` (POST), `/api/automation/[id]/run` (POST) | new rule; manual or dry run |
| U | `/api/automation/[id]` (PATCH) | enabled/disabled, edited condition or action |
| D | `/api/automation/[id]` (DELETE) | removed rule |

### `/dashboard/planner` — Planning (AI plan extraction)

Linked from the career Growth panel and the registers page rather than the sidebar.

| Section | What it does |
| --- | --- |
| Your Plans | Extracted `agent_plans` with status and item counts |
| Extract a Plan | Paste/drop a brief; the provider returns a validated plan structure |
| Plan details (`/planner/[id]`) | Editable items: title, dates, owner, estimate, dependencies |
| Gantt View | Drag-to-move bars that write real date changes |
| Promote | Turns approved plan items into `tasks` in one transaction |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/planner`, `/api/planner/[id]` | plan list and detail |
| C | `/api/planner/extract` (POST), `/api/planner/[id]/items` (POST) | new plan from a brief; added item |
| U | `/api/planner/[id]` (PATCH), `/api/planner/[id]/items/[itemId]` (PATCH), `/api/planner/[id]/promote` (POST) | edited plan/item, promoted items to tasks |
| D | `/api/planner/[id]` (DELETE), `/api/planner/[id]/items/[itemId]` (DELETE) | dropped plan or item |

---

## AI features

### `/dashboard/ai-scrum-master` — AI Scrum Master

| Section | What it does |
| --- | --- |
| Sprint health score | Composite score for the active sprint |
| Velocity forecast | Projection from the sprint's tasks |
| Workload rebalancer | Overloaded → underloaded suggestions with an apply action |
| Meeting & PTO load (next 7 days) | Availability risk from events and check-ins |
| Automation log | What the assistant changed or advised |
| Insights feed | Stored `ai_insights` rows, dismissible and editable |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/dashboard/overview`, `/api/ai-insights`, `/api/sprints`, `/api/tasks` | scores and feed |
| C | `/api/dashboard/ai-recommendation` (POST) | a provider recommendation persisted as an insight |
| U | `/api/ai-insights/[id]` (PATCH), `/api/tasks/[id]` | insight state, rebalance assignment |
| D | `/api/ai-insights/[id]` (DELETE) | dismissed insight |

Gemini is on the free tier (20 `generateContent` requests/day), so a long wait or 429 here is quota,
not a code fault.

### `/dashboard/assistant` — AI Assistant

Opened from the top-bar assistant panel.

| Section | What it does |
| --- | --- |
| Conversations | Thread list for the workspace, resumable |
| Chat pane | Questions answered from assembled workspace context (tasks, sprints, reports, work log) |
| Site assistant | Marketing-site questions answered from site knowledge |
| New / clear | Start a thread or drop one |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/assistant/workspace/threads`, `/api/assistant/workspace/threads/[id]` | saved history |
| C | `/api/assistant/workspace` (POST), `/api/assistant/site` (POST) | a turn, persisted to `assistant_threads` |
| U | — | edits are modelled as new turns |
| D | `/api/assistant/workspace/threads/[id]` (DELETE) | removed thread |

---

## Team

### `/dashboard/team-wellbeing` — Team Wellbeing

| Section | What it does |
| --- | --- |
| Team mood board / Happiness trend · 14 days / Mood distribution · 14 days | Anonymised aggregate check-ins |
| At-risk members | Members whose signals cross the threshold, with a link to their board view |
| Workload vs wellbeing / Overtime signals | Correlates logged hours against mood |
| Check-in history · 30 days | The member's own entries |
| Member wellbeing form | Log mood, energy, workload, blocker note |
| About anonymity | Explains the aggregation rule that protects individuals |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/dashboard/wellbeing`, `/api/dashboard/overview`, `/api/tasks` | aggregates and history |
| C | `/api/dashboard/wellbeing` (POST) | new check-in |
| U | `/api/dashboard/wellbeing/[id]` (PUT) | corrected check-in |
| D | `/api/dashboard/wellbeing/[id]` (DELETE) | withdrawn check-in |

### `/dashboard/team` — Team Members

| Section | What it does |
| --- | --- |
| Roster table | Search by name/role/skill, filter by status; per-member drawer |
| Invite member | Creates a member or an invitation token |
| Edit member | Name, role, discipline, location, avatar, access level |
| Role distribution / Workload distribution / XP leaderboard / Team mood / Team happiness trend / Team activity | Roll-ups across the roster |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/team/members`, `/api/team/invitations`, `/api/dashboard/overview`, `/api/notifications` | roster and stats |
| C | `/api/team/members` (POST), `/api/team/invitations` (POST) | new member; invitation |
| U | `/api/team/members/[id]` (PATCH) | edited profile / access |
| D | `/api/team/members/[id]` (DELETE) | removes the member and their tasks, notifications, kanban rows, chats, messages, reactions, gamification, wellbeing and reset tokens |

### `/dashboard/team/settings` — Team Settings

| Section | What it does |
| --- | --- |
| Access roles | Per-role capability matrix |
| Default access for new members | What a member gets on join |
| Bootstrap admins | Elevate the first admin when none exists |
| Recent access changes | `team_role_audit` trail |
| Reset preferences | Back to the shipped defaults |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/team/settings` (GET) | current governance row |
| C | — | settings rows are created by the first write |
| U | `/api/team/settings` (PUT), `/api/team/members/[id]/role` (PATCH) | preferences, per-member role |
| D | `/api/team/settings` (PUT with defaults) | reset; no hard delete |

### `/dashboard/chat` — Chat

| Section | What it does |
| --- | --- |
| Channel/group list | Search, unread counts, presence note (labelled demo data) |
| Message pane | Threads with replies, reactions, mentions of you |
| Compose | Send, edit, delete, restore, permanently delete |
| New group / DM | Create from the roster |
| Group admin | Rename, members, settings, archive, mute |
| Analytics | Messages per day · 14d, most active members, most reacted message |
| Notifications bell | Mentions and DMs, mark read / dismiss |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/chat`, `/api/chat/messages`, `/api/chat/notifications`, `/api/team/members`, `/api/user/profile` | chats, history, unread |
| C | `/api/chat` (POST), `/api/chat/dm` (POST), `/api/chat/messages` (POST), `/api/chat/messages/[id]/restore`, `/api/chat/notifications` (POST) | chat, DM, message, restored message, notification |
| U | `/api/chat/messages/[id]` (PATCH), `/api/chat/messages/[id]/reactions` (PUT), `/api/chat/[id]/settings` (PATCH), `/archive`, `/mute`, `/read` | edited message, reaction toggle, group settings, archive, mute, read cursor |
| D | `/api/chat/[id]` (DELETE), `/api/chat/messages/[id]` (DELETE), `/permanent-delete`, `/api/chat/notifications` (DELETE) | left a chat, soft-deleted or erased a message, cleared a notification |

---

## Metrics

### `/dashboard/gamification` — Gamification (hub)

| Section | What it does |
| --- | --- |
| XP leaderboard / XP podium / XP by member | Ranking from `gamification` rows |
| My redemptions / Reward catalog / Achievements wall / Skill trees | Cards into the sub-pages |
| Weekly XP trend (my done tasks) / Completion streak — last 30 days | XP earned from task completions |
| Configuration snapshot / Recent gamification activity | Effective rules and audit |

Sub-pages: `/leaderboard`, `/rewards`, `/achievements`, `/skill-tree`, `/add-skill`, `/configure`.

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/gamification`, `/api/gamification/me`, `/api/gamification/rewards`, `/api/gamification/achievements`, `/api/gamification/skills`, `/api/gamification/configure`, `/api/tasks` | scores, catalog, trees, rules |
| C | `/api/gamification` (POST), `/api/gamification/rewards` (POST), `/api/gamification/achievements` (POST), `/api/gamification/skills` (POST) | score row, reward, achievement, skill tree |
| U | `/api/gamification/[userId]` (PUT), `/api/gamification/rewards/[id]` (PUT), `/api/gamification/achievements` (PUT), `/api/gamification/skills` (PUT), `/api/gamification/configure` (PUT), `/api/gamification/rewards/redeem` (POST) | edited XP, catalog edits, toggles/notifications, redemption spend |
| D | `/api/gamification/[userId]`, `/api/gamification/rewards`, `/api/gamification/achievements`, `/api/gamification/skills` (DELETE) | removed rows |

`/configure` writes XP curve, level thresholds and notification toggles. `/add-skill` creates a tree
and its milestones; `/skill-tree` lists them.

### `/dashboard/ethical-metrics` — Ethical Metrics

| Section | What it does |
| --- | --- |
| Live computation vs last recorded snapshot | Recompute on demand against stored rows |
| Workload balance per member / Load vs seniority band / Priority-fairness matrix | Fairness views |
| Recommendations / apply | Suggestions that write task reassignments when applied |
| Alert thresholds & limits / compliance checklist | Configuration and pass/fail checks |
| Snapshot history / Audit feed / Methodology | Stored `ethical_metrics` rows and how each score is built |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/ethical-metrics`, `/api/ethical-metrics/[id]`, `/api/ethical-metrics/config`, `/api/dashboard/overview`, `/api/tasks` | scores, config, context |
| C | `/api/ethical-metrics` (POST) | a snapshot |
| U | `/api/ethical-metrics/[id]` (PATCH/PUT), `/api/ethical-metrics/config` (POST/PUT), `/api/ethical-metrics/apply-recommendation` (POST) | edited snapshot, thresholds, recommendation applied to tasks |
| D | `/api/ethical-metrics/[id]` (DELETE) | discarded snapshot |

### `/dashboard/analytics` — Analytics

| Section | What it does |
| --- | --- |
| Delivery health / Velocity trend / Cumulative flow / Throughput / Scope creep | Sprint delivery measures |
| Assignee workload / Priority mix / Due-date pressure / Quality signals | Distribution charts |
| Wellbeing vs velocity | Correlates mood check-ins with throughput |
| Saved reports | Named snapshots of a filter set (range, sprint, priority) |
| Filters | Range, sprint, priority — serialised in the URL |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/analytics`, `/api/dashboard/overview`, `/api/tasks` | every chart |
| C | `/api/analytics/reports` (POST) | saved report |
| U | `/api/analytics/reports/[id]` (PATCH) | renamed/retargeted saved report |
| D | `/api/analytics/reports/[id]` (DELETE) | removed saved report |

### `/dashboard/reports` — Reports (scheduled)

| Section | What it does |
| --- | --- |
| Report builder | Dataset, cadence, filters, recipients; preview before saving |
| Saved schedules | `report_schedules` rows with next run |
| Run history | `report_runs` per schedule |
| Cadence mix / Dataset usage | Distribution roll-ups |
| Export | CSV / PDF / XLSX |
| Filters | Name/description search, schedule filters |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/reports`, `/api/reports/[id]`, `/api/reports/preview` (POST), `/api/reports/export`, `/api/team/members` | schedules, preview, files |
| C | `/api/reports` (POST), `/api/reports/[id]/run` (POST) | new schedule; manual run |
| U | `/api/reports/[id]` (PATCH) | edited schedule |
| D | `/api/reports/[id]` (DELETE) | removed schedule (runs cascade) |

### `/dashboard/activity` — Activity

| Section | What it does |
| --- | --- |
| Activity feed | Task/status events across the workspace with actor, kind, window filters |
| Activity by kind (daily) / Sprint pulse / Gamification flashes / Wellbeing pings | Timelines per signal type |
| Actor leaderboard · events per member | Who changed what |
| Entity spotlight · recently changed tasks | Task-level drill-down |
| My notifications digest / Mark read | Bell feed for the member |
| Search titles (Enter to apply) | Text search over titles |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/activity`, `/api/activity/[id]`, `/api/dashboard/overview`, `/api/notifications` | feed and drill-downs |
| C | — | the feed is written by the task routes, not this page |
| U | `/api/notifications/[id]` (PATCH) | mark read |
| D | `/api/notifications/[id]` (DELETE) | dismiss |

---

## Applications

### `/dashboard/email` — Email

| Section | What it does |
| --- | --- |
| Weekly digest composer | Cadence, audience, template; save or queue |
| Message templates | Editable subject/body with placeholder preview |
| Template preview (placeholders resolved) | Renders against the member's own values |
| Event subscription matrix | Which notification types send mail |
| Digest queue — stored message timeline | Queued/sent digest rows |
| Digest activity — rows queued per day (14d) | Volume chart |
| Notification inbox (bell feed cross-view) | The same notifications the bell shows |
| Where everything on this page is stored | Table-by-table provenance note |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/email/templates`, `/api/email/preferences`, `/api/email/digest`, `/api/dashboard/overview`, `/api/user/profile`, `/api/notifications` | templates, prefs, queue |
| C | `/api/email/templates` (POST), `/api/email/digest` (POST) | new template; queued digest |
| U | `/api/email/templates/[id]` (PATCH), `/api/email/preferences` (PUT), `/api/email/digest/[id]` (PATCH) | edited template, subscriptions, digest |
| D | `/api/email/templates/[id]`, `/api/email/digest/[id]` (DELETE), `/api/notifications/[id]` | removed template/digest/dismissed notice |

### `/dashboard/calendar` — Calendar

| Section | What it does |
| --- | --- |
| Month/week/agenda grid | Events with type and location |
| Event form | Title, start/end, type, place, attendees, agenda notes, linked task |
| Upcoming · next 14 days / Today by hour / Weekly load · next 14 days | Time-ahead views |
| Task deadlines · next 14 days | Due dates pulled from tasks, linkable into an event |
| Sprint milestones | Sprint start/review markers |
| Calendar activity / Events by type | History and mix |
| Search | Events, people, locations, tasks |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/calendar/events`, `/api/sprints`, `/api/tasks`, `/api/dashboard/overview`, `/api/notifications` | events and context |
| C | `/api/calendar/events` (POST) | new event |
| U | `/api/calendar/events/[id]` (PUT/PATCH) | edited event, attendees |
| D | `/api/calendar/events/[id]` (DELETE) | removed event |

### `/dashboard/billing` — Billing

| Section | What it does |
| --- | --- |
| Choose a plan | Current and available plans, change plan |
| Upcoming renewal / Plan status | Next invoice date and state |
| Payment method | Card-on-file form (explicitly demo values) |
| Spend by month / Billing activity / Ledger mix by type / Tax-VAT summary | Ledger views |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/billing/summary`, `/api/billing/subscription`, `/api/billing/settings`, `/api/billing/transactions`, `/api/notifications` | totals, plan, ledger |
| C | `/api/billing/transactions` (POST) | ledger row (invoice, credit, refund) |
| U | `/api/billing/subscription` (PUT), `/api/billing/transactions/[id]` (PATCH) | plan change, edited transaction |
| D | `/api/billing/transactions/[id]` (DELETE) | voided transaction |

### `/dashboard/billing/settings` — Billing settings

| Section | What it does |
| --- | --- |
| Billing contact / Company details | Name, email, legal name, VAT number, address |
| Currency & formatting | Currency, locale, VAT rate, invoice prefix |
| Receipts & notifications | Which receipts and reminders are sent |
| Plan status | Where the account sits |
| Reset settings / Where these values live | Defaults plus provenance |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/billing/settings` (GET) | stored preferences |
| C / D | `/api/billing/settings` (DELETE resets) | no rows created; reset clears the overrides |
| U | `/api/billing/settings` (PUT) | any field above |

### `/dashboard/settings` — Settings

| Section | What it does |
| --- | --- |
| Account | Email, name, role, workspace, member since |
| Profile | Photo/avatar path, headline, role title, location, timezone, bio |
| Preferences | Theme, language, density, defaults |
| Notifications | Per-type channels |
| Task defaults | Default status/priority/sprint for new tasks |
| Security · password | Send a reset link |
| Sessions | Active sessions |
| Integrations / API & auth info | Connected providers and the auth contract, explained |
| Data export | Export own data |
| Danger zone | Deletion request |
| Setup wizard / Workspace stats / Settings audit feed | Onboarding restart, counters, change trail |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/settings`, `/api/user/profile`, `/api/dashboard/overview`, `/api/onboarding`, `/api/sprints` | current values and stats |
| C | `/api/user/avatar/upload` (POST), `/api/auth/forgot-password` (POST), `/api/onboarding` (PATCH) | stored avatar, reset mail, onboarding step |
| U | `/api/settings` (PATCH/PUT), `/api/settings/[key]` (PUT), `/api/user/profile` (PATCH/PUT) | any preference, per-key override, profile fields |
| D | `/api/settings/[key]` (DELETE), `/api/user/avatar/remove` (DELETE) | reset one preference, remove avatar; deletion request is a setting write, not a destructive call |

### `/dashboard/integrations` — Integrations

Reached from Settings and the docs index rather than the sidebar.

| Section | What it does |
| --- | --- |
| Integration catalog / Connected integrations | Available providers and their state |
| Configuration drafts | Keys/scopes saved as drafts before connect |
| Webhook test console | Fire a test payload at a connected provider |
| CSV task importer / CSV task exporter | Round-trip tasks as files |
| Event history per integration / Integration event volume — last 7 days / Integration activity feed | Call log |
| Security & data note | What leaves the workspace |

| CRUD | Endpoint(s) | Changes |
| --- | --- | --- |
| R | `/api/integrations`, `/api/integrations/[key]`, `/api/dashboard/overview`, `/api/notifications` | catalog, config, events |
| C | `/api/integrations/import` (POST), `/api/integrations/test` (POST), `/api/tasks` | imported tasks; test call |
| U | `/api/integrations/[key]` (PUT) | connect / update / disconnect configuration |
| D | `/api/integrations/[key]` (DELETE) | removed connection (imported tasks stay) |

---

## Cross-cutting chrome (not pages, but they issue calls on every dashboard route)

| Piece | What it does | CRUD |
| --- | --- | --- |
| `app/dashboard/layout.tsx` | Server gate: session cookie → `auth_sessions`, onboarding state → redirect | R only |
| Notification bell (`components/notifications-bell.tsx`) | Live feed over `/api/notifications/live` (SSE) | R; U/D delegated to `/api/notifications/[id]` |
| `components/add-task-modal.tsx` | Task creation from any page | C via `/api/dashboard/tasks` |
| Assistant panel (`components/assistant-panel.tsx`) | Opens `/dashboard/assistant` | see above |
| Command palette in `/dashboard/playbooks` | Opens a playbook or a draft by name | R only; writes happen on the page it routes to |

## Pages outside the dashboard sidebar but in the same product

| Route | Purpose |
| --- | --- |
| `/admin/cms` | Landing-page content overrides (`cms_audit_log` trail) — GET/PUT/DELETE `/api/admin/cms` |
| `/admin/packs` | Role pack editor — R/U on `/api/packs` (`role_packs`) |
| `/admin/career` | Placement, sign-off and request approvals — `/api/career/placements`, `/signoffs`, `/requests/[id]/approve`, `/return`, `/levels/[id]` |
| `/onboarding` | Setup wizard before the dashboard gate lets a member in — `/api/onboarding`, `/request-access`, `/project`, `/invitation` |

## Known limits

- Tables with no owner column are workspace-wide by construction, so a brand-new account still sees
  their seeded rows: `sprints`, `sprint_analytics`, `ethical_metrics`, `ai_insights`,
  `kanban_columns`, `plan_items`, `career_levels`, `role_packs`.
- Presence in `/dashboard/chat` is labelled demo data; the message, reaction and notification paths
  are real.
- `/api/dashboard/kanban*` (the `kanban_tasks` tables) is not called by any dashboard page.
