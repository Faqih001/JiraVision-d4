// /api/career/growth — the four Growth AI actions (design §11). Reads and writes are
// scoped to the session member. Learning and benchmark answers are checked against
// Google Search grounding: a URL the response did not ground is dropped, and an
// answer with no grounded source is not saved. Nothing here writes career_levels.

import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { growthReviews } from "@/drizzle/schema"
import { geminiJson, geminiText, GeminiError } from "@/lib/ai/gemini"
import { isLadderDiscipline } from "@/lib/career/ladder-seed"
import { loadCareerProfile } from "@/lib/career/profile"
import { createGapPlan } from "@/lib/career/gap-plan"
import { localDay } from "@/lib/worklog/local-day"
import type { CareerSignalKey } from "@/lib/career/signals"
import {
  GROWTH_ACTIONS,
  benchmarkJsonSchema,
  benchmarkPrompt,
  filterGrounded,
  isGrowthAction,
  learningJsonSchema,
  learningPrompt,
  readBenchmark,
  readLearningPath,
  readTaskSuggestions,
  reviewPrompt,
  taskSuggestionsPrompt,
  tasksJsonSchema,
  type GrowthContext,
} from "@/lib/career/growth"
import { bad, careerSession, unauthorized } from "../_shared"

export const dynamic = "force-dynamic"
export const GROWTH_LIST_LIMIT = 20

const AI_ERROR: Record<GeminiError["kind"], { status: number; message: string }> = {
  auth: { status: 503, message: "Growth AI is not configured." },
  quota: { status: 429, message: "The AI provider is rate limited. Try again later." },
  blocked: { status: 422, message: "The AI provider refused this request." },
  timeout: { status: 504, message: "The AI provider timed out." },
  transport: { status: 502, message: "The AI provider could not be reached." },
  badjson: { status: 502, message: "The AI provider returned an unusable answer." },
}

const MODEL = () => process.env.GEMINI_MODEL ?? null

