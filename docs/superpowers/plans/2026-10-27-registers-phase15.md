# Role Packs and Registers (Phase 15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the handover shape of a real job as data — role packs that say what a person is the keeper of, custody registers that say whether those things are still current, and an admin screen that authors new packs without a code change.

**Architecture:** Two additive tables (`role_packs`, `register_items`), two seeded packs (`it-technician`, `general`), pure modules for pack resolution, credential rejection, staleness and lifecycle rules, session-scoped API routes, a member register page using the §4 filter grammar, and an admin pack editor. Stale rows are computed, never stored; scheduling them creates a draft `agent_plans` plan whose items carry a cadence, and the existing promote route remains the only path to `tasks`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Drizzle ORM, Neon Postgres, Vitest, zod-free hand validators to match `lib/worklog` and `lib/career`.

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` §12 items 1–4 and §16 phase 15.

## Global Constraints

- No secrets enter a register: reject credential-like keys at the API boundary, and never echo the value in the error.
- Staleness is computed from `last_verified_at` + `verify_interval_days`; `null` verified is `unknown`, never `fresh`. No `stale` column.
- `custody=member` rows follow the member privacy circle; `org`/`team` rows are readable by every authenticated member, writable by the owner plus admin.
- Admins author packs at `/admin/packs` with no code change.
- Verifying writes a `work_log_entries(kind=review)` row.
- Promote remains the only path from plans to tasks.
- Migration scripts are additive-only; live Neon is not touched without the owner's per-action approval.
- Tests live under `tests/unit/` (repo convention), not beside the modules.

---

### Task 1: Schema, migration and rollback

**Files:**
- Modify: `drizzle/schema.ts` (append after `growthReviews`)
- Create: `scripts/create-registers-tables.mjs`
- Create: `scripts/rollback-registers-tables.mjs`
- Modify: `package.json` (`db:registers`, `db:registers:rollback`)
- Test: `tests/unit/register-schema.test.ts`

**Interfaces:**
- Produces: `rolePacks` (`packKey`, `title`, `disciplines`, `registerKinds`, `sections`, `reportTemplate`, `ladderDiscipline`, `onboarding`, `method`, `isActive`), `registerItems` (`id`, `packKey`, `kind`, `title`, `fields`, `status`, `ownerId`, `custody`, `lastVerifiedAt`, `verifyIntervalDays`, `parentId`, `source`, timestamps).
- Consumes: nothing.

- [x] **Step 1: Write the failing schema test**

Assert both tables are `PgTable`, SQL names are `role_packs`/`register_items`, every required column exists, `register_items` has no column matching `/stale/i`, the create script is additive (`CREATE TABLE IF NOT EXISTS` twice, no `DROP`/`DELETE`/`TRUNCATE`), seeds packs from `lib/packs/seed.ts` with `ON CONFLICT (pack_key) DO NOTHING`, and the rollback script is behind `REGISTERS_ROLLBACK !== "yes"` with `TABLES.length !== 2`.

- [x] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/register-schema.test.ts`
Expected: FAIL — `registerItems` is not exported.

- [x] **Step 3: Add the tables**

```ts
export const rolePacks = pgTable(
  "role_packs",
  {
    id: serial("id").primaryKey(),
    packKey: varchar("pack_key", { length: 60 }).notNull().unique(),
    title: text("title").notNull(),
    disciplines: jsonb("disciplines").notNull().default("[]"),
    registerKinds: jsonb("register_kinds").notNull().default("[]"),
    sections: jsonb("sections").notNull().default("[]"),
    reportTemplate: varchar("report_template", { length: 30 }),
    ladderDiscipline: varchar("ladder_discipline", { length: 40 }),
    onboarding: jsonb("onboarding").notNull().default("[]"),
    method: jsonb("method").notNull().default("[]"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("role_packs_active_idx").on(table.isActive)],
)

export const registerItems = pgTable(
  "register_items",
  {
    id: serial("id").primaryKey(),
    packKey: varchar("pack_key", { length: 60 }).notNull(),
    kind: varchar("kind", { length: 40 }).notNull(),
    title: text("title").notNull(),
    fields: jsonb("fields").notNull().default("{}"),
    status: varchar("status", { length: 20 }).notNull().default("in_service"),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
    custody: varchar("custody", { length: 10 }).notNull().default("member"),
    lastVerifiedAt: date("last_verified_at"),
    verifyIntervalDays: integer("verify_interval_days"),
    parentId: integer("parent_id").references((): AnyPgColumn => registerItems.id, {
      onDelete: "set null",
    }),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("register_items_pack_kind_idx").on(table.packKey, table.kind),
    index("register_items_owner_idx").on(table.ownerId),
    index("register_items_status_idx").on(table.status),
  ],
)
```

