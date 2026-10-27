// AI Scrum Master recommendation persistence (design §7).
// When the client sends a concrete, data-derived recommendation it is stored
// verbatim. When it does not, the route generates one from the sprint's real
// rows through lib/ai/gemini.ts — the five canned strings that used to live
// here were deleted in phase 9, because a recommendation with invented numbers
// is worse than an honest failure.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { aiInsights, sprints, tasks } from "@/drizzle/schema"
import { geminiText, GeminiError } from "@/lib/ai/gemini"

export const dynamic = "force-dynamic"

const GEMINI_FALLBACK = {
  auth: "AI service is not configured on this deployment. Apply a recommendation computed by the rule engine instead.",
  quota: "AI quota exceeded. Apply a recommendation computed by the rule engine instead.",
  timeout: "AI request timed out. Apply a recommendation computed by the rule engine instead.",
  blocked: "The request was blocked by safety filters. Apply a recommendation computed by the rule engine instead.",
  transport: "AI service unavailable. Apply a recommendation computed by the rule engine instead.",
  badjson: "AI response was malformed. Apply a recommendation computed by the rule engine instead.",
} as const

async function generateFromSprint(sprintId: number): Promise<{ title: string; description: string }> {
  const [sprint] = await db
    .select({
      id: sprints.id,
      name: sprints.name,
      startDate: sprints.startDate,
      endDate: sprints.endDate,
      status: sprints.status,
      capacity: sprints.capacity,
      completed: sprints.completed,
    })
    .from(sprints)
    .where(eq(sprints.id, sprintId))
    .limit(1)

  if (!sprint) throw new Error("Sprint not found")

  const sprintTasks = await db
    .select({
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      storyPoints: tasks.storyPoints,
    })
    .from(tasks)
    .where(eq(tasks.sprintId, sprintId))
    .limit(100)

  if (sprintTasks.length === 0) {
    throw new Error("Sprint has no tasks to analyze")
  }

  const totalPoints = sprintTasks.reduce((sum, t) => sum + t.storyPoints, 0)
  const byStatus = sprintTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})
  const statusLine = Object.entries(byStatus)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ")

  const prompt = `You are an AI scrum master. Analyze this sprint and write ONE concise recommendation.

Sprint: ${sprint.name} (${sprint.startDate} to ${sprint.endDate}, status: ${sprint.status})
Capacity: ${sprint.capacity} points, completed so far: ${sprint.completed} points
Committed: ${totalPoints} points across ${sprintTasks.length} tasks
Task status breakdown: ${statusLine}

Rules:
- Use ONLY the numbers given above. Never invent a metric, a name or a date.
- One paragraph, at most 3 sentences, plain text.
- If the data shows nothing actionable, say what to watch and when.

First line: a short title (max 80 characters), no markdown.
Second line onwards: the recommendation body.`

  const { text } = await geminiText({
    system: "You write short, factual sprint recommendations for a scrum team. No markdown, no bullet points, no invented numbers.",
    contents: [{ text: prompt }],
    temperature: 0.4,
    maxOutputTokens: 300,
    timeoutMs: 20_000,
  })

  const lines = text.split("\n").filter((l) => l.trim().length > 0)
  const title = (lines[0] ?? "Sprint recommendation").trim().slice(0, 120)
  const description = (lines.slice(1).join(" ").trim() || lines[0]?.trim() || "").slice(0, 2000)

  if (!description) throw new Error("AI returned an empty recommendation")

  return { title, description }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const data = await request.json()
    const { sprintId, taskIds, type, title, description } = data

    if (!sprintId) {
      return NextResponse.json({ error: "Sprint ID is required" }, { status: 400 })
    }

    const clientDescription =
      typeof description === "string" && description.trim() ? description.trim() : null
    const clientTitle = typeof title === "string" && title.trim() ? title.trim() : null
    const clientType = typeof type === "string" && type.trim() ? type.trim() : null
    void taskIds

    let insightTitle = clientTitle
    let insightDescription = clientDescription

    // No client-supplied recommendation: generate one from the sprint's real rows.
    if (!insightDescription) {
      try {
        const generated = await generateFromSprint(Number(sprintId))
        insightTitle = insightTitle ?? generated.title
        insightDescription = generated.description
      } catch (error) {
        if (error instanceof GeminiError) {
          return NextResponse.json(
            { success: false, message: GEMINI_FALLBACK[error.kind] },
            { status: 503 },
          )
        }
        return NextResponse.json(
          { success: false, message: (error as Error).message || "Could not generate a recommendation" },
          { status: 422 },
        )
      }
    }

    insightTitle = insightTitle ?? "Sprint Planning Recommendation"
    const insightType = clientType ?? "sprint_planning"

    const [newInsight] = await db
      .insert(aiInsights)
      .values({
        type: insightType,
        title: insightTitle,
        description: insightDescription!,
        status: "active",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning()

    return NextResponse.json({
      success: true,
      recommendation: {
        id: newInsight.id,
        type: newInsight.type,
        title: newInsight.title,
        description: newInsight.description,
        status: newInsight.status,
        generatedAt: newInsight.createdAt ? newInsight.createdAt.toISOString() : new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("AI recommendation generation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate AI recommendation",
      },
      { status: 500 },
    )
  }
}
