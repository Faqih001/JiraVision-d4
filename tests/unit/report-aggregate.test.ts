import { describe, expect, it } from "vitest"
import {
  METRIC_KEYS,
  SUM_METRIC_KEYS,
  aggregateReport,
  isSumMetric,
  statusBucket,
  type ReportAggregate,
  type ReportSource,
} from "@/lib/reports/aggregate"
import { resolvePeriod } from "@/lib/reports/period"
import { KIND_LABEL, type DeliverableDto, type EntryDto } from "@/lib/worklog/entries"
import type { TransitionDto } from "@/lib/worklog/summary"

const period = resolvePeriod("weekly", "2026-10-28") // Mon 2026-10-26 to Sun 2026-11-01
const TODAY = "2026-11-03"

const entry = (over: Partial<EntryDto> = {}): EntryDto => ({
  id: 1,
  workedOn: "2026-10-27",
  taskId: null,
  taskTitle: null,
  kind: "action",
  title: "Did the thing",
  body: null,
  discipline: "developer",
  minutes: 60,
  deliverableId: null,
  playbookId: null,
  playbookVersion: null,
  links: [],
  source: "manual",
  redatedAt: null,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const deliverable = (over: Partial<DeliverableDto> = {}): DeliverableDto => ({
  id: 11,
  name: "Runbook",
  type: "document",
  status: "draft",
  producedOn: "2026-10-27",
  link: null,
  evidence: null,
  taskId: null,
  taskTitle: null,
  discipline: "developer",
  entryCount: 0,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const transition = (over: Partial<TransitionDto> = {}): TransitionDto => ({
  id: 21,
  taskId: 5,
  taskTitle: "Ship the export",
  fromStatus: "review",
  toStatus: "done",
  at: "2026-10-27T10:00:00.000Z",
  source: "route",
  ...over,
})

const task = (over: Partial<ReportSource["tasks"][number]> = {}) => ({
  id: 5,
  title: "Ship the export",
  status: "done",
  priority: "high",
  dueDate: "2026-10-30",
  storyPoints: 3,
  sprintTitle: "Sprint 12",
  ...over,
})

const planItem = (over: Partial<ReportSource["planItems"][number]> = {}) => ({
  id: 31,
  title: "Rewire the dashboard",
  status: "todo",
  dueDate: "2026-11-10",
  startDate: "2026-11-04",
  planTitle: "Q4 plan",
  ...over,
})

const opsEvent = (over: Partial<ReportSource["opsEvents"][number]> = {}) => ({
  id: 41,
  packKey: "it-technician",
  entityKey: "backup-verify",
  status: "ok",
  occurredAt: "2026-10-27T08:00:00.000Z",
  ...over,
})

const registerItem = (over: Partial<ReportSource["registerItems"][number]> = {}) => ({
  id: 51,
  packKey: "it-technician",
  kind: "equipment",
  title: "Spare laptop",
  status: "in_service",
  lastVerifiedAt: "2026-10-27",
  ...over,
})

const ticket = (over: Partial<ReportSource["tickets"][number]> = {}) => ({
  id: 61,
  subject: "Laptop will not boot",
  status: "in_progress",
  priority: "high",
  resolvedAt: null,
  ...over,
})

const ticketEvent = (over: Partial<ReportSource["ticketEvents"][number]> = {}) => ({
  id: 71,
  ticketId: 61,
  ticketSubject: "Laptop will not boot",
  type: "status",
  fromValue: "new",
  toValue: "in_progress",
  at: "2026-10-27T09:00:00.000Z",
  ...over,
})

const goal = (over: Partial<ReportSource["goals"][number]> = {}) => ({
  id: 81,
  title: "Cut restore time",
  status: "on_track",
  current: 40,
  target: 100,
  metricType: "percent",
  dueDate: "2026-12-31",
  ...over,
})

const checkin = (over: Partial<ReportSource["goalCheckins"][number]> = {}) => ({
  id: 91,
  goalId: 81,
  goalTitle: "Cut restore time",
  value: 40,
  note: "Drill ran clean",
  at: "2026-10-27T09:00:00.000Z",
  ...over,
})

const meeting = (over: Partial<ReportSource["meetings"][number]> = {}) => ({
  id: 101,
  title: "Sprint review",
  eventType: "meeting",
  startTime: "2026-10-27T09:00:00.000Z",
  organized: true,
  ...over,
})

const retroNote = (over: Partial<ReportSource["retroNotes"][number]> = {}) => ({
  id: 111,
  retroTitle: "Sprint 12 retro",
  category: "went_well",
  body: "Pairing worked",
  at: "2026-10-27T09:00:00.000Z",
  ...over,
})

const retroAction = (over: Partial<ReportSource["retroActions"][number]> = {}) => ({
  id: 121,
  retroTitle: "Sprint 12 retro",
  body: "Book the drill",
  done: false,
  dueDate: "2026-11-05",
  ...over,
})

const signoff = (over: Partial<ReportSource["careerSignoffs"][number]> = {}) => ({
  id: 131,
  itemKey: "backups.restore-drill",
  status: "ticked",
  at: "2026-10-27T09:00:00.000Z",
  ...over,
})

const careerRequest = (over: Partial<ReportSource["careerRequests"][number]> = {}) => ({
  id: 141,
  discipline: "developer",
  fromLevel: 2,
  toLevel: 3,
  status: "submitted",
  at: "2026-10-28T09:00:00.000Z",
  ...over,
})

const growthReview = (over: Partial<ReportSource["growthReviews"][number]> = {}) => ({
  id: 151,
  kind: "quarterly",
  at: "2026-10-29T09:00:00.000Z",
  ...over,
})

const playbook = (over: Partial<ReportSource["playbooks"][number]> = {}) => ({
  id: 161,
  title: "Restore drill",
  status: "published",
  version: 2,
  at: "2026-10-27T09:00:00.000Z",
  ...over,
})

const automationRule = (over: Partial<ReportSource["automationRules"][number]> = {}) => ({
  id: 401,
  name: "Nightly backup",
  trigger: "schedule",
  isActive: true,
  runCount: 12,
  lastRunAt: "2026-10-27T08:00:00.000Z",
  ...over,
})

const automationRun = (over: Partial<ReportSource["automationRuns"][number]> = {}) => ({
  id: 411,
  ruleId: 401,
  ruleName: "Nightly backup",
  status: "ok",
  matched: 3,
  acted: 2,
  createdAt: "2026-10-27T08:00:00.000Z",
  ...over,
})

const assistantMessage = (over: Partial<ReportSource["assistantMessages"][number]> = {}) => ({
  id: 421,
  threadTitle: "Restore help",
  role: "assistant",
  tokens: 120,
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const chatMessage = (over: Partial<ReportSource["chatMessages"][number]> = {}) => ({
  id: "c-431",
  chatName: "Engineering",
  content: "Deploy is green",
  timestamp: "2026-10-27T09:00:00.000Z",
  ...over,
})

const gamificationRow = (over: Partial<ReportSource["gamification"][number]> = {}) => ({
  id: 441,
  level: 4,
  xp: 850,
  tasksCompleted: 17,
  ...over,
})

const wellbeingRow = (over: Partial<ReportSource["wellbeing"][number]> = {}) => ({
  id: 451,
  date: "2026-10-27",
  wellbeingScore: 7,
  mood: "good",
  workload: "balanced",
  stressLevel: 3,
  overtimeHours: 2,
  ...over,
})

const ethicsRow = (over: Partial<ReportSource["ethics"][number]> = {}) => ({
  id: 461,
  date: "2026-10-27",
  payEquityScore: 8,
  workloadBalanceScore: 7,
  deiTaskDistributionScore: 9,
  overtimeCompliance: 6,
  ...over,
})

const emailRow = (over: Partial<ReportSource["email"][number]> = {}) => ({
  id: 471,
  subject: "Weekly digest",
  eventType: "weekly",
  status: "delivered",
  createdAt: "2026-10-27T09:00:00.000Z",
  ...over,
})

const source = (over: Partial<ReportSource> = {}): ReportSource => ({
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
})

const metricKeys = METRIC_KEYS

describe("task status bucketing", () => {
  it("maps the app's loose status strings onto four buckets", () => {
    expect(statusBucket("Done")).toBe("completed")
    expect(statusBucket(" completed ")).toBe("completed")
    expect(statusBucket("closed")).toBe("completed")
    expect(statusBucket("in_progress")).toBe("in_progress")
    expect(statusBucket("review")).toBe("in_progress")
    expect(statusBucket("blocked")).toBe("blocked")
    expect(statusBucket("waiting-on-vendor")).toBe("other")
    expect(statusBucket("")).toBe("other")
  })
})

describe("the no-number-without-rows invariant", () => {
  it("makes every count metric equal its own ref list", () => {
    const aggregate = aggregateReport(
      source({
        entries: [entry(), entry({ id: 2, minutes: 30 }), entry({ id: 3, minutes: null })],
        deliverables: [deliverable({ status: "delivered" })],
        transitions: [transition(), transition({ id: 22, taskId: 6 })],
        tasks: [task(), task({ id: 6, status: "in_progress" })],
        planItems: [planItem()],
        opsEvents: [opsEvent()],
        registerItems: [registerItem()],
        tickets: [ticket()],
        ticketEvents: [ticketEvent()],
        goals: [goal()],
        goalCheckins: [checkin()],
        meetings: [meeting()],
        retroNotes: [retroNote()],
        retroActions: [retroAction()],
        careerSignoffs: [signoff()],
        careerRequests: [careerRequest()],
        growthReviews: [growthReview()],
        playbooks: [playbook()],
      }),
    )
    for (const key of metricKeys) {
      const metric = aggregate.metrics[key]
      expect(metric.refs).not.toBeNull()
      if (isSumMetric(key)) {
        // A sum may legitimately be zero with rows behind it (three entries, none with minutes).
        if (metric.value > 0) expect(metric.refs.length).toBeGreaterThan(0)
        continue
      }
      expect(metric.value).toBe(metric.refs.length)
    }
  })

  it("prefixes every ref with the table it points at", () => {
    const aggregate = aggregateReport(
      source({
        entries: [entry()],
        transitions: [transition()],
        deliverables: [deliverable()],
        planItems: [planItem()],
        opsEvents: [opsEvent()],
        registerItems: [registerItem()],
        tickets: [ticket()],
        ticketEvents: [ticketEvent()],
        goals: [goal()],
        goalCheckins: [checkin()],
        meetings: [meeting()],
        retroNotes: [retroNote()],
        retroActions: [retroAction()],
        careerSignoffs: [signoff()],
        careerRequests: [careerRequest()],
        growthReviews: [growthReview()],
        playbooks: [playbook()],
      }),
    )
    const refs = [
      ...Object.values(aggregate.metrics).flatMap((m) => m.refs),
      ...aggregate.completed.map((r) => r.ref),
      ...aggregate.inProgress.map((r) => r.ref),
      ...aggregate.nextPeriod.map((r) => r.ref),
      ...aggregate.opsRows.map((r) => r.ref),
      ...aggregate.registerRows.map((r) => r.ref),
      ...aggregate.ticketRows.map((r) => r.ref),
      ...aggregate.goalRows.map((r) => r.ref),
      ...aggregate.meetingRows.map((r) => r.ref),
      ...aggregate.retroRows.map((r) => r.ref),
      ...aggregate.careerRows.map((r) => r.ref),
      ...aggregate.playbookRows.map((r) => r.ref),
      ...aggregate.automationRows.map((r) => r.ref),
      ...aggregate.assistantRows.map((r) => r.ref),
      ...aggregate.chatRows.map((r) => r.ref),
      ...aggregate.gamificationRows.map((r) => r.ref),
      ...aggregate.wellbeingRows.map((r) => r.ref),
      ...aggregate.ethicsRows.map((r) => r.ref),
      ...aggregate.emailRows.map((r) => r.ref),
      ...aggregate.timeline.map((r) => r.ref),
      ...aggregate.byModule.flatMap((b) => [...b.count.refs, ...b.minutes.refs]),
      ...aggregate.series.flatMap((b) => [...b.entries.refs, ...b.minutes.refs]),
    ]
    expect(refs.length).toBeGreaterThan(0)
    for (const value of refs) {
      expect(value).toMatch(
        /^(entry|task|deliverable|event|plan|day|ops|register|ticket-event|ticket|goal|checkin|meeting|retro-note|retro-action|signoff|request|review|playbook|automation-rule|automation-run|ai-message|chat-message|gamification|wellbeing|ethics|email):\S+$/u,
      )
    }
  })
})

describe("entries and days", () => {
  it("counts entries and sums minutes across the period", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ minutes: 90 }), entry({ id: 2, minutes: 45 }), entry({ id: 3, minutes: null })] }),
    )
    expect(aggregate.metrics.entries.value).toBe(3)
    expect(aggregate.metrics.minutes.value).toBe(135)
  })

  it("counts the days that have rows and names them", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ workedOn: "2026-10-26" }), entry({ id: 2, workedOn: "2026-10-28" })] }),
    )
    expect(aggregate.metrics.activeDays.value).toBe(2)
    expect(aggregate.metrics.activeDays.refs.sort()).toEqual(["day:2026-10-26", "day:2026-10-28"])
  })

  it("never calls a future day quiet", () => {
    // The period ends 2026-11-01 and today is 2026-10-29, so only Oct 26-29 have had a chance.
    const aggregate = aggregateReport(source({ todayIso: "2026-10-29", entries: [entry({ workedOn: "2026-10-26" })] }))
    expect(aggregate.metrics.quietDays.refs).toEqual([
      "day:2026-10-27",
      "day:2026-10-28",
      "day:2026-10-29",
    ])
  })

  it("drops an entry dated outside the period rather than quietly widening it", () => {
    // The route already filters by date. If a stray row still arrives, the aggregate must not
    // re-widen a period the member set by hand just because one entry sits outside it.
    const aggregate = aggregateReport(source({ entries: [entry({ workedOn: "2026-10-01" })] }))
    expect(aggregate.metrics.entries.value).toBe(0)
    expect(aggregate.series.reduce((n, b) => n + b.entries.value, 0)).toBe(0)
  })
})

