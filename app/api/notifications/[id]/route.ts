import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/session"
import { deleteNotification, markNotificationRead } from "@/lib/notifications"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

async function parseId(context: Context) {
  const { id } = await context.params
  const parsed = z.coerce.number().int().positive().safeParse(id)
  return parsed.success ? parsed.data : null
}

export async function PATCH(request: NextRequest, context: Context) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = await parseId(context)
  if (id === null) return NextResponse.json({ error: "Invalid notification id" }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as { isRead?: boolean }
  if (typeof body.isRead !== "boolean") {
    return NextResponse.json({ error: "isRead boolean required" }, { status: 400 })
  }
  const row = await markNotificationRead(user.id, id, body.isRead)
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ notification: row })
}

export async function DELETE(_request: NextRequest, context: Context) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = await parseId(context)
  if (id === null) return NextResponse.json({ error: "Invalid notification id" }, { status: 400 })

  const row = await deleteNotification(user.id, id)
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ deleted: id })
}