Import `AnyPgColumn` as a type from `drizzle-orm/pg-core`.

- [x] **Step 4: Add the migration script**

`CREATE TABLE IF NOT EXISTS` for both, unique index on `role_packs.pack_key`, self FK on `parent_id`, then seed `SEED_PACKS` from `../lib/packs/seed.ts` with `sql.json(...)` and `ON CONFLICT (pack_key) DO NOTHING`. Read `.env.local` with `/^DATABASE_URL="?([^"\n]+)"?/m`. Verify both tables through `information_schema` and assert `role_packs` has two rows.

- [x] **Step 5: Add the guarded rollback**

Drop `register_items` before `role_packs`; refuse unless `REGISTERS_ROLLBACK === "yes"` and every expected table is passed.

- [x] **Step 6: Run the schema test and typecheck**

Run: `npx vitest run tests/unit/register-schema.test.ts && npx tsc --noEmit`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add drizzle/schema.ts scripts/create-registers-tables.mjs scripts/rollback-registers-tables.mjs package.json tests/unit/register-schema.test.ts
git commit -m "feat(registers): role pack and register item tables with additive migration"
```

---

### Task 2: Pack module, seed and the all-roles proof

**Files:**
- Create: `lib/packs/types.ts`
- Create: `lib/packs/seed.ts`
- Create: `lib/packs/pack.ts`
- Test: `tests/unit/packs.test.ts`

**Interfaces:**
- Produces: `RolePack`, `RegisterKind`, `normalisePack(row)`, `packForDiscipline(packs, discipline)`, `resolvePack(packs, discipline)`, `packView(pack)`, `readPackInput(value)`, `SEED_PACKS`, `IT_TECHNICIAN_PACK`, `GENERAL_PACK`.
- Consumes: `WORK_DISCIPLINES`, `isWorkDiscipline` from `lib/roles`.

- [x] **Step 1: Write the failing test**

The `night-audit` fixture (only data, never imported by UI):
```ts
const nightAudit = {
  packKey: "night-audit",
  title: "Night audit",
  disciplines: ["auditor", "finance"],
  registerKinds: [{ key: "workpapers", label: "Workpaper index" }],
  sections: ["today", "registers", "reports"],
  reportTemplate: "assurance",
  ladderDiscipline: "auditor",
  onboarding: ["Which ledger close does your workpaper index serve?"],
  method: ["Count", "Reconcile", "Sign off"],
  isActive: true,
}
```
Assert `packView(normalisePack(nightAudit))` returns those values unchanged, every `WORK_DISCIPLINES` member matches exactly one seed pack, `resolvePack(SEED_PACKS, "unknown-role")` is `general`, `resolvePack(SEED_PACKS, "technician")` is `it-technician`, and `readPackInput` rejects a bad key, a discipline outside the vocabulary, a credential-like onboarding question, and a non-array method.

- [x] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/packs.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement types, seed and selectors**

`IT_TECHNICIAN_PACK.disciplines = ["technician","it_operations","devops","networking","security","database"]`; `GENERAL_PACK.disciplines` is every other `WORK_DISCIPLINES` member. IT kinds: infrastructure, accounts, equipment, outstanding. IT method: Identify, Reproduce, Diagnose, Fix, Test, Document. General method: Plan, Do, Check, Act. `resolvePack` normalises unknown input and falls back to the `general` pack when no pack claims it.

- [x] **Step 4: Run the test**

Run: `npx vitest run tests/unit/packs.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/packs tests/unit/packs.test.ts
git commit -m "feat(packs): seeded role packs with data-only resolution selectors"
```

---

### Task 3: Register rules

**Files:**
- Create: `lib/registers/fields.ts`
- Create: `lib/registers/staleness.ts`
- Create: `lib/registers/rules.ts`
- Create: `lib/registers/view-state.ts`
- Test: `tests/unit/register-fields.test.ts`, `tests/unit/register-staleness.test.ts`, `tests/unit/register-rules.test.ts`

**Interfaces:**
- `readRegisterFields(value)` → `{ ok: true, fields } | { ok: false, error }`
- `stalenessOf({ lastVerifiedAt, verifyIntervalDays }, todayIso)` → `"fresh" | "stale" | "unknown"`; `cadenceForInterval(days)` → `Cadence`
- `REGISTER_STATUSES`, `REGISTER_CUSTODY`, `REGISTER_LIFECYCLE`, `canReadRegister`, `canWriteRegister`, `readRegisterTransition`, `isRegisterStatus`, `isRegisterCustody`
- `parseRegisterView`, `serializeRegisterView`, `filterRegisters`, `groupRegistersByKind`, `registersToCsv`

- [x] **Step 1: Write the failing tests**

Cover: credential keys `password`, `Password`, `api_key`, `apiKey`, `private_key`, `otp`, `mfa_secret`, `token`, nested and camelCase; accepted `kept_in` and `authoriser`; the error names the field and contains neither the key's value nor the value of any sibling. Staleness: fresh/stale/unknown, interval 0, future date, leap day, month boundary, and the schema has no stale column. Rules: member rows readable only by owner/admin; org/team readable by all; writes owner/admin; every lifecycle move that leaves service requires a reason; disposed is terminal. View state: round-trip and filters.

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/register-fields.test.ts tests/unit/register-staleness.test.ts tests/unit/register-rules.test.ts`
Expected: FAIL — modules not found.

