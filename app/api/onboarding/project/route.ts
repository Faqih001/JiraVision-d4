import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createOnboardingProject, readProjectInput } from "@/lib/onboarding/write"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const parsed = readProjectInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })

  try {
    const result = await createOnboardingProject({ userId: session.id, input: parsed.value })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Onboarding project creation failed:", error)
    return NextResponse.json({ success: false, error: "Could not create the project." }, { status: 500 })
  }
}