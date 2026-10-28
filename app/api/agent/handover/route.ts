// POST /api/agent/handover — preview only (design §16 entry 18). The pasted text or PDF lives
// in memory for this request and is never stored or logged; the response is normalised drafts
// plus the refusals, and the client decides what to commit. Credential values are refused by
// the prompt and again by `readHandover` before anything reaches the browser.

import { NextResponse } from "next/server"
import { geminiJson, type ContentPart } from "@/lib/ai/gemini"
import { HANDOVER_SCHEMA, HANDOVER_SYSTEM, handoverPrompt, readHandover } from "@/lib/agent/handover"
import { defaultMethod } from "@/lib/playbooks/method"
import { loadPacks } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { agentSession, bad, geminiFailure } from "../_shared"

export const dynamic = "force-dynamic"

export const MAX_TEXT = 60_000
export const MAX_PDF_BYTES = 15 * 1024 * 1024

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const packKey = typeof body.packKey === "string" ? body.packKey.trim() : ""
  if (!packKey) return bad("packKey is required")

  const text = typeof body.text === "string" ? body.text.trim() : ""
  const rawPdf = body.pdf as { mimeType?: unknown; data?: unknown } | undefined
  const pdf =
    rawPdf && typeof rawPdf.mimeType === "string" && typeof rawPdf.data === "string"
      ? { mimeType: rawPdf.mimeType, data: rawPdf.data }
      : null

  if (Boolean(text) === Boolean(pdf)) {
    return bad("Send either pasted text or one PDF, not both.")
  }
  if (text.length > MAX_TEXT) {
    return bad(`The pasted text is longer than ${MAX_TEXT} characters.`)
  }
  if (pdf) {
    if (pdf.mimeType !== "application/pdf") return bad("The attachment must be a PDF.")
    const bytes = Math.ceil((pdf.data.length * 3) / 4)
    if (bytes > MAX_PDF_BYTES) return bad("The PDF is larger than 15 MB.")
  }

  try {
    const packs = await loadPacks(false)
    const pack = packByKey(packs, packKey)
    if (!pack) return bad("That role pack does not exist or is inactive.", 404)

    const handoverPack = {
      packKey: pack.packKey,
      title: pack.title,
      kinds: pack.registerKinds.map((entry) => entry.key),
      method: defaultMethod(pack.method),
    }

    const contents: ContentPart[] = [
      {
        text: `${handoverPrompt({ pack: handoverPack, source: pdf ? "pdf" : "text" })}\n\n${text}`,
      },
    ]
    if (pdf) {
      contents.push({ inlineData: { mimeType: "application/pdf", data: pdf.data } })
    }

    const { data } = await geminiJson(
      {
        system: HANDOVER_SYSTEM,
        contents,
        responseSchema: HANDOVER_SCHEMA,
        temperature: 0.1,
        // Thinking costs ~9k tokens on a handover PDF: 68s measured on, 24–36s off. Off, with
        // one retry inside the same 120s so Google's occasional stall doesn't become a 504.
        thinkingBudget: 0,
        retries: 1,
        timeoutMs: 120_000,
      },
      (raw) => readHandover(raw, handoverPack),
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return geminiFailure(error) ?? bad("The handover could not be read.", 500)
  }
}
