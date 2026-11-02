import { expect, test } from "@playwright/test"
import { login } from "./helpers/auth"

/**
 * E2E tests for the calendar view mode selector on /dashboard/calendar.
 *
 * Covers:
 *  1. Page loads with the view mode selector visible
 *  2. Switching between all 4 view modes (due, cadence, both, range)
 *  3. Each mode button reflects the active state via aria-pressed
 */

const VIEW_MODES = ["due", "cadence", "both", "range"] as const

test.describe("Calendar view modes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto("/dashboard/calendar")
  })

  test("calendar page loads with the view mode selector", async ({ page }) => {
    const group = page.getByRole("group", { name: "Task view mode" })
    await expect(group).toBeVisible({ timeout: 10_000 })

    // All four mode buttons should be present.
    for (const mode of VIEW_MODES) {
      await expect(group.getByRole("button", { name: new RegExp(mode, "i") })).toBeVisible()
    }
  })

  test("default view mode is 'both'", async ({ page }) => {
    const group = page.getByRole("group", { name: "Task view mode" })
    await expect(group).toBeVisible({ timeout: 10_000 })

    const bothBtn = group.getByRole("button", { name: /both/i })
    await expect(bothBtn).toHaveAttribute("aria-pressed", "true")
  })

  for (const mode of VIEW_MODES) {
    test(`switching to '${mode}' mode activates the button`, async ({ page }) => {
      const group = page.getByRole("group", { name: "Task view mode" })
      await expect(group).toBeVisible({ timeout: 10_000 })

      const btn = group.getByRole("button", { name: new RegExp(`^${mode}$`, "i") })
      await btn.click()

      // The clicked button should now be pressed; others should not.
      await expect(btn).toHaveAttribute("aria-pressed", "true")
      for (const other of VIEW_MODES.filter((m) => m !== mode)) {
        const otherBtn = group.getByRole("button", { name: new RegExp(`^${other}$`, "i") })
        await expect(otherBtn).toHaveAttribute("aria-pressed", "false")
      }
    })
  }

  test("cycling through all modes in sequence works", async ({ page }) => {
    const group = page.getByRole("group", { name: "Task view mode" })
    await expect(group).toBeVisible({ timeout: 10_000 })

    for (const mode of VIEW_MODES) {
      const btn = group.getByRole("button", { name: new RegExp(`^${mode}$`, "i") })
      await btn.click()
      await expect(btn).toHaveAttribute("aria-pressed", "true")
    }
  })

  test("calendar grid re-renders after mode switch", async ({ page }) => {
    const group = page.getByRole("group", { name: "Task view mode" })
    await expect(group).toBeVisible({ timeout: 10_000 })

    // Switch to 'due' mode.
    await group.getByRole("button", { name: /due/i }).click()
    // The calendar grid or content area should still be visible after the switch.
    await expect(page.locator("[class*='calendar'], [class*='grid'], main").first()).toBeVisible({ timeout: 10_000 })

    // Switch to 'cadence' mode.
    await group.getByRole("button", { name: /cadence/i }).click()
    await expect(page.locator("[class*='calendar'], [class*='grid'], main").first()).toBeVisible({ timeout: 10_000 })
  })
})
