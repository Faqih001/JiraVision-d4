// lib/seed/equipment.ts
import { db } from "../db";
import { registerItems, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { generateSerial, daysAgo, toDateOnly } from "./utils";

export async function seedEquipment(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "equipment")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Equipment already seeded, skipping");
      return { module: "equipment", status: "skipped", count: 0 };
    }

    console.log("Seeding equipment...");

    // Get user IDs for assignments
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.name, u.id]));

    const equipment = [
      // Laptops (8)
      {
        title: "Dell Latitude 5520 - Francis",
        fields: {
          type: "Laptop",
          model: "Dell Latitude 5520",
          serial: generateSerial("DL5520", 2024, 1),
          purchaseDate: "2024-03-15",
          warrantyExpiry: "2027-03-15",
          assignedTo: "Francis Mwangi",
        },
        status: "in_service",
        ownerId: userMap.get("Francis Mwangi"),
      },
      {
        title: "Dell Latitude 5520 - Grace",
        fields: {
          type: "Laptop",
          model: "Dell Latitude 5520",
          serial: generateSerial("DL5520", 2024, 2),
          purchaseDate: "2024-03-15",
          warrantyExpiry: "2027-03-15",
          assignedTo: "Grace Akinyi",
        },
        status: "in_service",
        ownerId: userMap.get("Grace Akinyi"),
      },
      {
        title: "Dell Latitude 5520 - David",
        fields: {
          type: "Laptop",
          model: "Dell Latitude 5520",
          serial: generateSerial("DL5520", 2024, 3),
          purchaseDate: "2024-04-10",
          warrantyExpiry: "2027-04-10",
          assignedTo: "David Kimani",
        },
        status: "in_service",
        ownerId: userMap.get("David Kimani"),
      },
      {
        title: "Dell Latitude 5520 - Catherine",
        fields: {
          type: "Laptop",
          model: "Dell Latitude 5520",
          serial: generateSerial("DL5520", 2024, 4),
          purchaseDate: "2024-04-10",
          warrantyExpiry: "2027-04-10",
          assignedTo: "Catherine Wanjiku",
        },
        status: "in_service",
        ownerId: userMap.get("Catherine Wanjiku"),
      },
      {
        title: "Dell Latitude 5520 - James",
        fields: {
          type: "Laptop",
          model: "Dell Latitude 5520",
          serial: generateSerial("DL5520", 2024, 5),
          purchaseDate: "2024-05-20",
          warrantyExpiry: "2027-05-20",
          assignedTo: "James Otieno",
        },
        status: "in_service",
        ownerId: userMap.get("James Otieno"),
      },
      {
        title: "HP EliteBook 840 G8 - Spare 1",
        fields: {
          type: "Laptop",
          model: "HP EliteBook 840 G8",
          serial: generateSerial("HP840", 2023, 1),
          purchaseDate: "2023-11-10",
          warrantyExpiry: "2026-11-10",
        },
        status: "spare",
      },
      {
        title: "HP EliteBook 840 G8 - Spare 2",
        fields: {
          type: "Laptop",
          model: "HP EliteBook 840 G8",
          serial: generateSerial("HP840", 2023, 2),
          purchaseDate: "2023-11-10",
          warrantyExpiry: "2026-11-10",
        },
        status: "spare",
      },
      {
        title: "Lenovo ThinkPad T14 - In Repair",
        fields: {
          type: "Laptop",
          model: "Lenovo ThinkPad T14",
          serial: generateSerial("LNV-T14", 2023, 1),
          purchaseDate: "2023-08-15",
          warrantyExpiry: "2026-08-15",
          issue: "Screen replacement",
          expectedReturn: toDateOnly(daysAgo(-3)),
        },
        status: "awaiting_repair",
      },

      // Desktops (5)
      {
        title: "Dell OptiPlex 7090 - Amina",
        fields: {
          type: "Desktop",
          model: "Dell OptiPlex 7090",
          serial: generateSerial("DO7090", 2024, 1),
          purchaseDate: "2024-02-20",
          warrantyExpiry: "2027-02-20",
          assignedTo: "Amina Hassan",
        },
        status: "in_service",
        ownerId: userMap.get("Amina Hassan"),
      },
      {
        title: "Dell OptiPlex 7090 - Irene",
        fields: {
          type: "Desktop",
          model: "Dell OptiPlex 7090",
          serial: generateSerial("DO7090", 2024, 2),
          purchaseDate: "2024-02-20",
          warrantyExpiry: "2027-02-20",
          assignedTo: "Irene Chebet",
        },
        status: "in_service",
        ownerId: userMap.get("Irene Chebet"),
      },
      {
        title: "Dell OptiPlex 7090 - Brian",
        fields: {
          type: "Desktop",
          model: "Dell OptiPlex 7090",
          serial: generateSerial("DO7090", 2024, 3),
          purchaseDate: "2024-03-05",
          warrantyExpiry: "2027-03-05",
          assignedTo: "Brian Ochieng",
        },
        status: "in_service",
        ownerId: userMap.get("Brian Ochieng"),
      },
      {
        title: "HP ProDesk 400 G7 - Henry",
        fields: {
          type: "Desktop",
          model: "HP ProDesk 400 G7",
          serial: generateSerial("HPD400", 2023, 1),
          purchaseDate: "2023-09-12",
          warrantyExpiry: "2026-09-12",
          assignedTo: "Henry Kipchoge",
        },
        status: "in_service",
        ownerId: userMap.get("Henry Kipchoge"),
      },
      {
        title: "HP ProDesk 400 G7 - Spare",
        fields: {
          type: "Desktop",
          model: "HP ProDesk 400 G7",
          serial: generateSerial("HPD400", 2023, 2),
          purchaseDate: "2023-09-12",
          warrantyExpiry: "2026-09-12",
        },
        status: "spare",
      },

      // Printers (4)
      {
        title: "HP LaserJet Pro M404 - IT Room",
        fields: {
          type: "Printer",
          model: "HP LaserJet Pro M404",
          serial: generateSerial("HPLJ", 2023, 1),
          purchaseDate: "2023-06-18",
          warrantyExpiry: "2025-06-18",
          location: "IT Room",
        },
        status: "in_service",
      },
      {
        title: "HP LaserJet Pro M404 - Finance",
        fields: {
          type: "Printer",
          model: "HP LaserJet Pro M404",
          serial: generateSerial("HPLJ", 2023, 2),
          purchaseDate: "2023-06-18",
          warrantyExpiry: "2025-06-18",
          location: "Finance Office",
        },
        status: "in_service",
      },
      {
        title: "Canon imageCLASS MF269dw - Marketing",
        fields: {
          type: "Printer",
          model: "Canon imageCLASS MF269dw",
          serial: generateSerial("CAN-MF", 2024, 1),
          purchaseDate: "2024-01-22",
          warrantyExpiry: "2026-01-22",
          location: "Marketing",
        },
        status: "in_service",
      },
      {
        title: "Brother HL-L2350DW - Operations",
        fields: {
          type: "Printer",
          model: "Brother HL-L2350DW",
          serial: generateSerial("BRO-HL", 2022, 1),
          purchaseDate: "2022-11-30",
          warrantyExpiry: "2024-11-30",
          location: "Operations",
          issue: "Needs toner replacement",
        },
        status: "in_service",
      },

      // UPS Units (3)
      {
        title: "APC Smart-UPS 1500VA - AAC Kenya",
        fields: {
          type: "UPS",
          model: "APC Smart-UPS 1500VA",
          serial: generateSerial("APC-1500", 2023, 1),
          purchaseDate: "2023-05-10",
          warrantyExpiry: "2026-05-10",
          location: "Server Room - AAC Kenya",
          lastBatteryReplacement: "2025-10-12",
        },
        status: "in_service",
      },
      {
        title: "APC Smart-UPS 3000VA - MCS",
        fields: {
          type: "UPS",
          model: "APC Smart-UPS 3000VA",
          serial: generateSerial("APC-3000", 2023, 1),
          purchaseDate: "2023-05-10",
          warrantyExpiry: "2026-05-10",
          location: "Server Room - MCS",
        },
        status: "in_service",
      },
      {
        title: "Eaton 5PX 3000VA - Advocates",
        fields: {
          type: "UPS",
          model: "Eaton 5PX 3000VA",
          serial: generateSerial("EAT-5PX", 2023, 1),
          purchaseDate: "2023-07-22",
          warrantyExpiry: "2026-07-22",
          location: "Server Room - Advocates",
        },
        status: "in_service",
      },

      // Network Equipment (3)
      {
        title: "Cisco Catalyst 2960 Switch",
        fields: {
          type: "Network Switch",
          model: "Cisco Catalyst 2960",
          serial: generateSerial("CISCO-2960", 2022, 1),
          purchaseDate: "2022-08-15",
          warrantyExpiry: "2025-08-15",
          lastFirmwareUpdate: toDateOnly(daysAgo(15)),
        },
        status: "in_service",
      },
      {
        title: "Ubiquiti UniFi Controller",
        fields: {
          type: "Network Controller",
          model: "Ubiquiti UniFi Controller",
          serial: generateSerial("UBNT-CTL", 2023, 1),
          purchaseDate: "2023-03-20",
          warrantyExpiry: "2026-03-20",
        },
        status: "in_service",
      },
      {
        title: "Ubiquiti UniFi AP AC Pro (8 units)",
        fields: {
          type: "Access Point",
          model: "Ubiquiti UniFi AP AC Pro",
          serial: generateSerial("UBNT-AP", 2023, 1),
          purchaseDate: "2023-03-20",
          warrantyExpiry: "2026-03-20",
          quantity: 8,
          floors: 3,
        },
        status: "in_service",
      },

      // Other (2)
      {
        title: "External SSD Backup 1",
        fields: {
          type: "External Storage",
          model: "Samsung T7 Shield 2TB",
          serial: generateSerial("SSD-EXT", 2024, 1),
          purchaseDate: "2024-06-10",
          warrantyExpiry: "2027-06-10",
          storageType: "offline",
        },
        status: "in_service",
      },
      {
        title: "External SSD Backup 2",
        fields: {
          type: "External Storage",
          model: "Samsung T7 Shield 2TB",
          serial: generateSerial("SSD-EXT", 2024, 2),
          purchaseDate: "2024-06-10",
          warrantyExpiry: "2027-06-10",
          storageType: "offline",
        },
        status: "in_service",
      },
    ];

    for (const item of equipment) {
      await db.insert(registerItems).values({
        packKey: "it-technician",
        kind: "equipment",
        title: item.title,
        fields: item.fields,
        status: item.status,
        ownerId: item.ownerId || null,
        custody: item.ownerId ? "member" : "company",
        lastVerifiedAt: toDateOnly(daysAgo(Math.floor(Math.random() * 30))),
        verifyIntervalDays: 90,
        source: "manual",
      });
    }

    console.log(`Seeded ${equipment.length} equipment items`);
    return { module: "equipment", status: "seeded", count: equipment.length };
  } catch (error) {
    console.error("Failed to seed equipment:", error);
    return {
      module: "equipment",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
