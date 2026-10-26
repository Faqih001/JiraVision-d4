// Field whitelists for work log and deliverable writes. Same reason as
// lib/task-updates.ts: `.set()` interpolates every key it is handed, so a spread body
// would let a caller repoint user_id. A forbidden key is refused out loud — silently
// dropping `source: "auto"` would make the log look machine-written from a browser.

import { deliverables, workLogEntries } from "@/drizzle/schema"
import { WORK_DISCIPLINES, isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"
import {
  DELIVERABLE_LABEL,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  WORK_LOG_KINDS,
  canMoveDeliverable,
  isDeliverableStatus,
  isDeliverableType,
  isWorkLogKind,
  type DeliverableStatus,
  type DeliverableType,
  type WorkLogKind,
} from "./entries"
import { isIsoDate } from "./local-day"

export const ENTRY_MUTABLE_FIELDS = [
  "title",
  "body",
  "kind",
  "discipline",
  "minutes",
  "taskId",
  "workedOn",
  "deliverableId",
] as const

export const DELIVERABLE_MUTABLE_FIELDS = [
  "name",
  "type",
  "status",
  "taskId",
  "producedOn",
  "link",
  "evidence",
  "discipline",
] as const

// Everything else on those two tables is server-owned: identity, provenance and the
// correction stamp. `source` stays "manual" because phase 6 is what earns "gemini".
const FORBIDDEN_ENTRY_KEYS = [
  "id",
  "userId",
  "source",
  "redatedAt",
  "planItemId",
  "playbookId",
  "playbookVersion",
  "createdAt",
  "updatedAt",
  "createdBy",
  "ownerId",
] as const

const FORBIDDEN_DELIVERABLE_KEYS = [
  "id",
  "ownerId",
  "createdBy",
  "planItemId",
  "objectKey",
  "createdAt",
  "updatedAt",
] as const

const MAX_TITLE = 500
const MAX_BODY = 5000
const MAX_NAME = 255
const MAX_MINUTES = 1440

export type EntryCreateInput = {
  workedOn: string
  title: string
  kind: WorkLogKind
  body: string | null
  discipline: WorkDiscipline | null
  minutes: number | null
  taskId: number | null
  deliverableId: number | null
}

export type DeliverableCreateInput = {
  name: string
  type: DeliverableType
  status: DeliverableStatus
  taskId: number | null
  producedOn: string | null
  link: string | null
  evidence: string | null
  discipline: WorkDiscipline | null
}

export type EntryCurrent = {
  workedOn: string
  minutes: number | null
  kind: WorkLogKind
  deliverableId: number | null
}

export type EntryPatch = Partial<Omit<typeof workLogEntries.$inferInsert, (typeof FORBIDDEN_ENTRY_KEYS)[number]>>

export type DeliverablePatch = Partial<
  Omit<typeof deliverables.$inferInsert, (typeof FORBIDDEN_DELIVERABLE_KEYS)[number]>
>

export type Fail = { error: string }

export function isFail(value: unknown): value is Fail {
  return typeof value === "object" && value !== null && "error" in value
}

/** Every reader returns a value or a Fail; `Read<T>` keeps the narrowing honest. */
type Read<T> = T | Fail

function rejectForbidden(source: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    if (source[key] !== undefined) return `${key} is set by the server, not the client.`
  }
  return null
}

function asBody(input: unknown): Read<Record<string, unknown>> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Request body must be a JSON object" }
  return input as Record<string, unknown>
}

/** Strings only: a bare number could be an epoch or a day of the month. */
function readDay(value: unknown, field: string): Read<string | null> {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string" || !isIsoDate(value)) {
    return { error: `${field} must be a YYYY-MM-DD date or null` }
  }
  return value
}

function readRequiredDay(value: unknown, field: string): Read<string> {
  const day = readDay(value, field)
  if (isFail(day)) return day
  if (day === null) return { error: `${field} must be a YYYY-MM-DD date` }
  return day
}

function readId(value: unknown, field: string): Read<number | null> {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && !/^\d+$/u.test(value)) {
    return { error: `${field} must be a positive integer or null` }
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) return { error: `${field} must be a positive integer or null` }
  return n
}

function readMinutes(value: unknown): Read<number | null> {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean" || value === "") return { error: "minutes must be a whole number or null" }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > MAX_MINUTES) {
    return { error: `minutes must be a whole number between 0 and ${MAX_MINUTES}, or null` }
  }
  return n
}

function readDiscipline(value: unknown): Read<WorkDiscipline | null> {
  if (value === null || value === undefined || value === "") return null
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : value
  if (!isWorkDiscipline(candidate)) {
    return { error: `discipline must be one of: ${WORK_DISCIPLINES.join(", ")}, or null` }
  }
  return candidate
}

