// lib/seed/registers.ts
import { db } from "@/lib/db";
import { registerItems } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { toDateOnly } from "./utils";

const SOFTWARE_LICENSES = [
  {
    title: "Microsoft 365 Business",
    fields: {
      totalLicenses: 14,
      assignedLicenses: 12,
      spareLicenses: 2,
      renewalDate: "2027-03-15",
      licenseKeyLocation: "IT admin portal → Licenses",
      purchaseDate: "2025-03-15",
    },
    status: "in_service",
  },
  {
    title: "Adobe Creative Cloud",
    fields: {
      totalLicenses: 3,
      assignedLicenses: 3,
      spareLicenses: 0,
      renewalDate: "2026-12-01",
      licenseKeyLocation: "Adobe admin console",
      purchaseDate: "2025-12-01",
      assignedTo: ["Grace Akinyi", "Denise Reece", "Francis Mwangi"],
    },
    status: "in_service",
  },
  {
    title: "QuickBooks",
    fields: {
      totalLicenses: 2,
      assignedLicenses: 2,
      spareLicenses: 0,
      renewalDate: "2027-01-10",
      licenseKeyLocation: "Intuit account → Products",
      purchaseDate: "2026-01-10",
      assignedTo: ["Amina Hassan", "Irene Chebet"],
    },
    status: "in_service",
  },
  {
    title: "Slack Business",
    fields: {
      totalLicenses: 14,
      assignedLicenses: 14,
      spareLicenses: 0,
      renewalDate: "2027-06-20",
      licenseKeyLocation: "Slack admin → Billing",
      purchaseDate: "2026-06-20",
    },
    status: "in_service",
  },
  {
    title: "Zoom Pro",
    fields: {
      totalLicenses: 1,
      assignedLicenses: 1,
      spareLicenses: 0,
      renewalDate: "2026-11-30",
      licenseKeyLocation: "Zoom admin → Account Management",
      purchaseDate: "2025-11-30",
      shared: true,
    },
    status: "in_service",
  },
  {
    title: "Antivirus Endpoint Protection",
    fields: {
      totalLicenses: 14,
      assignedLicenses: 14,
      spareLicenses: 0,
      renewalDate: "2027-04-05",
      licenseKeyLocation: "Security console → Licenses",
      purchaseDate: "2026-04-05",
    },
    status: "in_service",
  },
  {
    title: "Backup Software",
    fields: {
      totalLicenses: 3,
      assignedLicenses: 3,
      spareLicenses: 0,
      renewalDate: "2027-02-28",
      licenseKeyLocation: "Backup console → Settings",
      purchaseDate: "2026-02-28",
      assignedTo: ["AAC Kenya Server", "MCS Server", "Advocates Server"],
    },
    status: "in_service",
  },
  {
    title: "Remote Support Tool",
    fields: {
      totalLicenses: 1,
      assignedLicenses: 1,
      spareLicenses: 0,
      renewalDate: "2027-05-15",
      licenseKeyLocation: "Vendor portal → Licenses",
      purchaseDate: "2026-05-15",
      assignedTo: "IT Department",
    },
    status: "in_service",
  },
];

export async function seedRegisters(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "software")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Software registers already seeded, skipping");
      return { module: "registers", status: "skipped", count: 0 };
    }

    console.log("Seeding software registers...");

    for (const item of SOFTWARE_LICENSES) {
      await db.insert(registerItems).values({
        packKey: "it-technician",
        kind: "software",
        title: item.title,
        fields: item.fields,
        status: item.status,
        custody: "company",
        lastVerifiedAt: toDateOnly(new Date()),
        verifyIntervalDays: 90,
        source: "manual",
      });
    }

    console.log(`Seeded ${SOFTWARE_LICENSES.length} software licenses`);
    return { module: "registers", status: "seeded", count: SOFTWARE_LICENSES.length };
  } catch (error) {
    console.error("Failed to seed registers:", error);
    return {
      module: "registers",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
