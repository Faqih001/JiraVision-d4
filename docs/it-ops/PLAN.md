# Operations Engine Implementation Plan

**Phase 0: Recon** — 2026-10-29  
**Status**: Complete, ready for Phase 1

---

## 1. Code vs Documentation Verification

### Question (a): Developer pack disciplines (5 vs 7; are devops/database in it-technician or developer?)

**Answer**: The code is correct. The developer pack has **5 disciplines**:
- developer
- architect
- data_engineering
- ai_ml
- tester

**devops** and **database** are in the **it-technician pack** (along with technician, it_operations, networking, security). This is the correct separation: devops and database are operational disciplines, not pure software development.

**Evidence**: `lib/packs/seed.ts:23-29` (DEVELOPER_DISCIPLINES), `lib/packs/seed.ts:13-20` (IT_TECHNICIAN_DISCIPLINES)

### Question (b): Phase 5 status (complete vs in progress)

**Answer**: Phase 5 (Department-to-Pack Mapping) is **COMPLETE**. All 12 packs are seeded to production, all departments have defaultPack mappings, and auto-populate uses department config.

**Evidence**: 
- `ROLES_DEPARTMENTS.md:777` — "Status: All department-to-pack mappings are defined and seeded to production database."
- Database query confirmed 12 role_packs rows (2026-10-29)

### Question (c): Ladder keys (hr, sales_marketing, healthcare_science vs discipline names)

**Answer**: The code uses **ladder discipline keys** (hr, sales_marketing, healthcare_science), not work discipline names. This is correct — career ladders are grouped by professional category, not by individual work discipline.

**Evidence**: `lib/career/ladder-seed.ts:12-25` (LADDER_DISCIPLINES array)

### Question (d): Stale "only 2 packs seeded" text

**Answer**: This text is marked as **FIXED** in `ROLES_DEPARTMENTS.md:262-273`. All 11 specialized packs plus general fallback are now implemented and seeded.

### Question (e): Does lib/auto-populate.ts already return pack, ladder, method and template?

**Answer**: **YES**. The `AutoPopulateResult` type includes all four fields:
- `discipline: WorkDiscipline | null`
- `rolePack: string | null`
- `careerLadder: string | null`
- `reportTemplate: string | null`
- `method: string[] | null`

**Evidence**: `lib/auto-populate.ts:11-17` (AutoPopulateResult type), `lib/auto-populate.ts:245-275` (autoPopulateFromJobTitle function)

---

## 2. Can packs carry opsConfig through existing role_packs JSON/seed path?

**Answer**: **Partially**. The current `role_packs` table has JSONB columns:
- `disciplines` (WorkDiscipline[])
- `register_kinds` (RegisterKind[])
- `sections` (string[])
- `onboarding` (string[])
- `method` (string[])

**Missing**: The `methods` field (discipline-specific method overrides) is **NOT** in the database schema. It exists only in the TypeScript seed file (`lib/packs/seed.ts`) and is resolved at runtime by `getMethodForDiscipline()` helper.

**For opsConfig**: We need to add a new JSONB column `ops_config` to the `role_packs` table. This column will store:
```typescript
{
  logs: { [entityKey: string]: LogEntityConfig },
  kpis: KpiConfig[],
  playbookSeeds: PlaybookSeed[],
  reportTemplates: ReportTemplateConfig[],
  automationTemplates: AutomationTemplate[],
  recommendRules: RecommendRule[],
  aiPolicy: { standard | restricted, excludedEntities: string[] }
}
```

**Migration required**: YES. Add `ops_config JSONB` column to `role_packs` table. The seed script will populate it from `lib/packs/ops/<packKey>.ts` files.

---

## 3. Registers: suitability for each pack's kinds

**Current state**: The `register_items` table has:
- `pack_key` (VARCHAR 60)
- `kind` (VARCHAR 40)
- `title` (TEXT)
- `fields` (JSONB) — arbitrary key-value pairs
- `status` (VARCHAR 30)
- `last_verified_at` (TIMESTAMPTZ)
- `verify_interval_days` (INTEGER)
- `owner_id` (INTEGER) — references users.id
- `created_at`, `updated_at`

