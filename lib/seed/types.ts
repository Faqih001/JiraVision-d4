// lib/seed/types.ts
export interface SeedResult {
  module: string;
  status: "seeded" | "skipped" | "failed";
  count: number;
  error?: string;
}
