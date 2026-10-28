// Handover ingestion, pure side (design §12 item 4, §16 entry 18). A pasted brief or a PDF
// becomes register rows and playbook drafts — but every proposal passes the same validators
// the manual forms use, so the agent cannot smuggle a shape the form would reject. Credential
// values are refused here by key and by "written as an assignment" value, and the refusal
// names the path without ever repeating the value.

import { z } from "zod"
import { GeminiError, type JsonSchema } from "@/lib/ai/gemini"
import { readPlaybookInput, type PlaybookInput } from "@/lib/playbooks/fields"
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
    // Unbounded, a 240 KB handover produced ~12k tokens and took 49s; this bounds it to ~5.6k
    // and 27s. The reader drops anything past these caps anyway, so nothing usable is lost.
    "Keep every title, action and note to one short sentence, and fill the optional step fields only where the document states them.",
    `Propose at most ${MAX_PLAYBOOKS} playbooks of at most 12 steps, and at most ${MAX_REGISTERS} register rows — the ones a successor needs first.`,
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
