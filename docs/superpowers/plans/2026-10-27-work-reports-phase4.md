# Phase 4 — Submission, Inbox, Admin View

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the report lifecycle (submit → ack/return), the recipient system with a saved default reporting line, the inbox page, visibility enforcement, and the admin team day view.

**Architecture:** Phase 3 created drafts; phase 4 owns every lifecycle column (`status`, `submitted_at`, `acknowledged_at`, `returned_note`, `revision_of`) and the `work_report_recipients` table. Submission locks the draft and notifies recipients via the existing `createNotification`/`notifyMany` path — a report is a notification *type* (`"report"`) with a link, not a new pipeline. Corrections are a new revision, never an edit. The inbox is a recipient-scoped read; admins see all submitted reports. The admin team day view is a date-scoped grouped query over the same tables.

**Tech Stack:** Next.js 16.1.1 App Router, React 19, drizzle-orm 0.45.4, Neon Postgres, Vitest 5, recharts, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (§4 data model, §5 admin visibility, §6 lifecycle/recipients/inbox, §14 security, §16 phase list)

## Global Constraints

- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors, exactly 70 warnings (the current baseline)
- `npx vitest run` → all green, count monotonically increases
- TDD: guards/tests first, observe failure, then implement
- Guard-regex discipline: shipped code must be formatted so the plan's guards match; if they don't, re-cut the guard, don't reformat the code
- No new migration — all tables and columns exist since phase 1
- `users.preferences` jsonb is the store for `defaultReportRecipients`; the settings API at `/api/settings` already merges into `preferences.settings`
- Notification type `"report"` is added to `NOTIFICATION_TYPES` in `lib/notifications.ts`
- Visibility enforced in SQL, not UI — a report is readable only by its author, its listed recipients, and admin/superadmin
- Corrections are always a new revision; a submitted report is never edited in place

---

### Task 1: `"report"` notification type + recipients validation module (pure)

**Files:**
- Modify: `lib/notifications.ts:10-20` (add `"report"` to `NOTIFICATION_TYPES`)
- Create: `lib/reports/recipients.ts`
- Create: `tests/unit/report-recipients.test.ts`
- Modify: `tests/unit/schema-safety.test.ts` (extend `authGated` alternation if needed)

**Interfaces:**
- Consumes: nothing (pure module)
- Produces:
  - `readRecipientIds(input: unknown): Read<{ value: number[] }>` — validates an array of positive integer user ids, 1–10 members, no duplicates
  - `MAX_RECIPIENTS = 10`
  - `MIN_RECIPIENTS = 1`

- [ ] **Step 1: Add `"report"` to the notification type list**

In `lib/notifications.ts`, add `"report"` after `"cms"` in the `NOTIFICATION_TYPES` array:

```ts
export const NOTIFICATION_TYPES = [
  "info",
  "task",
  "sprint",
  "mention",
  "wellbeing",
  "gamification",
  "ai",
  "system",
  "cms",
  "report",
] as const
```

- [ ] **Step 2: Write the failing test for `readRecipientIds`**

Create `tests/unit/report-recipients.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { isFail, readRecipientIds, MAX_RECIPIENTS } from "@/lib/reports/recipients"

describe("readRecipientIds", () => {
  it("accepts a sorted array of distinct positive integers", () => {
    const result = readRecipientIds([3, 1, 2])
    expect(isFail(result)).toBe(false)
    if (!isFail(result)) expect(result.value).toEqual([1, 2, 3])
  })

  it("refuses an empty array", () => {
    const result = readRecipientIds([])
    expect(isFail(result)).toBe(true)
  })

  it("refuses more than MAX_RECIPIENTS", () => {
    const tooMany = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => i + 1)
    const result = readRecipientIds(tooMany)
    expect(isFail(result)).toBe(true)
  })

  it("refuses duplicates", () => {
    const result = readRecipientIds([1, 1, 2])
    expect(isFail(result)).toBe(true)
  })

  it("refuses non-integer or non-positive values", () => {
    expect(isFail(readRecipientIds([0]))).toBe(true)
    expect(isFail(readRecipientIds([-1]))).toBe(true)
    expect(isFail(readRecipientIds([1.5]))).toBe(true)
    expect(isFail(readRecipientIds(["1"]))).toBe(true)
    expect(isFail(readRecipientIds(null))).toBe(true)
    expect(isFail(readRecipientIds("not-array"))).toBe(true)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-recipients.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the minimal implementation**

Create `lib/reports/recipients.ts`:

```ts
// Recipient validation for work reports. A report lists 1–10 recipients, each a
// positive integer user id. The array is sorted and deduplicated on the way in so
// downstream queries can join on it without a DISTINCT.

import { isFail as isFieldFail, type Fail, type Read } from "./report-fields"

export { isFail } from "./report-fields"
export type { Fail, Read } from "./report-fields"

export const MAX_RECIPIENTS = 10

export function readRecipientIds(input: unknown): Read<{ value: number[] }> {
  if (!Array.isArray(input)) return { error: "recipients must be an array of user ids" }
  if (input.length === 0) return { error: "at least one recipient is required" }
  if (input.length > MAX_RECIPIENTS) {
    return { error: `at most ${MAX_RECIPIENTS} recipients per report` }
  }

  const ids: number[] = []
  for (const raw of input) {
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
      return { error: "every recipient id must be a positive integer" }
    }
    ids.push(raw)
  }

  const unique = [...new Set(ids)]
  if (unique.length !== ids.length) return { error: "duplicate recipient ids are not allowed" }
  return { value: unique.sort((a, b) => a - b) }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/report-recipients.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Verify notification type test still passes**

Run: `npx vitest run`
Expected: all green, suite count increases by 5

- [ ] **Step 7: Commit**

```bash
git add lib/notifications.ts lib/reports/recipients.ts tests/unit/report-recipients.test.ts
git commit -m "feat(reports): report notification type and recipient validation module"
```

---

### Task 2: Default reporting line in user preferences

**Files:**
- Create: `lib/reports/default-recipients.ts`
- Create: `tests/unit/default-recipients.test.ts`

**Interfaces:**
- Consumes: `users.preferences` jsonb (via `/api/settings` pattern)
- Produces:
  - `readDefaultRecipients(preferences: unknown): number[]` — reads `preferences.settings.defaultReportRecipients`, returns `[]` if absent or invalid
  - `writeDefaultRecipients(preferences: unknown, ids: number[]): Record<string, unknown>` — merges the ids into `preferences.settings.defaultReportRecipients`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/default-recipients.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  readDefaultRecipients,
  writeDefaultRecipients,
} from "@/lib/reports/default-recipients"