**Suitability**: **HIGH**. The `fields` JSONB column allows arbitrary structured data per register kind. Each pack can define its own register kinds with custom fields:
- IT Technician: Infrastructure (server_name, location, ip_address), Equipment (asset_tag, condition), etc.
- Developer: Repositories (url, language, last_commit), Pull requests (status, reviewers), etc.
- Healthcare: Patients (patient_id, diagnosis), Clinical protocols (protocol_name, version), etc.

**Volume limits**: No explicit limit in schema. The `fields` JSONB column can store up to 1 GB per row (PostgreSQL limit), but practical limit is ~100 KB per row for performance.

**Bulk verify**: YES. `/api/registers/bulk` accepts POST with mixed updates and deletes.

**Credential refusal**: YES. `/api/registers` route validates field names against a blocklist (password, secret, token, key, api_key, etc.) and refuses to store credential-shaped values.

**Evidence**: `app/api/registers/route.ts`, `lib/registers/fields.ts` (credential validation)

---

## 4. Tasks: can they carry category, support type, site, asset ref, resolved_at, SLA target?

**Current state**: The `tasks` table has:
- `id`, `title`, `description`
- `status` (VARCHAR 30)
- `priority` (VARCHAR 20)
- `due_date` (DATE)
- `start_date` (DATE)
- `discipline` (VARCHAR 40)
- `assignee_id` (INTEGER)
- `sprint_id` (INTEGER)
- `created_at`, `updated_at`

**Missing for IT Operations**:
- `category` (e.g., "incident", "request", "problem", "change") — NOT in schema
- `support_type` (e.g., "break/fix", "service request", "access request") — NOT in schema
- `site` (e.g., "IT Room", "MCS office", "Advocates office") — NOT in schema
- `asset_ref` (reference to register_items.id) — NOT in schema
- `resolved_at` (TIMESTAMPTZ) — NOT in schema
- `sla_target` (INTERVAL or TIMESTAMPTZ) — NOT in schema

**Migration required**: YES. Add these columns to `tasks` table:
```sql
ALTER TABLE tasks ADD COLUMN category VARCHAR(40);
ALTER TABLE tasks ADD COLUMN support_type VARCHAR(40);
ALTER TABLE tasks ADD COLUMN site VARCHAR(100);
ALTER TABLE tasks ADD COLUMN asset_ref INTEGER REFERENCES register_items(id);
ALTER TABLE tasks ADD COLUMN resolved_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN sla_target TIMESTAMPTZ;
```

**Alternative**: Store these in a JSONB `metadata` column instead of adding 6 new columns. This is more flexible but less queryable.

**Recommendation**: Add `metadata JSONB` column to `tasks` table. Packs can define their own task metadata schema in `opsConfig.logs.tasks.metadata`.

---

## 5. Work Reports: do templates allow per-pack section order and KPI binding?

**Current state**: The `work_reports` table has:
- `id`, `user_id`, `period_type`, `period_start`, `period_end`
- `title`, `template` (VARCHAR 30)
- `status` (VARCHAR 30)
- `sections` (JSONB) — array of section objects
- `submitted_at`, `created_at`, `updated_at`

**Template system**: `lib/reports/templates.ts` defines 5 report templates:
- `general` — generic sections
- `engineering` — sprint-focused sections
- `technical` — IT operations sections
- `assurance` — compliance-focused sections
- `creative` — design-focused sections

**Per-pack section order**: YES. The `sections` JSONB column stores the section order per report. Each pack can define its own default section order in `opsConfig.reportTemplates`.

**KPI binding**: **NOT YET IMPLEMENTED**. The current template system does not bind sections to KPI definitions. We need to:
1. Add `kpi_bindings` JSONB column to `work_reports` table
2. Define KPI schema in `opsConfig.kpis`
3. Update report builder to render KPI values from `kpi_bindings`

