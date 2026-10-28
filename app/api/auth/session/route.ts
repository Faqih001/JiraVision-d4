import { NextResponse } from "next/server"
import { getSessionStatus } from "@/lib/auth-actions"
import { clearSessionCookies } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * GET /api/auth/session — who the browser is.
 *
 * Three answers, because they mean three different things to the client: nobody is signed in
 * (200, user null), a session has ended (200 with the reason, cookie removed), or the database
 * did not answer (503, nothing cleared). Collapsing the last two into a null is what produced
 * the fake "signed out" state during a Neon cold start.
 */
export async function GET() {
  const result = await getSessionStatus()

  if (result.state === "unreachable") {
    return NextResponse.json(
      { error: "Session lookup unavailable" },
      { status: 503, headers: { "Retry-After": "5" } },
    )
  }

  if (result.state === "active") {
    return NextResponse.json({ user: result.user })
  }

  if (result.state === "invalid") await clearSessionCookies()

  return NextResponse.json({
    user: null,
    reason: result.state === "invalid" ? result.reason : null,
  })
}
