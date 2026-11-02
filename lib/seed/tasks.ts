// lib/seed/tasks.ts
import { db } from "@/lib/db";
import { tasks, users, playbooks } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo, daysFromNow, toDateOnly } from "./utils";

export async function seedTasks(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.discipline, "technician"), eq(tasks.priority, "critical")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Tasks already seeded, skipping");
      return { module: "tasks", status: "skipped", count: 0 };
    }

    console.log("Seeding tasks...");

    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.name, u.id]));
    const adminId = userMap.get("Admin User");
    const jamesId = userMap.get("James Otieno");

    const taskData = [
      // Critical (1)
      {
        title: "MCS Server offline",
        description:
          "MCS Server went offline affecting 8 users. Escalated to vendor. Power supply failure identified. Replacement ordered and installed. Server restored after 4-hour downtime.",
        status: "completed",
        priority: "critical",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(18)),
        tags: ["incident", "server", "critical"],
        metadata: {
          requester: "Brian Ochieng",
          affectedUsers: 8,
          downtime: "4 hours",
          rootCause: "Power supply failure",
          resolution: "Vendor replacement",
          businessImpact: "High",
        },
      },

      // High (3)
      {
        title: "Advocates Server backup failed 2 nights running",
        description:
          "Backup jobs for Advocates/Insurance Server failed on 2026-10-27 and 2026-10-28. Investigating root cause. Storage capacity check scheduled.",
        status: "in_progress",
        priority: "high",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(3)),
        tags: ["backup", "server", "investigation"],
        metadata: {
          requester: "System alert",
          server: "Advocates/Insurance",
          failedDates: ["2026-10-27", "2026-10-28"],
        },
      },
      {
        title: "Wi-Fi down on 2nd floor",
        description:
          "Access point on 2nd floor failed. Replaced with spare unit. Monitoring for stability. 15 users affected during 2-hour outage.",
        status: "completed",
        priority: "high",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(11)),
        tags: ["network", "wifi", "incident"],
        metadata: {
          requester: "Multiple users",
          affectedUsers: 15,
          downtime: "2 hours",
          resolution: "Access point replaced",
        },
      },
      {
        title: "Francis's laptop hard drive failing",
        description:
          "Francis reported slow performance and clicking sounds. Diagnosed as hard drive degradation. Data backed up immediately. Replacement drive ordered. Expected delivery in 3 days.",
        status: "in_progress",
        priority: "high",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(5)),
        tags: ["equipment", "laptop", "hardware"],
        metadata: {
          requester: "Francis Mwangi",
          device: "Dell Latitude 5520",
          issue: "Hard drive degradation",
          action: "Data backed up, replacement ordered",
        },
      },

      // Medium (6)
      {
        title: "Amina's printer jamming frequently",
        description:
          "HP LaserJet in Finance office jamming 3-4 times daily. Cleaned and serviced twice. Scheduled for replacement next week.",
        status: "todo",
        priority: "medium",
        assigneeId: jamesId,
        dueDate: toDateOnly(daysFromNow(3)),
        tags: ["equipment", "printer"],
        metadata: {
          requester: "Amina Hassan",
          device: "HP LaserJet Pro M404 - Finance",
          issue: "Frequent paper jams",
        },
      },
      {
        title: "David can't connect to VPN from home",
        description:
          "David reported VPN connection failures. Diagnosed as configuration issue. Reconfigured VPN client. Tested successfully.",
        status: "completed",
        priority: "medium",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(13)),
        tags: ["network", "vpn", "remote"],
        metadata: { requester: "David Kimani", issue: "VPN configuration", resolution: "Reconfigured client" },
      },
      {
        title: "Canon printer in Marketing showing error code",
        description:
          "Canon imageCLASS showing error code 005. Diagnosed as low toner. Replaced toner cartridge. Printer operational.",
        status: "completed",
        priority: "medium",
        assigneeId: jamesId,
        dueDate: toDateOnly(daysAgo(15)),
        tags: ["equipment", "printer"],
        metadata: {
          requester: "Grace Akinyi",
          device: "Canon imageCLASS MF269dw",
          errorCode: "005",
          resolution: "Toner replaced",
        },
      },
      {
        title: "HR needs 2 new user accounts for upcoming hires",
        description:
          "HR requested 2 new user accounts for employees starting 2026-11-10. Pending manager approval. Accounts will be created once approved.",
        status: "todo",
        priority: "medium",
        assigneeId: adminId,
        dueDate: toDateOnly(daysFromNow(8)),
        tags: ["accounts", "onboarding"],
        metadata: {
          requester: "Catherine Wanjiku",
          department: "HR",
          startDate: "2026-11-10",
          count: 2,
          status: "Pending approval",
        },
      },
      {
        title: "QuickBooks slow on month-end",
        description:
          "Amina reported QuickBooks performance degradation during month-end processing. Database optimization scheduled for next maintenance window.",
        status: "todo",
        priority: "medium",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(6)),
        tags: ["software", "performance"],
        metadata: {
          requester: "Amina Hassan",
          software: "QuickBooks",
          issue: "Slow performance during month-end",
        },
      },
      {
        title: "Backup storage at 85% capacity",
        description:
          "Cloud backup storage reached 85% capacity. Need to archive old backups and expand storage. Quote requested from vendor.",
        status: "in_progress",
        priority: "medium",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(7)),
        tags: ["backup", "storage"],
        metadata: { currentCapacity: "85%", action: "Archive old backups, expand storage" },
      },

      // Low (5)
      {
        title: "Grace wants Adobe Illustrator update",
        description:
          "Grace requested update to latest Adobe Illustrator version. Scheduled for next maintenance window to avoid disruption.",
        status: "todo",
        priority: "low",
        assigneeId: jamesId,
        dueDate: toDateOnly(daysAgo(4)),
        tags: ["software", "update"],
        metadata: { requester: "Grace Akinyi", software: "Adobe Illustrator", action: "Update scheduled" },
      },
      {
        title: "Henry needs second monitor for workstation",
        description:
          "Henry requested second monitor for improved productivity. Purchase request submitted. Awaiting budget approval.",
        status: "todo",
        priority: "low",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(9)),
        tags: ["equipment", "purchase"],
        metadata: {
          requester: "Henry Kipchoge",
          item: "Second monitor",
          status: "Purchase request submitted",
        },
      },
      {
        title: "Catherine's mouse scroll wheel sticky",
        description:
          "Catherine reported mouse scroll wheel becoming sticky. Cleaning scheduled during next preventive maintenance.",
        status: "todo",
        priority: "low",
        assigneeId: jamesId,
        dueDate: toDateOnly(daysAgo(10)),
        tags: ["equipment", "peripheral"],
        metadata: { requester: "Catherine Wanjiku", device: "Mouse", issue: "Sticky scroll wheel" },
      },
      {
        title: "James wants to install VS Code on his machine",
        description:
          "James requested VS Code installation for development work. Approved by manager. Pending installation during next available window.",
        status: "todo",
        priority: "low",
        assigneeId: adminId,
        dueDate: toDateOnly(daysAgo(2)),
        tags: ["software", "installation"],
        metadata: { requester: "James Otieno", software: "VS Code", status: "Approved, pending installation" },
      },
      {
        title: "Esther needs presentation clicker",
        description:
          "Esther requested wireless presentation clicker for client meetings. Ordered from vendor. Expected delivery in 5 business days.",
        status: "in_progress",
        priority: "low",
        assigneeId: jamesId,
        dueDate: toDateOnly(daysAgo(12)),
        tags: ["equipment", "purchase"],
        metadata: { requester: "Esther Njeri", item: "Presentation clicker", status: "Ordered, in transit" },
      },
    ];

    // Insert support tickets
    for (const task of taskData) {
      await db.insert(tasks).values({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        tags: task.tags,
        discipline: "technician",
        cadence: "one-off",
        metadata: task.metadata,
      });
    }

    // Create recurring task templates
    const recurringTemplates = [
      {
        title: "Daily: Check backup status",
        cadence: "daily",
        description:
          "Verify all backup jobs completed successfully. Check backup console for Green/Success status. Review any warnings or errors.",
      },
      {
        title: "Weekly: Preventive maintenance inspection",
        cadence: "weekly",
        description:
          "Inspect and clean equipment. Check disk space, CPU, RAM. Review OS updates. Check malware alerts.",
      },
      {
        title: "Weekly: Review support tickets",
        cadence: "weekly",
        description: "Review all open support tickets. Follow up on pending items. Update ticket status.",
      },
      {
        title: "Monthly: Test backup restoration",
        cadence: "monthly",
        description: "Select test file. Restore to test location. Verify integrity. Document results.",
      },
      {
        title: "Monthly: Review hardware inventory",
        cadence: "monthly",
        description: "Update asset register. Verify equipment locations. Check warranty status.",
      },
      {
        title: "Monthly: Review software licenses",
        cadence: "monthly",
        description: "Check license counts. Verify renewals. Update software inventory.",
      },
      {
        title: "Quarterly: Review backup procedures",
        cadence: "quarterly",
        description: "Test full restore. Review retention policy. Update documentation.",
      },
      {
        title: "Quarterly: Review IT security controls",
        cadence: "quarterly",
        description: "Review access logs. Check firewall rules. Update security policies.",
      },
    ];

    for (const template of recurringTemplates) {
      await db.insert(tasks).values({
        title: template.title,
        description: template.description,
        status: "todo",
        priority: "medium",
        assigneeId: adminId,
        discipline: "technician",
        cadence: template.cadence,
        isTemplate: true,
        tags: ["recurring", template.cadence],
      });
    }

    const totalCount = taskData.length + recurringTemplates.length;
    console.log(`Seeded ${totalCount} tasks (${taskData.length} tickets + ${recurringTemplates.length} recurring)`);
    return { module: "tasks", status: "seeded", count: totalCount };
  } catch (error) {
    console.error("Failed to seed tasks:", error);
    return {
      module: "tasks",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
