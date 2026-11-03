// Import the owner's IT sprint plan (4 sprints + 4 retros, 2026-11-03) and allocate the 41
// imported IT Technician tasks across those windows, so /dashboard/sprints' default "mine"
// scope — which lists only sprints the member holds tasks in — has something to show.
//
// Sprints and retros are inserted only; nothing existing is deleted. The two writes to
// existing rows are tasks.sprint_id (all 41 read as NULL, and the apply aborts if any is not)
// and the status of legacy sprints that hold no tasks. Both are recorded in backups/ first and
// --restore replays exactly those values, then removes only the rows this run created.
//
//   node scripts/import-it-technician-sprints.mjs --dry-run
//   node scripts/import-it-technician-sprints.mjs --apply
//   node scripts/import-it-technician-sprints.mjs --restore backups/it-sprints-backup-<stamp>.json
//
// Run from the repo root.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import postgres from "postgres"

const OWNER_EMAIL = "fakiiahmad001@gmail.com"
// Mirrors app/api/sprints/route.ts:14 and the retros CHECK in scripts/create-retro-tables.mjs.
const SPRINT_STATUSES = new Set(["planned", "planning", "active", "completed"])
const RETRO_STATUSES = new Set(["draft", "scheduled", "completed", "archived"])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY = 86_400_000

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

/** The plan with each sprint's task titles and derived capacity resolved against the task list. */
function loadPlan() {
  const plan = JSON.parse(readFileSync(new URL("./data/it-technician-sprints.json", import.meta.url), "utf8"))
  const tasks = JSON.parse(readFileSync(new URL("./data/it-technician-tasks.json", import.meta.url), "utf8"))
  if (!Array.isArray(plan.sprints) || plan.sprints.length !== 4) throw new Error(`expected 4 sprints, got ${plan.sprints?.length}`)
  if (!Array.isArray(plan.retros) || plan.retros.length !== 4) throw new Error(`expected 4 retros, got ${plan.retros?.length}`)

  const bySeq = new Map(tasks.map((t) => [t.seq, t]))
  const names = new Set()
  const allocated = new Set()
  let prevEnd = null

  const sprints = plan.sprints.map((s) => {
    if (!s.name?.trim() || !s.description?.trim()) throw new Error(`sprint ${s.seq}: empty name/description`)
    if (s.name.length > 255) throw new Error(`sprint ${s.seq}: name longer than 255 chars`)
    if (names.has(s.name)) throw new Error(`duplicate sprint name: ${s.name}`)
    names.add(s.name)
    if (!SPRINT_STATUSES.has(s.status)) throw new Error(`sprint ${s.seq}: status ${s.status} is outside the app vocabulary`)
    for (const d of [s.startDate, s.endDate]) {
      if (!ISO_DATE.test(d) || Number.isNaN(Date.parse(d))) throw new Error(`sprint ${s.seq}: bad date ${d}`)
    }
    if (Date.parse(s.endDate) <= Date.parse(s.startDate)) throw new Error(`sprint ${s.seq}: end before start`)
    // The four windows tile the quarter: no gap, no overlap.
    if (prevEnd !== null && Date.parse(s.startDate) - prevEnd !== DAY) {
      throw new Error(`sprint ${s.seq}: starts ${s.startDate}, expected the day after ${new Date(prevEnd).toISOString().slice(0, 10)}`)
    }
    prevEnd = Date.parse(s.endDate)

    const titles = []
    let capacity = 0
    for (const seq of s.taskSeqs) {
      const t = bySeq.get(seq)
      if (!t) throw new Error(`sprint ${s.seq}: task seq ${seq} is not in the task list`)
      if (allocated.has(seq)) throw new Error(`task seq ${seq} is allocated to two sprints`)
      allocated.add(seq)
      titles.push(t.title)
      capacity += t.storyPoints
    }
    return { ...s, titles, capacity }
  })

  if (allocated.size !== tasks.length) {
    throw new Error(`the mapping covers ${allocated.size} of ${tasks.length} tasks`)
  }
  if (sprints.filter((s) => s.status === "active").length !== 1) {
    throw new Error("the plan must have exactly one active sprint")
  }

  const retroTitles = new Set()
  for (const r of plan.retros) {
    if (!RETRO_STATUSES.has(r.status)) throw new Error(`retro ${r.seq}: status ${r.status} fails the retros CHECK`)
    if (retroTitles.has(r.title)) throw new Error(`duplicate retro title: ${r.title}`)
    retroTitles.add(r.title)
    const linked = sprints.find((s) => s.seq === r.sprintSeq)
    if (!linked) throw new Error(`retro ${r.seq}: no sprint with seq ${r.sprintSeq}`)
    if (r.date !== linked.endDate) throw new Error(`retro ${r.seq}: dated ${r.date}, its sprint ends ${linked.endDate}`)
  }

  return { sprints, retros: plan.retros }
}

