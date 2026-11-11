import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

// The hourly schedule now mails queued digest rows (app/api/cron/hourly → app/api/email/_dispatcher.ts).
// Every copy site on the email surface still said the opposite. That is wrong in both directions: it
// hides a real outbound mail path from the person whose address is on the row, and it tells someone who
// unticked a digest that their choice does nothing. A guard on keywords alone would pass on "we send
// email" while the page still promises silence, so this file bans the old sentences outright.

const repo = path.resolve(__dirname, "..", "..")
const raw = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

/** Comment-stripped, entity-decoded, whitespace-collapsed: the words a reader actually sees. */
const copy = (relative: string) =>
  raw(relative)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/\s+/g, " ")

const page = copy("app/dashboard/email/page.tsx")

const ROUTES = [
  "app/api/email/digest/route.ts",
  "app/api/email/digest/[id]/route.ts",
  "app/api/email/templates/route.ts",
  "app/api/email/templates/[id]/route.ts",
]

const SILENCE_CLAIMS = [
  "does not send email",
  "does not send real email",
  "does not send anything",
  "does not email anyone",
  "never sends anything",
  "never sends email",
  "nothing is delivered",
  "no email is sent",
  "no email was sent",
  "no email leaves this app",
  "nothing was emailed",
  "nothing was sent",
  "no messages were sent",
  "not a sent message",
  "nothing network-sends",
  "stored locally, not sent",
  "messages are stored, not delivered",
  "this app stores digests only",
  "are not wired",
  "recorded by ops",
  "not verified sends",
]

describe("the email workspace no longer promises silence", () => {
  it.each(SILENCE_CLAIMS)("the page never says %s", (claim) => {
    expect(page).not.toContain(claim)
  })

  it.each(ROUTES)("%s never says it either", (route) => {
    const text = raw(route).toLowerCase()
    for (const claim of SILENCE_CLAIMS) expect(text, claim).not.toContain(claim)
  })
})

describe("the page states what the hourly run actually does", () => {
  it.each([
    ["the cadence and owner", "the hourly schedule"],
    ["the recipient restriction", "only to addresses that belong to a jiravision user"],
    ["the per-run cap", "25 queued rows"],
    ["the unsubscribe effect", "is not mailed"],
    ["the manual button's limit", "records an operator's claim"],
    ["the schedule gate", "cron_secret"],
    ["the provider gate", "jiravision_resend_api"],
  ])("names %s", (_label, phrase) => {
    expect(page).toContain(phrase)
  })

  it("keeps the delivery rules in the banner a reader sees before queueing anything", () => {
    // JSX comments are stripped above, so the banner is bounded by the markup that follows it.
    const start = page.indexOf("digest delivery")
    const end = page.indexOf("<kpicard")
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const banner = page.slice(start, end)
    expect(banner).toContain("only to addresses that belong to a jiravision user")
    expect(banner).toContain("is not mailed")
    expect(banner).toContain("cron_secret")
  })
})

describe("the email routes point at the dispatcher instead of denying it", () => {
  it("names the module that delivers queued rows", () => {
    expect(raw("app/api/email/digest/route.ts")).toContain("_dispatcher")
  })

  it.each(ROUTES)("%s mentions the hourly run", (route) => {
    expect(raw(route).toLowerCase()).toContain("hourly")
  })

  it("tells the template saver their preview row will be mailed", () => {
    for (const route of ["app/api/email/templates/route.ts", "app/api/email/templates/[id]/route.ts"]) {
      expect(raw(route).toLowerCase(), route).toContain("the hourly digest run delivers")
    }
  })
})

describe("the settings switch does not claim a power it lacks", () => {
  it("points email notifications at the matrix that really gates mail", () => {
    const settings = copy("app/dashboard/settings/page.tsx")
    expect(settings).toContain("/dashboard/email")
    expect(settings).not.toContain("the mail sender is not wired to this flag yet")
  })
})