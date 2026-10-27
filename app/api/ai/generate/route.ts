// /api/ai/generate — real Gemini provider, no mock branches.
// POST { system?, contents, responseSchema?, maxOutputTokens?, temperature? }
// Returns { text, usage } for text requests, { data, usage } for JSON requests.
// Maps GeminiError.kind to UI-friendly error responses.

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { geminiText, geminiJson, GeminiError, type ContentPart, type JsonSchema } from "@/lib/ai/gemini"

export const dynamic = "force-dynamic"

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, message }, { status: 400 })
}

function mapErrorKind(kind: string): { status: number; uiState: string } {
  switch (kind) {
    case "auth":
      return { status: 401, uiState: "API key missing or invalid" }
    case "quota":
      return { status: 429, uiState: "Rate limit exceeded" }
    case "blocked":
      return { status: 400, uiState: "Content blocked by safety filter" }
    case "timeout":
      return { status: 504, uiState: "Request timed out" }
    case "badjson":
      return { status: 500, uiState: "Invalid response from AI" }
    default:
      return { status: 500, uiState: "AI service unavailable" }
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = await request.json()
    const { system, contents, responseSchema, maxOutputTokens, temperature, timeoutMs } = body

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return badRequest("contents must be a non-empty array")
    }

    const req = {
      system,
      contents: contents as ContentPart[],
      responseSchema: responseSchema as JsonSchema | undefined,
      maxOutputTokens,
      temperature,
      timeoutMs,
    }

    if (responseSchema) {
      const parse = (raw: unknown) => raw
      const { data, usage } = await geminiJson(req, parse)
      return NextResponse.json({ success: true, data, usage })
    }

    const { text, usage } = await geminiText(req)
    return NextResponse.json({ success: true, text, usage })
  } catch (error) {
    if (error instanceof GeminiError) {
      const { status, uiState } = mapErrorKind(error.kind)
      return NextResponse.json(
        { success: false, message: uiState, kind: error.kind },
        { status },
      )
    }
    console.error("AI generate error:", error)
    return NextResponse.json(
      { success: false, message: "AI service error", kind: "transport" },
      { status: 500 },
    )
  }
}