async function restore(sql, file) {
  const dump = JSON.parse(readFileSync(file, "utf8"))
  if (!Array.isArray(dump.created?.sprintIds)) {
    throw new Error(`restore aborted: ${file} has no created sprint ids, so this backup was taken before any apply finished`)
  }
  const retroIds = dump.created.retroIds ?? []
  const sprintIds = dump.created.sprintIds
  const priorBySprint = new Map()
  for (const row of dump.taskSprintIds ?? []) {
    const key = row.sprint_id ?? null
    if (!priorBySprint.has(key)) priorBySprint.set(key, [])
    priorBySprint.get(key).push(row.id)
  }
  const stamped = new Date()
  await sql.begin(async (tx) => {
    if (retroIds.length > 0) await tx`DELETE FROM retros WHERE id = ANY(${retroIds})`
    if (sprintIds.length > 0) await tx`DELETE FROM sprints WHERE id = ANY(${sprintIds})`
    for (const [priorSprintId, ids] of priorBySprint) {
      await tx`UPDATE tasks SET sprint_id = ${priorSprintId}, updated_at = ${stamped} WHERE id = ANY(${ids})`
    }
    for (const s of dump.legacySprints ?? []) {
      await tx`UPDATE sprints SET status = ${s.status} WHERE id = ${s.id}`
    }
  })
  console.log(
    `Restored from ${file}: removed ${sprintIds.length} sprints and ${retroIds.length} retros this backup created, ` +
      `returned ${dump.taskSprintIds?.length ?? 0} tasks to their previous sprint, reopened ${dump.legacySprints?.length ?? 0} legacy sprints.`
  )
}

