export type Skill = "frontend" | "backend" | "infra" | "qa"

export interface Ticket {
  id: string
  title: string
  points: number
  skill: Skill
}

export interface Teammate {
  name: string
  initials: string
  capacityPoints: number
  skills: Skill[]
}

export interface Assignment {
  ticketId: string
  assignee: string
  rationale: string
}

export type SprintPlan = Assignment[]

export interface LoadedTicket {
  ticket: Ticket
  rationale: string
}

export interface PersonLoad {
  name: string
  initials: string
  skills: Skill[]
  capacityPoints: number
  committedPoints: number
  overByPoints: number
  utilization: number
  tickets: LoadedTicket[]
}

export interface RebalanceMove {
  ticketId: string
  from: string
  to: string
  reason: string
}

function indexTickets(backlog: Ticket[]): Map<string, Ticket> {
  return new Map(backlog.map((t) => [t.id, t]))
}

function pts(n: number): string {
  return `${n} pt${n === 1 ? "" : "s"}`
}

interface DraftCandidate {
  ticket: Ticket
  ticketIndex: number
  person: Teammate
  personIndex: number
  skillMatch: boolean
}

export function autoDraftSprint(backlog: Ticket[], team: Teammate[]): SprintPlan {
  const totalCapacity = team.reduce((sum, p) => sum + p.capacityPoints, 0)
  const candidates: DraftCandidate[] = []
  backlog.forEach((ticket, ticketIndex) => {
    team.forEach((person, personIndex) => {
      candidates.push({
        ticket,
        ticketIndex,
        person,
        personIndex,
        skillMatch: person.skills.includes(ticket.skill),
      })
    })
  })

  // Deterministic greedy: candidate (ticket, person) pairs sorted once — best skill
  // match first, then lower points, then original file order — repeatedly taking the
  // first pair whose ticket is still open and whose points fit the remaining team
  // budget. Per-person capacity is deliberately ignored here: a skill-first draft is
  // exactly the kind of silent overload this sandbox then shows you fixing.
  candidates.sort(
    (a, b) =>
      Number(b.skillMatch) - Number(a.skillMatch) ||
      a.ticket.points - b.ticket.points ||
      a.ticketIndex - b.ticketIndex ||
      a.personIndex - b.personIndex,
  )

  const plan: SprintPlan = []
  const open = new Set(backlog.map((t) => t.id))
  let committed = 0

  for (;;) {
    const next = candidates.find(
      (c) => open.has(c.ticket.id) && committed + c.ticket.points <= totalCapacity,
    )
    if (!next) break
    open.delete(next.ticket.id)
    committed += next.ticket.points
    const spare = totalCapacity - committed
    const rationale = next.skillMatch
      ? `${next.person.name} is the skill match for ${next.ticket.skill}; ${pts(next.ticket.points)} fits with ${pts(spare)} still open in the budget.`
      : `Stretch pick — no ${next.ticket.skill} capacity left in the draft, so ${next.person.name} takes it to fill the sprint.`
    plan.push({ ticketId: next.ticket.id, assignee: next.person.name, rationale })
  }

  return plan
}

export function computePersonLoads(
  plan: SprintPlan,
  team: Teammate[],
  backlog: Ticket[],
): PersonLoad[] {
  const tickets = indexTickets(backlog)
  return team.map((person) => {
    const assigned = plan.filter((a) => a.assignee === person.name)
    const committedPoints = assigned.reduce(
      (sum, a) => sum + (tickets.get(a.ticketId)?.points ?? 0),
      0,
    )
    return {
      name: person.name,
      initials: person.initials,
      skills: person.skills,
      capacityPoints: person.capacityPoints,
      committedPoints,
      overByPoints: Math.max(0, committedPoints - person.capacityPoints),
      utilization: person.capacityPoints > 0 ? committedPoints / person.capacityPoints : 0,
      tickets: assigned
        .map((a) => ({ ticket: tickets.get(a.ticketId), rationale: a.rationale }))
        .filter((x): x is LoadedTicket => x.ticket !== undefined),
    }
  })
}

