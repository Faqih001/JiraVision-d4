// Adds the chat-workspace columns to the live Neon database (idempotent,
// additive-only): chats.description, chat_participants.settings,
// messages.reactions / original_content / edited_at. Mirrors drizzle/schema.ts.
//
// Usage: node scripts/create-chat-columns.mjs

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

const envPath = new URL("../.env.local", import.meta.url)
const env = readFileSync(envPath, "utf8")

// Line 1 of .env.local is a COMMENTED old DATABASE_URL — anchor with ^ + m so
// only the uncommented assignment matches.
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const databaseUrl = match[1]

const sql = postgres(databaseUrl, { max: 1 })

const ALTERS = [
  `ALTER TABLE chats ADD COLUMN IF NOT EXISTS description text`,
  `ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_content text`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamp`,
]

const EXPECTED = [
  ["chats", "description"],
  ["chat_participants", "settings"],
  ["messages", "reactions"],
  ["messages", "original_content"],
  ["messages", "edited_at"],
]

try {
  for (const stmt of ALTERS) {
    console.log(`SQL → ${stmt}`)
    await sql.unsafe(stmt)
    console.log("OK")
  }

  console.log("\nVerification (information_schema.columns):")
  let missing = 0
  for (const [table, column] of EXPECTED) {
    const [check] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
      ) AS "exists"
    `
    console.log(`  ${table}.${column}: ${check.exists ? "present" : "MISSING"}`)
    if (!check.exists) missing += 1
  }
  if (missing > 0) process.exit(1)
  console.log("\nAll chat columns present.")
} catch (err) {
  console.error("Failed to add chat columns:", err.message ?? err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 })
}
