import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { SessionUnreachableError } from "@/lib/auth/session-state"
import { sealNotificationsQuery } from "@/lib/neon-realtime"

export const dynamic = "force-dynamic"

// Returns the sealed live-query capability for the signed-in user's
// notification rows. The client passes it to the Neon Realtime websocket;
// the SQL and the userId filter stay server-side.
export async function GET() {
  let user
  try {
    user = await getCurrentUser()
  } catch (error) {
    // A database that did not answer is not a signed-out browser. Answering 401 here would end the
    // session in the client for a cold compute that is about to wake; 503 tells it to back off and
    // keep the cookie. 401 stays reserved for a read that succeeded and found no row.
    if (error instanceof SessionUnreachableError) {
      return NextResponse.json({ error: "Waking up. Try again shortly." }, { status: 503 })
    }
    throw error
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sealed = await sealNotificationsQuery(user.id)
  if (!sealed) {
    return NextResponse.json({ error: "Realtime not configured" }, { status: 503 })
  }
  return NextResponse.json({
    sealed,
    realtimeUrl: process.env.NEXT_PUBLIC_NEON_REALTIME_URL ?? process.env.NEON_REALTIME_URL ?? null,
  })
}
