import { defineConfig, devices } from "@playwright/test"

// Smoke suite runs against the marketing site. It reuses a `npm run dev`
// server on :3000 when one is already up, and starts its own otherwise.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      // Full Chromium build (not the separate headless-shell package), so a
      // plain `playwright install chromium` is enough on a fresh checkout.
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
