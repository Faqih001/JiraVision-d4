import { describe, expect, it } from "vitest"
import {
  parseChecklistItems,
  validateChecklistItem,
  validateChecklistResponses,
  type ChecklistItem,
} from "@/lib/tasks/checklist"

describe("validateChecklistItem", () => {
  it("accepts a valid yes-no-na item", () => {
    expect(validateChecklistItem({ id: "item-1", label: "Servers operational", type: "yes-no-na" })).toBe(true)
  })
  it("rejects an item with empty label", () => {
    expect(validateChecklistItem({ id: "item-1", label: "", type: "yes-no-na" })).toBe(false)
  })
  it("rejects an item with invalid type", () => {
    expect(validateChecklistItem({ id: "1", label: "x", type: "boolean" })).toBe(false)
  })
  it("rejects an item with missing id", () => {
    expect(validateChecklistItem({ label: "x", type: "yes-no-na" })).toBe(false)
  })
})

describe("parseChecklistItems", () => {
  it("parses a valid JSON array", () => {
    const result = parseChecklistItems(JSON.stringify([{ id: "a", label: "Check server", type: "yes-no-na" }]))
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe("Check server")
  })
  it("returns empty array for null/undefined/empty", () => {
    expect(parseChecklistItems(null)).toEqual([])
    expect(parseChecklistItems(undefined)).toEqual([])
    expect(parseChecklistItems("")).toEqual([])
  })
  it("filters out invalid items", () => {
    const input = [
      { id: "a", label: "Valid", type: "yes-no-na" },
      { id: "", label: "No id", type: "yes-no-na" },
      { id: "b", label: "Bad type", type: "checkbox" },
    ]
    expect(parseChecklistItems(JSON.stringify(input))).toHaveLength(1)
  })
  it("returns empty array for invalid JSON", () => {
    expect(parseChecklistItems("not json")).toEqual([])
  })
})

describe("validateChecklistResponses", () => {
  const items: ChecklistItem[] = [
    { id: "a", label: "Item A", type: "yes-no-na" },
    { id: "b", label: "Item B", type: "yes-no-na" },
  ]
  it("accepts valid responses matching all items", () => {
    expect(validateChecklistResponses(items, [{ id: "a", value: "yes" }, { id: "b", value: "no" }])).toBe(true)
  })
  it("accepts n/a responses", () => {
    expect(validateChecklistResponses(items, [{ id: "a", value: "n/a" }, { id: "b", value: "yes" }])).toBe(true)
  })
  it("rejects responses with invalid values", () => {
    expect(validateChecklistResponses(items, [{ id: "a", value: "maybe" }, { id: "b", value: "yes" }])).toBe(false)
  })
  it("rejects responses missing items", () => {
    expect(validateChecklistResponses(items, [{ id: "a", value: "yes" }])).toBe(false)
  })
  it("rejects responses with extra items", () => {
    expect(validateChecklistResponses(items, [{ id: "a", value: "yes" }, { id: "b", value: "no" }, { id: "c", value: "yes" }])).toBe(false)
  })
})
