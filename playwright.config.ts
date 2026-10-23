import { defineConfig, devices } from "@playwright/test"

// Smoke e2e against the already-running dev server. reuseExistingServer keeps a
// hand-started `npm run dev` on :3000; the command is only used if nothing is
// listening yet.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    // Dev-server first compile per route can take 10-20s.
    navigationTimeout: 60_000,
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
