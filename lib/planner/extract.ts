// Plan extraction schema — zod validation for the Gemini structured output.
// The extraction proposes deliverables too, because a job description usually names them
// ("produce the audit programme", "hand over the as-built drawings") and those become
// deliverables rows on promote. dependsOnItemIndex is index-based while the batch has
// no ids and resolves to real ids at promote.

import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")

export const extractDeliverableSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(50),
})

export const extractItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  acceptanceCriteria: z.array(z.string().max(500)).max(10).optional(),
  discipline: z.string().max(40).optional(),
  estimatePoints: z.number().int().min(0).max(100).optional(),
  startDate: isoDate.optional(),
  dueDate: isoDate.optional(),
  dependsOnItemIndex: z.array(z.number().int().min(0)).max(20).optional(),
  milestone: z.boolean().optional(),
  cadence: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).optional(),
  deliverable: extractDeliverableSchema.nullable().optional(),
})

export const extractPlanSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  horizon: z
    .object({
      start: isoDate,
      end: isoDate,
    })
    .optional(),
  items: z.array(extractItemSchema).min(1).max(100),
})

export type ExtractPlan = z.infer<typeof extractPlanSchema>
export type ExtractItem = z.infer<typeof extractItemSchema>
export type ExtractDeliverable = z.infer<typeof extractDeliverableSchema>

/** Convert the zod schema to a JSON Schema object for Gemini's responseSchema. */
export function planJsonSchema(): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      summary: { type: "STRING" },
      horizon: {
        type: "OBJECT",
        properties: {
          start: { type: "STRING" },
          end: { type: "STRING" },
        },
        required: ["start", "end"],
      },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            acceptanceCriteria: { type: "ARRAY", items: { type: "STRING" } },
            discipline: { type: "STRING" },
            estimatePoints: { type: "INTEGER" },
            startDate: { type: "STRING" },
            dueDate: { type: "STRING" },
            dependsOnItemIndex: { type: "ARRAY", items: { type: "INTEGER" } },
            milestone: { type: "BOOLEAN" },
            cadence: { type: "STRING", enum: ["daily", "weekly", "monthly", "quarterly", "yearly"] },
            deliverable: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                type: { type: "STRING" },
              },
              required: ["name", "type"],
            },
          },
          required: ["title"],
        },
      },
    },
    required: ["title", "items"],
  }
}
