import { describe, expect, it } from "vitest"
import {
  applyRebalanceMoves,
  autoDraftSprint,
  computePersonLoads,
  suggestRebalance,
  teamWellbeingScore,
  unassignedTickets,
  type SprintPlan,
  type Teammate,
  type Ticket,
} from "@/lib/sandbox/plan"

const backlog: Ticket[] = [
  { id: "T1", title: "Auth flow", points: 5, skill: "backend" },
  { id: "T2", title: "Dashboard", points: 8, skill: "frontend" },
  { id: "T3", title: "Pipeline", points: 3, skill: "infra" },
  { id: "T4", title: "Test suite", points: 2, skill: "qa" },
  { id: "T5", title: "API v2", points: 5, skill: "backend" },
]

const team: Teammate[] = [
  { name: "Ada", initials: "AD", capacityPoints: 8, skills: ["backend", "infra"] },
  { name: "Bo", initials: "BO", capacityPoints: 10, skills: ["frontend", "qa"] },
  { name: "Cy", initials: "CY", capacityPoints: 5, skills: ["backend"] },
]

describe("autoDraftSprint", () => {
  it("is deterministic for the same input", () => {
    expect(autoDraftSprint(backlog, team)).toEqual(autoDraftSprint(backlog, team))
  })

  it("never commits more points than total capacity", () => {
    const plan = autoDraftSprint(backlog, team)
    const tickets = new Map(backlog.map((t) => [t.id, t]))
    const committed = plan.reduce((s, a) => s + (tickets.get(a.ticketId)?.points ?? 0), 0)
    const capacity = team.reduce((s, p) => s + p.capacityPoints, 0)
    expect(committed).toBeLessThanOrEqual(capacity)
  })

  it("assigns each ticket at most once and prefers skill matches", () => {
    const plan = autoDraftSprint(backlog, team)
    const ids = plan.map((a) => a.ticketId)
    expect(new Set(ids).size).toBe(ids.length)
    const backendOnNonBackend = plan.filter(
      (a) => backlog.find((t) => t.id === a.ticketId)?.skill === "backend" &&
        !team.find((p) => p.name === a.assignee)?.skills.includes("backend"),
    )
    expect(backendOnNonBackend).toHaveLength(0)
  })

  it("leaves overflow tickets unassigned rather than overcommitting", () => {
    const tinyTeam: Teammate[] = [{ name: "Solo", initials: "SO", capacityPoints: 3, skills: ["backend"] }]
    const plan = autoDraftSprint(backlog, tinyTeam)
    expect(unassignedTickets(plan, backlog).length).toBeGreaterThan(0)
  })
})

describe("computePersonLoads + wellbeing", () => {
  it("computes overByPoints and utilization consistently", () => {
    const plan: SprintPlan = [
      { ticketId: "T1", assignee: "Ada", rationale: "" },
      { ticketId: "T5", assignee: "Ada", rationale: "" },
      { ticketId: "T3", assignee: "Ada", rationale: "" },
    ]
    const loads = computePersonLoads(plan, team, backlog)
    const ada = loads.find((l) => l.name === "Ada")!
    expect(ada.committedPoints).toBe(13)
    expect(ada.overByPoints).toBe(5)
    expect(ada.utilization).toBeCloseTo(13 / 8, 5)
  })

  it("wellbeing is 100 for an empty team and penalises overload", () => {
    expect(teamWellbeingScore([])).toBe(100)
    const balanced = computePersonLoads(
      [
        { ticketId: "T1", assignee: "Ada", rationale: "" },
        { ticketId: "T2", assignee: "Bo", rationale: "" },
      ],
      team,
      backlog,
    )
    const skewed = computePersonLoads(
      [
        { ticketId: "T1", assignee: "Ada", rationale: "" },
        { ticketId: "T2", assignee: "Ada", rationale: "" },
        { ticketId: "T5", assignee: "Ada", rationale: "" },
      ],
      team,
      backlog,
    )
    expect(teamWellbeingScore(skewed)).toBeLessThan(teamWellbeingScore(balanced))
  })
})

describe("suggestRebalance", () => {
  it("moves tickets off an overloaded person and applying them clears the overload", () => {
    const plan: SprintPlan = [
      { ticketId: "T1", assignee: "Ada", rationale: "" },
      { ticketId: "T5", assignee: "Ada", rationale: "" },
      { ticketId: "T3", assignee: "Ada", rationale: "" },
    ]
    const before = computePersonLoads(plan, team, backlog)
    expect(before.find((l) => l.name === "Ada")!.overByPoints).toBeGreaterThan(0)

    const moves = suggestRebalance(plan, team, backlog)
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.every((m) => m.from !== m.to)).toBe(true)

    const after = computePersonLoads(applyRebalanceMoves(plan, moves), team, backlog)
    expect(after.find((l) => l.name === "Ada")!.overByPoints).toBe(0)
    // Tickets never vanish: same plan size after rebalance.
    expect(after.reduce((s, l) => s + l.tickets.length, 0)).toBe(plan.length)
  })

  it("returns no moves when nobody is over capacity", () => {
    const plan: SprintPlan = [
      { ticketId: "T1", assignee: "Ada", rationale: "" },
      { ticketId: "T2", assignee: "Bo", rationale: "" },
    ]
    expect(suggestRebalance(plan, team, backlog)).toHaveLength(0)
  })
})