**Evidence**: `lib/reports/templates.ts`, `app/api/reports/work/route.ts`

---

## 6. Automation: triggers/actions

**Current state**: The `automation_rules` table has:
- `id`, `user_id`, `name`, `description`
- `trigger` (JSONB) — trigger config
- `condition` (JSONB) — condition config
- `action` (JSONB) — action config
- `enabled` (BOOLEAN)
- `created_at`, `updated_at`

**Triggers**: The `trigger` JSONB column stores:
```typescript
{
  type: "task_status_change" | "task_due" | "register_stale" | "report_missing" | "schedule",
  config: { ... }
}
```

**Actions**: The `action` JSONB column stores:
```typescript
{
  type: "create_task" | "update_task" | "send_notification" | "create_register_row" | "log_work",
  config: { ... }
}
```

**Suitability for opsConfig**: **HIGH**. The JSONB trigger/condition/action columns allow packs to define their own automation templates in `opsConfig.automationTemplates`.

**Evidence**: `app/api/automation/route.ts`, `lib/automation/registry.ts`

---

## 7. Calendar: recurrence

**Current state**: The `calendar_events` table has:
- `id`, `user_id`, `title`, `description`
- `start_time` (TIMESTAMPTZ), `end_time` (TIMESTAMPTZ)
- `event_type` (VARCHAR 30)
- `location` (VARCHAR 255)
- `attendees` (JSONB)
- `task_id` (INTEGER)
- `created_at`, `updated_at`

**Recurrence**: **NOT IMPLEMENTED**. There is no `recurrence` column or `recurrence_rule` JSONB column.

**Migration required**: YES. Add `recurrence_rule JSONB` column to `calendar_events` table:
```typescript
{
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: number,
  daysOfWeek: number[], // 0-6, Sunday-Saturday
  dayOfMonth: number, // 1-31
  monthOfYear: number, // 1-12
  endDate: string, // ISO date
  count: number // number of occurrences
}
```

**Alternative**: Use a separate `calendar_recurrence` table with foreign key to `calendar_events`. This is more normalized but more complex.

**Recommendation**: Add `recurrence_rule JSONB` column to `calendar_events` table. Packs can define recurring events in `opsConfig.playbookSeeds`.

---

## 8. Team-settings: capability matrix for Admin/manager read access

**Current state**: The `team_settings` table has:
- `id`, `workspace_id`
- `governance` (JSONB) — access control config
- `created_at`, `updated_at`

**Governance structure**:
```typescript
{
  defaultAccess: {
    canViewAllTasks: boolean,
    canViewAllReports: boolean,
    canViewAllRegisters: boolean,
    canViewAllWorklogs: boolean,
  },
  roles: {
    [roleName: string]: {
      canViewTeamDashboard: boolean,
      canEditTeamSettings: boolean,
      canManageMembers: boolean,
      canViewAnalytics: boolean,
    }
  }
}
```

**Admin/manager read access**: YES. The `governance` JSONB column allows Admin to grant managers read access to team dashboards, analytics, and reports.

**Suitability for opsConfig**: **HIGH**. Admin can configure per-pack read access in `opsConfig.aiPolicy`:
```typescript
{
  aiPolicy: {
    standard | restricted,
    excludedEntities: string[],
    adminReadAccess: boolean,
    managerReadAccess: boolean,
  }
}
```

**Evidence**: `app/api/team/settings/route.ts`, `lib/team/governance.ts`

---

## 9. Proposed schema diff

### New tables

```sql
-- ops_log_entries: generic time-series log for all packs
CREATE TABLE ops_log_entries (
  id SERIAL PRIMARY KEY,
  pack_key VARCHAR(60) NOT NULL,
  entity_key VARCHAR(40) NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(30),
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ops_log_entries_owner_idx ON ops_log_entries(owner_id);
CREATE INDEX ops_log_entries_pack_idx ON ops_log_entries(pack_key);
CREATE INDEX ops_log_entries_entity_idx ON ops_log_entries(entity_key);
CREATE INDEX ops_log_entries_occurred_idx ON ops_log_entries(occurred_at);
```

