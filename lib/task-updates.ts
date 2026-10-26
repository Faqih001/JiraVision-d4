// Field whitelist for task writes.
//
// drizzle's `.set()` and update helpers interpolate every key they are handed as
// a column identifier, so the task routes that used to spread the request body
// straight through accepted keys like `id` — a caller could repoint a task's
// primary key or smuggle an identifier through a crafted property name. Every
// task mutation goes through pickTaskUpdates() instead, and `dueDate` and
// `startDate` are normalised here because both are string-mode date() columns:
// they bind "YYYY-MM-DD" and reject a Date.
//
// `sourcePlanId` is deliberately absent. It is the breadcrumb from a promoted task
// back to the planner draft that created it, so only the promote transaction writes
// it; letting a client set it would forge that link.

import { tasks } from "@/drizzle/schema"
import { WORK_DISCIPLINES, isWorkDiscipline } from "@/lib/roles"

type TaskPatch = Partial<Omit<typeof tasks.$inferInsert, "id" | "createdAt" | "updatedAt">>

export type TaskPatchResult = { patch: TaskPatch } | { error: string }

const MUTABLE_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "storyPoints",
  "assigneeId",
  "sprintId",
  "dueDate",
  "startDate",
  "discipline",
  "tags",
] as const

export function pickTaskUpdates(input: unknown): TaskPatchResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be an object" }
  }

  const source = input as Record<string, unknown>
  const patch: Record<string, unknown> = {}

  for (const key of MUTABLE_FIELDS) {
    if (!(key in source) || source[key] === undefined) continue
    const value = source[key]

    switch (key) {
      case "title":
        if (typeof value !== "string" || value.trim() === "") {
          return { error: "title must be a non-empty string" }
        }
        patch.title = value.trim()
        break
      case "description":
        if (value !== null && typeof value !== "string") {
          return { error: "description must be a string or null" }
        }
        patch.description = value
        break
      case "status":
      case "priority":
        if (typeof value !== "string" || value.trim() === "") {
          return { error: `${key} must be a non-empty string` }
        }
        patch[key] = value.trim()
        break
      case "storyPoints": {
        const n = Number(value)
        if (!Number.isInteger(n) || n < 0) {
          return { error: "storyPoints must be a non-negative integer" }
        }
        patch.storyPoints = n
        break
      }
      case "assigneeId":
      case "sprintId": {
        if (value === null) {
          patch[key] = null
          break
        }
        const n = Number(value)
        if (!Number.isInteger(n) || n <= 0) {
          return { error: `${key} must be a positive integer or null` }
        }
        patch[key] = n
        break
      }
      case "dueDate": {
        if (value === null || value === "") {
          patch.dueDate = null
          break
        }
        if (typeof value !== "string" && typeof value !== "number") {
          return { error: "dueDate must be a date string or null" }
        }
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) {
          return { error: "dueDate must be a valid date" }
        }
        patch.dueDate = parsed.toISOString().slice(0, 10)
        break
      }
      case "startDate": {
        if (value === null || value === "") {
          patch.startDate = null
          break
        }
        // Strings only: a bare number could be an epoch, an ordinal or a day of the
        // month, and startDate's job is to place work on a Gantt bar unambiguously.
        if (typeof value !== "string") {
          return { error: "startDate must be a date string or null" }
        }
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) {
          return { error: "startDate must be a valid date" }
        }
        patch.startDate = parsed.toISOString().slice(0, 10)
        break
      }
      case "discipline": {
        if (value === null || value === "") {
          patch.discipline = null
          break
        }
        const candidate = typeof value === "string" ? value.trim().toLowerCase() : value
        if (!isWorkDiscipline(candidate)) {
          return { error: `discipline must be one of: ${WORK_DISCIPLINES.join(", ")}, or null` }
        }
        patch.discipline = candidate
        break
      }
      case "tags":
        if (!Array.isArray(value)) {
          return { error: "tags must be an array" }
        }
        patch.tags = value.map((tag) => String(tag ?? ""))
        break
    }
  }

  if (Object.keys(patch).length === 0) {
    return { error: `No updatable task fields provided. Allowed: ${MUTABLE_FIELDS.join(", ")}` }
  }

  return { patch: patch as TaskPatch }
}
