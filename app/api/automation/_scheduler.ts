// The hourly schedule's automation job. The engine in _shared.ts already does everything —
// triggers, conditions, actions, the automation_runs row and the run_count/last_run_at bump — so
// this file only decides which rules the hour is allowed to run and keeps one failure from stopping
// the rest.
//
// 55 minutes, not 60: Vercel's jitter can deliver an hour's run early, and a ceiling of exactly 60
// would then skip every other delivery. The engine owns last_run_at, so a rule someone ran by hand
// ten minutes ago is left alone.

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { RULE_PROJECTION, executeRule, serializeRule, type RuleDto } from "./_shared"

export function activeRulesSql(limit = 50) {
  return sql`
    SELECT ${RULE_PROJECTION}
    FROM automation_rules ar
    WHERE ar.is_active
      AND (ar.last_run_at IS NULL OR ar.last_run_at <= now() - interval '55 minutes')
    ORDER BY ar.last_run_at NULLS FIRST
    LIMIT ${limit}
  `
}

export async function fetchActiveRules(limit = 50): Promise<RuleDto[]> {
  const rows = (await db.execute(activeRulesSql(limit))) as unknown as Parameters<typeof serializeRule>[0][]
  return rows.map(serializeRule)
}

export async function runActiveRules(): Promise<{
  ok: boolean
  due: number
  ran: number
  failed: number
  acted: number
}> {
  const due = await fetchActiveRules()
  let ran = 0
  let failed = 0
  let acted = 0

  for (const rule of due) {
    try {
      const result = await executeRule(rule, { actorName: "Hourly schedule" })
      ran += 1
      acted += result.acted
    } catch (error) {
      failed += 1
      console.error(`Scheduled automation rule ${rule.id} failed:`, error)
    }
  }

  return { ok: failed === 0, due: due.length, ran, failed, acted }
}