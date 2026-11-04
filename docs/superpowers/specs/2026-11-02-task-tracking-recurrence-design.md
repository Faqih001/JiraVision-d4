# Task Tracking with Recurrence, Checklists, Calendar Views, and Reports

**Date:** 2026-11-02  
**Status:** Implemented (2026-11-02)  
**Scope:** Architectural — new subsystem extending existing task tracking

## Overview

Extend the existing task tracking system to support:
1. **Recurring tasks** — Tasks with cadence (daily/weekly/monthly/quarterly/yearly) whose next open instance is served from a horizon anchored on today
2. **Checklists** — Tasks with simple checkbox items (yes/no/n/a) for operational checks
3. **Calendar views** — 4 view modes: due dates, cadence-based, both, range
4. **Report types** — Hybrid reports: auto-generated drafts from task/checklist data with manual editing

This design is driven by the IT technician workflow documented in the handover brief, which requires daily/weekly/monthly operational tasks, checklists, and structured reports.

## Architecture

### Data Model

**Extend existing `tasks` table:**
- Add `cadence` column (varchar, nullable) — references `lib/cadence.ts` vocabulary
- Add `parent_task_id` column (integer, nullable, FK to tasks.id) — links instances to their template
- Add `is_template` column (boolean, default false) — marks recurring task templates
- Add `checklist_items` column (jsonb, default '[]') — stores checklist items inline for simplicity

**New `task_instances` table:**
- `id` (serial, PK)
- `task_id` (integer, FK to tasks.id, not null) — the template task
- `instance_date` (date, not null) — the date this instance is for
- `status` (varchar, default 'todo') — independent status per instance
- `completed_at` (timestamp, nullable)
- `completed_by` (integer, FK to users.id, nullable)
- `notes` (text, nullable) — instance-specific notes
- `created_at` (timestamp, default now())
- Unique constraint: (task_id, instance_date)

**New `report_templates` table:**
- `id` (serial, PK)
- `name` (varchar, not null) — e.g., "Monthly IT Report"
- `description` (text)
- `cadence` (varchar, not null) — daily/weekly/monthly/yearly
- `discipline` (varchar, nullable) — role-specific templates
- `sections` (jsonb, not null) — array of section definitions
- `data_sources` (jsonb, default '{}') — configuration for auto-population
- `is_active` (boolean, default true)
- `created_at` (timestamp, default now())
- `updated_at` (timestamp, default now())

**New `reports` table:**
- `id` (serial, PK)
- `template_id` (integer, FK to report_templates.id, not null)
- `title` (varchar, not null)
- `period_start` (date, not null)
- `period_end` (date, not null)
- `content` (jsonb, not null) — the actual report data (sections with content)
- `status` (varchar, default 'draft') — draft/final
- `author_id` (integer, FK to users.id, not null)
- `created_at` (timestamp, default now())
- `updated_at` (timestamp, default now())

### Recurrence Engine

**Location:** `lib/tasks/recurrence.ts` (pure dates) and `lib/data-access-task-instances.ts` (writes)

**Core function:** `generateNextInstance(taskId: number, todayIso: string): Promise<TaskInstance | null>`

Logic (as shipped, amended 2026-11-04):
1. Load the template task; bail for a one-off.
2. `ensureInstanceHorizon()` tops the grid up so it always holds `HORIZON_OCCURRENCES` (7) scheduled dates from
   today onward. The anchor is the member's local day — never the last stored row — because a row dated in the
   past that nobody worked is a fabricated record. Days that lapsed while nobody opened the task stay absent; the
   tasks panel reports them as "Missed N days" and offers no way to close them.
3. Return the earliest open row from today forward (`status` neither done nor skipped), or null.

The original design step "compute next instance date from the last instance's date" is retired: chaining off the
tail produced past-dated rows for any grid that had fallen behind and never caught up.

**Triggers:** the instance PATCH when a row is closed, and `GET /api/task-instances?taskId=` for the task's own
assignee. There is no cron — `vercel.json` carries none — so the horizon is maintained where the grid is already
being read and written. A reader who is not the assignee never writes rows into someone's schedule.

**Initial population:** When a template task is created with cadence != 'one-off', generate instances for the next
30 days (daily), 12 weeks (weekly), 12 months (monthly), 8 quarters (quarterly), or 4 years (yearly). A task whose
cadence is set *later* gets the same grid, anchored at today, via `materialiseGridOnCadenceChange()` — and only
when it was a one-off before, so an existing schedule's rows and recorded work are never rewritten.

