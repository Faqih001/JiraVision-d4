// Stale registers become dated work the same way every other plan does: a draft
// `agent_plans` row with its items, which the member reviews and promotes. The promote route
// stays the only path to `tasks`; this writer never touches that table (design §12 item 3).

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { agentPlans, planItems } from "@/drizzle/schema"
import type { RegisterDto } from "./read"
import { cadenceForInterval, nextCheckDay } from "./staleness"

export type StalePlanInput = {
  userId: number
  today: string
  rows: readonly RegisterDto[]
}

const sourceNameFor = (today: string): string => `stale:${today}`

export async function findDraftStalePlan(userId: number, today: string): Promise<number | null> {
  const [row] = await db
    .select({ id: agentPlans.id })
    .from(agentPlans)
    .where(
      and(
        eq(agentPlans.createdBy, userId),
        eq(agentPlans.sourceKind, "registers"),
        eq(agentPlans.sourceName, sourceNameFor(today)),
        eq(agentPlans.status, "draft"),
      ),
    )
    .limit(1)
  return row?.id ?? null
}

export async function createStaleCheckPlan(
  input: StalePlanInput,
): Promise<{ planId: number; count: number } | null> {
  const { userId, today, rows } = input
  if (rows.length === 0) return null

  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(agentPlans)
      .values({
        title: `Verify ${rows.length} register ${rows.length === 1 ? "item" : "items"}`,
        summary:
          "Draft plan suggested from the stale-document queue. Review, edit, then promote — nothing is a task yet.",
        sourceKind: "registers",
        sourceName: sourceNameFor(today),
        sourceText: JSON.stringify(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            lastVerifiedAt: row.lastVerifiedAt,
            verifyIntervalDays: row.verifyIntervalDays,
          })),
        ),
        cadence: "weekly",
        horizonStart: today,
        horizonEnd: today,
        status: "draft",
        createdBy: userId,
      })
      .returning({ id: agentPlans.id })

    await tx.insert(planItems).values(
      rows.map((row, index) => ({
        planId: plan.id,
        title: `Verify: ${row.title}`,
        description: `Register item #${row.id} (${row.kind}). Last verified ${
          row.lastVerifiedAt ?? "never"
        }; interval ${row.verifyIntervalDays ?? "unset"} day(s).`,
        estimatePoints: 1,
        startDate: today,
        dueDate: nextCheckDay(row, today),
        status: "todo",
        dependsOn: [],
        cadence: cadenceForInterval(row.verifyIntervalDays),
        sortOrder: index,
      })),
    )

    return { planId: plan.id, count: rows.length }
  })
}