- [x] **Step 3: Implement the four modules**

Credential regex: `/(pass(word|wd)?|secret|token|otp|mfa|private_?key|api_?key|credential)/i`. Placeholder: `kept in: password-manager entry / vault path / safe, and who can authorise it`. `stalenessOf` uses UTC day arithmetic: `dayDiff(last, today) > interval` ⇒ stale; invalid/future dates never stale. Lifecycle: in_service → awaiting_repair / awaiting_disposal / retired (reason required); awaiting_repair → in_service (no reason) / awaiting_disposal (reason); awaiting_disposal → disposed / in_service (reason); disposed terminal; retired → in_service (reason).

- [x] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/register-fields.test.ts tests/unit/register-staleness.test.ts tests/unit/register-rules.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/registers tests/unit/register-fields.test.ts tests/unit/register-staleness.test.ts tests/unit/register-rules.test.ts
git commit -m "feat(registers): credential boundary, computed staleness and custody rules"
```

---

### Task 4: APIs

**Files:**
- Create: `lib/registers/read.ts` (session-scoped queries + DTO mapping)
- Create: `lib/registers/plan.ts` (draft stale plan)
- Create: `app/api/packs/route.ts`
- Create: `app/api/registers/route.ts`
- Create: `app/api/registers/[id]/route.ts`
- Create: `app/api/registers/[id]/verify/route.ts`
- Create: `app/api/registers/bulk/route.ts`
- Create: `app/api/registers/export/route.ts`
- Create: `app/api/registers/stale/route.ts`
- Test: `tests/unit/register-routes.test.ts`

**Interfaces:**
- Consumes: Task 1 tables, Task 2 packs, Task 3 rules.
- Produces: JSON envelopes `{ success: true, data }`; writes gated by `canWriteRegister`; admin-only pack writes and reassignment.

- [x] **Step 1: Write the failing route guards**

Assert in source: session check in every route; `readRegisterFields` on create/update; `canReadRegister`/`canWriteRegister`; `reason` required through `readRegisterTransition`; verify inserts `workLogEntries` with `kind: "review"` and updates `lastVerifiedAt`; stale POST inserts `agentPlans` `status: "draft"` + `planItems` and never `tasks`; bulk caps ids at 50; export sets `text/csv`; packs route uses `isSuperAdmin` for writes.

- [x] **Step 2: Run the guards to verify they fail**

Run: `npx vitest run tests/unit/register-routes.test.ts`
Expected: FAIL — route files not found.

- [x] **Step 3: Implement the routes**

Visibility is enforced in `lib/registers/read.ts` and re-checked per row before a write. Create validates `packKey`/`kind` against the pack, defaults owner to the session, refuses a member assigning another owner, and runs the credential scan. Update re-scans fields, applies lifecycle reason rules, and keeps pack/kind immutable. Verify is a transaction: `workLogEntries` (`kind: "review"`, `workedOn` from the session timezone, `discipline` from the pack's ladder discipline, `source: "manual"`) + `registerItems.lastVerifiedAt`. Stale GET returns visible stale rows; POST creates or returns the day's existing draft plan (`sourceKind: "registers"`, `sourceName: stale:<today>`), one item per row with `cadence: cadenceForInterval(...)`, dates today, and no `tasks` write.

- [x] **Step 4: Run the guards and typecheck**

Run: `npx vitest run tests/unit/register-routes.test.ts && npx tsc --noEmit`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/registers/read.ts lib/registers/plan.ts app/api/packs app/api/registers tests/unit/register-routes.test.ts
git commit -m "feat(registers): pack and register APIs with verify logging and stale plans"
```

