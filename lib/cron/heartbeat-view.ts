// The one-line answer to "is the hourly scheduler alive?" — a question no per-item indicator can
// answer when every queue is empty, because "Never run" then looks exactly like a dead cron.
//
// Pure so the three states are testable: fired, never fired, and unreadable. The last two must not
// collapse into each other; HEARTBEAT_UNKNOWN is rendered by the component when the read fails, and
// nothing here produces it from a null row.

import type { HeartbeatDto } from "@/app/api/cron/_heartbeat"
import { relativeTime } from "@/lib/relative-time"

export const HEARTBEAT_NEVER = "Scheduler has never fired"
export const HEARTBEAT_UNKNOWN = "Can't read the scheduler status"

export interface HeartbeatView {
  tone: "ok" | "failed" | "muted"
  text: string
}

const JOB_KEYS = ["reports", "rules", "digest"] as const

interface JobSummary {
  ok?: boolean
  ran?: number
  delivered?: number
}

export function heartbeatView(heartbeat: HeartbeatDto | null, now: number = Date.now()): HeartbeatView {
  if (!heartbeat?.lastFiredAt) return { tone: "muted", text: HEARTBEAT_NEVER }

  const jobs = JOB_KEYS.flatMap((key) => {
    const job = heartbeat.jobs[key] as JobSummary | undefined
    if (!job) return []
    // A job that threw reports {ok:false,error} and has no counts; printing one would say "undefined".
    if (job.ok === false) return [`${key} failed`]
    return [`${key} ${job.ran ?? job.delivered ?? 0}`]
  })

  const outcome = heartbeat.ok ? "ok" : "failed"
  return {
    tone: heartbeat.ok ? "ok" : "failed",
    text: `Scheduler last fired ${relativeTime(heartbeat.lastFiredAt, now)} · ${outcome} · ${jobs.join(" · ")}`,
  }
}