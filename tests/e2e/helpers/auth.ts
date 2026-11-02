/**
 * Shared Playwright helpers for dashboard E2E tests.
 *
 * The dashboard requires authentication, so every test that navigates to a
 * /dashboard/* route must first log in. These helpers centralise that flow.
 */

import { type Page, type BrowserContext, expect } from "@playwright/test"

/** Default test-user credentials (matches scripts/create-test-user.js). */
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? "test@jiravision.app",
  password: process.env.TEST_USER_PASSWORD ?? "test-password-123",
}

/**
 * Log in via the /login page and wait for the dashboard to load.
 * Call this in test.beforeEach or at the start of each test.
 */
export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password): Promise<void> {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  // After login the app redirects to /dashboard — wait for the shell to render.
  await page.waitForURL("**/dashboard/**", { timeout: 15_000 })
  await expect(page.locator("nav, [role='navigation']").first()).toBeVisible({ timeout: 10_000 })
}

/**
 * Create a Playwright storage state (cookies + localStorage) that can be
 * reused across tests to avoid logging in repeatedly.
 *
 * Usage in playwright.config.ts:
 *   projects: [
 *     { name: "setup", testMatch: /.*\.setup\.ts/ },
 *     { name: "chromium", use: { ...devices["Desktop Chrome"], storageState: ".auth/user.json" } },
 *   ]
 */
export async function saveAuthState(context: BrowserContext, path = ".auth/user.json"): Promise<void> {
  await context.storageState({ path })
}
