# Phase 5: Exports — PDF, XLSX, extended CSV

Date: 2026-10-27
Spec: §10 of `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`

## Goal

Ship the three export formats the spec promises: PDF (three layouts), XLSX (multi-sheet), and extended CSV/JSON (four new datasets). All exports are client-side from data already on screen — no server runtime to install, and they work on a bad connection because the fetch already happened.

## Tasks

### Task 1: Install dependencies
- `npm install jspdf jspdf-autotable exceljs`
- Verify typecheck passes after install

### Task 2: PDF export module — `lib/export/pdf.ts`
- Three layouts: `report`, `log`, `plan`
- `report`: cover block (author, period, team, recipients, status, revision), KPI strip, sections as tables/prose, page numbers, footer
- `log`: day-by-day table of entries and deliverables for an arbitrary range
- `plan`: title, horizon, lane-grouped table
- Pure functions, no DB access, take data as input
- Filename convention: `jiravision-<scope>-<stamp>.pdf`

### Task 3: XLSX export module — `lib/export/xlsx.ts`
- Sheets: `Report`, `Entries`, `Deliverables`, `By discipline`, `By status`, `Monthly series` (yearly only)
- Real date/number formats, frozen header row, autofilter
- Pure functions, no DB access
- Filename convention: `jiravision-<scope>-<stamp>.xlsx`

### Task 4: Extend server-side CSV/JSON — `app/api/reports/_shared.ts`
- Add four new datasets to `DATASETS`: `worklog`, `deliverables`, `plans`, `work_reports`
- Each with appropriate `groupBys` and `valueLabel`
- Extend `buildDataset()` to query the new tables
- Visibility enforced: worklog/deliverables only for own rows, plans/reports filtered by recipient/admin

### Task 5: Report builder export buttons — `app/dashboard/reports-work/reports-client.tsx`
- Add "Export PDF" and "Export XLSX" buttons (visible for all statuses)
- PDF button calls `exportReportPdf(report, metrics, entries, deliverables)` from `lib/export/pdf.ts`
- XLSX button calls `exportReportXlsx(report, metrics, entries, deliverables)` from `lib/export/xlsx.ts`
- Both are client-side, no server round-trip

### Task 6: Worklog export buttons — `app/dashboard/worklog/worklog-client.tsx`
- Add "Export PDF" and "Export XLSX" buttons next to existing "Export CSV"
- PDF uses `log` layout: day-by-day table of selected entries
- XLSX uses `Entries` sheet only
- All three formats reflect the current selection

### Task 7: Tests for PDF module — `tests/unit/export-pdf.test.ts`
- Guard tests: verify the three layouts exist, verify filename convention, verify page structure
- No actual PDF rendering (that would require a browser), just structure assertions

### Task 8: Tests for XLSX module — `tests/unit/export-xlsx.test.ts`
- Guard tests: verify sheet names, verify frozen header row, verify autofilter, verify date formats
- Can inspect the generated workbook structure without opening it

### Task 9: Tests for extended CSV datasets — `tests/unit/export-datasets.test.ts`
- Verify the four new datasets are registered
- Verify `buildDataset()` returns the expected shape for each
- Verify visibility enforcement (own rows only for worklog/deliverables)

### Task 10: Docs sync
- FEATURES.md §11: Exports (phase 5, 2026-10-27)
- DESIGN_SYSTEM.md §14: Export buttons and layouts
- PLACEHOLDERS.md §10: No new placeholders
- Spec sync: mark §10 as implemented

### Task 11: Gates
- typecheck: 0 errors
- lint: 0 errors, ≤70 warnings
- tests: all passing
- commit and push

## Deliberately absent

- AI prose generation (phase 9)
- Gantt image in PDF (phase 8 — the Gantt does not exist yet)
- Server-side PDF rendering (the spec says client-side, no server runtime)
- Print stylesheet (phase 11 mentions it, but it's a separate concern)

## File ownership

- `lib/export/pdf.ts` — new file
- `lib/export/xlsx.ts` — new file
- `app/api/reports/_shared.ts` — extend existing
- `app/dashboard/reports-work/reports-client.tsx` — extend existing
- `app/dashboard/worklog/worklog-client.tsx` — extend existing
- `tests/unit/export-pdf.test.ts` — new file
- `tests/unit/export-xlsx.test.ts` — new file
- `tests/unit/export-datasets.test.ts` — new file
- `FEATURES.md`, `DESIGN_SYSTEM.md`, `PLACEHOLDERS.md` — extend existing