describe("completion comes from the event log", () => {
  it("lists a completed task by the day its status changed", () => {
    const aggregate = aggregateReport(
      source({ transitions: [transition({ at: "2026-10-27T10:00:00.000Z" })], tasks: [task()] }),
    )
    expect(aggregate.metrics.completedTasks.value).toBe(1)
    expect(aggregate.completed[0]).toMatchObject({
      ref: "event:21",
      title: "Ship the export",
      date: "2026-10-27",
    })
  })

  it("ignores a done task with no recorded transition instead of guessing a date", () => {
    const aggregate = aggregateReport(source({ tasks: [task({ status: "done" })] }))
    expect(aggregate.metrics.completedTasks.value).toBe(0)
    expect(aggregate.completed).toEqual([])
  })

  it("ignores a transition that is not a completion", () => {
    const aggregate = aggregateReport(source({ transitions: [transition({ toStatus: "review" })] }))
    expect(aggregate.metrics.completedTasks.value).toBe(0)
    expect(aggregate.metrics.taskEvents.value).toBe(1)
  })

  it("counts a task completed twice in one period once, and cites both events", () => {
    const aggregate = aggregateReport(
      source({ transitions: [transition({ id: 21 }), transition({ id: 22, toStatus: "completed" })] }),
    )
    expect(aggregate.metrics.completedTasks.value).toBe(1)
    expect(aggregate.completed.map((r) => r.ref)).toEqual(["event:21", "event:22"])
  })

  it("sums story points only for what the log says finished in this period", () => {
    const aggregate = aggregateReport(
      source({
        transitions: [transition({ taskId: 5 })],
        tasks: [task({ id: 5, storyPoints: 5 }), task({ id: 6, status: "done", storyPoints: 8 })],
      }),
    )
    expect(aggregate.metrics.storyPointsCompleted.value).toBe(5)
    expect(aggregate.metrics.storyPointsCompleted.refs).toEqual(["task:5"])
  })

  it("resolves the event's day in the member's timezone, not UTC", () => {
    // 00:20 in Nairobi is 21:20 of the previous day in UTC; a report that showed 2026-10-26
    // would move a Tuesday's merge into Monday's week.
    const aggregate = aggregateReport(
      source({ transitions: [transition({ at: "2026-10-26T21:20:00.000Z" })], timezone: "Africa/Nairobi" }),
    )
    expect(aggregate.completed[0]!.date).toBe("2026-10-27")
  })
})

