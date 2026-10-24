import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { sealNotificationsQuery } from "@/lib/neon-realtime"

export const dynamic = "force-dynamic"

// Returns the sealed live-query capability for the signed-in user's
// notification rows. The client passes it to the Neon Realtime websocket;
// the SQL and the userId filter stay server-side.
export async function GET() {
  const user = await getCurrentUser()
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
