import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarEvents, users } from "@/drizzle/schema";
import { sql, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";

// Type for creating a new event
export type CreateEventInput = {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurringPattern?: any;
  attendees?: number[];
  color?: string;
};

export type CalendarEvent = {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  eventType: string;
  organizer: {
    id: number;
    name: string;
    avatar: string | null;
  };
  isAllDay: boolean;
  isRecurring: boolean;
  recurringPattern: any;
  attendees: Array<{
    id: number;
    name: string;
    avatar: string | null;
  }>;
  color: string;
  createdAt: string;
  updatedAt: string;
};

// GET handler to fetch all calendar events
export async function GET(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Calendar Events API: No valid session found");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let query = db
      .select({
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
        // Get organizer info
        organizerId: calendarEvents.organizerId,
        organizerName: users.name,
        organizerAvatar: users.avatar,
      })
      .from(calendarEvents)
      .leftJoin(users, eq(calendarEvents.organizerId, users.id))
      .orderBy(desc(calendarEvents.startTime));

    // Filter by date range if provided
    if (startDate && endDate) {
      query = query.where(
        sql`${calendarEvents.startTime} >= ${startDate} AND ${calendarEvents.endTime} <= ${endDate}`
      );
    } else {
      // Adding an empty where clause to satisfy TypeScript
      query = query.where(sql`1=1`);
    }

    const events = await query;

    // Format the events to match CalendarEvent type
    const formattedEvents = events.map(event => {
      // Parse attendees array from JSONB
      let attendeesList: Array<{ id: number; name: string; avatar: string | null }> = [];
      try {
        const attendeeIds = Array.isArray(event.attendees) ? event.attendees : [];
        // Note: For a complete solution, you would fetch attendee details in a separate query
        // This is a simplified version
        attendeesList = attendeeIds.map((id: number) => ({
          id,
          name: "Attendee",  // Simplified
          avatar: null
        }));
      } catch (e) {
        console.error("Error parsing attendees:", e);
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        eventType: event.eventType,
        organizer: {
          id: event.organizerId,
          name: event.organizerName || "Unknown",
          avatar: event.organizerAvatar
        },
        isAllDay: event.isAllDay,
        isRecurring: event.isRecurring,
        recurringPattern: event.recurringPattern,
        attendees: attendeesList,
        color: event.color,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      };
    });

    return NextResponse.json({ 
      success: true, 
      events: formattedEvents 
    });
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error fetching events",
        details: error?.stack?.toString() || ""
      },
      { status: 500 }
    );
  }
}

// POST handler to create a new calendar event
export async function POST(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Calendar Events API: No valid session found");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.startTime || !body.endTime || !body.eventType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert the event into the database
    const result = await db.insert(calendarEvents).values({
      title: body.title,
      description: body.description || null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      location: body.location || null,
      eventType: body.eventType,
      organizerId: session.id,
      isAllDay: body.isAllDay || false,
      isRecurring: body.isRecurring || false,
      recurringPattern: body.recurringPattern || {},
      attendees: body.attendees || [],
      color: body.color || "blue",
    }).returning();

    return NextResponse.json({ 
      success: true, 
      event: result[0] 
    });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error creating event",
        details: error?.stack?.toString() || ""
      },
      { status: 500 }
    );
  }
}
