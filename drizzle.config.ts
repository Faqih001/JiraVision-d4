import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

export default defineConfig({
  schema: "./drizzle/schema.ts",         // 👈 adjust path if your schema is elsewhere
  out: "./drizzle",                      // where migrations & meta will be saved
  driver: "pg",                          // PostgreSQL
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
