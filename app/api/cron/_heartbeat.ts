// The one fact no other table records: the hourly schedule fired at time T, and what it found.
// report_runs, automation_runs and email_digest.status already hold per-item history, so this is a
// single upserted row rather than a log — an empty workspace still gets an answer, which is the
// whole point: with nothing queued, every per-item "Last run" reads "Never run" and looks like a
// dead cron.
//
// The read rethrows. "Never fired" must mean the table is empty, not that the query failed.

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

/** The table holds one row. The id is a constant so the upsert and the read cannot disagree. */
const HEARTBEAT_ID = 1

export interface HeartbeatDto {
  lastFiredAt: string | null
  ok: boolean
  jobs: Record<string, unknown>
}

interface HeartbeatRow {
  last_fired_at: string | null
  ok: boolean
  jobs: Record<string, unknown> | string | null
}

export function recordHeartbeatSql(ok: boolean, jobs: Record<string, unknown>) {
  return sql`INSERT INTO scheduler_heartbeat (id, last_fired_at, ok, jobs, updated_at)
    VALUES (${HEARTBEAT_ID}, now(), ${ok}, ${JSON.stringify(jobs)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
    SET last_fired_at = now(), ok = EXCLUDED.ok, jobs = EXCLUDED.jobs, updated_at = now()`
}

export function heartbeatSql() {
  return sql`
    SELECT to_char(last_fired_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_fired_at,
           ok, jobs
    FROM scheduler_heartbeat WHERE id = 1
  `
}

export async function recordHeartbeat(ok: boolean, jobs: Record<string, unknown>): Promise<void> {
  await db.execute(recordHeartbeatSql(ok, jobs))
}

export async function readHeartbeat(): Promise<HeartbeatDto | null> {
  try {
    const rows = (await db.execute(heartbeatSql())) as unknown as HeartbeatRow[]
    if (!rows.length) return null

    const row = rows[0]
    let jobs = row.jobs
    if (typeof jobs === "string") {
      try {
        jobs = JSON.parse(jobs)
      } catch {
        jobs = {}
      }
    }

    return {
      lastFiredAt: row.last_fired_at,
      ok: row.ok,
      jobs: (jobs ?? {}) as Record<string, unknown>,
    }
  } catch (error) {
    console.error("Error reading the scheduler heartbeat:", error)
    throw error
  }
}