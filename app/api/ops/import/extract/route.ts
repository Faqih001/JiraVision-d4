// /api/ops/import/extract — send a document to Gemini for structured extraction.
// POST → accepts { fileName, mimeType, base64 } and returns the extraction preview.
// One Gemini call per document — the free tier is 15 requests/day.

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { extractFromDocument, summariseExtraction, isGeminiQuotaError, isGeminiAuthError } from "@/lib/ops/import/extract"
import { badRequest, serverError, unauthorized } from "../../_shared"

export const dynamic = "force-dynamic"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB base64 ≈ 7.5 MB raw

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
])

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return badRequest("A JSON body is required.")

    const { fileName, mimeType, base64 } = body as Record<string, unknown>

    if (typeof fileName !== "string" || !fileName.trim()) {
      return badRequest("fileName is required.")
    }
    if (typeof mimeType !== "string" || !ALLOWED_MIMES.has(mimeType)) {
      return badRequest(`Unsupported file type. Allowed: PDF, text, CSV, XLSX, JPEG, PNG, WebP.`)
    }
    if (typeof base64 !== "string" || !base64) {
      return badRequest("base64 file data is required.")
    }
    if (base64.length > MAX_FILE_SIZE) {
      return badRequest("File is too large. Maximum 10 MB after base64 encoding.")
    }

    const discipline = defaultDisciplineOf(session)
    if (!discipline) {
      return badRequest("No discipline configured for your account. Set a work discipline in Settings first.")
    }

    const ctx = await loadOpsConfigForDiscipline(discipline)
    if (!ctx) {
      return badRequest("Your discipline does not have an operations pack yet.")
    }

    const extraction = await extractFromDocument(ctx.config, mimeType, base64)
    const summary = summariseExtraction(extraction)

    return NextResponse.json({
      success: true,
      data: {
        extraction,
        summary,
        packKey: ctx.packKey,
        discipline,
      },
    })
  } catch (error) {
    if (isGeminiQuotaError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "AI quota exceeded. The free tier allows 15 document extractions per day. Please try again tomorrow.",
        },
        { status: 429 },
      )
    }
    if (isGeminiAuthError(error)) {
      return NextResponse.json(
        { success: false, message: "AI service is not configured. Contact your administrator." },
        { status: 503 },
      )
    }
    return serverError(error, "extract document")
  }
}
