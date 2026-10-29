// /api/goals — list + create goals for the OKR workspace.
// GET  → the caller's goals by default (?scope=team adds the whole workspace),
//        each with owner/creator joined, the check-ins they can see and the
//        caller's identity so the page can render charts/feeds without extra
//        round-trips.
// POST → create a goal; notifies the owner when owner ≠ creator.
// Raw SQL only (db.execute + parameterized templates) — goals tables are not
// in drizzle/schema.ts.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import { currentQuarter, type GoalStatus } from "./shared"
import {
  badRequest,
  fetchCheckins,
  fetchGoalById,
  fetchGoals,
  isGoalStatus,
  isIsoDate,
  isMetricType,
  serverError,
  unauthorized,
  type GoalScope,
} from "./queries"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    // The session id is the scope anchor — never a user-supplied id.
    const scope: GoalScope =
      request.nextUrl.searchParams.get("scope") === "team" ? "team" : "mine"
    const [goals, checkins] = await Promise.all([
      fetchGoals(session.id, scope),
      fetchCheckins(session.id, scope, 1000),
    ])
    return NextResponse.json({
      success: true,
      data: {
        goals,
        checkins,
        me: { id: session.id, name: session.name, avatar: session.avatar ?? null },
        defaultQuarter: currentQuarter(),
      },
    })
  } catch (error) {
    console.error("Error fetching goals:", error)
    return serverError(error, "fetch goals")
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title || title.length > 255) return badRequest("title is required (max 255 chars)")

    const description =
      typeof body.description === "string" && body.description.trim() ? body.description.trim() : null

    const ownerId = Number(body.ownerId)
    if (!Number.isInteger(ownerId) || ownerId <= 0) return badRequest("ownerId must be a positive integer")
    const [ownerRow] = (await db.execute(sql`SELECT id, name FROM users WHERE id = ${ownerId} LIMIT 1`)) as unknown as { id: number }[]
    if (!ownerRow) return badRequest(`ownerId ${ownerId} does not exist`)

    const quarter =
      typeof body.quarter === "string" && body.quarter.trim()
        ? body.quarter.trim().slice(0, 20)
        : currentQuarter()

    const status: GoalStatus = isGoalStatus(body.status) ? body.status : "on_track"

    if (!isMetricType(body.metricType)) {
      return badRequest("metricType must be percent, number, currency or boolean")
    }
    const metricType = body.metricType

    const target = Number(body.target)
    if (!Number.isFinite(target)) return badRequest("target must be a number")
    const baseline =
      body.baseline === null || body.baseline === undefined || body.baseline === ""
        ? null
        : Number(body.baseline)
    if (baseline !== null && !Number.isFinite(baseline)) return badRequest("baseline must be a number or null")
    if (metricType === "boolean" && target !== 1) return badRequest("boolean goals must use target = 1")

    const startDate = isIsoDate(body.startDate) ? body.startDate : new Date().toISOString().slice(0, 10)
    const dueDate =
      body.dueDate === null || body.dueDate === undefined || body.dueDate === ""
        ? null
        : isIsoDate(body.dueDate)
          ? body.dueDate
          : null
    if (
      (body.dueDate !== null && body.dueDate !== undefined && body.dueDate !== "" && !isIsoDate(body.dueDate)) ||
      (dueDate !== null && dueDate < startDate)
    ) {
      return badRequest("dueDate must be YYYY-MM-DD and not before startDate")
    }

    let current = Number.isFinite(Number(body.current)) ? Number(body.current) : 0
    if (metricType === "boolean") current = current >= 1 ? 1 : 0
    if (metricType === "percent") current = Math.min(Math.max(current, 0), 100)

    let parentId: number | null = null
    if (body.parentId !== null && body.parentId !== undefined && body.parentId !== "") {
      parentId = Number(body.parentId)
      if (!Number.isInteger(parentId) || parentId <= 0) return badRequest("parentId must be a positive integer")
      const parent = await fetchGoalById(parentId)
      if (!parent) return badRequest(`parent goal ${parentId} does not exist`)
    }

    // RETURNING can't carry the JOINed projection, so return the id and
    // re-fetch through the shared serializer.
    const [row] = (await db.execute(sql`
      INSERT INTO goals
        (title, description, owner_id, quarter, status, start_date, due_date,
         metric_type, baseline, target, current, parent_id, created_by)
      VALUES
        (${title}, ${description}, ${ownerId}, ${quarter}, ${status}, ${startDate}::date,
         ${dueDate ? sql`${dueDate}::date` : sql`NULL::date`}, ${metricType},
         ${baseline}, ${target}, ${current}, ${parentId}, ${session.id})
      RETURNING id
    `)) as unknown as { id: number }[]
    if (!row) return serverError(new Error("insert returned no row"), "create goal")

    const goal = await fetchGoalById(row.id)
    if (!goal) return serverError(new Error("goal vanished after insert"), "create goal")

    // Notify the owner only when someone else assigned the goal to them.
    if (goal.ownerId !== session.id) {
      await createNotification({
        userId: goal.ownerId,
        type: "sprint",
        title: `New goal assigned: ${goal.title}`,
        body: `${session.name} set you as owner of "${goal.title}" (${goal.quarter ?? "no quarter"} — target ${goal.target}).`,
        link: "/dashboard/goals",
        metadata: { goalId: goal.id, action: "created" },
      })
    }

    return NextResponse.json({ success: true, data: { goal } }, { status: 201 })
  } catch (error) {
    console.error("Error creating goal:", error)
    return serverError(error, "create goal")
  }
}
