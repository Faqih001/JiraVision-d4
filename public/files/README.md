# JiraVision discipline ops seeds (75 files)

One JSON file per work discipline in `disciplines/`, plus `_index.json` and `_schema.json`.

## What each file holds
`discipline` and `pack` identity; `provenance`; `method`; `surfaces` (overview KPIs and recommendation rules, log entities incl. daily/weekly checklists, register tracking and record categories, playbooks, recurring task templates, report sections and cadence content); `ai` (policy and agent flavours); `needsConfirmation`.

## Provenance (read this)
- `technician.json` is **derived from the IT Technician handover** (the one source document we had).
- The other **74 files are detailed proposed seeds** written from general professional practice without a source document (`provenance.detailLevel: "detailed"`). Each has 4+ step-by-step playbooks, daily/weekly/monthly/quarterly task lists, daily and weekly checklist entities, 5+ escalation triggers, a role-handover playbook and 6+ record categories. They are not professional, clinical, legal, financial or safety guidance. `provenance.reviewerRole` names who should review each before use.

## Rules built into every file
- KPI targets are `null` (set by the owner). Every KPI has `computedBy: "code"`; the model never produces numbers.
- Playbooks carry explicit steps (`phasesFrom: "custom"`). `method.resolveAtRuntime` points at `getMethodForDiscipline(pack, discipline)` for tagging work-log entries with a method phase; `method.documentedSequence` is filled only for the 11 disciplines whose sequence appears in the roles doc (verify against the code).
- `ladderDiscipline.proposed` is a guess from the pack: verify against `lib/auto-populate.ts`.
- Restricted packs (finance, hr, healthcare-science) and listed entities are excluded from provider prompts (`ai.policy`). Patient, employee and account data is never sent; logs use codes, not names.
- Register `kind` values are the pack's existing kinds only; nothing new is invented.

## Suggested import
Merge each file into its pack's `ops_config` under `disciplines.<key>`, keep pack-level defaults, make the seed idempotent, and test on a dev database before any production seed.