### Alter existing tables

```sql
-- Add ops_config to role_packs
ALTER TABLE role_packs ADD COLUMN ops_config JSONB;

-- Add metadata to tasks
ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add kpi_bindings to work_reports
ALTER TABLE work_reports ADD COLUMN kpi_bindings JSONB DEFAULT '{}'::jsonb;

-- Add recurrence_rule to calendar_events
ALTER TABLE calendar_events ADD COLUMN recurrence_rule JSONB;
```

---

## 10. Route list

### New routes

```
GET  /api/ops/logs                    — list ops_log_entries for member's pack
POST /api/ops/logs                    — create ops_log_entry
GET  /api/ops/logs/[id]               — get ops_log_entry
PUT  /api/ops/logs/[id]               — update ops_log_entry
DELETE /api/ops/logs/[id]             — delete ops_log_entry

GET  /api/ops/kpis                    — compute KPIs for member's pack
GET  /api/ops/kpis/[kpiId]            — get KPI detail

GET  /api/ops/playbooks               — list playbook seeds for member's pack
POST /api/ops/playbooks/run           — run a playbook (creates ops_log_entries)

GET  /api/ops/recommendations         — list recommendations for member's pack
```

### Extend existing routes

```
POST /api/agent/ops/handover          — document ingest (G1)
POST /api/agent/ops/triage            — intake and triage (G2)
POST /api/agent/ops/notes             — notes to entries (G3)
POST /api/agent/ops/log-reader        — log reader (G4)
POST /api/agent/ops/report-drafter    — report drafter (G5)
POST /api/agent/ops/rule-drafter      — rule drafter (G6)
POST /api/agent/ops/plan-extractor    — plan and objectives (G7)
POST /api/agent/ops/improvement       — improvement drafter (G8)
POST /api/agent/ops/assistant         — workspace assistant with pack context (G9)
POST /api/agent/ops/evidence          — evidence pack (G10)
POST /api/agent/ops/playbook-drafter  — playbook drafter (G11)
```

---

## 11. Sidebar changes

### Add "My Operations" group

```typescript
// components/dashboard-layout.tsx
{
  group: "My Operations",
  items: [
    { href: "/dashboard/ops", label: "Operations overview", icon: Activity },
    { href: "/dashboard/ops/logs", label: "Activity logs", icon: FileText },
    { href: "/dashboard/ops/kpis", label: "KPIs", icon: TrendingUp },
  ]
}
```

**Visibility**: Only show "My Operations" group if member's pack has `ops_config` defined.

---

## 12. Test list

### Unit tests

```
tests/unit/ops-config.test.ts          — validate opsConfig schema for all 12 packs
tests/unit/ops-logs.test.ts            — ops_log_entries CRUD
tests/unit/ops-kpis.test.ts            — KPI computation
tests/unit/ops-recommendations.test.ts — recommendation rules
tests/unit/ops-agent-triage.test.ts    — G2 agent (provider stubbed)
tests/unit/ops-agent-notes.test.ts     — G3 agent (provider stubbed)
tests/unit/ops-agent-report.test.ts    — G5 agent (provider stubbed)
tests/unit/ops-restricted-entities.test.ts — prove healthcare/hr/finance excluded entities never reach provider
```

### Integration tests

```
tests/integration/ops-it-technician.test.ts — IT Technician pack end-to-end
tests/integration/ops-developer.test.ts     — Developer pack end-to-end
tests/integration/ops-healthcare.test.ts    — Healthcare pack restricted entities
```

### Scoping tests

```
tests/unit/ops-scoping.test.ts — prove every new read endpoint is member-scoped
```

---

## 13. PR-by-PR sequence

