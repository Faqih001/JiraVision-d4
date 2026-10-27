# Agent Entry (Phase 18) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the roadmap with an agent entry: a PDF/paste handover that becomes register rows and playbook drafts only after a human previews and commits, model-drafted precautions marked as machine advice, and the rule-based recommendation list gaining its AI twin.

**Architecture:** Three pure modules (`lib/agent/handover.ts`, `lib/agent/precautions.ts`, `lib/recommend/next.ts`) hold every prompt, schema and validator, so both the API and the page read one answer. Four session-gated routes under `/api/agent` do the provider calls and the one transactional write. `/dashboard/agent` is the single door: a handover tab (preview → commit) and a recommendations tab (rules first, AI optional). Nothing is written by the preview route, the pasted text/PDF is never stored, and the recommend route re-reads rows server-side rather than trusting the client.

**Tech Stack:** Next.js 16 App Router (Promise `params`/`searchParams`), React 19, TypeScript strict, Drizzle over Neon Postgres, zod, the existing `lib/ai/gemini.ts` client, Vitest source-guard tests, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` — §12 items 2–6, §14 (visibility), §15 (testing), §16 entry 18, §17 risks ("a model-invented precaution", "the app turning into a password store").

## Global Constraints

- **No migration and no new env var.** `register_items`, `playbooks`, `work_reports`, `deliverables`, `career_levels` and `GOOGLE_GEMINI_API_KEY` all exist. Do not run any DB script against Neon.
- **No writes to `tasks`.** `agent_plans` promotion stays the only path from suggestions to tasks.
- **Session-scoped reads only.** Every row is filtered by `session.id` (or the existing visibility rules) in SQL; never by an id in the body.
- **Handover source text and PDF bytes are never stored and never logged.** Preview holds them in memory only; `console.log` of a body is forbidden; a guard test enforces both.
- **Credential values are refused twice:** the extraction prompt refuses them, and the server re-validates on preview *and* again on commit. A refusal names the field path and never repeats the value.
- **Provider-off behaviour:** handover and precautions answer 503 with a clear message; recommendations still render from rules alone.
- **Every model output is marked.** Playbooks from handover are `source:"gemini"`, `status:"draft"`, `aiMarked:true`; accepted precaution suggestions set `aiMarked` on the row; the AI recommendation list is labelled and never persisted.
- **An AI suggestion that does not survive validation is dropped, never repaired.** If none survives, the answer is 502 with nothing rendered.
- **Gates before every commit:** `npm test`, `npm run typecheck`, `npm run lint` (the one known Gantt error is the only tolerated lint error), `npm run build`.
- **Commit and push after each task** on `main` (standing grant for this repo).

---

## File Structure

**Create**

| Path | Responsibility |
|---|---|
| `lib/agent/handover.ts` | Prompt, JSON schema, tolerant zod reader, credential stripping, the preview DTO. Pure. |
| `lib/agent/precautions.ts` | Prompt, schema, draft reader, suggestion filter (length, dedupe, credential prose). Pure. |
| `lib/recommend/next.ts` | Six rules, ordering, cap, and the AI-suggestion validator that enforces "never invents a number". Pure. |
| `lib/recommend/read.ts` | The member-scoped SQL load that feeds the rules. |
| `app/api/agent/_shared.ts` | Session gate and Gemini-error → HTTP mapping used by all four routes. |
| `app/api/agent/handover/route.ts` | Preview only. Reads the pack, calls Gemini, returns normalised drafts + refusals. Writes nothing. |
| `app/api/agent/handover/commit/route.ts` | Re-validates every item, dedupes, writes registers (`source:"gemini"`) and playbook drafts (`aiMarked:true`) in one transaction. |
| `app/api/agent/precautions/route.ts` | 3–6 `{text, why}` from unsaved editor state. No writes. |
| `app/api/agent/recommendations/route.ts` | Rules always; `{ai:true}` adds ≤3 validated AI suggestions. Never persisted. |
| `app/dashboard/agent/page.tsx` | Suspense wrapper. |
| `app/dashboard/agent/agent-client.tsx` | The two tabs, preview table with checkboxes, refusals panel, commit button, recommendation list. |
| `tests/unit/agent-handover.test.ts` | Pure handover tests. |
| `tests/unit/agent-precautions.test.ts` | Pure precaution tests. |
| `tests/unit/recommend-next.test.ts` | Rule + AI-validator tests. |
| `tests/unit/agent-routes.test.ts` | Source guards for the four routes and `_shared.ts`. |
| `tests/unit/agent-page.test.ts` | Source guards for the page, sidebar, editor button and disclosure. |

**Modify**

| Path | Change |
|---|---|
| `components/dashboard-layout.tsx:274-278` | New "Agent" sidebar entry (`Bot` is already imported). |
| `app/dashboard/playbooks/[id]/playbook-editor.tsx:252-302, 792-804` | `aiTouched` state sent as `aiMarked`; "Suggest precautions" button and suggestion list in the Precautions card. |
| `app/api/playbooks/[id]/route.ts:90-96` | Body may set `aiMarked: true`; it may never clear the flag (only a human content edit does that). |
| `lib/career/profile.ts:279-289` | `next` gains `id` so a career recommendation can name the row it came from. |
| `FEATURES.md` | New §23. |
| `README.md` | Layout lines, route count, lib list, new section. |
| the spec above | Phase-list entry 18 marked shipped. |

---

### Task 1: The handover reader

**Files:**
- Create: `lib/agent/handover.ts`
- Test: `tests/unit/agent-handover.test.ts`

**Interfaces:**
- Consumes: `CREDENTIAL_KEY`, `asksForCredentialValue` from `@/lib/registers/fields`; `readPlaybookInput`, `type PlaybookInput` from `@/lib/playbooks/fields`; `PlaybookStep` from `@/lib/playbooks/method`; `GeminiError`, `type JsonSchema` from `@/lib/ai/gemini`.
- Produces:
  - `type HandoverPack = { packKey: string; title: string; kinds: string[]; method: string[] }`
  - `type HandoverRegisterDraft = { kind: string; title: string; custody: RegisterCustody; fields: Record<string, string> }`
  - `type HandoverPlaybookDraft = Omit<PlaybookInput, "packKey" | "verifyIntervalDays">`
  - `type HandoverRefusal = { path: string; reason: string }`
  - `type HandoverPreview = { registers: HandoverRegisterDraft[]; playbooks: HandoverPlaybookDraft[]; refusals: HandoverRefusal[] }`
  - `stripCredentialValues(pairs: readonly { key: string; value: string }[], pathPrefix: string)` → `{ kept: Record<string, string>; refused: HandoverRefusal[] }`
  - `readHandover(raw: unknown, pack: HandoverPack): HandoverPreview` (throws `GeminiError("badjson", …)`)
  - `handoverPrompt(input: { pack: HandoverPack; source: "text" | "pdf" }): string`
  - `HANDOVER_SYSTEM: string`, `HANDOVER_SCHEMA: JsonSchema`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent-handover.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { GeminiError } from "@/lib/ai/gemini"
import {
  HANDOVER_SYSTEM,
  handoverPrompt,
  readHandover,
  stripCredentialValues,
  type HandoverPack,
} from "@/lib/agent/handover"

const PACK: HandoverPack = {
  packKey: "it-technician",
  title: "IT technician",
  kinds: ["infrastructure", "account", "equipment", "outstanding"],
  method: ["Identify", "Reproduce", "Diagnose", "Fix", "Test", "Document"],
}

describe("stripCredentialValues", () => {
  it("refuses a credential-shaped key and names the path", () => {
    const result = stripCredentialValues(
      [
        { key: "password", value: "hunter2" },
        { key: "admin_apiKey", value: "abc" },
        { key: "console_url", value: "https://console.example" },
      ],
      "registers[0].fields",
    )
    expect(result.kept).toEqual({ console_url: "https://console.example" })
    expect(result.refused).toHaveLength(2)
    expect(result.refused[0].path).toBe("registers[0].fields.password")
    expect(result.refused[0].reason).toMatch(/credential/i)
  })

  it("refuses a value written as an assignment and never echoes it", () => {
    const result = stripCredentialValues(
      [{ key: "notes", value: "router login password: Sup3rS3cret" }],
      "registers[0].fields",
    )
    expect(result.kept).toEqual({})
    expect(JSON.stringify(result.refused)).not.toContain("Sup3rS3cret")
    expect(result.refused[0].path).toBe("registers[0].fields.notes")
  })

  it("keeps ordinary text untouched", () => {
    const result = stripCredentialValues(
      [
        { key: "hostname", value: "fs01" },
        { key: "kept_in", value: "1Password — IT vault" },
      ],
      "registers[0].fields",
    )
    expect(result.refused).toEqual([])
    expect(result.kept).toEqual({ hostname: "fs01", kept_in: "1Password — IT vault" })
  })
})

describe("readHandover", () => {
  it("turns a payload into one register row and one playbook draft", () => {
    const preview = readHandover(
      {
        registers: [
          {
            kind: "infrastructure",
            title: "File server fs01",
            custody: "team",
            fields: [
              { key: "hostname", value: "fs01" },
              { key: "renewal", value: "2026-11-01" },
            ],
          },
        ],
        playbooks: [
          {
            title: "Replace a failed drive",
            summary: "Swap a disk without losing the array.",
            steps: [
              {
                phase: "Identify",
                action: "Confirm the failed bay from the controller alert.",
              },
            ],
            precautions: ["Power down before opening the chassis."],
            tags: ["storage"],
          },
        ],
      },
      PACK,
    )

    expect(preview.registers).toHaveLength(1)
    expect(preview.registers[0]).toMatchObject({
      kind: "infrastructure",
      title: "File server fs01",
      custody: "team",
      fields: { hostname: "fs01", renewal: "2026-11-01" },
    })
    expect(preview.playbooks).toHaveLength(1)
    expect(preview.playbooks[0].steps[0]).toMatchObject({
      phase: "Identify",
      action: "Confirm the failed bay from the controller alert.",
      checks: [],
    })
    expect(preview.refusals).toEqual([])
  })

  it("refuses a kind the pack does not list", () => {
    const preview = readHandover(
      { registers: [{ kind: "spaceship", title: "Rocket", fields: [] }], playbooks: [] },
      PACK,
    )
    expect(preview.registers).toEqual([])
    expect(preview.refusals[0].path).toBe("registers[0].kind")
  })

  it("refuses a credential key and does not repeat the value", () => {
    const preview = readHandover(
      {
        registers: [
          {
            kind: "account",
            title: "Domain admin",
            fields: [
              { key: "username", value: "svc-admin" },
              { key: "password", value: "N0tInTheOutput" },
            ],
          },
        ],
        playbooks: [],
      },
      PACK,
    )
    expect(preview.registers[0].fields).toEqual({ username: "svc-admin" })
    expect(preview.refusals[0].path).toBe("registers[0].fields.password")
    expect(JSON.stringify(preview)).not.toContain("N0tInTheOutput")
  })

  it("refuses a playbook the real validator rejects", () => {
    const preview = readHandover(
      {
        registers: [],
        playbooks: [{ title: "No action", steps: [{ phase: "Identify", action: "" }] }],
      },
      PACK,
    )
    expect(preview.playbooks).toEqual([])
    expect(preview.refusals[0].path).toBe("playbooks[0]")
    expect(preview.refusals[0].reason).toMatch(/action is required/i)
  })

  it("refuses playbook prose that asks for a credential value", () => {
    const preview = readHandover(
      {
        registers: [],
        playbooks: [
          {
            title: "Reset the console",
            precautions: ["Send the admin password to the vendor engineer."],
            steps: [{ phase: "Fix", action: "Open the console." }],
          },
        ],
      },
      PACK,
    )
    expect(preview.playbooks).toEqual([])
    expect(preview.refusals[0].reason).toMatch(/credential/i)
  })

  it("throws a badjson GeminiError for a payload that is not an object", () => {
    expect(() => readHandover("not json", PACK)).toThrow(GeminiError)
  })
})

describe("the prompt", () => {
  it("names the pack kinds and phases, and forbids credential values", () => {
    const prompt = handoverPrompt({ pack: PACK, source: "text" })
    expect(prompt).toContain("it-technician")
    expect(prompt).toContain("infrastructure, account, equipment, outstanding")
    expect(prompt).toContain("Identify → Reproduce → Diagnose → Fix → Test → Document")
    expect(HANDOVER_SYSTEM).toMatch(/never (output|include|repeat)[^.]*credential/i)
    expect(HANDOVER_SYSTEM).toMatch(/where (it|the credential) is kept/i)
    expect(HANDOVER_SYSTEM).toMatch(/do not invent/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/agent-handover.test.ts`
Expected: FAIL — `Cannot find module '@/lib/agent/handover'`.

- [ ] **Step 3: Write `lib/agent/handover.ts`**

