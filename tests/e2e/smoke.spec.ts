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
  // Annual −20% is the default selection (seatModel-driven).
  await expect(group.getByRole("button", { name: /^Annual/ })).toHaveAttribute("aria-pressed", "true")
  await group.getByRole("button", { name: "Monthly" }).click()
  await expect(page.getByText("(monthly)").first()).toBeVisible()
  await group.getByRole("button", { name: /^Annual/ }).click()
  await expect(page.getByText("(annual)").first()).toBeVisible()

  // Radix Slider: keyboard-driven. Home pins to minSeats (5), arrows step 1.
  const thumb = page.locator("#pricing-seats [role='slider']")
  await thumb.focus()
  await page.keyboard.press("Home")
  await expect(page.getByText(/5 seats →/).first()).toBeVisible()
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight")
  await expect(page.getByText(/13 seats →/).first()).toBeVisible()
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
  // Scope to the dialog — the navbar also has a hidden "Roadmap" link.
  await expect(page.getByRole("dialog").getByText(/Roadmap/i).first()).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(input).toBeHidden()
})

test("fit quiz: six answers reach the strong-fit verdict with personalised CTAs", async ({ page }) => {
  await page.goto("/fit-quiz")
  const picks = [
    "11–30 people",
    "Jira — we run it already",
    "Sprints regularly derail mid-flight",
    "Estimation arguments and surprise over-commitment",
    "Team-level aggregates, nothing personal",
    "Starting fresh — no legacy to carry",
  ]
  for (const label of picks) {
    const option = page.getByRole("radio", { name: new RegExp(label.replace(/[–—]/g, ".")) })
    await expect(option).toBeVisible()
    await option.click()
  }
  await expect(page.locator("#quiz").getByText("Strong fit", { exact: true })).toBeVisible()
  await expect(page.getByText(/18/).filter({ hasText: "Score" }).first()).toBeVisible()
  await expect(page.locator("#quiz").getByText("Show the maths")).toBeVisible()
  // Personalised second CTA comes from the "what hurts" answer.
  await expect(page.getByRole("link", { name: /Deep-dive: AI Scrum Master/ })).toBeVisible()

  await page.getByRole("button", { name: /Restart the quiz/ }).click()
  await expect(page.getByText(/Question 1 \/ 6/).first()).toBeVisible()
})

test("compare sub-page and one-pager render real content", async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto("/compare/asana")
  // Editorial h1 doesn't name the tool; metadata does.
  await expect(page).toHaveTitle(/Asana/i)
  await expect(page.getByRole("heading").first()).toBeVisible()
  await expect(page.locator("#comparison")).toBeAttached()

  await page.goto("/one-pager")
  await expect(page.getByRole("heading").first()).toBeVisible()
  await expect(page.getByRole("button", { name: /print/i }).first()).toBeVisible()
  expect(errors).toEqual([])
})
