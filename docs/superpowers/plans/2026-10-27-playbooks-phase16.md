# Playbooks (Phase 16) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship standard operating procedures as data — a `playbooks` table, the six-step method, a manual step editor with reorder and clone, palette search, a run mode that writes one work-log row per phase, and a printable fourth PDF layout with signature boxes.

**Architecture:** One additive table (`playbooks`) plus the deferred foreign key on `work_log_entries.playbook_id`. Pure modules for the method, step validation, reordering, run drafts and publish rules; session-scoped API routes that re-check visibility on every read and write; a list page, an editor and a run page under `/dashboard/playbooks`; and a fourth layout in `lib/export/pdf.ts`. The run route is the only writer of playbook-linked work-log rows, and it writes `kind="action"` rows with the playbook id and version so adherence is provable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Drizzle ORM, Neon Postgres, Vitest, zod-free hand validators to match `lib/registers` and `lib/worklog`, jsPDF + jspdf-autotable for print.

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` §12 item 5, §13 (`playbooks` + `work_log_entries`), §14 visibility, §15 `lib/playbooks/method.test.ts`, §16 phase 16.

## Global Constraints

- The six-step method is `Identify → Reproduce → Diagnose → Fix → Test → Document`, in that order. A pack's own `method` wins when present; the six-step list is the fallback.
- Every step carries `action` plus `checks[]`, `precautions[]`, `warnings[]`, `ppe[]` and `tools_parts[]` — arrays are always present, possibly empty, never `undefined`.
- A step's `phase` must be one of the playbook's method phases. The stored JSON keys are the spec's keys verbatim: `order`, `phase`, `action`, `checks`, `expected`, `precautions`, `warnings`, `ppe`, `tools_parts`, `time_estimate`, `stop_condition`, `escalation`, `evidence_to_record`.
- Running a playbook writes exactly one `work_log_entries` row per method phase, each carrying `playbook_id` and `playbook_version`. It never writes `tasks`.
- A `source='gemini'` playbook cannot reach `published` while `ai_marked` is true. A human content edit clears `ai_marked`; the publish route refuses with a 409 and the printed sheet says a model wrote the draft.
- `draft`/`archived` playbooks are readable by their author and admins only; `published` playbooks are readable by every authenticated member. Writes are author-or-admin in the route, not only in the UI.
- Migration scripts are additive-only; live Neon is not touched without the owner's per-action approval. The migration checkpoint is its own task.
- Tests live under `tests/unit/` (repo convention), use the `codeOnly()` source-assertion grammar, and never use a regex `s` flag.

---

### Task 1: Schema, deferred foreign key, migration and rollback

**Files:**
- Modify: `drizzle/schema.ts` (append `playbooks` after `registerItems`; add the FK on `workLogEntries.playbookId`)
- Create: `scripts/create-playbooks-tables.mjs`
- Create: `scripts/rollback-playbooks-tables.mjs`
- Modify: `package.json` (`db:playbooks`, `db:playbooks:rollback`)
- Test: `tests/unit/playbook-schema.test.ts`

**Interfaces:**
- Produces: `playbooks` (`id`, `packKey`, `discipline`, `title`, `summary`, `scopeKind`, `method`, `steps`, `precautions`, `recommendations`, `tags`, `status`, `version`, `authorId`, `source`, `aiMarked`, `lastVerifiedAt`, `verifyIntervalDays`, timestamps).
- Consumes: `users` for the author FK.

- [ ] **Step 1: Write the failing schema test**

Create `tests/unit/playbook-schema.test.ts` with the existing grammar:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PgTable, getTableConfig } from "drizzle-orm/pg-core"
import * as schema from "@/drizzle/schema"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
const columnNames = (table: PgTable) => getTableConfig(table).columns.map((column) => column.name)

describe("playbook schema", () => {
  it("declares playbooks under its SQL name", () => {
    expect(schema.playbooks).toBeInstanceOf(PgTable)
    expect(getTableConfig(schema.playbooks).name).toBe("playbooks")
  })

  it("carries every column the spec names", () => {
    for (const column of [
      "pack_key", "discipline", "title", "summary", "scope_kind", "method", "steps",
      "precautions", "recommendations", "tags", "status", "version", "author_id",
      "source", "ai_marked", "last_verified_at", "verify_interval_days",
    ]) {
      expect(columnNames(schema.playbooks)).toContain(column)
    }
  })

  it("gives work_log_entries the foreign key phase 16 deferred", () => {
    const entries = src("drizzle/schema.ts")
    expect(entries).toMatch(
      /playbookId: integer\("playbook_id"\)\.references\(\(\) => playbooks\.id, \{ onDelete: "set null" \}\)/,
    )
  })

  it("never stores a run state on the playbook", () => {
    expect(columnNames(schema.playbooks).filter((name) => /run|progress/i.test(name))).toEqual([])
  })
})

describe("playbook migration script", () => {
  const script = codeOnly(src("scripts/create-playbooks-tables.mjs"))

  it("is additive only", () => {
    expect(script).not.toMatch(/\bDROP\b/i)
    expect(script).not.toMatch(/DELETE FROM/i)
    expect(script).not.toMatch(/TRUNCATE/i)
    expect(script).not.toMatch(/ALTER COLUMN/i)
  })

  it("creates the table idempotently and adds the FK only once", () => {
    expect((script.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length).toBe(1)
    expect(script).toMatch(/pg_constraint/)
    expect(script).toMatch(/work_log_entries_playbook_id_fk/)
    expect(script).toMatch(/information_schema/i)
  })

  it("keeps the rollback behind an explicit opt-in", () => {
    const rollback = codeOnly(src("scripts/rollback-playbooks-tables.mjs"))
    expect(rollback).toMatch(/PLAYBOOKS_ROLLBACK !== "yes"/)
    expect(rollback).toMatch(/TABLES\.length !== 1/)
    expect(rollback).toMatch(/DROP CONSTRAINT IF EXISTS work_log_entries_playbook_id_fk/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/playbook-schema.test.ts`
