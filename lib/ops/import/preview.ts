// Pure helpers behind the document-import preview (D5). The preview must show exactly what the
// commit will write and let the member correct a mis-extraction first, so every rule here mirrors the
// server's own validators (lib/ops/fields.validateFields, lib/registers/fields.readRegisterFields)
// rather than inventing a second, divergent one. No React, no DB, no Gemini — trivially unit-testable.

import { validateFields } from "@/lib/ops/fields"
import { readRegisterFields } from "@/lib/registers/fields"
import type { OpsConfig, FieldDefinition } from "@/lib/packs/ops/types"

// ---- Log entries: schema-shaped, editable, projected through the real validator -----------------

/** The field names the pack declares for an entity — the only ones that will ever commit. */
export function declaredFieldNames(config: OpsConfig, entityKey: string): string[] {
  return Object.keys(config.logs[entityKey]?.fields ?? {})
}

/** Extracted keys the schema does not declare; the server drops them, so the preview hides them. */
export function droppedExtractedKeys(
  config: OpsConfig,
  entityKey: string,
  fields: Record<string, unknown>,
): string[] {
  const declared = new Set(declaredFieldNames(config, entityKey))
  return Object.keys(fields).filter((key) => !declared.has(key))
}

/** A field value rendered for a text/number/date input (enums select; this only feeds the box). */
export function fieldValueToString(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

/**
 * Write a field's edited value back into the entry's field map. Blank clears the key (so the
 * validator can apply a default or enforce required); a number field stores a number, matching the
 * coercion `validateFields` performs, so the edited object is already commit-shaped.
 */
export function setLogField(
  fields: Record<string, unknown>,
  name: string,
  raw: string,
  def: FieldDefinition,
): Record<string, unknown> {
  const next = { ...fields }
  if (raw === "") {
    delete next[name]
    return next
  }
  if (def.type === "number") {
    const num = Number(raw)
    next[name] = Number.isFinite(num) ? num : raw
  } else {
    next[name] = raw
  }
  return next
}

/**
 * Run the entry through the real validator. The returned `fields` are exactly what commit inserts;
 * `error` is what the row would be skipped for, so the member sees it before importing.
 */
export function validateLogEntry(
  config: OpsConfig,
  entityKey: string,
  fields: Record<string, unknown>,
): { ok: boolean; error?: string; committed: Record<string, unknown> } {
  const result = validateFields(config, entityKey, fields)
  if (result.ok) return { ok: true, committed: result.fields }
  return { ok: false, error: result.error, committed: fields }
}

// ---- Register items: free-form fields, same credential boundary as every other register write -----

/** The register row's fields run through the real reader — the credential reject lives here, not in the UI. */
export function readRegisterFieldsFor(
  fields: Record<string, unknown>,
): { ok: true; fields: Record<string, string> } | { ok: false; error: string } {
  return readRegisterFields(fields)
}

export function setRegisterField(
  fields: Record<string, unknown>,
  name: string,
  value: string,
): Record<string, unknown> {
  const next = { ...fields }
  if (value === "") delete next[name]
  else next[name] = value
  return next
}

export function renameRegisterField(
  fields: Record<string, unknown>,
  from: string,
  to: string,
): Record<string, unknown> {
  const target = to.trim()
  if (!target || target === from) return fields
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    next[key === from ? target : key] = value
  }
  return next
}

export function addRegisterField(
  fields: Record<string, unknown>,
  name: string,
): Record<string, unknown> {
  const target = name.trim()
  if (!target || target in fields) return fields
  return { ...fields, [target]: "" }
}

// ---- Playbook steps: ordered text rows, editable in place -----------------------------------------

export function setStep(steps: string[], index: number, text: string): string[] {
  if (index < 0 || index >= steps.length) return steps
  return steps.map((step, i) => (i === index ? text : step))
}

export function addStepAfter(steps: string[], index: number): string[] {
  const at = index < 0 ? 0 : Math.min(index + 1, steps.length)
  const next = [...steps]
  next.splice(at, 0, "")
  return next
}

export function removeStep(steps: string[], index: number): string[] {
  if (index < 0 || index >= steps.length) return steps
  return steps.filter((_, i) => i !== index)
}

/** delta of -1 / +1 swaps a step with its neighbour; out of range is a no-op. */
export function moveStep(steps: string[], index: number, delta: number): string[] {
  const target = index + delta
  if (index < 0 || index >= steps.length || target < 0 || target >= steps.length) return steps
  const next = [...steps]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

// ---- Tasks: status/priority made explicit and constrained ---------------------------------------

export const IMPORT_TASK_STATUSES = ["todo", "in_progress", "review", "blocked", "done"] as const
export const IMPORT_TASK_PRIORITIES = ["urgent", "high", "medium", "low"] as const

export type ImportTaskStatus = (typeof IMPORT_TASK_STATUSES)[number]
export type ImportTaskPriority = (typeof IMPORT_TASK_PRIORITIES)[number]

export function safeTaskStatus(value: unknown): ImportTaskStatus {
  return (IMPORT_TASK_STATUSES as readonly string[]).includes(String(value))
    ? (value as ImportTaskStatus)
    : "todo"
}

export function safeTaskPriority(value: unknown): ImportTaskPriority {
  return (IMPORT_TASK_PRIORITIES as readonly string[]).includes(String(value))
    ? (value as ImportTaskPriority)
    : "medium"
}