```ts
// Handover ingestion, pure side (design §12 item 4, §16 entry 18). A pasted brief or a PDF
// becomes register rows and playbook drafts — but every proposal passes the same validators
// the manual forms use, so the agent cannot smuggle a shape the form would reject. Credential
// values are refused here by key and by "written as an assignment" value, and the refusal
// names the path without ever repeating the value.

import { z } from "zod"
import { GeminiError, type JsonSchema } from "@/lib/ai/gemini"
import { readPlaybookInput, type PlaybookInput } from "@/lib/playbooks/fields"
import type { PlaybookStep } from "@/lib/playbooks/method"
import type { RegisterCustody } from "@/lib/registers/rules"
import { asksForCredentialValue, CREDENTIAL_KEY } from "@/lib/registers/fields"

export type HandoverPack = {
  packKey: string
  title: string
  kinds: string[]
  method: string[]
}

export type HandoverRegisterDraft = {
  kind: string
  title: string
  custody: RegisterCustody
  fields: Record<string, string>
}

export type HandoverPlaybookDraft = Omit<PlaybookInput, "packKey" | "verifyIntervalDays">

export type HandoverRefusal = { path: string; reason: string }

export type HandoverPreview = {
  registers: HandoverRegisterDraft[]
  playbooks: HandoverPlaybookDraft[]
  refusals: HandoverRefusal[]
}

const MAX_REGISTERS = 40
const MAX_PLAYBOOKS = 10
const MAX_TITLE = 200
const MAX_SUMMARY = 2000

const SECRET_ASSIGNMENT =
  /(password|passwd|secret|token|api[ _-]?key|private[ _-]?key)\s*[:=]\s*\S+/i

export const HANDOVER_SYSTEM = `You convert an IT handover document into structured rows for a custody register and a procedure library.

Rules that are not negotiable:
- Never output, repeat or paraphrase a credential value (password, passphrase, token, OTP, private key, API key). If the document contains one, say where it is kept and who can authorise it instead — "kept in: password-manager entry / vault path / safe".
- Do not invent a model number, serial number, IP address, date or ticket id that the document does not state. Leave the field out.
- Use only the register kinds the caller lists. Use only the method phases the caller lists.
- A procedure step must be an action a person can perform. If the document does not describe one, return no step.
- If the document is a scan with no readable text, return empty arrays rather than guessing.`

export const HANDOVER_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    registers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string" },
          title: { type: "string" },
          custody: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: { key: { type: "string" }, value: { type: "string" } },
              required: ["key", "value"],
            },
          },
        },
        required: ["kind", "title", "fields"],
      },
    },
    playbooks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          discipline: { type: "string" },
          scopeKind: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase: { type: "string" },
                action: { type: "string" },
                checks: { type: "array", items: { type: "string" } },
                expected: { type: "string" },
                precautions: { type: "array", items: { type: "string" } },
                warnings: { type: "array", items: { type: "string" } },
                ppe: { type: "array", items: { type: "string" } },
                tools_parts: { type: "array", items: { type: "string" } },
                time_estimate: { type: "string" },
                stop_condition: { type: "string" },
                escalation: { type: "string" },
                evidence_to_record: { type: "string" },
              },
              required: ["phase", "action"],
            },
          },
          precautions: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      },
    },
  },
  required: ["registers", "playbooks"],
}

export function handoverPrompt(input: { pack: HandoverPack; source: "text" | "pdf" }): string {
  const { pack, source } = input
  return [
    `Role pack: ${pack.title} (${pack.packKey})`,
    `Register kinds: ${pack.kinds.join(", ")}`,
    `Method phases: ${pack.method.join(" → ")}`,
    `Source: ${source === "pdf" ? "the attached PDF" : "the text below"}`,
    "",
    "Return the register rows and playbook drafts the document supports. Omit anything it does not state.",
    source === "text" ? "" : "The document follows as an attachment.",
  ].join("\n")
}

type Pair = { key: string; value: string }

function pairsOf(value: unknown): Pair[] {
  if (Array.isArray(value)) {
    const out: Pair[] = []
    for (const entry of value) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue
      const raw = entry as Record<string, unknown>
      if (typeof raw.key !== "string") continue
      out.push({ key: raw.key, value: raw.value === undefined || raw.value === null ? "" : String(raw.value) })
    }
    return out
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, raw]) => ({
      key,
      value: raw === undefined || raw === null ? "" : String(raw),
    }))
  }
  return []
}

const stringsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function stripCredentialValues(
  pairs: readonly Pair[],
  pathPrefix: string,
): { kept: Record<string, string>; refused: HandoverRefusal[] } {
  const kept: Record<string, string> = {}
  const refused: HandoverRefusal[] = []
  for (const pair of pairs) {
    const key = pair.key.trim()
    const value = pair.value.trim()
    if (!key) continue
    const path = `${pathPrefix}.${key}`
    if (CREDENTIAL_KEY.test(key)) {
      refused.push({ path, reason: "a credential-shaped field name — record where it is kept instead" })
      continue
    }
    if (SECRET_ASSIGNMENT.test(value)) {
      refused.push({ path, reason: "a value that reads like a credential — record where it is kept instead" })
      continue
    }
    if (value) kept[key] = value
  }
  return { kept, refused }
}

const registersSchema = z.object({
  registers: z.array(z.unknown()).default([]),
  playbooks: z.array(z.unknown()).default([]),
})

function playbookProseAsksForCredential(raw: Record<string, unknown>): boolean {
  const texts: string[] = []
  for (const key of ["title", "summary"] as const) {
    if (typeof raw[key] === "string") texts.push(raw[key] as string)
  }
  for (const key of ["precautions", "recommendations"] as const) {
    texts.push(...stringsOf(raw[key]))
  }
  for (const step of Array.isArray(raw.steps) ? raw.steps : []) {
    if (!step || typeof step !== "object" || Array.isArray(step)) continue
    const entry = step as Record<string, unknown>
    if (typeof entry.action === "string") texts.push(entry.action)
    texts.push(...stringsOf(entry.precautions))
    texts.push(...stringsOf(entry.warnings))
  }
  return texts.some((text) => asksForCredentialValue(text))
}

/** Tolerant reader: unusable proposals are refused with a path, never repaired silently. */
export function readHandover(raw: unknown, pack: HandoverPack): HandoverPreview {
  let parsed: z.infer<typeof registersSchema>
  try {
    parsed = registersSchema.parse(raw)
  } catch {
    throw new GeminiError("badjson", "The extraction was not an object with registers and playbooks.")
  }

  const refusals: HandoverRefusal[] = []
  const registers: HandoverRegisterDraft[] = []

  parsed.registers.slice(0, MAX_REGISTERS).forEach((entry, index) => {
    const path = `registers[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      refusals.push({ path, reason: "not an object" })
      return
    }
    const row = entry as Record<string, unknown>
    const kind = typeof row.kind === "string" ? row.kind.trim() : ""
    if (!pack.kinds.includes(kind)) {
      refusals.push({ path: `${path}.kind`, reason: `not a kind this pack lists (${pack.kinds.join(", ")})` })
      return
    }
    const title = typeof row.title === "string" ? row.title.trim() : ""
    if (!title || title.length > MAX_TITLE) {
      refusals.push({ path: `${path}.title`, reason: `title must be 1-${MAX_TITLE} characters` })
      return
    }
    const custody: RegisterCustody =
      row.custody === "team" || row.custody === "org" ? row.custody : "member"
    const stripped = stripCredentialValues(pairsOf(row.fields), `${path}.fields`)
    refusals.push(...stripped.refused)
    registers.push({ kind, title, custody, fields: stripped.kept })
  })

  if (parsed.registers.length > MAX_REGISTERS) {
    refusals.push({
      path: "registers",
      reason: `more than ${MAX_REGISTERS} rows proposed — only the first ${MAX_REGISTERS} were kept`,
    })
  }

  const playbooks: HandoverPlaybookDraft[] = []

  parsed.playbooks.slice(0, MAX_PLAYBOOKS).forEach((entry, index) => {
    const path = `playbooks[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      refusals.push({ path, reason: "not an object" })
      return
    }
    const row = entry as Record<string, unknown>
    if (playbookProseAsksForCredential(row)) {
      refusals.push({ path, reason: "the draft asks for a credential value — record where it is kept instead" })
      return
    }

    const summary =
      typeof row.summary === "string" && row.summary.trim() ? row.summary.trim().slice(0, MAX_SUMMARY) : null

    const read = readPlaybookInput(
      {
        packKey: pack.packKey,
        title: row.title,
        summary,
        discipline: row.discipline,
        scopeKind: row.scopeKind,
        method: pack.method,
        steps: row.steps,
        precautions: row.precautions,
        recommendations: row.recommendations,
        tags: row.tags,
        verifyIntervalDays: null,
      },
      pack.method,
    )

    if (!read.ok) {
      refusals.push({ path, reason: read.error })
      return
    }

    const { packKey: _packKey, verifyIntervalDays: _interval, ...draft } = read.value
    playbooks.push(draft)
  })

  if (parsed.playbooks.length > MAX_PLAYBOOKS) {
    refusals.push({
      path: "playbooks",
      reason: `more than ${MAX_PLAYBOOKS} drafts proposed — only the first ${MAX_PLAYBOOKS} were kept`,
    })
  }

  return { registers, playbooks, refusals }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/agent-handover.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.

```bash
git add lib/agent/handover.ts tests/unit/agent-handover.test.ts
git commit -m "feat(agent): read a handover into drafts the manual validators accept"
git push
```

---

### Task 2: Precaution suggestions

**Files:**
- Create: `lib/agent/precautions.ts`
- Test: `tests/unit/agent-precautions.test.ts`

**Interfaces:**
- Consumes: `asksForCredentialValue` from `@/lib/registers/fields`; `GeminiError`, `type JsonSchema` from `@/lib/ai/gemini`.
- Produces:
  - `type PrecautionDraft = { title: string; summary: string | null; method: string[]; steps: { phase: string; action: string }[]; existing: string[] }`
  - `type PrecautionSuggestion = { text: string; why: string }`
  - `readPrecautionDraft(value: unknown): { ok: true; value: PrecautionDraft } | { ok: false; error: string }`
  - `readPrecautions(raw: unknown, existing: readonly string[], max?: number): PrecautionSuggestion[]` (throws `GeminiError("badjson", …)` when nothing survives)
  - `precautionsPrompt(draft: PrecautionDraft): string`, `PRECAUTIONS_SYSTEM: string`, `PRECAUTIONS_SCHEMA: JsonSchema`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent-precautions.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { GeminiError } from "@/lib/ai/gemini"
import {
  PRECAUTIONS_SYSTEM,
  precautionsPrompt,
  readPrecautionDraft,
  readPrecautions,
} from "@/lib/agent/precautions"

const draft = {
  title: "Replace a failed drive",
  summary: "Swap a disk without losing the array.",
  method: ["Identify", "Fix", "Test"],
  steps: [
    { phase: "Identify", action: "Confirm the failed bay from the controller alert." },
    { phase: "Fix", action: "Replace the disk with an approved spare." },
  ],
  existing: ["Power down before opening the chassis."],
}

describe("readPrecautionDraft", () => {
  it("accepts the editor's unsaved state", () => {
    const read = readPrecautionDraft(draft)
    expect(read.ok).toBe(true)
    if (read.ok) {
      expect(read.value.steps).toHaveLength(2)
      expect(read.value.existing).toEqual(["Power down before opening the chassis."])
    }
  })

  it("rejects a step whose phase is not in the method", () => {
    const read = readPrecautionDraft({
      ...draft,
      steps: [{ phase: "Improvise", action: "Try it." }],
    })
    expect(read.ok).toBe(false)
  })

  it("rejects a blank title", () => {
    expect(readPrecautionDraft({ ...draft, title: "  " }).ok).toBe(false)
  })
})

describe("readPrecautions", () => {
  it("keeps 3-6 suggestions and trims them", () => {
    const result = readPrecautions(
      {
        suggestions: [
          { text: "  Lock out the array controller.  ", why: "The Fix step changes live hardware." },
          { text: "Match the spare's firmware before insertion.", why: "A mismatch can rebuild wrong." },
          { text: "Record the serial in the change note.", why: "The Test step needs evidence." },
        ],
      },
      [],
    )
    expect(result).toHaveLength(3)
    expect(result[0].text).toBe("Lock out the array controller.")
  })

  it("drops a duplicate of something a person already wrote", () => {
    const result = readPrecautions(
      {
        suggestions: [
          { text: "power down before opening the chassis.", why: "Already present." },
          { text: "Wear an anti-static strap.", why: "The Fix step touches components." },
        ],
      },
      ["Power down before opening the chassis."],
    )
    expect(result.map((entry) => entry.text)).toEqual(["Wear an anti-static strap."])
  })

  it("drops prose that asks for a credential value", () => {
    const result = readPrecautions(
      {
        suggestions: [
          { text: "Enter the admin password into the console prompt.", why: "Sign-in." },
          { text: "Confirm the maintenance window before touching the array.", why: "Users are live." },
        ],
      },
      [],
    )
    expect(result.map((entry) => entry.text)).toEqual([
      "Confirm the maintenance window before touching the array.",
    ])
  })

  it("drops an over-long suggestion and caps the list", () => {
    const long = "x".repeat(201)
    const suggestions = Array.from({ length: 8 }, (_, index) => ({
      text: `Precaution number ${index + 1}`,
      why: "Because the procedure touches live hardware.",
    }))
    suggestions.push({ text: long, why: "Too long." })
    const result = readPrecautions({ suggestions }, [], 6)
    expect(result).toHaveLength(6)
    expect(result.some((entry) => entry.text === long)).toBe(false)
  })

  it("throws badjson when nothing survives", () => {
    expect(() =>
      readPrecautions({ suggestions: [{ text: "Enter the admin password now.", why: "sign-in" }] }, []),
    ).toThrow(GeminiError)
  })
})

describe("the prompt", () => {
  it("names the steps and keeps advice grounded", () => {
    const prompt = precautionsPrompt(draft)
    expect(prompt).toContain("Replace a failed drive")
    expect(prompt).toContain("Confirm the failed bay")
    expect(PRECAUTIONS_SYSTEM).toMatch(/only from the steps/i)
    expect(PRECAUTIONS_SYSTEM).toMatch(/do not invent/i)
    expect(PRECAUTIONS_SYSTEM).toMatch(/never[^.]*credential/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/agent-precautions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/agent/precautions.ts`**

```ts
// Precautions, drafted but never silently adopted (design §12 item 5, §17 risk
// "a model-invented precaution"). The model sees the member's unsaved draft and returns
// advice with a reason; only text that is short, non-duplicated and free of credential
// requests survives. Nothing here writes — the editor decides what a human accepts.

import { z } from "zod"
import { GeminiError, type JsonSchema } from "@/lib/ai/gemini"
import { asksForCredentialValue } from "@/lib/registers/fields"

export type PrecautionDraft = {
  title: string
  summary: string | null
  method: string[]
  steps: { phase: string; action: string }[]
  existing: string[]
}

export type PrecautionSuggestion = { text: string; why: string }

const MAX_TITLE = 200
const MAX_SUMMARY = 2000
const MAX_PHASES = 12
const MAX_STEPS = 40
const MAX_TEXT = 500
const MAX_SUGGESTION = 200
const MAX_WHY = 240

export const PRECAUTIONS_SYSTEM = `You suggest safety precautions for a procedure.

- Every suggestion must follow only from the steps the caller lists. Do not invent equipment, hazards or regulations.
- Never ask for a credential value (password, token, key). A precaution about credentials says where they are kept.
- Return 3 to 6 suggestions. Each is one sentence of practice, plus one sentence saying which step or condition it protects.
- If the steps do not support any precaution, return an empty list rather than generic advice.`

export const PRECAUTIONS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, why: { type: "string" } },
        required: ["text", "why"],
      },
    },
  },
  required: ["suggestions"],
}

export function precautionsPrompt(draft: PrecautionDraft): string {
  const lines = [`Playbook: ${draft.title}`]
  if (draft.summary) lines.push(`Summary: ${draft.summary}`)
  lines.push(`Method: ${draft.method.join(" → ")}`, "", "Steps:")
  draft.steps.forEach((step, index) => {
    lines.push(`${index + 1}. [${step.phase}] ${step.action}`)
  })
  if (draft.existing.length > 0) {
    lines.push("", "Already written by a person (do not repeat):")
    draft.existing.forEach((entry) => lines.push(`- ${entry}`))
  }
  return lines.join("\n")
}

export type PrecautionDraftRead =
  | { ok: true; value: PrecautionDraft }
  | { ok: false; error: string }

export function readPrecautionDraft(value: unknown): PrecautionDraftRead {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "A playbook draft is required." }
  }
  const raw = value as Record<string, unknown>

  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  if (!title || title.length > MAX_TITLE) {
    return { ok: false, error: `title must be 1-${MAX_TITLE} characters.` }
  }

  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim().slice(0, MAX_SUMMARY)
      : null

  if (!Array.isArray(raw.method) || raw.method.length === 0 || raw.method.length > MAX_PHASES) {
    return { ok: false, error: `method must list 1-${MAX_PHASES} phases.` }
  }
  const method: string[] = []
  for (const entry of raw.method) {
    if (typeof entry !== "string" || !entry.trim() || entry.trim().length > 40) {
      return { ok: false, error: "Every method phase must be 1-40 characters." }
    }
    method.push(entry.trim())
  }

  if (!Array.isArray(raw.steps) || raw.steps.length === 0 || raw.steps.length > MAX_STEPS) {
    return { ok: false, error: `steps must hold 1-${MAX_STEPS} entries.` }
  }
  const steps: { phase: string; action: string }[] = []
  for (const entry of raw.steps) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: "Every step must be an object." }
    }
    const step = entry as Record<string, unknown>
    const phase = typeof step.phase === "string" ? step.phase.trim() : ""
    if (!method.includes(phase)) {
      return { ok: false, error: `phase must be one of: ${method.join(", ")}.` }
    }
    const action = typeof step.action === "string" ? step.action.trim() : ""
    if (!action || action.length > MAX_TEXT) {
      return { ok: false, error: `Every step needs an action of at most ${MAX_TEXT} characters.` }
    }
    steps.push({ phase, action })
  }

  const existing: string[] = []
  if (raw.existing !== undefined && raw.existing !== null) {
    if (!Array.isArray(raw.existing)) return { ok: false, error: "existing must be an array of strings." }
    for (const entry of raw.existing) {
      if (typeof entry !== "string") return { ok: false, error: "existing must hold only strings." }
      if (entry.trim()) existing.push(entry.trim().slice(0, MAX_SUGGESTION))
    }
  }

  return { ok: true, value: { title, summary, method, steps, existing } }
}

const suggestionsSchema = z.object({
  suggestions: z.array(
    z.object({ text: z.string().optional(), why: z.string().optional() }),
  ).default([]),
})

export function readPrecautions(
  raw: unknown,
  existing: readonly string[],
  max = 6,
): PrecautionSuggestion[] {
  let parsed: z.infer<typeof suggestionsSchema>
  try {
    parsed = suggestionsSchema.parse(raw)
  } catch {
    throw new GeminiError("badjson", "The precaution answer was not a list of suggestions.")
  }

  const seen = new Set(existing.map((entry) => entry.trim().toLowerCase()))
  const out: PrecautionSuggestion[] = []

  for (const entry of parsed.suggestions) {
    const text = (entry.text ?? "").trim()
    const why = (entry.why ?? "").trim()
    if (!text || text.length > MAX_SUGGESTION) continue
    if (!why || why.length > MAX_WHY) continue
    if (asksForCredentialValue(text) || asksForCredentialValue(why)) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ text, why })
    if (out.length >= max) break
  }

  if (out.length === 0) {
    throw new GeminiError("badjson", "No precaution survived the review rules.")
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/agent-precautions.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agent/precautions.ts tests/unit/agent-precautions.test.ts
git commit -m "feat(agent): filter model-drafted precautions before a person sees them"
git push
```

---

### Task 3: The rule-based recommendation engine

**Files:**
- Create: `lib/recommend/next.ts`, `lib/recommend/read.ts`
- Modify: `lib/career/profile.ts:279-289` (add `id: nextRow.id` inside `next`)
- Test: `tests/unit/recommend-next.test.ts`

**Interfaces:**
- Consumes: `RegisterDto`/`withState` (`@/lib/registers/read`), `stalenessOf`, `daysBetween` (`@/lib/registers/staleness`), `isIsoDate`, `localDay`, `monthBoundsIso`, `shiftDays`, `weekStartIso` (`@/lib/worklog/local-day`), `loadCareerProfile` (`@/lib/career/profile`), `countCareerSignals` is *not* needed here.
- Produces:
  - `type Recommendation = { id: string; kind: RecommendKind; why: string; action: string; href: string; confidence: number; refs: RecommendRef[] }`
  - `type RecommendRef = { table: "register_items" | "deliverables" | "work_reports" | "career_levels" | "work_log_entries"; id: number }`
  - `type RecommendInput` (see code)
  - `buildRecommendations(input: RecommendInput, cap?: number): Recommendation[]`
  - `readAiSuggestions(raw: unknown, input: RecommendInput): Recommendation[]` (throws `GeminiError`)
  - `recommendationPrompt(input: RecommendInput): string`, `RECOMMEND_SYSTEM: string`, `RECOMMEND_SCHEMA: JsonSchema`
  - `loadRecommendInput({ userId, admin, today, timeZone }): Promise<RecommendInput>`

- [ ] **Step 1: Add the level id to the career profile**

In `lib/career/profile.ts`, inside the returned `next:` object (the branch at lines 279-289), add `id: nextRow.id,` as the first property. This is additive; no page reads it yet. Run `npx tsc --noEmit` — expect 0 errors.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/recommend-next.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  buildRecommendations,
  readAiSuggestions,
  type RecommendInput,
} from "@/lib/recommend/next"

const base: RecommendInput = {
  today: "2026-10-27",
  registers: [],
  entriesToday: 0,
  deliverables: [],
  periods: [],
  career: null,
}

const staleRegister = {
  id: 7,
  title: "IP addressing document",
  status: "in_service",
  lastVerifiedAt: "2026-06-01",
  verifyIntervalDays: 30,
  fields: {},
  staleness: "stale" as const,
}

describe("buildRecommendations", () => {
  it("fires only the log nudge for a calm member with nothing logged", () => {
    const result = buildRecommendations(base)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe("missing_log")
    expect(result[0].href).toBe("/dashboard/worklog")
  })

  it("puts a stale register first and names its interval", () => {
    const result = buildRecommendations({ ...base, entriesToday: 2, registers: [staleRegister] })
    expect(result[0].kind).toBe("stale_register")
    expect(result[0].why).toContain("30")
    expect(result[0].refs).toEqual([{ table: "register_items", id: 7 }])
  })

  it("surfaces a never-verified row only when an interval is set", () => {
    const withInterval = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 8, lastVerifiedAt: null, staleness: "unknown" }],
    })
    expect(withInterval.some((entry) => entry.kind === "stale_register" && entry.refs[0].id === 8)).toBe(true)

    const noInterval = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 9, lastVerifiedAt: null, verifyIntervalDays: null, staleness: "unknown" }],
    })
    expect(noInterval.some((entry) => entry.refs[0]?.id === 9)).toBe(false)
  })

  it("fires an overdue renewal only when the stored date has passed", () => {
    const overdue = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 11, lastVerifiedAt: "2026-10-20", staleness: "fresh", fields: { renewal: "2026-10-01" } }],
    })
    expect(overdue.some((entry) => entry.kind === "overdue_renewal")).toBe(true)

    const future = buildRecommendations({
      ...base,
      entriesToday: 1,
      registers: [{ ...staleRegister, id: 12, lastVerifiedAt: "2026-10-20", staleness: "fresh", fields: { renewal: "2026-12-01" } }],
    })
    expect(future.some((entry) => entry.kind === "overdue_renewal")).toBe(false)
  })

  it("waits three days before calling a review stuck", () => {
    const twoDays = buildRecommendations({
      ...base,
      entriesToday: 1,
      deliverables: [{ id: 3, name: "Backup restore test", status: "in_review", updatedOn: "2026-10-25" }],
    })
    expect(twoDays.some((entry) => entry.kind === "deliverable_stuck")).toBe(false)

    const threeDays = buildRecommendations({
      ...base,
      entriesToday: 1,
      deliverables: [{ id: 3, name: "Backup restore test", status: "in_review", updatedOn: "2026-10-24" }],
    })
    expect(threeDays.some((entry) => entry.kind === "deliverable_stuck")).toBe(true)
  })

  it("names the largest career gap with its real numbers", () => {
    const result = buildRecommendations({
      ...base,
      entriesToday: 1,
      career: {
        levelId: 42,
        nextTitle: "Senior IT technician",
        gaps: [
          { key: "incident", label: "Incidents resolved", actual: 3, target: 10 },
          { key: "document", label: "Documents written", actual: 1, target: 2 },
        ],
      },
    })
    const gap = result.find((entry) => entry.kind === "career_gap")
    expect(gap?.why).toContain("Incidents resolved")
    expect(gap?.why).toContain("3")
    expect(gap?.why).toContain("10")
    expect(gap?.refs).toEqual([{ table: "career_levels", id: 42 }])
  })

  it("asks for a report only for a period that has work in it", () => {
    const result = buildRecommendations({
      ...base,
      entriesToday: 1,
      periods: [
        { periodType: "weekly", periodStart: "2026-10-19", periodEnd: "2026-10-25", hasEntries: true, hasReport: false },
        { periodType: "monthly", periodStart: "2026-09-01", periodEnd: "2026-09-30", hasEntries: false, hasReport: false },
      ],
    })
    const reports = result.filter((entry) => entry.kind === "report_missing")
    expect(reports).toHaveLength(1)
    expect(reports[0].why).toContain("2026-10-19")
  })

  it("orders by confidence and caps the list", () => {
    const registers = Array.from({ length: 10 }, (_, index) => ({
      ...staleRegister,
      id: 100 + index,
      title: `Document ${index}`,
    }))
    const result = buildRecommendations({ ...base, entriesToday: 2, registers }, 8)
    expect(result).toHaveLength(8)
    const confidences = result.map((entry) => entry.confidence)
    expect([...confidences].sort((a, b) => b - a)).toEqual(confidences)
  })
})

