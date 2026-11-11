// The hourly schedule's digest job: the only place in the app that mails a workspace member.
//
// POST /api/email/digest accepts any address containing "@" from any signed-in member, so the
// outbox is not a list of people who asked for mail — it is a list of addresses someone typed.
// Delivery is therefore restricted to addresses that belong to a user of this app. Without that
// rule this route is the open relay /api/aitopia was removed for being.
//
// The row is claimed before the provider is called: Vercel can deliver one cron run twice, and the
// claim's WHERE still requires 'queued', so the second delivery sends nothing.

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailTemplate, sendEmail } from "@/lib/email"

type ChannelPref = { digest?: boolean; inApp?: boolean }

interface QueuedRow {
  id: number
  user_id: number
  to_email: string | null
  subject: string | null
  body: string | null
  event_type: string | null
  prefs: Record<string, ChannelPref> | string | null
}

export function queuedDigestSql(limit = 25) {
  return sql`
    SELECT d.id, d.user_id, d.to_email, d.subject, d.body, d.event_type, p.data AS prefs
    FROM email_digest d
    JOIN users u ON u.id = d.user_id
    LEFT JOIN email_preferences p ON p.user_id = d.user_id
    WHERE d.status = 'queued'
    ORDER BY d.created_at
    LIMIT ${limit}
  `
}

export function memberEmailsSql() {
  return sql`SELECT lower(email) AS email FROM users`
}

export function claimDigestSql(id: number) {
  return sql`update email_digest set status = ${"delivered"} where id = ${id} and status = 'queued' returning id`
}

export function failDigestSql(id: number) {
  return sql`update email_digest set status = ${"failed"} where id = ${id}`
}

function preferenceMap(raw: QueuedRow["prefs"]): Record<string, ChannelPref> {
  if (typeof raw !== "string") return raw ?? {}
  try {
    return (JSON.parse(raw) ?? {}) as Record<string, ChannelPref>
  } catch {
    return {}
  }
}

export async function flushDigestQueue(): Promise<{
  ok: boolean
  due: number
  delivered: number
  failed: number
  refused: number
}> {
  const rows = (await db.execute(queuedDigestSql())) as unknown as QueuedRow[]
  if (!rows.length) return { ok: true, due: 0, delivered: 0, failed: 0, refused: 0 }

  const memberRows = (await db.execute(memberEmailsSql())) as unknown as { email: string }[]
  const members = new Set(memberRows.map((r) => r.email.trim().toLowerCase()))

  let delivered = 0
  let failed = 0
  let refused = 0

  for (const row of rows) {
    const address = (row.to_email ?? "").trim().toLowerCase()

    if (!address || !members.has(address)) {
      refused += 1
      console.error(`Digest ${row.id} refused: "${address}" is not a member address`)
      await db.execute(failDigestSql(row.id))
      continue
    }

    if (preferenceMap(row.prefs)[row.event_type ?? ""]?.digest === false) {
      refused += 1
      // 'failed' is the only terminal status that does not claim delivery — email_digest has no
      // 'skipped' state, and adding one is a migration. The reason lives in this log line.
      console.info(`Digest ${row.id} not sent: ${address} switched off the ${row.event_type} digest`)
      await db.execute(failDigestSql(row.id))
      continue
    }

    const claim = (await db.execute(claimDigestSql(row.id))) as unknown as { id: number }[]
    if (!claim.length) continue

    const subject = row.subject ?? "JiraVision digest"
    const { html, text } = emailTemplate(subject, [], row.body ?? "")
    const sent = await sendEmail({ to: address, subject, html, text })

    if (!sent.ok) {
      failed += 1
      console.error(`Digest ${row.id} failed:`, sent.error)
      await db.execute(failDigestSql(row.id))
      continue
    }
    delivered += 1
  }

  return { ok: failed === 0, due: rows.length, delivered, failed, refused }
}