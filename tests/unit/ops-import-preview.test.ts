import { describe, expect, it } from "vitest"
import {
  declaredFieldNames,
  droppedExtractedKeys,
  fieldValueToString,
  setLogField,
  validateLogEntry,
  readRegisterFieldsFor,
  setRegisterField,
  renameRegisterField,
  addRegisterField,
  setStep,
  addStepAfter,
  removeStep,
  moveStep,
  safeTaskStatus,
  safeTaskPriority,
} from "@/lib/ops/import/preview"
import type { OpsConfig } from "@/lib/packs/ops/types"

const config = {
  logs: {
    incidents: {
      label: "Incidents",
      fields: {
        title: { type: "string", label: "Title", required: true },
        minutes: { type: "number", label: "Minutes" },
        severity: { type: "enum", label: "Severity", values: ["low", "high"] },
        opened_at: { type: "date", label: "Opened" },
      },
    },
  },
  kpis: [],
} as unknown as OpsConfig

describe("import preview — log fields", () => {
  it("declares only schema fields and reports extracted extras as dropped", () => {
    expect(declaredFieldNames(config, "incidents")).toEqual(["title", "minutes", "severity", "opened_at"])
    expect(declaredFieldNames(config, "ghost")).toEqual([])
    expect(droppedExtractedKeys(config, "incidents", { title: "x", hostname: "h", minutes: 5 })).toEqual([
      "hostname",
    ])
  })

  it("renders values for inputs and coerces a number on edit", () => {
    expect(fieldValueToString(42)).toBe("42")
    expect(fieldValueToString(null)).toBe("")
    expect(fieldValueToString({ nested: 1 })).toBe("")
    expect(setLogField({}, "minutes", "15", { type: "number", label: "M" }).minutes).toBe(15)
    expect(setLogField({ title: "a" }, "title", "", { type: "string", label: "T" })).not.toHaveProperty("title")
  })

  it("mirrors the server validator: required enforced, extras dropped, enums checked", () => {
    const good = validateLogEntry(config, "incidents", { title: "Outage", minutes: "20", hostname: "h" })
    expect(good.ok).toBe(true)
    expect(good.committed).toEqual({ title: "Outage", minutes: 20 })

    const missingRequired = validateLogEntry(config, "incidents", { minutes: 5 })
    expect(missingRequired.ok).toBe(false)
    expect(missingRequired.error).toMatch(/required/)

    const badEnum = validateLogEntry(config, "incidents", { title: "t", severity: "critical" })
    expect(badEnum.ok).toBe(false)
  })
})

describe("import preview — register fields", () => {
  it("applies the credential boundary, not a second copy of it", () => {
    expect(readRegisterFieldsFor({ host: "srv1" }).ok).toBe(true)
    const r = readRegisterFieldsFor({ db_password: "hunter2" })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/credential/i)
  })

  it("edits, renames and adds a field without touching the rest", () => {
    expect(setRegisterField({ a: "1" }, "b", "2")).toEqual({ a: "1", b: "2" })
    expect(setRegisterField({ a: "1" }, "a", "")).toEqual({})
    expect(renameRegisterField({ old: "v", keep: "k" }, "old", "fresh")).toEqual({ fresh: "v", keep: "k" })
    expect(addRegisterField({ a: "1" }, "a")).toEqual({ a: "1" })
    expect(addRegisterField({ a: "1" }, " b ")).toEqual({ a: "1", b: "" })
  })
})

describe("import preview — playbook steps", () => {
  it("edits, inserts, removes and reorders immutably", () => {
    const steps = ["a", "b", "c"]
    expect(setStep(steps, 1, "B")).toEqual(["a", "B", "c"])
    expect(addStepAfter(steps, 0)).toEqual(["a", "", "b", "c"])
    expect(removeStep(steps, 1)).toEqual(["a", "c"])
    expect(moveStep(steps, 0, 1)).toEqual(["b", "a", "c"])
    expect(moveStep(steps, 0, -1)).toEqual(steps) // out of range is a no-op
    expect(steps).toEqual(["a", "b", "c"]) // source untouched
  })
})

describe("import preview — task vocabularies", () => {
  it("falls back to a safe default for an unknown value", () => {
    expect(safeTaskStatus("done")).toBe("done")
    expect(safeTaskStatus("archived")).toBe("todo")
    expect(safeTaskPriority("urgent")).toBe("urgent")
    expect(safeTaskPriority("critical")).toBe("medium")
  })
})
