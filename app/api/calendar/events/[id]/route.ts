import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { calendarEvents, users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"
import type { CreateEventInput } from "../route"

export const dynamic = "force-dynamic"

type UserLite = { id: number; name: string | null; avatar: string | null }

function toIso(value: Date | string | null): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function attendeeIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is number => typeof x === "number")
}

async function loadUsersLite(): Promise<UserLite[]> {
  return db
    .select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users)
}

const selectShape = {
  id: calendarEvents.id,
  title: calendarEvents.title,
  description: calendarEvents.description,
  startTime: calendarEvents.startTime,
  endTime: calendarEvents.endTime,
  location: calendarEvents.location,
  eventType: calendarEvents.eventType,
  isAllDay: calendarEvents.isAllDay,
  isRecurring: calendarEvents.isRecurring,
  recurringPattern: calendarEvents.recurringPattern,
  attendees: calendarEvents.attendees,
  color: calendarEvents.color,
  createdAt: calendarEvents.createdAt,
  updatedAt: calendarEvents.updatedAt,
  organizerId: calendarEvents.organizerId,
  organizerName: users.name,
  organizerAvatar: users.avatar,
}

function formatEvent(row: Record<string, any>, allUsers: UserLite[]) {
  const ids: number[] = attendeeIds(row.attendees)
  return {
    id: row.id as number,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    startTime: toIso(row.startTime),
    endTime: toIso(row.endTime),
    location: (row.location as string | null) ?? null,
    eventType: row.eventType as string,
    organizer: {
      id: (row.organizerId as number | null) ?? 0,
      name: (row.organizerName as string | null) ?? "Unknown",
      avatar: (row.organizerAvatar as string | null) ?? null,
    },
    isAllDay: Boolean(row.isAllDay),
    isRecurring: Boolean(row.isRecurring),
    recurringPattern:
      row.recurringPattern && typeof row.recurringPattern === "object" && !Array.isArray(row.recurringPattern)
        ? (row.recurringPattern as Record<string, unknown>)
        : {},
    attendees: ids.map((id) => {
      const user = allUsers.find((u) => u.id === id)
      return { id, name: user?.name ?? `Attendee ${id}`, avatar: user?.avatar ?? null }
    }),
    color: (row.color as string | null) ?? "blue",
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

// GET /api/calendar/events/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session || session.id == null) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const eventId = parseInt(id, 10)
    if (isNaN(eventId)) {
      return NextResponse.json({ success: false, error: "Invalid event ID" }, { status: 400 })
    }

    const [allUsers, rows] = await Promise.all([
      loadUsersLite(),
      db
        .select(selectShape)
        .from(calendarEvents)
        .leftJoin(users, eq(calendarEvents.organizerId, users.id))
        .where(eq(calendarEvents.id, eventId))
        .limit(1),
    ])

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, event: formatEvent(rows[0], allUsers) })
  } catch (error) {
    console.error("Error fetching calendar event:", error)
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Unknown error fetching event" },
      { status: 500 },
    )
  }
}