### PR 1: Schema migration (Phase 1, Task 1)
- Add `ops_config` JSONB column to `role_packs`
- Add `metadata` JSONB column to `tasks`
- Add `kpi_bindings` JSONB column to `work_reports`
- Add `recurrence_rule` JSONB column to `calendar_events`
- Create `ops_log_entries` table
- Write migration script `scripts/create-ops-tables.mjs`
- Write rollback script `scripts/rollback-ops-tables.mjs`
- Add unit test `tests/unit/ops-schema.test.ts`

### PR 2: opsConfig type and validator (Phase 1, Task 2)
- Define `OpsConfig` type in `lib/packs/ops/types.ts`
- Define Zod validator in `lib/packs/ops/validator.ts`
- Add unit test `tests/unit/ops-config.test.ts`

### PR 3: IT Technician opsConfig (Phase 1, Task 3)
- Create `lib/packs/ops/it-technician.ts` with full opsConfig
- Seed opsConfig to database
- Add unit test `tests/unit/ops-it-technician-config.test.ts`

### PR 4: ops_log_entries CRUD (Phase 1, Task 4)
- Create `lib/ops/logs.ts` with CRUD helpers
- Create `/api/ops/logs` route (GET, POST)
- Create `/api/ops/logs/[id]` route (GET, PUT, DELETE)
- Add member-scoping guard
- Add unit test `tests/unit/ops-logs.test.ts`

### PR 5: KPI computation (Phase 1, Task 5)
- Create `lib/ops/kpis.ts` with KPI computation logic
- Create `/api/ops/kpis` route (GET)
- Create `/api/ops/kpis/[kpiId]` route (GET)
- Add member-scoping guard
- Add unit test `tests/unit/ops-kpis.test.ts`

### PR 6: Recommendation rules (Phase 1, Task 6)
- Create `lib/ops/recommendations.ts` with rule engine
- Create `/api/ops/recommendations` route (GET)
- Add member-scoping guard
- Add unit test `tests/unit/ops-recommendations.test.ts`

### PR 7: Operations overview page (Phase 1, Task 7)
- Create `/dashboard/ops/page.tsx` with KPI cards and today's checklist
- Add "My Operations" sidebar group
- Add integration test `tests/integration/ops-overview.test.ts`

### PR 8: Activity logs page (Phase 1, Task 8)
- Create `/dashboard/ops/logs/page.tsx` with log entity tabs
- Create `/dashboard/ops/logs/[entity]/page.tsx` with entity-specific form
- Add integration test `tests/integration/ops-logs-ui.test.ts`

### PR 9: KPIs page (Phase 1, Task 9)
- Create `/dashboard/ops/kpis/page.tsx` with KPI dashboard
- Add integration test `tests/integration/ops-kpis-ui.test.ts`

### PR 10: Playbook runner (Phase 1, Task 10)
- Extend `/api/playbooks/run` to create ops_log_entries per phase
- Add integration test `tests/integration/ops-playbook-run.test.ts`

### PR 11: Agent layer (Phase 2, Tasks 1-11)
- Create `lib/agent/ops/*.ts` modules (G0-G11)
- Create `/api/agent/ops/*.ts` routes
- Add provider stubbing to all agent tests
- Add unit tests for each agent

### PR 12: Other packs as config (Phase 3)
- Create `lib/packs/ops/developer.ts`
- Create `lib/packs/ops/analyst.ts`
- Create `lib/packs/ops/management.ts`
- Create `lib/packs/ops/designer.ts`
- Create `lib/packs/ops/operations.ts`
- Create `lib/packs/ops/sales-marketing.ts`
- Create `lib/packs/ops/engineering.ts`
- Create `lib/packs/ops/finance.ts` (restricted)
- Create `lib/packs/ops/hr.ts` (restricted)
- Create `lib/packs/ops/healthcare-science.ts` (restricted)
- Create `lib/packs/ops/general.ts`
- Seed all opsConfigs to database
- Add unit test for each pack

### PR 13: Department and role plumbing (Phase 4)
- Update `lib/auto-populate.ts` to load opsConfig from database
- Update onboarding wizard to show pack-specific onboarding questions
- Update team management page to show pack-specific registers
- Add integration test `tests/integration/ops-plumbing.test.ts`

