import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { calendarEvents, users } from "@/drizzle/schema"
import { and, desc, eq, or, gte, lte, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

// Type for creating a new event
export type CreateEventInput = {
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  eventType: string
  isAllDay?: boolean
  isRecurring?: boolean
  recurringPattern?: Record<string, unknown>
  attendees?: number[]
  color?: string
}

export type CalendarEvent = {
  id: number
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
  eventType: string
  organizer: {
    id: number
    name: string
    avatar: string | null
  }
  isAllDay: boolean
  isRecurring: boolean
  recurringPattern: Record<string, unknown>
  attendees: Array<{
    id: number
    name: string
    avatar: string | null
  }>
  color: string
  createdAt: string
  updatedAt: string
}

type EventRow = {
  id: number
  title: string
  description: string | null
  startTime: Date | string | null
  endTime: Date | string | null
  location: string | null
  eventType: string
  isAllDay: boolean | null
  isRecurring: boolean | null
  recurringPattern: unknown
  attendees: unknown
  color: string | null
  createdAt: Date | string | null
  updatedAt: Date | string | null
  organizerId: number | null
  organizerName: string | null
  organizerAvatar: string | null
}

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

function resolveAttendees(ids: number[], allUsers: UserLite[]): CalendarEvent["attendees"] {
  return ids.map((id) => {
    const user = allUsers.find((u) => u.id === id)
    return {
      id,
      name: user?.name ?? `Attendee ${id}`,
      avatar: user?.avatar ?? null,
    }
  })
}

function formatEvent(row: EventRow, allUsers: UserLite[]): CalendarEvent {
  return {
    id: row.id,
    title: row.title ?? "Untitled Event",
    description: row.description,
    startTime: toIso(row.startTime),
    endTime: toIso(row.endTime),
    location: row.location,
    eventType: row.eventType ?? "meeting",
    organizer: {
      id: row.organizerId ?? 0,
      name: row.organizerName ?? "Unknown",
      avatar: row.organizerAvatar ?? null,
    },
    isAllDay: Boolean(row.isAllDay),
    isRecurring: Boolean(row.isRecurring),
    recurringPattern:
      row.recurringPattern && typeof row.recurringPattern === "object" && !Array.isArray(row.recurringPattern)
        ? (row.recurringPattern as Record<string, unknown>)
        : {},
    attendees: resolveAttendees(attendeeIds(row.attendees), allUsers),
    color: row.color ?? "blue",
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
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

// GET /api/calendar/events — real rows only; optional ?startDate&endDate ISO
// window filter and `?scope=mine`, the events the caller organises or is invited
// to. The page defaults to that scope, so a member who is in nothing sees an
// empty month instead of the workspace's schedule.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.id == null) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const mineOnly = searchParams.get("scope") === "mine"

    const conditions = []
    if (startDate && !Number.isNaN(Date.parse(startDate))) {
      conditions.push(gte(calendarEvents.startTime, new Date(startDate)))
    }
    if (endDate && !Number.isNaN(Date.parse(endDate))) {
      conditions.push(lte(calendarEvents.endTime, new Date(endDate)))
    }
    if (mineOnly) {
      conditions.push(
        or(
          eq(calendarEvents.organizerId, session.id),
          sql`${calendarEvents.attendees} @> ${JSON.stringify([session.id])}::jsonb`,
        )!,
      )
    }

    const [allUsers, rows] = await Promise.all([
      loadUsersLite(),
      db
        .select(selectShape)
        .from(calendarEvents)
        .leftJoin(users, eq(calendarEvents.organizerId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : sql`true`)
        .orderBy(desc(calendarEvents.startTime)),
    ])

    return NextResponse.json({
      success: true,
      events: rows.map((row) => formatEvent(row, allUsers)),
    })
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Unknown error fetching events" },
      { status: 500 },
    )
  }
}

// POST /api/calendar/events — create an event and notify attendees (excluding the actor).
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.id == null) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as Partial<CreateEventInput> | null
    if (!body || !body.title || !body.startTime || !body.endTime || !body.eventType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const startTime = new Date(body.startTime)
    if (Number.isNaN(startTime.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid start time format" }, { status: 400 })
    }
    const endTime = new Date(body.endTime)
    if (Number.isNaN(endTime.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid end time format" }, { status: 400 })
    }

    const safeAttendees = Array.isArray(body.attendees)
      ? body.attendees.filter((id): id is number => typeof id === "number")
      : []

    const [event] = await db
      .insert(calendarEvents)
      .values({
        title: body.title,
        description: body.description || null,
        startTime,
        endTime,
        location: body.location || null,
        eventType: body.eventType,
        organizerId: session.id,
        isAllDay: !!body.isAllDay,
        isRecurring: !!body.isRecurring,
        recurringPattern: body.recurringPattern || {},
        attendees: safeAttendees,
        color: body.color || "blue",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Notify every attendee other than the actor; never fail the request over notifications.
    const notifyIds = safeAttendees.filter((id) => id !== session.id)
    let notified: number[] = []
    try {
      await Promise.all(
        notifyIds.map((userId) =>
          createNotification({
            userId,
            type: "info",
            title: `New event: ${event.title}`,
            body: `${startTime.toLocaleString()} – ${endTime.toLocaleString()}${event.location ? ` · ${event.location}` : ""}`,
            link: "/dashboard/calendar",
            metadata: { eventId: event.id, action: "created" },
          }),
        ),
      )
      notified = notifyIds
    } catch (err) {
      console.error("Calendar POST: notification failed:", err)
    }

    return NextResponse.json({ success: true, event, notified }, { status: 201 })
  } catch (error) {
    console.error("Error creating calendar event:", error)
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Unknown error creating event" },
      { status: 500 },
    )
  }
}
