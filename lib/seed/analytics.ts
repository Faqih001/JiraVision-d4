// lib/seed/analytics.ts
import { db } from "../db";
import { gamification, wellbeingMetrics, ethicalMetrics, aiInsights, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { type SeedResult } from "./types";
import { daysAgo, daysFromNow, toDateOnly } from "./utils";

export async function seedAnalytics(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(gamification)
      .where(eq(gamification.level, 5))
      .limit(1);

    if (existing.length > 0) {
      console.log("Analytics already seeded, skipping");
      return { module: "analytics", status: "skipped", count: 0 };
    }

    console.log("Seeding analytics...");

    const allUsers = await db.select().from(users);
    const adminId = allUsers.find((u) => u.email === "admin@jiravision.com")?.id;

    let totalCount = 0;

    // Gamification for admin
    await db.insert(gamification).values({
      userId: adminId!,
      level: 5,
      xp: 2450,
      tasksCompleted: 127,
      achievements: [
        { id: "first_backup", name: "Backup Master", earnedAt: toDateOnly(daysAgo(90)) },
        { id: "zero_incidents", name: "Incident Free Quarter", earnedAt: toDateOnly(daysAgo(60)) },
        { id: "full_audit", name: "Audit Complete", earnedAt: toDateOnly(daysAgo(30)) },
        { id: "mentor", name: "Team Mentor", earnedAt: toDateOnly(daysAgo(15)) },
      ],
      skillTrees: {
        backup: { level: 5, xp: 500 },
        network: { level: 4, xp: 400 },
        security: { level: 4, xp: 350 },
        hardware: { level: 3, xp: 300 },
      },
      rewards: [
        { id: "gift_card_1", name: "$50 Gift Card", redeemedAt: toDateOnly(daysAgo(60)) },
        { id: "extra_day_off", name: "Extra Day Off", redeemedAt: toDateOnly(daysAgo(30)) },
        { id: "training_budget", name: "$500 Training Budget", redeemedAt: toDateOnly(daysAgo(15)) },
      ],
    });
    totalCount++;

    // Wellbeing metrics for last 14 days
    const moods = ["energized", "focused", "content", "neutral", "tired"];
    const workloads = ["light", "moderate", "heavy", "very heavy"];
    for (let i = 0; i < 14; i++) {
      await db.insert(wellbeingMetrics).values({
        userId: adminId!,
        date: toDateOnly(daysAgo(i)),
        wellbeingScore: 70 + Math.floor(Math.random() * 25),
        mood: moods[i % moods.length],
        workload: workloads[i % workloads.length],
        stressLevel: 2 + Math.floor(Math.random() * 5),
        overtimeHours: i % 3 === 0 ? "2.5" : "0",
      });
      totalCount++;
    }

    // Ethical metrics for last 30 days
    for (let i = 0; i < 30; i++) {
      await db.insert(ethicalMetrics).values({
        date: toDateOnly(daysAgo(i)),
        payEquityScore: 85 + Math.floor(Math.random() * 10),
        workloadBalanceScore: 80 + Math.floor(Math.random() * 15),
        deiTaskDistributionScore: 88 + Math.floor(Math.random() * 10),
        overtimeCompliance: 90 + Math.floor(Math.random() * 10),
      });
      totalCount++;
    }

    // AI insights (3)
    const insights = [
      {
        type: "recommendation",
        title: "Backup storage optimization",
        description:
          "Cloud backup storage has reached 85% capacity. Consider archiving backups older than 90 days to free up space. Estimated savings: 30% storage reduction.",
        status: "active",
        expiresAt: daysFromNow(30),
      },
      {
        type: "pattern",
        title: "Recurring printer issues",
        description:
          "HP LaserJet Pro M404 in Finance has had 3 paper jam incidents in the past month. Recommend scheduling preventive maintenance or considering replacement.",
        status: "active",
        expiresAt: daysFromNow(14),
      },
      {
        type: "recommendation",
        title: "License renewal upcoming",
        description:
          "Adobe Creative Cloud licenses renew in 30 days. All 3 licenses are currently assigned. Budget approval needed for renewal.",
        status: "active",
        expiresAt: daysFromNow(7),
      },
    ];

    for (const insight of insights) {
      await db.insert(aiInsights).values({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        status: insight.status,
        expiresAt: insight.expiresAt,
      });
      totalCount++;
    }

    console.log(`Seeded ${totalCount} analytics records`);
    return { module: "analytics", status: "seeded", count: totalCount };
  } catch (error) {
    console.error("Failed to seed analytics:", error);
    return {
      module: "analytics",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