async function main() {
  const plan = RESTORE_FILE ? null : loadPlan()
  const sql = postgres(match[1], { max: 1, connect_timeout: 30 })

  try {
    if (RESTORE_FILE) {
      await restore(sql, RESTORE_FILE)
      return
    }

    const [user] = await sql`SELECT id, name FROM users WHERE email = ${OWNER_EMAIL} LIMIT 1`
    if (!user) {
      console.error(`Account ${OWNER_EMAIL} not found — aborting.`)
      process.exit(1)
    }

    // The tasks this plan allocates, read back by title so the plan's seq numbers never have
    // to be trusted about the database's ids.
    const wantedTitles = plan.sprints.flatMap((s) => s.titles)
    const rows = await sql`
      SELECT id, title, sprint_id, story_points FROM tasks
      WHERE assignee_id = ${user.id} AND title = ANY(${wantedTitles})
      ORDER BY id
    `
    const byTitle = new Map(rows.map((r) => [r.title, r]))
    const missing = wantedTitles.filter((t) => !byTitle.has(t))
    const alreadyPlanned = rows.filter((r) => r.sprint_id !== null)

    const [sprintTotal, retroTotal, openSprint] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM sprints`,
      sql`SELECT count(*)::int AS n FROM retros`,
      sql`SELECT count(*)::int AS n FROM sprints WHERE status = 'active'`,
    ])
    const sprintNameClash = await sql`SELECT id, name FROM sprints WHERE name = ANY(${plan.sprints.map((s) => s.name)})`
    const retroTitleClash = await sql`SELECT id, title FROM retros WHERE title = ANY(${plan.retros.map((r) => r.title)})`

    // Legacy sprints are only ever closed when they are not already completed and hold no
    // tasks at all, so a real sprint can never be caught by this.
    const legacy = await sql`
      SELECT id, name, status FROM sprints s
      WHERE status <> 'completed'
        AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.sprint_id = s.id)
      ORDER BY id
    `

    console.log(`Account: ${user.id} (${user.name} <${OWNER_EMAIL}>)`)
    console.log(`Existing rows: ${sprintTotal[0].n} sprints, ${retroTotal[0].n} retros, ${openSprint[0].n} active sprint(s)`)
    console.log(`Tasks found for this plan: ${rows.length}/${wantedTitles.length}` + (missing.length > 0 ? ` — MISSING: ${missing.join(" | ")}` : ""))
    if (alreadyPlanned.length > 0) {
      console.log(`NOTE: ${alreadyPlanned.length} of those tasks already sit in a sprint (e.g. "${alreadyPlanned[0].title}" → #${alreadyPlanned[0].sprint_id}).`)
    }
    for (const s of plan.sprints) {
      console.log(`  ${s.seq}. ${s.name} | ${s.startDate}..${s.endDate} | ${s.status} | ${s.taskSeqs.length} tasks, ${s.capacity} pts (derived)`)
    }
    for (const r of plan.retros) console.log(`  retro ${r.seq}: ${r.title} | ${r.date} | ${r.status} → sprint ${r.sprintSeq}`)
    if (sprintNameClash.length > 0 || retroTitleClash.length > 0) {
      console.log(`NOTE: ${sprintNameClash.length} sprint names and ${retroTitleClash.length} retro titles already exist on this database.`)
    }
    console.log(`Legacy sprints this run would mark completed: ${legacy.length > 0 ? legacy.map((s) => `#${s.id} ${s.name} (${s.status})`).join(", ") : "none"}`)

    if (!APPLY) {
      console.log("Dry run only — nothing changed. Re-run with --apply.")
      return
    }
    if (missing.length > 0) {
      console.error(`Aborting: ${missing.length} planned task(s) are not on this account. Run the task import first.`)
      process.exit(1)
    }
    if (alreadyPlanned.length > 0) {
      console.error(`Aborting: ${alreadyPlanned.length} task(s) already belong to a sprint. Unassign them in the app first.`)
      process.exit(1)
    }
    if (sprintNameClash.length > 0 || retroTitleClash.length > 0) {
      console.error("Refusing to double-import: the sprint names or retro titles above already exist. Rename or delete them in the app first.")
      process.exit(1)
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".").join("")
    const backupFile = `backups/it-sprints-backup-${stamp}.json`
    const backup = {
      takenAt: new Date().toISOString(),
      databaseUrlHost: match[1].replace(/^[^@]*@/, "").split("/")[0],
      userId: user.id,
      userEmail: OWNER_EMAIL,
      counts: {
        sprints: sprintTotal[0].n,
        retros: retroTotal[0].n,
        tasks: rows.length,
      },
      // Every existing row this run writes to, with the value it held before.
      taskSprintIds: rows.map((r) => ({ id: r.id, title: r.title, sprint_id: r.sprint_id })),
      legacySprints: legacy.map((s) => ({ id: s.id, name: s.name, status: s.status })),
      plan: plan.sprints.map((s) => ({ seq: s.seq, name: s.name, capacity: s.capacity, tasks: s.titles.length })),
      created: { sprintIds: [], retroIds: [] },
    }
    mkdirSync("backups", { recursive: true })
    writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    const written = JSON.parse(readFileSync(backupFile, "utf8"))
    if (written.taskSprintIds.length !== rows.length || written.legacySprints.length !== legacy.length) {
      console.error(`Backup verification failed (${written.taskSprintIds.length}/${rows.length} tasks, ${written.legacySprints.length}/${legacy.length} legacy sprints) — aborting before any write.`)
      process.exit(1)
    }
    console.log(`Backup written: ${backupFile}`)

    const now = new Date()
    const created = { sprintIds: [], retroIds: [] }
    await sql.begin(async (tx) => {
      const sprintIdBySeq = new Map()
      for (const s of plan.sprints) {
        const [row] = await tx`
          INSERT INTO sprints (name, description, start_date, end_date, status, capacity, completed, created_at, updated_at)
          VALUES (${s.name}, ${s.description}, ${s.startDate}, ${s.endDate}, ${s.status}, ${s.capacity}, 0, ${now}, ${now})
          RETURNING id
        `
        sprintIdBySeq.set(s.seq, row.id)
        created.sprintIds.push(row.id)
      }

      for (const s of plan.sprints) {
        // Scoped to this account, matched by the titles the task import wrote. The route's own
        // unlink stamps updated_at (app/api/sprints/[id]/route.ts:374), so linking does too.
        await tx`
          UPDATE tasks SET sprint_id = ${sprintIdBySeq.get(s.seq)}, updated_at = ${now}
          WHERE assignee_id = ${user.id} AND title = ANY(${s.titles})
        `
      }

      for (const r of plan.retros) {
        const [row] = await tx`
          INSERT INTO retros (sprint_id, title, date, status, created_by, created_at)
          VALUES (${sprintIdBySeq.get(r.sprintSeq)}, ${r.title}, ${r.date}, ${r.status}, ${user.id}, ${now})
          RETURNING id
        `
        created.retroIds.push(row.id)
      }

      // Status only: updated_at stays as it was, because the page derives "ended on time"
      // from it and stamping today would rewrite these sprints as late.
      if (legacy.length > 0) {
        await tx`
          UPDATE sprints SET status = 'completed'
          WHERE id = ANY(${legacy.map((s) => s.id)})
            AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.sprint_id = sprints.id)
        `
      }
    })

    // Record what was created so --restore can remove exactly these rows.
    backup.created = created
    writeFileSync(backupFile, JSON.stringify({ ...backup, created }, null, 2))

    const after = await sql`
      SELECT s.id, s.name, s.status, s.capacity,
        count(t.id)::int AS task_count,
        coalesce(sum(t.story_points), 0)::int AS task_points
      FROM sprints s LEFT JOIN tasks t ON t.sprint_id = s.id
      WHERE s.id = ANY(${created.sprintIds})
      GROUP BY s.id, s.name, s.status, s.capacity ORDER BY s.id
    `
    const retroCount = await sql`SELECT count(*)::int AS n FROM retros WHERE id = ANY(${created.retroIds})`
    const stillOpen = await sql`SELECT count(*)::int AS n FROM sprints WHERE status <> 'completed' AND NOT (id = ANY(${created.sprintIds}))`
    const unplanned = await sql`SELECT count(*)::int AS n FROM tasks WHERE assignee_id = ${user.id} AND sprint_id IS NULL`
    console.log(`Applied: sprints ${created.sprintIds.join(", ")} | retros ${created.retroIds.join(", ")}`)
    for (const s of after) {
      console.log(`  #${s.id} ${s.name} | ${s.status} | ${s.task_count} tasks, ${s.task_points} pts (capacity ${s.capacity})`)
      if (s.task_points !== s.capacity) console.log(`  WARNING: #${s.id} holds ${s.task_points} pts but capacity says ${s.capacity}`)
    }
    console.log(`Retros created: ${retroCount[0].n}/${created.retroIds.length}. Unplanned tasks left in Backlog: ${unplanned[0].n}.`)
    console.log(`Sprints still open that predate this run: ${stillOpen[0].n} (expected 0 — legacy rows were closed).`)
  } catch (error) {
    console.error("Sprint import failed:", error.message ?? error)
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main()