---

### Task 5: UI, nav and day strip

**Files:**
- Create: `app/dashboard/registers/page.tsx`, `app/dashboard/registers/registers-client.tsx`
- Create: `app/admin/packs/page.tsx`, `app/admin/packs/pack-editor.tsx`
- Modify: `components/dashboard-layout.tsx` (Registers nav under Main)
- Modify: `app/dashboard/page.tsx` (stale count in the Today strip)
- Test: `tests/unit/register-pages.test.ts`

- [x] **Step 1: Write the failing page guards**

Assert: the page is a Suspense shell with a skeleton and no database import; the client fetches `/api/registers` (which carries the packs) and `/api/registers/stale`; the four §4 controls are present (`q`, kind, status, custody/stale, view list/grid/board); bulk verify/reassign/export exist; the credential placeholder is rendered; the admin page shows 401/403 walls and saves with POST/PATCH; nav has `/dashboard/registers`; the dashboard strip links to the stale queue.

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/register-pages.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement the pages**

Member page: header with the resolved pack, stale banner + "Schedule checks" (POST stale, toast, link to `/dashboard/planner/<id>`), filters bound to URL params, list/grid/board, create and edit dialogs, verify, bulk bar, CSV link. Status labels and staleness labels come from the rules modules; `unknown` reads "Never verified". Admin page mirrors `/admin/career`'s gate and edits pack fields plus JSON textareas for kinds/sections/method/onboarding; disciplines come from `WORK_DISCIPLINES`.

- [x] **Step 4: Run guards, typecheck and lint the new files**

Run: `npx vitest run tests/unit/register-pages.test.ts && npx tsc --noEmit && npx eslint app/dashboard/registers app/admin/packs lib/packs lib/registers`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/dashboard/registers app/admin/packs components/dashboard-layout.tsx app/dashboard/page.tsx tests/unit/register-pages.test.ts
git commit -m "feat(registers): register workspace, pack authoring and stale day-strip queue"
```

---

### Task 6: Docs, gates, commit and push

**Files:**
- Modify: `FEATURES.md` (§20), `README.md`
- Modify: spec phase 15 entry
- Modify: this plan (checkboxes)
- Modify: memory `jiravision-worklog-reports-phases.md`

- [x] **Step 1: Sync docs**

Record the packs, registers, staleness rule, credential rule, pack authoring, stale draft-plan path, and the exact test/table counts. State that packs and the register tables are additive and that the live migration is pending owner approval.

- [x] **Step 2: Run the full gates**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: tsc clean; lint only the known `components/planner/gantt.tsx:43` error; all tests pass.

- [x] **Step 3: Commit and push**

```bash
git add FEATURES.md README.md docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md docs/superpowers/plans/2026-10-27-registers-phase15.md
git commit -m "docs(registers): record phase 15 and sync the spec"
git push
```

- [x] **Step 4: Stop before the live migration**

Present the migration for the owner's per-action approval with row counts, masked host and one recommended option.

## Result

- Commits: `ed64c43` (schema + migration), `b373825` (rules), `ae3cf4c` (APIs), `39ef2f0` (UI),
  `a9915ed` (shared guards), `eb06d76` (docs) — pushed to `main`.
- Gates: `tsc --noEmit` clean; `npm test` 92 files / 1559 tests (phase 15: 7 files / 118 tests);
  `npm run lint` reports only the known `components/planner/gantt.tsx:43` error plus pre-existing warnings.
- Migration: `npm run db:registers` ran against production Neon on 2026-10-27 with the owner's per-action
  approval — `tables: role_packs, register_items`, `role_packs rows: 2`, `register_items rows: 0`.
  Rollback: `REGISTERS_ROLLBACK=yes npm run db:registers:rollback`.
- One deviation from the plan text: the client never calls `/api/packs`; the register read returns the packs,
  so the page cannot invent a kind. Task 5's assertion was re-cut to the shipped design. The seed module imports
  `../roles.ts` with an explicit extension because the migration script runs it through Node's type stripping,
  which does not read tsconfig path aliases.
