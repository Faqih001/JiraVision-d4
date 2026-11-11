// /api/reports/[id]/run — execute a saved report schedule now.
// POST → the same run the hourly schedule performs (app/api/reports/_runner.ts):
//        dataset aggregation, a report_runs row, last_run_at/next_run_at, owner +
//        recipient notifications.
//        ?dryRun=1 → returns the dataset result WITHOUT persisting anything
//        (used by the builder preview).

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import {
  badRequest,
  buildDataset,
  fetchScheduleById,
  parseIdParam,
  serverError,
  unauthorized,
} from "../../_shared"
import { logRunError, runSchedule } from "../../_runner"

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

    if (dryRun) {
      const result = await buildDataset(schedule.dataset, {
        rangeDays: schedule.config.rangeDays ?? 30,
        groupBy: schedule.config.groupBy,
      })
      return NextResponse.json({ success: true, data: { dryRun: true, scheduleId: id, result } })
    }

    const result = await runSchedule(schedule)
    return NextResponse.json({ success: true, data: { scheduleId: id, result } })
  } catch (error) {
    try {
      await logRunError(id, String((error as Error).message))
    } catch {
      /* best-effort error logging */
    }
    return serverError(error, "run report")
  }
}