import { expect, test } from "@playwright/test"

// V2-6a smoke suite — runs serially against the already-running dev server
// (see playwright.config.ts: reuseExistingServer, 60s navigation timeout for
// first-compile routes).

test.describe.configure({ mode: "serial" })

function collectConsoleErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  page.on("pageerror", (err) => errors.push(String(err)))
  return errors
}

test("homepage: h1, section count, zero console errors", async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto("/", { waitUntil: "load" })
  await expect(page.locator("h1")).toBeVisible()
  const sections = await page.locator("section").count()
  expect(sections).toBeGreaterThanOrEqual(15)
  // Give hydration/late effects a beat before judging console cleanliness.
  await page.waitForTimeout(2_000)
  expect(errors).toEqual([])
})

test("pricing: seat slider keyboard + billing toggle change displayed totals", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "load" })
  const totalLine = page
    .locator("#plans article")
    .first()
    .locator("p")
    .filter({ hasText: "seats →" })
  await expect(totalLine).toBeVisible()

  // Keyboard: focus the Radix thumb and press ArrowRight — one seat more.
  const thumb = page.locator("#pricing-seats").locator("[role='slider']").first()
  const seatsBefore = await thumb.getAttribute("aria-valuenow")
  await thumb.focus()
  await page.keyboard.press("ArrowRight")
  const seatsAfter = await thumb.getAttribute("aria-valuenow")
  expect(seatsAfter).not.toBe(seatsBefore)
  const totalWithNewSeats = await totalLine.innerText()
  expect(totalWithNewSeats).toContain(`${seatsAfter} seats`)

  // Billing toggle: Monthly vs Annual −20% must move every card total.
  const monthlyBtn = page.getByRole("button", { name: "Monthly", exact: true })
  const annualBtn = page.getByRole("button", { name: /Annual/ })
  await monthlyBtn.click()
  const monthlyTotal = await totalLine.innerText()
  await annualBtn.click()
  const annualTotal = await totalLine.innerText()
  expect(annualTotal).not.toBe(monthlyTotal)
  expect(monthlyTotal).toContain("(monthly)")
  expect(annualTotal).toContain("(annual)")
})

test("faq deep link: ?q=burnout pre-fills the search input", async ({ page }) => {
  await page.goto("/faq?q=burnout", { waitUntil: "load" })
  await expect(page.locator("#faq-search")).toHaveValue("burnout")
})

test("migration planner: source switch rewrites the plan; checkbox moves progress", async ({
  page,
}) => {
  await page.goto("/migration", { waitUntil: "load" })
  const planner = page.locator("#planner")
  await expect(planner).toBeVisible()

  const before = await planner.innerText()
  await planner.getByRole("button", { name: "Asana", exact: true }).click()
  await expect(planner).not.toHaveText(before)
  await expect(planner.getByText("Asana · 20 seats")).toBeVisible()

  const bar = planner.locator('[role="progressbar"][aria-label="Checklist progress"]')
  await expect(bar).toBeVisible()
  const valueBefore = await bar.getAttribute("aria-valuenow")
  await planner.locator('input[type="checkbox"]').first().check()
  await expect(bar).not.toHaveAttribute("aria-valuenow", valueBefore ?? "0")
})

test("templates: typing “runbook” leaves exactly one visible card", async ({ page }) => {
  await page.goto("/templates", { waitUntil: "load" })
  const search = page.locator("#template-search")
  await expect(search).toBeVisible()
  const allCards = page.locator("#library article")
  await expect(allCards).not.toHaveCount(1)
  await search.fill("runbook")
  await expect(allCards).toHaveCount(1)
})

test("cmd+k palette opens focused and closes on Escape with no console errors", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page)
  await page.goto("/", { waitUntil: "load" })
  await page.keyboard.press("Meta+k")
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.locator("input")).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})

test("compare/asana and one-pager respond 200 with an h1", async ({ page }) => {
  for (const path of ["/compare/asana", "/one-pager"]) {
    const response = await page.goto(path, { waitUntil: "load" })
    expect(response?.status()).toBe(200)
    await expect(page.locator("h1")).toBeVisible()
  }
})