export async function GET() {
  const member = await careerSession()
  if (!member) return unauthorized()

  try {
    const reviews = await db
      .select()
      .from(growthReviews)
      .where(eq(growthReviews.userId, member.id))
      .orderBy(desc(growthReviews.asOf), desc(growthReviews.id))
      .limit(GROWTH_LIST_LIMIT)

    return NextResponse.json({
      success: true,
      data: {
        aiAvailable: Boolean(process.env.GOOGLE_GEMINI_API_KEY),
        reviews,
      },
    })
  } catch (error) {
    console.error("Growth read error:", error)
    return NextResponse.json({ success: false, error: "Failed to load growth results" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const member = await careerSession()
  if (!member) return unauthorized()

  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; discipline?: unknown }
    | null
  if (!isGrowthAction(body?.action)) {
    return bad(`action must be one of: ${GROWTH_ACTIONS.join(", ")}`)
  }
  const action = body.action
  const discipline = body.discipline
  if (!isLadderDiscipline(discipline)) return bad("Unknown career discipline")

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "Growth AI is not configured. Set GOOGLE_GEMINI_API_KEY." },
      { status: 503 },
    )
  }

  try {
    const profile = await loadCareerProfile({
      userId: member.id,
      discipline,
      timeZone: member.timezone,
    })
    if (!profile.placement) return bad("You are not placed in this discipline yet", 409)
    if (!profile.next || !profile.readiness || !profile.signals) {
      return bad("You are at the top of this ladder", 409)
    }

    const context: GrowthContext = {
      memberName: member.name,
      discipline,
      fromLevel: profile.placement.level,
      currentTitle: profile.current?.title ?? null,
      toLevel: profile.next.level,
      nextTitle: profile.next.title,
      nextSummary: profile.next.summary,
      signals: profile.signals,
      targets: profile.next.targets,
      readiness: profile.readiness,
      history: profile.history.map((entry) => ({
        fromLevel: entry.fromLevel,
        toLevel: entry.toLevel,
      })),
      asOfDay: localDay(new Date(), member.timezone),
    }

    if (action === "review") {
      const prompt = reviewPrompt(context)
      const result = await geminiText({
        system: prompt.system,
        contents: [{ text: prompt.user }],
        temperature: 0.3,
        maxOutputTokens: 2048,
        timeoutMs: 45_000,
      })
      const narrative = result.text.trim().slice(0, 12_000)
      if (!narrative) return bad("The AI provider returned an empty review.", 502)

      const [review] = await db
        .insert(growthReviews)
        .values({
          userId: member.id,
          kind: action,
          payload: {
            discipline,
            fromLevel: context.fromLevel,
            toLevel: context.toLevel,
            signals: context.signals,
            readiness: context.readiness,
            asOfDay: context.asOfDay,
          },
          narrative,
          sourceRefs: Object.entries(context.signals).map(([key, actual]) => ({
            kind: "signal",
            key,
            actual,
            target: context.targets[key as CareerSignalKey] ?? 0,
          })),
          model: MODEL(),
          aiMarked: true,
        })
        .returning()

      return NextResponse.json({ success: true, data: { review } })
    }

    if (action === "task_suggestions") {
      const prompt = taskSuggestionsPrompt(context)
      const result = await geminiJson(
        {
          system: prompt.system,
          contents: [{ text: prompt.user }],
          responseSchema: tasksJsonSchema(),
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        readTaskSuggestions,
      )
      if (!result.data.ok) return bad("The AI provider returned unusable task suggestions.", 502)

      const created = await createGapPlan({
        userId: member.id,
        discipline,
        fromLevel: context.fromLevel,
        toLevel: context.toLevel,
        nextTitle: context.nextTitle,
        model: MODEL(),
        tasks: result.data.tasks,
        gaps: context.readiness.gaps,
        signals: context.signals,
        asOfDay: context.asOfDay,
      })

      const [review] = await db
        .select()
        .from(growthReviews)
        .where(eq(growthReviews.id, created.reviewId))
        .limit(1)

      return NextResponse.json({ success: true, data: { review, planId: created.planId } })
    }

    if (action === "learning") {
      const prompt = learningPrompt(context)
      const result = await geminiJson(
        {
          system: prompt.system,
          contents: [{ text: prompt.user }],
          responseSchema: learningJsonSchema(),
          googleSearch: true,
          temperature: 0.2,
          maxOutputTokens: 4096,
          timeoutMs: 90_000,
        },
        readLearningPath,
      )
      const read = result.data
      if (!read.ok) return bad("The AI provider returned an unusable learning path.", 502)

      const filtered = filterGrounded(read.items, result.grounding)
      if (filtered.kept.length === 0) {
        return bad("No grounded sources were returned; nothing was saved.", 502)
      }

      const [review] = await db
        .insert(growthReviews)
        .values({
          userId: member.id,
          kind: "learning",
          payload: {
            discipline,
            fromLevel: context.fromLevel,
            toLevel: context.toLevel,
            items: filtered.kept,
            dropped: filtered.dropped,
            queries: result.grounding?.queries ?? [],
            asOfDay: context.asOfDay,
          },
          narrative: null,
          sourceRefs: filtered.kept.map((item) => ({ url: item.url, title: item.title })),
          model: MODEL(),
          aiMarked: true,
        })
        .returning()

      return NextResponse.json({ success: true, data: { review } })
    }

    if (action === "benchmark") {
      const prompt = benchmarkPrompt(context)
      const result = await geminiJson(
        {
          system: prompt.system,
          contents: [{ text: prompt.user }],
          responseSchema: benchmarkJsonSchema(),
          googleSearch: true,
          temperature: 0.2,
          maxOutputTokens: 4096,
          timeoutMs: 90_000,
        },
        readBenchmark,
      )
      const read = result.data
      if (!read.ok) return bad("The AI provider returned an unusable benchmark.", 502)

      const filtered = filterGrounded(read.value.sources, result.grounding)
      if (filtered.kept.length < 2) {
        return bad("No grounded sources were returned; nothing was saved.", 502)
      }

      const benchmark = { ...read.value, sources: filtered.kept }
      const [review] = await db
        .insert(growthReviews)
        .values({
          userId: member.id,
          kind: "benchmark",
          payload: {
            discipline,
            fromLevel: context.fromLevel,
            toLevel: context.toLevel,
            benchmark,
            asOfDay: context.asOfDay,
          },
          narrative: null,
          sourceRefs: filtered.kept,
          model: MODEL(),
          aiMarked: true,
        })
        .returning()

      return NextResponse.json({ success: true, data: { review } })
    }

    return bad("Unsupported growth action")
  } catch (error) {
    if (error instanceof GeminiError) {
      const mapped = AI_ERROR[error.kind]
      return NextResponse.json({ success: false, error: mapped.message }, { status: mapped.status })
    }
    console.error("Growth action error:", error)
    return NextResponse.json({ success: false, error: "Failed to run the growth action" }, { status: 500 })
  }
}
