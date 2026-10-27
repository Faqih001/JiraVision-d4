# Phase 7: Planner — extract, edit, promote

Date: 2026-10-27
Spec: §8 of `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`

## Goal

Ship the planner workspace: upload a PDF or paste text, extract a plan with Gemini, edit the draft, then promote it to real tasks in one transaction. The Gantt view is phase 8; this phase delivers Grid, List, and Board views.

## Tasks

### Task 1: Plan extraction schema and validator
- `lib/planner/extract.ts` — zod schema for the extraction response
- Validate title, summary, horizon, items with all fields
- `dependsOnItemIndex` is index-based, resolves to real ids at promote

### Task 2: Extraction API route
- `POST /api/planner/extract` — accepts PDF (inline, ≤15MB) or text
- Calls `geminiJson` with the plan schema
- Writes `agent_plans` + `plan_items` with `status='draft'`
- Returns the plan id for editing

### Task 3: Plan list and detail routes
- `GET /api/planner` — list user's plans (draft and promoted)
- `GET /api/planner/[id]` — read one plan with all items
- `PATCH /api/planner/[id]` — update plan metadata (title, summary)
- `DELETE /api/planner/[id]` — discard a draft plan

### Task 4: Plan item CRUD routes
- `PATCH /api/planner/[id]/items/[itemId]` — update one item (title, description, discipline, dates, estimate, dependencies, cadence, milestone, deliverable)
- `POST /api/planner/[id]/items` — add a new item
- `DELETE /api/planner/[id]/items/[itemId]` — remove an item

### Task 5: Promote transaction
- `POST /api/planner/[id]/promote` — one transaction:
  - Insert into `tasks` for each item
  - Stamp `tasks.source_plan_id`
  - Resolve `dependsOnItemIndex` onto new task ids
  - Create deliverable rows where specified
  - Write `task_events` birth row for each new task
  - Flip plan status to `promoted`

### Task 6: Planner page shell
- `app/dashboard/planner/page.tsx` — page shell with Suspense
- `app/dashboard/planner/planner-client.tsx` — client component
- Drop zone for PDF/text input
- Extraction button (disabled when no API key)
- Plans list (draft and promoted)

### Task 7: Plan editor UI
- Editable draft view: inline editing for all item fields
- Add/delete item buttons
- Promote and Discard actions
- Validation feedback (missing required fields, circular dependencies)

### Task 8: Plan views (Grid, List, Board)
- Grid view: table with columns for title, discipline, dates, status, estimate
- List view: cards with full detail
- Board view: grouped by status or discipline
- Filters: discipline, status, cadence, milestone-only, date range, assignee, search
- URL query params for all filters
- Bulk select with actions (set discipline, set assignee, shift dates, promote, export)

### Task 9: Tests
- `tests/unit/planner-extract.test.ts` — schema validation
- `tests/unit/planner-promote.test.ts` — transaction logic
- `tests/unit/planner-page.test.ts` — guard tests for UI structure

### Task 10: Docs sync
- FEATURES.md §13: Planner (phase 7)
- DESIGN_SYSTEM.md §15: Planner components and views
- PLACEHOLDERS.md §12: Gantt is phase 8

### Task 11: Gates and commit
- typecheck: 0 errors
- lint: 0 errors, ≤70 warnings
- tests: all passing
- commit and push

## Deliberately absent

- Gantt view (phase 8)
- Drag-to-move on Gantt (phase 8)
- Cadence-based row generation (mentioned in spec but not core to this phase)
- PDF export of Gantt (phase 8)

## File ownership

- `lib/planner/extract.ts` — new file
- `app/api/planner/extract/route.ts` — new file
- `app/api/planner/route.ts` — new file
- `app/api/planner/[id]/route.ts` — new file
- `app/api/planner/[id]/items/route.ts` — new file
- `app/api/planner/[id]/items/[itemId]/route.ts` — new file
- `app/api/planner/[id]/promote/route.ts` — new file
- `app/dashboard/planner/page.tsx` — new file
- `app/dashboard/planner/planner-client.tsx` — new file
- `tests/unit/planner-{extract,promote,page}.test.ts` — new files
- `FEATURES.md`, `DESIGN_SYSTEM.md`, `PLACEHOLDERS.md` — extend existing
