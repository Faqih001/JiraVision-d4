// GET /api/ai/health — a development-only round trip to the provider. It answers the two things a
// failing AI surface cannot tell you on its own: is a key + reachable model actually configured, and
// how long does a cold call take. It sends a one-token prompt (no real content, so it costs the
// least it can) and reports the model discovery resolved to plus the measured latency.
//
// Gated twice: to NODE_ENV === "development" (it is never served in production) and to a signed-in
// session, so it is a local diagnostic rather than a public probe of the provider or a way to spend
// the owner's quota from outside. A database that did not answer is a 503, never a 401.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { SessionUnreachableError } from "@/lib/auth/session-state"
import { geminiText, resolveModelName, GeminiError } from "@/lib/ai/gemini"

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let session
  try {
    session = await getSession()
  } catch (error) {
    if (error instanceof SessionUnreachableError) {
      return NextResponse.json({ error: "Database is waking up. Try again in a moment." }, { status: 503 })
    }
    throw error
  }
  if (!session || typeof session.id !== "number") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()
  try {
    const model = await resolveModelName()
    const { text, usage } = await geminiText({
      contents: [{ text: "Reply with the single word: ok" }],
      maxOutputTokens: 1,
      thinkingBudget: 0,
      temperature: 0,
      timeoutMs: 20_000,
    })
    return NextResponse.json({
      ok: true,
      model,
      latencyMs: Date.now() - startedAt,
      echo: text.slice(0, 20),
      usage,
    })
  } catch (error) {
    const kind = error instanceof GeminiError ? error.kind : "unknown"
    return NextResponse.json(
      { ok: false, model: process.env.GEMINI_MODEL ?? null, latencyMs: Date.now() - startedAt, kind },
      { status: 502 },
    )
  }
}