### Checklist System

**Storage:** Inline in `tasks.checklist_items` as JSON array:
```json
[
  { "id": "item-1", "label": "Servers operational", "type": "yes-no-na" },
  { "id": "item-2", "label": "Network operational", "type": "yes-no-na" }
]
```

**Instance completion:** When completing an instance, store checklist responses in `task_instances.notes` as JSON:
```json
{
  "checklist": [
    { "id": "item-1", "value": "yes" },
    { "id": "item-2", "value": "no" }
  ]
}
```

**UI:** Render as a list of checkboxes/radio buttons (yes/no/n/a) in the task completion dialog.

### Calendar Views

**Location:** Extend `app/api/calendar/events/route.ts`

**Query parameters:**
- `viewMode` — 'due' | 'cadence' | 'both' | 'range' (default `due`)
- `startDate` — range start (for 'range' mode)
- `endDate` — range end (for 'range' mode)

**Shipped logic** (`app/api/calendar/events/route.ts`):

| `viewMode` | Occurrences (`task_instances`) | Deadlines (`tasks.dueDate`) |
| --- | --- | --- |
| `due` | no | yes, `is_template = false` + due date in range |
| `cadence` | yes, in range | no |
| `both` | yes, in range | yes, `is_template = false` + due date in range |
| `range` | yes, in range | yes, `is_template = false` + due date in range |

No branch draws a template row: `is_template = false` on the deadline branch is the structural complement of
the occurrence branch, so a schedule cannot reach both lists and `both` cannot double count. Both branches are
scoped to `loadVisibleMemberIds(session.userId)` (`[session.id]` when `mineOnly`), and the occurrence branch is
always assignee-scoped so its `where` can never degrade to `sql`true``.

**Response format:** Existing calendar event format, with additional `isRecurring` and `cadence` fields.

### Report Generation

**Location:** `lib/reports/generator.ts`

**Core function:** `generateReportDraft(templateId: number, periodStart: Date, periodEnd: Date): Promise<Report>`

Logic:
1. Load the template and its `data_sources` configuration
2. Query completed task instances in the period
3. Query completed checklists in the period
4. For each section in the template:
   - If section has a `dataSource`, auto-populate from query results
   - Otherwise, leave section content empty for manual entry
5. Create a `reports` row with status='draft'

**Template sections format:**
```json
[
  {
    "id": "it-support",
    "title": "IT Support",
    "dataSource": {
      "type": "task_instances",
      "filters": { "discipline": "it_operations", "status": "done" }
    }
  },
  {
    "id": "risks",
    "title": "Risks and Recommendations",
    "dataSource": null
  }
]
```

## API Routes

### Tasks

**GET /api/tasks**
- Add query params: `cadence`, `isTemplate`, `parentTaskId`
- Return template tasks and/or instances based on filters

**POST /api/tasks**
- Accept `cadence`, `checklistItems` in request body
- If cadence != 'one-off', set `isTemplate=true` and generate initial instances
- Return created task with instance count

**PATCH /api/tasks/[id]**
- Accept `cadence`, `checklistItems` updates
- `cadence` carries `is_template` with it (`cadence !== "one-off"`), because the calendar filters on that flag; a
  body that sets `isTemplate` directly is ignored
- A `one-off → recurring` change materialises the grid anchored at today; an already-recurring task's grid is
  left alone
- A recurring task refuses any finished status (`recurringStatusError()` in `lib/task-updates.ts`) with **409**
  and the message "recurring tasks stay open — complete today's instance instead". Closing a template would
  delete the schedule it describes, and the boards hide the finished words rather than letting a drag fail.

**POST /api/tasks/[id]/complete**
- Mark instance complete
- Trigger `generateNextInstance(taskId)`
- Return updated instance and next instance

### Task Instances

**GET /api/task-instances**
- Query params: `taskId`, `startDate`, `endDate`, `status`
- Return instances in range
- When `taskId` is present and the caller is that task's assignee, top the grid up to the horizon first — this
  read is what keeps a daily task alive with no cron. A non-assignee read stays read-only.
