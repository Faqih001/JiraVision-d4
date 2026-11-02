// lib/seed/infrastructure.ts
import { db } from "../db";
import { registerItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { generateSerial, daysAgo, toDateOnly } from "./utils";

const INFRASTRUCTURE_ITEMS = [
  {
    title: "AAC Kenya Server",
    kind: "infrastructure",
    fields: {
      location: "IT Room",
      type: "File server",
      storage: "2TB",
      lastBackup: toDateOnly(daysAgo(1)),
      status: "operational",
      serial: generateSerial("SRV", 2023, 1),
    },
    status: "in_service",
  },
  {
    title: "MCS Server",
    kind: "infrastructure",
    fields: {
      location: "MCS office",
      type: "Application server",
      storage: "1TB",
      lastBackup: toDateOnly(daysAgo(3)),
      status: "operational",
      serial: generateSerial("SRV", 2023, 2),
      notes: "Had outage on 2026-10-15, resolved",
    },
    status: "in_service",
  },
  {
    title: "Advocates/Insurance Server",
    kind: "infrastructure",
    fields: {
      location: "Advocates office",
      type: "Client-confidential data",
      storage: "5TB",
      lastBackup: toDateOnly(daysAgo(1)),
      status: "operational",
      serial: generateSerial("SRV", 2023, 3),
      encrypted: true,
      compliance: "client-confidential",
    },
    status: "in_service",
  },
  {
    title: "Cloud Backup Service",
    kind: "infrastructure",
    fields: {
      type: "Backup service",
      incrementalSchedule: "nightly",
      fullBackupSchedule: "monthly",
      retention: {
        daily: "30 days",
        weekly: "3 months",
        monthly: "1 year",
      },
      status: "green",
      lastWarning: toDateOnly(daysAgo(15)),
      warningResolved: true,
    },
    status: "in_service",
  },
  {
    title: "Wi-Fi Network Infrastructure",
    kind: "infrastructure",
    fields: {
      corporateSSID: "AAC-Corporate",
      corporateSecurity: "WPA3-Enterprise",
      corporateDevices: 45,
      guestSSID: "AAC-Guest",
      guestSecurity: "captive portal",
      guestDevices: 12,
      accessPoints: 8,
      floors: 3,
      lastInterferenceCheck: toDateOnly(daysAgo(7)),
      channelAdjusted: "channel 6",
    },
    status: "in_service",
  },
];

export async function seedInfrastructure(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "infrastructure")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Infrastructure already seeded, skipping");
      return { module: "infrastructure", status: "skipped", count: 0 };
    }

    console.log("Seeding infrastructure...");

    for (const item of INFRASTRUCTURE_ITEMS) {
      await db.insert(registerItems).values({
        packKey: "it-technician",
        kind: item.kind,
        title: item.title,
        fields: item.fields,
        status: item.status,
        custody: "company",
        lastVerifiedAt: toDateOnly(daysAgo(7)),
        verifyIntervalDays: 30,
        source: "manual",
      });
    }

    console.log(`Seeded ${INFRASTRUCTURE_ITEMS.length} infrastructure items`);
    return { module: "infrastructure", status: "seeded", count: INFRASTRUCTURE_ITEMS.length };
  } catch (error) {
    console.error("Failed to seed infrastructure:", error);
    return {
      module: "infrastructure",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
