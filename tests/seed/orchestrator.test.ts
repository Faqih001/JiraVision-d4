import { describe, it, expect } from "vitest";
import { seedComprehensiveData } from "@/lib/seed/orchestrator";

describe("seedComprehensiveData - Integration", () => {
  it("seeds all domains successfully", async () => {
    const results = await seedComprehensiveData();

    // Verify all modules ran
    expect(results.length).toBe(10);

    // Verify no failures
    const failures = results.filter((r) => r.status === "failed");
    expect(failures.length).toBe(0);

    // Verify at least some modules seeded (may be skipped if data exists)
    const seededOrSkipped = results.filter((r) => r.status === "seeded" || r.status === "skipped");
    expect(seededOrSkipped.length).toBe(10);

    // Log results for verification
    console.log("Seed results:");
    results.forEach((r) => {
      console.log(`  ${r.module}: ${r.status} (${r.count} records)`);
    });
  }, 60000);
});
