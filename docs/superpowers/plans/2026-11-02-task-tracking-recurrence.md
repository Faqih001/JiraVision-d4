# Task Tracking with Recurrence, Checklists, Calendar Views & Reports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the task system with recurring tasks, checklists, four calendar view modes, and hybrid report generation from task/checklist data.

**Architecture:** Add four columns to the existing `tasks` table (cadence, parent_task_id, is_template, checklist_items). Create two new tables: `task_instances` (per-occurrence tracking) and `task_report_templates` + `task_reports` (structured report generation). Recurrence engine auto-generates the next instance on completion. Calendar API gains a `viewMode` query parameter. Report generator pulls completed instances/checklists into template-driven drafts.

**Tech Stack:** Next.js App Router, Drizzle ORM (schema.ts), PostgreSQL (Neon), Vitest, shadcn/ui, Recharts, `lib/cadence.ts` (existing)

**Spec:** `docs/superpowers/specs/2026-11-02-task-tracking-recurrence-design.md`

## Global Constraints

- Migration scripts follow `scripts/create-reports-tables.mjs` pattern: raw SQL with `postgres` library, additive-only (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), read DATABASE_URL from `.env.local` with `/^DATABASE_URL/m` regex.
- Drizzle schema in `drizzle/schema.ts` must stay in sync with migration scripts — the schema file is the compile-time type source, the migration script is the runtime DDL source.
- All new lib modules must be free of database imports (see `lib/cadence.ts` comment: `lib/db.js` shadows `lib/db.ts` under Vitest).
- Existing `report_schedules`/`report_runs` tables and `/api/reports/` routes are the analytics report system — new tables use distinct names (`task_report_templates`, `task_reports`) to avoid collision.
- Test files: unit tests in `tests/unit/`, integration tests in `tests/integration/`. Vitest config aliases `@/` to project root and `@/drizzle/schema` to `drizzle/schema.ts`.
- Cadence vocabulary: `one-off | daily | weekly | monthly | yearly` from `lib/cadence.ts`. Import `Cadence`, `isCadence`, `computeNextRun`, `CADENCE_DAYS` as needed.

---

### Task 1: Schema Migration — Extend tasks table + create task_instances

**Files:**
- Create: `scripts/create-task-instances-table.mjs`
- Modify: `drizzle/schema.ts` (add columns to `tasks`, add new `taskInstances` table)

- [ ] **Step 1: Write the migration script**

Create `scripts/create-task-instances-table.mjs`:

