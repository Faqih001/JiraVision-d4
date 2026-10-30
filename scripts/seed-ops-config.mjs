// Persists the code-authored opsConfig (lib/packs/ops/registry.ts) into role_packs.ops_config.
// Additive and idempotent: it only ever SETs ops_config on a pack row that already exists, and
// re-running writes the same value. It is a DRY RUN by default — it connects, checks the column,
// and prints what it would write — and applies nothing until --write is passed. Run from the repo
// root:
//   npm run db:ops:seed                                   (dry run, read-only)
//   npm run db:ops:seed -- --write                        (applies the UPDATEs)
// drizzle-kit push is NOT used — it can remove what the schema file does not declare, and this
// database is production.

import { readFileSync } from "node:fs"
import postgres from "postgres"
import { OPS_CONFIG_REGISTRY } from "../lib/packs/ops/registry.ts"
import { safeValidateOpsConfig } from "../lib/packs/ops/validator.ts"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so only the
// uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const apply = process.argv.includes("--write")

// The connection string is never logged; only a masked host so the operator can confirm which
// database they are pointed at without the credential appearing in a terminal or log.
function maskHost(url) {
  try {
    const host = new URL(url).hostname
    const [first, ...rest] = host.split(".")
    const shown = first.length <= 2 ? first : `${first.slice(0, 2)}${"•".repeat(first.length - 2)}`
    return [shown, ...rest].join(".")
  } catch {
    return "•••"
  }
}

const sql = postgres(match[1], { max: 1 })
const maskedHost = maskHost(match[1])

try {
  const column = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_packs' AND column_name = 'ops_config'
  `
  if (column.length === 0) {
    console.error("role_packs.ops_config is missing — run npm run db:ops first to add the column.")
    process.exit(1)
  }

  console.log(`opsConfig seed → ${maskedHost} (${apply ? "WRITE" : "dry run"})`)

  let valid = 0
  let written = 0
  let missingPack = 0
  let invalid = 0

  for (const [packKey, config] of Object.entries(OPS_CONFIG_REGISTRY)) {
    const check = safeValidateOpsConfig(config)
    if (!check.success) {
      const issue = check.error.issues[0]
      console.error(`✗ ${packKey}: not valid OpsConfig — ${issue ? issue.message : "unknown"}`)
      invalid++
      continue
    }

    const [row] = await sql`
      SELECT id, (ops_config IS NOT NULL) AS configured
      FROM role_packs
      WHERE pack_key = ${packKey}
      LIMIT 1
    `
    if (!row) {
      console.warn(`! ${packKey}: no pack row — skipped (seed the pack with npm run db:registers first)`)
      missingPack++
      continue
    }

    const rules = (config.recommendRules ?? []).length
    console.log(
      `${apply ? "write" : "plan"}  ${packKey.padEnd(16)} ` +
        `entities=${Object.keys(config.logs).length} ` +
        `kpis=${config.kpis.length} rules=${rules} ` +
        `was=${row.configured ? "configured" : "empty"}`,
    )

    if (apply) {
      await sql`
        UPDATE role_packs SET ops_config = ${sql.json(check.data)}, updated_at = NOW()
        WHERE pack_key = ${packKey}
      `
      written++
    }
    valid++
  }

  if (apply) {
    console.log(`done: ${written} pack(s) configured, ${invalid} invalid, ${missingPack} missing`)
  } else {
    console.log(
      `dry run: ${valid} pack(s) ready to write, ${invalid} invalid, ${missingPack} missing. ` +
        `Re-run with --write to apply.`,
    )
  }
} catch (error) {
  console.error("opsConfig seed failed:", error.message ?? error)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
