// The live seed check, kept runnable but out of the default gate. It writes through the
// DATABASE_URL in .env.local — production — so it is opt-in: `npm run test:seed`.
import { defineConfig } from "vitest/config"
import base from "./vitest.config"

export default defineConfig({
  ...base,
  test: { ...base.test, include: ["tests/seed/**/*.test.ts"] },
})
