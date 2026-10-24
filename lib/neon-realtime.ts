// Neon Realtime integration: live SQL subscriptions push database rows to
// clients, so the notification bell and activity feeds update without
// polling or a hand-rolled socket server.
//
// Server side defines and SEALS queries with NEON_REALTIME_SECRET; the
// browser only ever sees an opaque capability bound to one user's rows.

import { createRealtime } from "@neon/realtime/server"
import { drizzleAdapter } from "@neon/realtime-drizzle"
import { desc, eq } from "drizzle-orm"
import { notifications } from "@/drizzle/schema"
import { db } from "@/lib/db"

function createRealtimeServer() {
  return createRealtime({
    secret: process.env.NEON_REALTIME_SECRET!,
    db: dbName(),
    adapter: drizzleAdapter(),
  })
}

type NeonRealtimeServer = ReturnType<typeof createRealtimeServer>

const g = globalThis as typeof globalThis & { __jvNeonRealtime?: NeonRealtimeServer | null }

export function neonRealtimeEnabled(): boolean {
  return Boolean(process.env.NEON_REALTIME_SECRET && process.env.DATABASE_URL)
}

function dbName(): string {
  try {
    return new URL(process.env.DATABASE_URL!).pathname.replace(/^\//, "") || "neondb"
  } catch {
    return "neondb"
  }
}

export function getRealtimeServer(): NeonRealtimeServer | null {
  if (!neonRealtimeEnabled()) return null
  if (g.__jvNeonRealtime === undefined) {
    try {
      g.__jvNeonRealtime = createRealtimeServer()
    } catch {
      g.__jvNeonRealtime = null
    }
  }
  return g.__jvNeonRealtime
}

/** Only this user's notifications, newest first — parameters are baked in server-side. */
export function notificationsLiveQuery(userId: number) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
}

export async function sealNotificationsQuery(userId: number) {
  const realtime = getRealtimeServer()
  if (!realtime) return null
  return realtime.seal({ query: notificationsLiveQuery(userId) })
}