describe("readAiSuggestions", () => {
  const input: RecommendInput = {
    ...base,
    entriesToday: 2,
    registers: [staleRegister],
    deliverables: [{ id: 3, name: "Backup restore test", status: "in_review", updatedOn: "2026-10-20" }],
  }

  const suggestion = {
    why: "Document 7 was last verified on 2026-06-01 and its 30-day renewal is due.",
    action: "Open the register",
    href: "/dashboard/registers",
    confidence: 0.6,
    refs: [{ table: "register_items", id: 7 }],
  }

  it("keeps a suggestion whose refs exist and whose numbers are in the input", () => {
    const result = readAiSuggestions({ suggestions: [suggestion] }, input)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe("ai")
    expect(result[0].refs).toEqual([{ table: "register_items", id: 7 }])
  })

  it("drops a suggestion that names a row the member cannot see", () => {
    expect(() =>
      readAiSuggestions({ suggestions: [{ ...suggestion, refs: [{ table: "register_items", id: 999 }] }] }, input),
    ).toThrow(/no suggestion survived/i)
  })

  it("drops a suggestion whose href is not an internal page", () => {
    expect(() =>
      readAiSuggestions({ suggestions: [{ ...suggestion, href: "https://evil.example/x" }] }, input),
    ).toThrow(/no suggestion survived/i)
  })

  it("drops a suggestion that invents a number", () => {
    expect(() =>
      readAiSuggestions({ suggestions: [{ ...suggestion, why: "You are 42 days behind." }] }, input),
    ).toThrow(/no suggestion survived/i)
  })

  it("drops a suggestion with no refs at all", () => {
    expect(() => readAiSuggestions({ suggestions: [{ ...suggestion, refs: [] }] }, input)).toThrow(
      /no suggestion survived/i,
    )
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/unit/recommend-next.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `lib/recommend/next.ts`**

```ts
// What to do next, rule-based first so it works with no key (design §12 item 6). Every rule
// reads rows the member may see, names them in `refs`, and states only numbers it computed
// from those rows. The AI twin is held to the same shape by `readAiSuggestions`: a suggestion
// survives only if its refs exist in the input and every number it writes is already there.

import { z } from "zod"
import { GeminiError, type JsonSchema } from "@/lib/ai/gemini"
import { daysBetween, type Staleness } from "@/lib/registers/staleness"
import { isIsoDate } from "@/lib/worklog/local-day"

export const RECOMMEND_KINDS = [
  "stale_register",
  "overdue_renewal",
  "deliverable_stuck",
  "career_gap",
  "report_missing",
  "missing_log",
  "ai",
] as const
export type RecommendKind = (typeof RECOMMEND_KINDS)[number]

export type RecommendRef = {
  table: "register_items" | "deliverables" | "work_reports" | "career_levels" | "work_log_entries"
  id: number
}

export type Recommendation = {
  id: string
  kind: RecommendKind
  why: string
  action: string
  href: string
  confidence: number
  refs: RecommendRef[]
}

export type RecommendRegister = {
  id: number
  title: string
  status: string
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  fields: Record<string, string>
  staleness: Staleness
}

export type RecommendPeriod = {
  periodType: "weekly" | "monthly"
  periodStart: string
  periodEnd: string
  hasEntries: boolean
  hasReport: boolean
}

export type RecommendInput = {
  today: string
  registers: RecommendRegister[]
  entriesToday: number
  deliverables: { id: number; name: string; status: string; updatedOn: string }[]
  periods: RecommendPeriod[]
  career: {
    levelId: number | null
    nextTitle: string | null
    gaps: { key: string; label: string; actual: number; target: number }[]
  } | null
}

export const STUCK_DAYS = 3
export const MAX_RECOMMENDATIONS = 8
export const AI_HREF_PREFIXES = [
  "/dashboard/registers",
  "/dashboard/worklog",
  "/dashboard/career",
  "/dashboard/reports-work",
  "/dashboard/playbooks",
  "/dashboard/agent",
] as const

const HREF: Record<string, string> = {
  registers: "/dashboard/registers",
  worklog: "/dashboard/worklog",
  career: "/dashboard/career",
  reports: "/dashboard/reports-work",
}

const RENEWAL_KEY = /renew|expir|due/i

/** The earliest ISO date stored under a renewal-looking field, or null. */
export function renewalDue(fields: Record<string, string>): string | null {
  let earliest: string | null = null
  for (const [key, value] of Object.entries(fields)) {
    if (!RENEWAL_KEY.test(key) || !isIsoDate(value)) continue
    if (!earliest || value < earliest) earliest = value
  }
  return earliest
}

function registerRules(input: RecommendInput): Recommendation[] {
  const out: Recommendation[] = []
  for (const row of input.registers) {
    if (row.status === "disposed" || row.status === "retired") continue

    if (row.staleness === "stale" || (row.staleness === "unknown" && row.verifyIntervalDays !== null)) {
      const reason =
        row.lastVerifiedAt === null
          ? `It has never been verified, and its interval is ${row.verifyIntervalDays} day(s).`
          : `Last verified ${row.lastVerifiedAt}; the interval is ${row.verifyIntervalDays} day(s).`
      out.push({
        id: `stale_register:${row.id}`,
        kind: "stale_register",
        why: `${row.title} is not current. ${reason}`,
        action: "Verify it now",
        href: HREF.registers,
        confidence: row.staleness === "stale" ? 0.9 : 0.6,
        refs: [{ table: "register_items", id: row.id }],
      })
    }

    const due = renewalDue(row.fields)
    if (due && due < input.today) {
      const overdueBy = daysBetween(due, input.today)
      out.push({
        id: `overdue_renewal:${row.id}`,
        kind: "overdue_renewal",
        why: `${row.title} renews on ${due}, ${overdueBy} day(s) overdue.`,
        action: "Start the renewal",
        href: HREF.registers,
        confidence: 0.85,
        refs: [{ table: "register_items", id: row.id }],
      })
    }
  }
  return out
}

function deliverableRules(input: RecommendInput): Recommendation[] {
  return input.deliverables.flatMap((row) => {
    if (row.status !== "in_review") return []
    const days = daysBetween(row.updatedOn, input.today)
    if (days < STUCK_DAYS) return []
    return [
      {
        id: `deliverable_stuck:${row.id}`,
        kind: "deliverable_stuck" as const,
        why: `${row.name} has been in review for ${days} day(s).`,
        action: "Open it in the work log",
        href: HREF.worklog,
        confidence: 0.7,
        refs: [{ table: "deliverables" as const, id: row.id }],
      },
    ]
  })
}

function careerRules(input: RecommendInput): Recommendation[] {
  const career = input.career
  if (!career || career.gaps.length === 0) return []
  const gap = [...career.gaps]
    .filter((entry) => entry.actual < entry.target)
    .sort((a, b) => (b.target - b.actual) / Math.max(b.target, 1) - (a.target - a.actual) / Math.max(a.target, 1))[0]
  if (!gap) return []
  return [
    {
      id: `career_gap:${gap.key}`,
      kind: "career_gap",
      why: `${gap.label}: ${gap.actual} of ${gap.target} recorded toward ${
        career.nextTitle ?? "the next rung"
      }.`,
      action: "Open the career page",
      href: HREF.career,
      confidence: 0.6,
      refs: career.levelId ? [{ table: "career_levels", id: career.levelId }] : [],
    },
  ]
}

function reportRules(input: RecommendInput): Recommendation[] {
  return input.periods.flatMap((period) => {
    if (!period.hasEntries || period.hasReport) return []
    return [
      {
        id: `report_missing:${period.periodType}:${period.periodStart}`,
        kind: "report_missing" as const,
        why: `No ${period.periodType} report for ${period.periodStart} – ${period.periodEnd}, and that period has work in it.`,
        action: "Draft the report",
        href: HREF.reports,
        confidence: 0.8,
        refs: [],
      },
    ]
  })
}

function logRule(input: RecommendInput): Recommendation[] {
  if (input.entriesToday > 0) return []
  return [
    {
      id: "missing_log:today",
      kind: "missing_log",
      why: "Nothing is logged for today yet. The report can only show what was recorded.",
      action: "Open the work log",
      href: HREF.worklog,
      confidence: 0.4,
      refs: [],
    },
  ]
}

export function buildRecommendations(
  input: RecommendInput,
  cap = MAX_RECOMMENDATIONS,
): Recommendation[] {
  const all = [
    ...registerRules(input),
    ...reportRules(input),
    ...deliverableRules(input),
    ...careerRules(input),
    ...logRule(input),
  ]
  const seen = new Set<string>()
  return all
    .filter((entry) => (seen.has(entry.id) ? false : (seen.add(entry.id), true)))
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    .slice(0, cap)
}

export const RECOMMEND_SYSTEM = `You suggest at most three next actions for a member, using only the facts the caller gives.

- Every suggestion must name at least one row from the facts by its id, using the same table name.
- Never write a number that is not already in the facts. Do not estimate, round or compute a new count.
- Link only to the member's own pages, chosen from the allowed href list.
- If the facts do not support an additional suggestion beyond the rules already found, return an empty list.`

export const RECOMMEND_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          why: { type: "string" },
          action: { type: "string" },
          href: { type: "string" },
          confidence: { type: "number" },
          refs: {
            type: "array",
            items: {
              type: "object",
              properties: { table: { type: "string" }, id: { type: "number" } },
              required: ["table", "id"],
            },
          },
        },
        required: ["why", "action", "href", "refs"],
      },
    },
  },
  required: ["suggestions"],
}

/** The text the number rule checks against: every id, date, count and target in the input. */
export function factText(input: RecommendInput): string {
  return JSON.stringify({
    today: input.today,
    entriesToday: input.entriesToday,
    registers: input.registers.map((row) => ({
      id: row.id,
      title: row.title,
      lastVerifiedAt: row.lastVerifiedAt,
      verifyIntervalDays: row.verifyIntervalDays,
      fields: row.fields,
    })),
    deliverables: input.deliverables,
    periods: input.periods,
    career: input.career,
  })
}

export function recommendationPrompt(input: RecommendInput, rules: readonly Recommendation[]): string {
  return [
    "Facts:",
    factText(input),
    "",
    "Rules already found (do not repeat them):",
    JSON.stringify(rules.map((entry) => ({ id: entry.id, why: entry.why }))),
    "",
    `Allowed hrefs: ${AI_HREF_PREFIXES.join(", ")}`,
  ].join("\n")
}

const aiSchema = z.object({
  suggestions: z
    .array(
      z.object({
        why: z.string().optional(),
        action: z.string().optional(),
        href: z.string().optional(),
        confidence: z.number().optional(),
        refs: z
          .array(z.object({ table: z.string().optional(), id: z.number().optional() }))
          .optional(),
      }),
    )
    .default([]),
})

const TABLES = new Set<string>([
  "register_items",
  "deliverables",
  "work_reports",
  "career_levels",
  "work_log_entries",
])

function knownIds(input: RecommendInput): Map<string, Set<number>> {
  return new Map([
    ["register_items", new Set(input.registers.map((row) => row.id))],
    ["deliverables", new Set(input.deliverables.map((row) => row.id))],
    ["career_levels", new Set(input.career?.levelId ? [input.career.levelId] : [])],
  ])
}

const NUMBER = /\d+(?:\.\d+)?/g

function numbersAppear(text: string, facts: string): boolean {
  const tokens = text.match(NUMBER) ?? []
  const haystack = facts.match(NUMBER) ?? []
  const available = new Set(haystack)
  return tokens.every((token) => available.has(token))
}

export function readAiSuggestions(raw: unknown, input: RecommendInput): Recommendation[] {
  let parsed: z.infer<typeof aiSchema>
  try {
    parsed = aiSchema.parse(raw)
  } catch {
    throw new GeminiError("badjson", "The suggestion answer was not a list.")
  }

  const facts = factText(input)
  const ids = knownIds(input)
  const out: Recommendation[] = []

  for (const entry of parsed.suggestions) {
    const why = (entry.why ?? "").trim()
    const action = (entry.action ?? "").trim()
    const href = (entry.href ?? "").trim()
    if (!why || why.length > 240 || !action || action.length > 120) continue
    if (/[\r\n]/.test(why) || /[\r\n]/.test(action) || /[\r\n]/.test(href)) continue
    if (href.includes("//") || !AI_HREF_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}?`))) {
      continue
    }
    if (!numbersAppear(`${why} ${action}`, facts)) continue

    const refs: RecommendRef[] = []
    for (const ref of entry.refs ?? []) {
      if (typeof ref.table !== "string" || typeof ref.id !== "number") continue
      if (!TABLES.has(ref.table)) continue
      if (!ids.get(ref.table)?.has(ref.id)) continue
      refs.push({ table: ref.table as RecommendRef["table"], id: ref.id })
    }
    if (refs.length === 0) continue

    out.push({
      id: `ai:${out.length + 1}`,
      kind: "ai",
      why,
      action,
      href,
      confidence: Math.min(0.95, Math.max(0.3, entry.confidence ?? 0.5)),
      refs,
    })
    if (out.length >= 3) break
  }

  if (out.length === 0) {
    throw new GeminiError("badjson", "No suggestion survived the grounding rules.")
  }
  return out
}
```

- [ ] **Step 5: Write `lib/recommend/read.ts`**

```ts
// The rows the rules read, loaded once per request and always scoped to the member. The
// client never sends facts: the route re-reads them so a suggestion cannot be steered by a
// tampered body.

