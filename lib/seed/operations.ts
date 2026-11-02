// lib/seed/operations.ts
import { db } from "@/lib/db";
import { opsLogEntries, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo } from "./utils";

export async function seedOperations(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(opsLogEntries)
      .where(eq(opsLogEntries.packKey, "it-technician"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Operations already seeded, skipping");
      return { module: "operations", status: "skipped", count: 0 };
    }

    console.log("Seeding operations...");

    const allUsers = await db.select().from(users);
    const adminId = allUsers.find((u) => u.email === "fakiiahmad001@gmail.com")?.id;

    const opsData = [
      // 10 backup operations (last 10 nights)
      ...Array.from({ length: 10 }, (_, i) => ({
        entityKey: "backup",
        occurredAt: daysAgo(i + 1),
        status: i === 2 || i === 5 ? "warning" : "success",
        fields: {
          server: ["AAC Kenya", "MCS", "Advocates"][i % 3],
          type: i % 7 === 0 ? "full" : "incremental",
          size: `${Math.floor(Math.random() * 500) + 100}GB`,
          duration: `${Math.floor(Math.random() * 120) + 30} minutes`,
          warnings: i === 2 ? "Storage at 85% capacity" : i === 5 ? "Slow network transfer" : null,
        },
      })),

      // 5 maintenance operations
      {
        entityKey: "maintenance",
        occurredAt: daysAgo(7),
        status: "completed",
        fields: { type: "weekly_inspection", items: 25, issues: 0 },
      },
      {
        entityKey: "maintenance",
        occurredAt: daysAgo(14),
        status: "completed",
        fields: { type: "weekly_inspection", items: 25, issues: 1, issueDetails: "Printer toner low" },
      },
      {
        entityKey: "maintenance",
        occurredAt: daysAgo(21),
        status: "completed",
        fields: { type: "weekly_inspection", items: 25, issues: 0 },
      },
      {
        entityKey: "maintenance",
        occurredAt: daysAgo(28),
        status: "completed",
        fields: {
          type: "weekly_inspection",
          items: 25,
          issues: 2,
          issueDetails: "UPS battery warning, disk space low",
        },
      },
      {
        entityKey: "maintenance",
        occurredAt: daysAgo(10),
        status: "completed",
        fields: { type: "quarterly_hardware_inspection", items: 25, duration: "6 hours" },
      },

      // 3 incident responses
      {
        entityKey: "incident",
        occurredAt: daysAgo(18),
        status: "resolved",
        fields: {
          type: "server_outage",
          server: "MCS Server",
          duration: "4 hours",
          affectedUsers: 8,
          rootCause: "Power supply failure",
          resolution: "Vendor replacement",
          businessImpact: "High",
        },
      },
      {
        entityKey: "incident",
        occurredAt: daysAgo(11),
        status: "resolved",
        fields: {
          type: "network_failure",
          component: "Wi-Fi access point",
          location: "2nd floor",
          duration: "2 hours",
          affectedUsers: 15,
          rootCause: "Hardware fault",
          resolution: "Access point replaced",
          businessImpact: "Medium",
        },
      },
      {
        entityKey: "incident",
        occurredAt: daysAgo(5),
        status: "resolved",
        fields: {
          type: "hardware_failure",
          device: "Laptop hard drive",
          user: "Francis Mwangi",
          duration: "1 hour",
          affectedUsers: 1,
          rootCause: "Drive degradation",
          resolution: "Data backed up, replacement ordered",
          businessImpact: "Low",
        },
      },

      // 2 security operations
      {
        entityKey: "security",
        occurredAt: daysAgo(4),
        status: "completed",
        fields: { type: "antivirus_update", machines: 17, threats: 0 },
      },
      {
        entityKey: "security",
        occurredAt: daysAgo(25),
        status: "completed",
        fields: {
          type: "firewall_rule_change",
          rules: 3,
          description: "Blocked foreign IP range after brute force attempt",
        },
      },
    ];

    for (const op of opsData) {
      await db.insert(opsLogEntries).values({
        packKey: "it-technician",
        entityKey: op.entityKey,
        ownerId: adminId!,
        occurredAt: op.occurredAt,
        status: op.status,
        fields: op.fields,
        source: op.entityKey === "backup" && op.occurredAt < daysAgo(2) ? "automated" : "manual",
      });
    }

    const totalCount = opsData.length;
    console.log(`Seeded ${totalCount} operations log entries`);
    return { module: "operations", status: "seeded", count: totalCount };
  } catch (error) {
    console.error("Failed to seed operations:", error);
    return {
      module: "operations",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
