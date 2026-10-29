// Ops log field validation: checks an entry's fields JSONB against the pack's opsConfig.
// Every entity in the config declares its field names, types, required flags and enum values.
// This module refuses writes that violate the schema so the database never holds malformed rows.

import type { OpsConfig, FieldDefinition } from "@/lib/packs/ops/types"

export type FieldValidationResult =
  | { ok: true; fields: Record<string, unknown> }
  | { ok: false; error: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

export function validateFields(
  config: OpsConfig,
  entityKey: string,
  raw: unknown,
): FieldValidationResult {
  const entity = config.logs[entityKey]
  if (!entity) {
    return { ok: false, error: `Unknown entity "${entityKey}" for this pack.` }
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "fields must be a JSON object." }
  }

  const input = raw as Record<string, unknown>
  const output: Record<string, unknown> = {}

  for (const [fieldName, def] of Object.entries(entity.fields)) {
    const value = input[fieldName]

    if (value === undefined || value === null || value === "") {
      if (def.default !== undefined) {
        output[fieldName] = def.default
        continue
      }
      if (def.required) {
        return { ok: false, error: `"${fieldName}" is required (${def.label}).` }
      }
      continue
    }

    const checked = checkField(fieldName, def, value)
    if (!checked.ok) return checked
    output[fieldName] = checked.value
  }

  return { ok: true, fields: output }
}

function checkField(
  name: string,
  def: FieldDefinition,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (def.type) {
    case "string":
      if (typeof value !== "string") return { ok: false, error: `"${name}" must be a string.` }
      return { ok: true, value: value.trim().slice(0, 200) }

    case "text":
      if (typeof value !== "string") return { ok: false, error: `"${name}" must be a string.` }
      return { ok: true, value: value.trim().slice(0, 4000) }

    case "number": {
      const num = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(num)) return { ok: false, error: `"${name}" must be a number.` }
      return { ok: true, value: num }
    }

    case "date":
      if (typeof value !== "string" || !ISO_DATE.test(value)) {
        return { ok: false, error: `"${name}" must be a YYYY-MM-DD date.` }
      }
      return { ok: true, value }

    case "datetime":
      if (typeof value !== "string" || !ISO_DATETIME.test(value)) {
        return { ok: false, error: `"${name}" must be an ISO datetime.` }
      }
      return { ok: true, value }

    case "enum":
      if (typeof value !== "string") return { ok: false, error: `"${name}" must be a string.` }
      if (!def.values?.includes(value)) {
        return { ok: false, error: `"${name}" must be one of: ${def.values?.join(", ")}.` }
      }
      return { ok: true, value }

    default:
      return { ok: false, error: `Unknown field type for "${name}".` }
  }
}

export function entityKeys(config: OpsConfig): string[] {
  return Object.keys(config.logs)
}
