# Phase 8: Gantt view and drag-to-move

Date: 2026-10-27
Spec: §8 of `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`

## Goal

Ship the Gantt view for plans and promoted tasks: hand-built SVG/CSS grid with lanes grouped by discipline or assignee, day/week/month zoom, today marker, dependency arrows, drag-to-move that commits on drop and writes a task_events row, hover card, visible keyboard focus, prefers-reduced-motion honoured, horizontal scroll below md. The Gantt feeds from plan_items (draft) or tasks (promoted) through one selector.

## Tasks

### Task 1: Gantt data model and selector
- `lib/planner/gantt-data.ts` — pure functions to transform plan_items or tasks into Gantt lanes
- Lane grouping by discipline or assignee
- Date range calculation from items' startDate/dueDate
- Zoom levels: day, week, month
- Dependency resolution (dependsOn from plan_items or tags._dependsOn from tasks)

### Task 2: Gantt component shell
- `components/planner/gantt.tsx` — SVG/CSS grid component
- Props: items, groupBy (discipline | assignee), zoom (day | week | month), onItemMove
- Layout: time axis (top), lanes (rows), today marker (vertical line)
- Responsive: horizontal scroll below md breakpoint

### Task 3: Gantt bar rendering
- SVG rects for each item with position calculated from dates
- Color coding by status or discipline
- Milestone markers (diamond shape)
- Dependency arrows between bars (SVG paths)
- Hover card with item details

### Task 4: Drag-to-move interaction
- Mouse and touch drag handlers on bars
- Visual feedback during drag (ghost bar, snap to grid)
- Commit on drop: calculate new dates, call onItemMove callback
- Keyboard support: arrow keys to move selected bar
- Write task_events row on commit (for promoted tasks)

### Task 5: Accessibility and motion
- Visible keyboard focus on bars and controls
- ARIA labels for bars, lanes, today marker
- prefers-reduced-motion: disable drag animations, simplify transitions
- Screen reader announcements for move operations

### Task 6: Gantt view integration
- Add Gantt tab to plan editor (for drafts)
- Add Gantt tab to a new promoted-tasks view (or integrate into existing task views)
- Zoom controls (day/week/month buttons)
- Group-by toggle (discipline/assignee)
- URL query params for zoom and groupBy

### Task 7: Gantt tests
- `tests/unit/gantt-data.test.ts` — lane grouping, date range, dependency resolution
- `tests/unit/gantt-component.test.ts` — rendering, accessibility, motion preferences
- `tests/unit/gantt-interaction.test.ts` — drag-to-move, keyboard, commit logic

### Task 8: Docs sync
- FEATURES.md §13: update Planner section with Gantt
- DESIGN_SYSTEM.md §15: add Gantt component specs
- PLACEHOLDERS.md §12: remove Gantt from "deliberately absent"

### Task 9: Gates and commit
- typecheck: 0 errors
- lint: 0 errors, ≤70 warnings
- tests: all passing
- commit and push

## Deliberately absent

- PDF export of Gantt (mentioned in spec but not core to this phase — the PDF export module already has a `plan` layout that uses a table, not the Gantt image)
- Real-time collaboration on Gantt (no WebSocket sync for drag operations)
- Critical path calculation (the dependency arrows show relationships, but no CPM algorithm)

## File ownership

- `lib/planner/gantt-data.ts` — new file
- `components/planner/gantt.tsx` — new file
- `components/planner/gantt-bar.tsx` — new file (individual bar rendering)
- `components/planner/gantt-controls.tsx` — new file (zoom, group-by toggles)
- `app/dashboard/planner/[id]/plan-editor-client.tsx` — extend with Gantt tab
- `tests/unit/gantt-{data,component,interaction}.test.ts` — new files
- `FEATURES.md`, `DESIGN_SYSTEM.md`, `PLACEHOLDERS.md` — extend existing