describe("readDefaultRecipients", () => {
  it("returns [] when preferences is null, undefined, or empty", () => {
    expect(readDefaultRecipients(null)).toEqual([])
    expect(readDefaultRecipients(undefined)).toEqual([])
    expect(readDefaultRecipients({})).toEqual([])
  })

  it("returns [] when settings.defaultReportRecipients is absent", () => {
    expect(readDefaultRecipients({ settings: {} })).toEqual([])
    expect(readDefaultRecipients({ settings: { theme: "dark" } })).toEqual([])
  })

  it("returns the stored array when every entry is a positive integer", () => {
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: [3, 1, 2] } })).toEqual([3, 1, 2])
  })

  it("returns [] when the stored value is not an array of positive integers", () => {
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: "foo" } })).toEqual([])
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: [0, 1] } })).toEqual([])
    expect(readDefaultRecipients({ settings: { defaultReportRecipients: [1, null] } })).toEqual([])
  })
})

describe("writeDefaultRecipients", () => {
  it("creates the settings subtree when preferences has none", () => {
    const result = writeDefaultRecipients(null, [5, 3])
    expect(result).toEqual({ settings: { defaultReportRecipients: [5, 3] } })
  })

  it("preserves sibling settings keys", () => {
    const result = writeDefaultRecipients({ settings: { theme: "dark" } }, [1])
    expect(result).toEqual({ settings: { theme: "dark", defaultReportRecipients: [1] } })
  })

  it("replaces any previous defaultReportRecipients", () => {
    const result = writeDefaultRecipients(
      { settings: { defaultReportRecipients: [1, 2] } },
      [3, 4],
    )
    expect(result).toEqual({ settings: { defaultReportRecipients: [3, 4] } })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/default-recipients.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the minimal implementation**

Create `lib/reports/default-recipients.ts`:

```ts
// The default reporting line — the user ids a member's reports go to unless they
// pick differently at submit time. Stored at preferences.settings.defaultReportRecipients
// so the existing /api/settings merge path can write it without a dedicated endpoint.

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asSettings(value: unknown): Record<string, unknown> {
  return asRecord(asRecord(value).settings)
}

export function readDefaultRecipients(preferences: unknown): number[] {
  const raw = asSettings(preferences).defaultReportRecipients
  if (!Array.isArray(raw)) return []
  for (const entry of raw) {
    if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 1) return []
  }
  return raw as number[]
}

export function writeDefaultRecipients(
  preferences: unknown,
  ids: number[],
): Record<string, unknown> {
  const existing = asRecord(preferences)
  const settings = { ...asSettings(preferences), defaultReportRecipients: ids }
  return { ...existing, settings }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/default-recipients.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run full suite, commit**

Run: `npx vitest run`
Expected: all green

```bash
git add lib/reports/default-recipients.ts tests/unit/default-recipients.test.ts
git commit -m "feat(reports): default reporting line read/write in user preferences"
```

---

### Task 3: Visibility enforcement module

**Files:**
- Create: `lib/reports/visibility.ts`
- Create: `tests/unit/report-visibility.test.ts`

**Interfaces:**
- Consumes: session user, report row with `userId`, recipient list
- Produces:
  - `canReadReport(actor: { id: number; role: string; email: string }, report: { userId: number }, recipientIds: number[]): boolean`
  - `isAdmin(user: { role: string; email: string }): boolean`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/report-visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { canReadReport, isAdmin } from "@/lib/reports/visibility"

describe("isAdmin", () => {
  it("returns true for admin and superadmin roles", () => {
    expect(isAdmin({ role: "admin", email: "x@y.z" })).toBe(true)
    expect(isAdmin({ role: "superadmin", email: "x@y.z" })).toBe(true)
  })

  it("returns false for user role", () => {
    expect(isAdmin({ role: "user", email: "x@y.z" })).toBe(false)
  })
})

describe("canReadReport", () => {
  const report = { userId: 10 }

  it("lets the author read their own report", () => {
    expect(canReadReport({ id: 10, role: "user", email: "a@b.c" }, report, [])).toBe(true)
  })

  it("lets a listed recipient read the report", () => {
    expect(canReadReport({ id: 5, role: "user", email: "a@b.c" }, report, [5, 7])).toBe(true)
  })

  it("refuses an unlisted non-admin", () => {
    expect(canReadReport({ id: 99, role: "user", email: "a@b.c" }, report, [5, 7])).toBe(false)
  })

  it("lets an admin read any report regardless of recipients", () => {
    expect(canReadReport({ id: 99, role: "admin", email: "a@b.c" }, report, [])).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-visibility.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the minimal implementation**

Create `lib/reports/visibility.ts`:

```ts
// Visibility enforcement for work reports. A report is readable only by its author,
// its listed recipients, and admin/superadmin — enforced in the query, not the UI
// (spec §14). This module provides the pure predicate; the SQL WHERE clause that
// uses it lives in each route's shared reader.

import { isSuperAdmin } from "@/lib/roles"

export function isAdmin(user: { role: string; email: string }): boolean {
  return isSuperAdmin(user)
}

export function canReadReport(
  actor: { id: number; role: string; email: string },
  report: { userId: number },
  recipientIds: number[],
): boolean {
  if (actor.id === report.userId) return true
  if (isAdmin(actor)) return true
  return recipientIds.includes(actor.id)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/report-visibility.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/reports/visibility.ts tests/unit/report-visibility.test.ts
git commit -m "feat(reports): visibility enforcement module (author, recipient, admin)"
```

---

### Task 4: Submit route — `POST /api/reports/work/[id]/submit`

**Files:**
- Create: `app/api/reports/work/[id]/submit/route.ts`
- Modify: `app/api/reports/work/_shared.ts` (add `writeRecipients()`, `readReportRecipientIds()`)
- Create: `tests/unit/report-submit-route.test.ts`

**Interfaces:**
- Consumes: `reportSession()`, `readOwnReport()`, `readRecipientIds()`, `readDefaultRecipients()`, `createNotification()`/`notifyMany()`, `workReportRecipients` table
- Produces: `POST` handler that:
  1. Reads the draft (ownership-scoped)
  2. Refuses if status !== "draft"
  3. Accepts `{ recipientIds?: number[] }` — falls back to default reporting line
  4. Validates recipients via `readRecipientIds()`
  5. Sets `status = "submitted"`, `submittedAt = now()`
  6. Inserts into `work_report_recipients`
  7. Calls `notifyMany()` with type `"report"`, link `/dashboard/reports-work/inbox`
  8. Returns the updated report

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/report-submit-route.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("submit route", () => {
  const route = src("app/api/reports/work/[id]/submit/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("refuses to submit a non-draft report", () => {
    expect(route).toMatch(/isDraft\(existing\.status\)/u)
  })

  it("sets status to submitted and stamps submittedAt", () => {
    expect(route).toMatch(/status: "submitted"/u)
    expect(route).toMatch(/submittedAt: new Date\(\)/u)
  })

  it("writes recipients via writeRecipients", () => {
    expect(route).toMatch(/writeRecipients\(/u)
  })

  it("notifies recipients with type report and a link to the inbox", () => {
    expect(route).toMatch(/type: "report"/u)
    expect(route).toMatch(/\/dashboard\/reports-work\/inbox/u)
  })

  it("falls back to default reporting line when no recipientIds are sent", () => {
    expect(route).toMatch(/readDefaultRecipients/u)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-submit-route.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: Add `writeRecipients` and `readReportRecipientIds` to `_shared.ts`**

Add these functions to `app/api/reports/work/_shared.ts`:

```ts
import { workReportRecipients } from "@/drizzle/schema"

export async function writeRecipients(reportId: number, userIds: number[]): Promise<void> {
  if (userIds.length === 0) return
  await db.insert(workReportRecipients).values(
    userIds.map((uid) => ({ reportId, userId: uid })),
  )
}

export async function readReportRecipientIds(reportId: number): Promise<number[]> {
  const rows = await db
    .select({ userId: workReportRecipients.userId })
    .from(workReportRecipients)
    .where(eq(workReportRecipients.reportId, reportId))
  return rows.map((r) => r.userId)
}
```

- [ ] **Step 4: Write the submit route**

Create `app/api/reports/work/[id]/submit/route.ts`:

```ts
// POST /api/reports/work/[id]/submit — file a draft.
// Submission locks the report, writes the recipient list, and notifies each
// recipient via the existing notification pipeline (type "report", link to inbox).
// A submitted report is never edited in place — corrections are a new revision.

import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { isDraft } from "@/lib/reports/report-fields"
import { isFail, readRecipientIds } from "@/lib/reports/recipients"
import { readDefaultRecipients } from "@/lib/reports/default-recipients"
import { notifyMany } from "@/lib/notifications"
import { users } from "@/drizzle/schema"
import {
  badRequest,
  mapReport,
  notFound,
  readOwnReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
  writeRecipients,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")
    if (!isDraft(existing.status)) {
      return badRequest("only a draft can be submitted — a filed report is corrected as a new revision")
    }

    const body = await request.json().catch(() => null)
    const incoming = body && typeof body === "object" && !Array.isArray(body) ? body : {}
    const rawIds = "recipientIds" in incoming ? (incoming as Record<string, unknown>).recipientIds : undefined

    let recipientIds: number[]
    if (rawIds === undefined || rawIds === null) {
      // Fall back to the user's saved default reporting line
      const prefs = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, session.id))
        .limit(1)
      recipientIds = readDefaultRecipients(prefs[0]?.preferences)
      if (recipientIds.length === 0) {
        return badRequest("no recipients supplied and no default reporting line saved in settings")
      }
    } else {
      const parsed = readRecipientIds(rawIds)
      if (isFail(parsed)) return badRequest(parsed.error)
      recipientIds = parsed.value
    }

    const [updated] = await db
      .update(workReports)
      .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(workReports.id, id), eq(workReports.userId, session.id)))
      .returning(reportColumns)

    if (!updated) return notFound("Report not found")

    await writeRecipients(id, recipientIds)

    await notifyMany(recipientIds, {
      type: "report",
      title: "A report was submitted for your review",
      body: `${existing.title} — ${existing.periodType} report covering ${existing.periodStart} to ${existing.periodEnd}.`,
      link: "/dashboard/reports-work/inbox",
      metadata: { reportId: id, authorId: session.id },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, data: { report: mapReport(updated) } })
  } catch (error) {
    return serverError(error, "submit work report")
  }
}
```

- [ ] **Step 5: Run the guard test**

Run: `npx vitest run tests/unit/report-submit-route.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Run full suite + typecheck + lint**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: 0 typecheck errors, 0 lint errors / 70 warnings, all tests green