describe("standing work", () => {
  it("lists in-progress tasks by current status without claiming a date", () => {
    const aggregate = aggregateReport(
      source({ tasks: [task({ id: 7, status: "in_progress", dueDate: "2026-11-04", sprintTitle: "Sprint 13" })] }),
    )
    expect(aggregate.metrics.inProgressTasks.value).toBe(1)
    expect(aggregate.inProgress[0]).toMatchObject({ ref: "task:7", date: "2026-11-04" })
    expect(aggregate.inProgress[0]!.detail).toContain("Sprint 13")
  })

  it("quotes the blocker entry as the reason, and says so when there is none", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [task({ id: 8, status: "blocked" }), task({ id: 9, status: "blocked" })],
        entries: [entry({ id: 4, kind: "blocker", taskId: 8, body: "Vendor has not replied", title: "Waiting" })],
      }),
    )
    expect(aggregate.metrics.blockedTasks.value).toBe(2)
    expect(aggregate.blocked.find((r) => r.ref === "task:8")!.detail).toContain("Vendor has not replied")
    expect(aggregate.blocked.find((r) => r.ref === "task:9")!.detail).toMatch(/no reason recorded/iu)
  })

  it("carries an overdue item forward only when its due date precedes the period", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [
          task({ id: 10, status: "in_progress", dueDate: "2026-10-20" }),
          task({ id: 11, status: "in_progress", dueDate: "2026-10-29" }),
          task({ id: 12, status: "done", dueDate: "2026-10-20" }),
          task({ id: 13, status: "in_progress", dueDate: null }),
        ],
      }),
    )
    expect(aggregate.metrics.overdueCarried.value).toBe(1)
    expect(aggregate.overdue[0]!.ref).toBe("task:10")
  })
})

