// Re-seeds all comprehensive data by calling the orchestrator directly.
// Bypasses the /api/setup route (which requires super-admin auth when users exist).
//
// Run from the repo root:
//   npx tsx scripts/reseed.mjs
//
// The script loads DATABASE_URL from .env.local, runs the full seed orchestrator,
// and prints results for each module.

import { config } from "dotenv"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "../.env.local") })

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

console.log(`database: ${new URL(process.env.DATABASE_URL).hostname.split(".").slice(0, 2).join("-")}…\n`)

const { seedComprehensiveData } = await import("../lib/seed/orchestrator.ts")

const results = await seedComprehensiveData()

console.log("\nseed results:")
for (const r of results) {
  const status = r.status === "seeded" ? "✓" : r.status === "skipped" ? "○" : "✗"
  console.log(`  ${status} ${r.module.padEnd(20)} ${String(r.count).padStart(4)} rows`)
  if (r.error) console.log(`    error: ${r.error}`)
}

const seeded = results.filter((r) => r.status === "seeded").length
const skipped = results.filter((r) => r.status === "skipped").length
const failed = results.filter((r) => r.status === "failed").length

console.log(`\n${seeded} seeded, ${skipped} skipped, ${failed} failed`)

if (failed > 0) {
  process.exitCode = 1
}
