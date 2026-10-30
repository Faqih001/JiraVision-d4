// POST /api/planner/extract — accept text or inline PDF, call Gemini with the plan
// schema, persist agent_plans + plan_items as a draft, return the plan id.
// Source text is stored so a plan is re-runnable without re-paying the model.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { agentPlans, planItems } from "@/drizzle/schema"
import { geminiJson, GeminiError, type ContentPart } from "@/lib/ai/gemini"
import { extractPlanSchema, planJsonSchema, type ExtractPlan } from "@/lib/planner/extract"

const MAX_PDF_BYTES = 15 * 1024 * 1024

const SYSTEM_PROMPT = `You extract structured project plans from source material (job descriptions, scopes of work, contracts, briefs).

Rules:
- Title: concise, names the project or work stream (max 200 chars).
- Summary: one paragraph capturing the overall aim (max 2000 chars). Omit if unclear.
- Horizon: proposed start and end dates (YYYY-MM-DD). Omit if the source does not imply a timeframe.
- Items: one per discrete work package or deliverable-producing task.
  - title: imperative, specific (max 200 chars).
  - description: what the item covers (max 2000 chars).
  - acceptanceCriteria: testable statements (max 10, each max 500 chars).
  - discipline: one of civil, electrical, mechanical, structural, geotechnical, environmental, planning, management, other (max 40 chars).
  - estimatePoints: story-point effort 0–100.
  - startDate, dueDate: YYYY-MM-DD when the source implies timing.
  - dependsOnItemIndex: zero-based indices of items that must precede this one. No cycles.
  - milestone: true when the item is a gate, handover, or approval point.
  - cadence: daily | weekly | monthly | quarterly | yearly when the item recurs.
  - deliverable: { name, type } when the source names a tangible output; null otherwise.
- Prefer fewer well-scoped items over many vague ones. Ten to thirty items is typical.
- If the source is ambiguous, extract what is there and leave optional fields absent rather than guessing.`

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  let body: { text?: string; pdf?: { mimeType: string; data: string }; sourceName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  const hasText = typeof body.text === "string" && body.text.trim().length > 0
  const hasPdf = !!body.pdf && typeof body.pdf.data === "string" && typeof body.pdf.mimeType === "string"

  if (!hasText && !hasPdf) {
    return NextResponse.json(
      { success: false, message: "Provide text or pdf" },
      { status: 400 },
    )
  }

  const contents: ContentPart[] = []
  let sourceKind: "text" | "pdf" = "text"
  let sourceText: string | null = null

  if (hasPdf) {
    const byteLength = Buffer.byteLength(body.pdf!.data, "base64")
    if (byteLength > MAX_PDF_BYTES) {
      return NextResponse.json(
        { success: false, message: `PDF exceeds ${MAX_PDF_BYTES / (1024 * 1024)}MB limit` },
        { status: 400 },
      )
    }
    sourceKind = "pdf"
    contents.push({ inlineData: { mimeType: body.pdf!.mimeType, data: body.pdf!.data } })
    contents.push({ text: "Extract a structured project plan from the attached PDF." })
    // Store the base64 so the plan is re-runnable without re-uploading.
    sourceText = body.pdf!.data
  } else {
    sourceText = body.text!.trim()
    contents.push({ text: sourceText! })
    contents.push({ text: "Extract a structured project plan from the text above." })
  }

  let plan: ExtractPlan
  let modelUsed: string | null = null
  try {
    const result = await geminiJson(
      {
        system: SYSTEM_PROMPT,
        contents,
        responseSchema: planJsonSchema(),
        // Thinking counts against maxOutputTokens on the 2.5 models. Without a bound the model
        // could spend the whole 8192-token budget reasoning and stop before the JSON was closed,
        // which is exactly the "failed to convert response to JSON" the dev log reported. Cap the
        // thinking, and widen the ceiling so a thirty-item plan still has room to finish.
        thinkingBudget: 1024,
        maxOutputTokens: 16384,
        temperature: 0.2,
        timeoutMs: 120_000,
      },
      (raw) => extractPlanSchema.parse(raw),
    )
    plan = result.data
    modelUsed = process.env.GEMINI_MODEL ?? null
  } catch (error) {
    if (error instanceof GeminiError) {
      // A truncation is not a malformed answer: the model had the right shape but ran out of room.
      // The only fix the member can apply is a shorter or split brief, so say that rather than
      // surfacing the generic provider message.
      if (error.tag === "truncated") {
        return NextResponse.json(
          {
            success: false,
            message: "The brief was too long for one pass; shorten it or split it.",
            kind: error.kind,
          },
          { status: 502 },
        )
      }
      return NextResponse.json(
        { success: false, message: error.message, kind: error.kind },
        { status: error.kind === "auth" ? 500 : error.kind === "quota" ? 429 : 502 },
      )
    }
    const message = error instanceof Error ? error.message : "Extraction failed"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }

  const [planRow] = await db
    .insert(agentPlans)
    .values({
      title: plan.title,
      summary: plan.summary ?? null,
      sourceKind,
      sourceName: body.sourceName ?? null,
      sourceText,
      model: modelUsed,
      horizonStart: plan.horizon?.start ?? null,
      horizonEnd: plan.horizon?.end ?? null,
      status: "draft",
      createdBy: session.id,
    })
    .returning()

  if (!planRow) {
    return NextResponse.json({ success: false, message: "Failed to create plan" }, { status: 500 })
  }

  if (plan.items.length > 0) {
    await db.insert(planItems).values(
      plan.items.map((item, index) => ({
        planId: planRow.id,
        title: item.title,
        description: item.description ?? null,
        discipline: item.discipline ?? null,
        estimatePoints: item.estimatePoints ?? 0,
        startDate: item.startDate ?? null,
        dueDate: item.dueDate ?? null,
        status: "todo",
        dependsOn: item.dependsOnItemIndex ?? [],
        milestone: item.milestone ?? false,
        cadence: item.cadence ?? null,
        sortOrder: index,
        deliverable: item.deliverable ?? null,
      })),
    )
  }

  return NextResponse.json({ success: true, planId: planRow.id }, { status: 201 })
}
