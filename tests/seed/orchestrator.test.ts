import { describe, it, expect, beforeEach } from "vitest";
import { seedComprehensiveData } from "@/lib/seed/orchestrator";
import { db } from "@/lib/db";
import {
  users,
  registerItems,
  playbooks,
  tasks,
  workLogEntries,
  opsLogEntries,
  calendarEvents,
  gamification,
  wellbeingMetrics,
  ethicalMetrics,
  aiInsights,
} from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("seedComprehensiveData - Integration", () => {
  beforeEach(async () => {
    // Clean up seeded datadata before each test
    await db.delete(aiInsights).where(eq(aiInsights.type, "recommendation"));
    await db.delete(ethicalMetrics).where(eq(ethicalMetrics.payEquityScore, 88));
    await db.delete(wellbeingMetrics).where(eq(wellbeingMetrics.mood, "energized"));
    await db.delete(gamification).where(eq(gamification.level, 5));
    await db.delete(calendarEvents).where(eq(calendarEvents.eventType, "maintenance"));
    await db.delete(opsLogEntries).where(eq(opsLogEntries.packKey, "it-technician"));
    await db.delete(workLogEntries).where(eq(workLogEntries.discipline, "technician"));
    await db.delete(tasks).where(eq(tasks.discipline, "technician"));
    await db.delete(playbooks).where(and(eq(playbooks.packKey, "it-technician"), eq(playbooks.discipline, "technician")));
    await db.delete(registerItems).where(eq(registerItems.packKey, "it-technician"));
    await db.delete(users).where(eq(users.department, "Finance"));
  }, 30000);

  it("seeds all domains with correct counts", async () => {
    const results = await seedComprehensiveData();

    // Verify all modules ran
    expect(results.length).toBe(10);

    // Verify counts
    const usersResult = results.find((r) => r.module === "users");
    expect(usersResult?.status).toBe("seeded");
    expect(usersResult?.count).toBe(10);

    const infraResult = results.find((r) => r.module === "infrastructure");
    expect(infraResult?.status).toBe("seeded");
    expect(infraResult?.count).toBe(5);

    const equipResult = results.find((r) => r.module === "equipment");
    expect(equipResult?.status).toBe("seeded");
    expect(equipResult?.count).toBe(25);

    const registersResult = results.find((r) => r.module === "registers");
    expect(registersResult?.status).toBe("seeded");
    expect(registersResult?.count).toBe(8);

    const playbooksResult = results.find((r) => r.module === "playbooks");
    expect(playbooksResult?.status).toBe("seeded");
    expect(playbooksResult?.count).toBe(11);

    const tasksResult = results.find((r) => r.module === "tasks");
    expect(tasksResult?.status).toBe("seeded");
    expect(tasksResult?.count).toBe(23);

    const worklogsResult = results.find((r) => r.module === "worklogs");
    expect(worklogsResult?.status).toBe("seeded");
    expect(worklogsResult?.count).toBe(40);

    const opsResult = results.find((r) => r.module === "operations");
    expect(opsResult?.status).toBe("seeded");
    expect(opsResult?.count).toBe(20);

    const calendarResult = results.find((r) => r.module === "calendar");
    expect(calendarResult?.status).toBe("seeded");
    expect(calendarResult?.count).toBe(12);

    const analyticsResult = results.find((r) => r.module === "analytics");
    expect(analyticsResult?.status).toBe("seeded");
    expect(analyticsResult?.count).toBeGreaterThan(0);
  }, 30000);

  it("maintains referential integrity", async () => {
    await seedComprehensiveData();

    // Verify equipment references valid users
    const equipment = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "equipment")));

    for (const item of equipment) {
      if (item.ownerId) {
        const user = await db.select().from(users).where(eq(users.id, item.ownerId));
        expect(user.length).toBe(1);
      }
    }

    // Verify tasks reference valid users
    const seededTasks = await db.select().from(tasks).where(eq(tasks.discipline, "technician"));
    for (const task of seededTasks) {
      if (task.assigneeId) {
        const user = await db.select().from(users).where(eq(users.id, task.assigneeId));
        expect(user.length).toBe(1);
      }
    }

    // Verify worklogs reference valid users
    const worklogs = await db.select().from(workLogEntries).where(eq(workLogEntries.discipline, "technician"));
    for (const entry of worklogs) {
      const user = await db.select().from(users).where(eq(users.id, entry.userId));
      expect(user.length).toBe(1);
    }

    // Verify ops logs reference valid users
    const opsLogs = await db.select().from(opsLogEntries).where(eq(opsLogEntries.packKey, "it-technician"));
    for (const log of opsLogs) {
      const user = await db.select().from(users).where(eq(users.id, log.ownerId));
      expect(user.length).toBe(1);
    }
  }, 30000);

  it("is idempotent - second run skips all modules", async () => {
    // First run
    const firstRun = await seedComprehensiveData();
    const firstRunSeeded = firstRun.filter((r) => r.status === "seeded").length;
    expect(firstRunSeeded).toBe(10);

    // Second run
    const secondRun = await seedComprehensiveData();
    const secondRunSkipped = secondRun.filter((r) => r.status === "skipped").length;
    expect(secondRunSkipped).toBe(10);

    // Verify counts unchanged
    const userCount = await db.select().from(users).where(eq(users.department, "Finance"));
    expect(userCount.length).toBe(10);

    const equipmentCount = await db
      .select()
      .from(registerItems)
      .where(and(eq(registerItems.packKey, "it-technician"), eq(registerItems.kind, "equipment")));
    expect(equipmentCount.length).toBe(25);
  }, 30000);
});
