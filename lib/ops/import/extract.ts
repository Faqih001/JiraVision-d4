// Document extraction engine: sends a PDF/document to Gemini along with the pack's
// opsConfig schema, and receives structured data mapped to the pack's entities.
// One Gemini call per document — the free tier is 15 requests/day, so we cache the
// extraction result in the browser session to avoid re-hitting the API on retry.

import { geminiJson, GeminiError } from "@/lib/ai/gemini"
import type { OpsConfigValidated } from "@/lib/packs/ops/validator"
import {
  safeTaskStatus,
  safeTaskPriority,
  type ImportTaskStatus,
  type ImportTaskPriority,
} from "./preview"

export type ExtractedLogEntry = {
  entityKey: string
  occurredAt: string | null
  status: string | null
  fields: Record<string, unknown>
}

export type ExtractedRegisterItem = {
  kind: string
  title: string
  fields: Record<string, unknown>
}

export type ExtractedPlaybook = {
  title: string
  summary: string
  steps: string[]
}

export type ExtractedTask = {
  title: string
  description: string
  status: ImportTaskStatus
  priority: ImportTaskPriority
}

export type RegisterKindHint = { key: string; label: string }

/**
 * Naming context for the extraction prompt. The pack is discipline-scoped, so the prompt must
 * describe this member's discipline and their own register kinds — not a generic IT template.
 */
export type ExtractPromptMeta = {
  discipline: string
  registerKinds: RegisterKindHint[]
}

export type ExtractionResult = {
  logEntries: ExtractedLogEntry[]
  registerItems: ExtractedRegisterItem[]
  playbooks: ExtractedPlaybook[]
  tasks: ExtractedTask[]
}

export type ExtractionSummary = {
  logEntries: Record<string, number>
  registerItems: number
  playbooks: number
  tasks: number
  total: number
}

const EXTRACTION_SCHEMA = {
  type: "object" as const,
  properties: {
    logEntries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          entityKey: { type: "string" },
          occurredAt: { type: "string" },
          status: { type: "string" },
          fields: { type: "object" },
        },
        required: ["entityKey", "fields"],
      },
    },
    registerItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string" },
          title: { type: "string" },
          fields: { type: "object" },
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
          steps: { type: "array", items: { type: "string" } },
        },
        required: ["title", "summary", "steps"],
      },
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string" },
          priority: { type: "string" },
        },
        required: ["title", "description"],
      },
    },
  },
  required: ["logEntries", "registerItems", "playbooks", "tasks"],
}

function buildSystemPrompt(config: OpsConfigValidated, meta: ExtractPromptMeta): string {
  const entityDescriptions: string[] = []

  for (const [entityKey, entity] of Object.entries(config.logs)) {
    const fieldNames = Object.keys(entity.fields).join(", ")
    entityDescriptions.push(
      `- "${entityKey}" (${entity.label}): fields = [${fieldNames}]`,
    )
  }

  const kindDescriptions =
    meta.registerKinds.length > 0
      ? meta.registerKinds.map((kind) => `- "${kind.key}" (${kind.label})`).join("\n")
      : "- Use a short lowercase key that names the kind of thing (e.g. an asset, a record, a resource)."

  return `You are a document data extraction specialist. You receive a document (PDF, text, or spreadsheet export) and extract structured data from it.

The document belongs to a ${meta.discipline} operations context. Extract every concrete data record you can find and map it to one of these entity types:

LOG ENTITIES (operational records with dates and statuses):
${entityDescriptions.join("\n")}

REGISTER ITEMS (the durable things this role keeps — assets, records, resources; things that exist, not events):
- Extract each item as its own row with a "kind" chosen from the kinds this role actually tracks and a "title" (its name or identifier).
- The kinds for this role are:
${kindDescriptions}
- If an item clearly belongs to none of these kinds, use the closest one. Never invent a credential value; if the document shows one, record only where it is kept.

PLAYBOOKS (procedures, step-by-step instructions, processes):
- Extract any documented procedure with sequential steps.
- Each playbook gets a title, summary, and ordered list of steps.

TASKS (recurring work items, schedules, action items):
- Extract any recurring task, scheduled work, or action item.
- Each task gets a title and description. If the document states it, also give a status (one of: todo, in_progress, review, blocked, done) and a priority (one of: urgent, high, medium, low). Omit them if not stated.

RULES:
1. Only extract data that is explicitly present in the document. Do not invent or fabricate records.
2. Map each record to the most specific entity type available.
3. For log entries, use the exact field names listed above. If a field is not mentioned in the document, omit it.
4. For dates, use YYYY-MM-DD format. If only a relative reference exists (e.g., "daily", "weekly"), set occurredAt to null.
5. For enum fields, use only the values listed in the schema. If the document uses a synonym, pick the closest match.
6. Return empty arrays for categories where no data was found.
7. Be thorough — extract every record, not just a sample.`
}

