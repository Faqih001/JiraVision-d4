// /api/assistant/site — anonymous site assistant (design §7)
// POST → ask a question about the website
// Rate limited: 8/hour, 24/day per IP, global daily cap 200

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimited, clientIp } from "@/lib/rate-limit"
import { callSiteAssistant } from "@/lib/assistant/site"

export const dynamic = "force-dynamic"

const PostBodySchema = z.object({
  question: z.string().min(1).max(900),
  pathname: z.string().max(500).default("/"),
})

export async function POST(request: NextRequest) {
  const ip = clientIp(request)

  // Rate limit: 8 per hour
  if (rateLimited(`assistant:hour:${ip}`, { windowMs: 3_600_000, max: 8 })) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again in an hour.",
        resetIn: "1 hour",
      },
      { status: 429 }
    )
  }

  // Rate limit: 24 per day
  if (rateLimited(`assistant:day:${ip}`, { windowMs: 86_400_000, max: 24 })) {
    return NextResponse.json(
      {
        error: "Daily limit reached. Please try again tomorrow.",
        resetIn: "24 hours",
      },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { question, pathname } = PostBodySchema.parse(body)

    // Call site assistant (tier 1 keyword, tier 2 Gemini)
    const response = await callSiteAssistant(question, pathname, {
      dailyCap: parseInt(process.env.AI_PUBLIC_DAILY_CAP ?? "200", 10),
    })

    return NextResponse.json({
      success: true,
      data: {
        answer: response.answer,
        source: response.source,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Site assistant error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