Expected: FAIL — `schema.playbooks` is undefined.

- [ ] **Step 3: Add the table**

Append after `registerItems` in `drizzle/schema.ts`:

```ts
// A playbook is the method for a job, as data (design §12 item 5): the method phases, the
// steps inside them, and the precautions that make the procedure safe. JSON keys inside
// `steps` follow the spec verbatim (`tools_parts`, `time_estimate`, ...), because the
// printed sheet and the API hand the same objects around.
export const playbooks = pgTable(
  "playbooks",
  {
    id: serial("id").primaryKey(),
    packKey: varchar("pack_key", { length: 60 }).notNull(),
    discipline: varchar("discipline", { length: 40 }),
    title: text("title").notNull(),
    summary: text("summary"),
    scopeKind: varchar("scope_kind", { length: 40 }),
    method: jsonb("method").notNull().default("[]"),
    steps: jsonb("steps").notNull().default("[]"),
    precautions: jsonb("precautions").notNull().default("[]"),
    recommendations: jsonb("recommendations").notNull().default("[]"),
    tags: jsonb("tags").notNull().default("[]"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    version: integer("version").notNull().default(1),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    aiMarked: boolean("ai_marked").notNull().default(false),
    lastVerifiedAt: date("last_verified_at"),
    verifyIntervalDays: integer("verify_interval_days"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("playbooks_pack_status_idx").on(table.packKey, table.status),
    index("playbooks_author_idx").on(table.authorId),
  ],
)
```

Then change the `workLogEntries.playbookId` line and its comment:

```ts
    // The run route sets both; a row that names a playbook version is a claim the printed
    // sheet and the report can check.
    playbookId: integer("playbook_id").references(() => playbooks.id, { onDelete: "set null" }),
```

- [ ] **Step 4: Add the migration script**

Create `scripts/create-playbooks-tables.mjs` with `CREATE TABLE IF NOT EXISTS playbooks (...)` matching the schema, both indexes, and the guarded foreign key:

```js
CREATE TABLE IF NOT EXISTS playbooks (
  id SERIAL PRIMARY KEY,
  pack_key VARCHAR(60) NOT NULL,
  discipline VARCHAR(40),
  title TEXT NOT NULL,
  summary TEXT,
  scope_kind VARCHAR(40),
  method JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  precautions JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  ai_marked BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at DATE,
  verify_interval_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS playbooks_pack_status_idx ON playbooks (pack_key, status);
CREATE INDEX IF NOT EXISTS playbooks_author_idx ON playbooks (author_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_log_entries_playbook_id_fk') THEN
    ALTER TABLE work_log_entries
      ADD CONSTRAINT work_log_entries_playbook_id_fk
      FOREIGN KEY (playbook_id) REFERENCES playbooks(id) ON DELETE SET NULL;
  END IF;
END $$;
```

Verify one table through `information_schema`, the constraint through `pg_constraint`, and print `playbooks rows: 0 (the owner authors their own SOPs)`. Read `.env.local` with `/^DATABASE_URL="?([^"\n]+)"?/m`, as every other migration script does.

- [ ] **Step 5: Add the guarded rollback**

Create `scripts/rollback-playbooks-tables.mjs`. It refuses unless `PLAYBOOKS_ROLLBACK === "yes"`, guards `TABLES.length !== 1`, drops `work_log_entries_playbook_id_fk` first (reverse dependency), then `DROP TABLE IF EXISTS playbooks CASCADE`.

- [ ] **Step 6: Add the package scripts**

```json
"db:playbooks": "node scripts/create-playbooks-tables.mjs",
"db:playbooks:rollback": "node scripts/rollback-playbooks-tables.mjs",
```

- [ ] **Step 7: Run the test and typecheck**

Run: `npx vitest run tests/unit/playbook-schema.test.ts && npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add drizzle/schema.ts scripts/create-playbooks-tables.mjs scripts/rollback-playbooks-tables.mjs package.json tests/unit/playbook-schema.test.ts
git commit -m "feat(playbooks): playbook table and the deferred work-log foreign key"
```

---

### Task 2: The method module, step model and publish rules

