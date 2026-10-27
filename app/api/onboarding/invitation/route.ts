import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { acceptInvitation } from "@/lib/onboarding/write"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  if (token.length < 20 || token.length > 200) {
    return NextResponse.json({ success: false, error: "That invitation link is not valid." }, { status: 400 })
  }

  try {
    const result = await acceptInvitation({ userId: session.id, email: session.email, token })
    if (!result.ok) {
      // The failure kind only — the token itself is never logged.
      console.warn(`Invitation acceptance refused (${result.status})`)
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }
    return NextResponse.json({ success: true, data: { role: result.role } })
  } catch (error) {
    console.error("Invitation acceptance failed:", error)
    return NextResponse.json({ success: false, error: "That invitation could not be accepted." }, { status: 500 })
  }
}