import { and, count, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { deliverables, workLogEntries, workReports } from "@/drizzle/schema"
import { defaultDisciplineOf, loadVisibleRegisters, withState } from "@/lib/registers/read"
import type { SessionUser } from "@/lib/registers/session"
import { loadCareerProfile } from "@/lib/career/profile"
import { localDay, monthBoundsIso, shiftDays, weekStartIso } from "@/lib/worklog/local-day"
import type { RecommendInput, RecommendPeriod } from "./next"

export type RecommendGate = {
  session: SessionUser
  today: string
}

async function entriesIn(userId: number, from: string, to: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(workLogEntries)
    .where(
      and(
        eq(workLogEntries.userId, userId),
        gte(workLogEntries.workedOn, from),
        lte(workLogEntries.workedOn, to),
      ),
    )
  return Number(row?.total ?? 0)
}

async function hasReport(userId: number, periodType: "weekly" | "monthly", periodStart: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workReports.id })
    .from(workReports)
    .where(
      and(
        eq(workReports.userId, userId),
        eq(workReports.periodType, periodType),
        eq(workReports.periodStart, periodStart),
      ),
    )
    .limit(1)
  return Boolean(row)
}

export async function loadRecommendInput(gate: RecommendGate): Promise<RecommendInput> {
  const { session, today } = gate
  const viewer = { id: session.id, admin: false }

  const registers = withState(await loadVisibleRegisters(viewer), today).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    lastVerifiedAt: row.lastVerifiedAt,
    verifyIntervalDays: row.verifyIntervalDays,
    fields: row.fields,
    staleness: row.staleness,
  }))

  const [todayCount] = await db
    .select({ total: count() })
    .from(workLogEntries)
    .where(and(eq(workLogEntries.userId, session.id), eq(workLogEntries.workedOn, today)))

  const deliverableRows = await db
    .select({
      id: deliverables.id,
      name: deliverables.name,
      status: deliverables.status,
      updatedAt: deliverables.updatedAt,
    })
    .from(deliverables)
    .where(or(eq(deliverables.ownerId, session.id), eq(deliverables.createdBy, session.id)))
    .limit(200)

  const periods: RecommendPeriod[] = []

  const weekStart = shiftDays(weekStartIso(today), -7)
  const weekEnd = shiftDays(weekStart, 6)
  periods.push({
    periodType: "weekly",
    periodStart: weekStart,
    periodEnd: weekEnd,
    hasEntries: (await entriesIn(session.id, weekStart, weekEnd)) > 0,
    hasReport: await hasReport(session.id, "weekly", weekStart),
  })

  if (Number(today.slice(8, 10)) <= 7) {
    const monthStart = shiftDays(`${today.slice(0, 7)}-01`, -1)
    const bounds = monthBoundsIso(monthStart)
    periods.push({
      periodType: "monthly",
      periodStart: bounds.from,
      periodEnd: bounds.to,
      hasEntries: (await entriesIn(session.id, bounds.from, bounds.to)) > 0,
      hasReport: await hasReport(session.id, "monthly", bounds.from),
    })
  }

  const profile = await loadCareerProfile({
    userId: session.id,
    discipline: defaultDisciplineOf(session),
    timeZone: session.timezone,
  })

  const career = profile.next
    ? {
        levelId: profile.next.id,
        nextTitle: profile.next.title,
        gaps: (profile.readiness?.gaps ?? []).map((gap) => ({
          key: gap.key,
          label: gap.label,
          actual: gap.actual,
          target: gap.target,
        })),
      }
    : null

  return {
    today,
    registers,
    entriesToday: Number(todayCount?.total ?? 0),
    deliverables: deliverableRows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      updatedOn: localDay(row.updatedAt, session.timezone),
    })),
    periods,
    career,
  }
}
```

Add `gte` and `lte` to the drizzle import at the top: `import { and, count, eq, gte, lte, or } from "drizzle-orm"`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/recommend-next.test.ts tests/unit/career-profile.test.ts 2>/dev/null || npx vitest run tests/unit/recommend-next.test.ts`
Expected: PASS. Then `npx tsc --noEmit` — 0 errors.

