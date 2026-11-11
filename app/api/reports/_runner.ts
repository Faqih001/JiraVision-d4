// The hourly schedule's report job. `next_run_at` has been persisted since the builder shipped and
// nothing read it until now; the manual Run button calls the same `runSchedule` below.
//
// Claim before running: Vercel can deliver one schedule run more than once, and two deliveries that
// both saw "due" would both send the report. The claim's WHERE still requires the row to be due, so
// the second delivery matches zero rows and stops.

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { createNotification, notifyMany } from "@/lib/notifications"
import {
  DATASETS,
  SCHEDULE_PROJECTION,
  buildDataset,
  computeNextRun,
  serializeSchedule,
  type DatasetResult,
  type ScheduleDto,
} from "./_shared"

export function dueSchedulesSql(limit = 50) {
  return sql`
    SELECT ${SCHEDULE_PROJECTION}
    FROM report_schedules rs
    WHERE rs.is_active AND rs.next_run_at <= now()
    ORDER BY rs.next_run_at
    LIMIT ${limit}
  `
}

export function claimScheduleSql(id: number, nextRunAt: string | null) {
  return sql`update report_schedules set next_run_at = ${nextRunAt}::timestamptz, updated_at = now()
    where id = ${id} and is_active and next_run_at <= now()
    returning id`
}

export async function fetchDueSchedules(limit = 50): Promise<ScheduleDto[]> {
  const rows = (await db.execute(dueSchedulesSql(limit))) as unknown as Parameters<typeof serializeSchedule>[0][]
  return rows.map(serializeSchedule)
}

/** True when this delivery owns the run. */
export async function claimSchedule(schedule: ScheduleDto): Promise<boolean> {
  const rows = (await db.execute(
    claimScheduleSql(schedule.id, computeNextRun(schedule.cadence)),
  )) as unknown as { id: number }[]
  return rows.length > 0
}

export async function runSchedule(schedule: ScheduleDto): Promise<DatasetResult> {
  const result = await buildDataset(schedule.dataset, {
    rangeDays: schedule.config.rangeDays ?? 30,
    groupBy: schedule.config.groupBy,
  })

  const detail = `${DATASETS[schedule.dataset].label} · grouped by ${schedule.config.groupBy ?? "default"} · last ${schedule.config.rangeDays ?? 30} days`

  await db.execute(sql`
    INSERT INTO report_runs (schedule_id, status, rows, detail)
    VALUES (${schedule.id}, 'ok', ${result.rows.length}, ${detail})
  `)
  await db.execute(sql`
    UPDATE report_schedules
    SET last_run_at = now(), next_run_at = ${computeNextRun(schedule.cadence)}::timestamptz,
        updated_at = now()
    WHERE id = ${schedule.id}
  `)

  const summary = `${result.rows.length} groups · ${result.total} ${result.valueLabel}.`

  await createNotification({
    userId: schedule.userId,
    type: "system",
    title: `Report ran: ${schedule.name}`,
    body: summary,
    link: "/dashboard/reports",
    metadata: { scheduleId: schedule.id, action: "run", rows: result.rows.length },
  })

  const others = schedule.recipients.filter((r) => r !== schedule.userId)
  if (others.length) {
    await notifyMany(others, {
      type: "system",
      title: `Shared report ready: ${schedule.name}`,
      body: summary,
      link: "/dashboard/reports",
      metadata: { scheduleId: schedule.id, action: "run-shared" },
    })
  }

  return result
}

export async function logRunError(scheduleId: number, message: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO report_runs (schedule_id, status, rows, detail)
    VALUES (${scheduleId}, 'error', 0, ${message.slice(0, 500)})
  `)
}

export async function runDueSchedules(): Promise<{ ok: boolean; due: number; ran: number; failed: number }> {
  const due = await fetchDueSchedules()
  let ran = 0
  let failed = 0

  for (const schedule of due) {
    if (!(await claimSchedule(schedule))) continue
    try {
      await runSchedule(schedule)
      ran += 1
    } catch (error) {
      failed += 1
      console.error(`Scheduled report ${schedule.id} failed:`, error)
      await logRunError(schedule.id, (error as Error).message)
    }
  }

  return { ok: failed === 0, due: due.length, ran, failed }
}