**Files:**
- Create: `lib/playbooks/method.ts`
- Create: `lib/playbooks/fields.ts`
- Create: `lib/playbooks/rules.ts`
- Test: `tests/unit/playbook-method.test.ts`
- Test: `tests/unit/playbook-fields.test.ts`

**Interfaces:**
- Produces: `SIX_STEP_METHOD`, `PlaybookStep`, `PlaybookStatus`, `readMethod`, `normaliseMethod`, `readStep`, `readSteps`, `normaliseSteps`, `emptyStep`, `moveStep`, `cloneStep`, `removeStep`, `runEntryDrafts`, `readRunNotes`, `publishProblem`, `canPublish`, `canReadPlaybook`, `canEditPlaybook`, `readPlaybookInput`.
- Consumes: `isWorkDiscipline` from `@/lib/roles`.

- [ ] **Step 1: Write the failing method test**

Create `tests/unit/playbook-method.test.ts` covering the five assertions §15 names:

```ts
import { describe, expect, it } from "vitest"
import {
  SIX_STEP_METHOD,
  cloneStep,
  defaultMethod,
  emptyStep,
  moveStep,
  readMethod,
  readRunNotes,
  readStep,
  readSteps,
  runEntryDrafts,
} from "@/lib/playbooks/method"
import { canPublish, publishProblem } from "@/lib/playbooks/rules"

describe("the six-step method", () => {
  it("is complete and ordered", () => {
    expect(SIX_STEP_METHOD).toEqual(["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"])
  })

  it("yields to a pack method and falls back to the six steps", () => {
    expect(defaultMethod(["Plan", "Do", "Check", "Act"])).toEqual(["Plan", "Do", "Check", "Act"])
    expect(defaultMethod([])).toEqual([...SIX_STEP_METHOD])
    expect(defaultMethod(null)).toEqual([...SIX_STEP_METHOD])
  })
})

describe("steps", () => {
  const method = [...SIX_STEP_METHOD]

  it("always carries the five arrays, even when the input omits them", () => {
    const parsed = readStep({ phase: "Fix", action: "Replace the failed disk" }, method, 1)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.checks).toEqual([])
    expect(parsed.value.precautions).toEqual([])
    expect(parsed.value.warnings).toEqual([])
    expect(parsed.value.ppe).toEqual([])
    expect(parsed.value.tools_parts).toEqual([])
    expect(parsed.value.action).toBe("Replace the failed disk")
    expect(parsed.value.order).toBe(1)
  })

  it("rejects a phase outside the method", () => {
    const parsed = readStep({ phase: "Deploy", action: "Ship it" }, method, 1)
    expect(parsed.ok).toBe(false)
  })

  it("rejects a step with no action", () => {
    expect(readStep({ phase: "Fix", action: "   " }, method, 1).ok).toBe(false)
  })

  it("renumbers on move and clone", () => {
    const steps = ["Identify", "Reproduce", "Diagnose"].map((phase, i) => emptyStep(phase, i + 1))
    const moved = moveStep(steps, 0, 2)
    expect(moved.map((step) => step.phase)).toEqual(["Reproduce", "Diagnose", "Identify"])
    expect(moved.map((step) => step.order)).toEqual([1, 2, 3])
    const cloned = cloneStep(moved, 1)
    expect(cloned).toHaveLength(4)
    expect(cloned.map((step) => step.order)).toEqual([1, 2, 3, 4])
    expect(cloned[2].phase).toBe(cloned[1].phase)
  })
})

describe("run logging", () => {
  const playbook = {
    id: 12,
    title: "Replace a failed disk",
    version: 3,
    discipline: "technician" as const,
    method: [...SIX_STEP_METHOD],
  }

  it("writes one entry per phase with the version", () => {
    const drafts = runEntryDrafts(playbook, { Diagnose: "SMART reported a reallocated sector." })
    expect(drafts).toHaveLength(SIX_STEP_METHOD.length)
    expect(drafts.map((draft) => draft.title.split(" — ")[1])).toEqual([...SIX_STEP_METHOD])
    expect(drafts.every((draft) => draft.playbookId === 12)).toBe(true)
    expect(drafts.every((draft) => draft.playbookVersion === 3)).toBe(true)
    expect(drafts[2].body).toBe("SMART reported a reallocated sector.")
    expect(drafts[0].body).toBeNull()
  })

  it("refuses a note for a phase the method does not have", () => {
    expect(readRunNotes({ Deploy: "x" }, SIX_STEP_METHOD).ok).toBe(false)
  })
})

describe("publishing", () => {
  const steps = [emptyStep("Fix", 1)]

  it("blocks a model draft until a human edit clears ai_marked", () => {
    const gemini = { status: "draft", source: "gemini", aiMarked: true, steps }
    expect(canPublish(gemini)).toBe(false)
    expect(publishProblem(gemini)).toMatch(/human edit/)
    expect(canPublish({ ...gemini, aiMarked: false })).toBe(true)
  })

  it("allows a manual playbook and refuses an empty one", () => {
    expect(canPublish({ status: "draft", source: "manual", aiMarked: false, steps })).toBe(true)
    expect(canPublish({ status: "draft", source: "manual", aiMarked: false, steps: [] })).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/playbook-method.test.ts`