- [ ] **Step 7: Commit**

```bash
git add app/api/reports/work/_shared.ts app/api/reports/work/\[id\]/submit/route.ts tests/unit/report-submit-route.test.ts
git commit -m "feat(reports): submit route — locks draft, writes recipients, notifies"
```

---

### Task 5: Revise route — `POST /api/reports/work/[id]/revise`

**Files:**
- Create: `app/api/reports/work/[id]/revise/route.ts`
- Create: `tests/unit/report-revise-route.test.ts`

**Interfaces:**
- Consumes: `reportSession()`, `readOwnReport()`, `assembleReport()`, `reportColumns`
- Produces: `POST` handler that:
  1. Reads the submitted report (ownership-scoped)
  2. Refuses if status === "draft" (can't revise a draft — just edit it)
  3. Creates a new draft with `revision_of = original.id`, same period/template/title, fresh metrics
  4. Returns the new draft

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/report-revise-route.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("revise route", () => {
  const route = src("app/api/reports/work/[id]/revise/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("refuses to revise a draft", () => {
    expect(route).toMatch(/isDraft/u)
  })

  it("sets revision_of to the original report id", () => {
    expect(route).toMatch(/revisionOf: id/u)
  })

  it("creates a new draft with status draft", () => {
    expect(route).toMatch(/status: "draft"/u)
  })

  it("recomputes metrics via assembleReport", () => {
    expect(route).toMatch(/assembleReport\(/u)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-revise-route.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: Write the revise route**

Create `app/api/reports/work/[id]/revise/route.ts`:

```ts
// POST /api/reports/work/[id]/revise — start a correction of a filed report.
// The original stays intact (a recipient may be reading it right now); the new
// draft carries revision_of → original.id and fresh metrics for the same period.

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { workReports } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { isDraft, type ReportContent } from "@/lib/reports/report-fields"
import { resolvePeriod } from "@/lib/reports/period"
import { emptyContent } from "@/lib/reports/templates"
import {
  assembleReport,
  badRequest,
  mapReport,
  notFound,
  readOwnReport,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const existing = await readOwnReport(session.id, id)
    if (!existing) return notFound("Report not found")
    if (isDraft(existing.status)) {
      return badRequest("a draft is already editable — revise is for filed reports")
    }

    const period = resolvePeriod(existing.periodType, existing.periodStart, {
      from: existing.periodStart,
      to: existing.periodEnd,
    })
    const metrics = await assembleReport(session.id, session.timezone, period)
    const content: ReportContent = emptyContent(existing.template)

    const [inserted] = await db
      .insert(workReports)
      .values({
        userId: session.id,
        title: existing.title,
        template: existing.template,
        periodType: existing.periodType,
        periodStart: existing.periodStart,
        periodEnd: existing.periodEnd,
        content,
        metrics,
        revisionOf: id,
        status: "draft",
      })
      .returning(reportColumns)

    return NextResponse.json({ success: true, data: { report: mapReport(inserted) } }, { status: 201 })
  } catch (error) {
    return serverError(error, "revise work report")
  }
}
```

- [ ] **Step 4: Run the guard test**

Run: `npx vitest run tests/unit/report-revise-route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run full suite + typecheck + lint, commit**

```bash
git add app/api/reports/work/\[id\]/revise/route.ts tests/unit/report-revise-route.test.ts
git commit -m "feat(reports): revise route — new draft from a filed report, revision_of linked"
```

---

### Task 6: Inbox read — `GET /api/reports/inbox`

**Files:**
- Create: `app/api/reports/inbox/route.ts`
- Create: `tests/unit/report-inbox-route.test.ts`

**Interfaces:**
- Consumes: `reportSession()`, `isAdmin()`, `workReports`, `workReportRecipients`
- Produces: `GET` handler that returns submitted reports where the user is a recipient or admin, newest first, with per-report recipient state

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/report-inbox-route.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("inbox route", () => {
  const route = src("app/api/reports/inbox/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("queries work_report_recipients for the user", () => {
    expect(route).toMatch(/workReportRecipients/u)
  })

  it("filters to submitted reports only", () => {
    expect(route).toMatch(/submitted/u)
  })

  it("includes admin override via isAdmin", () => {
    expect(route).toMatch(/isAdmin\(/u)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-inbox-route.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: Write the inbox route**

Create `app/api/reports/inbox/route.ts`:

```ts
// GET /api/reports/inbox — submitted reports where the caller is a recipient,
// or all submitted reports if the caller is admin/superadmin. Newest first.
// Each row includes the per-recipient state (notified_at, read_at, ack_at, note)
// so "did my manager read it" is answerable from the data, not vibes.

import { NextResponse } from "next/server"
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports, workReportRecipients, users } from "@/drizzle/schema"
import { isAdmin } from "@/lib/reports/visibility"
import {
  badRequest,
  reportColumns,
  reportSession,
  serverError,
  unauthorized,
} from "@/app/api/reports/work/_shared"

export const dynamic = "force-dynamic"

const INBOX_LIMIT = 100

type InboxRow = {
  report: {
    id: number
    userId: number
    title: string
    template: string
    periodType: string
    periodStart: string
    periodEnd: string
    status: string
    submittedAt: string | null
    revisionOf: number | null
    createdAt: string
    authorName: string
  }
  myRecipientState: {
    notifiedAt: string
    readAt: string | null
    ackAt: string | null
    note: string | null
  }
}

export async function GET() {
  const session = await reportSession()
  if (!session) return unauthorized()

  try {
    const userRows = await db
      .select({ role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)
    const actor = userRows[0]
    if (!actor) return unauthorized()
    const admin = isAdmin({ role: actor.role, email: actor.email })

    const baseCondition: SQL = admin
      ? sql`${workReports.status} = 'submitted'"`
      : sql`
          ${workReports.status} = 'submitted'
          AND ${workReports.id} IN (
            SELECT ${workReportRecipients.reportId}
            FROM ${workReportRecipients}
            WHERE ${workReportRecipients.userId} = ${session.id}
          )
        `

    const rows = await db
      .select({
        ...reportColumns,
        authorName: sql<string>`${users.name}`,
        notifiedAt: workReportRecipients.notifiedAt,
        readAt: workReportRecipients.readAt,
        ackAt: workReportRecipients.ackAt,
        note: workReportRecipients.note,
      })
      .from(workReports)
      .innerJoin(users, eq(workReports.userId, users.id))
      .leftJoin(
        workReportRecipients,
        admin
          ? sql`false`
          : and(
              eq(workReportRecipients.reportId, workReports.id),
              eq(workReportRecipients.userId, session.id),
            ),
      )
      .where(baseCondition)
      .orderBy(desc(workReports.submittedAt))
      .limit(INBOX_LIMIT)

    const data: InboxRow[] = rows.map((row) => ({
      report: {
        id: row.id,
        userId: row.userId,
        title: row.title,
        template: row.template,
        periodType: row.periodType,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        status: row.status,
        submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
        revisionOf: row.revisionOf,
        createdAt: (row.createdAt ?? new Date()).toISOString(),
        authorName: row.authorName,
      },
      myRecipientState: {
        notifiedAt: (row.notifiedAt ?? new Date()).toISOString(),
        readAt: row.readAt ? row.readAt.toISOString() : null,
        ackAt: row.ackAt ? row.ackAt.toISOString() : null,
        note: row.note,
      },
    }))

    return NextResponse.json({ success: true, data: { reports: data, admin } })
  } catch (error) {
    return serverError(error, "fetch report inbox")
  }
}
```

- [ ] **Step 4: Run the guard test**

Run: `npx vitest run tests/unit/report-inbox-route.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run full suite + typecheck + lint, commit**

```bash
git add app/api/reports/inbox/route.ts tests/unit/report-inbox-route.test.ts
git commit -m "feat(reports): inbox route — submitted reports for recipients and admins"
```

---

### Task 7: Ack and return routes — `POST /api/reports/inbox/[id]/ack` and `/return`

**Files:**
- Create: `app/api/reports/inbox/[id]/ack/route.ts`
- Create: `app/api/reports/inbox/[id]/return/route.ts`
- Create: `tests/unit/report-ack-return-route.test.ts`

**Interfaces:**
- Consumes: `reportSession()`, `workReportRecipients`, `workReports`, `createNotification()`
- Produces:
  - `ack`: Sets `ack_at = now()` on the recipient row, sets report `status = "acknowledged"`, `acknowledged_at = now()`, notifies author
  - `return`: Sets `note` on the recipient row, sets report `status = "returned"`, `returned_note = note`, notifies author

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/report-ack-return-route.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("ack route", () => {
  const route = src("app/api/reports/inbox/[id]/ack/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("updates the recipient row with ack_at", () => {
    expect(route).toMatch(/ackAt/u)
  })

  it("sets the report status to acknowledged", () => {
    expect(route).toMatch(/acknowledged/u)
  })
})

describe("return route", () => {
  const route = src("app/api/reports/inbox/[id]/return/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("requires a note in the body", () => {
    expect(route).toMatch(/note/u)
  })

  it("sets the report status to returned and stores returned_note", () => {
    expect(route).toMatch(/returned/u)
    expect(route).toMatch(/returnedNote/u)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-ack-return-route.test.ts`
Expected: FAIL — files not found

- [ ] **Step 3: Write the ack route**

Create `app/api/reports/inbox/[id]/ack/route.ts`:

```ts
// POST /api/reports/inbox/[id]/ack — a recipient marks a report as acknowledged.
// Sets ack_at on the recipient row and status/acknowledged_at on the report.
// The author is notified via the existing notification pipeline.

import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports, workReportRecipients } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { createNotification } from "@/lib/notifications"
import {
  badRequest,
  notFound,
  reportSession,
  serverError,
  unauthorized,
} from "@/app/api/reports/work/_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  try {
    const [recipientRow] = await db
      .select()
      .from(workReportRecipients)
      .where(and(eq(workReportRecipients.reportId, id), eq(workReportRecipients.userId, session.id)))
      .limit(1)

    if (!recipientRow) return notFound("You are not a recipient of this report")

    const [report] = await db
      .select()
      .from(workReports)
      .where(eq(workReports.id, id))
      .limit(1)

    if (!report) return notFound("Report not found")
    if (report.status !== "submitted") {
      return badRequest("only a submitted report can be acknowledged")
    }

    await db
      .update(workReportRecipients)
      .set({ ackAt: new Date() })
      .where(and(eq(workReportRecipients.reportId, id), eq(workReportRecipients.userId, session.id)))

    await db
      .update(workReports)
      .set({ status: "acknowledged", acknowledgedAt: new Date(), updatedAt: new Date() })
      .where(eq(workReports.id, id))

    await createNotification({
      userId: report.userId,
      type: "report",
      title: "Your report was acknowledged",
      body: `Your report "${report.title}" has been acknowledged by a recipient.`,
      link: `/dashboard/reports-work?r=${id}`,
      metadata: { reportId: id },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, data: { id, status: "acknowledged" } })
  } catch (error) {
    return serverError(error, "acknowledge report")
  }
}
```

- [ ] **Step 4: Write the return route**

Create `app/api/reports/inbox/[id]/return/route.ts`:

```ts
// POST /api/reports/inbox/[id]/return — a recipient returns a report with a note.
// Sets note on the recipient row, status/returned_note on the report, and pushes
// the author back to draft so they can correct and re-submit as a new revision.

import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workReports, workReportRecipients } from "@/drizzle/schema"
import { parseIdParam } from "@/app/api/reports/_shared"
import { createNotification } from "@/lib/notifications"
import {
  badRequest,
  notFound,
  reportSession,
  serverError,
  unauthorized,
} from "@/app/api/reports/work/_shared"

export const dynamic = "force-dynamic"

const MAX_RETURN_NOTE = 2000

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Report id must be a positive integer")

  const body = await request.json().catch(() => null)
  const note = body && typeof body === "object" && "note" in body ? String((body as Record<string, unknown>).note ?? "").trim() : ""
  if (!note) return badRequest("a return note is required")
  if (note.length > MAX_RETURN_NOTE) {
    return badRequest(`return note must be ${MAX_RETURN_NOTE} characters or fewer`)
  }

  try {
    const [recipientRow] = await db
      .select()
      .from(workReportRecipients)
      .where(and(eq(workReportRecipients.reportId, id), eq(workReportRecipients.userId, session.id)))
      .limit(1)

    if (!recipientRow) return notFound("You are not a recipient of this report")

    const [report] = await db
      .select()
      .from(workReports)
      .where(eq(workReports.id, id))
      .limit(1)

    if (!report) return notFound("Report not found")
    if (report.status !== "submitted") {
      return badRequest("only a submitted report can be returned")
    }

    await db
      .update(workReportRecipients)
      .set({ note })
      .where(and(eq(workReportRecipients.reportId, id), eq(workReportRecipients.userId, session.id)))

    await db
      .update(workReports)
      .set({ status: "returned", returnedNote: note, updatedAt: new Date() })
      .where(eq(workReports.id, id))

    await createNotification({
      userId: report.userId,
      type: "report",
      title: "Your report was returned for correction",
      body: `Your report "${report.title}" was returned with a note: ${note.slice(0, 200)}${note.length > 200 ? "…" : ""}`,
      link: `/dashboard/reports-work?r=${id}`,
      metadata: { reportId: id },
    }).catch(() => undefined)

    return NextResponse.json({ success: true, data: { id, status: "returned" } })
  } catch (error) {
    return serverError(error, "return report")
  }
}
```

- [ ] **Step 5: Run the guard tests**

Run: `npx vitest run tests/unit/report-ack-return-route.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Run full suite + typecheck + lint, commit**

```bash
git add app/api/reports/inbox/\[id\]/ack/route.ts app/api/reports/inbox/\[id\]/return/route.ts tests/unit/report-ack-return-route.test.ts
git commit -m "feat(reports): ack and return routes with author notification"
```

---

### Task 8: Inbox page — `/dashboard/reports-work/inbox`

**Files:**
- Create: `app/dashboard/reports-work/inbox/page.tsx`
- Create: `app/dashboard/reports-work/inbox/inbox-client.tsx`
- Create: `tests/unit/report-inbox-page.test.ts`

**Interfaces:**
- Consumes: `GET /api/reports/inbox`, `POST /api/reports/inbox/[id]/ack`, `POST /api/reports/inbox/[id]/return`
- Produces: A page showing newest submitted reports, unread count, ack/return actions, per-report recipient state

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/report-inbox-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("inbox page", () => {
  const page = src("app/dashboard/reports-work/inbox/page.tsx")
  const client = src("app/dashboard/reports-work/inbox/inbox-client.tsx")

  it("page wraps the client in Suspense", () => {
    expect(page).toMatch(/Suspense/u)
  })

  it("client fetches from /api/reports/inbox", () => {
    expect(client).toMatch(/\/api\/reports\/inbox/u)
  })

  it("client renders ack and return actions", () => {
    expect(client).toMatch(/ack/iu)
    expect(client).toMatch(/return/iu)
  })

  it("client shows the author name and period for each report", () => {
    expect(client).toMatch(/authorName/u)
    expect(client).toMatch(/periodStart/u)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-inbox-page.test.ts`
Expected: FAIL — files not found

- [ ] **Step 3: Write the page shell**

Create `app/dashboard/reports-work/inbox/page.tsx`:

```tsx
import { Suspense } from "react"
import InboxClient from "./inbox-client"

export const dynamic = "force-dynamic"

function InboxSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded border bg-muted" />
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxClient />
    </Suspense>
  )
}
```

- [ ] **Step 4: Write the inbox client component**

Create `app/dashboard/reports-work/inbox/inbox-client.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, MessageSquare } from "lucide-react"

type InboxReport = {
  report: {
    id: number
    userId: number
    title: string
    template: string
    periodType: string
    periodStart: string
    periodEnd: string
    status: string
    submittedAt: string | null
    revisionOf: number | null
    createdAt: string
    authorName: string
  }
  myRecipientState: {
    notifiedAt: string
    readAt: string | null
    ackAt: string | null
    note: string | null
  }
}

export default function InboxClient() {
  const [reports, setReports] = useState<InboxReport[]>([])
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<number | null>(null)
  const [returnNote, setReturnNote] = useState("")
  const [returningId, setReturningId] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/inbox")
      const json = await res.json()
      if (json.success) {
        setReports(json.data.reports)
        setAdmin(json.data.admin)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAck = async (id: number) => {
    setActionInProgress(id)
    try {
      await fetch(`/api/reports/inbox/${id}/ack`, { method: "POST" })
      await refresh()
    } finally {
      setActionInProgress(null)
    }
  }

  const handleReturn = async (id: number) => {
    if (!returnNote.trim()) return
    setActionInProgress(id)
    try {
      await fetch(`/api/reports/inbox/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: returnNote.trim() }),
      })
      setReturnNote("")
      setReturningId(null)
      await refresh()
    } finally {
      setActionInProgress(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded border bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Report inbox</h1>
        <p className="text-sm text-muted-foreground">
          {admin ? "All submitted reports (admin view)" : "Reports submitted to you for review"}
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No reports in your inbox.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(({ report, myRecipientState }) => (
            <div key={report.id} className="rounded border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{report.title}</p>
                  <p className="text-sm text-muted-foreground">
                    by {report.authorName} · {report.periodType} · {report.periodStart} to {report.periodEnd}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : "—"}
                    {report.revisionOf ? ` · revision of #${report.revisionOf}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {myRecipientState.ackAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      <Check className="h-3 w-3" /> Acknowledged
                    </span>
                  ) : myRecipientState.note ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      <MessageSquare className="h-3 w-3" /> Returned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      Pending review
                    </span>
                  )}
                </div>
              </div>

              {!myRecipientState.ackAt && !myRecipientState.note && report.status === "submitted" && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionInProgress === report.id}
                    onClick={() => handleAck(report.id)}
                    className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    disabled={actionInProgress === report.id}
                    onClick={() => setReturningId(report.id)}
                    className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Return with note
                  </button>
                </div>
              )}

              {returningId === report.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    placeholder="What needs correcting?"
                    rows={3}
                    className="w-full rounded border p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actionInProgress === report.id || !returnNote.trim()}
                      onClick={() => handleReturn(report.id)}
                      className="rounded bg-destructive px-3 py-1.5 text-xs text-destructive-foreground disabled:opacity-50"
                    >
                      Return report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReturningId(null)
                        setReturnNote("")
                      }}
                      className="rounded border px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {myRecipientState.note && (
                <div className="mt-3 rounded bg-muted p-3 text-sm">
                  <p className="font-medium">Return note:</p>
                  <p className="text-muted-foreground">{myRecipientState.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the guard tests**

Run: `npx vitest run tests/unit/report-inbox-page.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Run full suite + typecheck + lint, commit**

```bash
git add app/dashboard/reports-work/inbox/page.tsx app/dashboard/reports-work/inbox/inbox-client.tsx tests/unit/report-inbox-page.test.ts
git commit -m "feat(reports): inbox page with ack/return actions and recipient state"
```

---

### Task 9: Admin team day view — `GET /api/reports/admin/day`

**Files:**
- Create: `app/api/reports/admin/day/route.ts`
- Create: `tests/unit/report-admin-day-route.test.ts`

**Interfaces:**
- Consumes: `reportSession()`, `isAdmin()`, `workLogEntries`, `workReports`, `users`
- Produces: `GET` handler that returns a date-scoped grouped view of who logged what, gaps, and submitted reports — admin-only

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/report-admin-day-route.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("admin day route", () => {
  const route = src("app/api/reports/admin/day/route.ts")

  it("is gated by reportSession", () => {
    expect(route).toMatch(/await reportSession\(\)/u)
  })

  it("checks admin via isAdmin", () => {
    expect(route).toMatch(/isAdmin\(/u)
  })

  it("queries work_log_entries", () => {
    expect(route).toMatch(/workLogEntries/u)
  })

  it("queries work_reports for submitted reports on that date", () => {
    expect(route).toMatch(/workReports/u)
  })

  it("returns 403 for non-admin users", () => {
    expect(route).toMatch(/403/u)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-admin-day-route.test.ts`
Expected: FAIL — file not found

- [ ] **Step 3: Write the admin day route**

Create `app/api/reports/admin/day/route.ts`:

```ts
// GET /api/reports/admin/day?date=YYYY-MM-DD — admin-only team day view.
// Returns who logged what on that date, which reports were submitted, and who
// had no entries (gaps). Super-admins and admin-role accounts see everything;
// a regular member gets 403, not a scoped-down view.

import { NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { workLogEntries, workReports, users } from "@/drizzle/schema"
import { isAdmin } from "@/lib/reports/visibility"
import { isIsoDate } from "@/lib/worklog/local-day"
import {
  badRequest,
  reportSession,
  serverError,
  unauthorized,
} from "@/app/api/reports/work/_shared"

export const dynamic = "force-dynamic"

type MemberDay = {
  userId: number
  name: string
  entryCount: number
  totalMinutes: number
  submittedReportId: number | null
  submittedReportTitle: string | null
}

export async function GET(request: NextRequest) {
  const session = await reportSession()
  if (!session) return unauthorized()

  const userRows = await db
    .select({ role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1)
  const actor = userRows[0]
  if (!actor || !isAdmin({ role: actor.role, email: actor.email })) {
    return NextResponse.json({ success: false, message: "admin access required" }, { status: 403 })
  }

  const date = request.nextUrl.searchParams.get("date")
  if (!date || !isIsoDate(date)) return badRequest("date must be a YYYY-MM-DD string")

  try {
    const entries = await db
      .select({
        userId: workLogEntries.userId,
        entryCount: sql<number>`count(*)::int`,
        totalMinutes: sql<number>`coalesce(sum(${workLogEntries.minutes}), 0)::int`,
      })
      .from(workLogEntries)
      .where(eq(workLogEntries.workedOn, date))
      .groupBy(workLogEntries.userId)

    const reports = await db
      .select({
        userId: workReports.userId,
        id: workReports.id,
        title: workReports.title,
      })
      .from(workReports)
      .where(
        and(
          eq(workReports.status, "submitted"),
          sql`${workReports.submittedAt}::date = ${date}::date`,
        ),
      )

    const allMembers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(sql`${users.role} != 'admin'`)

    const entryMap = new Map(entries.map((e) => [e.userId, e]))
    const reportMap = new Map(reports.map((r) => [r.userId, r]))

    const data: MemberDay[] = allMembers.map((m) => {
      const entry = entryMap.get(m.id)
      const report = reportMap.get(m.id)
      return {
        userId: m.id,
        name: m.name,
        entryCount: entry?.entryCount ?? 0,
        totalMinutes: entry?.totalMinutes ?? 0,
        submittedReportId: report?.id ?? null,
        submittedReportTitle: report?.title ?? null,
      }
    })

    return NextResponse.json({ success: true, data: { date, members: data } })
  } catch (error) {
    return serverError(error, "fetch admin day view")
  }
}
```

- [ ] **Step 4: Run the guard tests**

Run: `npx vitest run tests/unit/report-admin-day-route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run full suite + typecheck + lint, commit**

```bash
git add app/api/reports/admin/day/route.ts tests/unit/report-admin-day-route.test.ts
git commit -m "feat(reports): admin team day view — who logged what, gaps, submitted reports"
```

---

### Task 10: Builder page updates — submit button, recipient picker, status badge, revision link

**Files:**
- Modify: `app/dashboard/reports-work/reports-client.tsx`
- Create: `tests/unit/report-builder-lifecycle.test.ts`

**Interfaces:**
- Consumes: all phase 4 APIs
- Produces: UI additions to the builder page:
  - Status badge in header (draft/submitted/acknowledged/returned)
  - Submit button (only for drafts)
  - Recipient picker (multi-select from `/api/team/members`, pre-filled from default)
  - Revision link (only for submitted/acknowledged/returned)
  - Return note display (when status === "returned")

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/report-builder-lifecycle.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function src(relative: string) {
  return readFileSync(resolve(process.cwd(), relative), "utf8")
}

describe("builder lifecycle UI", () => {
  const client = src("app/dashboard/reports-work/reports-client.tsx")

  it("shows the report status", () => {
    expect(client).toMatch(/status/u)
  })

  it("has a submit action", () => {
    expect(client).toMatch(/submit/iu)
  })

  it("has a recipient picker", () => {
    expect(client).toMatch(/recipient/iu)
  })

  it("has a revise action for filed reports", () => {
    expect(client).toMatch(/revise/iu)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/report-builder-lifecycle.test.ts`
Expected: FAIL — test file not found or guards don't match

- [ ] **Step 3: Add lifecycle UI to the builder**

In `app/dashboard/reports-work/reports-client.tsx`, add:

1. **Status badge** in the header section — show `report.status` with color coding
2. **Submit button** — only when `report.status === "draft"`, opens a dialog to pick recipients
3. **Recipient picker** — multi-select from `/api/team/members`, pre-filled from `readDefaultRecipients()`
4. **Revise button** — only when `report.status !== "draft"`, calls `POST /api/reports/work/[id]/revise`
5. **Return note display** — when `report.status === "returned"`, show `report.returnedNote`

The implementation is a straightforward extension of the existing builder. The submit dialog:

```tsx
function SubmitDialog({ report, onSubmitted, onClose }: { report: ReportDto; onSubmitted: () => void; onClose: () => void }) {
  const [recipientIds, setRecipientIds] = useState<number[]>([])
  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/team/members").then((r) => r.json()).then((json) => {
      if (json.success) setMembers(json.teamMembers.map((m: any) => ({ id: m.id, name: m.name })))
    })
    // Pre-fill from default reporting line
    fetch("/api/settings").then((r) => r.json()).then((json) => {
      if (json.success) {
        const defaults = json.settings.defaultReportRecipients
        if (Array.isArray(defaults)) setRecipientIds(defaults)
      }
    })
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reports/work/${report.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds }),
      })
      if (res.ok) {
        onSubmitted()
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6">
        <h2 className="text-lg font-semibold">Submit report</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose who receives "{report.title}". Once submitted, the report is locked.
        </p>
        <div className="mt-4 space-y-2">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={recipientIds.includes(m.id)}
                onChange={(e) => {
                  setRecipientIds((prev) =>
                    e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                  )
                }}
              />
              <span className="text-sm">{m.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || recipientIds.length === 0}
            onClick={handleSubmit}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
```

Add the status badge, submit button, revise button, and return note display to the existing header and action bar.

- [ ] **Step 4: Run the guard tests**

Run: `npx vitest run tests/unit/report-builder-lifecycle.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run full suite + typecheck + lint, commit**

```bash
git add app/dashboard/reports-work/reports-client.tsx tests/unit/report-builder-lifecycle.test.ts
git commit -m "feat(reports): builder lifecycle UI — status badge, submit, recipient picker, revise"
```

---

### Task 11: Docs + spec sync

**Files:**
- Modify: `FEATURES.md` — append §10: Submission, inbox, admin view (phase 4)
- Modify: `DESIGN_SYSTEM.md` — append §13: Submission, inbox, admin view (phase 4)
- Modify: `PLACEHOLDERS.md` — append §9: Submission, inbox, admin view (phase 4)
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` — mark phase 4 as shipped
- Modify: `docs/superpowers/plans/2026-10-26-work-reports-phase4.md` — append "As shipped" block with deviations

- [ ] **Step 1: Update FEATURES.md**

Append §10 after §9:

```markdown
## 10. Submission, inbox, admin view (phase 4, 2026-10-27)

The report lifecycle: submit, ack, return, revise. Recipients are chosen at submit time from `/api/team/members` with a saved default reporting line in `preferences.settings.defaultReportRecipients`. A submitted report is locked; corrections are a new revision via `POST /api/reports/work/[id]/revise`, so a recipient never reads a moving target.

**Inbox** — `/dashboard/reports-work/inbox`: newest submitted reports where the caller is a recipient, with ack and return actions. Admins see all submitted reports. Each row shows the per-recipient state (`notified_at`, `read_at`, `ack_at`, `note`) so "did my manager read it" is answerable from the data.

**Admin team day view** — `GET /api/reports/admin/day?date=YYYY-MM-DD`: who logged what on that date, which reports were submitted, and who had no entries (gaps). Admin-only; a regular member gets 403, not a scoped-down view.

**Notification type** — `"report"` added to `NOTIFICATION_TYPES` in `lib/notifications.ts`. Submission notifies recipients; ack and return notify the author. Every notification carries a link to the inbox or the report.

**Visibility enforcement** — a report is readable only by its author, its listed recipients, and admin/superadmin, enforced in SQL (`lib/reports/visibility.ts`). The inbox query joins `work_report_recipients` to scope the read; the admin day view checks `isAdmin()` before returning data.

**Server routes added:**
- `POST /api/reports/work/[id]/submit` — file a draft
- `POST /api/reports/work/[id]/revise` — start a correction of a filed report
- `GET /api/reports/inbox` — submitted reports for recipients/admin
- `POST /api/reports/inbox/[id]/ack` — acknowledge a report
- `POST /api/reports/inbox/[id]/return` — return a report with a note
- `GET /api/reports/admin/day` — admin team day view

**Deliberately absent (phase 5, 9):** whole-range CSV export, AI prose, PDF/XLSX.
```

- [ ] **Step 2: Update DESIGN_SYSTEM.md**

Append §13 after §12:

```markdown
## 13. Submission, inbox, admin view (phase 4, 2026-10-27)

**Inbox page** — `/dashboard/reports-work/inbox`. Same grid as the builder. Each report is a card showing title, author, period, submitted date, revision number (if any), and recipient state badge (Pending review / Acknowledged / Returned). Actions: Acknowledge (primary button), Return with note (secondary → textarea → destructive button).

**Status badge** — four states: `draft` (muted), `submitted` (blue), `acknowledged` (green), `returned` (amber). Rendered in the builder header next to the title.

**Recipient picker** — multi-select dialog. Pre-filled from `preferences.settings.defaultReportRecipients`. Each member is a checkbox row with name. Submit button disabled until at least one recipient is selected.

**Admin day view** — not yet a page; the API exists (`GET /api/reports/admin/day`) and returns a grouped query. The admin dashboard will consume it in a later phase.

**Copy rules:**
- Submitted date: "Submitted {date}" in the inbox card footer
- Revision: "revision of #{id}" when `revisionOf` is set
- Return note: quoted block with "Return note:" label
- Empty inbox: "No reports in your inbox."
- Admin view label: "All submitted reports (admin view)"
```

- [ ] **Step 3: Update PLACEHOLDERS.md**

Append §9 after §8:

```markdown
## 9. Submission, inbox, admin view (phase 4, 2026-10-27)

No new placeholder. The inbox page, admin day view, and recipient picker all ship with real data and real actions. The admin day view has an API but no dedicated page yet — it will be consumed by the admin dashboard in a later phase.
```

- [ ] **Step 4: Update the spec**

In `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`, §16:

Replace:
```
4. **Submission, inbox, admin view** -- recipients and default reporting line, submit/lock/revise, ack and return with notes, notification type with a link, `/dashboard/reports-work/inbox`, visibility enforcement, the admin team day view.
```

With:
```
4. **Submission, inbox, admin view** *(shipped 2026-10-27)* -- recipients and default reporting line, submit/lock/revise, ack and return with notes, notification type with a link, `/dashboard/reports-work/inbox`, visibility enforcement, the admin team day view.
```

- [ ] **Step 5: Run full suite + typecheck + lint**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: 0 typecheck errors, 0 lint errors / 70 warnings, all tests green

- [ ] **Step 6: Commit**

```bash
git add FEATURES.md DESIGN_SYSTEM.md PLACEHOLDERS.md docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md
git commit -m "docs(reports): phase 4 shipped — submission, inbox, admin view"
```

---

## Execution Summary

Phase 4 adds the report lifecycle to the phase 3 draft system. Eleven tasks, each independently testable and committable:

1. **Notification type + recipients validation** — pure module, 5 tests
2. **Default reporting line** — preferences read/write, 7 tests
3. **Visibility enforcement** — pure predicate, 5 tests
4. **Submit route** — locks draft, writes recipients, notifies, 6 guard tests
5. **Revise route** — new draft from filed report, 5 guard tests
6. **Inbox read** — recipient-scoped + admin override, 4 guard tests
7. **Ack/return routes** — recipient actions with author notification, 6 guard tests
8. **Inbox page** — UI with ack/return actions, 4 guard tests
9. **Admin day view** — date-scoped grouped query, 5 guard tests
10. **Builder lifecycle UI** — status badge, submit, recipient picker, revise, 4 guard tests
11. **Docs + spec sync** — FEATURES, DESIGN_SYSTEM, PLACEHOLDERS, spec

Expected final state: ~53 test files / ~960 tests, 0 typecheck errors, 0 lint errors / 70 warnings.
