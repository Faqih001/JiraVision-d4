// lib/seed/worklogs.ts
import { db } from "@/lib/db";
import { workLogEntries, users, tasks } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo, toDateOnly } from "./utils";

export async function seedWorklogs(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(workLogEntries)
      .where(eq(workLogEntries.discipline, "technician"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Worklogs already seeded, skipping");
      return { module: "worklogs", status: "skipped", count: 0 };
    }

    console.log("Seeding worklogs...");

    const allUsers = await db.select().from(users);
    const adminId = allUsers.find((u) => u.email === "fakiiahmad001@gmail.com")?.id;

    const allTasks = await db.select().from(tasks).where(eq(tasks.discipline, "technician"));
    const mcsTask = allTasks.find((t) => t.title.includes("MCS Server"));
    const wifiTask = allTasks.find((t) => t.title.includes("Wi-Fi down"));
    const francisTask = allTasks.find((t) => t.title.includes("Francis"));

    const worklogData = [
      // Recent (last 7 days)
      {
        workedOn: daysAgo(1),
        kind: "maintenance",
        title: "Replaced Wi-Fi access point on 2nd floor",
        body: "Removed faulty access point. Installed spare Ubiquiti UniFi AP. Configured with corporate SSID. Tested connectivity with 5 devices. All working normally.",
        minutes: 120,
        taskId: wifiTask?.id,
      },
      {
        workedOn: daysAgo(2),
        kind: "support",
        title: "Diagnosed Francis's hard drive failure",
        body: "Francis reported slow performance and clicking sounds. Ran diagnostic tools. Confirmed hard drive degradation. Backed up all data to external drive. Ordered replacement SSD.",
        minutes: 90,
        taskId: francisTask?.id,
      },
      {
        workedOn: daysAgo(3),
        kind: "action",
        title: "Restored MCS Server from backup",
        body: "MCS Server went offline due to power supply failure. Restored from cloud backup. Verified all data integrity. Tested applications. Server operational after 4-hour downtime.",
        minutes: 240,
        taskId: mcsTask?.id,
      },
      {
        workedOn: daysAgo(4),
        kind: "maintenance",
        title: "Updated antivirus definitions on all machines",
        body: "Pushed latest antivirus updates to all 14 workstations and 3 servers. Verified all systems protected. No threats detected.",
        minutes: 60,
      },
      {
        workedOn: daysAgo(5),
        kind: "support",
        title: "Configured VPN for David's home office",
        body: "David reported VPN connection failures. Remote session to diagnose. Found configuration mismatch. Reconfigured VPN client. Tested connection successfully.",
        minutes: 45,
      },
      {
        workedOn: daysAgo(6),
        kind: "support",
        title: "Installed Adobe updates for Grace",
        body: "Grace requested Adobe Illustrator update. Downloaded latest version from official source. Installed on her machine. Tested functionality. All features working.",
        minutes: 30,
      },
      {
        workedOn: daysAgo(7),
        kind: "maintenance",
        title: "Weekly preventive maintenance inspection",
        body: "Inspected all servers. Checked disk space (all under 80%). Reviewed CPU/RAM usage (normal). Checked for OS updates (2 pending). No malware alerts.",
        minutes: 180,
      },

      // Historical (8-30 days ago)
      {
        workedOn: daysAgo(8),
        kind: "maintenance",
        title: "Monthly backup test restoration",
        body: "Selected test file from AAC Kenya Server backup. Restored to test location. Verified file integrity. Compared with original. Restoration successful.",
        minutes: 120,
      },
      {
        workedOn: daysAgo(10),
        kind: "maintenance",
        title: "Quarterly hardware inspection",
        body: "Inspected all 25 equipment items. Checked physical condition. Verified serial numbers match register. Tested UPS battery levels. All within acceptable range.",
        minutes: 360,
      },
      {
        workedOn: daysAgo(12),
        kind: "support",
        title: "Resolved printer jam for Amina",
        body: "Amina reported frequent paper jams. Inspected HP LaserJet in Finance. Found paper debris in feed path. Cleaned thoroughly. Tested with 20 pages. No further jams.",
        minutes: 30,
      },
      {
        workedOn: daysAgo(15),
        kind: "maintenance",
        title: "Server room UPS battery replacement",
        body: "APC Smart-UPS 1500VA showing battery warning. Replaced battery pack. Tested UPS under load. Battery status normal. Runtime extended to rated capacity.",
        minutes: 120,
      },
      {
        workedOn: daysAgo(18),
        kind: "maintenance",
        title: "Software license audit and reconciliation",
        body: "Reviewed all 8 software licenses. Verified license counts match usage. Checked renewal dates. Adobe Creative Cloud renewal due in 30 days. Microsoft 365 has 2 spare licenses.",
        minutes: 240,
      },
      {
        workedOn: daysAgo(20),
        kind: "maintenance",
        title: "Network switch firmware update",
        body: "Updated Cisco Catalyst 2960 to latest firmware. Scheduled during maintenance window. Switch rebooted successfully. All ports operational. No connectivity issues reported.",
        minutes: 90,
      },
      {
        workedOn: daysAgo(22),
        kind: "support",
        title: "Onboarded Catherine: laptop setup and training",
        body: "Set up new Dell Latitude for Catherine. Installed Windows 11. Applied all updates. Installed Office 365, Slack, Zoom. Configured email. Trained on company tools. Handed over with documentation.",
        minutes: 180,
      },
      {
        workedOn: daysAgo(25),
        kind: "action",
        title: "Responded to security alert: unusual login attempt",
        body: "Received alert for failed login attempts on admin account. Investigated logs. Found brute force attempt from foreign IP. Blocked IP range. Verified no compromise. Enhanced monitoring.",
        minutes: 60,
      },
      {
        workedOn: daysAgo(28),
        kind: "maintenance",
        title: "Monthly inventory review",
        body: "Updated asset register with recent changes. Verified equipment locations. Checked warranty status for upcoming expirations. Reviewed disposal queue.",
        minutes: 120,
      },
      {
        workedOn: daysAgo(30),
        kind: "support",
        title: "Assisted Brian with server access request",
        body: "Brian requested access to MCS Server for backup monitoring. Verified authorization. Created user account with appropriate permissions. Tested access. Provided documentation.",
        minutes: 45,
      },
    ];

    // Generate additional entries to reach 40 total
    const additionalEntries = [];
    for (let i = 32; i <= 40; i++) {
      additionalEntries.push({
        workedOn: daysAgo(i),
        kind: i % 3 === 0 ? "maintenance" : i % 3 === 1 ? "support" : "action",
        title: `Routine IT support task ${i - 31}`,
        body: `Completed standard IT support activity. Documented actions taken. Updated relevant records. No issues encountered.`,
        minutes: 30 + Math.floor(Math.random() * 90),
      });
    }

    const allEntries = [...worklogData, ...additionalEntries];

    for (const entry of allEntries) {
      await db.insert(workLogEntries).values({
        userId: adminId!,
        workedOn: toDateOnly(entry.workedOn),
        taskId: entry.taskId || null,
        kind: entry.kind,
        title: entry.title,
        body: entry.body,
        minutes: entry.minutes,
        discipline: "technician",
        source: "manual",
      });
    }

    console.log(`Seeded ${allEntries.length} work log entries`);
    return { module: "worklogs", status: "seeded", count: allEntries.length };
  } catch (error) {
    console.error("Failed to seed worklogs:", error);
    return {
      module: "worklogs",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
