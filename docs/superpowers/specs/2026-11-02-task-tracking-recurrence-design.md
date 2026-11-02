# Task Tracking with Recurrence, Checklists, Calendar Views, and Reports

**Date:** 2026-11-02  
**Status:** Approved for implementation  
**Scope:** Architectural — new subsystem extending existing task tracking

## Overview

Extend the existing task tracking system to support:
1. **Recurring tasks** — Tasks with cadence (daily/weekly/monthly/yearly) that auto-generate next instance on completion
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

**Location:** `lib/tasks/recurrence.ts`

**Core function:** `generateNextInstance(taskId: number): Promise<void>`

Logic:
1. Load the template task
2. Compute next instance date using `computeNextRun(task.cadence, lastInstance.instance_date)`
3. Create new row in `task_instances` with status='todo'
4. If the task has checklist items, copy them to the instance (stored in instance metadata)

**Trigger:** Called automatically when a task instance is marked complete.

**Initial population:** When a template task is created with cadence != 'one-off', generate instances for the next 30 days (daily), 12 weeks (weekly), 12 months (monthly), or 4 quarters (yearly).

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
- `viewMode` — 'due' | 'cadence' | 'both' | 'range'
- `startDate` — range start (for 'range' mode)
- `endDate` — range end (for 'range' mode)

**Logic:**
- **due:** Return tasks with dueDate in the query range
- **cadence:** Return task instances for recurring tasks in the query range
- **both:** Combine due and cadence
- **range:** Return all tasks (one-time + instances) within startDate/endDate

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
- If cadence changes, regenerate instances

**POST /api/tasks/[id]/complete**
- Mark instance complete
- Trigger `generateNextInstance(taskId)`
- Return updated instance and next instance

### Task Instances

**GET /api/task-instances**
- Query params: `taskId`, `startDate`, `endDate`, `status`
- Return instances in range

**PATCH /api/task-instances/[id]**
- Update status, notes, checklist responses
- If status changes to 'done', trigger next instance generation

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
- Cadence filter dropdown (one-off, daily, weekly, monthly, yearly, all)
- Toggle: "Show templates" vs "Show instances"
- Recurring task badge on template tasks

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
