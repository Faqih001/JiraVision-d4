// lib/seed/orchestrator.ts
import { type SeedResult } from "./types";
import { seedUsers } from "./users";
import { seedInfrastructure } from "./infrastructure";
import { seedEquipment } from "./equipment";

export async function seedComprehensiveData(): Promise<SeedResult[]> {
  const startTime = Date.now();
  console.log("Starting comprehensive seed...");

  const results: SeedResult[] = [];

  // Phase 1: Users (must be first)
  results.push(await seedUsers());

  // Phase 2: Infrastructure & Equipment
  results.push(await seedInfrastructure());
  results.push(await seedEquipment());

  // TODO: Add remaining modules in subsequent tasks
  // results.push(await seedPlaybooks());
  // results.push(await seedRegisters());
  // results.push(await seedTasks());
  // results.push(await seedWorklogs());
  // results.push(await seedOperations());
  // results.push(await seedCalendar());
  // results.push(await seedAnalytics());

  const elapsed = Date.now() - startTime;
  console.log(`Comprehensive seed completed in ${elapsed}ms`);
  console.log(
    `Results: ${results.filter((r) => r.status === "seeded").length} seeded, ` +
      `${results.filter((r) => r.status === "skipped").length} skipped, ` +
      `${results.filter((r) => r.status === "failed").length} failed`
  );

  return results;
}
