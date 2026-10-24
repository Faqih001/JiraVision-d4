// /api/admin/cms/audit — super-admin read of the CMS mutation trail.
// GET → last 50 audit rows (optionally ?pageId=), newest first, actor names joined.

import { NextRequest, NextResponse } from "next/server"
import { fetchAudit, requireSuperAdmin, serverError } from "../_shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const gate = await requireSuperAdmin()
  if ("error" in gate) return gate.error

  try {
    const pageId = request.nextUrl.searchParams.get("pageId") || undefined
    const entries = await fetchAudit(pageId, 50)
    return NextResponse.json({ success: true, data: { entries } })
  } catch (error) {
    return serverError(error, "fetch cms audit")
  }
}
