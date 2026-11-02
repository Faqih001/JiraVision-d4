// Completes the analytics seed that was interrupted during the main reseed.
// Inserts remaining ethical_metrics (days 6-29) and ai_insights (3 rows).
//
// Run from the repo root:
//   node scripts/complete-analytics.mjs

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const urlMatch = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!urlMatch) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(urlMatch[1], { max: 1 })

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

async function main() {
  console.log("completing analytics seed...\n")

  // Check how many ethical_metrics already exist
  const [existing] = await sql`select count(*)::int as c from ethical_metrics`
  const existingCount = existing.c
  console.log(`ethical_metrics: ${existingCount} rows already exist`)

  if (existingCount < 30) {
    const needed = 30 - existingCount
    for (let i = existingCount; i < 30; i++) {
      await sql`
        INSERT INTO ethical_metrics (date, pay_equity_score, workload_balance_score, dei_task_distribution_score, overtime_compliance)
        VALUES (${daysAgo(i)}, ${85 + Math.floor(Math.random() * 10)}, ${80 + Math.floor(Math.random() * 15)}, ${88 + Math.floor(Math.random() * 10)}, ${90 + Math.floor(Math.random() * 10)})
      `
    }
    console.log(`ethical_metrics: inserted ${needed} more rows`)
  } else {
    console.log(`ethical_metrics: already complete, skipping`)
  }

  // Insert ai_insights
  const insights = [
    {
      type: "recommendation",
      title: "Backup storage optimization",
      description: "Cloud backup storage has reached 85% capacity. Consider archiving backups older than 90 days to free up space. Estimated savings: 30% storage reduction.",
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    {
      type: "pattern",
      title: "Recurring printer issues",
      description: "HP LaserJet Pro M404 in Finance has had 3 paper jam incidents in the past month. Recommend scheduling preventive maintenance or considering replacement.",
      status: "active",
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    },
    {
      type: "recommendation",
      title: "License renewal upcoming",
      description: "Adobe Creative Cloud licenses renew in 30 days. All 3 licenses are currently assigned. Budget approval needed for renewal.",
      status: "active",
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
  ]

  let aiCount = 0
  for (const ins of insights) {
    await sql`
      INSERT INTO ai_insights (type, title, description, status, expires_at)
      VALUES (${ins.type}, ${ins.title}, ${ins.description}, ${ins.status}, ${ins.expiresAt})
    `
    aiCount++
  }
  console.log(`ai_insights: inserted ${aiCount} rows`)

  // Verify final counts
  const tables = [
    "register_items",
    "playbooks",
    "tasks",
    "work_log_entries",
    "ops_log_entries",
    "calendar_events",
    "ai_insights",
    "ethical_metrics",
    "wellbeing_metrics",
    "gamification",
  ]

  console.log("\nfinal counts:")
  for (const t of tables) {
    const [r] = await sql.unsafe(`select count(*)::int as c from ${t}`)
    console.log(`  ${t.padEnd(25)} ${String(r.c).padStart(4)}`)
  }

  await sql.end({ timeout: 5 })
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exitCode = 1
})
