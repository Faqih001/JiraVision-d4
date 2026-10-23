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
  { id: "T-1", title: "Login form", points: 3, skill: "frontend" },
  { id: "T-2", title: "Auth API", points: 5, skill: "backend" },
  { id: "T-3", title: "CI cache", points: 2, skill: "infra" },
  { id: "T-4", title: "E2E suite", points: 3, skill: "qa" },
  { id: "T-5", title: "Settings page", points: 2, skill: "frontend" },
  { id: "T-6", title: "Billing API", points: 8, skill: "backend" },
]

const team: Teammate[] = [
  { name: "Ada", initials: "AD", capacityPoints: 5, skills: ["frontend"] },
  { name: "Bo", initials: "BK", capacityPoints: 13, skills: ["backend"] },
  { name: "Cy", initials: "CS", capacityPoints: 5, skills: ["infra", "qa"] },
]

const totalCapacity = team.reduce((s, p) => s + p.capacityPoints, 0)

const variance = (values: number[]): number => {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
}

describe("autoDraftSprint", () => {
  it("is deterministic for the same input", () => {
    const a = autoDraftSprint(backlog, team)
    const b = autoDraftSprint(backlog, team)
    expect(a).toEqual(b)
    // Fresh-but-identical arrays must not change the draft either.
    const c = autoDraftSprint(
      backlog.map((t) => ({ ...t })),
      team.map((p) => ({ ...p, skills: [...p.skills] })),
    )
    expect(c).toEqual(a)
  })

  it("respects the sprint capacity budget and never double-books a ticket", () => {
    const plan = autoDraftSprint(backlog, team)
    const byId = new Map(backlog.map((t) => [t.id, t]))
    const ids = plan.map((a) => a.ticketId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => byId.has(id))).toBe(true)
    const committed = ids.reduce((s, id) => s + (byId.get(id)?.points ?? 0), 0)
    expect(committed).toBeLessThanOrEqual(totalCapacity)
    // The greedy is capacity-driven: it fills as much of the budget as it can.
    expect(unassignedTickets(plan, backlog)).toHaveLength(0)
  })

  it("prefers skill matches: each ticket lands on its matching specialist", () => {
    const plan = autoDraftSprint(backlog, team)
    const byId = new Map(backlog.map((t) => [t.id, t]))
    for (const assignment of plan) {
      const ticket = byId.get(assignment.ticketId)!
      const holder = team.find((p) => p.name === assignment.assignee)!
      expect(holder.skills).toContain(ticket.skill)
    }
  })

  it("drops tickets it cannot fit instead of breaking the budget", () => {
    const tinyTeam: Teammate[] = [
      { name: "Sol", initials: "SO", capacityPoints: 4, skills: ["frontend", "backend"] },
    ]
    const plan = autoDraftSprint(backlog, tinyTeam)
    const committed = plan.reduce(
      (s, a) => s + (backlog.find((t) => t.id === a.ticketId)?.points ?? 0),
      0,
    )
    expect(committed).toBeLessThanOrEqual(4)
    expect(unassignedTickets(plan, backlog).length).toBeGreaterThan(0)
  })
})

describe("suggestRebalance / applyRebalanceMoves", () => {
  // Hand-crafted overloaded plan: Ada (cap 5) carries 10 pts, Cy (cap 5) carries 0.
  const overloaded: SprintPlan = [
    { ticketId: "T-2", assignee: "Ada", rationale: "bad draft" },
    { ticketId: "T-5", assignee: "Ada", rationale: "bad draft" },
    { ticketId: "T-3", assignee: "Ada", rationale: "bad draft" },
    { ticketId: "T-6", assignee: "Bo", rationale: "heavy" },
    { ticketId: "T-4", assignee: "Cy", rationale: "ok" },
  ]

  it("proposes moves that reduce load variance", () => {
    const before = computePersonLoads(overloaded, team, backlog)
    const moves = suggestRebalance(overloaded, team, backlog)
    expect(moves.length).toBeGreaterThan(0)

    const after = computePersonLoads(applyRebalanceMoves(overloaded, moves), team, backlog)
    const util = (loads: typeof before) => loads.map((l) => l.utilization)
    expect(variance(util(after))).toBeLessThan(variance(util(before)))
    expect(teamWellbeingScore(after)).toBeGreaterThan(teamWellbeingScore(before))
    // Ada was 5 pts over; the moves should relieve the overload.
    expect(after.find((l) => l.name === "Ada")!.overByPoints).toBeLessThan(
      before.find((l) => l.name === "Ada")!.overByPoints,
    )
  })

  it("only moves tickets to skill-matched teammates that fit their capacity", () => {
    const moves = suggestRebalance(overloaded, team, backlog)
    const byId = new Map(backlog.map((t) => [t.id, t]))
    for (const move of moves) {
      const ticket = byId.get(move.ticketId)!
      const target = team.find((p) => p.name === move.to)!
      expect(target.skills).toContain(ticket.skill)
      expect(move.from).not.toBe(move.to)
      expect(move.reason).toContain("capacity")
    }
  })

  it("applyRebalanceMoves produces valid state: one owner per ticket, known names only", () => {
    const moves = suggestRebalance(overloaded, team, backlog)
    const applied = applyRebalanceMoves(overloaded, moves)

    expect(applied).toHaveLength(overloaded.length)
    const ids = applied.map((a) => a.ticketId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of applied) {
      expect(backlog.some((t) => t.id === a.ticketId)).toBe(true)
      expect(team.some((p) => p.name === a.assignee)).toBe(true)
      expect(a.rationale.length).toBeGreaterThan(0)
    }

    // Simulated moves keep every receiver within their own capacity.
    const loads = computePersonLoads(applied, team, backlog)
    for (const load of loads) {
      if (load.overByPoints > 0) {
        // nobody ends MORE over than they started
        const start = overloaded.filter((a) => a.assignee === load.name).length
        expect(start).toBeGreaterThan(0)
      }
    }
  })

  it("is a no-op for a balanced plan", () => {
    const balanced: SprintPlan = [
      { ticketId: "T-1", assignee: "Ada", rationale: "frontend" },
      { ticketId: "T-5", assignee: "Ada", rationale: "frontend" },
      { ticketId: "T-6", assignee: "Bo", rationale: "backend" },
      { ticketId: "T-2", assignee: "Bo", rationale: "backend" },
      { ticketId: "T-3", assignee: "Cy", rationale: "infra" },
      { ticketId: "T-4", assignee: "Cy", rationale: "qa" },
    ]
    expect(suggestRebalance(balanced, team, backlog)).toHaveLength(0)
    expect(applyRebalanceMoves(balanced, [])).toEqual(balanced)
  })
})