function buildUserPrompt(): string {
  return "Extract all structured data from this document according to the schema. Return every record you find."
}

export async function extractFromDocument(
  config: OpsConfigValidated,
  mimeType: string,
  base64Data: string,
  meta: ExtractPromptMeta,
): Promise<ExtractionResult> {
  const system = buildSystemPrompt(config, meta)
  const userText = buildUserPrompt()

  const { data } = await geminiJson<ExtractionResult>(
    {
      system,
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        { text: userText },
      ],
      responseSchema: EXTRACTION_SCHEMA,
      timeoutMs: 120_000,
      thinkingBudget: 0,
      retries: 1,
    },
    (raw) => normaliseExtraction(raw),
  )

  return data
}

function normaliseExtraction(raw: unknown): ExtractionResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>

  return {
    logEntries: normaliseArray(obj.logEntries).map((entry) => ({
      entityKey: String(entry.entityKey ?? ""),
      occurredAt: typeof entry.occurredAt === "string" && entry.occurredAt ? entry.occurredAt : null,
      status: typeof entry.status === "string" && entry.status ? entry.status : null,
      fields: (entry.fields && typeof entry.fields === "object" ? entry.fields : {}) as Record<string, unknown>,
    })),
    registerItems: normaliseArray(obj.registerItems).map((item) => ({
      kind: String(item.kind ?? "asset"),
      title: String(item.title ?? "Untitled"),
      fields: (item.fields && typeof item.fields === "object" ? item.fields : {}) as Record<string, unknown>,
    })),
    playbooks: normaliseArray(obj.playbooks).map((pb) => ({
      title: String(pb.title ?? "Untitled procedure"),
      summary: String(pb.summary ?? ""),
      steps: Array.isArray(pb.steps) ? pb.steps.map(String) : [],
    })),
    tasks: normaliseArray(obj.tasks).map((task) => ({
      title: String(task.title ?? "Untitled task"),
      description: String(task.description ?? ""),
      status: safeTaskStatus(task.status),
      priority: safeTaskPriority(task.priority),
    })),
  }
}

function normaliseArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
}

export function summariseExtraction(result: ExtractionResult): ExtractionSummary {
  const logEntries: Record<string, number> = {}
  for (const entry of result.logEntries) {
    logEntries[entry.entityKey] = (logEntries[entry.entityKey] ?? 0) + 1
  }

  return {
    logEntries,
    registerItems: result.registerItems.length,
    playbooks: result.playbooks.length,
    tasks: result.tasks.length,
    total:
      result.logEntries.length +
      result.registerItems.length +
      result.playbooks.length +
      result.tasks.length,
  }
}

export function isGeminiQuotaError(error: unknown): boolean {
  return error instanceof GeminiError && error.kind === "quota"
}

export function isGeminiAuthError(error: unknown): boolean {
  return error instanceof GeminiError && error.kind === "auth"
}
