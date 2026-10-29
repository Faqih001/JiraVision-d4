import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // drizzle/schema.js is a stale four-table CommonJS duplicate and Vite's default
      // extension order tries .js before .ts, so "@/drizzle/schema" silently loads it in
      // a test run. Pinned to the real schema the same way lib/db.js is a known shadow —
      // keep this entry above "@".
      "@/drizzle/schema": path.resolve(__dirname, "drizzle/schema.ts"),
      "@": path.resolve(__dirname, "."),
    },
  },
})
