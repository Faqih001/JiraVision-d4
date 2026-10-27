// POST /api/agent/recommendations — the rule list always, the AI twin only when asked
// (design §12 item 6). The client sends a flag, never facts; the rows are re-read with the
// session, so a tampered body cannot steer what the member is shown. Nothing is persisted.

import { NextResponse } from "next/server"
import { geminiJson } from "@/lib/ai/gemini"
import {
  buildRecommendations,
  RECOMMEND_SCHEMA,
  RECOMMEND_SYSTEM,
  readAiSuggestions,
  recommendationPrompt,
  type Recommendation,
} from "@/lib/recommend/next"
import { loadRecommendInput } from "@/lib/recommend/read"
import { agentSession, bad, geminiFailure } from "../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const wantsAi = body.ai === true

  try {
    const input = await loadRecommendInput({
      session: {
        id: gate.id,
        email: gate.email,
        role: gate.role,
        timezone: gate.timezone,
        preferences: gate.preferences,
      },
      today: gate.today,
    })
    const rules = buildRecommendations(input)
    const aiAvailable = Boolean(process.env.GOOGLE_GEMINI_API_KEY)

    let ai: Recommendation[] = []
    if (wantsAi) {
      const { data } = await geminiJson(
        {
          system: RECOMMEND_SYSTEM,
          contents: [{ text: recommendationPrompt(input, rules) }],
          responseSchema: RECOMMEND_SCHEMA,
          temperature: 0.2,
          timeoutMs: 45_000,
        },
        (raw) => readAiSuggestions(raw, input),
      )
      ai = data
    }

    return NextResponse.json({
      success: true,
      data: { rules, ai, aiAvailable, today: gate.today },
    })
  } catch (error) {
    return geminiFailure(error) ?? bad("The suggestions could not be loaded.", 500)
  }
}
