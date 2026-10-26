import { describe, expect, it } from "vitest"
import { BULK_ACTIONS, BULK_IDS_CAP, readBulkRequest } from "@/lib/worklog/bulk"

const TODAY = "2026-10-26"

const ok = (input: unknown) => {
  const result = readBulkRequest(input, TODAY)
  if ("error" in result) throw new Error(result.error)
  return result.value
}
const why = (input: unknown) => {
  const result = readBulkRequest(input, TODAY)
  if (!("error" in result)) throw new Error("expected an error")
  return result.error
}

describe("readBulkRequest", () => {
  it("offers exactly the five actions this phase owns", () => {
    expect([...BULK_ACTIONS]).toEqual(["delete", "set-task", "re-date", "set-kind", "convert-deliverable"])
  })

  it("requires a non-empty selection", () => {
    expect(why({ action: "delete", ids: [] })).toMatch(/no rows selected/iu)
    expect(why({ action: "delete" })).toMatch(/no rows selected/iu)
  })

  it("drops non-positive ids instead of trusting them", () => {
    expect(ok({ action: "delete", ids: [1, 2, 0, -5, "6", 1] })).toEqual({
      action: "delete",
      ids: [1, 2, 6],
      taskId: null,
      workedOn: null,
      kind: null,
    })
  })

  it("refuses an oversized selection", () => {
    const ids = Array.from({ length: BULK_IDS_CAP + 1 }, (_, i) => i + 1)
    expect(why({ action: "delete", ids })).toMatch(/at most 200/iu)
  })

  it("rejects an unknown action by name", () => {
    expect(why({ action: "explode", ids: [1] })).toMatch(/explode/u)
  })

  it("treats set-task as both attach and detach", () => {
    expect(ok({ action: "set-task", ids: [1], taskId: 42 }).taskId).toBe(42)
    expect(ok({ action: "set-task", ids: [1], taskId: null }).taskId).toBeNull()
    expect(why({ action: "set-task", ids: [1] })).toMatch(/taskId/u)
    expect(why({ action: "set-task", ids: [1], taskId: "soon" })).toMatch(/positive integer or null/iu)
  })

  it("refuses to re-date a bulk selection into the future", () => {
    expect(ok({ action: "re-date", ids: [1], workedOn: "2026-10-25" }).workedOn).toBe("2026-10-25")
    expect(why({ action: "re-date", ids: [1], workedOn: "2026-12-01" })).toMatch(/future/iu)
    expect(why({ action: "re-date", ids: [1], workedOn: "not-a-day" })).toMatch(/YYYY-MM-DD/u)
    expect(why({ action: "re-date", ids: [1] })).toMatch(/workedOn/u)
  })

  it("keeps kinds that need per-row companions out of bulk", () => {
    expect(ok({ action: "set-kind", ids: [1], kind: "blocker" }).kind).toBe("blocker")
    expect(why({ action: "set-kind", ids: [1], kind: "time" })).toMatch(/minutes/iu)
    expect(why({ action: "set-kind", ids: [1], kind: "deliverable" })).toMatch(/Convert to deliverable/iu)
    expect(why({ action: "set-kind", ids: [1], kind: "nope" })).toMatch(/one of/iu)
    expect(why({ action: "set-kind", ids: [1] })).toMatch(/kind/u)
  })

  it("accepts convert-deliverable with no payload", () => {
    expect(ok({ action: "convert-deliverable", ids: [3, 4] }).action).toBe("convert-deliverable")
  })

  it("rejects a body that is not an object", () => {
    expect(why(null)).toMatch(/object/iu)
    expect(why([])).toMatch(/object/iu)
    expect(why("delete")).toMatch(/object/iu)
  })
})
