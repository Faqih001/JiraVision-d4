# Task Tracking System — Implementation Notes

**Date:** 2026-11-02
**Status:** Complete

## What Was Built

1. **Recurring Tasks** — Tasks with cadence (daily/weekly/monthly/yearly) that auto-generate instances
2. **Checklists** — Tasks can have checklist items (yes/no/n/a) that are tracked per instance
3. **Calendar Views** — 4 view modes: due dates, cadence-based, both, range
4. **Report Generation** — Template-driven reports with auto-populated data from task instances

## Database Changes

### New Columns on `tasks` Table
- `cadence` (varchar, default 'one-off')
- `parent_task_id` (integer, FK to tasks.id)
- `is_template` (boolean, default false)
- `checklist_items` (jsonb, default '[]')

### New Tables
- `task_instances` — per-occurrence tracking for recurring tasks
- `task_report_templates` — template definitions for reports
- `task_reports` — generated report instances

## API Endpoints

### New Endpoints
- `GET /api/task-instances` — list instances with filters
- `PATCH /api/task-instances/[id]` — update instance (marks complete, triggers next generation)
- `GET /api/task-reports` — list reports
- `POST /api/task-reports` — create report from template
- `PATCH /api/task-reports/[id]` — update report content/status
- `GET /api/task-report-templates` — list available templates

### Extended Endpoints
- `POST /api/tasks` — now accepts `cadence` and `checklistItems`
- `GET /api/calendar/events` — now accepts `viewMode` parameter

## UI Changes

### Tasks Page (`/dashboard/tasks`)
- Cadence filter dropdown
- Cadence badge on recurring tasks
- Checklist editor in task creation dialog
- Task instance completion dialog with checklist

### Calendar Page (`/dashboard/calendar`)
- View mode selector (Due / Cadence / Both / Range)
- Recurring task instances rendered with distinct styling

### Reports Page (`/dashboard/reports`)
- "Create Report" button with template selection dialog
- Report editor with section-by-section editing
- Auto-populated sections show data count
- Manual sections have text areas
- Save draft and Finalize buttons

## Migration Scripts

Run in order:
1. `node scripts/create-task-instances-table.mjs` — adds columns to tasks, creates task_instances
2. `node scripts/create-task-report-templates-table.mjs` — creates report templates and reports tables
3. `node scripts/seed-it-technician-data.mjs` — seeds IT technician templates and sample tasks

## Testing

### Unit Tests
- `tests/unit/task-recurrence.test.ts` — recurrence engine
- `tests/unit/checklist-helpers.test.ts` — checklist parsing/validation
- `tests/unit/task-report-generator.test.ts` — report section builder

### E2E Tests
- `tests/e2e/recurring-tasks.spec.ts` — recurring task creation and completion
- `tests/e2e/calendar-views.spec.ts` — calendar view mode switching
- `tests/e2e/report-generation.spec.ts` — report creation and editing

## Key Design Decisions

1. **Instance Generation** — Instances are pre-generated (30 daily, 12 weekly, 12 monthly, 4 yearly) when a recurring task is created. The next instance is auto-generated when the current one is completed.

2. **Checklist Storage** — Checklist items are stored inline in `tasks.checklist_items` as JSON. Responses are stored in `task_instances.checklist_responses` as JSON.

3. **Calendar View Modes** — The `viewMode` parameter controls what data is returned:
   - `due` — tasks with due dates in range
   - `cadence` — task instances in range
   - `both` — combine due and cadence
   - `range` — all tasks and instances in explicit date range

4. **Report Templates** — Templates define sections with optional data sources. The report generator pulls task instances and checklists into auto-populated sections. Manual sections are left empty for user input.

5. **Separation from Existing Reports** — The new `task_report_templates` and `task_reports` tables are separate from the existing `report_schedules` and `report_runs` tables to avoid collision with the analytics report system.

## Future Enhancements (Out of Scope)

- Complex recurrence rules (iCal RRULE format)
- Task dependencies
- Checklist item assignments
- Report approval workflow
- Report versioning
- Recurring task exceptions (skip dates, reschedule)

## Rollout Checklist

- [x] Schema migrations written and tested
- [x] Recurrence engine implemented with unit tests
- [x] Checklist helpers implemented with unit tests
- [x] Task API extended for cadence and checklists
- [x] Task instances API implemented
- [x] Calendar API extended for view modes
- [x] Report generator implemented with unit tests
- [x] Reports API implemented
- [x] Tasks page UI enhanced
- [x] Calendar page UI enhanced
- [x] Reports page UI enhanced
- [x] Seed data script created
- [x] E2E tests written
- [x] Documentation updated
- [ ] Run all migrations on staging
- [ ] Seed IT technician data on staging
- [ ] Verify all features work end-to-end on staging
- [ ] Run all migrations on production
- [ ] Seed IT technician data on production
- [ ] Monitor for issues
