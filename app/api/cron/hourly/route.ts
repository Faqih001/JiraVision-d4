// /api/cron/hourly — the one schedule that drives report schedules, automation rules and the digest
// outbox. Vercel calls it with `Authorization: Bearer <CRON_SECRET>` and no session cookie.
//
// Each job is isolated: Vercel does not retry a failed run, so a throw in the first job must not
// freeze the other two for the day. The response is non-2xx when any job failed, which is what
// surfaces in the schedule's execution history.

import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "../_auth"
import { recordHeartbeat } from "../_heartbeat"
import { runDueSchedules } from "@/app/api/reports/_runner"
import { runActiveRules } from "@/app/api/automation/_scheduler"
import { flushDigestQueue } from "@/app/api/email/_dispatcher"

export const dynamic = "force-dynamic"
// Three sequential jobs against a compute that may be waking from idle; the 10s default is not enough.
export const maxDuration = 60

async function runJob<T extends { ok: boolean }>(
  name: string,
  job: () => Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await job()
  } catch (error) {
    console.error(`Cron job ${name} failed:`, error)
    return { ok: false, error: (error as Error).message }
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const jobs = {
    reports: await runJob("reports", runDueSchedules),
    rules: await runJob("rules", runActiveRules),
    digest: await runJob("digest", flushDigestQueue),
  }

  const ok = Object.values(jobs).every((job) => job.ok)

  // The three jobs have already run, so this write is a convenience: a failure here must not report
  // the maintenance run as failed. Vercel does not retry, and a 500 would say the reports, rules and
  // mail never went out when they did. The tolerance lives here, where that is known.
  try {
    await recordHeartbeat(ok, jobs)
  } catch (error) {
    console.error("Cron heartbeat write failed:", error)
  }

  return NextResponse.json({ success: ok, data: { jobs } }, { status: ok ? 200 : 500 })
}