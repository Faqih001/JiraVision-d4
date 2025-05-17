import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Calendar Event API: No valid session found");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.id);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: "Invalid event ID" },
        { status: 400 }
      );
    }

    // Fetch the event
    const event = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event || event.length === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      event: event[0] 
    });
  } catch (error: any) {
    console.error("Error fetching calendar event:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error fetching event",
        details: error?.stack?.toString() || ""
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Calendar Event API: No valid session found");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.id);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: "Invalid event ID" },
        { status: 400 }
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

    // Check if the event exists
    const existingEvent = await db
      .select({ id: calendarEvents.id, organizerId: calendarEvents.organizerId })
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!existingEvent || existingEvent.length === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if the user is the organizer or has proper permissions
    if (existingEvent[0].organizerId !== session.id && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Not authorized to update this event" },
        { status: 403 }
      );
    }

    // Update the event
    const result = await db
      .update(calendarEvents)
      .set({
        title: body.title,
        description: body.description || null,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        location: body.location || null,
        eventType: body.eventType,
        isAllDay: body.isAllDay || false,
        isRecurring: body.isRecurring || false,
        recurringPattern: body.recurringPattern || {},
        attendees: body.attendees || [],
        color: body.color || "blue",
        updatedAt: new Date()
      })
      .where(eq(calendarEvents.id, eventId))
      .returning();

    return NextResponse.json({ 
      success: true, 
      event: result[0] 
    });
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error updating event",
        details: error?.stack?.toString() || ""
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Calendar Event API: No valid session found");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.id);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: "Invalid event ID" },
        { status: 400 }
      );
    }

    // Check if the event exists
    const existingEvent = await db
      .select({ id: calendarEvents.id, organizerId: calendarEvents.organizerId })
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!existingEvent || existingEvent.length === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if the user is the organizer or has proper permissions
    if (existingEvent[0].organizerId !== session.id && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this event" },
        { status: 403 }
      );
    }

    // Delete the event
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, eventId));

    return NextResponse.json({ 
      success: true, 
      message: "Event deleted successfully" 
    });
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error deleting event",
        details: error?.stack?.toString() || ""
      },
      { status: 500 }
    );
  }
}
