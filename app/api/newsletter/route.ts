import { NextResponse } from "next/server"
import { clientIp, rateLimited } from "@/lib/rate-limit"
import { subscriberStore } from "@/lib/data/subscribers"
import { sendEmail } from "@/lib/email"
import { newsletterSchema } from "@/lib/forms/schemas"

export async function POST(request: Request) {
  const ip = clientIp(request)
  if (rateLimited(`newsletter:${ip}`, { max: 5 })) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
  }
  if (parsed.data.company) {
    // Honeypot filled — pretend success to the bot.
    return NextResponse.json({ ok: true })
  }

  const { record, exists } = await subscriberStore.add(parsed.data.email, parsed.data.source)
  if (!exists) {
    const origin = new URL(request.url).origin
    const link = `${origin}/api/newsletter/confirm?token=${record.confirmToken}`
    await sendEmail({
      to: record.email,
      subject: "Confirm your JiraVision newsletter",
      html: `<p>You're almost in. Confirm your address to receive occasional notes on AI-native project management:</p><p><a href="${link}">Confirm subscription</a></p><p>If you didn't sign up, ignore this email and nothing will be sent to you.</p>`,
      text: `Confirm your subscription: ${link}\n\nIf you didn't sign up, ignore this email.`,
    })
  }

  return NextResponse.json({ ok: true })
}
