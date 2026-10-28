// Gemini provider — plain fetch against Google's API, no SDK.
// One POST per call, model discovery on cold start when GEMINI_MODEL is unset.
// Error kinds map to UI states; no stack or raw Google body reaches the client.

import { z } from "zod"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

export type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } }

export type JsonSchema = Record<string, unknown>

export type GroundingSource = { url: string; title: string | null }
export type Grounding = { queries: string[]; sources: GroundingSource[] }

function normaliseSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

/** The response's own grounding metadata, normalised; null when Google returned none. */
export function readGrounding(json: unknown): Grounding | null {
  const meta = (json as any)?.candidates?.[0]?.groundingMetadata
  if (!meta || typeof meta !== "object") return null

  const queries = Array.isArray(meta.webSearchQueries)
    ? meta.webSearchQueries.filter((q: unknown): q is string => typeof q === "string")
    : []

  const sources: GroundingSource[] = []
  const seen = new Set<string>()
  for (const chunk of Array.isArray(meta.groundingChunks) ? meta.groundingChunks : []) {
    const url = normaliseSourceUrl(chunk?.web?.uri)
    if (!url || seen.has(url)) continue
    seen.add(url)
    sources.push({ url, title: typeof chunk?.web?.title === "string" ? chunk.web.title : null })
  }

  if (queries.length === 0 && sources.length === 0) return null
  return { queries, sources }
}

export interface GeminiRequest {
  system?: string
  contents: ContentPart[]
  responseSchema?: JsonSchema
  maxOutputTokens?: number
  temperature?: number
  timeoutMs?: number
  /** Gemini 2.5 models think before answering; 0 turns that off. Extraction sets it. */
  thinkingBudget?: number
  /** Extra attempts when the provider times out; the timeoutMs budget is split between them. */
  retries?: number
  /** Enable Google Search grounding. Only the career growth actions use this. */
  googleSearch?: boolean
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

// 2.5 and later think; earlier models answer 400 to a thinkingConfig. Aliases carry no
// version and point at the latest model, so they count as thinking.
function thinks(model: string): boolean {
  const version = /gemini-(\d+)\.(\d+)/.exec(model)
  if (!version) return true
  const [major, minor] = [Number(version[1]), Number(version[2])]
  return major > 2 || (major === 2 && minor >= 5)
}

export async function geminiText(req: GeminiRequest): Promise<{ text: string; usage: TokenUsage; grounding: Grounding | null }> {
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
    if (req.googleSearch) body.tools = [{ google_search: {} }]
    if (req.thinkingBudget !== undefined && thinks(model)) {
      body.generationConfig = { thinkingConfig: { thinkingBudget: req.thinkingBudget } }
    }
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
      grounding: readGrounding(json),
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
): Promise<{ data: T; usage: TokenUsage; grounding: Grounding | null }> {
  if (!req.responseSchema) throw new GeminiError("badjson", "responseSchema is required for geminiJson")

  const model = await discoverModel()
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new GeminiError("auth", "GOOGLE_GEMINI_API_KEY is not set")
  const key = apiKey

  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUTS.extraction
  const attempts = Math.max(1, (req.retries ?? 0) + 1)
  const attemptMs = Math.max(1_000, Math.floor(timeoutMs / attempts))

  async function ask() {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), attemptMs)

    try {
      const generationConfig: Record<string, unknown> = {
        responseMimeType: "application/json",
        responseSchema: req.responseSchema,
        maxOutputTokens: req.maxOutputTokens,
        temperature: req.temperature,
      }
      if (req.thinkingBudget !== undefined && thinks(model)) {
        generationConfig.thinkingConfig = { thinkingBudget: req.thinkingBudget }
      }

      const body: Record<string, unknown> = {
        contents: req.contents.map((part) => {
          if ("text" in part) return { role: "user", parts: [{ text: part.text }] }
          return { role: "user", parts: [{ inlineData: part.inlineData }] }
        }),
        generationConfig,
      }

      if (req.system) body.systemInstruction = { parts: [{ text: req.system }] }
      if (req.googleSearch) body.tools = [{ google_search: {} }]

      const res = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
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
        grounding: readGrounding(json),
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof GeminiError) throw error
      if ((error as Error).name === "AbortError") throw new GeminiError("timeout", `Request timed out after ${attemptMs}ms`)
      throw new GeminiError("transport", `Network error: ${(error as Error).message}`)
    }
  }

  for (let attempt = 1; ; attempt++) {
    try {
      return await ask()
    } catch (error) {
      const retry = error instanceof GeminiError && error.kind === "timeout" && attempt < attempts
      if (!retry) throw error
    }
  }
}

export function resetModelCache(): void {
  cachedModel = null
}
