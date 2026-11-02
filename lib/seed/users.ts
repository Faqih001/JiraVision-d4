// lib/seed/users.ts
import { type SeedResult } from "./types";

export async function seedUsers(): Promise<SeedResult> {
  console.log("Users seed disabled — all data scoped to primary account");
  return { module: "users", status: "skipped", count: 0 };
}
