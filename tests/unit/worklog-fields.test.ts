import { describe, expect, it } from "vitest"
import {
  DELIVERABLE_MUTABLE_FIELDS,
  ENTRY_MUTABLE_FIELDS,
  pickDeliverableUpdates,
  pickEntryUpdates,
  readDeliverableCreate,
  readEntryCreate,
  type EntryCurrent,
} from "@/lib/worklog/entry-fields"

const current: EntryCurrent = { workedOn: "2026-10-26", minutes: 30, kind: "action", deliverableId: null }

// The repo's grammar for a `{ value } | { error }` union in a test: narrow, then read.
function entryValue(input: unknown) {
  const result = readEntryCreate(input)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result.value
}

function entryError(input: unknown): string {
  const result = readEntryCreate(input)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

function entryPatch(input: unknown, at: EntryCurrent = current) {
  const result = pickEntryUpdates(input, at)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result
}

function entryPatchError(input: unknown, at: EntryCurrent = current): string {
  const result = pickEntryUpdates(input, at)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

function deliverableValue(input: unknown) {
  const result = readDeliverableCreate(input)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result.value
}

function deliverableError(input: unknown): string {
  const result = readDeliverableCreate(input)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

function deliverablePatch(input: unknown, status: "draft" | "in_review" | "approved" | "delivered" = "draft") {
  const result = pickDeliverableUpdates(input, status)
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`)
  return result.patch
}

function deliverablePatchError(input: unknown, status: "draft" | "in_review" | "approved" | "delivered" = "draft"): string {
  const result = pickDeliverableUpdates(input, status)
  if ("error" in result) return result.error
  throw new Error("expected an error")
}

describe("readEntryCreate", () => {
  it("fills the column defaults instead of requiring them", () => {
    expect(entryValue({ workedOn: "2026-10-26", title: "  Replaced the seal  " })).toEqual({
      workedOn: "2026-10-26",
      title: "Replaced the seal",
      kind: "action",
      body: null,
      discipline: null,
      minutes: null,
      taskId: null,
      deliverableId: null,
    })
  })

  it("refuses a non-object body and an empty title", () => {
    expect(entryError(null)).toMatch(/object/iu)
    expect(entryError("nope")).toMatch(/object/iu)
    expect(entryError({ workedOn: "2026-10-26", title: "  " })).toMatch(/title/iu)
  })

  it("refuses a day that is not a real date", () => {
    expect(entryError({ workedOn: "2026-02-30", title: "x" })).toMatch(/workedOn/iu)
    expect(entryError({ workedOn: new Date().toISOString(), title: "x" })).toMatch(/workedOn/iu)
    expect(entryError({ title: "x" })).toMatch(/workedOn/iu)
  })

  it("refuses a kind outside the vocabulary", () => {
    expect(entryError({ workedOn: "2026-10-26", title: "x", kind: "shipped" })).toMatch(/kind/iu)
  })

  it("refuses minutes that are not whole minutes in a day", () => {
    expect(entryError({ workedOn: "2026-10-26", title: "x", minutes: 90.5 })).toMatch(/minutes/iu)
    expect(entryError({ workedOn: "2026-10-26", title: "x", minutes: 2000 })).toMatch(/minutes/iu)
    expect(entryValue({ workedOn: "2026-10-26", title: "x", minutes: 0 }).minutes).toBe(0)
  })

  it("refuses a time entry with no minutes", () => {
    expect(entryError({ workedOn: "2026-10-26", title: "x", kind: "time" })).toMatch(/minutes/iu)
    expect(entryValue({ workedOn: "2026-10-26", title: "x", kind: "time", minutes: 60 }).kind).toBe("time")
  })

  it("normalises discipline case and accepts null", () => {
    expect(entryValue({ workedOn: "2026-10-26", title: "x", discipline: " Technician " }).discipline).toBe("technician")
    expect(entryValue({ workedOn: "2026-10-26", title: "x", discipline: null }).discipline).toBeNull()
    expect(entryError({ workedOn: "2026-10-26", title: "x", discipline: "plumber" })).toMatch(/discipline/iu)
  })
})

describe("pickEntryUpdates", () => {
  it("names a field the client may never set, instead of ignoring it", () => {
    for (const forbidden of ["userId", "source", "redatedAt", "planItemId", "playbookId", "id", "createdBy"]) {
      expect(entryPatchError({ [forbidden]: 7 })).toMatch(new RegExp(forbidden, "iu"))
      expect(entryPatchError({ [forbidden]: 7 })).toMatch(/server/iu)
    }
  })

  it("marks a re-dated correction so the route can stamp it", () => {
    expect(entryPatch({ workedOn: "2026-10-24" })).toEqual({ patch: { workedOn: "2026-10-24" }, redated: true })
    expect(entryPatch({ title: "typo fix" })).toEqual({ patch: { title: "typo fix" }, redated: false })
  })

  it("refuses an update that changes nothing", () => {
    expect(entryPatchError({})).toMatch(/No updatable/iu)
    expect(entryPatchError({ body: undefined })).toMatch(/No updatable/iu)
  })

  it("keeps a deliverable entry pointing at a deliverable", () => {
    expect(entryPatchError({ kind: "deliverable" })).toMatch(/deliverable/iu)
    expect(entryPatch({ kind: "deliverable", deliverableId: 4 }).patch).toEqual({ kind: "deliverable", deliverableId: 4 })
    expect(entryPatch({ kind: "deliverable" }, { ...current, deliverableId: 9 }).patch).toEqual({ kind: "deliverable" })
  })

  it("refuses a time entry that drops its minutes", () => {
    // The hazard is a time entry with no minutes: switching to `time` on a row that has
    // 30 minutes stored is a legitimate change, so the refusal is checked on the row that
    // has none, and clearing minutes on a time row is checked below.
    expect(entryPatchError({ kind: "time" }, { ...current, minutes: null })).toMatch(/minutes/iu)
    expect(entryPatch({ kind: "time" }).patch).toEqual({ kind: "time" })
    expect(entryPatch({ kind: "time", minutes: 60 }).patch).toEqual({ kind: "time", minutes: 60 })
    expect(entryPatchError({ minutes: null }, { ...current, kind: "time" })).toMatch(/minutes/iu)
  })

  it("only accepts whole positive ids for links", () => {
    expect(entryPatchError({ taskId: 0 })).toMatch(/taskId/iu)
    expect(entryPatchError({ taskId: "abc" })).toMatch(/taskId/iu)
    expect(entryPatch({ taskId: "12" }).patch).toEqual({ taskId: 12 })
    expect(entryPatch({ taskId: null }).patch).toEqual({ taskId: null })
  })

  it("exposes exactly the fields the routes are allowed to write", () => {
    expect(ENTRY_MUTABLE_FIELDS).toEqual([
      "title",
      "body",
      "kind",
      "discipline",
      "minutes",
      "taskId",
      "workedOn",
      "deliverableId",
    ])
    expect(ENTRY_MUTABLE_FIELDS).not.toContain("source")
  })
})

describe("deliverables", () => {
  it("defaults type and status the way the columns do", () => {
    expect(deliverableValue({ name: "Pump inspection sheet" })).toMatchObject({
      name: "Pump inspection sheet",
      type: "other",
      status: "draft",
      link: null,
    })
  })

  it("rejects a link that is not a web address", () => {
    expect(deliverableError({ name: "x", link: "javascript:alert(1)" })).toMatch(/link/iu)
    expect(deliverableError({ name: "x", link: "data:text/html,hi" })).toMatch(/link/iu)
    expect(deliverableValue({ name: "x", link: "https://example.com/sheet" }).link).toBe("https://example.com/sheet")
    expect(deliverableValue({ name: "x", link: "/uploads/sheet.pdf" }).link).toBe("/uploads/sheet.pdf")
  })

  it("validates the produced day as a plain date", () => {
    expect(deliverableError({ name: "x", producedOn: "2026-13-01" })).toMatch(/producedOn/iu)
    expect(deliverableValue({ name: "x", producedOn: "" }).producedOn).toBeNull()
  })

  it("refuses an illegal lifecycle move in the whitelist, not the UI", () => {
    expect(deliverablePatchError({ status: "approved" }, "draft")).toMatch(/from draft/iu)
    expect(deliverablePatch({ status: "delivered" }, "draft")).toEqual({ status: "delivered" })
    expect(deliverablePatchError({ status: "draft" }, "delivered")).toMatch(/terminal/iu)
    expect(deliverablePatchError({ status: "draft" }, "draft")).toMatch(/No updatable/iu)
  })

  it("refuses a client-set owner", () => {
    expect(deliverablePatchError({ ownerId: 3 })).toMatch(/ownerId/iu)
    expect(deliverablePatchError({ createdBy: 3 })).toMatch(/createdBy/iu)
  })

  it("keeps the type inside the vocabulary", () => {
    expect(deliverableError({ name: "x", type: "spreadsheet" })).toMatch(/type/iu)
    expect(DELIVERABLE_MUTABLE_FIELDS).toContain("evidence")
    expect(DELIVERABLE_MUTABLE_FIELDS).not.toContain("ownerId")
  })
})