function readRequiredText(value: unknown, field: string, max: number): Read<string> {
  if (typeof value !== "string" || value.trim() === "") return { error: `${field} is required` }
  const trimmed = value.trim()
  if (trimmed.length > max) return { error: `${field} is too long (${max} characters max)` }
  return trimmed
}

function readOptionalText(value: unknown, field: string, max: number): Read<string | null> {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") return { error: `${field} must be a string or null` }
  const trimmed = value.trim()
  if (trimmed.length > max) return { error: `${field} is too long (${max} characters max)` }
  return trimmed || null
}

function readKind(value: unknown): Read<WorkLogKind> {
  const candidate = value === undefined || value === null ? "action" : value
  if (!isWorkLogKind(candidate)) return { error: `kind must be one of: ${WORK_LOG_KINDS.join(", ")}` }
  return candidate
}

/** A deliverable link is opened by a supervisor: no javascript:, no data:. */
function readLink(value: unknown): Read<string | null> {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string") return { error: "link must be a string or null" }
  const trimmed = value.trim()
  if (/^(javascript|data|vbscript):/iu.test(trimmed)) return { error: "link must be an http(s) address or a path" }
  if (/^https?:\/\//u.test(trimmed) || trimmed.startsWith("/")) return trimmed
  return { error: "link must be an http(s) address or a path" }
}

export function readEntryCreate(input: unknown): Read<{ value: EntryCreateInput }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const workedOn = readRequiredDay(body.workedOn, "workedOn")
  if (isFail(workedOn)) return workedOn

  const title = readRequiredText(body.title, "title", MAX_TITLE)
  if (isFail(title)) return title

  const note = readOptionalText(body.body, "body", MAX_BODY)
  if (isFail(note)) return note

  const kind = readKind(body.kind)
  if (isFail(kind)) return kind

  const minutes = readMinutes(body.minutes)
  if (isFail(minutes)) return minutes

  const discipline = readDiscipline(body.discipline)
  if (isFail(discipline)) return discipline

  const taskId = readId(body.taskId, "taskId")
  if (isFail(taskId)) return taskId

  const deliverableId = readId(body.deliverableId, "deliverableId")
  if (isFail(deliverableId)) return deliverableId

  if (kind === "time" && !minutes) return { error: "A time entry needs minutes." }
  if (kind === "deliverable" && !deliverableId) {
    return { error: "A deliverable entry needs a deliverable — create it with Convert to deliverable." }
  }

  return { value: { workedOn, title, kind, body: note, discipline, minutes, taskId, deliverableId } }
}

// `undefined` always means "the client did not send this field", so it is skipped; an
// explicit `null` is the client asking to clear a column, and is read as one.
export function pickEntryUpdates(
  input: unknown,
  current: EntryCurrent,
): Read<{ patch: EntryPatch; redated: boolean }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const refusal = rejectForbidden(body, FORBIDDEN_ENTRY_KEYS)
  if (refusal) return { error: refusal }

  const patch: EntryPatch = {}

  if (body.title !== undefined) {
    const title = readRequiredText(body.title, "title", MAX_TITLE)
    if (isFail(title)) return title
    patch.title = title
  }
  if (body.body !== undefined) {
    const note = readOptionalText(body.body, "body", MAX_BODY)
    if (isFail(note)) return note
    patch.body = note
  }
  if (body.kind !== undefined) {
    const kind = readKind(body.kind)
    if (isFail(kind)) return kind
    patch.kind = kind
  }
  if (body.discipline !== undefined) {
    const discipline = readDiscipline(body.discipline)
    if (isFail(discipline)) return discipline
    patch.discipline = discipline
  }
  if (body.minutes !== undefined) {
    const minutes = readMinutes(body.minutes)
    if (isFail(minutes)) return minutes
    patch.minutes = minutes
  }
  if (body.taskId !== undefined) {
    const taskId = readId(body.taskId, "taskId")
    if (isFail(taskId)) return taskId
    patch.taskId = taskId
  }
  if (body.deliverableId !== undefined) {
    const deliverableId = readId(body.deliverableId, "deliverableId")
    if (isFail(deliverableId)) return deliverableId
    patch.deliverableId = deliverableId
  }
  if (body.workedOn !== undefined) {
    const workedOn = readRequiredDay(body.workedOn, "workedOn")
    if (isFail(workedOn)) return workedOn
    patch.workedOn = workedOn
  }

  if (Object.keys(patch).length === 0) {
    return { error: `No updatable entry fields provided. Allowed: ${ENTRY_MUTABLE_FIELDS.join(", ")}` }
  }

  const nextKind = patch.kind !== undefined ? patch.kind : current.kind
  const nextMinutes = patch.minutes !== undefined ? patch.minutes : current.minutes
  if (nextKind === "time" && !nextMinutes) return { error: "A time entry needs minutes." }

  const nextDeliverable = patch.deliverableId !== undefined ? patch.deliverableId : current.deliverableId
  if (nextKind === "deliverable" && !nextDeliverable) {
    return { error: "A deliverable entry needs a deliverable — create it with Convert to deliverable." }
  }

  // Comparing to the stored day means clicking Save on an unchanged day does not stamp a
  // correction the person did not make.
  const redated = patch.workedOn !== undefined && patch.workedOn !== current.workedOn

  return { patch, redated }
}