- `GET /api/calendar/events` tops up too, on any mode that draws occurrences, because a marker you cannot click
  to completion is worse than no marker. That write-inside-a-read is bounded three ways: only schedules this
  member owns (`is_template = true` plus the visible-member scope — an unassigned schedule is visible but never
  written), at most `HORIZON_TASK_LIMIT = 25` tasks per request, and at most `MAX_HORIZON_OCCURRENCES = 90`
  occurrences per task (`horizonOccurrencesForWindow()`; `HORIZON_OCCURRENCES = 7` when the window end is
  missing or unparseable). The top-up is awaited serially and swallowed on failure, so a failed write still
  returns the rows already there.

**PATCH /api/task-instances/[id]**
- Update status, notes, checklist responses
- If status changes to 'done', return the next open occurrence from today (`generateNextInstance(taskId,
  localDay(now, session.timezone))`), which tops the grid up first if it ran out

### Calendar

**GET /api/calendar/events**
- Add `viewMode` param: 'due' | 'cadence' | 'both' | 'range'
- Return events based on view mode

### Reports

**GET /api/reports**
- Query params: `templateId`, `status`, `authorId`
- Return reports list

**POST /api/reports**
- Accept `templateId`, `periodStart`, `periodEnd`
- Call `generateReportDraft()`
- Return created draft report

**PATCH /api/reports/[id]**
- Update `content` (manual edits)
- Update `status` (draft → final)

**GET /api/report-templates**
- Return available templates
- Filter by `cadence`, `discipline`

## UI Components

### Tasks Page Enhancements

**New controls:**
- Cadence filter dropdown (one-off, daily, weekly, monthly, quarterly, yearly, all)
- Toggle: "Show templates" vs "Show instances"
- Recurring task badge on template tasks

**Instance list in the detail dialog (amended 2026-11-04):** rendered from `planInstanceWindow()` in
`lib/tasks/instance-window.ts` — today first, then the next `HORIZON_OCCURRENCES` occurrences ascending, with the
row dated today marked "Today". Earlier open rows collapse into one "Missed N days (dates…)" line and get **no**
Complete button, because a day nobody worked is history, not a task. The previous version sorted the grid
descending and cut ten rows, so the panel showed the tail of next month and buried today.

**Recurring cards stay open in the UI:** both boards hide the finished statuses on a recurring card and the
status-cycle button never lands one on Done, so the click matches the 409 the server would return.

**Task creation dialog:**
- Add cadence dropdown
- Add checklist editor (add/remove/reorder items)
- If cadence != 'one-off', show "This will generate X instances"

**Task completion dialog:**
- If task has checklist, render checklist items
- For yes/no/na items, render radio buttons
- Save responses with completion

### Calendar Page Enhancements

**New controls:**
- View mode selector: 4 buttons (Due, Cadence, Both, Range)
- Range picker: start/end date inputs (shown when mode = 'range')
- Recurring task indicator: different color/border for instances

**Event rendering:**
- One-time tasks: solid color
- Recurring instances: striped/patterned fill
- Tooltip shows cadence and instance number

The "Task deadlines · next 14 days" side list (`deadlineRows` in `app/dashboard/calendar/page.tsx`) skips a row
that is finished or that carries a schedule — a template's own due date is a creation-time artefact no
recurrence rule maintains, and its days are already on the grid as occurrences.

### Reports Page Enhancements

**New controls:**
- "Create report" button → template selection dialog
- Template selection: filter by cadence, discipline
- Report editor: section-by-section editing
- Auto-populated sections: show data with "Edit" button
- Manual sections: show empty text area
- "Save draft" and "Finalize" buttons

**Report view:**
- Render sections with headings
- Auto-populated data: tables, lists, stats
- Manual content: rendered markdown
- Export buttons: PDF, XLSX (existing)

## Migration Strategy

**Phase 1: Schema**
1. Add columns to `tasks` table (cadence, parent_task_id, is_template, checklist_items)
2. Create `task_instances` table
3. Create `report_templates` table
4. Create `reports` table
5. Write migration script with rollback

**Phase 2: Backend**
1. Implement `lib/tasks/recurrence.ts`
2. Implement `lib/reports/generator.ts`
3. Extend task API routes
4. Add task-instances API routes
5. Extend calendar API routes
6. Add reports API routes

**Phase 3: Frontend**
1. Enhance tasks page with cadence/checklist UI
2. Enhance calendar page with view modes
3. Enhance reports page with template selection and editing
4. Add task completion dialog with checklist

**Phase 4: Testing**
1. Unit tests for recurrence engine
2. Unit tests for report generator
3. Integration tests for API routes
4. E2E tests for UI flows

