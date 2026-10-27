import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { rateLimited } from "@/lib/rate-limit"
import { requestAccess } from "@/lib/onboarding/write"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  if (rateLimited(`onboarding-access:${session.id}`, { windowMs: 24 * 60 * 60 * 1000, max: 3 })) {
    return NextResponse.json({ success: false, error: "You have already asked recently." }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as { note?: unknown } | null
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null

  try {
    await requestAccess({ userId: session.id, name: session.name, note })
    // Never say how many admins exist or who they are.
    return NextResponse.json({ success: true, data: { requested: true } })
  } catch (error) {
    console.error("Access request failed:", error)
    return NextResponse.json({ success: false, error: "Could not send the request." }, { status: 500 })
  }
}