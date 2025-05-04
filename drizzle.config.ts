
import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

export default defineConfig({
  schema: "./drizzle/schema.ts",     // Adjust if you placed schema elsewhere
  out: "./drizzle",                  // Folder for generated migrations
  dialect: "postgresql",             // ✅ Required (no "driver" anymore)
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
});
