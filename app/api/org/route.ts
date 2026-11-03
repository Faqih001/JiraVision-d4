// /api/org — the viewer's organization and its member list (design: org visibility).
// GET answers for any signed-in member; no organization is a valid state, not an
// error. POST creates one and places the creator inside it as owner. Membership beyond
// that arrives through an accepted workspace invitation, never through this route.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { createOrganization, loadOrganizationFor, validateOrgName } from "@/lib/organizations"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { organization, members } = await loadOrganizationFor(session.id)
    return NextResponse.json({ success: true, organization, members })
  } catch (error) {
    console.error("Organization read error:", error)
    return NextResponse.json({ success: false, error: "Failed to load the organization" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ success: false, error: "A JSON body is required" }, { status: 400 })

  const parsed = validateOrgName(body.name)
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })

  try {
    const created = await createOrganization({ userId: session.id, name: parsed.name })
    if (!created.ok) return NextResponse.json({ success: false, error: created.error }, { status: 409 })
    return NextResponse.json({ success: true, organization: created.organization }, { status: 201 })
  } catch (error) {
    console.error("Organization create error:", error)
    return NextResponse.json({ success: false, error: "Failed to create the organization" }, { status: 500 })
  }
}