export function readDeliverableCreate(input: unknown): Read<{ value: DeliverableCreateInput }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const name = readRequiredText(body.name, "name", MAX_NAME)
  if (isFail(name)) return name

  const typeCandidate = body.type === undefined || body.type === null || body.type === "" ? "other" : body.type
  if (!isDeliverableType(typeCandidate)) {
    return { error: `type must be one of: ${DELIVERABLE_TYPES.join(", ")} (${Object.values(DELIVERABLE_LABEL).join(", ")})` }
  }

  const statusCandidate =
    body.status === undefined || body.status === null || body.status === "" ? "draft" : body.status
  if (!isDeliverableStatus(statusCandidate)) {
    return { error: `status must be one of: ${DELIVERABLE_STATUSES.join(", ")}` }
  }

  const producedOn = readDay(body.producedOn, "producedOn")
  if (isFail(producedOn)) return producedOn

  const link = readLink(body.link)
  if (isFail(link)) return link

  const evidence = readOptionalText(body.evidence, "evidence", MAX_BODY)
  if (isFail(evidence)) return evidence

  const taskId = readId(body.taskId, "taskId")
  if (isFail(taskId)) return taskId

  const discipline = readDiscipline(body.discipline)
  if (isFail(discipline)) return discipline

  return {
    value: {
      name,
      type: typeCandidate,
      status: statusCandidate,
      taskId,
      producedOn,
      link,
      evidence,
      discipline,
    },
  }
}

export function pickDeliverableUpdates(
  input: unknown,
  currentStatus: DeliverableStatus,
): Read<{ patch: DeliverablePatch }> {
  const body = asBody(input)
  if (isFail(body)) return body

  const refusal = rejectForbidden(body, FORBIDDEN_DELIVERABLE_KEYS)
  if (refusal) return { error: refusal }

  const patch: DeliverablePatch = {}

  if (body.name !== undefined) {
    const name = readRequiredText(body.name, "name", MAX_NAME)
    if (isFail(name)) return name
    patch.name = name
  }
  if (body.type !== undefined) {
    const type = body.type
    if (!isDeliverableType(type)) return { error: `type must be one of: ${DELIVERABLE_TYPES.join(", ")}` }
    patch.type = type
  }
  if (body.status !== undefined) {
    const status = body.status
    if (!isDeliverableStatus(status)) {
      return { error: `status must be one of: ${DELIVERABLE_STATUSES.join(", ")}` }
    }
    if (status !== currentStatus) {
      // The lifecycle is a rule, so it is checked where it can be tested — not in a
      // dropdown that merely happens to offer only the legal next steps.
      if (currentStatus === "delivered") return { error: "delivered is terminal — record a new deliverable." }
      if (!canMoveDeliverable(currentStatus, status)) {
        return { error: `Cannot take a deliverable from ${currentStatus} to ${status}.` }
      }
      patch.status = status
    }
  }
  if (body.producedOn !== undefined) {
    const producedOn = readDay(body.producedOn, "producedOn")
    if (isFail(producedOn)) return producedOn
    patch.producedOn = producedOn
  }
  if (body.link !== undefined) {
    const link = readLink(body.link)
    if (isFail(link)) return link
    patch.link = link
  }
  if (body.evidence !== undefined) {
    const evidence = readOptionalText(body.evidence, "evidence", MAX_BODY)
    if (isFail(evidence)) return evidence
    patch.evidence = evidence
  }
  if (body.taskId !== undefined) {
    const taskId = readId(body.taskId, "taskId")
    if (isFail(taskId)) return taskId
    patch.taskId = taskId
  }
  if (body.discipline !== undefined) {
    const discipline = readDiscipline(body.discipline)
    if (isFail(discipline)) return discipline
    patch.discipline = discipline
  }

  if (Object.keys(patch).length === 0) {
    return { error: `No updatable deliverable fields provided. Allowed: ${DELIVERABLE_MUTABLE_FIELDS.join(", ")}` }
  }

  return { patch }
}
