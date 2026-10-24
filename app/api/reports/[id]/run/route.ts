// /api/reports/[id]/run — execute a saved report schedule now.
// POST → runs the dataset aggregation, logs a report_runs row, updates
//        last_run_at/next_run_at and notifies the owner + recipients.
//        ?dryRun=1 → returns the dataset result WITHOUT persisting anything
//        (used by the builder preview).

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth-actions"
import { createNotification, notifyMany } from "@/lib/notifications"
import {
  DATASETS,
  badRequest,
  buildDataset,
  computeNextRun,
  fetchScheduleById,
  parseIdParam,
  serverError,
  unauthorized,
} from "../../_shared"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Context) {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return unauthorized()

  const id = await parseIdParam(context.params)
  if (id === null) return badRequest("Invalid report schedule id")

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1"

  try {
    const schedule = await fetchScheduleById(id)
    if (!schedule) return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 })

    const result = await buildDataset(schedule.dataset, {
      rangeDays: schedule.config.rangeDays ?? 30,
      groupBy: schedule.config.groupBy,
    })

    if (dryRun) {
      return NextResponse.json({ success: true, data: { dryRun: true, scheduleId: id, result } })
    }

    const detail = `${DATASETS[schedule.dataset].label} · grouped by ${schedule.config.groupBy ?? "default"} · last ${schedule.config.rangeDays ?? 30} days`

    await db.execute(sql`
      INSERT INTO report_runs (schedule_id, status, rows, detail)
      VALUES (${id}, 'ok', ${result.rows.length}, ${detail})
    `)
    await db.execute(sql`
      UPDATE report_schedules
      SET last_run_at = now(), next_run_at = ${computeNextRun(schedule.cadence)}::timestamptz,
          updated_at = now()
      WHERE id = ${id}
    `)

    await createNotification({
      userId: schedule.userId,
      type: "system",
      title: `Report ran: ${schedule.name}`,
      body: `${result.rows.length} groups · ${result.total} ${result.valueLabel}.`,
      link: "/dashboard/reports",
      metadata: { scheduleId: id, action: "run", rows: result.rows.length },
    })

    const others = schedule.recipients.filter((r) => r !== schedule.userId)
    if (others.length) {
      await notifyMany(others, {
        type: "system",
        title: `Shared report ready: ${schedule.name}`,
        body: `${result.rows.length} groups · ${result.total} ${result.valueLabel}.`,
        link: "/dashboard/reports",
        metadata: { scheduleId: id, action: "run-shared" },
      })
    }

    return NextResponse.json({ success: true, data: { scheduleId: id, result } })
  } catch (error) {
    try {
      await db.execute(sql`
        INSERT INTO report_runs (schedule_id, status, rows, detail)
        VALUES (${id}, 'error', 0, ${String((error as Error).message).slice(0, 500)})
      `)
    } catch {
      /* best-effort error logging */
    }
    return serverError(error, "run report")
  }
}
