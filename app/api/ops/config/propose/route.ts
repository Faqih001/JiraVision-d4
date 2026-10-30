// /api/ops/config/propose — read a discipline document and return the config it implies.
//
// POST → { fileName, mimeType, base64 } and nothing is stored. The output is a proposal diffed against
// the pack's current config, so the reviewer sees what each item would do to the rules already in force.
// The apply route is the only door that writes, and it re-normalises whatever it is given.
//
// Admin-only, for two reasons: only an admin can apply the result, and every call spends the owner's
// Gemini quota — a proposal a member cannot act on is a quota spent for nothing.

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { defaultDisciplineOf } from "@/lib/registers/read"
import { loadOpsConfigForDiscipline } from "@/lib/ops/config-reader"
import { isGeminiAuthError, isGeminiQuotaError } from "@/lib/ops/import/extract"
import { diffConfig } from "@/lib/ops/config/diff"
import { proposeConfigFromDocument } from "@/lib/ops/config/proposal"
import { badRequest, forbidden, serverError, unauthorized } from "../../_shared"

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
  if (session.role !== "admin" && session.role !== "super_admin") {
    return forbidden("Only an admin can propose changes to a pack's operations rules.")
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return badRequest("A JSON body is required.")

    const { fileName, mimeType, base64 } = body as Record<string, unknown>

    if (typeof fileName !== "string" || !fileName.trim()) {
      return badRequest("fileName is required.")
    }
    if (typeof mimeType !== "string" || !ALLOWED_MIMES.has(mimeType)) {
      return badRequest("Unsupported file type. Allowed: PDF, text, CSV, XLSX, JPEG, PNG, WebP.")
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

    const outcome = await proposeConfigFromDocument(ctx.config, mimeType, base64, { discipline })
    const diff = diffConfig(ctx.config, outcome.proposal)

    return NextResponse.json({
      success: true,
      data: {
        packKey: ctx.packKey,
        discipline,
        proposal: outcome.proposal,
        diff: { ...diff, rejected: outcome.rejected },
        disclosure:
          "The pasted text or PDF is sent to Google for processing and is not stored. Credential values are refused; record where each one is kept instead.",
      },
    })
  } catch (error) {
    if (isGeminiQuotaError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "AI quota exceeded. The free tier allows a small number of document calls per day. Please try again tomorrow.",
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
    return serverError(error, "propose ops config")
  }
}