describe("deliverables", () => {
  it("counts what was produced in the period by status", () => {
    const aggregate = aggregateReport(
      source({
        deliverables: [
          deliverable({ id: 20, status: "delivered" }),
          deliverable({ id: 21, status: "approved" }),
          deliverable({ id: 22, status: "delivered", producedOn: "2026-10-05" }),
          deliverable({ id: 23, status: "delivered", producedOn: null }),
        ],
      }),
    )
    expect(aggregate.metrics.deliverablesProduced.value).toBe(2)
    expect(aggregate.metrics.deliverablesDelivered.value).toBe(1)
    expect(aggregate.deliverableRows.map((r) => r.ref)).toEqual(["deliverable:20", "deliverable:21"])
  })

  it("counts what is sitting in review now, whenever it was produced", () => {
    const aggregate = aggregateReport(
      source({ deliverables: [deliverable({ id: 24, status: "in_review", producedOn: "2026-09-01" })] }),
    )
    expect(aggregate.metrics.reviewRounds.value).toBe(1)
    expect(aggregate.metrics.reviewRounds.refs).toEqual(["deliverable:24"])
  })
})

describe("the forward view", () => {
  it("lists plan items due after the period and nothing that is already done", () => {
    const aggregate = aggregateReport(
      source({
        planItems: [
          planItem({ id: 31, dueDate: "2026-11-10" }),
          planItem({ id: 32, dueDate: "2026-10-29" }),
          planItem({ id: 33, dueDate: "2026-12-01", status: "done" }),
          planItem({ id: 34, dueDate: null }),
        ],
      }),
    )
    expect(aggregate.metrics.nextPeriodItems.value).toBe(1)
    expect(aggregate.nextPeriod[0]).toMatchObject({ ref: "plan:31", date: "2026-11-10" })
    expect(aggregate.nextPeriod[0]!.detail).toContain("Q4 plan")
  })
})

