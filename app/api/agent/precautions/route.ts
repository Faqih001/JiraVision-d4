// POST /api/agent/precautions — suggestions for the editor's unsaved draft. Nothing is
// stored: the member accepts a line into their own draft, and only saving the playbook
// writes anything. A provider failure is a 503, not an invented precaution.

import { NextResponse } from "next/server"
import { geminiJson } from "@/lib/ai/gemini"
import {
  PRECAUTIONS_SCHEMA,
  PRECAUTIONS_SYSTEM,
  precautionsPrompt,
  readPrecautionDraft,
  readPrecautions,
} from "@/lib/agent/precautions"
import { agentSession, bad, geminiFailure } from "../_shared"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const draft = readPrecautionDraft(body.playbook)
  if (!draft.ok) return bad(draft.error)

  try {
    const { data } = await geminiJson(
      {
        system: PRECAUTIONS_SYSTEM,
        contents: [{ text: precautionsPrompt(draft.value) }],
        responseSchema: PRECAUTIONS_SCHEMA,
        temperature: 0.3,
        timeoutMs: 45_000,
      },
      (raw) => readPrecautions(raw, draft.value.existing),
    )
    return NextResponse.json({ success: true, data: { suggestions: data } })
  } catch (error) {
    return geminiFailure(error) ?? bad("No precaution could be drafted.", 500)
  }
}
