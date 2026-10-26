import { describe, expect, it } from "vitest"
import { TASK_EVENT_SOURCES, isTaskEventSource, statusChanges } from "@/lib/worklog/task-events"

const at = new Date("2026-10-26T09:00:00.000Z")
const opts = { actorId: 7, source: "route" as const, at }

// task_events is the system of record for "what happened on day X" (design §4, §13).
// This module decides what counts; lib/worklog/capture.ts writes. Split because no unit
// test may import the database (lib/db.js shadows lib/db.ts under Vitest).
describe("statusChanges", () => {
  it("records a transition with both sides", () => {
    expect(statusChanges([{ id: 1, status: "todo" }], [{ id: 1, status: "done" }], opts)).toEqual([
      { taskId: 1, actorId: 7, fromStatus: "todo", toStatus: "done", at, source: "route" },
    ])
  })

  it("records nothing when the status did not move", () => {
    expect(statusChanges([{ id: 1, status: "done" }], [{ id: 1, status: "done" }], opts)).toEqual([])
  })

  it("ignores a task with no before row — creation is tasks.created_at, not an event", () => {
    expect(statusChanges([], [{ id: 2, status: "todo" }], opts)).toEqual([])
  })

  it("ignores an after row that is missing, so a failed read cannot write a fake", () => {
    expect(statusChanges([{ id: 3, status: "in_progress" }], [], opts)).toEqual([])
  })

  it("coerces a null status to empty rather than dropping the transition", () => {
    const [row] = statusChanges([{ id: 4, status: null }], [{ id: 4, status: "todo" }], opts)
    expect(row?.fromStatus).toBe("")
  })

  it("handles a bulk set: only the moved ones are recorded, in after order", () => {
    const before = [
      { id: 1, status: "todo" },
      { id: 2, status: "done" },
      { id: 3, status: "todo" },
    ]
    const after = [
      { id: 3, status: "in_progress" },
      { id: 2, status: "done" },
      { id: 1, status: "in_progress" },
    ]
    expect(statusChanges(before, after, opts).map((r) => [r.taskId, r.toStatus])).toEqual([
      [3, "in_progress"],
      [1, "in_progress"],
    ])
  })

  it("uses the actor passed in, and null when the caller has no session id", () => {
    const [row] = statusChanges([{ id: 1, status: "todo" }], [{ id: 1, status: "done" }], {
      actorId: null,
      source: "bulk",
      at,
    })
    expect(row?.actorId).toBeNull()
    expect(row?.source).toBe("bulk")
  })

  it("defaults the timestamp to the call time, once, for the whole batch", () => {
    const rows = statusChanges(
      [{ id: 1, status: "todo" }, { id: 2, status: "todo" }],
      [{ id: 1, status: "done" }, { id: 2, status: "done" }],
      { actorId: 1, source: "bulk" },
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]?.at).toBeInstanceOf(Date)
    expect(rows[1]?.at.getTime()).toBe(rows[0]?.at.getTime())
  })

  it("knows its own source vocabulary", () => {
    expect(TASK_EVENT_SOURCES).toEqual(["route", "bulk", "promote", "agent"])
    expect(isTaskEventSource("bulk")).toBe(true)
    expect(isTaskEventSource("drag")).toBe(false)
  })
})