### PR 14: Cost and safety (Phase 5)
- Add per-member, per-surface usage metering
- Add per-member rate limit on G0-G11 agents
- Show quota state in UI
- Document Gemini key tier in AI reference
- Add integration test `tests/integration/ops-cost-safety.test.ts`

### PR 15: Tests and docs (Phase 6)
- Write comprehensive unit tests for all agents
- Write scoping tests for all new read endpoints
- Write KPI tests with fixed fixture rows
- Write config tests for all 12 packs
- Update DASHBOARD_PAGES.md
- Update AI reference doc
- Update ROLES_DEPARTMENTS.md
- Update .env.example
- Ensure ai-config-docs.test.ts passes

---

## 14. Discrepancies found between roles doc and code

### Discrepancy 1: Developer pack disciplines
- **Doc says**: 7 disciplines (developer, architect, devops, ai_ml, data_engineering, database, tester)
- **Code has**: 5 disciplines (developer, architect, data_engineering, ai_ml, tester)
- **Resolution**: Code is correct. devops and database are operational disciplines, not pure software development. They belong in it-technician pack.

### Discrepancy 2: Phase 5 status
- **Doc says**: "in progress" (line 891)
- **Code has**: All 12 packs seeded, all departments have defaultPack mappings
- **Resolution**: Update doc to "COMPLETE" (already done in line 777)

### Discrepancy 3: Ladder keys
- **Doc says**: "hr, sales_marketing, healthcare_science vs discipline names" (line 63)
- **Code has**: Ladder keys are hr, sales_marketing, healthcare_science (not work discipline names)
- **Resolution**: Code is correct. Ladders are grouped by professional category.

### Discrepancy 4: Stale "only 2 packs seeded" text
- **Doc says**: "Only 2 role packs seeded" (line 262, struck through)
- **Code has**: All 12 packs seeded
- **Resolution**: Already marked as FIXED in doc

### Discrepancy 5: auto-populate return value
- **Doc says**: "whether lib/auto-populate.ts already returns pack, ladder, method and template" (line 63)
- **Code has**: Yes, it returns all four fields
- **Resolution**: No discrepancy. Doc is asking a question, not stating a fact.

---

## 15. Open questions

### Question 1: Should opsConfig be stored in database or TypeScript?
- **Option A**: Store in database `role_packs.ops_config` JSONB column
  - Pros: Admin can edit via UI, no deployment needed
  - Cons: Harder to test, harder to version control
- **Option B**: Store in TypeScript `lib/packs/ops/<packKey>.ts` files
  - Pros: Easy to test, version controlled, type-safe
  - Cons: Requires deployment to change
- **Recommendation**: **Option B** (TypeScript). opsConfig is part of the pack definition and should be version controlled. Admin can override specific values via a separate `pack_overrides` table if needed.

### Question 2: Should ops_log_entries be a single table or one table per entity?
- **Option A**: Single `ops_log_entries` table with `pack_key` and `entity_key` columns
  - Pros: Simple schema, easy to query across entities
  - Cons: `fields` JSONB can become heterogeneous
- **Option B**: One table per entity (e.g., `backup_logs`, `incident_logs`, `maintenance_logs`)
  - Pros: Typed columns, easier to validate
  - Cons: Schema explosion, harder to add new entities
- **Recommendation**: **Option A** (single table). The `fields` JSONB column is validated against `opsConfig.logs[entity_key].fields` schema, so we get type safety without schema explosion.

### Question 3: Should KPIs be computed on-demand or pre-aggregated?
- **Option A**: Compute on-demand from `ops_log_entries` and `tasks` tables
  - Pros: Always up-to-date, no sync issues
  - Cons: Slow for large datasets
- **Option B**: Pre-aggregate into `kpi_snapshots` table on a schedule
  - Pros: Fast reads, historical tracking
  - Cons: Sync issues, storage overhead
