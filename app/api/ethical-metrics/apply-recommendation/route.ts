// POST /api/ethical-metrics/apply-recommendation
//
// Executes a recommendation the workspace page computed from live rows.
// The response contract (`{ success, message }`) is unchanged from the original
// stub, but the work is now real: reassign_tasks moves task assignments in the
// tasks table, record_snapshot writes an ethical_metrics row, and every path
// notifies the actor plus the members whose queue changed.

import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { tasks, users } from "@/drizzle/schema"
import { createNotification, notifyMany } from "@/lib/notifications"
import {
  ETHICS_LINK,
  SnapshotUnmeasurableError,
  buildRecommendations,
  computeLive,
  mergeConfig,
  readEthicsMeta,
  recordSnapshot,
  writeEthicsMeta,
  type Recommendation,
  type RecommendationState,
} from "../route"

export const dynamic = "force-dynamic"

function toIdString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

/** Legacy callers sent a numeric id; match it against the subject suffix. */
function findRecommendation(recs: Recommendation[], id: string): Recommendation | null {
  const exact = recs.find((r) => r.id === id)
  if (exact) return exact
  const numeric = Number.parseInt(id, 10)
  if (Number.isFinite(numeric)) {
    const bySubject = recs.find((r) => r.id.endsWith(`-${numeric}`))
    if (bySubject) return bySubject
  }
  return null
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const recommendationId = toIdString(body?.recommendationId)
    if (!recommendationId) {
      return NextResponse.json(
        { success: false, error: "Missing recommendation ID", message: "Missing recommendation ID" },
        { status: 400 },
      )
    }

    const intent = body?.action === "dismiss" ? "dismiss" : "apply"
    const meta = await readEthicsMeta(session.id)
    const config = mergeConfig(meta.config)
    const live = await computeLive(config)
    const recs = buildRecommendations(live, meta, config)
    const rec = findRecommendation(recs, recommendationId)
    const id = rec?.id ?? recommendationId

    const states = { ...(meta.recommendations ?? {}) }
    const nextState: RecommendationState = {
      status: intent === "dismiss" ? "dismissed" : "applied",
      appliedAt: new Date().toISOString(),
      summary: typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null,
    }

    if (intent === "dismiss") {
      if (rec && states[id]?.status === "applied") {
        return NextResponse.json(
          { success: false, message: "This recommendation has already been applied and cannot be dismissed." },
          { status: 409 },
        )
      }
      states[id] = nextState
      await writeEthicsMeta(session.id, { recommendations: states })
      await createNotification({
        userId: session.id,
        type: "system",
        title: `Recommendation dismissed: ${rec?.title ?? id}`,
        body: rec
          ? `Ignored on ${new Date().toISOString().slice(0, 10)}. It stays in the recommendation list marked dismissed until the underlying data changes.`
          : "Unknown recommendation dismissed.",
        link: ETHICS_LINK,
        metadata: { action: "ethics_recommendation_dismissed", recommendationId: id, title: rec?.title ?? id },
      })
      return NextResponse.json({
        success: true,
        message: "Recommendation dismissed",
        data: { recommendationId: id, status: "dismissed" },
      })
    }

    /* ---- apply ------------------------------------------------------------ */

    // Prefer the server-computed action; fall back to an explicit payload so the
    // endpoint stays usable even if the underlying data shifted.
    const explicitTaskIds = Array.isArray(body?.taskIds)
      ? (body?.taskIds as unknown[]).map(Number).filter((n) => Number.isFinite(n))
      : null
    const taskIds = explicitTaskIds ?? rec?.action.taskIds ?? []
    const fromUserId =
      explicitTaskIds !== null ? toNumberOrNull(body?.fromUserId) ?? rec?.action.fromUserId ?? null : rec?.action.fromUserId ?? null
    const toUserId =
      explicitTaskIds !== null ? toNumberOrNull(body?.toUserId) ?? rec?.action.toUserId ?? null : rec?.action.toUserId ?? null
    const kind = rec?.kind ?? (taskIds.length > 0 ? "rebalance" : "advisory")

    const moved: { taskId: number; title: string; storyPoints: number; fromUserId: number | null; toUserId: number }[] = []

    if (kind === "stale_snapshot" || rec?.action.type === "record_snapshot") {
      const { snapshot } = await recordSnapshot({
        userId: session.id,
        label: typeof body?.label === "string" && body.label.trim() ? body.label : "Snapshot via recommendation",
        note: `Recorded by applying recommendation ${id}.`,
        source: "recorded",
      })
      states[id] = { ...nextState, summary: `Snapshot #${snapshot.id} (${snapshot.date}) recorded` }
      await writeEthicsMeta(session.id, { recommendations: states })
      await createNotification({
        userId: session.id,
        type: "system",
        title: `Recommendation applied: ${rec?.title ?? id}`,
        body: `Ethical metrics snapshot #${snapshot.id} recorded for ${snapshot.date}.`,
        link: ETHICS_LINK,
        metadata: {
          action: "ethics_recommendation_applied",
          recommendationId: id,
          kind,
          snapshotId: snapshot.id,
          scores: {
            workloadBalance: snapshot.workloadBalanceScore,
            deiTaskDistribution: snapshot.deiTaskDistributionScore,
            payEquity: snapshot.payEquityScore,
            overtimeCompliance: snapshot.overtimeCompliance,
          },
        },
      })
      return NextResponse.json({
        success: true,
        message: "Recommendation successfully applied",
        data: { recommendationId: id, kind, snapshot },
      })
    }

    if (taskIds.length > 0) {
      if (toUserId === null) {
        return NextResponse.json(
          {
            success: false,
            message: "No member below the team mean is available to receive the work. Change scope instead of reassigning.",
          },
          { status: 409 },
        )
      }
      const [target] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, toUserId)).limit(1)
      if (!target) {
        return NextResponse.json({ success: false, message: `Receiving member ${toUserId} does not exist` }, { status: 400 })
      }

      for (const taskId of taskIds.slice(0, 10)) {
        const [taskRow] = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            assigneeId: tasks.assigneeId,
            storyPoints: tasks.storyPoints,
          })
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .limit(1)
        if (!taskRow || taskRow.status === "done") continue
        if (fromUserId !== null && taskRow.assigneeId !== fromUserId) continue
        if (taskRow.assigneeId === toUserId) continue

        const ownerCondition =
          taskRow.assigneeId === null ? isNull(tasks.assigneeId) : eq(tasks.assigneeId, taskRow.assigneeId)
        const [updated] = await db
          .update(tasks)
          .set({ assigneeId: toUserId, updatedAt: new Date() })
          .where(and(eq(tasks.id, taskId), ownerCondition))
          .returning()
        if (!updated) continue
        moved.push({
          taskId,
          title: updated.title,
          storyPoints: updated.storyPoints ?? 0,
          fromUserId: taskRow.assigneeId,
          toUserId,
        })
      }

      if (moved.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Nothing moved: the tasks in this recommendation no longer match the overloaded member's open queue. Refresh to recompute.",
          },
          { status: 409 },
        )
      }
    }

    const fromName =
      moved.length > 0
        ? live.members.find((m) => m.userId === moved[0].fromUserId)?.name ?? "the previous owner"
        : rec?.subjectName ?? "the previous owner"
    const toName = moved.length > 0 ? live.members.find((m) => m.userId === moved[0].toUserId)?.name ?? "a teammate" : "a teammate"
    const taskSummary = moved.map((m) => `"${m.title}"`).join(", ")
    const pointsMoved = moved.reduce((a, m) => a + m.storyPoints, 0)
    const detail =
      moved.length > 0
        ? `Moved ${moved.length} task(s) worth ${pointsMoved} story points from ${fromName} to ${toName}: ${taskSummary}.`
        : rec
          ? `Marked applied: ${rec.impact}.`
          : `Marked applied: ${id}.`

    states[id] = {
      ...nextState,
      summary: moved.length > 0 ? `Reassigned ${moved.length} task(s) (${pointsMoved} pts) to ${toName}` : nextState.summary,
    }
    await writeEthicsMeta(session.id, { recommendations: states })

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Recommendation applied: ${rec?.title ?? id}`,
      body: detail,
      link: ETHICS_LINK,
      metadata: {
        action: "ethics_recommendation_applied",
        recommendationId: id,
        kind,
        movedTaskIds: moved.map((m) => m.taskId),
        fromUserId: moved[0]?.fromUserId ?? fromUserId,
        toUserId: moved[0]?.toUserId ?? toUserId,
      },
    })

    // Members whose queue actually changed get their own audit-trail event.
    const affected = [...new Set(moved.map((m) => m.fromUserId).concat(moved.map((m) => m.toUserId)))]
      .filter((id2): id2 is number => typeof id2 === "number" && id2 !== session.id)
    if (affected.length > 0) {
      await notifyMany(affected, {
        type: "system",
        title: `Workload rebalanced: ${taskSummary.slice(0, 120)}`,
        body: `${session.name || "A teammate"} applied an ethical-metrics recommendation. ${moved.length} task(s) moved from ${fromName} to ${toName}. Check the ethical metrics workspace for the new load split.`,
        link: ETHICS_LINK,
        metadata: {
          action: "ethics_tasks_reassigned",
          recommendationId: id,
          taskIds: moved.map((m) => m.taskId),
          fromName,
          toName,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Recommendation successfully applied",
      data: {
        recommendationId: id,
        kind,
        movedTasks: moved,
        status: "applied",
      },
    })
  } catch (error) {
    if (error instanceof SnapshotUnmeasurableError) {
      return NextResponse.json(
        { success: false, message: `Cannot record a snapshot: ${error.keys.join(", ")} are not measurable from live rows.` },
        { status: 422 },
      )
    }
    console.error("Apply ethical recommendation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        message: (error as Error).message || "Unknown error applying recommendation",
      },
      { status: 500 },
    )
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : null
}
