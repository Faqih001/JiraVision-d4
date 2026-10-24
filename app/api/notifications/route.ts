import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/session"
import {
  NOTIFICATION_TYPES,
  createNotification,
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/notifications"

export const dynamic = "force-dynamic"

async function requireUser() {
  const user = await getCurrentUser()
  return user ? user : null
}

export async function GET(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = request.nextUrl.searchParams
  const limitRaw = params.get("limit")
  const since = params.get("since") ?? undefined
  if (since && Number.isNaN(Date.parse(since))) {
    return NextResponse.json({ error: "since must be an ISO timestamp" }, { status: 400 })
  }

  const { items, unreadCount } = await listNotifications(user.id, {
    limit: limitRaw ? Number(limitRaw) : undefined,
    unreadOnly: params.get("unreadOnly") === "true",
    since,
  })
  return NextResponse.json({ items, unreadCount })
}

const createSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  link: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification payload", issues: parsed.error.issues }, { status: 400 })
  }
  const row = await createNotification({ userId: user.id, ...parsed.data })
  return NextResponse.json({ notification: row }, { status: 201 })
}

// PATCH /api/notifications with { all: true } marks every unread row read.
export async function PATCH(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { all?: boolean }
  if (body.all !== true) {
    return NextResponse.json({ error: "Supported patch: { all: true }" }, { status: 400 })
  }
  const updated = await markAllNotificationsRead(user.id)
  return NextResponse.json({ updated })
}