// Shared full/partial update logic for PUT and PATCH.
async function updateEvent(request: Request, rawId: string, mode: "full" | "partial") {
  try {
    const session = await getSession()
    if (!session || session.id == null) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const eventId = parseInt(rawId, 10)
    if (isNaN(eventId)) {
      return NextResponse.json({ success: false, error: "Invalid event ID" }, { status: 400 })
    }

    const body = (await request.json().catch(() => null)) as Partial<CreateEventInput> | null
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
    }

    if (mode === "full" && (!body.title || !body.startTime || !body.endTime || !body.eventType)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    if (mode === "partial" && Object.keys(body).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    const existing = await db
      .select({ id: calendarEvents.id, organizerId: calendarEvents.organizerId, attendees: calendarEvents.attendees })
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }
    if (existing[0].organizerId !== session.id && session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Not authorized to update this event" }, { status: 403 })
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (mode === "full") {
      patch.title = body.title
      patch.description = body.description || null
      patch.startTime = new Date(body.startTime!)
      patch.endTime = new Date(body.endTime!)
      patch.location = body.location || null
      patch.eventType = body.eventType
      patch.isAllDay = !!body.isAllDay
      patch.isRecurring = !!body.isRecurring
      patch.recurringPattern = body.recurringPattern || {}
      patch.attendees = Array.isArray(body.attendees) ? body.attendees.filter((x): x is number => typeof x === "number") : []
      patch.color = body.color || "blue"
    } else {
      if (body.title !== undefined) patch.title = body.title
      if (body.description !== undefined) patch.description = body.description || null
      if (body.startTime !== undefined) patch.startTime = new Date(body.startTime)
      if (body.endTime !== undefined) patch.endTime = new Date(body.endTime)
      if (body.location !== undefined) patch.location = body.location || null
      if (body.eventType !== undefined) patch.eventType = body.eventType
      if (body.isAllDay !== undefined) patch.isAllDay = !!body.isAllDay
      if (body.isRecurring !== undefined) patch.isRecurring = !!body.isRecurring
      if (body.recurringPattern !== undefined) patch.recurringPattern = body.recurringPattern || {}
      if (body.attendees !== undefined) patch.attendees = Array.isArray(body.attendees) ? body.attendees.filter((x): x is number => typeof x === "number") : []
      if (body.color !== undefined) patch.color = body.color || "blue"
    }

    if (patch.startTime !== undefined && Number.isNaN((patch.startTime as Date).getTime())) {
      return NextResponse.json({ success: false, error: "Invalid start time format" }, { status: 400 })
    }
    if (patch.endTime !== undefined && Number.isNaN((patch.endTime as Date).getTime())) {
      return NextResponse.json({ success: false, error: "Invalid end time format" }, { status: 400 })
    }

    const [updated] = await db
      .update(calendarEvents)
      .set(patch)
      .where(eq(calendarEvents.id, eventId))
      .returning()

    // Notify attendees (other than the actor) that the event changed.
    const nextIds = body.attendees !== undefined ? attendeeIds(patch.attendees) : attendeeIds(existing[0].attendees)
    const notifyIds = nextIds.filter((uid) => uid !== session.id)
    let notified: number[] = []
    try {
      await Promise.all(
        notifyIds.map((userId) =>
          createNotification({
            userId,
            type: "info",
            title: `Event updated: ${updated.title}`,
            body: `${new Date(updated.startTime).toLocaleString()} – ${new Date(updated.endTime).toLocaleString()}`,
            link: "/dashboard/calendar",
            metadata: { eventId: updated.id, action: "updated" },
          }),
        ),
      )
      notified = notifyIds
    } catch (err) {
      console.error("Calendar PATCH: notification failed:", err)
    }

    return NextResponse.json({ success: true, event: updated, notified })
  } catch (error) {
    console.error("Error updating calendar event:", error)
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Unknown error updating event" },
      { status: 500 },
    )
  }
}

// PUT /api/calendar/events/[id] — full update
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return updateEvent(request, id, "full")
}

// PATCH /api/calendar/events/[id] — partial update
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return updateEvent(request, id, "partial")
}

// DELETE /api/calendar/events/[id] — remove the event and notify its attendees.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session || session.id == null) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const eventId = parseInt(id, 10)
    if (isNaN(eventId)) {
      return NextResponse.json({ success: false, error: "Invalid event ID" }, { status: 400 })
    }

    const existing = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        startTime: calendarEvents.startTime,
        organizerId: calendarEvents.organizerId,
        attendees: calendarEvents.attendees,
      })
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }
    if (existing[0].organizerId !== session.id && session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Not authorized to delete this event" }, { status: 403 })
    }

    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId))

    const notifyIds = attendeeIds(existing[0].attendees).filter((uid) => uid !== session.id)
    let notified: number[] = []
    try {
      await Promise.all(
        notifyIds.map((userId) =>
          createNotification({
            userId,
            type: "info",
            title: `Event cancelled: ${existing[0].title}`,
            body: `Scheduled for ${new Date(existing[0].startTime).toLocaleString()} has been removed.`,
            link: "/dashboard/calendar",
            metadata: { eventId, action: "deleted" },
          }),
        ),
      )
      notified = notifyIds
    } catch (err) {
      console.error("Calendar DELETE: notification failed:", err)
    }

    return NextResponse.json({ success: true, message: "Event deleted successfully", notified })
  } catch (error) {
    console.error("Error deleting calendar event:", error)
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Unknown error deleting event" },
      { status: 500 },
    )
  }
}
