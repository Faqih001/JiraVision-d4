// One session gate and one provider-error map for the agent routes, so all four refuse an
// anonymous request the same way and no route leaks Google's status text to a client.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { GeminiError, type GeminiErrorKind } from "@/lib/ai/gemini"
import { isSuperAdmin } from "@/lib/roles"
import { localDay } from "@/lib/worklog/local-day"

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export type AgentGate = {
  id: number
  email: string
  role?: string | null
  timezone?: string | null
  preferences?: unknown
  admin: boolean
  today: string
}

export async function agentSession(): Promise<AgentGate | null> {
  const session = await getSession()
  if (!session?.id) return null
  return {
    id: session.id,
    email: session.email,
    role: session.role,
    timezone: session.timezone,
    preferences: session.preferences,
    admin: isSuperAdmin(session),
    today: localDay(new Date(), session.timezone),
  }
}

const PROVIDER_STATUS: Record<GeminiErrorKind, number> = {
  auth: 503,
  quota: 429,
  blocked: 422,
  timeout: 504,
  transport: 502,
  badjson: 502,
}

const PROVIDER_MESSAGE: Record<GeminiErrorKind, string> = {
  auth: "AI drafting is not configured on this deployment.",
  quota: "The AI provider is rate-limited or out of quota for this key. Try again later.",
  blocked: "The AI provider refused this content.",
  timeout: "The AI provider did not answer in time.",
  transport: "The AI provider could not be reached.",
  badjson: "The AI answer did not survive validation.",
}

export function geminiFailure(error: unknown): NextResponse | null {
  if (!(error instanceof GeminiError)) return null
  // A truncation is actionable in a way a generic badjson is not: the answer had the right shape but
  // ran out of output room, so the member needs a shorter brief or to split it, not a retry.
  if (error.tag === "truncated") {
    return bad("The handover was too long for one pass; shorten the text or split it across a few documents.", 502)
  }
  return bad(PROVIDER_MESSAGE[error.kind], PROVIDER_STATUS[error.kind])
}