**Phase 5: Seed data**
1. Create IT technician report templates (daily, weekly, monthly)
2. Create sample recurring tasks
3. Create sample checklists

## Testing Strategy

**Unit tests:**
- `tests/unit/task-recurrence.test.ts` — recurrence engine logic
- `tests/unit/report-generator.test.ts` — report draft generation
- `tests/unit/checklist-helpers.test.ts` — checklist item parsing/validation

**Integration tests:**
- `tests/integration/task-instances-api.test.ts` — instance CRUD
- `tests/integration/calendar-views.test.ts` — all 4 view modes
- `tests/integration/reports-api.test.ts` — report creation/editing

**E2E tests:**
- `tests/e2e/recurring-tasks.spec.ts` — create template, complete instance, verify next generated
- `tests/e2e/checklist-completion.spec.ts` — complete task with checklist, verify responses saved
- `tests/e2e/calendar-views.spec.ts` — switch between all 4 views, verify rendering
- `tests/e2e/report-generation.spec.ts` — create report from template, edit, finalize

## Security and Permissions

**Task instances:**
- Inherit permissions from parent template task
- Scoped to assignee or team (existing task permissions)

**Reports:**
- Author-only editing for drafts
- Team-wide viewing for finalized reports (existing report permissions)
- Templates: admin-only creation, team-wide usage

**Checklist data:**
- Stored inline with task/instance
- Subject to same permissions as parent task

## Performance Considerations

**Recurrence generation:**
- Batch generate instances (30/12/12/4 upfront) to avoid per-completion DB writes
- Index on `task_instances(task_id, instance_date)` for fast lookups

**Calendar queries:**
- Materialized view for recurring task instances (refresh daily)
- Fallback to real-time query for small datasets

**Report generation:**
- Async draft generation for large datasets (>1000 task instances)
- Cache auto-populated section data (5-minute TTL)

## Future Enhancements

**Out of scope for this implementation:**
- Task dependencies (instance B cannot start until instance A completes)
- Recurrence rules beyond simple cadence (e.g., "every 2 weeks", "first Monday of month")
- Checklist item assignment (different people check different items)
- Report approval workflow (draft → review → approve → final)
- Report versioning (track changes between draft and final)
- Recurring task exceptions (skip specific dates, reschedule)

**Can be added later:**
- Extend `cadence` to support complex rules (iCal RRULE format)
- Add `task_dependencies` table
- Add checklist item assignments
- Add report approval states
- Add report version history

## Rollout Plan

**Week 1:** Schema migration + recurrence engine + unit tests
**Week 2:** Task API extensions + integration tests
**Week 3:** Tasks page UI + checklist completion
**Week 4:** Calendar views + reports backend
**Week 5:** Reports UI + seed data + E2E tests
**Week 6:** Production deployment + monitoring

## Success Criteria

- [ ] IT technician can create daily/weekly/monthly recurring tasks
- [ ] Completing an instance auto-generates the next one
- [ ] Tasks can have checklists with yes/no/n/a items
- [ ] Calendar shows tasks in 4 different view modes
- [ ] Reports can be generated from templates with auto-populated data
- [ ] Reports can be edited before finalizing
- [ ] All existing task functionality continues to work
- [ ] No performance degradation on calendar/reports pages
- [ ] Unit test coverage > 80%
- [ ] E2E tests pass for all major flows

## Appendix: IT Technician Workflow Mapping

**Daily tasks:**
- Check critical systems → recurring task (cadence=daily) with checklist
- Review backup status → recurring task (cadence=daily) with checklist
- Review support tickets → recurring task (cadence=daily)

**Weekly tasks:**
- Verify scheduled backups → recurring task (cadence=weekly) with checklist
- Perform preventive maintenance → recurring task (cadence=weekly) with checklist
- Prepare IT maintenance report → report template (cadence=weekly)

**Monthly tasks:**
- Test backup restoration → recurring task (cadence=monthly) with checklist
- Review hardware inventory → recurring task (cadence=monthly)
- Prepare IT maintenance report → report template (cadence=monthly)

**Checklists:**
- Daily checklist: 15 yes/no/n/a items (servers, network, backups, tickets, etc.)
- Weekly checklist: 13 yes/no/n/a items (backups, storage, updates, etc.)

**Reports:**
- Monthly IT Report: 6 sections (IT support, Backups, Hardware, Software, Maintenance, Risks)
