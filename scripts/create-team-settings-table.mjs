// Creates the team-workspace settings tables used by /dashboard/team/settings
// and /api/team/settings. Run from the project root: node scripts/create-team-settings-table.mjs
import fs from "node:fs"
import postgres from "postgres"

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)
if (!match) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}

const sql = postgres(match[1], { max: 1 })

try {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS team_settings (
      id SERIAL PRIMARY KEY,
      team_name VARCHAR(120) NOT NULL DEFAULT 'Team',
      default_member_role VARCHAR(32) NOT NULL DEFAULT 'user',
      notify_member_joined BOOLEAN NOT NULL DEFAULT TRUE,
      notify_member_removed BOOLEAN NOT NULL DEFAULT TRUE,
      notify_profile_updated BOOLEAN NOT NULL DEFAULT TRUE,
      notify_role_changed BOOLEAN NOT NULL DEFAULT TRUE,
      notify_wellbeing_alert BOOLEAN NOT NULL DEFAULT TRUE,
      updated_by INTEGER,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS team_role_audit (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL,
      member_name VARCHAR(160),
      from_role VARCHAR(32),
      to_role VARCHAR(32) NOT NULL,
      changed_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `)
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_team_role_audit_created ON team_role_audit (created_at DESC)`)

  // The workspace keeps exactly one settings row; create it on first run.
  await sql.unsafe(`
    INSERT INTO team_settings (team_name)
    SELECT 'Team' WHERE NOT EXISTS (SELECT 1 FROM team_settings)
  `)

  const check = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('team_settings', 'team_role_audit')
    ORDER BY table_name, ordinal_position
  `
  console.log("team settings tables ready:")
  for (const row of check) console.log(` ${row.table_name}.${row.column_name} (${row.data_type})`)
  const rows = await sql`SELECT id, team_name, default_member_role FROM team_settings ORDER BY id`
  console.log("settings rows:", JSON.stringify(rows))
} finally {
  await sql.end()
}