- **Recommendation**: **Option A** (on-demand) for Phase 1. Optimize to Option B later if performance is an issue.

### Question 4: Should restricted packs (healthcare, hr, finance) have separate AI routes?
- **Option A**: Same routes, check `opsConfig.aiPolicy.restricted` before calling provider
  - Pros: DRY, easier to maintain
  - Cons: Risk of accidentally sending restricted data
- **Option B**: Separate routes for restricted packs
  - Pros: Clear separation, easier to audit
  - Cons: Code duplication
- **Recommendation**: **Option A** (same routes with policy check). Add unit test proving restricted entities never reach provider.

---

## 16. Acceptance criteria verification

### Criterion 1: With GOOGLE_GEMINI_API_KEY unset, every Operations page works and AI buttons are disabled
- **Implementation**: All AI routes check for key and return 503 if missing. UI disables AI buttons when `aiAvailable === false`.
- **Test**: `tests/unit/ops-ai-disabled.test.ts`

### Criterion 2: A new member with an unmapped job title gets a G0 suggestion limited to the real discipline enum
- **Implementation**: G0 agent returns discipline from `WORK_DISCIPLINES` array. Deterministic mapping wins; G0 only suggests when mapping fails.
- **Test**: `tests/unit/ops-agent-g0.test.ts`

### Criterion 3: Uploading the IT handover yields previewed servers, config rows and playbooks per method; nothing is stored until Commit; ambiguities are listed, not guessed
- **Implementation**: G1 agent returns action plan with `needsConfirmation` array. Commit route writes only ticked actions.
- **Test**: `tests/integration/ops-agent-g1.test.ts`

### Criterion 4: IT KPIs equal the workbook for the same data; a Failed backup raises a recommendation and, if enabled, a critical ticket
- **Implementation**: KPI computation is deterministic. Recommendation engine checks `opsConfig.recommendRules`.
- **Test**: `tests/unit/ops-kpis.test.ts`, `tests/unit/ops-recommendations.test.ts`

### Criterion 5: A daily report can be drafted, edited, submitted to Admin, acknowledged or returned, with numbers unchanged by AI text
- **Implementation**: G5 agent returns text-only draft. Numbers come from KPI computation. Report lifecycle routes already exist.
- **Test**: `tests/integration/ops-report-lifecycle.test.ts`

### Criterion 6: healthcare-science, hr and finance restricted entities provably never reach the provider
- **Implementation**: G0-G11 agents check `opsConfig.aiPolicy.excludedEntities` before calling provider. Unit test proves excluded fields are stripped.
- **Test**: `tests/unit/ops-restricted-entities.test.ts`

### Criterion 7: Lint, type-check and the full unit suite pass; no production seed or migration was run without my confirmation
- **Implementation**: All PRs run `npm run lint`, `npm run typecheck`, `npm test`. Migration scripts are additive-only and require manual approval.
- **Test**: CI/CD pipeline

---

## 17. Next steps

1. **User approval**: Review this PLAN.md and approve the schema diff, route list, and PR sequence.
2. **Phase 1, PR 1**: Create migration script and run on dev database (NOT production).
3. **Phase 1, PRs 2-10**: Implement IT Technician ops engine.
4. **Phase 2, PR 11**: Implement agent layer (G0-G11).
5. **Phase 3, PR 12**: Add other packs as config.
6. **Phase 4, PR 13**: Wire up department/pack/ladder/method/template.
7. **Phase 5, PR 14**: Add usage metering and rate limiting.
8. **Phase 6, PR 15**: Write tests and update docs.

**Estimated timeline**: 15 PRs over 3-4 weeks (1 PR per day, with review and iteration).

**Risk**: The `ops_log_entries` table may need to be partitioned by `pack_key` if volume exceeds 10M rows. For now, a single table with indexes is sufficient.

---

**Document version**: 1.0  
**Last updated**: 2026-10-29  
**Author**: JiraVision design team  
**Status**: Ready for user approval
