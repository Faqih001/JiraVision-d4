// /api/reports — saved report schedules + run history for the reports workspace.
// GET  → every schedule (with run counts), the 50 most recent runs and the
//        dataset registry so the page can render builders without hardcoding.
// POST → create a schedule; notifies the owner.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import {
  DATASETS,
  badRequest,
  computeNextRun,
  fetchRuns,
  fetchSchedules,
  idInList,
  isCadence,
  isDatasetKey,
  serverError,
  unauthorized,
  type Cadence,
  type DatasetKey,
} from "./_shared"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const [schedules, runs] = await Promise.all([fetchSchedules(), fetchRuns(50)])
    return NextResponse.json({
      success: true,
      data: { schedules, runs, datasets: DATASETS },
    })
  } catch (error) {
    return serverError(error, "fetch report schedules")
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name || name.length > 255) return badRequest("name is required (max 255 chars)")

    if (!isDatasetKey(body.dataset)) return badRequest("dataset must be tasks, sprints, team or wellbeing")
    const dataset = body.dataset as DatasetKey

    const cadence: Cadence = isCadence(body.cadence) ? body.cadence : "weekly"

    const description =
      typeof body.description === "string" && body.description.trim() ? body.description.trim() : null

    const rangeDays = Number((body.config as Record<string, unknown> | undefined)?.rangeDays ?? 30)
    const groupBy = String((body.config as Record<string, unknown> | undefined)?.groupBy ?? "")
    const validGroup = DATASETS[dataset].groupBys.find((g) => g.key === groupBy)
    const config = {
      rangeDays: Number.isFinite(rangeDays) && rangeDays > 0 ? Math.min(365, Math.round(rangeDays)) : 30,
      groupBy: validGroup ? validGroup.key : DATASETS[dataset].groupBys[0].key,
    }

    let recipients: number[] = []
    if (Array.isArray(body.recipients)) {
      const ids = body.recipients.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      if (ids.length) {
        const rows = (await db.execute(
          sql`SELECT id FROM users WHERE id IN (${idInList(ids)})`,
        )) as unknown as { id: number }[]
        recipients = rows.map((r) => r.id)
      }
    }

    const nextRunAt = computeNextRun(cadence)

    const [row] = (await db.execute(sql`
      INSERT INTO report_schedules
        (user_id, name, description, dataset, config, cadence, recipients, next_run_at)
      VALUES
        (${session.id}, ${name}, ${description}, ${dataset}, ${JSON.stringify(config)}::jsonb,
         ${cadence}, ${JSON.stringify(recipients)}::jsonb, ${nextRunAt}::timestamptz)
      RETURNING id
    `)) as unknown as { id: number }[]

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Report schedule created: ${name}`,
      body: `${DATASETS[dataset].label} report, ${cadence} cadence — next run ${new Date(nextRunAt).toUTCString().slice(0, 25)}.`,
      link: "/dashboard/reports",
      metadata: { scheduleId: row.id, action: "created" },
    })

    const schedules = await fetchSchedules()
    return NextResponse.json(
      { success: true, data: { schedule: schedules.find((s) => s.id === row.id) ?? null } },
      { status: 201 },
    )
  } catch (error) {
    return serverError(error, "create report schedule")
  }
}