describe("operations", () => {
  it("counts ops events by their day in the member's timezone, not UTC", () => {
    const aggregate = aggregateReport(
      source({
        opsEvents: [
          opsEvent(),
          opsEvent({ id: 42, occurredAt: "2026-10-26T21:20:00.000Z" }),
          opsEvent({ id: 43, occurredAt: "2026-10-25T20:00:00.000Z" }),
        ],
      }),
    )
    expect(aggregate.metrics.opsEvents.value).toBe(2)
    expect(aggregate.metrics.opsEvents.refs).toEqual(["ops:41", "ops:42"])
    expect(aggregate.opsRows.map((r) => r.ref)).toEqual(["ops:41", "ops:42"])
    expect(aggregate.opsRows[0]!.detail).toContain("it-technician")
    expect(aggregate.opsRows[1]!.date).toBe("2026-10-27")
  })
})

describe("registers", () => {
  it("lists held items whenever they were verified, and counts only verifications in the period", () => {
    const aggregate = aggregateReport(
      source({
        registerItems: [
          registerItem(),
          registerItem({ id: 52, lastVerifiedAt: "2026-09-01" }),
          registerItem({ id: 53, lastVerifiedAt: null }),
        ],
      }),
    )
    expect(aggregate.metrics.registerItemsHeld.value).toBe(3)
    expect(aggregate.metrics.registerVerifications.value).toBe(1)
    expect(aggregate.metrics.registerVerifications.refs).toEqual(["register:51"])
    expect(aggregate.registerRows).toHaveLength(3)
    expect(aggregate.registerRows[0]!.detail).toContain("equipment")
  })
})

describe("service desk", () => {
  it("separates tickets resolved in the period from tickets still open", () => {
    const aggregate = aggregateReport(
      source({
        tickets: [
          ticket(),
          ticket({ id: 62, status: "resolved", resolvedAt: "2026-10-28T10:00:00.000Z" }),
          ticket({ id: 63, status: "resolved", resolvedAt: "2026-09-01T10:00:00.000Z" }),
          ticket({ id: 64, status: "closed", resolvedAt: null }),
        ],
      }),
    )
    expect(aggregate.metrics.ticketsResolved.value).toBe(1)
    expect(aggregate.metrics.ticketsResolved.refs).toEqual(["ticket:62"])
    expect(aggregate.metrics.ticketsOpen.value).toBe(1)
    expect(aggregate.metrics.ticketsOpen.refs).toEqual(["ticket:61"])
    expect(aggregate.ticketRows.map((r) => r.ref).sort()).toEqual(["ticket:61", "ticket:62"])
  })

  it("counts the member's ticket actions in the period", () => {
    const aggregate = aggregateReport(
      source({ ticketEvents: [ticketEvent(), ticketEvent({ id: 72, at: "2026-10-01T09:00:00.000Z" })] }),
    )
    expect(aggregate.metrics.ticketActions.value).toBe(1)
    expect(aggregate.metrics.ticketActions.refs).toEqual(["ticket-event:71"])
  })
})

describe("goals", () => {
  it("counts check-ins in the period and achieved goals as they stand", () => {
    const aggregate = aggregateReport(
      source({
        goals: [goal(), goal({ id: 82, status: "achieved" })],
        goalCheckins: [checkin(), checkin({ id: 92, at: "2026-10-01T09:00:00.000Z" })],
      }),
    )
    expect(aggregate.metrics.goalCheckins.value).toBe(1)
    expect(aggregate.metrics.goalCheckins.refs).toEqual(["checkin:91"])
    expect(aggregate.metrics.goalsAchieved.value).toBe(1)
    expect(aggregate.metrics.goalsAchieved.refs).toEqual(["goal:82"])
    expect(aggregate.goalRows).toHaveLength(2)
    expect(aggregate.goalRows[0]!.detail).toContain("40")
  })
})

describe("meetings", () => {
  it("counts meetings that started in the period and says which were organised", () => {
    const aggregate = aggregateReport(
      source({ meetings: [meeting(), meeting({ id: 102, startTime: "2026-11-05T09:00:00.000Z", organized: false })] }),
    )
    expect(aggregate.metrics.meetings.value).toBe(1)
    expect(aggregate.metrics.meetings.refs).toEqual(["meeting:101"])
    expect(aggregate.meetingRows[0]).toMatchObject({ ref: "meeting:101", date: "2026-10-27" })
    expect(aggregate.meetingRows[0]!.detail).toMatch(/organi/u)
  })
})

describe("retros", () => {
  it("counts notes written in the period and actions still open", () => {
    const aggregate = aggregateReport(
      source({
        retroNotes: [retroNote(), retroNote({ id: 112, at: "2026-10-01T09:00:00.000Z" })],
        retroActions: [retroAction(), retroAction({ id: 122, done: true })],
      }),
    )
    expect(aggregate.metrics.retroNotes.value).toBe(1)
    expect(aggregate.metrics.retroNotes.refs).toEqual(["retro-note:111"])
    expect(aggregate.metrics.retroActionsOpen.value).toBe(1)
    expect(aggregate.metrics.retroActionsOpen.refs).toEqual(["retro-action:121"])
    expect(aggregate.retroRows.map((r) => r.ref).sort()).toEqual(["retro-action:121", "retro-note:111"])
  })
})

