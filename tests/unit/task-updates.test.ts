import { describe, expect, it } from "vitest"
import { pickTaskUpdates } from "@/lib/task-updates"

// drizzle interpolates every key handed to `.set()` as a column identifier, so the
// task routes that spread the request body accepted `id` (repointing a primary key)
// and any crafted property name. pickTaskUpdates is the single whitelist they share.
describe("pickTaskUpdates", () => {
  it("drops keys that are not task columns", () => {
    const result = pickTaskUpdates({ title: "Real work", id: 999, passwordHash: "x" })
    expect(result).toEqual({ patch: { title: "Real work" } })
  })

  it("drops audit columns a client must not set", () => {
    const result = pickTaskUpdates({ status: "done", createdAt: "2020-01-01", updatedAt: "2020-01-01" })
    expect(result).toEqual({ patch: { status: "done" } })
  })

  it("rejects a body with no updatable fields instead of issuing an empty update", () => {
    const result = pickTaskUpdates({ id: 1 })
    expect("error" in result).toBe(true)
  })

  it("rejects non-object bodies", () => {
    for (const body of [null, undefined, "title", [1, 2], 42]) {
      expect("error" in pickTaskUpdates(body)).toBe(true)
    }
  })

  it("trims strings and requires a non-empty title", () => {
    expect(pickTaskUpdates({ title: "  Padded  " })).toEqual({ patch: { title: "Padded" } })
    expect("error" in pickTaskUpdates({ title: "   " })).toBe(true)
    expect("error" in pickTaskUpdates({ title: 12 })).toBe(true)
  })

  // tasks.dueDate is a drizzle date() column: string mode, binds "YYYY-MM-DD" and
  // rejects a Date. Clients send either a bare date or a full timestamp.
  it("normalises dueDate to a date-only string", () => {
    expect(pickTaskUpdates({ dueDate: "2026-11-05" })).toEqual({ patch: { dueDate: "2026-11-05" } })
    expect(pickTaskUpdates({ dueDate: "2026-11-05T14:30:00.000Z" })).toEqual({
      patch: { dueDate: "2026-11-05" },
    })
  })

  it("clears a due date with null or an empty string", () => {
    expect(pickTaskUpdates({ dueDate: null })).toEqual({ patch: { dueDate: null } })
    expect(pickTaskUpdates({ dueDate: "" })).toEqual({ patch: { dueDate: null } })
  })

  it("rejects an unparseable due date", () => {
    expect("error" in pickTaskUpdates({ dueDate: "not-a-date" })).toBe(true)
  })

  it("coerces numeric columns and bounds them", () => {
    expect(pickTaskUpdates({ storyPoints: "8" })).toEqual({ patch: { storyPoints: 8 } })
    expect(pickTaskUpdates({ assigneeId: "3" })).toEqual({ patch: { assigneeId: 3 } })
    expect(pickTaskUpdates({ sprintId: null })).toEqual({ patch: { sprintId: null } })
    expect("error" in pickTaskUpdates({ storyPoints: -1 })).toBe(true)
    expect("error" in pickTaskUpdates({ storyPoints: 1.5 })).toBe(true)
    expect("error" in pickTaskUpdates({ assigneeId: 0 })).toBe(true)
    expect("error" in pickTaskUpdates({ assigneeId: "abc" })).toBe(true)
  })

  it("stringifies tag entries", () => {
    expect(pickTaskUpdates({ tags: ["beta", 2, null] })).toEqual({
      patch: { tags: ["beta", "2", ""] },
    })
    expect("error" in pickTaskUpdates({ tags: "beta" })).toBe(true)
  })

  it("accepts every mutable column in one patch", () => {
    const result = pickTaskUpdates({
      title: "Ship it",
      description: "Body",
      status: "in_progress",
      priority: "high",
      storyPoints: 5,
      assigneeId: 2,
      sprintId: 1,
      dueDate: "2026-12-01",
      tags: ["launch"],
    })
    expect(result).toEqual({
      patch: {
        title: "Ship it",
        description: "Body",
        status: "in_progress",
        priority: "high",
        storyPoints: 5,
        assigneeId: 2,
        sprintId: 1,
        dueDate: "2026-12-01",
        tags: ["launch"],
      },
    })
  })
})
