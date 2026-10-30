# JiraVision discipline ops seeds (75 files)

One JSON file per work discipline in `disciplines/`, plus `_index.json` and `_schema.json`.

## What each file holds
`discipline` and `pack` identity; `provenance`; `method`; `surfaces` (overview KPIs and recommendation rules, log entities, register tracking, playbook seeds, recurring task templates, report sections); `ai` (policy and agent flavours); `needsConfirmation`.

## Provenance (read this)
- `technician.json` is **derived from the IT Technician handover** (the one document we had).
- The other **74 files are proposed seeds** written without a source document. They are starting points, not professional, clinical, legal, financial or safety guidance. `provenance.reviewerRole` names who should review each before use.

## Rules built into every file
- KPI targets are `null` (set by the owner). Every KPI has `computedBy: "code"`; the model never produces numbers.
- Playbook phases use `phasesFrom: "method"`: resolve with `getMethodForDiscipline(pack, discipline)` at runtime. `method.documentedSequence` is filled only for the 11 disciplines whose sequence appears in the roles doc; verify against the code.
- `ladderDiscipline.proposed` is a guess from the pack: verify against `lib/auto-populate.ts`.
- Restricted packs (finance, hr, healthcare-science) and listed entities are excluded from provider prompts (`ai.policy`). Patient, employee and account data is never sent.
- Register `kind` values are the pack's existing kinds only; nothing new is invented.

## Suggested import
Merge each file into its pack's `ops_config` under `disciplines.<key>`, keep the pack-level defaults, and make the seed idempotent. Test on a dev database before any production seed.
