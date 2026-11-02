// Remaps user ids from 23→1 and 24→2, updating all foreign key references.
// This must run in a single transaction to maintain referential integrity.
//
// Run from the repo root:
//   node scripts/remap-user-ids.mjs              rehearsal (transaction rolled back)
//   node scripts/remap-user-ids.mjs --apply      commit the changes
//
// WARNING: This is a destructive operation. Back up the database first.

import { readFileSync } from "node:fs"
import postgres from "postgres"

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const urlMatch = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!urlMatch) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
const sql = postgres(urlMatch[1], { max: 1 })

const OLD_USER_1 = 23 // fakiiahmad001@gmail.com → will become 1
const OLD_USER_2 = 24 // mohammedfakii18@gmail.com → will become 2
const NEW_USER_1 = 1
const NEW_USER_2 = 2

// Tables with foreign keys to users that need updating
const FK_TABLES = [
  { table: "tasks", column: "assignee_id" },
  { table: "work_log_entries", column: "user_id" },
  { table: "ops_log_entries", column: "owner_id" },
  { table: "calendar_events", column: "organizer_id" },
  { table: "playbooks", column: "author_id" },
  { table: "gamification", column: "user_id" },
  { table: "wellbeing_metrics", column: "user_id" },
  { table: "user_onboarding", column: "user_id" },
  { table: "auth_sessions", column: "user_id" },
]

// JSON array columns that contain user ids
const JSON_ARRAY_COLUMNS = [
  { table: "calendar_events", column: "attendees" },
]

class Rehearsal extends Error {}

async function main() {
  console.log(`mode: ${APPLY ? "APPLY (will commit)" : "rehearsal (will roll back)"}\n`)

  try {
    await sql.begin(async (tx) => {
      // Verify the users exist
      const [u1] = await tx`select * from users where id = ${OLD_USER_1}`
      const [u2] = await tx`select * from users where id = ${OLD_USER_2}`
      
      if (!u1) throw new Error(`User ${OLD_USER_1} not found`)
      if (!u2) throw new Error(`User ${OLD_USER_2} not found`)
      
      console.log(`Remapping:`)
      console.log(`  ${OLD_USER_1} (${u1.email}) → ${NEW_USER_1}`)
      console.log(`  ${OLD_USER_2} (${u2.email}) → ${NEW_USER_2}\n`)

      // Step 1: Update old users' emails to temporary values FIRST (to free them up)
      await tx`UPDATE users SET email = 'temp_old_23@deleted.local' WHERE id = ${OLD_USER_1}`
      await tx`UPDATE users SET email = 'temp_old_24@deleted.local' WHERE id = ${OLD_USER_2}`
      console.log(`  Freed emails from users ${OLD_USER_1} and ${OLD_USER_2}`)

      // Step 2: Insert new users with target ids (using original emails from u1 and u2)
      await tx`
        INSERT INTO users (id, email, name, role, password_hash, avatar, email_verified, job_title, department, location, bio, language, timezone, preferences, status, skills, created_at, updated_at)
        VALUES (${NEW_USER_1}, ${u1.email}, ${u1.name}, ${u1.role}, ${u1.password_hash}, ${u1.avatar}, ${u1.email_verified}, ${u1.job_title}, ${u1.department}, ${u1.location}, ${u1.bio}, ${u1.language}, ${u1.timezone}, ${u1.preferences}, ${u1.status}, ${u1.skills}, ${u1.created_at}, ${u1.updated_at})
      `
      await tx`
        INSERT INTO users (id, email, name, role, password_hash, avatar, email_verified, job_title, department, location, bio, language, timezone, preferences, status, skills, created_at, updated_at)
        VALUES (${NEW_USER_2}, ${u2.email}, ${u2.name}, ${u2.role}, ${u2.password_hash}, ${u2.avatar}, ${u2.email_verified}, ${u2.job_title}, ${u2.department}, ${u2.location}, ${u2.bio}, ${u2.language}, ${u2.timezone}, ${u2.preferences}, ${u2.status}, ${u2.skills}, ${u2.created_at}, ${u2.updated_at})
      `
      console.log(`  Created users ${NEW_USER_1} and ${NEW_USER_2}`)

      // Step 2: Update foreign key references
      for (const { table, column } of FK_TABLES) {
        const r1 = await tx.unsafe(
          `UPDATE ${table} SET ${column} = ${NEW_USER_1} WHERE ${column} = ${OLD_USER_1}`
        )
        const r2 = await tx.unsafe(
          `UPDATE ${table} SET ${column} = ${NEW_USER_2} WHERE ${column} = ${OLD_USER_2}`
        )
        const count1 = Number(r1.count ?? 0)
        const count2 = Number(r2.count ?? 0)
        if (count1 > 0 || count2 > 0) {
          console.log(`  ${table}.${column}: ${count1} → ${NEW_USER_1}, ${count2} → ${NEW_USER_2}`)
        }
      }

      // Step 3: Update JSON array columns (attendees in calendar_events)
      for (const { table, column } of JSON_ARRAY_COLUMNS) {
        await tx.unsafe(`
          UPDATE ${table}
          SET ${column} = (
            SELECT jsonb_agg(
              CASE 
                WHEN elem::text = '${OLD_USER_1}' THEN '${NEW_USER_1}'::jsonb
                WHEN elem::text = '${OLD_USER_2}' THEN '${NEW_USER_2}'::jsonb
                ELSE elem
              END
            )
            FROM jsonb_array_elements(${column}) elem
          )
          WHERE ${column} IS NOT NULL
            AND jsonb_typeof(${column}) = 'array'
            AND (${column}::text LIKE '%${OLD_USER_1}%' OR ${column}::text LIKE '%${OLD_USER_2}%')
        `)
        console.log(`  ${table}.${column}: updated user ids in JSON array`)
      }

      // Step 4: Delete the old users
      await tx`DELETE FROM users WHERE id IN (${OLD_USER_1}, ${OLD_USER_2})`
      console.log(`  Deleted old users ${OLD_USER_1} and ${OLD_USER_2}`)

      // Step 5: Reset the sequence
      await tx`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`
      console.log(`  users_id_seq: reset to ${NEW_USER_2}`)

      if (!APPLY) {
        console.log("\nrehearsal complete — rolling back (database unchanged)")
        throw new Rehearsal()
      }

      console.log("\n✓ changes committed")
    })
  } catch (e) {
    if (e instanceof Rehearsal) {
      console.log("\nrehearsal: database is unchanged.")
      console.log("to run for real:  node scripts/remap-user-ids.mjs --apply")
      return
    }
    throw e
  }

  // Verify the result
  const users = await sql`select id, email, name from users order by id`
  console.log("\nfinal users:")
  for (const u of users) {
    console.log(`  id=${u.id}  ${u.email.padEnd(30)}  ${u.name}`)
  }

  await sql.end({ timeout: 5 })
}

main().catch((error) => {
  console.error("Error:", error.message ?? error)
  process.exitCode = 1
})
