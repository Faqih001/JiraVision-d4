// A Growth AI task list becomes a draft agent_plan, never tasks (design §11/§14).
// The existing promote route stays the only way a plan becomes work, and the growth
// snapshot and the plan are written in one transaction so neither exists alone.

import { db } from "@/lib/db"
import { agentPlans, growthReviews, planItems } from "@/drizzle/schema"
import type { ReadinessGap } from "./readiness"
import type { CareerSignals } from "./signals"
import type { TaskSuggestion } from "./growth"

export type GapPlanInput = {
  userId: number
  discipline: string
  fromLevel: number
  toLevel: number
  nextTitle: string
  model: string | null
  tasks: TaskSuggestion[]
  gaps: ReadinessGap[]
  signals: CareerSignals
  asOfDay: string
}

export async function createGapPlan(input: GapPlanInput): Promise<{ planId: number; reviewId: number }> {
  const { userId } = input

  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(agentPlans)
      .values({
        title: `Close the gap: ${input.nextTitle} (${input.discipline})`,
        summary: `Draft plan suggested by Growth AI from ${input.gaps.length} open gap(s). Review, edit, then promote.`,
        sourceKind: "career",
        sourceName: `${input.discipline} L${input.fromLevel} → L${input.toLevel}`,
        sourceText: JSON.stringify({ gaps: input.gaps, signals: input.signals }),
        model: input.model,
        status: "draft",
        createdBy: userId,
      })
      .returning({ id: agentPlans.id })

    await tx.insert(planItems).values(
      input.tasks.map((task, index) => ({
        planId: plan.id,
        title: task.title,
        description: task.description,
        discipline: input.discipline,
        estimatePoints: task.estimatePoints,
        status: "todo",
        dependsOn: [],
        sortOrder: index,
      })),
    )

    const [review] = await tx
      .insert(growthReviews)
      .values({
        userId,
        kind: "task_suggestions",
        payload: {
          discipline: input.discipline,
          fromLevel: input.fromLevel,
          toLevel: input.toLevel,
          planId: plan.id,
          tasks: input.tasks,
          gaps: input.gaps,
          asOfDay: input.asOfDay,
        },
        narrative: null,
        sourceRefs: input.gaps.map((gap) => ({
          kind: gap.kind,
          key: gap.key,
          actual: gap.actual,
          target: gap.target,
        })),
        model: input.model,
        aiMarked: true,
      })
      .returning({ id: growthReviews.id })

    return { planId: plan.id, reviewId: review.id }
  })
}
