// Workspace assistant — Gemini call with context (design §7)
// Returns structured response with answer, references, and dataAsOf.

import { geminiJson, GeminiError } from "@/lib/ai/gemini"
import { z } from "zod"
import { assembleWorkspaceContext, formatContextForPrompt } from "./context"

const WorkspaceResponseSchema = z.object({
  answer: z.string(),
  references: z.array(
    z.object({
      kind: z.string(),
      label: z.string(),
      count: z.number(),
    })
  ),
  dataAsOf: z.string(),
})

export type WorkspaceAssistantResponse = z.infer<typeof WorkspaceResponseSchema>

function workspaceResponseJsonSchema(): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: {
      answer: { type: "STRING" },
      references: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            kind: { type: "STRING" },
            label: { type: "STRING" },
            count: { type: "INTEGER" },
          },
          required: ["kind", "label", "count"],
        },
      },
      dataAsOf: { type: "STRING" },
    },
    required: ["answer", "references", "dataAsOf"],
  }
}

/**
 * Call workspace assistant with user's context.
 * Returns structured response with answer and references.
 */
export async function callWorkspaceAssistant(
  userId: number,
  question: string
): Promise<WorkspaceAssistantResponse> {
  // Assemble context from 5 core tables
  const context = await assembleWorkspaceContext(userId, {
    daysBack: 30,
    limit: 50,
  })

  // Format context for prompt
  const contextText = formatContextForPrompt(context)

  // If context is empty, short-circuit before calling Gemini
  if (contextText.includes("No work data found")) {
    return {
      answer:
        "I don't have any work data for you in the last 30 days. Start by logging some work in the daily worklog or creating tasks.",
      references: [],
      dataAsOf: new Date().toISOString(),
    }
  }

  // System prompt
  const systemPrompt = `You are a helpful workspace assistant for a project management system.
Answer questions about the user's work based ONLY on the context provided.
Be concise and specific. Reference actual task names, dates, and deliverables from the context.
If the context doesn't contain enough information to answer, say so clearly.
Never invent data that isn't in the context.

Context:
${contextText}`

  // Call Gemini with structured output
  try {
    const result = await geminiJson(
      {
        system: systemPrompt,
        contents: [{ text: question }],
        responseSchema: workspaceResponseJsonSchema(),
        temperature: 0.3,
        timeoutMs: 20_000,
      },
      (raw) => WorkspaceResponseSchema.parse(raw)
    )

    // Override dataAsOf with actual context timestamp
    return {
      answer: result.data.answer,
      references: result.data.references,
      dataAsOf: context.dataAsOf,
    }
  } catch (error) {
    if (error instanceof GeminiError) {
      // Map Gemini errors to user-friendly messages
      switch (error.kind) {
        case "auth":
          throw new Error("AI service not configured. Contact your administrator.")
        case "quota":
          throw new Error("AI quota exceeded. Try again later.")
        case "timeout":
          throw new Error("AI request timed out. Try again.")
        case "blocked":
          throw new Error("Your question was blocked by safety filters. Try rephrasing.")
        default:
          throw new Error("AI service unavailable. Try again later.")
      }
    }
    throw error
  }
}
