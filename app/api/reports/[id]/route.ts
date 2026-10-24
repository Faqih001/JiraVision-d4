// /api/reports/[id] — one report schedule.
// GET    → the schedule + its run history.
// PATCH  → update name/description/dataset/cadence/config/recipients/isActive;
//          toggling pause/resume notifies the owner.
// DELETE → removes the schedule (runs cascade); notifies the owner.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import {
  DATASETS,
  badRequest,
  computeNextRun,
  fetchScheduleById,
  idInList,
  isCadence,
  isDatasetKey,
  parseIdParam,
  serverError,
  unauthorized,
  type Cadence,
  type DatasetKey,
} from "../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid report schedule id")

  try {
    const schedule = await fetchScheduleById(id)
    if (!schedule) return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 })
    const runs = (await db.execute(sql`
      SELECT id, status::text AS status, rows, detail,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM report_runs WHERE schedule_id = ${id}
      ORDER BY created_at DESC LIMIT 50
    `)) as unknown as { id: number; status: string; rows: number; detail: string | null; created_at: string }[]
    return NextResponse.json({
      success: true,
      data: {
        schedule,
        runs: runs.map((r) => ({
          id: r.id,
          scheduleId: id,
          status: r.status,
          rows: r.rows,
          detail: r.detail,
          createdAt: r.created_at,
        })),
      },
    })
  } catch (error) {
    return serverError(error, "fetch report schedule")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid report schedule id")

  try {
    const existing = await fetchScheduleById(id)
    if (!existing) return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 })

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    const sets: ReturnType<typeof sql>[] = []

    if (body.name !== undefined) {
      const v = typeof body.name === "string" ? body.name.trim() : ""
      if (!v || v.length > 255) return badRequest("name must be a non-empty string (max 255)")
      sets.push(sql`name = ${v}`)
    }
    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== "string") {
        return badRequest("description must be a string or null")
      }
      sets.push(sql`description = ${body.description === null ? null : body.description.trim() || null}`)
    }

    let dataset: DatasetKey = existing.dataset
    if (body.dataset !== undefined) {
      if (!isDatasetKey(body.dataset)) return badRequest("dataset must be tasks, sprints, team or wellbeing")
      dataset = body.dataset
      sets.push(sql`dataset = ${dataset}`)
    }

    let cadence: Cadence = existing.cadence
    if (body.cadence !== undefined) {
      if (!isCadence(body.cadence)) return badRequest("cadence must be daily, weekly or monthly")
      cadence = body.cadence
      sets.push(sql`cadence = ${cadence}`)
    }

    let config = existing.config
    if (body.config !== undefined) {
      if (typeof body.config !== "object" || body.config === null) return badRequest("config must be an object")
      const c = body.config as Record<string, unknown>
      const rangeDays = Number(c.rangeDays ?? config.rangeDays ?? 30)
      const groupBy = String(c.groupBy ?? config.groupBy ?? "")
      const validGroup = DATASETS[dataset].groupBys.find((g) => g.key === groupBy)
      config = {
        rangeDays: Number.isFinite(rangeDays) && rangeDays > 0 ? Math.min(365, Math.round(rangeDays)) : 30,
        groupBy: validGroup ? validGroup.key : DATASETS[dataset].groupBys[0].key,
      }
      sets.push(sql`config = ${JSON.stringify(config)}::jsonb`)
    } else if (body.dataset !== undefined) {
      // dataset changed without new config — revalidate groupBy against the new registry
      const validGroup = DATASETS[dataset].groupBys.find((g) => g.key === config.groupBy)
      config = { ...config, groupBy: validGroup ? validGroup.key : DATASETS[dataset].groupBys[0].key }
      sets.push(sql`config = ${JSON.stringify(config)}::jsonb`)
    }

    if (body.recipients !== undefined) {
      if (!Array.isArray(body.recipients)) return badRequest("recipients must be an array of user ids")
      const ids = body.recipients.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      let valid: number[] = []
      if (ids.length) {
        const rows = (await db.execute(sql`SELECT id FROM users WHERE id IN (${idInList(ids)})`)) as unknown as { id: number }[]
        valid = rows.map((r) => r.id)
      }
      sets.push(sql`recipients = ${JSON.stringify(valid)}::jsonb`)
    }

    let toggled: "paused" | "resumed" | null = null
    if (body.isActive !== undefined) {
      const v = body.isActive === true
      toggled = v ? "resumed" : "paused"
      sets.push(sql`is_active = ${v}`)
    }

    if (body.dataset !== undefined || body.cadence !== undefined || body.isActive === true) {
      sets.push(sql`next_run_at = ${computeNextRun(cadence)}::timestamptz`)
    }

    if (sets.length === 0) return badRequest("No valid fields to update")
    sets.push(sql`updated_at = now()`)

    await db.execute(sql`UPDATE report_schedules SET ${sql.join(sets, sql`, `)} WHERE id = ${id}`)

    if (toggled) {
      await createNotification({
        userId: existing.userId,
        type: "system",
        title: `Report schedule ${toggled}: ${existing.name}`,
        link: "/dashboard/reports",
        metadata: { scheduleId: id, action: toggled },
      })
    }

    const updated = await fetchScheduleById(id)
    return NextResponse.json({ success: true, data: { schedule: updated } })
  } catch (error) {
    return serverError(error, "update report schedule")
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid report schedule id")

  try {
    const existing = await fetchScheduleById(id)
    if (!existing) return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 })

    await db.execute(sql`DELETE FROM report_schedules WHERE id = ${id}`)

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Report schedule deleted: ${existing.name}`,
      body: "Its run history was removed with it.",
      link: "/dashboard/reports",
      metadata: { scheduleId: id, action: "deleted" },
    })

    return NextResponse.json({ success: true, data: { deletedId: id } })
  } catch (error) {
    return serverError(error, "delete report schedule")
  }
}
