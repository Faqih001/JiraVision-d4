// Import commit engine: takes the extraction result and writes each category to its
// target table. Every row is validated against the pack's opsConfig field schema before
// insertion so a bad extraction never corrupts the log.

import { db } from "@/lib/db"
import { opsLogEntries, registerItems, playbooks, tasks } from "@/drizzle/schema"
import { validateFields } from "@/lib/ops/fields"
import { readRegisterFields } from "@/lib/registers/fields"
import { safeTaskStatus, safeTaskPriority } from "./preview"
import type { OpsConfigValidated } from "@/lib/packs/ops/validator"
import type {
  ExtractionResult,
  ExtractedLogEntry,
  ExtractedRegisterItem,
  ExtractedPlaybook,
  ExtractedTask,
} from "./extract"

export type CommitResult = {
  logEntries: { inserted: number; skipped: number; errors: string[] }
  registerItems: { inserted: number; skipped: number; errors: string[] }
  playbooks: { inserted: number; errors: string[] }
  tasks: { inserted: number; errors: string[] }
}

export type CommitInput = {
  packKey: string
  ownerId: number
  discipline?: string | null
  extraction: ExtractionResult
  config: OpsConfigValidated
  /** Only insert these categories. Defaults to all. */
  categories?: ("logEntries" | "registerItems" | "playbooks" | "tasks")[]
  /** Per-category inclusion flags: which specific items to insert (by index). */
  selections?: {
    logEntries?: number[]
    registerItems?: number[]
    playbooks?: number[]
    tasks?: number[]
  }
}

const ALL_CATEGORIES = ["logEntries", "registerItems", "playbooks", "tasks"] as const

export async function commitExtraction(input: CommitInput): Promise<CommitResult> {
  const categories = input.categories ?? [...ALL_CATEGORIES]
  const result: CommitResult = {
    logEntries: { inserted: 0, skipped: 0, errors: [] },
    registerItems: { inserted: 0, skipped: 0, errors: [] },
    playbooks: { inserted: 0, errors: [] },
    tasks: { inserted: 0, errors: [] },
  }

  if (categories.includes("logEntries")) {
    await commitLogEntries(input, result)
  }
  if (categories.includes("registerItems")) {
    await commitRegisterItems(input, result)
  }
  if (categories.includes("playbooks")) {
    await commitPlaybooks(input, result)
  }
  if (categories.includes("tasks")) {
    await commitTasks(input, result)
  }

  return result
}

async function commitLogEntries(input: CommitInput, result: CommitResult) {
  const { extraction, config, packKey, ownerId, selections } = input
  const indices = selections?.logEntries
  const entries = indices ? indices.map((i) => extraction.logEntries[i]).filter(Boolean) : extraction.logEntries

  for (const entry of entries) {
    if (!config.logs[entry.entityKey]) {
      result.logEntries.skipped++
      result.logEntries.errors.push(`Unknown entity "${entry.entityKey}" — skipped.`)
      continue
    }

    const validation = validateFields(config, entry.entityKey, entry.fields)
    if (!validation.ok) {
      result.logEntries.skipped++
      result.logEntries.errors.push(`${entry.entityKey}: ${validation.error}`)
      continue
    }

    const occurredAt = entry.occurredAt
      ? new Date(entry.occurredAt + "T00:00:00.000Z")
      : new Date()

    try {
      await db.insert(opsLogEntries).values({
        packKey,
        entityKey: entry.entityKey,
        ownerId,
        occurredAt,
        status: entry.status,
        fields: validation.fields,
        source: "import",
      })
      result.logEntries.inserted++
    } catch (error) {
      result.logEntries.errors.push(`${entry.entityKey}: ${errorMessage(error)}`)
    }
  }
}

async function commitRegisterItems(input: CommitInput, result: CommitResult) {
  const { extraction, packKey, ownerId, selections } = input
  const indices = selections?.registerItems
  const items = indices ? indices.map((i) => extraction.registerItems[i]).filter(Boolean) : extraction.registerItems

  for (const item of items) {
    const read = readRegisterFields(item.fields)
    if (!read.ok) {
      result.registerItems.skipped++
      result.registerItems.errors.push(`${item.title}: ${read.error}`)
      continue
    }

    try {
      await db.insert(registerItems).values({
        packKey,
        kind: item.kind,
        title: item.title,
        fields: read.fields,
        ownerId,
        source: "import",
      })
      result.registerItems.inserted++
    } catch (error) {
      result.registerItems.errors.push(`${item.title}: ${errorMessage(error)}`)
    }
  }
}

async function commitPlaybooks(input: CommitInput, result: CommitResult) {
  const { extraction, packKey, ownerId, discipline, selections } = input
  const indices = selections?.playbooks
  const items = indices ? indices.map((i) => extraction.playbooks[i]).filter(Boolean) : extraction.playbooks

  for (const pb of items) {
    try {
      const steps = pb.steps.map((text, idx) => ({
        order: idx + 1,
        title: `Step ${idx + 1}`,
        body: text,
        kind: "instruction" as const,
      }))

      await db.insert(playbooks).values({
        packKey,
        discipline: discipline ?? null,
        title: pb.title,
        summary: pb.summary,
        method: steps,
        steps: [],
        precautions: [],
        recommendations: [],
        tags: ["imported"],
        status: "draft",
        authorId: ownerId,
        source: "import",
      })
      result.playbooks.inserted++
    } catch (error) {
      result.playbooks.errors.push(`${pb.title}: ${errorMessage(error)}`)
    }
  }
}

async function commitTasks(input: CommitInput, result: CommitResult) {
  const { extraction, packKey, ownerId, discipline, selections } = input
  const indices = selections?.tasks
  const items = indices ? indices.map((i) => extraction.tasks[i]).filter(Boolean) : extraction.tasks

  for (const task of items) {
    try {
      await db.insert(tasks).values({
        title: task.title,
        description: task.description,
        assigneeId: ownerId,
        status: safeTaskStatus(task.status),
        priority: safeTaskPriority(task.priority),
        discipline: discipline ?? null,
        metadata: { packKey, source: "import" },
      })
      result.tasks.inserted++
    } catch (error) {
      result.tasks.errors.push(`${task.title}: ${errorMessage(error)}`)
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