- [ ] **Step 7: Commit**

```bash
git add lib/recommend lib/career/profile.ts tests/unit/recommend-next.test.ts
git commit -m "feat(agent): rules for what to do next, and the grounding test its AI twin must pass"
git push
```

---

### Task 4: The handover routes

**Files:**
- Create: `app/api/agent/_shared.ts`, `app/api/agent/handover/route.ts`, `app/api/agent/handover/commit/route.ts`
- Test: `tests/unit/agent-routes.test.ts`

**Interfaces:**
- Consumes: `getSession`, `localDay`, `isSuperAdmin`, `loadPacks`, `packByKey`, `defaultMethod`, `stripCredentialValues`, `readPlaybookInput`, `readRegisterFields`, `isRegisterCustody`.
- Produces:
  - `agentSession(): Promise<AgentGate | null>` where `AgentGate = { id, email, role, timezone, admin, today }`
  - `geminiFailure(error: unknown): NextResponse | null`
  - `POST /api/agent/handover` → `{ success, data: HandoverPreview }`
  - `POST /api/agent/handover/commit` → `{ success, data: { created: { registers: number; playbooks: number }, skipped: { title: string; reason: string }[] } }`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent-routes.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const ROUTES = [
  "app/api/agent/handover/route.ts",
  "app/api/agent/handover/commit/route.ts",
] as const

