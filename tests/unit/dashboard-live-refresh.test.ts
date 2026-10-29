import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Every dashboard page that renders rows from the database re-reads them while the tab is
// open — on focus, on becoming visible, and once a minute. That is what makes the workspace
// live without a socket server on every page. Pages that hold an unsaved draft (settings,
// editors, report prose, a playbook run in progress) deliberately opt out: a background read
// would reset what the member is typing. Chat keeps its own faster 12s poll.

const src = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

const HOOK = "hooks/use-live-refresh.ts"

const DATA_PAGES = [
  "app/dashboard/page.tsx",
  "app/dashboard/activity/page.tsx",
  "app/dashboard/ai-scrum-master/page.tsx",
  "app/dashboard/analytics/page.tsx",
  "app/dashboard/automation/page.tsx",
  "app/dashboard/backlog/page.tsx",
  "app/dashboard/billing/page.tsx",
  "app/dashboard/calendar/page.tsx",
  "app/dashboard/career/career-client.tsx",
  "app/dashboard/career/growth-panel.tsx",
  "app/dashboard/email/page.tsx",
  "app/dashboard/ethical-metrics/page.tsx",
  "app/dashboard/gamification/page.tsx",
  "app/dashboard/gamification/achievements/page.tsx",
  "app/dashboard/gamification/add-skill/page.tsx",
  "app/dashboard/gamification/leaderboard/page.tsx",
  "app/dashboard/gamification/rewards/page.tsx",
  "app/dashboard/gamification/skill-tree/page.tsx",
  "app/dashboard/goals/page.tsx",
  "app/dashboard/integrations/page.tsx",
  "app/dashboard/kanban/page.tsx",
  "app/dashboard/planner/planner-client.tsx",
  "app/dashboard/playbooks/playbooks-client.tsx",
  "app/dashboard/registers/registers-client.tsx",
  "app/dashboard/reports/page.tsx",
  "app/dashboard/reports-work/inbox/inbox-client.tsx",
  "app/dashboard/retros/page.tsx",
  "app/dashboard/sprints/page.tsx",
  "app/dashboard/tasks/page.tsx",
  "app/dashboard/team/page.tsx",
  "app/dashboard/team-wellbeing/page.tsx",
  "app/dashboard/worklog/worklog-client.tsx",
]

const DRAFT_PAGES = [
  "app/dashboard/settings/page.tsx",
  "app/dashboard/billing/settings/page.tsx",
  "app/dashboard/team/settings/page.tsx",
  "app/dashboard/gamification/configure/page.tsx",
  "app/dashboard/reports-work/reports-client.tsx",
  "app/dashboard/planner/[id]/plan-editor-client.tsx",
  "app/dashboard/playbooks/[id]/playbook-editor.tsx",
  "app/dashboard/playbooks/[id]/run/run-client.tsx",
  "app/dashboard/agent/agent-client.tsx",
  "app/dashboard/assistant/assistant-client.tsx",
  "app/dashboard/chat/page.tsx",
]

describe("the live refresh hook", () => {
  const hook = src(HOOK)

  it("re-reads on focus and on becoming visible, and repeats while visible", () => {
    expect(hook).toContain('document.addEventListener("visibilitychange"')
    expect(hook).toContain('window.addEventListener("focus"')
    expect(hook).toContain('document.visibilityState !== "visible"')
    expect(hook).toContain("window.setInterval")
    expect(hook).toContain("window.clearInterval")
  })

  it("keeps one read in flight and swallows background failures", () => {
    expect(hook).toContain("running")
    expect(hook).toContain(".catch(() => undefined)")
  })

  it("allows a page to pause it", () => {
    expect(hook).toContain("enabled = true")
    expect(hook).toContain("if (!enabled) return")
  })

  it("pins the interval at one minute", () => {
    expect(hook).toContain("export const LIVE_REFRESH_MS = 60_000")
  })
})

describe("data pages stay in step with the database", () => {
  it.each(DATA_PAGES)("%s imports and calls useLiveRefresh with the shared interval", (file) => {
    const page = src(file)
    expect(page).toContain('from "@/hooks/use-live-refresh"')
    expect(page).toContain("useLiveRefresh(")
    expect(page).toContain("intervalMs: LIVE_REFRESH_MS")
  })
})

describe("pages with unsaved drafts never refresh themselves", () => {
  it.each(DRAFT_PAGES)("%s does not use the live refresh hook", (file) => {
    expect(src(file)).not.toContain("useLiveRefresh")
  })

  it("chat keeps its own faster poll", () => {
    expect(src("app/dashboard/chat/page.tsx")).toContain("setInterval")
  })
})

describe("no dashboard page reads demo fixtures", () => {
  it.each([...DATA_PAGES, ...DRAFT_PAGES])("%s does not import the seed fixture module", (file) => {
    expect(src(file)).not.toContain("lib/seed-data")
  })
})

describe("a loader cannot re-trigger its own load", () => {
  // `setState((prev) => (prev.day === todayIso ? { ...prev, day: serverToday } : prev))` reads as
  // a no-op when the value already matches, but a spread is a new object, which is a state change,
  // which rebuilds a loader that closes over that state, which re-runs the load effect, which
  // flips the skeleton flag — the page reloads its own cards forever with no data moving. Both
  // pages that adopted the server's day do it through a helper that returns the same object
  // instead: `adoptServerDay` and `adoptServerAnchor`.
  it.each([...DATA_PAGES, ...DRAFT_PAGES])("%s never spreads an unchanged value back into state", (file) => {
    expect(src(file)).not.toMatch(/setState\(\(prev\) => \(prev\.\w+ === \w+ \? \{ \.\.\.prev/u)
  })
})
