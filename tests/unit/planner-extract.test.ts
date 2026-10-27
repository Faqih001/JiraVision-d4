import { describe, expect, it } from "vitest"
import { extractPlanSchema, extractItemSchema, planJsonSchema } from "@/lib/planner/extract"

describe("plan extraction schema", () => {
  it("accepts a minimal valid plan", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: [{ title: "Site survey" }],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it("rejects a plan with no title", () => {
    const input = {
      title: "",
      items: [{ title: "Site survey" }],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("rejects a plan with no items", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: [],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("rejects a plan with too many items", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: Array.from({ length: 101 }, (_, i) => ({ title: `Item ${i}` })),
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("accepts a plan with all optional fields", () => {
    const input = {
      title: "Bridge Rehabilitation",
      summary: "A comprehensive rehabilitation project",
      horizon: { start: "2026-11-01", end: "2027-06-30" },
      items: [
        {
          title: "Site survey",
          description: "Conduct a full site survey",
          acceptanceCriteria: ["Survey complete", "Report submitted"],
          discipline: "civil",
          estimatePoints: 5,
          startDate: "2026-11-01",
          dueDate: "2026-11-15",
          dependsOnItemIndex: [],
          milestone: false,
          cadence: "weekly",
          deliverable: { name: "Survey Report", type: "document" },
        },
      ],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it("rejects an item with invalid date format", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: [{ title: "Site survey", startDate: "11/01/2026" }],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("rejects an item with invalid cadence", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: [{ title: "Site survey", cadence: "biweekly" }],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("rejects an item with negative estimate", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: [{ title: "Site survey", estimatePoints: -1 }],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("rejects an item with estimate over 100", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: [{ title: "Site survey", estimatePoints: 101 }],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("accepts a null deliverable", () => {
    const input = {
      title: "Bridge Rehabilitation",
      items: [{ title: "Site survey", deliverable: null }],
    }
    const result = extractPlanSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe("plan JSON schema", () => {
  it("generates a valid JSON Schema object", () => {
    const schema = planJsonSchema()
    expect(schema.type).toBe("OBJECT")
    expect(schema.properties).toBeDefined()
    expect(schema.required).toContain("title")
    expect(schema.required).toContain("items")
  })

  it("includes all top-level fields", () => {
    const schema = planJsonSchema()
    const props = schema.properties as Record<string, unknown>
    expect(props.title).toBeDefined()
    expect(props.summary).toBeDefined()
    expect(props.horizon).toBeDefined()
    expect(props.items).toBeDefined()
  })

  it("defines items as an array of objects", () => {
    const schema = planJsonSchema()
    const props = schema.properties as Record<string, any>
    expect(props.items.type).toBe("ARRAY")
    expect(props.items.items.type).toBe("OBJECT")
  })
})