Expected: FAIL — the modules do not exist.

- [ ] **Step 3: Implement `lib/playbooks/method.ts`**

Exports, with the exact JSON keys from the spec:

```ts
export const SIX_STEP_METHOD = ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"] as const

export type PlaybookStep = {
  order: number
  phase: string
  action: string
  checks: string[]
  expected: string
  precautions: string[]
  warnings: string[]
  ppe: string[]
  tools_parts: string[]
  time_estimate: string
  stop_condition: string
  escalation: string
  evidence_to_record: string
}
```

Implement, all pure:

- `defaultMethod(value: unknown): string[]` — a non-empty, valid string list wins; otherwise `[...SIX_STEP_METHOD]`.
- `normaliseMethod(value: unknown): string[]` — tolerant, drops non-strings and duplicates, trims; returns `[]` when unusable.
- `readMethod(value: unknown): { ok: true; value: string[] } | { ok: false; error: string }` — 1–12 phases, each 1–40 chars, no case-insensitive duplicates.
- `emptyStep(phase: string, order: number): PlaybookStep` — `action: ""`, every array `[]`, every text `""`.
- `readStep(value, method, order)` — requires an object, `action` 1–500 chars, `phase` in `method`; `checks`/`precautions`/`warnings`/`ppe`/`tools_parts` are string arrays (max 20 entries, 200 chars each, blank entries dropped, non-strings rejected); `expected`, `stop_condition`, `escalation`, `evidence_to_record` ≤ 500 chars; `time_estimate` ≤ 40; absent fields become `""`/`[]`. Returns `{ ok: false, error: "…" }` naming the field, never echoing a credential-shaped value.
- `readSteps(value, method)` — `undefined`/`null` → `[]`; otherwise each step via `readStep`, errors prefixed `Step N:`; max 200 steps.
- `normaliseSteps(value, method): PlaybookStep[]` — for DB rows; drops malformed steps and always returns complete objects (used by the reader, never by the API boundary).
- `moveStep(steps, from, to)` / `cloneStep(steps, index)` / `removeStep(steps, index)` — immutable, always renumbered `1..n`, out-of-range is a no-op copy.
- `runEntryDrafts(playbook, notes = {})` — one draft per `playbook.method` phase, `kind: "action"`, `title: \`${playbook.title} — ${phase}\``, `body` the trimmed note or `null`, `discipline`, `playbookId`, `playbookVersion`.
- `readRunNotes(value, method)` — `undefined` → `{}`; object keys must all be method phases; values strings ≤ 4000 chars.

- [ ] **Step 4: Implement `lib/playbooks/fields.ts`**

`readPlaybookInput(value, fallbackMethod)` validates the row-level fields:

- `packKey` non-empty string (the route checks the pack exists).
- `discipline` null or `isWorkDiscipline`.
- `title` 1–200; `summary` null or ≤ 2000; `scopeKind` null or `/^[a-z0-9][a-z0-9_]{0,39}$/`.
- `method` omitted → `fallbackMethod`; present → `readMethod`.
- `steps` → `readSteps(value.steps, method)`.
- `precautions`, `recommendations` → string arrays (max 50, 200 chars each); `tags` (max 20, 40 chars each).
- `verifyIntervalDays` null or 0–3650.
- Returns `{ ok: true, value }` or `{ ok: false, error }`.

- [ ] **Step 5: Implement `lib/playbooks/rules.ts`**

```ts
export const PLAYBOOK_STATUSES = ["draft", "published", "archived"] as const
export type PlaybookStatus = (typeof PLAYBOOK_STATUSES)[number]
export const isPlaybookStatus = (value: unknown): value is PlaybookStatus => ...
export type PlaybookViewer = { id: number; admin: boolean }

export function canReadPlaybook(
  playbook: { status: string; authorId: number | null },
  viewer: PlaybookViewer,
): boolean {
  if (viewer.admin) return true
  if (playbook.status === "published") return true
  return playbook.authorId === viewer.id
}

export function canEditPlaybook(
  playbook: { authorId: number | null },
  viewer: PlaybookViewer,
): boolean {
  return viewer.admin || playbook.authorId === viewer.id
}

export function publishProblem(playbook: {
  status: string
  source: string
  aiMarked: boolean
  steps: readonly { action: string }[]
}): string | null {
  if (playbook.status === "published") return "That playbook is already published."
  if (playbook.status === "archived") return "Restore the playbook to draft before publishing it."
  if (playbook.source === "gemini" && playbook.aiMarked) {
    return "A model-drafted playbook needs a human edit before it can be published."
  }
  if (playbook.steps.length === 0) return "Add at least one step before publishing."
  if (playbook.steps.some((step) => !step.action.trim())) return "Every step needs an action before publishing."
  return null
}

export const canPublish = (playbook: Parameters<typeof publishProblem>[0]): boolean =>
  publishProblem(playbook) === null
```

- [ ] **Step 6: Add the fields test**

