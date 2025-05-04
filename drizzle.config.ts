import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  driver: "postgresql",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} as any); // 👈 quick workaround to avoid TS driver type mismatch
