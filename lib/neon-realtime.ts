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

/**
 * Only this user's notifications, newest first — parameters are baked in
 * server-side. Selected keys must match the PostgreSQL column names
 * (snake_case), which is what the Realtime drizzle adapter validates.
 */
export interface NotificationLiveRow {
  id: number
  type: string
  title: string
  body: string | null
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string | Date
}

export function notificationsLiveQuery(userId: number) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      is_read: notifications.isRead,
      metadata: notifications.metadata,
      created_at: notifications.createdAt,
    })
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