Create `tests/unit/playbook-fields.test.ts` asserting: a minimal valid input resolves; `method` defaults to the fallback; duplicate phases are rejected; a bad discipline is rejected; precautions/tags are trimmed; `steps` errors name the step number; and an input whose `source`/`aiMarked`/`version`/`authorId` are supplied cannot smuggle them into the value (the returned object has only the whitelisted fields).

- [ ] **Step 7: Run the tests and typecheck**

Run: `npx vitest run tests/unit/playbook-method.test.ts tests/unit/playbook-fields.test.ts && npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add lib/playbooks/method.ts lib/playbooks/fields.ts lib/playbooks/rules.ts tests/unit/playbook-method.test.ts tests/unit/playbook-fields.test.ts
git commit -m "feat(playbooks): six-step method, step model and publish rules"
```

---

### Task 3: Reads, session gate and the API routes

**Files:**
- Create: `lib/playbooks/session.ts`
- Create: `lib/playbooks/read.ts`
- Create: `app/api/playbooks/_shared.ts`
- Create: `app/api/playbooks/route.ts`
- Create: `app/api/playbooks/[id]/route.ts`
- Create: `app/api/playbooks/[id]/publish/route.ts`
- Create: `app/api/playbooks/[id]/run/route.ts`
- Modify: `tests/unit/schema-safety.test.ts` (`authGated` includes `playbookSession`)
- Test: `tests/unit/playbook-routes.test.ts`

**Interfaces:**
- Produces: `PlaybookDto`, `loadVisiblePlaybooks`, `loadPlaybook`, `mapPlaybook`, `playbookSession`, `playbookViewer`.
- Consumes: `playbooks`, `rolePacks`, `workLogEntries`, `getSession`, `isSuperAdmin`, `loadPacks`.

- [ ] **Step 1: Write the failing route test**

Create `tests/unit/playbook-routes.test.ts` in the `register-routes.test.ts` grammar:

- Every route file in `app/api/playbooks/**/route.ts` matches `/await playbookSession\(\)/`, has `, 401)`, and `export const dynamic = "force-dynamic"`.
- `lib/playbooks/read.ts` applies visibility through `canReadPlaybook` in `loadPlaybook`, and `loadVisiblePlaybooks` filters drafts/archived to `authorId = viewer.id` unless `viewer.admin` (assert the SQL predicates `eq(playbooks.status, "published")`, `eq(playbooks.authorId, viewer.id)`).
- `POST /api/playbooks` forces `source: "manual"`, `status: "draft"`, `authorId: gate.session.id`, `version: 1`, `aiMarked: false`, and never reads those from the body.
- `PATCH /api/playbooks/[id]` calls `canEditPlaybook`, clears `aiMarked` for a gemini row on a content edit, and bumps `version` only when the row was already published.
- `POST .../publish` calls `publishProblem` and returns 409 when it is non-null.
- `POST .../run` refuses unless `playbook.status === "published"`, calls `runEntryDrafts`, and inserts each draft with `playbookId`/`playbookVersion`, `userId`, `workedOn`, and `source: "manual"` in one transaction.
- No playbook route writes `tasks` (source scan for `tasks` is absent or only in a comment-stripped negative assertion).

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/playbook-routes.test.ts`
Expected: FAIL — the routes do not exist.

- [ ] **Step 3: Implement the session and reader**

`lib/playbooks/session.ts` mirrors `lib/registers/session.ts` + `_shared.ts` without importing the database:

```ts
export type PlaybookSession = {
  id: number
  email: string
  role?: string | null
  timezone?: string | null
}
export type PlaybookViewer = { id: number; admin: boolean }
export function playbookViewer(session: PlaybookSession): PlaybookViewer
```

`app/api/playbooks/_shared.ts` owns `bad`, `parseId`, `playbookSession()` (`getSession`, `isSuperAdmin`, `localDay`) and returns `{ session, viewer, today }` or `null`.

`lib/playbooks/read.ts` owns the DTO and the two reads:

```ts
export type PlaybookDto = {
  id: number
  packKey: string
  discipline: string | null
  title: string
  summary: string | null
  scopeKind: string | null
  method: string[]
  steps: PlaybookStep[]
  precautions: string[]
  recommendations: string[]
  tags: string[]
  status: PlaybookStatus
  version: number
  authorId: number | null
  authorName: string | null
  source: string
  aiMarked: boolean
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  updatedAt: string
}
```

- `mapPlaybook(row)` normalises every jsonb field with `normaliseMethod`, `normaliseSteps`, and a local `stringsOf` helper; an unknown status falls back to `draft`.
- `loadVisiblePlaybooks(viewer, filters)` — SQL `or(eq(playbooks.status, "published"), eq(playbooks.authorId, viewer.id))` unless admin; then `q` via `ilike` on title/summary, `status`, `packKey`, `discipline`; ordered `updatedAt desc`, limit 500.
- `loadPlaybook(id)` — no visibility in SQL; the route calls `canReadPlaybook` so a row outside the circle is indistinguishable from a missing one.

- [ ] **Step 4: Implement `GET`/`POST /api/playbooks`**

`GET` returns `{ playbooks, packs: loadPacks(false), admin, today }`, applies the query filters through `loadVisiblePlaybooks`.

`POST`:

1. `readPlaybookInput(body, defaultMethod(pack?.method))` after `packByKey(await loadPacks(false), packKey)`; 404 when the pack is unknown or inactive.
2. Disciplines must be known (the manager already checked).
3. Insert with `source: "manual"`, `status: "draft"`, `version: 1`, `authorId: gate.session.id`, `aiMarked: false`.
4. Return the mapped row at 201.

- [ ] **Step 5: Implement `GET`/`PATCH /api/playbooks/[id]`**

`GET` loads, applies `canReadPlaybook`, and returns `{ playbook, packs, admin, today }`; 404 when unreadable.

`PATCH` applies `canEditPlaybook`; re-parses the merged content with `readPlaybookInput`; `status` in the body may only be `"draft"` or `"archived"` (publishing goes through its own route). It sets:

```ts
const contentEdited = ["title", "summary", "method", "steps", "precautions", "recommendations", "tags"].some(
  (key) => body[key] !== undefined,
)
const update = {
  ...parsed.value,
  aiMarked: contentEdited && row.source === "gemini" ? false : row.aiMarked,
  version: contentEdited && row.status === "published" ? row.version + 1 : row.version,
  updatedAt: new Date(),
}
```

- [ ] **Step 6: Implement publish and run**

`publish`:

```ts
const row = await loadPlaybook(id)
if (!row || !canEditPlaybook(row, gate.viewer)) return bad("Playbook not found", 404)
const problem = publishProblem(row)
if (problem) return bad(problem, 409)
await db.update(playbooks).set({ status: "published", updatedAt: new Date() }).where(eq(playbooks.id, id))
```

`run`:

```ts
const row = await loadPlaybook(id)
if (!row || !canReadPlaybook(row, gate.viewer)) return bad("Playbook not found", 404)
if (row.status !== "published") return bad("Publish the playbook before running it.", 409)