describe("the handover routes", () => {
  it.each(ROUTES)("%s exists", (file) => {
    expect(existsSync(resolve(process.cwd(), file))).toBe(true)
  })

  it.each(ROUTES)("%s is session-gated and dynamic", (file) => {
    const body = codeOnly(src(file))
    expect(body).toMatch(/await agentSession\(\)/)
    expect(body).toMatch(/401/)
    expect(body).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("previews without writing anything", () => {
    const route = codeOnly(src("app/api/agent/handover/route.ts"))
    expect(route).not.toMatch(/insert\(/)
    expect(route).not.toMatch(/update\(/)
    expect(route).toMatch(/geminiJson/)
    expect(route).toMatch(/readHandover\(/)
  })

  it("never logs the pasted source", () => {
    const route = codeOnly(src("app/api/agent/handover/route.ts"))
    expect(route).not.toMatch(/console\.log/)
    expect(route).not.toMatch(/console\.error\([^)]*text/)
  })

  it("takes exactly one source and bounds both", () => {
    const route = codeOnly(src("app/api/agent/handover/route.ts"))
    expect(route).toMatch(/MAX_TEXT = 60_000/)
    expect(route).toMatch(/MAX_PDF_BYTES = 15 \* 1024 \* 1024/)
    expect(route).toMatch(/application\\\/pdf|application\/pdf/)
  })

  it("commit re-runs the same validators instead of trusting the preview", () => {
    const route = codeOnly(src("app/api/agent/handover/commit/route.ts"))
    expect(route).toMatch(/stripCredentialValues\(/)
    expect(route).toMatch(/readPlaybookInput\(/)
    expect(route).toMatch(/isRegisterCustody\(/)
  })

  it("commit stamps provenance itself", () => {
    const route = codeOnly(src("app/api/agent/handover/commit/route.ts"))
    expect(route).toMatch(/source: "gemini"/)
    expect(route).toMatch(/aiMarked: true/)
    expect(route).toMatch(/status: "draft"/)
    expect(route).toMatch(/version: 1/)
    expect(route).toMatch(/authorId: gate\.id/)
    expect(route).not.toMatch(/insert\(tasks\)/)
  })

  it("commit dedupes by pack, kind and title", () => {
    const route = codeOnly(src("app/api/agent/handover/commit/route.ts"))
    expect(route).toMatch(/toLowerCase\(\)/)
    expect(route).toMatch(/existing/)
  })

  it("maps provider failures to honest statuses", () => {
    const shared = codeOnly(src("app/api/agent/_shared.ts"))
    expect(shared).toMatch(/"auth"\]\) return bad\([^)]*503/)
    expect(shared).toMatch(/"quota"\]\) return bad\([^)]*429/)
    expect(shared).toMatch(/"timeout"\]\) return bad\([^)]*504/)
    expect(shared).toMatch(/"blocked"\]\) return bad\([^)]*422/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/agent-routes.test.ts`
Expected: FAIL — missing files.

- [ ] **Step 3: Write `app/api/agent/_shared.ts`**

```ts
// One session gate and one provider-error map for the agent routes, so all four refuse an
// anonymous request the same way and no route leaks Google's status text to a client.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { GeminiError } from "@/lib/ai/gemini"
import { isSuperAdmin } from "@/lib/roles"
import { localDay } from "@/lib/worklog/local-day"

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export type AgentGate = {
  id: number
  email: string
  role?: string | null
  timezone?: string | null
  preferences?: unknown
  admin: boolean
  today: string
}

export async function agentSession(): Promise<AgentGate | null> {
  const session = await getSession()
  if (!session?.id) return null
  return {
    id: session.id,
    email: session.email,
    role: session.role,
    timezone: session.timezone,
    preferences: session.preferences,
    admin: isSuperAdmin(session),
    today: localDay(new Date(), session.timezone),
  }
}

const PROVIDER_MESSAGE: Record<string, string> = {
  auth: "AI drafting is not configured on this deployment.",
  quota: "The AI provider is rate-limited right now. Try again in a minute.",
  blocked: "The AI provider refused this content.",
  timeout: "The AI provider did not answer in time.",
  transport: "The AI provider could not be reached.",
  badjson: "The AI answer did not survive validation.",
}

export function geminiFailure(error: unknown): NextResponse | null {
  if (!(error instanceof GeminiError)) return null
  const status =
    error.kind === "auth"
      ? 503
      : error.kind === "quota"
        ? 429
        : error.kind === "timeout"
          ? 504
          : error.kind === "blocked"
            ? 422
            : 502
  return bad(PROVIDER_MESSAGE[error.kind] ?? "The AI provider failed.", status)
}
```

- [ ] **Step 4: Write `app/api/agent/handover/route.ts`**

```ts
// POST /api/agent/handover — preview only (design §16 entry 18). The pasted text or PDF lives
// in memory for this request and is never stored or logged; the response is normalised drafts
// plus the refusals, and the client decides what to commit. Credential values are refused by
// the prompt and again by `readHandover` before anything reaches the browser.

import { NextResponse } from "next/server"
import { geminiJson, type ContentPart } from "@/lib/ai/gemini"
import { HANDOVER_SCHEMA, HANDOVER_SYSTEM, handoverPrompt, readHandover } from "@/lib/agent/handover"
import { defaultMethod } from "@/lib/playbooks/method"
import { loadPacks } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { agentSession, bad, geminiFailure } from "../_shared"

export const dynamic = "force-dynamic"

export const MAX_TEXT = 60_000
export const MAX_PDF_BYTES = 15 * 1024 * 1024

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const packKey = typeof body.packKey === "string" ? body.packKey.trim() : ""
  if (!packKey) return bad("packKey is required")

  const text = typeof body.text === "string" ? body.text.trim() : ""
  const rawPdf = body.pdf as { mimeType?: unknown; data?: unknown } | undefined
  const pdf =
    rawPdf && typeof rawPdf.mimeType === "string" && typeof rawPdf.data === "string"
      ? { mimeType: rawPdf.mimeType, data: rawPdf.data }
      : null

  if (Boolean(text) === Boolean(pdf)) {
    return bad("Send either pasted text or one PDF, not both.")
  }
  if (text.length > MAX_TEXT) {
    return bad(`The pasted text is longer than ${MAX_TEXT} characters.`)
  }
  if (pdf) {
    if (pdf.mimeType !== "application/pdf") return bad("The attachment must be a PDF.")
    const bytes = Math.ceil((pdf.data.length * 3) / 4)
    if (bytes > MAX_PDF_BYTES) return bad("The PDF is larger than 15 MB.")
  }

  try {
    const packs = await loadPacks(false)
    const pack = packByKey(packs, packKey)
    if (!pack) return bad("That role pack does not exist or is inactive.", 404)

    const handoverPack = {
      packKey: pack.packKey,
      title: pack.title,
      kinds: pack.registerKinds.map((entry) => entry.key),
      method: defaultMethod(pack.method),
    }

    const contents: ContentPart[] = [
      {
        text: `${handoverPrompt({ pack: handoverPack, source: pdf ? "pdf" : "text" })}\n\n${text}`,
      },
    ]
    if (pdf) {
      contents.push({ inlineData: { mimeType: "application/pdf", data: pdf.data } })
    }

    const { data } = await geminiJson(
      {
        system: HANDOVER_SYSTEM,
        contents,
        responseSchema: HANDOVER_SCHEMA,
        temperature: 0.1,
        timeoutMs: 120_000,
      },
      (raw) => readHandover(raw, handoverPack),
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return geminiFailure(error) ?? bad("The handover could not be read.", 500)
  }
}
```

- [ ] **Step 5: Write `app/api/agent/handover/commit/route.ts`**

```ts
// POST /api/agent/handover/commit — the human's preview comes back, and every item is
// validated again by the same readers the manual forms use. Registers land as
// `source:"gemini"`; playbooks land as drafts with `aiMarked:true`, so publishing needs a
// human edit. Nothing here touches `tasks`.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { playbooks, registerItems } from "@/drizzle/schema"
import { stripCredentialValues } from "@/lib/agent/handover"
import { readPlaybookInput } from "@/lib/playbooks/fields"
import { defaultMethod } from "@/lib/playbooks/method"
import { isRegisterCustody } from "@/lib/registers/rules"
import { loadPacks } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { agentSession, bad } from "../../_shared"

export const dynamic = "force-dynamic"

const MAX_REGISTERS = 40
const MAX_PLAYBOOKS = 10

type Pairs = { key: string; value: string }[]

const pairsOf = (value: unknown): Pairs => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
      const row = entry as Record<string, unknown>
      if (typeof row.key !== "string") return []
      return [{ key: row.key, value: String(row.value ?? "") }]
    })
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, raw]) => ({
      key,
      value: String(raw ?? ""),
    }))
  }
  return []
}

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const packKey = typeof body.packKey === "string" ? body.packKey.trim() : ""
  if (!packKey) return bad("packKey is required")

  const registers = Array.isArray(body.registers) ? body.registers.slice(0, MAX_REGISTERS) : []
  const drafts = Array.isArray(body.playbooks) ? body.playbooks.slice(0, MAX_PLAYBOOKS) : []
  if (registers.length === 0 && drafts.length === 0) {
    return bad("Select at least one row to save.")
  }

  try {
    const packs = await loadPacks(false)
    const pack = packByKey(packs, packKey)
    if (!pack) return bad("That role pack does not exist or is inactive.", 404)

    const method = defaultMethod(pack.method)
    const kindKeys = new Set(pack.registerKinds.map((entry) => entry.key))
    const skipped: { title: string; reason: string }[] = []

    const result = await db.transaction(async (tx) => {
      const existingRegisters = await tx
        .select({ kind: registerItems.kind, title: registerItems.title })
        .from(registerItems)
        .where(eq(registerItems.packKey, pack.packKey))
        .limit(2000)
      const taken = new Set(
        existingRegisters.map((row) => `${row.kind}::${row.title.trim().toLowerCase()}`),
      )

      let createdRegisters = 0
      for (const entry of registers) {
        const row = (entry ?? {}) as Record<string, unknown>
        const title = typeof row.title === "string" ? row.title.trim() : ""
        const kind = typeof row.kind === "string" ? row.kind.trim() : ""
        if (!title || title.length > 200) {
          skipped.push({ title: title || "(untitled)", reason: "title must be 1-200 characters" })
          continue
        }
        if (!kindKeys.has(kind)) {
          skipped.push({ title, reason: "kind is not listed by this pack" })
          continue
        }
        const stripped = stripCredentialValues(pairsOf(row.fields), `${title}.fields`)
        if (stripped.refused.length > 0) {
          skipped.push({
            title,
            reason: stripped.refused.map((refusal) => refusal.path).join(", "),
          })
          continue
        }
        const custody = isRegisterCustody(row.custody) ? row.custody : "member"
        const key = `${kind}::${title.toLowerCase()}`
        if (taken.has(key)) {
          skipped.push({ title, reason: "already in the register" })
          continue
        }
        taken.add(key)

        await tx.insert(registerItems).values({
          packKey: pack.packKey,
          kind,
          title,
          fields: stripped.kept,
          status: "in_service",
          ownerId: gate.id,
          custody,
          verifyIntervalDays: null,
          parentId: null,
          source: "gemini",
        })
        createdRegisters += 1
      }

      const existingPlaybooks = await tx
        .select({ title: playbooks.title })
        .from(playbooks)
        .where(eq(playbooks.packKey, pack.packKey))
        .limit(2000)
      const takenTitles = new Set(existingPlaybooks.map((row) => row.title.trim().toLowerCase()))

      let createdPlaybooks = 0
      for (const entry of drafts) {
        const row = (entry ?? {}) as Record<string, unknown>
        const title = typeof row.title === "string" ? row.title.trim() : ""
        if (!title) {
          skipped.push({ title: "(untitled)", reason: "a playbook needs a title" })
          continue
        }
        if (takenTitles.has(title.toLowerCase())) {
          skipped.push({ title, reason: "a playbook with that title already exists in this pack" })
          continue
        }

        const read = readPlaybookInput({ ...row, packKey: pack.packKey, verifyIntervalDays: null }, method)
        if (!read.ok) {
          skipped.push({ title, reason: read.error })
          continue
        }
        takenTitles.add(title.toLowerCase())

        await tx.insert(playbooks).values({
          ...read.value,
          packKey: pack.packKey,
          status: "draft",
          version: 1,
          authorId: gate.id,
          source: "gemini",
          aiMarked: true,
        })
        createdPlaybooks += 1
      }

      return { registers: createdRegisters, playbooks: createdPlaybooks }
    })

    return NextResponse.json({ success: true, data: { created: result, skipped } })
  } catch (error) {
    console.error("Handover commit error:", error)
    return bad("The handover could not be saved.", 500)
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/unit/agent-routes.test.ts`
Expected: PASS (the commit/precautions/recommend guards are added in Task 5; this file's current cases all pass).

- [ ] **Step 7: Commit**

```bash
git add app/api/agent/_shared.ts app/api/agent/handover tests/unit/agent-routes.test.ts
git commit -m "feat(agent): preview a handover and commit only validated rows"
git push
```

---

### Task 5: The precautions and recommendations routes

**Files:**
- Create: `app/api/agent/precautions/route.ts`, `app/api/agent/recommendations/route.ts`
- Modify: `tests/unit/agent-routes.test.ts` (append the two groups below)

**Interfaces:**
- Consumes: `readPrecautionDraft`, `readPrecautions`, `precautionsPrompt`, `PRECAUTIONS_SCHEMA`, `PRECAUTIONS_SYSTEM`; `buildRecommendations`, `loadRecommendInput`, `readAiSuggestions`, `recommendationPrompt`, `RECOMMEND_SCHEMA`, `RECOMMEND_SYSTEM`.
- Produces:
  - `POST /api/agent/precautions` → `{ success, data: { suggestions: { text, why }[] } }`
  - `POST /api/agent/recommendations` body `{ ai?: boolean }` → `{ success, data: { rules, ai, aiAvailable, today } }`

- [ ] **Step 1: Extend the route test**

Append to `tests/unit/agent-routes.test.ts`:

```ts
describe("the agent's advice routes", () => {
  const ADVICE_ROUTES = [
    "app/api/agent/precautions/route.ts",
    "app/api/agent/recommendations/route.ts",
  ] as const

  it.each(ADVICE_ROUTES)("%s is session-gated and dynamic", (file) => {
    const body = codeOnly(src(file))
    expect(body).toMatch(/await agentSession\(\)/)
    expect(body).toMatch(/401/)
    expect(body).toMatch(/export const dynamic = "force-dynamic"/)
  })

  it("suggests precautions without writing one", () => {
    const route = codeOnly(src("app/api/agent/precautions/route.ts"))
    expect(route).toMatch(/readPrecautionDraft\(/)
    expect(route).toMatch(/readPrecautions\(/)
    expect(route).not.toMatch(/insert\(/)
    expect(route).not.toMatch(/update\(/)
  })

  it("re-reads the member's rows instead of trusting the request", () => {
    const route = codeOnly(src("app/api/agent/recommendations/route.ts"))
    expect(route).toMatch(/loadRecommendInput\(/)
    expect(route).toMatch(/buildRecommendations\(/)
    expect(route).not.toMatch(/body\.registers/)
    expect(route).not.toMatch(/insert\(/)
  })

  it("serves rules with no key and validates the AI twin", () => {
    const route = codeOnly(src("app/api/agent/recommendations/route.ts"))
    expect(route).toMatch(/GOOGLE_GEMINI_API_KEY/)
    expect(route).toMatch(/readAiSuggestions\(/)
    expect(route).toMatch(/aiAvailable/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/agent-routes.test.ts`
Expected: FAIL — the two advice route files do not exist.

- [ ] **Step 3: Write `app/api/agent/precautions/route.ts`**

```ts
// POST /api/agent/precautions — suggestions for the editor's unsaved draft. Nothing is
// stored: the member accepts a line into their own draft, and only saving the playbook
// writes anything. A provider failure is a 503, not an invented precaution.

import { NextResponse } from "next/server"
import { geminiJson } from "@/lib/ai/gemini"
import {
  PRECAUTIONS_SCHEMA,
  PRECAUTIONS_SYSTEM,
  precautionsPrompt,
  readPrecautionDraft,
  readPrecautions,
} from "@/lib/agent/precautions"
import { agentSession, bad, geminiFailure } from "../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const draft = readPrecautionDraft(body.playbook)
  if (!draft.ok) return bad(draft.error)

  try {
    const { data } = await geminiJson(
      {
        system: PRECAUTIONS_SYSTEM,
        contents: [{ text: precautionsPrompt(draft.value) }],
        responseSchema: PRECAUTIONS_SCHEMA,
        temperature: 0.3,
        timeoutMs: 45_000,
      },
      (raw) => readPrecautions(raw, draft.value.existing),
    )
    return NextResponse.json({ success: true, data: { suggestions: data } })
  } catch (error) {
    return geminiFailure(error) ?? bad("No precaution could be drafted.", 500)
  }
}
```

- [ ] **Step 4: Write `app/api/agent/recommendations/route.ts`**

```ts
// POST /api/agent/recommendations — the rule list always, the AI twin only when asked
// (design §12 item 6). The client sends a flag, never facts; the rows are re-read with the
// session, so a tampered body cannot steer what the member is shown. Nothing is persisted.

import { NextResponse } from "next/server"
import { geminiJson } from "@/lib/ai/gemini"
import {
  buildRecommendations,
  RECOMMEND_SCHEMA,
  RECOMMEND_SYSTEM,
  readAiSuggestions,
  recommendationPrompt,
  type Recommendation,
} from "@/lib/recommend/next"
import { loadRecommendInput } from "@/lib/recommend/read"
import { agentSession, bad, geminiFailure } from "../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const wantsAi = body.ai === true

  try {
    const input = await loadRecommendInput({
      session: {
        id: gate.id,
        email: gate.email,
        role: gate.role,
        timezone: gate.timezone,
        preferences: gate.preferences,
      },
      today: gate.today,
    })
    const rules = buildRecommendations(input)
    const aiAvailable = Boolean(process.env.GOOGLE_GEMINI_API_KEY)

    let ai: Recommendation[] = []
    if (wantsAi) {
      const { data } = await geminiJson(
        {
          system: RECOMMEND_SYSTEM,
          contents: [{ text: recommendationPrompt(input, rules) }],
          responseSchema: RECOMMEND_SCHEMA,
          temperature: 0.2,
          timeoutMs: 45_000,
        },
        (raw) => readAiSuggestions(raw, input),
      )
      ai = data
    }

    return NextResponse.json({
      success: true,
      data: { rules, ai, aiAvailable, today: gate.today },
    })
  } catch (error) {
    return geminiFailure(error) ?? bad("The suggestions could not be loaded.", 500)
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/agent-routes.test.ts && npx tsc --noEmit`
Expected: PASS; 0 type errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/agent/precautions app/api/agent/recommendations app/api/agent/_shared.ts tests/unit/agent-routes.test.ts
git commit -m "feat(agent): precaution suggestions and the grounded AI twin of the rules"
git push
```

---

### Task 6: The agent page, the sidebar entry and the editor button

**Files:**
- Create: `app/dashboard/agent/page.tsx`, `app/dashboard/agent/agent-client.tsx`
- Modify: `components/dashboard-layout.tsx:273-278` (entry after Playbooks)
- Modify: `app/dashboard/playbooks/[id]/playbook-editor.tsx` (state + save payload + Precautions card)
- Modify: `app/api/playbooks/[id]/route.ts:93`
- Test: `tests/unit/agent-page.test.ts`

**Interfaces:**
- Consumes: `HandoverPreview`, `HandoverRefusal`; `Recommendation`; `PrecautionSuggestion`; `SectionCard`, `EmptyNote`, `useToast`, `Tabs` (not required — two buttons), `Checkbox`, `Badge`, `Alert`, `Textarea`, `Input`, `Button`.
- Produces: the two tabs in the URL (`?tab=handover|recommendations`), commit payloads, and `aiMarked: true` on save when an AI precaution was accepted.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

const PAGE = "app/dashboard/agent/page.tsx"
const CLIENT = "app/dashboard/agent/agent-client.tsx"

describe("the agent page", () => {
  it("exists behind a Suspense boundary", () => {
    expect(existsSync(resolve(process.cwd(), PAGE))).toBe(true)
    const page = codeOnly(src(PAGE))
    expect(page).toMatch(/Suspense/)
    expect(page).toMatch(/AgentClient/)
    expect(page).toMatch(/force-dynamic/)
  })

  it("keeps the tab in the URL", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/useSearchParams/)
    expect(client).toMatch(/tab/)
    expect(client).toMatch(/recommendations/)
    expect(client).toMatch(/handover/)
  })

  it("says the source is sent to Google and not stored", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/not stored/)
    expect(client).toMatch(/Google/)
  })

  it("shows refusals as an alert and names the path", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/role="alert"/)
    expect(client).toMatch(/refusal\.path/)
  })

  it("previews and then commits the selected rows", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/\/api\/agent\/handover/)
    expect(client).toMatch(/\/api\/agent\/handover\/commit/)
    expect(client).toMatch(/selected/)
  })

  it("loads rules first and asks for the AI twin on a button", () => {
    const client = codeOnly(src(CLIENT))
    expect(client).toMatch(/\/api\/agent\/recommendations/)
    expect(client).toMatch(/ai: false/)
    expect(client).toMatch(/ai: true/)
    expect(client).toMatch(/aiAvailable/)
  })

  it("never injects model text as HTML", () => {
    expect(codeOnly(src(CLIENT))).not.toMatch(/dangerouslySetInnerHTML/)
  })

  it("has a sidebar entry next to the playbooks", () => {
    const layout = codeOnly(src("components/dashboard-layout.tsx"))
    expect(layout).toMatch(/title: "Agent"/)
    expect(layout).toMatch(/href: "\/dashboard\/agent"/)
  })

  it("renders a Suggest precautions button in the editor", () => {
    const editor = codeOnly(src("app/dashboard/playbooks/[id]/playbook-editor.tsx"))
    expect(editor).toMatch(/Suggest precautions/)
    expect(editor).toMatch(/\/api\/agent\/precautions/)
    expect(editor).toMatch(/aiMarked/)
  })

  it("lets the editor mark a row as containing model advice, but never unmark it", () => {
    const route = codeOnly(src("app/api/playbooks/[id]/route.ts"))
    expect(route).toMatch(/body\.aiMarked === true/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/agent-page.test.ts`
Expected: FAIL — page missing, sidebar entry missing.

- [ ] **Step 3: Create the page shell**

`app/dashboard/agent/page.tsx`:

```tsx
import { Suspense } from "react"
import AgentClient, { AgentSkeleton } from "./agent-client"

export const dynamic = "force-dynamic"

export default function AgentPage() {
  return (
    <Suspense fallback={<AgentSkeleton />}>
      <AgentClient />
    </Suspense>
  )
}
```

- [ ] **Step 4: Create `app/dashboard/agent/agent-client.tsx`**

Write the component below. It follows `registers-client.tsx` for styling: `SectionCard`, muted labels, `Alert` for errors, and plain buttons for the tabs (no new dependency).

```tsx
"use client"

// The agent's one door (design §16 entry 18). Handover is a preview: nothing is saved until
// the member ticks rows and commits, and the refusal panel names the field paths the server
// would not accept. Recommendations are rules first — the AI twin is a separate button, so a
// deployment with no key still gets the whole rule list.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Bot, FileText, Loader2, Sparkles, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { useToast } from "@/hooks/use-toast"
import type { HandoverPreview, HandoverPlaybookDraft, HandoverRegisterDraft } from "@/lib/agent/handover"
import type { Recommendation } from "@/lib/recommend/next"
import { cn } from "@/lib/utils"

type Tab = "handover" | "recommendations"

type PackSummary = { packKey: string; title: string }

const MAX_PDF_BYTES = 15 * 1024 * 1024

const tabOf = (raw: string | null): Tab => (raw === "recommendations" ? "recommendations" : "handover")

export function AgentSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export default function AgentClient() {
  const router = useRouter()
  const search = useSearchParams()
  const { toast } = useToast()
  const tab = tabOf(search.get("tab"))

  const [packs, setPacks] = useState<PackSummary[]>([])
  const [packKey, setPackKey] = useState("")
  const [text, setText] = useState("")
  const [pdf, setPdf] = useState<{ name: string; data: string } | null>(null)
  const [preview, setPreview] = useState<HandoverPreview | null>(null)
  const [chosenRegisters, setChosenRegisters] = useState<Set<number>>(new Set())
  const [chosenPlaybooks, setChosenPlaybooks] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rules, setRules] = useState<Recommendation[]>([])
  const [ai, setAi] = useState<Recommendation[]>([])
  const [aiAvailable, setAiAvailable] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [today, setToday] = useState("")

  const setTab = (next: Tab) => {
    router.replace(next === "handover" ? "/dashboard/agent" : "/dashboard/agent?tab=recommendations")
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await fetch("/api/registers?pack=", { cache: "no-store" })
      if (!result.ok || cancelled) return
      const json = await result.json().catch(() => null)
      const list = (json?.data?.packs ?? []) as PackSummary[]
      if (cancelled) return
      setPacks(list)
      setPackKey((current) => current || list[0]?.packKey || "")
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadRules = useCallback(async () => {
    setBusy(true)
    setError(null)
    const result = await fetch("/api/agent/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai: false }),
    })
    const json = await result.json().catch(() => null)
    setBusy(false)
    if (!result.ok) {
      setError(json?.error ?? "The suggestions could not be loaded.")
      return
    }
    setRules((json?.data?.rules ?? []) as Recommendation[])
    setAiAvailable(Boolean(json?.data?.aiAvailable))
    setToday(String(json?.data?.today ?? ""))
  }, [])

  useEffect(() => {
    if (tab === "recommendations" && rules.length === 0) void loadRules()
  }, [tab, rules.length, loadRules])

  const readPdf = async (file: File | null) => {
    if (!file) {
      setPdf(null)
      return
    }
    if (file.type !== "application/pdf") {
      setError("Choose a PDF file.")
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("The PDF is larger than 15 MB.")
      return
    }
    const buffer = await file.arrayBuffer()
    let binary = ""
    const bytes = new Uint8Array(buffer)
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
    setPdf({ name: file.name, data: btoa(binary) })
  }

  const extract = async () => {
    setBusy(true)
    setError(null)
    setPreview(null)
    const payload: Record<string, unknown> = { packKey }
    if (pdf) payload.pdf = { mimeType: "application/pdf", data: pdf.data }
    else payload.text = text

    const result = await fetch("/api/agent/handover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await result.json().catch(() => null)
    setBusy(false)
    if (!result.ok) {
      setError(json?.error ?? "The handover could not be read.")
      return
    }
    const data = json.data as HandoverPreview
    setPreview(data)
    setChosenRegisters(new Set(data.registers.map((_, index) => index)))
    setChosenPlaybooks(new Set(data.playbooks.map((_, index) => index)))
  }

  const commit = async () => {
    if (!preview) return
    setBusy(true)
    setError(null)
    const registers = preview.registers.filter((_, index) => chosenRegisters.has(index))
    const playbooks = preview.playbooks.filter((_, index) => chosenPlaybooks.has(index))
    const result = await fetch("/api/agent/handover/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packKey, registers, playbooks }),
    })
    const json = await result.json().catch(() => null)
    setBusy(false)
    if (!result.ok) {
      setError(json?.error ?? "The handover could not be saved.")
      return
    }
    const created = json.data.created as { registers: number; playbooks: number }
    const skipped = (json.data.skipped ?? []) as { title: string; reason: string }[]
    toast({
      title: "Saved",
      description: `${created.registers} register row(s), ${created.playbooks} playbook draft(s)${
        skipped.length ? `; ${skipped.length} skipped` : ""
      }.`,
    })
    setPreview(null)
    setText("")
    setPdf(null)
  }

  const askAi = async () => {
    setAiBusy(true)
    setAiError(null)
    const result = await fetch("/api/agent/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai: true }),
    })
    const json = await result.json().catch(() => null)
    setAiBusy(false)
    if (!result.ok) {
      setAiError(json?.error ?? "The AI suggestions did not survive grounding.")
      return
    }
    setAi((json?.data?.ai ?? []) as Recommendation[])
  }

  const toggle = (set: Set<number>, index: number, apply: (next: Set<number>) => void) => {
    const next = new Set(set)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    apply(next)
  }

  const chosenCount = chosenRegisters.size + chosenPlaybooks.size
  const sortedRules = useMemo(() => [...rules, ...ai], [rules, ai])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Bot className="h-5 w-5" /> Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Read a handover into the register and the playbook library, and see what to do next.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "handover" ? "secondary" : "ghost"} onClick={() => setTab("handover")}>
            Handover
          </Button>
          <Button
            variant={tab === "recommendations" ? "secondary" : "ghost"}
            onClick={() => setTab("recommendations")}
          >
            What next
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {tab === "handover" ? (
        <>
          <SectionCard title="The handover" icon={<Upload className="h-4 w-4" />}>
            <div className="space-y-3">
              <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor="agent-pack" className="text-xs text-muted-foreground">
                  Which role pack?
                </Label>
                <select
                  id="agent-pack"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={packKey}
                  onChange={(event) => setPackKey(event.target.value)}
                >
                  {packs.map((pack) => (
                    <option key={pack.packKey} value={pack.packKey}>
                      {pack.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-text" className="text-xs text-muted-foreground">
                  Paste the brief
                </Label>
                <Textarea
                  id="agent-text"
                  rows={8}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value)
                    if (event.target.value) setPdf(null)
                  }}
                  placeholder="Infrastructure, accounts, equipment, outstanding work…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-pdf" className="text-xs text-muted-foreground">
                  …or attach one PDF (15 MB)
                </Label>
                <Input
                  id="agent-pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    void readPdf(event.target.files?.[0] ?? null)
                    if (event.target.files?.[0]) setText("")
                  }}
                />
                {pdf ? <p className="text-xs text-muted-foreground">{pdf.name}</p> : null}
              </div>

              <p className="text-xs text-muted-foreground">
                The pasted text or PDF is sent to Google for processing and is not stored. Credential
                values are refused; record where each one is kept instead.
              </p>

              <Button onClick={() => void extract()} disabled={busy || !packKey || (!text.trim() && !pdf)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Extract preview
              </Button>
            </div>
          </SectionCard>

          {preview ? (
            <>
              {preview.refusals.length > 0 ? (
                <Alert role="alert">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Not included</p>
                    <ul className="mt-1 list-disc pl-4 text-sm">
                      {preview.refusals.map((refusal, index) => (
                        <li key={`${refusal.path}-${index}`}>
                          <span className="font-mono text-xs">{refusal.path}</span> — {refusal.reason}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <SectionCard title="Register rows" icon={<FileText className="h-4 w-4" />}>
                {preview.registers.length === 0 ? (
                  <EmptyNote>No register rows were found.</EmptyNote>
                ) : (
                  <div className="space-y-2">
                    {preview.registers.map((row: HandoverRegisterDraft, index) => (
                      <label
                        key={`${row.kind}-${row.title}-${index}`}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                          chosenRegisters.has(index) && "border-primary/50 bg-muted/40",
                        )}
                      >
                        <Checkbox
                          checked={chosenRegisters.has(index)}
                          onCheckedChange={() =>
                            toggle(chosenRegisters, index, setChosenRegisters)
                          }
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {row.title}
                            <Badge variant="outline">{row.kind}</Badge>
                            <Badge variant="secondary">{row.custody}</Badge>
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {Object.entries(row.fields)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" · ") || "No fields recorded"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Playbook drafts" icon={<Sparkles className="h-4 w-4" />}>
                {preview.playbooks.length === 0 ? (
                  <EmptyNote>No procedures were found.</EmptyNote>
                ) : (
                  <div className="space-y-2">
                    {preview.playbooks.map((row: HandoverPlaybookDraft, index) => (
                      <label
                        key={`${row.title}-${index}`}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                          chosenPlaybooks.has(index) && "border-primary/50 bg-muted/40",
                        )}
                      >
                        <Checkbox
                          checked={chosenPlaybooks.has(index)}
                          onCheckedChange={() =>
                            toggle(chosenPlaybooks, index, setChosenPlaybooks)
                          }
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {row.title}
                            <Badge variant="outline">AI draft</Badge>
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {row.steps.length} step(s), {row.precautions.length} precaution(s)
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </SectionCard>

              <div className="flex items-center gap-3">
                <Button onClick={() => void commit()} disabled={busy || chosenCount === 0}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save {chosenCount} selected
                </Button>
                <p className="text-xs text-muted-foreground">
                  Model drafts stay marked until a person edits and publishes them.
                </p>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <SectionCard title="What next" icon={<Sparkles className="h-4 w-4" />}>
            <div className="space-y-2">
              {busy && rules.length === 0 ? <Skeleton className="h-24 w-full" /> : null}
              {!busy && sortedRules.length === 0 ? (
                <EmptyNote>Nothing to suggest right now.{today ? ` Checked ${today}.` : ""}</EmptyNote>
              ) : null}
              {sortedRules.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={entry.kind === "ai" ? "secondary" : "outline"}>
                      {entry.kind === "ai" ? "AI suggestion" : entry.kind.replaceAll("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(entry.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{entry.why}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={entry.href}>{entry.action}</Link>
                    </Button>
                    {entry.refs.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        from {entry.refs.map((ref) => `${ref.table} #${ref.id}`).join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => void askAi()}
              disabled={aiBusy || !aiAvailable}
            >
              {aiBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Add AI suggestions
            </Button>
            <p className="text-xs text-muted-foreground">
              {aiAvailable
                ? "A suggestion is kept only if the rows it names exist and every number it writes is already in your data."
                : "AI suggestions are not configured; the rules above work without a key."}
            </p>
          </div>

          {aiError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{aiError}</AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add the sidebar entry**

In `components/dashboard-layout.tsx`, after the Playbooks item (line 278), insert:

```tsx
        {
          title: "Agent",
          icon: <Bot className="h-5 w-5" />,
          href: "/dashboard/agent",
          active: pathname === "/dashboard/agent",
        },
```

`Bot` is already imported at line 31.

- [ ] **Step 6: Let PATCH mark a row as containing model advice**

In `app/api/playbooks/[id]/route.ts`, replace the `aiMarked` line (currently line 93) with:

```ts
      aiMarked:
        body.aiMarked === true
          ? true
          : contentEdited && row.source === "gemini"
            ? false
            : row.aiMarked,
```

The body may only ever set the flag to `true`; clearing stays a human content edit on a model draft.

- [ ] **Step 7: Add the editor's Suggest precautions flow**

In `app/dashboard/playbooks/[id]/playbook-editor.tsx`:

1. Add imports:

```ts
import type { PrecautionSuggestion } from "@/lib/agent/precautions"
```

2. Add state next to the other `useState` hooks near the top of the component:

```ts
  const [precautionIdeas, setPrecautionIdeas] = useState<PrecautionSuggestion[]>([])
  const [precautionBusy, setPrecautionBusy] = useState(false)
  const [precautionError, setPrecautionError] = useState<string | null>(null)
  const [aiTouched, setAiTouched] = useState(false)
```

3. Add the two handlers above `save`:

```ts
  const suggestPrecautions = useCallback(async () => {
    if (!draft) return
    const method = lines(draft.method)
    const steps = draft.steps
      .filter((step) => step.action.trim())
      .map((step) => ({ phase: step.phase, action: step.action.trim() }))
    if (steps.length === 0) {
      setPrecautionError("Add at least one step with an action first.")
      return
    }
    setPrecautionBusy(true)
    setPrecautionError(null)
    const result = await send("/api/agent/precautions", {
      method: "POST",
      body: JSON.stringify({
        playbook: {
          title: draft.title,
          summary: draft.summary.trim() || null,
          method,
          steps,
          existing: lines(draft.precautions),
        },
      }),
    })
    setPrecautionBusy(false)
    if (result.error) {
      setPrecautionError(result.error)
      return
    }
    setPrecautionIdeas((result.json?.data?.suggestions ?? []) as PrecautionSuggestion[])
  }, [draft, send])

  const acceptPrecaution = useCallback(
    (idea: PrecautionSuggestion) => {
      if (!draft) return
      const current = lines(draft.precautions)
      const exists = current.some((line) => line.toLowerCase() === idea.text.toLowerCase())
      const next = exists ? current : [...current, idea.text]
      setDraft({ ...draft, precautions: next.join("\n") })
      setAiTouched(true)
      setPrecautionIdeas((ideas) => ideas.filter((entry) => entry.text !== idea.text))
    },
    [draft],
  )
```

Check whether `send` accepts a `body` string or an init object: it is used above as `send(url, { method: "POST" })` and `send(url, jsonInit("PATCH", {...}))`. Use the existing helper instead of a raw `body` field:

```ts
    const result = await send(
      "/api/agent/precautions",
      jsonInit("POST", {
        playbook: {
          title: draft.title,
          summary: draft.summary.trim() || null,
          method,
          steps,
          existing: lines(draft.precautions),
        },
      }),
    )
```

4. In `save`, extend the PATCH payload:

```ts
        tags: tagsOf(draft.tags),
        ...(aiTouched ? { aiMarked: true } : {}),
```

5. In the Precautions `SectionCard` (currently `app/dashboard/playbooks/[id]/playbook-editor.tsx:792-804`), add above the textarea:

```tsx
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Model advice stays marked on the printed sheet.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void suggestPrecautions()}
                disabled={precautionBusy || !draft.title.trim()}
              >
                {precautionBusy ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3 w-3" />
                )}
                Suggest precautions
              </Button>
            </div>
            {precautionError ? (
              <p className="text-xs text-destructive" role="alert">
                {precautionError}
              </p>
            ) : null}
            {precautionIdeas.length > 0 ? (
              <ul className="space-y-2">
                {precautionIdeas.map((idea) => (
                  <li key={idea.text} className="rounded-md border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm">{idea.text}</span>
                      <Badge variant="secondary">AI suggestion</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{idea.why}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => acceptPrecautions(idea)}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPrecautionIdeas((ideas) => ideas.filter((entry) => entry.text !== idea.text))
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
```

Use `acceptPrecaution(idea)` (the callback name), not `acceptPrecautions`.

6. Import `Loader2` from `lucide-react` (add to the existing import list).

- [ ] **Step 8: Run the page test and typecheck**

Run: `npx vitest run tests/unit/agent-page.test.ts && npx tsc --noEmit`
Expected: PASS; 0 type errors. Fix any local naming mismatch (e.g. `send`/`jsonInit` signatures) by reading the helper at the top of `playbook-editor.tsx` — do not invent a new fetch helper.

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/agent components/dashboard-layout.tsx "app/dashboard/playbooks/[id]/playbook-editor.tsx" "app/api/playbooks/[id]/route.ts" tests/unit/agent-page.test.ts
git commit -m "feat(agent): one page for handover and what-next, and a precaution button in the editor"
git push
```

---

### Task 7: Docs, the spec stamp and the four gates

**Files:**
- Modify: `FEATURES.md`, `README.md`, `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`
- Possibly modify: `PLACEHOLDERS.md` if it still lists phase 18 as unbuilt (check with `grep -n "18" PLACEHOLDERS.md`)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Run the full suite first and record the counts**

Run: `npm test`
Expected: green. Note the final line, e.g. `Test Files  98 passed (98)` / `Tests  1700 passed (1700)`. Use those two numbers in Step 3.

- [ ] **Step 2: Add FEATURES §23**

After §22 (onboarding), add:

```markdown
## 23. Agent entry (phase 18, 2026-10-27)

- **One page, two jobs.** `/dashboard/agent` keeps `?tab=handover` (default) and `?tab=recommendations` in the URL, so a link opens the same list.
- **Handover is preview → commit.** `POST /api/agent/handover` reads a pasted brief or one PDF against a chosen role pack and returns normalised register rows, playbook drafts and a refusal list. It writes nothing, stores neither the text nor the PDF, and never logs them.
- **The second door is the same validator.** `POST /api/agent/handover/commit` re-runs `stripCredentialValues`, `readRegisterFields`, `isRegisterCustody` and `readPlaybookInput` on everything the browser sends back, dedupes registers by `(packKey, kind, title)` and playbooks by `(packKey, title)`, and reports each skipped row by title and reason — never by the value it refused.
- **Provenance is decided by the server.** Committed registers are `source: "gemini"`; committed playbooks are `status: "draft"`, `version: 1`, `authorId` = the session, `source: "gemini"`, `aiMarked: true`. The publish gate from phase 16 is unchanged, so a model draft still needs a human edit before anyone can rely on it.
- **Precautions come from the unsaved draft.** `POST /api/agent/precautions` takes the editor's current title, method and steps and returns 3–6 `{text, why}`. A suggestion is dropped if it is over 200 characters, duplicates a line a person wrote, or asks for a credential value; if none survives, the answer is a 502 rather than a guess. Accepting one appends it to the draft and marks the row, so the printed sheet's "Precautions (model-drafted)" heading is true.
- **Rules first, AI second.** `lib/recommend/next.ts` holds six rules — `stale_register`, `overdue_renewal`, `deliverable_stuck` (3 days in review), `career_gap`, `report_missing` (a period with work and no report), `missing_log` — each with `{id, kind, why, action, href, confidence, refs}`, capped at 8 and ordered by confidence. `POST /api/agent/recommendations` re-reads the member's rows server-side and returns them with no key at all.
- **The AI twin cannot invent.** `{ai: true}` adds at most three suggestions; each must name a row whose id exists in the member's own facts, link to a known internal page, and write no number that is not already in the facts. An answer that loses every suggestion is a 502 with nothing rendered. Nothing is persisted — every item is a proposal whose button opens the real form.
- **Machine advice is labelled everywhere it appears.** The page badges AI rows, the editor badges each suggestion, and both say the line stays marked on the printed sheet.
- **Deliberately absent.** No handover is stored as a document, no suggestion writes a `tasks` row (promotion is still the only path), and no register value is ever treated as a credential store.
- Guards: `agent-handover`, `agent-precautions`, `recommend-next`, `agent-routes`, `agent-page` — five files. Suite: <files> files / <tests> tests.
```

Replace `<files>` and `<tests>` with the Step 1 numbers.

- [ ] **Step 3: Update README**

- Layout: add `app/dashboard/agent/`, and `app/api/agent/` with its four routes.
- Change the route-handler count from 172 to 176.
- Lib list: add `agent/` ("handover and precaution prompts, schemas and filters") and `recommend/` ("the six next-action rules and the AI twin's grounding check").
- Add a `## Agent entry` section: the preview/commit rule, the "source is sent to Google and not stored" disclosure, the credential refusal at both doors, and the rules-work-without-a-key promise.

- [ ] **Step 4: Stamp the spec**

In §16, after entry 18's bullets, add a paragraph:

```markdown
    *(shipped 2026-10-27)* — `lib/agent/{handover,precautions}.ts` and `lib/recommend/{next,read}.ts`, four
    routes under `/api/agent`, `/dashboard/agent` with both tabs, and the editor's suggestion button. No
    migration and no new env var: every table and the provider existed. The preview route writes nothing
    and stores neither the pasted text nor the PDF; commit re-validates every row through the manual
    validators and dedupes by pack/kind/title. Recommendations render from the six rules with no key; the
    AI twin keeps only suggestions whose refs exist and whose numbers already appear in the member's facts,
    and a 502 when none survives. Committed playbooks keep `source='gemini'` and `ai_marked` until a human
    edits them, so the phase-16 publish gate still applies. Suite at the end of this phase: <files> files /
    <tests> tests.
```

Replace the numbers from Step 1.

- [ ] **Step 5: Run the four gates**

Run each and paste the summary line into the commit body:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: tests green; tsc 0; lint 0 errors (the known Gantt error is the only tolerated one) and no new warnings; build lists `/dashboard/agent` and the four `/api/agent/*` routes.

- [ ] **Step 6: Commit and push**

```bash
git add FEATURES.md README.md docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md PLACEHOLDERS.md
git commit -m "docs(agent): record phase 18, the preview/commit rule and the grounding promise"
git push
```

---

### Task 8: The roadmap close

**Files:**
- Modify: `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md` (§16 preamble if it names remaining phases)
- Modify: project memory `jiravision-worklog-reports-phases` (description + phase-18 paragraph)

- [ ] **Step 1: Check the spec's phase preamble**

Run: `grep -n "Still not built\|remaining\|phases 17" docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`
If any sentence still says phases remain, replace it with "All eighteen phases are shipped as of 2026-10-27."

- [ ] **Step 2: Update the project memory**

Update `/Users/kiibridge-tech/.qoder/projects/-Users-kiibridge-tech-Desktop-Projects-jiravision/memory/jiravision-worklog-reports-phases.md`:
- Description → "phases 1-18 are shipped (18 = agent entry, no migration); the 18-phase roadmap is complete."
- Add a phase-18 paragraph with the four routes, the two tabs, the preview/commit rule, the six rules, the AI-twin validator, the editor button, and the suite counts from Task 7.
- Change the "Still not built" line to say the roadmap is complete, and keep the note that a later phase's table would need its own additive script and owner checkpoint.

Update the index line in `MEMORY.md` to match.

- [ ] **Step 3: Commit and push**

```bash
git add docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md
git commit -m "docs(agent): close the eighteen-phase roadmap"
git push
```

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| §12 item 4 — credential values refused twice over (prompt + validator at the boundary) | 1 (prompt + `stripCredentialValues`), 4 (commit re-runs it) |
| §12 item 5 — PDF/paste ingestion into register rows and playbook drafts, source/aiMarked kept | 1, 4 |
| §12 item 5 — model-authored precautions marked as such, never silently a company rule | 2, 6 (editor badge + `aiMarked`), 6 (PATCH may set true, never clear) |
| §12 item 6 — `lib/recommend/next.ts`, rule-based first, six rules, `{id, kind, why, action, href, confidence}` naming its rows | 3 |
| §16 entry 18 — "grounded precaution suggestions" and "the rule-based list gaining its AI twin" | 2, 3 (`readAiSuggestions`), 5 |
| §14 — session-scoped reads | 4 (`agentSession`), 5 (`loadRecommendInput`) |
| §17 — "a model-invented precaution", "the app turning into a password store" | 2 (drop rules + 502), 1/4 (key and value rules, no echo) |
| Provider-off behaviour | 5 (`aiAvailable`, rules-only response), 6 (button disabled with a reason) |
| No migration, no new env var, no `tasks` write | Global constraints; guards in 4 |

**Placeholder scan:** the only placeholders are `<files>`/`<tests>` in Task 7's docs text, and Task 7 Step 1 produces those numbers before Step 2/4 write them. Every code step carries real code; no "similar to Task N".

**Type consistency:** `HandoverPreview` is produced in Task 1 and consumed verbatim in Task 6; `HandoverPlaybookDraft` is `Omit<PlaybookInput, "packKey" | "verifyIntervalDays">`, which is exactly what the commit route re-wraps with `{...row, packKey, verifyIntervalDays: null}`. `Recommendation`/`Recommendation[]` is one type across Tasks 3, 5 and 6. `AgentGate.preferences` is added in Task 5's "Problem to fix" note, and Task 5's route passes it to `loadRecommendInput`, which needs it for `defaultDisciplineOf`.

---

## Execution record (2026-10-27)

All eight tasks shipped. Where the plan and the code disagreed, the tests and the lived
behaviour won; these are the differences a reader of the plan should know about.

| Plan said | What shipped | Why |
|---|---|---|
| Task 1 imports `type PlaybookStep` | Omitted | Nothing in `handover.ts` uses it; the import would trip `no-unused-vars`. |
| Task 2: ten precautions tests | Nine | The credential-prose and duplicate cases share one fixture; folding them lost no coverage. |
| Task 4: nested ternary maps provider failures to statuses | Data maps `PROVIDER_STATUS` / `PROVIDER_MESSAGE` in `app/api/agent/_shared.ts`, and the guard test asserts `/auth:\s*503/`, `/quota:\s*429/`, `/timeout:\s*504/`, `/blocked:\s*422/` | The plan's own regex could not match the plan's own nested ternary. A declaration can be read and tested; the syntax could not. |
| Task 4 re-validates with `stripCredentialValues`, `isRegisterCustody`, `readPlaybookInput` | Also `readRegisterFields` | The plan's Task 4 interface list and the FEATURES bullet both promise it; leaving it out would have made the docs untrue. |
| Task 5: eleven route tests | Sixteen | Provider-status mapping, gate, dynamic and "writes nothing" cases were split apart so a failure names one rule. |
| Task 6 calls `acceptPrecautions(idea)` | `acceptPrecaution(idea)` | The plan defines the singular callback and then calls the plural in the JSX. |
| Task 6 keeps `aiTouched` true for the session | Reset after a successful save | The PATCH rule lets `body.aiMarked === true` outrank `contentEdited`; without the reset, a later human edit could never clear the flag. |
| Task 7: no existing tests touched | `schema-safety.test.ts` learns `agentSession`; `playbook-routes.test.ts` asserts the new `aiMarked` rule | Both guards were pinning the old truth and failed on the first full run. |

Final gates: `npm test` 108 files / 1791 tests; `npm run typecheck` 0; `npm run lint` 0 errors
(the known Gantt `setState`-in-effect error only) and no new warnings; `npm run build` lists
`/dashboard/agent` and the four `/api/agent/*` routes. Docs count 176 route handlers and 43
dashboard pages, both checked against the tree.
