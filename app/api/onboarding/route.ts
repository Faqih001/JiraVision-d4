import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { readOnboardingView } from "@/lib/onboarding/read"

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