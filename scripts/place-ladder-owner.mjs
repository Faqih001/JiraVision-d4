// Place the workspace owner on the ladder. Two writes, nothing else:
//   1. users.role for the owner account becomes 'superadmin', so the admin career
//      surfaces stop 403-ing for the person who owns the organization.
//   2. one career_placement row: technician, rung 1, placed by that same member.
//
// The ladder itself (48 rows) and the signal thresholds are already seeded; this only
// records who holds which rung. It changes no band, no task and no work log row, and it
// writes no task_events — completion evidence stays event-sourced because no date is
// invented here.
//
//   node scripts/place-ladder-owner.mjs --dry-run
//   node scripts/place-ladder-owner.mjs --apply
//   node scripts/place-ladder-owner.mjs --restore backups/ladder-owner-<stamp>.json
//
// --apply refuses to run before the backup is written. Run from the repo root.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import postgres from "postgres"

const OWNER_EMAIL = "fakiiahmad001@gmail.com"
const DISCIPLINE = "technician"
const LEVEL = 1
const NOTE =
  "Owner decision, 2026-11-03: placed on the technician ladder at Junior. Evidence at " +
  "placement, last 90 days: 26 days logged and 26 entries; the task-based signals had no " +
  "recorded status events yet, so the meter shows those gaps rather than assuming them."

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const APPLY = process.argv.includes("--apply")
const RESTORE_AT = process.argv.indexOf("--restore")
const RESTORE_FILE = RESTORE_AT >= 0 ? process.argv[RESTORE_AT + 1] : null
if (!APPLY && !RESTORE_FILE && !process.argv.includes("--dry-run")) {
  console.error("Pass --dry-run, --apply, or --restore <backup.json> explicitly.")
  process.exit(1)
}
if (APPLY && RESTORE_FILE) {
  console.error("--apply and --restore are mutually exclusive.")
  process.exit(1)
}
if (RESTORE_FILE && !/\.json$/u.test(RESTORE_FILE)) {
  console.error("--restore needs the backup file this script wrote.")
  process.exit(1)
}

const sql = postgres(match[1], { max: 1 })
const mask = (url) => url.replace(/\/\/[^@]*@/, "//****@")

async function restore() {
  const backup = JSON.parse(readFileSync(resolve(process.cwd(), RESTORE_FILE), "utf8"))
  const owner = backup.owner
  const [row] = await sql`update users set role = ${owner.role}, updated_at = now()
    where id = ${owner.id} and email = ${OWNER_EMAIL} returning id, role`
  if (!row) throw new Error(`restore found no account ${owner.id} with that email`)

  // Only remove a placement this script inserted. If the backup shows a row already held
  // the rung, the insert was a no-op and that placement is not ours to delete.
  const removed = backup.placement
    ? []
    : await sql`delete from career_placement
        where user_id = ${owner.id} and discipline = ${DISCIPLINE} and placed_by = ${owner.id}
        returning user_id`
  console.log(`restored: role=${row.role}, placements removed=${removed.length}`)
  console.log("recheck: open /dashboard/career — it should read \"No placement yet\" again.")
  await sql.end()
}

async function main() {
  console.log("connected to:", mask(match[1]).split("/").pop())

  const [owner] = await sql`
    select id, name, email, role, job_title, organization_id
    from users where email = ${OWNER_EMAIL} limit 1`
  if (!owner) throw new Error(`account ${OWNER_EMAIL} not found`)

  const [rung] = await sql`
    select id, discipline, level, title from career_levels
    where discipline = ${DISCIPLINE} and level = ${LEVEL} and is_active limit 1`
  if (!rung) throw new Error(`the ${DISCIPLINE} ladder has no active rung ${LEVEL}`)

  const [existing] = await sql`
    select user_id, discipline, level, placed_by, placed_at, note from career_placement
    where user_id = ${owner.id} and discipline = ${DISCIPLINE} limit 1`

  console.log(`account: #${owner.id} ${owner.name} <${owner.email}> role=${owner.role} ` +
    `job_title=${owner.job_title} org=${owner.organization_id}`)
  console.log(`rung: ${rung.title} (${DISCIPLINE} L${LEVEL})`)
  console.log(`role change: ${owner.role} -> superadmin${owner.role === "superadmin" ? " (already granted)" : ""}`)
  console.log(`placement: ${existing ? `already holds L${existing.level} — left alone` : `will insert L${LEVEL}`}`)
  console.log(`rows this script writes: ${owner.role === "superadmin" ? 0 : 1} user update(s), ` +
    `${existing ? 0 : 1} placement insert(s)`)

  if (!APPLY) {
    console.log("\ndry run — nothing written. Re-run with --apply.")
    await sql.end()
    return
  }
  if (owner.role === "superadmin" && existing) {
    console.log("\nnothing to do; both writes are already in place.")
    await sql.end()
    return
  }

  mkdirSync(new URL("../backups/", import.meta.url), { recursive: true })
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".").join("")
  const backupName = `ladder-owner-${stamp}.json`
  const backupFile = new URL(`../backups/${backupName}`, import.meta.url)
  writeFileSync(
    backupFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "scripts/place-ladder-owner.mjs",
        owner,
        placement: existing ?? null,
        intent: { discipline: DISCIPLINE, level: LEVEL, note: NOTE },
      },
      null,
      2,
    ),
  )
  console.log(`backup written: backups/${backupName}`)

  const updated = await sql`
    update users set role = 'superadmin', updated_at = now()
    where id = ${owner.id} and email = ${OWNER_EMAIL} and role is distinct from 'superadmin'
    returning id, role`
  const inserted = existing
    ? []
    : await sql`
        insert into career_placement (user_id, discipline, level, placed_by, placed_at, note)
        values (${owner.id}, ${DISCIPLINE}, ${LEVEL}, ${owner.id}, now(), ${NOTE})
        on conflict (user_id, discipline) do nothing
        returning user_id, discipline, level, placed_by, placed_at, note`

  console.log(`written: role ${updated.length ? "-> " + updated[0].role : "unchanged"}, ` +
    `placement ${inserted.length ? "inserted" : "unchanged"}`)

  const [after] = await sql`
    select u.role, p.level, cl.title from users u
    left join career_placement p on p.user_id = u.id and p.discipline = ${DISCIPLINE}
    left join career_levels cl on cl.discipline = p.discipline and cl.level = p.level
    where u.id = ${owner.id}`
  console.log(`verify: role=${after.role} placement=${after.level ?? "none"} title=${after.title ?? "-"}`)
  console.log("recheck: sign out and back in, then open /dashboard/career and /admin/career.")
  await sql.end()
}

if (RESTORE_FILE) await restore()
else await main()