describe("career", () => {
  it("counts sign-offs, requests and growth reviews dated in the period", () => {
    const aggregate = aggregateReport(
      source({
        careerSignoffs: [signoff(), signoff({ id: 132, at: "2026-10-01T09:00:00.000Z" })],
        careerRequests: [careerRequest()],
        growthReviews: [growthReview()],
      }),
    )
    expect(aggregate.metrics.careerSignoffs.refs).toEqual(["signoff:131"])
    expect(aggregate.metrics.careerRequests.refs).toEqual(["request:141"])
    expect(aggregate.metrics.growthReviews.refs).toEqual(["review:151"])
    expect(aggregate.careerRows.map((r) => r.ref).sort()).toEqual(["request:141", "review:151", "signoff:131"])
  })
})

describe("playbooks", () => {
  it("counts playbooks published in the period and runs logged against any playbook", () => {
    const aggregate = aggregateReport(
      source({
        playbooks: [
          playbook(),
          playbook({ id: 162, status: "draft", at: "2026-10-28T09:00:00.000Z" }),
          playbook({ id: 163, at: "2026-09-01T09:00:00.000Z" }),
        ],
        entries: [entry({ playbookId: 161 }), entry({ id: 2 })],
      }),
    )
    expect(aggregate.metrics.playbooksPublished.value).toBe(1)
    expect(aggregate.metrics.playbooksPublished.refs).toEqual(["playbook:161"])
    expect(aggregate.metrics.playbookRuns.value).toBe(1)
    expect(aggregate.metrics.playbookRuns.refs).toEqual(["entry:1"])
    expect(aggregate.playbookRows).toHaveLength(3)
    expect(aggregate.playbookRows[0]!.detail).toContain("v2")
  })
})

describe("automation", () => {
  it("counts active rules as standing work and runs as the dated activity", () => {
    const aggregate = aggregateReport(
      source({
        automationRules: [automationRule(), automationRule({ id: 402, isActive: false })],
        automationRuns: [automationRun(), automationRun({ id: 412, createdAt: "2026-10-01T08:00:00.000Z" })],
      }),
    )
    expect(aggregate.metrics.automationRulesActive.value).toBe(1)
    expect(aggregate.metrics.automationRulesActive.refs).toEqual(["automation-rule:401"])
    expect(aggregate.metrics.automationRuns.value).toBe(1)
    expect(aggregate.metrics.automationRuns.refs).toEqual(["automation-run:411"])
    expect(aggregate.automationRows.map((r) => r.ref)).toEqual(["automation-rule:401"])
    expect(aggregate.automationRows[0]!.detail).toContain("schedule")
  })

  it("dates the timeline from runs, not from the standing rules", () => {
    const aggregate = aggregateReport(source({ automationRules: [automationRule()], automationRuns: [automationRun()] }))
    expect(aggregate.timeline.map((r) => r.ref)).toEqual(["automation-run:411"])
    expect(aggregate.timeline[0]!.source).toBe("automation")
  })
})

describe("AI assistant", () => {
  it("counts only the assistant's replies in the period and sums their tokens", () => {
    const aggregate = aggregateReport(
      source({
        assistantMessages: [
          assistantMessage(),
          assistantMessage({ id: 422, role: "user", tokens: 40 }),
          assistantMessage({ id: 423, createdAt: "2026-10-01T09:00:00.000Z", tokens: 999 }),
        ],
      }),
    )
    expect(aggregate.metrics.aiMessages.value).toBe(1)
    expect(aggregate.metrics.aiMessages.refs).toEqual(["ai-message:421"])
    expect(aggregate.metrics.aiTokens.value).toBe(120)
    expect(aggregate.assistantRows[0]!.detail).toContain("120 tokens")
  })
})

describe("chat", () => {
  it("counts messages sent in the period and keeps the uuid ref", () => {
    const aggregate = aggregateReport(
      source({ chatMessages: [chatMessage(), chatMessage({ id: "c-432", timestamp: "2026-10-01T09:00:00.000Z" })] }),
    )
    expect(aggregate.metrics.chatMessages.value).toBe(1)
    expect(aggregate.metrics.chatMessages.refs).toEqual(["chat-message:c-431"])
    expect(aggregate.chatRows[0]!.title).toBe("Engineering")
  })
})

describe("gamification", () => {
  it("treats a default level-1 profile as no activity, not a report row", () => {
    const aggregate = aggregateReport(
      source({ gamification: [gamificationRow({ id: 442, level: 1, xp: 0, tasksCompleted: 0 })] }),
    )
    expect(aggregate.gamificationRows).toEqual([])
    expect(aggregate.metrics.gamificationXp.value).toBe(0)
    expect(aggregate.isEmpty).toBe(true)
  })

  it("shows earned progress as a standing snapshot with no date", () => {
    const aggregate = aggregateReport(source({ gamification: [gamificationRow()] }))
    expect(aggregate.gamificationRows).toHaveLength(1)
    expect(aggregate.gamificationRows[0]!.date).toBeNull()
    expect(aggregate.metrics.gamificationXp.value).toBe(850)
    expect(aggregate.isEmpty).toBe(false)
    expect(aggregate.timeline).toEqual([])
  })
})

