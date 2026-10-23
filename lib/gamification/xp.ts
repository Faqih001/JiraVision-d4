// Pure, unit-testable XP / unlock logic for the gamification playground.
// Deterministic by contract: same checked set always yields the same totals and unlocks.

export type BranchId = "craft" | "collaboration" | "stewardship"

export interface Branch {
  id: BranchId
  name: string
  blurb: string
}

export interface Behavior {
  id: string
  label: string
  points: number
  branch: BranchId
}

export interface SkillNode {
  id: string
  branch: BranchId
  short: string
  name: string
  description: string
  threshold: number
}

export interface TeamLevel {
  level: number
  title: string
  minXp: number
}

export type CheckedBehaviors = Readonly<Record<string, boolean>>

export type BranchXp = Record<BranchId, number>

export type NodeUnlocks = Record<string, boolean>

export interface TeamLevelProgress {
  level: number
  title: string
  nextTitle: string | null
  nextMinXp: number | null
  percent: number
}

export interface MemberXp {
  initials: string
  xp: number
}

export interface DemoState {
  branchXp: BranchXp
  totalXp: number
  unlocks: NodeUnlocks
  level: TeamLevelProgress
}

export function xpByBranch(behaviors: readonly Behavior[], checked: CheckedBehaviors): BranchXp {
  const totals: BranchXp = { craft: 0, collaboration: 0, stewardship: 0 }
  for (const behavior of behaviors) {
    if (checked[behavior.id] === true) {
      totals[behavior.branch] += behavior.points
    }
  }
  return totals
}

export function totalXp(branchXp: BranchXp): number {
  return branchXp.craft + branchXp.collaboration + branchXp.stewardship
}

export function nodeUnlocks(nodes: readonly SkillNode[], branchXp: BranchXp): NodeUnlocks {
  const unlocks: NodeUnlocks = {}
  for (const node of nodes) {
    unlocks[node.id] = branchXp[node.branch] >= node.threshold
  }
  return unlocks
}

export function teamLevelProgress(total: number, levels: readonly TeamLevel[]): TeamLevelProgress {
  const sorted = [...levels].sort((a, b) => a.minXp - b.minXp)
  const current = [...sorted].reverse().find((l) => total >= l.minXp) ?? sorted[0]
  const next = sorted.find((l) => l.minXp > current.minXp) ?? null
  if (!next) {
    return { level: current.level, title: current.title, nextTitle: null, nextMinXp: null, percent: 100 }
  }
  const span = next.minXp - current.minXp
  const raw = span <= 0 ? 0 : ((total - current.minXp) / span) * 100
  return {
    level: current.level,
    title: current.title,
    nextTitle: next.title,
    nextMinXp: next.minXp,
    percent: Math.round(Math.min(100, Math.max(0, raw))),
  }
}

export function xpByMembers(
  behaviors: readonly Behavior[],
  checked: CheckedBehaviors,
  attribution: Readonly<Record<string, string>>,
  members: readonly { initials: string }[],
): MemberXp[] {
  const totals = new Map<string, number>()
  for (const member of members) totals.set(member.initials, 0)
  for (const behavior of behaviors) {
    if (checked[behavior.id] !== true) continue
    const owner = attribution[behavior.id]
    if (!owner || !totals.has(owner)) continue
    totals.set(owner, (totals.get(owner) ?? 0) + behavior.points)
  }
  return [...totals.entries()]
    .map(([initials, xp]) => ({ initials, xp }))
    .filter((m) => m.xp > 0)
    .sort((a, b) => b.xp - a.xp || a.initials.localeCompare(b.initials))
}

export interface DemoInputs {
  behaviors: readonly Behavior[]
  nodes: readonly SkillNode[]
  levels: readonly TeamLevel[]
  checked: CheckedBehaviors
}

export function computeDemo({ behaviors, nodes, levels, checked }: DemoInputs): DemoState {
  const branchXp = xpByBranch(behaviors, checked)
  const total = totalXp(branchXp)
  return {
    branchXp,
    totalXp: total,
    unlocks: nodeUnlocks(nodes, branchXp),
    level: teamLevelProgress(total, levels),
  }
}
