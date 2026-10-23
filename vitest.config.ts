import path from "node:path"

import { defineConfig } from "vitest/config"

// Unit harness for the pure model modules (V2-6): node environment is enough —
// every module under test is browser-free data + arithmetic.
export default defineConfig({
  resolve: {
    // Mirror the tsconfig path alias "@/*" -> "./*".
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
})