describe("wellbeing", () => {
  it("counts check-ins dated in the period and drops the rest", () => {
    const aggregate = aggregateReport(
      source({ wellbeing: [wellbeingRow(), wellbeingRow({ id: 452, date: "2026-10-01" })] }),
    )
    expect(aggregate.metrics.wellbeingCheckins.value).toBe(1)
    expect(aggregate.metrics.wellbeingCheckins.refs).toEqual(["wellbeing:451"])
    expect(aggregate.wellbeingRows[0]!.date).toBe("2026-10-27")
  })
})

describe("ethical metrics", () => {
  it("counts a team snapshot as context, not a personal timeline event", () => {
    const aggregate = aggregateReport(source({ ethics: [ethicsRow()] }))
    expect(aggregate.metrics.ethicsSnapshots.value).toBe(1)
    expect(aggregate.ethicsRows).toHaveLength(1)
    expect(aggregate.isEmpty).toBe(false)
    expect(aggregate.byModule.map((b) => b.key)).toContain("ethics")
    expect(aggregate.timeline).toEqual([])
  })
})

describe("email digests", () => {
  it("counts only digests delivered in the period", () => {
    const aggregate = aggregateReport(
      source({
        email: [
          emailRow(),
          emailRow({ id: 472, status: "queued" }),
          emailRow({ id: 473, status: "failed" }),
          emailRow({ id: 474, createdAt: "2026-10-01T09:00:00.000Z" }),
        ],
      }),
    )
    expect(aggregate.metrics.emailsDelivered.value).toBe(1)
    expect(aggregate.metrics.emailsDelivered.refs).toEqual(["email:471"])
    expect(aggregate.emailRows[0]!.detail).toContain("delivered")
  })
})

describe("the merged timeline", () => {
  it("merges dated activity from every module, newest first, each row naming its source", () => {
    const aggregate = aggregateReport(
      source({
        entries: [entry({ workedOn: "2026-10-27" })],
        transitions: [transition({ at: "2026-10-28T10:00:00.000Z" })],
        opsEvents: [opsEvent({ occurredAt: "2026-10-29T08:00:00.000Z" })],
        meetings: [meeting()],
      }),
    )
    expect(aggregate.timeline.map((r) => r.source)).toEqual(["operations", "tasks", "worklog", "meetings"])
    for (const row of aggregate.timeline) expect(row.date).not.toBeNull()
  })

  it("keeps future and out-of-period rows out of the timeline", () => {
    const aggregate = aggregateReport(
      source({
        planItems: [planItem()],
        opsEvents: [opsEvent({ occurredAt: "2026-10-01T08:00:00.000Z" })],
        tasks: [task({ status: "in_progress", dueDate: "2026-10-28" })],
      }),
    )
    expect(aggregate.timeline).toEqual([])
  })
})

describe("the workspace mix", () => {
  it("counts each module's rows and carries the worklog minutes", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ minutes: 90 })], opsEvents: [opsEvent()], meetings: [meeting()] }),
    )
    const keys = aggregate.byModule.map((b) => b.key)
    expect(keys).toContain("worklog")
    expect(keys).toContain("operations")
    expect(keys).toContain("meetings")
    expect(keys).not.toContain("goals")
    const worklog = aggregate.byModule.find((b) => b.key === "worklog")!
    expect(worklog.count.value).toBe(1)
    expect(worklog.minutes.value).toBe(90)
    expect(aggregate.byModule.find((b) => b.key === "operations")!.count.refs).toEqual(["ops:41"])
  })
})

describe("splits", () => {
  it("groups minutes by discipline and files an unset discipline rather than dropping it", () => {
    const aggregate = aggregateReport(
      source({
        entries: [
          entry({ id: 1, discipline: "developer", minutes: 120 }),
          entry({ id: 2, discipline: "auditor", minutes: 30 }),
          entry({ id: 3, discipline: null, minutes: 15 }),
        ],
      }),
    )
    const keys = aggregate.byDiscipline.map((b) => b.key)
    expect(keys).toContain("developer")
    expect(keys).toContain("unassigned")
    expect(aggregate.byDiscipline.find((b) => b.key === "developer")!.minutes.value).toBe(120)
    expect(aggregate.byDiscipline.find((b) => b.key === "unassigned")!.minutes.refs).toEqual(["entry:3"])
  })

  it("lists every logged kind with its label, ordered by the vocabulary not the counts", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ id: 1, kind: "time" }), entry({ id: 2, kind: "action" })] }),
    )
    expect(aggregate.byKind.map((b) => b.key)).toEqual(["action", "time"])
    // Asserted against the shipped vocabulary, not a literal: the label belongs to entries.ts.
    expect(aggregate.byKind[0]!.label).toBe(KIND_LABEL.action)
  })

  it("splits tasks by bucket and by priority", () => {
    const aggregate = aggregateReport(
      source({
        tasks: [
          task({ id: 1, status: "done", priority: "high" }),
          task({ id: 2, status: "in_progress", priority: "high" }),
          task({ id: 3, status: "blocked", priority: "low" }),
          task({ id: 4, status: "waiting-on-vendor", priority: "medium" }),
        ],
      }),
    )
    expect(aggregate.byTaskStatus.map((b) => b.key)).toEqual(["completed", "in_progress", "blocked", "other"])
    expect(aggregate.byTaskStatus[0]!.count.value).toBe(1)
    expect(aggregate.byPriority.map((b) => b.count.value).reduce((a, b) => a + b, 0)).toBe(4)
  })
})

