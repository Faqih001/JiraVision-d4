// lib/seed/calendar.ts
import { db } from "@/lib/db";
import { calendarEvents, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo, daysFromNow } from "./utils";

export async function seedCalendar(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.eventType, "maintenance"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Calendar events already seeded, skipping");
      return { module: "calendar", status: "skipped", count: 0 };
    }

    console.log("Seeding calendar events...");

    const allUsers = await db.select().from(users);
    const adminId = allUsers.find((u) => u.email === "admin@jiravision.com")?.id;
    const jamesId = allUsers.find((u) => u.name === "James Otieno")?.id;

    const eventData = [
      // Upcoming events (5)
      {
        title: "Monthly backup test restoration",
        description: "Select test file from AAC Kenya Server backup. Restore to test location. Verify integrity.",
        startTime: daysFromNow(3),
        endTime: new Date(daysFromNow(3).getTime() + 2 * 60 * 60 * 1000),
        eventType: "maintenance",
        organizerId: adminId!,
        attendees: [adminId, jamesId],
        location: "Server Room",
        color: "blue",
        isRecurring: false,
      },
      {
        title: "Quarterly hardware inspection",
        description: "Inspect all 25 equipment items. Check physical condition. Verify serial numbers.",
        startTime: daysFromNow(7),
        endTime: new Date(daysFromNow(7).getTime() + 6 * 60 * 60 * 1000),
        eventType: "maintenance",
        organizerId: adminId!,
        attendees: [adminId],
        location: "All floors",
        color: "green",
        isRecurring: false,
      },
      {
        title: "Adobe Creative Cloud license renewal",
        description: "Review and renew 3 Adobe Creative Cloud licenses expiring in 30 days.",
        startTime: daysFromNow(10),
        endTime: new Date(daysFromNow(10).getTime() + 1 * 60 * 60 * 1000),
        eventType: "reminder",
        organizerId: adminId!,
        attendees: [adminId],
        location: "IT Office",
        color: "orange",
        isRecurring: false,
      },
      {
        title: "Weekly preventive maintenance",
        description: "Inspect and clean equipment. Check disk space, CPU, RAM. Review OS updates.",
        startTime: daysFromNow(14),
        endTime: new Date(daysFromNow(14).getTime() + 3 * 60 * 60 * 1000),
        eventType: "maintenance",
        organizerId: adminId!,
        attendees: [adminId, jamesId],
        location: "All locations",
        color: "blue",
        isRecurring: true,
        recurringPattern: { frequency: "weekly", interval: 1 },
      },
      {
        title: "IT budget review meeting",
        description: "Review Q4 IT budget. Discuss equipment replacements and software renewals.",
        startTime: daysFromNow(21),
        endTime: new Date(daysFromNow(21).getTime() + 2 * 60 * 60 * 1000),
        eventType: "meeting",
        organizerId: adminId!,
        attendees: [adminId, jamesId],
        location: "Conference Room",
        color: "purple",
        isRecurring: false,
      },

      // Past events (3)
      {
        title: "Monthly backup procedure review",
        description: "Reviewed backup logs for October. All backups successful except 2 warnings.",
        startTime: daysAgo(5),
        endTime: new Date(daysAgo(5).getTime() + 1 * 60 * 60 * 1000),
        eventType: "meeting",
        organizerId: adminId!,
        attendees: [adminId],
        location: "IT Office",
        color: "gray",
        isRecurring: false,
      },
      {
        title: "Network switch firmware update",
        description: "Updated Cisco Catalyst 2960 to latest firmware during maintenance window.",
        startTime: daysAgo(20),
        endTime: new Date(daysAgo(20).getTime() + 2 * 60 * 60 * 1000),
        eventType: "maintenance",
        organizerId: adminId!,
        attendees: [adminId],
        location: "Server Room",
        color: "green",
        isRecurring: false,
      },
      {
        title: "Vendor call: UPS battery replacement",
        description: "Coordinated with APC vendor for UPS battery replacement under warranty.",
        startTime: daysAgo(15),
        endTime: new Date(daysAgo(15).getTime() + 1 * 60 * 60 * 1000),
        eventType: "meeting",
        organizerId: adminId!,
        attendees: [adminId],
        location: "Phone call",
        color: "blue",
        isRecurring: false,
      },

      // Recurring events (3 with multiple instances)
      {
        title: "Daily: Check backup status",
        description: "Verify all backup jobs completed successfully. Check backup console for Green/Success status.",
        startTime: daysAgo(1),
        endTime: new Date(daysAgo(1).getTime() + 30 * 60 * 1000),
        eventType: "reminder",
        organizerId: adminId!,
        attendees: [adminId],
        location: "IT Office",
        color: "yellow",
        isRecurring: true,
        recurringPattern: { frequency: "daily", interval: 1 },
      },
      {
        title: "Weekly: Review support tickets",
        description: "Review all open support tickets. Follow up on pending items. Update ticket status.",
        startTime: daysAgo(7),
        endTime: new Date(daysAgo(7).getTime() + 1 * 60 * 60 * 1000),
        eventType: "meeting",
        organizerId: adminId!,
        attendees: [adminId, jamesId],
        location: "IT Office",
        color: "blue",
        isRecurring: true,
        recurringPattern: { frequency: "weekly", interval: 1 },
      },
      {
        title: "Monthly: Review hardware inventory",
        description: "Update asset register. Verify equipment locations. Check warranty status.",
        startTime: daysAgo(30),
        endTime: new Date(daysAgo(30).getTime() + 2 * 60 * 60 * 1000),
        eventType: "maintenance",
        organizerId: adminId!,
        attendees: [adminId],
        location: "All locations",
        color: "green",
        isRecurring: true,
        recurringPattern: { frequency: "monthly", interval: 1 },
      },
    ];

    for (const event of eventData) {
      await db.insert(calendarEvents).values({
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        eventType: event.eventType,
        organizerId: event.organizerId,
        attendees: event.attendees,
        location: event.location,
        color: event.color,
        isRecurring: event.isRecurring,
        recurringPattern: event.recurringPattern || {},
        isAllDay: false,
      });
    }

    console.log(`Seeded ${eventData.length} calendar events`);
    return { module: "calendar", status: "seeded", count: eventData.length };
  } catch (error) {
    console.error("Failed to seed calendar:", error);
    return {
      module: "calendar",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
