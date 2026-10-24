// Creates the CMS tables used by /admin/cms + /api/admin/cms.
// Run from the project root: node scripts/create-cms-table.mjs
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
    CREATE TABLE IF NOT EXISTS cms_content_overrides (
      id SERIAL PRIMARY KEY,
      page_id VARCHAR(64) NOT NULL,
      section_id VARCHAR(64) NOT NULL,
      fields JSONB NOT NULL DEFAULT '{}',
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      updated_by INTEGER,
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE (page_id, section_id)
    )
  `)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS cms_audit_log (
      id SERIAL PRIMARY KEY,
      page_id VARCHAR(64) NOT NULL,
      section_id VARCHAR(64) NOT NULL,
      action VARCHAR(32) NOT NULL,
      user_id INTEGER,
      detail JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `)
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_cms_audit_created ON cms_audit_log (created_at DESC)`)

  const check = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('cms_content_overrides', 'cms_audit_log')
    ORDER BY table_name, ordinal_position
  `
  console.log("cms tables ready:")
  for (const row of check) console.log(` ${row.table_name}.${row.column_name} (${row.data_type})`)
} finally {
  await sql.end()
}
