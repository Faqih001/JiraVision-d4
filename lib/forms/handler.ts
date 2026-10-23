import { NextResponse } from "next/server"
import type { z } from "zod"
import { clientIp, rateLimited } from "@/lib/rate-limit"
import { submissionStore, type SubmissionKind } from "@/lib/data/submissions"
import { emailTemplate, sendEmail, TEAM_INBOX } from "@/lib/email"

interface FormRouteOptions {
  kind: SubmissionKind
  schema: z.ZodType<{ website?: string } & Record<string, unknown>>
  subject: string
  emailTitle: string
  labels: Record<string, string>
  /** max submissions per IP per minute */
  maxPerMinute?: number
}

/**
 * Shared POST handler for marketing forms: honeypot -> rate limit -> zod
 * validation -> store submission -> notify the team inbox. Bots and rate-
 * limited spam get a fake success so they don't learn they were filtered.
 */
export function formRoute({ kind, schema, subject, emailTitle, labels, maxPerMinute = 3 }: FormRouteOptions) {
  return async function POST(request: Request) {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const honeypot =
      typeof (body as { website?: unknown })?.website === "string" && (body as { website: string }).website.length > 0
    if (honeypot) {
      return NextResponse.json({ ok: true })
    }

    if (rateLimited(`${kind}:${clientIp(request)}`, { max: maxPerMinute })) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message
      }
      return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors }, { status: 400 })
    }

    const payload: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (typeof value === "string" && value.trim()) payload[key] = value.trim()
    }

    await submissionStore.add(kind, payload)

    const rows = Object.entries(payload)
      .filter(([key]) => key !== "website")
      .map(([key, value]) => [labels[key] ?? key, value] as [string, string])
    const replyTo = typeof parsed.data.email === "string" ? parsed.data.email : undefined
    const { html, text } = emailTemplate(emailTitle, rows)
    const mail = await sendEmail({ to: TEAM_INBOX, subject, html, text, replyTo })
    if (!mail.ok) {
      // Submission is stored; notification failure shouldn't punish the user.
      console.error(`[forms:${kind}] team notification failed`)
    }

    return NextResponse.json({ ok: true })
  }
}