const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
const workedOn = typeof body.workedOn === "string" ? body.workedOn : gate.today
if (!/^\d{4}-\d{2}-\d{2}$/.test(workedOn) || workedOn > gate.today) {
  return bad("workedOn must be a date that is not in the future.")
}
const notes = readRunNotes(body.notes, row.method)
if (!notes.ok) return bad(notes.error)

const drafts = runEntryDrafts(row, notes.value)
await db.transaction(async (tx) => {
  await tx.insert(workLogEntries).values(
    drafts.map((draft) => ({ ...draft, userId: gate.session.id, workedOn, source: "manual" })),
  )
})
return NextResponse.json({ success: true, data: { count: drafts.length, workedOn } }, { status: 201 })
```

- [ ] **Step 7: Teach the auth-gate guard about the new helper**

Add `playbookSession` to the `authGated` regex in `tests/unit/schema-safety.test.ts` (the same reason phase 15 added `registerSession`). Without it the "documented public endpoints are the only ones without a session check" test fails.

- [ ] **Step 8: Run the tests and typecheck**

Run: `npx vitest run tests/unit/playbook-routes.test.ts tests/unit/schema-safety.test.ts && npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [ ] **Step 9: Commit**

```bash
git add lib/playbooks/session.ts lib/playbooks/read.ts app/api/playbooks tests/unit/playbook-routes.test.ts tests/unit/schema-safety.test.ts
git commit -m "feat(playbooks): session-scoped reads, authoring, publish and run routes"
```

---

### Task 4: The pages, palette, nav and the fourth PDF layout

**Files:**
- Create: `app/dashboard/playbooks/page.tsx`
- Create: `app/dashboard/playbooks/playbooks-client.tsx`
- Create: `app/dashboard/playbooks/[id]/page.tsx`
- Create: `app/dashboard/playbooks/[id]/playbook-editor.tsx`
- Create: `app/dashboard/playbooks/[id]/run/page.tsx`
- Create: `app/dashboard/playbooks/[id]/run/run-client.tsx`
- Modify: `components/dashboard-layout.tsx` (nav entry)
- Modify: `components/dashboard-layout.tsx` (top-bar search submits `q` to `/dashboard/playbooks`)
- Modify: `lib/export/pdf.ts` (`exportPlaybookPdf`)
- Modify: `tests/unit/export-pdf.test.ts`
- Test: `tests/unit/playbook-pages.test.ts`

