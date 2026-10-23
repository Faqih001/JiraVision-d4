import { NextResponse } from "next/server"
import { z } from "zod"
import { subscriberStore } from "@/lib/data/subscribers"

const schema = z.object({
  email: z.string().trim().email().max(254),
  source: z.string().max(64).default("footer"),
  // Honeypot: real users never fill this; bots do.
  company: z.string().max(0).optional(),
})

// Naive in-memory rate limit (per instance). Swap for KV/Upstash when deployed multi-instance.
const hits = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function rateLimited(key: string) {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now })
    return false
  }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
  }
  if (parsed.data.company) {
    // Pretend success to the bot.
    return NextResponse.json({ ok: true })
  }

  await subscriberStore.add({
    email: parsed.data.email,
    source: parsed.data.source,
    createdAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