export function teamWellbeingScore(loads: PersonLoad[]): number {
  if (loads.length === 0) return 100
  const ratios = loads.map((l) => l.utilization)
  const mean = ratios.reduce((s, r) => s + r, 0) / ratios.length
  const variance =
    ratios.reduce((s, r) => s + (r - mean) * (r - mean), 0) / ratios.length
  const overloaded = loads.filter((l) => l.overByPoints > 0).length
  const score = 100 - variance * 120 - overloaded * 20
  return Math.max(0, Math.min(100, Math.round(score)))
}

function bestRebalanceTarget(
  ticket: Ticket,
  from: Teammate,
  team: Teammate[],
  committed: Map<string, number>,
): Teammate | undefined {
  return team
    .filter(
      (p) =>
        p.name !== from.name &&
        p.skills.includes(ticket.skill) &&
        (committed.get(p.name) ?? 0) + ticket.points <= p.capacityPoints,
    )
    .sort(
      (a, b) =>
        (committed.get(a.name) ?? 0) - (committed.get(b.name) ?? 0) ||
        a.name.localeCompare(b.name),
    )[0]
}

export function suggestRebalance(
  plan: SprintPlan,
  team: Teammate[],
  backlog: Ticket[],
): RebalanceMove[] {
  const tickets = indexTickets(backlog)
  const committed = new Map<string, number>(
    team.map((p) => [
      p.name,
      plan
        .filter((a) => a.assignee === p.name)
        .reduce((sum, a) => sum + (tickets.get(a.ticketId)?.points ?? 0), 0),
    ]),
  )
  const holder = new Map(plan.map((a) => [a.ticketId, a.assignee]))
  const moves: RebalanceMove[] = []

  // Heaviest ticket first, skill-matched targets only, each target kept within its own
  // capacity. Moves are simulated one after another, so applying the list in order
  // converges the plan without double-moving the same ticket.
  for (const person of team) {
    while ((committed.get(person.name) ?? 0) > person.capacityPoints) {
      const mine = [...holder.entries()]
        .filter(([, owner]) => owner === person.name)
        .map(([id]) => tickets.get(id))
        .filter((t): t is Ticket => t !== undefined)
        .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id))

      const pick = mine
        .map((ticket) => ({ ticket, target: bestRebalanceTarget(ticket, person, team, committed) }))
        .find((p) => p.target !== undefined)
      if (!pick || !pick.target) break

      const over = (committed.get(person.name) ?? 0) - person.capacityPoints
      const free = pick.target.capacityPoints - (committed.get(pick.target.name) ?? 0)
      moves.push({
        ticketId: pick.ticket.id,
        from: person.name,
        to: pick.target.name,
        reason: `${person.name} runs ${pts(over)} over capacity; ${pick.ticket.skill} matches ${pick.target.name}, who has ${pts(free)} free after the move.`,
      })

      committed.set(person.name, (committed.get(person.name) ?? 0) - pick.ticket.points)
      committed.set(pick.target.name, (committed.get(pick.target.name) ?? 0) + pick.ticket.points)
      holder.set(pick.ticket.id, pick.target.name)
    }
  }

  return moves
}

export function applyRebalanceMove(plan: SprintPlan, move: RebalanceMove): SprintPlan {
  return plan
    .filter((a) => a.ticketId !== move.ticketId)
    .concat({ ticketId: move.ticketId, assignee: move.to, rationale: move.reason })
}

export function applyRebalanceMoves(plan: SprintPlan, moves: RebalanceMove[]): SprintPlan {
  return moves.reduce(applyRebalanceMove, plan)
}

export function unassignedTickets(plan: SprintPlan, backlog: Ticket[]): Ticket[] {
  const planned = new Set(plan.map((a) => a.ticketId))
  return backlog.filter((t) => !planned.has(t.id))
}
