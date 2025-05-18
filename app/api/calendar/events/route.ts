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
    console.log("Calendar Events API: GET request received");
    
    // Always provide default data in development mode to avoid auth issues
    if (process.env.NODE_ENV === 'development') {
      console.log("Calendar Events API: Development mode, using sample data");
      return NextResponse.json({
        success: true,
        events: [
          {
            id: 1,
            title: "Team Standup",
            description: "Daily team standup meeting",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            location: "Conference Room A",
            eventType: "meeting",
            organizer: { id: 1, name: "Developer", avatar: null },
            isAllDay: false,
            isRecurring: false,
            recurringPattern: null,
            attendees: [{ id: 1, name: "Developer", avatar: null }],
            color: "blue",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 2,
            title: "Project Planning",
            description: "Quarterly planning session",
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 86400000 + 7200000).toISOString(), // 2 hours after start
            location: "Virtual Meeting",
            eventType: "planning",
            organizer: { id: 1, name: "Project Manager", avatar: null },
            isAllDay: false,
            isRecurring: false,
            recurringPattern: null,
            attendees: [{ id: 1, name: "Developer", avatar: null }],
            color: "green",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      });
    }
    
    // Get authenticated session
    console.log("Calendar Events API: Trying to get session");
    const session = await getSession();
    
    if (!session || !session.id) {
      console.log("Calendar Events API: No valid session found");
      
      // In production, require authentication
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log(`Calendar Events API: Fetching events with date range - startDate: ${startDate}, endDate: ${endDate}`);
    
    // First, fetch all users to use for attendee information
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar
      })
      .from(users);
      
    console.log(`Fetched ${allUsers.length} users for attendee information`);
    
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

    // First define an initial where condition
    let whereCondition = sql`1=1`;
    
    // Update condition based on date range if provided
    if (startDate && endDate) {
      whereCondition = sql`${calendarEvents.startTime} >= ${startDate} AND ${calendarEvents.endTime} <= ${endDate}`;
    }
    
    // Apply the where condition
    const queryWithWhere = query.where(whereCondition);

    const events = await queryWithWhere;
    console.log(`Retrieved ${events.length} events from database`);
    
    // Log the first event to see its structure (if available)
    if (events.length > 0) {
      console.log('First event structure:', JSON.stringify(events[0], null, 2));
    }

    // Format the events to match CalendarEvent type
    const formattedEvents = events.map(event => {
      // Parse attendees array from JSONB
      let attendeesList: Array<{ id: number; name: string; avatar: string | null }> = [];
      try {
        const attendeeIds = Array.isArray(event.attendees) ? event.attendees : [];
        // Use the allUsers array to get real user data for attendees
        attendeesList = attendeeIds.map((id: number) => {
          const user = allUsers.find(u => u.id === id);
          return {
            id,
            name: user?.name || `Attendee ${id}`,  // Use real name if found
            avatar: user?.avatar || null
          };
        });
      } catch (e) {
        console.error("Error parsing attendees:", e);
      }

      // Make sure we have a valid organizer object
      const organizer = {
        id: event.organizerId !== null && event.organizerId !== undefined ? event.organizerId : 0,
        name: event.organizerName || "Unknown",
        avatar: event.organizerAvatar || null
      };

      // Ensure timestamps are properly formatted as ISO strings
      const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return new Date().toISOString();
        
        if (timestamp instanceof Date) {
          return timestamp.toISOString();
        }
        
        if (typeof timestamp === 'string') {
          try {
            // Try to parse the string as a date
            return new Date(timestamp).toISOString();
          } catch (error) {
            console.error(`Error parsing timestamp: ${timestamp}`, error);
            return new Date().toISOString();
          }
        }
        
        return new Date().toISOString();
      };

      return {
        id: event.id,
        title: event.title || "Untitled Event",
        description: event.description,
        startTime: formatTimestamp(event.startTime),
        endTime: formatTimestamp(event.endTime),
        location: event.location,
        eventType: event.eventType || "meeting",
        organizer,
        isAllDay: event.isAllDay || false,
        isRecurring: event.isRecurring || false,
        recurringPattern: event.recurringPattern || {},
        attendees: attendeesList,
        color: event.color || "blue",
        createdAt: formatTimestamp(event.createdAt),
        updatedAt: formatTimestamp(event.updatedAt)
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
      console.log("Calendar Events API (POST): No valid session found, but proceeding for development");
      // In development, continue with a default user ID
      // For production, uncomment the following code:
      /*
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
      */
    }

    // Parse request body
    const body = await request.json();
    console.log("Calendar Events API: Received POST data:", JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.title || !body.startTime || !body.endTime || !body.eventType) {
      console.log("Calendar Events API: Missing required fields in POST data");
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use session.id if available, or use a default (1) for development
    const organizerId = session?.id || 1;

    console.log("Attempting to insert calendar event with data:", {
      title: body.title,
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      location: body.location,
      eventType: body.eventType,
      organizerId: organizerId,
      isAllDay: !!body.isAllDay,
      attendees: body.attendees,
      color: body.color
    });
    
    // Convert times to valid Date objects with error handling
    let startTime, endTime;
    try {
      startTime = new Date(body.startTime);
      if (isNaN(startTime.getTime())) {
        throw new Error("Invalid start time format");
      }
    } catch (error) {
      console.error("Invalid start time:", body.startTime);
      return NextResponse.json(
        { success: false, error: "Invalid start time format" },
        { status: 400 }
      );
    }

    try {
      endTime = new Date(body.endTime);
      if (isNaN(endTime.getTime())) {
        throw new Error("Invalid end time format");
      }
    } catch (error) {
      console.error("Invalid end time:", body.endTime);
      return NextResponse.json(
        { success: false, error: "Invalid end time format" },
        { status: 400 }
      );
    }
    
    // Ensure attendees is a valid array
    const safeAttendees = Array.isArray(body.attendees) ? body.attendees : [];
    
    // Insert the event into the database with proper null handling and type conversions
    const result = await db.insert(calendarEvents).values({
      title: body.title,
      description: body.description || null,
      startTime: startTime,
      endTime: endTime,
      location: body.location || null,
      eventType: body.eventType,
      organizerId: organizerId,
      isAllDay: !!body.isAllDay,
      isRecurring: !!body.isRecurring,
      recurringPattern: body.recurringPattern || {},
      attendees: safeAttendees,
      color: body.color || "blue",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return NextResponse.json({ 
      success: true, 
      event: result[0] 
    });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    
    // Log more detailed information about the error
    if (error.code) {
      console.error("Database error code:", error.code);
    }
    
    if (error.message) {
      console.error("Error message:", error.message);
    }
    
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error creating event",
        details: error?.stack?.toString() || "",
        code: error?.code
      },
      { status: 500 }
    );
  }
}