describe("series", () => {
  it("sums the daily buckets of a weekly period", () => {
    const aggregate = aggregateReport(
      source({ entries: [entry({ workedOn: "2026-10-26", minutes: 50 }), entry({ id: 2, workedOn: "2026-10-26", minutes: 25 })] }),
    )
    expect(aggregate.series).toHaveLength(7)
    expect(aggregate.series[0]!.entries.value).toBe(2)
    expect(aggregate.series[0]!.minutes.value).toBe(75)
  })

  it("gives a yearly period twelve buckets, not three hundred and sixty-five rows", () => {
    const yearly = resolvePeriod("yearly", "2026-06-01")
    const aggregate = aggregateReport(
      source({ period: yearly, entries: [entry({ workedOn: "2026-03-14", minutes: 60 })] }),
    )
    expect(aggregate.series).toHaveLength(12)
    expect(aggregate.period.monthSeries).toBe(true)
    expect(aggregate.series[2]!.minutes.value).toBe(60)
    expect(aggregate.series[2]!.minutes.refs).toEqual(["entry:1"])
  })
})

describe("a period with no activity", () => {
  // `todayIso` sits before the period so no day has elapsed: a finished, empty week
  // legitimately reports seven quiet days, and that is a number with rows behind it, not a null.
  const empty = (): ReportAggregate => aggregateReport(source({ todayIso: "2026-10-25" }))

  it("yields zeros, not nulls, for every metric", () => {
    const aggregate = empty()
    for (const key of metricKeys) {
      expect(aggregate.metrics[key]).toBeDefined()
      expect(aggregate.metrics[key].value).toBe(0)
      expect(Array.isArray(aggregate.metrics[key].refs)).toBe(true)
    }
  })

  it("yields empty arrays for every section", () => {
    const aggregate = empty()
    for (const rows of [
      aggregate.completed,
      aggregate.inProgress,
      aggregate.blocked,
      aggregate.deliverableRows,
      aggregate.overdue,
      aggregate.nextPeriod,
      aggregate.opsRows,
      aggregate.registerRows,
      aggregate.ticketRows,
      aggregate.goalRows,
      aggregate.meetingRows,
      aggregate.retroRows,
      aggregate.careerRows,
      aggregate.playbookRows,
      aggregate.automationRows,
      aggregate.assistantRows,
      aggregate.chatRows,
      aggregate.gamificationRows,
      aggregate.wellbeingRows,
      aggregate.ethicsRows,
      aggregate.emailRows,
      aggregate.timeline,
      aggregate.byModule,
    ]) {
      expect(rows).toEqual([])
    }
    expect(aggregate.byDiscipline).toEqual([])
    expect(aggregate.byKind).toEqual([])
  })

  it("still labels the period and states how long it was", () => {
    const aggregate = empty()
    expect(aggregate.period.label).toBe(period.label)
    expect(aggregate.period.dayCount).toBe(7)
  })

  it("marks itself empty so the page can say so instead of showing a blank grid", () => {
    expect(aggregateReport(source()).isEmpty).toBe(true)
    expect(aggregateReport(source({ entries: [entry()] })).isEmpty).toBe(false)
  })

  it("is not empty when the only activity sits outside the worklog", () => {
    expect(aggregateReport(source({ opsEvents: [opsEvent()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ meetings: [meeting()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ registerItems: [registerItem()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ ticketEvents: [ticketEvent()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ goalCheckins: [checkin()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ automationRuns: [automationRun()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ assistantMessages: [assistantMessage()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ chatMessages: [chatMessage()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ gamification: [gamificationRow()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ wellbeing: [wellbeingRow()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ ethics: [ethicsRow()] })).isEmpty).toBe(false)
    expect(aggregateReport(source({ email: [emailRow()] })).isEmpty).toBe(false)
  })
})

describe("the metric registry", () => {
  it("has no duplicate key and declares its sums", () => {
    expect(new Set(metricKeys).size).toBe(metricKeys.length)
    expect(SUM_METRIC_KEYS).toEqual(["minutes", "storyPointsCompleted", "aiTokens", "gamificationXp"])
    expect(metricKeys).toContain("deliverablesProduced")
    for (const key of ["opsEvents", "registerItemsHeld", "ticketsResolved", "goalCheckins", "meetings", "retroNotes", "careerSignoffs", "playbookRuns"]) {
      expect(metricKeys).toContain(key)
    }
    for (const key of ["automationRulesActive", "automationRuns", "aiMessages", "aiTokens", "chatMessages", "gamificationXp", "wellbeingCheckins", "ethicsSnapshots", "emailsDelivered"]) {
      expect(metricKeys).toContain(key)
    }
  })
})
