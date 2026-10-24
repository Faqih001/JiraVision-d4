import { expect, test, type Page } from "@playwright/test"

// Smoke coverage for the marketing site islands — the interactive pieces the
// v2 brief promised are "fully functional". Each test drives the real UI.

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    // Noise we cannot control from the app itself.
    if (/favicon|net::ERR_.*fonts|Download the React DevTools/i.test(text)) return
    errors.push(text)
  })
  page.on("pageerror", (err) => errors.push(String(err)))
  return errors
}

test("homepage renders its section stack without console errors", async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto("/")
  await expect(page.getByRole("heading").first()).toBeVisible()
  const sections = page.locator("section")
  expect(await sections.count()).toBeGreaterThanOrEqual(15)
  await expect(page.locator("#sandbox")).toBeAttached()
  await expect(page.locator("#calculators")).toBeAttached()
  expect(errors).toEqual([])
})

test("pricing calculator: billing toggle and seats slider change the maths", async ({ page }) => {
  await page.goto("/pricing")
  const group = page.getByRole("group", { name: "Billing period" })
  await expect(group.getByRole("button", { name: "Monthly" })).toHaveAttribute("aria-pressed", "true")
  await group.getByRole("button", { name: /^Annual/ }).click()
  await expect(group.getByRole("button", { name: /^Annual/ })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("(annual)").first()).toBeVisible()

  const seats = page.getByLabel("Number of seats")
  await seats.fill("30")
  await expect(page.getByText(/30 seats →/).first()).toBeVisible()
})

test("faq deep link prefills the explorer from ?q=", async ({ page }) => {
  await page.goto("/faq?q=burnout")
  const input = page.getByPlaceholder(/^Search answers/)
  await expect(input).toHaveValue("burnout")
  await expect(page.getByText(/\d+ of \d+ shown/).first()).toBeVisible()
  await input.fill("zzzznope")
  await expect(page.getByText(/No answer matches/i).first()).toBeVisible()
})

test("migration planner: source switch moves the hours, download emits a file", async ({ page }) => {
  await page.goto("/migration")
  const total = page.getByText(/~\d+–\d+ h/).first()
  const jiraTotal = (await total.textContent()) ?? ""
  await page.getByRole("group", { name: "Source tool" }).getByRole("button", { name: "Trello" }).click()
  await expect
    .poll(async () => (await total.textContent()) ?? "", { timeout: 10_000 })
    .not.toBe(jiraTotal)

  const download = page.getByRole("button", { name: /Download checklist|\.txt/i }).first()
  const [file] = await Promise.all([page.waitForEvent("download"), download.click()])
  expect(file.suggestedFilename()).toMatch(/^jiravision-migration-trello-\d+seats\.txt$/)
})

test("templates library search narrows the grid", async ({ page }) => {
  await page.goto("/templates")
  const search = page.getByPlaceholder(/^Search templates/)
  const cards = page.locator("#library article")
  expect(await cards.count()).toBeGreaterThan(1)
  await search.fill("runbook")
  await expect(cards.first()).toBeVisible()
  await search.fill("zzzznope")
  await expect(page.getByText(/Nothing matches/i).first()).toBeVisible()
})

test("Cmd+K opens the site search palette and finds pages", async ({ page }) => {
  await page.goto("/")
  await page.keyboard.press("Control+Meta+k")
  const input = page.getByPlaceholder(/^Search pages, products, FAQ/)
  await expect(input).toBeVisible({ timeout: 5_000 })
  await input.fill("roadmap")
  await expect(page.getByText(/Roadmap/i).first()).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(input).toBeHidden()
})

test("compare sub-page and one-pager render real content", async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto("/compare/asana")
  await expect(page.getByRole("heading").first()).toContainText(/Asana/i)
  await expect(page.locator("#comparison")).toBeAttached()

  await page.goto("/one-pager")
  await expect(page.getByRole("heading").first()).toBeVisible()
  await expect(page.getByRole("button", { name: /print/i }).first()).toBeVisible()
  expect(errors).toEqual([])
})
