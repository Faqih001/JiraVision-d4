// Notification service: every dashboard mutation API funnels user-visible
// events through createNotification(), which writes to the notifications
// table. Neon Realtime live queries then push the row to each recipient's
// open bell feed (see lib/neon-realtime.ts).

import { db } from "@/lib/db"
import { notifications } from "@/drizzle/schema"
import { and, desc, eq, gt, sql } from "drizzle-orm"

export const NOTIFICATION_TYPES = [
  "info",
  "task",
  "sprint",
  "mention",
  "wellbeing",
  "gamification",
  "ai",
  "system",
  "cms",
  "report",
  "career",
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NotificationInput {
  userId: number
  type: NotificationType
  title: string
  body?: string
  /** in-app route the notification links to */
  link?: string
  metadata?: Record<string, unknown>
}

export async function createNotification(input: NotificationInput) {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      metadata: { ...(input.metadata ?? {}), ...(input.link ? { link: input.link } : {}) },
    })
    .returning()
  return row
}

export async function notifyMany(userIds: number[], input: Omit<NotificationInput, "userId">) {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return []
  const rows = await db
    .insert(notifications)
    .values(
      uniqueIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        metadata: { ...(input.metadata ?? {}), ...(input.link ? { link: input.link } : {}) },
      })),
    )
    .returning()
  return rows
}

export interface ListOptions {
  limit?: number
  unreadOnly?: boolean
  /** ISO timestamp — return only rows created after it (polling cursor) */
  since?: string
}

export async function listNotifications(userId: number, options: ListOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
  const conditions = [eq(notifications.userId, userId)]
  if (options.unreadOnly) conditions.push(eq(notifications.isRead, false))
  if (options.since) {
    const sinceDate = new Date(options.since)
    if (!Number.isNaN(sinceDate.getTime())) conditions.push(gt(notifications.createdAt, sinceDate))
  }
  const where = and(...conditions)

  const [items, unreadRow] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
  ])

  return { items, unreadCount: unreadRow[0]?.count ?? 0 }
}

export async function markNotificationRead(userId: number, id: number, isRead: boolean) {
  const [row] = await db
    .update(notifications)
    .set({ isRead })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()
  return row ?? null
}

export async function deleteNotification(userId: number, id: number) {
  const [row] = await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()
  return row ?? null
}

export async function markAllNotificationsRead(userId: number) {
  const rows = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id })
  return rows.length
}
