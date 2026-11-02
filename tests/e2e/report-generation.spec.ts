import { expect, test } from "@playwright/test"
import { login } from "./helpers/auth"

/**
 * E2E tests for report creation and editing on /dashboard/reports.
 *
 * Covers:
 *  1. Page loads with the "Create report" button
 *  2. Opening the template selection dialog
 *  3. Report list renders (or shows empty state)
 */

test.describe("Report generation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto("/dashboard/reports")
  })

  test("reports page loads with the Create report button", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /create report/i })
    await expect(createBtn).toBeVisible({ timeout: 10_000 })
  })

  test("clicking Create report opens the template selection dialog", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /create report/i })
    await expect(createBtn).toBeVisible({ timeout: 10_000 })
    await createBtn.click()

    // A dialog should appear with template options.
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // The dialog should mention templates or report types.
    await expect(dialog).toContainText(/template|report type|select/i)
  })

  test("reports page shows content (list or empty state)", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    // Either there are report rows, or an empty state message.
    const hasReports = await page.locator("table tbody tr, [class*='report-card'], [class*='report-row']").count()
    const hasEmpty = await page.getByText(/no.*report|click.*create.*report|get started/i).count()

    expect(hasReports + hasEmpty).toBeGreaterThan(0)
  })

  test("can close the template dialog without creating a report", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /create report/i })
    await expect(createBtn).toBeVisible({ timeout: 10_000 })
    await createBtn.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Close the dialog via Escape or a close/cancel button.
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  test("KPI strip is visible on the reports page", async ({ page }) => {
    // The reports page has a KPI strip with cards like "Schedules", "Active", etc.
    await page.waitForLoadState("networkidle")

    const kpiLabels = page.getByText(/schedules|active|runs logged|last run|next run/i)
    const count = await kpiLabels.count()
    expect(count).toBeGreaterThan(0)
  })
})