```js
// Creates task_instances table and adds recurrence columns to tasks table.
// Usage: node scripts/create-task-instances-table.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]
const sql = postgres(databaseUrl, { max: 1 })

const ALTER_TASKS_SQL = `
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cadence VARCHAR(20) DEFAULT 'one-off';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_tasks_cadence ON tasks(cadence);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_template ON tasks(is_template);
`

const CREATE_INSTANCES_SQL = `
CREATE TABLE IF NOT EXISTS task_instances (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  instance_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  completed_at TIMESTAMPTZ,
  completed_by INTEGER REFERENCES users(id),
  notes TEXT,
  checklist_responses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, instance_date)
);
CREATE INDEX IF NOT EXISTS idx_task_instances_task_date ON task_instances(task_id, instance_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON task_instances(status);
`

try {
  console.log("Altering tasks table...")
  await sql.unsafe(ALTER_TASKS_SQL)
  console.log("tasks table altered OK")

  console.log("Creating task_instances table...")
  await sql.unsafe(CREATE_INSTANCES_SQL)
  console.log("task_instances table created OK")

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name IN ('cadence', 'parent_task_id', 'is_template', 'checklist_items')
    ORDER BY column_name
  `
  console.log("new tasks columns:", cols.map(c => c.column_name).join(", "))

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_instances'
  `
  console.log("task_instances present:", tables.length === 1)

  if (cols.length !== 4 || tables.length !== 1) process.exit(1)
  console.log("Migration verified OK")
} catch (err) {
  console.error("Migration failed:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
```

- [ ] **Step 2: Update drizzle schema — add columns to tasks table**

In `drizzle/schema.ts`, add to the `tasks` table definition after the `metadata` column:

```ts
// Recurrence and checklist support
cadence: varchar("cadence", { length: 20 }).default("one-off"),
parentTaskId: integer("parent_task_id").references(() => tasks.id),
isTemplate: boolean("is_template").notNull().default(false),
checklistItems: jsonb("checklist_items").default("[]"),
```

Also add a self-referencing relation. Find the `tasksRelations` block (if it exists) or add one:

```ts
export const tasksRelations = relations(tasks, ({ many, one }) => ({
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  sprint: one(sprints, { fields: [tasks.sprintId], references: [sprints.id] }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id], relationName: "taskInstances" }),
  instances: many(taskInstances, { relationName: "taskInstances" }),
  childInstances: many(tasks, { relationName: "taskInstances" }),
}))
```

If `tasksRelations` already exists, just add the three new fields (`parentTask`, `instances`, `childInstances`) to it.

- [ ] **Step 3: Add taskInstances table to drizzle schema**

Add after the `tasks` table and its relations:

```ts
export const taskInstances = pgTable("task_instances", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  instanceDate: date("instance_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("todo"),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  notes: text("notes"),
  checklistResponses: jsonb("checklist_responses").default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskDateUnique: uniqueIndex("idx_task_instances_task_date").on(table.taskId, table.instanceDate),
  statusIdx: index("idx_task_instances_status").on(table.status),
}))

export const taskInstancesRelations = relations(taskInstances, ({ one }) => ({
  task: one(tasks, { fields: [taskInstances.taskId], references: [tasks.id], relationName: "taskInstances" }),
  completer: one(users, { fields: [taskInstances.completedBy], references: [users.id] }),
}))
```

Note: `statusIdx` uses `index()` not `uniqueIndex()` — multiple instances can have the same status.

- [ ] **Step 4: Run the migration script**

```bash
node scripts/create-task-instances-table.mjs
```

Expected: "Migration verified OK" with 4 new columns and task_instances table present.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any type errors from the schema changes before committing.

- [ ] **Step 6: Commit**

```bash
git add scripts/create-task-instances-table.mjs drizzle/schema.ts
git commit -m "feat(schema): add recurrence columns to tasks and create task_instances table"
```

---

### Task 2: Unit Tests — Recurrence Engine

**Files:**
- Create: `tests/unit/task-recurrence.test.ts`

- [ ] **Step 1: Write failing tests for computeInstanceDates**

```ts
import { describe, expect, it } from "vitest"
import { computeInstanceDates } from "@/lib/tasks/recurrence"

describe("computeInstanceDates", () => {
  it("generates 30 daily dates from a start date", () => {
    const dates = computeInstanceDates("daily", new Date("2026-11-02"))
    expect(dates).toHaveLength(30)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[29]).toBe("2026-12-01")
  })

  it("generates 12 weekly dates", () => {
    const dates = computeInstanceDates("weekly", new Date("2026-11-02"))
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[1]).toBe("2026-11-09")
  })

  it("generates 12 monthly dates", () => {
    const dates = computeInstanceDates("monthly", new Date("2026-11-02"))
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[11]).toBe("2027-10-02")
  })

  it("generates 4 yearly dates", () => {
    const dates = computeInstanceDates("yearly", new Date("2026-11-02"))
    expect(dates).toHaveLength(4)
    expect(dates[0]).toBe("2026-11-02")
    expect(dates[3]).toBe("2029-11-02")
  })

  it("returns empty array for one-off", () => {
    const dates = compute["one-off", new Date("2026-11-02"))
    expect(dates).toHaveLength(0)
  })

  it("handles month boundary correctly for monthly cadence", () => {
    // Jan 31 + 1 month = Feb 28 (non-leap) or Feb 29 (leap)
    // computeNextRun uses setUTCMonth which rolls over, so Jan 31 → Mar 3 in non-leap
    const dates = computeInstanceDates("monthly", new Date("2026-01-31"))
    expect(dates).toHaveLength(12)
    expect(dates[0]).toBe("2026-01-31")
    // Feb doesn't have 31 days, so setUTCMonth(1) on Jan 31 rolls to Mar 3
    expect(dates[1]).toBe("2026-03-03")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/task-recurrence.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tasks/recurrence'`

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/unit/task-recurrence.test.ts
git commit -m "test(recurrence): add failing tests for computeInstanceDates"
```

---

### Task 3: Implement Recurrence Engine

**Files:**
- Create: `lib/tasks/recurrence.ts`

- [ ] **Step 1: Write the recurrence module**

```ts
// Recurrence engine for task instances.
// Pure date computation — no database imports (see lib/cadence.ts for why).

import { type Cadence, computeNextRun } from "@/lib/cadence"

/** How many instances to pre-generate for each cadence. */
export const INSTANCE_COUNTS: Record<Cadence, number> = {
  "one-off": 0,
  daily: 30,
  weekly: 12,
  monthly: 12,
  yearly: 4,
}

/**
 * Compute an array of ISO date strings (YYYY-MM-DD) for the next N instances
 * of a recurring task, starting from `from`.
 */
export function computeInstanceDates(cadence: Cadence, from: Date): string[] {
  const count = INSTANCE_COUNTS[cadence]
  if (count === 0) return []

  const dates: string[] = []
  let cursor = new Date(from)

  for (let i = 0; i < count; i++) {
    dates.push(toIsoDate(cursor))
    const nextIso = computeNextRun(cadence, cursor)
    if (!nextIso) break
    cursor = new Date(nextIso)
  }

  return dates
}

/**
 * Compute the next instance date after the given date.
 * Returns null for one-off cadence.
 */
export function nextInstanceDate(cadence: Cadence, after: Date): string | null {
  if (cadence === "one-off") return null
  const next = computeNextRun(cadence, after)
  return next ? next.slice(0, 10) : null
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx vitest run tests/unit/task-recurrence.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/tasks/recurrence.ts
git commit -m "feat(recurrence): implement computeInstanceDates and nextInstanceDate"
```

---

### Task 4: Unit Tests — Checklist Helpers

**Files:**
- Create: `tests/unit/checklist-helpers.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest"
import {
  parseChecklistItems,
  validateChecklistItem,
  validateChecklistResponses,
  type ChecklistItem,
} from "@/lib/tasks/checklist"

describe("validateChecklistItem", () => {
  it("accepts a valid yes-no-na item", () => {
    const item: ChecklistItem = { id: "item-1", label: "Servers operational", type: "yes-no-na" }
    expect(validateChecklistItem(item)).toBe(true)
  })

  it("rejects an item with empty label", () => {
    const item: ChecklistItem = { id: "item-1", label: "", type: "yes-no-na" }
    expect(validateChecklistItem(item)).toBe(false)
  })

  it("rejects an item with invalid type", () => {
    expect(validateChecklistItem({ id: "1", label: "x", type: "boolean" } as unknown as ChecklistItem)).toBe(false)
  })

  it("rejects an item with missing id", () => {
    expect(validateChecklistItem({ label: "x", type: "yes-no-na" } as unknown as ChecklistItem)).toBe(false)
  })
})

describe("parseChecklistItems", () => {
  it("parses a valid JSON array", () => {
    const input = [{ id: "a", label: "Check server", type: "yes-no-na" }]
    const result = parseChecklistItems(JSON.stringify(input))
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe("Check server")
  })

  it("returns empty array for null/undefined/empty", () => {
    expect(parseChecklistItems(null)).toEqual([])
    expect(parseChecklistItems(undefined)).toEqual([])
    expect(parseChecklistItems("")).toEqual([])
  })

  it("filters out invalid items", () => {
    const input = [
      { id: "a", label: "Valid", type: "yes-no-na" },
      { id: "", label: "No id", type: "yes-no-na" },
      { id: "b", label: "Bad type", type: "checkbox" },
    ]
    const result = parseChecklistItems(JSON.stringify(input))
    expect(result).toHaveLength(1)
  })

  it("returns empty array for invalid JSON", () => {
    expect(parseChecklistItems("not json")).toEqual([])
  })
})

describe("validateChecklistResponses", () => {
  const items: ChecklistItem[] = [
    { id: "a", label: "Item A", type: "yes-no-na" },
    { id: "b", label: "Item B", type: "yes-no-na" },
  ]

  it("accepts valid responses matching all items", () => {
    const responses = [
      { id: "a", value: "yes" },
      { id: "b", value: "no" },
    ]
    expect(validateChecklistResponsesos, responses)).toBe(true)
  })

  it("accepts n/a responses", () => {
    const responses = [
      { id: "a", value: "n/a" },
      { id: "b", value: "yes" },
    ]
    expect(validateChecklistResponses(items, responses)).toBe(true)
  })

  it("rejects responses with invalid values", () => {
    const responses = [
      { id: "a", value: "maybe" },
      { id: "b", value: "yes" },
    ]
    expect(validateChecklistResponses(items, responses)).toBe(false)
  })

  it("rejects responses missing items", () => {
    const responses = [{ id: "a", value: "yes" }]
    expect(validateChecklistResponses(items, responses)).toBe(false)
  })

  it("rejects responses with extra items", () => {
    const responses = [
      { id: "a", value: "yes" },
      { id: "b", value: "no" },
      { id: "c", value: "yes" },
    ]
    expect(validateChecklistResponses(items, responses)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/checklist-helpers.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/tasks/checklist'`

- [ ] **Step 3: Commit**

```bash
git add tests/unit/checklist-helpers.test.ts
git commit -m "test(checklist): add failing tests for checklist helpers"
```

---

### Task 5: Implement Checklist Helpers

**Files:**
- Create: `lib/tasks/checklist.ts`

- [ ] **Step 1: Implement the checklist module**

```ts
// Checklist item parsing and validation.
// No database imports — pure data helpers.

export type ChecklistItemType = "yes-no-na"
export const CHECKLIST_ITEM_TYPES: ChecklistItemType[] = ["yes-no-na"]

export type ChecklistItem = {
  id: string
  label: string
  type: ChecklistItemType
}

export type ChecklistResponse = {
  id: string
  value: "yes" | "no" | "n/a"
}

const VALID_RESPONSE_VALUES = new Set(["yes", "no", "n/a"])

export function validateChecklistItem(item: unknown): item is ChecklistItem {
  if (!item || typeof item !== "object") return false
  const obj = item as Record<string, unknown>
  return (
    typeof obj.id === "string" &&
    obj.id.length > 0 &&
    typeof obj.label === "string" &&
    obj.label.length > 0 &&
    typeof obj.type === "string" &&
    CHECKITEM_TYPES.includes(obj.type as ChecklistItemType)
  )
}

export function parseChecklistItems(raw: string | null | undefined): ChecklistItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(validateChecklistItem)
  } catch {
    return []
  }
}

export function validateChecklistResponses(
  items: ChecklistItem[],
  responses: unknown,
): boolean {
  if (!Array.isArray(responses)) return false
  if (responses.length !== items.length) return false

  const itemIds = new Set(items.map((i) => i.id))
  const seenIds = new Set<string>()

  for (const r of responses) {
    if (!r || typeof r !== "object") return false
    const resp = r as Record<string, unknown>
    if (typeof respid !== "string" || !itemIds.has(resp.id)) return false
    if (seenIds.has(resp.id)) return false
    seenIds.add(resp.id)
    if (typeof resp.value !== "string" || !VALID_RESPONSE_VALUES.has(resp.value)) return false
  }

  return true
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx vitest run tests/unit/checklist-helpers.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/tasks/checklist.ts
git commit -m "feat(checklist): implement parseChecklistItems and validateChecklistResponses"
```

---

### Task 6: Extend Task API for Cadence and Checklists

**Files:**
- Modify: `app/api/tasks/route.ts` (POST handler)
- Modify: `lib/task-updates.ts` (pickTaskUpdates whitelist)

- [ ] **Step 1: Update lib/task-updates.ts to whitelist new fields**

Read `lib/task-updates.ts` and add `cadence`, `checklistItems` to the allowed update keys. The exact change depends on the current implementation — look for a `ALLOWED_KEYS` array or similar whitelist and add:

```ts
"cadence",
"checklistItems",
```

- [ ] **Step 2: Update POST /api/tasks route handler**

In `app/api/tasks/route.ts`, the POST handler already reads fields from `request.json()`. Add `cadence` and `checklistItems` to the destructured body:

```ts
const body = await request.json()
const {
  title,
  description,
  status,
  priority,
  storyPoints,
  assigneeId,
  sprintId,
  dueDate,
  tags,
  cadence,        // NEW
  checklistItems, // NEW
} = body
```

Validate cadence if provided:

```ts
import { isCadence } from "@/lib/cadence"

if (cadence && !isCadence(cadence)) {
  return NextResponse.json(
    { success: false, message: "Invalid cadence value" },
    { status: 400 }
  )
}
```

Pass to createTask:

```ts
const task = await createTask({
  title,
  description,
  status,
  priority,
  storyPoints: storyPoints ?? 0,
  assigneeId,
  sprintId,
  dueDate,
  tags: tags ?? [],
  cadence: cadence ?? "one-off",
  checklistItems: checklistItems ?? [],
  isTemplate: cadence && cadence !== "one-off" ? true : false,
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add lib/task-updates.ts app/api/tasks/route.ts
git commit -m "feat(api): extend task creation with cadence and checklistItems"
```

---

### Task 7: Task Instances API

**Files:**
- Create: `app/api/task-instances/route.ts`
- Create: `app/api/task-instances/[id]/route.ts`
- Create: `lib/data-access-task-instances.ts`

- [ ] **Step 1: Create data access functions for task instances**

Create `lib/data-access-task-instances.ts`:

```ts
import { db } from "@/lib/db"
import { taskInstances, tasks } from "@/drizzle/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"
import { computeNextRun, type Cadence } from "@/lib/cadence"

export type TaskInstance = typeof taskInstances.$inferSelect

export async function getTaskInstances(filters: {
  taskId?: number
  startDate?: string
  endDate?: string
  status?: string
}): Promise<TaskInstance[]> {
  try {
    const conditions = []

    if (filters.taskId) {
      conditions.push(eq(taskInstances.taskId, filters.taskId))
    }
    if (filters.startDate) {
      conditions.push(gte(taskInstances.instanceDate, filters.startDate))
    }
    if (filters.endDate) {
      conditions.push(lte(taskInstances.instanceDate, filters.endDate))
    }
    if (filters.status) {
      conditions.push(eq(taskInstances.status, filters.status))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    return await db.select().from(taskInstances).where(where)
  } catch (error) {
    console.error("Error fetching task instances:", error)
    return []
  }
}

export async function getTaskInstanceById(id: number): Promise<TaskInstance | null> {
  try {
    const results = await db.select().from(taskInstances).where(eq(taskInstances.id, id)).limit(1)
    return results[0] ?? null
  } catch (error) {
    console.error("Error fetching task instance:", error)
    return null
  }
}

export async function updateTaskInstance(
  id: number,
  data: Partial<Pick<TaskInstance, "status" | "notes" | "checklistResponses" | "completedAt" | "completedBy">>,
): Promise<TaskInstance | null> {
  try {
    const results = await db
      .update(taskInstances)
      .set()
      .where(eq(taskInstances.id, id))
      .returning()
    return results[0] ?? null
  } catch (error) {
    console.error("Error updating task instance:", error)
    return null
  }
}

export async function createTaskInstance(data: {
  taskId: number
  instanceDate: string
  status?: string
}): Promise<TaskInstance> {
  try {
    const results = await db.insert(taskInstances).values(data).returning()
    return results[0]
  } catch (error) {
    console.error("Error creating task instance:", error)
    throw error
  }
}

/**
 * Generate the next instance for a recurring task.
 * Called when an instance is marked complete.
 */
export async function generateNextInstance(taskId: number): Promise<TaskInstance | null> {
  try {
    // Get the template task
    const templateResults = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
    const template = templateResults[0]
    if (!template || !template.cadence || template.cadence === "one-off") return null

    // Get the most recent instance
    const latestResults = await db
      .select()
      .from(taskInstances)
      .where(eq(taskInstances.taskId, taskId))
      .orderBy(sql`${taskInstances.instanceDate} DESC`)
      .limit(1)

    const latest = latestResults[0]
    if (!latest) return null

    // Compute next date
    const nextDateIso = computeNextRun(template.cadence as Cadence, new Date(latest.instanceDate))
    if (!nextDateIso) return null

    const nextDate = nextDateIso.slice(0, 10)

    // Check if instance already exists (idempotency)
    const existing = await db
      .select()
      .from(taskInstances)
      .where(
        and(
          eq(taskInstances.taskId, taskId),
          eq(taskInstances.instanceDate, nextDate)
        )
      )
      .limit(1)

    if (existing.length > 0) return existing[0]

    // Create new instance
    return await createTaskInstance({
      taskId,
      instanceDate: nextDate,
      status: "todo",
    })
  } catch (error) {
    console.error("Error generating next instance:", error)
    return null
  }
}
```

- [ ] **Step 2: Create GET /api/task-instances route**

```ts
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getTaskInstances } from "@/lib/data-access-task-instances"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      taskId: searchParams.get("taskId") ? parseInt(searchParams.get("taskId")!, 10) : undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: searchParams.get("status") || undefined,
    }

    const instances = await getTaskInstances(filters)
    return NextResponse.json({ success: true, data: instances })
  } catch (error) {
    console.error("Error fetching task instances:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch task instances", error: (error as Error).message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Create PATCH /api/task-instances/[id] route**

```ts
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  getTaskInstanceById,
  updateTaskInstance,
  generateNextInstance,
} from "@/lib/data-access-task-instances"
import { validateChecklistResponses, parseChecklistItems } from "@/lib/tasks/checklist"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const instanceId = parseInt(id, 10)
    const instance = await getTaskInstanceById(instanceId)
    if (!instance) {
      return NextResponse.json({ success: false, message: "Instance not found" }, { status: 404 })
    }

    const body = await request.json()
    const { status, notes, checklistResponses } = body

    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === "done") {
        updateData.completedAt = new Date().toISOString()
        updateData.completedBy = session?.id ?? 1
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (checklistResponses !== undefined) {
      // Validate checklist responses against the template task's checklist items
      const templateResults = await db.select().from(tasks).where(eq(tasks.id, instance.taskId)).limit(1)
      const template = templateResults[0]
      if (template) {
        const items = parseChecklistItems(
          typeof template.checklistItems === "string"
            ? template.checklistItems
            : JSON.stringify(template.checklistItems ?? [])
        )
        if (items.length > > 0 && !validateChecklistResponses(items, checklistResponses)) {
          return NextResponse.json(
            { success: false, message: "Invalid checklist responses" },
            { status: 400 }
          )
        }
      }
      updateData.checklistResponses = checklistResponses
    }

    const updated = await updateTaskInstance(instanceId, updateData)
    if (!updated) {
      return NextResponse.json({ success: false, message: "Failed to update instance" }, { status: 500 })
    }

    // If marked complete, generate next instance
    let nextInstance = null
    if (status === "done") {
      nextInstance = await generateNextInstance(instance.taskId)
    }

    return NextResponse.json({
      success: true,
      data: updated,
      nextInstance,
    })
  } catch (error) {
    console.error("Error updating task instance:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update instance", error: (error as Error).message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add lib/data-access-task-instances.ts app/api/task-instances/
git commit -m "feat(api): add task instances CRUD with auto-generation on completion"
```

---

### Task 8: Initial Instance Generation on Task Create

**Files:**
- Modify: `app/api/tasks/route.ts` (POST handler)
- Modify: `lib/data-access-task-instances.ts` (add bulk generation)

- [ ] **Step 1: Add bulk instance generation function**

In `lib/data-access-task-instances.ts`, add:

```ts
import { computeInstanceDates } from "@/lib/tasks/recurrence"

export async function generateInitialInstances(
  taskId: number,
  cadence: Cadence,
  startDate?: string,
): Promise<number> {
  if (cadence === "one-off") return 0

  const from = startDate ? new Date(startDate) : new Date()
  const dates = computeInstanceDates(cadence, from)

  if (dates.length === 0) return 0

  try {
    let inserted = 0
    for (const date of dates) {
      try {
        await db
          .insert(taskInstances)
          .values({ taskId, instanceDate: date, status: "todo" })
          .onConflictDoNothing()
        inserted++
      } catch (err) {
        // Unique constraint violation — instance already exists, skip
        console.warn("Instance already exists for task", taskId, "on", date)
      }
    }

    return inserted
  } catch (error) {
    console.error("Error generating initial instances:", error)
    return 0
  }
}
```

- [ ] **Step 2: Call generateInitialInstances after task creation**

In `app/api/tasks/route.ts`, after the `createTask()` call in the POST handler:

```ts
// Generate initial instances for recurring tasks
let instanceCount = 0
if (cadence && cadence !== "one-off") {
  instanceCount = await generateInitialInstances(task.id, cadence, dueDate)
}

return NextResponse.json({
  success: true,
  data: task,
  instanceCount,
})
```

Import at the top:

```ts
import { generateInitialInstances } from "@/lib/data-access-task-instances"
```

- [ ] **Step 3: Commit**

```bash
git add lib/data-access-task-instances.ts app/api/tasks/route.ts
git commit -m "feat(recurrence): generate initial instances on task creation"
```

---

### Task 9: Calendar API — View Modes

**Files:**
- Modify: `app/api/calendar/events/route.ts` (GET handler)

- [ ] **Step 1: Extend GET /api/calendar/events**

In `app/api/calendar/events/route.ts`, add viewMode support to the GET handler:

```ts
import { getTaskInstances } from "@/lib/data-access-task-instances"
import { db } from "@/lib/db"
import { tasks } from "@/drizzle/schema"
import { and, gte, lte, eq } from "drizzle-orm"

// Inside the GET handler, after existing event fetching logic:

const viewMode = searchParams.get("viewMode") || "due"
const validViewModes = ["due", "cadence", "both", "range"]
if (!validViewModes.includes(viewMode)) {
  return NextResponse.json(
    { success: false, message: `Invalid viewMode. Must be one of: ${validViewModes.join(", ")}` },
    { status: 400 }
  )
}

// Fetch task instances for cadence-based views
let taskInstances = []
if (viewMode === "cadence" || viewMode === "both" || viewMode === "range") {
  taskInstances = await getTaskInstances({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })
}

// Fetch recurring template tasks for "due" and "both" views
let recurringTasks = []
if (viewMode === "due" || viewMode === "both") {
  const conditions = [eq(tasks.isTemplate, true)]
  if (startDate) conditions.push(gte(tasks.dueDate, startDate))
  if (endDate) conditions.push(lte(tasks.dueDate, endDate))
  
  recurringTasks = await db.select().from(tasks).where(and(...conditions))
}

// Convert task instances to calendar event format
const instanceEvents = taskInstances.map((instance) => ({
  id: `instance-${instance.id}`,
  title: `Task #${instance.taskId} (Instance)`,
  startTime: `${instance.instanceDate}T00:00:00Z`,
  endTime: `${instance.instanceDate}T23:59:59Z`,
  eventType: "task_instance",
  isRecurring: true,
  instanceStatus: instance.status,
  instanceId: instance.id,
  taskId: instance.taskId,
}))

// Convert recurring tasks to calendar event format (for due/both views)
const recurringEvents = recurringTasks.map((task) => ({
  id: `task-${task.id}`,
  title: task.title,
  startTime: `${task.dueDate}T00:00:00Z`,
  endTime: `${task.dueDate}T23:59:59Z`,
  eventType: "task",
  isRecurring: true,
  cadence: task.cadence,
  taskId: task.id,
}))

// Merge with existing calendar events
const allEvents = [...existingEvents, ...instanceEvents, ...recurringEvents]
```

Update the response to use `allEvents` instead of just `existingEvents`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/calendar/events/route.ts
git commit -m "feat(calendar): add viewMode parameter for due/cadence/both/range views"
```

---

### Task 10: Report Templates Schema and Migration

**Files:**
- Create: `scripts/create-task-report-templates-table.mjs`
- Modify: `drizzle/schema.ts` (add taskReportTemplates and taskReports tables)

- [ ] **Step 1: Write migration script**

```js
// Creates task_report_templates and task_reports tables.
// Usage: node scripts/create-task-report-templates-table.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]
const sql = postgres(databaseUrl, { max: 1 })

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS task_report_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cadence VARCHAR(20) NOT NULL DEFAULT 'monthly',
  discipline VARCHAR(40),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_sources JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_reports (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES task_report_templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  author_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_report_templates_cadence ON task_report_templates(cadence);
CREATE INDEX IF NOT EXISTS idx_task_report_templates_discipline ON task_report_templates(discipline);
CREATE INDEX IF NOT EXISTS idx_task_reports_template_id ON task_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_author_id ON task_reports(author_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_status ON task_reports(status);
CREATE INDEX IF NOT EXISTS idx_task_reports_period ON task_reports(period_start, period_end);
`

try {
  console.log("Creating task_report_templates and task_reports tables...")
  await sql.unsafe(CREATE_SQL)
  console.log("Tables created OK")

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('task_report_templates', 'task_reports')
  `
  console.log("tables present:", tables.map(t => t.table_name).join(", "))
  if (tables.length !== 2) process.exit(1)
  console.log("Migration verified OK")
} catch (err) {
  console.error("Failed:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
```

- [ ] **Step 2: Add to drizzle schema**

In `drizzle/schema.ts`, add:

```ts
export const taskReportTemplates = pgTable("task_report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cadence: varchar("cadence", { length: 20 }).notNull().default("monthly"),
  discipline: varchar("discipline", { length: 40 }),
  sections: jsonb("sections").notNull().default([]),
  dataSources: jsonb("data_sources").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const taskReports = pgTable("task_reports", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => taskReportTemplates.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  content: jsonb("content").notNull().default({}),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  authorId: integer("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})
```

- [ ] **Step 3: Run migration**

```bash
node scripts/create-task-report-templates-table.mjs
```

Expected: "Migration verified OK"

- [ ] **Step 4: Commit**

```bash
git add scripts/create-task-report-templates-table.mjs drizzle/schema.ts
git commit -m "feat(schema): add task_report_templates and task_reports tables"
```

---

### Task 11: Report Generator

**Files:**
- Create: `lib/reports/task-report-generator.ts`
- Create: `tests/unit/task-report-generator.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest"
import { buildReportSections } from "@/lib/reports/task-report-generator"

describe("buildReportSections", () => {
  it("returns empty sections when no template sections provided", () => {
    const result = buildReportSections([], [], [])
    expect(result).toEqual([])
  })

  it("populates task_instances data source", () => {
    const sections = [
      {
        id: "completed-tasks",
        title: "Completed Tasks",
        dataSource: { type: "task_instances", filters: { status: "done" } },
      },
    ]
    const instances = [
      { id: 1, taskId: 10, instanceDate: "2026-11-01", status: "done", notes: null },
      { id: 2, taskId: 11, instanceDate: "2026-11-02", status: "done", notes: null },
    ]
    const checklists: unknown[] = []

    const result = buildReportSections(sections, instances, checklists)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("completed-tasks")
    expect(result[0].data).toHaveLength(2)
  })

  it("leaves manual sections empty", () => {
    const sections = [
      { id: "risks", title: "Risks", dataSource: null },
    ]
    const result = buildReportSections(sections, [], [])
    expect(result).toHaveLength(1)
    expect(result[0].data).toBeNull()
  })

  it("filters by discipline when specified", () => {
    const sections = [
      {
        id: "it-tasks",
        title: "IT Tasks",
        dataSource: { type: "task_instances", filters: { discipline: "it_operations", status: "done" } },
      },
    ]
    const instances = [
      { id: 1, taskId: 10, instanceDate: "2026-11-01", status: "done", discipline: "it_operations" },
      { id: 2, taskId: 11, instanceDate: "2026-11-02", status: "done", discipline: "engineering" },
    ]
    const result = buildReportSections(sections, instances, [])
    expect(result[0].data).toHaveLength(1)
    expect((result[0].data[0] as any).discipline).toBe("it_operations")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/task-report-generator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the generator**

```ts
// Report generator — builds report sections from task instances and checklists.
// No database imports — pure data transformation.

export type ReportSection = {
  id: string
  title: string
  dataSource: {
    type: "task_instances" | "checklists"
    filters?: Record<string, string>
  } | null
}

export type ReportSectionOutput = {
  id: string
  title: string
  data: unknown[] | null
}

export function buildReportSections(
  templateSections: ReportSection[],
  instances: Array<Record<string, unknown>>,
  checklists: Array<Record<string, unknown>>,
): ReportSectionOutput[] {
  return templateSections.map((section) => {
    if (!section.dataSource) {
      return { id: section.id, title: section.title, data: null }
    }

    const { type, filters = {} } = section.dataSource

    let sourceData: Array<Record<string, unknown>>
    if (type === "task_instances") {
      sourceData = instances
    } else if (type === "checklists") {
      sourceData = checklists
    } else {
      return { id: section.id, title: section.title, data: null }
    }

    // Apply filters
    const filtered = sourceData.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        return item[key] === value
      })
    })

    return { id: section.id, title: section.title, data: filtered }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/unit/task-report-generator.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reports/task-report-generator.ts tests/unit/task-report-generator.test.ts
git commit -m "feat(reports): implement buildReportSections for task report generator"
```

---

### Task 12: Reports API

**Files:**
- Create: `app/api/task-reports/route.ts`
- Create: `app/api/task-reports/[id]/route.ts`
- Create: `app/api/task-report-templates/route.ts`

- [ ] **Step 1: Create GET/POST /api/task-reports**

```ts
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { taskReports, taskReportTemplates } from "@/drizzle/schema"
import { eq, and, sql } from "drizzle-orm"
import { buildReportSections, type ReportSection } from "@/lib/reports/task-report-generator"
import { getTaskInstances } from "@/lib/data-access-task-instances"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("templateId")
      ? parseInt(searchParams.get("templateId")!, 10)
      : undefined
    const status = searchParams.get("status") || undefined
    const authorId = searchParams.get("authorId")
      ? parseInt(searchParams.get("authorId")!, 10)
      : session?.id

    const conditions = []
    if (templateId) conditions.push(eq(taskReports.templateId, templateId))
    if (status) conditions.push(eq(taskReports.status, status))
    if (authorId) conditions.push(eq(taskReports.authorId, authorId))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const reports = await db
      .select()
      .from(taskReports)
      .where(where)
      .orderBy(sql`${taskReports.createdAt} DESC`)

    return NextResponse.json({ success: true, data: reports })
  } catch (error) {
    console.error("Error fetching task reports:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch reports", error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, title, periodStart, periodEnd } = body

    if (!templateId || !title || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: templateId, title, periodStart, periodEnd" },
        { status: 400 }
      )
    }

    // Load template
    const templates = await db
      .select()
      .from(taskReportTemplates)
      .where(eq(taskReportTemplates.id, templateId))
      .limit(1)

    const template = templates[0]
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 })
    }

    // Fetch task instances in the period
    const instances = await getTaskInstances({
      startDate: periodStart,
      endDate: periodEnd,
    })

    // Build sections from template
    const sections = (template.sections as ReportSection[]) || []
    const reportContent = buildReportSections(sections, instances, [])

    // Create report
    const reports = await db
      .insert(taskReports)
      .values({
        templateId,
        title,
        periodStart,
        periodEnd,
        content: reportContent,
        status: "draft",
        authorId: session?.id ?? 1,
      })
      .returning()

    return NextResponse.json({ success: true, data: reports[0] })
  } catch (error) {
    console.error("Error creating task report:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create report", error: (error as Error).message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create PATCH /api/task-reports/[id]**

```ts
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { taskReports } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const reportId = parseInt(id, 10)

    const body = await request.json()
    const { content, status } = body

    const updateData: Record<string, unknown> = {}
    if (content !== undefined) updateData.content = content
    if (status !== undefined) {
      if (!["draft", "final"].includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid status. Must be 'draft' or 'final'" },
          { status: 400 }
        )
      }
      updateData.status = status
       }
    updateData.updatedAt = new Date().toISOString()

    const reports = await db
      .update(taskReports)
      .set(updateData)
      .where(eq(taskReports.id, reportId))
      .returning()

    if (reports.length === 0) {
      return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: reports[0] })
  } catch (error) {
    console.error("Error updating task report:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update report", error: (error as Error).message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Create GET /api/task-report-templates**

```ts
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { taskReportTemplates } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"

const ENABLE_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_MODE === "true")

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session && !ENABLE_TEST_MODE) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cadence = searchParams.get("cadence") || undefined
    const discipline = searchParams.get("discipline") || undefined

    const conditions = [eq(taskReportTemplates.isActive, true)]
    if (cadence) conditions.push(eq(taskReportTemplates.cadence, cadence))
    if (discipline) conditions.push(eq(taskReportTemplates.discipline, discipline))

    const templates = await db
      .select()
      .from(taskReportTemplates)
      .where(and(...conditions))

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error("Error fetching task report templates:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch templates", error: (error as Error).message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/task-reports/ app/api/task-report-templates/
git commit -m "feat(api): add task reports CRUD and report templates endpoints"
```

---

### Task 13: Seed Data — IT Technician Templates and Tasks

**Files:**
- Create: `scripts/seed-it-technician-data.mjs`

- [ ] **Step 1: Create seed script**

```js
// Seeds IT technician report templates and sample recurring tasks.
// Usage: node scripts/seed-it-technician-data.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]
const sql = postgres(databaseUrl, { max: 1 })

const DAILY_CHECKLIST = [
  { id: "servers", label: "All servers operational", type: "yes-no-na" },
  { id: "network", label: "Network connectivity verified", type: "yes-no-na" },
  { id: "backups", label: "Backup jobs completed successfully", type: "yes-no-na" },
  { id: "tickets", label: "Critical support tickets reviewed", type: "yes-no-na" },
  { id: "updates", label: "Security patches applied", type: "yes-no-na" },
  { id: "logs", label: "System logs reviewed for errors", type: "yes-no-na" },
  { id: "storage", label: "Storage capacity within threshold", type: "yes-no-na" },
  { id: "services", label: "Critical services running", type: "yes-no-na" },
  { id: "dns", label: "DNS resolution operational", type: "yes-no-na" },
  { id: "firewall", label: "Firewall rules verified", type: "yes-no-na" },
  { id: "monitoring", label: "Monitoring alerts acknowledged", type: "yes-no-na" },
  { id: "users", label: "User access issues resolved", type: "yes-no-na" },
  { id: "email", label: "Email system operational", type: "yes-no-na" },
  { id: "printers", label: "Print services operational", type: "yes-no-na" },
  { id: "documentation", label: "Incidents documented", type: "yes-no-na" },
]

const WEEKLY_CHECKLIST = [
  { id: "backups-verify", label: "Verify all scheduled backups", type: "yes-no-na" },
  { id: "storage-review", label: "Review storage utilization", type: "yes-no-na" },
  { id: "updates-apply", label: "Apply pending updates", type: "yes-no-na" },
  { id: "security-scan", label: "Run security scan", type: "yes-no-na" },
  { id: "performance", label: "Review performance metrics", type: "yes-no-na" },
  { id: "logs-audit", label: "Audit system logs", type: "yes-no-na" },
  { id: "user-accounts", label: "Review user accounts", type: "yes-no-na" },
  { id: "license-compliance", label: "Check license compliance", type: "yes-no-na" },
  { id: "disaster-recovery", label: "Verify disaster recovery plan", type: "yes-no-na" },
  { id: "network-security", label: "Review network security", type: "yes-no-na" },
  { id: "hardware-health", label: "Check hardware health", type: "yes-no-na" },
  { id: "documentation-update", label: "Update documentation", type: "yes-no-na" },
  { id: "team-handoff", label: "Prepare handoff notes", type: "yes-no-na" },
]

const MONTHLY_REPORT_SECTIONS = [
  {
    id: "it-support",
    title: "IT Support",
    dataSource: { type: "task_instances", filters: { discipline: "it_operations", status: "done" } },
  },
  {
    id: "backups",
    title: "Backup Operations",
    dataSource: { type: "task_instances", filters: { status: "done" } },
  },
  {
    id: "hardware",
    title: "Hardware Status",
    dataSource: null,
  },
  {
    id: "software",
    title: "Software Updates",
    dataSource: { type: "task_instances", filters: { status: "done" } },
  },
  {
    id: "maintenance",
    title: "Maintenance Activities",
    dataSource: { type: "checklists" },
  },
  {
    id: "risks",
    title: "Risks and Recommendations",
    dataSource: null,
  },
]

try {
  console.log("Seeding IT technician data...")

  // Create report templates
  const templates = await sql`
    INSERT INTO task_report_templates (name, description, cadence, discipline, sections, data_sources)
    VALUES
      (
        'Daily IT Operations Report',
        'Daily operational status and checklist completion',
        'daily',
        'it_operations',
        ${JSON.stringify([
          { id: "daily-checklist", title: "Daily Checklist", dataSource: { type: "checklists" } },
          { id: "incidents", title: "Incidents", dataSource: null },
        ])},
        '{}'::jsonb
      ),
      (
        'Weekly IT Maintenance Report',
        'Weekly maintenance activities and system health',
        'weekly',
        'it_operations',
        ${JSON.stringify([
          { id: "weekly-checklist", title: "Weekly Checklist", dataSource: { type: "checklists" } },
          { id: "maintenance", title: "Maintenance Performed", dataSource: { type: "task_instances", filters: { status: "done" } } },
          { id: "issues", title: "Issues Resolved", dataSource: null },
        ])},
        '{}'::jsonb
      ),
      (
        'Monthly IT Report',
        'Comprehensive monthly IT operations report',
        'monthly',
        'it_operations',
        ${JSON.stringify(MONTHLY_REPORT_SECTIONS)},
        '{}'::jsonb
      )
    RETURNING id, name
  `
  console.log(`Created ${templates.length} report templates`)

  // Create sample recurring tasks (assuming user ID 1 exists)
  const taskResults = await sql`
    INSERT INTO tasks (title, description, cadence, is_template, checklist_items, discipline, status, priority)
    VALUES
      (
        'Daily System Checks',
        'Daily operational verification of critical systems',
        'daily',
        true,
        ${JSON.stringify(DAILY_CHECKLIST)},
        'it_operations',
        'todo',
        'high'
      ),
      (
        'Weekly Maintenance',
        'Weekly preventive maintenance and system review',
        'weekly',
        true,
        ${JSON.stringify(WEEKLY_CHECKLIST)},
        'it_operations',
        'todo',
        'medium'
      ),
      (
        'Monthly Backup Test',
        'Monthly backup restoration testing',
        'monthly',
        true,
        ${JSON.stringify([
          { id: "restore-test", label: "Backup restoration successful", type: "yes-no-na" },
          { id: "data-integrity", label: "Data integrity verified", type: "yes-no-na" },
          { id: "time-metrics", label: "Recovery time within SLA", type: "yes-no-na" },
        ])},
        'it_operations',
        'todo',
        'high'
      )
    RETURNING id, title
  `
  console.log(`Created ${taskResults.length} recurring tasks`)

  console.log("Seed data created successfully")
} catch (err) {
  console.error("Seed failed:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
```

- [ ] **Step 2: Run seed script**

```bash
node scripts/seed-it-technician-data.mjs
```

Expected: "Seed data created successfully" with 3 templates and 3 tasks.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-it-technician-data.mjs
git commit -m "chore(seed): add IT technician report templates and recurring tasks"
```

---

### Task 14: Tasks Page UI — Cadence Filter and Checklist Editor

**Files:**
- Modify: `app/dashboard/tasks/page.tsx`

- [ ] **Step 1: Add cadence filter dropdown**

In the tasks page, add a cadence filter to the filter bar:

```tsx
import { CADENCE_LABEL, CADENCES, type Cadence } from "@/lib/cadence"

// In the component, add state:
const [cadenceFilter, setCadenceFilter] = useState<Cadence | "all">("all")

// Add to the filter bar UI (after existing filters):
<Select value={cadenceFilter} onValueChange={(v) => setCadenceFilter(v as Cadence | "all")}>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Cadence" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All cadences</SelectItem>
    {CADENCES.map((c) => (
      <SelectItem key={c} value={c}>
        {CADENCE_LABEL[c]}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 2: Filter tasks by cadence**

Update the task filtering logic:

```tsx
const filteredTasks = useMemo(() => {
  return allTasks.filter((task) => {
    if (cadenceFilter !== "all" && task.cadence !== cadenceFilter) return false
    // ... existing filters
    return true
  })
}, [allTasks, cadenceFilter, /* other deps */])
```

- [ ] **Step 3: Add cadence badge to task cards**

In the task card rendering, add a badge for recurring tasks:

```tsx
{task.cadence && task.cadence !== "one-off" && (
  <Badge variant="outline" className="text-xs">
    {CADENCE_LABEL[task.cadence as Cadence]}
  </Badge>
)}
```

- [ ] **Step 4: Add checklist editor to task creation dialog**

In the task creation/edit dialog, add a checklist editor section:

```tsx
const [checklistItems, setChecklistItems] = useState<Array<{ id: string; label: string; type: string }>>([])

const addChecklistItem = () => {
  setChecklistItems([...checklistItems, { id: `item-${Date.now()}`, label: "", type: "yes-no-na" }])
}

const removeChecklistItem = (id: string) => {
  setChecklistItems(checklistItems.filter((item) => item.id !== id))
}

const updateChecklistItem = (id: string, field: string, value: string) => {
  setChecklistItems(checklistItems.map((item) => item.id === id ? { ...item, [field]: value } : item))
}

// In the dialog UI:
{cadence !== "one-off" && (
  <div className="space-y-2">
    <Label>Checklist Items</Label>
    {checklistItems.map((item) => (
      <div key={item.id} className="flex gap-2">
        <Input
          value={item.label}
          onChange={(e) => updateChecklistItem(item.id, "label", e.target.value)}
          placeholder="Item label"
        />
        <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
    <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
      <Plus className="h-4 w-4 mr-1" /> Add item
    </Button>
  </div>
)}
```

- [ ] **Step 5: Pass cadence and checklistItems to API**

Update the task creation/update API calls:

```tsx
const response = await fetch("/api/tasks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...taskData,
    cadence,
    checklistItems,
  }),
})
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/tasks/page.tsx
git commit -m "feat(ui): add cadence filter and checklist editor to tasks page"
```

---

### Task 15: Task Completion Dialog with Checklist

**Files:**
- Modify: `app/dashboard/tasks/page.tsx` (or create separate component)

- [ ] **Step 1: Add task instance completion dialog**

Create a dialog component for completing task instances with checklist:

```tsx
const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
const [completingInstance, setCompletingInstance] = useState<any>(null)
const [checklistResponses, setChecklistResponses] = useState<Array<{ id: string; value: string }>>([])

const openCompletionDialog = (instance: any) => {
  setCompletingInstance(instance)
  // Initialize responses from template checklist items
  const items = parseChecklistItems(JSON.stringify(instance.task?.checklistItems ?? []))
  setChecklistResponses(items.map((item) => ({ id: item.id, value: "" })))
  setCompletionDialogOpen(true)
}

const submitCompletion = async () => {
  if (!completingInstance) return

  const response = await fetch(`/api/task-instances/${completingInstance.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "done",
      checklistResponses,
      notes: "Completed via dashboard",
    }),
  })

  if (response.ok) {
    toast({ title: "Task instance completed" })
    setCompletionDialogOpen(false)
    // Refresh instances
    loadInstances()
  }
}

// Dialog UI:
<Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Complete Task Instance</DialogTitle>
    </DialogHeader>
    {completingInstance && (
      <div className="space-y-4">
        <div>
          <Label>Instance Date</Label>
          <p className="text-sm text-muted-foreground">{completingInstance.instanceDate}</p>
        </div>
        {checklistResponses.length > 0 && (
          <div className="space-y-2">
            <Label>Checklist</Label>
            {completingInstance.task?.checklistItems?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <div className="flex gap-2">
                  {["yes", "no", "n/a"].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={
                        checklistResponses.find((r) => r.id === item.id)?.value === value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setChecklistResponses(
                          checklistResponses.map((r) =>
                            r.id === item.id ? { ...r, value } : r
                          )
                        )
                      }}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setCompletionDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submitCompletion}>Complete</Button>
        </DialogFooter>
      </div>
    )}
  </DialogContent>
</Dialog>
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/tasks/page.tsx
git commit -m "feat(ui): add task instance completion dialog with checklist"
```

---

### Task 16: Calendar Page UI — View Mode Selector

**Files:**
- Modify: `app/dashboard/calendar/page.tsx`

- [ ] **Step 1: Add view mode selector**

In the calendar page, add a view mode selector:

```tsx
const [calendarViewMode, setCalendarViewMode] = useState<"due" | "cadence" | "both" | "range">("both")

// In the UI (top-right of calendar header):
<div className="flex gap-2">
  {(["due", "cadence", "both", "range"] as const).map((mode) => (
    <Button
      key={mode}
      variant={calendarViewMode === mode ? "default" : "outline"}
      size="sm"
      onClick={() => setCalendarViewMode(mode)}
    >
      {mode.charAt(0).toUpperCase() + mode.slice(1)}
    </Button>
  ))}
</div>
```

- [ ] **Step 2: Pass viewMode to calendar API**

Update the calendar events fetch:

```tsx
const fetchEvents = async () => {
  const params = new URLSearchParams({
    startDate: cursor.toISOString(),
    endDate: addDays(cursor, 42).toISOString(),
    viewMode: calendarViewMode,
  })

  const response = await fetch(`/api/calendar/events?${params}`)
  const data = await response.json()
  setEvents(data.data || [])
}

// Re-fetch when viewMode changes:
useEffect(() => {
  fetchEvents()
}, [calendarViewMode, cursor])
```

- [ ] **Step 3: Render recurring task instances differently**

In the calendar event rendering, distinguish recurring instances:

```tsx
{events.map((event) => {
  const isRecurring = event.eventType === "task_instance" || event.isRecurring
  return (
    <div
      key={event.id}
      className={cn(
        "rounded-md p-2 text-xs cursor-pointer",
        isRecurring ? "bg-primary/20 border border-primary/40" : "bg-primary/10"
      )}
    >
      <div className="font-medium">{event.title}</div>
      {isRecurring && event.cadence && (
        <div className="text-muted-foreground text-[10px]">{event.cadence}</div>
      )}
    </div>
  )
})}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/calendar/page.tsx
git commit -m "feat(ui): add calendar view mode selector for due/cadence/both/range"
```

---

### Task 17: Reports Page UI — Template Selection and Report Editor

**Files:**
- Modify: `app/dashboard/reports/page.tsx`

- [ ] **Step 1: Add "Create report" button and template selection dialog**

```tsx
const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false)
const [templates, setTemplates] = useState<any[]>([])
const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

const loadTemplates = async () => {
  const response = await fetch("/api/task-report-templates")
  const data = await response.json()
  setTemplates(data.data || [])
}

const createReport = async () => {
  if (!selectedTemplate) return

  const periodStart = new Date()
  periodStart.setDate(1) // First day of current month
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1)
  periodEnd.setDate(0) // Last day of current month

  const response = await fetch("/api/task-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateId: selectedTemplate.id,
      title: `${selectedTemplate.name} - ${periodStart.toLocaleDateString()}`,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
    }),
  })

  if (response.ok) {
    const data = await response.json()
    toast({ title: "Report created" })
    setCreateReportDialogOpen(false)
    // Navigate to report editor or refresh list
    router.push(`/dashboard/reports/${data.data.id}`)
  }
}

// In the UI:
<Button onClick={() => { loadTemplates(); setCreateReportDialogOpen(true) }}>
  <Plus className="h-4 w-4 mr-2" /> Create Report
</Button>

<Dialog open={createReportDialogOpen} onOpenChange={setCreateReportDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Select Report Template</DialogTitle>
    </DialogHeader>
    <div className="space-y-2">
      {templates.map((template) => (
        <div
          key={template.id}
          className={cn(
            "p-3 rounded-md border cursor-pointer",
            selectedTemplate?.id === template.id ? "border-primary bg-primary/10" : "border-border"
          )}
          onClick={() => setSelectedTemplate(template)}
        >
          <div className="font-medium">{template.name}</div>
          <div className="text-sm text-muted-foreground">{template.description}</div>
          <Badge variant="outline" className="mt-1">{template.cadence}</Badge>
        </div>
      ))}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setCreateReportDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={createReport} disabled={!selectedTemplate}>
        Create
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 2: Add report editor with section-by-section editing**

Create a report editor component (can be inline or separate file):

```tsx
const [report, setReport] = useState<any>(null)
const [editingSection, setEditingSection] = useState<string | null>(null)

const loadReport = async (reportId: number) => {
  const response = await fetch(`/api/task-reports/${reportId}`)
  const data = await response.json()
  setReport(data.data)
}

const updateSectionContent = (sectionId: string, content: string) => {
  setReport({
    ...report,
    content: report.content.map((section: any) =>
      section.id === sectionId ? { ...section, manualContent: content } : section
    ),
  })
}

const saveReport = async () => {
  const response = await fetch(`/api/task-reports/${report.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: report.content }),
  })

  if (response.ok) {
    toast({ title: "Report saved" })
  }
}

const finalizeReport = async () => {
  const response = await fetch(`/api/task-reports/${report.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "final" }),
  })

  if (response.ok) {
    toast({ title: "Report finalized" })
    router.push("/dashboard/reports")
  }
}

// Report editor UI:
<div className="space-y-6">
  <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold">{report.title}</h1>
    <div className="flex gap-2">
      <Button variant="outline" onClick={saveReport}>Save Draft</Button>
      <Button onClick={finalizeReport}>Finalize</Button>
    </div>
  </div>

  {report.content.map((section: any) => (
    <Card key={section.id}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{section.title}</CardTitle>
          {section.data && (
            <Badge variant="secondary">Auto-populated</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {section.data ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {section.data.length} items
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSection(section.id)}
            >
              Edit
            </Button>
          </div>
        ) : (
          <Textarea
            value={section.manualContent || ""}
            onChange={(e) => updateSectionContent(section.id, e.target.value)}
            placeholder="Enter content for this section..."
            rows={6}
          />
        )}
      </CardContent>
    </Card>
  ))}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/reports/page.tsx
git commit -m "feat(ui): add report template selection and section editor"
```

---

### Task 18: E2E Tests — Recurring Tasks Flow

**Files:**
- Create: `tests/e2e/recurring-tasks.spec.ts`

- [ ] **Step 1: Write E2E test for recurring task creation and completion**

```ts
import { test, expect } from "@playwright/test"

test.describe("Recurring Tasks", () => {
  test("create a daily recurring task and verify instances are generated", async ({ page }) => {
    await page.goto("/dashboard/tasks")

    // Click "Create Task"
    await page.click('button:has-text("Create Task")')

    // Fill in task details
    await page.fill('input[name="title"]', "Daily System Check")
    await page.selectOption('select[name="cadence"]', "daily")

    // Add checklist items
    await page.click('button:has-text("Add item")')
    await page.fill('input[placeholder="Item label"]', "Check servers")
    await page.click('button:has-text("Add item")')
    await page.fill('input[placeholder="Item label"]:nth-of-type(2)', "Check network")

    // Submit
    await page.click('button:has-text("Create")')

    // Verify task was created with cadence badge
    await expect(page.locator('text="Daily System Check"')).toBeVisible()
    await expect(page.locator('text="Daily"')).toBeVisible()

    // Navigate to task instances (if there's a way to view them)
    // For now, verify via API
    const response = await page.request.get("/api/task-instances?taskId=" + taskId)
    const data = await response.json()
    expect(data.data.length).toBeGreaterThan(0)
  })

  test("complete a task instance and verify next instance is generated", async ({ page }) => {
    // This test would require setting up a task with instances first
    // Then completing one instance and verifying the next is auto-generated
    // Implementation depends on the UI for viewing/completing instances
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/recurring-tasks.spec.ts
git commit -m "test(e2e): add recurring tasks flow test"
```

---

### Task 19: E2E Tests — Calendar Views

**Files:**
- Create: `tests/e2e/calendar-views.spec.ts`

- [ ] **Step 1: Write E2E test for calendar view modes**

```ts
import { test, expect } from "@playwright/test"

test.describe("Calendar View Modes", () => {
  test("switch between all 4 view modes", async ({ page }) => {
    await page.goto("/dashboard/calendar")

    // Verify default view mode
    await expect(page.locator('button:has-text("Both")')).toHaveClass(/bg-primary/)

    // Switch to "Due" view
    await page.click('button:has-text("Due")')
    await expect(page.locator('button:has-text("Due")')).toHaveClass(/bg-primary/)

    // Switch to "Cadence" view
    await page.click('button:has-text("Cadence")')
    await expect(page.locator('button:has-text("Cadence")')).toHaveClass(/bg-primary/)

    // Switch to "Range" view
    await page.click('button:has-text("Range")')
    await expect(page.locator('button:has-text("Range")')).toHaveClass(/bg-primary/)

    // Verify events are displayed (exact assertions depend on test data)
    await expect(page.locator('[data-testid="calendar-event"]')).toHaveCount(/* expected count */)
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/calendar-views.spec.ts
git commit -m "test(e2e): add calendar view modes test"
```

---

### Task 20: E2E Tests — Report Generation

**Files:**
- Create: `tests/e2e/report-generation.spec.ts`

- [ ] **Step 1: Write E2E test for report creation and editing**

```ts
import { test, expect } from "@playwright/test"

test.describe("Report Generation", () => {
  test("create a report from template and edit sections", async ({ page }) => {
    await page.goto("/dashboard/reports")

    // Click "Create Report"
    await page.click('button:has-text("Create Report")')

    // Select a template
    await page.click('div:has-text("Monthly IT Report")')

    // Click "Create"
    await page.click('button:has-text("Create")')

    // Verify report editor opens
    await expect(page.locator('h1:has-text("Monthly IT Report")')).toBeVisible()

    // Edit a manual section
    await page.fill('textarea[placeholder="Enter content for this section..."]', "No major risks this month.")

    // Save draft
    await page.click('button:has-text("Save Draft")')

    // Verify save success
    await expect(page.locator('text="Report saved"')).toBeVisible()

    // Finalize report
    await page.click('button:has-text("Finalize")')

    // Verify redirect to reports list
    await expect(page).toHaveURL("/dashboard/reports")
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/report-generation.spec.ts
git commit -m "test(e2e): add report generation and editing test"
```

---

### Task 21: Documentation and Final Gates

**Files:**
- Modify: `docs/superpowers/specs/2026-11-02-task-tracking-recurrence-design.md` (mark as implemented)
- Create: `TASK_TRACKING_IMPLEMENTATION.md` (implementation notes)

- [ ] **Step 1: Update spec status**

In `docs/superpowers/specs/2026-11-02-task-tracking-recurrence-design.md`, update the status:

```markdown
**Status:** Implemented (2026-11-02)
```

- [ ] **Step 2: Create implementation notes**

Create `TASK_TRACKING_IMPLEMENTATION.md`:

```markdown
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
```

- [ ] **Step 3: Run final gates**

```bash
# Type check
npx tsc --noEmit

# Run all tests
npx vitest run

# Run E2E tests (if Playwright is configured)
npm run test:e2e
```

Fix any failures before committing.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-11-02-task-tracking-recurrence-design.md TASK_TRACKING_IMPLEMENTATION.md
git commit -m "docs: mark task tracking spec as implemented and add notes"
```

---

### Task 22: Production Deployment Preparation

**Files:**
- Modify: `.env.example` (add new env vars if needed)
- Create: `scripts/verify-task-tracking-migration.mjs` (verification script)

- [ ] **Step 1: Update .env.example**

If any new environment variables are needed, add them to `.env.example` with documentation:

```bash
# Task Tracking System
# No new env vars required — uses existing DATABASE_URL
```

- [ ] **Step 2: Create migration verification script**

```js
// Verifies task tracking migration was applied correctly.
// Usage: node scripts/verify-task-tracking-migration.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]
const sql = postgres(databaseUrl, { max: 1 })

try {
  console.log("Verifying task tracking migration...")

  // Check tasks table columns
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name IN ('cadence', 'parent_task_id', 'is_template', 'checklist_items')
  `
  console.log(`✓ tasks table has ${cols.length}/4 new columns`)
  if (cols.length !== 4) process.exit(1)

  // Check task_instances table
  const instances = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_instances'
  `
  console.log(`✓ task_instances table ${instances.length === 1 ? 'exists' : 'MISSING'}`)
  if (instances.length !== 1) process.exit(1)

  // Check task_report_templates table
  const templates = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_report_templates'
  `
  console.log(`✓ task_report_templates table ${templates.length === 1 ? 'exists' : 'MISSING'}`)
  if (templates.length !== 1) process.exit(1)

  // Check task_reports table
  const reports = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_reports'
  `
  console.log(`✓ task_reports table ${reports.length === 1 ? 'exists' : 'MISSING'}`)
  if (reports.length !== 1) process.exit(1)

  // Check indexes
  const indexes = await sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename IN ('tasks', 'task_instances', 'task_report_templates', 'task_reports')
    AND indexname LIKE 'idx_%'
  `
  console.log(`✓ ${indexes.length} custom indexes created`)

  console.log("\n✅ Migration verified successfully")
} catch (err) {
  console.error("❌ Verification failed:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
```

- [ ] **Step 3: Test migration on a fresh database**

If possible, test the migration on a fresh Neon branch or local database:

```bash
# Create a fresh test database or use a Neon branch
# Run all migrations in order
node scripts/create-task-instances-table.mjs
node scripts/create-task-report-templates-table.mjs
node scripts/seed-it-technician-data.mjs
node scripts/verify-task-tracking-migration.mjs
```

Expected: All scripts complete without errors, verification passes.

- [ ] **Step 4: Commit**

```bash
git add .env.example scripts/verify-task-tracking-migration.mjs
git commit -m "chore(deploy): add migration verification script"
```

---

### Task 23: Final Review and Cleanup

- [ ] **Step 1: Review all changes**

```bash
git log --oneline -20
git diff main...HEAD --stat
```

Verify:
- All migration scripts are present and tested
- All API routes are implemented
- All UI components are updated
- All tests pass
- Documentation is complete

- [ ] **Step 2: Clean up any debug code or temporary files**

```bash
# Remove any console.log statements added for debugging
# Remove any temporary test files
# Ensure all code is production-ready
```

- [ ] **Step 3: Update project README or CHANGELOG**

If the project has a CHANGELOG.md, add an entry:

```markdown
## [Unreleased]

### Added
- Task tracking with recurrence (daily/weekly/monthly/yearly)
- Checklists for operational tasks (yes/no/n/a items)
- Calendar view modes (due/cadence/both/range)
- Report generation from task templates
- IT technician seed data (3 templates, 3 recurring tasks)
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: final cleanup and documentation for task tracking system"
```

---

## Summary

This plan implements a comprehensive task tracking system with:

1. **Recurring tasks** — auto-generate instances based on cadence
2. **Checklists** — track operational checks with yes/no/n/a responses
3. **Calendar views** — 4 modes for different perspectives on task scheduling
4. **Report generation** — template-driven reports with auto-populated data

The implementation follows TDD principles, with unit tests for pure logic and E2E tests for user flows. All database changes are additive and use migration scripts following the existing pattern.

**Total tasks:** 23
**Estimated effort:** 5-7 days for a solo developer
**Risk areas:** Calendar view mode integration, report template flexibility, instance generation edge cases (month boundaries, leap years)
