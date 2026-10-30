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
  /**
   * Optional machine-readable sub-reason, e.g. "truncated". The message is always generic and
   * provider-free so nothing from Google reaches the browser; the tag lets a caller pick a
   * distinct, actionable user-facing string for the same error kind.
   */
  tag?: string
  constructor(kind: GeminiErrorKind, message: string, tag?: string) {
    super(message)
    this.name = "GeminiError"
    this.kind = kind
    this.tag = tag
  }
}

const DEFAULT_TIMEOUTS = {
  chat: 20_000,
  extraction: 120_000,
  prose: 45_000,
} as const

// The total timeoutMs budget is shared between the first try and its retries so a request never
// runs longer than it promised. Kept as a pure function (and exported) so the split is testable
// without driving the whole network path, and so the planner and the handover route agree on the
// same window before they decide whether to ask for a retry at all.
export function computeAttemptMs(timeoutMs: number, retries: number | undefined): number {
  const attempts = Math.max(1, (retries ?? 0) + 1)
  const attemptMs = Math.max(1_000, Math.floor(timeoutMs / attempts))
  return attemptMs
}

// Gemini sometimes wraps a structured answer in a markdown code fence even when responseMimeType is
// application/json. Strip a leading ```lang and a trailing ``` so the JSON body can be parsed; a
// reply that was never fenced comes back trimmed and otherwise untouched.
export function stripJsonFences(text: string): string {
  const trimmed = text.trim()
  const fenced = /^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n?```$/u.exec(trimmed)
  return fenced ? fenced[1].trim() : trimmed
}

// Parse a Gemini JSON reply, recovering from an accidental code fence before giving up. Throws a
// plain Error on genuine garbage; the caller turns that into a GeminiError so no raw provider body
// or stack ever reaches a response the browser can read.
export function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const unfenced = stripJsonFences(text)
    if (unfenced === text.trim()) throw new Error("Invalid JSON in Gemini response")
    return JSON.parse(unfenced)
  }
}

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
  const textCapable = models.filter(
    (m: any) =>
      m.supportedGenerationMethods?.includes("generateContent") &&
      !m.name.includes("vision") &&
      !m.name.includes("embedding"),
  )

  // Cold start with no GEMINI_MODEL: prefer a flash-class model. Discovery used to take the first
  // name the API listed (often a heavier pro model), making every un-set deployment slow and
  // expensive. flash-lite is cheaper but weaker at structured extraction, so a plain flash is the
  // default and the first text-capable model is the fallback.
  const flash =
    textCapable.find((m: any) => /flash/i.test(m.name) && !/lite/i.test(m.name)) ??
    textCapable.find((m: any) => /flash/i.test(m.name))
  const textModel = flash ?? textCapable[0]

  if (!textModel) throw new GeminiError("transport", "No text-capable generation model found")

  cachedModel = textModel.name.replace(/^models\//, "")
  // The chosen model is the single most useful fact for reading a later timeout or truncation, and
  // on a cold start it is otherwise invisible because nobody set GEMINI_MODEL.
  console.info(`[gemini] model discovery selected ${cachedModel} from ${textCapable.length} text-capable models`)
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
  const attemptMs = computeAttemptMs(timeoutMs, req.retries)

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
      const usage = json.usageMetadata ?? {}

      // On the 2.5 models the thinking tokens are counted against maxOutputTokens, so a reply that
      // thinks at length can run out of the output budget mid-JSON: the body is a real answer that
      // was simply cut off. finishReason says so directly, and that is a different failure from the
      // model sending back something that was never JSON — the caller can only fix it by giving the
      // call a bigger window or a shorter brief, not by parsing harder.
      const truncated = candidate?.finishReason === "MAX_TOKENS"
      if (truncated || !rawText) {
        const detail = {
          model,
          finishReason: candidate?.finishReason ?? null,
          promptTokenCount: usage.promptTokenCount ?? null,
          candidatesTokenCount: usage.candidatesTokenCount ?? null,
          thoughtsTokenCount: usage.thoughtsTokenCount ?? null,
          maxOutputTokens: req.maxOutputTokens ?? null,
          head: rawText ? rawText.slice(0, 200) : null,
          tail: rawText && rawText.length > 200 ? rawText.slice(-200) : null,
        }
        // Server-side only. The raw provider body must never ride back in a client-visible error.
        console.error("[gemini] truncated json response", detail)
        throw new GeminiError(
          "badjson",
          truncated ? "Gemini response was truncated" : "No text in Gemini response",
          truncated ? "truncated" : undefined,
        )
      }

      let parsed: unknown
      try {
        parsed = parseJsonObject(rawText)
      } catch {
        console.error("[gemini] unparseable json response", {
          model,
          finishReason: candidate?.finishReason ?? null,
          head: rawText.slice(0, 200),
          tail: rawText.length > 200 ? rawText.slice(-200) : null,
        })
        throw new GeminiError("badjson", "Invalid JSON in Gemini response")
      }

      const data = parse(parsed)
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
    const startedAt = Date.now()
    try {
      const result = await ask()
      console.info(`[gemini] json attempt ${attempt}/${attempts} ok in ${Date.now() - startedAt}ms model=${model} attemptMs=${attemptMs}`)
      return result
    } catch (error) {
      const ms = Date.now() - startedAt
      const retry = error instanceof GeminiError && error.kind === "timeout" && attempt < attempts
      // The split budget is invisible from the outside, so each attempt's real duration is logged
      // here: a 504 that is two 60s stalls looks identical to one 120s call otherwise.
      console.warn(
        `[gemini] json attempt ${attempt}/${attempts} failed in ${ms}ms model=${model} attemptMs=${attemptMs} kind=${error instanceof GeminiError ? error.kind : "unknown"}${retry ? " retrying" : ""}`,
      )
      if (!retry) throw error
    }
  }
}

export function resetModelCache(): void {
  cachedModel = null
}

/**
 * The model a request would resolve to right now — GEMINI_MODEL if set, otherwise whatever
 * discovery picked. Read through the one door so a caller never guesses the active model; the
 * dev-only health probe reports it next to the latency it measured.
 */
export function resolveModelName(): Promise<string> {
  return discoverModel()
}
