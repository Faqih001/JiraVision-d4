// Gemini provider — plain fetch against Google's API, no SDK.
// One POST per call, model discovery on cold start when GEMINI_MODEL is unset.
// Error kinds map to UI states; no stack or raw Google body reaches the client.

import { z } from "zod"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

export type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } }

export type JsonSchema = Record<string, unknown>

export interface GeminiRequest {
  system?: string
  contents: ContentPart[]
  responseSchema?: JsonSchema
  maxOutputTokens?: number
  temperature?: number
  timeoutMs?: number
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type GeminiErrorKind = "auth" | "quota" | "blocked" | "timeout" | "transport" | "badjson"

export class GeminiError extends Error {
  kind: GeminiErrorKind
  constructor(kind: GeminiErrorKind, message: string) {
    super(message)
    this.name = "GeminiError"
    this.kind = kind
  }
}

const DEFAULT_TIMEOUTS = {
  chat: 20_000,
  extraction: 120_000,
  prose: 45_000,
} as const

let cachedModel: string | null = null

async function discoverModel(): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL
  if (cachedModel) return cachedModel

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new GeminiError("auth", "GOOGLE_GEMINI_API_KEY is not set")

  const res = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`, {
    method: "GET",
    headers: { "x-goog-api-key": apiKey },
  })

  if (!res.ok) {
    const text = await res.text()
    if (res.status === 401 || res.status === 403) throw new GeminiError("auth", `Model discovery failed: ${res.status}`)
    if (res.status === 429) throw new GeminiError("quota", "Model discovery rate limited")
    throw new GeminiError("transport", `Model discovery failed: ${res.status} ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  const models = json.models ?? []
  const textModel = models.find(
    (m: any) =>
      m.supportedGenerationMethods?.includes("generateContent") &&
      !m.name.includes("vision") &&
      !m.name.includes("embedding"),
  )

  if (!textModel) throw new GeminiError("transport", "No text-capable generation model found")

  cachedModel = textModel.name.replace(/^models\//, "")
  return cachedModel!
}

function classifyError(status: number, body: string): GeminiErrorKind {
  if (status === 401 || status === 403) return "auth"
  if (status === 429) return "quota"
  if (status === 400 && /blocked|safety/i.test(body)) return "blocked"
  if (status >= 500) return "transport"
  return "transport"
}

export async function geminiText(req: GeminiRequest): Promise<{ text: string; usage: TokenUsage }> {
  const model = await discoverModel()
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new GeminiError("auth", "GOOGLE_GEMINI_API_KEY is not set")

  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUTS.chat
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const body: Record<string, unknown> = {
      contents: req.contents.map((part) => {
        if ("text" in part) return { role: "user", parts: [{ text: part.text }] }
        return { role: "user", parts: [{ inlineData: part.inlineData }] }
      }),
    }

    if (req.system) body.systemInstruction = { parts: [{ text: req.system }] }
    if (req.maxOutputTokens) body.maxOutputTokens = req.maxOutputTokens
    if (req.temperature !== undefined) body.temperature = req.temperature

    const res = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text()
      throw new GeminiError(classifyError(res.status, text), `Gemini request failed: ${res.status}`)
    }

    const json = await res.json()
    const candidate = json.candidates?.[0]
    if (!candidate?.content?.parts?.[0]?.text) {
      throw new GeminiError("badjson", "No text in Gemini response")
    }

    const usage = json.usageMetadata ?? {}
    return {
      text: candidate.content.parts[0].text,
      usage: {
        promptTokens: usage.promptTokenCount ?? 0,
        completionTokens: usage.candidatesTokenCount ?? 0,
        totalTokens: usage.totalTokenCount ?? 0,
      },
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof GeminiError) throw error
    if ((error as Error).name === "AbortError") throw new GeminiError("timeout", `Request timed out after ${timeoutMs}ms`)
    throw new GeminiError("transport", `Network error: ${(error as Error).message}`)
  }
}

export async function geminiJson<T>(
  req: GeminiRequest,
  parse: (raw: unknown) => T,
): Promise<{ data: T; usage: TokenUsage }> {
  if (!req.responseSchema) throw new GeminiError("badjson", "responseSchema is required for geminiJson")

  const model = await discoverModel()
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new GeminiError("auth", "GOOGLE_GEMINI_API_KEY is not set")

  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUTS.extraction
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const body: Record<string, unknown> = {
      contents: req.contents.map((part) => {
        if ("text" in part) return { role: "user", parts: [{ text: part.text }] }
        return { role: "user", parts: [{ inlineData: part.inlineData }] }
      }),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: req.responseSchema,
        maxOutputTokens: req.maxOutputTokens,
        temperature: req.temperature,
      } as Record<string, unknown>,
    }

    if (req.system) body.systemInstruction = { parts: [{ text: req.system }] }

    const res = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text()
      throw new GeminiError(classifyError(res.status, text), `Gemini request failed: ${res.status}`)
    }

    const json = await res.json()
    const candidate = json.candidates?.[0]
    const rawText = candidate?.content?.parts?.[0]?.text

    if (!rawText) throw new GeminiError("badjson", "No text in Gemini response")

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      throw new GeminiError("badjson", "Invalid JSON in Gemini response")
    }

    const data = parse(parsed)
    const usage = json.usageMetadata ?? {}
    return {
      data,
      usage: {
        promptTokens: usage.promptTokenCount ?? 0,
        completionTokens: usage.candidatesTokenCount ?? 0,
        totalTokens: usage.totalTokenCount ?? 0,
      },
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof GeminiError) throw error
    if ((error as Error).name === "AbortError") throw new GeminiError("timeout", `Request timed out after ${timeoutMs}ms`)
    throw new GeminiError("transport", `Network error: ${(error as Error).message}`)
  }
}

export function resetModelCache(): void {
  cachedModel = null
}
