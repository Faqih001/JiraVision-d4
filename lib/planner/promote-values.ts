// The pure half of a promote: what one plan item becomes when it is inserted as a task.
//
// It is DB-free by import, not by job — the type comes from the schema as a type-only
// reference, so the cadence and is_template derivation can be unit tested the way every other
// rule in lib/tasks is. The grid those values imply is written by the route, through
// ensureInstanceHorizon, after the insert transaction resolves.

import type { tasks } from "@/drizzle/schema"
import { isCadence } from "@/lib/cadence"
import { readLegacyDiscipline } from "@/lib/roles"

type TaskInsertValues = typeof tasks.$inferInsert

export type PromotableItem = {
  title: string
  description: string | null
  estimatePoints: number | null
  startDate: string | null
  dueDate: string | null
  discipline: string | null
  cadence: string | null
}

export function promoteTaskValues(
  item: PromotableItem,
  session: { id: number },
): TaskInsertValues {
  // Only plan_items.cadence is read. agent_plans.cadence is notNull with a default of
  // "weekly" — it is how often the plan is reviewed — and falling back to it would promote
  // every one-off item in every plan as a weekly schedule with a real grid.
  const cadence = isCadence(item.cadence) ? item.cadence : "one-off"

  return {
    title: item.title,
    description: item.description,
    status: "todo",
    priority: "medium",
    storyPoints: item.estimatePoints,
    startDate: item.startDate,
    dueDate: item.dueDate,
    discipline: readLegacyDiscipline(item.discipline),
    cadence,
    // The same derivation as app/api/tasks/route.ts:140 and F6's rule: a schedule is a
    // template, and the two fields are never set apart.
    isTemplate: cadence !== "one-off",
    assigneeId: session.id,
  }
}
