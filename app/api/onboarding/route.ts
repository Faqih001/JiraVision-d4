import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { readOnboardingView } from "@/lib/onboarding/read"
import { markOnboardingSkipped, restartOnboarding } from "@/lib/onboarding/write"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  try {
    return NextResponse.json({ success: true, data: await readOnboardingView(session) })
  } catch (error) {
    console.error("Onboarding read error:", error)
    return NextResponse.json({ success: false, message: "Failed to load onboarding" }, { status: 500 })
  }
}

// The escape valve. "Set up later" is a decision, not a failure, and "Restart setup" is the
// only way back — both are recorded on the user_onboarding row so /dashboard can trust it.
export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { action?: unknown } | null
  const action = body?.action
  if (action !== "skip" && action !== "restart") {
    return NextResponse.json({ success: false, message: "action must be skip or restart" }, { status: 400 })
  }

  try {
    if (action === "skip") await markOnboardingSkipped(session.id)
    else await restartOnboarding(session.id)
    return NextResponse.json({ success: true, data: { status: action === "skip" ? "skipped" : "in_progress" } })
  } catch (error) {
    console.error("Onboarding gate write error:", error)
    return NextResponse.json({ success: false, message: "Could not save that choice" }, { status: 500 })
  }
}