**Interfaces:**
- Produces: the three routes and `exportPlaybookPdf(data: PlaybookExportData)`.
- Consumes: `/api/playbooks*`, `moveStep`, `cloneStep`, `removeStep`, `emptyStep`, `PlaybookStep`, `publishProblem` (for the disabled state's explanation), `SectionCard`.

- [ ] **Step 1: Write the failing page/PDF test**

Create `tests/unit/playbook-pages.test.ts`:

- All three pages exist and are Suspense shells with `dynamic = "force-dynamic"` on the server page.
- `components/dashboard-layout.tsx` contains `href: "/dashboard/playbooks"` and the `BookOpenCheck` icon import.
- The list client fetches `/api/playbooks` and contains a `CommandDialog` (the palette) whose search reads `title`, `summary`, `tags` and `step.action`.
- The editor imports `exportPlaybookPdf`, calls `moveStep(`, `cloneStep(` and `removeStep(`, and renders the publish problem from `publishProblem`.
- The run client posts to `/api/playbooks/${playbook.id}/run` and renders one textarea per method phase.
- The dashboard top-bar search submits to `/dashboard/playbooks?q=`.

Extend `tests/unit/export-pdf.test.ts`:

```ts
it("exports a fourth playbook layout with one page per phase", () => {
  expect(source).toContain("export function exportPlaybookPdf")
  expect(source).toContain("One page per phase")
  expect(source).toContain("Signature")
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/playbook-pages.test.ts tests/unit/export-pdf.test.ts`
Expected: FAIL — the pages and the export do not exist.

- [ ] **Step 3: Add the list page and palette**

`/dashboard/playbooks` is a Suspense shell. `playbooks-client.tsx`:

- Reads `q`, `status`, `pack` from `useSearchParams`; writes them back with `router.replace` so a shared URL reproduces the list.
- Fetches `/api/playbooks?<params>`; renders a `SectionCard` grid of rows: title, summary, status badge, `v{version}`, step count, author, updated date, and an Open link to `/dashboard/playbooks/{id}`.
- "New playbook" dialog: title, summary, pack select (from the payload's `packs`), method textarea (one phase per line, prefilled with the selected pack's method), tags. `POST /api/playbooks`; on success route to the editor.
- Palette: a `CommandDialog` opened by a search button and `⌘K`, filtering the loaded rows on `title`, `summary`, `tags` and `step.action`; selecting a row opens its editor.
- Empty state names the pack method and links to the six-step default.

- [ ] **Step 4: Add the editor**

`/dashboard/playbooks/[id]` is a Suspense shell; `page.tsx` awaits `params` and passes `id`.

`playbook-editor.tsx` loads `/api/playbooks/{id}` and keeps a draft copy of:

- title, summary, method (one phase per line), precautions and recommendations (one per line), tags (comma-separated), scope kind and verify interval.
- Step cards, one per `PlaybookStep`, with a phase `Select` (options = method), an action `Textarea`, and inputs for `expected`, `time_estimate`, `stop_condition`, `escalation`, `evidence_to_record`, plus five line-per-entry textareas for `checks`, `precautions`, `warnings`, `ppe`, `tools_parts`.
- Add step (phase defaults to the first method phase), move up/down (`moveStep`), clone (`cloneStep`), remove (`removeStep`). Every mutation goes through the pure helpers, so orders stay `1..n`.
- Save (`PATCH`), Publish (`POST .../publish`; toast the 409 message), Archive/draft (`PATCH { status }`), Print (`exportPlaybookPdf`), and Run (link, disabled unless `status === "published"` with the reason in a tooltip).
- A banner when `aiMarked` is true: "Model-written draft — every precaution below is advice, not a company rule. Edit and review before publishing." The publish button is disabled with the `publishProblem` text.

- [ ] **Step 5: Add run mode**

`/dashboard/playbooks/[id]/run` loads the detail, refuses a non-published playbook in the UI with a link back, and renders a stepper: one card per method phase with a textarea for what was done. A date input defaults to the server's `today`; a future date is refused client-side and by the route.

"Record run" posts `{ workedOn, notes }`; on success it shows "Logged N entries for {title} v{version}" and a link to `/dashboard/worklog?day={workedOn}`.

- [ ] **Step 6: Add the nav entry and wire the top-bar search**

In `components/dashboard-layout.tsx`, import `BookOpenCheck` and add under Main, after Work Reports:

```tsx
{
  title: "Playbooks",
  icon: <BookOpenCheck className="h-5 w-5" />,
  href: "/dashboard/playbooks",
  active: pathname === "/dashboard/playbooks" || pathname.startsWith("/dashboard/playbooks/"),
},
```

Wrap the top-bar search `Input` in a `<form>` whose submit navigates to `/dashboard/playbooks?q=<value>`; placeholder becomes `Search playbooks…`. This gives the dashboard search one real target without inventing a second index.

- [ ] **Step 7: Add `exportPlaybookPdf`**

In `lib/export/pdf.ts`, add:

```ts
export type PlaybookExportData = {
  title: string
  summary: string | null
  version: number
  status: string
  method: string[]
  steps: PlaybookStep[]
  precautions: string[]
  recommendations: string[]
  aiMarked: boolean
  authorName: string
}
```

Implementation: cover page (title, version, status, author, the method chain, and "Model-written draft — review before use" when `aiMarked`); then one page per phase — heading `Phase N — <phase>`, an `autoTable` with columns `Order`, `Action`, `Checks`, `Expected`, `Stop / escalate`, `Signature`, `minCellHeight: 14` so the empty Signature cell is a usable box; step-level precautions/warnings appended under each row set; playbook-level precautions, recommendations and tags on the final page; `addFooter(doc)` and `filename("playbook", stamp)`.

- [ ] **Step 8: Run the tests and typecheck**

Run: `npx vitest run tests/unit/playbook-pages.test.ts tests/unit/export-pdf.test.ts && npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/playbooks components/dashboard-layout.tsx lib/export/pdf.ts tests/unit/playbook-pages.test.ts tests/unit/export-pdf.test.ts
git commit -m "feat(playbooks): list, editor, run mode, palette and printable sheet"
```

---

### Task 5: Guards, docs, gates and push

**Files:**
- Modify: `FEATURES.md` (new §21, counts, "deliberately absent" line drops "playbooks (phase 16)")
- Modify: `README.md` (intro, scripts table, layout counts, new section)
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (phase 16 entry, after the migration runs)
- Modify: `/Users/kiibridge-tech/.qoder/projects/-Users-kiibridge-tech-Desktop-Projects-jiravision/memory/jiravision-worklog-reports-phases.md`
- Test: `tests/unit/worklog-reports.test.ts` (guard additions)
- Test: `tests/unit/playbook-method.test.ts` (final run)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Add the guard assertions**

In `tests/unit/worklog-reports.test.ts`, add a phase-16 block:

- The run route inserts `playbookId` and `playbookVersion` and never `tasks`/`taskId`.
- `lib/playbooks/read.ts` applies `canReadPlaybook` and the SQL draft restriction.
- A `source: "gemini"` row cannot be published while `aiMarked` (source assertion that `publishProblem` is called before the update).
- `lib/export/pdf.ts` prints the model-draft disclosure next to `aiMarked`.

- [ ] **Step 2: Run the full suite**

Run: `npx vitest run`
Expected: PASS — the new files bring the suite above 92 files / 1559 tests.

- [ ] **Step 3: Run the gates**

Run: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
Expected: tsc 0 errors; lint no new errors beyond the known `components/planner/gantt.tsx:43` baseline and the 73-warning baseline; build succeeds.

- [ ] **Step 4: Sync the docs**

`FEATURES.md`: new §21 "Playbooks" with the method, the editor, run mode, print and the AI rule; update the guard/file/test counts; remove playbooks from the deliberately-absent list.

`README.md`: mention SOPs in the intro, add `db:playbooks` / `db:playbooks:rollback` to the scripts table, add `playbooks/` to the lib list, add the three pages to the page count and `/api/playbooks` to the route count, and add a "## Playbooks" section naming the six-step default and the run-logging rule.

Spec: mark phase 16 shipped only after Task 6's migration output is known; record the same two-table/zero-row style facts phase 15 used, plus the suite count.

- [ ] **Step 5: Commit and push**

```bash
git add FEATURES.md README.md docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md tests/unit/worklog-reports.test.ts
git commit -m "docs(playbooks): record phase 16 and add the run-logging guards"
git push origin main
```

---

### Task 6: The live Neon checkpoint

**Files:**
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (migration result)
- Modify: `FEATURES.md` (migration result)
- Modify: `docs/superpowers/plans/2026-10-27-playbooks-phase16.md` (`## Result`)

**Interfaces:**
- Consumes: the approved `scripts/create-playbooks-tables.mjs`.

- [ ] **Step 1: Ask for the per-action approval**

Report exactly what will run and what it changes: one new table (`playbooks`), two indexes, and one guarded `ALTER TABLE work_log_entries ADD CONSTRAINT` for `playbook_id`; no rows are seeded; nothing is dropped or rewritten. Mask the host. Offer one recommended option: run `npm run db:playbooks`.

- [ ] **Step 2: Run the migration after approval**

Run: `PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH" npm run db:playbooks`
Expected: `tables: playbooks`, `playbooks rows: 0`, and the FK present.

- [ ] **Step 3: Verify read-only**

Query `information_schema.columns` for `playbooks`, `pg_constraint` for `work_log_entries_playbook_id_fk`, and `count(*)` on `playbooks`. Confirm `work_log_entries` row count is unchanged from before the migration.

- [ ] **Step 4: Record the result and push**

Append a `## Result` section to this plan with the commits, gates, migration output and any deviations; update the spec and FEATURES with the verified counts; commit and push.

```bash
git add docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md FEATURES.md docs/superpowers/plans/2026-10-27-playbooks-phase16.md
git commit -m "docs(playbooks): record the migration run against production"
git push origin main
```

---

## Self-review notes

- Spec coverage: table (§13) → Task 1; six-step method, step arrays, phase membership, run logging, gemini publish gate (§12.5, §15) → Task 2; visibility (§14) and routes → Task 3; editor/reorder/clone, palette, run mode, fourth PDF layout (§12.5, §16) → Task 4; docs/guards → Task 5; migration approval → Task 6.
- Type consistency: `PlaybookStep` keys are the spec's snake_case keys everywhere (method module, DTO, PDF, editor); `PlaybookViewer` is used by rules and reads; `publishProblem` is the single publish gate.
- No placeholders: every step names a file and a command; the UI steps name the exact API paths and pure helpers they call.
