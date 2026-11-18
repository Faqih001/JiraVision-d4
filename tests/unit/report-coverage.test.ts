import { describe, expect, it } from "vitest"
import {
  METRIC_KEYS,
  MODULE_KEYS,
  SUM_METRIC_KEYS,
  aggregateReport,
  isSumMetric,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"

// F2 coverage extension: the seven reportable surfaces the aggregate did not yet read —
// Automation, AI usage (assistant), Chat, Gamification, Ethical Metrics, Wellbeing, Email.
// Each number must still obey the house invariant: a count equals its own ref list, a sum
// declares itself, and every ref names the table it points at.

const period = resolvePeriod("weekly", "2026-10-28") // Mon 2026-10-26 to Sun 2026-11-01
const TODAY = "2026-11-03"
const IN = "2026-10-27T09:00:00.000Z"
const OUT = "2026-10-01T09:00:00.000Z"

const source = (over: Partial<ReportSource> = {}): ReportSource =>
  ({
    period,
    todayIso: TODAY,
    timezone: "Africa/Nairobi",
    entries: [],
    deliverables: [],
    transitions: [],
    tasks: [],
    planItems: [],
    opsEvents: [],
    registerItems: [],
    tickets: [],
    ticketEvents: [],
    goals: [],
    goalCheckins: [],
    meetings: [],
    retroNotes: [],
    retroActions: [],
    careerSignoffs: [],
    careerRequests: [],
    growthReviews: [],
    playbooks: [],
    automationRules: [],
    automationRuns: [],
    assistantMessages: [],
    chatMessages: [],
    gamification: [],
    wellbeing: [],
    ethics: [],
    email: [],
    ...over,
  }) as ReportSource

const rule = (over: Record<string, unknown> = {}) => ({
  id: 401,
  name: "Nightly backup",
  trigger: "schedule",
  isActive: true,
  runCount: 12,
  lastRunAt: IN,
  ...over,
})

const run = (over: Record<string, unknown> = {}) => ({
  id: 411,
  ruleId: 401,
  ruleName: "Nightly backup",
  status: "ok",
  matched: 3,
  acted: 3,
  createdAt: IN,
  ...over,
})

const aiMessage = (over: Record<string, unknown> = {}) => ({
  id: 421,
  threadTitle: "Sprint planning",
  role: "assistant",
  tokens: 120,
  createdAt: IN,
  ...over,
})

const chatMessage = (over: Record<string, unknown> = {}) => ({
  id: "c-431",
  chatName: "Engineering",
  content: "Deploy is green",
  timestamp: IN,
  ...over,
})

const gamification = (over: Record<string, unknown> = {}) => ({
  id: 441,
  level: 4,
  xp: 850,
  tasksCompleted: 17,
  ...over,
})

const wellbeing = (over: Record<string, unknown> = {}) => ({
  id: 451,
  date: "2026-10-27",
  wellbeingScore: 72,
  mood: "good",
  workload: "balanced",
  stressLevel: 3,
  overtimeHours: 1.5,
  ...over,
})

const ethics = (over: Record<string, unknown> = {}) => ({
  id: 461,
  date: "2026-10-27",
  payEquityScore: 90,
  workloadBalanceScore: 80,
  deiTaskDistributionScore: 75,
  overtimeCompliance: 95,
  ...over,
})

const email = (over: Record<string, unknown> = {}) => ({
  id: 471,
  subject: "Your weekly digest",
  eventType: "digest",
  status: "delivered",
  createdAt: IN,
  ...over,
})

describe("the coverage registry", () => {
  it("names the seven new modules and the nine new metrics", () => {
    for (const key of ["automation", "assistant", "chat", "gamification", "wellbeing", "ethics", "email"]) {
      expect(MODULE_KEYS).toContain(key)
    }
    for (const key of [
      "automationRuns",
      "automationRulesActive",
      "aiMessages",
      "aiTokens",
      "chatMessages",
      "gamificationXp",
      "wellbeingCheckins",
      "ethicsSnapshots",
      "emailsDelivered",
    ]) {
      expect(METRIC_KEYS).toContain(key)
    }
    expect(new Set(METRIC_KEYS).size).toBe(METRIC_KEYS.length)
  })

  it("declares the two new sums so the guard does not demand value === refs.length", () => {
    expect([...SUM_METRIC_KEYS]).toEqual(["minutes", "storyPointsCompleted", "aiTokens", "gamificationXp"])
    expect(isSumMetric("aiTokens")).toBe(true)
    expect(isSumMetric("gamificationXp")).toBe(true)
    expect(isSumMetric("chatMessages")).toBe(false)
  })
})

describe("automation", () => {
  it("lists active rules as standing work and counts the runs that fell in the period", () => {
    const aggregate = aggregateReport(
      source({
        automationRules: [rule(), rule({ id: 402, name: "Slack alert", isActive: false })],
        automationRuns: [run(), run({ id: 412, createdAt: OUT })],
      }),
    )
    expect(aggregate.metrics.automationRulesActive.value).toBe(1)
    expect(aggregate.metrics.automationRulesActive.refs).toEqual(["automation-rule:401"])
    expect(aggregate.metrics.automationRuns.value).toBe(1)
    expect(aggregate.metrics.automationRuns.refs).toEqual(["automation-run:411"])
    expect(aggregate.automationRows.map((r) => r.ref)).toEqual(["automation-rule:401"])
    expect(aggregate.automationRows[0]!.title).toBe("Nightly backup")
  })

  it("puts the period's runs on the timeline, not the standing rules", () => {
    const aggregate = aggregateReport(source({ automationRules: [rule()], automationRuns: [run()] }))
    const auto = aggregate.timeline.filter((r) => r.source === "automation")
    expect(auto.map((r) => r.ref)).toEqual(["automation-run:411"])
    expect(auto[0]!.date).toBe("2026-10-27")
  })
})

describe("AI usage", () => {
  it("counts assistant replies in the period and sums their tokens", () => {
    const aggregate = aggregateReport(
      source({
        assistantMessages: [
          aiMessage(),
          aiMessage({ id: 422, tokens: 80 }),
          aiMessage({ id: 423, createdAt: OUT }),
          aiMessage({ id: 424, role: "user", tokens: 0 }),
        ],
      }),
    )
    expect(aggregate.metrics.aiMessages.value).toBe(2)
    expect(aggregate.metrics.aiMessages.refs).toEqual(["ai-message:421", "ai-message:422"])
    expect(aggregate.metrics.aiTokens.value).toBe(200)
    expect(aggregate.metrics.aiTokens.refs).toEqual(["ai-message:421", "ai-message:422"])
    expect(aggregate.assistantRows).toHaveLength(2)
  })

  it("a reply with no tokens still counts as a message but adds nothing to the sum", () => {
    const aggregate = aggregateReport(source({ assistantMessages: [aiMessage({ tokens: 0 })] }))
    expect(aggregate.metrics.aiMessages.value).toBe(1)
    expect(aggregate.metrics.aiTokens.value).toBe(0)
    expect(aggregate.metrics.aiTokens.refs).toEqual([])
  })
})

describe("chat", () => {
  it("counts the member's messages in the period and names the chat", () => {
    const aggregate = aggregateReport(
      source({ chatMessages: [chatMessage(), chatMessage({ id: "c-432", timestamp: OUT })] }),
    )
    expect(aggregate.metrics.chatMessages.value).toBe(1)
    expect(aggregate.metrics.chatMessages.refs).toEqual(["chat-message:c-431"])
    expect(aggregate.chatRows[0]!.title).toBe("Engineering")
    expect(aggregate.chatRows[0]!.date).toBe("2026-10-27")
    expect(aggregate.timeline.some((r) => r.source === "chat" && r.ref === "chat-message:c-431")).toBe(true)
  })
})

describe("gamification", () => {
  it("reports earned progress as a standing snapshot, never on the timeline", () => {
    const aggregate = aggregateReport(source({ gamification: [gamification()] }))
    expect(aggregate.metrics.gamificationXp.value).toBe(850)
    expect(aggregate.metrics.gamificationXp.refs).toEqual(["gamification:441"])
    expect(aggregate.gamificationRows).toHaveLength(1)
    expect(aggregate.gamificationRows[0]!.date).toBeNull()
    expect(aggregate.timeline.some((r) => r.source === "gamification")).toBe(false)
  })

  it("a brand-new profile with no progress is not activity", () => {
    const aggregate = aggregateReport(source({ gamification: [gamification({ level: 1, xp: 0, tasksCompleted: 0 })] }))
    expect(aggregate.gamificationRows).toEqual([])
    expect(aggregate.metrics.gamificationXp.value).toBe(0)
    expect(aggregate.isEmpty).toBe(true)
  })
})

describe("wellbeing", () => {
  it("counts check-ins dated in the period by their plain day column", () => {
    const aggregate = aggregateReport(
      source({ wellbeing: [wellbeing(), wellbeing({ id: 452, date: "2026-10-01" })] }),
    )
    expect(aggregate.metrics.wellbeingCheckins.value).toBe(1)
    expect(aggregate.metrics.wellbeingCheckins.refs).toEqual(["wellbeing:451"])
    expect(aggregate.wellbeingRows[0]!.date).toBe("2026-10-27")
    expect(aggregate.timeline.some((r) => r.source === "wellbeing")).toBe(true)
  })
})

describe("ethical metrics", () => {
  it("counts team snapshots dated in the period but keeps them off the personal timeline", () => {
    const aggregate = aggregateReport(source({ ethics: [ethics(), ethics({ id: 462, date: "2026-11-05" })] }))
    expect(aggregate.metrics.ethicsSnapshots.value).toBe(1)
    expect(aggregate.metrics.ethicsSnapshots.refs).toEqual(["ethics:461"])
    expect(aggregate.ethicsRows).toHaveLength(1)
    expect(aggregate.timeline.some((r) => r.source === "ethics")).toBe(false)
    expect(aggregate.byModule.some((b) => b.key === "ethics")).toBe(true)
  })
})

describe("email", () => {
  it("counts digests delivered in the period", () => {
    const aggregate = aggregateReport(
      source({ email: [email(), email({ id: 472, createdAt: OUT }), email({ id: 473, status: "queued" })] }),
    )
    expect(aggregate.metrics.emailsDelivered.value).toBe(1)
    expect(aggregate.metrics.emailsDelivered.refs).toEqual(["email:471"])
    expect(aggregate.emailRows[0]!.title).toBe("Your weekly digest")
    expect(aggregate.timeline.some((r) => r.source === "email")).toBe(true)
  })
})

describe("the new modules obey the house invariants", () => {
  const busy = aggregateReport(
    source({
      automationRules: [rule()],
      automationRuns: [run()],
      assistantMessages: [aiMessage()],
      chatMessages: [chatMessage()],
      gamification: [gamification()],
      wellbeing: [wellbeing()],
      ethics: [ethics()],
      email: [email()],
    }),
  )

  it("makes every new count equal its own ref list", () => {
    for (const key of METRIC_KEYS) {
      const metric = busy.metrics[key]
      expect(metric.refs).not.toBeNull()
      if (isSumMetric(key)) {
        if (metric.value > 0) expect(metric.refs.length).toBeGreaterThan(0)
        continue
      }
      expect(metric.value).toBe(metric.refs.length)
    }
  })

  it("prefixes every new ref with the table it points at", () => {
    const refs = [
      ...Object.values(busy.metrics).flatMap((m) => m.refs),
      ...busy.automationRows.map((r) => r.ref),
      ...busy.assistantRows.map((r) => r.ref),
      ...busy.chatRows.map((r) => r.ref),
      ...busy.gamificationRows.map((r) => r.ref),
      ...busy.wellbeingRows.map((r) => r.ref),
      ...busy.ethicsRows.map((r) => r.ref),
      ...busy.emailRows.map((r) => r.ref),
    ]
    for (const value of refs) {
      expect(value).toMatch(
        /^(entry|task|deliverable|event|plan|day|ops|register|ticket-event|ticket|goal|checkin|meeting|retro-note|retro-action|signoff|request|review|playbook|automation-run|automation-rule|ai-message|chat-message|gamification|wellbeing|ethics|email):\S+$/u,
      )
    }
  })

  it("is not empty when the only activity sits in one of the new modules", () => {
    expect(aggregateReport(source({ automationRuns: [run()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ assistantMessages: [aiMessage()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ chatMessages: [chatMessage()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ gamification: [gamification()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ wellbeing: [wellbeing()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ ethics: [ethics()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ email: [email()] })).isEmpty).toBe(false)
  })

  it("yields empty arrays for every new section when nothing happened", () => {
    const empty = aggregateReport(source({ todayIso: "2026-10-25" }))
    for (const rows of [
      empty.automationRows,
      empty.assistantRows,
      empty.chatRows,
      empty.gamificationRows,
      empty.wellbeingRows,
      empty.ethicsRows,
      empty.emailRows,
    ]) {
      expect(rows).toEqual([])
    }
  })
})